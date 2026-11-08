"""Draws the Chrome Web Store promo tiles:
  store/promo-tile-440x280.png      (small promo tile)
  store/marquee-1400x560.png        (marquee promo tile)
Requires Pillow (python -m pip install pillow). Uses Segoe UI (Windows fonts).
Run from the repository root:  python tools/make-promo.py
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module
draw_icon = import_module("make-icons").draw_icon  # same icon artwork

ROOT = Path(__file__).resolve().parent.parent
STORE = ROOT / "store"
FONTS = Path("C:/Windows/Fonts")

BLUE_TOP = (41, 146, 230)
BLUE_BOTTOM = (16, 82, 146)
WHITE = (255, 255, 255)
YELLOW = (255, 214, 0)
INK = (27, 31, 35)
GREY = (95, 107, 118)
CHIP = (35, 134, 217)

SS = 2  # supersampling factor


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size * SS)


def gradient(w, h):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(round(a + (b - a) * t) for a, b in zip(BLUE_TOP, BLUE_BOTTOM))
        d.line([(0, y), (w, y)], fill=c)
    return img


def mountains(d, w, h, base_y, scale):
    """Layered mountain range along the bottom."""
    s = scale
    far = [(0, base_y), (0.08 * w, base_y - 70 * s), (0.18 * w, base_y - 30 * s), (0.32 * w, base_y - 95 * s),
           (0.46 * w, base_y - 40 * s), (0.60 * w, base_y - 110 * s), (0.74 * w, base_y - 45 * s),
           (0.88 * w, base_y - 90 * s), (w, base_y - 35 * s), (w, h), (0, h)]
    d.polygon(far, fill=(64, 156, 230))
    near = [(0, base_y + 20 * s), (0.14 * w, base_y - 40 * s), (0.27 * w, base_y + 10 * s), (0.42 * w, base_y - 60 * s),
            (0.55 * w, base_y + 5 * s), (0.70 * w, base_y - 75 * s), (0.84 * w, base_y), (w, base_y - 50 * s),
            (w, h), (0, h)]
    d.polygon(near, fill=(11, 58, 106))


def card(d, x, y, w, rows, s):
    """A mock of the 'Climb names' panel."""
    head_h = 44 * s
    row_h = 80 * s
    h = head_h + row_h * len(rows) + 10 * s
    d.rounded_rectangle([x + 6 * s, y + 10 * s, x + w + 6 * s, y + h + 10 * s], radius=14 * s, fill=(10, 50, 95))
    d.rounded_rectangle([x, y, x + w, y + h], radius=14 * s, fill=WHITE)
    d.rounded_rectangle([x, y, x + w, y + head_h], radius=14 * s, fill=CHIP)
    d.rectangle([x, y + head_h - 14 * s, x + w, y + head_h], fill=CHIP)
    d.text((x + 18 * s, y + head_h / 2), f"\u25B2 Climb names ({len(rows)})", font=font("segoeuib.ttf", 19), fill=WHITE, anchor="lm")
    for i, (name, detail, stats) in enumerate(rows):
        ry = y + head_h + 8 * s + i * row_h
        if i:
            d.line([x + 14 * s, ry - 4 * s, x + w - 14 * s, ry - 4 * s], fill=(234, 238, 242), width=2 * s)
        d.rounded_rectangle([x + 16 * s, ry + 8 * s, x + 44 * s, ry + 36 * s], radius=5 * s, fill=CHIP)
        d.text((x + 30 * s, ry + 22 * s), str(i + 1), font=font("segoeuib.ttf", 16), fill=WHITE, anchor="mm")
        d.text((x + 58 * s, ry + 4 * s), name, font=font("segoeuib.ttf", 21), fill=INK)
        d.text((x + 58 * s, ry + 32 * s), detail, font=font("segoeui.ttf", 15), fill=GREY)
        d.text((x + 58 * s, ry + 51 * s), stats, font=font("segoeui.ttf", 15), fill=GREY)
    return h


def paste_icon(img, size, x, y):
    ic = draw_icon(size * SS)
    img.paste(ic, (x, y), ic)


def small_tile():
    W, H = 440 * SS, 280 * SS
    img = gradient(W, H)
    d = ImageDraw.Draw(img)
    mountains(d, W, H, 238 * SS, SS * 0.55)
    paste_icon(img, 84, 30 * SS, 34 * SS)
    d.text((132 * SS, 52 * SS), "ClimbNamer", font=font("segoeuib.ttf", 40), fill=WHITE)
    d.text((134 * SS, 102 * SS), "for Hammerhead Dashboard", font=font("seguisb.ttf", 17), fill=(222, 238, 252))
    d.text((32 * SS, 152 * SS), "Kemmelberg, Koppenberg, Tourmalet…", font=font("seguisb.ttf", 19), fill=YELLOW)
    d.text((32 * SS, 180 * SS), "Know which climbs you ride.", font=font("segoeui.ttf", 19), fill=WHITE)
    return img.resize((440, 280), Image.LANCZOS)


def marquee():
    W, H = 1400 * SS, 560 * SS
    img = gradient(W, H)
    d = ImageDraw.Draw(img)
    mountains(d, W, H, 500 * SS, SS * 1.0)
    paste_icon(img, 120, 90 * SS, 96 * SS)
    d.text((236 * SS, 104 * SS), "ClimbNamer", font=font("segoeuib.ttf", 76), fill=WHITE)
    d.text((240 * SS, 196 * SS), "for Hammerhead Dashboard", font=font("seguisb.ttf", 30), fill=(222, 238, 252))
    d.text((94 * SS, 282 * SS), "Know which climbs you ride.", font=font("segoeuib.ttf", 40), fill=WHITE)
    d.text((94 * SS, 342 * SS), "Names for every climb on your routes and rides,", font=font("segoeui.ttf", 26), fill=(222, 238, 252))
    d.text((94 * SS, 378 * SS), "from OpenStreetMap.", font=font("segoeui.ttf", 26), fill=(222, 238, 252))
    card(d, 900 * SS, 76 * SS, 400 * SS, [
        ("Kemmelberg", "via Lettingstraat / Kemmelbergweg", "2.8 km · 3.8% · +124 m"),
        ("Koppenberg", "Melden", "0.6 km · 11.6% · +64 m"),
        ("Paterberg", "Kluisbergen", "0.4 km · 12.5% · +48 m"),
        ("Oude Kwaremont", "Kluisbergen", "2.2 km · 4.2% · +93 m"),
    ], SS)
    return img.resize((1400, 560), Image.LANCZOS)


def main():
    STORE.mkdir(exist_ok=True)
    small_tile().save(STORE / "promo-tile-440x280.png", optimize=True)
    marquee().save(STORE / "marquee-1400x560.png", optimize=True)
    print("wrote", STORE / "promo-tile-440x280.png")
    print("wrote", STORE / "marquee-1400x560.png")


if __name__ == "__main__":
    main()
