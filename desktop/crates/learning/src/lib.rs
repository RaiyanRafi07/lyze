//! Native Learn/Practice playback data from the build-time fixture export.
//!
//! `desktop/fixtures/export-all.mjs` replays the web walkthrough and variant
//! builders over the real lessons and writes `catalog-extra.json`. Nothing is
//! synthesized at runtime: the app plays captured frames and grades variant
//! tests through the native judge.

use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
pub struct Catalog {
    version: u32,
    pub lessons: Vec<Lesson>,
}

impl Catalog {
    pub fn from_json(bytes: &[u8]) -> Result<Self, serde_json::Error> {
        let catalog: Self = serde_json::from_slice(bytes)?;
        if catalog.version != 2 {
            return Err(<serde_json::Error as serde::de::Error>::custom(format!(
                "unsupported catalog-extra version {}",
                catalog.version
            )));
        }
        Ok(catalog)
    }

    pub fn lesson(&self, slug: &str) -> Option<&Lesson> {
        self.lessons.iter().find(|lesson| lesson.slug == slug)
    }

    /// Slugs of the foundation track, mirroring web
    /// `trackProblems('foundation')`: only lessons where every feature flag
    /// is true. Order follows the catalog.
    pub fn foundation_slugs(&self) -> Vec<&str> {
        self.lessons
            .iter()
            .filter(|lesson| lesson.is_foundation())
            .map(|lesson| lesson.slug.as_str())
            .collect()
    }
}

#[derive(Debug, Deserialize)]
pub struct Lesson {
    pub slug: String,
    pub walkthrough: Option<Walkthrough>,
    #[serde(default)]
    pub variants: Vec<Variant>,
}

impl Lesson {
    /// Foundation-track membership, mirroring web `trackProblems('foundation')`
    /// (`Object.values(p.features).every(Boolean)` over walkthrough, notes,
    /// practice and judge). Native mapping over the captured fixture:
    /// walkthrough frames present, line notes present in at least one
    /// language, at least three practice variants present (web requires
    /// exactly three built variants), and judge payload present (every
    /// variant carries tests).
    pub fn is_foundation(&self) -> bool {
        let walkthrough_ok = self
            .walkthrough
            .as_ref()
            .is_some_and(|walkthrough| !walkthrough.frames.is_empty());
        let notes_ok = self.walkthrough.as_ref().is_some_and(|walkthrough| {
            [Language::Java, Language::Cpp, Language::Pseudo]
                .iter()
                .any(|language| {
                    walkthrough.code(*language).iter().any(|line| {
                        line.explain
                            .as_deref()
                            .is_some_and(|note| !note.is_empty())
                    })
                })
        });
        let practice_ok = self.variants.len() >= 3;
        let judge_ok =
            !self.variants.is_empty() && self.variants.iter().all(|variant| !variant.tests.is_empty());
        walkthrough_ok && notes_ok && practice_ok && judge_ok
    }
}

#[derive(Debug, Deserialize)]
pub struct Walkthrough {
    pub kind: String,
    pub layout: Value,
    pub frames: Vec<Frame>,
    code: Code,
}

impl Walkthrough {
    pub fn frame(&self, index: usize) -> Option<&Frame> {
        self.frames.get(index)
    }

    pub fn code(&self, language: Language) -> &[CodeLine] {
        match language {
            Language::Java => &self.code.java,
            Language::Cpp => &self.code.cpp,
            Language::Pseudo => &self.code.pseudo,
        }
    }

    /// Find the first matching reference line for the frame, using zero-based indices.
    pub fn highlighted_line(&self, frame_index: usize, language: Language) -> Option<usize> {
        let frame = self.frame(frame_index)?;
        self.code(language)
            .iter()
            .position(|line| line.step == frame.step)
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Language {
    Java,
    Cpp,
    Pseudo,
}

#[derive(Debug, Deserialize)]
struct Code {
    java: Vec<CodeLine>,
    cpp: Vec<CodeLine>,
    pseudo: Vec<CodeLine>,
}

#[derive(Debug, Deserialize)]
pub struct CodeLine {
    pub text: String,
    pub step: String,
    pub explain: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Frame {
    pub step: String,
    pub label: String,
    pub note: String,
    pub state: Value,
}

/// A deterministic practice drill generated from the lesson's own engine:
/// statement, two hints, and judge-ready tests in the lesson's signature.
#[derive(Debug, Deserialize)]
pub struct Variant {
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub statement: String,
    #[serde(default)]
    pub signature: VariantSignature,
    #[serde(default)]
    pub tests: Vec<VariantTest>,
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub hints: Vec<String>,
    /// Human seed tag from the fixture (e.g. "fresh numbers"). Display-only;
    /// absent in older exports, so it defaults to empty.
    #[serde(default, rename = "seedLabel")]
    pub seed_label: String,
    /// One-line drill intent ("Same pattern, different numbers ...").
    #[serde(default)]
    pub intent: String,
    /// Per-drill difficulty chip ("Easy"/"Medium"/"Hard").
    #[serde(default)]
    pub difficulty: String,
    /// Worked input/output rows shown above the drill editor.
    #[serde(default)]
    pub examples: Vec<VariantExample>,
}

/// Worked example row for a practice drill. All fields default so older
/// fixture exports without examples still deserialize.
#[derive(Debug, Default, Deserialize)]
pub struct VariantExample {
    #[serde(default)]
    pub input: String,
    #[serde(default)]
    pub output: String,
    #[serde(default)]
    pub explain: String,
}

/// Short mode chip text, ported from `MODE_LABEL` in
/// `plugin/web/ui/variations.js`. Unknown modes fall back to exact match.
pub fn variant_mode_label(mode: &str) -> &'static str {
    match mode {
        "unordered" => "any order",
        "any" => "any valid answer",
        "float" => "float tolerance",
        _ => "exact match",
    }
}

/// Tooltip-grade mode description, ported from `MODE_TITLE` in
/// `plugin/web/ui/variations.js`. Unknown modes fall back to exact.
pub fn variant_mode_title(mode: &str) -> &'static str {
    match mode {
        "unordered" => "Outputs are compared as sets: order does not matter.",
        "any" => "Any valid answer is accepted.",
        "float" => "Answers are compared with float tolerance.",
        _ => "Outputs must match exactly.",
    }
}

#[derive(Debug, Default, Deserialize)]
pub struct VariantSignature {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub params: Vec<VariantParam>,
    #[serde(default, rename = "return")]
    pub return_type: String,
}

#[derive(Debug, Default, Deserialize)]
pub struct VariantParam {
    #[serde(default)]
    pub name: String,
    #[serde(rename = "type", default)]
    pub value_type: String,
}

#[derive(Debug, Default, Deserialize)]
pub struct VariantTest {
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub expected: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &[u8] = include_bytes!("../../../fixtures/catalog-extra.json");

    fn catalog() -> Catalog {
        Catalog::from_json(FIXTURE).unwrap()
    }

    #[test]
    fn every_lesson_resolves() {
        let catalog = catalog();
        assert_eq!(catalog.lessons.len(), 150);
        assert!(catalog.lesson("two-sum").is_some());
        assert!(catalog.lesson("missing-fixture").is_none());
    }

    #[test]
    fn walkthrough_frames_map_to_code_lines() {
        let catalog = catalog();
        let mut covered = 0;
        for lesson in &catalog.lessons {
            let Some(walkthrough) = &lesson.walkthrough else {
                continue;
            };
            covered += 1;
            assert!(!walkthrough.frames.is_empty(), "{}", lesson.slug);
            for (index, frame) in walkthrough.frames.iter().enumerate() {
                let highlight = walkthrough.highlighted_line(index, Language::Java);
                // Frames whose step has no Java line are still playable; the
                // code pane simply keeps its current line.
                if let Some(highlight) = highlight {
                    assert_eq!(
                        walkthrough.code(Language::Java)[highlight].step,
                        frame.step,
                        "{} frame {index}",
                        lesson.slug
                    );
                }
                assert!(walkthrough
                    .highlighted_line(walkthrough.frames.len(), Language::Java)
                    .is_none());
            }
        }
        assert_eq!(
            covered, 150,
            "every lesson ships a walkthrough, got {covered}"
        );
    }

    #[test]
    fn variants_carry_grading_payloads() {
        let catalog = catalog();
        let mut with_variants = 0;
        for lesson in &catalog.lessons {
            if lesson.variants.len() >= 3 {
                with_variants += 1;
            }
            for variant in &lesson.variants {
                assert!(!variant.tests.is_empty(), "{} {}", lesson.slug, variant.id);
                assert_eq!(variant.hints.len(), 2, "{} {}", lesson.slug, variant.id);
                assert!(!variant.mode.is_empty(), "{} {}", lesson.slug, variant.id);
            }
        }
        assert_eq!(
            with_variants, 150,
            "every lesson ships three practice variants, got {with_variants}"
        );
    }

    #[test]
    fn variant_metadata_survives_the_fixture() {
        let catalog = catalog();
        let lesson = catalog.lesson("two-sum").expect("two-sum ships variants");
        let variant = lesson.variants.first().expect("two-sum has drills");
        // The build-time export carries display metadata the native view
        // renders; the struct must not silently drop it.
        assert!(!variant.seed_label.is_empty(), "seedLabel survives");
        assert!(!variant.intent.is_empty(), "intent survives");
        assert!(!variant.difficulty.is_empty(), "difficulty survives");
        assert!(!variant.examples.is_empty(), "examples survive");
        assert!(!variant.examples[0].input.is_empty());
    }

    #[test]
    fn variant_mode_labels_cover_all_judge_modes() {
        assert_eq!(variant_mode_label("exact"), "exact match");
        assert_eq!(variant_mode_label("unordered"), "any order");
        assert_eq!(variant_mode_label("any"), "any valid answer");
        assert_eq!(variant_mode_label("float"), "float tolerance");
        assert_eq!(variant_mode_label("bogus"), "exact match");
        assert!(variant_mode_title("unordered").contains("sets"));
        assert!(variant_mode_title("bogus").contains("exactly"));
    }

    #[test]
    fn rejects_a_different_fixture_version() {
        assert!(Catalog::from_json(br#"{"version":1,"lessons":[]}"#).is_err());
    }

    #[test]
    fn foundation_covers_the_full_captured_catalog() {
        let catalog = catalog();
        let two_sum = catalog.lesson("two-sum").expect("two-sum ships");
        assert!(two_sum.is_foundation());
        let slugs = catalog.foundation_slugs();
        assert_eq!(slugs.len(), catalog.lessons.len());
        assert_eq!(slugs.len(), 150);
        assert!(slugs.contains(&"two-sum"));
        // Order follows the catalog.
        assert_eq!(slugs[0], catalog.lessons[0].slug.as_str());
    }

    #[test]
    fn foundation_requires_every_feature() {
        // Bare lesson: no walkthrough, no variants, no notes, no tests.
        let bare: Lesson = serde_json::from_value(serde_json::json!({"slug": "bare"})).unwrap();
        assert!(!bare.is_foundation());
        // Walkthrough frames without variants still miss practice + judge.
        let mut with_frames: Lesson = serde_json::from_value(serde_json::json!({
            "slug": "frames-only",
            "walkthrough": {
                "kind": "array",
                "layout": {},
                "frames": [{"step": "s", "label": "l", "note": "n", "state": {}}],
                "code": {
                    "java": [{"text": "x", "step": "s", "explain": "why"}],
                    "cpp": [{"text": "x", "step": "s"}],
                    "pseudo": [{"text": "x", "step": "s"}]
                }
            },
            "variants": []
        }))
        .unwrap();
        assert!(!with_frames.is_foundation());
        // Variants without tests miss the judge payload even when practice
        // count and notes are present.
        with_frames.variants = serde_json::from_value(serde_json::json!([
            {"id": "a", "tests": [{"args": [], "expected": "1"}]},
            {"id": "b", "tests": [{"args": [], "expected": "1"}]},
            {"id": "c", "tests": []}
        ]))
        .unwrap();
        assert!(!with_frames.is_foundation());
    }
}
