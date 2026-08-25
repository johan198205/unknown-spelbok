#!/usr/bin/env python3
"""Bygger demo-annonsbanners för Betsson, Unibet och Expekt i tre format.

Annonsytorna är flytande: de spänner hela innehållsbredden och beskärs av
object-cover. Därför ritas varje kreativ på den bredaste ytan den kan hamna i
(så beskärningen alltid blir vågrät, aldrig lodrät) med allt innehåll samlat i
en centrerad säker zon som överlever beskärningen även på den smalaste ytan.

  Format      Canvas      Smalaste yta   Säker zon
  leaderboard 1320×90     984×90         940 px
  mobil       1040×100    343×100        300 px
  rektangel   500×250     343×250        300 px

Bakgrunderna är AI-genererade stadionbilder (nanobanana), text och layout ritas
skarpt med PIL i 3x och skalas ner. Detta är MOCKUPS — inga riktiga
kampanjassets från spelbolagen.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

S = 3  # supersampling
OUT = Path(__file__).parent
BG_DIR = Path("/Users/dash/Downloads/Dash/Claude/mcp_nanobanana/output")
BG = {
    "betsson": BG_DIR / "bnr-betsson-bg-20260825-195840.png",
    "unibet": BG_DIR / "bnr-unibet-bg-20260825-195853.png",
    "expekt": BG_DIR / "bnr-expekt-bg-20260825-195906.png",
}

F = "/System/Library/Fonts/Supplemental/"
BLACK = F + "Arial Black.ttf"
BOLD = F + "Arial Bold.ttf"
REG = F + "Arial.ttf"


def font(path, px):
    return ImageFont.truetype(path, int(px * S))


BRANDS = {
    "betsson": {
        "wordmark": "BETSSON",
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
    sw, sh = src.size
    scale = max(w / sw, h / sh)
    resized = src.resize((round(sw * scale), round(sh * scale)), Image.LANCZOS)
    rw, rh = resized.size
    top = min(max(int(rh * focus - h / 2), 0), rh - h)
    left = (rw - w) // 2
    return resized.crop((left, top, left + w, top + h))


def darken(img: Image.Image, factor: float) -> Image.Image:
    return ImageEnhance.Brightness(ImageEnhance.Color(img).enhance(0.85)).enhance(factor)


def zone_scrim(size, color, zone, alpha=236):
    """Mörkar ner den säkra zonen och tonar ut mot kanterna."""
    w, h = size
    x0, x1 = zone
    fade = int(w * 0.16)
    mask = Image.new("L", (w, 1))
    px = mask.load()
    for x in range(w):
        if x0 <= x <= x1:
            v = alpha
        elif x < x0:
            v = int(alpha * max(0, 1 - (x0 - x) / fade) ** 1.5)
        else:
            v = int(alpha * max(0, 1 - (x - x1) / fade) ** 1.5)
        px[x, 0] = v
    layer = Image.new("RGBA", size, color + (0,))
    layer.putalpha(mask.resize((w, h)))
    return layer


def flat_scrim(size, color, alpha):
    return Image.new("RGBA", size, color + (alpha,))


def bottom_scrim(size, color, alpha=235):
    w, h = size
    mask = Image.new("L", (1, h))
    px = mask.load()
    for y in range(h):
        px[0, y] = int(alpha * (y / max(h - 1, 1)) ** 1.4)
    layer = Image.new("RGBA", size, color + (0,))
    layer.putalpha(mask.resize((w, h)))
    return layer


def tracked(draw, xy, text, fnt, fill, tracking=0):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking * S
    return x


def tracked_width(draw, text, fnt, tracking=0):
    return sum(draw.textlength(c, font=fnt) for c in text) + tracking * S * max(
        len(text) - 1, 0
    )


def pill(draw, box, fill):
    draw.rounded_rectangle(box, radius=(box[3] - box[1]) / 2, fill=fill)


def wordmark(draw, x, y, brand, px, tracking=1.0):
    """Ordbilden är en approximation — inte spelbolagens riktiga logotyp."""
    f = font(BLACK, px)
    end = tracked(draw, (x, y), brand["wordmark"], f, (255, 255, 255), tracking)
    if brand.get("dots"):
        d = 2.9 * S
        gap = 1.7 * S
        total = 6 * d + 5 * gap
        dx = x + (end - x - total) / 2
        dy = y + px * S * 1.32
        for i in range(6):
            cx = dx + i * (d + gap)
            draw.ellipse([cx, dy, cx + d, dy + d], fill=brand["accent"])
    return end


def cta(draw, brand, cx, cy, w, h, px, tracking=1.1):
    pill(draw, (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), brand["accent"])
    f = font(BOLD, px)
    tw = tracked_width(draw, brand["cta"], f, tracking)
    tracked(
        draw,
        (cx - tw / 2, cy - px * S * 0.64),
        brand["cta"],
        f,
        brand["cta_text"],
        tracking,
    )


def leaderboard(key, brand, w=1320, h=90, zone=940):
    """Full bredd × 90 px. Allt innehåll i de mittersta 940 px."""
    img = darken(cover(Image.open(BG[key]).convert("RGB"), w * S, h * S, 0.55), 0.44)
    img = img.convert("RGBA")
    x0 = (w - zone) / 2
    img.alpha_composite(flat_scrim((w * S, h * S), brand["dark"], 120))
    img.alpha_composite(
        zone_scrim((w * S, h * S), brand["dark"], (int(x0 * S), int((x0 + zone) * S)), 226)
    )
    d = ImageDraw.Draw(img)

    left = x0 * S
    end = wordmark(d, left, 25 * S, brand, 21, tracking=1.4)

    div = end + 22 * S
    d.line([(div, 22 * S), (div, 68 * S)], fill=brand["accent"] + (170,), width=2)

    tx = div + 22 * S
    d.text((tx, 21 * S), brand["head"], font=font(BLACK, 19), fill=(255, 255, 255))
    d.text((tx, 46 * S), brand["sub"], font=font(REG, 12), fill=(198, 202, 210))
    d.text((tx, 66 * S), LEGAL, font=font(REG, 9), fill=(148, 153, 163))

    cta(d, brand, (x0 + zone - 79) * S, h * S / 2, 158 * S, 38 * S, 13.5)
    return img.convert("RGB").resize((w, h), Image.LANCZOS)


def mobile(key, brand, w=1040, h=100, zone=300):
    """Full bredd × 100 px under lg. Innehållet i de mittersta 300 px."""
    img = darken(cover(Image.open(BG[key]).convert("RGB"), w * S, h * S, 0.55), 0.42)
    img = img.convert("RGBA")
    x0 = (w - zone) / 2
    img.alpha_composite(flat_scrim((w * S, h * S), brand["dark"], 130))
    img.alpha_composite(
        zone_scrim((w * S, h * S), brand["dark"], (int(x0 * S), int((x0 + zone) * S)), 238)
    )
    d = ImageDraw.Draw(img)

    left = x0 * S
    wordmark(d, left, 14 * S, brand, 15, tracking=1.0)
    d.text((left, 40 * S), brand["head_short"], font=font(BLACK, 15), fill=(255, 255, 255))

    cw, ch = 104 * S, 27 * S
    cta(d, brand, left + cw / 2, 79.5 * S, cw, ch, 11, 0.8)
    d.text(
        (left + cw + 10 * S, 74 * S),
        LEGAL_SHORT,
        font=font(REG, 8.5),
        fill=(150, 155, 165),
    )
    return img.convert("RGB").resize((w, h), Image.LANCZOS)


def rectangle(key, brand, w=500, h=250, zone=300):
    """Sidokolumnen på startsidan: upp till 500×250, innehållet i mitten."""
    img = darken(cover(Image.open(BG[key]).convert("RGB"), w * S, h * S, 0.5), 0.55)
    img = img.convert("RGBA")
    img.alpha_composite(flat_scrim((w * S, h * S), brand["dark"], 110))
    img.alpha_composite(bottom_scrim((w * S, h * S), brand["dark"], 238))
    d = ImageDraw.Draw(img)

    bar = 46 * S
    d.rectangle([0, 0, w * S, bar], fill=brand["dark"] + (250,))
    fw = font(BLACK, 18)
    tw = tracked_width(d, brand["wordmark"], fw, 1.4)
    wordmark(d, (w * S - tw) / 2, 12 * S, brand, 18, tracking=1.4)

    fbig, fsmall = font(BLACK, 30), font(BOLD, 13)
    y = 92 * S
    for i, line in enumerate(brand["rect"][:2]):
        fill = (255, 255, 255) if i else brand["accent"]
        d.text(((w * S - d.textlength(line, font=fbig)) / 2, y), line, font=fbig, fill=fill)
        y += 38 * S

    tail = brand["rect"][2]
    lw = tracked_width(d, tail, fsmall, 0.6)
    tracked(d, ((w * S - lw) / 2, y + 6 * S), tail, fsmall, (206, 210, 218), 0.6)

    cta(d, brand, w * S / 2, 210 * S, zone * S, 40 * S, 14)

    fl = font(REG, 9)
    d.text(
        ((w * S - d.textlength(LEGAL, font=fl)) / 2, 236 * S),
        LEGAL,
        font=fl,
        fill=(150, 155, 165),
    )
    return img.convert("RGB").resize((w, h), Image.LANCZOS)


FORMATS = {"970x90": leaderboard, "320x100": mobile, "300x250": rectangle}

if __name__ == "__main__":
    for key, brand in BRANDS.items():
        for fmt, fn in FORMATS.items():
            img = fn(key, brand)
            path = OUT / f"{key}-{fmt}.jpg"
            img.save(path, quality=86, optimize=True)
            print(path.name, img.size, f"{path.stat().st_size // 1024} kB")
