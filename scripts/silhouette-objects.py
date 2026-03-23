"""
Frontier — Silhouette Map Objects Generator

Converts the 26 map object PNGs to silhouette style matching the character sprites.
Same fill/rim approach as generate-silhouettes.py.

Usage: py -3.13 scripts/silhouette-objects.py
"""
import sys
import shutil
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("pip install Pillow first")
    sys.exit(1)

OBJECTS_DIR = Path(__file__).parent.parent / "public" / "assets" / "objects"

FILL_COLOR = (26, 20, 16, 255)
RIM_COLOR  = (58, 42, 32, 255)
RIM_BRIGHT = (90, 70, 50, 255)


def make_silhouette(img):
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()

    alpha = [[pixels[x, y][3] > 30 for x in range(w)] for y in range(h)]

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
    if not OBJECTS_DIR.exists():
        print(f"Objects dir not found: {OBJECTS_DIR}")
        sys.exit(1)

    pngs = sorted(OBJECTS_DIR.glob("*.png"))
    # Skip backups
    pngs = [p for p in pngs if "_backup" not in p.name and "_color_" not in p.name]

    processed = 0
    for src in pngs:
        backup = src.parent / f"{src.stem}_color_backup{src.suffix}"
        if not backup.exists():
            shutil.copy2(src, backup)

        img = Image.open(src)
        print(f"  {src.name} ({img.size[0]}x{img.size[1]})...", end="", flush=True)
        silhouette = make_silhouette(img)
        silhouette.save(str(src), "PNG")
        print(" done")
        processed += 1

    print(f"\n{processed} objects converted to silhouettes")


if __name__ == "__main__":
    main()
