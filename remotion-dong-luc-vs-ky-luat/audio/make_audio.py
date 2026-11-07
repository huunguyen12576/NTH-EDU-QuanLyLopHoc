"""
Original score + sound design, synthesised from scratch (no samples, no third-party
recordings) -> 100% owned, safe for commercial use.

Every cue is driven by audio/events.json, exported from the scene logic, so sound
lands on the exact frame of the motion it belongs to.

Run:  python3 audio/make_audio.py   ->  public/audio/soundtrack.wav (48 kHz, 24-bit stereo)
"""
import json
import os
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
EV = json.load(open(os.path.join(HERE, "events.json")))
FPS = EV["FPS"]
T = EV["T"]
SR = 48000
DUR = EV["DURATION"] / FPS + 0.0
N = int(DUR * SR)
rng = np.random.default_rng(7)

dry = np.zeros((2, N))
verb_send = np.zeros((2, N))


def fr(f):
    return f / FPS


def sec(n):
    return np.arange(int(n * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, btype="low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, btype="high", fs=SR, output="sos"), x)


def place(sig, t, gain=1.0, pan=0.0, verb=0.0):
    """Add mono sig at time t (seconds) with equal-power pan."""
    i = int(t * SR)
    if i >= N:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    dry[0, i : i + len(sig)] += sig * l
    dry[1, i : i + len(sig)] += sig * r
    if verb:
        verb_send[0, i : i + len(sig)] += sig * l * verb
        verb_send[1, i : i + len(sig)] += sig * r * verb


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def noise(d):
    return rng.standard_normal(int(d * SR))


# ------------------------------------------------------------------ sound atoms
def thud(d=0.35, f0=62, click=0.25):
    t = sec(d)
    f = f0 * (1 + 0.8 * np.exp(-t / 0.02))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    n = lp(noise(d), 900) * np.exp(-t / 0.025) * click
    return body + n


def boom(d=3.0, f_hi=95, f_lo=28):
    t = sec(d)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    s += lp(noise(d), 300) * np.exp(-t / 0.12) * 0.6
    return np.tanh(s * 1.6) * 0.8


def crumble(d=0.9, density=90, bright=3500):
    """Granular stone crumble: many tiny clicks, thinning out."""
    out = np.zeros(int(d * SR))
    k = int(density * d)
    for _ in range(k):
        t0 = rng.exponential(d / 4)
        if t0 >= d - 0.03:
            continue
        g = noise(0.012) * np.exp(-np.arange(int(0.012 * SR)) / (0.002 * SR)) * rng.uniform(0.2, 1)
        i = int(t0 * SR)
        out[i : i + len(g)] += g[: len(out) - i]
    out = bp(out, 300, bright)
    rumble = lp(noise(d), 160) * env(int(d * SR), 0.01, d / 3) * 2.5
    return out + rumble


def whoosh(d=0.9, lo=300, hi=3000, rev=False):
    x = noise(d)
    t = np.linspace(0, 1, len(x))
    shape = np.sin(np.pi * t) ** 2
    out = np.zeros_like(x)
    seg = 8
    L = len(x) // seg
    for s in range(seg):
        c = lo + (hi - lo) * (s / seg if not rev else 1 - s / seg)
        out[s * L : (s + 1) * L] = bp(x, c * 0.7, min(c * 1.4, SR / 2 - 100))[s * L : (s + 1) * L]
    return out * shape * 0.8


def rip(d=0.42):
    x = hp(noise(d), 1500)
    t = sec(d)
    am = (np.sin(2 * np.pi * (90 + 160 * t) * t) > 0.2).astype(float) * 0.7 + 0.3
    return x * am * np.exp(-t / 0.16) * np.minimum(1, t / 0.01)


def heartbeat():
    return thud(0.3, 48, 0.05) + np.concatenate([np.zeros(int(0.16 * SR)), thud(0.3, 44, 0.03) * 0.7])[: int(0.3 * SR)]


def note(freq, d=3.0, bright=1.0):
    """Felt-piano-ish tone: inharmonic partials + soft hammer."""
    t = sec(d)
    s = np.zeros_like(t)
    for h, a in [(1, 1.0), (2, 0.45 * bright), (3, 0.22 * bright), (4, 0.12 * bright), (5, 0.06 * bright)]:
        fh = freq * h * (1 + 0.0004 * h * h)
        s += a * np.sin(2 * np.pi * fh * t) * np.exp(-t * (0.9 + 0.7 * h))
    s += lp(noise(d), 2500) * np.exp(-t / 0.006) * 0.15
    return s * np.minimum(1, t / 0.004) * 0.5


def pad(freqs, d, a=1.2, r=1.5, cutoff=1400):
    t = sec(d)
    s = np.zeros_like(t)
    for fq in freqs:
        for det in (-0.12, 0.0, 0.11):
            ph = rng.uniform(0, 2 * np.pi)
            f = fq * (1 + det / 100)
            # band-limited-ish saw: few harmonics
            for h in range(1, 7):
                s += np.sin(2 * np.pi * f * h * t + ph * h) / h * 0.18
    s = lp(s, cutoff)
    e = np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
    return s * np.clip(e, 0, 1) / len(freqs)


def tick():
    t = sec(0.03)
    return bp(noise(0.03), 3500, 9000) * np.exp(-t / 0.004)


def stone_thunk(big=False):
    d = 1.2 if big else 0.5
    s = thud(d, 70 if big else 95, 0.6) * (1.4 if big else 1.0)
    t = sec(d)
    s += bp(noise(d), 1200, 5000) * np.exp(-t / 0.01) * 0.5
    return s


def riser(d, lo=200, hi=4000):
    t = sec(d)
    f = lo * (hi / lo) ** (t / d)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    s += whoosh(d, lo, hi) * 0.6
    return s * (t / d) ** 2


# ------------------------------------------------------------------ new atoms
def hz(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)


def clank(d=0.6, base=420, bright=1.0):
    """Barbell / plate metal hit: inharmonic partials + click."""
    t = sec(d)
    s = np.zeros_like(t)
    for k, (r, a, dec) in enumerate([(1.0, 1.0, 0.25), (2.76, 0.6, 0.12), (5.4, 0.35 * bright, 0.06), (8.93, 0.2 * bright, 0.04)]):
        s += a * np.sin(2 * np.pi * base * r * (1 + rng.uniform(-0.01, 0.01)) * t) * np.exp(-t / dec)
    s += bp(noise(d), 2000, 9000) * np.exp(-t / 0.004) * 0.6
    return s * 0.5


def tock():
    """The discipline pulse: deep, warm, steady."""
    s = thud(0.45, 52, 0.12) * 1.1
    c = clank(0.3, 180, 0.2)
    s[: len(c)] += 0.15 * c
    return s


def flick():
    """Calendar page."""
    d = 0.06
    t = sec(d)
    return bp(noise(d), 1800, 7000) * np.exp(-t / 0.012)


def cardboard():
    d = 0.4
    t = sec(d)
    return lp(noise(d), 700) * np.exp(-t / 0.05) * 1.2 + thud(d, 110, 0.2) * 0.6


def power_down(d=0.9, f0=900, f1=60):
    t = sec(d)
    f = f1 + (f0 - f1) * np.exp(-t / (d / 4))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    s = np.tanh(s * 2) * np.exp(-t / (d / 2.5))
    return lp(s, 2500) * 0.5


def beep(freq, d=0.12):
    t = sec(d)
    return np.sign(np.sin(2 * np.pi * freq * t)) * 0.3 * np.minimum(1, t / 0.003) * np.exp(-t / (d / 2.5))


def zap(d=0.35):
    """Electric light strike."""
    t = sec(d)
    buzz = np.sign(np.sin(2 * np.pi * 100 * t)) * 0.4 + hp(noise(d), 3000) * 0.6
    return buzz * np.exp(-t / 0.06)


def hype_riser(d=0.6):
    t = sec(d)
    f = 120 * (16 ** (t / d))
    s = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25
    return (s + whoosh(d, 300, 6000) * 0.9) * (t / d) ** 1.5


# ------------------------------------------------------------------ SCORE (D minor -> D major at the lockout)
dReps, mReps = EV["dReps"], EV["mReps"]
glow = np.array(EV["glow"])

# room tone + low drone (the long year)
place(lp(noise(DUR), 180) * 0.12, 0, 1.0)
place(pad([hz(38), hz(45), hz(50)], fr(T["lockout"]) - 0.2, a=2.0, r=0.6, cutoff=420), fr(T["lightsOn"]), 0.5)
place(pad([hz(62), hz(65), hz(69)], fr(T["yearEnd"] - T["revealEnd"]), a=3.0, r=2.0, cutoff=900), fr(T["revealEnd"]), 0.13, verb=0.6)

# HOOK — lights slam on
place(zap(), fr(T["lightsOn"]), 0.5, verb=0.3)
place(boom(3.0, 110, 30), fr(T["lightsOn"]), 1.0, verb=0.4)
place(hype_riser(0.25), fr(T["lightsOn"]) - 0.25, 0.4)
place(zap(0.2) * 0.6, fr(T["revealStart"] + 12), 0.3, pan=0.4, verb=0.3)
place(thud(0.6, 70, 0.5), fr(T["revealStart"] + 12), 0.5, pan=0.4, verb=0.4)

# the motivation fire: roar + crackle, following the glow envelope frame by frame
g_env = np.interp(np.arange(N) / SR, np.arange(len(glow)) / FPS, glow)
roar = lp(noise(DUR), 500) * 0.5 + bp(noise(DUR), 500, 1800) * 0.15
place(roar[:N] * g_env, 0, 0.32)
crack = np.zeros(N)
for _ in range(int(DUR * 70)):
    i = rng.integers(0, N - 600)
    if rng.random() < g_env[i]:
        crack[i : i + 400] += noise(400 / SR) * np.exp(-np.arange(400) / 40) * rng.uniform(0.2, 1)
place(bp(crack, 1200, 7000), 0, 0.22, pan=-0.35)

# motivated: frantic, sloppy clanks — panned left
for r in mReps:
    if r["fail"]:
        place(lp(noise(0.5), 300) * env(int(0.5 * SR), 0.1, 0.2), fr(r["s"]), 0.3, pan=-0.4)  # strain
        continue
    place(clank(0.4, 520 + rng.uniform(-30, 30), 1.2), fr(r["top"]), 0.22, pan=-0.45, verb=0.2)
    place(thud(0.25, 80, 0.4), fr(r["bottom"]), 0.32, pan=-0.45)
    place(whoosh(0.2, 600, 2400), fr(r["s"]) + 0.05, 0.14, pan=-0.45)

for e in EV["episodes"]:
    if e["jump"]:
        place(beep(1320, 0.08), fr(e["on"] - 14), 0.12, pan=-0.4, verb=0.3)  # phone notification
        place(beep(1760, 0.1), fr(e["on"] - 11), 0.1, pan=-0.4, verb=0.3)
        place(hype_riser(0.45), fr(e["on"]) - 0.45, 0.55, pan=-0.3)
        place(boom(1.6, 140, 45), fr(e["on"]), 0.55, pan=-0.3, verb=0.3)
        place(whoosh(0.3, 900, 4000), fr(e["on"] + 6), 0.3, pan=-0.6)  # phone tossed
        place(clank(0.15, 2400, 0.5), fr(e["on"] + 14), 0.12, pan=-0.3)  # lands on bench
    place(power_down(1.0), fr(e["frantic"]), 0.45, pan=-0.35, verb=0.4)
    place(clank(1.4, 300, 0.8), fr(e["rack"]), 0.42, pan=-0.45, verb=0.5)  # bar dropped on hooks
    place(thud(0.6, 60, 0.5), fr(e["seat"] - 4), 0.6, pan=-0.4, verb=0.2)  # body hits bench
for r in EV["resets"]:
    place(beep(330, 0.12), fr(r), 0.2, pan=-0.3, verb=0.3)
    place(beep(247, 0.2), fr(r) + 0.13, 0.2, pan=-0.3, verb=0.3)

# disciplined: the pulse of the film — panned right
for i, r in enumerate(dReps):
    late = r["s"] > T["endDim"]
    place(tock(), fr(r["bottom"]), 0.7 if not late else 0.5, pan=0.3, verb=0.15)
    place(clank(0.5, 640, 0.6), fr(r["top"]), 0.08, pan=0.35, verb=0.3)
    place(lp(noise(0.35), 400) * env(int(0.35 * SR), 0.12, 0.1), fr(r["s"]), 0.12, pan=0.3)  # exhale
for pf in EV["plates"]:
    place(clank(1.6, 260, 1.0), fr(pf + 6), 0.5, pan=0.5, verb=0.5)
    place(thud(0.4, 90, 0.3), fr(pf + 6), 0.4, pan=0.5)

# the year ticks by — pages, denser and quieter as time blurs
last = -10
for fl in EV["flips"]:
    if fl >= T["yearEnd"]:
        continue
    gap = fl - last
    last = fl
    place(flick(), fr(fl) + rng.uniform(0, 0.02), float(np.clip(0.05 + 0.06 * gap, 0.06, 0.35)), pan=rng.uniform(-0.1, 0.1), verb=0.2)
# rising tension under the montage
place(riser(fr(T["yearEnd"] - 200), 80, 1600), fr(200), 0.4, verb=0.4)

# boxes pile up
for b in EV["boxes"]:
    place(cardboard(), fr(b["f"]), 0.5, pan=-0.45, verb=0.2)

# DEC 31 — the calendar lands, the world holds its breath
place(boom(2.5, 90, 35), fr(T["yearEnd"]), 0.7, verb=0.5)
place(thud(0.5, 120, 0.8), fr(T["yearEnd"]), 0.5)
hb = fr(T["liftStart"])
while hb < fr(T["liftDrive"]):
    place(heartbeat(), hb, 0.8)
    hb += 0.48
place(riser(fr(T["lockout"] - T["liftStart"]), 120, 3200), fr(T["liftStart"]), 0.55, verb=0.4)
lk = fr(T["lockout"])
place(boom(4.0, 120, 28), lk, 1.0, verb=0.5)
place(clank(2.5, 220, 1.2), lk, 0.6, pan=0.3, verb=0.8)
for k, n in enumerate([50, 57, 62, 66, 69, 74]):
    place(note(hz(n), 5.0, 0.9), lk + k * 0.03, 0.42, pan=-0.3 + 0.12 * k, verb=1.0)
place(pad([hz(n) for n in [38, 50, 57, 62, 66]], fr(T["newYear"] - T["lockout"]) + 1.0, a=0.05, r=1.2, cutoff=2600), lk, 0.5, verb=0.8)
place(tock(), fr(T["liftEnd"]), 0.7, pan=0.3)

# JAN 1 — the loop
ny = fr(T["newYear"])
place(whoosh(0.5, 3000, 300), ny - 0.3, 0.4)
place(boom(1.8, 160, 50), ny, 0.6, verb=0.4)
place(beep(880, 0.1), ny, 0.15, verb=0.4)
place(beep(440, 0.25), ny + 0.12, 0.15, verb=0.4)
place(pad([hz(38), hz(45), hz(53)], DUR - ny, a=1.5, r=2.0, cutoff=500), ny, 0.45)

# END — words land on notes
e1, e2 = fr(T["end1"]), fr(T["end2"])
place(riser(e1 - fr(T["endDim"]), 150, 2000), fr(T["endDim"]), 0.3, verb=0.6)
place(note(hz(69), 4.0, 0.6), e1, 0.4, verb=1.0)
place(note(hz(65), 4.0, 0.6), e1 + 0.6, 0.35, verb=1.0)
place(boom(3.0, 80, 30), e2, 0.7, verb=0.6)
for k, n in enumerate([38, 50, 57, 62]):
    place(note(hz(n), 5.0, 0.8), e2 + k * 0.06, 0.45, verb=1.0)
place(pad([hz(n) for n in [38, 50, 57, 62, 65, 69]], DUR - e2, a=0.8, r=1.5, cutoff=1800), e2, 0.35, verb=0.8)
place(note(hz(74), 4.0, 1.0), fr(T["d367"]), 0.4, pan=0.3, verb=1.0)
place(beep(1760, 0.06), fr(T["d367"]), 0.08, pan=0.3, verb=0.5)
# ------------------------------------------------------------------ mix
ir_len = int(2.6 * SR)
t = np.arange(ir_len) / SR
ir = np.stack([rng.standard_normal(ir_len) * np.exp(-t / 0.55), rng.standard_normal(ir_len) * np.exp(-t / 0.55)])
ir[:, : int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
ir = np.stack([lp(ir[0], 6000), lp(ir[1], 6000)])
ir /= np.sqrt((ir**2).sum(axis=1, keepdims=True))
wet = np.stack([fftconvolve(verb_send[c], ir[c])[:N] for c in range(2)]) * 0.55

mix = dry + wet
mix = np.stack([hp(mix[c], 22) for c in range(2)])
# glue: gentle soft-clip bus compression
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
# fade tail
fade = int(0.25 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade)
peak = np.max(np.abs(mix))
mix = mix / peak * 0.89  # ~ -1 dBFS

out = os.path.join(HERE, "..", "public", "audio", "soundtrack.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
pcm = (np.clip(mix.T, -1, 1) * (2**23 - 1)).astype(np.int32)
b = pcm.astype("<i4").tobytes()
b24 = bytearray()
raw = np.frombuffer(b, dtype=np.uint8).reshape(-1, 4)[:, :3]
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(3)
    w.setframerate(SR)
    w.writeframes(raw.tobytes())
print("wrote", out, f"{DUR:.2f}s")
