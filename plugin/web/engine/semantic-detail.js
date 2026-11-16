// Pure ES module: detailed-event drilldown over a recorded frame array.
// No imports, no DOM, no network, no Math.random.
// Closes over fullFrames via a WeakMap so JSON.stringify(detail) never embeds events.
// Implements .workers/jobs/drilldown-impl/contract.md sections 2-4 (engine part only;
// UI paging and sampled-vs-complete labeling in sections 5 and 7 remain pending).

const store = new WeakMap();

function isValidSelected(selected, total, sampleSize) {
  if (!Array.isArray(selected)) return false;
  if (selected.length === 0) return false;
  if (selected.length !== sampleSize) return false;
  for (let i = 0; i < selected.length; i++) {
    const v = selected[i];
    if (!Number.isInteger(v)) return false;
    if (v < 0 || v >= total) return false;
    if (i > 0 && v <= selected[i - 1]) return false;
  }
  if (selected[selected.length - 1] !== total - 1) return false;
  return true;
}

function buildChapters(fullFrames) {
  const chapters = [];
  const n = fullFrames.length;
  let i = 0;
  while (i < n) {
    const step = fullFrames[i] != null ? fullFrames[i].step : undefined;
    let j = i + 1;
    while (j < n) {
      const s = fullFrames[j] != null ? fullFrames[j].step : undefined;
      if (s !== step) break;
      j++;
    }
    const label = String(step);
    for (let k = i; k < j; k += 50) {
      const start = k;
      const end = Math.min(k + 50, j);
      chapters.push({
        index: chapters.length,
        title: `${label} · events ${start}–${end - 1}`,
        start,
        end,
        count: end - start,
      });
    }
    i = j;
  }
  return chapters;
}

export function buildDetail(fullFrames, meta) {
  if (!Array.isArray(fullFrames)) return null;
  const total = fullFrames.length;
  if (total <= 40) return null;
  if (meta == null || typeof meta !== "object") return null;
  const sampleSize = meta.sampleSize;
  const omittedMeta = meta.omitted;
  const selected = meta.selected;
  if (!Number.isInteger(sampleSize) || sampleSize <= 0) return null;
  if (typeof omittedMeta !== "number" || !(omittedMeta > 0)) return null;
  if (!isValidSelected(selected, total, sampleSize)) return null;
  const omitted = total - sampleSize;
  if (omittedMeta !== omitted) return null;
  if (omitted <= 0) return null;
  const selectedCopy = selected.slice();
  const chapters = buildChapters(fullFrames);
  const detail = { total, sampleSize, omitted, chapters };
  store.set(detail, { frames: fullFrames, selected: selectedCopy });
  return detail;
}

function requireEntry(detail) {
  if (detail == null || typeof detail !== "object") {
    throw new TypeError("detail must be a Detail object built by buildDetail");
  }
  const entry = store.get(detail);
  if (!entry) {
    throw new TypeError("detail must be a Detail object built by buildDetail");
  }
  return entry;
}

export function getPage(detail, pageIndex, pageSize) {
  const entry = requireEntry(detail);
  const total = detail.total;
  if (pageSize === undefined) pageSize = 25;
  if (!Number.isInteger(pageSize) || pageSize < 10 || pageSize > 100) {
    throw new RangeError("pageSize must be an integer in 10..100");
  }
  if (!Number.isInteger(pageIndex)) {
    throw new RangeError("pageIndex must be an integer");
  }
  const pageCount = Math.ceil(total / pageSize);
  if (pageIndex < 0 || pageIndex >= pageCount) {
    throw new RangeError("pageIndex out of range");
  }
  const start = pageIndex * pageSize;
  const end = Math.min(start + pageSize, total);
  const frames = entry.frames;
  const events = [];
  for (let k = start; k < end; k++) {
    const f = frames[k];
    events.push({
      globalIndex: k,
      step: f.step,
      label: f.label,
      note: f.note,
      state: f.state,
    });
  }
  return { pageIndex, pageSize, pageCount, start, end, total, events };
}

export function getChapter(detail, chapterIndex) {
  requireEntry(detail);
  const chapters = detail.chapters;
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= chapters.length) {
    throw new RangeError("chapterIndex out of range");
  }
  return chapters[chapterIndex];
}

export function listChapters(detail) {
  requireEntry(detail);
  return detail.chapters.slice();
}

// Returns the POSITION (0-based index into the sampled frames) of the sampled
// frame nearest to globalIndex, for orientation links into existing goTo(position).
// Ties resolve to the lower position.
export function getNearestSampledIndex(detail, globalIndex) {
  const entry = requireEntry(detail);
  const total = detail.total;
  if (!Number.isInteger(globalIndex) || globalIndex < 0 || globalIndex >= total) {
    throw new RangeError("globalIndex out of range");
  }
  const selected = entry.selected;
  const lastPos = selected.length - 1;
  if (globalIndex <= selected[0]) return 0;
  if (globalIndex >= selected[lastPos]) return lastPos;
  let lo = 0;
  let hi = lastPos;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (selected[mid] <= globalIndex) lo = mid;
    else hi = mid;
  }
  const d0 = globalIndex - selected[lo];
  const d1 = selected[lo + 1] - globalIndex;
  return d0 <= d1 ? lo : lo + 1;
}
