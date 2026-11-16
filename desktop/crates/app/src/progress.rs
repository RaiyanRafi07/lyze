//! Per-user progress: attempted/solved per slug.
//!
//! Mirrors the web `store.js` semantics: an attempt never downgrades a solved
//! entry, a submission records solved (with spaced-repetition due dates) only
//! when every judge test passes, and reset returns a slug to todo while saved
//! code (which lives in drafts) is untouched. Imports merge newest
//! `updatedAt` wins per slug, matching the host `mergeProgress` rule.
//! Writes are synchronous atomic replaces; submissions are infrequent (one
//! per Run/Submit, never per keystroke), so no background writer is needed.

use std::collections::BTreeMap;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Todo,
    Attempted,
    Solved,
    Due,
}

impl Status {
    pub fn label(self) -> &'static str {
        match self {
            Self::Todo => "New",
            Self::Attempted => "Attempted",
            Self::Solved => "Solved",
            Self::Due => "Due for review",
        }
    }

    fn parse(raw: &str) -> Self {
        match raw {
            "solved" => Self::Solved,
            "attempted" => Self::Attempted,
            _ => Self::Todo,
        }
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
struct Entry {
    status: Option<String>,
    attempts: u32,
    updated_at: u64,
    solved_at: Option<u64>,
    last_attempt_at: Option<u64>,
    due_at: Option<u64>,
    last_ms: Option<u64>,
    last_lang: Option<String>,
    #[serde(default)]
    pub note: String,
}

/// Parsed server-progress fields for one slug (code maps go to drafts).
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct ImportedItem {
    pub status: Option<String>,
    pub attempts: Option<u32>,
    pub updated_at_ms: Option<u64>,
    pub solved_at_ms: Option<u64>,
    pub due_at_ms: Option<u64>,
    pub last_ms: Option<u64>,
    pub last_lang: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Default)]
pub struct Store {
    path: PathBuf,
    items: BTreeMap<String, Entry>,
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis().min(u128::from(u64::MAX)) as u64)
        .unwrap_or(0)
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
        let path = root.join("LeetCodeLab").join("progress-v1.json");
        // Fail fast on restricted profiles, mirroring drafts::Store::open:
        // surface "storage unavailable" at launch, not on first save.
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|error| {
                let kind = error.kind();
                io::Error::new(kind, format!("cannot create {}: {error}", parent.display()))
            })?;
        }
        Self::load(path)
    }

    fn load(path: PathBuf) -> io::Result<Self> {
        let items = match fs::read(&path) {
            Ok(bytes) => parse(&bytes)?,
            Err(error) if error.kind() == io::ErrorKind::NotFound => BTreeMap::new(),
            Err(error) => return Err(error),
        };
        Ok(Self { path, items })
    }

    pub fn status(&self, slug: &str) -> Status {
        self.items
            .get(slug)
            .and_then(|entry| entry.status.as_deref())
            .map(Status::parse)
            .unwrap_or(Status::Todo)
    }

    pub fn attempts(&self, slug: &str) -> u32 {
        self.items
            .get(slug)
            .map(|entry| entry.attempts)
            .unwrap_or(0)
    }

    pub fn due_at(&self, slug: &str) -> Option<u64> {
        self.items.get(slug).and_then(|entry| entry.due_at)
    }

    pub fn get_note(&self, slug: &str) -> &str {
        self.items
            .get(slug)
            .map(|entry| entry.note.as_str())
            .unwrap_or("")
    }

    pub fn set_note(&mut self, slug: &str, note: &str, at_ms: u64) {
        let entry = self.items.entry(slug.to_owned()).or_default();
        entry.note = note.to_owned();
        entry.updated_at = at_ms;
    }

    pub fn record_attempt(&mut self, slug: &str, at_ms: u64) {
        let entry = self.items.entry(slug.to_owned()).or_default();
        entry.attempts += 1;
        if entry.status.as_deref() != Some("solved") {
            entry.status = Some("attempted".into());
        }
        entry.last_attempt_at = Some(at_ms);
        entry.updated_at = at_ms;
    }

    pub fn record_solved(&mut self, slug: &str, run_ms: u64, lang: &str, at_ms: u64) {
        let entry = self.items.entry(slug.to_owned()).or_default();
        entry.attempts = entry.attempts.max(1);
        let days = match entry.attempts {
            1 => 2,
            2 => 5,
            3..=4 => 10,
            _ => 21,
        };
        entry.status = Some("solved".into());
        entry.solved_at = Some(at_ms);
        entry.due_at = Some(at_ms.saturating_add(days * 86_400_000));
        entry.last_ms = Some(run_ms);
        entry.last_lang = Some(lang.to_owned());
        entry.updated_at = at_ms;
    }

    pub fn reset(&mut self, slug: &str, at_ms: u64) {
        let entry = self.items.entry(slug.to_owned()).or_default();
        entry.status = Some("todo".into());
        entry.attempts = 0;
        entry.solved_at = None;
        entry.due_at = None;
        entry.last_attempt_at = None;
        entry.last_ms = None;
        entry.last_lang = None;
        entry.updated_at = at_ms;
    }

    pub fn reset_all(&mut self, at_ms: u64) {
        for entry in self.items.values_mut() {
            entry.status = Some("todo".into());
            entry.attempts = 0;
            entry.solved_at = None;
            entry.due_at = None;
            entry.last_attempt_at = None;
            entry.last_ms = None;
            entry.last_lang = None;
            entry.updated_at = at_ms;
        }
    }

    pub fn counts(&self) -> (usize, usize) {
        let mut solved = 0;
        let mut attempted = 0;
        for entry in self.items.values() {
            match entry.status.as_deref() {
                Some("solved") => solved += 1,
                Some("attempted") => attempted += 1,
                _ => {}
            }
        }
        (solved, attempted)
    }

    /// Merge imported server items newest-`updatedAt`-wins per slug.
    /// Items with no progress fields at all carry no information and are
    /// skipped. Returns the number of slugs touched.
    pub fn apply_import(&mut self, items: &BTreeMap<String, ImportedItem>) -> usize {
        let mut touched = 0;
        for (slug, imported) in items {
            if imported.status.is_none()
                && imported.attempts.is_none()
                && imported.updated_at_ms.is_none()
                && imported.solved_at_ms.is_none()
                && imported.due_at_ms.is_none()
                && imported.last_ms.is_none()
                && imported.last_lang.is_none()
                && imported.note.is_none()
            {
                continue;
            }
            let incoming_at = imported.updated_at_ms.unwrap_or(0);
            let keep_incoming = self
                .items
                .get(slug)
                .map(|entry| incoming_at >= entry.updated_at)
                .unwrap_or(true);
            if !keep_incoming {
                continue;
            }
            let entry = self.items.entry(slug.clone()).or_default();
            if let Some(status) = &imported.status {
                entry.status = Some(status.clone());
            }
            if let Some(attempts) = imported.attempts {
                entry.attempts = attempts;
            }
            if imported.updated_at_ms.is_some() {
                entry.updated_at = incoming_at;
            }
            if imported.solved_at_ms.is_some() {
                entry.solved_at = imported.solved_at_ms;
            }
            if imported.due_at_ms.is_some() {
                entry.due_at = imported.due_at_ms;
            }
            if imported.last_ms.is_some() {
                entry.last_ms = imported.last_ms;
            }
            if imported.last_lang.is_some() {
                entry.last_lang.clone_from(&imported.last_lang);
            }
            if let Some(note) = &imported.note {
                entry.note.clone_from(note);
            }
            touched += 1;
        }
        touched
    }

    pub fn save(&self) -> io::Result<()> {
        let parent = self
            .path
            .parent()
            .filter(|path| path.is_absolute())
            .ok_or_else(|| {
                io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "Progress storage is unavailable",
                )
            })?;
        fs::create_dir_all(parent)?;
        let tmp = parent.join(format!(
            "progress-v1.{}.{}.tmp",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|value| value.as_nanos())
                .unwrap_or(0)
        ));
        let result = (|| {
            let mut file = fs::File::create(&tmp)?;
            let items: BTreeMap<_, _> = self
                .items
                .iter()
                .map(|(slug, entry)| {
                    (
                        slug.clone(),
                        serde_json::json!({
                            "status": entry.status,
                            "attempts": entry.attempts,
                            "updatedAt": entry.updated_at,
                            "solvedAt": entry.solved_at,
                            "lastAttemptAt": entry.last_attempt_at,
                            "dueAt": entry.due_at,
                            "lastMs": entry.last_ms,
                            "lastLang": entry.last_lang,
                            "note": entry.note,
                        }),
                    )
                })
                .collect();
            serde_json::to_writer(
                &mut file,
                &serde_json::json!({"version": 1, "items": items}),
            )?;
            file.flush()?;
            file.sync_all()?;
            drop(file);
            fs::rename(&tmp, &self.path)?;
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
}

fn parse(bytes: &[u8]) -> io::Result<BTreeMap<String, Entry>> {
    let value: serde_json::Value = serde_json::from_slice(bytes)?;
    let mut items = BTreeMap::new();
    if let Some(map) = value.get("items").and_then(|value| value.as_object()) {
        for (slug, entry) in map {
            items.insert(
                slug.clone(),
                Entry {
                    status: entry
                        .get("status")
                        .and_then(|value| value.as_str())
                        .map(str::to_owned),
                    attempts: entry
                        .get("attempts")
                        .and_then(|value| value.as_u64())
                        .unwrap_or(0) as u32,
                    updated_at: entry
                        .get("updatedAt")
                        .and_then(|value| value.as_u64())
                        .unwrap_or(0),
                    solved_at: entry.get("solvedAt").and_then(|value| value.as_u64()),
                    last_attempt_at: entry.get("lastAttemptAt").and_then(|value| value.as_u64()),
                    due_at: entry.get("dueAt").and_then(|value| value.as_u64()),
                    last_ms: entry.get("lastMs").and_then(|value| value.as_u64()),
                    last_lang: entry
                        .get("lastLang")
                        .and_then(|value| value.as_str())
                        .map(str::to_owned),
                    note: entry
                        .get("note")
                        .and_then(|value| value.as_str())
                        .map(str::to_owned)
                        .unwrap_or_default(),
                },
            );
        }
    }
    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEST: AtomicU64 = AtomicU64::new(0);

    fn test_store(name: &str) -> (PathBuf, Store) {
        let dir = std::env::temp_dir().join(format!(
            "leetlab-progress-test-{}-{}-{name}",
            std::process::id(),
            NEXT_TEST.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("progress-v1.json");
        (dir, Store::load(path).unwrap())
    }

    #[test]
    fn attempt_never_downgrades_solved() {
        let (_dir, mut store) = test_store("attempt");
        assert_eq!(store.status("two-sum"), Status::Todo);
        store.record_attempt("two-sum", 1000);
        assert_eq!(store.status("two-sum"), Status::Attempted);
        assert_eq!(store.attempts("two-sum"), 1);
        store.record_solved("two-sum", 250, "java", 2000);
        assert_eq!(store.status("two-sum"), Status::Solved);
        store.record_attempt("two-sum", 3000);
        assert_eq!(store.status("two-sum"), Status::Solved);
        assert_eq!(store.attempts("two-sum"), 2);
        store.save().unwrap();
        let reopened = Store::load(store.path.clone()).unwrap();
        assert_eq!(reopened.status("two-sum"), Status::Solved);
        assert_eq!(reopened.attempts("two-sum"), 2);
        fs::remove_dir_all(&_dir).unwrap();
    }

    #[test]
    fn solved_sets_spaced_due_dates() {
        let (_dir, mut store) = test_store("due");
        store.record_solved("a", 10, "java", 1_000);
        store.record_attempt("b", 1_000);
        store.record_solved("b", 10, "cpp", 2_000);
        store.record_attempt("b", 3_000);
        store.record_solved("b", 10, "cpp", 4_000);
        let a = store.items["a"].clone();
        let b = store.items["b"].clone();
        assert_eq!(a.due_at, Some(1_000 + 2 * 86_400_000));
        // b: attempts went 1 (solve) -> 2 (attempt) -> solved with attempts 2 -> 5 days.
        assert_eq!(b.attempts, 2);
        assert_eq!(b.due_at, Some(4_000 + 5 * 86_400_000));
        assert_eq!(b.last_lang.as_deref(), Some("cpp"));
        fs::remove_dir_all(&_dir).unwrap();
    }

    #[test]
    fn reset_returns_to_todo() {
        let (_dir, mut store) = test_store("reset");
        store.record_solved("two-sum", 10, "java", 1_000);
        store.reset("two-sum", 2_000);
        assert_eq!(store.status("two-sum"), Status::Todo);
        assert_eq!(store.attempts("two-sum"), 0);
        store.record_attempt("x", 1);
        store.reset_all(2);
        assert_eq!(store.counts(), (0, 0));
        fs::remove_dir_all(&_dir).unwrap();
    }

    #[test]
    fn import_merges_newest_wins() {
        let (_dir, mut store) = test_store("import");
        store.record_solved("two-sum", 10, "java", 5_000);
        let mut older = BTreeMap::new();
        older.insert(
            "two-sum".to_owned(),
            ImportedItem {
                status: Some("attempted".into()),
                attempts: Some(9),
                updated_at_ms: Some(1_000),
                ..Default::default()
            },
        );
        assert_eq!(store.apply_import(&older), 0);
        assert_eq!(store.status("two-sum"), Status::Solved);
        let mut newer = BTreeMap::new();
        newer.insert(
            "two-sum".to_owned(),
            ImportedItem {
                status: Some("attempted".into()),
                attempts: Some(9),
                updated_at_ms: Some(9_000),
                ..Default::default()
            },
        );
        newer.insert(
            "other".to_owned(),
            ImportedItem {
                status: Some("solved".into()),
                attempts: Some(1),
                updated_at_ms: Some(9_000),
                last_ms: Some(42),
                last_lang: Some("cpp".into()),
                ..Default::default()
            },
        );
        assert_eq!(store.apply_import(&newer), 2);
        assert_eq!(store.status("two-sum"), Status::Attempted);
        assert_eq!(store.status("other"), Status::Solved);
        assert_eq!(store.counts(), (1, 1));
        store.save().unwrap();
        fs::remove_dir_all(&_dir).unwrap();
    }

    #[test]
    fn note_persists_across_save_and_import() {
        let (_dir, mut store) = test_store("note");
        // Missing note defaults to empty.
        assert_eq!(store.get_note("two-sum"), "");
        // set_note stores text and bumps updated_at.
        store.set_note("two-sum", "remember hashmap", 1_000);
        assert_eq!(store.get_note("two-sum"), "remember hashmap");
        store.save().unwrap();
        let reopened = Store::load(store.path.clone()).unwrap();
        assert_eq!(reopened.get_note("two-sum"), "remember hashmap");
        // Legacy files without a note field parse with an empty note.
        let legacy = serde_json::json!({
            "version": 1,
            "items": {
                "two-sum": {
                    "status": "attempted",
                    "attempts": 1,
                    "updatedAt": 500,
                }
            }
        });
        let parsed = parse(&serde_json::to_vec(&legacy).unwrap()).unwrap();
        assert_eq!(parsed["two-sum"].note, "");
        // Newest-wins: an older import keeps the local note.
        let mut items = BTreeMap::new();
        items.insert(
            "two-sum".to_owned(),
            ImportedItem {
                updated_at_ms: Some(500),
                note: Some("stale".into()),
                ..Default::default()
            },
        );
        assert_eq!(store.apply_import(&items), 0);        assert_eq!(store.get_note("two-sum"), "remember hashmap");
        // A newer import replaces the note.
        let mut newer = BTreeMap::new();
        newer.insert(
            "two-sum".to_owned(),
            ImportedItem {
                updated_at_ms: Some(2_000),
                note: Some("fresh insight".into()),
                ..Default::default()
            },
        );
        assert_eq!(store.apply_import(&newer), 1);
        assert_eq!(store.get_note("two-sum"), "fresh insight");
        store.save().unwrap();
        let reread = Store::load(store.path.clone()).unwrap();
        assert_eq!(reread.get_note("two-sum"), "fresh insight");
        fs::remove_dir_all(&_dir).unwrap();
    }
}
