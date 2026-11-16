//! Native judge port of `plugin/host/judge.js`.
//!
//! Coverage target: the full judge surface used by the curriculum — every type in
//! `CONTRACTS.md` (`int`, `long`, `double`, `boolean`, `string`, `char`, the array
//! and 2D-array forms, `ListNode`, `TreeNode`, plus `void` returns) in `exact`,
//! `unordered`, `float` and `any` modes. `any` degrades to an exact comparison,
//! matching the JavaScript reference.
//!
//! Execution boundary: one isolated temp directory per run, bounded output and
//! time, cancellation through a shared atomic flag. Process-tree cleanup is
//! best-effort (direct child kill plus `taskkill /T` on Windows and `pkill -P`
//! on Unix where available); this is documented, not a sandbox.

use leetlab_core::Judge;
use leetlab_core::{SeqArg, SeqCall, SequenceCase};
use std::fmt::Write as _;
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

static NEXT_RUN: AtomicU64 = AtomicU64::new(0);

pub const COMPILE_TIMEOUT: Duration = Duration::from_secs(25);
pub const RUN_TIMEOUT: Duration = Duration::from_secs(8);
pub const MAX_OUTPUT: usize = 200_000;

const PARAM_TYPES: &[&str] = &[
    "int",
    "long",
    "double",
    "float",
    "boolean",
    "string",
    "char",
    "int[]",
    "long[]",
    "double[]",
    "boolean[]",
    "string[]",
    "char[]",
    "int[][]",
    "char[][]",
    "string[][]",
    "List<String>",
    "ListNode",
    "ListNode[]",
    "TreeNode",
    "interval[]",
    "Node",
    "GraphNode",
];

fn supported_mode(mode: &str) -> bool {
    matches!(mode, "exact" | "unordered" | "float" | "any" | "graph")
}

pub fn supported(spec: &Judge) -> bool {
    let sequences = spec.sequences.as_ref().is_some_and(|s| !s.is_empty());
    let mutates = spec.mutates.as_ref().is_some_and(|m| !m.is_empty());
    if mutates && spec.signature.return_type != "void" {
        return false;
    }
    supported_mode(&spec.mode)
        && (spec.signature.return_type == "void"
            || PARAM_TYPES.contains(&spec.signature.return_type.as_str()))
        && (!spec.tests.is_empty() || sequences)
        && spec
            .signature
            .params
            .iter()
            .all(|parameter| PARAM_TYPES.contains(&parameter.value_type.as_str()))
}

// ---------------------------------------------------------------------------
// Literal parsing (port of `parseLiteral` + `splitTopLevel` in judge.js).
// ---------------------------------------------------------------------------

fn split_top_level(text: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut depth = 0usize;
    let mut quote: Option<char> = None;
    let mut current = String::new();
    let mut chars = text.chars().peekable();
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
        if ch == '"' || ch == '\'' {
            quote = Some(ch);
            current.push(ch);
            continue;
        }
        if ch == '[' || ch == '{' || ch == '(' {
            depth += 1;
        }
        if ch == ']' || ch == '}' || ch == ')' {
            depth = depth.saturating_sub(1);
        }
        if ch == ',' && depth == 0 {
            if !current.trim().is_empty() {
                parts.push(current.trim().to_owned());
            }
            current.clear();
            continue;
        }
        current.push(ch);
    }
    if !current.trim().is_empty() {
        parts.push(current.trim().to_owned());
    }
    parts
}

fn unescape_quoted(inner: &str) -> String {
    let mut out = String::with_capacity(inner.len());
    let mut chars = inner.chars();
    while let Some(ch) = chars.next() {
        if ch == '\\' {
            match chars.next() {
                Some('n') => out.push('\n'),
                Some('t') => out.push('\t'),
                Some(other) => out.push(other),
                None => out.push('\\'),
            }
        } else {
            out.push(ch);
        }
    }
    out
}

/// Split a top-level `key: value` pair, respecting nesting and quotes.
fn split_key_value(text: &str) -> Option<(&str, &str)> {
    let mut depth = 0usize;
    let mut quote: Option<char> = None;
    let mut escaped = false;
    for (offset, ch) in text.char_indices() {
        if escaped {
            escaped = false;
            continue;
        }
        if let Some(q) = quote {
            if ch == '\\' {
                escaped = true;
            } else if ch == q {
                quote = None;
            }
            continue;
        }
        match ch {
            '"' | '\'' => quote = Some(ch),
            '[' | '{' | '(' => depth += 1,
            ']' | '}' | ')' => depth = depth.saturating_sub(1),
            ':' if depth == 0 => return Some((text[..offset].trim(), text[offset + 1..].trim())),
            _ => {}
        }
    }
    None
}

/// Parse a raw LeetCode-style literal into a JSON value, mirroring the JS
/// `parseLiteral` fallback chain (null, booleans, quoted strings, arrays,
/// numbers, otherwise the raw string).
pub(crate) fn parse_literal(raw: &str) -> serde_json::Value {
    use serde_json::Value;
    let text = raw.trim();
    if text.is_empty() || text == "null" || text == "None" {
        return Value::Null;
    }
    if text == "true" {
        return Value::Bool(true);
    }
    if text == "false" {
        return Value::Bool(false);
    }
    if text.len() >= 2
        && ((text.starts_with('"') && text.ends_with('"'))
            || (text.starts_with('\'') && text.ends_with('\'')))
    {
        return Value::String(unescape_quoted(&text[1..text.len() - 1]));
    }
    if text.starts_with('[') && text.ends_with(']') {
        let inner = text[1..text.len() - 1].trim();
        if inner.is_empty() {
            return Value::Array(Vec::new());
        }
        return Value::Array(
            split_top_level(inner)
                .iter()
                .map(|part| parse_literal(part))
                .collect(),
        );
    }
    if text.starts_with('{') && text.ends_with('}') {
        // Object literals extend the LeetCode surface for linkage fixtures
        // such as {"list": [...], "pos": n}. Unparseable shapes stay strings.
        let inner = text[1..text.len() - 1].trim();
        if inner.is_empty() {
            return Value::Object(serde_json::Map::new());
        }
        let mut map = serde_json::Map::new();
        let mut ok = true;
        for part in split_top_level(inner) {
            let Some((key, value)) = split_key_value(&part) else {
                ok = false;
                break;
            };
            let Value::String(key) = parse_literal(key) else {
                ok = false;
                break;
            };
            map.insert(key, parse_literal(value));
        }
        if ok {
            return Value::Object(map);
        }
        return Value::String(text.to_owned());
    }
    if let Ok(int) = text.parse::<i64>() {
        return Value::Number(int.into());
    }
    if let Ok(float) = text.parse::<f64>() {
        if float.is_finite() {
            if let Some(number) = serde_json::Number::from_f64(float) {
                return Value::Number(number);
            }
        }
        return Value::String(text.to_owned());
    }
    Value::String(text.to_owned())
}

pub(crate) fn num(value: &serde_json::Value) -> f64 {
    match value {
        serde_json::Value::Number(n) => n.as_f64().unwrap_or(0.0),
        serde_json::Value::Bool(true) => 1.0,
        serde_json::Value::Bool(false) | serde_json::Value::Null => 0.0,
        serde_json::Value::String(text) => text.trim().parse::<f64>().unwrap_or(0.0),
        _ => 0.0,
    }
}

pub(crate) fn trunc(value: &serde_json::Value) -> i64 {
    num(value).trunc() as i64
}

/// `q(value)` in judge.js: JSON-quote the string coercion of a value.
fn quote_string(value: &serde_json::Value) -> String {
    let text = match value {
        serde_json::Value::Null => String::new(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    };
    serde_json::to_string(&text).unwrap_or_else(|_| "\"\"".to_owned())
}

fn first_char(value: &serde_json::Value) -> char {
    let text = match value {
        serde_json::Value::Null => String::new(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    };
    text.chars().next().unwrap_or(' ')
}

fn escape_char_literal(ch: char) -> String {
    match ch {
        '\\' => "\\\\".to_owned(),
        '\'' => "\\'".to_owned(),
        '\n' => "\\n".to_owned(),
        '\t' => "\\t".to_owned(),
        '\r' => "\\r".to_owned(),
        _ => ch.to_string(),
    }
}

fn array_items(value: &serde_json::Value) -> Vec<serde_json::Value> {
    match value {
        serde_json::Value::Array(items) => items.clone(),
        _ => Vec::new(),
    }
}

// ---------------------------------------------------------------------------
// Java literals (port of `javaLiteral` in judge.js).
// ---------------------------------------------------------------------------

fn java_literal(raw: &str, kind: &str) -> String {
    let value = parse_literal(raw);
    match kind {
        "int" => trunc(&value).to_string(),
        "long" => format!("{}L", trunc(&value)),
        "double" => {
            let n = num(&value);
            if n == n.trunc() && n.abs() < 1e15 {
                format!("{n}.0d")
            } else {
                format!("{n}d")
            }
        }
        "float" => {
            format!("{}f", num(&value))
        }
        "boolean" => {
            if value == serde_json::Value::Bool(true) {
                "true".to_owned()
            } else {
                "false".to_owned()
            }
        }
        "string" => quote_string(&value),
        "char" => format!("'{}'", escape_char_literal(first_char(&value))),
        "int[]" => format!(
            "new int[]{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| trunc(item).to_string())
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "long[]" => format!(
            "new long[]{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| format!("{}L", trunc(item)))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "double[]" => format!(
            "new double[]{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| num(item).to_string())
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "boolean[]" => format!(
            "new boolean[]{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| if *item == serde_json::Value::Bool(true) {
                    "true"
                } else {
                    "false"
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "string[]" => format!(
            "new String[]{{{}}}",
            array_items(&value)
                .iter()
                .map(quote_string)
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "List<String>" => format!(
            "new java.util.ArrayList<>(java.util.Arrays.asList({}))",
            array_items(&value)
                .iter()
                .map(quote_string)
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "char[]" => format!(
            "new char[]{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| format!("'{}'", escape_char_literal(first_char(item))))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "int[][]" => format!(
            "new int[][]{{{}}}",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| trunc(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "char[][]" => format!(
            "new char[][]{{{}}}",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| format!("'{}'", escape_char_literal(first_char(item))))
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "string[][]" => format!(
            "new String[][]{{{}}}",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(quote_string)
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "ListNode" => format!(
            "__H.__mkList(new int[]{{{}}})",
            array_items(&value)
                .iter()
                .map(|item| trunc(item).to_string())
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "TreeNode" => format!(
            "__H.__mkTree(new String[]{{{}}})",
            array_items(&value)
                .iter()
                .map(|item| if item.is_null() {
                    "null".to_owned()
                } else {
                    quote_string(item)
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "ListNode[]" => format!(
            "new ListNode[]{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| if item.is_null() {
                    "null".to_owned()
                } else {
                    format!(
                        "__H.__mkList(new int[]{{{}}})",
                        array_items(item)
                            .iter()
                            .map(|n| trunc(n).to_string())
                            .collect::<Vec<_>>()
                            .join(", ")
                    )
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "interval[]" => format!(
            "new Interval[]{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| {
                    let pair = array_items(item);
                    let start = pair.first().map(trunc).unwrap_or(0);
                    let end = pair.get(1).map(trunc).unwrap_or(0);
                    format!("new Interval({start}, {end})")
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "Node" => format!(
            "__Custom.__mkCustomNode(new int[][]{{{}}})",
            array_items(&value)
                .iter()
                .map(|item| {
                    let pair = array_items(item);
                    let val = pair.first().map(trunc).unwrap_or(0);
                    let rand = pair.get(1).map(|r| if r.is_null() { -1 } else { trunc(r) });
                    match rand {
                        Some(index) => format!("{{{val}, {index}}}"),
                        None => format!("{{{val}, -1}}"),
                    }
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "GraphNode" => format!(
            "__Custom.__mkCustomGraph(new int[][]{{{}}})",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| trunc(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        _ => "null".to_owned(),
    }
}

// ---------------------------------------------------------------------------
// C++ literals (port of `cppLiteral` in judge.js).
// ---------------------------------------------------------------------------

fn cpp_int_type(kind: &str) -> &'static str {
    match kind {
        "long[]" => "long long",
        "double[]" => "double",
        "boolean[]" => "bool",
        "char[]" => "char",
        "string[]" => "std::string",
        _ => "int",
    }
}

fn cpp_literal(raw: &str, kind: &str) -> String {
    let value = parse_literal(raw);
    match kind {
        "int" => trunc(&value).to_string(),
        "long" => format!("{}LL", trunc(&value)),
        "double" => {
            let n = num(&value);
            if n == n.trunc() && n.abs() < 1e15 {
                format!("{n}.0")
            } else {
                format!("{n}")
            }
        }
        "float" => {
            format!("{}f", num(&value))
        }
        "boolean" => {
            if value == serde_json::Value::Bool(true) {
                "true".to_owned()
            } else {
                "false".to_owned()
            }
        }
        "string" => quote_string(&value),
        "char" => format!("'{}'", escape_char_literal(first_char(&value))),
        "int[]" | "long[]" | "double[]" | "boolean[]" | "char[]" => {
            let items = array_items(&value)
                .iter()
                .map(|item| match kind {
                    "char[]" => format!("'{}'", escape_char_literal(first_char(item))),
                    "boolean[]" => {
                        if *item == serde_json::Value::Bool(true) {
                            "true".to_owned()
                        } else {
                            "false".to_owned()
                        }
                    }
                    _ => num(item).to_string(),
                })
                .collect::<Vec<_>>()
                .join(", ");
            format!("std::vector<{}>{{{items}}}", cpp_int_type(kind))
        }
        "string[]" | "List<String>" => format!(
            "std::vector<std::string>{{{}}}",
            array_items(&value)
                .iter()
                .map(quote_string)
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "int[][]" => format!(
            "std::vector<std::vector<int>>{{{}}}",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| trunc(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "char[][]" => format!(
            "std::vector<std::vector<char>>{{{}}}",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| format!("'{}'", escape_char_literal(first_char(item))))
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "string[][]" => format!(
            "std::vector<std::vector<std::string>>{{{}}}",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(quote_string)
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "ListNode" => format!(
            "__mkList(std::vector<int>{{{}}})",
            array_items(&value)
                .iter()
                .map(|item| trunc(item).to_string())
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "TreeNode" => format!(
            "__mkTree(std::vector<std::string>{{{}}})",
            array_items(&value)
                .iter()
                .map(|item| if item.is_null() {
                    "\"null\"".to_owned()
                } else {
                    quote_string(item)
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "ListNode[]" => format!(
            "std::vector<ListNode*>{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| if item.is_null() {
                    "nullptr".to_owned()
                } else {
                    format!(
                        "__mkList(std::vector<int>{{{}}})",
                        array_items(item)
                            .iter()
                            .map(|n| trunc(n).to_string())
                            .collect::<Vec<_>>()
                            .join(", ")
                    )
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "interval[]" => format!(
            "std::vector<Interval>{{{}}}",
            array_items(&value)
                .iter()
                .map(|item| {
                    let pair = array_items(item);
                    let start = pair.first().map(trunc).unwrap_or(0);
                    let end = pair.get(1).map(trunc).unwrap_or(0);
                    format!("Interval({start}, {end})")
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "Node" => format!(
            "__mkCustomNode(std::vector<std::vector<int>>{{{}}})",
            array_items(&value)
                .iter()
                .map(|item| {
                    let pair = array_items(item);
                    let val = pair.first().map(trunc).unwrap_or(0);
                    let rand = pair.get(1).map(|r| if r.is_null() { -1 } else { trunc(r) });
                    match rand {
                        Some(index) => format!("{{{val}, {index}}}"),
                        None => format!("{{{val}, -1}}"),
                    }
                })
                .collect::<Vec<_>>()
                .join(", ")
        ),
        "GraphNode" => format!(
            "__mkCustomGraph(std::vector<std::vector<int>>{{{}}})",
            array_items(&value)
                .iter()
                .map(|row| format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| trunc(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ),
        _ => "0".to_owned(),
    }
}

// ---------------------------------------------------------------------------
// Harness sources (port of `buildJavaSource` / `buildCppSource`).
// ---------------------------------------------------------------------------

const JAVA_LIST_NODE: &str = r#"
class ListNode {
  int val;
  ListNode next;
  ListNode() {}
  ListNode(int val) { this.val = val; }
  ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
"#;

const JAVA_TREE_NODE: &str = r#"
class TreeNode {
  int val;
  TreeNode left;
  TreeNode right;
  TreeNode() {}
  TreeNode(int val) { this.val = val; }
  TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
"#;

const JAVA_HELPERS: &str = r#"
class __H {
  static ListNode __mkList(int[] values) {
    ListNode dummy = new ListNode(0);
    ListNode node = dummy;
    for (int value : values) { node.next = new ListNode(value); node = node.next; }
    return dummy.next;
  }
  static TreeNode __mkTree(String[] values) {
    if (values.length == 0 || values[0] == null || values[0].equals("null")) return null;
    TreeNode root = new TreeNode(Integer.parseInt(values[0]));
    java.util.ArrayDeque<TreeNode> queue = new java.util.ArrayDeque<>();
    queue.add(root);
    int index = 1;
    while (!queue.isEmpty() && index < values.length) {
      TreeNode node = queue.poll();
      if (index < values.length && values[index] != null && !values[index].equals("null")) { node.left = new TreeNode(Integer.parseInt(values[index])); queue.add(node.left); }
      index++;
      if (index < values.length && values[index] != null && !values[index].equals("null")) { node.right = new TreeNode(Integer.parseInt(values[index])); queue.add(node.right); }
      index++;
    }
    return root;
  }
  static String __listOut(Object candidate) {
    ListNode head = (ListNode) candidate;
    StringBuilder out = new StringBuilder("[");
    ListNode node = head;
    int guard = 0;
    while (node != null && guard++ < 200000) {
      if (out.length() > 1) out.append(',');
      out.append(node.val);
      node = node.next;
    }
    return out.append(']').toString();
  }
  // A null ListNode IS the empty list (LeetCode list equality); datasets expect [].
  static String __outList(Object value) {
    if (value == null) return "[]";
    return __out(value);
  }
  static String __treeOut(Object candidate) {
    TreeNode root = (TreeNode) candidate;
    java.util.List<String> out = new java.util.ArrayList<>();
    java.util.LinkedList<TreeNode> queue = new java.util.LinkedList<>();
    if (root != null) queue.add(root);
    while (!queue.isEmpty()) {
      TreeNode node = queue.poll();
      if (node == null) { out.add("null"); continue; }
      out.add(String.valueOf(node.val));
      queue.add(node.left);
      queue.add(node.right);
    }
    while (out.size() > 0 && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
    return "[" + String.join(",", out) + "]";
  }

  /* Reflective serializer: a LeetCode signature may declare int[][], but the solution can
     legitimately return List<List<Integer>>; recursive descent handles arrays, collections
     and nested mixes of both, which Arrays.deepToString cannot. */
  static String __out(Object value) {
    return __str(value);
  }

  static String __quote(String value) {
    StringBuilder out = new StringBuilder(); out.append((char)34);
    for (int i = 0; i < value.length(); i++) {
      char ch = value.charAt(i);
      if (ch == 34 || ch == 92) out.append((char)92).append(ch);
      else if (ch < 32) out.append((char)92).append('u').append(String.format("%04x", (int)ch));
      else out.append(ch);
    }
    return out.append((char)34).toString();
  }

  /* Decode a serialized string value back to its raw form so a previous
     call result can feed the next call ($prev chains). Non-quoted input
     passes through unchanged. */
  static String __unquote(String json) {
    if (json == null || json.length() < 2 || !json.startsWith("\"") || !json.endsWith("\"")) return json;
    String inner = json.substring(1, json.length() - 1);
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < inner.length(); i++) {
      char ch = inner.charAt(i);
      if (ch == '\\' && i + 1 < inner.length()) {
        char e = inner.charAt(++i);
        if (e == 'n') out.append('\n');
        else if (e == 't') out.append('\t');
        else if (e == 'r') out.append('\r');
        else if (e == 'u' && i + 4 < inner.length()) {
          try { out.append((char) Integer.parseInt(inner.substring(i + 1, i + 5), 16)); i += 4; }
          catch (NumberFormatException ex) { out.append(e); }
        } else out.append(e);
      } else out.append(ch);
    }
    return out.toString();
  }

  static String __str(Object value) {
    if (value == null) return "null";
    if (value instanceof ListNode) return __listOut(value);
    if (value instanceof TreeNode) return __treeOut(value);
    if (value instanceof String || value instanceof Character) return __quote(String.valueOf(value));
    if (value instanceof Boolean || value instanceof Number) return String.valueOf(value);
    try {
      if (value.getClass().isArray()) {
        int length = java.lang.reflect.Array.getLength(value);
        StringBuilder out = new StringBuilder("[");
        for (int i = 0; i < length; i++) {
          if (i > 0) out.append(',');
          out.append(__str(java.lang.reflect.Array.get(value, i)));
        }
        return out.append(']').toString();
      }
    } catch (Throwable ignored) { /* fall through */ }
    if (value instanceof java.util.Collection) {
      StringBuilder out = new StringBuilder("[");
      boolean first = true;
      for (Object item : (java.util.Collection<?>) value) {
        if (!first) out.append(',');
        first = false;
        out.append(__str(item));
      }
      return out.append(']').toString();
    }
    if (value instanceof java.util.Map) {
      StringBuilder out = new StringBuilder("{");
      boolean first = true;
      for (Object entryObject : ((java.util.Map<?, ?>) value).entrySet()) {
        java.util.Map.Entry<?, ?> entry = (java.util.Map.Entry<?, ?>) entryObject;
        if (!first) out.append(',');
        first = false;
        out.append(__str(entry.getKey())).append(':').append(__str(entry.getValue()));
      }
      return out.append('}').toString();
    }
    return String.valueOf(value);
  }
}
"#;

const CPP_NODES: &str = r#"
struct ListNode { int val; ListNode *next; ListNode(): val(0), next(nullptr) {} ListNode(int x): val(x), next(nullptr) {} ListNode(int x, ListNode *n): val(x), next(n) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(): val(0), left(nullptr), right(nullptr) {} TreeNode(int x): val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *l, TreeNode *r): val(x), left(l), right(r) {} };
"#;

/// Interval shared by meeting-style lessons plus cycle/tree lookup helpers.
/// Additive only: names are `__`-prefixed and never collide with user code.
/// Interval is injected only when the signature needs it and the user did
/// not define their own; lookup helpers only alongside ListNode/TreeNode.
const JAVA_INTERVAL: &str = r#"
class Interval {
  int start;
  int end;
  Interval() { this(0, 0); }
  Interval(int s, int e) { start = s; end = e; }
}
"#;

const JAVA_LOOKUP_HELPERS: &str = r#"
class __JSpecial {
  static ListNode __mkCycle(int[] values, int pos) {
    if (values.length == 0) return null;
    ListNode dummy = new ListNode(0);
    ListNode node = dummy;
    ListNode entry = null;
    for (int i = 0; i < values.length; i++) {
      node.next = new ListNode(values[i]);
      node = node.next;
      if (i == pos) entry = node;
    }
    if (entry != null) node.next = entry;
    return dummy.next;
  }
  static TreeNode __findTree(TreeNode root, int val) {
    if (root == null) return null;
    java.util.ArrayDeque<TreeNode> queue = new java.util.ArrayDeque<>();
    queue.add(root);
    while (!queue.isEmpty()) {
      TreeNode node = queue.poll();
      if (node.val == val) return node;
      if (node.left != null) queue.add(node.left);
      if (node.right != null) queue.add(node.right);
    }
    return null;
  }
}
"#;

/// Default graph `Node` (Clone Graph shape `{val, neighbors}`), emitted when
/// the spec uses `Node` and the user code does not define its own. Port of
/// `JAVA_GRAPH_NODE` in plugin/host/judge.js.
const JAVA_GRAPH_NODE: &str = r#"
class Node {
  public int val;
  public java.util.List<Node> neighbors;
  public Node() {
    val = 0;
    neighbors = new java.util.ArrayList<Node>();
  }
  public Node(int _val) {
    val = _val;
    neighbors = new java.util.ArrayList<Node>();
  }
  public Node(int _val, java.util.ArrayList<Node> _neighbors) {
    val = _val;
    neighbors = _neighbors;
  }
}
"#;

/// Graph harness helpers (Clone Graph): build from an adjList literal,
/// serialize via BFS, and verify deep-copy identity. Kept in a separate
/// `__HG` class (rather than inside `__H` like the JS reference) so specs
/// whose user-defined `Node` has a different shape never compile these
/// against the wrong type. Port of the graph helpers in `JAVA_HELPERS`.
const JAVA_GRAPH_HELPERS: &str = r#"
class __HG {
  static Node __mkGraph(int[][] adj) {
    if (adj == null) return null;
    if (adj.length == 0) return null;
    java.util.Map<Integer, Node> nodes = new java.util.HashMap<>();
    for (int i = 0; i < adj.length; i++) nodes.put(i + 1, new Node(i + 1));
    for (int i = 0; i < adj.length; i++) {
      Node node = nodes.get(i + 1);
      if (adj[i] != null) {
        for (int v : adj[i]) {
          Node nb = nodes.get(v);
          if (nb != null) node.neighbors.add(nb);
        }
      }
    }
    return nodes.get(1);
  }
  static String __graphOut(Node entry, int count) {
    if (entry == null) return "[]";
    // Canonical val-based rows: clones preserve val, so row i lists neighbor
    // VALS of the clone with val == i. Stable across BFS discovery orders.
    java.util.Map<Integer, Node> byVal = new java.util.HashMap<>();
    java.util.Set<Node> seen = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Node, Boolean>());
    java.util.ArrayDeque<Node> queue = new java.util.ArrayDeque<>();
    queue.add(entry);
    seen.add(entry);
    while (!queue.isEmpty()) {
      Node node = queue.poll();
      byVal.put(node.val, node);
      if (node.neighbors != null) {
        for (Node nb : node.neighbors) {
          if (nb != null && seen.add(nb)) queue.add(nb);
        }
      }
    }
    StringBuilder out = new StringBuilder("[");
    for (int id = 1; id <= count; id++) {
      if (id > 1) out.append(',');
      out.append('[');
      Node node = byVal.get(id);
      if (node != null && node.neighbors != null) {
        boolean first = true;
        for (Node nb : node.neighbors) {
          if (nb == null) continue;
          if (!first) out.append(',');
          first = false;
          out.append(nb.val);
        }
      }
      out.append(']');
    }
    return out.append(']').toString();
  }
  static String __graphIdentityError(Node input, Node output, int count) {
    if (count == 0) return output == null ? null : "non-null result for empty graph";
    if (output == null) return "null result for non-empty graph";
    java.util.Set<Node> inSet = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Node, Boolean>());
    java.util.ArrayDeque<Node> queue = new java.util.ArrayDeque<>();
    if (input != null) { queue.add(input); inSet.add(input); }
    while (!queue.isEmpty()) {
      Node node = queue.poll();
      if (node.neighbors != null) for (Node nb : node.neighbors) {
        if (nb != null && inSet.add(nb)) queue.add(nb);
      }
    }
    java.util.Set<Node> outSet = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<Node, Boolean>());
    java.util.ArrayDeque<Node> queue2 = new java.util.ArrayDeque<>();
    queue2.add(output); outSet.add(output);
    while (!queue2.isEmpty()) {
      Node node = queue2.poll();
      if (inSet.contains(node)) return "shallow copy: result shares a node with the input";
      if (node.neighbors != null) for (Node nb : node.neighbors) {
        if (nb != null && outSet.add(nb)) queue2.add(nb);
      }
    }
    if (outSet.size() != count) return "node count " + outSet.size() + " != input " + count + " (duplicated or dropped clones)";
    return null;
  }
}
"#;

/// Copy-list-with-random-pointer `Node` (`{val, next, random}`). The graph
/// `Node` cannot serve both shapes in one compilation, so this random shape
/// is emitted only for the copy slug branch. Port of `JAVA_RANDOM_NODE`.
const JAVA_RANDOM_NODE: &str = r#"
class Node {
  int val;
  Node next;
  Node random;
  Node() {}
  Node(int val) { this.val = val; }
  Node(int val, Node next, Node random) { this.val = val; this.next = next; this.random = random; }
}
"#;

/// Self-contained random helpers (separate class `__HR` so the shared `__H`
/// graph helpers are never compiled against the random `Node` shape).
/// Port of `JAVA_RANDOM_HELPERS` in plugin/host/judge.js.
const JAVA_RANDOM_HELPERS: &str = r#"
class __HR {
  static Node __mkRandom(int[] values, String[] rnds) {
    if (values.length == 0) return null;
    Node[] nodes = new Node[values.length];
    for (int i = 0; i < values.length; i++) nodes[i] = new Node(values[i]);
    for (int i = 0; i + 1 < values.length; i++) nodes[i].next = nodes[i + 1];
    for (int i = 0; i < values.length; i++) {
      String r = rnds[i];
      if (r != null && !r.equals("null")) {
        try { int idx = Integer.parseInt(r); if (idx >= 0 && idx < values.length) nodes[i].random = nodes[idx]; } catch (NumberFormatException ignored) {}
      }
    }
    return nodes[0];
  }
  static String __randomOut(Object candidate) {
    Node head = (Node) candidate;
    java.util.List<Node> order = new java.util.ArrayList<>();
    java.util.Map<Node, Integer> index = new java.util.IdentityHashMap<>();
    Node node = head;
    int guard = 0;
    while (node != null && guard++ < 200000) {
      if (index.containsKey(node)) break;
      index.put(node, order.size());
      order.add(node);
      node = node.next;
    }
    StringBuilder out = new StringBuilder("[");
    for (int i = 0; i < order.size(); i++) {
      if (i > 0) out.append(',');
      Node nd = order.get(i);
      out.append('[').append(nd.val).append(',');
      if (nd.random == null) out.append("null");
      else { Integer idx = index.get(nd.random); out.append(idx == null ? "null" : String.valueOf(idx)); }
      out.append(']');
    }
    return out.append(']').toString();
  }
}
"#;

const CPP_INTERVAL: &str = r#"
struct Interval { int start; int end; Interval(): start(0), end(0) {} Interval(int s, int e): start(s), end(e) {} };
"#;

const CPP_LOOKUP_HELPERS: &str = r#"
static ListNode* __mkCycle(std::vector<int> v, int pos) {
  if (v.empty()) return nullptr;
  ListNode dummy(0); ListNode* node = &dummy; ListNode* entry = nullptr;
  for (size_t i = 0; i < v.size(); i++) {
    node->next = new ListNode(v[i]); node = node->next;
    if ((int)i == pos) entry = node;
  }
  if (entry) node->next = entry;
  return dummy.next;
}
static TreeNode* __findTree(TreeNode* root, int val) {
  if (!root) return nullptr;
  std::deque<TreeNode*> q; q.push_back(root);
  while (!q.empty()) {
    TreeNode* node = q.front(); q.pop_front();
    if (node->val == val) return node;
    if (node->left) q.push_back(node->left);
    if (node->right) q.push_back(node->right);
  }
  return nullptr;
}
"#;

/// Default graph `Node` (Clone Graph shape), emitted when the spec uses
/// `Node` and the user code does not define its own. Port of the graph
/// `Node` inside `CPP_NODES` in plugin/host/judge.js.
const CPP_GRAPH_NODE: &str = r#"
struct Node { int val; std::vector<Node*> neighbors; Node(): val(0), neighbors(std::vector<Node*>()) {} Node(int _val): val(_val), neighbors(std::vector<Node*>()) {} Node(int _val, std::vector<Node*> _neighbors): val(_val), neighbors(_neighbors) {} };
"#;

/// Graph harness helpers (Clone Graph). Port of the graph helpers inside
/// `CPP_HELPERS` in plugin/host/judge.js.
const CPP_GRAPH_HELPERS: &str = r#"
static Node* __mkGraph(std::vector<std::vector<int>> adj) {
  if (adj.empty()) return nullptr;
  std::unordered_map<int, Node*> nodes;
  for (size_t i = 0; i < adj.size(); i++) nodes[(int)i + 1] = new Node((int)i + 1);
  for (size_t i = 0; i < adj.size(); i++) {
    Node* node = nodes[(int)i + 1];
    for (int v : adj[i]) { auto it = nodes.find(v); if (it != nodes.end()) node->neighbors.push_back(it->second); }
  }
  return nodes[1];
}
static std::string __graphOut(Node* entry, int count) {
  if (!entry) return "[]";
  // Canonical val-based rows: clones preserve val, so row i lists neighbor
  // VALS of the clone with val == i. Stable across BFS discovery orders.
  std::unordered_map<int, Node*> byVal;
  std::set<Node*> seen; std::deque<Node*> queue; queue.push_back(entry); seen.insert(entry);
  while (!queue.empty()) {
    Node* node = queue.front(); queue.pop_front();
    byVal[node->val] = node;
    for (Node* nb : node->neighbors) if (nb && seen.insert(nb).second) queue.push_back(nb);
  }
  std::string out = "[";
  for (int id = 1; id <= count; id++) {
    if (id > 1) out += ",";
    out += "[";
    auto it = byVal.find(id);
    if (it != byVal.end() && it->second) {
      bool first = true;
      for (Node* nb : it->second->neighbors) {
        if (!nb) continue;
        if (!first) out += ",";
        first = false;
        out += std::to_string(nb->val);
      }
    }
    out += "]";
  }
  return out + "]";
}
static std::string __graphIdentityError(Node* input, Node* output, int count) {
  if (count == 0) return output == nullptr ? "" : "non-null result for empty graph";
  if (!output) return "null result for non-empty graph";
  std::set<Node*> inSet; std::deque<Node*> q;
  if (input) { q.push_back(input); inSet.insert(input); }
  while (!q.empty()) { Node* n = q.front(); q.pop_front(); for (Node* nb : n->neighbors) if (nb && inSet.insert(nb).second) q.push_back(nb); }
  std::set<Node*> outSet; std::deque<Node*> q2; q2.push_back(output); outSet.insert(output);
  while (!q2.empty()) {
    Node* n = q2.front(); q2.pop_front();
    if (inSet.count(n)) return "shallow copy: result shares a node with the input";
    for (Node* nb : n->neighbors) if (nb && outSet.insert(nb).second) q2.push_back(nb);
  }
  if ((int)outSet.size() != count) return "node count " + std::to_string(outSet.size()) + " != input " + std::to_string(count) + " (duplicated or dropped clones)";
  return "";
}
"#;

/// List/Tree nodes for the copy-list branch (which never includes the graph
/// `Node`). Port of `CPP_LIST_TREE_NODES` in plugin/host/judge.js.
const CPP_LIST_TREE_NODES: &str = r#"
struct ListNode { int val; ListNode *next; ListNode(): val(0), next(nullptr) {} ListNode(int x): val(x), next(nullptr) {} ListNode(int x, ListNode *n): val(x), next(n) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(): val(0), left(nullptr), right(nullptr) {} TreeNode(int x): val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *l, TreeNode *r): val(x), left(l), right(r) {} };
"#;

/// Copy-list-with-random-pointer `Node` (`{val, next, random}`). Port of
/// `CPP_RANDOM_NODE` in plugin/host/judge.js.
const CPP_RANDOM_NODE: &str = r#"
struct Node { int val; Node *next; Node *random; Node(): val(0), next(nullptr), random(nullptr) {} Node(int x): val(x), next(nullptr), random(nullptr) {} Node(int x, Node *n, Node *r): val(x), next(n), random(r) {} };
"#;

/// Self-contained random helpers. Port of `CPP_RANDOM_HELPERS`.
const CPP_RANDOM_HELPERS: &str = r#"
static Node* __mkRandom(std::vector<int> values, std::vector<std::string> rnds) {
  if (values.empty()) return nullptr;
  std::vector<Node*> nodes;
  for (int v : values) nodes.push_back(new Node(v));
  for (size_t i = 0; i + 1 < nodes.size(); i++) nodes[i]->next = nodes[i + 1];
  for (size_t i = 0; i < nodes.size(); i++) {
    if (rnds[i] != "null") {
      try { int idx = std::stoi(rnds[i]); if (idx >= 0 && idx < (int)nodes.size()) nodes[i]->random = nodes[idx]; } catch (...) {}
    }
  }
  return nodes[0];
}
static std::string __randomOut(Node* head) {
  std::vector<Node*> order; std::map<Node*,int> index;
  Node* node = head; int guard = 0;
  while (node && guard++ < 200000) {
    if (index.count(node)) break;
    index[node] = (int)order.size(); order.push_back(node); node = node->next;
  }
  std::string out = "[";
  for (size_t i = 0; i < order.size(); i++) {
    if (i) out += ",";
    out += "[" + std::to_string(order[i]->val) + ",";
    if (!order[i]->random) out += "null";
    else { auto it = index.find(order[i]->random); out += (it == index.end() ? "null" : std::to_string(it->second)); }
    out += "]";
  }
  return out + "]";
}
"#;

const CPP_HELPERS: &str = r#"
static ListNode* __mkList(std::vector<int> v) {
  ListNode dummy(0); ListNode* node = &dummy;
  for (int x : v) { node->next = new ListNode(x); node = node->next; }
  return dummy.next;
}
static TreeNode* __mkTree(std::vector<std::string> v) {
  if (v.empty() || v[0] == "null") return nullptr;
  TreeNode* root = new TreeNode(std::stoi(v[0]));
  std::deque<TreeNode*> q; q.push_back(root);
  size_t i = 1;
  while (!q.empty() && i < v.size()) {
    TreeNode* node = q.front(); q.pop_front();
    if (i < v.size() && v[i] != "null") { node->left = new TreeNode(std::stoi(v[i])); q.push_back(node->left); }
    i++;
    if (i < v.size() && v[i] != "null") { node->right = new TreeNode(std::stoi(v[i])); q.push_back(node->right); }
    i++;
  }
  return root;
}
static std::string __listOut(ListNode* head) {
  std::string out = "["; int guard = 0;
  while (head && guard++ < 200000) { if (out.size() > 1) out += ","; out += std::to_string(head->val); head = head->next; }
  return out + "]";
}
static std::string __treeOut(TreeNode* root) {
  std::vector<std::string> out; std::deque<TreeNode*> q;
  if (root) q.push_back(root);
  while (!q.empty()) {
    TreeNode* node = q.front(); q.pop_front();
    if (!node) { out.push_back("null"); continue; }
    out.push_back(std::to_string(node->val));
    q.push_back(node->left); q.push_back(node->right);
  }
  while (!out.empty() && out.back() == "null") out.pop_back();
  std::string joined;
  for (size_t i = 0; i < out.size(); i++) { if (i) joined += ","; joined += out[i]; }
  return "[" + joined + "]";
}
static std::string __quote(const std::string& value) {
  std::string out(1, char(34));
  const char* hex = "0123456789abcdef";
  for (unsigned char ch : value) {
    if (ch == 34 || ch == 92) { out.push_back(92); out.push_back(ch); }
    else if (ch < 32) { out.push_back(92); out += "u00"; out.push_back(hex[ch >> 4]); out.push_back(hex[ch & 15]); }
    else out.push_back(ch);
  }
  out.push_back(34); return out;
}
template <class T> static std::string __js(const T& v) { std::ostringstream o; o << std::setprecision(17) << v; return o.str(); }
static std::string __js(bool v) { return v ? "true" : "false"; }
static std::string __js(const std::string& v) { return __quote(v); }
static std::string __js(char v) { return __quote(std::string(1, v)); }
static std::string __js(const char* v) { return v ? __quote(std::string(v)) : "null"; }
/* Decode a serialized string value back to raw form for $prev chains. */
static std::string __unquote(const std::string& json) {
  if (json.size() < 2 || json.front() != '"' || json.back() != '"') return json;
  std::string out; std::string inner = json.substr(1, json.size() - 2);
  for (size_t i = 0; i < inner.size(); i++) {
    if (inner[i] == '\\' && i + 1 < inner.size()) {
      char e = inner[++i];
      if (e == 'n') out += '\n'; else if (e == 't') out += '\t'; else if (e == 'r') out += '\r';
      else if (e == 'u' && i + 4 < inner.size()) { out += (char)std::stoi(inner.substr(i + 1, 4), nullptr, 16); i += 4; }
      else out += e;
    } else out += inner[i];
  }
  return out;
}
template <class T> static std::string __js(const std::vector<T>& v);
static std::string __js(ListNode* node);
static std::string __js(TreeNode* node);
template <class T> static std::string __js(const std::vector<T>& v) {
  std::string out = "[";
  for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += __js(static_cast<T>(v[i])); }
  return out + "]";
}
static std::string __js(ListNode* node) { return __listOut(node); }
static std::string __js(TreeNode* node) { return __treeOut(node); }
"#;

pub(crate) fn strip_comments(source: &str) -> String {
    let mut out = String::with_capacity(source.len());
    let mut chars = source.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '/' {
            match chars.peek() {
                Some('/') => {
                    for next in chars.by_ref() {
                        if next == '\n' {
                            out.push('\n');
                            break;
                        }
                    }
                    continue;
                }
                Some('*') => {
                    chars.next();
                    let mut prev = '\0';
                    for next in chars.by_ref() {
                        if prev == '*' && next == '/' {
                            break;
                        }
                        prev = next;
                    }
                    out.push(' ');
                    continue;
                }
                _ => {}
            }
        }
        out.push(ch);
    }
    out
}

/// Drop the `public` modifier from `class`/`interface`/`enum` declarations
/// (including `@interface`) so user code embeds into the single-file
/// `Main.java` harness: javac allows only one public top-level type per file.
/// Member modifiers, comments, string/char literals and text blocks are
/// untouched. Inner `public class` declarations are demoted too, which is
/// harmless inside one file.
fn demote_java_public(code: &str) -> String {
    const MODIFIERS: &[&str] = &[
        "final",
        "abstract",
        "static",
        "strictfp",
        "sealed",
        "non-sealed",
    ];
    const DECLARATIONS: &[&str] = &["class", "interface", "enum"];
    let src = code.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(src.len());
    let is_ident = |b: u8| b.is_ascii_alphanumeric() || b == b'_' || b == b'$';
    let is_ws = |b: u8| b == b' ' || b == b'\t' || b == b'\n' || b == b'\r' || b == 0x0C;
    // Skip whitespace and comments starting at `j`; returns the new index.
    let skip_gaps = |mut j: usize| loop {
        while j < src.len() && is_ws(src[j]) {
            j += 1;
        }
        if j + 1 < src.len() && src[j] == b'/' && src[j + 1] == b'/' {
            while j < src.len() && src[j] != b'\n' {
                j += 1;
            }
            continue;
        }
        if j + 1 < src.len() && src[j] == b'/' && src[j + 1] == b'*' {
            j += 2;
            while j + 1 < src.len() && !(src[j] == b'*' && src[j + 1] == b'/') {
                j += 1;
            }
            j = (j + 2).min(src.len());
            continue;
        }
        return j;
    };
    let read_ident = |mut j: usize| {
        while j < src.len() && is_ident(src[j]) {
            j += 1;
        }
        j
    };
    let mut i = 0;
    while i < src.len() {
        // Line comment: copy verbatim.
        if src[i] == b'/' && i + 1 < src.len() && src[i + 1] == b'/' {
            let start = i;
            while i < src.len() && src[i] != b'\n' {
                i += 1;
            }
            out.extend_from_slice(&src[start..i]);
            continue;
        }
        // Block comment: copy verbatim.
        if src[i] == b'/' && i + 1 < src.len() && src[i + 1] == b'*' {
            let start = i;
            i += 2;
            while i + 1 < src.len() && !(src[i] == b'*' && src[i + 1] == b'/') {
                i += 1;
            }
            i = (i + 2).min(src.len());
            out.extend_from_slice(&src[start..i]);
            continue;
        }
        // Text block: copy verbatim through the closing `"""`.
        if src[i] == b'"' && i + 2 < src.len() && src[i + 1] == b'"' && src[i + 2] == b'"' {
            let start = i;
            i += 3;
            while i + 2 < src.len() && !(src[i] == b'"' && src[i + 1] == b'"' && src[i + 2] == b'"')
            {
                if src[i] == b'\\' {
                    i += 1;
                }
                i += 1;
            }
            i = (i + 3).min(src.len());
            out.extend_from_slice(&src[start..i]);
            continue;
        }
        // String or char literal: copy verbatim.
        if src[i] == b'"' || src[i] == b'\'' {
            let quote = src[i];
            let start = i;
            i += 1;
            while i < src.len() {
                if src[i] == b'\\' {
                    i += 2;
                    continue;
                }
                let closing = src[i] == quote;
                i += 1;
                if closing {
                    break;
                }
            }
            out.extend_from_slice(&src[start..i]);
            continue;
        }
        // `public` keyword with identifier boundaries on both sides.
        if src[i..].starts_with(b"public")
            && (i == 0 || !is_ident(src[i - 1]))
            && (i + 6 >= src.len() || !is_ident(src[i + 6]))
        {
            let mut j = skip_gaps(i + 6);
            let mut demote = false;
            loop {
                if j < src.len() && src[j] == b'@' {
                    // `public @interface Foo`: the annotation marker sits
                    // between the modifier and the declaration keyword.
                    j = skip_gaps(j + 1);
                }
                let end = read_ident(j);
                let word = &src[j..end];
                if DECLARATIONS.iter().any(|d| word == d.as_bytes()) {
                    demote = true;
                    break;
                }
                if MODIFIERS.iter().any(|m| word == m.as_bytes()) && end > j {
                    j = skip_gaps(end);
                    continue;
                }
                break;
            }
            if demote {
                // Drop `public`, keep the following gap so tokens stay apart.
                i += 6;
                continue;
            }
        }
        out.push(src[i]);
        i += 1;
    }
    String::from_utf8(out).unwrap_or_else(|_| code.to_owned())
}

/// Word-boundary `keyword Name` detection (`contains` would also match
/// `class Nodes`). Comments are already stripped from `bare`; string
/// literals are not scanned by the callers that matter.
fn has_type_decl(bare: &str, name: &str, keywords: &[&str]) -> bool {
    let bytes = bare.as_bytes();
    let is_ident = |b: u8| b.is_ascii_alphanumeric() || b == b'_' || b == b'$';
    let is_ws = |b: u8| b == b' ' || b == b'\t' || b == b'\n' || b == b'\r' || b == 0x0C;
    let mut i = 0;
    while i < bytes.len() {
        if !is_ident(bytes[i]) {
            i += 1;
            continue;
        }
        let mut j = i;
        while j < bytes.len() && is_ident(bytes[j]) {
            j += 1;
        }
        if keywords.contains(&&bare[i..j]) {
            let mut k = j;
            while k < bytes.len() && is_ws(bytes[k]) {
                k += 1;
            }
            let mut m = k;
            while m < bytes.len() && is_ident(bytes[m]) {
                m += 1;
            }
            if &bare[k..m] == name {
                return true;
            }
        }
        i = j;
    }
    false
}

/// Authored harness fragments for exotic local types live in
/// `spec.helpers` (the `Node`/`GraphNode` bridge): the builtin builders
/// cannot construct those without colliding with the user's declarations.
fn custom_node_bridge(spec: &Judge) -> bool {
    spec.helpers.as_ref().is_some_and(|helpers| {
        helpers.values().any(|fragment| {
            fragment.contains("__mkCustomNode")
                || fragment.contains("__mkCustomGraph")
                || fragment.contains("__customNodeOut")
                || fragment.contains("__customGraphOut")
        })
    })
}

/// True when the user code already declares its own `Node`.
fn has_own_java_node(bare: &str) -> bool {
    has_type_decl(bare, "Node", &["class"])
}

/// True when the user code already declares its own C++ `Node`.
fn has_own_cpp_node(bare: &str) -> bool {
    has_type_decl(bare, "Node", &["struct", "class"])
}

/// Raw `Node` mention in authored helper fragments (the bridge references
/// the `Node` type, so the default definition must be present to compile).
fn helpers_mention_node(spec: &Judge) -> bool {
    spec.helpers
        .as_ref()
        .is_some_and(|helpers| helpers.values().any(|fragment| fragment.contains("Node")))
}

/// Linked-list-cycle staged shape: the fixture carries a harness-only `pos`
/// while the solution takes only the head. Port of the `linked-list-cycle`
/// slug branch in plugin/host/judge.js.
fn is_cycle_spec(spec: &Judge) -> bool {
    spec.signature.name == "hasCycle"
        && spec.signature.return_type == "boolean"
        && spec.signature.params.len() == 2
        && spec.signature.params[0].value_type == "ListNode"
        && spec.signature.params[1].value_type == "int"
}

/// Copy-list-with-random-pointer shape, regardless of authored bridges.
/// The generic path uses it to pick the random `Node` default; the staged
/// branch itself only fires when no bridge exists (see [`is_copy_spec`]).
fn is_copy_shape(spec: &Judge) -> bool {
    spec.signature.name == "copyRandomList"
        && spec.signature.return_type == "Node"
        && spec.signature.params.len() == 1
        && spec.signature.params[0].value_type == "Node"
}

/// Copy-list-with-random-pointer shape (no authored bridge): the harness
/// owns the `{val, next, random}` `Node` plus deep-copy checks. Port of the
/// `copy-list-with-random-pointer` slug branch.
fn is_copy_spec(spec: &Judge) -> bool {
    is_copy_shape(spec) && !custom_node_bridge(spec)
}

/// Clone Graph shape (no authored bridge): the harness owns the
/// `{val, neighbors}` `Node` plus deep-copy identity checks. Port of the
/// generic `Node`-return path in plugin/host/judge.js.
fn is_clone_spec(spec: &Judge) -> bool {
    spec.signature.name == "cloneGraph"
        && spec.signature.return_type == "Node"
        && spec.signature.params.len() == 1
        && spec.signature.params[0].value_type == "Node"
        && !custom_node_bridge(spec)
}

/// Serialize Codec shape (staged `serialize(TreeNode)->TreeNode`): fresh
/// `Codec` per case, `deserialize(serialize(root))`, canonical tree
/// compare. Port of the `serialize-and-deserialize-binary-tree` slug
/// branch. Sequence-based Codec specs (overlay) take the sequence path.
fn is_serialize_spec(spec: &Judge) -> bool {
    spec.signature.name == "serialize"
        && spec.signature.return_type == "TreeNode"
        && spec.signature.params.len() == 1
        && spec.signature.params[0].value_type == "TreeNode"
        && spec.sequences.as_ref().is_none_or(Vec::is_empty)
        && !spec.tests.is_empty()
}

/// Parse a copy-list fixture row pair into `(value, random-index-or-null)`.
/// `random` arrives as a JSON number, `null`, or a numeric string.
fn copy_pair(pair: &serde_json::Value) -> (i64, Option<i64>) {
    let items = array_items(pair);
    let val = items.first().map(trunc).unwrap_or(0);
    let rnd = match items.get(1) {
        None | Some(serde_json::Value::Null) => None,
        Some(serde_json::Value::Number(_)) => Some(trunc(&items[1])),
        Some(serde_json::Value::String(text)) => {
            let text = text.trim();
            if text.is_empty() || text.eq_ignore_ascii_case("null") {
                None
            } else {
                text.parse::<i64>().ok()
            }
        }
        Some(_) => None,
    };
    (val, rnd)
}

/// Quote a plain string for a Java/C++ string literal (the random-index
/// vector entries are digits or `null`, quoted like the JS `q()` helper).
fn quote_plain(text: &str) -> String {
    quote_string(&serde_json::Value::String(text.to_owned()))
}

fn java_serialize_expr(return_type: &str, call: &str) -> Option<String> {
    if return_type == "void" {
        return None;
    }
    // A null ListNode IS the empty list and a null TreeNode IS the empty tree;
    // route both through the null-aware serializer like the JS reference.
    if return_type == "ListNode" || return_type == "TreeNode" {
        return Some(format!("__H.__outList({call})"));
    }
    // Exotic node flavors serialize through authored helpers (see the Judge
    // `helpers` extension): the harness cannot name the user's Node type, so
    // authors provide a `__Custom` bridge class.
    if return_type == "Node" {
        return Some(format!("__Custom.__outCustomNode({call})"));
    }
    if return_type == "GraphNode" {
        return Some(format!("__Custom.__outCustomGraph({call})"));
    }
    Some(format!("__H.__out({call})"))
}

fn cpp_serialize_expr(return_type: &str, call: &str) -> Option<String> {
    if return_type == "void" {
        return None;
    }
    if return_type == "Node" {
        return Some(format!("__customNodeOut({call})"));
    }
    if return_type == "GraphNode" {
        return Some(format!("__customGraphOut({call})"));
    }
    Some(format!("__js({call})"))
}

/// Java declaration type for a harness lvalue binding.
fn java_type(kind: &str) -> &str {
    match kind {
        "string" => "String",
        "char" => "char",
        "string[]" => "String[]",
        "char[]" => "char[]",
        "string[][]" => "String[][]",
        "char[][]" => "char[][]",
        "ListNode[]" => "ListNode[]",
        "interval[]" => "Interval[]",
        "List<String>" => "java.util.List<String>",
        "Node" => "Node",
        "GraphNode" => "GraphNode",
        other => other,
    }
}

/// A TreeNode param after position 0 with a bare-number arg looks the node
/// up by value in the position-0 tree (LCA-style signatures).
fn is_lookup_param(params: &[leetlab_core::Parameter], position: usize, raw: &str) -> bool {
    position > 0
        && params
            .get(position)
            .is_some_and(|parameter| parameter.value_type == "TreeNode")
        && parse_literal(raw).is_number()
}

/// Build call arguments; TreeNode lookups need lvalue bindings for the root.
fn java_call_args(
    spec: &Judge,
    test: &leetlab_core::JudgeCase,
    index: usize,
) -> Result<(String, String), String> {
    let lookup = test
        .args
        .iter()
        .enumerate()
        .any(|(position, raw)| is_lookup_param(&spec.signature.params, position, raw));
    // Cyclic list literals also need a bound variable per element.
    let cycle = test
        .args
        .iter()
        .zip(&spec.signature.params)
        .any(|(raw, parameter)| {
            parameter.value_type == "ListNode"
                && matches!(parse_literal(raw), serde_json::Value::Object(_))
        });
    if !lookup && !cycle {
        let args = test
            .args
            .iter()
            .zip(&spec.signature.params)
            .map(|(raw, parameter)| java_literal(raw, &parameter.value_type))
            .collect::<Vec<_>>()
            .join(", ");
        return Ok((String::new(), args));
    }
    let mut declarations = String::new();
    let mut refs = Vec::new();
    for (position, (raw, parameter)) in test.args.iter().zip(&spec.signature.params).enumerate() {
        let expression = if is_lookup_param(&spec.signature.params, position, raw) {
            let val = trunc(&parse_literal(raw));
            format!("__JSpecial.__findTree(__a{index}_0, {val})")
        } else if parameter.value_type == "ListNode"
            && matches!(parse_literal(raw), serde_json::Value::Object(_))
        {
            let obj = parse_literal(raw);
            let list = obj.get("list").cloned().unwrap_or(serde_json::Value::Null);
            let pos = obj
                .get("pos")
                .and_then(|value| value.as_i64())
                .unwrap_or(-1);
            let items = match list {
                serde_json::Value::Array(items) => items
                    .iter()
                    .map(|item| trunc(item).to_string())
                    .collect::<Vec<_>>()
                    .join(", "),
                _ => String::new(),
            };
            format!("__JSpecial.__mkCycle(new int[]{{{items}}}, {pos})")
        } else {
            java_literal(raw, &parameter.value_type)
        };
        writeln!(
            declarations,
            "    {} __a{index}_{position} = {expression};",
            java_type(&parameter.value_type),
        )
        .unwrap();
        refs.push(format!("__a{index}_{position}"));
    }
    Ok((declarations, refs.join(", ")))
}

/// Linked-list-cycle staged harness: the fixture carries a harness-only
/// `pos` (tail wiring) while the solution takes only the head. Headless
/// port of the `linked-list-cycle` slug branch in plugin/host/judge.js.
fn build_java_cycle_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_list = bare.contains("class ListNode");
    let has_own_tree = bare.contains("class TreeNode");
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != 2 {
            return Err("Judge test argument count differs from the signature".into());
        }
        let vals = match parse_literal(&test.args[0]) {
            serde_json::Value::Array(items) => items,
            _ => return Err("Linked-list-cycle fixture must be an int array".into()),
        };
        let pos = trunc(&parse_literal(&test.args[1]));
        let lit = vals
            .iter()
            .map(|item| trunc(item).to_string())
            .collect::<Vec<_>>()
            .join(", ");
        writeln!(cases, "    System.out.println(\"@@CASE {index}\");").unwrap();
        writeln!(
            cases,
            "    try {{ ListNode __h{index} = __JSpecial.__mkCycle(new int[]{{{lit}}}, {pos}); Solution __s{index} = new Solution(); boolean __b{index} = __s{index}.{name}(__h{index}); System.out.println(\"\\n{marker} {index} \" + (__b{index} ? \"true\" : \"false\")); }} catch (Throwable __t) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage())); }}",
            name = spec.signature.name,
        )
        .unwrap();
    }
    let helpers = format!(
        "{}{}{}{}",
        if has_own_list { "" } else { JAVA_LIST_NODE },
        if has_own_tree { "" } else { JAVA_TREE_NODE },
        JAVA_LOOKUP_HELPERS,
        JAVA_HELPERS,
    );
    Ok(format!(
        "import java.util.*;\nimport java.io.*;\n\n{code}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n{cases}  }}\n}}\n{helpers}"
    ))
}

/// Copy-list-with-random-pointer staged harness: scoped random `Node`
/// shape plus deep-copy and input-unanimity checks. Emits only list/tree,
/// the random `Node` default and `__HR`; never the graph `Node` nor the
/// shared graph helpers. Headless port of the
/// `copy-list-with-random-pointer` slug branch.
fn build_java_copy_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_list = bare.contains("class ListNode");
    let has_own_tree = bare.contains("class TreeNode");
    let has_own_node = has_own_java_node(&bare);
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let rows = match parse_literal(&test.args[0]) {
            serde_json::Value::Array(rows) => rows,
            _ => return Err("Copy-list fixture must be a pair array".into()),
        };
        let mut vals = Vec::new();
        let mut rnds = Vec::new();
        for row in &rows {
            let (val, rnd) = copy_pair(row);
            vals.push(val.to_string());
            rnds.push(quote_plain(
                &rnd.map(|n| n.to_string()).unwrap_or_else(|| "null".into()),
            ));
        }
        let lit = format!(
            "__HR.__mkRandom(new int[]{{{}}}, new String[]{{{}}})",
            vals.join(", "),
            rnds.join(", ")
        );
        writeln!(cases, "    System.out.println(\"@@CASE {index}\");").unwrap();
        writeln!(
            cases,
            "    try {{ Node __h{index} = {lit}; String __before{index} = __HR.__randomOut(__h{index}); Solution __s{index} = new Solution(); Node __r{index} = __s{index}.{name}(__h{index}); if (__r{index} == __h{index} && __h{index} != null) {{ System.out.println(\"\\n{marker} {index} @@ERR not a deep copy: returned the input list\"); }} else if (!__HR.__randomOut(__h{index}).equals(__before{index})) {{ System.out.println(\"\\n{marker} {index} @@ERR mutated input list\"); }} else {{ String __value = __HR.__randomOut(__r{index}); System.out.println(\"\\n{marker} {index} \" + __value); }} }} catch (Throwable __t) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage())); }}",
            name = spec.signature.name,
        )
        .unwrap();
    }
    let helpers = format!(
        "{}{}{}",
        if has_own_list { "" } else { JAVA_LIST_NODE },
        if has_own_tree { "" } else { JAVA_TREE_NODE },
        if has_own_node { "" } else { JAVA_RANDOM_NODE },
    );
    Ok(format!(
        "import java.util.*;\nimport java.io.*;\n\n{code}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n{cases}  }}\n}}\n{helpers}{JAVA_RANDOM_HELPERS}"
    ))
}

/// Clone Graph staged harness: default graph `Node`, build from the adjList
/// literal, deep-copy identity check, canonical val-based serialization.
/// Headless port of the generic `Node`-return path in
/// plugin/host/judge.js.
fn build_java_clone_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_list = bare.contains("class ListNode");
    let has_own_tree = bare.contains("class TreeNode");
    let has_own_node = has_own_java_node(&bare);
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let adj = match parse_literal(&test.args[0]) {
            serde_json::Value::Array(rows) => rows,
            _ => return Err("Clone-graph fixture must be an adjacency array".into()),
        };
        let count = adj.len();
        let lit = adj
            .iter()
            .map(|row| {
                format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| trunc(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            })
            .collect::<Vec<_>>()
            .join(", ");
        writeln!(cases, "    System.out.println(\"@@CASE {index}\");").unwrap();
        writeln!(
            cases,
            "    try {{ Node __in{index} = __HG.__mkGraph(new int[][]{{{lit}}}); Solution __s{index} = new Solution(); Node __res{index} = __s{index}.{name}(__in{index}); String __idErr{index} = __HG.__graphIdentityError(__in{index}, __res{index}, {count}); if (__idErr{index} != null) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __idErr{index}); }} else {{ String __value = __HG.__graphOut(__res{index}, {count}); System.out.println(\"\\n{marker} {index} \" + __value); }} }} catch (Throwable __t) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage())); }}",
            name = spec.signature.name,
        )
        .unwrap();
    }
    let helpers = format!(
        "{}{}{}{}{}",
        if has_own_list { "" } else { JAVA_LIST_NODE },
        if has_own_tree { "" } else { JAVA_TREE_NODE },
        if has_own_node { "" } else { JAVA_GRAPH_NODE },
        JAVA_GRAPH_HELPERS,
        JAVA_HELPERS,
    );
    Ok(format!(
        "import java.util.*;\nimport java.io.*;\n\n{code}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n{cases}  }}\n}}\n{helpers}"
    ))
}

/// Serialize Codec round-trip harness: fresh `Codec` per case,
/// `deserialize(serialize(root))`, canonical tree compare (any encoding
/// accepted). Headless port of the `serialize-and-deserialize-binary-tree`
/// slug branch in plugin/host/judge.js.
fn build_java_serialize_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_list = bare.contains("class ListNode");
    let has_own_tree = bare.contains("class TreeNode");
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let root_lit = java_literal(
            test.args.first().map(String::as_str).unwrap_or("[]"),
            "TreeNode",
        );
        writeln!(cases, "    System.out.println(\"@@CASE {index}\");").unwrap();
        writeln!(
            cases,
            "    try {{ TreeNode __root{index} = {root_lit}; Codec __c{index} = new Codec(); String __s{index} = __c{index}.serialize(__root{index}); TreeNode __t{index} = __c{index}.deserialize(__s{index}); String __value = __H.__treeOut(__t{index}); System.out.println(\"\\n{marker} {index} \" + __value); }} catch (Throwable __t) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage())); }}",
        )
        .unwrap();
    }
    let helpers = format!(
        "{}{}{}",
        if has_own_list { "" } else { JAVA_LIST_NODE },
        if has_own_tree { "" } else { JAVA_TREE_NODE },
        JAVA_HELPERS,
    );
    Ok(format!(
        "import java.util.*;\nimport java.io.*;\n\n{code}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n{cases}  }}\n}}\n{helpers}"
    ))
}

/// C++ linked-list-cycle staged harness. Port of the `linked-list-cycle`
/// slug branch in `buildCppSource`.
fn build_cpp_cycle_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_nodes = bare.contains("struct ListNode") || bare.contains("struct TreeNode");
    let uses_nodes = spec.signature.params.iter().any(|parameter| {
        matches!(
            parameter.value_type.as_str(),
            "ListNode" | "ListNode[]" | "TreeNode"
        )
    }) || matches!(
        spec.signature.return_type.as_str(),
        "ListNode" | "ListNode[]" | "TreeNode"
    );
    let have_nodes = uses_nodes || has_own_nodes;
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != 2 {
            return Err("Judge test argument count differs from the signature".into());
        }
        let vals = match parse_literal(&test.args[0]) {
            serde_json::Value::Array(items) => items,
            _ => return Err("Linked-list-cycle fixture must be an int array".into()),
        };
        let pos = trunc(&parse_literal(&test.args[1]));
        let lit = vals
            .iter()
            .map(|item| trunc(item).to_string())
            .collect::<Vec<_>>()
            .join(", ");
        writeln!(cases, "  {{").unwrap();
        writeln!(
            cases,
            "    auto __h{index} = __mkCycle(std::vector<int>{{{lit}}}, {pos});"
        )
        .unwrap();
        writeln!(cases, "    Solution __s{index};").unwrap();
        writeln!(cases, "    std::cout << \"@@CASE {index}\" << std::endl;").unwrap();
        writeln!(
            cases,
            "    try {{ bool __b{index} = __s{index}.{name}(__h{index}); std::cout << \"\\n{marker} {index} \" << (__b{index} ? \"true\" : \"false\") << std::endl; }} catch (const std::exception& e) {{ std::cout << \"\\n{marker} {index} @@ERR \" << e.what() << std::endl; }}",
            name = spec.signature.name,
        )
        .unwrap();
        writeln!(cases, "  }}").unwrap();
    }
    Ok(format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n\n{maybe_nodes}{maybe_lookup}\n{code}\n\n{CPP_HELPERS}\nint main() {{\n  ios::sync_with_stdio(false);\n{cases}\n  return 0;\n}}\n",
        maybe_nodes = if has_own_nodes { "" } else { CPP_NODES },
        maybe_lookup = if have_nodes { CPP_LOOKUP_HELPERS } else { "" },
    ))
}

/// C++ copy-list-with-random-pointer staged harness. Port of the
/// `copy-list-with-random-pointer` slug branch in `buildCppSource`.
fn build_cpp_copy_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_list_tree = has_type_decl(&bare, "ListNode", &["struct"])
        || has_type_decl(&bare, "TreeNode", &["struct"]);
    let has_own_node = has_own_cpp_node(&bare);
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let rows = match parse_literal(&test.args[0]) {
            serde_json::Value::Array(rows) => rows,
            _ => return Err("Copy-list fixture must be a pair array".into()),
        };
        let mut vals = Vec::new();
        let mut rnds = Vec::new();
        for row in &rows {
            let (val, rnd) = copy_pair(row);
            vals.push(val.to_string());
            rnds.push(quote_plain(
                &rnd.map(|n| n.to_string()).unwrap_or_else(|| "null".into()),
            ));
        }
        let lit = format!(
            "__mkRandom(std::vector<int>{{{}}}, std::vector<std::string>{{{}}})",
            vals.join(", "),
            rnds.join(", ")
        );
        writeln!(cases, "  {{").unwrap();
        writeln!(cases, "    auto __h{index} = {lit};").unwrap();
        writeln!(
            cases,
            "    std::string __before{index} = __randomOut(__h{index});"
        )
        .unwrap();
        writeln!(cases, "    Solution __s{index};").unwrap();
        writeln!(cases, "    std::cout << \"@@CASE {index}\" << std::endl;").unwrap();
        writeln!(
            cases,
            "    try {{ Node* __r{index} = __s{index}.{name}(__h{index}); if (__r{index} == __h{index} && __h{index} != nullptr) {{ std::cout << \"\\n{marker} {index} @@ERR not a deep copy\" << std::endl; }} else if (__randomOut(__h{index}) != __before{index}) {{ std::cout << \"\\n{marker} {index} @@ERR mutated input\" << std::endl; }} else {{ std::string __value = __randomOut(__r{index}); std::cout << \"\\n{marker} {index} \" << __value << std::endl; }} }} catch (const std::exception& e) {{ std::cout << \"\\n{marker} {index} @@ERR \" << e.what() << std::endl; }}",
            name = spec.signature.name,
        )
        .unwrap();
        writeln!(cases, "  }}").unwrap();
    }
    Ok(format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n\n{maybe_list_tree}{maybe_node}\n{code}\n\n{CPP_RANDOM_HELPERS}\nint main() {{\n  ios::sync_with_stdio(false);\n{cases}\n  return 0;\n}}\n",
        maybe_list_tree = if has_own_list_tree { "" } else { CPP_LIST_TREE_NODES },
        maybe_node = if has_own_node { "" } else { CPP_RANDOM_NODE },
    ))
}

/// C++ Clone Graph staged harness. Port of the generic `Node`-return path
/// in `buildCppSource` in plugin/host/judge.js.
fn build_cpp_clone_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_nodes = bare.contains("struct ListNode")
        || bare.contains("struct TreeNode")
        || has_own_cpp_node(&bare);
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let adj = match parse_literal(&test.args[0]) {
            serde_json::Value::Array(rows) => rows,
            _ => return Err("Clone-graph fixture must be an adjacency array".into()),
        };
        let count = adj.len();
        let lit = adj
            .iter()
            .map(|row| {
                format!(
                    "{{{}}}",
                    array_items(row)
                        .iter()
                        .map(|item| trunc(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            })
            .collect::<Vec<_>>()
            .join(", ");
        writeln!(cases, "  {{").unwrap();
        writeln!(
            cases,
            "    auto __in{index} = __mkGraph(std::vector<std::vector<int>>{{{lit}}});"
        )
        .unwrap();
        writeln!(cases, "    Solution __s{index};").unwrap();
        writeln!(cases, "    std::cout << \"@@CASE {index}\" << std::endl;").unwrap();
        writeln!(
            cases,
            "    try {{ Node* __res{index} = __s{index}.{name}(__in{index}); std::string __idErr{index} = __graphIdentityError(__in{index}, __res{index}, {count}); if (!__idErr{index}.empty()) {{ std::cout << \"\\n{marker} {index} @@ERR \" << __idErr{index} << std::endl; }} else {{ std::string __value = __graphOut(__res{index}, {count}); std::cout << \"\\n{marker} {index} \" << __value << std::endl; }} }} catch (const std::exception& e) {{ std::cout << \"\\n{marker} {index} @@ERR \" << e.what() << std::endl; }}",
            name = spec.signature.name,
        )
        .unwrap();
        writeln!(cases, "  }}").unwrap();
    }
    Ok(format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n\n{maybe_nodes}{maybe_graph_node}\n{code}\n\n{CPP_HELPERS}\n{CPP_GRAPH_HELPERS}\nint main() {{\n  ios::sync_with_stdio(false);\n{cases}\n  return 0;\n}}\n",
        maybe_nodes = if has_own_nodes { "" } else { CPP_NODES },
        maybe_graph_node = if has_own_cpp_node(&bare) {
            ""
        } else {
            CPP_GRAPH_NODE
        },
    ))
}

/// C++ Serialize Codec round-trip harness. Port of the
/// `serialize-and-deserialize-binary-tree` slug branch in `buildCppSource`.
fn build_cpp_serialize_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_nodes = bare.contains("struct ListNode") || bare.contains("struct TreeNode");
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let root_lit = cpp_literal(
            test.args.first().map(String::as_str).unwrap_or("[]"),
            "TreeNode",
        );
        writeln!(cases, "  {{").unwrap();
        writeln!(cases, "    auto __root{index} = {root_lit};").unwrap();
        writeln!(cases, "    Codec __c{index};").unwrap();
        writeln!(cases, "    std::cout << \"@@CASE {index}\" << std::endl;").unwrap();
        writeln!(
            cases,
            "    try {{ std::string __s{index} = __c{index}.serialize(__root{index}); TreeNode* __t{index} = __c{index}.deserialize(__s{index}); std::cout << \"\\n{marker} {index} \" << __treeOut(__t{index}) << std::endl; }} catch (const std::exception& e) {{ std::cout << \"\\n{marker} {index} @@ERR \" << e.what() << std::endl; }}"
        )
        .unwrap();
        writeln!(cases, "  }}").unwrap();
    }
    Ok(format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n\n{maybe_nodes}\n{code}\n\n{CPP_HELPERS}\nint main() {{\n  ios::sync_with_stdio(false);\n{cases}\n  return 0;\n}}\n",
        maybe_nodes = if has_own_nodes { "" } else { CPP_NODES },
    ))
}

fn build_java_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    // A single `Main.java` cannot hold two public top-level types: demote
    // user `public class/interface/enum` declarations to package-private
    // before embedding.
    let demoted = demote_java_public(code);
    let code = demoted.as_str();
    if is_cycle_spec(spec) {
        return build_java_cycle_source(spec, code, marker);
    }
    if is_copy_spec(spec) {
        return build_java_copy_source(spec, code, marker);
    }
    if is_clone_spec(spec) {
        return build_java_clone_source(spec, code, marker);
    }
    if is_serialize_spec(spec) {
        return build_java_serialize_source(spec, code, marker);
    }
    let bare = strip_comments(code);
    let has_own_list = bare.contains("class ListNode");
    let has_own_tree = bare.contains("class TreeNode");
    let has_own_interval = bare.contains("class Interval");
    let uses_interval = spec
        .signature
        .params
        .iter()
        .any(|parameter| parameter.value_type == "interval[]")
        || spec.signature.return_type == "interval[]";
    let uses_nodes = spec.signature.params.iter().any(|parameter| {
        matches!(
            parameter.value_type.as_str(),
            "ListNode" | "ListNode[]" | "TreeNode"
        )
    }) || matches!(
        spec.signature.return_type.as_str(),
        "ListNode" | "ListNode[]" | "TreeNode"
    );
    let have_nodes = uses_nodes || has_own_list || has_own_tree;
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let (declarations, args) = java_call_args(spec, test, index)?;
        // Fresh Solution per case: instance fields must not leak across cases.
        let call = format!("__s{index}.{}({args})", spec.signature.name);
        writeln!(cases, "    System.out.println(\"@@CASE {index}\");").unwrap();
        cases.push_str(&declarations);
        writeln!(cases, "    Solution __s{index} = new Solution();").unwrap();
        if spec.signature.return_type == "void" {
            writeln!(
                cases,
                "    try {{ __s{index}.{name}({args}); System.out.println(\"\\n{marker} {index} @@VOID\"); }}",
                name = spec.signature.name,
            )
            .unwrap();
            writeln!(
                cases,
                "    catch (Throwable __t) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage())); }}"
            )
            .unwrap();
        } else {
            let serialize =
                java_serialize_expr(&spec.signature.return_type, &call).unwrap_or("null".into());
            writeln!(
                cases,
                "    try {{ String __value = {serialize}; System.out.println(\"\\n{marker} {index} \" + __value); }}"
            )
            .unwrap();
            writeln!(
                cases,
                "    catch (Throwable __t) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage())); }}"
            )
            .unwrap();
        }
        let _ = &call;
    }
    let custom_java = spec
        .helpers
        .as_ref()
        .and_then(|helpers| helpers.get("java"))
        .map(String::as_str)
        .unwrap_or("");
    let helpers = format!(
        "{}{}{}{}{}{}{}",
        if has_own_list { "" } else { JAVA_LIST_NODE },
        if has_own_tree { "" } else { JAVA_TREE_NODE },
        if uses_interval && !has_own_interval {
            JAVA_INTERVAL
        } else {
            ""
        },
        if have_nodes { JAVA_LOOKUP_HELPERS } else { "" },
        // Default `Node` definition when authored helpers reference it and
        // the user code does not define its own (copy shape uses the random
        // `Node`, every other shape the graph `Node`).
        if !has_own_java_node(&bare) && helpers_mention_node(spec) {
            if is_copy_shape(spec) {
                JAVA_RANDOM_NODE
            } else {
                JAVA_GRAPH_NODE
            }
        } else {
            ""
        },
        JAVA_HELPERS,
        custom_java,
    );
    Ok(format!(
        "import java.util.*;\nimport java.io.*;\n\n{code}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n{cases}  }}\n}}\n{helpers}"
    ))
}

pub(crate) fn build_cpp_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    if is_cycle_spec(spec) {
        return build_cpp_cycle_source(spec, code, marker);
    }
    if is_copy_spec(spec) {
        return build_cpp_copy_source(spec, code, marker);
    }
    if is_clone_spec(spec) {
        return build_cpp_clone_source(spec, code, marker);
    }
    if is_serialize_spec(spec) {
        return build_cpp_serialize_source(spec, code, marker);
    }
    let bare = strip_comments(code);
    let has_own_nodes = bare.contains("struct ListNode") || bare.contains("struct TreeNode");
    let has_own_interval = bare.contains("struct Interval");
    let uses_interval = spec
        .signature
        .params
        .iter()
        .any(|parameter| parameter.value_type == "interval[]")
        || spec.signature.return_type == "interval[]";
    let uses_nodes = spec.signature.params.iter().any(|parameter| {
        matches!(
            parameter.value_type.as_str(),
            "ListNode" | "ListNode[]" | "TreeNode"
        )
    }) || matches!(
        spec.signature.return_type.as_str(),
        "ListNode" | "ListNode[]" | "TreeNode"
    );
    let have_nodes = uses_nodes || has_own_nodes;
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let mut declarations = String::new();
        let mut refs = Vec::new();
        for (position, (raw, parameter)) in test.args.iter().zip(&spec.signature.params).enumerate()
        {
            let expression = if is_lookup_param(&spec.signature.params, position, raw) {
                let val = trunc(&parse_literal(raw));
                format!("__findTree(__a{index}_0, {val})")
            } else if parameter.value_type == "ListNode"
                && matches!(parse_literal(raw), serde_json::Value::Object(_))
            {
                let obj = parse_literal(raw);
                let list = obj.get("list").cloned().unwrap_or(serde_json::Value::Null);
                let pos = obj
                    .get("pos")
                    .and_then(|value| value.as_i64())
                    .unwrap_or(-1);
                let items = match list {
                    serde_json::Value::Array(items) => items
                        .iter()
                        .map(|item| trunc(item).to_string())
                        .collect::<Vec<_>>()
                        .join(", "),
                    _ => String::new(),
                };
                format!("__mkCycle(std::vector<int>{{{items}}}, {pos})")
            } else {
                cpp_literal(raw, &parameter.value_type)
            };
            let declaration = if parameter.value_type == "TreeNode"
                && position > 0
                && parse_literal(raw).is_number()
            {
                format!("    TreeNode* __a{index}_{position} = {expression};")
            } else {
                format!("    auto __a{index}_{position} = {expression};")
            };
            writeln!(declarations, "{declaration}").unwrap();
            refs.push(format!("__a{index}_{position}"));
        }
        // Fresh Solution per case and lvalue bindings: signatures may take
        // `vector<...>&`, which cannot bind to a temporary.
        writeln!(cases, "  {{").unwrap();
        cases.push_str(&declarations);
        writeln!(cases, "    Solution __s{index};").unwrap();
        writeln!(cases, "    std::cout << \"@@CASE {index}\" << std::endl;").unwrap();
        if spec.signature.return_type == "void" {
            writeln!(
                cases,
                "    try {{ __s{index}.{name}({args}); std::cout << \"\\n{marker} {index} @@VOID\" << std::endl; }} catch (const std::exception& e) {{ std::cout << \"\\n{marker} {index} @@ERR \" << e.what() << std::endl; }}",
                name = spec.signature.name,
                args = refs.join(", "),
            )
            .unwrap();
        } else {
            let serialize = cpp_serialize_expr(
                &spec.signature.return_type,
                &format!("__s{index}.{}({})", spec.signature.name, refs.join(", ")),
            )
            .unwrap_or("0".into());
            writeln!(
                cases,
                "    try {{ std::string __value = {serialize}; std::cout << \"\\n{marker} {index} \" << __value << std::endl; }} catch (const std::exception& e) {{ std::cout << \"\\n{marker} {index} @@ERR \" << e.what() << std::endl; }}"
            )
            .unwrap();
        }
        writeln!(cases, "  }}").unwrap();
    }
    let custom_cpp = spec
        .helpers
        .as_ref()
        .and_then(|helpers| helpers.get("cpp"))
        .map(String::as_str)
        .unwrap_or("");
    Ok(format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n\n{maybe_nodes}{maybe_graph}{maybe_interval}{maybe_lookup}\n{code}\n\n{CPP_HELPERS}\n{custom_cpp}\nint main() {{\n  ios::sync_with_stdio(false);\n{cases}\n  return 0;\n}}\n",
        maybe_nodes = if has_own_nodes { "" } else { CPP_NODES },
        // Default `Node` definition when authored helpers reference it and
        // the user code does not define its own (copy shape uses the random
        // `Node`, every other shape the graph `Node`).
        maybe_graph = if !has_own_cpp_node(&bare) && helpers_mention_node(spec) {
            if is_copy_shape(spec) {
                CPP_RANDOM_NODE
            } else {
                CPP_GRAPH_NODE
            }
        } else {
            ""
        },
        maybe_interval = if uses_interval && !has_own_interval {
            CPP_INTERVAL
        } else {
            ""
        },
        maybe_lookup = if have_nodes { CPP_LOOKUP_HELPERS } else { "" },
    ))
}

fn build_cpp_sequence_source(
    spec: &Judge,
    sequences: &[SequenceCase],
    code: &str,
    marker: &str,
) -> Result<String, String> {
    let bare = strip_comments(code);
    let class = &spec.signature.name;
    let custom_cpp = spec
        .helpers
        .as_ref()
        .and_then(|helpers| helpers.get("cpp"))
        .map(String::as_str)
        .unwrap_or("");
    let has_own_nodes = bare.contains("struct ListNode") || bare.contains("struct TreeNode");
    let mut cases = String::new();
    for (index, sequence) in sequences.iter().enumerate() {
        let mut ctor = Vec::new();
        for (position, value) in sequence.construct.iter().enumerate() {
            let literal = cpp_literal(&value.value, &value.value_type);
            ctor.push((position, literal));
        }
        writeln!(cases, "  {{").unwrap();
        let mut ctor_refs = Vec::new();
        for (position, literal) in ctor {
            writeln!(cases, "    auto __c{index}_{position} = {literal};").unwrap();
            ctor_refs.push(format!("__c{index}_{position}"));
        }
        if ctor_refs.is_empty() {
            writeln!(cases, "    {class} __o{index}{{}};").unwrap();
        } else {
            writeln!(cases, "    {class} __o{index}({});", ctor_refs.join(", ")).unwrap();
        }
        writeln!(cases, "    std::string __e{index};").unwrap();
        writeln!(cases, "    bool __bad{index} = false;").unwrap();
        let mut outputs = Vec::new();
        for (position, call) in sequence.calls.iter().enumerate() {
            check_sequence_call(call, position)?;
            let mut args = Vec::new();
            for (arg_pos, arg) in call.args.iter().enumerate() {
                let expression = seq_arg_cpp(arg, index)?;
                // Lvalue bindings: signatures may take non-const references,
                // which cannot bind to temporaries.
                writeln!(
                    cases,
                    "    auto __a{index}_{position}_{arg_pos} = {expression};"
                )
                .unwrap();
                args.push(format!("__a{index}_{position}_{arg_pos}"));
            }
            let invocation = format!("__o{index}.{}({})", call.method, args.join(", "));
            writeln!(cases, "    std::string __v{index}_{position} = \"null\";").unwrap();
            match &call.returns {
                None => writeln!(
                    cases,
                    "    try {{ {invocation}; }} catch (const std::exception& e) {{ __e{index} = e.what(); __bad{index} = true; }}"
                )
                .unwrap(),
                Some(returns) => {
                    let serialize = cpp_serialize_expr(&returns, &invocation).unwrap_or("0".into());
                    writeln!(
                        cases,
                        "    try {{ __v{index}_{position} = {serialize}; }} catch (const std::exception& e) {{ __e{index} = e.what(); __bad{index} = true; }}"
                    )
                    .unwrap();
                }
            }
            outputs.push(format!("__v{index}_{position}"));
        }
        let joined = if outputs.is_empty() {
            String::from("\"\"")
        } else {
            outputs.join(" + \",\" + ")
        };
        writeln!(cases, "    std::cout << \"@@CASE {index}\" << std::endl;").unwrap();
        writeln!(
            cases,
            "    if (__bad{index}) {{ std::cout << \"\\n{marker} {index} @@ERR \" << __e{index} << std::endl; }} else {{ std::cout << \"\\n{marker} {index} [\" + {joined} + \"]\" << std::endl; }}"
        )
        .unwrap();
        writeln!(cases, "  }}").unwrap();
    }
    Ok(format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n\n{maybe_nodes}\n{code}\n\n{CPP_HELPERS}\n{custom_cpp}\nint main() {{\n  ios::sync_with_stdio(false);\n{cases}\n  return 0;\n}}\n",
        maybe_nodes = if has_own_nodes { "" } else { CPP_NODES },
    ))
}

/// Void in-place drivers: call the method, then serialize the designated
/// mutated params as a JSON array for exact comparison.
fn build_java_mutate_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let demoted = demote_java_public(code);
    let code = demoted.as_str();
    let bare = strip_comments(code);
    let has_own_list = bare.contains("class ListNode");
    let has_own_tree = bare.contains("class TreeNode");
    let mutates = spec.mutates.clone().unwrap_or_default();
    for position in &mutates {
        if spec.signature.params.get(*position).is_none() {
            return Err("Mutated param index out of range".into());
        }
    }
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let mut declarations = String::new();
        let mut refs = Vec::new();
        for (position, (raw, parameter)) in test.args.iter().zip(&spec.signature.params).enumerate()
        {
            let expression = java_literal(raw, &parameter.value_type);
            writeln!(
                declarations,
                "    {} __a{index}_{position} = {expression};",
                java_type(&parameter.value_type),
            )
            .unwrap();
            refs.push(format!("__a{index}_{position}"));
        }
        let mut states = Vec::new();
        for position in &mutates {
            let parameter = &spec.signature.params[*position];
            states.push(
                java_serialize_expr(&parameter.value_type, &format!("__a{index}_{position}"))
                    .unwrap_or("null".into()),
            );
        }
        let joined = states.join(" + \",\" + ");
        let call = format!("__s{index}.{}({})", spec.signature.name, refs.join(", "));
        writeln!(cases, "    System.out.println(\"@@CASE {index}\");").unwrap();
        cases.push_str(&declarations);
        writeln!(cases, "    Solution __s{index} = new Solution();").unwrap();
        writeln!(
            cases,
            "    try {{ {call}; System.out.println(\"\\n{marker} {index} [\" + {joined} + \"]\"); }} catch (Throwable __t) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage())); }}"
        )
        .unwrap();
    }
    let custom_java = spec
        .helpers
        .as_ref()
        .and_then(|helpers| helpers.get("java"))
        .map(String::as_str)
        .unwrap_or("");
    let helpers = format!(
        "{}{}{}{}",
        if has_own_list { "" } else { JAVA_LIST_NODE },
        if has_own_tree { "" } else { JAVA_TREE_NODE },
        JAVA_HELPERS,
        custom_java,
    );
    Ok(format!(
        "import java.util.*;\nimport java.io.*;\n\n{code}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n{cases}  }}\n}}\n{helpers}"
    ))
}

fn build_cpp_mutate_source(spec: &Judge, code: &str, marker: &str) -> Result<String, String> {
    let bare = strip_comments(code);
    let has_own_nodes = bare.contains("struct ListNode") || bare.contains("struct TreeNode");
    let mutates = spec.mutates.clone().unwrap_or_default();
    for position in &mutates {
        if spec.signature.params.get(*position).is_none() {
            return Err("Mutated param index out of range".into());
        }
    }
    let mut cases = String::new();
    for (index, test) in spec.tests.iter().enumerate() {
        if test.args.len() != spec.signature.params.len() {
            return Err("Judge test argument count differs from the signature".into());
        }
        let mut declarations = String::new();
        let mut refs = Vec::new();
        for (position, (raw, parameter)) in test.args.iter().zip(&spec.signature.params).enumerate()
        {
            let expression = cpp_literal(raw, &parameter.value_type);
            writeln!(
                declarations,
                "    auto __a{index}_{position} = {expression};"
            )
            .unwrap();
            refs.push(format!("__a{index}_{position}"));
        }
        let mut states = Vec::new();
        for position in &mutates {
            let parameter = &spec.signature.params[*position];
            states.push(
                cpp_serialize_expr(&parameter.value_type, &format!("__a{index}_{position}"))
                    .unwrap_or("0".into()),
            );
        }
        let joined = states.join(" + \",\" + ");
        let call = format!("__s{index}.{}({})", spec.signature.name, refs.join(", "));
        writeln!(cases, "  {{").unwrap();
        cases.push_str(&declarations);
        writeln!(cases, "    Solution __s{index};").unwrap();
        writeln!(cases, "    std::cout << \"@@CASE {index}\" << std::endl;").unwrap();
        writeln!(
            cases,
            "    try {{ {call}; std::cout << \"\\n{marker} {index} [\" + {joined} + \"]\" << std::endl; }} catch (const std::exception& e) {{ std::cout << \"\\n{marker} {index} @@ERR \" << e.what() << std::endl; }}"
        )
        .unwrap();
        writeln!(cases, "  }}").unwrap();
    }
    let custom_cpp = spec
        .helpers
        .as_ref()
        .and_then(|helpers| helpers.get("cpp"))
        .map(String::as_str)
        .unwrap_or("");
    Ok(format!(
        "#include <bits/stdc++.h>\nusing namespace std;\n\n{maybe_nodes}\n{code}\n\n{CPP_HELPERS}\n{custom_cpp}\nint main() {{\n  ios::sync_with_stdio(false);\n{cases}\n  return 0;\n}}\n",
        maybe_nodes = if has_own_nodes { "" } else { CPP_NODES },
    ))
}

fn valid_ident(name: &str) -> bool {
    !name.is_empty()
        && name.as_bytes()[0].is_ascii_alphabetic()
        && name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn seq_arg_java(arg: &SeqArg, case_index: usize) -> Result<String, String> {
    match arg {
        SeqArg::Lit(value) => Ok(java_literal(&value.value, &value.value_type)),
        SeqArg::Prev { prev } => Ok(format!("__H.__unquote(__v{case_index}_{prev})")),
    }
}

fn seq_arg_cpp(arg: &SeqArg, case_index: usize) -> Result<String, String> {
    match arg {
        SeqArg::Lit(value) => Ok(cpp_literal(&value.value, &value.value_type)),
        SeqArg::Prev { prev } => Ok(format!("__unquote(__v{case_index}_{prev})")),
    }
}

fn check_sequence_call(call: &SeqCall, position: usize) -> Result<(), String> {
    if !valid_ident(&call.method) {
        return Err("Unsupported judge method name".into());
    }
    for arg in &call.args {
        if let SeqArg::Prev { prev } = arg {
            if *prev >= position {
                return Err("Sequence refers to a future call result".into());
            }
        }
    }
    Ok(())
}

fn build_java_sequence_source(
    spec: &Judge,
    sequences: &[SequenceCase],
    code: &str,
    marker: &str,
) -> Result<String, String> {
    let demoted = demote_java_public(code);
    let code = demoted.as_str();
    let bare = strip_comments(code);
    let class = &spec.signature.name;
    let custom_java = spec
        .helpers
        .as_ref()
        .and_then(|helpers| helpers.get("java"))
        .map(String::as_str)
        .unwrap_or("");
    let has_own_list = bare.contains("class ListNode");
    let has_own_tree = bare.contains("class TreeNode");
    let mut cases = String::new();
    for (index, sequence) in sequences.iter().enumerate() {
        let ctor = sequence
            .construct
            .iter()
            .map(|value| java_literal(&value.value, &value.value_type))
            .collect::<Vec<_>>()
            .join(", ");
        writeln!(cases, "    System.out.println(\"@@CASE {index}\");").unwrap();
        writeln!(cases, "    {class} __o{index} = new {class}({ctor});").unwrap();
        writeln!(cases, "    String __e{index} = null;").unwrap();
        let mut outputs = Vec::new();
        for (position, call) in sequence.calls.iter().enumerate() {
            check_sequence_call(call, position)?;
            let mut args = Vec::new();
            for arg in &call.args {
                args.push(seq_arg_java(arg, index)?);
            }
            let invocation = format!("__o{index}.{}({})", call.method, args.join(", "));
            writeln!(cases, "    String __v{index}_{position} = \"null\";").unwrap();
            match &call.returns {
                None => writeln!(
                    cases,
                    "    try {{ {invocation}; }} catch (Throwable __t) {{ __e{index} = __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage()); }}"
                )
                .unwrap(),
                Some(returns) => {
                    let serialize =
                        java_serialize_expr(returns, &invocation).unwrap_or("null".into());
                    writeln!(
                        cases,
                        "    try {{ __v{index}_{position} = {serialize}; }} catch (Throwable __t) {{ __e{index} = __t.getClass().getSimpleName() + \": \" + String.valueOf(__t.getMessage()); }}"
                    )
                    .unwrap();
                }
            }
            outputs.push(format!("__v{index}_{position}"));
        }
        let joined = if outputs.is_empty() {
            String::from("\"\"")
        } else {
            outputs.join(" + \",\" + ")
        };
        writeln!(
            cases,
            "    if (__e{index} != null) {{ System.out.println(\"\\n{marker} {index} @@ERR \" + __e{index}); }} else {{ System.out.println(\"\\n{marker} {index} [\" + {joined} + \"]\"); }}"
        )
        .unwrap();
    }
    let helpers = format!(
        "{}{}{}{}",
        if has_own_list { "" } else { JAVA_LIST_NODE },
        if has_own_tree { "" } else { JAVA_TREE_NODE },
        JAVA_HELPERS,
        custom_java,
    );
    Ok(format!(
        "import java.util.*;\nimport java.io.*;\n\n{code}\n\npublic class Main {{\n  public static void main(String[] __args) throws Exception {{\n{cases}  }}\n}}\n{helpers}"
    ))
}

fn check_method_name(spec: &Judge) -> Result<(), String> {
    let name = &spec.signature.name;
    if name.is_empty()
        || !name.as_bytes()[0].is_ascii_alphabetic()
        || !name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
    {
        return Err("Unsupported judge method name".into());
    }
    Ok(())
}

fn build_source(spec: &Judge, code: &str, cpp: bool, marker: &str) -> Result<String, String> {
    check_method_name(spec)?;
    if let Some(sequences) = spec.sequences.as_ref().filter(|s| !s.is_empty()) {
        for sequence in sequences {
            for (position, call) in sequence.calls.iter().enumerate() {
                check_sequence_call(call, position)?;
            }
        }
        return if cpp {
            build_cpp_sequence_source(spec, sequences, code, marker)
        } else {
            build_java_sequence_source(spec, sequences, code, marker)
        };
    }
    if spec.mutates.as_ref().is_some_and(|m| !m.is_empty()) {
        if spec.signature.return_type != "void" {
            return Err("Mutated params require a void method".into());
        }
        return if cpp {
            build_cpp_mutate_source(spec, code, marker)
        } else {
            build_java_mutate_source(spec, code, marker)
        };
    }
    if cpp {
        build_cpp_source(spec, code, marker)
    } else {
        build_java_source(spec, code, marker)
    }
}

/// Property validator for alien-dictionary style specs: any ordering that
/// satisfies the input constraints passes; an unsatisfiable input requires
/// the empty string.
/// Compare per-call outputs for a sequence case. An expected element of
/// `"__opaque__"` asserts only that the call succeeded with non-empty
/// output, so round-trips accept any lossless framing; every other element
/// must match exactly.
fn sequence_outputs_match(expected: &[String], got: &str) -> bool {
    let decoded = decode_value(got);
    let Some(outputs) = decoded.as_array() else {
        return false;
    };
    if outputs.len() != expected.len() {
        return false;
    }
    expected.iter().zip(outputs.iter()).all(|(want, have)| {
        if want == "__opaque__" {
            !matches!(have, serde_json::Value::Null)
                && have != &serde_json::Value::String(String::new())
        } else {
            values_equal(&decode_value(want), have, false)
        }
    })
}

fn validate_alien(words_raw: &str, got: &str) -> bool {
    let words: Vec<String> = match serde_json::from_str(words_raw.trim()) {
        Ok(value) => match value {
            serde_json::Value::Array(items) => items
                .into_iter()
                .filter_map(|item| item.as_str().map(str::to_owned))
                .collect(),
            _ => return false,
        },
        Err(_) => return false,
    };
    let got = match decode_value(got) {
        serde_json::Value::String(got) => got,
        _ => return false,
    };
    let mut distinct: Vec<char> = Vec::new();
    for word in &words {
        for ch in word.chars() {
            if !distinct.contains(&ch) {
                distinct.push(ch);
            }
        }
    }
    // Pairwise constraints from adjacent words; a longer word preceding its
    // own prefix makes the input unsatisfiable.
    let mut constraints: Vec<(char, char)> = Vec::new();
    let mut satisfiable = true;
    for pair in words.windows(2) {
        let (first, second) = (&pair[0], &pair[1]);
        let mut differ: Option<(char, char)> = None;
        for (a, b) in first.chars().zip(second.chars()) {
            if a != b {
                differ = Some((a, b));
                break;
            }
        }
        match differ {
            Some((a, b)) => constraints.push((a, b)),
            None => {
                if first.len() > second.len() {
                    satisfiable = false;
                }
            }
        }
    }
    if !satisfiable {
        return got.is_empty();
    }
    let order: Vec<char> = got.chars().collect();
    if order.len() != distinct.len() || got.is_empty() && !distinct.is_empty() {
        return false;
    }
    let mut seen = std::collections::BTreeSet::new();
    for ch in &order {
        if !distinct.contains(ch) || !seen.insert(*ch) {
            return false;
        }
    }
    constraints.into_iter().all(|(a, b)| {
        let (mut pa, mut pb) = (None, None);
        for (index, ch) in order.iter().enumerate() {
            if *ch == a {
                pa = Some(index);
            }
            if *ch == b {
                pb = Some(index);
            }
        }
        matches!((pa, pb), (Some(a), Some(b)) if a < b)
    })
}

// ---------------------------------------------------------------------------
// Comparators (port of `outputsMatch` in judge.js).
// ---------------------------------------------------------------------------

fn decode_value(raw: &str) -> serde_json::Value {
    let text = raw.trim();
    if text.is_empty() {
        return serde_json::Value::Null;
    }
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(text) {
        return value;
    }
    parse_literal(text)
}

fn json_type(value: &serde_json::Value) -> &'static str {
    match value {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "boolean",
        serde_json::Value::Number(_) => "number",
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}

fn values_equal(expected: &serde_json::Value, got: &serde_json::Value, tolerant: bool) -> bool {
    if json_type(expected) != json_type(got) {
        return false;
    }
    match (expected, got) {
        (serde_json::Value::Array(a), serde_json::Value::Array(b)) => {
            a.len() == b.len()
                && a.iter()
                    .zip(b.iter())
                    .all(|(x, y)| values_equal(x, y, tolerant))
        }
        (serde_json::Value::Number(a), serde_json::Value::Number(b)) => {
            let (a, b) = (a.as_f64().unwrap_or(0.0), b.as_f64().unwrap_or(0.0));
            if tolerant {
                a.is_finite() && b.is_finite() && (a - b).abs() <= 1e-5 * 1f64.max(a.abs())
            } else {
                a == b
            }
        }
        _ => expected == got,
    }
}

/// Compare parsed values without flattening nested structures or deleting
/// string spaces. `unordered` sorts outer elements; when every element is a
/// list of strings (Group Anagrams), inner lists are sorted too while numeric
/// inner lists keep their order.
pub fn outputs_match(expected: &str, got: &str, mode: &str) -> bool {
    let a = decode_value(expected);
    let b = decode_value(got);
    if values_equal(&a, &b, mode == "float") {
        return true;
    }
    if mode == "graph" {
        // Clone Graph identity mode (port of the `graph` branch in
        // `outputsMatch`): same node count and the same neighbor SETS per
        // node; neighbor order is irrelevant. Deep-copy identity (no shared
        // references) is enforced by the harness, which emits @@ERR.
        let (Some(a), Some(b)) = (a.as_array(), b.as_array()) else {
            return false;
        };
        if a.len() != b.len() {
            return false;
        }
        let norm = |row: &serde_json::Value| {
            row.as_array().map(|items| {
                let mut nums: Vec<i64> = items.iter().map(trunc).collect();
                nums.sort();
                nums
            })
        };
        return a
            .iter()
            .zip(b.iter())
            .all(|(x, y)| match (norm(x), norm(y)) {
                (Some(x), Some(y)) => x == y,
                _ => false,
            });
    }
    if mode != "unordered" {
        return false;
    }
    let (Some(a), Some(b)) = (a.as_array(), b.as_array()) else {
        return false;
    };
    if a.len() != b.len() {
        return false;
    }
    let string_groups = |values: &[serde_json::Value]| {
        values.iter().all(|row| {
            row.as_array()
                .is_some_and(|items| items.iter().all(|item| item.is_string()))
        })
    };
    let groups = string_groups(a) && string_groups(b);
    let mut keys_a: Vec<String> = a
        .iter()
        .map(|row| {
            let mut row = row.clone();
            if groups {
                if let Some(items) = row.as_array_mut() {
                    items.sort_by(|x, y| x.as_str().cmp(&y.as_str()));
                }
            }
            serde_json::to_string(&row).unwrap_or_default()
        })
        .collect();
    let mut keys_b: Vec<String> = b
        .iter()
        .map(|row| {
            let mut row = row.clone();
            if groups {
                if let Some(items) = row.as_array_mut() {
                    items.sort_by(|x, y| x.as_str().cmp(&y.as_str()));
                }
            }
            serde_json::to_string(&row).unwrap_or_default()
        })
        .collect();
    keys_a.sort();
    keys_b.sort();
    keys_a == keys_b
}

// ---------------------------------------------------------------------------
// Process management.
// ---------------------------------------------------------------------------

pub struct ExecOutput {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub ms: u64,
    pub timed_out: bool,
    pub output_limited: bool,
}

/// Best-effort descendant cleanup. The direct child is always killed by the
/// caller; this additionally asks the OS to remove its subtree. Failures are
/// ignored and documented — this is not a sandbox boundary.
fn kill_tree(pid: u32) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("pkill")
            .args(["-P", &pid.to_string()])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
}

fn read_capped(path: &Path) -> io::Result<String> {
    let mut bytes = Vec::new();
    fs::File::open(path)?
        .take((MAX_OUTPUT + 1) as u64)
        .read_to_end(&mut bytes)?;
    if bytes.len() > MAX_OUTPUT {
        return Err(io::Error::other("Output limit exceeded"));
    }
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

pub(crate) fn execute(
    program: &Path,
    args: &[&str],
    dir: &Path,
    timeout: Duration,
    cancel: &AtomicBool,
) -> Result<ExecOutput, String> {
    let stdout_path = dir.join("stdout");
    let stderr_path = dir.join("stderr");
    let open = |path: &Path| fs::File::create(path).map_err(|error| error.to_string());
    let mut command = Command::new(program);
    command
        .args(args)
        .current_dir(dir)
        .stdin(Stdio::null())
        .stdout(open(&stdout_path)?)
        .stderr(open(&stderr_path)?);
    // Sibling-DLL discovery: a resolved toolchain (bundled MinGW, Temurin
    // JDK) may live outside PATH. Prepending the program's own directory
    // lets the loader find libstdc++/JDK libraries for judge children
    // without touching the parent process environment.
    if let Some(home) = program.parent().filter(|home| !home.as_os_str().is_empty()) {
        let mut search = std::ffi::OsString::from(home.as_os_str());
        search.push(if cfg!(windows) { ";" } else { ":" });
        if let Some(path) = std::env::var_os(if cfg!(windows) { "Path" } else { "PATH" }) {
            search.push(path);
        }
        command.env(if cfg!(windows) { "Path" } else { "PATH" }, search);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    let mut child = command
        .spawn()
        .map_err(|error| format!("Could not launch {}: {error}", program.display()))?;
    let pid = child.id();
    let started = Instant::now();
    let mut timed_out = false;
    let mut output_limited = false;
    let status = loop {
        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            kill_tree(pid);
            let _ = child.wait();
            return Err("cancelled".into());
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                kill_tree(pid);
                let _ = child.wait();
                return Err(error.to_string());
            }
        }
        let over_limit = [&stdout_path, &stderr_path]
            .iter()
            .any(|path| fs::metadata(path).is_ok_and(|meta| meta.len() > MAX_OUTPUT as u64));
        if started.elapsed() >= timeout || over_limit {
            timed_out = !over_limit;
            output_limited = over_limit;
            let _ = child.kill();
            kill_tree(pid);
            match child.wait() {
                Ok(status) => break status,
                Err(_) => {
                    return Ok(ExecOutput {
                        code: None,
                        stdout: read_capped(&stdout_path).unwrap_or_default(),
                        stderr: "judge child could not be reaped".into(),
                        ms: started.elapsed().as_millis().min(u128::from(u64::MAX)) as u64,
                        timed_out,
                        output_limited,
                    });
                }
            };
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    let ms = started.elapsed().as_millis().min(u128::from(u64::MAX)) as u64;
    let stdout = read_capped(&stdout_path).unwrap_or_default();
    let stderr = read_capped(&stderr_path).unwrap_or_default();
    Ok(ExecOutput {
        code: status.code(),
        stdout,
        stderr,
        ms,
        timed_out,
        output_limited,
    })
}

// ---------------------------------------------------------------------------
// Verdicts.
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct CompileInfo {
    pub ok: bool,
    pub ms: u64,
    pub stderr: String,
}

#[derive(Debug, Clone)]
pub struct CaseResult {
    pub n: u32,
    pub expected: String,
    pub got: String,
    pub ok: bool,
    pub error: Option<String>,
    pub args: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Verdict {
    pub ok: bool,
    pub mode: String,
    pub compile: CompileInfo,
    pub cases: Vec<CaseResult>,
    pub passed: usize,
    pub total: usize,
    pub ms: u64,
    pub stderr: String,
    pub error: Option<String>,
    pub timed_out: bool,
}

fn parse_run_output(stdout: &str, total: usize, marker: &str) -> Vec<Option<String>> {
    let mut cases = vec![None; total];
    let prefix = format!("{marker} ");
    for line in stdout.split(['\r', '\n']) {
        // Split on '\r' or '\n' individually; skip the empty halves.
        if line.is_empty() || !line.starts_with(&prefix) {
            continue;
        }
        let rest = &line[prefix.len()..];
        let Some((index, value)) = rest.split_once(' ') else {
            continue;
        };
        if let Ok(index) = index.parse::<usize>() {
            if index < total {
                cases[index] = Some(value.to_owned());
            }
        }
    }
    cases
}

/// Actionable message when the isolated run directory cannot be created
/// (unwritable temp, broken TEMP, sandboxed profile). Surfaced verbatim as
/// the grading verdict so a GUI run shows what to fix instead of a raw
/// OS error.
fn temp_run_dir_error(dir: &Path, error: &io::Error) -> String {
    format!(
        "Could not create isolated run directory {}: {error}. \
         The judge needs a writable temp location (check TEMP).",
        dir.display()
    )
}

pub fn run_detailed(
    spec: &Judge,
    code: &str,
    cpp: bool,
    cancel: &AtomicBool,
) -> Result<Verdict, JudgeError> {
    if !supported(spec) {
        return Err(JudgeError::Setup(
            "This signature is outside the supported native judge coverage.".into(),
        ));
    }
    // Toolchain discovery failures are actionable missing-toolchain states,
    // not verdicts: candidates, bundled toolchains, and PATH are all covered.
    // Resolve ONLY the selected language so a broken C++ toolchain never
    // blocks Java grading (and vice versa).
    enum Tools {
        Java { javac: PathBuf, java: PathBuf },
        Cpp { cxx: PathBuf },
    }
    let tools = if cpp {
        Tools::Cpp {
            cxx: crate::toolchain::cxx_toolchain().map_err(JudgeError::Setup)?,
        }
    } else {
        let (javac, java) = crate::toolchain::java_toolchain().map_err(JudgeError::Setup)?;
        Tools::Java { javac, java }
    };
    if cancel.load(Ordering::Relaxed) {
        return Err(JudgeError::Cancelled);
    }
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| JudgeError::Setup(error.to_string()))?
        .as_nanos();
    let marker = format!("@@LC_{nonce}");
    let source = build_source(spec, code, cpp, &marker).map_err(JudgeError::Setup)?;
    let dir = std::env::temp_dir().join(format!(
        "leetlab-{}-{nonce}-{}",
        std::process::id(),
        NEXT_RUN.fetch_add(1, Ordering::Relaxed)
    ));
    fs::create_dir(&dir).map_err(|error| JudgeError::Setup(temp_run_dir_error(&dir, &error)))?;
    let verdict = (|| {
        let judge_exe = dir.join("judge.exe");
        let (program, compile_args, run_program, run_args): (
            PathBuf,
            Vec<&str>,
            Option<PathBuf>,
            Vec<&str>,
        );
        if cpp {
            fs::write(dir.join("main.cpp"), &source)
                .map_err(|error| JudgeError::Setup(error.to_string()))?;
            let Tools::Cpp { cxx } = &tools else {
                unreachable!("cpp toolchain resolved above")
            };
            program = cxx.clone();
            // Static-link everything so the judged binary runs anywhere with
            // no DLL discovery: no bundled libstdc++/libgcc/libwinpthread
            // lookup, in any working directory, under any PATH.
            compile_args = vec![
                "-std=gnu++20",
                "-O2",
                "-static",
                "-o",
                "judge.exe",
                "main.cpp",
            ];
            run_program = Some(judge_exe);
            run_args = Vec::new();
        } else {
            fs::write(dir.join("Main.java"), &source)
                .map_err(|error| JudgeError::Setup(error.to_string()))?;
            let Tools::Java { javac, .. } = &tools else {
                unreachable!("java toolchain resolved above")
            };
            program = javac.clone();
            compile_args = vec!["-encoding", "UTF-8", "Main.java"];
            run_program = None;
            run_args = vec!["-cp", ".", "Main"];
        }
        let compile =
            execute(&program, &compile_args, &dir, COMPILE_TIMEOUT, cancel).map_err(|error| {
                if error == "cancelled" {
                    JudgeError::Cancelled
                } else {
                    // The compiler never started: broken toolchain, not a run.
                    JudgeError::Setup(error)
                }
            })?;
        let total = spec.sequences.as_ref().map_or(spec.tests.len(), Vec::len);
        if compile.code != Some(0) {
            let stderr = if compile.stderr.trim().is_empty() {
                compile.stdout.clone()
            } else {
                compile.stderr.clone()
            };
            return Ok(Verdict {
                ok: false,
                mode: spec.mode.clone(),
                compile: CompileInfo {
                    ok: false,
                    ms: compile.ms,
                    stderr: stderr.chars().take(4000).collect(),
                },
                cases: Vec::new(),
                passed: 0,
                total,
                ms: compile.ms,
                stderr: String::new(),
                error: if compile.timed_out {
                    Some("compile timed out".into())
                } else {
                    None
                },
                timed_out: false,
            });
        }
        let compile_info = CompileInfo {
            ok: true,
            ms: compile.ms,
            stderr: compile.stderr.clone(),
        };
        let run = if cpp {
            execute(
                run_program.as_deref().unwrap(),
                &run_args,
                &dir,
                RUN_TIMEOUT,
                cancel,
            )
            .map_err(|error| {
                if error == "cancelled" {
                    JudgeError::Cancelled
                } else {
                    JudgeError::Run(error)
                }
            })?
        } else {
            let Tools::Java { java, .. } = &tools else {
                unreachable!("java toolchain resolved above")
            };
            execute(java, &run_args, &dir, RUN_TIMEOUT, cancel).map_err(|error| {
                if error == "cancelled" {
                    JudgeError::Cancelled
                } else {
                    // Compilation succeeded; the run itself broke.
                    JudgeError::Run(error)
                }
            })?
        };
        if run.output_limited {
            return Ok(Verdict {
                ok: false,
                mode: spec.mode.clone(),
                compile: compile_info,
                cases: Vec::new(),
                passed: 0,
                total,
                ms: run.ms,
                stderr: run.stderr.chars().take(4000).collect(),
                error: Some("output limit exceeded".into()),
                timed_out: false,
            });
        }
        let outputs = parse_run_output(&run.stdout, total, &marker);
        let mut cases = Vec::with_capacity(total);
        if let Some(sequences) = spec.sequences.as_ref().filter(|s| !s.is_empty()) {
            for (sequence, output) in sequences.iter().zip(&outputs) {
                let expected = format!("[{}]", sequence.expected.join(","));
                let Some(got) = output else {
                    cases.push(CaseResult {
                        n: sequence.example,
                        expected,
                        got: "<no output>".into(),
                        ok: false,
                        error: Some("solution printed nothing for this case".into()),
                        args: sequence
                            .calls
                            .iter()
                            .map(|call| call.method.clone())
                            .collect(),
                    });
                    continue;
                };
                if let Some(detail) = got.strip_prefix("@@ERR") {
                    cases.push(CaseResult {
                        n: sequence.example,
                        expected,
                        got: String::new(),
                        ok: false,
                        error: Some(detail.trim().to_owned()),
                        args: sequence
                            .calls
                            .iter()
                            .map(|call| call.method.clone())
                            .collect(),
                    });
                } else {
                    let ok = sequence_outputs_match(&sequence.expected, got);
                    cases.push(CaseResult {
                        n: sequence.example,
                        expected,
                        got: got.clone(),
                        ok,
                        error: if ok {
                            None
                        } else {
                            Some("output mismatch".into())
                        },
                        args: sequence
                            .calls
                            .iter()
                            .map(|call| call.method.clone())
                            .collect(),
                    });
                }
            }
        } else {
            for (test, output) in spec.tests.iter().zip(&outputs) {
                let Some(got) = output else {
                    cases.push(CaseResult {
                        n: test.example,
                        expected: test.expected.clone(),
                        got: "<no output>".into(),
                        ok: false,
                        error: Some("solution printed nothing for this case".into()),
                        args: test.args.clone(),
                    });
                    continue;
                };
                if spec.signature.return_type == "void"
                    && spec.mutates.as_ref().is_none_or(|m| m.is_empty())
                {
                    if let Some(detail) = got.strip_prefix("@@ERR") {
                        cases.push(CaseResult {
                            n: test.example,
                            expected: "void".into(),
                            got: String::new(),
                            ok: false,
                            error: Some(detail.trim().to_owned()),
                            args: test.args.clone(),
                        });
                    } else {
                        cases.push(CaseResult {
                            n: test.example,
                            expected: "void".into(),
                            got: "void".into(),
                            ok: true,
                            error: None,
                            args: test.args.clone(),
                        });
                    }
                    continue;
                }
                if let Some(detail) = got.strip_prefix("@@ERR") {
                    cases.push(CaseResult {
                        n: test.example,
                        expected: test.expected.clone(),
                        got: String::new(),
                        ok: false,
                        error: Some(detail.trim().to_owned()),
                        args: test.args.clone(),
                    });
                } else {
                    let mut ok = outputs_match(&test.expected, got, &spec.mode);
                    if ok && spec.validate.as_deref() == Some("alien-order") {
                        ok = test
                            .args
                            .first()
                            .is_some_and(|words| validate_alien(words, got));
                    }
                    cases.push(CaseResult {
                        n: test.example,
                        expected: test.expected.clone(),
                        got: got.clone(),
                        ok,
                        error: if ok {
                            None
                        } else {
                            Some("output mismatch".into())
                        },
                        args: test.args.clone(),
                    });
                }
            }
        }
        let passed = cases.iter().filter(|entry| entry.ok).count();
        let abnormal = run.code != Some(0);
        Ok(Verdict {
            ok: passed == total && !abnormal && !run.timed_out,
            mode: spec.mode.clone(),
            compile: compile_info,
            cases,
            passed,
            total,
            ms: run.ms,
            stderr: run.stderr.chars().take(4000).collect(),
            error: if run.timed_out {
                Some("time limit exceeded".into())
            } else if abnormal {
                Some("solution exited abnormally".into())
            } else {
                None
            },
            timed_out: run.timed_out,
        })
    })();
    let _ = fs::remove_dir_all(&dir);
    verdict
}

pub fn format_verdict(verdict: &Verdict) -> String {
    if !verdict.compile.ok {
        return format!(
            "Compile error · 0/{} cases\n{}",
            verdict.total,
            verdict
                .compile
                .stderr
                .chars()
                .take(2000)
                .collect::<String>()
        );
    }
    let status = if verdict.ok { "Passed" } else { "Wrong answer" };
    let mut out = format!(
        "{status} · {}/{} cases · compile {}ms · run {}ms · {} mode",
        verdict.passed, verdict.total, verdict.compile.ms, verdict.ms, verdict.mode
    );
    if verdict.timed_out {
        out.push_str(" · time limit exceeded");
    }
    if let Some(error) = &verdict.error {
        if !verdict.ok && !verdict.timed_out {
            write!(out, " · {error}").unwrap();
        }
    }
    for case in &verdict.cases {
        if !case.ok {
            let got = if case.got.is_empty() {
                case.error.as_deref().unwrap_or("<no output>")
            } else {
                &case.got
            };
            let args = case.args.join(", ");
            write!(
                out,
                "\nCase {} · args {} · expected {}, got {}",
                case.n,
                args.chars().take(120).collect::<String>(),
                case.expected,
                got.chars().take(160).collect::<String>()
            )
            .unwrap();
        }
    }
    if !verdict.stderr.trim().is_empty() {
        write!(
            out,
            "\nstderr: {}",
            verdict.stderr.chars().take(500).collect::<String>()
        )
        .unwrap();
    }
    out
}

/// UI-facing outcome of one judge invocation: always-renderable text plus
/// the pass flag and run time the progress store needs. Thin presentation
/// over [`run_detailed`]; the smoke-test entry [`run`] keeps its own mapping.
#[derive(Debug, Clone)]
pub struct Outcome {
    /// True exactly when kind == Passed. Kept for callers that only need
    /// the pass flag (tests, smoke entry); product logic keys on kind.
    #[allow(dead_code)]
    pub ok: bool,
    pub ms: Option<u64>,
    pub text: String,
    pub kind: OutcomeKind,
}

/// Machine-readable verdict class. Setup failures and cancellations never
/// touch progress (no run happened); every other class records an attempt,
/// and only [`OutcomeKind::Passed`] records solved on Submit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutcomeKind {
    Setup,
    Cancelled,
    CompileError,
    RuntimeError,
    WrongAnswer,
    Passed,
}

/// Why a detailed run never produced a verdict. `Setup` means the toolchain,
/// temp dir, or spec was unusable (nothing executed); `Run` means compilation
/// succeeded but execution failed (aborted child, wait error).
#[derive(Debug, Clone)]
pub enum JudgeError {
    Setup(String),
    Cancelled,
    Run(String),
}

impl JudgeError {
    fn message(&self) -> String {
        match self {
            JudgeError::Setup(text) | JudgeError::Run(text) => text.clone(),
            JudgeError::Cancelled => "cancelled".into(),
        }
    }
}

pub fn judge_code(spec: &Judge, code: &str, cpp: bool, cancel: &AtomicBool) -> Outcome {
    let program = if cpp { "judge.exe" } else { "java" };
    let toolchain = if cpp { "g++" } else { "javac" };
    match run_detailed(spec, code, cpp, cancel) {
        Err(JudgeError::Cancelled) => Outcome {
            ok: false,
            ms: None,
            text: "Cancelled.".into(),
            kind: OutcomeKind::Cancelled,
        },
        Err(JudgeError::Setup(error)) => Outcome {
            ok: false,
            ms: None,
            text: error,
            kind: OutcomeKind::Setup,
        },
        Err(JudgeError::Run(error)) => Outcome {
            ok: false,
            ms: None,
            text: error,
            kind: OutcomeKind::RuntimeError,
        },
        Ok(verdict) if !verdict.compile.ok => Outcome {
            ok: false,
            ms: None,
            text: format!("{toolchain} compilation failed\n{}", verdict.compile.stderr),
            kind: OutcomeKind::CompileError,
        },
        Ok(verdict) if verdict.timed_out => Outcome {
            ok: false,
            ms: None,
            text: format!("{program} exceeded the time limit"),
            kind: OutcomeKind::RuntimeError,
        },
        Ok(verdict) => {
            let abnormal = verdict.error.as_deref() == Some("solution exited abnormally")
                || verdict.error.as_deref() == Some("output limit exceeded");
            Outcome {
                ok: verdict.ok && !abnormal,
                ms: Some(verdict.ms),
                text: format_verdict(&verdict),
                kind: if verdict.ok && !abnormal {
                    OutcomeKind::Passed
                } else if abnormal {
                    OutcomeKind::RuntimeError
                } else {
                    OutcomeKind::WrongAnswer
                },
            }
        }
    }
}

/// Simple non-cancellable entry point. The UI runs [`run_detailed`] so the
/// Cancel control can interrupt compilation and execution; the smoke suites
/// exercise this entry. Kept compiled for the Submit/Trace slice.
#[allow(dead_code)]
pub fn run(spec: &Judge, code: &str, cpp: bool) -> Result<String, String> {
    let idle = AtomicBool::new(false);
    match run_detailed(spec, code, cpp, &idle).map_err(|error| error.message())? {
        verdict if !verdict.compile.ok => Err(format!(
            "{} compilation failed\n{}",
            if cpp { "g++" } else { "javac" },
            verdict.compile.stderr
        )),
        verdict if verdict.timed_out => Err(format!(
            "{} exceeded the time limit",
            if cpp { "judge.exe" } else { "java" }
        )),
        verdict => Ok(format_verdict(&verdict)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn literal_spot_checks() {
        assert_eq!(java_literal("9", "int"), "9");
        assert_eq!(java_literal("9", "long"), "9L");
        assert_eq!(
            java_literal("[2,7,11,15]", "int[]"),
            "new int[]{2, 7, 11, 15}"
        );
        assert_eq!(java_literal("hit", "string"), "\"hit\"");
        assert_eq!(cpp_literal("[1,2]", "int[]"), "std::vector<int>{1, 2}");
        assert_eq!(
            java_literal("[[1,2],[3]]", "int[][]"),
            "new int[][]{{1, 2}, {3}}"
        );
        assert!(java_literal("[1,2]", "ListNode").contains("__H.__mkList"));
        assert!(java_literal("[1,null,3]", "TreeNode").contains("__H.__mkTree"));
        assert!(cpp_literal("[1,2]", "ListNode").contains("__mkList"));
    }

    #[test]
    fn comparator_spot_checks() {
        assert!(outputs_match("[0,1]", "[0,1]", "exact"));
        assert!(!outputs_match("[0,1]", "[1,0]", "exact"));
        assert!(outputs_match("[0,1]", "[1,0]", "unordered"));
        assert!(outputs_match(
            "[[eat,tea],[tan]]",
            "[[tan],[tea,eat]]",
            "unordered"
        ));
        assert!(!outputs_match("[[1,2]]", "[[2,1]]", "unordered"));
        assert!(outputs_match("0.333333", "0.3333333", "float"));
        assert!(!outputs_match("1.0", "1.5", "float"));
        assert!(outputs_match("[0,1]", "[0,1]", "any"));
        // Graph identity mode compares neighbor SETS per node.
        assert!(outputs_match("[[2,4],[1,3]]", "[[4,2],[3,1]]", "graph"));
        assert!(!outputs_match("[[2,4],[1,3]]", "[[2,3],[1,3]]", "graph"));
        assert!(!outputs_match("[[2,4]]", "[[2,4],[1,3]]", "graph"));
        let graph_spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "graph",
            "signature": {"name": "cloneGraph", "params": [{"name": "node", "type": "Node"}], "return": "Node"},
            "tests": [{"args": ["[[2,4],[1,3]]"], "expected": "[[2,4],[1,3]]", "example": 1}],
        }))
        .unwrap();
        assert!(supported(&graph_spec));
    }

    #[test]
    fn public_demotion_keeps_single_file_compilable() {
        assert_eq!(
            demote_java_public("public class Solution { public int f() { return 1; } }"),
            " class Solution { public int f() { return 1; } }"
        );
        assert_eq!(
            demote_java_public("public final class Codec { }"),
            " final class Codec { }"
        );
        assert!(demote_java_public("public interface I { }").starts_with(" interface I"));
        assert!(
            demote_java_public("public @interface A { }").contains("@interface A")
                && !demote_java_public("public @interface A { }").contains("public @interface")
        );
        // Member modifiers, comments and string literals are untouched.
        let code = "/* public class Fake */\nclass Solution { public int v; String s = \"public class X\"; } // public class Y";
        let demoted = demote_java_public(code);
        assert!(demoted.contains("public int v"));
        assert!(demoted.contains("\"public class X\""));
        assert!(demoted.contains("/* public class Fake */"));
        assert!(demoted.contains("// public class Y"));
        // No false positive on identifiers merely containing the word.
        assert_eq!(
            demote_java_public("class Republic { }"),
            "class Republic { }"
        );
        // Builders demote before embedding: no second public top-level type.
        let spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "twoSum", "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}], "return": "int[]"},
            "tests": [{"args": ["[2,7,11,15]", "9"], "expected": "[0,1]", "example": 1}],
        }))
        .unwrap();
        let java = build_java_source(&spec, "public class Solution {}", "@@LC_X").unwrap();
        assert!(!java.contains("public class Solution"));
        assert!(java.contains("class Solution"));
        assert!(java.contains("public class Main"));
    }

    #[test]
    fn exotic_branches_emit_expected_harness_markers() {
        let cycle_spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "hasCycle", "params": [{"name": "head", "type": "ListNode"}, {"name": "pos", "type": "int"}], "return": "boolean"},
            "tests": [{"args": ["[3,2,0,-4]", "1"], "expected": "true", "example": 1}],
        }))
        .unwrap();
        let java = build_java_source(&cycle_spec, "public class Solution {}", "@@LC_X").unwrap();
        assert!(java.contains("__JSpecial.__mkCycle(new int[]{3, 2, 0, -4}, 1)"));
        assert!(!java.contains("public class Solution"));
        let cpp = build_cpp_source(&cycle_spec, "class Solution {};", "@@LC_X").unwrap();
        assert!(cpp.contains("__mkCycle(std::vector<int>{3, 2, 0, -4}, 1)"));

        let copy_spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "copyRandomList", "params": [{"name": "head", "type": "Node"}], "return": "Node"},
            "tests": [{"args": ["[[7,null],[13,0]]"], "expected": "[[7,null],[13,0]]", "example": 1}],
        }))
        .unwrap();
        let java = build_java_source(&copy_spec, "class Solution {}", "@@LC_X").unwrap();
        assert!(java.contains("__HR.__mkRandom(new int[]{7, 13}, new String[]{\"null\", \"0\"})"));
        assert!(java.contains("__HR.__randomOut"));
        assert!(java.contains("Node next;"));
        assert!(!java.contains("neighbors"));
        let cpp = build_cpp_source(&copy_spec, "class Solution {};", "@@LC_X").unwrap();
        assert!(cpp.contains("__mkRandom(std::vector<int>{7, 13}"));
        assert!(cpp.contains("__randomOut"));

        let clone_spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "graph",
            "signature": {"name": "cloneGraph", "params": [{"name": "node", "type": "Node"}], "return": "Node"},
            "tests": [{"args": ["[[2,4],[1,3]]"], "expected": "[[2,4],[1,3]]", "example": 1}],
        }))
        .unwrap();
        let java = build_java_source(&clone_spec, "class Solution {}", "@@LC_X").unwrap();
        assert!(java.contains("__HG.__mkGraph(new int[][]{{2, 4}, {1, 3}})"));
        assert!(java.contains("__HG.__graphIdentityError"));
        assert!(java.contains("neighbors"));
        let cpp = build_cpp_source(&clone_spec, "class Solution {};", "@@LC_X").unwrap();
        assert!(cpp.contains("__mkGraph(std::vector<std::vector<int>>{{2, 4}, {1, 3}})"));
        assert!(cpp.contains("__graphIdentityError"));

        let ser_spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "serialize", "params": [{"name": "root", "type": "TreeNode"}], "return": "TreeNode"},
            "tests": [{"args": ["[1,2,3]"], "expected": "[1,2,3]", "example": 1}],
        }))
        .unwrap();
        let java = build_java_source(&ser_spec, "public class Codec {}", "@@LC_X").unwrap();
        assert!(java.contains("Codec __c0 = new Codec()"));
        assert!(java.contains("__c0.deserialize(__s0)"));
        assert!(!java.contains("public class Codec"));
        let cpp = build_cpp_source(&ser_spec, "class Codec {};", "@@LC_X").unwrap();
        assert!(cpp.contains("Codec __c0;"));
        assert!(cpp.contains("__c0.deserialize(__s0)"));
    }

    #[test]
    fn harness_has_markers_and_isolation() {
        let spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "twoSum", "params": [{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}], "return": "int[]"},
            "tests": [{"args": ["[2,7,11,15]", "9"], "expected": "[0,1]", "example": 1}],
        }))
        .unwrap();
        let java = build_java_source(&spec, "class Solution {}", "@@LC_X").unwrap();
        assert!(java.contains("@@CASE 0"));
        assert!(java.contains("@@LC_X 0"));
        assert!(java.contains("new Solution()"));
        assert!(java.contains("@@ERR"));
        let cpp = build_cpp_source(&spec, "class Solution {};", "@@LC_X").unwrap();
        assert!(cpp.contains("@@CASE 0"));
        assert!(cpp.contains("__s0.twoSum(__a0_0, __a0_1)"));
        let void_spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "rotate", "params": [{"name": "nums", "type": "int[]"}], "return": "void"},
            "tests": [{"args": ["[1,2]"], "expected": "null", "example": 1}],
        }))
        .unwrap();
        assert!(build_java_source(&void_spec, "class Solution {}", "@@LC_X")
            .unwrap()
            .contains("@@VOID"));
    }

    #[test]
    fn run_output_parsing_maps_cases() {
        let out = "@@LC_X 0 [0,1]\nnoise\n@@LC_X 1 @@ERR NullPointer: boom";
        let parsed = parse_run_output(out, 2, "@@LC_X");
        assert_eq!(parsed[0].as_deref(), Some("[0,1]"));
        assert_eq!(parsed[1].as_deref(), Some("@@ERR NullPointer: boom"));
    }

    #[test]
    fn expanded_support_covers_curriculum_surface() {
        let spec: Judge = serde_json::from_value(serde_json::json!({
            "mode": "float",
            "signature": {"name": "findMedianSortedArrays",
                "params": [{"name": "nums1", "type": "int[]"}, {"name": "nums2", "type": "int[]"}],
                "return": "double"},
            "tests": [{"args": ["[1,3]", "[2]"], "expected": "2.0", "example": 1}],
        }))
        .unwrap();
        assert!(supported(&spec));
    }

    #[test]
    #[ignore = "requires javac, java and g++ on PATH"]
    fn runs_real_java_and_cpp_cases() {
        let catalog =
            leetlab_core::Catalog::open(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.."))
                .unwrap();
        let problem = catalog.problem("contains-duplicate").unwrap();
        let spec = problem.judge.unwrap();
        let java = "class Solution { boolean containsDuplicate(int[] nums) { Set<Integer> seen = new HashSet<>(); for (int n : nums) if (!seen.add(n)) return true; return false; }}";
        let cpp = "class Solution { public: bool containsDuplicate(vector<int>& nums) { return set<int>(nums.begin(), nums.end()).size() != nums.size(); }};";
        assert!(run(&spec, java, false).unwrap().starts_with("Passed"));
        assert!(run(&spec, cpp, true).unwrap().starts_with("Passed"));
        let wrong = "class Solution { boolean containsDuplicate(int[] nums) { return false; }}";
        assert!(run(&spec, wrong, false)
            .unwrap()
            .starts_with("Wrong answer"));
        assert!(run(&spec, "invalid Java", false)
            .unwrap_err()
            .contains("javac"));
        let spec = catalog.problem("two-sum").unwrap().judge.unwrap();
        let java = "class Solution { int[] twoSum(int[] a,int t) { for(int i=0;i<a.length;i++) for(int j=i+1;j<a.length;j++) if(a[i]+a[j]==t) return new int[]{i,j}; return new int[0]; }}";
        let cpp = "class Solution { public: vector<int> twoSum(vector<int>& a,int t) { for(int i=0;i<(int)a.size();i++) for(int j=i+1;j<(int)a.size();j++) if(a[i]+a[j]==t) return {i,j}; return {}; }};";
        assert!(run(&spec, java, false).unwrap().starts_with("Passed"));
        assert!(run(&spec, cpp, true).unwrap().starts_with("Passed"));
    }

    #[test]
    #[ignore = "requires javac, java and g++ on PATH"]
    fn runs_string_grid_list_and_float_cases() {
        let catalog =
            leetlab_core::Catalog::open(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.."))
                .unwrap();
        let anagram = catalog.problem("valid-anagram").unwrap().judge.unwrap();
        let java = "class Solution { boolean isAnagram(String s, String t) { char[] a = s.toCharArray(); char[] b = t.toCharArray(); Arrays.sort(a); Arrays.sort(b); return Arrays.equals(a, b); }}";
        assert!(run(&anagram, java, false).unwrap().starts_with("Passed"));
        let islands = catalog.problem("number-of-islands").unwrap().judge.unwrap();
        let java = "class Solution { public int numIslands(char[][] grid) { if (grid.length == 0) return 0; int count = 0; for (int r = 0; r < grid.length; r++) for (int c = 0; c < grid[0].length; c++) if (grid[r][c] == '1') { count++; flood(grid, r, c); } return count; } private void flood(char[][] g, int r, int c) { if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return; g[r][c] = '0'; flood(g, r+1, c); flood(g, r-1, c); flood(g, r, c+1); flood(g, r, c-1); } }";
        assert!(run(&islands, java, false).unwrap().starts_with("Passed"));
        let median = catalog
            .problem("median-of-two-sorted-arrays")
            .unwrap()
            .judge
            .unwrap();
        let java = "class Solution { public double findMedianSortedArrays(int[] a, int[] b) { int[] all = new int[a.length + b.length]; System.arraycopy(a, 0, all, 0, a.length); System.arraycopy(b, 0, all, a.length, b.length); Arrays.sort(all); int n = all.length; if (n % 2 == 1) return all[n/2]; return (all[n/2-1] + all[n/2]) / 2.0; } }";
        assert!(run(&median, java, false).unwrap().starts_with("Passed"));
        let add = catalog.problem("add-two-numbers").unwrap().judge.unwrap();
        let cpp = "class Solution { public: ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) { ListNode dummy(0); ListNode* cur = &dummy; int carry = 0; while (l1 || l2 || carry) { int a = l1 ? l1->val : 0; int b = l2 ? l2->val : 0; int s = a + b + carry; carry = s / 10; cur->next = new ListNode(s % 10); cur = cur->next; if (l1) l1 = l1->next; if (l2) l2 = l2->next; } return dummy.next; } };";
        assert!(run(&add, cpp, true).unwrap().starts_with("Passed"));
        let merge = catalog.problem("merge-intervals").unwrap().judge.unwrap();
        let cpp = "class Solution { public: vector<vector<int>> merge(vector<vector<int>>& iv) { sort(iv.begin(), iv.end()); vector<vector<int>> out; for (auto& p : iv) { if (!out.empty() && p[0] <= out.back()[1]) out.back()[1] = max(out.back()[1], p[1]); else out.push_back(p); } return out; } };";
        assert!(run(&merge, cpp, true).unwrap().starts_with("Passed"));
    }

    #[derive(Debug)]
    struct ParityRow {
        slug: String,
        lang: String,
        ok: bool,
        passed: usize,
        total: usize,
        error: String,
        ms: u64,
    }

    /// Full curriculum parity: every reference submission extracted by
    /// `desktop/fixtures/export-parity-refs.mjs` through the Rust judge.
    /// Four compiler lanes (the documented Java/C++ concurrency limit);
    /// per-run dirs stay unique via the atomic counter. Writes
    /// `desktop/target/parity-results.json` and asserts zero failures.
    #[test]
    #[ignore = "runs the curriculum reference submissions; needs javac, java and g++ plus desktop/target/parity-refs.json"]
    fn runs_curriculum_references() {
        use std::sync::Arc;

        let refs_path = std::env::var_os("PARITY_REFS")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| {
                Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target/parity-refs.json")
            });
        let payload: serde_json::Value =
            serde_json::from_slice(&fs::read(&refs_path).unwrap_or_else(|_| {
                panic!(
                    "missing {}: run export-parity-refs.mjs first",
                    refs_path.display()
                )
            }))
            .unwrap();
        assert_eq!(payload["version"], 1, "parity refs envelope version");
        let refs: Vec<(String, bool, String)> = payload["refs"]
            .as_array()
            .unwrap()
            .iter()
            .map(|entry| {
                (
                    entry["slug"].as_str().unwrap().to_owned(),
                    entry["lang"].as_str().unwrap() == "cpp",
                    entry["code"].as_str().unwrap().to_owned(),
                )
            })
            .collect();
        assert_eq!(
            refs.iter().filter(|(_, cpp, _)| *cpp).count(),
            134,
            "C++ reference count"
        );
        assert_eq!(
            refs.iter().filter(|(_, cpp, _)| !*cpp).count(),
            134,
            "Java reference count"
        );
        let catalog = Arc::new(
            leetlab_core::Catalog::open(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.."))
                .unwrap(),
        );
        let cancel = AtomicBool::new(false);
        let cancel_ref = &cancel;
        let mut rows: Vec<ParityRow> = Vec::with_capacity(refs.len());
        std::thread::scope(|scope| {
            let mut handles = Vec::new();
            for chunk in refs.chunks(refs.len().div_ceil(4)) {
                let catalog = Arc::clone(&catalog);
                handles.push(scope.spawn(move || {
                    let mut local = Vec::with_capacity(chunk.len());
                    for (slug, cpp, code) in chunk {
                        let row = match catalog.problem(slug) {
                            Ok(problem) => {
                                let total = problem
                                    .judge
                                    .as_ref()
                                    .map(|judge| judge.tests.len())
                                    .unwrap_or(0);
                                match problem.judge {
                                    Some(spec) => match run_detailed(&spec, code, *cpp, cancel_ref)
                                    {
                                        Ok(verdict) => ParityRow {
                                            slug: slug.clone(),
                                            lang: if *cpp { "cpp" } else { "java" }.into(),
                                            ok: verdict.ok,
                                            passed: verdict.passed,
                                            total: verdict.total,
                                            error: verdict
                                                .error
                                                .clone()
                                                .or_else(|| {
                                                    (!verdict.compile.ok)
                                                        .then(|| verdict.compile.stderr.clone())
                                                })
                                                .unwrap_or_default(),
                                            ms: verdict.ms,
                                        },
                                        Err(error) => ParityRow {
                                            slug: slug.clone(),
                                            lang: if *cpp { "cpp" } else { "java" }.into(),
                                            ok: false,
                                            passed: 0,
                                            total,
                                            error: error.message(),
                                            ms: 0,
                                        },
                                    },
                                    None => ParityRow {
                                        slug: slug.clone(),
                                        lang: if *cpp { "cpp" } else { "java" }.into(),
                                        ok: false,
                                        passed: 0,
                                        total: 0,
                                        error: "no judge spec".into(),
                                        ms: 0,
                                    },
                                }
                            }
                            Err(error) => ParityRow {
                                slug: slug.clone(),
                                lang: if *cpp { "cpp" } else { "java" }.into(),
                                ok: false,
                                passed: 0,
                                total: 0,
                                error: error.to_string(),
                                ms: 0,
                            },
                        };
                        eprintln!(
                            "{:4} {:55} {} ({}/{}) {}ms {}",
                            row.lang,
                            row.slug,
                            if row.ok { "PASS" } else { "FAIL" },
                            row.passed,
                            row.total,
                            row.ms,
                            row.error.chars().take(100).collect::<String>()
                        );
                        local.push(row);
                    }
                    local
                }));
            }
            for handle in handles {
                rows.extend(handle.join().unwrap());
            }
        });
        rows.sort_by(|a, b| (&a.slug, &a.lang).cmp(&(&b.slug, &b.lang)));
        let failures: Vec<&ParityRow> = rows.iter().filter(|row| !row.ok).collect();
        let java_passed = rows
            .iter()
            .filter(|row| row.lang == "java" && row.ok)
            .count();
        let cpp_passed = rows
            .iter()
            .filter(|row| row.lang == "cpp" && row.ok)
            .count();
        let java_total = rows.iter().filter(|row| row.lang == "java").count();
        let cpp_total = rows.iter().filter(|row| row.lang == "cpp").count();
        let results = serde_json::json!({
            "version": 1,
            "refs": refs_path.to_string_lossy(),
            "summary": {
                "java": {"passed": java_passed, "total": java_total},
                "cpp": {"passed": cpp_passed, "total": cpp_total},
            },
            "rows": rows.iter().map(|row| serde_json::json!({
                "slug": row.slug, "lang": row.lang, "ok": row.ok,
                "passed": row.passed, "total": row.total,
                "error": row.error, "ms": row.ms,
            })).collect::<Vec<_>>(),
        });
        let results_path = std::env::var_os("PARITY_RESULTS_JSON")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| {
                Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target/parity-results.json")
            });
        fs::write(
            &results_path,
            serde_json::to_string_pretty(&results).unwrap(),
        )
        .unwrap();
        eprintln!("java: {java_passed}/{java_total} cpp: {cpp_passed}/{cpp_total}");
        eprintln!("results: {}", results_path.display());
        assert!(
            failures.is_empty(),
            "{} reference submissions failed through Rust: {:?}",
            failures.len(),
            failures
                .iter()
                .take(10)
                .map(|row| format!("{}:{}", row.lang, row.slug))
                .collect::<Vec<_>>()
        );
    }
    fn spec_from_json(value: serde_json::Value) -> Judge {
        serde_json::from_value(value).unwrap()
    }

    fn sequence_spec(
        class: &str,
        construct: Vec<(&str, &str)>,
        calls: Vec<(&str, Vec<SeqArg>, Option<&str>)>,
        expected: Vec<&str>,
    ) -> Judge {
        spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": class, "params": [], "return": "void"},
            "tests": [],
            "sequences": [{
                "construct": construct.iter().map(|(t, v)| serde_json::json!({"type": t, "value": v})).collect::<Vec<_>>(),
                "calls": calls.iter().map(|(m, a, r)| {
                    let mut call = serde_json::json!({"method": m, "args": a});
                    if let Some(r) = r {
                        call["returns"] = serde_json::Value::String(r.to_string());
                    }
                    call
                }).collect::<Vec<_>>(),
                "expected": expected,
                "example": 1,
            }],
        }))
    }

    fn lit_arg(kind: &str, value: &str) -> SeqArg {
        SeqArg::Lit(leetlab_core::TypedValue {
            value_type: kind.to_owned(),
            value: value.to_owned(),
        })
    }

    const COPY_JAVA_RANDOM: &str = "class __Custom { static Node __mkCustomNode(int[][] pairs) { if (pairs.length == 0) return null; Node[] nodes = new Node[pairs.length]; for (int i = 0; i < pairs.length; i++) nodes[i] = new Node(pairs[i][0]); for (int i = 0; i < pairs.length; i++) { if (i + 1 < pairs.length) nodes[i].next = nodes[i + 1]; if (pairs[i][1] >= 0) nodes[i].random = nodes[pairs[i][1]]; } return nodes[0]; } static String __outCustomNode(Object v) { Node head = (Node) v; java.util.IdentityHashMap<Node, Integer> ids = new java.util.IdentityHashMap<>(); Node n = head; int i = 0; while (n != null) { ids.put(n, i++); n = n.next; } StringBuilder sb = new StringBuilder(\"[\"); n = head; boolean first = true; while (n != null) { if (!first) sb.append(\",\"); first = false; sb.append(\"[\").append(n.val).append(\",\"); sb.append(n.random == null ? \"null\" : ids.get(n.random)).append(\"]\"); n = n.next; } return sb.append(\"]\").toString(); }  }";
    const COPY_JAVA_GRAPH: &str = "class __Custom { static Node __mkCustomGraph(int[][] adj) { if (adj.length == 0) return null; Node[] nodes = new Node[adj.length]; for (int i = 0; i < adj.length; i++) nodes[i] = new Node(i + 1); for (int i = 0; i < adj.length; i++) for (int nb : adj[i]) if (nb >= 1 && nb <= adj.length) nodes[i].neighbors.add(nodes[nb - 1]); return nodes[0]; } static String __outCustomGraph(Object v) { Node root = (Node) v; if (root == null) return \"[]\"; java.util.TreeMap<Integer, Node> byVal = new java.util.TreeMap<>(); java.util.ArrayDeque<Node> q = new java.util.ArrayDeque<>(); q.add(root); byVal.put(root.val, root); while (!q.isEmpty()) { Node node = q.poll(); for (Node nb : node.neighbors) if (!byVal.containsKey(nb.val)) { byVal.put(nb.val, nb); q.add(nb); } } StringBuilder sb = new StringBuilder(\"[\"); boolean first = true; for (Node node : byVal.values()) { if (!first) sb.append(\",\"); first = false; java.util.List<Integer> vs = new java.util.ArrayList<>(); for (Node nb : node.neighbors) vs.add(nb.val); java.util.Collections.sort(vs); String joined = vs.toString().replace(\" \", \"\"); sb.append(\"[\").append(joined.substring(1, joined.length() - 1)).append(\"]\"); } return sb.append(\"]\").toString(); } }";

    const COPY_CPP_RANDOM: &str = "static Node* __mkCustomNode(std::vector<std::vector<int>> v) { if (v.empty()) return nullptr; std::vector<Node*> nodes; for (auto& p : v) nodes.push_back(new Node(p[0])); for (size_t i = 0; i < v.size(); i++) { if (i + 1 < v.size()) nodes[i]->next = nodes[i + 1]; if (v[i][1] >= 0) nodes[i]->random = nodes[(size_t)v[i][1]]; } return nodes[0]; } static std::string __customNodeOut(Node* head) { std::vector<Node*> order; std::map<Node*, int> ids; for (Node* n = head; n; n = n->next) { ids[n] = (int)order.size(); order.push_back(n); } std::string out = \"[\"; for (size_t i = 0; i < order.size(); i++) { if (i) out += \",\"; out += \"[\" + std::to_string(order[i]->val) + \",\"; out += order[i]->random ? std::to_string(ids[order[i]->random]) : \"null\"; out += \"]\"; } return out + \"]\"; }";
    const COPY_CPP_GRAPH: &str = "static Node* __mkCustomGraph(std::vector<std::vector<int>> adj) { if (adj.empty()) return nullptr; std::vector<Node*> nodes; for (size_t i = 0; i < adj.size(); i++) nodes.push_back(new Node((int)i + 1)); for (size_t i = 0; i < adj.size(); i++) for (int nb : adj[i]) if (nb >= 1 && (size_t)nb <= adj.size()) nodes[i]->neighbors.push_back(nodes[(size_t)nb - 1]); return nodes[0]; } static std::string __customGraphOut(Node* root) { if (!root) return \"[]\"; std::map<int, Node*> byVal; std::deque<Node*> q; q.push_back(root); byVal[root->val] = root; while (!q.empty()) { Node* node = q.front(); q.pop_front(); for (Node* nb : node->neighbors) if (!byVal.count(nb->val)) { byVal[nb->val] = nb; q.push_back(nb); } } std::string out = \"[\"; bool first = true; for (auto& kv : byVal) { if (!first) out += \",\"; first = false; std::vector<int> vs; for (Node* nb : kv.second->neighbors) vs.push_back(nb->val); std::sort(vs.begin(), vs.end()); out += \"[\"; for (size_t i = 0; i < vs.size(); i++) { if (i) out += \",\"; out += std::to_string(vs[i]); } out += \"]\"; } return out + \"]\"; }";

    fn with_helpers(mut spec: Judge, java: &str, cpp: &str) -> Judge {
        spec.helpers = Some(
            [
                ("java".to_owned(), java.to_owned()),
                ("cpp".to_owned(), cpp.to_owned()),
            ]
            .into_iter()
            .collect(),
        );
        spec
    }

    #[test]
    #[ignore = "needs javac, java and g++ on PATH"]
    fn special_sequences_min_stack_and_lru() {
        let min_java = "class MinStack { private java.util.Stack<Integer> stack = new java.util.Stack<>(); private java.util.Stack<Integer> mins = new java.util.Stack<>(); public MinStack() {} public void push(int val) { stack.push(val); if (mins.isEmpty() || val <= mins.peek()) mins.push(val); } public void pop() { int v = stack.pop(); if (v == mins.peek()) mins.pop(); } public int top() { return stack.peek(); } public int getMin() { return mins.peek(); } }";
        let min_cpp = "class MinStack { public: MinStack() {} void push(int val) { s.push_back(val); if (m.empty() || val <= m.back()) m.push_back(val); } void pop() { if (s.back() == m.back()) m.pop_back(); s.pop_back(); } int top() { return s.back(); } int getMin() { return m.back(); } private: std::vector<int> s, m; };";
        let int = Some("int");
        let calls = vec![
            ("push", vec![lit_arg("int", "-2")], None),
            ("push", vec![lit_arg("int", "0")], None),
            ("push", vec![lit_arg("int", "-3")], None),
            ("getMin", vec![], int),
            ("pop", vec![], None),
            ("top", vec![], int),
            ("getMin", vec![], int),
        ];
        let expected = vec!["null", "null", "null", "-3", "null", "0", "-2"];
        let spec = sequence_spec("MinStack", vec![], calls, expected);
        assert!(run(&spec, min_java, false).unwrap().starts_with("Passed"));
        assert!(run(&spec, min_cpp, true).unwrap().starts_with("Passed"));

        let lru_java = "class LRUCache { private final int capacity; private final java.util.LinkedHashMap<Integer, Integer> map; public LRUCache(int capacity) { this.capacity = capacity; this.map = new java.util.LinkedHashMap<Integer, Integer>(capacity, 0.75f, true) { protected boolean removeEldestEntry(java.util.Map.Entry<Integer, Integer> e) { return size() > LRUCache.this.capacity; } }; } public int get(int key) { return map.getOrDefault(key, -1); } public void put(int key, int value) { map.put(key, value); } }";
        let lru_cpp = "class LRUCache { public: LRUCache(int capacity): cap(capacity) {} int get(int key) { auto it = pos.find(key); if (it == pos.end()) return -1; order.splice(order.begin(), order, it->second); return it->second->second; } void put(int key, int value) { auto it = pos.find(key); if (it != pos.end()) { order.splice(order.begin(), order, it->second); it->second->second = value; return; } if ((int)order.size() == cap) { pos.erase(order.back().first); order.pop_back(); } order.push_front({key, value}); pos[key] = order.begin(); } private: int cap; std::list<std::pair<int,int>> order; std::unordered_map<int, std::list<std::pair<int,int>>::iterator> pos; };";
        let lru_calls = vec![
            ("put", vec![lit_arg("int", "1"), lit_arg("int", "1")], None),
            ("put", vec![lit_arg("int", "2"), lit_arg("int", "2")], None),
            ("get", vec![lit_arg("int", "1")], int),
            ("put", vec![lit_arg("int", "3"), lit_arg("int", "3")], None),
            ("get", vec![lit_arg("int", "2")], int),
            ("put", vec![lit_arg("int", "4"), lit_arg("int", "4")], None),
            ("get", vec![lit_arg("int", "1")], int),
            ("get", vec![lit_arg("int", "3")], int),
            ("get", vec![lit_arg("int", "4")], int),
        ];
        let lru_expected = vec!["null", "null", "1", "null", "-1", "null", "-1", "3", "4"];
        let lru = sequence_spec("LRUCache", vec![("int", "2")], lru_calls, lru_expected);
        assert!(run(&lru, lru_java, false).unwrap().starts_with("Passed"));
        assert!(run(&lru, lru_cpp, true).unwrap().starts_with("Passed"));
    }

    #[test]
    #[ignore = "needs javac, java and g++ on PATH"]
    fn special_mutate_void_cases() {
        let surrounded = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "solve", "params": [{"name": "board", "type": "char[][]"}], "return": "void"},
            "tests": [{"args": ["[[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"O\",\"X\"],[\"X\",\"X\",\"O\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]"], "expected": "[[[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"X\",\"X\",\"X\"],[\"X\",\"O\",\"X\",\"X\"]]]", "example": 1}],
            "mutates": [0],
        }));
        let solve_java = "class Solution { public void solve(char[][] board) { if (board.length == 0) return; int m = board.length, n = board[0].length; for (int i = 0; i < m; i++) { if (board[i][0] == 'O') dfs(board, i, 0); if (board[i][n-1] == 'O') dfs(board, i, n-1); } for (int j = 0; j < n; j++) { if (board[0][j] == 'O') dfs(board, 0, j); if (board[m-1][j] == 'O') dfs(board, m-1, j); } for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) { if (board[i][j] == 'O') board[i][j] = 'X'; else if (board[i][j] == 'E') board[i][j] = 'O'; } } private void dfs(char[][] b, int i, int j) { if (i < 0 || j < 0 || i >= b.length || j >= b[0].length || b[i][j] != 'O') return; b[i][j] = 'E'; dfs(b, i+1, j); dfs(b, i-1, j); dfs(b, i, j+1); dfs(b, i, j-1); } }";
        let solve_cpp = "class Solution { public: void solve(vector<vector<char>>& board) { if (board.empty() || board[0].empty()) return; int m = board.size(), n = board[0].size(); for (int i = 0; i < m; i++) { if (board[i][0] == 'O') dfs(board, i, 0); if (board[i][n-1] == 'O') dfs(board, i, n-1); } for (int j = 0; j < n; j++) { if (board[0][j] == 'O') dfs(board, 0, j); if (board[m-1][j] == 'O') dfs(board, m-1, j); } for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) { if (board[i][j] == 'O') board[i][j] = 'X'; else if (board[i][j] == 'E') board[i][j] = 'O'; } } private: void dfs(vector<vector<char>>& b, int i, int j) { if (i < 0 || j < 0 || i >= (int)b.size() || j >= (int)b[0].size() || b[i][j] != 'O') return; b[i][j] = 'E'; dfs(b, i+1, j); dfs(b, i-1, j); dfs(b, i, j+1); dfs(b, i, j-1); } };";
        assert!(run(&surrounded, solve_java, false)
            .unwrap()
            .starts_with("Passed"));
        assert!(run(&surrounded, solve_cpp, true)
            .unwrap()
            .starts_with("Passed"));

        let rotate = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "rotate", "params": [{"name": "matrix", "type": "int[][]"}], "return": "void"},
            "tests": [{"args": ["[[1,2,3],[4,5,6],[7,8,9]]"], "expected": "[[[7,4,1],[8,5,2],[9,6,3]]]", "example": 1}],
            "mutates": [0],
        }));
        let rotate_cpp = "class Solution { public: void rotate(vector<vector<int>>& m) { int n = m.size(); for (int i = 0; i < n; i++) for (int j = i; j < n; j++) std::swap(m[i][j], m[j][i]); for (int i = 0; i < n; i++) for (int j = 0; j < n/2; j++) std::swap(m[i][j], m[i][n-1-j]); } };";
        assert!(run(&rotate, rotate_cpp, true)
            .unwrap()
            .starts_with("Passed"));

        let zeroes = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "setZeroes", "params": [{"name": "matrix", "type": "int[][]"}], "return": "void"},
            "tests": [{"args": ["[[1,1,1],[1,0,1],[1,1,1]]"], "expected": "[[[1,0,1],[0,0,0],[1,0,1]]]", "example": 1}],
            "mutates": [0],
        }));
        let zeroes_java = "class Solution { public void setZeroes(int[][] matrix) { int m = matrix.length, n = matrix[0].length; boolean[] rows = new boolean[m]; boolean[] cols = new boolean[n]; for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (matrix[i][j] == 0) { rows[i] = true; cols[j] = true; } for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (rows[i] || cols[j]) matrix[i][j] = 0; } }";
        assert!(run(&zeroes, zeroes_java, false)
            .unwrap()
            .starts_with("Passed"));

        let reorder = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "reorderList", "params": [{"name": "head", "type": "ListNode"}], "return": "void"},
            "tests": [{"args": ["[1,2,3,4]"], "expected": "[[1,4,2,3]]", "example": 1}],
            "mutates": [0],
        }));
        let reorder_java = "class Solution { public void reorderList(ListNode head) { if (head == null || head.next == null) return; ListNode slow = head, fast = head; while (fast.next != null && fast.next.next != null) { slow = slow.next; fast = fast.next.next; } ListNode second = slow.next; slow.next = null; ListNode prev = null; while (second != null) { ListNode n = second.next; second.next = prev; prev = second; second = n; } ListNode first = head; second = prev; while (second != null) { ListNode t1 = first.next, t2 = second.next; first.next = second; second.next = t1; first = t1; second = t2; } } }";
        let reorder_cpp = "class Solution { public: void reorderList(ListNode* head) { if (!head || !head->next) return; ListNode *slow = head, *fast = head; while (fast->next && fast->next->next) { slow = slow->next; fast = fast->next->next; } ListNode* second = slow->next; slow->next = nullptr; ListNode* prev = nullptr; while (second) { ListNode* n = second->next; second->next = prev; prev = second; second = n; } ListNode* first = head; second = prev; while (second) { ListNode *t1 = first->next, *t2 = second->next; first->next = second; second->next = t1; first = t1; second = t2; } } };";
        assert!(run(&reorder, reorder_java, false)
            .unwrap()
            .starts_with("Passed"));
        assert!(run(&reorder, reorder_cpp, true)
            .unwrap()
            .starts_with("Passed"));
    }

    #[test]
    #[ignore = "needs javac and g++ on PATH"]
    fn special_sequences_collection_and_double() {
        let twitter = sequence_spec(
            "Twitter",
            vec![],
            vec![
                (
                    "postTweet",
                    vec![lit_arg("int", "1"), lit_arg("int", "5")],
                    None,
                ),
                ("getNewsFeed", vec![lit_arg("int", "1")], Some("int[]")),
                (
                    "follow",
                    vec![lit_arg("int", "1"), lit_arg("int", "2")],
                    None,
                ),
                (
                    "postTweet",
                    vec![lit_arg("int", "2"), lit_arg("int", "6")],
                    None,
                ),
                ("getNewsFeed", vec![lit_arg("int", "1")], Some("int[]")),
                (
                    "unfollow",
                    vec![lit_arg("int", "1"), lit_arg("int", "2")],
                    None,
                ),
                ("getNewsFeed", vec![lit_arg("int", "1")], Some("int[]")),
            ],
            vec!["null", "[5]", "null", "null", "[6,5]", "null", "[5]"],
        );
        let twitter_java = "class Twitter { private int time = 0; private java.util.Map<Integer, java.util.Set<Integer>> follows = new java.util.HashMap<>(); private java.util.List<int[]> posts = new java.util.ArrayList<>(); public Twitter() {} public void postTweet(int userId, int tweetId) { posts.add(new int[]{time++, userId, tweetId}); } public java.util.List<Integer> getNewsFeed(int userId) { java.util.Set<Integer> f = new java.util.HashSet<>(follows.getOrDefault(userId, new java.util.HashSet<>())); f.add(userId); java.util.List<Integer> out = new java.util.ArrayList<>(); for (int i = posts.size() - 1; i >= 0 && out.size() < 10; i--) { int[] p = posts.get(i); if (f.contains(p[1])) out.add(p[2]); } return out; } public void follow(int followerId, int followeeId) { follows.computeIfAbsent(followerId, k -> new java.util.HashSet<>()).add(followeeId); } public void unfollow(int followerId, int followeeId) { if (follows.containsKey(followerId)) follows.get(followerId).remove(followeeId); } }";
        assert!(run(&twitter, twitter_java, false)
            .unwrap()
            .starts_with("Passed"));

        let median = sequence_spec(
            "MedianFinder",
            vec![],
            vec![
                ("addNum", vec![lit_arg("int", "1")], None),
                ("addNum", vec![lit_arg("int", "2")], None),
                ("findMedian", vec![], Some("double")),
                ("addNum", vec![lit_arg("int", "3")], None),
                ("findMedian", vec![], Some("double")),
            ],
            vec!["null", "null", "1.5", "null", "2.0"],
        );
        let median_java = "class MedianFinder { private java.util.PriorityQueue<Integer> lo = new java.util.PriorityQueue<>((a, b) -> b - a); private java.util.PriorityQueue<Integer> hi = new java.util.PriorityQueue<>(); public MedianFinder() {} public void addNum(int num) { lo.add(num); hi.add(lo.poll()); if (lo.size() < hi.size()) lo.add(hi.poll()); } public double findMedian() { return lo.size() > hi.size() ? lo.peek() : (lo.peek() + hi.peek()) / 2.0; } }";
        assert!(run(&median, median_java, false)
            .unwrap()
            .starts_with("Passed"));
    }

    #[test]
    #[ignore = "needs javac, java and g++ on PATH"]
    fn special_lookup_interval_cycle_and_lists() {
        let lca = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "lowestCommonAncestor", "params": [{"name": "root", "type": "TreeNode"}, {"name": "p", "type": "TreeNode"}, {"name": "q", "type": "TreeNode"}], "return": "TreeNode"},
            "tests": [{"args": ["[6,2,8,0,4,7,9,null,null,3,5]", "2", "8"], "expected": "[6,2,8,0,4,7,9,null,null,3,5]", "example": 1}],
        }));
        let lca_java = "class Solution { public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) { if (root == null || root == p || root == q) return root; TreeNode l = lowestCommonAncestor(root.left, p, q); TreeNode r = lowestCommonAncestor(root.right, p, q); return l == null ? r : (r == null ? l : root); } }";
        assert!(run(&lca, lca_java, false).unwrap().starts_with("Passed"));

        let meetings = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "canAttendMeetings", "params": [{"name": "intervals", "type": "interval[]"}], "return": "boolean"},
            "tests": [
                {"args": ["[[0,30],[5,10],[15,20]]"], "expected": "false", "example": 1},
                {"args": ["[[5,8],[9,15]]"], "expected": "true", "example": 2},
            ],
        }));
        let meet_java = "class Solution { public boolean canAttendMeetings(Interval[] intervals) { java.util.Arrays.sort(intervals, (a, b) -> Integer.compare(a.start, b.start)); for (int i = 1; i < intervals.length; i++) if (intervals[i].start < intervals[i-1].end) return false; return true; } }";
        let meet_cpp = "class Solution { public: bool canAttendMeetings(vector<Interval>& v) { sort(v.begin(), v.end(), [](const Interval& a, const Interval& b) { return a.start < b.start; }); for (size_t i = 1; i < v.size(); i++) if (v[i].start < v[i-1].end) return false; return true; } };";
        assert!(run(&meetings, meet_java, false)
            .unwrap()
            .starts_with("Passed"));
        assert!(run(&meetings, meet_cpp, true)
            .unwrap()
            .starts_with("Passed"));

        let cycle = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "hasCycle", "params": [{"name": "head", "type": "ListNode"}], "return": "boolean"},
            "tests": [
                {"args": ["{\"list\": [3,2,0,-4], \"pos\": 1}"], "expected": "true", "example": 1},
                {"args": ["{\"list\": [1], \"pos\": -1}"], "expected": "false", "example": 2},
            ],
        }));
        let cycle_java = "class Solution { public boolean hasCycle(ListNode head) { ListNode slow = head, fast = head; while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; if (slow == fast) return true; } return false; } }";
        assert!(run(&cycle, cycle_java, false)
            .unwrap()
            .starts_with("Passed"));

        let merge_k = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "mergeKLists", "params": [{"name": "lists", "type": "ListNode[]"}], "return": "ListNode"},
            "tests": [{"args": ["[[1,4,5],[1,3,4],[2,6]]"], "expected": "[1,1,2,3,4,4,5,6]", "example": 1}],
        }));
        let merge_java = "class Solution { public ListNode mergeKLists(ListNode[] lists) { java.util.PriorityQueue<ListNode> pq = new java.util.PriorityQueue<>((a, b) -> a.val - b.val); for (ListNode n : lists) if (n != null) pq.add(n); ListNode dummy = new ListNode(0), cur = dummy; while (!pq.isEmpty()) { ListNode n = pq.poll(); cur.next = n; cur = cur.next; if (n.next != null) pq.add(n.next); } return dummy.next; } }";
        assert!(run(&merge_k, merge_java, false)
            .unwrap()
            .starts_with("Passed"));
    }

    #[test]
    fn validate_alien_order_rules() {
        assert!(validate_alien("[\"z\",\"o\"]", "\"zo\""));
        assert!(!validate_alien("[\"z\",\"o\"]", "\"oz\""));
        assert!(validate_alien("[\"abc\",\"ab\"]", "\"\""));
        assert!(!validate_alien("[\"abc\",\"ab\"]", "\"abc\""));
        assert!(validate_alien(
            "[\"hrn\",\"hrf\",\"er\",\"enn\",\"rfnn\"]",
            "\"hernf\""
        ));
        assert!(!validate_alien("[\"wrt\",\"wrf\"]", "\"frtw\""));
        assert!(!validate_alien("[\"a\",\"b\"]", "\"a\""));
        assert!(!validate_alien("[\"a\",\"b\"]", "\"abx\""));
    }

    #[test]
    #[ignore = "needs javac, java and g++ on PATH"]
    fn special_prev_roundtrip_and_alien() {
        let codec_java = "class Codec { public String encode(String[] strs) { StringBuilder sb = new StringBuilder(); for (String s : strs) sb.append(s.length()).append('#').append(s); return sb.toString(); } public String[] decode(String s) { java.util.List<String> out = new java.util.ArrayList<>(); int i = 0; while (i < s.length()) { int j = s.indexOf('#', i); int len = Integer.parseInt(s.substring(i, j)); i = j + 1; out.add(s.substring(i, i + len)); i += len; } return out.toArray(new String[0]); } }";
        let codec_cpp = "class Codec { public: string encode(vector<string> strs) { string out; for (auto& s : strs) out += to_string(s.size()) + '#' + s; return out; } vector<string> decode(string s) { vector<string> out; size_t i = 0; while (i < s.size()) { size_t j = s.find('#', i); int len = stoi(s.substr(i, j - i)); i = j + 1; out.push_back(s.substr(i, len)); i += len; } return out; } };";
        let calls = vec![
            (
                "encode",
                vec![lit_arg("string[]", "[\"hello\",\"world\"]")],
                Some("string"),
            ),
            ("decode", vec![SeqArg::Prev { prev: 0 }], Some("string[]")),
        ];
        let expected = vec!["\"5#hello5#world\"", "[\"hello\",\"world\"]"];
        let codec = sequence_spec("Codec", vec![], calls, expected);
        assert!(run(&codec, codec_java, false)
            .unwrap()
            .starts_with("Passed"));
        assert!(run(&codec, codec_cpp, true).unwrap().starts_with("Passed"));

        let alien = spec_from_json(serde_json::json!({
            "mode": "exact",
            "signature": {"name": "foreignDictionary", "params": [{"name": "words", "type": "string[]"}], "return": "string"},
            "tests": [
                {"args": ["[\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]"], "expected": "\"wertf\"", "example": 1},
                {"args": ["[\"abc\",\"ab\"]"], "expected": "\"\"", "example": 2},
            ],
            "validate": "alien-order",
        }));
        let alien_java = "class Solution { public String foreignDictionary(String[] words) { java.util.Map<Character, java.util.Set<Character>> g = new java.util.HashMap<>(); java.util.Map<Character, Integer> indeg = new java.util.HashMap<>(); for (String w : words) for (char c : w.toCharArray()) { g.putIfAbsent(c, new java.util.HashSet<>()); indeg.putIfAbsent(c, 0); } for (int i = 0; i + 1 < words.length; i++) { String a = words[i], b = words[i+1]; if (a.length() > b.length() && a.startsWith(b)) return \"\"; int n = Math.min(a.length(), b.length()); for (int j = 0; j < n; j++) if (a.charAt(j) != b.charAt(j)) { if (g.get(a.charAt(j)).add(b.charAt(j))) indeg.put(b.charAt(j), indeg.get(b.charAt(j)) + 1); break; } } java.util.Queue<Character> q = new java.util.ArrayDeque<>(); for (char c : indeg.keySet()) if (indeg.get(c) == 0) q.add(c); StringBuilder sb = new StringBuilder(); while (!q.isEmpty()) { char c = q.poll(); sb.append(c); for (char nb : g.get(c)) { indeg.put(nb, indeg.get(nb) - 1); if (indeg.get(nb) == 0) q.add(nb); } } return sb.length() == indeg.size() ? sb.toString() : \"\"; } }";
        assert!(run(&alien, alien_java, false)
            .unwrap()
            .starts_with("Passed"));
    }

    #[test]
    #[ignore = "needs javac, java and g++ on PATH"]
    fn special_custom_node_helpers() {
        let copy = with_helpers(
            spec_from_json(serde_json::json!({
                "mode": "exact",
                "signature": {"name": "copyRandomList", "params": [{"name": "head", "type": "Node"}], "return": "Node"},
                "tests": [{"args": ["[[7,null],[13,0],[11,4],[10,2],[1,0]]"], "expected": "[[7,null],[13,0],[11,4],[10,2],[1,0]]", "example": 1}],
            })),
            COPY_JAVA_RANDOM,
            COPY_CPP_RANDOM,
        );
        let copy_java = "class Node { int val; Node next; Node random; Node(int v) { val = v; } } class Solution { public Node copyRandomList(Node head) { if (head == null) return null; java.util.HashMap<Node, Node> map = new java.util.HashMap<>(); Node n = head; while (n != null) { map.put(n, new Node(n.val)); n = n.next; } n = head; while (n != null) { Node c = map.get(n); c.next = map.get(n.next); c.random = map.get(n.random); n = n.next; } return map.get(head); } }";
        let copy_cpp = "struct Node { int val; Node* next; Node* random; Node(int x): val(x), next(nullptr), random(nullptr) {} }; class Solution { public: Node* copyRandomList(Node* head) { if (!head) return nullptr; std::unordered_map<Node*, Node*> map; for (Node* n = head; n; n = n->next) map[n] = new Node(n->val); for (Node* n = head; n; n = n->next) { map[n]->next = n->next ? map[n->next] : nullptr; map[n]->random = n->random ? map[n->random] : nullptr; } return map[head]; } };";
        assert!(run(&copy, copy_java, false).unwrap().starts_with("Passed"));
        assert!(run(&copy, copy_cpp, true).unwrap().starts_with("Passed"));

        let clone = with_helpers(
            spec_from_json(serde_json::json!({
                "mode": "exact",
                "signature": {"name": "cloneGraph", "params": [{"name": "node", "type": "GraphNode"}], "return": "GraphNode"},
                "tests": [{"args": ["[[2,4],[1,3],[2,4],[1,3]]"], "expected": "[[2,4],[1,3],[2,4],[1,3]]", "example": 1}],
            })),
            COPY_JAVA_GRAPH,
            COPY_CPP_GRAPH,
        );
        let clone_java = "class Node { int val; java.util.List<Node> neighbors = new java.util.ArrayList<>(); Node(int v) { val = v; } } class Solution { public Node cloneGraph(Node node) { if (node == null) return null; java.util.HashMap<Node, Node> map = new java.util.HashMap<>(); java.util.ArrayDeque<Node> q = new java.util.ArrayDeque<>(); q.add(node); map.put(node, new Node(node.val)); while (!q.isEmpty()) { Node n = q.poll(); for (Node nb : n.neighbors) { if (!map.containsKey(nb)) { map.put(nb, new Node(nb.val)); q.add(nb); } map.get(n).neighbors.add(map.get(nb)); } } return map.get(node); } }";
        let clone_cpp = "struct Node { int val; std::vector<Node*> neighbors; Node(int v): val(v) {} }; class Solution { public: Node* cloneGraph(Node* node) { if (!node) return nullptr; std::unordered_map<Node*, Node*> map; std::deque<Node*> q; q.push_back(node); map[node] = new Node(node->val); while (!q.empty()) { Node* n = q.front(); q.pop_front(); for (Node* nb : n->neighbors) { if (!map.count(nb)) { map[nb] = new Node(nb->val); q.push_back(nb); } map[n]->neighbors.push_back(map[nb]); } } return map[node]; } };";
        assert!(run(&clone, clone_java, false)
            .unwrap()
            .starts_with("Passed"));
        assert!(run(&clone, clone_cpp, true).unwrap().starts_with("Passed"));
    }
    fn overlay_spec(catalog: &leetlab_core::Catalog, slug: &str) -> leetlab_core::Judge {
        let problem = catalog
            .problem(slug)
            .unwrap_or_else(|error| panic!("overlay missing for {slug}: {error}"));
        assert!(problem.provenance.is_some(), "{slug} carries no provenance");
        problem.judge.expect("overlay judge")
    }

    fn check(
        spec: &leetlab_core::Judge,
        code: &str,
        cpp: bool,
        slug: &str,
        rows: &mut Vec<(String, String, bool)>,
    ) {
        let outcome = judge_code(spec, code, cpp, &AtomicBool::new(false));
        assert!(
            outcome.ok,
            "{slug} {} failed:\n{}",
            if cpp { "cpp" } else { "java" },
            outcome.text
        );
        rows.push((
            slug.to_owned(),
            if cpp { "cpp".into() } else { "java".into() },
            true,
        ));
    }

    #[test]
    #[ignore = "verifies all overlay lessons end-to-end; needs javac, java and g++ on PATH"]
    fn overlay_lessons_verify() {
        let mut rows: Vec<(String, String, bool)> = Vec::new();
        let catalog =
            leetlab_core::Catalog::open(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.."))
                .unwrap();
        for slug in [
            "min-stack",
            "lru-cache",
            "implement-trie-prefix-tree",
            "design-add-and-search-words-data-structure",
            "time-based-key-value-store",
            "kth-largest-element-in-a-stream",
            "design-twitter",
            "find-median-from-data-stream",
            "detect-squares",
            "reorder-list",
            "linked-list-cycle",
            "merge-k-sorted-lists",
            "lowest-common-ancestor-of-a-binary-search-tree",
            "serialize-and-deserialize-binary-tree",
            "clone-graph",
            "copy-list-with-random-pointer",
            "surrounded-regions",
            "rotate-image",
            "set-matrix-zeroes",
            "graph-valid-tree",
            "number-of-connected-components-in-an-undirected-graph",
            "encode-and-decode-strings",
            "walls-and-gates",
            "alien-dictionary",
            "meeting-rooms",
            "meeting-rooms-ii",
        ] {
            assert!(catalog.has_local(slug), "{slug} not overlaid");
        }

        // -- design classes -------------------------------------------------
        let min_java = "class MinStack { private java.util.Stack<Integer> stack = new java.util.Stack<>(); private java.util.Stack<Integer> mins = new java.util.Stack<>(); public MinStack() {} public void push(int val) { stack.push(val); if (mins.isEmpty() || val <= mins.peek()) mins.push(val); } public int popR() { return stack.size(); } public void pop() { int v = stack.pop(); if (v == mins.peek()) mins.pop(); } public int top() { return stack.peek(); } public int getMin() { return mins.peek(); } }";
        let min_cpp = "class MinStack { public: MinStack() {} void push(int val) { s.push_back(val); if (m.empty() || val <= m.back()) m.push_back(val); } void pop() { if (s.back() == m.back()) m.pop_back(); s.pop_back(); } int top() { return s.back(); } int getMin() { return m.back(); } private: std::vector<int> s, m; };";
        let spec = overlay_spec(&catalog, "min-stack");
        check(&spec, min_java, false, "min-stack", &mut rows);
        check(&spec, min_cpp, true, "min-stack", &mut rows);

        let lru_java = "class LRUCache { private final int capacity; private final java.util.LinkedHashMap<Integer, Integer> map; public LRUCache(int capacity) { this.capacity = capacity; this.map = new java.util.LinkedHashMap<Integer, Integer>(capacity, 0.75f, true) { protected boolean removeEldestEntry(java.util.Map.Entry<Integer, Integer> e) { return size() > LRUCache.this.capacity; } }; } public int get(int key) { return map.getOrDefault(key, -1); } public void put(int key, int value) { map.put(key, value); } }";
        let lru_cpp = "class LRUCache { public: LRUCache(int capacity): cap(capacity) {} int get(int key) { auto it = pos.find(key); if (it == pos.end()) return -1; order.splice(order.begin(), order, it->second); return it->second->second; } void put(int key, int value) { auto it = pos.find(key); if (it != pos.end()) { order.splice(order.begin(), order, it->second); it->second->second = value; return; } if ((int)order.size() == cap) { pos.erase(order.back().first); order.pop_back(); } order.push_front({key, value}); pos[key] = order.begin(); } private: int cap; std::list<std::pair<int,int>> order; std::unordered_map<int, std::list<std::pair<int,int>>::iterator> pos; };";
        let spec = overlay_spec(&catalog, "lru-cache");
        check(&spec, lru_java, false, "lru-cache", &mut rows);
        check(&spec, lru_cpp, true, "lru-cache", &mut rows);

        let trie_java = "class Trie { private static class N { N[] c = new N[26]; boolean w = false; } private final N root = new N(); public Trie() {} public void insert(String w) { N n = root; for (char ch : w.toCharArray()) { int i = ch - 'a'; if (n.c[i] == null) n.c[i] = new N(); n = n.c[i]; } n.w = true; } public boolean search(String w) { N n = find(w); return n != null && n.w; } public boolean startsWith(String p) { return find(p) != null; } private N find(String s) { N n = root; for (char ch : s.toCharArray()) { n = n.c[ch - 'a']; if (n == null) return null; } return n; } }";
        let trie_cpp = "struct TNode { TNode* c[26]{}; bool w = false; }; class Trie { public: Trie(): root(new TNode()) {} void insert(string w) { auto n = root; for (char ch : w) { int i = ch - 'a'; if (!n->c[i]) n->c[i] = new TNode(); n = n->c[i]; } n->w = true; } bool search(string w) { auto n = find(w); return n && n->w; } bool startsWith(string p) { return find(p) != nullptr; } private: TNode* root; TNode* find(const string& s) { auto n = root; for (char ch : s) { n = n->c[ch - 'a']; if (!n) return nullptr; } return n; } };";
        let spec = overlay_spec(&catalog, "implement-trie-prefix-tree");
        check(&spec, trie_java, false, "trie", &mut rows);
        check(&spec, trie_cpp, true, "trie", &mut rows);

        let wd_java = "class WordDictionary { private static class N { N[] c = new N[26]; boolean w = false; } private final N root = new N(); public WordDictionary() {} public void addWord(String w) { N n = root; for (char ch : w.toCharArray()) { int i = ch - 'a'; if (n.c[i] == null) n.c[i] = new N(); n = n.c[i]; } n.w = true; } public boolean search(String w) { return dfs(w, 0, root); } private boolean dfs(String w, int i, N n) { if (n == null) return false; if (i == w.length()) return n.w; char ch = w.charAt(i); if (ch == '.') { for (N kid : n.c) if (kid != null && dfs(w, i + 1, kid)) return true; return false; } return dfs(w, i + 1, n.c[ch - 'a']); } }";
        let wd_cpp = "struct WNode { WNode* c[26]{}; bool w = false; }; class WordDictionary { public: WordDictionary(): root(new WNode()) {} void addWord(string w) { auto n = root; for (char ch : w) { int i = ch - 'a'; if (!n->c[i]) n->c[i] = new WNode(); n = n->c[i]; } n->w = true; } bool search(string w) { return dfs(w, 0, root); } private: WNode* root; bool dfs(const string& w, int i, WNode* n) { if (!n) return false; if (i == (int)w.size()) return n->w; if (w[i] == '.') { for (auto kid : n->c) if (kid && dfs(w, i + 1, kid)) return true; return false; } return dfs(w, i + 1, n->c[w[i] - 'a']); } };";
        let spec = overlay_spec(&catalog, "design-add-and-search-words-data-structure");
        check(&spec, wd_java, false, "word-dictionary", &mut rows);
        check(&spec, wd_cpp, true, "word-dictionary", &mut rows);

        let tm_java = "class TimeMap { private final java.util.HashMap<String, java.util.TreeMap<Integer, String>> map = new java.util.HashMap<>(); public TimeMap() {} public void set(String key, String value, int timestamp) { map.computeIfAbsent(key, k -> new java.util.TreeMap<>()).put(timestamp, value); } public String get(String key, int timestamp) { java.util.TreeMap<Integer, String> t = map.get(key); if (t == null) return \"\"; java.util.Map.Entry<Integer, String> e = t.floorEntry(timestamp); return e == null ? \"\" : e.getValue(); } }";
        let tm_cpp = "class TimeMap { public: TimeMap() {} void set(string key, string value, int timestamp) { map[key][timestamp] = value; } string get(string key, int timestamp) { auto it = map.find(key); if (it == map.end()) return \"\"; auto jt = it->second.upper_bound(timestamp); if (jt == it->second.begin()) return \"\"; return std::prev(jt)->second; } private: std::unordered_map<string, std::map<int, string>> map; };";
        let spec = overlay_spec(&catalog, "time-based-key-value-store");
        check(&spec, tm_java, false, "time-map", &mut rows);
        check(&spec, tm_cpp, true, "time-map", &mut rows);

        let kth_java = "class KthLargest { private final int k; private final java.util.PriorityQueue<Integer> pq = new java.util.PriorityQueue<>(); public KthLargest(int k, int[] nums) { this.k = k; for (int n : nums) add(n); } public int add(int val) { pq.add(val); if (pq.size() > k) pq.poll(); return pq.peek(); } }";
        let kth_cpp = "class KthLargest { public: KthLargest(int k, vector<int>& nums): k(k) { for (int n : nums) add(n); } int add(int val) { pq.push(val); if ((int)pq.size() > k) pq.pop(); return pq.top(); } private: int k; std::priority_queue<int, std::vector<int>, std::greater<int>> pq; };";
        let spec = overlay_spec(&catalog, "kth-largest-element-in-a-stream");
        check(&spec, kth_java, false, "kth-largest", &mut rows);
        check(&spec, kth_cpp, true, "kth-largest", &mut rows);

        let tw_java = "class Twitter { private int time = 0; private java.util.Map<Integer, java.util.Set<Integer>> follows = new java.util.HashMap<>(); private java.util.List<int[]> posts = new java.util.ArrayList<>(); public Twitter() {} public void postTweet(int userId, int tweetId) { posts.add(new int[]{time++, userId, tweetId}); } public java.util.List<Integer> getNewsFeed(int userId) { java.util.Set<Integer> f = new java.util.HashSet<>(follows.getOrDefault(userId, new java.util.HashSet<>())); f.add(userId); java.util.List<Integer> out = new java.util.ArrayList<>(); for (int i = posts.size() - 1; i >= 0 && out.size() < 10; i--) { int[] p = posts.get(i); if (f.contains(p[1])) out.add(p[2]); } return out; } public void follow(int a, int b) { follows.computeIfAbsent(a, k -> new java.util.HashSet<>()).add(b); } public void unfollow(int a, int b) { if (follows.containsKey(a)) follows.get(a).remove(b); } }";
        let tw_cpp = "class Twitter { public: Twitter(): clk(0) {} void postTweet(int u, int t) { posts.push_back({clk++, u, t}); } vector<int> getNewsFeed(int u) { vector<int> out; for (int i = (int)posts.size() - 1; i >= 0 && (int)out.size() < 10; i--) { auto& p = posts[i]; if (p[1] == u || fw[u].count(p[1])) out.push_back(p[2]); } return out; } void follow(int a, int b) { fw[a].insert(b); } void unfollow(int a, int b) { fw[a].erase(b); } private: int clk; vector<array<int,3>> posts; std::unordered_map<int, std::unordered_set<int>> fw; };";
        let spec = overlay_spec(&catalog, "design-twitter");
        check(&spec, tw_java, false, "twitter", &mut rows);
        check(&spec, tw_cpp, true, "twitter", &mut rows);

        let med_java = "class MedianFinder { private java.util.PriorityQueue<Integer> lo = new java.util.PriorityQueue<>((a, b) -> b - a); private java.util.PriorityQueue<Integer> hi = new java.util.PriorityQueue<>(); public MedianFinder() {} public void addNum(int num) { lo.add(num); hi.add(lo.poll()); if (lo.size() < hi.size()) lo.add(hi.poll()); } public double findMedian() { return lo.size() > hi.size() ? lo.peek() : (lo.peek() + hi.peek()) / 2.0; } }";
        let med_cpp = "class MedianFinder { public: MedianFinder() {} void addNum(int num) { lo.push(num); hi.push(lo.top()); lo.pop(); if (lo.size() < hi.size()) { lo.push(hi.top()); hi.pop(); } } double findMedian() { return lo.size() > hi.size() ? lo.top() : (lo.top() + hi.top()) / 2.0; } private: std::priority_queue<int> lo; std::priority_queue<int, std::vector<int>, std::greater<int>> hi; };";
        let spec = overlay_spec(&catalog, "find-median-from-data-stream");
        check(&spec, med_java, false, "median-finder", &mut rows);
        check(&spec, med_cpp, true, "median-finder", &mut rows);

        let ds_java = "class DetectSquares { private final java.util.Map<String, Integer> counts = new java.util.HashMap<>(); private final java.util.List<int[]> points = new java.util.ArrayList<>(); public DetectSquares() {} public void add(int[] point) { counts.merge(point[0] + \",\" + point[1], 1, Integer::sum); points.add(new int[]{point[0], point[1]}); } public int count(int[] point) { int x = point[0], y = point[1], total = 0; for (int[] p : points) { int x2 = p[0], y2 = p[1]; if (x2 != x && y2 != y && Math.abs(x2 - x) == Math.abs(y2 - y)) total += counts.getOrDefault(x + \",\" + y2, 0) * counts.getOrDefault(x2 + \",\" + y, 0); } return total; } }";
        let ds_cpp = "class DetectSquares { public: DetectSquares() {} void add(vector<int> point) { counts[{point[0], point[1]}]++; points.push_back({point[0], point[1]}); } int count(vector<int> point) { int x = point[0], y = point[1], total = 0; for (auto& p : points) { int x2 = p.first, y2 = p.second; if (x2 != x && y2 != y && abs(x2 - x) == abs(y2 - y)) total += cnt(x, y2) * cnt(x2, y); } return total; } private: std::map<std::pair<int,int>, int> counts; std::vector<std::pair<int,int>> points; int cnt(int x, int y) { auto it = counts.find({x, y}); return it == counts.end() ? 0 : it->second; } };";
        let spec = overlay_spec(&catalog, "detect-squares");
        check(&spec, ds_java, false, "detect-squares", &mut rows);
        check(&spec, ds_cpp, true, "detect-squares", &mut rows);

        // -- void in-place mutations --------------------------------------
        let sur_java = "class Solution { public void solve(char[][] board) { if (board.length == 0) return; int m = board.length, n = board[0].length; for (int i = 0; i < m; i++) { if (board[i][0] == 'O') dfs(board, i, 0); if (board[i][n-1] == 'O') dfs(board, i, n-1); } for (int j = 0; j < n; j++) { if (board[0][j] == 'O') dfs(board, 0, j); if (board[m-1][j] == 'O') dfs(board, m-1, j); } for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) { if (board[i][j] == 'O') board[i][j] = 'X'; else if (board[i][j] == 'E') board[i][j] = 'O'; } } private void dfs(char[][] b, int i, int j) { if (i < 0 || j < 0 || i >= b.length || j >= b[0].length || b[i][j] != 'O') return; b[i][j] = 'E'; dfs(b, i+1, j); dfs(b, i-1, j); dfs(b, i, j+1); dfs(b, i, j-1); } }";
        let sur_cpp = "class Solution { public: void solve(vector<vector<char>>& board) { if (board.empty() || board[0].empty()) return; int m = board.size(), n = board[0].size(); for (int i = 0; i < m; i++) { if (board[i][0] == 'O') dfs(board, i, 0); if (board[i][n-1] == 'O') dfs(board, i, n-1); } for (int j = 0; j < n; j++) { if (board[0][j] == 'O') dfs(board, 0, j); if (board[m-1][j] == 'O') dfs(board, m-1, j); } for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) { if (board[i][j] == 'O') board[i][j] = 'X'; else if (board[i][j] == 'E') board[i][j] = 'O'; } } private: void dfs(vector<vector<char>>& b, int i, int j) { if (i < 0 || j < 0 || i >= (int)b.size() || j >= (int)b[0].size() || b[i][j] != 'O') return; b[i][j] = 'E'; dfs(b, i+1, j); dfs(b, i-1, j); dfs(b, i, j+1); dfs(b, i, j-1); } };";
        let spec = overlay_spec(&catalog, "surrounded-regions");
        check(&spec, sur_java, false, "surrounded", &mut rows);
        check(&spec, sur_cpp, true, "surrounded", &mut rows);

        let rot_java = "class Solution { public void rotate(int[][] m) { int n = m.length; for (int i = 0; i < n; i++) for (int j = i; j < n; j++) { int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t; } for (int i = 0; i < n; i++) for (int j = 0; j < n / 2; j++) { int t = m[i][j]; m[i][j] = m[i][n-1-j]; m[i][n-1-j] = t; } } }";
        let rot_cpp = "class Solution { public: void rotate(vector<vector<int>>& m) { int n = m.size(); for (int i = 0; i < n; i++) for (int j = i; j < n; j++) std::swap(m[i][j], m[j][i]); for (int i = 0; i < n; i++) for (int j = 0; j < n/2; j++) std::swap(m[i][j], m[i][n-1-j]); } };";
        let spec = overlay_spec(&catalog, "rotate-image");
        check(&spec, rot_java, false, "rotate-image", &mut rows);
        check(&spec, rot_cpp, true, "rotate-image", &mut rows);

        let set_java = "class Solution { public void setZeroes(int[][] matrix) { int m = matrix.length, n = matrix[0].length; boolean[] rows = new boolean[m]; boolean[] cols = new boolean[n]; for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (matrix[i][j] == 0) { rows[i] = true; cols[j] = true; } for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (rows[i] || cols[j]) matrix[i][j] = 0; } }";
        let set_cpp = "class Solution { public: void setZeroes(vector<vector<int>>& a) { int m = a.size(), n = a[0].size(); std::vector<int> rows(m, 0), cols(n, 0); for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (a[i][j] == 0) { rows[i] = 1; cols[j] = 1; } for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (rows[i] || cols[j]) a[i][j] = 0; } };";
        let spec = overlay_spec(&catalog, "set-matrix-zeroes");
        check(&spec, set_java, false, "set-zeroes", &mut rows);
        check(&spec, set_cpp, true, "set-zeroes", &mut rows);

        let reo_java = "class Solution { public void reorderList(ListNode head) { if (head == null || head.next == null) return; ListNode slow = head, fast = head; while (fast.next != null && fast.next.next != null) { slow = slow.next; fast = fast.next.next; } ListNode second = slow.next; slow.next = null; ListNode prev = null; while (second != null) { ListNode n = second.next; second.next = prev; prev = second; second = n; } ListNode first = head; second = prev; while (second != null) { ListNode t1 = first.next, t2 = second.next; first.next = second; second.next = t1; first = t1; second = t2; } } }";
        let reo_cpp = "class Solution { public: void reorderList(ListNode* head) { if (!head || !head->next) return; ListNode *slow = head, *fast = head; while (fast->next && fast->next->next) { slow = slow->next; fast = fast->next->next; } ListNode* second = slow->next; slow->next = nullptr; ListNode* prev = nullptr; while (second) { ListNode* n = second->next; second->next = prev; prev = second; second = n; } ListNode* first = head; second = prev; while (second) { ListNode *t1 = first->next, *t2 = second->next; first->next = second; second->next = t1; first = t1; second = t2; } } };";
        let spec = overlay_spec(&catalog, "reorder-list");
        check(&spec, reo_java, false, "reorder-list", &mut rows);
        check(&spec, reo_cpp, true, "reorder-list", &mut rows);

        // -- exotic I/O ----------------------------------------------------
        let cyc_java = "class Solution { public boolean hasCycle(ListNode head) { ListNode slow = head, fast = head; while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; if (slow == fast) return true; } return false; } }";
        let cyc_cpp = "class Solution { public: bool hasCycle(ListNode* head) { ListNode *slow = head, *fast = head; while (fast && fast->next) { slow = slow->next; fast = fast->next->next; if (slow == fast) return true; } return false; } };";
        let spec = overlay_spec(&catalog, "linked-list-cycle");
        check(&spec, cyc_java, false, "linked-list-cycle", &mut rows);
        check(&spec, cyc_cpp, true, "linked-list-cycle", &mut rows);

        let merge_java = "class Solution { public ListNode mergeKLists(ListNode[] lists) { java.util.PriorityQueue<ListNode> pq = new java.util.PriorityQueue<>((a, b) -> a.val - b.val); for (ListNode n : lists) if (n != null) pq.add(n); ListNode dummy = new ListNode(0), cur = dummy; while (!pq.isEmpty()) { ListNode n = pq.poll(); cur.next = n; cur = cur.next; if (n.next != null) pq.add(n.next); } return dummy.next; } }";
        let merge_cpp = "class Solution { public: ListNode* mergeKLists(vector<ListNode*>& lists) { auto cmp = [](ListNode* a, ListNode* b) { return a->val > b->val; }; std::priority_queue<ListNode*, std::vector<ListNode*>, decltype(cmp)> pq(cmp); for (auto n : lists) if (n) pq.push(n); ListNode dummy(0), *cur = &dummy; while (!pq.empty()) { ListNode* n = pq.top(); pq.pop(); cur->next = n; cur = cur->next; if (n->next) pq.push(n->next); } return dummy.next; } };";
        let spec = overlay_spec(&catalog, "merge-k-sorted-lists");
        check(&spec, merge_java, false, "merge-k", &mut rows);
        check(&spec, merge_cpp, true, "merge-k", &mut rows);

        let lca_java = "class Solution { public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) { if (root == null || root == p || root == q) return root; TreeNode l = lowestCommonAncestor(root.left, p, q); TreeNode r = lowestCommonAncestor(root.right, p, q); return l == null ? r : (r == null ? l : root); } }";
        let lca_cpp = "class Solution { public: TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) { if (!root || root == p || root == q) return root; TreeNode* l = lowestCommonAncestor(root->left, p, q); TreeNode* r = lowestCommonAncestor(root->right, p, q); return !l ? r : (!r ? l : root); } };";
        let spec = overlay_spec(&catalog, "lowest-common-ancestor-of-a-binary-search-tree");
        check(&spec, lca_java, false, "lca", &mut rows);
        check(&spec, lca_cpp, true, "lca", &mut rows);

        let ser_java = "class Codec { public String serialize(TreeNode root) { if (root == null) return \"[]\"; java.util.List<String> out = new java.util.ArrayList<>(); java.util.Queue<TreeNode> q = new java.util.LinkedList<>(); q.add(root); while (!q.isEmpty()) { TreeNode n = q.poll(); if (n == null) { out.add(\"null\"); continue; } out.add(String.valueOf(n.val)); q.add(n.left); q.add(n.right); } while (!out.isEmpty() && out.get(out.size() - 1).equals(\"null\")) out.remove(out.size() - 1); return \"[\" + String.join(\",\", out) + \"]\"; } public TreeNode deserialize(String s) { if (s.equals(\"[]\")) return null; String[] p = s.substring(1, s.length() - 1).split(\",\", -1); TreeNode root = new TreeNode(Integer.parseInt(p[0])); java.util.Queue<TreeNode> q = new java.util.ArrayDeque<>(); q.add(root); int i = 1; while (!q.isEmpty() && i < p.length) { TreeNode n = q.poll(); if (!p[i].equals(\"null\")) { n.left = new TreeNode(Integer.parseInt(p[i])); q.add(n.left); } i++; if (i < p.length && !p[i].equals(\"null\")) { n.right = new TreeNode(Integer.parseInt(p[i])); q.add(n.right); } i++; } return root; } }";
        let ser_cpp = "class Codec { public: string serialize(TreeNode* root) { if (!root) return \"[]\"; vector<string> out; std::deque<TreeNode*> q; q.push_back(root); while (!q.empty()) { TreeNode* n = q.front(); q.pop_front(); if (!n) { out.push_back(\"null\"); continue; } out.push_back(to_string(n->val)); q.push_back(n->left); q.push_back(n->right); } while (!out.empty() && out.back() == \"null\") out.pop_back(); string s = \"[\"; for (size_t i = 0; i < out.size(); i++) { if (i) s += \",\"; s += out[i]; } return s + \"]\"; } TreeNode* deserialize(string s) { if (s == \"[]\") return nullptr; vector<string> p; string cur; for (size_t i = 1; i + 1 < s.size(); i++) { if (s[i] == ',') { p.push_back(cur); cur.clear(); } else cur += s[i]; } p.push_back(cur); TreeNode* root = new TreeNode(stoi(p[0])); std::deque<TreeNode*> q; q.push_back(root); size_t i = 1; while (!q.empty() && i < p.size()) { TreeNode* n = q.front(); q.pop_front(); if (p[i] != \"null\") { n->left = new TreeNode(stoi(p[i])); q.push_back(n->left); } i++; if (i < p.size() && p[i] != \"null\") { n->right = new TreeNode(stoi(p[i])); q.push_back(n->right); } i++; } return root; } };";
        let spec = overlay_spec(&catalog, "serialize-and-deserialize-binary-tree");
        check(&spec, ser_java, false, "serde", &mut rows);
        check(&spec, ser_cpp, true, "serde", &mut rows);

        let copy_java = "class Node { int val; Node next; Node random; Node(int v) { val = v; } } class Solution { public Node copyRandomList(Node head) { if (head == null) return null; java.util.HashMap<Node, Node> map = new java.util.HashMap<>(); Node n = head; while (n != null) { map.put(n, new Node(n.val)); n = n.next; } n = head; while (n != null) { Node c = map.get(n); c.next = map.get(n.next); c.random = map.get(n.random); n = n.next; } return map.get(head); } }";
        let copy_cpp = "struct Node { int val; Node* next; Node* random; Node(int x): val(x), next(nullptr), random(nullptr) {} }; class Solution { public: Node* copyRandomList(Node* head) { if (!head) return nullptr; std::unordered_map<Node*, Node*> map; for (Node* n = head; n; n = n->next) map[n] = new Node(n->val); for (Node* n = head; n; n = n->next) { map[n]->next = n->next ? map[n->next] : nullptr; map[n]->random = n->random ? map[n->random] : nullptr; } return map[head]; } };";
        let spec = overlay_spec(&catalog, "copy-list-with-random-pointer");
        check(&spec, copy_java, false, "copy-random", &mut rows);
        check(&spec, copy_cpp, true, "copy-random", &mut rows);

        let clone_java = "class Node { int val; java.util.List<Node> neighbors = new java.util.ArrayList<>(); Node(int v) { val = v; } } class Solution { public Node cloneGraph(Node node) { if (node == null) return null; java.util.HashMap<Node, Node> map = new java.util.HashMap<>(); java.util.ArrayDeque<Node> q = new java.util.ArrayDeque<>(); q.add(node); map.put(node, new Node(node.val)); while (!q.isEmpty()) { Node n = q.poll(); for (Node nb : n.neighbors) { if (!map.containsKey(nb)) { map.put(nb, new Node(nb.val)); q.add(nb); } map.get(n).neighbors.add(map.get(nb)); } } return map.get(node); } }";
        let clone_cpp = "struct Node { int val; std::vector<Node*> neighbors; Node(int v): val(v) {} }; class Solution { public: Node* cloneGraph(Node* node) { if (!node) return nullptr; std::unordered_map<Node*, Node*> map; std::deque<Node*> q; q.push_back(node); map[node] = new Node(node->val); while (!q.empty()) { Node* n = q.front(); q.pop_front(); for (Node* nb : n->neighbors) { if (!map.count(nb)) { map[nb] = new Node(nb->val); q.push_back(nb); } map[n]->neighbors.push_back(map[nb]); } } return map[node]; } };";
        let spec = overlay_spec(&catalog, "clone-graph");
        check(&spec, clone_java, false, "clone-graph", &mut rows);
        check(&spec, clone_cpp, true, "clone-graph", &mut rows);

        // -- plain-algorithm patches --------------------------------------
        let vt_java = "class Solution { public boolean validTree(int n, int[][] edges) { if (edges.length != n - 1) return false; int[] root = new int[n]; for (int i = 0; i < n; i++) root[i] = i; for (int[] e : edges) { int a = e[0], b = e[1]; while (root[a] != a) { root[a] = root[root[a]]; a = root[a]; } while (root[b] != b) { root[b] = root[root[b]]; b = root[b]; } if (a == b) return false; root[a] = b; } return true; } }";
        let vt_cpp = "class Solution { public: bool validTree(int n, vector<vector<int>>& edges) { if ((int)edges.size() != n - 1) return false; vector<int> root(n); for (int i = 0; i < n; i++) root[i] = i; std::function<int(int)> find = [&](int x) { return root[x] == x ? x : root[x] = find(root[x]); }; for (auto& e : edges) { int a = find(e[0]), b = find(e[1]); if (a == b) return false; root[a] = b; } return true; } };";
        let spec = overlay_spec(&catalog, "graph-valid-tree");
        check(&spec, vt_java, false, "valid-tree", &mut rows);
        check(&spec, vt_cpp, true, "valid-tree", &mut rows);

        let cc_java = "class Solution { public int countComponents(int n, int[][] edges) { int[] root = new int[n]; for (int i = 0; i < n; i++) root[i] = i; int groups = n; for (int[] e : edges) { int a = e[0], b = e[1]; while (root[a] != a) { root[a] = root[root[a]]; a = root[a]; } while (root[b] != b) { root[b] = root[root[b]]; b = root[b]; } if (a != b) { root[a] = b; groups--; } } return groups; } }";
        let cc_cpp = "class Solution { public: int countComponents(int n, vector<vector<int>>& edges) { vector<int> root(n); for (int i = 0; i < n; i++) root[i] = i; std::function<int(int)> find = [&](int x) { return root[x] == x ? x : root[x] = find(root[x]); }; int groups = n; for (auto& e : edges) { int a = find(e[0]), b = find(e[1]); if (a != b) { root[a] = b; groups--; } } return groups; } };";
        let spec = overlay_spec(
            &catalog,
            "number-of-connected-components-in-an-undirected-graph",
        );
        check(&spec, cc_java, false, "components", &mut rows);
        check(&spec, cc_cpp, true, "components", &mut rows);

        // -- full-lesson externals -----------------------------------------
        let codec2_java = "import java.util.*; class Codec { public String encode(List<String> strs) { StringBuilder sb = new StringBuilder(); for (String s : strs) sb.append(s.length()).append('#').append(s); return sb.toString(); } public List<String> decode(String s) { List<String> out = new ArrayList<>(); int i = 0; while (i < s.length()) { int j = s.indexOf('#', i); int len = Integer.parseInt(s.substring(i, j)); i = j + 1; out.add(s.substring(i, i + len)); i += len; } return out; } }";
        let codec2_cpp = "class Codec { public: string encode(vector<string> strs) { string out; for (auto& s : strs) out += to_string(s.size()) + '#' + s; return out; } vector<string> decode(string s) { vector<string> out; size_t i = 0; while (i < s.size()) { size_t j = s.find('#', i); int len = stoi(s.substr(i, j - i)); i = j + 1; out.push_back(s.substr(i, len)); i += len; } return out; } };";
        let spec = overlay_spec(&catalog, "encode-and-decode-strings");
        check(&spec, codec2_java, false, "encode", &mut rows);
        check(&spec, codec2_cpp, true, "encode", &mut rows);

        let walls_java = "class Solution { public void wallsAndGates(int[][] rooms) { if (rooms.length == 0) return; int m = rooms.length, n = rooms[0].length; java.util.ArrayDeque<int[]> q = new java.util.ArrayDeque<>(); for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (rooms[i][j] == 0) q.add(new int[]{i, j}); int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}}; while (!q.isEmpty()) { int[] c = q.poll(); for (int[] d : dirs) { int r = c[0] + d[0], col = c[1] + d[1]; if (r < 0 || col < 0 || r >= m || col >= n || rooms[r][col] != Integer.MAX_VALUE) continue; rooms[r][col] = rooms[c[0]][c[1]] + 1; q.add(new int[]{r, col}); } } } }";
        let walls_cpp = "class Solution { public: void wallsAndGates(vector<vector<int>>& rooms) { if (rooms.empty() || rooms[0].empty()) return; int m = rooms.size(), n = rooms[0].size(); const int INF = 2147483647; std::deque<std::pair<int,int>> q; for (int i = 0; i < m; i++) for (int j = 0; j < n; j++) if (rooms[i][j] == 0) q.push_back({i, j}); const int d[4][2] = {{1,0},{-1,0},{0,1},{0,-1}}; while (!q.empty()) { auto [r, c] = q.front(); q.pop_front(); for (auto& k : d) { int nr = r + k[0], nc = c + k[1]; if (nr < 0 || nc < 0 || nr >= m || nc >= n || rooms[nr][nc] != INF) continue; rooms[nr][nc] = rooms[r][c] + 1; q.push_back({nr, nc}); } } } };";
        let spec = overlay_spec(&catalog, "walls-and-gates");
        check(&spec, walls_java, false, "walls", &mut rows);
        check(&spec, walls_cpp, true, "walls", &mut rows);

        let alien_java = "class Solution { public String foreignDictionary(String[] words) { java.util.Map<Character, java.util.Set<Character>> g = new java.util.HashMap<>(); java.util.Map<Character, Integer> indeg = new java.util.HashMap<>(); for (String w : words) for (char c : w.toCharArray()) { g.putIfAbsent(c, new java.util.HashSet<>()); indeg.putIfAbsent(c, 0); } for (int i = 0; i + 1 < words.length; i++) { String a = words[i], b = words[i+1]; if (a.length() > b.length() && a.startsWith(b)) return \"\"; int n = Math.min(a.length(), b.length()); for (int j = 0; j < n; j++) if (a.charAt(j) != b.charAt(j)) { if (g.get(a.charAt(j)).add(b.charAt(j))) indeg.put(b.charAt(j), indeg.get(b.charAt(j)) + 1); break; } } java.util.Queue<Character> q = new java.util.ArrayDeque<>(); for (char c : indeg.keySet()) if (indeg.get(c) == 0) q.add(c); StringBuilder sb = new StringBuilder(); while (!q.isEmpty()) { char c = q.poll(); sb.append(c); for (char nb : g.get(c)) { indeg.put(nb, indeg.get(nb) - 1); if (indeg.get(nb) == 0) q.add(nb); } } return sb.length() == indeg.size() ? sb.toString() : \"\"; } }";
        let spec = overlay_spec(&catalog, "alien-dictionary");
        check(&spec, alien_java, false, "alien", &mut rows);
        let alien_cpp = "class Solution { public: string foreignDictionary(vector<string> words) { std::map<char, std::set<char>> g; std::map<char, int> indeg; for (auto& w : words) for (char c : w) { g[c]; if (!indeg.count(c)) indeg[c] = 0; } for (size_t i = 0; i + 1 < words.size(); i++) { auto& a = words[i]; auto& b = words[i+1]; if (a.size() > b.size() && a.compare(0, b.size(), b) == 0) return \"\"; size_t n = std::min(a.size(), b.size()); for (size_t j = 0; j < n; j++) if (a[j] != b[j]) { if (g[a[j]].insert(b[j]).second) indeg[b[j]]++; break; } } std::deque<char> q; for (auto& kv : indeg) if (kv.second == 0) q.push_back(kv.first); string out; while (!q.empty()) { char c = q.front(); q.pop_front(); out += c; for (char nb : g[c]) if (--indeg[nb] == 0) q.push_back(nb); } return out.size() == indeg.size() ? out : \"\"; } };";
        check(&spec, alien_cpp, true, "alien", &mut rows);

        let meet_java = "class Solution { public boolean canAttendMeetings(Interval[] intervals) { java.util.Arrays.sort(intervals, (a, b) -> Integer.compare(a.start, b.start)); for (int i = 1; i < intervals.length; i++) if (intervals[i].start < intervals[i-1].end) return false; return true; } }";
        let meet_cpp = "class Solution { public: bool canAttendMeetings(vector<Interval>& v) { sort(v.begin(), v.end(), [](const Interval& a, const Interval& b) { return a.start < b.start; }); for (size_t i = 1; i < v.size(); i++) if (v[i].start < v[i-1].end) return false; return true; } };";
        let spec = overlay_spec(&catalog, "meeting-rooms");
        check(&spec, meet_java, false, "meetings", &mut rows);
        check(&spec, meet_cpp, true, "meetings", &mut rows);

        let meet2_java = "class Solution { public int minMeetingRooms(Interval[] intervals) { java.util.Arrays.sort(intervals, (a, b) -> Integer.compare(a.start, b.start)); java.util.PriorityQueue<Integer> ends = new java.util.PriorityQueue<>(); for (Interval v : intervals) { if (!ends.isEmpty() && ends.peek() <= v.start) ends.poll(); ends.add(v.end); } return ends.size(); } }";
        let meet2_cpp = "class Solution { public: int minMeetingRooms(vector<Interval>& v) { sort(v.begin(), v.end(), [](const Interval& a, const Interval& b) { return a.start < b.start; }); std::priority_queue<int, std::vector<int>, std::greater<int>> ends; for (auto& m : v) { if (!ends.empty() && ends.top() <= m.start) ends.pop(); ends.push(m.end); } return (int)ends.size(); } };";
        let spec = overlay_spec(&catalog, "meeting-rooms-ii");
        check(&spec, meet2_java, false, "meetings-ii", &mut rows);
        check(&spec, meet2_cpp, true, "meetings-ii", &mut rows);
        let results_path = std::env::var_os("OVERLAY_RESULTS_JSON")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| {
                Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target/overlay-results.json")
            });
        let results = serde_json::json!({
            "version": 1,
            "rows": rows
                .iter()
                .map(|(slug, lang, ok)| serde_json::json!({"slug": slug, "lang": lang, "ok": ok}))
                .collect::<Vec<_>>(),
        });
        std::fs::write(
            &results_path,
            serde_json::to_string_pretty(&results).unwrap(),
        )
        .unwrap();
        eprintln!(
            "overlay: {}/{} checks passed; results: {}",
            rows.iter().filter(|r| r.2).count(),
            rows.len(),
            results_path.display()
        );
    }

    /// Every practice variant in the shipped fixture must grade through the
    /// native judge: supported mode, signature, and non-empty tests.
    /// This is the contract the Practice tab's Grade button relies on.
    #[test]
    fn variants_are_gradable() {
        const FIXTURE: &[u8] = include_bytes!("../../../fixtures/catalog-extra.json");
        let catalog = leetlab_learning::Catalog::from_json(FIXTURE).unwrap();
        let mut variants = 0;
        for lesson in &catalog.lessons {
            for variant in &lesson.variants {
                variants += 1;
                let spec = Judge {
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
                };
                assert!(
                    supported(&spec),
                    "{} {} is outside grading coverage: mode={} sig={}({})->{}",
                    lesson.slug,
                    variant.id,
                    spec.mode,
                    spec.signature.name,
                    spec.signature
                        .params
                        .iter()
                        .map(|parameter| parameter.value_type.clone())
                        .collect::<Vec<_>>()
                        .join(","),
                    spec.signature.return_type,
                );
            }
        }
        assert!(variants >= 400, "variant coverage regressed: {variants}");
    }

    /// The unwritable-temp failure must name the directory and the fix.
    /// Pure formatter check: no filesystem or compiler needed.
    #[test]
    fn temp_run_dir_error_is_actionable() {
        let dir = Path::new("C:\\fake\\temp\\leetlab-1-2-3");
        let error = io::Error::new(
            io::ErrorKind::PermissionDenied,
            "Access is denied. (os error 5)",
        );
        let message = temp_run_dir_error(dir, &error);
        assert!(message.contains("leetlab-1-2-3"), "{message}");
        assert!(message.contains("Access is denied"), "{message}");
        assert!(message.contains("writable temp"), "{message}");
        assert!(message.contains("TEMP"), "{message}");
    }

    fn practice_spec(variant: &leetlab_learning::Variant) -> Judge {
        Judge {
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
        }
    }

    /// Negative control for every lesson: the first practice variant of each
    /// of the 150 lessons must FAIL grading with an empty program in both
    /// languages. A passing empty program would mean vacuous tests.
    /// Writes desktop/target/empty-negative-results.json for the matrix.
    #[test]
    #[ignore = "grades 300 empty programs (150 lessons x Java+C++); needs javac, java and g++ on PATH"]
    fn empty_programs_fail_every_variant() {
        const FIXTURE: &[u8] = include_bytes!("../../../fixtures/catalog-extra.json");
        let catalog = leetlab_learning::Catalog::from_json(FIXTURE).unwrap();
        const JAVA_EMPTY: &str = "class Solution {}";
        const CPP_EMPTY: &str = "class Solution {};";
        let mut cases: Vec<(String, String, bool, String)> = Vec::new();
        for lesson in &catalog.lessons {
            let Some(variant) = lesson.variants.first() else {
                continue;
            };
            cases.push((
                lesson.slug.clone(),
                variant.id.clone(),
                false,
                JAVA_EMPTY.into(),
            ));
            cases.push((
                lesson.slug.clone(),
                variant.id.clone(),
                true,
                CPP_EMPTY.into(),
            ));
        }
        assert!(
            cases.len() >= 300,
            "variant coverage regressed: {}",
            cases.len()
        );
        let cancel = AtomicBool::new(false);
        let cancel_ref = &cancel;
        let lessons = &catalog.lessons;
        let mut rows: Vec<serde_json::Value> = Vec::with_capacity(cases.len());
        std::thread::scope(|scope| {
            let mut handles = Vec::new();
            for chunk in cases.chunks(cases.len().div_ceil(4)) {
                handles.push(scope.spawn(move || {
                    let mut local = Vec::with_capacity(chunk.len());
                    for (slug, variant_id, cpp, code) in chunk {
                        let spec = practice_spec(
                            &lessons
                                .iter()
                                .find(|lesson| &lesson.slug == slug)
                                .unwrap()
                                .variants
                                .iter()
                                .find(|variant| &variant.id == variant_id)
                                .unwrap(),
                        );
                        let outcome = judge_code(&spec, code, *cpp, cancel_ref);
                        local.push((slug.clone(), variant_id.clone(), *cpp, outcome));
                    }
                    local
                }));
            }
            for handle in handles {
                for (slug, variant_id, cpp, outcome) in handle.join().unwrap() {
                    eprintln!(
                        "{} {} {} {}",
                        if cpp { "cpp " } else { "java" },
                        slug,
                        variant_id,
                        if outcome.ok {
                            "VACUOUS-PASS"
                        } else {
                            "fail-ok"
                        },
                    );
                    rows.push(serde_json::json!({
                        "slug": slug,
                        "variant": variant_id,
                        "lang": if cpp { "cpp" } else { "java" },
                        "ok": outcome.ok,
                        "text": outcome.text.chars().take(200).collect::<String>(),
                    }));
                }
            }
        });
        let vacuous: Vec<&serde_json::Value> = rows
            .iter()
            .filter(|row| row["ok"].as_bool().unwrap())
            .collect();
        let results = serde_json::json!({
            "version": 1,
            "summary": {
                "total": rows.len(),
                "failed_as_expected": rows.len() - vacuous.len(),
                "vacuous_passes": vacuous.len(),
            },
            "rows": rows,
        });
        let results_path =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../target/empty-negative-results.json");
        fs::write(
            &results_path,
            serde_json::to_string_pretty(&results).unwrap(),
        )
        .unwrap();
        assert!(
            vacuous.is_empty(),
            "vacuous passes: {}",
            serde_json::to_string(&vacuous)
                .unwrap()
                .chars()
                .take(500)
                .collect::<String>()
        );
    }

    fn hung_int_spec() -> Judge {
        Judge {
            mode: "exact".into(),
            signature: leetlab_core::Signature {
                name: "f".into(),
                params: Vec::new(),
                return_type: "int".into(),
            },
            tests: vec![leetlab_core::JudgeCase {
                args: Vec::new(),
                expected: "1".into(),
                example: 1,
            }],
            mutates: None,
            sequences: None,
            validate: None,
            helpers: None,
        }
    }

    /// Cancellation during a hung run must report Cancelled, not hang until
    /// the run timeout. Covers the Cancel button path used by Solve/Practice.
    #[test]
    #[ignore = "needs javac and java on PATH; ~2s"]
    fn cancel_aborts_hung_run() {
        let spec = hung_int_spec();
        let code = "class Solution { int f() { for (;;) { try { Thread.sleep(20); } catch (Exception e) { return -1; } } } }";
        let cancel = AtomicBool::new(false);
        std::thread::scope(|scope| {
            scope.spawn(|| {
                std::thread::sleep(Duration::from_millis(1000));
                cancel.store(true, Ordering::Relaxed);
            });
            let outcome = judge_code(&spec, code, false, &cancel);
            assert_eq!(outcome.text, "Cancelled.", "unexpected: {}", outcome.text);
            assert!(!outcome.ok);
        });
    }

    /// A hung solution without cancellation must hit the run timeout with an
    /// explicit message (not an indefinite hang).
    #[test]
    #[ignore = "needs javac and java on PATH; ~10s"]
    fn run_timeout_fires_on_hung_solution() {
        let spec = hung_int_spec();
        let code = "class Solution { int f() { for (;;) { try { Thread.sleep(20); } catch (Exception e) { return -1; } } } }";
        let outcome = judge_code(&spec, code, false, &AtomicBool::new(false));
        assert_eq!(
            outcome.text, "java exceeded the time limit",
            "unexpected: {}",
            outcome.text
        );
        assert!(!outcome.ok);
    }

    /// Environment manipulation is process-global; serialize the tests that
    /// rewrite compiler-discovery variables. Gate runners invoke ignored
    /// tests in separate processes; this lock covers bulk in-process runs.
    fn env_lock() -> &'static std::sync::Mutex<()> {
        static LOCK: std::sync::OnceLock<std::sync::Mutex<()>> = std::sync::OnceLock::new();
        LOCK.get_or_init(|| std::sync::Mutex::new(()))
    }

    fn save_env(keys: &[&str]) -> Vec<(String, Option<std::ffi::OsString>)> {
        keys.iter()
            .map(|key| ((*key).to_owned(), std::env::var_os(key)))
            .collect()
    }

    fn restore_env(saved: &[(String, Option<std::ffi::OsString>)]) {
        for (key, value) in saved {
            match value {
                Some(value) => unsafe { std::env::set_var(key, value) },
                None => unsafe { std::env::remove_var(key) },
            }
        }
    }

    /// PATH entries that resolve a compiler on a dev machine. Filtered out
    /// to prove missing-toolchain behavior; restored afterwards.
    fn scrubbed_path_without(markers: &[&str]) -> std::ffi::OsString {
        let path = std::env::var_os("PATH").unwrap_or_default();
        let kept: Vec<_> = std::env::split_paths(&path)
            .filter(|entry| {
                let lower = entry.as_os_str().to_string_lossy().to_lowercase();
                !markers.iter().any(|marker| lower.contains(marker))
            })
            .collect();
        std::env::join_paths(kept).unwrap_or_default()
    }

    fn assert_no_resolve(program: &str, arg: &str) {
        let probe = std::process::Command::new(program)
            .arg(arg)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();
        assert!(
            probe.is_err(),
            "test env still resolves {program}: scrub PATH of compilers first"
        );
    }

    /// Java grading must not require any C++ toolchain: with LCLAB_CXX
    /// pointing nowhere and no g++ on PATH, a Java run against the packaged
    /// JDK still passes. (Pre-fix code resolved both toolchains up front
    /// and failed here.)
    #[test]
    #[ignore = "needs the packaged Temurin JDK staged; ~5s"]
    fn java_grades_with_cpp_missing() {
        let _guard = env_lock().lock().unwrap();
        let jdk = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../target/pkg-win/LeetCodeLab/toolchains/jdk");
        if !jdk
            .join(if cfg!(windows) {
                "bin/javac.exe"
            } else {
                "bin/javac"
            })
            .is_file()
        {
            eprintln!("SKIP: packaged JDK not staged");
            return;
        }
        let saved = save_env(&["LCLAB_CXX", "LCLAB_JDK_HOME", "PATH"]);
        unsafe {
            std::env::set_var("LCLAB_CXX", "D:\\leetlab-test-no-such-dir\\g++.exe");
            std::env::set_var("LCLAB_JDK_HOME", &jdk);
            std::env::set_var(
                "PATH",
                scrubbed_path_without(&["msys64", "mingw", "gcc", "strawberry", "cygwin"]),
            );
        }
        let result = (|| {
            assert_no_resolve("g++", "--version");
            let spec = hung_int_spec();
            let code = "class Solution { int f() { return 1; } }";
            Ok::<_, String>(judge_code(&spec, code, false, &AtomicBool::new(false)))
        })();
        restore_env(&saved);
        let outcome = result.unwrap();
        assert_eq!(
            outcome.kind,
            OutcomeKind::Passed,
            "unexpected: {}",
            outcome.text
        );
        assert!(outcome.ok, "unexpected: {}", outcome.text);
    }

    /// Mirror: C++ grading must not require any JDK. Uses an explicit
    /// space-free g++ (skips when none is reachable); the JDK side is
    /// fully broken (bogus home + scrubbed javac).
    #[test]
    #[ignore = "needs a space-free g++; ~8s"]
    fn cpp_grades_with_jdk_missing() {
        let _guard = env_lock().lock().unwrap();
        let candidates = [
            "C:\\msys64\\mingw64\\bin\\g++.exe",
            "C:\\mingw64\\bin\\g++.exe",
        ];
        let Some(cxx) = candidates.iter().find(|path| Path::new(path).is_file()) else {
            eprintln!("SKIP: no space-free system g++ reachable");
            return;
        };
        let saved = save_env(&["LCLAB_CXX", "LCLAB_JDK_HOME", "PATH"]);
        unsafe {
            std::env::set_var("LCLAB_JDK_HOME", "D:\\leetlab-test-no-such-dir");
            std::env::set_var("LCLAB_CXX", cxx);
            std::env::set_var(
                "PATH",
                scrubbed_path_without(&["oracle", "java", "jdk", "adoptium", "temurin"]),
            );
        }
        let result = (|| {
            assert_no_resolve("javac", "-version");
            assert_no_resolve("java", "-version");
            let spec = hung_int_spec();
            let code = "class Solution { public: int f() { return 1; } };";
            Ok::<_, String>(judge_code(&spec, code, true, &AtomicBool::new(false)))
        })();
        restore_env(&saved);
        let outcome = result.unwrap();
        assert_eq!(
            outcome.kind,
            OutcomeKind::Passed,
            "unexpected: {}",
            outcome.text
        );
        assert!(outcome.ok, "unexpected: {}", outcome.text);
    }

    /// An unwritable temp dir must surface as an actionable Setup failure,
    /// never a raw OS error and never a verdict. Runs alone: it rewrites
    /// TMP/TEMP process-wide (restored afterwards).
    #[test]
    #[ignore = "rewrites TMP/TEMP; run singly, not with parallel suites"]
    fn temp_dir_unwritable_reports_actionable_setup() {
        let _guard = env_lock().lock().unwrap();
        let dir = std::env::temp_dir().join(format!("leetlab-tc-file-{}", std::process::id()));
        std::fs::write(&dir, b"not-a-dir").unwrap();
        let saved = save_env(&["TMP", "TEMP"]);
        unsafe {
            std::env::set_var("TMP", &dir);
            std::env::set_var("TEMP", &dir);
        }
        let result = run_detailed(
            &hung_int_spec(),
            "class Solution {}",
            false,
            &AtomicBool::new(false),
        );
        restore_env(&saved);
        let _ = std::fs::remove_file(&dir);
        match result {
            Err(JudgeError::Setup(message)) => {
                assert!(message.contains("writable temp"), "{message}");
                assert!(message.contains("leetlab-"), "{message}");
            }
            other => panic!("expected Setup error, got {other:?}"),
        }
    }

    /// A restricted profile (LOCALAPPDATA pointing at a file, not a dir)
    /// must fail draft storage with an explicit error, never a panic and
    /// never a silent loss. Runs alone: it rewrites LOCALAPPDATA.
    #[test]
    #[ignore = "rewrites LOCALAPPDATA; run singly, not with parallel suites"]
    fn drafts_open_reports_restricted_profile() {
        let _guard = env_lock().lock().unwrap();
        let dir = std::env::temp_dir().join(format!("leetlab-df-file-{}", std::process::id()));
        std::fs::write(&dir, b"not-a-dir").unwrap();
        let saved = save_env(&["LOCALAPPDATA"]);
        unsafe { std::env::set_var("LOCALAPPDATA", &dir) };
        let result = crate::drafts::Store::open();
        restore_env(&saved);
        let _ = std::fs::remove_file(&dir);
        assert!(result.is_err(), "restricted profile must fail loudly");
    }
}
