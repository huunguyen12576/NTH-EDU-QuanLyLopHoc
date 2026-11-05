"""
Original score + sound design, synthesised from scratch with NumPy/SciPy — no samples, no third-party
recordings — so the soundtrack is fully owned and safe for commercial use.

Every cue is driven by audio/events.json (exported from the scene logic), so each sound lands on the
exact frame of the motion it belongs to — including slow-motion (pitched down by the playback rate).

Run:  python3 audio/make_audio.py  ->  public/audio/soundtrack_raw.wav  (then loudness-normalised by ffmpeg)
"""
import json
import os
import subprocess
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
EV = json.load(open(os.path.join(HERE, "events.json")))
FPS = EV["FPS"]
OUT = EV["OUT"]
SR = 48000
DUR = EV["DURATION"] / FPS
N = int(DUR * SR) + SR
rng = np.random.default_rng(11)

dry = np.zeros((2, N))
verb = np.zeros((2, N))
music = np.zeros((2, N))
mverb = np.zeros((2, N))


def F(f):
    return f / FPS


def sec(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def sos(kind, f, order=2):
    return butter(order, f, btype=kind, fs=SR, output="sos")


def bp(x, lo, hi, o=2):
    return sosfilt(sos("band", [lo, min(hi, SR / 2 - 200)], o), x)


def lp(x, f, o=2):
    return sosfilt(sos("low", f, o), x)


def hp(x, f, o=2):
    return sosfilt(sos("high", f, o), x)


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def put(buf, sig, t, gain=1.0, pan=0.0, send=None, amt=0.0):
    i = int(t * SR)
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: max(0, N - i)]
    if len(sig) == 0:
        return
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    buf[0, i : i + len(sig)] += sig * l
    buf[1, i : i + len(sig)] += sig * r
    if send is not None and amt:
        send[0, i : i + len(sig)] += sig * l * amt
        send[1, i : i + len(sig)] += sig * r * amt


def sfx(sig, t, g=1.0, pan=0.0, rv=0.15):
    put(dry, sig, t, g, pan, verb, rv)


def mus(sig, t, g=1.0, pan=0.0, rv=0.3):
    put(music, sig, t, g, pan, mverb, rv)


def resample(sig, rate):
    """Playback-rate change (slow motion pitches down)."""
    if abs(rate - 1) < 1e-3:
        return sig
    idx = np.arange(0, len(sig) - 1, rate)
    return np.interp(idx, np.arange(len(sig)), sig)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# =========================================================================== instruments
def piano(f, d=2.5, vel=0.7, bright=1.0):
    t = sec(d)
    out = np.zeros_like(t)
    B = 0.00035
    for n in range(1, 10):
        fn = n * f * np.sqrt(1 + B * n * n)
        if fn > 9000:
            break
        tau = 2.2 / (1 + 0.55 * n) * (262 / f) ** 0.35
        amp = (1 / n ** 1.25) * (bright if n > 3 else 1)
        out += amp * np.sin(2 * np.pi * fn * t + rng.uniform(0, 6)) * np.exp(-t / tau)
    out *= np.minimum(1, t / 0.003)
    ham = lp(noise(0.03), 2500) * env(int(0.03 * SR), 0.001, 0.006) * 0.25
    out[: len(ham)] += ham
    return out * vel * 0.32


def chord(notes, t, vel=0.5, d=3.0, spread=0.012, g=1.0, rv=0.35, bright=1.0):
    for k, m in enumerate(notes):
        mus(piano(midi(m), d, vel * (0.85 + 0.3 * rng.random()), bright), t + k * spread, g, pan=(k / max(1, len(notes) - 1) - 0.5) * 0.5, rv=rv)


def pad(notes, d, att=1.2, rel=1.5, cut=1400, g=0.08, vib=0.0):
    t = sec(d)
    out = np.zeros_like(t)
    for m in notes:
        f = midi(m)
        for det in (-0.08, 0.0, 0.07):
            ff = f * 2 ** (det / 12) * (1 + vib * 0.004 * np.sin(2 * np.pi * 5.2 * t))
            ph = 2 * np.pi * np.cumsum(ff) / SR
            saw = np.zeros_like(t)
            for n in range(1, 14):
                if n * f > 7000:
                    break
                saw += np.sin(n * ph) / n
            out += saw
    out = lp(out, cut)
    e = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel).clip(0, 1)
    return out * e * g / len(notes)


def pluck(f, d=0.5, damp=0.996, g=0.5):
    """Karplus-Strong pizzicato."""
    n = int(d * SR)
    L = int(SR / f)
    buf = list(rng.uniform(-1, 1, L))
    out = np.zeros(n)
    prev = 0.0
    for i in range(n):
        v = buf[i % L]
        nv = damp * 0.5 * (v + prev)
        prev = v
        buf[i % L] = nv
        out[i] = v
    return lp(out, 3000) * g


def bell(f, d=4.0, g=0.3):
    t = sec(d)
    mod = np.sin(2 * np.pi * f * 2.76 * t) * 2.2 * np.exp(-t / 0.8)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 1.6) * np.minimum(1, t / 0.002) * g


def kick(g=1.0):
    t = sec(0.4)
    f = 45 + 80 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * g


def shaker(g=0.2):
    return hp(noise(0.06), 6000) * env(int(0.06 * SR), 0.004, 0.018) * g


def clap(g=0.3):
    out = np.zeros(int(0.25 * SR))
    for k, dt in enumerate((0, 0.009, 0.019)):
        b = bp(noise(0.2), 900, 3200) * env(int(0.2 * SR), 0.001, 0.03 if k < 2 else 0.09)
        i = int(dt * SR)
        out[i : i + len(b)] += b[: len(out) - i]
    return out * g


# =========================================================================== sound atoms
def thump(f0=60, d=0.5, click=0.3):
    t = sec(d)
    f = f0 * (1 + 1.2 * np.exp(-t / 0.02))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d / 3))
    s += lp(noise(d), 800) * np.exp(-t / 0.02) * click
    return s


def droplets(d, n, lo=500, hi=2200, g=0.15):
    out = np.zeros(int(d * SR))
    for _ in range(n):
        t0 = rng.exponential(d / 3)
        if t0 > d - 0.05:
            continue
        dd = 0.03 + rng.random() * 0.03
        tt = sec(dd)
        f0 = rng.uniform(lo, hi)
        s = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 1.4 * tt / dd)) / SR) * env(len(tt), 0.001, dd / 3) * rng.uniform(0.3, 1)
        i = int(t0 * SR)
        out[i : i + len(s)] += s[: len(out) - i]
    return out * g


def splash(size=1.0):
    d = 1.6 * size
    t = sec(d)
    body = bp(noise(d), 250, 3500) * np.exp(-t / (0.22 * size)) * np.minimum(1, t / 0.006)
    low = lp(noise(d), 260) * np.exp(-t / 0.12) * 1.5
    sheet = bp(noise(d), 1500, 7000) * np.exp(-t / 0.5) * 0.3
    s = body + low + sheet + droplets(d, int(60 * size), 400, 2600, 0.25)
    return s * 0.8


def squelch(g=0.5, d=0.16):
    t = sec(d)
    x = noise(d)
    c = 500 + 700 * np.sin(np.pi * t / d)
    out = np.zeros_like(x)
    for k in range(4):
        s0, s1 = k * len(x) // 4, (k + 1) * len(x) // 4
        out[s0:s1] = bp(x, c[s0] * 0.6, c[s0] * 1.6)[s0:s1]
    return out * np.sin(np.pi * t / d) ** 1.5 * g + droplets(d, 3, 300, 900, 0.1)


def step(muddy=False, g=0.4):
    d = 0.12
    t = sec(d)
    heel = bp(noise(d), 700, 5000) * env(len(t), 0.001, 0.012) * 0.6 + thump(95, d, 0.2) * 0.35
    s = heel
    if muddy:
        s = s * 0.5
        sq = squelch(0.5, 0.14)
        s = np.concatenate([s, np.zeros(max(0, len(sq) - len(s)))])
        s[: len(sq)] += sq
    return s * g


def whoosh(d=0.7, lo=200, hi=2500, rev=False, g=0.4):
    x = noise(d)
    t = np.linspace(0, 1, len(x))
    shape = np.sin(np.pi * t) ** 2
    seg = 10
    L = len(x) // seg
    out = np.zeros_like(x)
    for s_ in range(seg):
        k = s_ / seg if not rev else 1 - s_ / seg
        c = lo * (hi / lo) ** k
        out[s_ * L : (s_ + 1) * L] = bp(x, c * 0.7, c * 1.5)[s_ * L : (s_ + 1) * L]
    return out * shape * g


def ha(f0=200, d=0.16, g=0.3, vowel="a"):
    """Formant-synthesised laugh syllable ('ha')."""
    t = sec(d)
    f = f0 * (1.08 - 0.18 * t / d) * (1 + 0.01 * rng.standard_normal())
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = np.zeros_like(t)
    for n in range(1, 30):
        if n * f0 > 6000:
            break
        src += np.sin(n * ph) / n ** 0.9
    fm = {"a": (780, 1200, 2600), "e": (550, 1800, 2600), "o": (520, 900, 2500)}[vowel]
    v = bp(src, fm[0] * 0.8, fm[0] * 1.25) * 1.0 + bp(src, fm[1] * 0.85, fm[1] * 1.2) * 0.55 + bp(src, fm[2] * 0.9, fm[2] * 1.12) * 0.2
    a = np.minimum(1, np.maximum(0, (t - 0.03) / 0.015)) * np.exp(-np.maximum(0, t - 0.045) / (d * 0.35))
    h = bp(noise(d), 900, 4500) * env(len(t), 0.004, 0.025) * (t < 0.06) * 0.35
    return (v * a * 0.5 + h) * g


def heartbeat(g=0.6):
    s = np.zeros(int(0.7 * SR))
    for dt, a in ((0, 1.0), (0.18, 0.7)):
        b = thump(48, 0.3, 0.05) * a
        i = int(dt * SR)
        s[i : i + len(b)] += b
    return lp(s, 200) * g


def riser(d, lo=200, hi=1400, g=0.15):
    t = sec(d)
    f = lo * (hi / lo) ** (t / d) ** 1.6
    s = np.zeros_like(t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    for n in (1, 2, 3):
        s += np.sin(n * ph) / n
    s += bp(noise(d), 1000, 8000) * (t / d) ** 2 * 0.4
    return s * (t / d) ** 2 * g


def tape_rewind(d, g=0.35):
    t = sec(d)
    # warbling chipmunk chirps + motor whine
    c = 1800 + 1400 * np.sin(2 * np.pi * 9 * t) * np.sin(2 * np.pi * 0.7 * t)
    x = noise(d)
    out = np.zeros_like(x)
    seg = 40
    L = len(x) // seg
    for k in range(seg):
        cc = max(300, c[k * L])
        out[k * L : (k + 1) * L] = bp(x, cc * 0.8, cc * 1.25)[k * L : (k + 1) * L]
    whine = np.sin(2 * np.pi * np.cumsum(600 + 900 * t / d) / SR) * 0.12
    e = np.sin(np.pi * t / d) ** 0.6
    return (out * 0.8 + whine) * e * g


# =========================================================================== ambience
amb = lp(np.cumsum(rng.standard_normal(N)) * 0.002, 300)
amb = amb - lp(amb, 20)
hum = 0.004 * np.sin(2 * np.pi * 55 * np.arange(N) / SR)
city = (amb * 0.6 + hum) * 0.6
amb_env = np.ones(N)
# thinner, colder when the fake friend walks away
tt = np.arange(N) / SR
amb_env *= 1 - 0.4 * np.clip((tt - F(300)) / 1.0, 0, 1) * (tt < F(OUT["rw1"]))
dry[0] += city * amb_env
dry[1] += np.roll(city, 777) * amb_env
for k in range(6):
    t0 = rng.uniform(1, DUR - 3)
    sfx(whoosh(3.0, 150, 600, g=0.03), t0, pan=rng.uniform(-0.8, 0.8), rv=0.6)

# =========================================================================== events
events = EV["events"]
evs = {}
for e in events:
    evs.setdefault(e["name"], []).append(e)


def first(name, after=0):
    return next(e for e in evs[name] if e["f"] >= after)


# ---- car: engine + wet tyre hiss with doppler, panned L -> R (normal acts) -------------------
def car_pass(t_splash, rate=1.0, pre=2.4, post=1.8, g=0.6):
    d = pre + post
    t = sec(d)
    tc = t - pre
    dist = np.sqrt((tc * 18) ** 2 + 4.0)
    amp = 6.0 / dist
    dop = 1 + 0.09 * np.tanh(-tc * 2.2)
    f0 = 52 * dop
    ph = 2 * np.pi * np.cumsum(f0) / SR
    eng = sum(np.sin(n * ph + n) / n for n in range(1, 9))
    eng = lp(eng, 900)
    hiss = bp(noise(d), 900, 7000)
    bright = np.clip(amp / 3, 0, 1)
    hiss = lp(hiss, 2500) * (1 - bright) + hiss * bright
    sig = (eng * 0.35 + hiss * 0.8) * amp
    pan = np.tanh(tc * 1.6)
    sig = resample(sig, rate)
    pan = resample(pan, rate)
    t0 = t_splash - pre / rate
    i = int(t0 * SR)
    for ch, w in ((0, np.cos((pan + 1) * np.pi / 4)), (1, np.sin((pan + 1) * np.pi / 4))):
        a = max(0, -i)
        seg = (sig * w)[a:]
        j = max(0, i)
        seg = seg[: N - j]
        dry[ch, j : j + len(seg)] += seg * g


for e in evs["splash"]:
    t = F(e["f"])
    r = e["rate"]
    car_pass(t, rate=r if r < 0.9 else 1.0, g=0.9)
    sp = resample(splash(1.2), r) if r < 0.9 else splash(1.2)
    sfx(sp, t, 1.5, 0.15, 0.25)
    sfx(resample(thump(40, 0.8, 0.2), r if r < 0.9 else 1), t, 0.6)
for e in evs["hit"]:
    t = F(e["f"])
    r = e["rate"]
    for k in range(4):
        s = squelch(0.7, 0.12 + 0.05 * k)
        sfx(resample(s, r) if r < 0.9 else s, t + k * 0.05 / max(r, 0.3), 0.7, 0.3, 0.2)
    if r >= 0.9:
        sfx(droplets(1.8, 40, 300, 1600, 0.3), t + 0.2, 0.6, 0.3, 0.3)

for e in evs["flinch"]:
    if e["rate"] >= 0.9:
        sfx(whoosh(0.25, 600, 2500, g=0.3), F(e["f"]), 0.6, -0.2)
for e in evs.get("shock", []):
    pass

# footsteps
for e in evs["step"]:
    sfx(step(e.get("muddy", False), 0.35 * e.get("gain", 1)), F(e["f"]), 1.0, e["pan"] * 0.6, 0.12)

# drips (soft plops after the splash, while B stands dripping)
for a, b, rate in ((F(150), F(OUT["rw1"]), 2.2), (F(472), F(OUT["end"]), 1.6)):
    t = a
    while t < b:
        t += rng.exponential(1 / rate)
        sfx(droplets(0.08, 1, 700, 1500, 0.5), t, 0.35, 0.25, 0.4)

# laughs — A ("ha"), B, both
for e in evs.get("laughA", []):
    sfx(ha(205 + rng.uniform(-8, 8), 0.17, 0.55), F(e["f"]) - 0.03, 1.0, -0.15, 0.15)
for e in evs.get("laughB", []):
    sfx(ha(245 + rng.uniform(-8, 8), 0.15, 0.45, "e"), F(e["f"]) - 0.03, 1.0, 0.15, 0.15)
for e in evs.get("laughBoth", []):
    late = e["f"] > OUT["end"] + 20
    g = 0.32 if late else 0.5
    sfx(ha(205 + rng.uniform(-8, 8), 0.16, g), F(e["f"]) - 0.03, 1.0, -0.15, 0.2)
    sfx(ha(245 + rng.uniform(-8, 8), 0.15, g * 0.85, "e"), F(e["f"]) + 0.04, 1.0, 0.15, 0.2)

# poke / rub / smirk
e = first("poke")
sfx(squelch(0.6, 0.1), F(e["f"]), 0.8, 0.1)
sfx(np.sin(2 * np.pi * 880 * sec(0.08)) * env(int(0.08 * SR), 0.001, 0.02) * 0.2, F(e["f"]), 1.0)
for e in evs["rub"]:
    sfx(bp(noise(0.09), 300, 1400) * np.sin(np.pi * sec(0.09) / 0.09) * 0.4, F(e["f"]), 0.7, 0.1)

# real: the turn
e = first("stop")
sfx(lp(noise(0.5), 400) * env(int(0.5 * SR), 0.01, 0.15) * 0.3, F(e["f"]), 0.6)
for k, e in enumerate([first("decide")]):
    sfx(heartbeat(0.9), F(e["f"]), 1.0, 0, 0.2)
    sfx(heartbeat(0.7), F(e["f"]) + 0.85, 1.0, 0, 0.2)
e = first("breath")
sfx(bp(noise(0.55), 700, 3500) * np.sin(np.pi * sec(0.55) / 0.55) ** 2 * 0.35, F(e["f"]), 0.6, -0.1, 0.2)
e = first("takeoff")
sfx(whoosh(0.6, 300, 3000, g=0.5), F(e["f"]) - 0.1, 0.8, -0.1)
sfx(step(False, 0.6), F(e["f"]) - 0.05, 1.0, -0.1)
# slow-motion: dilated heartbeat + time-stretch riser into impact
t_land = F(first("land")["f"])
sfx(resample(heartbeat(1.0), 0.6), F(OUT["slowA"]) + 0.1, 0.9)
sfx(resample(whoosh(0.9, 200, 1800, g=0.5), 0.4), F(OUT["slowA"]), 0.8, 0, 0.4)
sfx(riser(t_land - F(OUT["slowA"]) + 0.05, 120, 900, 0.18), F(OUT["slowA"]), 1.0, 0, 0.5)
sfx(resample(splash(1.6), 0.55), t_land, 1.6, 0, 0.35)
sfx(thump(34, 1.6, 0.3), t_land, 0.9)
for e in evs["flap"]:
    sfx(squelch(0.55, 0.18), F(e["f"]), 0.8, -0.1, 0.2)
e = first("grab")
sfx(squelch(0.8, 0.1), F(e["f"]), 0.8)
e = first("pull")
sfx(squelch(0.7, 0.3), F(e["f"]), 0.8)
sfx(whoosh(0.4, 200, 900, g=0.3), F(e["f"]), 0.6)
e = first("cheek")
sfx(squelch(0.5, 0.09), F(e["f"]), 0.7, 0.05)

# rewinds
sfx(tape_rewind(F(14) + 0.05), F(46), 0.6, 0, 0.1)
sfx(tape_rewind(F(30) + 0.05), F(OUT["rw1"]), 0.6, 0, 0.1)
sfx(thump(70, 0.2, 0.6) * 0.5, F(OUT["act2"]) - 0.02, 0.6)
sfx(thump(70, 0.2, 0.6) * 0.5, F(OUT["hookEnd"]) - 0.02, 0.6)

# =========================================================================== SCORE
BPM = 84
beat = 60 / BPM
# Theme A — warm, a little wistful: Am9 – Fmaj7 (the walk, twice: same night, same friends)
for start, stop in ((F(OUT["hookEnd"]), F(131)), (F(OUT["act2"]), F(451))):
    t = start
    k = 0
    seq = [[45, 57, 60, 64, 71], [41, 53, 57, 60, 64], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67]]
    while t < stop - 0.2:
        ch = seq[k % 4]
        chord(ch, t, 0.42, min(3.0, stop - t + 0.6), 0.03, 0.9, 0.4, 0.8)
        mus(pad(ch[1:], min(beat * 4, stop - t) + 0.6, 0.5, 0.6, 900, 0.05), t, 0.8, 0, 0.5)
        # little melodic answer
        mel = [76, 74, 72, 71][k % 4]
        mus(piano(midi(mel), 1.4, 0.3), t + beat * 2, 0.7, 0.2, 0.5)
        t += beat * 4 * 0.5
        k += 1
# Hook: a single low, suspended tension tone under the slowed spray
mus(pad([33, 40, 47], F(46) + 0.4, 0.15, 0.3, 500, 0.12), 0.0, 1.0, 0, 0.6)
mus(bell(midi(76), 3.0, 0.12), F(8), 0.8, 0.3, 0.7)

# FAKE: mocking pizzicato on each laugh beat (descending, chromatic, sly)
pz = [76, 75, 74, 73, 72, 71, 70, 69, 68, 67]
for k, e in enumerate(evs.get("laughA", [])):
    if e["f"] < OUT["rw1"]:
        mus(pluck(midi(pz[k % len(pz)]), 0.35, 0.993, 0.35), F(e["f"]), 0.6, 0.25, 0.3)
        if k % 2 == 0:
            mus(pluck(midi(pz[k % len(pz)] - 12), 0.4, 0.99, 0.35), F(e["f"]), 0.5, -0.25, 0.3)
# poke -> smirk: cold drone creeping in, then a sour cluster on the smirk
t_poke = F(first("poke")["f"])
t_smirk = F(first("smirk")["f"])
mus(pad([38, 39, 45], t_smirk - t_poke + 1.0, 1.2, 0.8, 600, 0.1), t_poke - 0.3, 0.45, 0, 0.6)
mus(whoosh(0.6, 3000, 200, rev=True, g=0.25), t_smirk - 0.6, 1.0, 0, 0.5)
chord([38, 50, 53, 56, 61], t_smirk, 0.6, 3.5, 0.0, 0.45, 0.6, 0.7)
mus(thump(42, 1.0, 0.1), t_smirk, 0.6)
# alone: sparse, cold, high piano + thin pad, long tail into the rewind
t_al = F(first("leave")["f"]) + 0.3
for k, (m, dt) in enumerate(((69, 0), (64, 0.9), (60, 1.8), (62, 2.9))):
    mus(piano(midi(m), 3.0, 0.32, 0.6), t_al + dt, 0.9, 0.2 - 0.15 * k, 0.8)
mus(pad([45, 52, 57], F(OUT["rw1"]) - t_al + 0.6, 1.0, 0.7, 700, 0.06), t_al, 0.6, 0, 0.8)

# REAL: laugh pizz (short), then the music drops out when he sees his friend's face
for k, e in enumerate([e for e in evs.get("laughA", []) if e["f"] > OUT["act2"]]):
    mus(pluck(midi([72, 74, 76, 79][k % 4]), 0.3, 0.993, 0.3), F(e["f"]), 0.5, 0.2, 0.3)
t_nod = F(first("nod")["f"])
mus(piano(midi(64), 3.0, 0.38), t_nod, 0.9, 0, 0.7)
mus(piano(midi(67), 3.0, 0.3), t_nod + 0.45, 0.8, 0.1, 0.7)
mus(pad([48, 55, 60, 64], t_land - t_nod + 0.2, 1.6, 0.05, 1200, 0.09), t_nod, 1.0, 0, 0.6)

# IMPACT -> joy. C – G/B – Am – F, 96 BPM, piano + strings + light groove
BPM2 = 96
b2 = 60 / BPM2
seq2 = [[36, 48, 55, 60, 64, 67], [35, 47, 55, 59, 62, 67], [33, 45, 57, 60, 64, 69], [29, 41, 57, 60, 65, 69]]
t_end = DUR - 0.2
t = t_land
bar = 0
mus(bell(midi(84), 4.0, 0.12), t_land, 0.8, 0, 0.7)
while t < F(OUT["end"] + 112) - 0.1:
    ch = seq2[bar % 4]
    chord(ch[1:], t, 0.5, b2 * 4 + 0.8, 0.012, 0.9, 0.35)
    mus(pad(ch[1:], b2 * 4 + 1.0, 0.25 if bar else 0.02, 1.0, 1800, 0.08, vib=1.0), t, 0.8, 0, 0.5)
    mus(piano(midi(ch[0]), 2.5, 0.6, 0.5), t, 0.9, 0, 0.2)
    melody = [[79, 76, 74, 72], [74, 76, 79, 81], [81, 79, 76, 74], [76, 77, 76, 72]][bar % 4]
    for i, m in enumerate(melody):
        mus(piano(midi(m), 1.6, 0.32), t + i * b2, 0.75, 0.25, 0.45)
    for i in range(8):
        tb = t + i * b2 / 2
        if bar == 0 and i < 2:
            continue
        if i % 4 == 0:
            mus(kick(0.5), tb, 0.8, 0, 0.05)
        if i % 4 == 2:
            mus(clap(0.25), tb, 0.6, 0.1, 0.35)
        mus(shaker(0.12 if i % 2 else 0.07), tb + 0.01, 1.0, 0.35, 0.1)
    t += b2 * 4
    bar += 1
# resolution under the final line: big, warm, sustained, then the last bell
t_fin = F(OUT["end"] + 112)
chord([36, 48, 55, 60, 64, 67, 72, 76], t_fin, 0.55, 5.0, 0.04, 1.0, 0.55)
mus(pad([48, 55, 60, 64, 67], t_end - t_fin, 0.8, 1.6, 2000, 0.11, vib=1.0), t_fin, 1.0, 0, 0.6)
mus(bell(midi(79), 5.0, 0.12), t_fin + 0.6, 1.0, 0.2, 0.8)
mus(bell(midi(84), 5.0, 0.09), t_fin + 1.2, 1.0, -0.2, 0.8)

# =========================================================================== mix
def reverb_ir(d=2.6, decay=0.9, seed=3):
    r = np.random.default_rng(seed)
    t = sec(d)
    ir = np.stack([r.standard_normal(len(t)), r.standard_normal(len(t))]) * np.exp(-t / decay)
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return np.stack([lp(ir[0], 6000), lp(ir[1], 6000)]) * 0.06


ir = reverb_ir()
wet = np.stack([fftconvolve(verb[c], ir[c])[:N] for c in (0, 1)])
mwet = np.stack([fftconvolve(mverb[c], ir[c])[:N] for c in (0, 1)])

# score ducks under the big SFX moments, and cuts to silence on the hits (silence is a cue too)
duck = np.ones(N)
for tt0, depth, ln in ((F(132), 0.0, 1.3), (F(452), 0.0, 1.3), (F(OUT["rw1"]), 0.5, 1.0)):
    i0, i1 = int(tt0 * SR), int((tt0 + ln) * SR)
    duck[i0:i1] = np.minimum(duck[i0:i1], depth)
# music silent between "stop" and "nod" (the beat where the friend decides)
i0, i1 = int(F(first("stop")["f"]) * SR), int((t_nod - 0.05) * SR)
duck[i0:i1] = 0
duck = lp(duck, 8)

mix = dry + wet + (music + mwet) * duck * 0.9
mix = hp(mix, 25)
fade = np.ones(N)
fo = int((DUR - 1.0) * SR)
fade[fo:] = np.linspace(1, 0, N - fo).clip(0, 1)
fade[int(DUR * SR):] = 0
mix *= fade
mix = mix[:, : int(DUR * SR)]
peak = np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.9

raw = os.path.join(HERE, "soundtrack_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())

dst = os.path.join(ROOT, "public", "audio", "soundtrack.wav")
os.makedirs(os.path.dirname(dst), exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.0:LRA=11", "-ar", "48000", "-c:a", "pcm_s16le", dst], check=True)
os.remove(raw)
print("wrote", dst)
