#!/usr/bin/env python3
"""Deterministic contact-sheet compositor.

The previous implementation screenshotted an HTML page holding twelve full-resolution
PNGs in one Chromium fullPage capture. On software WebGL that step hung three times.
Pillow lays out fixed-size cells, draws real TrueType labels, and cannot deadlock.
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

payload = json.load(open(sys.argv[1]))
tiles, out = payload["tiles"], payload["out"]

BG = (5, 7, 12)
FG = (234, 243, 255)
DIM = (127, 149, 173)
ACC = (159, 196, 234)
LINE = (29, 42, 61)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
f_title = ImageFont.truetype(FONT_B, 34)
f_sec = ImageFont.truetype(FONT_B, 21)
f_bold = ImageFont.truetype(FONT_B, 15)
f_meta = ImageFont.truetype(FONT, 13)

PAD, GAP = 24, 16
DESK_W, MOB_W = 520, 190
LABEL_H = 42

desk = [t for t in tiles if t["width"] > t["height"]]
mob = [t for t in tiles if t["width"] <= t["height"]]
cols = max(len(desk), len(mob), 1)


def cell(w, h):
    return w, round(w * h / w)


def desk_cell(t):
    return cell(DESK_W, t["height"] / t["width"] * DESK_W)


def mob_cell(t):
    return cell(MOB_W, t["height"] / t["width"] * MOB_W)


row_w = cols * DESK_W + (cols - 1) * GAP
W = row_w + 2 * PAD

SEC_ADV, SEC_HEAD = 16, 36
SECTIONS = (
    ("Desktop 1920x1080", desk, desk_cell, False),
    ("Mobile 390x844", mob, mob_cell, False),
    ("2x focal crop (desktop)", desk, desk_cell, True),
)


def section_height(items, wf):
    """Height a section actually consumes: its own tallest tile, never a global one.

    The previous canvas height was hand-rolled and disagreed with what section() drew, so
    the third row (the 2x focal crop) was cut off at the bottom edge of the sheet.
    """
    tallest = 0
    for t in items:
        tallest = max(tallest, wf(t)[1])
    return SEC_ADV + SEC_HEAD + tallest + LABEL_H


H = PAD + 44 + 26 + sum(section_height(items, wf) for _, items, wf, _ in SECTIONS) + PAD

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

y = PAD
d.text((PAD, y), "PETROS · M2 contact sheet", font=f_title, fill=ACC)
y += 44
d.text((PAD, y), "renderer=points · captured after __sceneReady · every tile labelled scene · viewport · renderer",
       font=f_meta, fill=DIM)
y += 26


def section(title, items, wf, crop=False):
    global y
    y += SEC_ADV
    d.text((PAD, y), title, font=f_sec, fill=ACC)
    d.line([(PAD, y + 27), (W - PAD, y + 27)], fill=LINE, width=1)
    y += SEC_HEAD
    x = PAD
    tallest = 0
    for t in items:
        w, h = wf(t)
        tallest = max(tallest, h)
        src = Image.open(t["file"]).convert("RGB")
        if crop:
            f = t["focal"]
            sw, sh = src.size
            box = (int(f["xPct"] * sw), int(f["yPct"] * sh),
                   int((f["xPct"] + f["wPct"]) * sw), int((f["yPct"] + f["hPct"]) * sh))
            src = src.crop(box)
        src = src.resize((w, h), Image.LANCZOS)
        img.paste(src, (x, y))
        d.rectangle([x, y, x + w - 1, y + h - 1], outline=LINE)
        hero = f" · hero {t['hero']['assetId']} {t['hero']['h']}%H" if t["hero"] else ""
        label = f"{t['scene']} · {t['viewport']} · {t['renderer']}"
        meta = f"luma {t['meanLuma']} · lit {t['litPct']}%{hero}"
        d.text((x, y + h + 6), label, font=f_bold, fill=FG)
        d.text((x, y + h + 24), meta, font=f_meta, fill=DIM)
        x += w + GAP
    # Advance by THIS section's tallest tile. It used to use max(desk, mobile), which added
    # 119px of slack after the desktop row and pushed the last row past the canvas edge.
    y += tallest + LABEL_H


for title, items, wf, crop in SECTIONS:
    section(title, items, wf, crop=crop)

img.save(out, optimize=True)
print(f"composed {len(tiles)} tiles -> {out} {W}x{H}")
