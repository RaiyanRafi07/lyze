// Problem catalog: index, per-shard records, curriculum, overlay lessons.
// Contract: `open(root)` reads `plugin/data/index.json` plus the curriculum file;
// `problem(slug)` lazily loads its shard, with a Full overlay replacing the
// record and a Patch overlay swapping only judge/provenance.
// Gotcha: `desktop/lessons/v1/` layers on top of shipped data; an unreadable
// overlay dir is treated as empty, and `has_local` covers both sources.
use serde::de::DeserializeOwned;
use serde::Deserialize;
use std::collections::BTreeMap;
use std::error::Error;
use std::fmt;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

pub struct Catalog {
    data_dir: PathBuf,
    pub problems: Vec<ProblemSummary>,
    pub patterns: Vec<PatternSummary>,
    pub curriculum: Vec<CurriculumEntry>,
    overlay: BTreeMap<String, Overlay>,
}

impl Catalog {
    /// Open the index and curriculum at a repository or installed resource root.
    /// Individual problem shards are read only when requested. Desktop overlay
    /// lessons (`desktop/lessons/v1/*.json`) layer on top without touching the
    /// shipped dataset.
    pub fn open(root: impl AsRef<Path>) -> Result<Self, CatalogError> {
        let root = root.as_ref();
        let data_dir = root.join("plugin").join("data");
        let index: Index = read_json(&data_dir.join("index.json"))?;
        let curriculum: Curriculum = read_json(&root.join("docs").join("NEETCODE_150.json"))?;
        Ok(Self {
            data_dir,
            problems: index.problems,
            patterns: index.patterns,
            curriculum: curriculum.problems,
            overlay: load_overlay(&root.join("desktop").join("lessons").join("v1")),
        })
    }

    /// True when a full local record exists (shard record or overlay lesson).
    pub fn has_local(&self, slug: &str) -> bool {
        self.overlay.contains_key(slug) || self.problems.iter().any(|problem| problem.slug == slug)
    }

    pub fn problem(&self, slug: &str) -> Result<Problem, CatalogError> {
        if let Some(overlay) = self.overlay.get(slug) {
            match overlay {
                Overlay::Full(problem) => return Ok(problem.clone()),
                Overlay::Patch {
                    slug,
                    provenance,
                    judge,
                } => {
                    let entry = self
                        .problems
                        .iter()
                        .find(|problem| problem.slug == *slug)
                        .ok_or_else(|| CatalogError::UnknownSlug(slug.clone()))?;
                    let path = self.data_dir.join(format!("shard-{}.json", entry.shard));
                    let shard: Shard = read_json(&path)?;
                    let mut problem = shard
                        .problems
                        .into_iter()
                        .find(|problem| problem.slug == *slug)
                        .ok_or_else(|| CatalogError::MissingRecord {
                            slug: slug.clone(),
                            path,
                        })?;
                    problem.judge = Some(judge.clone());
                    problem.provenance = provenance.clone();
                    return Ok(problem);
                }
            }
        }
        let entry = self
            .problems
            .iter()
            .find(|problem| problem.slug == slug)
            .ok_or_else(|| CatalogError::UnknownSlug(slug.to_owned()))?;
        let path = self.data_dir.join(format!("shard-{}.json", entry.shard));
        let shard: Shard = read_json(&path)?;
        shard
            .problems
            .into_iter()
            .find(|problem| problem.slug == slug)
            .ok_or_else(|| CatalogError::MissingRecord {
                slug: slug.to_owned(),
                path,
            })
    }
}

fn load_overlay(dir: &Path) -> BTreeMap<String, Overlay> {
    let mut overlay = BTreeMap::new();
    let Ok(entries) = fs::read_dir(dir) else {
        return overlay;
    };
    for entry in entries.flatten() {
        if entry.path().extension().is_none_or(|ext| ext != "json") {
            continue;
        }
        let Ok(bytes) = fs::read(entry.path()) else {
            continue;
        };
        let Ok(lesson) = serde_json::from_slice::<Overlay>(&bytes) else {
            continue;
        };
        let slug = match &lesson {
            Overlay::Full(problem) => problem.slug.clone(),
            Overlay::Patch { slug, .. } => slug.clone(),
        };
        overlay.insert(slug, lesson);
    }
    overlay
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProblemSummary {
    pub id: u32,
    pub slug: String,
    pub title: String,
    pub difficulty: String,
    pub topics: Vec<String>,
    pub pattern: String,
    pub patterns: Vec<String>,
    pub premium: bool,
    pub judgeable: bool,
    pub has_visual: bool,
    pub shard: u32,
}

#[derive(Debug, Deserialize)]
pub struct PatternSummary {
    pub id: String,
    pub label: String,
    pub blurb: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurriculumEntry {
    pub slug: String,
    pub title: String,
    pub group: String,
    pub blind75: bool,
    pub local_record: bool,
    pub source_link: String,
    pub alternative_source: Option<String>,
}

impl CurriculumEntry {
    pub fn external_url(&self) -> Option<&str> {
        if self.local_record {
            None
        } else {
            Some(
                self.alternative_source
                    .as_deref()
                    .unwrap_or(&self.source_link),
            )
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Problem {
    pub id: u32,
    pub slug: String,
    pub title: String,
    pub difficulty: String,
    pub topics: Vec<String>,
    pub pattern: String,
    pub patterns: Vec<String>,
    pub premium: bool,
    pub description: String,
    pub examples: Vec<Example>,
    pub constraints: Vec<String>,
    #[serde(default)]
    pub follow_ups: Vec<String>,
    pub hints: Vec<String>,
    pub snippets: BTreeMap<String, String>,
    pub solution: String,
    pub judge: Option<Judge>,
    /// Present only on desktop-overlay lessons (independent equivalents or
    /// curated tests). Shard records never carry this field.
    #[serde(default)]
    pub provenance: Option<Provenance>,
}

/// A desktop overlay lesson: either a complete record (no shard entry
/// exists) or a curated-judge patch layered over the shard record.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum Overlay {
    Full(Problem),
    Patch {
        slug: String,
        #[serde(default)]
        provenance: Option<Provenance>,
        judge: Judge,
    },
}

#[derive(Debug, Clone, Deserialize)]
pub struct Example {
    pub n: u32,
    pub input: String,
    pub output: String,
    pub explain: String,
    pub raw: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct Provenance {
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub sources: Vec<String>,
    #[serde(default)]
    pub note: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Judge {
    pub mode: String,
    pub signature: Signature,
    pub tests: Vec<JudgeCase>,
    /// Void/in-place specs: param indices compared by post-state.
    #[serde(default)]
    pub mutates: Option<Vec<usize>>,
    /// Class-based multi-call specs (LeetCode ops+args wire format).
    #[serde(default)]
    pub sequences: Option<Vec<SequenceCase>>,
    /// Property validator id instead of output comparison (e.g. alien-order).
    #[serde(default)]
    pub validate: Option<String>,
    /// Authored harness fragments for exotic local types, keyed by language
    /// ("java"/"cpp"). Used only for the `Node`/`GraphNode` params the
    /// builtin builders cannot construct without colliding with the user's
    /// own declarations.
    #[serde(default)]
    pub helpers: Option<BTreeMap<String, String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Signature {
    pub name: String,
    pub params: Vec<Parameter>,
    #[serde(rename = "return")]
    pub return_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Parameter {
    pub name: String,
    #[serde(rename = "type")]
    pub value_type: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JudgeCase {
    pub args: Vec<String>,
    pub expected: String,
    pub example: u32,
}

/// One typed literal value, as used by sequence constructors and calls.
#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct TypedValue {
    #[serde(rename = "type")]
    pub value_type: String,
    pub value: String,
}

/// A sequence-call argument: a typed literal, or the serialized output of a
/// previous call (`{"prev": 0}`) for round-trip chains.
#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum SeqArg {
    Lit(TypedValue),
    Prev { prev: usize },
}

#[derive(Debug, Clone, Deserialize)]
pub struct SeqCall {
    pub method: String,
    pub args: Vec<SeqArg>,
    /// Return type for result serialization; absent means void ("null").
    #[serde(default)]
    pub returns: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SequenceCase {
    #[serde(default)]
    pub construct: Vec<TypedValue>,
    pub calls: Vec<SeqCall>,
    pub expected: Vec<String>,
    pub example: u32,
}

#[derive(Deserialize)]
struct Index {
    problems: Vec<ProblemSummary>,
    patterns: Vec<PatternSummary>,
}

#[derive(Deserialize)]
struct Curriculum {
    problems: Vec<CurriculumEntry>,
}

#[derive(Deserialize)]
struct Shard {
    problems: Vec<Problem>,
}

#[derive(Debug)]
pub enum CatalogError {
    Read {
        path: PathBuf,
        error: io::Error,
    },
    Parse {
        path: PathBuf,
        error: serde_json::Error,
    },
    UnknownSlug(String),
    MissingRecord {
        slug: String,
        path: PathBuf,
    },
}

impl fmt::Display for CatalogError {
    fn fmt(&self, out: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Read { path, error } => write!(out, "Could not read {}: {error}", path.display()),
            Self::Parse { path, error } => {
                write!(out, "Invalid catalog data in {}: {error}", path.display())
            }
            Self::UnknownSlug(slug) => write!(out, "Problem is outside the local catalog: {slug}"),
            Self::MissingRecord { slug, path } => {
                write!(out, "Problem {slug} is missing from {}", path.display())
            }
        }
    }
}

impl Error for CatalogError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Read { error, .. } => Some(error),
            Self::Parse { error, .. } => Some(error),
            _ => None,
        }
    }
}

fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T, CatalogError> {
    let data = fs::read(path).map_err(|error| CatalogError::Read {
        path: path.to_owned(),
        error,
    })?;
    serde_json::from_slice(&data).map_err(|error| CatalogError::Parse {
        path: path.to_owned(),
        error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shipped_catalog_matches_curriculum_and_all_shards() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");
        let catalog = Catalog::open(root).unwrap();
        assert_eq!(catalog.problems.len(), 2913);
        assert_eq!(catalog.curriculum.len(), 150);
        assert_eq!(
            catalog
                .curriculum
                .iter()
                .filter(|entry| entry.blind75)
                .count(),
            75
        );
        assert_eq!(
            catalog
                .curriculum
                .iter()
                .filter(|entry| entry.external_url().is_some())
                .count(),
            7
        );

        for entry in &catalog.curriculum {
            let has_record = catalog
                .problems
                .iter()
                .any(|problem| problem.slug == entry.slug);
            assert_eq!(entry.local_record, has_record, "{}", entry.slug);
        }

        let mut last_shard = None;
        let mut records = Vec::new();
        for entry in &catalog.problems {
            if last_shard != Some(entry.shard) {
                let path = catalog.data_dir.join(format!("shard-{}.json", entry.shard));
                records = read_json::<Shard>(&path).unwrap().problems;
                last_shard = Some(entry.shard);
            }
            let record = records
                .iter()
                .find(|problem| problem.slug == entry.slug)
                .unwrap();
            assert_eq!((record.id, &record.title), (entry.id, &entry.title));
        }

        let problem = catalog.problem("two-sum").unwrap();
        assert!(problem.description.contains("target"));
        assert_eq!(problem.judge.unwrap().signature.name, "twoSum");
        // Externally-linked curriculum entries resolve once a desktop overlay
        // lesson ships a local equivalent.
        assert!(catalog.has_local("meeting-rooms"));
        assert!(!catalog.has_local("no-such-lesson"));
        let overlay = catalog.problem("meeting-rooms").unwrap();
        assert_eq!(overlay.title, "Meeting Rooms");
        let provenance = overlay.provenance.expect("overlay provenance");
        assert_eq!(provenance.kind, "independent-equivalent");
        assert!(overlay.judge.is_some());
        // A judge-null shard record gains curated coverage from the overlay.
        let lru = catalog.problem("lru-cache").unwrap();
        assert!(lru.judge.is_some());
        assert!(catalog.has_local("lru-cache"));
    }

    #[test]
    fn unknown_slugs_stay_unknown() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");
        let catalog = Catalog::open(root).unwrap();
        assert!(matches!(
            catalog.problem("no-such-lesson"),
            Err(CatalogError::UnknownSlug(_))
        ));
    }
}
