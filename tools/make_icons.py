"""Generate LeetCode Lab PWA icons with stdlib only (no Pillow needed).

Flat neo-brutalist mark: Thunder rounded square, Cherry inner square,
Linen play triangle. Writes plugin/web/icon-192.png and icon-512.png.
"""
import struct
import zlib


def rounded_mask(size, radius):
    inside = [[False] * size for _ in range(size)]
    for y in range(size):
        for x in range(size):
            cx = min(max(x, radius), size - 1 - radius)
            cy = min(max(y, radius), size - 1 - radius)
            inside[y][x] = (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius
    return inside


def paint(size, path):
    thunder = (16, 20, 38)
    cherry = (142, 42, 33)
    linen = (251, 246, 234)
    px = [[thunder for _ in range(size)] for _ in range(size)]
    m = size // 16
    # Cherry inner square.
    for y in range(4 * m, 12 * m):
        for x in range(4 * m, 12 * m):
            px[y][x] = cherry
    # Linen play triangle pointing right.
    for y in range(6 * m, 10 * m):
        half = (y - 6 * m) if y < 8 * m else (10 * m - y)
        for x in range(6 * m, 6 * m + half):
            if x < 12 * m:
                px[y][x] = linen
    # Round outer corners.
    keep = rounded_mask(size, 3 * m)
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            if not keep[y][x]:
                raw.extend((0, 0, 0, 0))
            else:
                r, g, b = px[y][x]
                raw.extend((r, g, b, 255))
    blob = zlib.compress(bytes(raw), 9)

    def chunk(kind, data):
        out = struct.pack('>I', len(data)) + kind + data
        return out + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)

    png = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', blob)
        + chunk(b'IEND', b'')
    )
    with open(path, 'wb') as fh:
        fh.write(png)
    print('wrote', path, len(png), 'bytes')


if __name__ == '__main__':
    paint(192, 'plugin/web/icon-192.png')
    paint(512, 'plugin/web/icon-512.png')
