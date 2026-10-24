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
    """Open the mouth under this drawing's own mustache using mouth tile k (sheet 2).

    The original mustache is kept; only the zone just beneath it is replaced, with the
    tile colour-matched to the local skin so the seam doesn't show."""
    if k is None:
        return head
    tile, tm = mouth_tile(k)
    hm = anch["mustache"]
    a = np.asarray(head)
    hw = hm[2] - hm[0]
    s = 0.85 * hw / (tm[2] - tm[0])
    t = tile.resize((max(1, round(tile.width * s)), max(1, round(tile.height * s))), Image.LANCZOS)
    # per-column bottom edge of the real mustache
    hair = _hair(a)
    x0, x1 = hm[0], hm[2]
    sub = hair[hm[1]:hm[3] + 4, x0:x1 + 1]
    bottoms = np.array([(np.where(sub[:, i])[0].max() + hm[1]) if sub[:, i].any() else -1 for i in range(sub.shape[1])])
    cx = (x0 + x1) / 2
    valid = bottoms[bottoms > 0]
    cb = int(np.median(bottoms[int(len(bottoms) * .4):int(len(bottoms) * .6) + 1].clip(min=valid.min())))
    # align tile: its mustache bottom-centre onto ours
    tsub = _hair(np.asarray(t))
    tx0, tx1 = round(tm[0] * s), round(tm[2] * s)
    # end of the FIRST hair run down the centre column (mustache), not the mouth outline below it
    tcol = tsub[:, (tx0 + tx1) // 2 - 2:(tx0 + tx1) // 2 + 3].any(1)
    ys = np.where(tcol)[0]
    tb = ys[0]
    while tb + 1 < len(tcol) and tcol[tb + 1]:
        tb += 1
    ox, oy = round(cx - (tx0 + tx1) / 2), round(cb - tb)
    layer = Image.new("RGBA", head.size, (0, 0, 0, 0))
    layer.paste(t, (ox, oy))
    # colour-match tile skin to the target skin just below the mustache
    la = np.asarray(layer).astype(np.float32)
    mh = hm[3] - hm[1]
    zy0, zy1 = cb + 2, min(a.shape[0], cb + int(mh * 1.6))
    zone_t = la[zy0:zy1, x0:x1, :3].reshape(-1, 3)
    zone_h = a[zy0:zy1, x0:x1, :3].reshape(-1, 3).astype(np.float32)
    sk = lambda z: z[(z[:, 0] > 180) & (z[:, 2] < 140) & (z[:, 1] > 80)]
    st, sh = sk(zone_t), sk(zone_h)
    if len(st) > 20 and len(sh) > 20:
        gain = np.median(sh, 0) / np.maximum(np.median(st, 0), 1)
        la[..., :3] = (la[..., :3] * gain).clip(0, 255)
    layer = Image.fromarray(la.astype(np.uint8))
    # mask: a rounded pocket under the mustache, central ~80% of its width
    mask = np.zeros(a.shape[:2], np.float32)
    half = hw / 2 * 0.80
    depth = mh * 1.35
    for i, b in enumerate(bottoms):
        x = x0 + i
        u = (x - cx) / half
        if abs(u) >= 1 or b < 0:
            continue
        dpt = depth * np.sqrt(1 - u * u)
        mask[max(0, b - 1):min(a.shape[0], int(b + dpt)), x] = 1
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(max(1.2, hw * .018))))
    keep = ndimage.binary_dilation(hair[:, :] & (np.arange(a.shape[0])[:, None] <= cb + 2), iterations=1)
    m = mask.astype(np.float32) * (1 - keep) * (np.asarray(layer.getchannel("A")) / 255) * (a[..., 3] / 255)
    out = head.copy()
    out.paste(layer, (0, 0), Image.fromarray(m.clip(0, 255).astype(np.uint8)))
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
    # second pack: points placed by hand on refs/*.png, shifted by each cutout's crop offset
    for nm, m, e in [("new1_seated_gesture", [467, 323, 670, 397], [[503, 223, 567, 290], [623, 243, 697, 317]]),
                     ("new3_glasses", [355, 210, 508, 263], [[386, 141, 424, 191], [458, 160, 505, 210]]),
                     ("new4_open_door", None, [[420, 160, 452, 197], [485, 180, 518, 218]])]:
        ox, oy = Image.open(os.path.join(CUT, "..", "..", "refs", nm + ".png")).getbbox()[:2]
        sh = lambda b: [b[0] - ox, b[1] - oy, b[2] - ox, b[3] - oy]
        res[nm] = {"mustache": sh(m) if m else None, "eyes": [sh(x) for x in e]}
    json.dump(res, open(ANCH, "w"), indent=1)
    for n, v in res.items():
        print(n, v)
