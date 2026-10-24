"""Procedurally synthesised SFX (no samples needed). Output: audio/sfx/*.wav, 48 kHz mono 16-bit."""
import wave
import numpy as np
from scipy import signal
from common import AUDIO, os

SR = 48000
OUTD = os.path.join(AUDIO, "sfx")
os.makedirs(OUTD, exist_ok=True)
rng = np.random.default_rng(3)


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lp(x, f, o=4):
    return signal.sosfilt(signal.butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=4):
    return signal.sosfilt(signal.butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return signal.sosfilt(signal.butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def place(dst, src, t):
    i = int(t * SR)
    j = min(len(dst), i + len(src))
    dst[i:j] += src[:j - i]


def save(name, x, peak=0.8):
    x = x / (np.abs(x).max() + 1e-9) * peak
    with wave.open(os.path.join(OUTD, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print(name, round(len(x) / SR, 2), "s")


def click(dur=0.03, f0=2500, f1=6000):
    n = int(dur * SR)
    return bp(rng.standard_normal(n), f0, f1) * env(n, 0.0005, dur / 5)


def thump(dur=0.35, f=70):
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * f * t * (1 - 0.3 * t)) * env(n, 0.002, 0.09)
    knock = lp(rng.standard_normal(n), 900) * env(n, 0.001, 0.03)
    return body + 0.6 * knock


# door open: handle pull clack, latch release, little hinge groan
x = np.zeros(int(0.9 * SR))
place(x, click(0.04, 1200, 4000) * 0.7, 0.00)
place(x, click(0.05, 600, 2500) * 1.0, 0.07)
place(x, thump(0.2, 140) * 0.35, 0.08)
n = int(0.45 * SR); t = np.arange(n) / SR
groan = bp(signal.sawtooth(2 * np.pi * (180 + 40 * np.sin(2 * np.pi * 3 * t)) * t), 300, 1800) * env(n, 0.08, 0.25)
place(x, groan * 0.12, 0.18)
save("door_open", x)

# door close: solid thud + latch clack + body rattle
x = np.zeros(int(1.0 * SR))
place(x, thump(0.45, 62), 0.0)
place(x, click(0.03, 800, 3500) * 0.8, 0.012)
n = int(0.25 * SR)
place(x, bp(rng.standard_normal(n), 1500, 5000) * env(n, 0.002, 0.04) * 0.15, 0.03)
save("door_close", x, 0.9)

# cassette click: play-key press, mechanism clack, tiny tape hiss tail
x = np.zeros(int(0.7 * SR))
place(x, click(0.02, 3000, 9000), 0.0)
place(x, click(0.05, 700, 3000) * 0.9, 0.035)
n = int(0.5 * SR)
place(x, hp(rng.standard_normal(n), 5000) * env(n, 0.05, 0.3) * 0.05, 0.1)
save("cassette_click", x, 0.7)

# bobblehead spring: soft wobbling plastic 'boing'
n = int(0.6 * SR); t = np.arange(n) / SR
x = np.sin(2 * np.pi * (520 + 60 * np.sin(2 * np.pi * 9 * t)) * t) * env(n, 0.003, 0.15)
save("bobble", x * 0.5, 0.35)

# quiet street bed: distant traffic rumble, far horns, sparrows, occasional passing car (60 s, loops)
L = 60
n = L * SR
b = np.cumsum(rng.standard_normal(n)); b = hp(b, 25); b = lp(b, 420)
b /= np.abs(b).max()
roll = 0.75 + 0.25 * np.sin(2 * np.pi * np.arange(n) / SR / 13)
x = b * roll * 0.5
air = lp(hp(rng.standard_normal(n), 300), 3000) * 0.03
x += air
for _ in range(5):  # passing cars (noise swell)
    d = rng.uniform(3, 5); m = int(d * SR); tt = np.linspace(-1, 1, m)
    car = lp(rng.standard_normal(m), rng.uniform(500, 900)) * np.exp(-6 * tt ** 2) * 0.45
    place(x, car, rng.uniform(0, L - d))
for _ in range(4):  # far horns, double beep, heavily low-passed
    f = rng.uniform(380, 470); m = int(0.22 * SR); tt = np.arange(m) / SR
    beep = lp(signal.square(2 * np.pi * f * tt) * env(m, 0.01, 0.2), 1200) * 0.08
    t0 = rng.uniform(2, L - 2)
    place(x, beep, t0); place(x, beep, t0 + 0.3)
for _ in range(22):  # sparrows
    m = int(0.09 * SR); tt = np.arange(m) / SR
    f = rng.uniform(3500, 5200)
    ch = np.sin(2 * np.pi * (f + 2500 * tt / 0.09) * tt) * np.sin(np.pi * tt / 0.09) ** 2 * 0.035
    t0 = rng.uniform(0, L - 1)
    for k in range(rng.integers(1, 4)):
        place(x, ch, t0 + k * 0.13)
# crossfade the tail into the head so it loops cleanly
f = int(1.0 * SR); r = np.linspace(0, 1, f)
x[:f] = x[:f] * r + x[-f:] * (1 - r); x = x[:-f]
save("street_bed", x, 0.6)
