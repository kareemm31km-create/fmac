"""Shared helpers for the Uncle Aref reel pipeline (free/local tools only: Pillow, NumPy, SciPy, FFmpeg)."""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = os.path.join(ROOT, "refs")
CUT = os.path.join(ROOT, "assets", "cutouts")
BG = os.path.join(ROOT, "assets", "bg")
FONTS = os.path.join(ROOT, "assets", "fonts")
AUDIO = os.path.join(ROOT, "audio")
BUILD = os.path.join(ROOT, "build")
OUT = os.path.join(ROOT, "out")
W, H, FPS = 1080, 1920, 25

for d in (CUT, BG, BUILD, OUT):
    os.makedirs(d, exist_ok=True)


def ref(name):
    return Image.open(os.path.join(REFS, name)).convert("RGB")


def bg_mask_from_border(rgb, tol=28, sides="tlr", bg=None):
    """Background = pixels close to the paper colour that are connected to the chosen borders."""
    a = np.asarray(rgb).astype(np.int16)
    if bg is None:
        bg = np.median(np.concatenate([a[0], a[:, 0], a[:, -1]]), axis=0)
    near = np.abs(a - bg).sum(2) < tol
    lab, _ = ndimage.label(near)
    seeds = set()
    if "t" in sides: seeds |= set(np.unique(lab[0]))
    if "b" in sides: seeds |= set(np.unique(lab[-1]))
    if "l" in sides: seeds |= set(np.unique(lab[:, 0]))
    if "r" in sides: seeds |= set(np.unique(lab[:, -1]))
    seeds.discard(0)
    return np.isin(lab, list(seeds))


def cutout(rgb, tol=28, sides="tlr", keep_largest=True, feather=1.0, all_bg=False, erode=3):
    bgm = bg_mask_from_border(rgb, tol, sides)
    if all_bg:  # also clear enclosed paper (e.g. between steering-wheel spokes)
        a = np.asarray(rgb).astype(np.int16)
        bgm |= np.abs(a - a[0, 0]).sum(2) < tol
    fg = ~bgm
    if keep_largest:
        lab, n = ndimage.label(fg)
        if n > 1:
            sizes = ndimage.sum(fg, lab, range(1, n + 1))
            fg = lab == (int(np.argmax(sizes)) + 1)
    if not all_bg:
        fg = ndimage.binary_fill_holes(fg)
    alpha = Image.fromarray((fg * 255).astype(np.uint8))
    # pull the matte in a hair to kill the paper-coloured fringe, then soften
    alpha = alpha.filter(ImageFilter.MinFilter(erode))
    if feather:
        alpha = alpha.filter(ImageFilter.GaussianBlur(feather))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    bbox = alpha.getbbox()
    return out.crop(bbox), bbox


def inpaint(rgb, mask, iters=60):
    """Very small diffusion inpaint: fills masked pixels from their neighbours."""
    a = np.asarray(rgb).astype(np.float32)
    m = mask.astype(bool)
    known = (~m).astype(np.float32)
    acc = a * known[..., None]
    k = np.ones((5, 5), np.float32)
    for _ in range(iters):
        s = np.stack([ndimage.convolve(acc[..., c], k, mode="nearest") for c in range(3)], -1)
        w = ndimage.convolve(known, k, mode="nearest")
        fill = s / np.maximum(w, 1e-3)[..., None]
        newly = (known == 0) & (w > 0)
        acc[newly] = fill[newly]
        known[newly] = 1
        if known.min() > 0:
            break
    a[m] = acc[m]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def upscale(img, scale):
    """Lanczos upscale + gentle unsharp so the line art keeps its edge."""
    w, h = img.size
    big = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    if img.mode == "RGBA":
        rgb = big.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
        rgb.putalpha(big.getchannel("A"))
        return rgb
    return big.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))


def load_cut(name):
    return Image.open(os.path.join(CUT, name + ".png")).convert("RGBA")
