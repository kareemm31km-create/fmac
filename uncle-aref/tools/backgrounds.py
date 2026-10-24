"""Hand-built 2D backgrounds in the sheets' flat style (outlined, warm palette)."""
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from common import BG, FONTS, load_cut, upscale, os

INK = (45, 32, 30)
R = random.Random(7)
SIGN_FONT = os.path.join(FONTS, "Cairo-800.ttf")


def tile(src, w, h):
    """Mirror-tile a texture so seams disappear."""
    out = Image.new("RGB", (w, h))
    tw, th = src.size
    for j, yy in enumerate(range(0, h, th)):
        for i, xx in enumerate(range(0, w, tw)):
            t = src
            if i % 2: t = t.transpose(Image.FLIP_LEFT_RIGHT)
            if j % 2: t = t.transpose(Image.FLIP_TOP_BOTTOM)
            out.paste(t, (xx, yy))
    return out


def ob(d, box, fill, w=4, r=0):
    if r:
        d.rounded_rectangle(box, r, fill=fill, outline=INK, width=w)
    else:
        d.rectangle(box, fill=fill, outline=INK, width=w)


def building(d, x0, x1, top, ground, wall, shutter):
    ob(d, (x0, top, x1, ground), wall, 5)
    # cornice
    ob(d, (x0 - 8, top - 14, x1 + 8, top + 6), tuple(max(0, c - 25) for c in wall), 4)
    floor_h = 150
    y = top + 40
    while y + 110 < ground - 170:
        n = max(2, (x1 - x0) // 120)
        gap = (x1 - x0) / n
        for i in range(n):
            cx = x0 + gap * (i + 0.5)
            wx0, wx1 = cx - 34, cx + 34
            ob(d, (wx0, y, wx1, y + 92), (70, 78, 92), 3)
            # wooden shutters, some half-open
            if R.random() < 0.6:
                ob(d, (wx0, y, cx, y + 92), shutter, 3)
                ob(d, (cx, y, wx1, y + 92), shutter, 3)
                for k in range(6):
                    yy = y + 10 + k * 14
                    d.line((wx0 + 4, yy, wx1 - 4, yy), fill=tuple(c - 30 for c in shutter), width=2)
            elif R.random() < 0.5:
                ob(d, (wx0, y, cx - 6, y + 92), shutter, 3)
            # balcony every other window
            if R.random() < 0.45:
                ob(d, (wx0 - 14, y + 92, wx1 + 14, y + 104), tuple(c - 30 for c in wall), 3)
                for bx in range(int(wx0 - 10), int(wx1 + 12), 12):
                    d.line((bx, y + 70, bx, y + 92), fill=INK, width=2)
                d.line((wx0 - 14, y + 70, wx1 + 14, y + 70), fill=INK, width=3)
                if R.random() < 0.5:  # laundry
                    d.line((wx0 - 14, y + 60, wx1 + 14, y + 64), fill=INK, width=1)
                    for k, col in enumerate([(200, 70, 60), (90, 120, 170), (235, 225, 200)]):
                        lx = wx0 - 6 + k * 24
                        ob(d, (lx, y + 62, lx + 18, y + 84), col, 2)
            if R.random() < 0.18:  # window AC unit
                ob(d, (wx1 - 30, y + 64, wx1 + 6, y + 90), (205, 205, 198), 3)
        y += floor_h
    # satellite dish on the roof (late 90s)
    if R.random() < 0.8:
        sx = R.randint(x0 + 30, x1 - 60)
        d.ellipse((sx, top - 70, sx + 56, top - 24), fill=(225, 225, 220), outline=INK, width=3)
        d.line((sx + 28, top - 30, sx + 28, top - 12), fill=INK, width=4)


def street(w=1600, h=1920, ground=1500):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):  # warm late-afternoon sky
        t = y / h
        d.line((0, y, w, y), fill=(int(246 - 30 * t), int(214 - 10 * t), int(170 + 20 * t)))
    d.ellipse((1150, 180, 1290, 320), fill=(255, 236, 190))
    walls = [(222, 196, 150), (205, 160, 120), (230, 210, 170), (196, 170, 140), (214, 150, 128)]
    shutters = [(96, 120, 84), (120, 86, 60), (80, 104, 110)]
    x = -40
    while x < w:
        bw = R.randint(260, 380)
        top = R.randint(260, 620)
        building(d, x, x + bw, top, ground, R.choice(walls), R.choice(shutters))
        # ground-floor shop
        ob(d, (x + 20, ground - 170, x + bw - 20, ground - 10), (110, 84, 64), 4)
        ob(d, (x + 30, ground - 150, x + bw - 30, ground - 30), (60, 64, 70), 3)
        for k in range(int(x + 40), int(x + bw - 40), 14):  # rolling shutter
            d.line((k, ground - 148, k, ground - 32), fill=(80, 84, 90), width=2)
        x += bw + R.randint(6, 30)
    # shop signs in Arabic (late-90s hand-painted feel)
    f = ImageFont.truetype(SIGN_FONT, 46)
    for sx, txt, col in [(80, "بقالة الأمل", (190, 60, 50)), (560, "مكوجي", (40, 90, 140)), (1060, "عصير", (200, 120, 30))]:
        ob(d, (sx, ground - 240, sx + 300, ground - 175), (245, 236, 210), 4, r=8)
        d.text((sx + 150, ground - 208), txt, font=f, fill=col, anchor="mm", direction="rtl", language="ar")
    # sidewalk + black/white kerb + asphalt
    ob(d, (-10, ground, w + 10, ground + 60), (200, 190, 175), 4)
    for k in range(0, w, 80):
        d.rectangle((k, ground + 60, k + 40, ground + 90), fill=(30, 30, 30))
        d.rectangle((k + 40, ground + 60, k + 80, ground + 90), fill=(240, 240, 235))
    d.line((0, ground + 90, w, ground + 90), fill=INK, width=4)
    d.rectangle((0, ground + 92, w, h), fill=(92, 90, 92))
    # street lamp + a tree
    for lx in (420, 1330):
        d.rectangle((lx, 700, lx + 14, ground), fill=(70, 80, 70), outline=INK, width=3)
        d.line((lx + 7, 700, lx + 90, 680), fill=INK, width=8)
        ob(d, (lx + 70, 676, lx + 120, 700), (240, 230, 160), 3, r=6)
    d.rectangle((960, 1150, 990, ground), fill=(110, 80, 55), outline=INK, width=3)
    for cx, cy, rr in [(975, 1080, 120), (900, 1130, 80), (1050, 1130, 85)]:
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(96, 140, 80), outline=INK, width=4)
    return img


def interior_pov(street_img):
    """Behind Aref as seen from the front passenger seat: driver door, window and headrest."""
    w, h = 1080, 1920
    img = Image.new("RGB", (w, h), (214, 204, 186))
    d = ImageDraw.Draw(img)
    # roof liner
    d.rectangle((0, 0, w, 260), fill=(206, 196, 176))
    d.line((0, 260, w, 260), fill=INK, width=5)
    # driver window: blurred street (shallow depth of field)
    win = (40, 330, 1040, 1080)
    st = street_img.crop((200, 500, 1400, 1400)).resize((win[2] - win[0], win[3] - win[1]))
    st = st.filter(ImageFilter.GaussianBlur(9))
    mask = Image.new("L", st.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, st.width - 1, st.height - 1), 70, fill=255)
    img.paste(st, win[:2], mask)
    d.rounded_rectangle(win, 70, outline=(30, 30, 32), width=26)
    d.rounded_rectangle(win, 70, outline=INK, width=4)
    # B-pillar on the right edge
    d.polygon([(960, 260), (1080, 260), (1080, 1300), (1000, 1300)], fill=(40, 40, 44), outline=INK)
    # door panel (dark) with nabiti insert
    d.rectangle((0, 1080, w, h), fill=(38, 36, 38))
    d.line((0, 1080, w, 1080), fill=INK, width=6)
    fab = upscale(load_cut("fabric_tile").convert("RGB"), 2.4)
    ins = tile(fab, w, 360)
    m = Image.new("L", (w, 360), 0)
    ImageDraw.Draw(m).rounded_rectangle((-40, 0, w - 60, 359), 40, fill=255)
    img.paste(ins, (0, 1230), m)
    d.rounded_rectangle((-40, 1230, w - 60, 1590), 40, outline=INK, width=5)
    # window crank handle
    d.ellipse((760, 1150, 800, 1190), fill=(60, 60, 64), outline=INK, width=3)
    d.line((780, 1170, 860, 1210), fill=(60, 60, 64), width=12)
    # seat back behind him (right side), nabiti
    seat = tile(fab, 560, 1000)
    m = Image.new("L", seat.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 559, 999), 120, fill=255)
    seat = seat.point(lambda v: int(v * 0.82))
    img.paste(seat, (300, 880), m)
    d.rounded_rectangle((300, 880, 859, 1879), 120, outline=INK, width=6)
    return img


def dash_closeup(street_img):
    """Low close-up across the cream dash mat toward the windshield (passenger side)."""
    w, h = 1080, 1920
    img = Image.new("RGB", (w, h))
    st = street_img.crop((300, 300, 1500, 1500)).resize((w, 1200)).filter(ImageFilter.GaussianBlur(14))
    img.paste(st, (0, 0))
    d = ImageDraw.Draw(img)
    # windshield top frame + glass tint
    ov = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    ImageDraw.Draw(ov).rectangle((0, 0, w, 1200), fill=(200, 225, 235, 40))
    img.paste(ov, (0, 0), ov)
    d.rectangle((0, 0, w, 90), fill=(32, 32, 34))
    d.line((0, 90, w, 90), fill=INK, width=5)
    # dark dashboard under the mat
    d.rectangle((0, 1180, w, h), fill=(34, 34, 36))
    # dash mat: knitted texture tiled, then squeezed into perspective (far edge narrower)
    mat = load_cut("dashmat")
    mw, mh = mat.size
    tex = upscale(mat.convert("RGB").crop((int(mw * .12), int(mh * .14), int(mw * .88), int(mh * .58))), 3.0)
    flat = tile(tex, 1800, 700)
    persp = Image.new("RGBA", (w, 700), (0, 0, 0, 0))
    for y in range(700):  # row-by-row scale: near rows wider
        t = y / 699
        rw = int(1300 + 500 * t)
        row = flat.crop((0, y, 1800, y + 1)).resize((rw, 1))
        persp.paste(row, ((w - rw) // 2, y))
    shade = Image.new("L", (w, 700))
    ImageDraw.Draw(shade).rectangle((0, 0, w, 700), fill=255)
    img.paste(persp.convert("RGB"), (0, 1140))
    d.line((0, 1140, w, 1140), fill=INK, width=5)
    fr = mat.crop((0, int(mh * .66), mw, mh))
    fr = upscale(fr, 4.0)
    for xx in range(-40, w, fr.width - 20):
        img.paste(fr, (xx, 1790), fr)
    return img


if __name__ == "__main__":
    s = street()
    s.save(os.path.join(BG, "street.png"))
    interior_pov(s).save(os.path.join(BG, "interior_pov.png"))
    dash_closeup(s).save(os.path.join(BG, "dash_cu.png"))
    print("ok")
