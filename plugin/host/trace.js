/**
 * LeetCode Lab — "your code vs the trace" probe (narrow but real).
 *
 * Instead of single-stepping a debugger (fragile) or re-running a reference solution
 * (fake), this module compiles the USER's own method with tiny `__LCTrace.event(...)`
 * calls injected at the top of each loop body. The tracer serializes the variables that
 * are actually in scope — ints, int arrays, maps — into a bounded event log, which the
 * client renders as stepping frames. Anything the probe cannot handle (odd shapes,
 * compile failure, C++ that will not instrument cleanly) returns
 * `{ ok: false, unavailable: true, error }` and the UI falls back to the canonical
 * walkthrough. A trace is never fabricated.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runProcess, buildJavaSource, buildCppSource, parseLiteral } from './judge.js'

const MAX_EVENTS = 60
const RUN_TIMEOUT_MS = 8000
const COMPILE_TIMEOUT_MS = 25000

function splitTopLevel(text) {
  const parts = []
  let depth = 0
  let quote = null
  let current = ''
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quote) {
      current += ch
      if (ch === '\\') {
        current += text[i + 1] || ''
        i += 1
      } else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
      continue
    }
    if (ch === '<' || ch === '[' || ch === '{' || ch === '(') depth += 1
    if (ch === '>' || ch === ']' || ch === '}' || ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim() !== '') parts.push(current.trim())
  return parts
}

function stripComments(source) {
  return String(source || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
}

function identOf(declaration) {
  const cleaned = String(declaration || '')
    .replace(/=[\s\S]*$/, '')
    .trim()
    .replace(/^(final|const)\s+/, '')
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  const last = tokens[tokens.length - 1] || ''
  const match = /([A-Za-z_$][\w$]*)\s*(\[\s*\])*$/.exec(last.replace(/[*&]+$/, ''))
  return match ? match[1] : ''
}

/** Method parameter names for `name(...)` in user source; [] when not found. */
function javaParamNames(source, name) {
  const match = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(([^)]*)\\)').exec(source)
  if (!match) return []
  return splitTopLevel(match[1]).map(identOf).filter(Boolean)
}

function cppParamNames(source, name) {
  const match = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(([\\s\\S]*?)\\)').exec(source)
  if (!match) return []
  return splitTopLevel(match[1])
    .map((part) => identOf(part.split('=')[0]))
    .filter((id) => id && id !== 'void')
}

/** Top-level locals (brace depth 1 inside the method body): [{name, pos}]. */
function topLevelLocals(body, typePattern) {
  const out = []
  const seen = new Set()
  const pattern = new RegExp('(?:^|[;{}])\\s*(?:final\\s+)?(?:[A-Za-z_$][\\w$]*\\.)*(' + typePattern + ')(?:<[^;{}]*>)?(?:\\[\\])*\\s+([A-Za-z_$][\\w$]*)\\s*(?=[=;,)])', 'g')
  // Depth *before* each char: method top level is 0, a loop body is 1. Only depth-0
  // locals are in scope for the whole rest of the method (loop-inner names would not
  // compile in an injected probe placed at the top of the loop body).
  let depth = 0
  const before = new Array(body.length)
  for (let i = 0; i < body.length; i += 1) {
    before[i] = depth
    const ch = body[i]
    if (ch === '{') depth += 1
    else if (ch === '}') depth -= 1
  }
  let match
  while ((match = pattern.exec(body)) !== null) {
    // Depth at the type keyword itself (past any leading `;`/`{` the pattern consumed).
    const atType = match.index + Math.max(0, match[0].indexOf(match[1]))
    if ((before[Math.min(atType, before.length - 1)] || 0) !== 0) continue
    // Collect the full declaration statement so multi-declarator lists
    // (`int lo = 0, hi = 0;`) yield every name, not just the first.
    let end = match.index + match[0].length
    let depth = 0
    let quote = null
    for (let i = end; i < body.length; i += 1) {
      const ch = body[i]
      if (quote) {
        if (ch === '\\') i += 1
        else if (ch === quote) quote = null
        continue
      }
      // Note: < > are NOT depth chars (a<b comparisons would unbalance the scan;
      // generic brackets never contain an unquoted semicolon, so ()[]{} suffice).
      if (ch === '"' || ch === "'") { quote = ch; continue }
      if (ch === '(' || ch === '[' || ch === '{') depth += 1
      else if (ch === ')' || ch === ']' || ch === '}') depth -= 1
      if ((ch === ';' || ch === '{' || ch === '}') && depth <= 0) { end = i; break }
    }
    const names = []
    for (const part of splitTopLevel(body.slice(match.index, end).replace(/;$/, ''))) {
      if (!part || /^[<>{}\[\]()]*$/.test(part)) continue
      const id = identOf(part.replace(/^(?:final\s+|const\s+)*/, ''))
      // Skip the type fragment itself (e.g. a bare `int[]` with no declarator).
      if (id && !seen.has(id) && !/^(int|long|double|float|boolean|char|String|void|var|final|const)$/.test(id)) names.push(id)
    }
    for (const name of names) {
      if (seen.has(name)) continue
      seen.add(name)
      out.push({ name, pos: match.index })
    }
    pattern.lastIndex = Math.max(pattern.lastIndex, end)
  }
  return out
}

function methodBody(source, name) {
  const match = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\([^)]*\\)\\s*(?:throws[^{]*)?\\{').exec(source)
  if (!match) return null
  let depth = 0
  const start = match.index + match[0].length - 1
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return { body: source.slice(start + 1, i), start: start + 1 }
    }
  }
  return null
}

/** Loop injection sites: [{index (into body), loopVar}] — capped, innermost-first safe. */
function loopSites(body) {
  const sites = []
  let sawUnbraced = false
  const pattern = /\b(for|while)\s*\(/g
  let match
  while ((match = pattern.exec(body)) !== null) {
    let depth = 0
    let i = match.index + match[0].length - 1
    let header = ''
    for (; i < body.length; i += 1) {
      if (body[i] === '(') depth += 1
      else if (body[i] === ')') {
        depth -= 1
        if (depth === 0) break
      }
      header += body[i]
    }
    const rest = body.slice(i + 1).match(/^\s*\{/)
    if (!rest) { sawUnbraced = true; continue }
    const braceIndex = i + 1 + rest[0].length
    let loopVar = ''
    if (match[1] === 'for') {
      const init = splitTopLevel(header.replace(/^\(/, ''))[0] || ''
      const decl = /^\s*(?:final\s+)?(int|long)\s+([A-Za-z_$][\w$]*)/.exec(init)
      if (decl) loopVar = decl[2]
      else {
        const enhanced = /^\s*(?:final\s+)?[\w<>\[\].,\s]+\s+([A-Za-z_$][\w$]*)\s*:/.exec(init)
        if (enhanced) loopVar = enhanced[1]
      }
    }
    sites.push({ index: braceIndex, loopVar })
    if (sites.length >= 12) break
  }
  sites.sawUnbraced = sawUnbraced
  return sites
}

const JAVA_TRACER = `
class __LCTrace {
  static java.util.List<String> EVENTS = new java.util.ArrayList<>();
  static void event(String[] names, Object[] vals) {
    try {
      if (EVENTS.size() >= ${MAX_EVENTS}) return;
      StringBuilder sb = new StringBuilder("{");
      for (int k = 0; k < names.length; k++) {
        if (k > 0) sb.append(",");
        sb.append("\\"").append(names[k]).append("\\":").append(ser(vals[k]));
      }
      EVENTS.add(sb.append("}").toString());
    } catch (Throwable t) { /* tracing must never break user code */ }
  }
  static String ser(Object v) {
    try {
      if (v == null) return "null";
      if (v instanceof Integer || v instanceof Long || v instanceof Boolean) return String.valueOf(v);
      if (v instanceof Double || v instanceof Float) return String.valueOf(((Number) v).doubleValue());
      if (v instanceof Character) return "\\"" + String.valueOf(v).replace("\\"", "'") + "\\"";
      if (v instanceof String) return "\\"" + ((String) v).replace("\\\\", "\\\\\\\\").replace("\\"", "'").replace("\\n", " ") + "\\"";
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
          sb.append("\\"").append(String.valueOf(en.getKey())).append("\\":").append(ser(en.getValue()));
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
`

function javaLiteralForTrace(raw, type) {
  const value = parseLiteral(raw)
  const number = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.trunc(n) : 0
  }
  switch (type) {
    case 'int':
      return String(number(value))
    case 'long':
      return String(number(value)) + 'L'
    case 'double':
      return Number(value) || 0
    case 'boolean':
      return value === true ? 'true' : 'false'
    case 'string':
      return JSON.stringify(value === null ? '' : String(value))
    case 'char':
      return "'" + String(value ?? ' ').replace(/\\/g, '\\\\').replace(/'/g, "\\'").slice(0, 1) + "'"
    case 'int[]':
      return 'new int[]{' + (Array.isArray(value) ? value : []).map((item) => String(number(item))).join(', ') + '}'
    case 'int[][]': {
      const rows = Array.isArray(value) ? value : []
      return 'new int[][]{' + rows.map((row) => '{' + (Array.isArray(row) ? row : []).map((item) => String(number(item))).join(', ') + '}').join(', ') + '}'
    }
    case 'char[][]': {
      const rows = Array.isArray(value) ? value : []
      const ch = (c) => "'" + String(c ?? ' ').replace(/\\/g, '\\\\').replace(/'/g, "\\'").slice(0, 1) + "'"
      return 'new char[][]{' + rows.map((row) => '{' + (Array.isArray(row) ? row : []).map(ch).join(', ') + '}').join(', ') + '}'
    }
    case 'string[]':
      return 'new String[]{' + (Array.isArray(value) ? value : []).map((item) => JSON.stringify(String(item ?? ''))).join(', ') + '}'
    default:
      return null
  }
}

export async function traceJava(problem, code) {
  const signature = problem.judge.signature
  const bare = stripComments(code)
  const found = methodBody(bare, signature.name)
  if (!found) return { ok: false, unavailable: true, error: 'trace: could not find method ' + signature.name + ' in your code' }
  const params = javaParamNames(bare, signature.name)
  if (params.length === 0 && (signature.params || []).length > 0) {
    return { ok: false, unavailable: true, error: 'trace: could not read your parameter names' }
  }
  const locals = topLevelLocals(found.body, 'int|long|double|boolean|char|String|int\\[\\]|long\\[\\]|Map|HashMap|Set|HashSet|List|ArrayList|Deque|ArrayDeque')
  const sites = loopSites(found.body)
  if (sites.length === 0) {
    if (sites.sawUnbraced) return { ok: false, unavailable: true, error: 'trace: only for/while loops with braced bodies { } can be stepped through — wrap the loop body in braces and retry' }
    return { ok: false, unavailable: true, error: 'trace: no loops found — there is nothing to step through' }
  }

  const names = [...params]
  for (const local of locals) if (!names.includes(local.name)) names.push(local.name)
  const callFor = (loopVar, siteIndex) => {
    // Only names declared strictly before the injection site are in scope here;
    // injecting a later local (e.g. a result array allocated after the loops)
    // would not compile. Params are always in scope.
    const paramSet = new Set(params)
    const scoped = names.filter((n) => paramSet.has(n) || locals.some((l) => l.name === n && l.pos < siteIndex))
    const all = loopVar && !scoped.includes(loopVar) ? [...scoped, loopVar] : scoped
    return '\n__LCTrace.event(new String[]{' + all.map((n) => '"' + n + '"').join(',') + '}, new Object[]{' + all.join(',') + '});'
  }
  // Inject from the last site backwards so earlier indices stay valid.
  let instrumented = found.body
  const ordered = sites.slice().sort((a, b) => b.index - a.index)
  for (const site of ordered) {
    instrumented = instrumented.slice(0, site.index) + callFor(site.loopVar, site.index) + instrumented.slice(site.index)
  }
  const patched = code.slice(0, found.start) + instrumented + code.slice(found.start + found.body.length)

  const test = (problem.judge.tests || [])[0]
  if (!test) return { ok: false, unavailable: true, error: 'trace: problem has no tests' }
  const args = (test.args || []).map((raw, position) => javaLiteralForTrace(raw, ((signature.params || [])[position] || {}).type || 'int'))
  if (args.some((a) => a === null)) {
    return { ok: false, unavailable: true, error: 'trace: first test uses types this probe does not capture yet' }
  }
  const call = '__s.' + signature.name + '(' + args.join(', ') + ')'
  const source =
    'import java.util.*;\nimport java.io.*;\n\n' +
    patched +
    '\n\npublic class Main {\n  public static void main(String[] __args) throws Exception {\n' +
    '    Solution __s = new Solution();\n' +
    '    try { System.out.println("@@CALL " + __H.__out(' + call + ')); } catch (Throwable __t) { System.out.println("@@CALLERR " + __t.getClass().getSimpleName()); }\n' +
    '    System.out.println("@@TRACE_BEGIN");\n' +
    '    for (String __e : __LCTrace.EVENTS) System.out.println(__e);\n' +
    '    System.out.println("@@TRACE_END");\n' +
    '  }\n}\n' +
    JAVA_TRACER +
    '\nclass __H {\n  static String __out(Object v) { return String.valueOf(v); }\n}\n'

  const dir = await mkdtemp(join(tmpdir(), 'lclab-trace-'))
  try {
    await writeFile(join(dir, 'Main.java'), source, 'utf8')
    const compile = await runProcess('javac', ['-encoding', 'UTF-8', 'Main.java'], { timeoutMs: COMPILE_TIMEOUT_MS, spawn: { cwd: dir } })
    if (compile.code !== 0) {
      return { ok: false, unavailable: true, error: 'trace: your code with probes did not compile for tracing (the judge itself is unaffected)', stderr: (compile.stderr || compile.stdout || '').slice(0, 2000) }
    }
    const run = await runProcess('java', ['-cp', dir, 'Main'], { timeoutMs: RUN_TIMEOUT_MS, spawn: { cwd: dir } })
    if (run.timedOut) return { ok: false, unavailable: true, error: 'trace: run timed out' }
    const lines = String(run.stdout || '').split(/\r?\n/)
    const begin = lines.findIndex((line) => line.trim() === '@@TRACE_BEGIN')
    const end = lines.findIndex((line) => line.trim() === '@@TRACE_END')
    if (begin < 0 || end < 0 || end <= begin) {
      return { ok: false, unavailable: true, error: 'trace: no probe output captured' }
    }
    const events = []
    for (const line of lines.slice(begin + 1, end)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        events.push(JSON.parse(trimmed))
      } catch {
        /* skip unparsable probe lines */
      }
    }
    if (events.length === 0) return { ok: false, unavailable: true, error: 'trace: your loops never reported state (nothing captured)' }
    const callLine = lines.find((line) => line.trim().startsWith('@@CALL'))
    let result = callLine ? callLine.trim().slice(7) : ''
    // The trace driver uses a stub serializer; a default Object.toString (e.g. [I@2f92e0f4)
    // is not a value — say so instead of printing garbage.
    if (/^[[A-Za-z]*@[0-9a-f]+$/.test(result)) result = '(returned — run the judge for the exact value)'
    return { ok: true, lang: 'java', events, count: events.length, capped: events.length >= MAX_EVENTS, result }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

const CPP_TRACER = `
#include <sstream>
static std::vector<std::string> __lctrace_events;
static std::string __lcser(const char* name, int v) { return std::string("\\"") + name + "\\":" + std::to_string(v); }
static std::string __lcser(const char* name, long v) { return std::string("\\"") + name + "\\":" + std::to_string(v); }
static std::string __lcser(const char* name, long long v) { return std::string("\\"") + name + "\\":" + std::to_string(v); }
static std::string __lcser(const char* name, double v) { std::ostringstream o; o << v; return std::string("\\"") + name + "\\":" + o.str(); }
static std::string __lcser(const char* name, bool v) { return std::string("\\"") + name + "\\":" + (v ? "true" : "false"); }
static std::string __lcser(const char* name, char v) { return std::string("\\"") + name + "\\":" + std::to_string((int)v); }
static std::string __lcser(const char* name, const std::string& v) { return std::string("\\"") + name + "\\":\\"" + v + "\\""; }
static std::string __lcser(const char* name, const std::vector<int>& v) {
  std::string s = std::string("\\"") + name + "\\":[";
  for (size_t i = 0; i < v.size() && i < 40; i++) { if (i) s += ","; s += std::to_string(v[i]); }
  return s + "]";
}
static std::string __lcser(const char* name, const std::vector<std::vector<int>>& v) {
  std::string s = std::string("\\"") + name + "\\":[";
  for (size_t i = 0; i < v.size() && i < 12; i++) {
    if (i) s += ",";
    s += "[";
    for (size_t k = 0; k < v[i].size() && k < 40; k++) { if (k) s += ","; s += std::to_string(v[i][k]); }
    s += "]";
  }
  return s + "]";
}
static std::string __lcser(const char* name, const std::unordered_map<int,int>& v) {
  std::string s = std::string("\\"") + name + "\\":{";
  size_t n = 0;
  for (auto& kv : v) { if (n++ >= 16) break; if (n > 1) s += ","; s += "\\"" + std::to_string(kv.first) + "\\":" + std::to_string(kv.second); }
  return s + "}";
}
template <class T> static std::string __lcser(const char*, const T&) { return ""; }
static void __lctrace_emit(std::initializer_list<std::string> parts) {
  if (__lctrace_events.size() >= ${MAX_EVENTS}) return;
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
`

export async function traceCpp(problem, code) {
  const signature = problem.judge.signature
  const bare = stripComments(code)
  // Find the solution method body (first match of name + parenthesized params + brace).
  const decl = new RegExp('\\b' + signature.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(([\\s\\S]*?)\\)\\s*(?:const\\s*)?(?:noexcept\\s*)?\\{').exec(bare)
  if (!decl) return { ok: false, unavailable: true, error: 'trace: could not find method ' + signature.name + ' in your code' }
  let depth = 0
  const start = decl.index + decl[0].length - 1
  let bodyEnd = -1
  for (let i = start; i < bare.length; i += 1) {
    if (bare[i] === '{') depth += 1
    else if (bare[i] === '}') {
      depth -= 1
      if (depth === 0) {
        bodyEnd = i
        break
      }
    }
  }
  if (bodyEnd < 0) return { ok: false, unavailable: true, error: 'trace: could not parse your method body' }
  const body = bare.slice(start + 1, bodyEnd)
  const params = cppParamNames(bare, signature.name)
  // Only scalar int-ish and string/vector params are capturable; references to other
  // types would not compile in the probe call, so probe with what we can name and let
  // the compiler tell us (fallback) rather than guessing types.
  const locals = []
  {
    const seen = new Set(params)
    const pattern = /(?:^|[;{}])\s*(?:const\s+)?(int|long|double|bool|char|string|std::string|vector|unordered_map|map|unordered_set|set|deque|queue|stack|priority_queue)(?:<[^;{}]*>)?\s*([A-Za-z_]\w*)\s*(?=[=;,)\]:])/g
    let d = 0
    const before = new Array(body.length)
    for (let i = 0; i < body.length; i += 1) {
      before[i] = d
      if (body[i] === '{') d += 1
      else if (body[i] === '}') d -= 1
    }
    let m
    while ((m = pattern.exec(body)) !== null) {
      if (seen.has(m[2])) continue
      const atType = m.index + Math.max(0, m[0].indexOf(m[1]))
      if ((before[Math.min(atType, before.length - 1)] || 0) === 0) {
        seen.add(m[2])
        locals.push({ name: m[2], pos: m.index })
      }
    }
  }
  // C++ loops: for/while with a braced body (also captures the for-init index var).
  const sites = []
  {
    const pattern = /\b(for|while)\s*\(/g
    let m
    while ((m = pattern.exec(body)) !== null) {
      let d = 0
      let i = m.index + m[0].length - 1
      let header = ''
      for (; i < body.length; i += 1) {
        if (body[i] === '(') d += 1
        else if (body[i] === ')') {
          d -= 1
          if (d === 0) break
        }
        header += body[i]
      }
      const rest = body.slice(i + 1).match(/^\s*\{/)
      if (!rest) continue
      let loopVar = ''
      if (m[1] === 'for') {
        const init = splitTopLevel(header.replace(/^\(/, ''))[0] || ''
        const decl = /^\s*(?:const\s+)?(int|long|size_t)\s+([A-Za-z_]\w*)/.exec(init)
        if (decl) loopVar = decl[2]
        else {
          const enhanced = /^\s*(?:const\s+)?[\w:<>\s,&*]+\s+([A-Za-z_]\w*)\s*:/.exec(init)
          if (enhanced && !['return', 'if', 'for', 'while'].includes(enhanced[1])) loopVar = enhanced[1]
        }
      }
      sites.push({ index: i + 1 + rest[0].length, loopVar })
      if (sites.length >= 12) break
    }
  }
  if (sites.length === 0) return { ok: false, unavailable: true, error: 'trace: no braced loops found — there is nothing to step through' }
  const base = [...params, ...locals.map((l) => l.name)]
  const callFor = (loopVar, siteIndex) => {
    // Same scoping rule as the Java bridge: only params plus locals declared
    // before the injection site may be named in the probe call.
    const paramSet = new Set(params)
    const scoped = base.filter((n) => paramSet.has(n) || locals.some((l) => l.name === n && l.pos < siteIndex))
    const all = loopVar && !scoped.includes(loopVar) ? [...scoped, loopVar] : scoped
    return '\n__lctrace_emit({' + all.map((n) => '__lcser("' + n + '",' + n + ')').join(',') + '});'
  }
  let instrumented = body
  for (const site of sites.slice().sort((a, b) => b.index - a.index)) {
    instrumented = instrumented.slice(0, site.index) + callFor(site.loopVar, site.index) + instrumented.slice(site.index)
  }
  const patched = code.slice(0, start + 1) + instrumented + code.slice(start + 1 + body.length)

  const test = (problem.judge.tests || [])[0]
  if (!test) return { ok: false, unavailable: true, error: 'trace: problem has no tests' }
  // Reuse the standard C++ harness builder, then splice trace printing into main.
  let harness
  try {
    harness = buildCppSource({ judge: { signature, tests: [test] } }, patched)
  } catch {
    return { ok: false, unavailable: true, error: 'trace: could not build a harness for this signature' }
  }
  const splice = '\n  std::cout << "@@TRACE_BEGIN" << std::endl;\n  for (auto& e : __lctrace_events) std::cout << e << std::endl;\n  std::cout << "@@TRACE_END" << std::endl;\n  return 0;'
  harness = harness.replace(/\n  return 0;\n\}/, splice + '\n}')
  const dir = await mkdtemp(join(tmpdir(), 'lclab-trace-'))
  try {
    await writeFile(join(dir, 'main.cpp'), '#include <bits/stdc++.h>\nusing namespace std;\n' + CPP_TRACER + '\n' + harness.replace('#include <bits/stdc++.h>', ''), 'utf8')
    const compile = await runProcess('g++', ['-std=gnu++20', '-O2', '-o', 'main.exe', 'main.cpp'], { timeoutMs: COMPILE_TIMEOUT_MS, spawn: { cwd: dir } })
    if (compile.code !== 0) {
      return { ok: false, unavailable: true, error: 'trace: your C++ code with probes did not compile for tracing (the judge itself is unaffected)', stderr: (compile.stderr || compile.stdout || '').slice(0, 2000) }
    }
    const run = await runProcess(join(dir, 'main.exe'), [], { timeoutMs: RUN_TIMEOUT_MS, spawn: { cwd: dir } })
    if (run.timedOut) return { ok: false, unavailable: true, error: 'trace: run timed out' }
    const lines = String(run.stdout || '').split(/\r?\n/)
    const begin = lines.findIndex((line) => line.trim() === '@@TRACE_BEGIN')
    const end = lines.findIndex((line) => line.trim() === '@@TRACE_END')
    if (begin < 0 || end < 0 || end <= begin) return { ok: false, unavailable: true, error: 'trace: no probe output captured' }
    const events = []
    for (const line of lines.slice(begin + 1, end)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        events.push(JSON.parse(trimmed))
      } catch {
        /* skip */
      }
    }
    if (events.length === 0) return { ok: false, unavailable: true, error: 'trace: your loops never reported state (nothing captured)' }
    return { ok: true, lang: 'cpp', events, count: events.length, capped: events.length >= MAX_EVENTS, result: '' }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function traceProblem(problem, lang, code) {
  if (!problem || !problem.judge || !problem.judge.signature) {
    return { ok: false, error: 'no judge spec for this problem', unavailable: true }
  }
  if (String(code || '').trim() === '') return { ok: false, error: 'empty solution' }
  try {
    if (lang === 'cpp') return await traceCpp(problem, code)
    return await traceJava(problem, code)
  } catch (error) {
    return { ok: false, unavailable: true, error: 'trace crashed: ' + String((error && error.message) || error) }
  }
}

// Re-exported so the smoke test can import one module.
export { buildJavaSource, buildCppSource }
