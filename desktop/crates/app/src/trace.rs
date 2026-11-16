//! Native port of `plugin/host/trace.js`: the "your code vs the trace" probe.
//!
//! The tracer compiles the user's own method with tiny probe calls injected
//! at the top of each loop body and serializes the variables in scope into a
//! bounded event log (60 iterations). Anything the probe cannot handle —
//! missing method, unreadable parameters, unbraced loops, loopless methods,
//! unsupported first-test types, probe compile failure, timeouts, or empty
//! captures — declines with the same `trace: ...` message the web UI shows,
//! and the UI falls back to the reference walkthrough. A trace is never
//! fabricated.
//!
//! Faithful-port note: the reference C++ `__lcser` vector overload omits the
//! opening `[`, so its event lines do not parse as JSON and C++ traces that
//! capture a 1-D vector decline with `never reported state`. This port keeps
//! that behavior byte-for-byte (covered by the two-sum C++ golden case) so
//! Rust declines exactly where the web tracer declines.

use crate::judge;
use leetlab_core::Judge;
use std::fs;
#[cfg(test)]
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const MAX_EVENTS: usize = 60;
const COMPILE_TIMEOUT: Duration = Duration::from_secs(25);
const RUN_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, Clone)]
pub enum TraceOutcome {
    Traced {
        cpp: bool,
        events: Vec<serde_json::Value>,
        capped: bool,
        result: String,
    },
    Unavailable {
        error: String,
    },
}

const JAVA_TRACER_TEMPLATE: &str = r#"
class __LCTrace {
  static java.util.List<String> EVENTS = new java.util.ArrayList<>();
  static void event(String[] names, Object[] vals) {
    try {
      if (EVENTS.size() >= __MAXEVENTS__) return;
      StringBuilder sb = new StringBuilder("{");
      for (int k = 0; k < names.length; k++) {
        if (k > 0) sb.append(",");
        sb.append("\"").append(names[k]).append("\":").append(ser(vals[k]));
      }
      EVENTS.add(sb.append("}").toString());
    } catch (Throwable t) { /* tracing must never break user code */ }
  }
  static String ser(Object v) {
    try {
      if (v == null) return "null";
      if (v instanceof Integer || v instanceof Long || v instanceof Boolean) return String.valueOf(v);
      if (v instanceof Double || v instanceof Float) return String.valueOf(((Number) v).doubleValue());
      if (v instanceof Character) return "\"" + String.valueOf(v).replace("\"", "'") + "\"";
      if (v instanceof String) return "\"" + ((String) v).replace("\\", "\\\\").replace("\"", "'").replace("\n", " ") + "\"";
      if (v instanceof int[]) {
        int[] a = (int[]) v;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < Math.min(a.length, 40); i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
        return sb.append("]").toString();
      }
      if (v instanceof long[]) {
        long[] a = (long[]) v;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < Math.min(a.length, 40); i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
        return sb.append("]").toString();
      }
      if (v instanceof Object[]) {
        Object[] a = (Object[]) v;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < Math.min(a.length, 40); i++) { if (i > 0) sb.append(","); sb.append(ser(a[i])); }
        return sb.append("]").toString();
      }
      if (v instanceof java.util.Map) {
        StringBuilder sb = new StringBuilder("{");
        int n = 0;
        for (Object e : ((java.util.Map<?, ?>) v).entrySet()) {
          if (n++ >= 16) break;
          if (n > 1) sb.append(",");
          java.util.Map.Entry<?, ?> en = (java.util.Map.Entry<?, ?>) e;
          sb.append("\"").append(String.valueOf(en.getKey())).append("\":").append(ser(en.getValue()));
        }
        return sb.append("}").toString();
      }
      if (v instanceof java.util.Collection) {
        StringBuilder sb = new StringBuilder("[");
        int n = 0;
        for (Object item : (java.util.Collection<?>) v) {
          if (n++ >= 24) break;
          if (n > 1) sb.append(",");
          sb.append(ser(item));
        }
        return sb.append("]").toString();
      }
      return null;
    } catch (Throwable t) { return null; }
  }
}
"#;

const CPP_TRACER_TEMPLATE: &str = r#"
#include <sstream>
static std::vector<std::string> __lctrace_events;
static std::string __lcser(const char* name, int v) { return std::string("\"") + name + "\":" + std::to_string(v); }
static std::string __lcser(const char* name, long v) { return std::string("\"") + name + "\":" + std::to_string(v); }
static std::string __lcser(const char* name, long long v) { return std::string("\"") + name + "\":" + std::to_string(v); }
static std::string __lcser(const char* name, double v) { std::ostringstream o; o << v; return std::string("\"") + name + "\":" + o.str(); }
static std::string __lcser(const char* name, bool v) { return std::string("\"") + name + "\":" + (v ? "true" : "false"); }
static std::string __lcser(const char* name, char v) { return std::string("\"") + name + "\":" + std::to_string((int)v); }
static std::string __lcser(const char* name, const std::string& v) { return std::string("\"") + name + "\":\"" + v + "\""; }
// NOTE (faithful port): the reference tracer omits the opening bracket here,
// so vector<int> captures never parse as JSON and decline downstream.
static std::string __lcser(const char* name, const std::vector<int>& v) {
  std::string s = std::string("\"") + name + "\":";
  for (size_t i = 0; i < v.size() && i < 40; i++) { if (i) s += ","; s += std::to_string(v[i]); }
  return s + "]";
}
static std::string __lcser(const char* name, const std::vector<std::vector<int>>& v) {
  std::string s = std::string("\"") + name + "\":[";
  for (size_t i = 0; i < v.size() && i < 12; i++) {
    if (i) s += ",";
    s += "[";
    for (size_t k = 0; k < v[i].size() && k < 40; k++) { if (k) s += ","; s += std::to_string(v[i][k]); }
    s += "]";
  }
  return s + "]";
}
static std::string __lcser(const char* name, const std::unordered_map<int,int>& v) {
  std::string s = std::string("\"") + name + "\":{";
  size_t n = 0;
  for (auto& kv : v) { if (n++ >= 16) break; if (n > 1) s += ","; s += "\"" + std::to_string(kv.first) + "\":" + std::to_string(kv.second); }
  return s + "}";
}
template <class T> static std::string __lcser(const char*, const T&) { return ""; }
static void __lctrace_emit(std::initializer_list<std::string> parts) {
  if (__lctrace_events.size() >= __MAXEVENTS__) return;
  std::string s = "{";
  bool first = true;
  for (auto& p : parts) {
    if (p.empty()) continue;
    if (!first) s += ",";
    first = false;
    s += p;
  }
  __lctrace_events.push_back(s + "}");
}
"#;

fn java_tracer() -> String {
    JAVA_TRACER_TEMPLATE.replace("__MAXEVENTS__", &MAX_EVENTS.to_string())
}

fn cpp_tracer() -> String {
    CPP_TRACER_TEMPLATE.replace("__MAXEVENTS__", &MAX_EVENTS.to_string())
}

// ---------------------------------------------------------------------------
// Source scanners (hand-rolled equivalents of the trace.js matchers).
// ---------------------------------------------------------------------------

fn is_id_start(c: char) -> bool {
    c.is_ascii_alphabetic() || c == '_' || c == '$'
}

fn is_id_char(c: char) -> bool {
    is_id_start(c) || c.is_ascii_digit()
}

fn preceded_by_word_boundary(text: &str, index: usize) -> bool {
    index == 0 || !text[..index].ends_with(is_id_char)
}

fn followed_by_word_boundary(text: &str, end: usize) -> bool {
    text[end..].chars().next().is_none_or(|c| !is_id_char(c))
}

fn find_keyword(text: &str, from: usize, keyword: &str) -> Option<usize> {
    let mut search = from;
    while let Some(offset) = text[search..].find(keyword) {
        let index = search + offset;
        if preceded_by_word_boundary(text, index)
            && followed_by_word_boundary(text, index + keyword.len())
        {
            return Some(index);
        }
        search = index + 1;
    }
    None
}

fn skip_whitespace(text: &str, mut index: usize) -> usize {
    while text[index..].starts_with(|c: char| c.is_whitespace()) {
        index += 1;
    }
    index
}

fn match_parens(text: &str, open: usize) -> Option<(String, usize)> {
    if text[open..].starts_with('(') {
        let mut depth = 0usize;
        let mut quote = None;
        for (offset, ch) in text[open..].char_indices() {
            if let Some(q) = quote {
                if ch == '\\' {
                    continue;
                }
                if ch == q {
                    quote = None;
                }
                continue;
            }
            match ch {
                '"' | '\'' => quote = Some(ch),
                '(' => depth += 1,
                ')' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some((text[open + 1..open + offset].to_owned(), open + offset));
                    }
                }
                _ => {}
            }
            let _ = offset;
        }
    }
    None
}

/// Split on top-level commas; `<`/`>` nest like brackets (for generics).
fn split_header(text: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut depth = 0usize;
    let mut quote: Option<char> = None;
    let mut current = String::new();
    let mut chars = text.chars();
    while let Some(ch) = chars.next() {
        if let Some(q) = quote {
            current.push(ch);
            if ch == '\\' {
                if let Some(next) = chars.next() {
                    current.push(next);
                }
            } else if ch == q {
                quote = None;
            }
            continue;
        }
        match ch {
            '"' | '\'' => {
                quote = Some(ch);
                current.push(ch);
            }
            '(' | '[' | '{' | '<' => {
                depth += 1;
                current.push(ch);
            }
            ')' | ']' | '}' | '>' => {
                depth = depth.saturating_sub(1);
                current.push(ch);
            }
            ',' if depth == 0 => {
                if !current.trim().is_empty() {
                    parts.push(current.trim().to_owned());
                }
                current.clear();
            }
            _ => current.push(ch),
        }
    }
    if !current.trim().is_empty() {
        parts.push(current.trim().to_owned());
    }
    parts
}

fn ident_of(declaration: &str) -> String {
    let before_default = declaration.split('=').next().unwrap_or("").trim();
    let without_prefix = before_default
        .strip_prefix("final ")
        .or_else(|| before_default.strip_prefix("const "))
        .unwrap_or(before_default);
    let last = without_prefix.split_whitespace().last().unwrap_or("");
    let last = last.trim_end_matches(['*', '&']);
    let mut name = String::new();
    for ch in last.chars() {
        let keep = is_id_char(ch) && (!name.is_empty() || is_id_start(ch));
        if !keep {
            break;
        }
        name.push(ch);
    }
    if name.is_empty() {
        return String::new();
    }
    let rest = last[name.len()..].trim();
    if rest.is_empty()
        || rest
            .chars()
            .all(|c| c == '[' || c == ']' || c.is_whitespace())
    {
        name
    } else {
        String::new()
    }
}

fn is_type_keyword(name: &str) -> bool {
    matches!(
        name,
        "int"
            | "long"
            | "double"
            | "float"
            | "boolean"
            | "char"
            | "String"
            | "void"
            | "var"
            | "final"
            | "const"
    )
}

struct MethodLocation {
    params: String,
    brace: usize,
    end: usize,
}

/// Find `name(...)` + body. Mirrors the trace.js method matchers, including
/// Java `throws` clauses and C++ `const`/`noexcept` qualifiers.
fn find_method(source: &str, name: &str, cpp: bool) -> Option<MethodLocation> {
    let mut search = 0;
    while let Some(found) = find_keyword(source, search, name) {
        search = found + 1;
        let mut index = skip_whitespace(source, found + name.len());
        if !source[index..].starts_with('(') {
            continue;
        }
        let (params, close) = match_parens(source, index)?;
        index = skip_whitespace(source, close + 1);
        if !cpp && source[index..].starts_with("throws") {
            let after = skip_whitespace(source, index + "throws".len());
            let mut end = after;
            while end < source.len() && !source[end..].starts_with('{') {
                end += 1;
            }
            index = end;
        } else if cpp {
            loop {
                let word = if source[index..].starts_with("const") {
                    "const"
                } else if source[index..].starts_with("noexcept") {
                    "noexcept"
                } else {
                    break;
                };
                if !followed_by_word_boundary(source, index + word.len()) {
                    break;
                }
                index = skip_whitespace(source, index + word.len());
            }
        }
        if !source[index..].starts_with('{') {
            continue;
        }
        let mut depth = 0usize;
        for (offset, ch) in source[index..].char_indices() {
            match ch {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(MethodLocation {
                            params,
                            brace: index,
                            end: index + offset,
                        });
                    }
                }
                _ => {}
            }
        }
        return None;
    }
    None
}

fn param_names(params: &str) -> Vec<String> {
    split_header(params)
        .iter()
        .map(|part| ident_of(part))
        .filter(|name| !name.is_empty() && name != "void")
        .collect()
}

fn depth_before(body: &str) -> Vec<usize> {
    let mut depths = Vec::with_capacity(body.len());
    let mut depth = 0usize;
    for ch in body.chars() {
        depths.push(depth);
        match ch {
            '{' => depth += 1,
            '}' => depth = depth.saturating_sub(1),
            _ => {}
        }
    }
    depths
}

#[derive(Debug, Clone)]
struct Local {
    name: String,
    pos: usize,
}

fn match_type_token<'b>(body: &str, types: &[&'b str], index: usize) -> Option<&'b str> {
    if index > 0 && body[..index].ends_with(is_id_char) {
        return None;
    }
    let mut best: Option<&str> = None;
    for token in types {
        if body[index..].starts_with(token)
            && followed_by_word_boundary(body, index + token.len())
            && best.is_none_or(|current: &str| token.len() > current.len())
        {
            best = Some(token);
        }
    }
    best
}

fn skip_back_whitespace(body: &str, mut index: usize) -> usize {
    while index > 0 && body[..index].ends_with(|c: char| c.is_whitespace()) {
        index -= 1;
    }
    index
}

fn skip_back_word(body: &str, mut index: usize) -> usize {
    while index > 0 && body[..index].ends_with(is_id_char) {
        index -= 1;
    }
    index
}

/// Walk back over qualifiers (`final`, `Foo.`, `<...>` args, `[]`) the way the
/// reference declarator pattern does; true when a declaration may start here.
fn declaration_may_start(body: &str, mut index: usize) -> bool {
    for _ in 0..8 {
        index = skip_back_whitespace(body, index);
        if index == 0 {
            return true;
        }
        if body[..index].ends_with([';', '{', '}']) {
            return true;
        }
        for keyword in ["final", "const"] {
            if body[..index].ends_with(keyword)
                && !body[..index - keyword.len()].ends_with(is_id_char)
            {
                index -= keyword.len();
                // Retry the loop to re-check what precedes the keyword.
                index = skip_back_whitespace(body, index);
                if index == 0 || body[..index].ends_with([';', '{', '}']) {
                    return true;
                }
                // Fall through to the generic checks below for e.g. `Foo. final`.
                break;
            }
        }
        if body[..index].ends_with('.') {
            index = skip_back_word(body, index - 1);
            continue;
        }
        if body[..index].ends_with('>') {
            let mut depth = 0usize;
            let mut cursor = index - 1;
            loop {
                if body[..=cursor].ends_with('>') {
                    depth += 1;
                } else if body[..=cursor].ends_with('<') {
                    depth -= 1;
                    if depth == 0 {
                        index = cursor;
                        break;
                    }
                } else if body[..=cursor].ends_with([';', '{', '}']) {
                    return false;
                }
                if cursor == 0 {
                    return false;
                }
                cursor -= 1;
            }
            continue;
        }
        if body[..index].ends_with(']') {
            let mut depth = 0usize;
            let mut cursor = index - 1;
            loop {
                if body[..=cursor].ends_with(']') {
                    depth += 1;
                } else if body[..=cursor].ends_with('[') {
                    depth -= 1;
                    if depth == 0 {
                        index = cursor;
                        break;
                    }
                } else if body[..=cursor].ends_with([';', '{', '}']) {
                    return false;
                }
                if cursor == 0 {
                    return false;
                }
                cursor -= 1;
            }
            continue;
        }
        return false;
    }
    false
}

fn statement_end(body: &str, from: usize) -> usize {
    let mut depth = 0usize;
    let mut quote: Option<char> = None;
    let bytes = body.as_bytes();
    let mut index = from;
    while index < body.len() {
        let ch = bytes[index] as char;
        if let Some(q) = quote {
            if ch == '\\' {
                index += 2;
                continue;
            }
            if ch == q {
                quote = None;
            }
            index += 1;
            continue;
        }
        match ch {
            '"' | '\'' => quote = Some(ch),
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth = depth.saturating_sub(1),
            _ => {}
        }
        if (ch == ';' || ch == '{' || ch == '}') && depth == 0 {
            return index;
        }
        index += 1;
    }
    body.len()
}

fn top_level_locals(body: &str, types: &[&str], lookahead: &[char], cpp: bool) -> Vec<Local> {
    let before = depth_before(body);
    let mut out = Vec::new();
    let mut seen = std::collections::BTreeSet::new();
    let mut index = 0;
    while index < body.len() {
        let Some(token) = match_type_token(body, types, index) else {
            index += 1;
            continue;
        };
        let token_end = index + token.len();
        // Forward shape: optional `<...>` (no ;{} inside), optional `[]`,
        // declarator identifier, then a declarator lookahead char.
        let mut cursor = skip_whitespace(body, token_end);
        if body[cursor..].starts_with('<') {
            let mut depth = 0usize;
            let mut closed = false;
            let mut scan = cursor;
            while scan < body.len() {
                let ch = body[scan..].chars().next().unwrap();
                if ch == '<' {
                    depth += 1;
                } else if ch == '>' {
                    depth -= 1;
                    if depth == 0 {
                        cursor = scan + 1;
                        closed = true;
                        break;
                    }
                } else if [';', '{', '}'].contains(&ch) {
                    break;
                }
                scan += ch.len_utf8();
            }
            if !closed {
                index += 1;
                continue;
            }
            cursor = skip_whitespace(body, cursor);
        }
        while body[cursor..].starts_with('[') {
            cursor = skip_whitespace(body, cursor + 1);
            if body[cursor..].starts_with(']') {
                cursor = skip_whitespace(body, cursor + 1);
            } else {
                break;
            }
        }
        let name_start = cursor;
        while body[cursor..].chars().next().is_some_and(is_id_char) {
            cursor += 1;
        }
        let name = body[name_start..cursor].to_owned();
        let after = skip_whitespace(body, cursor);
        let next = after < body.len() && body[after..].starts_with(lookahead);
        if name.is_empty()
            || !is_id_start(name.chars().next().unwrap())
            || !next
            || before.get(index).copied().unwrap_or(0) != 0
            || !declaration_may_start(body, index)
        {
            index += 1;
            continue;
        }
        // Multi-declarator lists (`int lo = 0, hi = 0`) yield every name.
        let end = statement_end(body, index);
        for part in split_header(&body[index..end].replace(';', "")) {
            let part = part.trim();
            if part.is_empty()
                || part
                    .chars()
                    .all(|c| "<>{}[]()".contains(c) || c.is_whitespace())
            {
                continue;
            }
            let mut candidate = part;
            if cpp {
                candidate = candidate.split(':').next_back().unwrap_or(candidate);
            }
            let id = ident_of(candidate);
            if id.is_empty() || seen.contains(&id) || is_type_keyword(&id) {
                continue;
            }
            seen.insert(id.clone());
            out.push(Local {
                name: id,
                pos: index,
            });
        }
        index = end.max(index + 1);
    }
    out
}

const JAVA_LOCAL_TYPES: &[&str] = &[
    "int",
    "long",
    "double",
    "boolean",
    "char",
    "String",
    "Map",
    "HashMap",
    "Set",
    "HashSet",
    "List",
    "ArrayList",
    "Deque",
    "ArrayDeque",
];

const CPP_LOCAL_TYPES: &[&str] = &[
    "int",
    "long",
    "double",
    "bool",
    "char",
    "string",
    "std::string",
    "vector",
    "unordered_map",
    "map",
    "unordered_set",
    "set",
    "deque",
    "queue",
    "stack",
    "priority_queue",
];

#[derive(Debug, Clone)]
struct LoopSite {
    index: usize,
    loop_var: String,
}

fn loop_sites(body: &str, cpp: bool) -> (Vec<LoopSite>, bool) {
    let mut sites = Vec::new();
    let mut saw_unbraced = false;
    let mut search = 0;
    while search < body.len() {
        let next_for = find_keyword(body, search, "for");
        let next_while = find_keyword(body, search, "while");
        let found = match (next_for, next_while) {
            (Some(a), Some(b)) => Some(if a < b { ("for", a) } else { ("while", b) }),
            (Some(a), None) => Some(("for", a)),
            (None, Some(b)) => Some(("while", b)),
            (None, None) => None,
        };
        let Some((kind, at)) = found else {
            break;
        };
        search = at + 1;
        let paren = skip_whitespace(body, at + kind.len());
        if !body[paren..].starts_with('(') {
            continue;
        }
        let Some((header, close)) = match_parens(body, paren) else {
            continue;
        };
        let rest = skip_whitespace(body, close + 1);
        if !body[rest..].starts_with('{') {
            saw_unbraced = true;
            continue;
        }
        let brace_index = rest + 1;
        let mut loop_var = String::new();
        if kind == "for" {
            let init = split_header(&header).into_iter().next().unwrap_or_default();
            let classic = if cpp {
                regex_like_init(&init, &["int", "long", "size_t"])
            } else {
                regex_like_init(&init, &["int", "long"])
            };
            if let Some(var) = classic {
                loop_var = var;
            } else if let Some(var) = enhanced_for_var(&init) {
                let excluded = ["return", "if", "for", "while"];
                if cpp && excluded.contains(&var.as_str()) {
                    // C++ enhanced loop over a keyword-looking name: not a var.
                } else if !cpp || !excluded.contains(&var.as_str()) {
                    loop_var = var;
                }
            }
        }
        sites.push(LoopSite {
            index: brace_index,
            loop_var,
        });
        if sites.len() >= 12 {
            break;
        }
    }
    (sites, saw_unbraced)
}

/// `^\s*(?:final\s+)?(int|long)\s+([A-Za-z_$][\w$]*)` on a for-init clause.
fn regex_like_init(init: &str, types: &[&str]) -> Option<String> {
    let mut text = init.trim_start();
    if let Some(rest) = text.strip_prefix("final") {
        if rest.starts_with(|c: char| c.is_whitespace()) {
            text = rest.trim_start();
        }
    }
    for token in types {
        if let Some(rest) = text.strip_prefix(token) {
            if rest.starts_with(is_id_char) {
                continue;
            }
            let rest = rest.trim_start();
            let mut name = String::new();
            for ch in rest.chars() {
                if name.is_empty() && is_id_start(ch) || !name.is_empty() && is_id_char(ch) {
                    name.push(ch);
                } else {
                    break;
                }
            }
            if !name.is_empty() {
                return Some(name);
            }
        }
    }
    None
}

/// `... var :` enhanced-for element name: last identifier before a top-level
/// colon, skipping `final`/`const` prefixes.
fn enhanced_for_var(init: &str) -> Option<String> {
    let mut depth = 0usize;
    let mut quote: Option<char> = None;
    let mut colon = None;
    for (offset, ch) in init.char_indices() {
        if let Some(q) = quote {
            if ch == '\\' {
                continue;
            }
            if ch == q {
                quote = None;
            }
            continue;
        }
        match ch {
            '"' | '\'' => quote = Some(ch),
            '(' | '[' | '{' | '<' => depth += 1,
            ')' | ']' | '}' | '>' => depth = depth.saturating_sub(1),
            ':' if depth == 0 => {
                colon = Some(offset);
                break;
            }
            _ => {}
        }
    }
    let head = init[..colon?].trim();
    let mut candidate = head
        .strip_prefix("final")
        .filter(|rest| rest.starts_with(|c: char| c.is_whitespace()))
        .unwrap_or(head);
    candidate = candidate
        .strip_prefix("const")
        .filter(|rest| rest.starts_with(|c: char| c.is_whitespace()))
        .unwrap_or(candidate);
    let last = candidate.split_whitespace().last()?;
    let name: String = last
        .trim_end_matches(['*', '&'])
        .chars()
        .take_while(|c| is_id_char(*c))
        .collect();
    if name.is_empty() || !is_id_start(name.chars().next().unwrap()) {
        return None;
    }
    Some(name)
}

// ---------------------------------------------------------------------------
// Trace literals (subset of judge literals the probe can serialize).
// ---------------------------------------------------------------------------

fn java_trace_literal(raw: &str, kind: &str) -> Option<String> {
    use serde_json::Value;
    let value = judge::parse_literal(raw);
    let number = |v: &Value| {
        let n = judge::num(v);
        if n.is_finite() {
            n.trunc() as i64
        } else {
            0
        }
    };
    let quote = |v: &Value| -> String {
        let text = match v {
            Value::Null => String::new(),
            Value::Bool(b) => b.to_string(),
            Value::Number(n) => n.to_string(),
            Value::String(s) => s.clone(),
            _ => String::new(),
        };
        serde_json::to_string(&text).unwrap_or_else(|_| "\"\"".into())
    };
    let items = |v: &Value| match v {
        Value::Array(items) => items.clone(),
        _ => Vec::new(),
    };
    let java_char = |v: &Value| {
        let text = match v {
            Value::Null => String::new(),
            Value::Bool(b) => b.to_string(),
            Value::Number(n) => n.to_string(),
            Value::String(s) => s.clone(),
            _ => String::new(),
        };
        // Mirror the reference escaping for backslash/quote carriers.
        match text.chars().next().unwrap_or(' ') {
            '\\' => "'\\\\'".to_owned(),
            '\'' => "'\\''".to_owned(),
            raw => format!("'{raw}'"),
        }
    };
    Some(match kind {
        "int" => number(&value).to_string(),
        "long" => format!("{}L", number(&value)),
        "double" => (judge::num(&value)).to_string(),
        "boolean" => {
            if value == Value::Bool(true) {
                "true".into()
            } else {
                "false".into()
            }
        }
        "string" => quote(&value),
        "char" => java_char(&value),
        "int[]" => format!(
            "new int[]{{{}}}",
            items(&value)
                .iter()
                .map(|item| number(item).to_string())
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "int[][]" => format!(
            "new int[][]{{{}}}",
            items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    items(row)
                        .iter()
                        .map(|item| number(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "char[][]" => format!(
            "new char[][]{{{}}}",
            items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    items(row)
                        .iter()
                        .map(java_char)
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "string[]" => format!(
            "new String[]{{{}}}",
            items(&value)
                .iter()
                .map(quote)
                .collect::<Vec<_>>()
                .join(", ")
        ),
        _ => return None,
    })
}

// ---------------------------------------------------------------------------
// Drivers.
// ---------------------------------------------------------------------------

fn scoped_names(
    params: &[String],
    locals: &[Local],
    site_index: usize,
    loop_var: &str,
) -> Vec<String> {
    let param_set: std::collections::BTreeSet<&str> = params.iter().map(String::as_str).collect();
    let mut names: Vec<String> = params.to_vec();
    for local in locals {
        if !names.contains(&local.name) {
            names.push(local.name.clone());
        }
    }
    let scoped: Vec<String> = names
        .into_iter()
        .filter(|name| {
            param_set.contains(name.as_str())
                || locals
                    .iter()
                    .any(|local| &local.name == name && local.pos < site_index)
        })
        .collect();
    if !loop_var.is_empty() && !scoped.contains(&loop_var.to_owned()) {
        let mut scoped = scoped;
        scoped.push(loop_var.to_owned());
        scoped
    } else {
        scoped
    }
}

fn java_call(loop_var: &str, site_index: usize, params: &[String], locals: &[Local]) -> String {
    let all = scoped_names(params, locals, site_index, loop_var);
    format!(
        "\n__LCTrace.event(new String[]{{{}}}, new Object[]{{{}}});",
        all.iter()
            .map(|name| format!("\"{name}\""))
            .collect::<Vec<_>>()
            .join(","),
        all.join(",")
    )
}

fn cpp_call(loop_var: &str, site_index: usize, params: &[String], locals: &[Local]) -> String {
    let all = scoped_names(params, locals, site_index, loop_var);
    format!(
        "\n__lctrace_emit({{{}}});",
        all.iter()
            .map(|name| format!("__lcser(\"{name}\",{name})"))
            .collect::<Vec<_>>()
            .join(",")
    )
}

fn is_garbage_result(result: &str) -> bool {
    // Mirrors /^[[A-Za-z]*@[0-9a-f]+$/: a default Object.toString, not a value.
    let text = result.trim();
    if !text.starts_with('[') {
        return false;
    }
    let Some(at) = text.find('@') else {
        return false;
    };
    let head = &text[1..at];
    let tail = &text[at + 1..];
    !tail.is_empty()
        && head.chars().all(|c| c.is_ascii_alphabetic())
        && tail.chars().all(|c| c.is_ascii_hexdigit())
}

fn parse_trace_events(stdout: &str) -> Option<Vec<serde_json::Value>> {
    let lines: Vec<&str> = stdout.split(['\r', '\n']).collect();
    let mut begin = None;
    let mut end = None;
    for (index, line) in lines.iter().enumerate() {
        if line.trim() == "@@TRACE_BEGIN" {
            begin = Some(index);
        } else if line.trim() == "@@TRACE_END" {
            end = Some(index);
        }
    }
    let (begin, end) = (begin?, end?);
    if end <= begin {
        return None;
    }
    let mut events = Vec::new();
    for line in &lines[begin + 1..end] {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
            events.push(value);
        }
    }
    Some(events)
}

fn trace_java(spec: &Judge, code: &str, cancel: &AtomicBool) -> TraceOutcome {
    let bare = judge::strip_comments(code);
    let Some(found) = find_method(&bare, &spec.signature.name, false) else {
        return TraceOutcome::Unavailable {
            error: format!(
                "trace: could not find method {} in your code",
                spec.signature.name
            ),
        };
    };
    let params = param_names(&found.params);
    if params.is_empty() && !spec.signature.params.is_empty() {
        return TraceOutcome::Unavailable {
            error: "trace: could not read your parameter names".into(),
        };
    }
    let body = &bare[found.brace + 1..found.end];
    let locals = top_level_locals(body, JAVA_LOCAL_TYPES, &['=', ';', ',', ')'], false);
    let (sites, saw_unbraced) = loop_sites(body, false);
    if sites.is_empty() {
        return TraceOutcome::Unavailable {
            error: if saw_unbraced {
                "trace: only for/while loops with braced bodies { } can be stepped through — wrap the loop body in braces and retry".into()
            } else {
                "trace: no loops found — there is nothing to step through".into()
            },
        };
    }
    // Only names declared strictly before the injection site are in scope.
    let mut instrumented = body.to_owned();
    let mut ordered: Vec<&LoopSite> = sites.iter().collect();
    ordered.sort_by(|a, b| b.index.cmp(&a.index));
    for site in ordered {
        let call = java_call(&site.loop_var, site.index, &params, &locals);
        instrumented = format!(
            "{}{odef}{}",
            &instrumented[..site.index.min(instrumented.len())],
            &instrumented[site.index.min(instrumented.len())..],
            odef = call
        );
    }
    let test = match spec.tests.first() {
        Some(test) => test,
        None => {
            return TraceOutcome::Unavailable {
                error: "trace: problem has no tests".into(),
            }
        }
    };
    let mut args = Vec::new();
    for (position, raw) in test.args.iter().enumerate() {
        let kind = spec
            .signature
            .params
            .get(position)
            .map(|parameter| parameter.value_type.as_str())
            .unwrap_or("int");
        match java_trace_literal(raw, kind) {
            Some(literal) => args.push(literal),
            None => {
                return TraceOutcome::Unavailable {
                    error: "trace: first test uses types this probe does not capture yet".into(),
                }
            }
        }
    }
    let call = format!("__s.{}({})", spec.signature.name, args.join(", "));
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);
    // The head keeps the opening brace and the tail keeps the closing one;
    // indices come from the comment-stripped body exactly like the reference.
    let source = format!(
        "import java.util.*;\nimport java.io.*;\n\n{code_head}{instrumented}{code_tail}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n    Solution __s = new Solution();\n    try {{ System.out.println(\"@@CALL \" + __H.__out({call})); }} catch (Throwable __t) {{ System.out.println(\"@@CALLERR \" + __t.getClass().getSimpleName()); }}\n    System.out.println(\"@@TRACE_BEGIN\");\n    for (String __e : __LCTrace.EVENTS) System.out.println(__e);\n    System.out.println(\"@@TRACE_END\");\n  }}\n}}\n{tracer}\nclass __H {{\n  static String __out(Object v) {{ return String.valueOf(v); }}\n}}\n",
        code_head = &code[..(found.brace + 1).min(code.len())],
        code_tail = &code[found.end.min(code.len())..],
        tracer = java_tracer(),
    );
    let dir = std::env::temp_dir().join(format!("leetlab-trace-{}-{nonce}", std::process::id()));
    if let Err(error) = fs::create_dir(&dir) {
        return TraceOutcome::Unavailable {
            error: format!("trace: could not create a run directory: {error}"),
        };
    }
    let tools = match crate::toolchain::java_toolchain() {
        Ok((javac, java)) => (javac, java),
        Err(error) => return TraceOutcome::Unavailable { error },
    };
    let outcome = (|| {
        fs::write(dir.join("Main.java"), &source).map_err(|error| error.to_string())?;
        let compile = judge::execute(
            &tools.0,
            &["-encoding", "UTF-8", "Main.java"],
            &dir,
            COMPILE_TIMEOUT,
            cancel,
        )
        .map_err(|error| {
            if error == "cancelled" {
                "cancelled".to_owned()
            } else {
                format!("trace: could not launch javac: {error}")
            }
        })?;
        if compile.code != Some(0) {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: your code with probes did not compile for tracing (the judge itself is unaffected)".into(),
            });
        }
        let run = judge::execute(&tools.1, &["-cp", ".", "Main"], &dir, RUN_TIMEOUT, cancel)
            .map_err(|error| {
                if error == "cancelled" {
                    "cancelled".to_owned()
                } else {
                    format!("trace: could not launch java: {error}")
                }
            })?;
        if run.timed_out {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: run timed out".into(),
            });
        }
        let Some(events) = parse_trace_events(&run.stdout) else {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: no probe output captured".into(),
            });
        };
        if events.is_empty() {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: your loops never reported state (nothing captured)".into(),
            });
        }
        let call_line = run
            .stdout
            .split(['\r', '\n'])
            .map(str::trim)
            .find(|line| line.starts_with("@@CALL"))
            .unwrap_or("");
        let mut result = call_line
            .strip_prefix("@@CALL")
            .unwrap_or("")
            .trim()
            .to_owned();
        if is_garbage_result(&result) {
            result = "(returned — run the judge for the exact value)".into();
        }
        Ok(TraceOutcome::Traced {
            cpp: false,
            capped: events.len() >= MAX_EVENTS,
            events,
            result,
        })
    })();
    let _ = fs::remove_dir_all(&dir);
    match outcome {
        Ok(outcome) => outcome,
        Err(error) if error == "cancelled" => TraceOutcome::Unavailable {
            error: "cancelled".into(),
        },
        Err(error) => TraceOutcome::Unavailable { error },
    }
}

fn trace_cpp(spec: &Judge, code: &str, cancel: &AtomicBool) -> TraceOutcome {
    let bare = judge::strip_comments(code);
    let Some(found) = find_method(&bare, &spec.signature.name, true) else {
        return TraceOutcome::Unavailable {
            error: format!(
                "trace: could not find method {} in your code",
                spec.signature.name
            ),
        };
    };
    let body = &bare[found.brace + 1..found.end];
    let params = param_names(&found.params);
    let locals = top_level_locals(body, CPP_LOCAL_TYPES, &['=', ';', ',', ')', ']', ':'], true);
    // The reference bridge only probes capturable scalar/string/vector names;
    // the compiler is the backstop, like the JS fallback.
    let (sites, _) = loop_sites(body, true);
    if sites.is_empty() {
        return TraceOutcome::Unavailable {
            error: "trace: no braced loops found — there is nothing to step through".into(),
        };
    }
    let mut instrumented = body.to_owned();
    let mut ordered: Vec<&LoopSite> = sites.iter().collect();
    ordered.sort_by(|a, b| b.index.cmp(&a.index));
    for site in ordered {
        let call = cpp_call(&site.loop_var, site.index, &params, &locals);
        instrumented = format!(
            "{}{odef}{}",
            &instrumented[..site.index.min(instrumented.len())],
            &instrumented[site.index.min(instrumented.len())..],
            odef = call
        );
    }
    let test = match spec.tests.first() {
        Some(test) => test,
        None => {
            return TraceOutcome::Unavailable {
                error: "trace: problem has no tests".into(),
            }
        }
    };
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_nanos())
        .unwrap_or(0);
    let marker = format!("@@LC_{nonce}");
    let single = Judge {
        mode: "exact".into(),
        signature: leetlab_core::Signature {
            name: spec.signature.name.clone(),
            params: spec.signature.params.clone(),
            return_type: spec.signature.return_type.clone(),
        },
        tests: vec![test.clone()],
        helpers: None,
        mutates: None,
        sequences: None,
        validate: None,
    };
    let patched = format!(
        "{}{}{}",
        &code[..(found.brace + 1).min(code.len())],
        instrumented,
        &code[found.end.min(code.len())..]
    );
    let mut harness = match judge::build_cpp_source(&single, &patched, &marker) {
        Ok(harness) => harness,
        Err(_) => {
            return TraceOutcome::Unavailable {
                error: "trace: could not build a harness for this signature".into(),
            }
        }
    };
    // Splice trace printing into main like the reference bridge.
    if !harness.contains("  return 0;") {
        return TraceOutcome::Unavailable {
            error: "trace: could not build a harness for this signature".into(),
        };
    }
    harness = harness.replacen(
        "  return 0;",
        "  std::cout << \"@@TRACE_BEGIN\" << std::endl;\n  for (auto& e : __lctrace_events) std::cout << e << std::endl;\n  std::cout << \"@@TRACE_END\" << std::endl;\n  return 0;",
        1,
    );
    let source = format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n{tracer}\n{}",
        harness.replacen("#include <bits/stdc++.h>", "", 1),
        tracer = cpp_tracer(),
    );
    let dir = std::env::temp_dir().join(format!("leetlab-trace-{}-{nonce}", std::process::id()));
    if let Err(error) = fs::create_dir(&dir) {
        return TraceOutcome::Unavailable {
            error: format!("trace: could not create a run directory: {error}"),
        };
    }
    let cxx = match crate::toolchain::cxx_toolchain() {
        Ok(cxx) => cxx,
        Err(error) => return TraceOutcome::Unavailable { error },
    };
    let outcome = (|| {
        fs::write(dir.join("main.cpp"), &source).map_err(|error| error.to_string())?;
        let compile = judge::execute(
            &cxx,
            &[
                "-std=gnu++20",
                "-O2",
                "-static",
                "-o",
                "main.exe",
                "main.cpp",
            ],
            &dir,
            COMPILE_TIMEOUT,
            cancel,
        )
        .map_err(|error| {
            if error == "cancelled" {
                "cancelled".to_owned()
            } else {
                format!("trace: could not launch g++: {error}")
            }
        })?;
        if compile.code != Some(0) {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: your C++ code with probes did not compile for tracing (the judge itself is unaffected)".into(),
            });
        }
        let run = judge::execute(&dir.join("main.exe"), &[], &dir, RUN_TIMEOUT, cancel).map_err(
            |error| {
                if error == "cancelled" {
                    "cancelled".to_owned()
                } else {
                    format!("trace: could not launch the traced program: {error}")
                }
            },
        )?;
        if run.timed_out {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: run timed out".into(),
            });
        }
        let Some(events) = parse_trace_events(&run.stdout) else {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: no probe output captured".into(),
            });
        };
        if events.is_empty() {
            return Ok(TraceOutcome::Unavailable {
                error: "trace: your loops never reported state (nothing captured)".into(),
            });
        }
        Ok(TraceOutcome::Traced {
            cpp: true,
            capped: events.len() >= MAX_EVENTS,
            events,
            result: String::new(),
        })
    })();
    let _ = fs::remove_dir_all(&dir);
    match outcome {
        Ok(outcome) => outcome,
        Err(error) if error == "cancelled" => TraceOutcome::Unavailable {
            error: "cancelled".into(),
        },
        Err(error) => TraceOutcome::Unavailable { error },
    }
}

/// Run the trace probe over the first judge test. Guards mirror
/// `traceProblem`: no spec or empty code decline without compiling.
pub fn trace_problem(
    spec: Option<&Judge>,
    cpp: bool,
    code: &str,
    cancel: &AtomicBool,
) -> TraceOutcome {
    let Some(spec) = spec else {
        return TraceOutcome::Unavailable {
            error: "no judge spec for this problem".into(),
        };
    };
    if code.trim().is_empty() {
        return TraceOutcome::Unavailable {
            error: "empty solution".into(),
        };
    }
    if cancel.load(Ordering::Relaxed) {
        return TraceOutcome::Unavailable {
            error: "cancelled".into(),
        };
    }
    if cpp {
        trace_cpp(spec, code, cancel)
    } else {
        trace_java(spec, code, cancel)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn judge_from_json(value: serde_json::Value) -> Judge {
        serde_json::from_value(value).unwrap()
    }

    #[test]
    fn loop_sites_find_braced_loops_with_vars() {
        let body = "int s = 0; for (int i = 0; i < n; i++) { s += i; } while (s < 0) { s++; } x();";
        let (sites, unbraced) = loop_sites(body, false);
        assert!(!unbraced);
        assert_eq!(sites.len(), 2);
        assert_eq!(sites[0].loop_var, "i");
        assert_eq!(sites[1].loop_var, "");
        let body = "while (x > 0) x--;";
        let (sites, unbraced) = loop_sites(body, false);
        assert!(sites.is_empty());
        assert!(unbraced);
    }

    #[test]
    fn locals_cover_multi_declarators_and_skip_nested() {
        let body =
            "int lo = 0, hi = 9; for (int i = 0; i < 3; i++) { int inner = i; } String s = \"x\";";
        let locals = top_level_locals(body, JAVA_LOCAL_TYPES, &['=', ';', ',', ')'], false);
        let names: Vec<_> = locals.iter().map(|local| local.name.as_str()).collect();
        assert!(names.contains(&"lo"));
        assert!(names.contains(&"hi"));
        assert!(names.contains(&"s"));
        assert!(!names.contains(&"inner"));
        assert!(!names.contains(&"i"));
    }

    #[test]
    fn trace_literal_subset_matches_reference() {
        assert_eq!(
            java_trace_literal("[2,7,11,15]", "int[]").unwrap(),
            "new int[]{2, 7, 11, 15}"
        );
        assert_eq!(java_trace_literal("hit", "string").unwrap(), "\"hit\"");
        assert!(java_trace_literal("[1,2]", "ListNode").is_none());
        assert!(java_trace_literal("1", "TreeNode").is_none());
    }

    #[test]
    fn garbage_result_detection_matches_reference_shape() {
        assert!(is_garbage_result("[I@2f92e0f4"));
        // The reference class only matches letters before @, so qualified
        // array names fall through on both sides — printed raw like the web.
        assert!(!is_garbage_result("[Ljava.lang.String;@6d06d69c"));
        assert!(!is_garbage_result("[0,1]"));
        assert!(!is_garbage_result("42"));
    }

    #[test]
    #[ignore = "needs javac, java and g++ on PATH plus desktop/target/trace-golden.json"]
    fn traces_match_the_js_golden() {
        let golden: serde_json::Value = serde_json::from_slice(
            &fs::read(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target/trace-golden.json"))
                .unwrap(),
        )
        .unwrap();
        let catalog =
            leetlab_core::Catalog::open(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.."))
                .unwrap();
        let idle = AtomicBool::new(false);
        for case in golden["cases"].as_array().unwrap() {
            let slug = case["slug"].as_str().unwrap();
            let cpp = case["lang"].as_str().unwrap() == "cpp";
            let problem = catalog.problem(slug).unwrap();
            let refs: serde_json::Value = serde_json::from_slice(
                &fs::read(
                    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target/parity-refs.json"),
                )
                .unwrap(),
            )
            .unwrap();
            let code = refs["refs"]
                .as_array()
                .unwrap()
                .iter()
                .find(|entry| {
                    entry["slug"].as_str() == Some(slug)
                        && (entry["lang"].as_str().unwrap() == "cpp") == cpp
                })
                .unwrap()["code"]
                .as_str()
                .unwrap()
                .to_owned();
            let outcome = trace_problem(problem.judge.as_ref(), cpp, &code, &idle);
            match (case["ok"].as_bool().unwrap(), outcome) {
                (
                    true,
                    TraceOutcome::Traced {
                        events,
                        capped,
                        result,
                        ..
                    },
                ) => {
                    assert_eq!(
                        events,
                        *case["events"].as_array().unwrap(),
                        "{slug} {} events",
                        if cpp { "cpp" } else { "java" }
                    );
                    assert_eq!(capped, case["capped"].as_bool().unwrap());
                    assert_eq!(result, case["result"].as_str().unwrap_or(""));
                }
                (false, TraceOutcome::Unavailable { error }) => {
                    assert_eq!(error, case["error"].as_str().unwrap(), "{slug}");
                }
                (expected, got) => panic!("{slug} divergence: golden ok={expected}, got {got:?}"),
            }
        }
    }

    #[test]
    #[ignore = "needs javac and java on PATH"]
    fn declines_cover_the_reference_taxonomy() {
        let idle = AtomicBool::new(false);
        assert!(matches!(
            trace_problem(None, false, "class Solution {}", &idle),
            TraceOutcome::Unavailable { .. }
        ));
        assert!(matches!(
            trace_problem(
                Some(&judge_from_json(serde_json::json!({
                    "mode": "exact",
                    "signature": {"name": "m", "params": [], "return": "int"},
                    "tests": [{"args": [], "expected": "1", "example": 1}],
                }))),
                false,
                "   ",
                &idle
            ),
            TraceOutcome::Unavailable { error } if error == "empty solution"
        ));
        let no_loops = judge_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "answer", "params": [], "return": "int"},
            "tests": [{"args": [], "expected": "42", "example": 1}],
        }));
        assert!(matches!(
            trace_problem(
                Some(&no_loops),
                false,
                "class Solution { int answer() { return 42; } }",
                &idle
            ),
            TraceOutcome::Unavailable { error } if error.contains("no loops found")
        ));
        let unbraced = judge_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "down", "params": [{"name": "x", "type": "int"}], "return": "int"},
            "tests": [{"args": ["3"], "expected": "0", "example": 1}],
        }));
        assert!(matches!(
            trace_problem(
                Some(&unbraced),
                false,
                "class Solution { int down(int x) { while (x > 0) x--; return x; } }",
                &idle
            ),
            TraceOutcome::Unavailable { error } if error.contains("braced bodies")
        ));
        let catalog =
            leetlab_core::Catalog::open(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.."))
                .unwrap();
        let add = catalog.problem("add-two-numbers").unwrap();
        let refs: serde_json::Value = serde_json::from_slice(
            &fs::read(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target/parity-refs.json"))
                .unwrap(),
        )
        .unwrap();
        let code = refs["refs"]
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| {
                entry["slug"].as_str() == Some("add-two-numbers")
                    && entry["lang"].as_str() == Some("java")
            })
            .unwrap()["code"]
            .as_str()
            .unwrap()
            .to_owned();
        assert!(matches!(
            trace_problem(add.judge.as_ref(), false, &code, &idle),
            TraceOutcome::Unavailable { error } if error.contains("does not capture yet")
        ));
    }
}
