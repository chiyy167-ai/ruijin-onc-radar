# -*- coding: utf-8 -*-
"""生成 PWA 图标（无需 Pillow，纯 PNG 结构）。"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"


def _chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, rgba_fn) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter none
        for x in range(size):
            raw.extend(rgba_fn(x, y, size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + _chunk(b"IEND", b"")
    path.write_bytes(png)


def color_fn(x: int, y: int, size: int) -> tuple[int, int, int, int]:
    """深蓝底 + 青色雷达环 + 中心点。"""
    cx = cy = size / 2
    dx = x - cx + 0.5
    dy = y - cy + 0.5
    r = (dx * dx + dy * dy) ** 0.5
    max_r = size * 0.46

    # 圆角遮罩
    if r > max_r:
        return (0, 0, 0, 0)

    # 背景
    t = r / max_r
    bg = (
        int(15 + 20 * (1 - t)),
        int(23 + 30 * (1 - t)),
        int(42 + 40 * (1 - t)),
        255,
    )

    # 同心环
    for ring in (0.28, 0.55, 0.82):
        if abs(r / max_r - ring) < 0.035:
            return (56, 189, 248, 230)

    # 扫描扇形（右上）
    import math

    ang = math.atan2(dy, dx)
    if 0.15 < ang < 0.95 and r / max_r < 0.82:
        glow = int(40 * (1 - r / max_r))
        return (
            min(255, bg[0] + glow),
            min(255, bg[1] + 80 + glow),
            min(255, bg[2] + 120 + glow),
            255,
        )

    # 中心点
    if r < size * 0.06:
        return (125, 211, 252, 255)

    # 十字准星
    if (abs(dx) < size * 0.02 and abs(dy) < size * 0.22) or (
        abs(dy) < size * 0.02 and abs(dx) < size * 0.22
    ):
        return (56, 189, 248, 200)

    return bg


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        path = OUT / f"icon-{size}.png"
        write_png(path, size, color_fn)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
