#!/usr/bin/env python3
"""Bygger demo-annonsbanners för Betsson, Unibet och Expekt i tre format.

Bakgrunderna är AI-genererade stadionbilder (nanobanana), text och layout
ritas skarpt med PIL i 2x och skalas ner. Detta är MOCKUPS – inga riktiga
kampanjassets från spelbolagen.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

S = 3  # supersampling
OUT = Path(__file__).parent / "banners"
OUT.mkdir(exist_ok=True)

BG_DIR = Path("/Users/dash/Downloads/Dash/Claude/mcp_nanobanana/output")
BG = {
    "betsson": BG_DIR / "bnr-betsson-bg-20260825-195840.png",
    "unibet": BG_DIR / "bnr-unibet-bg-20260825-195853.png",
    "expekt": BG_DIR / "bnr-expekt-bg-20260825-195906.png",
}

F = "/System/Library/Fonts/Supplemental/"
BLACK = F + "Arial Black.ttf"
BOLD = F + "Arial Bold.ttf"
NARROW = F + "Arial Narrow Bold.ttf"
REG = F + "Arial.ttf"


def font(path, px):
    return ImageFont.truetype(path, int(px * S))


BRANDS = {
    "betsson": {
        "wordmark": "BETSSON",
        "wordfont": BLACK,
        "dark": (10, 12, 17),
        "accent": (255, 106, 0),
        "cta_text": (12, 12, 12),
        "head": "100 % BONUS UPP TILL 1 000 KR",
        "head_short": "1 000 KR I BONUS",
        "sub": "Nya kunder · Omsättningskrav 6x",
        "cta": "SPELA NU",
        "rect": ["100 %", "BONUS", "UPP TILL 1 000 KR"],
    },
    "unibet": {
        "wordmark": "UNIBET",
        "wordfont": BLACK,
        "dark": (11, 43, 25),
        "accent": (255, 225, 77),
        "cta_text": (12, 12, 12),
        "head": "500 KR I ODDSBOOST VARJE VECKA",
        "head_short": "500 KR ODDSBOOST",
        "sub": "Av spelare, för spelare",
        "cta": "SKAPA KONTO",
        "rect": ["500 KR", "ODDSBOOST", "VARJE VECKA"],
        "dots": True,
    },
    "expekt": {
        "wordmark": "EXPEKT",
        "wordfont": BLACK,
        "dark": (18, 14, 11),
        "accent": (200, 117, 47),
        "cta_text": (255, 255, 255),
        "head": "FÖRSTÄRK DIN UPPLEVELSE",
        "head_short": "NYA EXPEKT ÄR HÄR",
        "sub": "Odds, casino och live casino",
        "cta": "SKAPA KONTO",
        "rect": ["NYA", "EXPEKT", "FÖRSTÄRK DIN UPPLEVELSE"],
    },
}

LEGAL = "18+ · Spelpaus.se · Stödlinjen 020-81 91 00"
LEGAL_SHORT = "18+ · Spelpaus.se"


def cover(src: Image.Image, w: int, h: int, focus=0.5) -> Image.Image:
    """Skalar bilden så den täcker w×h och beskär runt en vertikal fokuspunkt."""
    sw, sh = src.size
    scale = max(w / sw, h / sh)
    resized = src.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    rw, rh = resized.size
    top = min(max(int(rh * focus - h / 2), 0), rh - h)
    left = (rw - w) // 2
    return resized.crop((left, top, left + w, top + h))


def darken(img: Image.Image, factor: float) -> Image.Image:
    return ImageEnhance.Brightness(ImageEnhance.Color(img).enhance(0.85)).enhance(factor)


def side_scrim(size, color, to_x, alpha=238):
    """Vågrät gradient från vänsterkanten – ger lugn yta åt texten."""
    w, h = size
    layer = Image.new("RGBA", size, color + (0,))
    mask = Image.new("L", (w, 1))
    px = mask.load()
    for x in range(w):
        t = min(x / max(to_x, 1), 1.0)
        px[x, 0] = int(alpha * (1 - t) ** 1.6)
    layer.putalpha(mask.resize((w, h)))
    return layer


def bottom_scrim(size, color, alpha=235):
    w, h = size
    layer = Image.new("RGBA", size, color + (0,))
    mask = Image.new("L", (1, h))
    px = mask.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        px[0, y] = int(alpha * t**1.4)
    layer.putalpha(mask.resize((w, h)))
    return layer


def tracked(draw, xy, text, fnt, fill, tracking=0):
    """Ritar text med extra teckenmellanrum (tracking i px före skalning)."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking * S
    return x


def tracked_width(draw, text, fnt, tracking=0):
    return sum(draw.textlength(c, font=fnt) for c in text) + tracking * S * max(
        len(text) - 1, 0
    )


def pill(draw, box, fill, radius=None):
    x0, y0, x1, y1 = box
    r = radius if radius is not None else (y1 - y0) / 2
    draw.rounded_rectangle(box, radius=r, fill=fill)


def wordmark(draw, x, y, brand, px, tracking=1.0):
    """Ritar spelbolagets ordbild – en approximation, inte deras riktiga logotyp."""
    f = font(brand["wordfont"], px)
    end = tracked(draw, (x, y), brand["wordmark"], f, (255, 255, 255), tracking)
    if brand.get("dots"):
        # Unibet har sex prickar under ordbilden.
        d = 2.9 * S
        gap = 1.7 * S
        total = 6 * d + 5 * gap
        dx = x + (end - x - total) / 2
        dy = y + px * S * 1.32
        for i in range(6):
            cx = dx + i * (d + gap)
            draw.ellipse([cx, dy, cx + d, dy + d], fill=brand["accent"])
    return end


def leaderboard(key, brand, w=970, h=90):
    """970×90 – desktop-toppbanner."""
    bg = cover(Image.open(BG[key]).convert("RGB"), w * S, h * S, focus=0.55)
    img = darken(bg, 0.44).convert("RGBA")
    img.alpha_composite(side_scrim((w * S, h * S), brand["dark"], int(w * S * 0.74)))
    d = ImageDraw.Draw(img)

    pad = 26 * S
    end = wordmark(d, pad, 25 * S, brand, 21, tracking=1.4)

    div = end + 20 * S
    d.line([(div, 22 * S), (div, 68 * S)], fill=brand["accent"] + (170,), width=max(S // 2, 1))

    tx = div + 20 * S
    d.text((tx, 21 * S), brand["head"], font=font(BLACK, 19), fill=(255, 255, 255))
    d.text((tx, 46 * S), brand["sub"], font=font(REG, 12), fill=(196, 200, 208))
    d.text((tx, 66 * S), LEGAL, font=font(REG, 9), fill=(146, 151, 161))

    # CTA
    cw, ch = 158 * S, 38 * S
    cx1 = w * S - pad
    cy0 = (h * S - ch) / 2
    pill(d, (cx1 - cw, cy0, cx1, cy0 + ch), brand["accent"])
    fc = font(BOLD, 13.5)
    tw = tracked_width(d, brand["cta"], fc, 1.1)
    tracked(
        d,
        (cx1 - cw + (cw - tw) / 2, cy0 + ch / 2 - 8.6 * S),
        brand["cta"],
        fc,
        brand["cta_text"],
        1.1,
    )
    return img.convert("RGB").resize((w, h), Image.LANCZOS)


def mobile(key, brand, w=320, h=100):
    """320×100 – mobil toppbanner."""
    bg = cover(Image.open(BG[key]).convert("RGB"), w * S, h * S, focus=0.55)
    img = darken(bg, 0.45).convert("RGBA")
    img.alpha_composite(side_scrim((w * S, h * S), brand["dark"], int(w * S * 0.9), 244))
    d = ImageDraw.Draw(img)

    pad = 14 * S
    wordmark(d, pad, 14 * S, brand, 15, tracking=1.0)

    d.text((pad, 40 * S), brand["head_short"], font=font(BLACK, 15), fill=(255, 255, 255))

    cw, ch = 104 * S, 27 * S
    cx0, cy0 = pad, 66 * S
    pill(d, (cx0, cy0, cx0 + cw, cy0 + ch), brand["accent"])
    fc = font(BOLD, 11)
    tw = tracked_width(d, brand["cta"], fc, 0.8)
    tracked(
        d,
        (cx0 + (cw - tw) / 2, cy0 + ch / 2 - 7 * S),
        brand["cta"],
        fc,
        brand["cta_text"],
        0.8,
    )

    fl = font(REG, 8.5)
    d.text(
        (cx0 + cw + 10 * S, cy0 + ch / 2 - 5.5 * S),
        LEGAL_SHORT,
        font=fl,
        fill=(150, 155, 165),
    )
    return img.convert("RGB").resize((w, h), Image.LANCZOS)


def rectangle(key, brand, w=300, h=250):
    """300×250 – rektangel i sidokolumnen."""
    bg = cover(Image.open(BG[key]).convert("RGB"), w * S, h * S, focus=0.5)
    img = darken(bg, 0.55).convert("RGBA")
    img.alpha_composite(bottom_scrim((w * S, h * S), brand["dark"], 240))
    d = ImageDraw.Draw(img)

    # Varumärkesplatta i toppen
    bar = 46 * S
    d.rectangle([0, 0, w * S, bar], fill=brand["dark"] + (250,))
    fw = font(brand["wordfont"], 18)
    tw = tracked_width(d, brand["wordmark"], fw, 1.4)
    wordmark(d, (w * S - tw) / 2, 12 * S, brand, 18, tracking=1.4)

    lines = brand["rect"]
    fbig = font(BLACK, 30)
    fsmall = font(BOLD, 13)

    y = 92 * S
    for i, line in enumerate(lines[:2]):
        fill = (255, 255, 255) if i else brand["accent"]
        lw = d.textlength(line, font=fbig)
        d.text(((w * S - lw) / 2, y), line, font=fbig, fill=fill)
        y += 38 * S

    tail = lines[2]
    lw = tracked_width(d, tail, fsmall, 0.6)
    tracked(d, ((w * S - lw) / 2, y + 6 * S), tail, fsmall, (206, 210, 218), 0.6)

    cw, ch = (w - 40) * S, 40 * S
    cx0, cy0 = 20 * S, 190 * S
    pill(d, (cx0, cy0, cx0 + cw, cy0 + ch), brand["accent"])
    fc = font(BOLD, 14)
    tw = tracked_width(d, brand["cta"], fc, 1.1)
    tracked(
        d,
        (cx0 + (cw - tw) / 2, cy0 + ch / 2 - 9 * S),
        brand["cta"],
        fc,
        brand["cta_text"],
        1.1,
    )

    fl = font(REG, 9)
    lw = d.textlength(LEGAL, font=fl)
    d.text(((w * S - lw) / 2, 236 * S), LEGAL, font=fl, fill=(150, 155, 165))
    return img.convert("RGB").resize((w, h), Image.LANCZOS)


FORMATS = {
    "970x90": leaderboard,
    "320x100": mobile,
    "300x250": rectangle,
}

if __name__ == "__main__":
    for key, brand in BRANDS.items():
        for fmt, fn in FORMATS.items():
            img = fn(key, brand)
            path = OUT / f"{key}-{fmt}.jpg"
            img.save(path, quality=88, optimize=True)
            print(path, img.size, f"{path.stat().st_size // 1024} kB")
