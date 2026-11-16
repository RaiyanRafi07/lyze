// Native app entry: builds the iced "Lyze" window and wires the
// catalog, drafts, progress, judge, trace, and walkthrough modules.
// Contract: `--check-resources` runs the headless resource probe and exits;
// otherwise the full UI starts at 1200x800 (usable down to 400x520).
// Gotcha: `LCLAB_PROGRESS` triggers a one-time idempotent import with backup;
// release Windows builds hide the console via `windows_subsystem`.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

use iced::keyboard::{self, Key, Modifiers};
use iced::widget::{
    button, column, container, horizontal_rule, horizontal_space, progress_bar, row, scrollable,
    text, text_editor, text_input, Column,
};
use iced::{Border, Element, Fill, Length, Size, Task, Theme};
use leetlab_core::{Catalog, Problem};
use leetlab_learning::{Catalog as Lessons, Language as ReferenceLanguage};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

mod drafts;
mod judge;
mod paint;
mod progress;
mod toolchain;
mod trace;
mod walkthrough;

const PAGE_SIZE: usize = 40;
const SEARCH_ID: &str = "catalog-search";
const SETTINGS_PATH_ID: &str = "settings-browser-path";

fn main() -> iced::Result {
    if std::env::args_os().any(|arg| arg == "--check-resources") {
        return check_resources();
    }
    let (mut drafts, mut draft_error) = match drafts::Store::open() {
        Ok(store) => (store, None),
        Err(error) => (
            drafts::Store::default(),
            Some(format!("Draft storage unavailable: {error}")),
        ),
    };
    let (mut progress, progress_error) = match progress::Store::open() {
        Ok(store) => (store, None),
        Err(error) => (progress::Store::default(), Some(error.to_string())),
    };
    if let Some(error) = progress_error {
        let msg = format!("Progress storage unavailable: {error}");
        draft_error = Some(match draft_error {
            Some(prior) => format!("{prior}; {msg}"),
            None => msg,
        });
    }
    // One-time explicit migration: when the documented LCLAB_PROGRESS file is
    // configured, import server progress into native drafts and progress with
    // a backup. Repeat startups are idempotent via the import marker.
    let mut notice = None;
    if draft_error.is_none() {
        if let Some(configured) = std::env::var_os("LCLAB_PROGRESS") {
            let source = PathBuf::from(configured);
            if source.is_file() {
                let backup_dir = drafts
                    .path_parent()
                    .map(|parent| parent.join("import-backups"))
                    .unwrap_or_else(|| PathBuf::from("import-backups"));
                match drafts.import_progress(&source, &backup_dir) {
                    Ok(report) => {
                        let touched = progress.apply_import(&report.progress);
                        let progress_saved = progress.save().err().map(|error| error.to_string());
                        if let Some(error) = progress_saved {
                            draft_error =
                                Some(format!("Progress import failed: {error}; drafts updated."));
                        } else if !report.skipped && (report.drafts > 0 || touched > 0) {
                            notice = Some(format!(
                                "Imported {} drafts and {} progress entries across {} problems; backup kept.",
                                report.drafts, touched, report.slugs
                            ));
                        }
                    }
                    Err(error) => {
                        draft_error = Some(format!(
                            "Progress import failed: {error}; drafts untouched."
                        ));
                    }
                }
            }
        }
    }
    iced::application("Lyze", App::update, App::view)
        .font(include_bytes!("../../../assets/fonts/FiraCode-Regular.ttf").as_slice())
        .font(include_bytes!("../../../assets/fonts/FiraCode-Medium.ttf").as_slice())
        .font(include_bytes!("../../../assets/fonts/FiraCode-Bold.ttf").as_slice())
        .window(iced::window::Settings {
            size: Size::new(1200.0, 800.0),
            // Narrow floor matches the smoke checklist (~400px): the
            // catalog becomes an overlay sheet and the panes stack, so
            // the window stays usable down to this width.
            min_size: Some(Size::new(400.0, 520.0)),
            icon: iced::window::icon::from_rgba(
                include_bytes!("../../../packaging/lyze.rgba").to_vec(),
                64,
                64,
            )
            .ok(),
            ..Default::default()
        })
        .subscription(|app: &App| {
            let mut subs = vec![
                keyboard::on_key_press(shortcut),
                iced::window::close_requests().map(Message::CloseRequested),
                iced::window::resize_events()
                    .map(|(_id, size)| Message::WindowResized(size)),
            ];
            // Autoplay ticks only while playing; the Tick arm stops at the
            // last frame, and Play never starts under reduced motion.
            if app.playing {
                subs.push(
                    iced::time::every(std::time::Duration::from_millis(
                        app.play_speed.interval_ms(),
                    ))
                    .map(|_| Message::Tick),
                );
            }
            iced::Subscription::batch(subs)
        })
        .theme(|app| app.active_theme())
        .run_with(move || {
            (
                App {
                    drafts,
                    draft_error,
                    notice,
                    progress,
                    ..App::default()
                },
                Task::batch([
                    Task::perform(load_catalog(), Message::CatalogLoaded),
                    Task::perform(load_lessons(), Message::LessonsLoaded),
                ]),
            )
        })
}

fn find_resource_root() -> Result<PathBuf, String> {
    if let Some(root) = explicit_resource_root(std::env::args_os().skip(1)) {
        return Ok(root);
    }
    crate::toolchain::resource_roots()
        .into_iter()
        .find(|path| path.join("plugin/data/index.json").is_file())
        .ok_or_else(|| "Pass the catalog resource directory as the first argument.".to_owned())
}

/// First non-flag CLI argument is the resource root. A lone `--` separator
/// and the `--check-resources` diagnostic flag are skipped, so
/// `leetlab-app.exe -- <root>` resolves to `<root>` instead of failing on a
/// `--/plugin/data/index.json` lookup, and `--check-resources` still falls
/// through to ancestor discovery when no root is given.
fn explicit_resource_root(args: impl Iterator<Item = std::ffi::OsString>) -> Option<PathBuf> {
    for arg in args {
        let text = arg.to_string_lossy();
        if text == "--" || text == "--check-resources" {
            continue;
        }
        return Some(PathBuf::from(arg));
    }
    None
}

/// Headless packaging/QA check: resolve the resource root, open the catalog,
/// count the embedded lessons, and resolve both toolchains. Prints one line
/// per check and exits non-zero on the first failure. No window is opened.
fn check_resources() -> iced::Result {
    let mut failed = false;
    let mut report = |name: &str, result: Result<String, String>| match result {
        Ok(detail) => println!("ok {name}: {detail}"),
        Err(error) => {
            println!("FAIL {name}: {error}");
            failed = true;
        }
    };
    let root = find_resource_root();
    report(
        "resource-root",
        root.as_ref()
            .map(|path| path.display().to_string())
            .map_err(Clone::clone),
    );
    let catalog = root.and_then(|root| Catalog::open(&root).map_err(|error| error.to_string()));
    report(
        "catalog",
        catalog
            .as_ref()
            .map(|catalog| {
                format!(
                    "{} problems, {} patterns, {} curriculum entries",
                    catalog.problems.len(),
                    catalog.patterns.len(),
                    catalog.curriculum.len()
                )
            })
            .map_err(Clone::clone),
    );
    if let Ok(catalog) = &catalog {
        let mut missing = 0;
        for entry in &catalog.curriculum {
            if catalog.problem(&entry.slug).is_err() && !catalog.has_local(&entry.slug) {
                missing += 1;
            }
        }
        report(
            "lessons-local",
            if missing == 0 {
                Ok("all 150 curriculum entries resolve locally".into())
            } else {
                Err(format!("{missing} curriculum entries have no local record"))
            },
        );
    }
    report(
        "lessons-fixture",
        Lessons::from_json(include_bytes!("../../../fixtures/catalog-extra.json"))
            .map(|lessons| {
                format!(
                    "{} lessons, {} walkthroughs, {} variant sets",
                    lessons.lessons.len(),
                    lessons
                        .lessons
                        .iter()
                        .filter(|lesson| lesson.walkthrough.is_some())
                        .count(),
                    lessons
                        .lessons
                        .iter()
                        .filter(|lesson| !lesson.variants.is_empty())
                        .count(),
                )
            })
            .map_err(|error| error.to_string()),
    );
    report(
        "toolchain-java",
        crate::toolchain::java_toolchain()
            .map(|(javac, java)| format!("{} + {}", javac.display(), java.display())),
    );
    report(
        "toolchain-cxx",
        crate::toolchain::cxx_toolchain().map(|cxx| cxx.display().to_string()),
    );
    if failed {
        std::process::exit(1);
    }
    Ok(())
}

async fn load_catalog() -> Result<Arc<Catalog>, String> {
    let root = find_resource_root()?;
    Catalog::open(&root)
        .map(Arc::new)
        .map_err(|error| error.to_string())
}

async fn load_lessons() -> Result<Arc<Lessons>, String> {
    // The build-time fixture export; the installed app ships it as a
    // read-only resource next to the binary or in the resource root.
    const EMBEDDED: &[u8] = include_bytes!("../../../fixtures/catalog-extra.json");
    Lessons::from_json(EMBEDDED)
        .map(Arc::new)
        .map_err(|error| error.to_string())
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
enum Track {
    #[default]
    Foundation,
    NeetCode,
    Blind,
    All,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
enum Panel {
    #[default]
    Solve,
    Learn,
    Practice,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, PartialOrd, Ord)]
enum Language {
    #[default]
    Java,
    Cpp,
}

impl Language {
    fn extension(self) -> &'static str {
        match self {
            Self::Java => "java",
            Self::Cpp => "cpp",
        }
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
enum ThemeChoice {
    #[default]
    System,
    Light,
    LightPlus,
    Dark,
    DarkPlus,
    Dracula,
    CatMocha,
    CatMacchiato,
    CatFrappe,
    CatLatte,
    NightOwl,
    TokyoNight,
    OneDarkPro,
    Monokai,
    Nord,
    GitHubDark,
    Custom,
}

impl ThemeChoice {
    fn label(self) -> &'static str {
        match self {
            ThemeChoice::System => "System (follows OS)",
            ThemeChoice::Light => "Light",
            ThemeChoice::LightPlus => "Light+ (VS Code)",
            ThemeChoice::Dark => "Dark",
            ThemeChoice::DarkPlus => "Dark+ (VS Code)",
            ThemeChoice::Dracula => "Dracula",
            ThemeChoice::CatMocha => "Catppuccin Mocha",
            ThemeChoice::CatMacchiato => "Catppuccin Macchiato",
            ThemeChoice::CatFrappe => "Catppuccin Frappe",
            ThemeChoice::CatLatte => "Catppuccin Latte",
            ThemeChoice::NightOwl => "Night Owl",
            ThemeChoice::TokyoNight => "Tokyo Night",
            ThemeChoice::OneDarkPro => "One Dark Pro",
            ThemeChoice::Monokai => "Monokai",
            ThemeChoice::Nord => "Nord",
            ThemeChoice::GitHubDark => "GitHub Dark",
            ThemeChoice::Custom => "Custom",
        }
    }
}

/// System-theme resolver (task-4 VS Code ports): an explicit OS dark flag
/// wins; this shell has no OS theme hook, so `active_theme` passes `false`
/// and System resolves conservatively to the light port. Mirrors the
/// explicit/System split of `resolve_motion`, and keeps both ports
/// referenced so neither rots.
fn resolve_system_theme(os_dark: bool) -> Theme {
    if os_dark {
        paint::vscode_dark_plus()
    } else {
        paint::vscode_light_plus()
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
enum MotionChoice {
    #[default]
    System,
    Reduce,
    Full,
}

impl MotionChoice {
    fn label(self) -> &'static str {
        match self {
            MotionChoice::System => "System (follows OS)",
            MotionChoice::Reduce => "Reduce motion",
            MotionChoice::Full => "Full motion",
        }
    }
}

/// Pure resolver (port of web `resolveMotion` in
/// `plugin/web/ui/settings-dialog.js`): explicit Reduce/Full win; System
/// defers to the OS flag. This shell has no OS reduced-motion hook, so
/// System resolves conservatively to Full; callers must pass the OS value
/// in once a platform hook exists. Reduced means stepped UI applies state
/// instantly with no timed transition.
fn resolve_motion(preference: MotionChoice, os_reduce: bool) -> MotionChoice {
    match preference {
        MotionChoice::Reduce => MotionChoice::Reduce,
        MotionChoice::Full => MotionChoice::Full,
        MotionChoice::System => {
            if os_reduce {
                MotionChoice::Reduce
            } else {
                MotionChoice::Full
            }
        }
    }
}

/// Autoplay speed for Learn transport (web transport control).
/// Reduced motion disables timed playback entirely (see PlayToggle).
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
enum PlaySpeed {
    Slow,
    #[default]
    Normal,
    Fast,
}

impl PlaySpeed {
    fn label(self) -> &'static str {
        match self {
            PlaySpeed::Slow => "Slow",
            PlaySpeed::Normal => "Normal",
            PlaySpeed::Fast => "Fast",
        }
    }

    fn interval_ms(self) -> u64 {
        match self {
            PlaySpeed::Slow => 1200,
            PlaySpeed::Normal => 600,
            PlaySpeed::Fast => 300,
        }
    }

    fn next(self) -> PlaySpeed {
        match self {
            PlaySpeed::Slow => PlaySpeed::Normal,
            PlaySpeed::Normal => PlaySpeed::Fast,
            PlaySpeed::Fast => PlaySpeed::Slow,
        }
    }
}

#[derive(Debug, Clone)]
enum Selection {
    Local(Arc<Problem>),
    External { title: String, url: String },
}

#[derive(Clone)]
struct TraceDone {
    slug: String,
    language: Language,
    outcome: trace::TraceOutcome,
    index: usize,
}

struct CatalogEntry {
    title: String,
    slug: String,
    id: u32,
    difficulty: String,
    pattern: String,
    search: String,
}

#[derive(Default)]
struct App {
    catalog: Option<Arc<Catalog>>,
    entries: Vec<CatalogEntry>,
    visible: Vec<usize>,
    query: String,
    track: Track,
    difficulty: Option<String>,
    status_filter: Option<progress::Status>,
    pattern_filter: Option<String>,
    page: usize,
    selected: Option<Selection>,
    requested: Option<String>,
    error: Option<String>,
    panel: Panel,
    lessons: Option<Arc<Lessons>>,
    frame: usize,
    statement_open: bool,
    explain_on: bool,
    reference_language: Option<ReferenceLanguage>,
    language: Language,
    editor: text_editor::Content,
    drafts: drafts::Store,
    saver: drafts::DraftSaver,
    draft_error: Option<String>,
    notice: Option<String>,
    /// My-notes editor (Solve panel), bound to the progress note store.
    /// `notes_loaded` is the slug whose note is staged; edits sync into
    /// the store in memory and persist at navigation flush points.
    notes_editor: text_editor::Content,
    notes_loaded: Option<String>,
    notes_dirty: bool,
    progress: progress::Store,
    progress_error: Option<String>,
    judge_running: bool,
    tracing: bool,
    trace_cancel: Option<Arc<AtomicBool>>,
    trace: Option<TraceDone>,
    practice_variant: usize,
    practice_editor: text_editor::Content,
    practice_loaded: Option<(String, usize, Language)>,
    practice_grading: bool,
    practice_verdicts: BTreeMap<(String, Language), (judge::OutcomeKind, String)>,
    status_line: Option<String>,
    settings_open: bool,
    help_open: bool,
    browser_path: String,
    settings_note: Option<String>,
    reset_armed: bool,
    /// Two-click confirm for destructive Solve actions (mirrors the
    /// existing Settings `reset_armed` pattern; no dialog infra yet).
    starter_armed: bool,
    problem_reset_armed: bool,
    cancel: Option<Arc<AtomicBool>>,
    verdict: Option<(String, Language, judge::OutcomeKind, String)>,
    theme: ThemeChoice,
    custom_theme: Option<Theme>,
    custom_theme_name: Option<String>,
    theme_json: String,
    motion: MotionChoice,
    hide_catalog: bool,
    /// Learn autoplay transport. `playing` advances one frame per
    /// `play_speed` interval via the time subscription; it auto-stops at
    /// the last frame and never runs under reduced motion.
    playing: bool,
    play_speed: PlaySpeed,
    /// Last known window width in logical pixels. `None` until the first
    /// resize event; treated as the 1200px launch size (desktop layout).
    /// Drives the narrow branches — catalog overlay sheet, stacked Solve
    /// panes, Learn code-over-stage — via `is_narrow`.
    window_width: Option<f32>,
}

#[derive(Clone)]
enum Message {
    CatalogLoaded(Result<Arc<Catalog>, String>),
    LessonsLoaded(Result<Arc<Lessons>, String>),
    Select(String),
    ProblemLoaded(String, Result<Arc<Problem>, String>),
    Query(String),
    Track(Track),
    Difficulty(Option<String>),
    StatusFilter(Option<progress::Status>),
    PatternFilter(Option<String>),
    Page(usize),
    Panel(Panel),
    Language(Language),
    Edit(text_editor::Action),
    Run,
    Submit,
    Starter,
    Trace,
    ResetProblem,
    TryIt(usize),
    PracticeEdit(text_editor::Action),
    Grade,
    GradeVariant(usize),
    Graded(String, Language, String, judge::Outcome),
    Cancel,
    CloseRequested(iced::window::Id),
    Judged(String, Language, bool, judge::Outcome),
    Traced(String, Language, trace::TraceOutcome),
    TraceStep(isize),
    ToggleSettings,
    CloseSettings,
    Noop,
    SetTheme(ThemeChoice),
    ThemeJson(String),
    ImportTheme,
    RemoveCustomTheme,
    SetMotion(MotionChoice),
    BrowserPath(String),
    ImportProgress,
    ImportBrowser,
    ResetProgress,
    EscapePressed,
    Frame(usize),
    Explain(bool),
    Statement(bool),
    ReferenceLanguage(ReferenceLanguage),
    FocusSearch,
    Home,
    PatternBrowse(String),
    ResetFilters,
    ToggleCatalog,
    ToggleTheme,
    ToggleHelp,
    OpenSource(String),
    SelectRelative(isize),
    StartNext,
    Advance,
    StepBack,
    PlayToggle,
    PlaySpeed,
    Tick,
    Share,
    NotesEdit(text_editor::Action),
    WindowResized(Size),
}

impl std::fmt::Debug for Message {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(match self {
            Self::CatalogLoaded(_) => "CatalogLoaded",
            Self::LessonsLoaded(_) => "LessonsLoaded",
            Self::Select(_) => "Select",
            Self::ProblemLoaded(..) => "ProblemLoaded",
            Self::Query(_) => "Query",
            Self::Track(_) => "Track",
            Self::Difficulty(_) => "Difficulty",
            Self::StatusFilter(_) => "StatusFilter",
            Self::PatternFilter(_) => "PatternFilter",
            Self::Page(_) => "Page",
            Self::Panel(_) => "Panel",
            Self::Language(_) => "Language",
            Self::Edit(_) => "Edit",
            Self::Run => "Run",
            Self::Submit => "Submit",
            Self::Starter => "Starter",
            Self::Trace => "Trace",
            Self::ResetProblem => "ResetProblem",
            Self::TryIt(_) => "TryIt",
            Self::PracticeEdit(_) => "PracticeEdit",
            Self::Grade => "Grade",
            Self::GradeVariant(_) => "GradeVariant",
            Self::Graded(..) => "Graded",
            Self::Cancel => "Cancel",
            Self::CloseRequested(_) => "CloseRequested",
            Self::Judged(..) => "Judged",
            Self::Traced(..) => "Traced",
            Self::TraceStep(_) => "TraceStep",
            Self::ToggleSettings => "ToggleSettings",
            Self::CloseSettings => "CloseSettings",
            Self::Noop => "Noop",
            Self::SetTheme(_) => "SetTheme",
            Self::ThemeJson(_) => "ThemeJson",
            Self::ImportTheme => "ImportTheme",
            Self::RemoveCustomTheme => "RemoveCustomTheme",
            Self::SetMotion(_) => "SetMotion",
            Self::BrowserPath(_) => "BrowserPath",
            Self::ImportProgress => "ImportProgress",
            Self::ImportBrowser => "ImportBrowser",
            Self::ResetProgress => "ResetProgress",
            Self::Frame(_) => "Frame",
            Self::Explain(_) => "Explain",
            Self::Statement(_) => "Statement",
            Self::ReferenceLanguage(_) => "ReferenceLanguage",
            Self::FocusSearch => "FocusSearch",
            Self::Home => "Home",
            Self::PatternBrowse(_) => "PatternBrowse",
            Self::ResetFilters => "ResetFilters",
            Self::ToggleCatalog => "ToggleCatalog",
            Self::ToggleTheme => "ToggleTheme",
            Self::ToggleHelp => "ToggleHelp",
            Self::EscapePressed => "EscapePressed",
            Self::SelectRelative(_) => "SelectRelative",
            Self::StartNext => "StartNext",
            Self::Advance => "Advance",
            Self::StepBack => "StepBack",
            Self::PlayToggle => "PlayToggle",
            Self::PlaySpeed => "PlaySpeed",
            Self::Tick => "Tick",
            Self::Share => "Share",
            Self::NotesEdit(_) => "NotesEdit",
            Self::WindowResized(_) => "WindowResized",
            Self::OpenSource(_) => "OpenSource",
        })
    }
}

fn shortcut(key: Key, modifiers: Modifiers) -> Option<Message> {
    if key == Key::Named(iced::keyboard::key::Named::Escape) {
        return Some(Message::EscapePressed);
    }
    // Named keys work with no modifiers held. Iced `on_key_press` carries
    // no focus context, so these (like the `1/2/3` bindings below) also fire
    // while typing in search/notes/code; the update-side guards below only
    // consume them while an overlay owns the focus. The Help overlay states
    // this limit verbatim.
    if modifiers.is_empty() {
        if key == Key::Named(iced::keyboard::key::Named::ArrowDown) {
            return Some(Message::SelectRelative(1));
        }
        if key == Key::Named(iced::keyboard::key::Named::ArrowUp) {
            return Some(Message::SelectRelative(-1));
        }
        if key == Key::Named(iced::keyboard::key::Named::ArrowRight) {
            return Some(Message::Advance);
        }
        if key == Key::Named(iced::keyboard::key::Named::ArrowLeft) {
            return Some(Message::StepBack);
        }
        if key == Key::Named(iced::keyboard::key::Named::Space) {
            return Some(Message::Advance);
        }
    }
    if let Key::Character(key) = key.as_ref() {
        if modifiers.control() && key.eq_ignore_ascii_case("f") {
            return Some(Message::FocusSearch);
        }
        // Ctrl+Enter runs the current Solve editor (web editor.js
        // `onRun`). Safe as a global binding: Ctrl+Enter is not text
        // input. Guards (busy / unsupported / no problem) live in
        // `start_judge(false)`, which no-ops there. Character keys
        // (`1/2/3`, `s`, `j/k`) stay unbound here: Iced `on_key_press`
        // has no focus context, so a global `1` would also fire while
        // typing in search or the code editor (see REPORT.md).
        if modifiers.control() && key == "\r" {
            return Some(Message::Run);
        }
        // `?` arrives with Shift held on most layouts, so it is matched
        // outside the empty-modifier gate (Ctrl/Alt/Logo still excluded).
        if key == "?" && modifiers.shift() && !modifiers.control() {
            return Some(Message::ToggleHelp);
        }
        if modifiers.is_empty() {
            return match key {
                "1" => Some(Message::Panel(Panel::Solve)),
                "2" => Some(Message::Panel(Panel::Learn)),
                "3" => Some(Message::Panel(Panel::Practice)),
                "/" => Some(Message::FocusSearch),
                "j" => Some(Message::SelectRelative(1)),
                "k" => Some(Message::SelectRelative(-1)),
                "s" => Some(Message::StartNext),
                " " => Some(Message::Advance),
                _ => None,
            };
        }
    }
    None
}

impl App {
    fn active_theme(&self) -> Theme {
        match (&self.theme, &self.custom_theme) {
            (ThemeChoice::Custom, Some(custom)) => custom.clone(),
            (ThemeChoice::Dracula, _) => paint::dracula(),
            (ThemeChoice::DarkPlus, _) => paint::vscode_dark_plus(),
            (ThemeChoice::Dark, _) => paint::theme(true),
            (ThemeChoice::LightPlus, _) => paint::vscode_light_plus(),
            (ThemeChoice::CatMocha, _) => paint::catppuccin_mocha(),
            (ThemeChoice::CatMacchiato, _) => paint::catppuccin_macchiato(),
            (ThemeChoice::CatFrappe, _) => paint::catppuccin_frappe(),
            (ThemeChoice::CatLatte, _) => paint::catppuccin_latte(),
            (ThemeChoice::NightOwl, _) => paint::night_owl(),
            (ThemeChoice::TokyoNight, _) => paint::tokyo_night(),
            (ThemeChoice::OneDarkPro, _) => paint::one_dark_pro(),
            (ThemeChoice::Monokai, _) => paint::monokai(),
            (ThemeChoice::Nord, _) => paint::nord(),
            (ThemeChoice::GitHubDark, _) => paint::github_dark(),
            // No OS theme hook in this shell: System resolves conservatively
            // to the light VS Code port (see `resolve_system_theme`).
            (ThemeChoice::System, _) => resolve_system_theme(false),
            _ => paint::theme(false),
        }
    }

    fn dark_mode(&self) -> bool {
        let background = self.active_theme().palette().background;
        (background.r + background.g + background.b) / 3.0 < 0.5
    }

    /// Narrow-layout predicate for the live window. `None` (no resize
    /// event yet) means the 1200px launch size, i.e. desktop. The 700px
    /// breakpoint itself stays in `walkthrough::is_narrow_width` so the
    /// rule is unit-testable without a window.
    fn is_narrow(&self) -> bool {
        self.window_width.is_some_and(walkthrough::is_narrow_width)
    }

    fn update(&mut self, message: Message) -> Task<Message> {
        // Surface background draft-write failures on the next interaction.
        if !matches!(message, Message::CloseRequested(_)) {
            if let Some(error) = self.drafts.poll_errors() {
                self.draft_error = Some(error);
            }
        }
        match message {
            Message::CatalogLoaded(result) => match result {
                Ok(catalog) => {
                    self.catalog = Some(catalog);
                    self.build_entries();
                    // TEMP-SCREENSHOT scaffolding: LCLAB_AUTOSTART=slug,panel,theme,settings
                    // lets headless verification capture lesson states without synthetic
                    // input (blocked by UIPI). Removed after the mock-vs-app review.
                    if let Some(spec) = std::env::var_os("LCLAB_AUTOSTART") {
                        let parts: Vec<_> = spec
                            .to_string_lossy()
                            .split(',')
                            .map(str::to_owned)
                            .collect();
                        if let Some(slug) = parts.first() {
                            let slug = slug.clone();
                            if let Some(theme) = parts.get(2) {
                                self.theme = match theme.as_str() {
                                    "dark" => ThemeChoice::Dark,
                                    "darkplus" => ThemeChoice::DarkPlus,
                                    "lightplus" => ThemeChoice::LightPlus,
                                    _ => ThemeChoice::Light,
                                };
                            }
                            if parts.get(3).is_some_and(|flag| flag == "settings") {
                                self.settings_open = true;
                                return text_input::focus(text_input::Id::new(SETTINGS_PATH_ID));
                            }
                            std::env::remove_var("LCLAB_AUTOSTART");
                            if slug.is_empty() {
                                return Task::none();
                            }
                            // Select() resets to Solve; re-apply the requested
                            // panel after it (ProblemLoaded keeps the panel).
                            let task = self.update(Message::Select(slug));
                            if let Some(panel) = parts.get(1) {
                                self.panel = match panel.as_str() {
                                    "learn" => Panel::Learn,
                                    "practice" => Panel::Practice,
                                    _ => Panel::Solve,
                                };
                            }
                            if self.panel == Panel::Practice {
                                self.load_practice_editor();
                            }
                            return task;
                        }
                    }
                }
                Err(error) => self.error = Some(error),
            },
            Message::LessonsLoaded(result) => match result {
                Ok(lessons) => {
                    self.lessons = Some(lessons);
                    // Lessons can arrive after the panel is already showing
                    // (fast navigation or autostart): the guarded practice
                    // loader would otherwise keep an empty editor.
                    self.practice_loaded = None;
                    if self.panel == Panel::Practice {
                        self.load_practice_editor();
                    }
                    // The Foundation track filters on lesson data, so the
                    // entries narrow once it arrives (startup: full
                    // curriculum until then, see `build_entries`).
                    if self.track == Track::Foundation {
                        self.build_entries();
                    }
                }
                Err(error) => self.error = Some(format!("Learn/Practice data: {error}")),
            },
            Message::Query(query) => {
                self.query = query;
                self.filter();
            }
            Message::Track(track) => {
                self.track = track;
                self.build_entries();
            }
            Message::Difficulty(difficulty) => {
                self.difficulty = difficulty;
                self.filter();
            }
            Message::StatusFilter(status) => {
                self.status_filter = status;
                self.filter();
            }
            Message::PatternFilter(pattern) => {
                self.pattern_filter = pattern;
                self.filter();
            }
            Message::Page(page) => self.page = page,
            Message::Select(slug) => {
                let Some(catalog) = self.catalog.clone() else {
                    return Task::none();
                };
                // Web parity: choosing a problem closes the drawer, and a
                // slug outside the current track widens the track to All so
                // the row stays visible (web catalog.select auto-switch).
                self.hide_catalog = true;
                if !self.entries.iter().any(|entry| entry.slug == slug) {
                    self.track = Track::All;
                    self.build_entries();
                }
                // Navigation disposes the current editor: persist it first.
                self.flush_drafts();
                self.flush_notes();
                let _ = self.saver.flush();
                self.status_line = None;
                self.requested = None;
                self.error = None;
                self.selected = None;
                self.panel = Panel::Solve;
                self.frame = 0;
                self.playing = false;
                self.statement_open = false;
                self.starter_armed = false;
                self.problem_reset_armed = false;
                self.practice_variant = 0;
                self.practice_loaded = None;
                self.practice_verdicts.clear();
                self.practice_grading = false;
                // The notes editor stages the next lesson on ProblemLoaded;
                // clear it now so no stale note sits beside the loader.
                self.load_notes();
                if let Some(entry) = catalog.curriculum.iter().find(|entry| entry.slug == slug) {
                    // Overlay lessons ship real local records for curriculum
                    // entries that only link out upstream.
                    if !catalog.has_local(&slug) {
                        if let Some(url) = entry.external_url() {
                            self.selected = Some(Selection::External {
                                title: entry.title.clone(),
                                url: url.to_owned(),
                            });
                            return Task::none();
                        }
                    }
                }
                self.requested = Some(slug.clone());
                return Task::perform(
                    async move {
                        let result = catalog
                            .problem(&slug)
                            .map(Arc::new)
                            .map_err(|error| error.to_string());
                        (slug, result)
                    },
                    |(slug, result)| Message::ProblemLoaded(slug, result),
                );
            }
            Message::ProblemLoaded(slug, result) => {
                if self.requested.as_deref() == Some(&slug) {
                    self.requested = None;
                    match result {
                        Ok(problem) => {
                            self.selected = Some(Selection::Local(problem));
                            self.load_editor();
                            self.load_notes();
                        }
                        Err(error) => self.error = Some(error),
                    }
                }
            }
            Message::Panel(panel) => {
                self.flush_drafts();
                self.flush_notes();
                self.playing = false;
                if panel == Panel::Practice {
                    self.practice_variant = 0;
                    self.load_practice_editor();
                }
                self.panel = panel;
            }
            Message::Language(language) => {
                if self.language != language {
                    self.stage_draft();
                    self.stage_practice_drafts();
                    self.flush_drafts();
                    self.flush_notes();
                    self.status_line = None;
                    self.language = language;
                    self.load_editor();
                    self.load_practice_editor();
                }
            }
            Message::Edit(action) => {
                let edited = action.is_edit();
                self.editor.perform(action);
                if edited {
                    self.stage_draft();
                }
            }
            Message::TryIt(index) => {
                self.stage_practice_drafts();
                self.practice_variant = index;
                self.load_practice_editor();
            }
            Message::PracticeEdit(action) => {
                let edited = action.is_edit();
                self.practice_editor.perform(action);
                if edited {
                    self.stage_practice_drafts();
                }
            }
            Message::Grade => return self.start_grading(),
            Message::GradeVariant(index) => {
                self.stage_practice_drafts();
                self.practice_variant = index;
                self.load_practice_editor();
                return self.start_grading();
            }
            Message::Graded(slug, language, variant, outcome) => {
                let _ = slug;
                self.practice_grading = false;
                self.cancel = None;
                self.practice_verdicts
                    .insert((variant, language), (outcome.kind, outcome.text));
            }
            Message::Run => return self.start_judge(false),
            Message::Submit => return self.start_judge(true),
            Message::Starter => {
                let snippet = match &self.selected {
                    Some(Selection::Local(problem)) => {
                        problem.snippets.get(self.language.extension()).cloned()
                    }
                    _ => None,
                };
                if !self.starter_armed {
                    self.starter_armed = true;
                    self.status_line =
                        Some("Press Starter again to replace the editor with the template.".into());
                } else if let Some(text) = snippet {
                    self.editor = text_editor::Content::with_text(&text);
                    self.stage_draft();
                    self.starter_armed = false;
                    self.status_line =
                        Some("Starter code loaded. Your saved draft was replaced.".into());
                }
            }
            Message::Trace => return self.start_trace(),
            Message::Cancel => {
                if let Some(cancel) = &self.cancel {
                    cancel.store(true, Ordering::Relaxed);
                }
                if let Some(cancel) = &self.trace_cancel {
                    cancel.store(true, Ordering::Relaxed);
                }
            }
            Message::ResetProblem => {
                if !self.problem_reset_armed {
                    self.problem_reset_armed = true;
                    self.status_line = Some(
                        "Press Reset again to mark this problem unsolved. Saved code stays.".into(),
                    );
                    return Task::none();
                }
                self.problem_reset_armed = false;
                let Some(Selection::Local(problem)) = &self.selected else {
                    return Task::none();
                };
                self.progress.reset(&problem.slug, progress::now_ms());
                if let Err(error) = self.progress.save() {
                    self.progress_error = Some(error.to_string());
                } else {
                    self.progress_error = None;
                }
                self.status_line = Some(
                    "Progress cleared — this problem is unsolved again. Your saved code is untouched."
                        .into(),
                );
            }
            Message::CloseRequested(id) => {
                // Normal shutdown: persist staged edits synchronously, stop
                // the background writer, then close the window.
                if let Some(error) = self.drafts.flush_shutdown() {
                    self.draft_error = Some(error);
                }
                self.flush_notes();
                let _ = self.saver.flush();
                return iced::window::close(id);
            }
            Message::Judged(slug, language, submit, outcome) => {
                self.judge_running = false;
                self.cancel = None;
                // Progress accounting by verdict class. Solved is recorded
                // only on a real all-tests pass; setup failures and
                // cancellations never touch progress; every other genuine
                // run records an attempt without downgrading.
                let at = progress::now_ms();
                match outcome.kind {
                    judge::OutcomeKind::Passed if submit => {
                        self.progress.record_solved(
                            &slug,
                            outcome.ms.unwrap_or(0),
                            language.extension(),
                            at,
                        );
                        self.status_line = Some(format!(
                            "Solved — recorded ({}ms).",
                            outcome.ms.unwrap_or(0)
                        ));
                    }
                    judge::OutcomeKind::Setup => {
                        self.status_line = Some("Setup unavailable — progress unchanged.".into());
                    }
                    judge::OutcomeKind::Cancelled => {
                        self.status_line = Some("Cancelled — progress unchanged.".into());
                    }
                    _ => {
                        self.progress.record_attempt(&slug, at);
                        self.status_line = Some(match outcome.kind {
                            judge::OutcomeKind::Passed => "Passed — attempt recorded.".into(),
                            judge::OutcomeKind::CompileError => {
                                "Not passing (compile error) — attempt recorded.".into()
                            }
                            judge::OutcomeKind::RuntimeError => {
                                "Not passing (runtime error) — attempt recorded.".into()
                            }
                            _ => "Not passing (wrong answer) — attempt recorded.".into(),
                        });
                    }
                }
                if let Err(error) = self.progress.save() {
                    self.progress_error = Some(error.to_string());
                }
                self.verdict = Some((slug, language, outcome.kind, outcome.text));
            }
            Message::Traced(slug, language, outcome) => {
                self.tracing = false;
                self.trace_cancel = None;
                self.status_line = Some(match &outcome {
                    trace::TraceOutcome::Traced { events, capped, .. } => {
                        let capped = if *capped { " (capped)" } else { "" };
                        format!(
                            "Traced {} iteration{}{}.",
                            events.len(),
                            if events.len() == 1 { "" } else { "s" },
                            capped
                        )
                    }
                    trace::TraceOutcome::Unavailable { .. } => {
                        "Trace unavailable for this run.".into()
                    }
                });
                self.trace = Some(TraceDone {
                    slug,
                    language,
                    outcome,
                    index: 0,
                });
            }
            Message::TraceStep(delta) => {
                if let Some(trace) = self.trace.as_mut() {
                    if let trace::TraceOutcome::Traced { events, .. } = &trace.outcome {
                        let len = events.len() as isize;
                        if len > 0 {
                            let next = (trace.index as isize + delta).clamp(0, len - 1);
                            trace.index = next as usize;
                        }
                    }
                }
            }
            Message::ToggleSettings => {
                self.settings_open = !self.settings_open;
                self.settings_note = None;
                self.reset_armed = false;
                if self.settings_open {
                    return text_input::focus(text_input::Id::new(SETTINGS_PATH_ID));
                }
                return text_input::focus(text_input::Id::new(SEARCH_ID));
            }
            Message::CloseSettings => {
                if self.settings_open {
                    self.settings_open = false;
                    self.settings_note = None;
                    self.reset_armed = false;
                    return text_input::focus(text_input::Id::new(SEARCH_ID));
                }
            }
            Message::Noop => {}
            Message::SetTheme(choice) => {
                // Custom is only selectable once imported; the rail toggle
                // keeps flipping Light/Dark without touching the import.
                if choice != ThemeChoice::Custom || self.custom_theme.is_some() {
                    self.theme = choice;
                    self.status_line = None;
                }
            }
            Message::ThemeJson(text) => self.theme_json = text,
            Message::ImportTheme => match paint::theme_from_json(&self.theme_json) {
                Ok((name, theme)) => {
                    self.custom_theme = Some(theme);
                    self.custom_theme_name = Some(name.clone());
                    self.theme = ThemeChoice::Custom;
                    self.theme_json.clear();
                    self.settings_note = Some(format!("Theme \"{name}\" imported and active."));
                }
                Err(error) => {
                    self.settings_note = Some(format!("Theme import failed: {error}."));
                }
            },
            Message::RemoveCustomTheme => {
                self.custom_theme = None;
                self.custom_theme_name = None;
                if self.theme == ThemeChoice::Custom {
                    self.theme = ThemeChoice::Light;
                }
                self.settings_note = Some("Custom theme removed.".into());
            }
            Message::SetMotion(motion) => {
                self.motion = motion;
            }
            Message::EscapePressed => {
                // Dismiss order: help first, then settings, then the drawer.
                // Each step returns focus to search, matching the settings
                // toggle contract.
                if self.help_open {
                    self.help_open = false;
                    return text_input::focus(text_input::Id::new(SEARCH_ID));
                }
                if self.settings_open {
                    self.settings_open = false;
                    self.settings_note = None;
                    self.reset_armed = false;
                    return text_input::focus(text_input::Id::new(SEARCH_ID));
                }
                if self.catalog.is_some() && !self.hide_catalog && self.selected.is_some() {
                    self.hide_catalog = true;
                }
            }
            Message::BrowserPath(path) => self.browser_path = path,
            Message::ImportProgress => self.import_server_progress(),
            Message::ImportBrowser => self.import_browser_drafts(),
            Message::ResetProgress => {
                if self.reset_armed {
                    self.progress.reset_all(progress::now_ms());
                    if let Err(error) = self.progress.save() {
                        self.progress_error = Some(error.to_string());
                    } else {
                        self.progress_error = None;
                    }
                    self.reset_armed = false;
                    self.status_line = Some("Progress cleared — this workspace is unsolved again. Saved code is untouched.".into());
                } else {
                    self.reset_armed = true;
                }
            }
            Message::Frame(frame) => self.frame = frame,
            Message::Statement(open) => self.statement_open = open,
            Message::Explain(on) => self.explain_on = on,
            Message::ReferenceLanguage(language) => self.reference_language = Some(language),
            Message::FocusSearch => {
                self.hide_catalog = false;
                return text_input::focus(text_input::Id::new(SEARCH_ID));
            }
            Message::Home => {
                // Return to the practice home: dispose the current editor
                // like Select does, then clear the selection (web showHome).
                self.flush_drafts();
                self.flush_notes();
                self.status_line = None;
                self.requested = None;
                self.error = None;
                self.selected = None;
                self.panel = Panel::Solve;
                self.frame = 0;
                self.playing = false;
                self.statement_open = false;
                self.practice_variant = 0;
                self.practice_loaded = None;
                self.practice_verdicts.clear();
                self.practice_grading = false;
                self.load_notes();
            }
            Message::PatternBrowse(pattern) => {
                // Pattern-grid drill-down (web setPattern): filter to the
                // pattern, clear the difficulty filter, and open the drawer
                // so the filtered rows are visible.
                self.pattern_filter = Some(pattern);
                self.difficulty = None;
                self.hide_catalog = false;
                self.filter();
            }
            Message::ResetFilters => {
                // Web resetFilters: clear text/difficulty/status/pattern but
                // keep the current track.
                self.query.clear();
                self.difficulty = None;
                self.status_filter = None;
                self.pattern_filter = None;
                self.filter();
            }
            Message::ToggleCatalog => {
                self.hide_catalog = !self.hide_catalog;
                if !self.hide_catalog {
                    // Drawer opened: move keyboard focus to the search box
                    // (web focusCatalog). Closing cannot return focus to the
                    // rail button: Iced exposes no programmatic button focus.
                    return text_input::focus(text_input::Id::new(SEARCH_ID));
                }
            }
            Message::WindowResized(size) => {
                self.window_width = Some(size.width);
            }
            Message::ToggleTheme => {
                // Rail cycle: System → Light → Dark → Dracula → System. A
                // custom import is parked on Light (the rail never deletes
                // the import; the settings row restores it).
                self.theme = match self.theme {
                    ThemeChoice::System => ThemeChoice::Light,
                    ThemeChoice::Light => ThemeChoice::LightPlus,
                    ThemeChoice::LightPlus => ThemeChoice::Dark,
                    ThemeChoice::Dark => ThemeChoice::DarkPlus,
                    ThemeChoice::DarkPlus => ThemeChoice::Dracula,
                    ThemeChoice::Dracula => ThemeChoice::CatMocha,
                    ThemeChoice::CatMocha => ThemeChoice::CatMacchiato,
                    ThemeChoice::CatMacchiato => ThemeChoice::CatFrappe,
                    ThemeChoice::CatFrappe => ThemeChoice::CatLatte,
                    ThemeChoice::CatLatte => ThemeChoice::NightOwl,
                    ThemeChoice::NightOwl => ThemeChoice::TokyoNight,
                    ThemeChoice::TokyoNight => ThemeChoice::OneDarkPro,
                    ThemeChoice::OneDarkPro => ThemeChoice::Monokai,
                    ThemeChoice::Monokai => ThemeChoice::Nord,
                    ThemeChoice::Nord => ThemeChoice::GitHubDark,
                    ThemeChoice::GitHubDark => ThemeChoice::System,
                    ThemeChoice::Custom => ThemeChoice::System,
                };
            }
            Message::ToggleHelp => {
                self.help_open = !self.help_open;
            }
            Message::SelectRelative(delta) => {
                // Keyboard/Prev-Next stepping. Focus guard: an open overlay
                // owns the keyboard, so relative moves are consumed there
                // (same guard as StartNext/Advance; the typing limitation is
                // stated in the Help overlay).
                if self.settings_open || self.help_open {
                    return Task::none();
                }
                if self.visible.is_empty() {
                    return Task::none();
                }
                let current = match &self.selected {
                    Some(Selection::Local(problem)) => self
                        .visible
                        .iter()
                        .position(|index| self.entries[*index].slug == problem.slug),
                    _ => None,
                };
                let len = self.visible.len() as isize;
                let base = current.map(|position| position as isize).unwrap_or_else(|| {
                    if delta >= 0 {
                        -1
                    } else {
                        len
                    }
                });
                let next = (base + delta).clamp(0, len - 1) as usize;
                if current == Some(next) {
                    return Task::none();
                }
                let slug = self.entries[self.visible[next]].slug.clone();
                return self.update(Message::Select(slug));
            }
            Message::StartNext => {
                // `s` and the home CTA share one definition of "next": the
                // first unsolved lesson in the current filter order.
                if self.settings_open || self.help_open {
                    return Task::none();
                }
                let next = self
                    .visible
                    .iter()
                    .map(|index| self.entries[*index].slug.clone())
                    .find(|slug| self.progress.status(slug) != progress::Status::Solved);
                match next {
                    Some(slug) => return self.update(Message::Select(slug)),
                    None => {
                        self.status_line = Some(
                            "Every lesson in this track is solved — switch tracks above to keep going."
                                .into(),
                        );
                    }
                }
            }
            Message::Advance => {
                // Space: Learn steps to the next frame; home starts the next
                // unsolved lesson; Solve/Practice do nothing (Space must
                // never run code by accident).
                if self.settings_open || self.help_open {
                    return Task::none();
                }
                if self.selected.is_none() {
                    return self.update(Message::StartNext);
                }
                if self.panel != Panel::Learn {
                    return Task::none();
                }
                let slug = match &self.selected {
                    Some(Selection::Local(problem)) => problem.slug.clone(),
                    _ => return Task::none(),
                };
                let total = self
                    .lessons
                    .as_ref()
                    .and_then(|lessons| lessons.lesson(&slug))
                    .and_then(|lesson| lesson.walkthrough.as_ref())
                    .map(|walkthrough| walkthrough.frames.len())
                    .unwrap_or(0);
                if self.frame + 1 < total {
                    self.frame += 1;
                }
            }
            Message::StepBack => {
                // ArrowLeft: Learn steps back one frame (same guards as
                // Advance; Space/→ only move forward).
                if self.settings_open || self.help_open {
                    return Task::none();
                }
                if self.selected.is_none() || self.panel != Panel::Learn {
                    return Task::none();
                }
                self.frame = self.frame.saturating_sub(1);
            }
            Message::PlayToggle => {
                // Play/Pause: timed autoplay on Learn only. Reduced motion
                // disables timed playback (web R4 rule); scrub and steps
                // still apply state instantly. Starting always restarts
                // from frame 0 when already at the end.
                if self.settings_open || self.help_open {
                    return Task::none();
                }
                if resolve_motion(self.motion, false) == MotionChoice::Reduce {
                    self.status_line = Some(
                        "Autoplay is off under reduced motion — step manually.".into(),
                    );
                    return Task::none();
                }
                if self.selected.is_none() || self.panel != Panel::Learn {
                    return Task::none();
                }
                if !self.playing {
                    let total = self
                        .lessons
                        .as_ref()
                        .and_then(|lessons| match &self.selected {
                            Some(Selection::Local(problem)) => lessons.lesson(&problem.slug),
                            _ => None,
                        })
                        .and_then(|lesson| lesson.walkthrough.as_ref())
                        .map(|walkthrough| walkthrough.frames.len())
                        .unwrap_or(0);
                    if total == 0 || self.frame + 1 >= total {
                        self.frame = 0;
                    }
                    self.playing = true;
                } else {
                    self.playing = false;
                }
            }
            Message::PlaySpeed => {
                self.play_speed = self.play_speed.next();
            }
            Message::Tick => {
                // Autoplay tick: one Advance per interval; stop (and drop
                // the time subscription) at the last frame.
                if !self.playing
                    || self.settings_open
                    || self.help_open
                    || self.selected.is_none()
                    || self.panel != Panel::Learn
                {
                    self.playing = false;
                    return Task::none();
                }
                let total = match &self.selected {
                    Some(Selection::Local(problem)) => self
                        .lessons
                        .as_ref()
                        .and_then(|lessons| lessons.lesson(&problem.slug))
                        .and_then(|lesson| lesson.walkthrough.as_ref())
                        .map(|walkthrough| walkthrough.frames.len())
                        .unwrap_or(0),
                    _ => 0,
                };
                if self.frame + 1 < total {
                    self.frame += 1;
                } else {
                    self.playing = false;
                }
            }
            Message::Share => {
                let Some(Selection::Local(problem)) = &self.selected else {
                    return Task::none();
                };
                // Share minimum: `#id /p/slug` on the clipboard, with the
                // same text in the status line as the fallback when the
                // clipboard is unavailable headless.
                let text = share_text(problem.id, &problem.slug);
                self.status_line = Some(format!(
                    "Share: {text} — copied to the clipboard when available."
                ));
                return iced::clipboard::write::<()>(text).map(|_| Message::Noop);
            }
            Message::NotesEdit(action) => {
                self.notes_editor.perform(action);
                // Bind the editor to the note store: memory syncs on every
                // change so `get_note` stays live; durability lands at the
                // navigation flush points (Select/Home/Panel/Language).
                if let Some(slug) = self.notes_loaded.clone() {
                    let note = self.notes_editor.text();
                    self.progress
                        .set_note(&slug, note.trim_end(), progress::now_ms());
                    self.notes_dirty = true;
                }
            }
            Message::OpenSource(url) => {
                if let Err(error) = open_source(&url) {
                    self.error = Some(error.to_string());
                }
            }
        }
        Task::none()
    }

    fn build_entries(&mut self) {
        let Some(catalog) = &self.catalog else {
            return;
        };
        self.entries = match self.track {
            Track::All => catalog
                .problems
                .iter()
                .map(|problem| {
                    make_entry(
                        &problem.slug,
                        problem.id,
                        &problem.title,
                        &problem.difficulty,
                        &problem.pattern,
                        &problem.topics.join(" "),
                    )
                })
                .collect(),
            track => {
                // Foundation narrows the curriculum to fully-featured
                // lessons (task-5 `is_foundation`). Lessons load async from
                // the embedded fixture, so before they arrive the whole
                // curriculum shows and `LessonsLoaded` rebuilds to the
                // foundation subset; the home path section is honest either
                // way.
                let foundation: Option<BTreeSet<String>> = if track == Track::Foundation {
                    self.foundation_set()
                } else {
                    None
                };
                let index: HashMap<_, _> = catalog
                    .problems
                    .iter()
                    .map(|problem| (problem.slug.as_str(), problem))
                    .collect();
                catalog
                    .curriculum
                    .iter()
                    .filter(|entry| match track {
                        Track::Blind => entry.blind75,
                        Track::Foundation => foundation
                            .as_ref()
                            .is_none_or(|set| set.contains(entry.slug.as_str())),
                        _ => true,
                    })
                    .map(|entry| {
                        // Overlay lessons (externally-linked entries with
                        // local equivalents) resolve on demand; anything
                        // else without a shard record stays External.
                        let found: Option<(u32, String, String)> = index
                            .get(entry.slug.as_str())
                            .map(|problem| {
                                (
                                    problem.id,
                                    problem.difficulty.clone(),
                                    problem.pattern.clone(),
                                )
                            })
                            .or_else(|| {
                                if catalog.has_local(&entry.slug) {
                                    catalog
                                        .problem(&entry.slug)
                                        .map(|problem| {
                                            (problem.id, problem.difficulty, problem.pattern)
                                        })
                                        .ok()
                                } else {
                                    None
                                }
                            });
                        let (id, difficulty, pattern) =
                            found.unwrap_or((0, "External".into(), String::new()));
                        make_entry(
                            &entry.slug,
                            id,
                            &entry.title,
                            &difficulty,
                            &pattern,
                            &entry.group,
                        )
                    })
                    .collect()
            }
        };
        self.filter();
    }

    fn filter(&mut self) {
        let query = self.query.to_lowercase();
        let words: Vec<_> = query.split_whitespace().collect();
        self.visible = self
            .entries
            .iter()
            .enumerate()
            .filter(|(_, entry)| words.iter().all(|word| entry.search.contains(word)))
            .filter(|(_, entry)| {
                self.difficulty
                    .as_deref()
                    .is_none_or(|difficulty| entry.difficulty == difficulty)
            })
            .filter(|(_, entry)| match self.status_filter {
                None => true,
                // "Due for review" (web status=due): solved and past due.
                Some(progress::Status::Due) => {
                    self.progress.status(&entry.slug) == progress::Status::Solved
                        && self
                            .progress
                            .due_at(&entry.slug)
                            .is_some_and(|due| due <= progress::now_ms())
                }
                Some(status) => self.progress.status(&entry.slug) == status,
            })
            .filter(|(_, entry)| {
                self.pattern_filter
                    .as_deref()
                    .is_none_or(|pattern| entry.pattern == pattern)
            })
            .map(|(index, _)| index)
            .collect();
        self.page = 0;
    }

    /// Foundation membership from the loaded lessons (task-5
    /// `foundation_slugs`). `None` until `LessonsLoaded`; callers treat
    /// that as "unfiltered" so startup never shows an empty track.
    fn foundation_set(&self) -> Option<BTreeSet<String>> {
        self.lessons.as_ref().map(|lessons| {
            lessons
                .foundation_slugs()
                .into_iter()
                .map(|slug| slug.to_owned())
                .collect()
        })
    }

    /// Position of the current selection inside the filtered `visible`
    /// order. Drives both the workspace Prev/Next buttons and the
    /// keyboard `SelectRelative` stepping.
    fn selected_position(&self) -> Option<usize> {
        let slug = match &self.selected {
            Some(Selection::Local(problem)) => problem.slug.as_str(),
            _ => return None,
        };
        self.visible
            .iter()
            .position(|index| self.entries[*index].slug == slug)
    }

    /// Stage the notes editor for the current selection. Called on Select
    /// (clears to empty), Home (clears), and ProblemLoaded (loads the
    /// stored note), so a stale note never sits beside another lesson.
    fn load_notes(&mut self) {
        let (slug, note) = match &self.selected {
            Some(Selection::Local(problem)) => (
                Some(problem.slug.clone()),
                self.progress.get_note(&problem.slug).to_owned(),
            ),
            _ => (None, String::new()),
        };
        self.notes_editor = text_editor::Content::with_text(&note);
        self.notes_loaded = slug;
        self.notes_dirty = false;
    }

    /// Durably persist a staged note. Split from the per-keystroke memory
    /// sync in `NotesEdit` so typing never blocks on disk I/O (progress
    /// writes stay at navigation disposal points, like drafts).
    fn save_notes(&mut self) {
        let Some(slug) = self.notes_loaded.clone() else {
            return;
        };
        // The editor widget always carries a trailing newline; trim it so
        // the store keeps exactly what was typed (load → edit → save is
        // then a stable round-trip).
        let note = self.notes_editor.text();
        self.progress
            .set_note(&slug, note.trim_end(), progress::now_ms());
        if let Err(error) = self.progress.save() {
            self.progress_error = Some(error.to_string());
        }
        self.notes_dirty = false;
    }

    /// Persist a staged note at navigation disposal points. No-op unless
    /// the editor changed since the last load/save.
    fn flush_notes(&mut self) {
        if self.notes_dirty {
            self.save_notes();
        }
    }

    /// Stage the current editor text in memory and hand it to the background
    /// writer. Never blocks on disk I/O.
    fn stage_draft(&mut self) {
        let Some(Selection::Local(problem)) = &self.selected else {
            return;
        };
        let language = self.language.extension();
        let code = self.editor.text();
        // The saver coalesces rapid edits; a returned key means the previous
        // key is due (language switch), so make sure it is staged too.
        if let Some((slug, lang, due)) = self.saver.queue(&problem.slug, language, code.clone()) {
            let _ = self.drafts.stage(&slug, &lang, due);
        }
        match self.drafts.stage(&problem.slug, language, code) {
            Ok(_) => {
                if self.draft_error.is_some() {
                    self.draft_error = None;
                }
            }
            Err(error) => self.draft_error = Some(format!("Draft storage unavailable: {error}")),
        }
    }

    /// Synchronously persist staged edits. Used at disposal points
    /// (navigation, Run) where durability matters more than input latency.
    fn flush_drafts(&mut self) {
        if let Err(error) = self.drafts.save_now() {
            self.draft_error = Some(format!("Draft storage unavailable: {error}"));
        } else if let Some(error) = self.drafts.poll_errors() {
            self.draft_error = Some(error);
        }
    }

    /// Shared Run/Submit dispatch: the same judge run, but only a passing
    /// submission records the problem solved. Mirrors `run(mode)` in the web
    /// client, where `submit` only changes the progress write.
    fn start_judge(&mut self, submit: bool) -> Task<Message> {
        if self.judge_running || self.tracing || self.practice_grading {
            return Task::none();
        }
        let Some(Selection::Local(problem)) = &self.selected else {
            return Task::none();
        };
        if problem
            .judge
            .as_ref()
            .is_none_or(|spec| !judge::supported(spec))
        {
            return Task::none();
        }
        // Persist the exact code under test at this disposal point.
        let problem = Arc::clone(problem);
        self.flush_drafts();
        let code = self.editor.text();
        let language = self.language;
        let cpp = language == Language::Cpp;
        let cancel = Arc::new(AtomicBool::new(false));
        self.cancel = Some(Arc::clone(&cancel));
        self.judge_running = true;
        self.status_line = Some(if submit {
            "Submitting…".into()
        } else {
            "Running…".into()
        });
        self.verdict = None;
        // A fresh run supersedes any previous trace of this problem.
        self.trace = None;
        Task::perform(
            async move {
                let outcome = match problem.judge.as_ref() {
                    Some(spec) => judge::judge_code(spec, &code, cpp, &cancel),
                    None => judge::Outcome {
                        ok: false,
                        ms: None,
                        text: "No deterministic judge".into(),
                        kind: judge::OutcomeKind::Setup,
                    },
                };
                (problem.slug.clone(), language, submit, outcome)
            },
            |(slug, language, submit, outcome)| Message::Judged(slug, language, submit, outcome),
        )
    }

    /// Trace the user's own code over the first judge test. Declines are
    /// explicit and never fabricated; playback stays on the captured event
    /// list because native Learn renderers for arbitrary traces are pending.
    fn start_trace(&mut self) -> Task<Message> {
        if self.judge_running || self.tracing || self.practice_grading {
            return Task::none();
        }
        let Some(Selection::Local(problem)) = &self.selected else {
            return Task::none();
        };
        if problem
            .judge
            .as_ref()
            .is_none_or(|spec| !judge::supported(spec))
        {
            return Task::none();
        }
        let problem = Arc::clone(problem);
        self.flush_drafts();
        let code = self.editor.text();
        let language = self.language;
        let cpp = language == Language::Cpp;
        let cancel = Arc::new(AtomicBool::new(false));
        self.trace_cancel = Some(Arc::clone(&cancel));
        self.tracing = true;
        self.status_line = Some("Tracing…".into());
        self.trace = None;
        // A fresh trace supersedes the previous verdict so old Solve
        // errors never sit beside a new trace result.
        self.verdict = None;
        Task::perform(
            async move {
                let outcome = trace::trace_problem(problem.judge.as_ref(), cpp, &code, &cancel);
                (problem.slug.clone(), language, outcome)
            },
            |(slug, language, outcome)| Message::Traced(slug, language, outcome),
        )
    }

    /// Explicit server-progress import with backup; repeat runs are
    /// idempotent via the import marker. Drafts go to the draft store,
    /// progress fields go to the progress store.
    fn import_server_progress(&mut self) {
        let Some(source) = std::env::var_os("LCLAB_PROGRESS").map(PathBuf::from) else {
            self.settings_note = Some("LCLAB_PROGRESS is not configured.".into());
            return;
        };
        if !source.is_file() {
            self.settings_note = Some("Configured progress file not found.".into());
            return;
        }
        let backup_dir = self
            .drafts
            .path_parent()
            .map(|parent| parent.join("import-backups"))
            .unwrap_or_else(|| PathBuf::from("import-backups"));
        match self.drafts.import_progress(&source, &backup_dir) {
            Ok(report) => {
                let touched = self.progress.apply_import(&report.progress);
                if let Err(error) = self.progress.save() {
                    self.settings_note =
                        Some(format!("Progress save failed: {error}; drafts updated."));
                    return;
                }
                self.settings_note = Some(if report.skipped {
                    "Already imported — nothing new.".into()
                } else {
                    format!(
                        "Imported {} drafts and {} progress entries; backup kept.",
                        report.drafts, touched
                    )
                });
            }
            Err(error) => {
                self.settings_note = Some(format!("Import failed: {error}; nothing changed."));
            }
        }
    }

    fn import_browser_drafts(&mut self) {
        let source = PathBuf::from(&self.browser_path);
        if self.browser_path.trim().is_empty() {
            self.settings_note = Some("Enter an export file path first.".into());
            return;
        }
        let backup_dir = self
            .drafts
            .path_parent()
            .map(|parent| parent.join("import-backups"))
            .unwrap_or_else(|| PathBuf::from("import-backups"));
        match self.drafts.import_browser_export(&source, &backup_dir) {
            Ok(report) => {
                self.settings_note = Some(if report.skipped {
                    "Already imported — nothing new.".into()
                } else {
                    self.browser_path.clear();
                    format!("Imported {} drafts; backup kept.", report.drafts)
                });
            }
            Err(error) => {
                self.settings_note = Some(format!("Import failed: {error}; nothing changed."));
            }
        }
    }

    fn load_editor(&mut self) {
        let Some(Selection::Local(problem)) = &self.selected else {
            return;
        };
        let language = self.language.extension();
        let draft = self
            .drafts
            .get(&problem.slug, language)
            .or_else(|| problem.snippets.get(language));
        self.editor = text_editor::Content::with_text(draft.map_or("", String::as_str));
    }

    fn current_variant<'a>(&'a self) -> Option<(&'a Arc<Problem>, &'a leetlab_learning::Variant)> {
        let Selection::Local(problem) = self.selected.as_ref()? else {
            return None;
        };
        let lesson = self.lessons.as_ref()?.lesson(&problem.slug)?;
        Some((problem, lesson.variants.get(self.practice_variant)?))
    }

    /// Draft key scoping a practice drill: variant id keeps Solve drafts
    /// (keyed by plain slug) and other drills apart in the same store.
    fn practice_draft_key(slug: &str, variant: &str) -> String {
        format!("{slug}#{variant}")
    }

    /// Map a judge type token to a concrete language type, preserving array
    /// depth (`int[]` -> `int[]` / `vector<int>`). Port of web
    /// `typeName()` in `plugin/web/ui/starter.js`; unknown bases return
    /// `None` so the caller falls back to the adapter notice.
    fn practice_type_name(raw: &str, cpp: bool) -> Option<String> {
        let depth = raw.matches("[]").count();
        let base = raw.replace("[]", "");
        let mut mapped = match base.as_str() {
            "int" => Some("int".to_owned()),
            "long" => Some(if cpp { "long long" } else { "long" }.to_owned()),
            "double" => Some("double".to_owned()),
            "boolean" => Some(if cpp { "bool" } else { "boolean" }.to_owned()),
            "string" => Some(if cpp { "string" } else { "String" }.to_owned()),
            "char" => Some("char".to_owned()),
            "ListNode" => Some(if cpp { "ListNode*" } else { "ListNode" }.to_owned()),
            "TreeNode" => Some(if cpp { "TreeNode*" } else { "TreeNode" }.to_owned()),
            "void" => Some("void".to_owned()),
            _ => None,
        }?;
        for _ in 0..depth {
            mapped = if cpp {
                format!("vector<{mapped}>")
            } else {
                format!("{mapped}[]")
            };
        }
        Some(mapped)
    }

    /// Synthesize a compiling starter from the drill's own signature in the
    /// given language. Port of web `solutionStarter()`: valid identifiers
    /// only, `arg{i}` fallback names, C++ vector params by reference, and an
    /// explicit adapter notice when the signature is unknown. Callers prefer
    /// a saved per-drill draft first; this is only the untouched-editor
    /// fallback (mirrors the web preserve-vs-swap rule).
    fn practice_starter(
        signature: &leetlab_learning::VariantSignature,
        language: Language,
    ) -> String {
        let cpp = language == Language::Cpp;
        let valid = |name: &str| {
            let mut chars = name.chars();
            match chars.next() {
                Some(first) if first.is_ascii_alphabetic() || first == '_' => (),
                _ => return false,
            }
            chars.all(|char| char.is_ascii_alphanumeric() || char == '_')
        };
        if signature.name.is_empty() || !valid(&signature.name) {
            return "// No verified method signature is available for this problem.\n".into();
        }
        let Some(result) = Self::practice_type_name(&signature.return_type, cpp) else {
            return "// This problem needs a specialized starter adapter.\n".into();
        };
        let mut params = Vec::with_capacity(signature.params.len());
        for (index, parameter) in signature.params.iter().enumerate() {
            let Some(mut rendered) = Self::practice_type_name(&parameter.value_type, cpp) else {
                return "// This problem needs a specialized starter adapter.\n".into();
            };
            let name = if valid(&parameter.name) {
                parameter.name.clone()
            } else {
                format!("arg{index}")
            };
            if cpp && parameter.value_type.contains("[]") {
                rendered.push('&');
            }
            params.push(format!("{rendered} {name}"));
        }
        if cpp {
            format!(
                "class Solution {{\npublic:\n    {result} {}({}) {{\n        // Write your solution here.\n        throw logic_error(\"Not implemented\");\n    }}\n}};\n",
                signature.name,
                params.join(", ")
            )
        } else {
            format!(
                "class Solution {{\n    public {result} {}({}) {{\n        // Write your solution here.\n        throw new UnsupportedOperationException(\"Not implemented\");\n    }}\n}}\n",
                signature.name,
                params.join(", ")
            )
        }
    }

    /// Stage the current practice editor text under the (drill, language)
    /// key. Mirrors [`Self::stage_draft`] for the Solve editor.
    fn stage_practice_drafts(&mut self) {
        let Some((problem, variant)) = self.current_variant() else {
            return;
        };
        let language = self.language;
        let extension = language.extension();
        let drill = Self::practice_draft_key(&problem.slug, &variant.id);
        let code = self.practice_editor.text();
        if let Some((slug, lang, due)) = self.saver.queue(&drill, extension, code.clone()) {
            let _ = self.drafts.stage(&slug, &lang, due);
        }
        if let Err(error) = self.drafts.stage(&drill, extension, code) {
            self.draft_error = Some(format!("Draft storage unavailable: {error}"));
        } else if self.draft_error.is_some() {
            self.draft_error = None;
        }
    }

    fn load_practice_editor(&mut self) {
        let language = self.language;
        let extension = language.extension();
        let key = match &self.selected {
            Some(Selection::Local(problem)) => {
                (problem.slug.clone(), self.practice_variant, language)
            }
            _ => return,
        };
        if self.practice_loaded.as_ref() == Some(&key) {
            return;
        }
        let drill = self
            .current_variant()
            .map(|(problem, variant)| Self::practice_draft_key(&problem.slug, &variant.id))
            .unwrap_or_default();
        let text = self
            .drafts
            .get(&drill, extension)
            .cloned()
            .or_else(|| {
                self.current_variant()
                    .map(|(_, variant)| Self::practice_starter(&variant.signature, language))
            })
            .unwrap_or_default();
        self.practice_loaded = Some(key);
        self.practice_editor = text_editor::Content::with_text(&text);
    }

    /// Grade the current practice variant by running ALL of its tests through
    /// the native judge in the selected language.
    fn start_grading(&mut self) -> Task<Message> {
        if self.judge_running || self.tracing || self.practice_grading {
            return Task::none();
        }
        let (slug, variant_id, spec) = match self.current_variant() {
            Some((problem, variant)) => (
                problem.slug.clone(),
                variant.id.clone(),
                leetlab_core::Judge {
                    mode: if variant.mode.is_empty() {
                        "exact".into()
                    } else {
                        variant.mode.clone()
                    },
                    signature: leetlab_core::Signature {
                        name: variant.signature.name.clone(),
                        params: variant
                            .signature
                            .params
                            .iter()
                            .map(|parameter| leetlab_core::Parameter {
                                name: parameter.name.clone(),
                                value_type: parameter.value_type.clone(),
                            })
                            .collect(),
                        return_type: variant.signature.return_type.clone(),
                    },
                    tests: variant
                        .tests
                        .iter()
                        .enumerate()
                        .map(|(index, test)| leetlab_core::JudgeCase {
                            args: test.args.clone(),
                            expected: test.expected.clone(),
                            example: index as u32 + 1,
                        })
                        .collect(),
                    mutates: None,
                    sequences: None,
                    validate: None,
                    helpers: None,
                },
            ),
            None => return Task::none(),
        };
        if !judge::supported(&spec) {
            self.practice_verdicts.insert(
                (variant_id, self.language),
                (
                    judge::OutcomeKind::Setup,
                    "This variant is outside the supported grading coverage.".into(),
                ),
            );
            return Task::none();
        }
        // Persist the exact code under test at this disposal point.
        self.stage_practice_drafts();
        let code = self.practice_editor.text();
        let language = self.language;
        let cpp = language == Language::Cpp;
        let cancel = Arc::new(AtomicBool::new(false));
        self.cancel = Some(Arc::clone(&cancel));
        self.practice_grading = true;
        Task::perform(
            async move {
                let outcome = judge::judge_code(&spec, &code, cpp, &cancel);
                (slug, language, variant_id, outcome)
            },
            |(slug, language, variant, outcome)| Message::Graded(slug, language, variant, outcome),
        )
    }

    fn view(&self) -> Element<'_, Message> {
        let at_home = self.selected.is_none();
        let rail = container(
            column![
                paint::rail_button("///", 11, at_home, Message::Home),
                paint::rail_button("≡", 15, !self.hide_catalog, Message::ToggleCatalog),
                paint::rail_button("⚙", 15, self.settings_open, Message::ToggleSettings),
                paint::rail_button("?", 15, self.help_open, Message::ToggleHelp),
                paint::rail_button(
                    if self.dark_mode() { "☾" } else { "☀" },
                    15,
                    false,
                    Message::ToggleTheme
                ),
            ]
            .spacing(10)
            .align_x(iced::Alignment::Center),
        )
        .padding(8)
        .width(Length::Fixed(48.0))
        .height(Fill)
        .style(paint::surface);

        let mut base = row![rail].height(Fill);
        let narrow = self.is_narrow();
        let catalog_open = self.catalog.is_some() && !self.hide_catalog;
        if catalog_open && !narrow {
            base = base.push(self.catalog_view());
        }
        base = base.push(self.workspace());
        // Narrow windows: the catalog becomes an overlay sheet over the
        // full-width workspace (web R4 drawer contract) instead of a
        // squeezed side column. Scrim click and Escape collapse it, and
        // Select closes it exactly like the desktop drawer.
        let mut screen: Element<'_, Message> = base.into();
        if catalog_open && narrow {
            screen = self.catalog_sheet(screen);
        }
        if self.settings_open {
            screen = iced::widget::Stack::new()
                .push(screen)
                .push(self.settings_overlay())
                .width(Fill)
                .height(Fill)
                .into();
        }
        // Help stacks above settings so `?` stays reachable everywhere.
        if self.help_open {
            screen = iced::widget::Stack::new()
                .push(screen)
                .push(self.help_overlay())
                .width(Fill)
                .height(Fill)
                .into();
        }
        screen
    }

    /// Help dialog body: the keyboard map plus its honest limits. Pure
    /// construction, no window needed.
    fn help(&self) -> Element<'_, Message> {
        let rows = [
            "/ or Ctrl+F — search the catalog",
            "j / ↓ — next lesson · k / ↑ — previous lesson",
            "s — start the next unsolved lesson",
            "Space / → — advance (Learn: next step · Home: start next)",
            "← — Learn: previous step",
            "1 / 2 / 3 — Solve / Learn / Practice panels",
            "Ctrl+Enter — run the current Solve editor",
            "? — this help · Esc — close overlay, then drawer",
        ];
        let mut body = column![row![
            paint::kicker("Keyboard shortcuts"),
            horizontal_space(),
            button(
                row![paint::icon("✕", 12), text("Close").size(14),]
                    .spacing(4)
                    .align_y(iced::Alignment::Center),
            )
            .padding([7, 9])
            .style(|theme: &Theme, status: button::Status| {
                paint::button_style(theme, status, false)
            })
            .on_press(Message::ToggleHelp),
        ]
        .align_y(iced::Alignment::Center)]
        .spacing(10);
        for row_text in rows {
            body = body.push(text(row_text).size(13));
        }
        body = body.push(
            text(
                "Single-key shortcuts also fire while typing in search, notes, \
                 or code (same known limit as 1/2/3); open overlays consume them.",
            )
            .size(12),
        );
        scrollable(body.spacing(10)).into()
    }

    /// Help overlay (keyboard map). Stacks above the settings overlay so
    /// `?` stays reachable while settings are open; scrim click and Escape
    /// both close it.
    fn help_overlay(&self) -> Element<'_, Message> {
        use iced::widget::{mouse_area, Stack};
        let scrim = mouse_area(
            container(text(""))
                .width(Length::Fill)
                .height(Length::Fill)
                .style(|_theme: &Theme| container::Style {
                    background: Some(iced::Color::from_rgba(0.0, 0.0, 0.0, 0.45).into()),
                    ..Default::default()
                }),
        )
        .on_press(Message::ToggleHelp);
        let dialog = container(
            container(self.help())
                .width(Length::Fixed(560.0))
                .padding(18)
                .style(paint::surface),
        )
        .width(Length::Fill)
        .height(Length::Fill)
        .center_x(Length::Fill)
        .center_y(Length::Fill);
        // Swallow clicks inside the dialog so only outside clicks dismiss.
        let dialog = mouse_area(dialog).on_press(Message::Noop);
        Stack::new()
            .push(scrim)
            .push(dialog)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }

    fn catalog_view(&self) -> Element<'_, Message> {
        // Four track chips exceed the 300px drawer in one row ("All" clips),
        // so they wrap as two rows of two.
        let tracks = column![
            row![
                paint::control("Foundation", self.track == Track::Foundation)
                    .on_press(Message::Track(Track::Foundation)),
                paint::control("NeetCode 150", self.track == Track::NeetCode)
                    .on_press(Message::Track(Track::NeetCode)),
            ]
            .spacing(3),
            row![
                paint::control("Blind 75", self.track == Track::Blind)
                    .on_press(Message::Track(Track::Blind)),
                paint::control("All", self.track == Track::All).on_press(Message::Track(Track::All)),
            ]
            .spacing(3),
        ]
        .spacing(3);
        let difficulties = row![
            paint::control("All", self.difficulty.is_none()).on_press(Message::Difficulty(None)),
            paint::control("Easy", self.difficulty.as_deref() == Some("Easy"))
                .on_press(Message::Difficulty(Some("Easy".into()))),
            paint::control("Medium", self.difficulty.as_deref() == Some("Medium"))
                .on_press(Message::Difficulty(Some("Medium".into()))),
            paint::control("Hard", self.difficulty.as_deref() == Some("Hard"))
                .on_press(Message::Difficulty(Some("Hard".into()))),
        ]
        .spacing(3);
        let status_options: Vec<String> = [
            "All statuses",
            "New",
            "Attempted",
            "Solved",
            "Due for review",
        ]
        .iter()
        .map(|label| label.to_string())
        .collect();
        let status_selected = match self.status_filter {
            None => "All statuses".to_owned(),
            Some(status) => status.label().to_owned(),
        };
        let mut pattern_options = vec!["All patterns".to_owned()];
        if let Some(catalog) = &self.catalog {
            pattern_options.extend(catalog.patterns.iter().map(|pattern| pattern.label.clone()));
        }
        let pattern_selected = self
            .pattern_filter
            .as_ref()
            .and_then(|id| {
                self.catalog.as_ref().and_then(|catalog| {
                    catalog
                        .patterns
                        .iter()
                        .find(|pattern| &pattern.id == id)
                        .map(|pattern| pattern.label.clone())
                })
            })
            .unwrap_or_else(|| "All patterns".to_owned());
        let pattern_lookup: Vec<(String, String)> = self
            .catalog
            .as_ref()
            .map(|catalog| {
                catalog
                    .patterns
                    .iter()
                    .map(|pattern| (pattern.label.clone(), pattern.id.clone()))
                    .collect()
            })
            .unwrap_or_default();
        let pick_style = |theme: &Theme, _status: iced::widget::pick_list::Status| {
            iced::widget::pick_list::Style {
                text_color: theme.palette().text,
                placeholder_color: theme.palette().text,
                handle_color: theme.palette().text,
                background: theme.palette().background.into(),
                border: Border {
                    color: theme.palette().text,
                    width: 2.0,
                    ..Default::default()
                },
            }
        };
        let selects = row![
            iced::widget::pick_list(status_options, Some(status_selected), |label: String| {
                Message::StatusFilter(match label.as_str() {
                    "New" => Some(progress::Status::Todo),
                    "Attempted" => Some(progress::Status::Attempted),
                    "Solved" => Some(progress::Status::Solved),
                    "Due for review" => Some(progress::Status::Due),
                    _ => None,
                })
            })
            .placeholder("All statuses")
            .style(pick_style),
            iced::widget::pick_list(
                pattern_options,
                Some(pattern_selected),
                move |label: String| {
                    Message::PatternFilter(
                        pattern_lookup
                            .iter()
                            .find(|(name, _)| *name == label)
                            .map(|(_, id)| id.clone()),
                    )
                }
            )
            .placeholder("All patterns")
            .style(pick_style),
        ]
        .spacing(6);
        let start = self.page * PAGE_SIZE;
        let end = (start + PAGE_SIZE).min(self.visible.len());
        let entries = self.visible.iter().skip(start).take(PAGE_SIZE).fold(
            Column::new().spacing(2).padding(iced::Padding {
                top: 0.0,
                right: 10.0,
                bottom: 0.0,
                left: 0.0,
            }),
            |list, index| {
                let entry = &self.entries[*index];
                let selected = match &self.selected {
                    Some(Selection::Local(problem)) => problem.slug == entry.slug,
                    Some(Selection::External { title, .. }) => title == &entry.title,
                    None => false,
                };
                let status = self.progress.status(&entry.slug);
                let due_overdue = self
                    .progress
                    .due_at(&entry.slug)
                    .is_some_and(|due| due <= progress::now_ms());
                let title = entry.title.clone();
                // S4 row status slot: due pill OR NEW replaces the
                // difficulty label; solved appends a check to it.
                let right: Element<'_, Message> =
                    if due_overdue && status != progress::Status::Solved {
                        paint::due_pill("DUE").into()
                    } else if status == progress::Status::Todo {
                        text("NEW").size(10).into()
                    } else {
                        let mut slot = row![paint::difficulty(&entry.difficulty.to_uppercase())]
                            .spacing(4)
                            .align_y(iced::Alignment::Center);
                        if status == progress::Status::Solved {
                            slot = slot.push(paint::solved_check());
                        }
                        slot.into()
                    };
                let content = row![
                    text(if entry.id == 0 {
                        String::new()
                    } else {
                        format!("#{}", entry.id)
                    })
                    .size(11),
                    text(title).size(14).font(paint::bold()).width(Length::Fill),
                    right,
                ]
                .spacing(8)
                .align_y(iced::Alignment::Center);
                // Flat web-style rows: transparent until hovered/selected,
                // hairline rules carry the separation instead of boxes.
                let list = list.push(
                    button(content)
                        .width(Fill)
                        .padding([7, 10])
                        .style(move |theme: &iced::Theme,
                                     status: iced::widget::button::Status| {
                            let palette = theme.palette();
                            let hovered = matches!(
                                status,
                                iced::widget::button::Status::Hovered
                            );
                            let on = selected
                                || matches!(
                                    status,
                                    iced::widget::button::Status::Pressed
                                );
                            iced::widget::button::Style {
                                background: if on {
                                    Some(palette.text.into())
                                } else {
                                    None
                                },
                                text_color: if on {
                                    palette.background
                                } else if hovered {
                                    palette.primary
                                } else {
                                    palette.text
                                }
                                .into(),
                                border: iced::Border {
                                    width: 0.0,
                                    ..Default::default()
                                },
                                ..Default::default()
                            }
                        })
                        .on_press(Message::Select(entry.slug.clone())),
                );
                list.push(paint::hairline())
            },
        );
        let total_problems = self
            .catalog
            .as_ref()
            .map(|catalog| catalog.problems.len())
            .unwrap_or(2913);
        let count = if end == 0 {
            "No matches — clear the search or filters".to_owned()
        } else {
            format!("{} of {}", self.visible.len(), total_problems)
        };
        let pager = row![
            paint::control("Previous", false)
                .on_press_maybe((self.page > 0).then(|| Message::Page(self.page - 1))),
            text(count).size(13).width(Fill),
            paint::control("Next", false)
                .on_press_maybe((end < self.visible.len()).then_some(Message::Page(self.page + 1))),
        ]
        .spacing(8)
        .align_y(iced::Alignment::Center);

        // Empty-state reset (web "Reset filters"): a visible action, only
        // rendered when the current filters match nothing.
        let reset_row: Element<'_, Message> = if self.visible.is_empty() {
            paint::control("Reset filters", false)
                .on_press(Message::ResetFilters)
                .into()
        } else {
            horizontal_space().into()
        };
        container(
            column![
                paint::kicker("Problem catalog"),
                text_input("Search 2913 problems...", &self.query)
                    .id(text_input::Id::new(SEARCH_ID))
                    .on_input(Message::Query)
                    .padding(9)
                    .style(paint::search),
                tracks,
                difficulties,
                selects,
                reset_row,
                scrollable(entries).height(Fill),
                pager,
            ]
            .spacing(10),
        )
        .padding(13)
        .width(Length::Fixed(300.0))
        .height(Fill)
        .style(paint::surface)
        .into()
    }

    /// Narrow-window catalog overlay: dimmed scrim (click outside closes)
    /// plus the same 300px drawer pinned left. Same content as the desktop
    /// side column; only the placement changes, so Select/Escape/FocusSearch
    /// behave identically on both.
    fn catalog_sheet<'a>(&'a self, base: Element<'a, Message>) -> Element<'a, Message> {
        use iced::widget::{mouse_area, Stack};
        let scrim = mouse_area(
            container(text(""))
                .width(Length::Fill)
                .height(Length::Fill)
                .style(|_theme: &Theme| container::Style {
                    background: Some(iced::Color::from_rgba(0.0, 0.0, 0.0, 0.45).into()),
                    ..Default::default()
                }),
        )
        // The sheet only renders while the drawer is open, so toggling
        // here always closes it.
        .on_press(Message::ToggleCatalog);
        // The sheet row itself captures nothing: catalog buttons handle
        // their own clicks, everything else falls through to the scrim.
        let sheet = row![self.catalog_view(), horizontal_space()]
            .width(Fill)
            .height(Fill);
        Stack::new()
            .push(base)
            .push(scrim)
            .push(sheet)
            .width(Fill)
            .height(Fill)
            .into()
    }

    fn workspace(&self) -> Element<'_, Message> {
        let content = match &self.selected {
            Some(Selection::Local(problem)) => {
                let tabs = container(
                    row![
                        paint::tab_button(
                            column![
                                text("01 SOLVE").size(10).font(paint::black_font()),
                                paint::subtitle("RUN YOUR CODE"),
                            ]
                            .spacing(2)
                            .align_x(iced::Alignment::Center)
                            .width(Length::Fill),
                            self.panel == Panel::Solve,
                            Message::Panel(Panel::Solve)
                        ),
                        paint::tab_divider(),
                        paint::tab_button(
                            column![
                                text("02 LEARN").size(10).font(paint::black_font()),
                                paint::subtitle("CODE + VISUAL"),
                            ]
                            .spacing(2)
                            .align_x(iced::Alignment::Center)
                            .width(Length::Fill),
                            self.panel == Panel::Learn,
                            Message::Panel(Panel::Learn)
                        ),
                        paint::tab_divider(),
                        paint::tab_button(
                            column![
                                text("03 PRACTICE").size(10).font(paint::black_font()),
                                paint::subtitle("DRILLS"),
                            ]
                            .spacing(2)
                            .align_x(iced::Alignment::Center)
                            .width(Length::Fill),
                            self.panel == Panel::Practice,
                            Message::Panel(Panel::Practice)
                        ),
                    ]
                    .spacing(0),
                )
                .height(Length::Shrink)
                .style(paint::surface);
                let panel = match self.panel {
                    Panel::Solve => self.solve(problem),
                    Panel::Learn => self.learn(problem),
                    Panel::Practice => self.practice(problem),
                };
                let lesson_no = self
                    .catalog
                    .as_ref()
                    .and_then(|catalog| {
                        catalog
                            .curriculum
                            .iter()
                            .position(|entry| entry.slug == problem.slug)
                    })
                    .map(|position| position + 1)
                    .unwrap_or(0);
                let lesson_total = self
                    .catalog
                    .as_ref()
                    .map(|catalog| catalog.curriculum.len())
                    .unwrap_or(150);
                let mut title_row = row![
                    paint::title(&problem.title),
                    paint::difficulty(&problem.difficulty.to_uppercase()),
                    // Premium is data, not decoration (web `Premium` chip).
                    if problem.premium {
                        paint::difficulty("PREMIUM")
                    } else {
                        paint::difficulty("")
                    },
                    horizontal_space()
                ]
                .spacing(10);
                // Lesson stepping (Prev/Next) and Share sit beside SOLVE →
                // on every panel. Stepping reuses `SelectRelative`, so the
                // buttons and the j/k/arrow keys can never disagree.
                let position = self.selected_position();
                let stepping = !self.visible.is_empty();
                let has_prev = position.is_some_and(|position| position > 0);
                let has_next = position.is_some_and(|position| {
                    position + 1 < self.visible.len()
                });
                title_row = title_row
                    .push(
                        paint::control("← Prev", stepping)
                            .on_press_maybe((stepping && (position.is_none() || has_prev)).then_some(Message::SelectRelative(-1))),
                    )
                    .push(
                        paint::control("Next →", stepping)
                            .on_press_maybe((stepping && (position.is_none() || has_next)).then_some(Message::SelectRelative(1))),
                    )
                    .push(paint::control("Share", true).on_press(Message::Share));
                // SOLVE → stays visible on every panel, matching topbar C.
                title_row = title_row.push(
                    button(text("SOLVE →").size(12).font(paint::black_font()))
                        .style(|theme: &Theme, _status: button::Status| button::Style {
                            text_color: theme.palette().primary,
                            ..button::Style::default()
                        })
                        .padding([4, 2])
                        .on_press(Message::Panel(Panel::Solve)),
                );
                column![
                    row![
                        paint::kicker(&format!(
                            "N°{:03} — {}",
                            problem.id,
                            problem.pattern.replace('_', " ").to_uppercase()
                        )),
                        horizontal_space(),
                        paint::kicker(&format!(
                            "Lesson {:03}/{} · {}",
                            lesson_no,
                            lesson_total,
                            match self.progress.status(&problem.slug) {
                                progress::Status::Attempted =>
                                    format!("Attempted ×{}", self.progress.attempts(&problem.slug)),
                                status => status.label().to_owned(),
                            }
                        )),
                    ]
                    .align_y(iced::Alignment::Center),
                    title_row.align_y(iced::Alignment::Center),
                    horizontal_rule(3),
                    tabs,
                    panel
                ]
                .spacing(10)
            }
            Some(Selection::External { title, url }) => column![
                text(title).size(32),
                text("This lesson has a published source link."),
                paint::control("Open published source", false)
                    .on_press(Message::OpenSource(url.clone())),
            ]
            .spacing(12),
            None => column![self.home()],
        };
        let content = if let Some(notice) = &self.notice {
            content.push(text(notice).size(13))
        } else {
            content
        };
        let content = if let Some(error) = &self.error {
            content.push(
                text(error).style(|theme: &iced::Theme| iced::widget::text::Style {
                    color: Some(theme.palette().danger),
                }),
            )
        } else {
            content
        };
        container(content.height(Fill))
            .padding(20)
            .width(Fill)
            .height(Fill)
            .into()
    }

    /// R4 practice home (web shell-r4 renderHome): hero + CTA, numbered
    /// ladder, due-for-review, pattern mastery, footer. Every count comes
    /// from the loaded entries and the native progress store; nothing is
    /// synthesized. Shown when no problem is selected, replacing the old
    /// "Choose a problem" placeholder.
    fn home(&self) -> Element<'_, Message> {
        if self.catalog.is_none() {
            return container(
                column![
                    paint::kicker("LeetCode Lab"),
                    paint::title("Practice home"),
                    text(if self.error.is_some() {
                        "The catalog could not be loaded."
                    } else {
                        "Loading catalog…"
                    })
                    .size(14),
                ]
                .spacing(12),
            )
            .padding(20)
            .width(Fill)
            .height(Fill)
            .into();
        }
        let total = self.entries.len();
        let solved = self
            .entries
            .iter()
            .filter(|entry| self.progress.status(&entry.slug) == progress::Status::Solved)
            .count();
        let first_open = self
            .entries
            .iter()
            .find(|entry| self.progress.status(&entry.slug) != progress::Status::Solved)
            .map(|entry| entry.slug.clone());
        let percent = if total == 0 {
            0.0
        } else {
            (solved as f32 / total as f32) * 100.0
        };
        let cta_label = if solved == 0 {
            "Start practicing →"
        } else {
            "Continue practice →"
        };
        let mut body = column![
            paint::kicker("Personal LeetCode workspace"),
            paint::title("Build your interview instincts."),
            text(
                "Start with focused lessons, understand the code through its visual state, \
                 then solve and practice independently. Expand into Blind 75 and NeetCode 150 \
                 at your own pace."
            )
            .size(13)
            .font(paint::regular()),
            row![
                paint::go(cta_label).on_press_maybe(first_open.map(Message::Select)),
                paint::control("Jump to a problem", false).on_press(Message::FocusSearch),
            ]
            .spacing(8),
            text(format!("{solved} solved of {total}")).size(13),
            progress_bar(0.0..=100.0, percent),
        ]
        .spacing(10);
        body = body.push(self.path_section());
        let mut ladder = column![paint::kicker("The ladder — one step at a time")].spacing(6);
        for (position, difficulty) in ["Easy", "Medium", "Hard"].iter().enumerate() {
            let bucket: Vec<_> = self
                .entries
                .iter()
                .filter(|entry| &entry.difficulty == difficulty)
                .collect();
            let done = bucket
                .iter()
                .filter(|entry| self.progress.status(&entry.slug) == progress::Status::Solved)
                .count();
            let next = bucket
                .iter()
                .find(|entry| self.progress.status(&entry.slug) != progress::Status::Solved)
                .map(|entry| entry.slug.clone());
            let next_title = bucket
                .iter()
                .find(|entry| self.progress.status(&entry.slug) != progress::Status::Solved)
                .map(|entry| format!("Continue: {}", entry.title))
                .unwrap_or_else(|| "All clear".to_owned());
            ladder = ladder.push(
                button(
                    row![
                        text(format!("{:02}", position + 1))
                            .size(11)
                            .font(paint::black_font()),
                        column![
                            text(difficulty.to_string())
                                .size(14)
                                .font(paint::black_font()),
                            text(format!("{done} / {} solved", bucket.len())).size(12),
                            text(next_title).size(12),
                        ]
                        .spacing(2)
                        .width(Fill),
                    ]
                    .spacing(8)
                    .align_y(iced::Alignment::Center),
                )
                .width(Fill)
                .padding([7, 10])
                .style(|theme: &Theme, status| paint::button_style(theme, status, false))
                .on_press_maybe(next.map(Message::Select)),
            );
        }
        body = body.push(ladder);
        let mut review = column![paint::kicker("Due for review — spaced repetition")].spacing(6);
        let due = self.due_rows(6);
        if due.is_empty() {
            review = review
                .push(text("Nothing due — solved problems return here for review.").size(13));
        } else {
            for (slug, title, topic, difficulty, days) in due {
                let meta = if days > 0 {
                    format!("{topic} · {days}d overdue")
                } else {
                    format!("{topic} · due today")
                };
                review = review.push(
                    button(
                        row![
                            text(title).size(14).width(Fill),
                            text(format!("{difficulty} · {meta}")).size(12),
                        ]
                        .spacing(8)
                        .align_y(iced::Alignment::Center),
                    )
                    .width(Fill)
                    .padding([7, 10])
                    .style(|theme: &Theme, status| paint::button_style(theme, status, false))
                    .on_press(Message::Select(slug)),
                );
            }
        }
        body = body.push(review);
        let mut mastery = column![paint::kicker("Pattern mastery")].spacing(6);
        for (id, label, done, count) in self.pattern_rows() {
            mastery = mastery.push(
                button(
                    row![
                        text(label).size(14).width(Fill),
                        text(format!("{done}/{count}")).size(12),
                    ]
                    .spacing(8)
                    .align_y(iced::Alignment::Center),
                )
                .width(Fill)
                .padding([7, 10])
                .style(|theme: &Theme, status| paint::button_style(theme, status, false))
                .on_press(Message::PatternBrowse(id)),
            );
        }
        body = body.push(mastery);
        let reset_label = if self.reset_armed {
            "Click again to confirm reset"
        } else {
            "Reset progress"
        };
        body = body.push(
            row![
                text("Java + C++ judged locally · step-by-step 2D visuals · AI tutor on demand")
                    .size(12),
                horizontal_space(),
                paint::control(reset_label, self.reset_armed).on_press(Message::ResetProgress),
            ]
            .spacing(8)
            .align_y(iced::Alignment::Center),
        );
        if let Some(line) = &self.status_line {
            body = body.push(text(line).size(13));
        }
        if let Some(error) = &self.error {
            body = body.push(text(error).size(13));
        }
        container(scrollable(body.spacing(16)).height(Fill).width(Fill))
            .padding(20)
            .width(Fill)
            .height(Fill)
            .into()
    }

    /// Curriculum path section (home): Foundation first, then Blind 75,
    /// NeetCode 150, then everything. Counts come from the loaded catalog
    /// (+ lessons for Foundation) and the native progress store; each row
    /// switches to that track. Pure construction, headless-testable.
    fn path_section(&self) -> Element<'_, Message> {
        let mut section =
            column![paint::kicker("Curriculum path — foundation first")].spacing(6);
        for (label, track, total, done) in self.path_rows() {
            let active = self.track == track;
            section = section.push(
                button(
                    row![
                        text(label).size(14).font(paint::black_font()).width(Fill),
                        text(format!("{done}/{total}")).size(12),
                        text(if active { "ACTIVE" } else { "" }).size(9),
                    ]
                    .spacing(8)
                    .align_y(iced::Alignment::Center),
                )
                .width(Fill)
                .padding([7, 10])
                .style(
                    move |theme: &Theme, status| paint::button_style(theme, status, active),
                )
                .on_press(Message::Track(track)),
            );
        }
        section = section.push(
            text(
                "Foundation is the default track: only fully-featured lessons \
                 (walkthrough + line notes + 3 drills + judge).",
            )
            .size(12),
        );
        section.into()
    }

    /// Per-track (label, track, total, solved) rows in curriculum-path
    /// order. Foundation totals use the loaded lessons; before they arrive
    /// the row counts the whole curriculum, matching `build_entries`.
    fn path_rows(&self) -> Vec<(String, Track, usize, usize)> {
        let Some(catalog) = &self.catalog else {
            return Vec::new();
        };
        let solved = |slug: &str| self.progress.status(slug) == progress::Status::Solved;
        let foundation = self.foundation_set();
        let foundation_slugs: Vec<&str> = catalog
            .curriculum
            .iter()
            .filter(|entry| {
                foundation
                    .as_ref()
                    .is_none_or(|set| set.contains(entry.slug.as_str()))
            })
            .map(|entry| entry.slug.as_str())
            .collect();
        let blind_slugs: Vec<&str> = catalog
            .curriculum
            .iter()
            .filter(|entry| entry.blind75)
            .map(|entry| entry.slug.as_str())
            .collect();
        let neet_total = catalog.curriculum.len();
        let neet_done = catalog
            .curriculum
            .iter()
            .filter(|entry| solved(entry.slug.as_str()))
            .count();
        vec![
            (
                "Foundation".to_owned(),
                Track::Foundation,
                foundation_slugs.len(),
                foundation_slugs
                    .iter()
                    .filter(|slug| solved(slug))
                    .count(),
            ),
            (
                "Blind 75".to_owned(),
                Track::Blind,
                blind_slugs.len(),
                blind_slugs.iter().filter(|slug| solved(slug)).count(),
            ),
            ("NeetCode 150".to_owned(), Track::NeetCode, neet_total, neet_done),
            (
                "All problems".to_owned(),
                Track::All,
                catalog.problems.len(),
                catalog.problems.iter().filter(|p| solved(&p.slug)).count(),
            ),
        ]
    }

    /// Due-for-review rows (web store.due): solved and past due, oldest
    /// first, capped at `limit`. Each row carries overdue whole days.
    fn due_rows(&self, limit: usize) -> Vec<(String, String, String, String, u64)> {
        let now = progress::now_ms();
        let mut due: Vec<_> = self
            .entries
            .iter()
            .filter(|entry| {
                self.progress.status(&entry.slug) == progress::Status::Solved
                    && self
                        .progress
                        .due_at(&entry.slug)
                        .is_some_and(|due| due <= now)
            })
            .collect();
        due.sort_by_key(|entry| self.progress.due_at(&entry.slug).unwrap_or(u64::MAX));
        due.into_iter()
            .take(limit)
            .map(|entry| {
                let days = self
                    .progress
                    .due_at(&entry.slug)
                    .map(|due| now.saturating_sub(due) / 86_400_000)
                    .unwrap_or(0);
                let topic = if entry.pattern.is_empty() {
                    entry.difficulty.clone()
                } else {
                    entry.pattern.clone()
                };
                (
                    entry.slug.clone(),
                    entry.title.clone(),
                    topic,
                    entry.difficulty.clone(),
                    days,
                )
            })
            .collect()
    }

    /// Per-pattern mastery rows in catalog order, plus an "Other" bucket
    /// for entries whose pattern id is not indexed. Totals always sum to
    /// the full entry list so the home counts stay honest.
    fn pattern_rows(&self) -> Vec<(String, String, usize, usize)> {
        let mut rows = Vec::new();
        let mut known = std::collections::BTreeSet::new();
        if let Some(catalog) = &self.catalog {
            for pattern in &catalog.patterns {
                known.insert(pattern.id.as_str());
                let total = self
                    .entries
                    .iter()
                    .filter(|entry| entry.pattern == pattern.id)
                    .count();
                if total == 0 {
                    continue;
                }
                let done = self
                    .entries
                    .iter()
                    .filter(|entry| {
                        entry.pattern == pattern.id
                            && self.progress.status(&entry.slug) == progress::Status::Solved
                    })
                    .count();
                rows.push((pattern.id.clone(), pattern.label.clone(), done, total));
            }
        }
        let rest: Vec<_> = self
            .entries
            .iter()
            .filter(|entry| !known.contains(entry.pattern.as_str()))
            .collect();
        if !rest.is_empty() {
            let done = rest
                .iter()
                .filter(|entry| self.progress.status(&entry.slug) == progress::Status::Solved)
                .count();
            rows.push((String::new(), "Other".to_owned(), done, rest.len()));
        }
        rows
    }

    fn solve<'a>(&'a self, problem: &'a Problem) -> Element<'a, Message> {
        let narrow = self.is_narrow();
        let mut statement = column![
            text("Statement").size(20),
            // Web `pattern - topics` meta line; native already shows
            // the pattern in the kicker, topics live here.
            text(problem.topics.join(" - ")).size(11),
            text(&problem.description)
        ]
        .spacing(10);
        // Curated-overlay provenance (web `.lc-overlay-note`). Rendered
        // only when present; never blocks the statement.
        if problem.provenance.is_some() {
            statement = statement.push(
                text("Curated overlay - source-equivalent summary; see links below.").size(12),
            );
        }
        for example in &problem.examples {
            statement = statement
                .push(text(format!("Example {}", example.n)).size(16))
                .push(text(format!("Input  {}", example.input)).font(paint::mono()))
                .push(text(format!("Output {}", example.output)).font(paint::mono()));
            if !example.explain.is_empty() {
                statement = statement.push(text(&example.explain));
            }
        }
        if !problem.constraints.is_empty() {
            statement = statement.push(text("Constraints").size(16));
            for constraint in &problem.constraints {
                statement = statement.push(text(constraint));
            }
        }
        // Hints + editorial stay collapsed to plain text: no markdown
        // renderer is added, and nothing is synthesized. Counts match the
        // web disclosures (`Hints (n)` / `Editorial`).
        if !problem.hints.is_empty() {
            statement = statement.push(text(format!("Hints ({})", problem.hints.len())).size(16));
            for (n, hint) in problem.hints.iter().enumerate() {
                statement = statement.push(text(format!("{}. {}", n + 1, hint)).size(13));
            }
        }
        if !problem.solution.trim().is_empty() {
            statement = statement.push(text("Editorial (plain text)").size(16));
            statement = statement.push(text(problem.solution.clone()).size(13));
        }
        let supported = problem.judge.as_ref().is_some_and(judge::supported);
        let busy = self.judge_running || self.tracing || self.practice_grading;
        let toolbar = row![
            paint::control("Java", self.language == Language::Java)
                .on_press(Message::Language(Language::Java)),
            paint::control("C++", self.language == Language::Cpp)
                .on_press(Message::Language(Language::Cpp)),
            paint::control(if busy { "Cancel" } else { "Run" }, false).on_press_maybe(if busy {
                Some(Message::Cancel)
            } else {
                supported.then_some(Message::Run)
            }),
            paint::go("Submit >").on_press_maybe((supported && !busy).then_some(Message::Submit)),
            paint::control("Trace", false)
                .on_press_maybe((supported && !busy).then_some(Message::Trace)),
            paint::control(
                if self.starter_armed {
                    "Starter? again"
                } else {
                    "Starter"
                },
                self.starter_armed,
            )
            .on_press_maybe((!busy).then_some(Message::Starter)),
            paint::control(
                if self.problem_reset_armed {
                    "Reset? again"
                } else {
                    "Reset"
                },
                self.problem_reset_armed,
            )
            .on_press_maybe(
                (!busy && self.progress.status(&problem.slug) != progress::Status::Todo)
                    .then_some(Message::ResetProblem),
            ),
        ]
        .spacing(3);
        // Narrow windows clip a single 7-button row (Submit was cut at
        // ~780px): keep one row, reachable via horizontal scroll when the
        // window narrows. The statement/editor panes stack instead, and
        // Learn uses the stacked split, both driven by the live resize
        // subscription.
        let toolbar: iced::Element<'_, Message> = scrollable(toolbar)
            .direction(scrollable::Direction::Horizontal(
                scrollable::Scrollbar::new(),
            ))
            .height(Length::Shrink)
            .into();
        let editor = text_editor(&self.editor)
            .font(paint::mono())
            // Inside the narrow stacked scroll the editor needs a fixed
            // height; on desktop it fills its half of the split.
            .height(if narrow { Length::Fixed(360.0) } else { Fill })
            .on_action(Message::Edit)
            .highlight(
                self.language.extension(),
                if self.dark_mode() {
                    iced::highlighter::Theme::Base16Mocha
                } else {
                    iced::highlighter::Theme::InspiredGitHub
                },
            )
            .style(paint::editor);
        let note = if let Some(error) = &self.draft_error {
            error.clone()
        } else if let Some(error) = &self.progress_error {
            format!("Progress storage unavailable: {error}")
        } else if supported {
            "Drafts save in the background as you edit. Submit records the problem solved when all tests pass.".into()
        } else if problem.judge.is_some() {
            "This signature is outside the supported native judge coverage.".into()
        } else {
            "This problem has no deterministic local judge.".into()
        };
        let mut solve = column![
            toolbar,
            editor,
            text(note).size(13),
            // Explicit empty state (web: "Run your code to see results
            // here."). The old empty string left a blank 13px line.
            text(
                self.status_line
                    .as_deref()
                    .filter(|line| !line.is_empty())
                    .unwrap_or("Run your code to see results here.")
            )
            .size(13),
        ]
        .spacing(8);
        if let Some((slug, language, kind, verdict)) = &self.verdict {
            if slug == &problem.slug && *language == self.language {
                let ok = matches!(kind, judge::OutcomeKind::Passed);
                // Explicit kind label + language (web verdict row names the
                // state; the native Outcome is a single string, so no
                // per-case breakdown is synthesized here).
                let label = match kind {
                    judge::OutcomeKind::Passed => "Passed",
                    judge::OutcomeKind::Setup => "Setup unavailable",
                    judge::OutcomeKind::Cancelled => "Cancelled",
                    judge::OutcomeKind::CompileError => "Not passing (compile error)",
                    judge::OutcomeKind::RuntimeError => "Not passing (runtime error)",
                    _ => "Not passing (wrong answer)",
                };
                let lang = match language {
                    Language::Java => "Java",
                    Language::Cpp => "C++",
                };
                solve = solve.push(paint::verdict_card(
                    ok,
                    column![
                        text(format!("{label} - {lang}")).size(12),
                        text(verdict).size(14)
                    ]
                    .spacing(4)
                    .into(),
                ));
            }
        }
        // My-notes (task-6 store, bound here): per-lesson free text that
        // syncs into the progress store on every change and persists at
        // navigation flush points. Saved code (drafts) and verdicts are
        // untouched by notes.
        solve = solve
            .push(paint::kicker("My notes"))
            .push(
                text_editor(&self.notes_editor)
                    .font(paint::mono())
                    .height(Length::Fixed(140.0))
                    .on_action(Message::NotesEdit)
                    .style(paint::editor),
            )
            .push(
                text("Notes save to the progress store as you type; solved status is untouched.")
                    .size(12),
            );
        solve = self.trace_panel(problem, solve);
        if narrow {
            // Narrow windows (N-STACK): statement over editor in a single
            // vertical scroll, so nothing needs horizontal scrolling. The
            // editor keeps its fixed height and scrolls internally.
            scrollable(column![statement.padding([0, 10]), solve].spacing(12))
                .height(Fill)
                .into()
        } else {
            row![
                scrollable(statement.padding([0, 10]))
                    .height(Fill)
                    .width(Length::FillPortion(2)),
                solve.height(Fill).width(Length::FillPortion(3)),
            ]
            .spacing(12)
            .height(Fill)
            .into()
        }
    }

    fn learn<'a>(&'a self, problem: &'a Problem) -> Element<'a, Message> {
        let Some(lessons) = self.lessons.as_ref() else {
            return text("Learn data is still loading.").into();
        };
        let lesson = lessons.lesson(&problem.slug);
        match lesson.and_then(|lesson| lesson.walkthrough.as_ref()) {
            Some(walkthrough) => {
                let mut statement = column![button(
                    row![
                        paint::drawer_head(format!("STATEMENT · {}", problem.title.to_uppercase())),
                        paint::icon(if self.statement_open { "▼" } else { "▶" }, 12),
                    ]
                    .spacing(8)
                    .align_y(iced::Alignment::Center),
                )
                .width(Length::Fill)
                .padding(0)
                .style(|theme: &Theme, status: button::Status| {
                    paint::button_style(theme, status, false)
                })
                .on_press(Message::Statement(!self.statement_open)),];
                if self.statement_open {
                    statement = statement.push(
                        scrollable(text(&problem.description).size(13))
                            .height(Length::Fixed(120.0)),
                    );
                }
                let mut steps = Column::new().spacing(0);
                for (position, frame) in walkthrough.frames.iter().enumerate() {
                    let current = position == self.frame;
                    steps = steps.push(
                        button(
                            row![paint::step_no(position + 1), text(&frame.label).size(12),]
                                .spacing(8)
                                .align_y(iced::Alignment::Center),
                        )
                        .width(Length::Fill)
                        .padding([6, 10])
                        .style(move |theme: &Theme, status: button::Status| {
                            paint::button_style(theme, status, current)
                        })
                        .on_press(Message::Frame(position)),
                    );
                }
                let mut body = Column::new().spacing(10);
                // Trace-in-Learn: your captured run renders here through the
                // shared `walkthrough::trace_view` cell renderer (stepped in
                // Solve via Previous/Next step); the reference walkthrough
                // above stays the captured run. Play remains disabled: the
                // native build has no autoplay subscription, and a fake play
                // button would lie about motion.
                if let Some(trace) = &self.trace {
                    if trace.slug == problem.slug {
                        body = body.push(paint::kicker("Your run trace"));
                        match &trace.outcome {
                            trace::TraceOutcome::Traced { events, .. } => {
                                body = body.push(walkthrough::trace_view(events, trace.index));
                                body = body.push(
                                    text(
                                        "Your captured run, step-aligned with Solve. \
                                         Trace and step it in Solve; the reference run above never changes.",
                                    )
                                    .size(12),
                                );
                            }
                            trace::TraceOutcome::Unavailable { .. } => {
                                body = body.push(
                                    text(
                                        "Your run trace is unavailable; \
                                         the reference walkthrough above is the captured run.",
                                    )
                                    .size(12),
                                );
                            }
                        }
                    }
                }
                body = body.push(walkthrough::view(
                    walkthrough,
                    self.frame,
                    self.reference_language.unwrap_or(ReferenceLanguage::Java),
                    self.explain_on,
                    // Live viewport width: stacked code-over-stage below
                    // 700px via the resize subscription.
                    self.is_narrow(),
                    self.playing,
                    self.play_speed.label(),
                ));
                body = body
                    .push(statement)
                    .push(paint::kicker("Steps"))
                    .push(scrollable(steps).height(Length::Fixed(140.0)));
                body.into()
            }
            None => {
                let mut fallback = column![
                    text("No captured walkthrough for this lesson yet.").size(16),
                    text(
                        "The reference walkthrough covers the default input where \
                         available. Run or trace the default input in Solve; the \
                         captured frames play here once the fixture covers this lesson."
                    ),
                ]
                .spacing(8);
                if let Some(input) = problem.judge.as_ref().and_then(|judge| judge.tests.first()) {
                    fallback = fallback.push(
                        text(format!("Default input: {}", input.args.join("  ")))
                            .font(paint::mono())
                            .size(13),
                    );
                }
                fallback.into()
            }
        }
    }

    fn practice<'a>(&'a self, problem: &'a Problem) -> Element<'a, Message> {
        let lesson = self
            .lessons
            .as_ref()
            .and_then(|lessons| lessons.lesson(&problem.slug));
        let Some(lesson) = lesson else {
            return text("Practice data is still loading.").into();
        };
        if lesson.variants.is_empty() {
            return column![
                text("No practice variants for this lesson yet.").size(16),
                text(
                    "Variant drills generate from the lesson engine; the native \
                     grader runs every variant through the same judge as Solve \
                     once fixtures cover this lesson."
                ),
            ]
            .spacing(8)
            .into();
        };
        let index = self.practice_variant.min(lesson.variants.len() - 1);
        let language_row = row![
            paint::control("Java", self.language == Language::Java)
                .on_press(Message::Language(Language::Java)),
            paint::control("C++", self.language == Language::Cpp)
                .on_press(Message::Language(Language::Cpp)),
        ]
        .spacing(3);
        let mut cards = Column::new().spacing(8);
        for (position, variant) in lesson.variants.iter().enumerate() {
            let title = if variant.title.is_empty() {
                format!("Drill {}", position + 1)
            } else {
                variant.title.clone()
            };
            let active = position == index;
            let mut card = column![
                row![
                    text(title)
                        .size(15)
                        .font(paint::black_font())
                        .width(Length::Fill),
                    button(
                        row![paint::icon("▶", 12), text("Run").size(14),]
                            .spacing(4)
                            .align_y(iced::Alignment::Center),
                    )
                    .padding([7, 9])
                    .style(|theme: &Theme, status: button::Status| {
                        paint::button_style(theme, status, false)
                    })
                    .on_press_maybe(
                        (!self.practice_grading).then_some(Message::GradeVariant(position))
                    ),
                ]
                .align_y(iced::Alignment::Center),
                text(&variant.statement).size(13),
            ]
            .spacing(6)
            .padding(8);
            for (hint_no, hint) in variant.hints.iter().enumerate() {
                card = card.push(text(format!("Hint {}: {hint}", hint_no + 1)).size(13));
            }
            card = card.push(
                row![
                    horizontal_space(),
                    paint::control("Try it", active).on_press(Message::TryIt(position)),
                ]
                .align_y(iced::Alignment::Center),
            );
            cards = cards.push(
                container(card)
                    .width(Length::Fill)
                    .style(move |theme: &Theme| {
                        let mut style = paint::surface(theme);
                        if active {
                            style.border = iced::Border {
                                color: theme.palette().primary,
                                width: 2.0,
                                ..Default::default()
                            };
                        }
                        style
                    }),
            );
        }
        let variant = &lesson.variants[index];
        let mut detail = column![
            text(if variant.title.is_empty() {
                format!("Drill {}", index + 1)
            } else {
                variant.title.clone()
            })
            .size(19),
            text(&variant.statement),
            // R4 drill header parity (web `variantCard`): intent line, then
            // seed + difficulty + mode chips on one meta row. The mode text
            // comes from the shared `variant_mode_label` helper so it can
            // never drift from the judge mode; grading still runs ALL
            // variant tests through `judge::judge_code` in `start_grading`.
            text(if variant.intent.is_empty() {
                variant.seed_label.clone()
            } else {
                format!("{} — {}", variant.intent, variant.seed_label)
            })
            .size(13),
            text(format!(
                "{} · {}",
                if variant.difficulty.is_empty() {
                    "Drill"
                } else {
                    variant.difficulty.as_str()
                },
                leetlab_learning::variant_mode_label(if variant.mode.is_empty() {
                    "exact"
                } else {
                    variant.mode.as_str()
                }),
            ))
            .size(11),
        ]
        .spacing(8);
        // Worked examples render above the editor, matching the web examples
        // block. Empty explain lines are skipped; an empty examples list
        // renders nothing (no placeholder, no synthesis).
        for example in &variant.examples {
            detail = detail.push(
                text(format!("Input  {}", example.input))
                    .font(paint::mono())
                    .size(13),
            );
            detail = detail.push(
                text(format!("Output {}", example.output))
                    .font(paint::mono())
                    .size(13),
            );
            if !example.explain.is_empty() {
                detail = detail.push(text(example.explain.clone()).size(13));
            }
        }
        for (position, hint) in variant.hints.iter().enumerate() {
            detail = detail.push(text(format!("Hint {}: {hint}", position + 1)).size(13));
        }
        let busy = self.judge_running || self.tracing || self.practice_grading;
        // R4 action role: exactly one primary (orange `go`) per toolbar.
        // Cancel stays a neutral control so the two states never share the
        // action color at once.
        let grade_button: Element<'_, Message> = if busy {
            paint::control("Cancel", false)
                .on_press(Message::Cancel)
                .into()
        } else {
            paint::go("Grade").on_press(Message::Grade).into()
        };
        let grade_row = row![
            grade_button,
            text(format!(
                "Grading runs all {} variant test{} in {}.",
                variant.tests.len(),
                if variant.tests.len() == 1 { "" } else { "s" },
                match self.language {
                    Language::Java => "Java",
                    Language::Cpp => "C++",
                }
            ))
            .size(13),
        ]
        .spacing(6)
        .align_y(iced::Alignment::Center);
        let editor = text_editor(&self.practice_editor)
            .font(paint::mono())
            .height(iced::Length::Fixed(260.0))
            .on_action(Message::PracticeEdit)
            .highlight(
                self.language.extension(),
                if self.dark_mode() {
                    iced::highlighter::Theme::Base16Mocha
                } else {
                    iced::highlighter::Theme::InspiredGitHub
                },
            )
            .style(paint::editor);
        let mut practice = column![language_row, cards, detail, grade_row].spacing(10);
        let verdict_key = (variant.id.clone(), self.language);
        if let Some((kind, verdict)) = self.practice_verdicts.get(&verdict_key) {
            let ok = matches!(kind, judge::OutcomeKind::Passed);
            practice = practice.push(paint::verdict_card(ok, text(verdict).size(14).into()));
        }
        practice = practice.push(editor);
        practice.into()
    }

    fn trace_panel<'a>(
        &'a self,
        problem: &'a Problem,
        mut solve: Column<'a, Message>,
    ) -> Column<'a, Message> {
        let Some(trace) = &self.trace else {
            return solve;
        };
        if trace.slug != problem.slug || trace.language != self.language {
            return solve;
        }
        match &trace.outcome {
            trace::TraceOutcome::Unavailable { error } => {
                solve = solve.push(
                    container(
                        column![
                            paint::kicker("Trace · unavailable"),
                            text(format!("Trace unavailable: {error}")).size(13),
                            text("The reference walkthrough still plays in the Learn tab.")
                                .size(12),
                        ]
                        .spacing(6),
                    )
                    .padding(10)
                    .width(Length::Fill)
                    .style(paint::surface),
                );
                solve
            }
            trace::TraceOutcome::Traced {
                events,
                capped,
                result,
                cpp,
                ..
            } => {
                let mut panel = column![text(format!(
                    "Traced {} iteration{}{} [{}].",
                    events.len(),
                    if events.len() == 1 { "" } else { "s" },
                    if *capped { " (capped)" } else { "" },
                    if *cpp { "C++" } else { "Java" }
                ))
                .size(14),]
                .spacing(6);
                if !result.is_empty() {
                    panel = panel.push(text(format!("First test returned: {result}")).size(13));
                }
                if let Some(event) = events.get(trace.index) {
                    let frame: Element<'_, Message> = match event.as_object() {
                        Some(map) => map
                            .iter()
                            .fold(Column::new().spacing(2), |list, (key, value)| {
                                list.push(
                                    text(format!("{key}: {value}"))
                                        .font(paint::mono())
                                        .size(13),
                                )
                            })
                            .into(),
                        None => text(event.to_string())
                            .font(paint::mono())
                            .size(13)
                            .into(),
                    };
                    panel = panel.push(frame);
                    panel = panel.push(
                        row![
                            paint::control("Previous step", false).on_press_maybe(
                                trace.index.checked_sub(1).map(|_| Message::TraceStep(-1))
                            ),
                            text(format!("{} / {}", trace.index + 1, events.len())).size(14),
                            paint::control("Next step", false).on_press_maybe(
                                (trace.index + 1 < events.len()).then_some(Message::TraceStep(1))
                            ),
                        ]
                        .spacing(6)
                        .align_y(iced::Alignment::Center),
                    );
                }
                panel = panel.push(
                    text("Step through the captured iterations above. Native playback of your trace in Learn is pending.")
                        .size(13),
                );
                let area = column![
                    paint::kicker("Trace · your run"),
                    scrollable(panel).height(120),
                ]
                .spacing(6);
                solve.push(
                    container(area)
                        .padding(10)
                        .width(Length::Fill)
                        .style(paint::surface),
                )
            }
        }
    }

    /// S6 settings dialog body. The workspace stays mounted underneath the
    /// overlay, so opening settings never loses the selected lesson or
    /// editor state.
    fn settings(&self) -> Element<'_, Message> {
        let (solved, attempted) = self.progress.counts();
        let configured = std::env::var_os("LCLAB_PROGRESS").map(PathBuf::from);
        let mut appearance = Column::new().spacing(8);
        appearance = appearance.push(paint::kicker("Appearance"));
        for mode in [
            ThemeChoice::System,
            ThemeChoice::Light,
            ThemeChoice::LightPlus,
            ThemeChoice::Dark,
            ThemeChoice::DarkPlus,
            ThemeChoice::Dracula,
            ThemeChoice::CatMocha,
            ThemeChoice::CatMacchiato,
            ThemeChoice::CatFrappe,
            ThemeChoice::CatLatte,
            ThemeChoice::NightOwl,
            ThemeChoice::TokyoNight,
            ThemeChoice::OneDarkPro,
            ThemeChoice::Monokai,
            ThemeChoice::Nord,
            ThemeChoice::GitHubDark,
        ] {
            let active = self.theme == mode;
            let marker = if active { "●" } else { "○" };
            let mut label = row![
                paint::icon(marker, 11),
                text(mode.label()).size(14).width(Length::Fill),
            ]
            .spacing(8)
            .align_y(iced::Alignment::Center);
            if active {
                label = label.push(text("ACTIVE").size(9));
            }
            appearance = appearance.push(
                button(label)
                    .width(Length::Fill)
                    .padding([7, 10])
                    .style(move |theme: &Theme, status| paint::button_style(theme, status, active))
                    .on_press(Message::SetTheme(mode)),
            );
        }
        if let Some(name) = self.custom_theme_name.as_deref() {
            let active = self.theme == ThemeChoice::Custom;
            let marker = if active { "●" } else { "○" };
            let mut header = row![
                paint::icon(marker, 11),
                text(format!("Custom · {name}"))
                    .size(14)
                    .width(Length::Fill),
            ]
            .spacing(8)
            .align_y(iced::Alignment::Center);
            if active {
                header = header.push(text("ACTIVE").size(9));
            }
            appearance = appearance.push(
                button(header)
                    .width(Length::Fill)
                    .padding([7, 10])
                    .style(move |theme: &Theme, status| paint::button_style(theme, status, active))
                    .on_press(Message::SetTheme(ThemeChoice::Custom)),
            );
        }
        appearance = appearance.push(
            text("System follows the OS theme; this build has no OS hook, so it uses the light port.")
                .size(12),
        );
        appearance = appearance.push(
            text_input("Paste VS Code color-theme JSON …", &self.theme_json)
                .on_input(Message::ThemeJson)
                .padding(9)
                .style(paint::search),
        );
        appearance = appearance.push(
            row![
                paint::control("Import theme", false).on_press_maybe(
                    (!self.theme_json.trim().is_empty()).then_some(Message::ImportTheme)
                ),
                paint::control("Remove custom", false).on_press_maybe(
                    self.custom_theme
                        .is_some()
                        .then_some(Message::RemoveCustomTheme)
                ),
            ]
            .spacing(6),
        );
        // Reduced motion reuses the same dialog state; the choice applies to
        // stepped UI (walkthrough frame jumps apply instantly when Reduce
        // resolves). Rows mirror the Appearance ACTIVE-marker pattern.
        appearance = appearance.push(paint::kicker("Motion"));
        appearance = appearance
            .push(text("Reduced disables animated transitions; steps apply instantly.").size(12));
        for mode in [
            MotionChoice::System,
            MotionChoice::Reduce,
            MotionChoice::Full,
        ] {
            let active = self.motion == mode;
            let marker = if active { "●" } else { "○" };
            let mut label = row![
                paint::icon(marker, 11),
                text(mode.label()).size(14).width(Length::Fill),
            ]
            .spacing(8)
            .align_y(iced::Alignment::Center);
            if active {
                label = label.push(text("ACTIVE").size(9));
            }
            appearance = appearance.push(
                button(label)
                    .width(Length::Fill)
                    .padding([7, 10])
                    .style(move |theme: &Theme, status| paint::button_style(theme, status, active))
                    .on_press(Message::SetMotion(mode)),
            );
        }
        // Effective motion is derived, never stored twice.
        let effective = resolve_motion(self.motion, false);
        appearance = appearance.push(text(format!("Effective: {}", effective.label())).size(12));
        let mut content = column![
            row![
                paint::kicker("Settings · Appearance"),
                horizontal_space(),
                button(
                    row![paint::icon("✕", 12), text("Close").size(14),]
                        .spacing(4)
                        .align_y(iced::Alignment::Center),
                )
                .padding([7, 9])
                .style(|theme: &Theme, status: button::Status| {
                    paint::button_style(theme, status, false)
                })
                .on_press(Message::CloseSettings),
            ]
            .align_y(iced::Alignment::Center),
            appearance,
            paint::kicker("Progress"),
            text(format!("Solved {solved} · Attempted {attempted}")).size(14),
            paint::control(
                if self.reset_armed {
                    "Click again to wipe all progress"
                } else {
                    "Reset all progress"
                },
                self.reset_armed
            )
            .on_press(Message::ResetProgress),
            paint::kicker("Progress & draft import"),
            text("Theme import above changes colors only; it never touches drafts or progress.")
                .size(12),
            text(match &configured {
                Some(path) => format!("Server progress file: {}", path.display()),
                None => "LCLAB_PROGRESS is not configured.".into(),
            })
            .size(13),
            paint::control("Import now", false)
                .on_press_maybe(configured.is_some().then_some(Message::ImportProgress)),
            text("Browser drafts export (explicit JSON file):").size(13),
            text_input("Export file path", &self.browser_path)
                .id(text_input::Id::new(SETTINGS_PATH_ID))
                .on_input(Message::BrowserPath)
                .padding(9)
                .style(paint::search),
            paint::control("Import file", false).on_press_maybe(
                (!self.browser_path.trim().is_empty()).then_some(Message::ImportBrowser)
            ),
            // Tutor is informational only: no key, no inputs, blocks nothing.
            // Practice, judging, and walkthroughs work without AI.
            paint::kicker("Tutor (AI)"),
            text("No tutor key configured.").size(13),
            text("Practice, judging, and walkthroughs work without AI.").size(12),
        ]
        .spacing(10);
        if let Some(note) = &self.settings_note {
            content = content.push(text(note).size(13));
        }
        content = content.push(
            text("Imports back up the source and are idempotent; repeat runs change nothing.")
                .size(13),
        );
        scrollable(content.spacing(10)).into()
    }

    /// Modal overlay: dimmed scrim (click outside closes) + centered
    /// 560px dialog. Built on `iced::widget::Stack` so the workspace —
    /// catalog, lesson, and editor contents — stays mounted underneath.
    fn settings_overlay(&self) -> Element<'_, Message> {
        use iced::widget::{mouse_area, Stack};
        let scrim = mouse_area(
            container(text(""))
                .width(Length::Fill)
                .height(Length::Fill)
                .style(|_theme: &Theme| container::Style {
                    background: Some(iced::Color::from_rgba(0.0, 0.0, 0.0, 0.45).into()),
                    ..Default::default()
                }),
        )
        .on_press(Message::CloseSettings);
        let dialog = container(
            container(self.settings())
                .width(Length::Fixed(560.0))
                .padding(18)
                .style(paint::surface),
        )
        .width(Length::Fill)
        .height(Length::Fill)
        .center_x(Length::Fill)
        .center_y(Length::Fill);
        // Swallow clicks inside the dialog so only outside clicks dismiss.
        let dialog = mouse_area(dialog).on_press(Message::Noop);
        Stack::new()
            .push(scrim)
            .push(dialog)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}

/// Share minimum: `#id /p/slug` (overlay lessons without a shard id
/// fall back to the bare `/p/slug` path). The same string goes on the
/// clipboard and in the status line, so the status line is the fallback
/// when the clipboard is unavailable.
fn share_text(id: u32, slug: &str) -> String {
    if id == 0 {
        format!("/p/{slug}")
    } else {
        format!("#{id} /p/{slug}")
    }
}

fn make_entry(
    slug: &str,
    id: u32,
    title: &str,
    difficulty: &str,
    pattern: &str,
    topics: &str,
) -> CatalogEntry {
    CatalogEntry {
        slug: slug.to_owned(),
        id,
        title: title.to_owned(),
        difficulty: difficulty.to_owned(),
        pattern: pattern.to_owned(),
        search: format!("{slug} {title} {difficulty} {topics}").to_lowercase(),
    }
}

fn open_source(url: &str) -> std::io::Result<()> {
    if !url.starts_with("https://") {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Expected an HTTPS source link.",
        ));
    }
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = std::process::Command::new("rundll32.exe");
        command.arg("url.dll,FileProtocolHandler");
        command
    };
    #[cfg(not(target_os = "windows"))]
    let mut command = std::process::Command::new("xdg-open");
    command.arg(url).spawn().map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_catalog() -> Arc<Catalog> {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..");
        Arc::new(Catalog::open(root).unwrap())
    }

    #[test]
    fn explicit_root_skips_separator_and_diagnostic_flag() {
        use std::ffi::OsString;
        // `leetlab-app.exe -- <root>` must resolve to `<root>` (learning-ux
        // B2: the bare `--` used to become the resource path and fail on
        // `--/plugin/data/index.json`).
        let root =
            explicit_resource_root([OsString::from("--"), OsString::from("D:/data")].into_iter());
        assert_eq!(root, Some(PathBuf::from("D:/data")));
        // The diagnostic flag alone still falls through to discovery.
        assert_eq!(
            explicit_resource_root([OsString::from("--check-resources")].into_iter()),
            None
        );
        assert_eq!(explicit_resource_root(std::iter::empty()), None);
        // A plain root is unchanged.
        let root = explicit_resource_root([OsString::from("D:/data")].into_iter());
        assert_eq!(root, Some(PathBuf::from("D:/data")));
    }

    #[test]
    fn overlay_lessons_show_local_difficulty() {
        let mut app = App::default();
        app.catalog = Some(test_catalog());
        app.build_entries();
        let encode = app
            .entries
            .iter()
            .find(|entry| entry.slug == "encode-and-decode-strings")
            .expect("encode lesson listed");
        assert_eq!(encode.difficulty, "Medium");
        let two_sum = app
            .entries
            .iter()
            .find(|entry| entry.slug == "two-sum")
            .expect("two-sum listed");
        assert_eq!(two_sum.difficulty, "Easy");
        // Every curriculum entry with a local record (shard or overlay)
        // shows a real difficulty, never the External placeholder.
        let catalog = app.catalog.clone().unwrap();
        for entry in &app.entries {
            if catalog.has_local(&entry.slug) {
                assert_ne!(entry.difficulty, "External", "{}", entry.slug);
            }
        }
    }

    /// Every lesson's Solve, Learn, and Practice panels must construct
    /// without panicking. Element construction is pure, so this exercises
    /// all panels, all diagram kinds, and both fallback branches (missing
    /// walkthrough, missing variants) across the whole curriculum.
    #[test]
    fn all_panels_render_for_every_lesson() {
        let catalog = test_catalog();
        let lessons = leetlab_learning::Catalog::from_json(include_bytes!(
            "../../../fixtures/catalog-extra.json"
        ))
        .unwrap();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        let mut solved = 0;
        let mut learn_fallback = 0;
        let mut practice_fallback = 0;
        for entry in &catalog.curriculum {
            let Ok(problem) = catalog.problem(&entry.slug) else {
                continue;
            };
            app.selected = Some(Selection::Local(Arc::new(problem)));
            app.frame = 0;
            app.practice_variant = 0;
            app.practice_loaded = None;
            app.practice_verdicts = std::collections::BTreeMap::new();
            for panel in [Panel::Solve, Panel::Learn, Panel::Practice] {
                app.panel = panel;
                let _ = app.workspace();
                solved += 1;
            }
            let lesson = app.lessons.as_ref().unwrap().lesson(&entry.slug);
            match lesson.and_then(|lesson| lesson.walkthrough.as_ref()) {
                Some(_) => {}
                None => learn_fallback += 1,
            }
            if lesson.is_some_and(|lesson| lesson.variants.is_empty()) {
                practice_fallback += 1;
            }
        }
        // Full coverage is locked upstream by export-all; the fallbacks are
        // honest states, but this test notices if they silently grow.
        assert_eq!(solved, 150 * 3, "every lesson renders all three panels");
        assert_eq!(learn_fallback, 0, "all 150 lessons have walkthroughs");
        assert_eq!(practice_fallback, 0, "all 150 lessons have variants");
    }

    /// Any catalog problem with a judge spec must open cleanly, even without
    /// captured Learn frames or Practice variants. This is the scale contract:
    /// Solve grades via the spec, Learn/Practice show their honest fallbacks.
    #[test]
    fn non_curriculum_judge_problems_degrade_gracefully() {
        let catalog = test_catalog();
        let lessons = leetlab_learning::Catalog::from_json(include_bytes!(
            "../../../fixtures/catalog-extra.json"
        ))
        .unwrap();
        let in_curriculum: std::collections::HashSet<&str> = catalog
            .curriculum
            .iter()
            .map(|entry| entry.slug.as_str())
            .collect();
        // First 25 judge-backed problems outside the 150 (catalog order).
        let mut sample = Vec::new();
        for summary in &catalog.problems {
            if sample.len() >= 25 {
                break;
            }
            if in_curriculum.contains(summary.slug.as_str()) {
                continue;
            }
            let Ok(problem) = catalog.problem(&summary.slug) else {
                continue;
            };
            let Some(judge) = &problem.judge else { continue };
            if judge.tests.is_empty() {
                continue;
            }
            sample.push(problem);
        }
        assert_eq!(sample.len(), 25, "catalog has 25 non-curriculum judge problems");
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        for problem in &sample {
            // No captured content exists for these slugs: both panels must
            // take their fallback branches, never a missing-content panic.
            assert!(
                app.lessons.as_ref().unwrap().lesson(&problem.slug).is_none()
                    || app
                        .lessons
                        .as_ref()
                        .unwrap()
                        .lesson(&problem.slug)
                        .is_some_and(|lesson| lesson.walkthrough.is_none()),
                "{} has no captured walkthrough",
                problem.slug
            );
            app.selected = Some(Selection::Local(Arc::new(problem.clone())));
            app.frame = 0;
            app.practice_variant = 0;
            app.practice_loaded = None;
            app.practice_verdicts = std::collections::BTreeMap::new();
            for panel in [Panel::Solve, Panel::Learn, Panel::Practice] {
                app.panel = panel;
                let _ = app.workspace();
            }
        }
    }

    /// Verdict taxonomy drives progress: setup failures and cancellations
    /// leave progress untouched (no attempt, still New); genuine runs
    /// record attempts; only a passing Submit records solved.
    #[test]
    fn judged_taxonomy_drives_progress_accounting() {
        fn outcome(kind: judge::OutcomeKind, ok: bool) -> judge::Outcome {
            judge::Outcome {
                ok,
                ms: Some(3),
                text: "t".into(),
                kind,
            }
        }
        let mut app = App::default();
        let slug = "two-sum".to_owned();
        let judged = |app: &mut App, kind: judge::OutcomeKind, ok: bool, submit: bool| {
            let _ = app.update(Message::Judged(
                slug.clone(),
                Language::Java,
                submit,
                outcome(kind, ok),
            ));
        };
        // Setup failure on Submit: no attempt, status says unchanged.
        judged(&mut app, judge::OutcomeKind::Setup, false, true);
        assert_eq!(app.progress.attempts(&slug), 0);
        assert!(app.status_line.as_deref().unwrap().contains("unchanged"));
        // Cancellation on Run: same, and the verdict still renders.
        judged(&mut app, judge::OutcomeKind::Cancelled, false, false);
        assert_eq!(app.progress.attempts(&slug), 0);
        assert!(app.status_line.as_deref().unwrap().contains("unchanged"));
        assert!(app.verdict.is_some());
        // Wrong answer: attempt recorded, still unsolved.
        judged(&mut app, judge::OutcomeKind::WrongAnswer, false, false);
        assert_eq!(app.progress.attempts(&slug), 1);
        assert_eq!(app.progress.status(&slug), progress::Status::Attempted);
        // Compile error Submit: attempt, still unsolved.
        judged(&mut app, judge::OutcomeKind::CompileError, false, true);
        assert_eq!(app.progress.attempts(&slug), 2);
        assert_eq!(app.progress.status(&slug), progress::Status::Attempted);
        // Passing Submit: solved.
        judged(&mut app, judge::OutcomeKind::Passed, true, true);
        assert_eq!(app.progress.status(&slug), progress::Status::Solved);
        // Restart-style reopen keeps the record (same store bytes).
        assert_eq!(app.progress.attempts(&slug), 2);
    }

    /// R4 acceptance lock: the SMOKE.md keyboard map. Escape, Ctrl+F, and
    /// 1/2/3 must map to their messages; Ctrl+Enter maps to Run
    /// (solve-workspace 0003, applied in-tree: `modifiers.control()` and
    /// `key == "\r"`). If 0003 is ever reverted, flip the Run assertion
    /// back to `is_none()`.
    #[test]
    fn r4_acceptance_shortcut_map() {
        assert!(matches!(
            shortcut(
                Key::Named(iced::keyboard::key::Named::Escape),
                Modifiers::empty()
            ),
            Some(Message::EscapePressed)
        ));
        assert!(matches!(
            shortcut(Key::Character("f".into()), Modifiers::CTRL),
            Some(Message::FocusSearch)
        ));
        assert!(matches!(
            shortcut(Key::Character("1".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Solve))
        ));
        assert!(matches!(
            shortcut(Key::Character("2".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Learn))
        ));
        assert!(matches!(
            shortcut(Key::Character("3".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Practice))
        ));
        assert!(matches!(
            shortcut(Key::Character("\r".into()), Modifiers::CTRL),
            Some(Message::Run)
        ));
    }

    /// R4 acceptance lock: selecting a lesson resets to Solve with a clean
    /// frame, variant, status line, and verdict-adjacent state, and queues
    /// the problem load (SMOKE.md S2/S4 navigation).
    #[test]
    fn r4_acceptance_select_resets_lesson_state() {
        let mut app = App::default();
        app.catalog = Some(test_catalog());
        // Dirty state that Select must clear.
        app.panel = Panel::Learn;
        app.frame = 5;
        app.practice_variant = 2;
        app.status_line = Some("stale".into());
        app.practice_verdicts.insert(
            ("v1".to_string(), Language::Java),
            (judge::OutcomeKind::WrongAnswer, "stale".into()),
        );
        let _ = app.update(Message::Select("two-sum".into()));
        assert_eq!(app.panel, Panel::Solve);
        assert_eq!(app.frame, 0);
        assert_eq!(app.practice_variant, 0);
        assert!(app.status_line.is_none());
        assert!(app.practice_verdicts.is_empty());
        assert_eq!(app.requested.as_deref(), Some("two-sum"));
    }

    /// R4 acceptance lock: trace status strings and TraceStep clamping
    /// behind SMOKE.md S3/S7. Verbatim strings from `update()`.
    #[test]
    fn r4_acceptance_trace_step_clamps_and_status() {
        let mut app = App::default();
        let traced = |events: Vec<serde_json::Value>, capped: bool| trace::TraceOutcome::Traced {
            cpp: false,
            events,
            capped,
            result: "ok".into(),
        };
        let _ = app.update(Message::Traced(
            "two-sum".into(),
            Language::Java,
            traced(
                vec![
                    serde_json::json!({"i": 0}),
                    serde_json::json!({"i": 1}),
                    serde_json::json!({"i": 2}),
                ],
                false,
            ),
        ));
        assert_eq!(app.status_line.as_deref(), Some("Traced 3 iterations."));
        let _ = app.update(Message::TraceStep(1));
        let _ = app.update(Message::TraceStep(5));
        assert_eq!(app.trace.as_ref().map(|trace| trace.index), Some(2));
        let _ = app.update(Message::TraceStep(-1));
        assert_eq!(app.trace.as_ref().map(|trace| trace.index), Some(1));
        let _ = app.update(Message::TraceStep(-9));
        assert_eq!(app.trace.as_ref().map(|trace| trace.index), Some(0));
        // Singular + capped shapes.
        let _ = app.update(Message::Traced(
            "two-sum".into(),
            Language::Java,
            traced(vec![serde_json::json!({"i": 0})], true),
        ));
        assert_eq!(
            app.status_line.as_deref(),
            Some("Traced 1 iteration (capped).")
        );
        // No-loop decline is explicit, never faked.
        let _ = app.update(Message::Traced(
            "two-sum".into(),
            Language::Java,
            trace::TraceOutcome::Unavailable {
                error: "no loops found".into(),
            },
        ));
        assert_eq!(
            app.status_line.as_deref(),
            Some("Trace unavailable for this run.")
        );
    }

    /// R4 acceptance lock: practice grading verdicts land in
    /// practice_verdicts keyed by (variant id, language) and clear the
    /// grading flag (SMOKE.md "Practice grading", both languages).
    #[test]
    fn r4_acceptance_practice_graded_records_verdict() {
        let mut app = App::default();
        app.practice_grading = true;
        let outcome = judge::Outcome {
            ok: false,
            ms: Some(3),
            text: "t".into(),
            kind: judge::OutcomeKind::WrongAnswer,
        };
        let _ = app.update(Message::Graded(
            "two-sum".into(),
            Language::Java,
            "variant-1".into(),
            outcome,
        ));
        assert!(!app.practice_grading);
        let stored = app
            .practice_verdicts
            .get(&("variant-1".to_string(), Language::Java))
            .expect("graded verdict recorded");
        assert!(matches!(&stored.0, judge::OutcomeKind::WrongAnswer));
        assert_eq!(stored.1, "t");
    }

    /// The full window (rail + catalog + workspace + optional trace and
    /// settings overlay) must construct without panicking in every
    /// interesting state. Covers the Stack overlay, the trace result area,
    /// and the settings dialog without needing a window.
    #[test]
    fn full_window_constructs_in_every_shell_state() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        // Rail-only home, catalog closed.
        app.hide_catalog = true;
        let _ = app.view();
        // Catalog open, no selection.
        app.hide_catalog = false;
        let _ = app.view();
        // One lesson in every panel, light and dark.
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        app.theme = ThemeChoice::Light;
        for panel in [Panel::Solve, Panel::Learn, Panel::Practice] {
            app.panel = panel;
            let _ = app.view();
        }
        app.theme = ThemeChoice::Dark;
        for panel in [Panel::Solve, Panel::Learn, Panel::Practice] {
            app.panel = panel;
            let _ = app.view();
        }
        // Trace area, both outcome shapes.
        app.trace = Some(TraceDone {
            slug: problem.slug.clone(),
            language: Language::Java,
            outcome: trace::TraceOutcome::Unavailable {
                error: "no loops found".into(),
            },
            index: 0,
        });
        let _ = app.view();
        app.trace = Some(TraceDone {
            slug: problem.slug.clone(),
            language: Language::Java,
            outcome: trace::TraceOutcome::Traced {
                cpp: false,
                events: vec![serde_json::json!({"i": 0})],
                capped: false,
                result: "ok".into(),
            },
            index: 0,
        });
        let _ = app.view();
        app.trace = None;
        // Settings dialog over a live lesson (state must survive).
        app.settings_open = true;
        let _ = app.view();
        app.settings_open = false;
        let _ = app.view();
    }

    /// Drawer navigation: selecting a problem closes the drawer (web
    /// parity), and a slug outside the current track widens the track to
    /// All so the row stays visible (web catalog.select auto-switch).
    #[test]
    fn select_closes_drawer_and_widens_track() {
        let catalog = test_catalog();
        let outside = catalog
            .curriculum
            .iter()
            .find(|entry| !entry.blind75 && catalog.has_local(&entry.slug))
            .map(|entry| entry.slug.clone())
            .expect("a NeetCode-only lesson with a local record");
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.track = Track::Blind;
        app.build_entries();
        assert!(!app.entries.iter().any(|entry| entry.slug == outside));
        let _ = app.update(Message::Select(outside.clone()));
        assert_eq!(app.track, Track::All);
        assert!(app.entries.iter().any(|entry| entry.slug == outside));
        assert_eq!(app.requested.as_deref(), Some(outside.as_str()));
        assert!(app.hide_catalog);
    }

    /// Drawer visibility: toggling twice restores the closed state. The
    /// search-focus task itself is opaque to unit tests; the focus target
    /// (SEARCH_ID) is pinned by the FocusSearch path.
    #[test]
    fn drawer_toggle_flips_visibility() {
        let mut app = App::default();
        app.hide_catalog = true;
        let _ = app.update(Message::ToggleCatalog);
        assert!(!app.hide_catalog);
        let _ = app.update(Message::ToggleCatalog);
        assert!(app.hide_catalog);
    }

    /// Pattern drill-down (web setPattern) clears the difficulty filter and
    /// opens the drawer; the pick-list variant keeps difficulty (web
    /// patternSelect). Reset restores the full track view but keeps it.
    #[test]
    fn pattern_browse_and_reset_match_web_semantics() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        app.hide_catalog = true;
        let pattern = catalog
            .patterns
            .first()
            .map(|pattern| pattern.id.clone())
            .expect("patterns indexed");
        app.difficulty = Some("Easy".into());
        let _ = app.update(Message::PatternBrowse(pattern.clone()));
        assert_eq!(app.pattern_filter.as_deref(), Some(pattern.as_str()));
        assert!(app.difficulty.is_none());
        assert!(!app.hide_catalog);
        app.difficulty = Some("Easy".into());
        let _ = app.update(Message::PatternFilter(Some(pattern)));
        assert_eq!(app.difficulty.as_deref(), Some("Easy"));
        app.query = "two-sum".into();
        let _ = app.update(Message::ResetFilters);
        assert!(app.query.is_empty());
        assert!(app.difficulty.is_none());
        assert!(app.status_filter.is_none());
        assert!(app.pattern_filter.is_none());
        assert_eq!(app.visible.len(), app.entries.len());
    }

    /// R4 home renders real native data: counts agree, a fresh store has
    /// no due rows, and pattern rows account for every entry. The full
    /// window constructs over the home view with the drawer open/closed.
    #[test]
    fn home_view_uses_real_counts() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        assert_eq!(app.entries.len(), 150);
        let solved = app
            .entries
            .iter()
            .filter(|entry| app.progress.status(&entry.slug) == progress::Status::Solved)
            .count();
        assert_eq!(solved, 0);
        assert!(app.due_rows(6).is_empty());
        let ladder: usize = ["Easy", "Medium", "Hard"]
            .iter()
            .map(|difficulty| {
                app.entries
                    .iter()
                    .filter(|entry| entry.difficulty == *difficulty)
                    .count()
            })
            .sum();
        assert_eq!(ladder, app.entries.len());
        let patterns: usize = app.pattern_rows().iter().map(|row| row.3).sum();
        assert_eq!(patterns, app.entries.len());
        let _ = app.home();
        app.hide_catalog = true;
        let _ = app.view();
        app.hide_catalog = false;
        let _ = app.view();
    }

    /// "Due for review" matches only solved, past-due lessons (web
    /// status=due). A fresh store matches nothing; a past-due import
    /// surfaces the row while a freshly solved lesson (future due) stays
    /// out; clearing restores the full track.
    #[test]
    fn due_filter_matches_only_past_due() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        let full = app.entries.len();
        let _ = app.update(Message::StatusFilter(Some(progress::Status::Due)));
        assert!(app.visible.is_empty());
        // A solved lesson with a past due date (wired through the real
        // import merge, the only public path to a past due date).
        let mut items = std::collections::BTreeMap::new();
        items.insert(
            "two-sum".to_owned(),
            progress::ImportedItem {
                status: Some("solved".into()),
                updated_at_ms: Some(1),
                due_at_ms: Some(0),
                ..Default::default()
            },
        );
        assert_eq!(app.progress.apply_import(&items), 1);
        // Freshly solved just now: the due date lands days in the future.
        app.progress
            .record_solved("contains-duplicate", 10, "java", progress::now_ms());
        let _ = app.update(Message::StatusFilter(Some(progress::Status::Due)));
        let slugs: Vec<_> = app
            .visible
            .iter()
            .map(|index| app.entries[*index].slug.clone())
            .collect();
        assert!(slugs.contains(&"two-sum".to_owned()));
        assert!(!slugs.contains(&"contains-duplicate".to_owned()));
        let _ = app.update(Message::StatusFilter(None));
        assert_eq!(app.visible.len(), full);
        assert_eq!(progress::Status::Due.label(), "Due for review");
    }

    /// R4 S2/S4/S6/S7 shell regression: rail-only and catalog-open must
    /// both construct in every panel (Solve/Learn/Practice) and in both
    /// themes, with both trace outcome shapes and the settings overlay.
    /// Pure `view()` construction only: no window, no toolchain, no I/O.
    #[test]
    fn r4_shell_states_construct() {
        let catalog = test_catalog();
        let lessons = leetlab_learning::Catalog::from_json(include_bytes!(
            "../../../fixtures/catalog-extra.json"
        ))
        .unwrap();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        app.build_entries();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        for theme in [ThemeChoice::Light, ThemeChoice::Dark, ThemeChoice::LightPlus, ThemeChoice::DarkPlus, ThemeChoice::Dracula, ThemeChoice::CatMocha, ThemeChoice::CatMacchiato, ThemeChoice::CatFrappe, ThemeChoice::CatLatte, ThemeChoice::NightOwl, ThemeChoice::TokyoNight, ThemeChoice::OneDarkPro, ThemeChoice::Monokai, ThemeChoice::Nord, ThemeChoice::GitHubDark] {
            app.theme = theme;
            for panel in [Panel::Solve, Panel::Learn, Panel::Practice] {
                app.panel = panel;
                app.hide_catalog = true;
                let _ = app.view();
                app.hide_catalog = false;
                let _ = app.view();
            }
        }
        app.trace = Some(TraceDone {
            slug: problem.slug.clone(),
            language: Language::Java,
            outcome: trace::TraceOutcome::Unavailable {
                error: "no loops found".into(),
            },
            index: 0,
        });
        let _ = app.view();
        app.trace = None;
        app.settings_open = true;
        let _ = app.view();
        app.settings_open = false;
        let _ = app.view();
    }

    /// R4 S4 keyboard regression: `1/2/3` select Solve/Learn/Practice,
    /// Escape maps to `EscapePressed`, Ctrl+F maps to `FocusSearch`.
    /// Known limit, asserted nowhere: `1/2/3` also fire while typing in
    /// search/editor because `shortcut()` has no focus context.
    #[test]
    fn r4_shortcut_tabs_and_escape() {
        assert!(matches!(
            shortcut(Key::Character("1".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Solve))
        ));
        assert!(matches!(
            shortcut(Key::Character("2".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Learn))
        ));
        assert!(matches!(
            shortcut(Key::Character("3".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Practice))
        ));
        assert!(matches!(
            shortcut(
                Key::Named(iced::keyboard::key::Named::Escape),
                Modifiers::empty()
            ),
            Some(Message::EscapePressed)
        ));
        assert!(matches!(
            shortcut(Key::Character("f".into()), Modifiers::CTRL),
            Some(Message::FocusSearch)
        ));
    }

    /// R4 S6/S2 regression: one Escape press closes the settings overlay
    /// (and consumes the press); the next press collapses the open
    /// catalog. Focus returns to search in both cases.
    #[test]
    fn r4_escape_closes_settings_first_then_catalog() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(problem));
        app.hide_catalog = false;
        app.settings_open = true;
        let _ = app.update(Message::EscapePressed);
        assert!(!app.settings_open);
        assert!(!app.hide_catalog);
        let _ = app.update(Message::EscapePressed);
        assert!(app.hide_catalog);
    }

    /// R4 S7 trace regression: stepping past either end clamps instead
    /// of wrapping or panicking. Covers the T-CLAMP smoke item headlessly.
    #[test]
    fn r4_trace_step_clamps_at_both_ends() {
        let mut app = App::default();
        app.trace = Some(TraceDone {
            slug: "two-sum".to_owned(),
            language: Language::Java,
            outcome: trace::TraceOutcome::Traced {
                cpp: false,
                events: vec![serde_json::json!({"i": 0}), serde_json::json!({"i": 1})],
                capped: false,
                result: "ok".into(),
            },
            index: 0,
        });
        let _ = app.update(Message::TraceStep(-1));
        assert_eq!(app.trace.as_ref().unwrap().index, 0);
        let _ = app.update(Message::TraceStep(99));
        assert_eq!(app.trace.as_ref().unwrap().index, 1);
        let _ = app.update(Message::TraceStep(1));
        assert_eq!(app.trace.as_ref().unwrap().index, 1);
        let _ = app.update(Message::TraceStep(-99));
        assert_eq!(app.trace.as_ref().unwrap().index, 0);
    }

    /// R4 S7 practice regression: an out-of-range variant index renders
    /// the clamped card instead of panicking. Covers the P-LIST smoke
    /// item headlessly (grading itself needs a toolchain; see smoke J/P).
    #[test]
    fn r4_practice_out_of_range_variant_renders() {
        let catalog = test_catalog();
        let lessons = leetlab_learning::Catalog::from_json(include_bytes!(
            "../../../fixtures/catalog-extra.json"
        ))
        .unwrap();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(problem));
        app.panel = Panel::Practice;
        app.practice_variant = usize::MAX;
        let _ = app.workspace();
    }

    /// The resize subscription drives every narrow branch. Unknown width
    /// (no event yet) is the desktop launch size; 700px stays desktop,
    /// anything below flips `is_narrow`, always consistent with the
    /// shared `walkthrough::is_narrow_width` breakpoint.
    #[test]
    fn window_resize_tracks_width_and_drives_narrow_branches() {
        let mut app = App::default();
        assert!(!app.is_narrow(), "no resize event yet: desktop layout");
        let _ = app.update(Message::WindowResized(Size::new(1280.0, 800.0)));
        assert!(!app.is_narrow());
        let _ = app.update(Message::WindowResized(Size::new(700.0, 800.0)));
        assert!(!app.is_narrow(), "700px is the desktop side of the break");
        let _ = app.update(Message::WindowResized(Size::new(699.0, 800.0)));
        assert!(app.is_narrow());
        let _ = app.update(Message::WindowResized(Size::new(390.0, 800.0)));
        assert!(app.is_narrow());
        assert!(walkthrough::is_narrow_width(390.0));
        assert!(!walkthrough::is_narrow_width(1200.0));
    }

    /// Narrow construction (N-RAIL/N-STACK headless cover): home, the
    /// catalog overlay sheet, and all three panels build without
    /// panicking at 390px with the drawer open, and the rail-only view
    /// builds with it closed. Pixel behavior stays a pending interactive
    /// check; this pins the branches to real construction.
    #[test]
    fn narrow_layout_constructs_home_sheet_and_panels() {
        let catalog = test_catalog();
        let lessons = leetlab_learning::Catalog::from_json(include_bytes!(
            "../../../fixtures/catalog-extra.json"
        ))
        .unwrap();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        app.build_entries();
        app.window_width = Some(390.0);
        assert!(app.is_narrow());
        // Home with the drawer open renders the overlay sheet.
        app.selected = None;
        app.hide_catalog = false;
        let _ = app.view();
        // Every panel stacks at 390px.
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(problem));
        for panel in [Panel::Solve, Panel::Learn, Panel::Practice] {
            app.panel = panel;
            let _ = app.workspace();
        }
        // Rail-only narrow view builds with the drawer closed.
        app.hide_catalog = true;
        let _ = app.view();
        // Desktop width keeps the side-column view green.
        app.window_width = Some(1280.0);
        app.hide_catalog = false;
        let _ = app.view();
    }

    /// Solve destructive actions need two presses (solve-workspace 0001):
    /// the first press only arms and names the second; the second press
    /// applies. Editor text is untouched by an arming press.
    #[test]
    fn solve_starter_and_reset_need_two_presses() {
        let catalog = test_catalog();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        let template = problem.snippets.get("java").expect("two-sum java starter");
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        app.language = Language::Java;
        app.editor = text_editor::Content::with_text("typed");
        let _ = app.update(Message::Starter);
        assert!(app.starter_armed);
        assert_eq!(app.editor.text().trim_end(), "typed");
        assert_eq!(
            app.status_line.as_deref(),
            Some("Press Starter again to replace the editor with the template.")
        );
        let _ = app.update(Message::Starter);
        assert!(!app.starter_armed);
        assert_eq!(app.editor.text().trim_end(), template.trim_end());
        assert_eq!(
            app.status_line.as_deref(),
            Some("Starter code loaded. Your saved draft was replaced.")
        );
        let _ = app.update(Message::ResetProblem);
        assert!(app.problem_reset_armed);
        assert_eq!(
            app.status_line.as_deref(),
            Some("Press Reset again to mark this problem unsolved. Saved code stays.")
        );
        let _ = app.update(Message::ResetProblem);
        assert!(!app.problem_reset_armed);
        assert_eq!(app.progress.status("two-sum"), progress::Status::Todo);
        assert_eq!(
            app.status_line.as_deref(),
            Some(
                "Progress cleared — this problem is unsolved again. Your saved code is untouched."
            )
        );
    }

    /// Solve verdict state names the kind and language (solve-workspace
    /// 0002): the card header renders `{label} - {Java|C++}` from the
    /// stored kind+language, never a synthesized per-case breakdown.
    #[test]
    fn solve_verdict_state_names_kind_and_language() {
        fn outcome(kind: judge::OutcomeKind, ok: bool) -> judge::Outcome {
            judge::Outcome {
                ok,
                ms: Some(3),
                text: "t".into(),
                kind,
            }
        }
        let mut app = App::default();
        let _ = app.update(Message::Judged(
            "two-sum".into(),
            Language::Java,
            false,
            outcome(judge::OutcomeKind::Passed, true),
        ));
        assert!(matches!(
            &app.verdict,
            Some((slug, Language::Java, judge::OutcomeKind::Passed, _)) if slug == "two-sum"
        ));
        assert_eq!(
            app.status_line.as_deref(),
            Some("Passed — attempt recorded.")
        );
        let _ = app.update(Message::Judged(
            "two-sum".into(),
            Language::Cpp,
            false,
            outcome(judge::OutcomeKind::WrongAnswer, false),
        ));
        assert!(matches!(
            &app.verdict,
            Some((slug, Language::Cpp, judge::OutcomeKind::WrongAnswer, _)) if slug == "two-sum"
        ));
        assert_eq!(
            app.status_line.as_deref(),
            Some("Not passing (wrong answer) — attempt recorded.")
        );
    }

    /// Ctrl+Enter maps to Run (solve-workspace 0003). The busy /
    /// unsupported guards live in `start_judge`, so the binding itself is
    /// unconditional; plain 1/2/3 still switch panels (known focus
    /// limitation: they also fire while typing, see REPORT).
    #[test]
    fn ctrl_enter_maps_to_run() {
        use iced::keyboard::{Key, Modifiers};
        assert!(matches!(
            shortcut(Key::Character("\r".into()), Modifiers::CTRL),
            Some(Message::Run)
        ));
        assert!(matches!(
            shortcut(Key::Character("1".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Solve))
        ));
    }

    /// Per-language practice drafts survive a language switch: the Java
    /// drill text is still there after editing C++ and switching back, and
    /// the starter snippet only fills editors with no saved draft (web
    /// `setLanguage` parity: typed content is never replaced, untouched
    /// editors get the fresh starter via `load_practice_editor` fallback).
    #[test]
    fn practice_drafts_are_per_language() {
        use leetlab_learning::Catalog as Lessons;
        let catalog = test_catalog();
        let lessons =
            Lessons::from_json(include_bytes!("../../../fixtures/catalog-extra.json")).unwrap();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        // `App::default()` carries the storage-unavailable fallback store
        // (empty path rejects every `stage()`); point the test at an
        // absolute temp path so per-language staging is really exercised.
        app.drafts = drafts::Store::test_store();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        app.panel = Panel::Practice;
        app.practice_variant = 0;
        // Java edit is staged under the (drill, java) key.
        app.language = Language::Java;
        app.load_practice_editor();
        app.practice_editor = text_editor::Content::with_text("java drill edit");
        app.stage_practice_drafts();
        // Switching languages flushes the staged Java edit, then the C++
        // editor starts from the starter (no C++ draft yet) and takes its
        // own edit without touching the Java draft.
        let _ = app.update(Message::Language(Language::Cpp));
        assert_eq!(app.language, Language::Cpp);
        app.practice_editor = text_editor::Content::with_text("cpp drill edit");
        app.stage_practice_drafts();
        let _ = app.update(Message::Language(Language::Java));
        assert_eq!(
            app.practice_editor.text().trim_end(),
            "java drill edit",
            "java drill text survives a language round-trip"
        );
        let _ = app.update(Message::Language(Language::Cpp));
        assert_eq!(
            app.practice_editor.text().trim_end(),
            "cpp drill edit",
            "cpp drill text is keyed separately from java"
        );
        // Solve drafts stay on the plain slug key and never collide with
        // the `slug#variant` practice keys.
        assert!(
            app.drafts
                .get("two-sum", "java")
                .is_none_or(|code| code.as_str() != "java drill edit"),
            "practice drills must not leak into the solve draft slot"
        );
    }

    #[test]
    fn motion_resolver_matches_web_contract() {
        assert_eq!(
            resolve_motion(MotionChoice::Reduce, false),
            MotionChoice::Reduce
        );
        assert_eq!(
            resolve_motion(MotionChoice::Reduce, true),
            MotionChoice::Reduce
        );
        assert_eq!(
            resolve_motion(MotionChoice::Full, false),
            MotionChoice::Full
        );
        assert_eq!(resolve_motion(MotionChoice::Full, true), MotionChoice::Full);
        assert_eq!(
            resolve_motion(MotionChoice::System, true),
            MotionChoice::Reduce
        );
        assert_eq!(
            resolve_motion(MotionChoice::System, false),
            MotionChoice::Full
        );
    }

    #[test]
    fn practice_starter_uses_drill_signature_per_language() {
        let signature = leetlab_learning::VariantSignature {
            name: "twoSum".into(),
            params: vec![
                leetlab_learning::VariantParam {
                    name: "nums".into(),
                    value_type: "int[]".into(),
                },
                leetlab_learning::VariantParam {
                    name: "target".into(),
                    value_type: "int".into(),
                },
            ],
            return_type: "int[]".into(),
        };
        let java = App::practice_starter(&signature, Language::Java);
        assert!(java.contains("public int[] twoSum(int[] nums, int target)"));
        let cpp = App::practice_starter(&signature, Language::Cpp);
        assert!(cpp.contains("vector<int>& nums"));
        assert!(cpp.contains("twoSum"));
        let unknown = leetlab_learning::VariantSignature {
            name: String::new(),
            params: Vec::new(),
            return_type: "int".into(),
        };
        assert!(App::practice_starter(&unknown, Language::Java).contains("No verified"));
    }

    #[test]
    fn settings_render_for_every_theme_and_motion() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        app.selected = Some(Selection::Local(Arc::new(
            catalog.problem("two-sum").unwrap(),
        )));
        for theme in [
            ThemeChoice::System,
            ThemeChoice::Light,
            ThemeChoice::LightPlus,
            ThemeChoice::Dark,
            ThemeChoice::DarkPlus,
            ThemeChoice::Dracula,
            ThemeChoice::CatMocha,
            ThemeChoice::CatMacchiato,
            ThemeChoice::CatFrappe,
            ThemeChoice::CatLatte,
            ThemeChoice::NightOwl,
            ThemeChoice::TokyoNight,
            ThemeChoice::OneDarkPro,
            ThemeChoice::Monokai,
            ThemeChoice::Nord,
            ThemeChoice::GitHubDark,
        ] {
            for motion in [
                MotionChoice::System,
                MotionChoice::Reduce,
                MotionChoice::Full,
            ] {
                app.theme = theme;
                app.motion = motion;
                app.settings_open = true;
                let _ = app.view();
            }
        }
        app.settings_open = false;
        let _ = app.view();
    }

    /// Task-7: Foundation is the default track; before lessons arrive the
    /// full curriculum shows (startup honesty), and `LessonsLoaded` narrows
    /// to the foundation subset (every entry `is_foundation`).
    #[test]
    fn foundation_track_defaults_and_filters() {
        use leetlab_learning::Catalog as Lessons;
        let catalog = test_catalog();
        assert_eq!(Track::default(), Track::Foundation);
        let mut app = App::default();
        assert_eq!(app.track, Track::Foundation);
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        assert_eq!(app.entries.len(), catalog.curriculum.len());
        let lessons =
            Lessons::from_json(include_bytes!("../../../fixtures/catalog-extra.json")).unwrap();
        let expected: BTreeSet<String> = lessons
            .foundation_slugs()
            .into_iter()
            .map(|slug| slug.to_owned())
            .collect();
        let _ = app.update(Message::LessonsLoaded(Ok(Arc::new(lessons))));
        assert_eq!(app.entries.len(), expected.len());
        assert!(!app.entries.is_empty(), "fixture has a foundation subset");
        for entry in &app.entries {
            assert!(expected.contains(&entry.slug), "{}", entry.slug);
        }
        // The catalog track buttons still reach every track.
        for track in [Track::NeetCode, Track::Blind, Track::All] {
            let _ = app.update(Message::Track(track));
            assert_eq!(app.track, track);
            assert!(!app.entries.is_empty());
        }
    }

    /// Task-7: the home curriculum-path section counts real data in path
    /// order and constructs over the Foundation default.
    #[test]
    fn home_path_section_counts_real_data() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        let rows = app.path_rows();
        assert_eq!(rows.len(), 4);
        assert_eq!(rows[0].1, Track::Foundation);
        assert_eq!(rows[1].1, Track::Blind);
        assert_eq!(
            rows[1].2,
            catalog.curriculum.iter().filter(|entry| entry.blind75).count()
        );
        assert_eq!(rows[2].1, Track::NeetCode);
        assert_eq!(rows[2].2, catalog.curriculum.len());
        assert_eq!(rows[3].1, Track::All);
        assert_eq!(rows[3].2, catalog.problems.len());
        // Fresh store: nothing solved anywhere.
        for row in &rows {
            assert_eq!(row.3, 0, "{}", row.0);
        }
        let _ = app.home();
        app.hide_catalog = true;
        let _ = app.view();
    }

    /// Task-7: System is the default theme, the resolver honors both VS
    /// Code ports, and the rail cycles System → Light → Dark → Dracula →
    /// System (a custom import parks on Light, never deleted).
    #[test]
    fn system_theme_default_and_rail_cycle() {
        use iced::Color;
        assert_eq!(ThemeChoice::default(), ThemeChoice::System);
        assert_eq!(
            resolve_system_theme(false).palette().background,
            Color::from_rgb8(0xFF, 0xFF, 0xFF)
        );
        assert_eq!(
            resolve_system_theme(true).palette().background,
            Color::from_rgb8(0x1E, 0x1E, 0x1E)
        );
        let mut app = App::default();
        assert_eq!(app.theme, ThemeChoice::System);
        let _ = app.active_theme();
        for expected in [
            ThemeChoice::Light,
            ThemeChoice::LightPlus,
            ThemeChoice::Dark,
            ThemeChoice::DarkPlus,
            ThemeChoice::Dracula,
            ThemeChoice::CatMocha,
            ThemeChoice::CatMacchiato,
            ThemeChoice::CatFrappe,
            ThemeChoice::CatLatte,
            ThemeChoice::NightOwl,
            ThemeChoice::TokyoNight,
            ThemeChoice::OneDarkPro,
            ThemeChoice::Monokai,
            ThemeChoice::Nord,
            ThemeChoice::GitHubDark,
            ThemeChoice::System,
        ] {
            let _ = app.update(Message::ToggleTheme);
            assert_eq!(app.theme, expected);
        }
        app.theme = ThemeChoice::Custom;
        let _ = app.update(Message::ToggleTheme);
        assert_eq!(app.theme, ThemeChoice::System);
    }

    /// Task-7: `/ j/k s Space` + arrows + `?` map; the typing limitation
    /// (no focus context) is unchanged for the old keys.
    #[test]
    fn shortcut_extended_map() {
        use iced::keyboard::{key::Named, Key, Modifiers};
        assert!(matches!(
            shortcut(Key::Character("/".into()), Modifiers::empty()),
            Some(Message::FocusSearch)
        ));
        assert!(matches!(
            shortcut(Key::Character("j".into()), Modifiers::empty()),
            Some(Message::SelectRelative(1))
        ));
        assert!(matches!(
            shortcut(Key::Character("k".into()), Modifiers::empty()),
            Some(Message::SelectRelative(-1))
        ));
        assert!(matches!(
            shortcut(Key::Character("s".into()), Modifiers::empty()),
            Some(Message::StartNext)
        ));
        assert!(matches!(
            shortcut(Key::Character(" ".into()), Modifiers::empty()),
            Some(Message::Advance)
        ));
        assert!(matches!(
            shortcut(Key::Named(Named::ArrowDown), Modifiers::empty()),
            Some(Message::SelectRelative(1))
        ));
        assert!(matches!(
            shortcut(Key::Named(Named::ArrowUp), Modifiers::empty()),
            Some(Message::SelectRelative(-1))
        ));
        assert!(matches!(
            shortcut(Key::Named(Named::ArrowRight), Modifiers::empty()),
            Some(Message::Advance)
        ));
        assert!(matches!(
            shortcut(Key::Named(Named::ArrowLeft), Modifiers::empty()),
            Some(Message::StepBack)
        ));
        assert!(matches!(
            shortcut(Key::Named(Named::Space), Modifiers::empty()),
            Some(Message::Advance)
        ));
        // `?` arrives with Shift held on most layouts.
        assert!(matches!(
            shortcut(Key::Character("?".into()), Modifiers::SHIFT),
            Some(Message::ToggleHelp)
        ));
        assert!(matches!(
            shortcut(Key::Character("?".into()), Modifiers::empty()),
            None
        ));
        // Old bindings are untouched.
        assert!(matches!(
            shortcut(Key::Character("1".into()), Modifiers::empty()),
            Some(Message::Panel(Panel::Solve))
        ));
        assert!(matches!(
            shortcut(
                Key::Named(Named::Escape),
                Modifiers::empty()
            ),
            Some(Message::EscapePressed)
        ));
    }

    /// Task-7: `SelectRelative` steps through the filtered order, starts
    /// at the near end from no selection, clamps at both ends, and is
    /// consumed while an overlay owns the focus.
    #[test]
    fn select_relative_steps_and_clamps() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        assert!(app.visible.len() > 2);
        let first = app.entries[app.visible[0]].slug.clone();
        let second = app.entries[app.visible[1]].slug.clone();
        let last = app.entries[*app.visible.last().unwrap()].slug.clone();
        // From no selection, +1 lands on the first row, -1 on the last.
        let _ = app.update(Message::SelectRelative(1));
        assert_eq!(app.requested.as_deref(), Some(first.as_str()));
        app.requested = None;
        let _ = app.update(Message::SelectRelative(-1));
        assert_eq!(app.requested.as_deref(), Some(last.as_str()));
        // From the first row, -1 stays (no reload); +1 advances.
        app.selected = Some(Selection::Local(Arc::new(
            catalog.problem(&first).unwrap(),
        )));
        app.requested = None;
        let _ = app.update(Message::SelectRelative(-1));
        assert!(app.requested.is_none());
        let _ = app.update(Message::SelectRelative(1));
        assert_eq!(app.requested.as_deref(), Some(second.as_str()));
        // From the last row, +1 stays put.
        app.selected = Some(Selection::Local(Arc::new(
            catalog.problem(&last).unwrap(),
        )));
        app.requested = None;
        let _ = app.update(Message::SelectRelative(1));
        assert!(app.requested.is_none());
        // Overlay focus guard: settings and help both consume stepping.
        app.settings_open = true;
        let _ = app.update(Message::SelectRelative(1));
        assert!(app.requested.is_none());
        app.settings_open = false;
        app.help_open = true;
        let _ = app.update(Message::SelectRelative(1));
        assert!(app.requested.is_none());
        app.help_open = false;
    }

    /// Task-7: `StartNext` selects the first unsolved lesson; with
    /// everything solved it says so instead of synthesizing a target.
    #[test]
    fn start_next_selects_first_open() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        let first = app.entries[app.visible[0]].slug.clone();
        let _ = app.update(Message::StartNext);
        assert_eq!(app.requested.as_deref(), Some(first.as_str()));
        for index in app.visible.clone() {
            let slug = app.entries[index].slug.clone();
            app.progress
                .record_solved(&slug, 0, "java", progress::now_ms());
        }
        app.requested = None;
        let _ = app.update(Message::StartNext);
        assert!(app.requested.is_none());
        assert!(app
            .status_line
            .as_deref()
            .is_some_and(|line| line.contains("solved")));
    }

    /// Task-7: Space advances Learn frames (clamped), starts next on home,
    /// and never runs code from Solve/Practice.
    #[test]
    fn advance_steps_learn_and_home_only() {        use leetlab_learning::Catalog as Lessons;
        let catalog = test_catalog();
        let lessons =
            Lessons::from_json(include_bytes!("../../../fixtures/catalog-extra.json")).unwrap();
        let total = lessons
            .lesson("two-sum")
            .and_then(|lesson| lesson.walkthrough.as_ref())
            .map(|walkthrough| walkthrough.frames.len())
            .expect("two-sum walkthrough");
        assert!(total > 1);
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        app.build_entries();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        app.panel = Panel::Learn;
        let _ = app.update(Message::Advance);
        assert_eq!(app.frame, 1);
        // Solve/Practice: Space is a no-op (never runs code by accident).
        app.panel = Panel::Solve;
        let _ = app.update(Message::Advance);
        assert_eq!(app.frame, 1);
        assert!(app.requested.is_none());
        // Past the end: clamped, no wrap.
        app.panel = Panel::Learn;
        app.frame = total;
        let _ = app.update(Message::Advance);
        assert_eq!(app.frame, total);
        // Home: Space starts the next unsolved lesson.
        app.selected = None;
        app.frame = 0;
        app.requested = None;
        let _ = app.update(Message::Advance);
        assert!(app.requested.is_some());
        // StepBack mirrors Advance backwards with the same guards.
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        app.panel = Panel::Learn;
        app.frame = 2;
        let _ = app.update(Message::StepBack);
        assert_eq!(app.frame, 1);
        let _ = app.update(Message::StepBack);
        assert_eq!(app.frame, 0);
        // Floor: clamped at zero, no wrap.
        let _ = app.update(Message::StepBack);
        assert_eq!(app.frame, 0);
        // Solve: StepBack is a no-op like Advance.
        app.panel = Panel::Solve;
        app.frame = 1;
        let _ = app.update(Message::StepBack);
        assert_eq!(app.frame, 1);
        // PlayToggle + Tick: autoplay advances and auto-stops.
        app.panel = Panel::Learn;
        app.frame = 0;
        assert_eq!(app.play_speed, PlaySpeed::Normal);
        let _ = app.update(Message::PlaySpeed);
        assert_eq!(app.play_speed, PlaySpeed::Fast);
        assert_eq!(app.play_speed.interval_ms(), 300);
        let _ = app.update(Message::PlayToggle);
        assert!(app.playing);
        let _ = app.update(Message::Tick);
        assert_eq!(app.frame, 1);
        assert!(app.playing);
        // Tick at the last frame stops playback (drops the subscription).
        app.frame = total;
        let _ = app.update(Message::Tick);
        assert!(!app.playing);
        // Reduced motion refuses timed playback with a status note.
        app.motion = MotionChoice::Reduce;
        app.frame = 0;
        let _ = app.update(Message::PlayToggle);
        assert!(!app.playing);
        assert!(app.status_line.is_some());
        app.motion = MotionChoice::Full;
    }

    /// Task-7: My-notes round-trips through the progress store — load on
    /// selection, staged in memory per keystroke, durable at flush points,
    /// cleared on navigation.
    #[test]
    fn notes_bind_to_progress_store() {
        let catalog = test_catalog();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        app.load_notes();
        assert_eq!(app.notes_loaded.as_deref(), Some("two-sum"));
        // The editor widget always carries a trailing newline artifact.
        assert_eq!(app.notes_editor.text().trim_end(), "");
        // Typing syncs into the store in memory and marks dirty.
        app.notes_editor = text_editor::Content::with_text("remember hashmap");
        app.notes_dirty = true;
        app.save_notes();
        assert!(!app.notes_dirty);
        assert_eq!(app.progress.get_note("two-sum"), "remember hashmap");
        // Reload stages the stored note; other lessons are unaffected.
        app.notes_editor = text_editor::Content::with_text("scratch");
        app.load_notes();
        assert_eq!(app.notes_editor.text().trim_end(), "remember hashmap");
        assert_eq!(app.progress.get_note("contains-duplicate"), "");
        // Navigation clears the editor (Select/Home call load_notes with
        // no selection), never the store.
        app.selected = None;
        app.load_notes();
        assert_eq!(app.notes_editor.text().trim_end(), "");
        assert!(app.notes_loaded.is_none());
        assert_eq!(app.progress.get_note("two-sum"), "remember hashmap");
        // The notes editor constructs inside the Solve panel.
        app.selected = Some(Selection::Local(problem));
        app.load_notes();
        let _ = app.workspace();
    }

    /// Task-7: Share minimum sets the `#id /p/slug` status fallback (the
    /// same text goes on the clipboard task); with no lesson it no-ops.
    #[test]
    fn share_sets_status_fallback() {
        let catalog = test_catalog();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        let _ = app.update(Message::Share);
        let status = app.status_line.as_deref().expect("share sets status");
        assert!(status.contains(&share_text(problem.id, &problem.slug)));
        assert!(status.contains("/p/two-sum"));
        assert_eq!(
            share_text(0, "two-sum"),
            "/p/two-sum",
            "overlay lessons keep the bare path"
        );
        let mut empty = App::default();
        let _ = empty.update(Message::Share);
        assert!(empty.status_line.is_none());
        let _ = app.workspace();
    }

    /// Task-7: the Help overlay toggles, constructs over a live lesson,
    /// consumes stepping while open, and Escape closes it before settings
    /// and the drawer.
    #[test]
    fn help_overlay_guards_nav_and_escapes_first() {
        let catalog = test_catalog();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.build_entries();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(problem));
        let _ = app.update(Message::ToggleHelp);
        assert!(app.help_open);
        let _ = app.view();
        let _ = app.update(Message::SelectRelative(1));
        assert!(app.requested.is_none());
        let _ = app.update(Message::StartNext);
        assert!(app.requested.is_none());
        app.settings_open = true;
        let _ = app.update(Message::EscapePressed);
        assert!(!app.help_open);
        assert!(app.settings_open);
        let _ = app.view();
        let _ = app.update(Message::EscapePressed);
        assert!(!app.settings_open);
        let _ = app.update(Message::ToggleHelp);
        assert!(app.help_open);
        let _ = app.update(Message::ToggleHelp);
        assert!(!app.help_open);
    }

    /// Task-7: Trace-in-Learn renders the captured user run through the
    /// shared trace view (object, scalar, and empty shapes all construct
    /// without a window).
    #[test]
    fn trace_in_learn_renders_user_run() {
        use leetlab_learning::Catalog as Lessons;
        let catalog = test_catalog();
        let lessons =
            Lessons::from_json(include_bytes!("../../../fixtures/catalog-extra.json")).unwrap();
        let mut app = App::default();
        app.catalog = Some(Arc::clone(&catalog));
        app.lessons = Some(Arc::new(lessons));
        app.build_entries();
        let problem = Arc::new(catalog.problem("two-sum").unwrap());
        app.selected = Some(Selection::Local(Arc::clone(&problem)));
        app.panel = Panel::Learn;
        app.trace = Some(TraceDone {
            slug: problem.slug.clone(),
            language: Language::Java,
            outcome: trace::TraceOutcome::Traced {
                cpp: false,
                events: vec![
                    serde_json::json!({"i": 0, "seen": [1]}),
                    serde_json::json!("scalar"),
                ],
                capped: false,
                result: "ok".into(),
            },
            index: 0,
        });
        let _ = app.workspace();
        app.trace.as_mut().unwrap().index = 1;
        let _ = app.workspace();
        app.trace.as_mut().unwrap().index = 99;
        let _ = app.workspace();
        app.trace = Some(TraceDone {
            slug: problem.slug.clone(),
            language: Language::Java,
            outcome: trace::TraceOutcome::Unavailable {
                error: "no loops found".into(),
            },
            index: 0,
        });
        let _ = app.workspace();
    }
}
