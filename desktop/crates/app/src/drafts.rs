//! Per-user draft storage with background persistence.
//!
//! The UI thread never touches the disk: [`Store::stage`] updates the in-memory
//! map and hands changed keys to a single background writer thread that
//! coalesces rapid edits (250 ms debounce) and writes atomically. Navigation
//! and shutdown flush synchronously through [`Store::save_now`] /
//! [`Store::flush_shutdown`]. Concurrent app instances merge per key
//! (last-writer-wins per `(slug, language)`), corrupt files are backed up
//! before starting fresh, and [`Store::import_progress`] /
//! [`Store::import_browser_export`] ingest outside state with a backup and an
//! idempotency marker. All tests use disposable temp directories.

use crate::progress::ImportedItem;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub type Drafts = BTreeMap<String, BTreeMap<String, String>>;
type DraftKey = (String, String);

/// Debounce window the background writer waits for coalescing rapid edits.
pub const WRITE_DEBOUNCE: Duration = Duration::from_millis(250);

static NEXT_TMP: AtomicU64 = AtomicU64::new(0);

fn unique_suffix() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);
    format!(
        "{}.{nanos}.{}",
        std::process::id(),
        NEXT_TMP.fetch_add(1, Ordering::Relaxed)
    )
}

fn fnv1a(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

// ---------------------------------------------------------------------------
// Atomic disk helpers.
// ---------------------------------------------------------------------------

fn drafts_path_valid(path: &Path) -> bool {
    path.parent().is_some_and(|parent| parent.is_absolute())
}

/// Load drafts, backing up a corrupt file next to the original and starting
/// fresh. A missing file is not an error.
fn load_drafts(path: &Path) -> io::Result<Drafts> {
    match fs::read(path) {
        Ok(bytes) => match serde_json::from_slice::<Drafts>(&bytes) {
            Ok(drafts) => Ok(drafts),
            Err(_) => {
                let backup = path.with_extension(format!("corrupt-{}.bak", unique_suffix()));
                let _ = fs::rename(path, &backup);
                Ok(Drafts::new())
            }
        },
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(Drafts::new()),
        Err(error) => Err(error),
    }
}

fn remove_stale_tmp(parent: &Path, keep: &Path) {
    let Ok(entries) = fs::read_dir(parent) else {
        return;
    };
    for entry in entries.flatten() {
        let candidate = entry.path();
        if candidate == keep {
            continue;
        }
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with("drafts-v1.") && name.ends_with(".tmp") {
            let _ = fs::remove_file(&candidate);
        }
    }
}

fn atomic_write(path: &Path, drafts: &Drafts) -> io::Result<()> {
    let parent = path
        .parent()
        .filter(|path| path.is_absolute())
        .ok_or_else(|| {
            io::Error::new(io::ErrorKind::InvalidInput, "Draft storage is unavailable")
        })?;
    fs::create_dir_all(parent)?;
    let tmp = parent.join(format!("drafts-v1.{}.tmp", unique_suffix()));
    remove_stale_tmp(parent, &tmp);
    let result = (|| {
        let mut file = fs::File::create(&tmp)?;
        serde_json::to_writer(&mut file, drafts)?;
        file.flush()?;
        file.sync_all()?;
        drop(file);
        fs::rename(&tmp, path)?;
        // Persist the rename itself where the platform allows it.
        #[cfg(unix)]
        if let Ok(dir) = fs::File::open(parent) {
            let _ = dir.sync_all();
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

/// Reload the on-disk map, overlay `entries`, and write back atomically. This
/// is the merge point for concurrent app instances: keys outside `entries`
/// are preserved, overlapping keys are last-writer-wins.
fn apply_to_disk(path: &Path, entries: &BTreeMap<DraftKey, String>) -> io::Result<()> {
    if entries.is_empty() {
        return Ok(());
    }
    let mut disk = load_drafts(path)?;
    for ((slug, language), code) in entries {
        disk.entry(slug.clone())
            .or_default()
            .insert(language.clone(), code.clone());
    }
    atomic_write(path, &disk)
}

// ---------------------------------------------------------------------------
// Background writer.
// ---------------------------------------------------------------------------

enum WriterMsg {
    Save {
        path: PathBuf,
        entries: BTreeMap<DraftKey, String>,
    },
    Shutdown,
}

fn writer_loop(inbox: mpsc::Receiver<WriterMsg>, errors: mpsc::Sender<String>) {
    let mut path: Option<PathBuf> = None;
    let mut pending: BTreeMap<DraftKey, String> = BTreeMap::new();
    let flush = |path: &Option<PathBuf>, pending: &mut BTreeMap<DraftKey, String>| {
        if pending.is_empty() {
            return;
        }
        if let Some(path) = path {
            let entries = std::mem::take(pending);
            if let Err(error) = apply_to_disk(path, &entries) {
                let _ = errors.send(error.to_string());
            }
        } else {
            pending.clear();
        }
    };
    loop {
        if pending.is_empty() {
            match inbox.recv() {
                Ok(WriterMsg::Save {
                    path: next,
                    entries,
                }) => {
                    path = Some(next);
                    pending.extend(entries);
                }
                Ok(WriterMsg::Shutdown) | Err(_) => break,
            }
        } else {
            match inbox.recv_timeout(WRITE_DEBOUNCE) {
                Ok(WriterMsg::Save {
                    path: next,
                    entries,
                }) => {
                    path = Some(next);
                    pending.extend(entries);
                }
                Ok(WriterMsg::Shutdown) => {
                    flush(&path, &mut pending);
                    break;
                }
                Err(mpsc::RecvTimeoutError::Timeout) => flush(&path, &mut pending),
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    flush(&path, &mut pending);
                    break;
                }
            }
        }
    }
}

struct Writer {
    tx: mpsc::Sender<WriterMsg>,
    errors: mpsc::Receiver<String>,
    handle: Option<thread::JoinHandle<()>>,
}

impl Writer {
    fn spawn() -> Self {
        let (tx, inbox) = mpsc::channel::<WriterMsg>();
        let (errors_tx, errors) = mpsc::channel::<String>();
        let handle = thread::Builder::new()
            .name("leetlab-drafts".into())
            .spawn(move || writer_loop(inbox, errors_tx))
            .ok();
        Self { tx, errors, handle }
    }

    fn send(&self, path: &Path, entries: &BTreeMap<DraftKey, String>) {
        if entries.is_empty() {
            return;
        }
        let _ = self.tx.send(WriterMsg::Save {
            path: path.to_owned(),
            entries: entries.clone(),
        });
    }

    fn poll_errors(&self) -> Option<String> {
        let mut last = None;
        while let Ok(error) = self.errors.try_recv() {
            last = Some(error);
        }
        last
    }

    fn shutdown(&mut self) {
        let _ = self.tx.send(WriterMsg::Shutdown);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

// ---------------------------------------------------------------------------
// Store.
// ---------------------------------------------------------------------------

#[derive(Default)]
pub struct Store {
    path: PathBuf,
    drafts: Drafts,
    dirty: BTreeSet<DraftKey>,
    writer: Option<Writer>,
}

impl Drop for Store {
    fn drop(&mut self) {
        if let Some(writer) = self.writer.as_ref() {
            let _ = writer.tx.send(WriterMsg::Shutdown);
        }
    }
}

impl Store {
    pub fn open() -> io::Result<Self> {
        let root = if cfg!(windows) {
            std::env::var_os("LOCALAPPDATA").map(PathBuf::from)
        } else {
            std::env::var_os("XDG_DATA_HOME")
                .filter(|path| Path::new(path).is_absolute())
                .map(PathBuf::from)
                .or_else(|| {
                    std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/share"))
                })
        }
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "No user data directory"))?;
        let path = root.join("LeetCodeLab").join("drafts-v1.json");
        // Fail fast on restricted profiles (unwritable root): creating the
        // directory now surfaces "storage unavailable" at launch instead of
        // silently discarding the first edits and failing on flush.
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                let kind = error.kind();
                io::Error::new(kind, format!("cannot create {}: {error}", parent.display()))
            })?;
        }
        Self::load(path).map(|mut store| {
            store.writer = Some(Writer::spawn());
            store
        })
    }

    /// Test-only store rooted at a unique temp path. The path is absolute
    /// (so `stage()` accepts edits) but never the real profile; disk writes
    /// still flow through the normal validity gate and may fail on
    /// restricted profiles without disturbing the in-memory map.
    /// Compiled out of the packaged app.
    #[cfg(test)]
    pub fn test_store() -> Self {
        let path = std::env::temp_dir().join(format!(
            "leetlab-test-drafts-{}-{}.json",
            std::process::id(),
            unique_suffix()
        ));
        Self {
            path,
            drafts: Drafts::new(),
            dirty: BTreeSet::new(),
            writer: None,
        }
    }

    /// Parent directory of the drafts file, if storage is configured.
    pub fn path_parent(&self) -> Option<&Path> {
        if self.path.as_os_str().is_empty() {
            None
        } else {
            self.path.parent()
        }
    }

    fn load(path: PathBuf) -> io::Result<Self> {
        let drafts = if drafts_path_valid(&path) {
            load_drafts(&path)?
        } else {
            Drafts::new()
        };
        Ok(Self {
            path,
            drafts,
            dirty: BTreeSet::new(),
            writer: None,
        })
    }

    pub fn get(&self, slug: &str, language: &str) -> Option<&String> {
        self.drafts.get(slug)?.get(language)
    }

    /// Stage an edit in memory and hand it to the background writer.
    /// Returns `Ok(true)` when the value changed. Disk I/O happens off the
    /// calling thread; use [`Store::save_now`] at disposal points and
    /// [`Store::flush_shutdown`] on normal shutdown.
    pub fn stage(&mut self, slug: &str, language: &str, code: String) -> io::Result<bool> {
        if self.get(slug, language) == Some(&code) {
            return Ok(false);
        }
        if !drafts_path_valid(&self.path) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Draft storage is unavailable",
            ));
        }
        self.drafts
            .entry(slug.to_owned())
            .or_default()
            .insert(language.to_owned(), code.clone());
        let key = (slug.to_owned(), language.to_owned());
        self.dirty.insert(key.clone());
        let mut entries = BTreeMap::new();
        entries.insert(key, code);
        if let Some(writer) = self.writer.as_ref() {
            writer.send(&self.path, &entries);
        }
        Ok(true)
    }

    /// Synchronously persist every staged edit. Used at disposal points
    /// (navigation, Run) and on shutdown. Reload-merge keeps concurrent
    /// instances' keys; the writer is re-seeded afterwards so a trailing
    /// background write converges on the same values.
    pub fn save_now(&mut self) -> io::Result<()> {
        if self.dirty.is_empty() {
            return Ok(());
        }
        if !drafts_path_valid(&self.path) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Draft storage is unavailable",
            ));
        }
        let entries: BTreeMap<DraftKey, String> = self
            .dirty
            .iter()
            .filter_map(|key| {
                self.drafts
                    .get(&key.0)
                    .and_then(|languages| languages.get(&key.1))
                    .map(|code| (key.clone(), code.clone()))
            })
            .collect();
        // Refresh the in-memory view with any keys a concurrent instance
        // wrote, then overlay our staged edits so nothing is lost.
        let mut disk = load_drafts(&self.path)?;
        for ((slug, language), code) in &entries {
            disk.entry(slug.clone())
                .or_default()
                .insert(language.clone(), code.clone());
        }
        atomic_write(&self.path, &disk)?;
        self.drafts = disk;
        self.dirty.clear();
        if let Some(writer) = self.writer.as_ref() {
            writer.send(&self.path, &entries);
        }
        Ok(())
    }

    /// Surface the latest background write failure, if any.
    pub fn poll_errors(&self) -> Option<String> {
        self.writer.as_ref()?.poll_errors()
    }

    /// Persist staged edits, stop the background writer, and report the last
    /// error if one occurred. Call on normal shutdown.
    pub fn flush_shutdown(&mut self) -> Option<String> {
        let mut error = self.save_now().err().map(|error| error.to_string());
        if let Some(writer) = self.writer.as_mut() {
            writer.shutdown();
            if error.is_none() {
                error = writer.poll_errors();
            }
        }
        error
    }

    // -- imports -----------------------------------------------------------

    fn apply_import(&mut self, entries: BTreeMap<DraftKey, String>) -> io::Result<ImportReport> {
        let total = entries.len();
        let mut slugs = BTreeSet::new();
        for ((slug, language), code) in &entries {
            slugs.insert(slug.clone());
            self.drafts
                .entry(slug.clone())
                .or_default()
                .insert(language.clone(), code.clone());
            self.dirty.insert((slug.clone(), language.clone()));
        }
        let slug_count = slugs.len();
        self.save_now()?;
        Ok(ImportReport {
            slugs: slug_count,
            drafts: total,
            skipped: false,
            backup: None,
            progress: BTreeMap::new(),
        })
    }

    /// Import server progress from a `LCLAB_PROGRESS`-style file
    /// (`{items: {slug: {code: {lang: code}, status, attempts, updatedAt,
    /// solvedAt, dueAt, lastMs, lastLang}}}`).
    /// Code maps go to drafts; progress fields ride along in the report for
    /// the progress store to merge. The source is copied into `backup_dir`
    /// and a content marker makes repeat imports idempotent.
    pub fn import_progress(
        &mut self,
        source: &Path,
        backup_dir: &Path,
    ) -> io::Result<ImportReport> {
        let bytes = fs::read(source)?;
        let marker = backup_dir.join(format!("import-progress-{}.done", fnv1a(&bytes)));
        if marker.is_file() {
            return Ok(ImportReport {
                slugs: 0,
                drafts: 0,
                skipped: true,
                backup: None,
                progress: BTreeMap::new(),
            });
        }
        let parsed: serde_json::Value = serde_json::from_slice(&bytes)?;
        let mut entries = BTreeMap::new();
        let mut progress = BTreeMap::new();
        if let Some(items) = parsed.get("items").and_then(|value| value.as_object()) {
            for (slug, entry) in items {
                if let Some(code) = entry.get("code").and_then(|value| value.as_object()) {
                    for (language, text) in code {
                        if let Some(text) = text.as_str() {
                            entries.insert((slug.clone(), language.clone()), text.to_owned());
                        }
                    }
                }
                let number = |key: &str| entry.get(key).and_then(|value| value.as_u64());
                let text = |key: &str| {
                    entry
                        .get(key)
                        .and_then(|value| value.as_str())
                        .map(str::to_owned)
                };
                progress.insert(
                    slug.clone(),
                    ImportedItem {
                        status: text("status"),
                        attempts: number("attempts").map(|value| value as u32),
                        updated_at_ms: number("updatedAt"),
                        solved_at_ms: number("solvedAt"),
                        due_at_ms: number("dueAt"),
                        last_ms: number("lastMs"),
                        last_lang: text("lastLang"),
                        note: text("note"),
                    },
                );
            }
        }
        fs::create_dir_all(backup_dir)?;
        let backup = backup_dir.join(format!("progress-{}.json", unique_suffix()));
        fs::write(&backup, &bytes)?;
        let mut report = self.apply_import(entries)?;
        fs::write(&marker, b"ok")?;
        report.backup = Some(backup);
        report.progress = progress;
        Ok(report)
    }

    /// Import an explicit browser-drafts export
    /// (`{version: 1, drafts: {slug: {lang: code}}}`) with the same backup and
    /// idempotency guarantees as [`Store::import_progress`].
    pub fn import_browser_export(
        &mut self,
        source: &Path,
        backup_dir: &Path,
    ) -> io::Result<ImportReport> {
        let bytes = fs::read(source)?;
        let marker = backup_dir.join(format!("import-browser-{}.done", fnv1a(&bytes)));
        if marker.is_file() {
            return Ok(ImportReport {
                slugs: 0,
                drafts: 0,
                skipped: true,
                backup: None,
                progress: BTreeMap::new(),
            });
        }
        let parsed: serde_json::Value = serde_json::from_slice(&bytes)?;
        let mut entries = BTreeMap::new();
        if let Some(drafts) = parsed.get("drafts").and_then(|value| value.as_object()) {
            for (slug, languages) in drafts {
                if let Some(languages) = languages.as_object() {
                    for (language, text) in languages {
                        if let Some(text) = text.as_str() {
                            entries.insert((slug.clone(), language.clone()), text.to_owned());
                        }
                    }
                }
            }
        }
        fs::create_dir_all(backup_dir)?;
        let backup = backup_dir.join(format!("browser-drafts-{}.json", unique_suffix()));
        fs::write(&backup, &bytes)?;
        let mut report = self.apply_import(entries)?;
        fs::write(&marker, b"ok")?;
        report.backup = Some(backup);
        Ok(report)
    }
}

#[derive(Debug, Default)]
pub struct ImportReport {
    pub slugs: usize,
    pub drafts: usize,
    pub skipped: bool,
    pub backup: Option<PathBuf>,
    /// Server progress fields per slug, for the progress store to merge.
    pub progress: BTreeMap<String, ImportedItem>,
}

// ---------------------------------------------------------------------------
// Debounced saver state machine (mirrors `tools/draft_check.mjs`).
// ---------------------------------------------------------------------------

/// Coalesces rapid edits per `(slug, language)`: repeat edits overwrite the
/// pending value, switching keys (or an explicit [`DraftSaver::flush`])
/// releases the previous key for persistence. Persistence itself stays in
/// [`Store`]; this type only decides *what* is due.
#[derive(Default)]
pub struct DraftSaver {
    current: Option<DraftKey>,
    pending: BTreeMap<DraftKey, String>,
}

impl DraftSaver {
    /// Queue an edit. Returns the previous key's latest value when the key
    /// switched, so the caller can persist it immediately (language switch /
    /// navigation disposal in the web reference).
    pub fn queue(
        &mut self,
        slug: &str,
        language: &str,
        code: String,
    ) -> Option<(String, String, String)> {
        let key = (slug.to_owned(), language.to_owned());
        if self.current.as_ref() != Some(&key) {
            let due = self.current.take().and_then(|previous| {
                self.pending
                    .remove(&previous)
                    .map(|value| (previous.0, previous.1, value))
            });
            self.current = Some(key.clone());
            self.pending.insert(key, code);
            due
        } else {
            self.pending.insert(key, code);
            None
        }
    }

    /// Release the current key, e.g. on navigation, disposal, or shutdown.
    pub fn flush(&mut self) -> Option<(String, String, String)> {
        self.current
            .take()
            .and_then(|key| self.pending.remove(&key).map(|value| (key.0, key.1, value)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    static NEXT_TEST: AtomicU64 = AtomicU64::new(0);

    fn test_dir(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|value| value.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!(
            "leetlab-drafts-test-{}-{nanos}-{}-{name}",
            std::process::id(),
            NEXT_TEST.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn test_store(name: &str) -> (PathBuf, Store) {
        let dir = test_dir(name);
        let path = dir.join("drafts-v1.json");
        let store = Store::load(path.clone()).unwrap();
        (dir, store)
    }

    fn sync_save(store: &mut Store, slug: &str, language: &str, code: &str) {
        store.stage(slug, language, code.to_owned()).unwrap();
        store.save_now().unwrap();
    }

    #[test]
    fn reopens_replaced_drafts_including_empty_code() {
        let (dir, mut store) = test_store("reopen");
        sync_save(&mut store, "two-sum", "java", "first");
        sync_save(&mut store, "two-sum", "cpp", "cpp draft");
        sync_save(&mut store, "two-sum", "java", "");
        let reopened = Store::load(store.path.clone()).unwrap();
        assert_eq!(
            reopened.get("two-sum", "java").map(String::as_str),
            Some("")
        );
        assert_eq!(
            reopened.get("two-sum", "cpp").map(String::as_str),
            Some("cpp draft")
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn saver_coalesces_like_the_web_reference() {
        // Mirrors tools/draft_check.mjs: latest edit wins per key, a key
        // switch releases the previous key, destroy flushes the remainder.
        let mut saver = DraftSaver::default();
        let mut saved = Vec::new();
        assert_eq!(saver.queue("two-sum", "java", "unfinished".into()), None);
        assert_eq!(
            saver.queue("two-sum", "java", "latest Java edit".into()),
            None
        );
        saved.push(saver.queue("two-sum", "cpp", "C++ edit".into()));
        assert_eq!(
            saved,
            [Some((
                "two-sum".to_owned(),
                "java".to_owned(),
                "latest Java edit".to_owned()
            ))]
        );
        saved.push(saver.queue("contains-duplicate", "cpp", "next problem edit".into()));
        assert_eq!(
            saved[1],
            Some((
                "two-sum".to_owned(),
                "cpp".to_owned(),
                "C++ edit".to_owned()
            ))
        );
        saved.push(saver.flush());
        assert_eq!(
            saved[2],
            Some((
                "contains-duplicate".to_owned(),
                "cpp".to_owned(),
                "next problem edit".to_owned()
            ))
        );
        assert!(saver.flush().is_none());
    }

    #[test]
    fn corrupt_file_is_backed_up_and_starts_fresh() {
        let (dir, _) = test_store("corrupt");
        let path = dir.join("drafts-v1.json");
        fs::write(&path, b"{ not json").unwrap();
        let store = Store::load(path.clone()).unwrap();
        assert!(store.get("two-sum", "java").is_none());
        let backup = fs::read_dir(&dir)
            .unwrap()
            .flatten()
            .map(|entry| entry.path())
            .find(|candidate| {
                candidate
                    .extension()
                    .is_some_and(|extension| extension == "bak")
            });
        assert!(backup.is_some(), "corrupt file must be backed up");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn concurrent_instances_merge_per_key() {
        let (dir, mut first) = test_store("concurrent");
        sync_save(&mut first, "two-sum", "java", "from-first");
        let mut second = Store::load(first.path.clone()).unwrap();
        sync_save(&mut second, "two-sum", "cpp", "from-second");
        sync_save(&mut first, "contains-duplicate", "java", "first-wins");
        sync_save(&mut second, "contains-duplicate", "java", "second-wins");
        let reopened = Store::load(first.path.clone()).unwrap();
        assert_eq!(
            reopened.get("two-sum", "java").map(String::as_str),
            Some("from-first")
        );
        assert_eq!(
            reopened.get("two-sum", "cpp").map(String::as_str),
            Some("from-second")
        );
        assert_eq!(
            reopened
                .get("contains-duplicate", "java")
                .map(String::as_str),
            Some("second-wins")
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn unicode_paths_round_trip() {
        let dir = test_dir("unicode-路径-🚀");
        let path = dir.join("drafts-v1.json");
        let mut store = Store::load(path).unwrap();
        sync_save(&mut store, "two-sum", "java", "編集中");
        let reopened = Store::load(store.path.clone()).unwrap();
        assert_eq!(
            reopened.get("two-sum", "java").map(String::as_str),
            Some("編集中")
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn interrupted_tmp_write_leaves_original_intact() {
        let (dir, mut store) = test_store("interrupted");
        sync_save(&mut store, "two-sum", "java", "kept");
        // Simulate a crash between tmp creation and rename.
        let stale = dir.join("drafts-v1.stale.tmp");
        fs::write(&stale, b"{\"two-sum\":").unwrap();
        let reopened = Store::load(store.path.clone()).unwrap();
        assert_eq!(
            reopened.get("two-sum", "java").map(String::as_str),
            Some("kept")
        );
        sync_save(&mut store, "two-sum", "java", "newer");
        assert!(!stale.exists(), "stale tmp must be cleaned on save");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn progress_import_is_idempotent_with_backup() {
        let (dir, mut store) = test_store("import");
        let source = dir.join("progress.json");
        fs::write(
            &source,
            br#"{"items": {"two-sum": {"code": {"java": "imported"}, "updatedAt": 1}}, "settings": {}, "updatedAt": 1}"#,
        )
        .unwrap();
        let backups = dir.join("backups");
        let first = store.import_progress(&source, &backups).unwrap();
        assert!(!first.skipped);
        assert_eq!((first.slugs, first.drafts), (1, 1));
        assert!(first.backup.is_some());
        assert_eq!(
            store.get("two-sum", "java").map(String::as_str),
            Some("imported")
        );
        let entries_before: Vec<_> = fs::read_dir(&backups).unwrap().collect();
        let second = store.import_progress(&source, &backups).unwrap();
        assert!(second.skipped);
        let entries_after: Vec<_> = fs::read_dir(&backups).unwrap().collect();
        assert_eq!(entries_before.len(), entries_after.len());
        // A changed source imports again under a new marker.
        fs::write(
            &source,
            br#"{"items": {"two-sum": {"code": {"java": "imported-v2"}, "updatedAt": 2}}, "settings": {}, "updatedAt": 2}"#,
        )
        .unwrap();
        let third = store.import_progress(&source, &backups).unwrap();
        assert!(!third.skipped);
        assert_eq!(
            store.get("two-sum", "java").map(String::as_str),
            Some("imported-v2")
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn progress_import_carries_progress_fields() {
        let (dir, mut store) = test_store("import-fields");
        let source = dir.join("progress.json");
        fs::write(
            &source,
            br#"{"items": {"two-sum": {"code": {"java": "imported"}, "status": "solved", "attempts": 3, "updatedAt": 7000, "solvedAt": 6000, "dueAt": 9000, "lastMs": 250, "lastLang": "java"}}}"#,
        )
        .unwrap();
        let report = store
            .import_progress(&source, &dir.join("backups"))
            .unwrap();
        assert!(!report.skipped);
        assert_eq!(report.drafts, 1);
        let item = report.progress.get("two-sum").expect("progress fields");
        assert_eq!(item.status.as_deref(), Some("solved"));
        assert_eq!(item.attempts, Some(3));
        assert_eq!(item.updated_at_ms, Some(7000));
        // The progress store merges the carried fields newest-wins.
        let mut progress = crate::progress::Store::default();
        assert_eq!(progress.apply_import(&report.progress), 1);
        assert_eq!(progress.status("two-sum"), crate::progress::Status::Solved);
        assert_eq!(progress.attempts("two-sum"), 3);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn browser_export_import_round_trip() {
        let (dir, mut store) = test_store("browser");
        let source = dir.join("browser-drafts.json");
        fs::write(
            &source,
            br#"{"version": 1, "drafts": {"two-sum": {"cpp": "browser cpp""#,
        )
        .unwrap();
        // The fixture above is intentionally truncated: the importer must see
        // invalid JSON as an error, never a silent partial import.
        assert!(store
            .import_browser_export(&source, &dir.join("b"))
            .is_err());
        fs::write(
            &source,
            br#"{"version": 1, "drafts": {"two-sum": {"cpp": "browser cpp"}}}"#,
        )
        .unwrap();
        let report = store
            .import_browser_export(&source, &dir.join("b"))
            .unwrap();
        assert!(!report.skipped);
        assert_eq!(
            store.get("two-sum", "cpp").map(String::as_str),
            Some("browser cpp")
        );
        fs::remove_dir_all(dir).unwrap();
    }
}
