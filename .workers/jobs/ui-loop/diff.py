#!/usr/bin/env python3
"""Screenshot diff bot for the web-first UI loop.

Compares drive.ps1 captures in ``shots/`` against approved ``baselines/``
images, prints one PASS/FAIL line per state with the mean-abs-diff
percentage, writes red diff-overlay images for failures, and exits 0 when
every state passes (1 otherwise).

Backends: Pillow when importable, otherwise a pure-Python PNG codec
(stdlib ``zlib`` + ``struct`` only) that handles 8-bit non-interlaced
PNGs with color types 0 (gray), 2 (RGB) and 6 (RGBA).

Usage:
    python diff.py [--shots DIR] [--baselines DIR] [--diffs DIR]
                   [--threshold PCT] [--report PATH] [--states a,b,c]
                   [--self-test]

Exit codes: 0 = all states passed, 1 = any failure (including missing
shots/baselines). ``--self-test`` runs in-memory comparator checks and
exits 0 only if they all hold.
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_BASELINES = ROOT / "baselines"
DEFAULT_SHOTS = ROOT / "shots"
DEFAULT_DIFFS = ROOT / "diffs"
DEFAULT_REPORT = ROOT / "diff-report.json"
DEFAULT_THRESHOLD_PCT = 2.0
# Per-pixel channel tolerance for the red overlay / changed-pixel stat.
# Small AA / subpixel shifts should not paint the overlay red.
OVERLAY_TOLERANCE = 4

try:
    from PIL import Image  # type: ignore

    HAVE_PIL = True
except Exception:
    HAVE_PIL = False


# ---------------------------------------------------------------------------
# Pure-Python PNG codec (stdlib only)
# ---------------------------------------------------------------------------

_PNG_SIG = b"\x89PNG\r\n\x1a\n"


def _paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def png_decode(path: Path) -> tuple[int, int, bytes]:
    """Decode a PNG file to ``(width, height, RGB bytes)``.

    Supports bit depth 8, non-interlaced, color types 0/2/6.
    """
    raw = Path(path).read_bytes()
    if raw[:8] != _PNG_SIG:
        raise ValueError(f"not a PNG file: {path}")
    pos = 8
    width = height = bit_depth = color_type = interlace = -1
    idat = bytearray()
    while pos + 8 <= len(raw):
        (length,) = struct.unpack(">I", raw[pos : pos + 4])
        ctype = raw[pos + 4 : pos + 8]
        data = raw[pos + 8 : pos + 8 + length]
        if len(data) != length:
            raise ValueError(f"truncated chunk in {path}")
        if ctype == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(
                ">IIBBBBB", data
            )
        elif ctype == b"IDAT":
            idat += data
        elif ctype == b"IEND":
            break
        pos += 12 + length
    if width < 0:
        raise ValueError(f"missing IHDR in {path}")
    if bit_depth != 8:
        raise ValueError(f"unsupported bit depth {bit_depth} in {path}")
    if interlace != 0:
        raise ValueError(f"interlaced PNG not supported: {path}")
    if color_type == 0:
        channels = 1
    elif color_type == 2:
        channels = 3
    elif color_type == 6:
        channels = 4
    else:
        raise ValueError(f"unsupported color type {color_type} in {path}")
    stride = width * channels
    pixels = zlib.decompress(bytes(idat))
    if len(pixels) != height * (stride + 1):
        raise ValueError(f"bad pixel data size in {path}")
    out = bytearray(width * height * 3)
    prev = bytearray(stride)
    off = 0
    for y in range(height):
        ftype = pixels[off]
        off += 1
        line = bytearray(pixels[off : off + stride])
        off += stride
        if ftype == 1:  # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif ftype == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:  # Average
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:  # Paeth
            for i in range(stride):
                a = line[i - channels] if i >= channels else 0
                b = prev[i]
                c = prev[i - channels] if i >= channels else 0
                line[i] = (line[i] + _paeth(a, b, c)) & 0xFF
        elif ftype != 0:
            raise ValueError(f"bad filter {ftype} in {path}")
        prev = line
        if channels == 1:
            for x in range(width):
                g = line[x]
                o = (y * width + x) * 3
                out[o] = out[o + 1] = out[o + 2] = g
        elif channels == 3:
            out[y * width * 3 : (y + 1) * width * 3] = line
        else:  # RGBA -> drop alpha
            for x in range(width):
                o = (y * width + x) * 3
                i = x * 4
                out[o], out[o + 1], out[o + 2] = line[i], line[i + 1], line[i + 2]
    return width, height, bytes(out)


def png_encode_rgb(path: Path, width: int, height: int, rgb: bytes) -> None:
    """Write RGB bytes as an 8-bit non-interlaced PNG (filter 0 rows)."""
    if len(rgb) != width * height * 3:
        raise ValueError("pixel buffer size does not match dimensions")

    def chunk(ctype: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + ctype
            + data
            + struct.pack(">I", zlib.crc32(ctype + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    stride = width * 3
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw += rgb[y * stride : (y + 1) * stride]
    blob = (
        _PNG_SIG
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 6))
        + chunk(b"IEND", b"")
    )
    Path(path).write_bytes(blob)


# ---------------------------------------------------------------------------
# Image loading (Pillow preferred, stdlib fallback)
# ---------------------------------------------------------------------------


def load_rgb(path: Path) -> tuple[int, int, bytes]:
    if HAVE_PIL:
        with Image.open(path) as img:
            img = img.convert("RGB")
            return img.width, img.height, img.tobytes()
    return png_decode(path)


def save_rgb(path: Path, width: int, height: int, rgb: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if HAVE_PIL:
        Image.frombytes("RGB", (width, height), rgb).save(path)
    else:
        png_encode_rgb(path, width, height, rgb)


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------


def compare_buffers(
    base: tuple[int, int, bytes], shot: tuple[int, int, bytes]
) -> dict:
    """Return mean-abs-diff stats between two RGB buffers.

    Geometry is the baseline canvas; shot pixels outside the overlap count
    as fully different, missing shot pixels count as fully different.
    """
    bw, bh, bp = base
    sw, sh, sp = shot
    total = bw * bh * 3
    diff_sum = 0
    changed = 0
    overlay = bytearray(bp)  # start from baseline canvas
    for y in range(bh):
        for x in range(bw):
            o = (y * bw + x) * 3
            if x < sw and y < sh:
                s = (y * sw + x) * 3
                d0 = abs(bp[o] - sp[s])
                d1 = abs(bp[o + 1] - sp[s + 1])
                d2 = abs(bp[o + 2] - sp[s + 2])
            else:
                d0 = d1 = d2 = 255
            diff_sum += d0 + d1 + d2
            peak = max(d0, d1, d2)
            if peak > OVERLAY_TOLERANCE:
                changed += 1
                overlay[o] = 255
                overlay[o + 1] = 0
                overlay[o + 2] = 0
    mean_pct = diff_sum / (total * 255.0) * 100.0 if total else 100.0
    return {
        "mean_abs_diff_pct": mean_pct,
        "changed_px": changed,
        "changed_pct": changed / float(bw * bh) * 100.0 if bw * bh else 100.0,
        "size_mismatch": (bw != sw or bh != sh),
        "overlay": bytes(overlay),
    }


def state_of_baseline(path: Path) -> str:
    stem = path.stem.lower()
    if stem.startswith("baseline_"):
        stem = stem[len("baseline_") :]
    return stem


def find_shot(shots_dir: Path, state: str, latest_map: dict) -> Path | None:
    if state in latest_map:
        cand = shots_dir / str(latest_map[state])
        if cand.is_file():
            return cand
    exact = [shots_dir / f"{state}.png", shots_dir / f"baseline_{state}.png"]
    for cand in exact:
        if cand.is_file():
            return cand
    token = state.lower().replace("-", "_")
    scored: list[tuple[int, Path]] = []
    for cand in sorted(shots_dir.glob("*.png")):
        norm = cand.stem.lower().replace("-", "_").replace(" ", "_")
        if token and token in norm:
            scored.append((len(cand.stem), cand))
    if scored:
        scored.sort()
        return scored[0][1]
    return None


def load_latest_map(shots_dir: Path) -> dict:
    for name in ("latest.json", "shots.json", "manifest.json"):
        cand = shots_dir / name
        if not cand.is_file():
            continue
        try:
            data = json.loads(cand.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(data, dict):
            if isinstance(data.get("shots"), dict):
                return {str(k).lower(): v for k, v in data["shots"].items()}
            states = data.get("states")
            if isinstance(states, dict):
                return {str(k).lower(): v for k, v in states.items()}
            # Flat {state: file} mapping.
            flat = {
                str(k).lower(): v
                for k, v in data.items()
                if isinstance(v, str) and v.lower().endswith(".png")
            }
            if flat:
                return flat
    return {}


def run(
    shots_dir: Path,
    baselines_dir: Path,
    diffs_dir: Path,
    threshold_pct: float,
    wanted: set[str] | None = None,
) -> list[dict]:
    results: list[dict] = []
    baselines = sorted(baselines_dir.glob("*.png")) if baselines_dir.is_dir() else []
    latest_map = load_latest_map(shots_dir) if shots_dir.is_dir() else {}
    for base_path in baselines:
        state = state_of_baseline(base_path)
        if wanted and state not in wanted:
            continue
        entry: dict = {"state": state, "baseline": base_path.name}
        try:
            base = load_rgb(base_path)
        except Exception as exc:
            entry.update(status="FAIL", detail=f"cannot read baseline: {exc}")
            results.append(entry)
            continue
        shot_path = find_shot(shots_dir, state, latest_map) if shots_dir.is_dir() else None
        if shot_path is None:
            entry.update(status="FAIL", detail="no matching shot in shots/")
            results.append(entry)
            continue
        entry["shot"] = shot_path.name
        try:
            shot = load_rgb(shot_path)
        except Exception as exc:
            entry.update(status="FAIL", detail=f"cannot read shot: {exc}")
            results.append(entry)
            continue
        stats = compare_buffers(base, shot)
        entry.update(
            mean_abs_diff_pct=round(stats["mean_abs_diff_pct"], 4),
            changed_pct=round(stats["changed_pct"], 4),
            size_mismatch=stats["size_mismatch"],
        )
        passed = stats["mean_abs_diff_pct"] <= threshold_pct
        if passed:
            entry.update(status="PASS", detail="within threshold")
        else:
            overlay_path = diffs_dir / f"diff_{state}.png"
            try:
                save_rgb(overlay_path, base[0], base[1], stats["overlay"])
                entry["overlay"] = overlay_path.name
            except Exception as exc:
                entry["overlay"] = f"<write failed: {exc}>"
            note = "size differs" if stats["size_mismatch"] else "pixels differ"
            entry.update(status="FAIL", detail=f"exceeds threshold ({note})")
        results.append(entry)
    return results


# ---------------------------------------------------------------------------
# Self-test (no files needed; exercises the comparator core)
# ---------------------------------------------------------------------------


def self_test() -> bool:
    ok = True

    def check(name: str, cond: bool) -> None:
        nonlocal ok
        print(("PASS " if cond else "FAIL ") + name)
        if not cond:
            ok = False

    # Identical buffers -> 0.0% diff.
    a = (4, 2, bytes([10, 20, 30] * 8))
    b = (4, 2, bytes([10, 20, 30] * 8))
    s = compare_buffers(a, b)
    check("identical => 0.0%", s["mean_abs_diff_pct"] == 0.0 and s["changed_px"] == 0)

    # One fully-inverted pixel out of 8 -> (3*255)/(8*3*255) = 12.5%.
    c = bytearray([10, 20, 30] * 8)
    c[0], c[1], c[2] = 245, 235, 225
    s2 = compare_buffers(a, (4, 2, bytes(c)))
    expect = (235 + 215 + 195) / (8 * 3 * 255) * 100.0
    check(
        "single-pixel diff math",
        abs(s2["mean_abs_diff_pct"] - expect) < 1e-9 and s2["changed_px"] == 1,
    )

    # Size mismatch is reported.
    s3 = compare_buffers(a, (2, 2, bytes([10, 20, 30] * 4)))
    check("size mismatch flagged", s3["size_mismatch"] is True)

    # Pure-Python codec round-trips (also used when Pillow is missing).
    # NOTE: temp dir lives under the script folder so the bot never needs
    # to write outside the workspace.
    import shutil

    tmp = ROOT / ".tmp-selftest"
    tmp.mkdir(parents=True, exist_ok=True)
    try:
        p = tmp / "rt.png"
        w, h = 7, 5
        # Make channels differ so a naive gray/RGB mix-up would fail.
        px = bytes(
            ((x * 37 + y * 11 + ch * 53) % 256)
            for y in range(h)
            for x in range(w)
            for ch in range(3)
        )
        png_encode_rgb(p, w, h, px)
        dw, dh, back = png_decode(p)
        check("codec round-trip", (dw, dh, back) == (w, h, px))
        if HAVE_PIL:
            lw, lh, lp = load_rgb(p)
            check("pillow path agrees", (lw, lh, lp) == (w, h, px))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("self-test: " + ("OK" if ok else "FAILED"))
    return ok


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Compare UI loop shots against baselines.")
    ap.add_argument("--shots", default=str(DEFAULT_SHOTS))
    ap.add_argument("--baselines", default=str(DEFAULT_BASELINES))
    ap.add_argument("--diffs", default=str(DEFAULT_DIFFS))
    ap.add_argument("--report", default=str(DEFAULT_REPORT))
    ap.add_argument("--threshold", type=float, default=float(os.environ.get("UI_LOOP_THRESHOLD", DEFAULT_THRESHOLD_PCT)))
    ap.add_argument("--states", default="", help="comma-separated subset of states to check")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)

    if args.self_test:
        return 0 if self_test() else 1

    shots_dir = Path(args.shots)
    baselines_dir = Path(args.baselines)
    diffs_dir = Path(args.diffs)
    wanted = {s.strip().lower() for s in args.states.split(",") if s.strip()} or None

    print(f"diff bot: backend={'pillow' if HAVE_PIL else 'stdlib-png-fallback'}")
    print(f"diff bot: baselines={baselines_dir} shots={shots_dir} threshold={args.threshold}%")
    if not baselines_dir.is_dir() or not list(baselines_dir.glob("*.png")):
        print("diff bot: FAIL — no baselines found")
        return 1

    results = run(shots_dir, baselines_dir, diffs_dir, args.threshold, wanted)
    if wanted and not results:
        print("diff bot: FAIL — requested states have no baselines")
        return 1
    passed = failed = 0
    for r in results:
        status = r.get("status", "FAIL")
        if status == "PASS":
            passed += 1
        else:
            failed += 1
        extra = r.get("shot", r.get("detail", ""))
        metric = (
            f" diff={r['mean_abs_diff_pct']}%" if "mean_abs_diff_pct" in r else ""
        )
        detail = r.get("detail", "")
        print(f"[{status}] {r['state']}{metric} ({extra}) {detail}".rstrip())

    summary = {
        "backend": "pillow" if HAVE_PIL else "stdlib-png-fallback",
        "threshold_pct": args.threshold,
        "passed": passed,
        "failed": failed,
        "results": [{k: v for k, v in r.items()} for r in results],
    }
    try:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"diff bot: report -> {args.report}")
    except Exception as exc:
        print(f"diff bot: WARNING — could not write report: {exc}")

    print(f"diff bot: {passed} passed, {failed} failed")
    return 0 if failed == 0 and results else 1


if __name__ == "__main__":
    sys.exit(main())
