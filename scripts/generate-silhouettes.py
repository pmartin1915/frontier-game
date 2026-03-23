"""
Frontier — Silhouette Sprite Generator

Converts existing color sprite sheets into atmospheric silhouettes:
1. All non-transparent pixels -> dark warm brown fill (#1a1410)
2. 1px bright edge along the alpha boundary -> rim highlight
3. Backs up originals as *_color_backup.png

Usage: py -3.13 scripts/generate-silhouettes.py
"""
import os
import sys
import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("pip install Pillow first")
    sys.exit(1)

SPRITES_DIR = Path(__file__).parent.parent / "public" / "assets" / "sprites"

# Silhouette colors (RGBA)
FILL_COLOR = (26, 20, 16, 255)       # very dark warm brown
RIM_COLOR  = (58, 42, 32, 255)       # slightly brighter rim
RIM_BRIGHT = (90, 70, 50, 255)       # brightest edge highlight

ENTITIES = [
    "player_cowboy",
    "horse_riding_base", "horse_riding_tack",
    "horse_draft_base", "horse_draft_harness",
    "wagon_prairie_schooner",
    "cat_mouser",
    "companion_elias_base", "companion_elias_kepi",
    "companion_luisa_base", "companion_luisa_serape", "companion_luisa_poncho",
    "companion_tom_base", "companion_tom_hat_bandana",
]


def make_silhouette(img):
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # Build alpha mask
    alpha = [[pixels[x, y][3] > 30 for x in range(w)] for y in range(h)]

    # Detect outer edge (opaque pixel with transparent neighbor)
    edge = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if not alpha[y][x]:
                continue
            for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                nx, ny = x + dx, y + dy
                if nx < 0 or nx >= w or ny < 0 or ny >= h or not alpha[ny][nx]:
                    edge[y][x] = True
                    break

    # Detect inner edge (opaque, not outer edge, but neighbor is outer edge)
    inner = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if not alpha[y][x] or edge[y][x]:
                continue
            for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and edge[ny][nx]:
                    inner[y][x] = True
                    break

    # Build result
    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rpix = result.load()

    for y in range(h):
        for x in range(w):
            if not alpha[y][x]:
                continue
            if edge[y][x]:
                rpix[x, y] = RIM_BRIGHT
            elif inner[y][x]:
                rpix[x, y] = RIM_COLOR
            else:
                rpix[x, y] = FILL_COLOR

    return result


def main():
    processed = 0
    for name in ENTITIES:
        src = SPRITES_DIR / f"{name}.png"
        if not src.exists():
            print(f"  SKIP {name}.png (not found)")
            continue

        backup = SPRITES_DIR / f"{name}_color_backup.png"
        if not backup.exists():
            shutil.copy2(src, backup)
            print(f"  Backed up -> {name}_color_backup.png")

        img = Image.open(src)
        print(f"  Processing {name}.png ({img.size[0]}x{img.size[1]})...", end="", flush=True)
        silhouette = make_silhouette(img)
        silhouette.save(str(src), "PNG")
        print(" done")
        processed += 1

    print(f"\n{processed}/{len(ENTITIES)} sprites converted to silhouettes")


if __name__ == "__main__":
    main()
