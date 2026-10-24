"""Render episode JSON -> storyboard PNG + MP4 (local, free: Pillow + NumPy + FFmpeg).

Timing: each line lasts as long as its recording audio/vo/<id>.wav (never sped up).
If a recording is missing the 'est' value is used and the video is marked as a preview.
"""
import argparse, json, math, random, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
from common import W, H, FPS, BG, BUILD, OUT, AUDIO, FONTS, ROOT, load_cut, upscale, os
from face import ANCH, apply_mouth, apply_blink
from backgrounds import INK

ANC = json.load(open(ANCH))
F700 = os.path.join(FONTS, "Cairo-700.ttf")
F800 = os.path.join(FONTS, "Cairo-800.ttf")
VO_DIR = os.path.join(AUDIO, "vo")
SR = 48000
HEAD = {"neutral": "head_01_neutral", "smile": "head_02_smile", "laugh": "head_03_laugh", "curious": "head_04_curious",
        "thinking": "head_05_thinking", "surprised": "head_06_surprised", "skeptical": "head_07_skeptical",
        "concerned": "head_08_concerned", "story": "head_09_story", "embarrassed": "head_10_embarrassed",
        "pleased": "head_11_pleased", "warning": "head_12_warning"}
MOUTHS = {"default": [3, 4, 5, 8, 4, 3, 6], "teeth": [7, 4, 8, 7]}


# ---------------------------------------------------------------- audio helpers
def read_wav(path):
    with wave.open(path) as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    x = np.frombuffer(raw, {2: np.int16, 4: np.int32}[sw]).astype(np.float32) / (2 ** (8 * sw - 1))
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    if sr != SR:
        x = np.interp(np.arange(0, len(x) * SR / sr) * sr / SR, np.arange(len(x)), x).astype(np.float32)
    return x


def vo_path(lid):
    for ext in (".wav",):
        p = os.path.join(VO_DIR, lid + ext)
        if os.path.exists(p):
            return p
    return None


# ---------------------------------------------------------------- timeline
def build_timeline(ep):
    t = 0.0
    shots, lines = [], []
    for sh in ep["shots"]:
        s = dict(sh, start=t)
        lt = sh.get("pre", 0)
        sl = []
        for ln in sh["lines"]:
            p = vo_path(ln["id"])
            audio = read_wav(p) if p else None
            dur = len(audio) / SR if audio is not None else ln["est"]
            L = dict(ln, start=t + lt, dur=dur, audio=audio, shot=sh["id"])
            sl.append(L)
            lt += dur + ln.get("gap", 0)
        s["lines"] = sl
        s["dur"] = lt + sh.get("post", 0)
        lines += sl
        shots.append(s)
        t += s["dur"]
    return shots, lines, t


def lip_track(L):
    """Per-frame mouth index for a line (None = the drawing's own closed mouth)."""
    n = max(1, round(L["dur"] * FPS))
    opens = MOUTHS[L.get("mouths", "default")]
    rnd = random.Random(L["id"])
    if L["audio"] is not None:  # drive from the recording's loudness
        a = L["audio"]
        hop = SR // FPS
        rms = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(n)])
        ref = np.percentile(rms, 95) + 1e-9
        out = []
        for i, r in enumerate(rms / ref):
            if i % 2 and out:
                out.append(out[-1]); continue
            out.append(None if r < .12 else (rnd.choice([5, 8]) if r < .35 else (4 if r < .65 else 3)))
        return out
    # no recording: syllable-ish rhythm from the text (word gaps and "…" close the mouth)
    units = []
    for word in L["text"].replace("،", " ").split():
        syl = max(1, round(len(word.strip("…!.:؟")) / 2.4))
        units += ["o"] * syl + ["c"]
        if "…" in word:
            units += ["c", "c"]
    per = n / max(1, len(units))
    out = []
    for i in range(n):
        u = units[min(len(units) - 1, int(i / per))]
        if u == "c":
            out.append(None)
        else:
            out.append(out[-1] if (i % 2 and out) else rnd.choice(opens))
    return out


# ---------------------------------------------------------------- drawing helpers
_cache = {}


def cached(key, fn):
    if key not in _cache:
        _cache[key] = fn()
    return _cache[key]


def paste(base, im, xy):
    base.alpha_composite(im, (int(round(xy[0])), int(round(xy[1])))) if (xy[0] >= 0 and xy[1] >= 0 and xy[0] + im.width <= base.width and xy[1] + im.height <= base.height) else base.paste(im, (int(round(xy[0])), int(round(xy[1]))), im)


def camera(frame, zoom=1.0, cx=0.5, cy=0.5, dx=0, dy=0):
    if abs(zoom - 1) < 1e-4 and not dx and not dy:
        return frame
    w, h = W / zoom, H / zoom
    x0 = (W - w) * cx + dx
    y0 = (H - h) * cy + dy
    return frame.transform((W, H), Image.EXTENT, (x0, y0, x0 + w, y0 + h), Image.BICUBIC)


def ease(t):
    t = min(1, max(0, t))
    return t * t * (3 - 2 * t)


def blink_amount(tl, seed):
    """Blinks every ~2.5–4.5 s: half, closed, closed, half."""
    rnd = random.Random(seed)
    t = rnd.uniform(0.6, 1.6)
    while t < tl + 1:
        f = (tl - t) * FPS
        if 0 <= f < 4:
            return [0.5, 1, 1, 0.5][int(f)]
        t += rnd.uniform(2.5, 4.5)
    return 0


_subfont = None


def subtitle_img(text):
    def make():
        global _subfont
        _subfont = _subfont or ImageFont.truetype(F700, 62)
        d0 = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
        bb = d0.textbbox((0, 0), text, font=_subfont, direction="rtl", language="ar", stroke_width=5)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        im = Image.new("RGBA", (tw + 60, th + 34), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, im.width - 1, im.height - 1), 22, fill=(20, 16, 14, 150))
        d.text((30 - bb[0], 17 - bb[1]), text, font=_subfont, fill=(255, 252, 240), direction="rtl", language="ar",
               stroke_width=5, stroke_fill=(25, 18, 14))
        return im
    return cached(("sub", text), make)


def draw_subtitle(frame, text, y=1440):
    if not text:
        return
    im = subtitle_img(text)
    frame.alpha_composite(im, ((W - im.width) // 2, y))


# ---------------------------------------------------------------- shot renderers
def state_at(shot, t_abs):
    """Active line (or last finished) + mouth for a shot at absolute time."""
    active, last = None, None
    for L in shot["lines"]:
        if L["start"] <= t_abs < L["start"] + L["dur"]:
            active = L
        if L["start"] <= t_abs:
            last = L
    mouth = None
    if active and active.get("lipsync", True) and active.get("text"):
        tr = cached(("lip", active["id"], active["dur"]), lambda: lip_track(active))
        mouth = tr[min(len(tr) - 1, int((t_abs - active["start"]) * FPS))]
    cur = active or last or (shot["lines"][0] if shot["lines"] else None)
    return active, cur, mouth


def pov_static():
    def make():
        bg = Image.open(os.path.join(BG, "interior_pov.png")).convert("RGBA")
        return bg
    return cached("pov_bg", make)


def pov_fg():
    def make():
        fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(fg)
        # dashboard edge + cream mat lip across the bottom, hides the bust's cut edge
        d.rectangle((0, 1625, W, H), fill=(34, 34, 36))
        d.line((0, 1625, W, 1625), fill=INK, width=6)
        mat = load_cut("dashmat")
        fr = upscale(mat.crop((0, int(mat.height * .66), mat.width, mat.height)), 3.2)
        xx = -40
        while xx < W:
            fg.paste(fr, (xx, 1612), fr)
            xx += fr.width - 16
        return fg
    return cached("pov_fg", make)


def head_img(name, mouth, blink, scale):
    def make():
        h = load_cut(name)
        a = ANC[name]
        h = apply_mouth(h, a, mouth)
        h = apply_blink(h, a, blink)
        return upscale(h, scale)
    return cached(("head", name, mouth, blink, scale), make)


def render_pov(shot, t, t_abs, tl):
    frame = pov_static().copy()
    active, cur, mouth = state_at(shot, t_abs)
    expr = HEAD[(cur or {}).get("head", "smile")]
    laugh = active is not None and active.get("kind") == "laugh"
    bl = 0 if laugh else blink_amount(t, shot["id"])
    scale = 3.9
    im = head_img(expr, mouth, bl, scale)
    breathe = math.sin(2 * math.pi * t / 3.4) * 4
    bob = math.sin(2 * math.pi * 6 * t) * 7 if laugh else 0
    talk = 2 * math.sin(2 * math.pi * 1.7 * t) if active else 0
    x = 560 - im.width / 2
    y = 1650 - im.height + breathe + bob + talk
    frame.alpha_composite(im, (int(x), int(y)))
    frame.alpha_composite(pov_fg())
    z0, z1 = shot.get("zoom", [1.0, 1.03])
    frame = camera(frame, z0 + (z1 - z0) * ease(t / shot["dur"]), .5, .42)
    return frame, active


def street_layer(blur):
    return cached(("street", blur), lambda: Image.open(os.path.join(BG, "street.png")).convert("RGB").filter(
        ImageFilter.GaussianBlur(blur)).convert("RGBA"))


def windshield_frame():
    def make():
        f = Image.new("RGBA", (W, H))
        st = street_layer(6)
        f.paste(st.crop((260, 120, 260 + W, 120 + H)), (0, 0))
        d = ImageDraw.Draw(f)
        # roof + roof sign
        d.rounded_rectangle((-40, 300, W + 40, 470), 50, fill=(246, 246, 242), outline=INK, width=6)
        d.rectangle((330, 190, 750, 300), fill=(250, 250, 248), outline=INK, width=6)
        d.rectangle((310, 286, 770, 312), fill=(30, 30, 32), outline=INK, width=4)
        d.text((540, 246), "TAXI", font=ImageFont.truetype(F800, 84), fill=(25, 25, 28), anchor="mm")
        # hood (black), highlight streaks, chrome emblem
        d.polygon([(-20, 1460), (W + 20, 1460), (W + 20, H), (-20, H)], fill=(30, 30, 33))
        d.line((-20, 1462, W + 20, 1462), fill=INK, width=6)
        for k, (a, b) in enumerate([(120, 520), (620, 980)]):
            d.line((a, 1560 + k * 40, b, 1530 + k * 40), fill=(70, 70, 76), width=10)
        d.line((540, 1480, 540, H), fill=(22, 22, 24), width=6)
        return f
    return cached("ws_frame", make)


def pose_window(pose, mouth, blink, box, scale):
    def make():
        p = load_cut(pose)
        a = ANC[pose]
        p = apply_mouth(p, a, mouth)
        p = apply_blink(p, a, blink)
        return upscale(p.crop(box), scale)
    return cached(("pose", pose, mouth, blink, tuple(box), scale), make)


def render_windshield(shot, t, t_abs, tl):
    frame = windshield_frame().copy()
    active, cur, mouth = state_at(shot, t_abs)
    if mouth is None:
        mouth = 1 if active else None  # base drawing has an open mouth; close it between syllables
    pose = shot["pose"]
    x0 = {"pose07_driving": 98, "pose08_parked_story": 92}[pose]
    box = (x0, 8, x0 + 250, 250)
    im = pose_window(pose, mouth, blink_amount(t, shot["id"]), box, W / 250)
    frame.alpha_composite(im, (0, 430))
    zs = (1.0, 1.06) if shot.get("settle") else (1.02, 1.0)
    z = zs[0] + (zs[1] - zs[0]) * ease(t / shot["dur"])
    dy = -18 * ease(t / 0.9) if shot.get("settle") else 0
    return camera(frame, z, .5, .45, dy=dy), active


def render_window_ext(shot, t, t_abs, tl):
    st = street_layer(4)
    frame = Image.new("RGBA", (W, H))
    frame.paste(st.crop((180 + int(t * 6), 0, 180 + int(t * 6) + W, H)), (0, 0))
    active, cur, mouth = state_at(shot, t_abs)
    p = load_cut("pose09_window")
    sc = 4.3
    im = cached(("p9", mouth, blink_amount(t, shot["id"])),
                lambda: upscale(apply_blink(apply_mouth(p, ANC["pose09_window"], mouth), ANC["pose09_window"],
                                            blink_amount(t, shot["id"])), sc))
    frame.alpha_composite(im, (540 - int(207 * sc), H + 40 - im.height)) if False else frame.paste(im, (540 - int(207 * sc), H + 40 - im.height), im)
    return camera(frame, 1.0 + .03 * ease(t / shot["dur"]), .5, .4), active


def render_detail(shot, t, t_abs, tl):
    def make():
        cab = load_cut("cabin").convert("RGB")
        c = cab.crop(tuple(shot["crop"]))
        s = W / c.width
        c = upscale(c, s)
        f = Image.new("RGBA", (W, H), (20, 20, 22, 255))
        f.paste(c, (0, (H - c.height) // 2))
        return f
    base = cached(("detail", shot["id"]), make)
    active, _, _ = state_at(shot, t_abs)
    return camera(base, 1 + (shot.get("push", 1.05) - 1) * ease(t / shot["dur"]), .5, .5), active


def dog_frames():
    def make():
        out = {}
        for k in ("up", "mid", "down"):
            d = upscale(load_cut(f"dog_{k}"), 5.6)
            a = np.asarray(d.getchannel("A"))
            rows = np.where(a[-12:].max(0) > 128)[0]
            out[k] = (d, (rows.min() + rows.max()) / 2)  # base centre x
        return out
    return cached("dog", make)


def render_dog(shot, t, t_abs, tl):
    bg = cached("dog_bg", lambda: Image.open(os.path.join(BG, "dash_cu.png")).convert("RGBA"))
    frame = bg.copy()
    swing = 0.0
    for tb in shot.get("bob_at", []):
        if t >= tb:
            u = t - tb
            swing += math.exp(-u / 0.55) * math.sin(2 * math.pi * 2.6 * u)
    if shot.get("nod"):
        swing = -abs(swing)  # nod = head dips down, like agreeing
    k = "up" if swing > .35 else ("down" if swing < -.35 else "mid")
    d, bx = dog_frames()[k]
    frame.alpha_composite(d, (int(560 - bx), 1640 - d.height))
    active, _, _ = state_at(shot, t_abs)
    return camera(frame, 1.0 + .05 * ease(t / shot["dur"]), .55, .7), active


def end_card_base():
    def make():
        f = Image.new("RGBA", (W, H), (251, 248, 240, 255))
        d = ImageDraw.Draw(f)
        taxi = upscale(load_cut("taxi_side"), 1000 / load_cut("taxi_side").width)
        d.ellipse((60, 1470, 1060, 1530), fill=(232, 226, 212))
        f.alpha_composite(taxi, (80, 1500 - taxi.height))
        return f
    return cached("end_base", make)


def render_end(shot, t, t_abs, tl):
    f = end_card_base().copy()
    man = cached("end_man", lambda: upscale(load_cut("pose01_wave"), 760 / load_cut("pose01_wave").height))
    ang = math.sin(2 * math.pi * t / 1.6) * 1.2
    m = man.rotate(ang, resample=Image.BICUBIC, center=(man.width / 2, man.height), expand=False)
    f.alpha_composite(m, (90, 1590 - man.height))
    d = ImageDraw.Draw(f)
    a1 = ease((t - .2) / .5)
    a2 = ease((t - .9) / .5)
    title = Image.new("RGBA", (W, 500), (0, 0, 0, 0))
    td = ImageDraw.Draw(title)
    ft = ImageFont.truetype(F800, 190)
    td.text((540, 200), "عم عارف", font=ft, fill=(28, 36, 52, int(255 * a1)), anchor="mm", direction="rtl", language="ar")
    # orange brush underline under the name, like the model sheets
    wpx = int(330 * a1)
    td.rounded_rectangle((250, 300, 250 + wpx, 322), 11, fill=(232, 126, 40, int(255 * a1)))
    fs = ImageFont.truetype(F700, 70)
    td.text((540, 420), "كل مشوار وراه حكاية", font=fs, fill=(90, 70, 55, int(255 * a2)), anchor="mm", direction="rtl", language="ar")
    f.alpha_composite(title, (0, 150))
    return f, None


RENDER = {"pov": render_pov, "windshield": render_windshield, "window_ext": render_window_ext,
          "detail": render_detail, "dog_cu": render_dog, "end_card": render_end}


def frame_at(shots, total, ti, preview_tag):
    t_abs = ti / FPS
    sh = next(s for s in shots if s["start"] <= t_abs < s["start"] + s["dur"] + 1e-9) if t_abs < total else shots[-1]
    t = t_abs - sh["start"]
    f, active = RENDER[sh["type"]](sh, t, t_abs, ti)
    if f.mode != "RGBA":
        f = f.convert("RGBA")
    if active is not None and active.get("text"):
        draw_subtitle(f, active["text"])
    if preview_tag:
        f.alpha_composite(cached("tag", lambda: tag_img()), (36, 60))
    # fades: in from black, out to black, soft dip into the end card
    fade = min(1, t_abs / .35, (total - t_abs) / .6)
    if sh["type"] == "end_card":
        fade = min(fade, .25 + .75 * ease(t / .45))
    if fade < 1:
        f = Image.blend(Image.new("RGBA", f.size, (0, 0, 0, 255)), f, max(0, fade))
    return f.convert("RGB")


def tag_img():
    ft = ImageFont.truetype(F700, 30)
    txt = "معاينة • التسجيل الصوتي غير متوفر بعد"
    d0 = ImageDraw.Draw(Image.new("RGBA", (5, 5)))
    bb = d0.textbbox((0, 0), txt, font=ft, direction="rtl", language="ar")
    im = Image.new("RGBA", (bb[2] - bb[0] + 36, bb[3] - bb[1] + 22), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, im.width - 1, im.height - 1), 14, fill=(200, 60, 40, 200))
    d.text((18 - bb[0], 11 - bb[1]), txt, font=ft, fill="white", direction="rtl", language="ar")
    return im


# ---------------------------------------------------------------- audio mix
def mix(shots, lines, total, path):
    n = int(total * SR) + SR
    out = np.zeros(n, np.float32)
    sfxd = os.path.join(AUDIO, "sfx")
    bed = read_wav(os.path.join(sfxd, "street_bed.wav"))
    reps = int(np.ceil(n / len(bed)))
    b = np.tile(bed, reps)[:n] * 0.22
    # duck the street a little under speech
    duck = np.ones(n, np.float32)
    for L in lines:
        if L["audio"] is not None:
            i, j = int(L["start"] * SR), int((L["start"] + L["dur"]) * SR)
            duck[i:j] = 0.6
    duck = np.convolve(duck, np.ones(4800) / 4800, mode="same")
    end = next(s for s in shots if s["type"] == "end_card")
    fo = np.clip((total - np.arange(n) / SR) / max(.1, total - end["start"]), 0, 1)
    out += b * duck * fo
    gains = {"door_open": .8, "door_close": .9, "cassette_click": .75, "bobble": .22}
    for s in shots:
        for name, at in s.get("sfx", []):
            x = read_wav(os.path.join(sfxd, name + ".wav")) * gains.get(name, .7)
            i = int((s["start"] + at) * SR)
            out[i:i + len(x)] += x[:max(0, n - i)]
    for L in lines:
        if L["audio"] is not None:
            i = int(L["start"] * SR)
            out[i:i + len(L["audio"])] += L["audio"][:max(0, n - i)]
    out = out[:int(total * SR)]
    out /= max(1.0, np.abs(out).max() / 0.95)
    st = np.repeat((out * 32767).astype(np.int16)[:, None], 2, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(st.tobytes())


# ---------------------------------------------------------------- outputs
def storyboard(shots, total, path, preview_tag):
    thumbs = []
    for s in shots:
        ti = int((s["start"] + s["dur"] * 0.55) * FPS)
        f = frame_at(shots, total, ti, False).resize((270, 480))
        thumbs.append((s, f))
    cols = 5
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * 300 + 30, rows * 600 + 140), (251, 248, 240))
    d = ImageDraw.Draw(sheet)
    d.text((sheet.width // 2, 60), "عم عارف — المشوار الأول • ستوري بورد", font=ImageFont.truetype(F800, 46),
           fill=(28, 36, 52), anchor="mm", direction="rtl", language="ar")
    fs = ImageFont.truetype(F700, 22)
    for i, (s, f) in enumerate(thumbs):
        x, y = 30 + (i % cols) * 300, 120 + (i // cols) * 600
        sheet.paste(f, (x, y))
        d.rectangle((x, y, x + 269, y + 479), outline=INK, width=2)
        cap = f"{s['id']} • مشهد {s['scene']} • {s['dur']:.1f}ث"
        d.text((x + 135, y + 500), cap, font=fs, fill=(40, 40, 40), anchor="mm", direction="rtl", language="ar")
        txt = " / ".join(L["text"] for L in s["lines"] if L["text"])[:38]
        if txt:
            d.text((x + 135, y + 535), txt, font=ImageFont.truetype(F700, 17), fill=(90, 70, 55), anchor="mm",
                   direction="rtl", language="ar")
    sheet.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episode", default=os.path.join(ROOT, "episode", "ep01_first_ride.json"))
    ap.add_argument("--storyboard-only", action="store_true")
    ap.add_argument("--frames", default="", help="comma list of seconds to dump as PNG stills")
    args = ap.parse_args()
    ep = json.load(open(args.episode))
    shots, lines, total = build_timeline(ep)
    missing = [L["id"] for L in lines if L["audio"] is None]
    preview = bool(missing)
    print(f"duration {total:.2f}s, {len(shots)} shots, {len(lines)} lines, missing VO: {len(missing)}")
    json.dump([{"id": s["id"], "start": round(s["start"], 2), "dur": round(s["dur"], 2),
                "lines": [{"id": L["id"], "start": round(L["start"], 2), "dur": round(L["dur"], 2),
                           "recorded": L["audio"] is not None, "text": L["text"]} for L in s["lines"]]}
               for s in shots], open(os.path.join(BUILD, "timeline.json"), "w"), ensure_ascii=False, indent=1)
    storyboard(shots, total, os.path.join(OUT, "ep01_storyboard.png"), preview)
    if args.frames:
        for sec in args.frames.split(","):
            frame_at(shots, total, int(float(sec) * FPS), preview).save(os.path.join(BUILD, f"still_{sec}.png"))
    if args.storyboard_only or args.frames:
        return
    vid = os.path.join(BUILD, "video.mp4")
    aud = os.path.join(BUILD, "mix.wav")
    nframes = int(round(total * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                          "-pix_fmt", "yuv420p", vid], stdin=subprocess.PIPE)
    for i in range(nframes):
        p.stdin.write(frame_at(shots, total, i, preview).tobytes())
        if i % 125 == 0:
            print(f"frame {i}/{nframes}", flush=True)
    p.stdin.close(); p.wait()
    mix(shots, lines, total, aud)
    name = "ep01_first_ride_PREVIEW.mp4" if preview else "ep01_first_ride.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", vid, "-i", aud, "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", "-shortest", "-movflags", "+faststart", os.path.join(OUT, name)], check=True)
    print("wrote", os.path.join(OUT, name))


if __name__ == "__main__":
    main()
