#!/usr/bin/env python3
"""
Quita el fondo negro del logo (flood-fill desde esquinas).

- Si la fuente es `autodealers-online-logo.png`, solo se sobrescribe ese archivo
  (no se copia a ad-platform ni a otras apps).
- Para otra imagen maestra, se copia el resultado a las rutas `ad-platform` / icon del monorepo.

Uso: python scripts/apply-brand-logo-transparent.py <ruta-al-png-fuente>
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


def strip_black_background(im: Image.Image, thresh: float = 52) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    # Esquinas + puntos medios de cada lado (por si el logo toca una esquina y corta la región negra)
    seeds = [
        (0, 0),
        (w - 1, 0),
        (0, h - 1),
        (w - 1, h - 1),
        (w // 2, 0),
        (w // 2, h - 1),
        (0, h // 2),
        (w - 1, h // 2),
    ]
    for xy in seeds:
        try:
            r, g, b, _a = im.getpixel(xy)
            if r < 85 and g < 85 and b < 85:
                ImageDraw.floodfill(im, xy, (0, 0, 0, 0), thresh=thresh)
        except (ValueError, IndexError):
            continue
    # Limpieza final: píxeles casi negros sueltos (restos de antialiasing en el borde)
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r < 18 and g < 18 and b < 18:
                px[x, y] = (0, 0, 0, 0)
    return im


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    if len(sys.argv) < 2:
        print("Uso: python scripts/apply-brand-logo-transparent.py <logo.png>", file=sys.stderr)
        sys.exit(1)
    src = Path(sys.argv[1]).expanduser()
    if not src.is_file():
        print(f"No existe: {src}", file=sys.stderr)
        sys.exit(1)

    im = strip_black_background(Image.open(src))
    src = src.resolve()

    brand_dests = [
        repo / "apps/public-web/public/brand/ad-platform-logo.png",
        repo / "apps/public-web/src/app/icon.png",
        repo / "apps/admin/public/brand/ad-platform-logo.png",
        repo / "apps/dealer/public/brand/ad-platform-logo.png",
        repo / "apps/seller/public/brand/ad-platform-logo.png",
        repo / "apps/advertiser/public/brand/ad-platform-logo.png",
        repo / "functions/public-web/public/brand/ad-platform-logo.png",
    ]
    online = repo / "apps/public-web/public/brand/autodealers-online-logo.png"
    if src == online or src.name.lower() == "autodealers-online-logo.png":
        dests = [online]
    else:
        dests = brand_dests
    for d in dests:
        d.parent.mkdir(parents=True, exist_ok=True)
        im.save(d, format="PNG", optimize=True)
        print("OK", d)


if __name__ == "__main__":
    main()
