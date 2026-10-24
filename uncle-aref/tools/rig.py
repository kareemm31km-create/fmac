"""Calm 2D rig for the high-resolution drawings.

- Mouth: drawn vector shape that opens smoothly under the drawing's OWN mustache
  (no image swapping, so nothing flickers or changes the face).
- Blink: skin-tone eyelid + lash line, applied to the source drawing.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from common import load_cut, upscale
from face import _hair, apply_blink

# cutout pixel coords. mouth = [centre x, top y (just under mustache), width]
RIGS = {
    "new1_seated_gesture": {"mustache": [467, 284, 670, 358], "mouth": [580, 343, 108],
                            "eyes": [[503, 184, 567, 251], [623, 204, 697, 278]]},
    "new3_glasses": {"mustache": [314, 185, 467, 238], "mouth": [395, 219, 82],
                     "eyes": [[345, 116, 383, 166], [417, 135, 464, 185]]},
    "new5_taxi_front": {"mustache": [897, 269, 966, 297], "mouth": [934, 291, 30],
                        "eyes": [[912, 245, 930, 260], [952, 252, 968, 270]]},
    "new4_open_door": {"mustache": None, "mouth": None,
                       "eyes": [[420, 160, 452, 197], [485, 180, 518, 218]]},
}

_c = {}


def _cache(k, fn):
    if k not in _c:
        _c[k] = fn()
    return _c[k]


def base(name, blink, scale):
    def make():
        im = load_cut(name)
        r = RIGS.get(name)
        if r and blink:
            im = apply_blink(im, r, blink)
        return upscale(im, scale) if abs(scale - 1) > 1e-3 else im
    return _cache(("base", name, blink, scale), make)


def mustache_layer(name, scale):
    """The mustache pixels alone (scaled), pasted back over the drawn mouth."""
    def make():
        im = load_cut(name)
        x0, y0, x1, y1 = RIGS[name]["mustache"]
        a = np.asarray(im)
        m = np.zeros(a.shape[:2], bool)
        pad = 3
        m[y0 - pad:y1 + pad, x0 - pad:x1 + pad] = _hair(a)[y0 - pad:y1 + pad, x0 - pad:x1 + pad]
        m = ndimage.binary_closing(m, iterations=2)
        m = ndimage.binary_dilation(m, iterations=1)
        lay = im.copy()
        alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7))
        lay.putalpha(Image.fromarray(np.minimum(np.asarray(alpha), a[..., 3])))
        bb = lay.getbbox()
        lay = lay.crop(bb)
        return upscale(lay, scale), (bb[0] * scale, bb[1] * scale)
    return _cache(("must", name, scale), make)


def mouth_patch(w, o, ss=3):
    """Open mouth of width w px, openness o in 0..1. Drawn supersampled, returned RGBA."""
    W = int(w * 1.3 * ss)
    hmax = int(w * .62 * ss)
    im = Image.new("RGBA", (W, hmax + 8 * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = W / 2
    ww = w * ss * (1 - .12 * o)
    top = 0
    bot = w * ss * (.10 + .44 * o)
    lw = max(2, int(w * ss * .045))
    box = (cx - ww / 2, top - bot * .35, cx + ww / 2, bot)
    d.ellipse(box, fill=(98, 28, 32, 255), outline=(38, 22, 20, 255), width=lw)
    # tongue
    tw = ww * .62
    d.ellipse((cx - tw / 2, bot - bot * .55, cx + tw / 2, bot + bot * .35), fill=(222, 112, 108, 255))
    # re-draw bottom outline over the tongue so the edge stays clean
    d.arc(box, 0, 180, fill=(38, 22, 20, 255), width=lw)
    # upper teeth peeking under the mustache
    if o > .25:
        th = min(bot * .30, w * ss * .10)
        d.rectangle((cx - ww * .36, 0, cx + ww * .36, th), fill=(250, 248, 240, 255))
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).ellipse(box, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    d2 = ImageDraw.Draw(out)
    d2.arc(box, 0, 180, fill=(38, 22, 20, 255), width=lw)
    return out.resize((max(1, W // ss), max(1, (hmax + 8 * ss) // ss)), Image.LANCZOS)


def render_rig(name, scale, o=0.0, blink=0):
    """Full scaled drawing with mouth openness o (quantised) and blink state."""
    q = round(o * 12) / 12
    def make():
        img = base(name, blink, scale).copy()
        r = RIGS.get(name)
        if not r or not r.get("mouth") or q <= 0.02:
            return img
        cx, top, w = r["mouth"]
        p = mouth_patch(w * scale, q)
        img.alpha_composite(p, (int(cx * scale - p.width / 2), int(top * scale - 2)))
        lay, (lx, ly) = mustache_layer(name, scale)
        img.alpha_composite(lay, (int(lx), int(ly)))
        return img
    return _cache(("rig", name, scale, q, blink), make)
