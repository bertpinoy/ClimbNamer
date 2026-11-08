"""Draws the ClimbNamer icons (extension/icons/icon-{16,32,48,128}.png) and a 440x280
store tile. Requires Pillow:  python -m pip install pillow
Run from the repository root:  python tools/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "extension" / "icons"
STORE = ROOT / "store"

BLUE = (35, 134, 217, 255)       # panel blue
BLUE_DARK = (20, 92, 160, 255)
WHITE = (255, 255, 255, 255)
SNOW_SHADE = (214, 230, 245, 255)
YELLOW = (255, 214, 0, 255)
POLE = (40, 48, 56, 255)

S = 1024  # draw large, scale down for smooth edges


def draw_icon(size: int) -> Image.Image:
    simple = size <= 16
    # Rounded square background, darker band at the bottom (the "ground").
    r = int(S * 0.22)
    img = Image.new("RGBA", (S, S), BLUE)
    ImageDraw.Draw(img).rectangle([0, int(S * 0.80), S, S], fill=BLUE_DARK)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=255)
    img.putalpha(mask)
    d = ImageDraw.Draw(img)

    # Mountains: a small one behind, the main one in front.
    base = int(S * 0.80)
    d.polygon([(int(S * 0.04), base), (int(S * 0.30), int(S * 0.48)), (int(S * 0.56), base)], fill=SNOW_SHADE)
    peak = (int(S * 0.58), int(S * 0.30 if not simple else 0.24))
    d.polygon([(int(S * 0.18), base), peak, (int(S * 0.96), base)], fill=WHITE)
    # Shaded right flank for depth.
    d.polygon([peak, (int(S * 0.96), base), (int(S * 0.70), base)], fill=SNOW_SHADE)

    if not simple:
        # Flag on the summit: the "name tag" of the climb.
        px, py = peak
        top = int(S * 0.08)
        w = int(S * 0.035)
        d.rectangle([px - w // 2, top, px + w // 2, py + int(S * 0.02)], fill=POLE)
        d.polygon([(px + w // 2, top), (px + int(S * 0.30), top + int(S * 0.08)), (px + w // 2, top + int(S * 0.16))], fill=YELLOW)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48):
        draw_icon(size).save(OUT / f"icon-{size}.png")
        print("wrote", OUT / f"icon-{size}.png")
    # Chrome Web Store guideline: 128x128 with 96x96 artwork and 16 px transparent padding.
    big = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    art = draw_icon(96)
    big.paste(art, (16, 16), art)
    big.save(OUT / "icon-128.png")
    print("wrote", OUT / "icon-128.png")

    # Small promo tile for the Chrome Web Store (440x280).
    STORE.mkdir(exist_ok=True)
    tile = Image.new("RGBA", (440, 280), (246, 249, 252, 255))
    icon = draw_icon(160)
    tile.paste(icon, (140, 60), icon)
    tile.convert("RGB").save(STORE / "promo-tile-440x280.png")
    print("wrote", STORE / "promo-tile-440x280.png")


if __name__ == "__main__":
    main()
