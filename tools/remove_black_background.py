"""
Elimina fondo oscuro conectado a los bordes (típico PNG con negro detrás del logo).
Uso: python tools/remove_black_background.py <entrada.png> <salida.png> [umbral_rgb]
"""
from __future__ import annotations

import sys
from collections import deque

from PIL import Image


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    src = sys.argv[1]
    dst = sys.argv[2]
    thresh = int(sys.argv[3]) if len(sys.argv) > 3 else 42

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        if a < 12:
            return True
        return r <= thresh and g <= thresh and b <= thresh

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a):
            visited[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if visited[ny][nx]:
                continue
            r2, g2, b2, a2 = px[nx, ny]
            if is_bg(r2, g2, b2, a2):
                visited[ny][nx] = True
                q.append((nx, ny))

    img.save(dst, format="PNG", optimize=True)
    print(f"OK: {dst} ({w}x{h}, umbral={thresh})")


if __name__ == "__main__":
    main()
