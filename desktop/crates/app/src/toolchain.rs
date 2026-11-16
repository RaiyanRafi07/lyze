//! Toolchain discovery for the native judge and tracer.
//!
//! Resolution order per tool, with no silent fallbacks:
//! 1. Bundled absolute paths under `{install_root}/toolchains` (Temurin JDK,
//!    MinGW-w64 UCRT on Windows, portable GCC on Linux).
//! 2. Explicit environment overrides (`LCLAB_JDK_HOME`, `LCLAB_CXX`).
//! 3. `PATH` lookup, verified with a one-shot `--version`/`-version` probe.
//!
//! Anything else is an actionable missing-toolchain error naming the expected
//! bundled path, the override, and the probed `PATH` name. The install root is
//! found the same way as the catalog resource root: ancestors of the current
//! executable, then ancestors of the working directory, holding the
//! `toolchains` marker directory.

use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

#[cfg(windows)]
fn exe(name: &str) -> String {
    format!("{name}.exe")
}

#[cfg(not(windows))]
fn exe(name: &str) -> String {
    name.to_owned()
}

/// Whether a compiler path is usable as-is on this platform.
///
/// On Windows the bundled MinGW driver resolves its own install location to
/// the canonical long path and drops quoting, so any space in that path
/// breaks compilation — including 8.3 short spellings, which the driver
/// re-expands. Only a canonically space-free location works, hence the
/// user-cache relocation below. Other platforms tolerate spaces.
#[cfg(windows)]
fn path_usable(path: &Path) -> bool {
    !path.as_os_str().to_string_lossy().contains(' ')
}

#[cfg(not(windows))]
#[allow(dead_code)]
fn path_usable(_path: &Path) -> bool {
    true
}

/// Candidate install roots: ancestors of the running executable, then
/// ancestors of the working directory. Each base is tried as-is (portable
/// layout: resources beside the binary) and with a `share/leetlab` suffix
/// (FHS layout: binary in `bin/`, resources in `share/leetlab/`).
pub fn resource_roots() -> Vec<PathBuf> {
    let exe_root = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(Path::to_path_buf));
    let cwd = std::env::current_dir().ok();
    let mut roots = Vec::new();
    for base in exe_root.into_iter().chain(cwd) {
        for ancestor in base.ancestors() {
            roots.push(ancestor.to_path_buf());
            roots.push(ancestor.join("share").join("leetlab"));
        }
    }
    roots
}

/// Locate the install root: the first candidate holding a `toolchains`
/// directory.
pub fn install_root() -> Option<PathBuf> {
    resource_roots()
        .into_iter()
        .find(|path| path.join("toolchains").is_dir())
}

fn bundled_in(root: &Path, parts: &[&str]) -> Option<PathBuf> {
    let mut path = root.to_path_buf();
    for part in parts {
        path.push(part);
    }
    if path.is_file() {
        Some(path)
    } else {
        None
    }
}

fn env_dir(name: &str) -> Option<PathBuf> {
    let value = std::env::var_os(name)?;
    if value.is_empty() {
        return None;
    }
    let path = PathBuf::from(value);
    if path.is_dir() {
        Some(path)
    } else {
        None
    }
}

fn env_file(name: &str) -> Option<PathBuf> {
    let value = std::env::var_os(name)?;
    if value.is_empty() {
        return None;
    }
    let path = PathBuf::from(value);
    if path.is_file() {
        return Some(path);
    }
    #[cfg(windows)]
    {
        let with_exe = path.with_extension("exe");
        if with_exe.is_file() {
            return Some(with_exe);
        }
    }
    None
}

/// One-shot probe: does `program` (bare `PATH` name) execute at all?
fn path_probe(program: &str, arg: &str) -> bool {
    let Ok(mut child) = Command::new(program)
        .arg(arg)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
    else {
        return false;
    };
    // Any spawn success counts as "present on PATH"; version output is
    // irrelevant. Bound the probe, then reap the child either way.
    let deadline = std::time::Instant::now() + Duration::from_secs(15);
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return true,
            Ok(None) => {}
            Err(_) => return true,
        }
        if std::time::Instant::now() >= deadline {
            break;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    let _ = child.kill();
    let _ = child.wait();
    true
}

fn missing_jdk() -> String {
    "JDK not found. Use the bundled Temurin 21 under toolchains/jdk or set LCLAB_JDK_HOME. No javac or java on PATH.".into()
}

fn missing_cxx() -> String {
    #[cfg(windows)]
    return "C++ toolchain not found. Use the bundled MinGW-w64 UCRT g++ under toolchains/gcc or set LCLAB_CXX. MSVC is not accepted.".into();
    #[cfg(not(windows))]
    return "C++ toolchain not found. Use the bundled GCC under toolchains/gcc or set LCLAB_CXX."
        .into();
}

/// Resolve the Java toolchain (compiler + runtime together; they ship paired).
pub fn java_toolchain() -> Result<(PathBuf, PathBuf), String> {
    if let Some(root) = install_root() {
        let javac = bundled_in(&root, &["toolchains", "jdk", "bin", &exe("javac")]);
        let java = bundled_in(&root, &["toolchains", "jdk", "bin", &exe("java")]);
        if let (Some(javac), Some(java)) = (javac, java) {
            return Ok((javac, java));
        }
    }
    if let Some(home) = env_dir("LCLAB_JDK_HOME") {
        let javac = home.join("bin").join(exe("javac"));
        let java = home.join("bin").join(exe("java"));
        if javac.is_file() && java.is_file() {
            return Ok((javac, java));
        }
        return Err(format!(
            "LCLAB_JDK_HOME points at {} but bin/javac or bin/java is missing there.",
            home.display()
        ));
    }
    if path_probe("javac", "-version") && path_probe("java", "-version") {
        return Ok((PathBuf::from("javac"), PathBuf::from("java")));
    }
    Err(missing_jdk())
}

/// Resolve the C++ compiler.
///
/// On Windows the MinGW driver cannot live under a path with spaces, so a
/// gcc root containing spaces is relocated once into a space-free per-user
/// cache (see `relocated_gcc`). An explicit override or a working `PATH`
/// entry beats a bundled toolchain that cannot be used as-is; only when
/// nothing else resolves does the bundled problem surface as the
/// actionable error.
pub fn cxx_toolchain() -> Result<PathBuf, String> {
    if let Some(root) = install_root() {
        if let Some(cxx) = bundled_in(&root, &["toolchains", "gcc", "bin", &exe("g++")]) {
            match prefer_space_free(&cxx) {
                Ok(usable) => return Ok(usable),
                Err(bundled_error) => return cxx_fallback(Some(bundled_error)),
            }
        }
    }
    cxx_fallback(None)
}

fn cxx_fallback(bundled_error: Option<String>) -> Result<PathBuf, String> {
    if let Some(file) = env_file("LCLAB_CXX") {
        return prefer_space_free(&file);
    }
    if let Some(dir) = env_dir("LCLAB_CXX") {
        let cxx = dir.join("bin").join(exe("g++"));
        if cxx.is_file() {
            return prefer_space_free(&cxx);
        }
        let direct = dir.join(exe("g++"));
        if direct.is_file() {
            return prefer_space_free(&direct);
        }
        return Err(format!(
            "LCLAB_CXX points at {} but no g++ was found there.",
            dir.display()
        ));
    }
    if path_probe("g++", "--version") {
        return Ok(PathBuf::from("g++"));
    }
    Err(bundled_error.unwrap_or_else(missing_cxx))
}

/// Use `path` directly when usable; otherwise (Windows only) relocate the
/// gcc tree into a space-free per-user cache.
///
/// `path` points at the `g++` binary; the driver derives its whole prefix
/// tree from its own canonical location, so the binary's path must contain
/// no spaces — invocation spelling does not help.
#[cfg(windows)]
fn prefer_space_free(path: &Path) -> Result<PathBuf, String> {
    if path_usable(path) {
        return Ok(path.to_path_buf());
    }
    relocated_gcc(path)
}

#[cfg(not(windows))]
fn prefer_space_free(path: &Path) -> Result<PathBuf, String> {
    Ok(path.to_path_buf())
}

/// Copy a spaced gcc tree into a space-free per-user cache and return the
/// cached binary. The copy happens at most once per source tree (marker
/// file with a content fingerprint); failures fall back to the original
/// path so grading can still try. The cache base itself must be canonically
/// space-free — a spaced profile cannot host it.
#[cfg(windows)]
fn relocated_gcc(source_binary: &Path) -> Result<PathBuf, String> {
    let root = source_binary
        .parent()
        .and_then(|bin| bin.parent())
        .ok_or_else(|| "could not determine the gcc root".to_owned())?;
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| {
            "C++ toolchain path contains spaces and LOCALAPPDATA is unavailable.".to_owned()
        })?;
    relocate_tree(
        root,
        &base.join("LeetCodeLab").join("toolchains").join("gcc"),
    )
}

/// Copy the gcc tree at `source_root` into `cache` (which must already be a
/// space-free location) and return the cached binary. The copy happens at
/// most once per source tree: the marker records a fingerprint of the
/// source driver binary, and a mismatch triggers a fresh copy.
#[cfg(windows)]
fn relocate_tree(source_root: &Path, cache: &Path) -> Result<PathBuf, String> {
    if !path_usable(cache) {
        return Err("C++ toolchain path contains spaces and the user profile \
            path does too; install the app to a space-free directory."
            .into());
    }
    let canonical = source_root.to_string_lossy().into_owned();
    // Fingerprint the source driver binary so a changed tree (trimmed
    // payload, toolchain upgrade) invalidates the cache.
    let fingerprint = || -> String {
        let driver = source_root.join("bin").join(exe("g++"));
        std::fs::metadata(&driver)
            .map(|meta| {
                format!(
                    "{} {} {}",
                    canonical,
                    meta.len(),
                    meta.modified()
                        .ok()
                        .and_then(|time| time
                            .duration_since(std::time::UNIX_EPOCH)
                            .ok()
                            .map(|age| age.as_secs()))
                        .unwrap_or(0)
                )
            })
            .unwrap_or_else(|_| canonical.clone())
    };
    let wanted = fingerprint();
    let marker = cache.join(".relocated-from");
    let fresh = cache.join("bin").join(exe("g++")).is_file()
        && std::fs::read_to_string(&marker).unwrap_or_default() == wanted;
    if !fresh {
        let _ = std::fs::remove_dir_all(&cache);
        copy_tree(source_root, &cache)
            .map_err(|error| format!("could not stage a space-free C++ toolchain copy: {error}"))?;
        std::fs::write(&marker, wanted).map_err(|error| error.to_string())?;
    }
    let cached = cache.join("bin").join(exe("g++"));
    if !cached.is_file() {
        return Err("space-free C++ toolchain copy is incomplete.".into());
    }
    Ok(cached)
}

#[cfg(windows)]
fn copy_tree(source: &Path, dest: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dest)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        let target = dest.join(entry.file_name());
        let kind = entry.file_type()?;
        if kind.is_dir() && !kind.is_symlink() {
            copy_tree(&entry.path(), &target)?;
        } else if kind.is_file() {
            std::fs::copy(entry.path(), target)?;
        }
        // Symlinks, reparse points, and anything else are skipped: the
        // staged Windows toolchain is a plain file tree.
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, OnceLock};

    /// Environment manipulation is process-global; serialize these tests so
    /// parallel threads cannot observe each other's overrides.
    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    #[test]
    fn path_usable_flags_spaces_on_windows() {
        assert!(path_usable(Path::new("C:\\tools\\gcc\\bin\\g++.exe")));
        #[cfg(windows)]
        assert!(!path_usable(Path::new("C:\\my tools\\gcc\\bin\\g++.exe")));
        #[cfg(not(windows))]
        assert!(path_usable(Path::new("/my tools/gcc/bin/g++")));
    }

    /// copy_tree is Windows-only (relocation has no non-Windows caller).
    #[cfg(windows)]
    #[test]
    fn copy_tree_round_trips_nested_files() {
        let dir = std::env::temp_dir().join(format!("leetlab-tc-copy-{}", std::process::id()));
        let src = dir.join("src");
        let dst = dir.join("dst");
        std::fs::create_dir_all(src.join("sub")).unwrap();
        std::fs::write(src.join("sub").join("g++.exe"), b"x").unwrap();
        copy_tree(&src, &dst).unwrap();
        assert_eq!(
            std::fs::read(dst.join("sub").join("g++.exe")).unwrap(),
            b"x"
        );
        // Second copy over the top is idempotent.
        copy_tree(&src, &dst).unwrap();
        std::fs::remove_dir_all(&dir).ok();
    }

    #[cfg(windows)]
    #[test]
    fn spaced_cache_reports_actionable_error() {
        let _guard = env_lock().lock().unwrap();
        let dir = std::env::temp_dir().join(format!("leetlab-tc-cache-{}", std::process::id()));
        let src = dir.join("gcc");
        std::fs::create_dir_all(src.join("bin")).unwrap();
        std::fs::write(src.join("bin").join(exe("g++")), b"x").unwrap();
        let error = relocate_tree(&src, &dir.join("my cache")).unwrap_err();
        assert!(error.contains("space-free"), "{error}");
        std::fs::remove_dir_all(&dir).ok();
    }

    /// Install and profile paths may contain spaces AND non-ASCII names;
    /// the staged copy must round-trip them byte-for-byte.
    #[cfg(windows)]
    #[test]
    fn copy_tree_round_trips_unicode_paths() {
        let dir = std::env::temp_dir().join(format!("leetlab-tc-uni-{}", std::process::id()));
        let src = dir.join("gcc épée 工具");
        let dst = dir.join("cache");
        std::fs::create_dir_all(src.join("bin")).unwrap();
        std::fs::write(src.join("bin").join("g++.exe"), b"driver").unwrap();
        std::fs::write(src.join("lib café.a"), b"archive").unwrap();
        copy_tree(&src, &dst).unwrap();
        assert_eq!(
            std::fs::read(dst.join("bin").join("g++.exe")).unwrap(),
            b"driver"
        );
        assert_eq!(std::fs::read(dst.join("lib café.a")).unwrap(), b"archive");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn env_override_points_at_explicit_files() {
        let _guard = env_lock().lock().unwrap();
        let dir = std::env::temp_dir().join(format!("leetlab-tc-{}", std::process::id()));
        let bin = dir.join("bin");
        std::fs::create_dir_all(&bin).unwrap();
        for tool in ["javac", "java", "g++"] {
            std::fs::write(bin.join(exe(tool)), b"x").unwrap();
        }
        // Scratch the user profile too so the test never touches the real
        // profile. The scratch profile is spaced, so resolving the fake
        // spaced toolchain reports the spaced-profile error (pinned below)
        // instead of relocating anywhere.
        let cache_home =
            std::env::temp_dir().join(format!("leetlab-tc-home-{}", std::process::id()));
        std::fs::create_dir_all(&cache_home).unwrap();
        let previous_home = std::env::var_os("LOCALAPPDATA");
        unsafe {
            std::env::set_var("LCLAB_JDK_HOME", &dir);
            std::env::set_var("LCLAB_CXX", bin.join(exe("g++")));
            std::env::set_var("LOCALAPPDATA", &cache_home);
        }
        let (javac, java) = java_toolchain().unwrap();
        assert_eq!(javac, bin.join(exe("javac")));
        assert_eq!(java, bin.join(exe("java")));
        #[cfg(windows)]
        {
            let error = cxx_toolchain().unwrap_err();
            assert!(error.contains("space-free"), "{error}");
        }
        unsafe {
            std::env::remove_var("LCLAB_JDK_HOME");
            std::env::remove_var("LCLAB_CXX");
            match previous_home {
                Some(value) => std::env::set_var("LOCALAPPDATA", value),
                None => std::env::remove_var("LOCALAPPDATA"),
            }
        }
        std::fs::remove_dir_all(&dir).ok();
        std::fs::remove_dir_all(&cache_home).ok();
    }

    #[test]
    fn empty_env_overrides_are_ignored() {
        let _guard = env_lock().lock().unwrap();
        unsafe {
            std::env::set_var("LCLAB_JDK_HOME", "");
            std::env::set_var("LCLAB_CXX", "");
        }
        // Must not error with the misleading "points at" message; it either
        // resolves via bundled/PATH toolchains or reports them missing.
        let java = java_toolchain();
        let cxx = cxx_toolchain();
        for result in [java.map(|_| ()), cxx.map(|_| ())] {
            if let Err(error) = result {
                assert!(
                    !error.contains("points at"),
                    "empty override must be ignored, got: {error}"
                );
            }
        }
        unsafe {
            std::env::remove_var("LCLAB_JDK_HOME");
            std::env::remove_var("LCLAB_CXX");
        }
    }

    #[test]
    fn dangling_jdk_home_reports_actionable_error() {
        let _guard = env_lock().lock().unwrap();
        let dir = std::env::temp_dir().join(format!("leetlab-tc-empty-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        unsafe {
            std::env::set_var("LCLAB_JDK_HOME", &dir);
        }
        let error = java_toolchain().unwrap_err();
        assert!(error.contains("LCLAB_JDK_HOME"), "{error}");
        unsafe {
            std::env::remove_var("LCLAB_JDK_HOME");
        }
        std::fs::remove_dir_all(&dir).ok();
    }

    /// wait_timeout is unstable-adjacent API; guard the probe helper compiles.
    /// Real PATH probing is covered by the compiler-backed suites.
    #[test]
    fn probe_rejects_missing_program_fast() {
        assert!(!path_probe("leetlab-no-such-tool-xyz", "--version"));
    }
}
