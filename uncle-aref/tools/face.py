"""Face rig for the sheet-2 busts: finds mustache/eyes automatically, then swaps mouth tiles and draws blinks."""
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from common import load_cut, CUT, os

ANCH = os.path.join(CUT, "anchors.json")


def _hair(a):
    rgb = a[..., :3].astype(int)
    mx, mn = rgb.max(2), rgb.min(2)
    return (mx < 125) & (mx - mn < 28)


def _largest(mask, ymin, ymax, xmin, xmax):
    m = np.zeros_like(mask)
    m[ymin:ymax, xmin:xmax] = mask[ymin:ymax, xmin:xmax]
    m = ndimage.binary_closing(m, iterations=2)
    lab, n = ndimage.label(m)
    if not n:
        return None
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    ys, xs = np.where(lab == k)
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def find_anchors(img):
    a = np.asarray(img)
    h, w = a.shape[:2]
    must = _largest(_hair(a), int(h * .40), int(h * .70), int(w * .12), int(w * .80))
    rgb = a[..., :3].astype(int)
    white = (rgb.min(2) > 215) & (a[..., 3] > 200)
    lab, n = ndimage.label(white[int(h * .25):int(h * .55)])
    eyes = []
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if 25 < len(ys) < 900 and xs.max() - xs.min() < w * .2:
            eyes.append([int(xs.min()), int(ys.min() + h * .25), int(xs.max()), int(ys.max() + h * .25), len(ys)])
    eyes = sorted(sorted(eyes, key=lambda e: -e[4])[:2], key=lambda e: e[0])
    return {"mustache": must, "eyes": [e[:4] for e in eyes]}


_tiles = {}


def mouth_tile(k):
    if k not in _tiles:
        t = load_cut(f"mouth_{k}").convert("RGBA")
        _tiles[k] = (t, _largest(_hair(np.asarray(t)), 20, 95, 0, t.width))
    return _tiles[k]


def apply_mouth(head, anch, k):
    """Replace the mustache+mouth zone with mouth tile k, scaled to this head's mustache."""
    if k is None:
        return head
    tile, tm = mouth_tile(k)
    hm = anch["mustache"]
    s = (hm[2] - hm[0]) / (tm[2] - tm[0])
    t = tile.resize((max(1, round(tile.width * s)), max(1, round(tile.height * s))), Image.LANCZOS)
    tcx, tcy = (tm[0] + tm[2]) / 2 * s, (tm[1] + tm[3]) / 2 * s
    hcx, hcy = (hm[0] + hm[2]) / 2, (hm[1] + hm[3]) / 2
    ox, oy = round(hcx - tcx), round(hcy - tcy)
    mw = (hm[2] - hm[0])
    mh = (hm[3] - hm[1])
    mask = Image.new("L", head.size, 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((hcx - mw * .56, hcy - mh * .62, hcx + mw * .56, hcy + mh * 2.3), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(max(1.5, mw * .03)))
    layer = Image.new("RGBA", head.size, (0, 0, 0, 0))
    layer.paste(t, (ox, oy))
    m = np.minimum(np.asarray(mask), np.asarray(layer.getchannel("A")))
    m = np.minimum(m, np.asarray(head.getchannel("A")))
    out = head.copy()
    out.paste(layer, (0, 0), Image.fromarray(m.astype(np.uint8)))
    return out


def _skin(a):
    rgb = a[..., :3].astype(int)
    m = (rgb[..., 0] > 200) & (rgb[..., 1] > 95) & (rgb[..., 1] < 170) & (rgb[..., 2] < 110) & (a[..., 3] > 250)
    h = a.shape[0]
    m[int(h * .45):] = False
    return tuple(int(v) for v in np.median(rgb[m], 0))


def apply_blink(head, anch, amount):
    """amount 0=open, 0.5=half, 1=closed. Skin-tone eyelid + lash line, like the blink study."""
    if amount <= 0 or len(anch["eyes"]) < 2:
        return head
    a = np.asarray(head)
    skin = _skin(a)
    out = head.copy()
    lidm = Image.new("L", head.size, 0)
    lines = []
    for x0, y0, x1, y1 in anch["eyes"]:
        ew, eh = x1 - x0, y1 - y0
        px, py = ew * .32 + 2, eh * .30 + 2
        ex0, ey0, ex1, ey1 = x0 - px, y0 - py, x1 + px, y1 + py
        ell = Image.new("L", head.size, 0)
        ImageDraw.Draw(ell).ellipse((ex0, ey0, ex1, ey1), fill=255)
        cut = Image.new("L", head.size, 0)
        lid = ey0 + (ey1 - ey0) * (0.2 + 0.6 * amount) if amount < 1 else ey1
        ImageDraw.Draw(cut).rectangle((0, 0, head.width, lid), fill=255)
        lidm = Image.fromarray(np.maximum(np.asarray(lidm), np.minimum(np.asarray(ell), np.asarray(cut))))
        lines.append((ex0, ey0, ex1, ey1, lid))
    lidm = lidm.filter(ImageFilter.GaussianBlur(.8))
    out.paste(Image.new("RGBA", head.size, skin + (255,)), (0, 0), lidm)
    d = ImageDraw.Draw(out)
    for ex0, ey0, ex1, ey1, lid in lines:
        lw = max(2, round((ex1 - ex0) * .10))
        if amount >= 1:  # closed: soft downward arc
            cy = (ey0 + ey1) / 2
            d.arc((ex0 + 1, cy - (ey1 - ey0) * .35, ex1 - 1, cy + (ey1 - ey0) * .35), 15, 165, fill=(30, 22, 20), width=lw)
        else:  # half: lid edge line across the eye
            d.line((ex0 + 2, lid, ex1 - 2, lid), fill=(30, 22, 20), width=lw)
    return out


HEADS = ["head_01_neutral", "head_02_smile", "head_03_laugh", "head_04_curious", "head_05_thinking",
         "head_06_surprised", "head_07_skeptical", "head_08_concerned", "head_09_story",
         "head_10_embarrassed", "head_11_pleased", "head_12_warning"]

if __name__ == "__main__":
    res = {n: find_anchors(load_cut(n)) for n in HEADS}
    # small faces inside the framed poses: placed by hand (pose-image pixel coords)
    res["pose07_driving"] = {"mustache": [205, 92, 252, 104], "eyes": [[215, 71, 226, 84], [241, 73, 255, 87]]}
    res["pose08_parked_story"] = {"mustache": [214, 89, 256, 102], "eyes": [[224, 70, 237, 84], [249, 78, 263, 92]]}
    res["pose09_window"] = {"mustache": [180, 81, 232, 97], "eyes": [[191, 61, 205, 75], [220, 65, 235, 81]]}
    json.dump(res, open(ANCH, "w"), indent=1)
    for n, v in res.items():
        print(n, v)
