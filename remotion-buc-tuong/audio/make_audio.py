"""
Original score + sound design for "Bức tường", synthesised from scratch with NumPy/SciPy.
No samples, no third-party recordings -> fully owned, safe for commercial use.

Every cue is driven by audio/events.json (exported from the scene logic by
scripts/export-events.ts), so each sound lands on the exact frame of its motion.

Run:  python3 audio/make_audio.py  ->  public/audio/soundtrack.wav (48 kHz, 16-bit stereo)
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
DUR = EV["DURATION"] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(11)

dry = np.zeros((2, N))
verb = np.zeros((2, N))
music = np.zeros((2, N))


def fr(f):
    return f / FPS


def sec(d):
    return np.arange(int(d * SR)) / SR


def flt(x, kind, hz, order=2):
    return sosfilt(butter(order, hz, btype=kind, fs=SR, output="sos"), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def place(sig, t, gain=1.0, pan=0.0, rv=0.0, bus=None):
    bus = dry if bus is None else bus
    i = int(t * SR)
    if i >= N:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: N - i]
    l = np.cos((np.clip(pan, -1, 1) + 1) * np.pi / 4) * gain
    r = np.sin((np.clip(pan, -1, 1) + 1) * np.pi / 4) * gain
    bus[0, i : i + len(sig)] += sig * l
    bus[1, i : i + len(sig)] += sig * r
    if rv:
        verb[0, i : i + len(sig)] += sig * l * rv
        verb[1, i : i + len(sig)] += sig * r * rv


def curve(arr):
    """Per-frame curve -> per-sample envelope."""
    x = np.arange(len(arr)) / FPS
    return np.interp(np.arange(N) / SR, x, arr)


# ------------------------------------------------------------------ atoms
def thud(d=0.4, f0=70, click=0.3, decay=0.09):
    t = sec(d)
    f = f0 * (1 + 1.2 * np.exp(-t / 0.015))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    n = flt(noise(d), "low", 1800) * np.exp(-t / 0.02) * click
    return body + n


def stone(d=0.5, f0=95, bright=2600):
    """Brick on brick: pitched knock + gritty tail."""
    t = sec(d)
    knock = thud(d, f0, 0.5, 0.06)
    grit = flt(noise(d), "band", [500, bright]) * np.exp(-t / 0.035) * 0.6
    ring = np.sin(2 * np.pi * f0 * 4.1 * t) * np.exp(-t / 0.05) * 0.12
    return knock + grit + ring


def boom(d=3.5, hi=110, lo=30):
    t = sec(d)
    f = lo + (hi - lo) * np.exp(-t / 0.15)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.0)
    s += flt(noise(d), "low", 260) * np.exp(-t / 0.2) * 0.8
    return np.tanh(s * 1.8) * 0.85


def whoosh(d=0.5, lo=400, hi=2500):
    x = noise(d)
    t = np.linspace(0, 1, len(x))
    out = np.zeros_like(x)
    seg = 10
    L = len(x) // seg
    for s in range(seg):
        c = lo + (hi - lo) * (s / seg)
        out[s * L : (s + 1) * L] = flt(x, "band", [c * 0.7, min(c * 1.5, 20000)])[s * L : (s + 1) * L]
    return out * np.sin(np.pi * t) ** 2


def sizzle(d=0.6):
    t = sec(d)
    x = flt(noise(d), "high", 3500) * (0.4 + 0.6 * (rng.random(len(t)) > 0.7))
    return x * np.exp(-t / (d / 3)) * np.minimum(1, t / 0.01)


def growl(d, f0, intensity):
    """Wordless angry outburst: detuned buzzy formant blast (no human voice)."""
    t = sec(d)
    vib = 1 + 0.03 * np.sin(2 * np.pi * 7 * t)
    glide = 1 + 0.25 * np.exp(-t / 0.08) - 0.12 * t / d
    ph = 2 * np.pi * np.cumsum(f0 * vib * glide) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 18))
    saw2 = sum(np.sin(k * ph * 1.013) / k for k in range(1, 18))
    src = (saw + saw2) * 0.5 + flt(noise(d), "band", [600, 3000]) * 0.4
    form = flt(src, "band", [500, 1100]) * 1.0 + flt(src, "band", [1400, 2600]) * 0.6 + flt(src, "low", 300) * 0.5
    env = np.minimum(1, t / 0.02) * np.exp(-t / (d * 0.45))
    return np.tanh(form * env * (1.5 + 2.5 * intensity)) * 0.6


def note(freq, d=3.0, vel=1.0, bright=1.0):
    """Soft felt-piano voice from inharmonic partials."""
    t = sec(d)
    out = np.zeros_like(t)
    for k in range(1, 9):
        fk = freq * k * np.sqrt(1 + 0.0004 * k * k)
        out += np.sin(2 * np.pi * fk * t + rng.random()) * (bright ** (k - 1)) / k ** 1.4 * np.exp(-t * (0.6 + 0.55 * k))
    hammer = flt(noise(0.03), "band", [800, 4000]) * 0.05
    out[: len(hammer)] += hammer
    return out * np.minimum(1, t / 0.004) * vel * 0.5


def pad(freqs, d, att=1.5, rel=2.0, cutoff=1800):
    t = sec(d)
    out = np.zeros_like(t)
    for fq in freqs:
        for det in (-0.12, 0.0, 0.11):
            ph = 2 * np.pi * fq * (1 + det / 100) * t + rng.random() * 6
            out += sum(np.sin(k * ph) / k for k in range(1, 7)) * 0.18
    out = flt(out, "low", cutoff)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel).clip(0, 1)
    return out * env / len(freqs)


def chime(freq, d=4.0):
    t = sec(d)
    out = np.zeros_like(t)
    for k, a in ((1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12)):
        out += np.sin(2 * np.pi * freq * k * t) * a * np.exp(-t * (0.7 + k * 0.5))
    return out * 0.4


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


heat = curve(EV["heat"])
warm = curve(EV["warmth"])
ts = np.arange(N) / SR
events = EV["events"]

# ------------------------------------------------------------------ fire bed (roar + crackle), follows the on-screen heat
roar = flt(noise(DUR), "band", [60, 700]) * 0.5 + flt(noise(DUR), "band", [700, 2500]) * 0.12
crk = np.zeros(N)
for _ in range(int(DUR * 55)):
    i = rng.integers(0, N - 2000)
    g = rng.standard_normal(int(0.004 * SR)) * np.exp(-np.arange(int(0.004 * SR)) / (0.0007 * SR)) * rng.uniform(0.2, 1.4)
    crk[i : i + len(g)] += g
crk = flt(crk, "band", [900, 7000])
fire = (roar * 0.55 + crk * 0.7) * np.clip(heat, 0, 1.2) ** 1.3
dry[0] += fire * 0.32
dry[1] += np.roll(fire, 900) * 0.32

# ------------------------------------------------------------------ argument: shouts, words, bricks
for e in events:
    t = fr(e["f"])
    if e["t"] == "shout":
        k = e["i"] / 13
        pitch = (118 if e["who"] == "A" else 96) * (1 + 0.22 * k)
        place(growl(0.42 + 0.1 * k, pitch, 0.4 + 0.6 * k), t - 0.03, 0.42 + 0.25 * k, e["pan"], 0.25)
        place(thud(0.6, 50, 0.1, 0.2), t, 0.5 + 0.35 * k, 0, 0.1, bus=music)  # war-drum on every outburst
        place(whoosh(0.35, 300, 1800), t - 0.06, 0.18, e["pan"])
    elif e["t"] == "launch":
        place(sizzle(0.25), t, 0.09, e["pan"])
        place(whoosh(0.3, 600, 3200), t, 0.13, e["pan"] * 0.5)
    elif e["t"] == "land":
        if e["seal"]:
            place(boom(4.0, 120, 28), t, 1.0, 0, 0.6)
            place(stone(0.8, 70), t, 0.9, 0, 0.5)
        elif e["hook"]:
            place(boom(2.2, 100, 34), t, 0.85, 0, 0.45)
            place(stone(0.7, 80), t, 0.9, 0, 0.3)
            place(sizzle(1.4), t + 0.02, 0.22, 0)
        else:
            f0 = 120 + e["row"] * 9 + rng.uniform(-8, 8)
            place(stone(0.45, f0), t, 0.42 + 0.02 * e["row"], e["pan"], 0.15)
            place(sizzle(0.5), t + 0.02, 0.05, e["pan"])

# Tension: rising drone + accelerating pulse from the reveal to the sealing brick
a, b = fr(T["wide"]) - 1.5, fr(T["seal"])
d = b - a
tt = sec(d)
prog = tt / d
ph = 2 * np.pi * np.cumsum(55 * (1 + 0.5 * prog ** 2)) / SR
drone = (np.sin(ph) + 0.5 * np.sin(2 * ph + 0.3) + 0.3 * np.sin(3.01 * ph)) * (0.15 + 0.85 * prog ** 1.5)
riser = flt(noise(d), "band", [800, 6000]) * prog ** 3 * 0.25
place((drone * 0.22 + riser) * np.minimum(1, tt / 1.0), a, 1.0, 0, 0.2, bus=music)
# hook: a single deep pulse before the first word
place(thud(1.2, 38, 0.0, 0.5), 0.0, 0.7, 0, 0.3, bus=music)

# ------------------------------------------------------------------ silence after the seal: lonely piano + heartbeat
seal = fr(T["seal"])
lonely = [(T["seal"] + 40, 69, 0.55), (T["seal"] + 58, 72, 0.4), (T["seal"] + 78, 76, 0.45), (T["turnBack"] - 28, 74, 0.4),
          (T["turnBack"] - 6, 71, 0.38), (T["turnBack"] + 22, 69, 0.45), (T["handsOnWall"], 64, 0.5)]
for f, m, v in lonely:
    place(note(mtof(m), 4.0, v, 0.55), fr(f), 0.5, (m - 70) / 14, 0.55, bus=music)
place(pad([mtof(45), mtof(52), mtof(57), mtof(60)], fr(T["pushA"]) - seal - 0.6, 3.0, 2.5, 900), seal + 0.6, 0.35, 0, 0.3, bus=music)
for k, f in enumerate(range(T["turnBack"] - 30, T["touch"], 26)):
    place(thud(0.3, 46, 0.05, 0.07), fr(f), 0.28 + 0.01 * k, 0, 0.05)
    place(thud(0.25, 42, 0.03, 0.06), fr(f) + 0.17, 0.18 + 0.01 * k, 0, 0.05)

# ------------------------------------------------------------------ the hole, the touch, the fall of the wall
for e in events:
    t = fr(e["f"])
    if e["t"] == "step":
        place(thud(0.12, 140, 0.4, 0.02) * 0.6, t, 0.25, e["pan"], 0.1)
    elif e["t"] == "push":
        dd = fr(T["pushEnd"] - T["pushA"]) + 0.2
        scr = flt(noise(dd), "band", [180, 1400]) * (0.5 + 0.5 * (rng.random(int(dd * SR)) > 0.92))
        place(scr * np.sin(np.pi * np.linspace(0, 1, len(scr))) ** 0.5, t, 0.5, 0.2, 0.25)
    elif e["t"] == "brickHit":
        place(stone(0.45, rng.uniform(90, 150)), t, 0.7 * e["gain"] / (1 + e["k"]), e["pan"], 0.25)
    elif e["t"] == "loosen":
        place(flt(noise(0.12), "band", [300, 2500]) * np.exp(-sec(0.12) / 0.03), t, 0.12, e["pan"], 0.2)

# light through the hole: rising shimmer
hs = fr(T["pushEnd"]) - 0.2
hd = fr(T["touch"]) - hs
tt = sec(hd)
sh = sum(np.sin(2 * np.pi * mtof(m) * tt + i) for i, m in enumerate([84, 88, 91, 96])) * (tt / hd) ** 2 * 0.05
place(sh * (1 + 0.3 * np.sin(2 * np.pi * 5 * tt)), hs, 1.0, 0, 0.6, bus=music)

# the touch: bright bell + sub swell; cracks of light
tc = fr(T["touch"])
for i, m in enumerate([72, 76, 79, 84]):
    place(chime(mtof(m), 5.0), tc + i * 0.012, 0.35, (i - 1.5) * 0.3, 0.8, bus=music)
place(boom(3.0, 70, 32) * 0.5, tc, 0.5, 0, 0.4)
for k in range(26):
    tk = tc + 0.05 + k * 0.022 + rng.uniform(0, 0.02)
    g = flt(noise(0.03), "band", [2500, 9000]) * np.exp(-sec(0.03) / 0.006)
    place(g, tk, 0.12 + 0.01 * k, rng.uniform(-0.7, 0.7), 0.4)
# collapse rumble
tco = fr(T["collapse"])
place(flt(noise(2.6), "low", 200) * np.exp(-sec(2.6) / 0.9) * np.minimum(1, sec(2.6) / 0.1), tco + 0.1, 0.9, 0, 0.3)

# ------------------------------------------------------------------ reconciliation: warm major progression
prog_chords = [
    (T["touch"], [48, 55, 60, 64, 67]),  # C
    (T["collapse"] + 30, [41, 53, 57, 60, 65]),  # F
    (T["stepIn"], [43, 55, 59, 62, 67]),  # G
    (T["hug"], [48, 55, 60, 64, 67, 72]),  # C
    (T["end2"], [41, 53, 57, 60, 64, 69]),  # Fmaj7
]
for i, (f, ch) in enumerate(prog_chords):
    end = prog_chords[i + 1][0] + 20 if i + 1 < len(prog_chords) else EV["DURATION"]
    place(pad([mtof(m) for m in ch], fr(end - f) + 1.0, 1.2, 1.6, 2400), fr(f) - 0.3, 0.55, 0, 0.45, bus=music)
melody = [(T["collapse"] + 30, 76), (T["collapse"] + 48, 79), (T["joinDown"], 84), (T["stepIn"], 83), (T["stepIn"] + 18, 79),
          (T["hug"], 84), (T["end1"], 72), (T["end1"] + 14, 76), (T["end2"], 77), (T["end2"] + 14, 76), (T["end2"] + 28, 72)]
for f, m in melody:
    place(note(mtof(m), 4.5, 0.55, 0.6), fr(f), 0.55, (m - 78) / 12, 0.6, bus=music)
place(note(mtof(36), 6.0, 0.8, 0.4), fr(T["end2"] + 28), 0.5, 0, 0.5, bus=music)
# hug swell
place(flt(noise(2.0), "band", [2000, 9000]) * np.sin(np.pi * np.linspace(0, 1, int(2 * SR))) ** 2, fr(T["hug"]) - 1.4, 0.05, 0, 0.6)

# ------------------------------------------------------------------ reverb (synthetic hall) + master
ir_t = sec(2.8)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t / 0.7)
ir[:, : int(0.012 * SR)] = 0
ir = np.stack([flt(ir[0], "low", 6000), flt(ir[1], "low", 6000)])
verb_all = verb + music * 0.35
wet = np.stack([fftconvolve(verb_all[c], ir[c])[:N] for c in range(2)]) * 0.12

mix = dry + music + wet
mix = np.stack([flt(mix[c], "high", 28) for c in range(2)])
# fades
mix *= np.clip(ts / 0.05, 0, 1) * np.clip((DUR - ts) / 1.2, 0, 1)
# soft-knee limiter
peak = np.max(np.abs(mix))
mix = mix / peak * 1.4
mix = np.tanh(mix) / np.tanh(1.4) * 0.89

out = os.path.join(HERE, "..", "public", "audio", "soundtrack.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", out, f"{DUR:.2f}s")
