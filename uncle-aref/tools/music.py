"""Original tarab-style instrumental in maqam Rast (oud + qanun + soft riq), aged like an old cassette.

Composed and synthesised here (no samples, no existing song, no singer), so it is free to publish.
If you have a LICENSED recording you want instead, put it at audio/music/cassette_user.wav:
render.py then uses it through the same cassette filter.
"""
import wave
import numpy as np
from scipy import signal
from common import AUDIO, os

SR = 48000
OUT = os.path.join(AUDIO, "music")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)

# maqam Rast on C (quarter-tone E and B)
C3 = 130.81
DEG = {"C": 0, "D": 2, "E": 3.5, "F": 5, "G": 7, "A": 9, "B": 10.5}


def freq(note):
    name, octv = note[0], int(note[1:])
    return C3 * 2 ** ((DEG[name] + 12 * (octv - 3)) / 12)


def pluck(f, dur, bright=0.5, decay=0.996, amp=1.0, slide=0.0, os_=4):
    """Karplus-Strong string via lfilter, run 4x oversampled so quarter tones stay in tune."""
    sr = SR * os_
    n = int(dur * sr)
    N = max(2, int(round(sr / f - 0.5)))  # averaging filter adds half a sample of delay
    exc = np.zeros(n)
    burst = rng.uniform(-1, 1, N)
    burst = signal.lfilter([bright, 1 - bright], [1], burst)  # softer attack = darker pluck
    burst = signal.sosfilt(signal.butter(2, 9000, "low", fs=sr, output="sos"), burst)
    exc[:N] = burst
    dk = decay ** (1 / os_)  # same decay per second as at the base rate
    a = np.zeros(N + 2); a[0] = 1; a[N] = -dk * .5; a[N + 1] = -dk * .5
    y = signal.lfilter([1], a, exc)
    if slide:
        t = np.arange(n) / sr
        warp = np.cumsum(1 + slide * np.exp(-t / .04)) - 1
        y = np.interp(warp.clip(0, n - 1), np.arange(n), y)
    y = signal.resample_poly(y, 1, os_)
    fade = np.ones(len(y)); r = int(.03 * SR); fade[-r:] = np.linspace(1, 0, r)
    return y * fade * amp


def oud_body(x):
    """Wooden body: a couple of low resonances, gentle top roll-off."""
    b1 = signal.sosfilt(signal.butter(2, [90, 140], "band", fs=SR, output="sos"), x)
    b2 = signal.sosfilt(signal.butter(2, [220, 320], "band", fs=SR, output="sos"), x)
    y = x + 1.2 * b1 + .8 * b2
    return signal.sosfilt(signal.butter(2, 3800, "low", fs=SR, output="sos"), y)


def place(dst, src, t):
    i = int(t * SR)
    j = min(len(dst), i + len(src))
    if j > i:
        dst[i:j] += src[:j - i]


BPM = 72
BEAT = 60 / BPM
# (note or "-" rest, beats). Phrases written in Rast, tarab pacing.
P1 = [("G4", 1), ("A4", .5), ("B4", .5), ("C5", 1), ("B4", .5), ("A4", .5), ("G4", 2),
      ("A4", .5), ("G4", .5), ("F4", .5), ("E4", .5), ("D4", 1), ("C4", 1), ("-", 2)]
P2 = [("C4", .5), ("D4", .5), ("E4", .5), ("F4", .5), ("G4", 1.5), ("A4", .5), ("G4", 1),
      ("F4", .5), ("E4", .5), ("D4", .5), ("E4", .5), ("F4", 3), ("-", 1)]
P3 = [("G4", .5), ("A4", .5), ("B4", .5), ("C5", .5), ("D5", 1), ("C5", .5), ("B4", .5),
      ("A4", 1), ("G4", .5), ("F4", .5), ("E4", .5), ("D4", .5), ("C4", 3), ("-", 1)]
P4 = [("E4", 1), ("F4", .5), ("G4", .5), ("A4", 1.5), ("G4", .5), ("F4", .5), ("E4", .5),
      ("D4", 1), ("E4", .5), ("D4", .5), ("C4", 2), ("-", 2)]
FORM = [P1, P2, P3, P4, P1, P2, P3, P4, P1, P3]


def compose(total):
    oud = np.zeros(int(total * SR) + SR * 4)
    qan = np.zeros_like(oud)
    bass = np.zeros_like(oud)
    riq = np.zeros_like(oud)
    t = 0.0
    bar = 0
    for ph in FORM:
        for note, beats in ph:
            d = beats * BEAT
            if note != "-":
                f = freq(note)
                oud_amp = .55 if beats < 1 else .7
                place(oud, pluck(f, d + .5, bright=.35, decay=.995, amp=oud_amp,
                                 slide=.015 if rng.random() < .3 else 0), t)
                if beats >= 1.5:  # qanun tremolo on long notes, an octave up
                    k = 0
                    while k * .085 < d - .05:
                        place(qan, pluck(f * 2, .3, bright=.7, decay=.99, amp=.22 * (1 - .4 * k * .085 / d)), t + k * .085)
                        k += 1
                else:
                    place(qan, pluck(f * 2, .35, bright=.7, decay=.99, amp=.12), t + .01)
            t += d
        # low drone on the tonic at each phrase start
        place(bass, pluck(freq("C3") / 2 * 2, 3.5, bright=.2, decay=.998, amp=.45), max(0, t - 8 * BEAT))
        if t > total:
            break
    # maqsum on riq (dum . tak tak . dum tak .), very soft jingles
    beat = 0.0
    while beat * BEAT < total:
        for off, kind in [(0, "dum"), (1, "tak"), (1.5, "tak"), (2.5, "dum"), (3, "tak")]:
            tt = (beat + off) * BEAT
            n = int(.12 * SR)
            nz = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (.05 if kind == "tak" else .03))
            j = signal.sosfilt(signal.butter(2, [5000, 11000], "band", fs=SR, output="sos"), nz)
            if kind == "dum":
                tt_ = np.arange(n) / SR
                j = j * .4 + .9 * np.sin(2 * np.pi * 110 * tt_) * np.exp(-tt_ / .05)
            place(riq, j * (.12 if kind == "tak" else .16), tt)
        beat += 4
    mix = oud_body(oud) + .6 * qan + .5 * oud_body(bass) + riq
    return mix[:int(total * SR)]


def cassette(x, seed=5):
    """Old car cassette: mono, band-limited, wow/flutter, soft saturation, hiss, tiny cabin echo."""
    r = np.random.default_rng(seed)
    n = len(x)
    t = np.arange(n) / SR
    wow = .0035 * np.sin(2 * np.pi * .55 * t) + .0012 * np.sin(2 * np.pi * 7.5 * t + 1)
    pos = np.cumsum(1 + wow)
    pos = pos - pos[0]
    y = np.interp(np.clip(pos, 0, n - 1), np.arange(n), x)
    y = signal.sosfilt(signal.butter(2, 140, "high", fs=SR, output="sos"), y)
    y = signal.sosfilt(signal.butter(4, 5200, "low", fs=SR, output="sos"), y)
    y = np.tanh(y / (np.abs(y).max() + 1e-9) * 1.6)
    hiss = signal.sosfilt(signal.butter(2, 3000, "high", fs=SR, output="sos"), r.standard_normal(n)) * .012
    y = y + hiss
    d = int(.011 * SR)
    y[d:] += .18 * y[:-d]  # small cabin reflection
    return y / (np.abs(y).max() + 1e-9) * .8


def save(name, x):
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    m = compose(80)
    save("tarab_rast_clean.wav", m / np.abs(m).max() * .8)
    save("cassette_tarab.wav", cassette(m))
    print("ok", len(m) / SR)
