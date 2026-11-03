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


def hz(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)


# ------------------------------------------------------------------ SCORE
beat = EV["BEAT"] / FPS  # 0.5 s, 120 BPM

# Drone of conformity (A minor), Act I-II
place(pad([hz(33), hz(40), hz(45)], fr(T["firstBrick"]) + 0.3, a=0.6, r=0.4, cutoff=500), 0, 0.55)
place(pad([hz(57), hz(60), hz(64)], fr(T["heroStop"]) - 1.0, a=2.5, r=1.5, cutoff=900), 1.0, 0.18, verb=0.5)

# The march: mechanical, perfectly in time — muffled once the hero wakes up
for b in range(0, int(fr(T["staggerEnd"]) / beat) + 1):
    t = b * beat
    if t * FPS > T["staggerEnd"] - 4:
        break
    muffled = t * FPS >= T["heroStop"]
    s = thud(0.3, 58, 0.35) + 0.6 * np.concatenate([np.zeros(int(0.012 * SR)), thud(0.3, 66, 0.3)])[: int(0.3 * SR)]
    if muffled:
        s = lp(s, 220)
    g = 0.42 if not muffled else 0.3
    if t < fr(T["revealStart"]):
        g *= 0.7
    place(s, t, g, pan=0.0, verb=0.15)
    # the clock of time running out (off-beat tick)
    if not muffled:
        place(tick(), t + beat / 2, 0.16, pan=0.35, verb=0.3)

# HOOK — the crack and the drop
for k in range(4):
    place(bp(noise(0.05), 2000, 8000) * np.exp(-sec(0.05) / 0.01), fr(T["hookCrack"] + k * 2.6), 0.25, pan=0.3)
place(crumble(1.4, 140), fr(T["hookDrop"]), 0.7, pan=0.25, verb=0.4)
place(boom(3.2), fr(T["hookDrop"] + 1), 0.95, verb=0.35)
place(whoosh(1.4, 1800, 250), fr(T["hookDrop"] + 2), 0.55, pan=0.3, verb=0.5)

# Reveal swell
place(whoosh(1.2, 200, 2400, rev=False) * np.linspace(0, 1, int(1.2 * SR)), fr(T["revealStart"] - 6), 0.35, verb=0.6)

# Ambient crumbles everywhere (distance-attenuated)
for e in EV["crumbles"]:
    if e["f"] < T["hookDrop"] + 4:
        continue
    g = float(np.clip(1.8 / max(e["dist"], 1.5), 0.05, 0.6))
    if e["f"] > T["endFade"]:
        g *= 0.4
    place(crumble(0.6, 60), fr(e["f"]), g * 0.45, pan=float(np.clip((e["ix"] * 0.6 - 1) / 6, -0.7, 0.7)), verb=0.25)

# Falling bodies
for e in EV["falls"]:
    if abs(e["f"] - T["hookDrop"]) < 5:
        continue
    g = float(np.clip(2.5 / max(e["dist"], 2), 0.08, 0.6))
    place(whoosh(1.0, 1400, 250), fr(e["f"]), g * 0.5, pan=0.3, verb=0.5)

# Captions: soft typing clicks (the reference's typed text, as sound)
for start, text in [(T["text1"], "Họ chờ mọi thứ thật hoàn hảo."), (T["text2"], "Nhưng mặt đất không chờ ai.")]:
    for i, ch in enumerate(text):
        if ch != " ":
            place(tick() * 0.8, fr(start + i * 1.1), 0.07, pan=rng.uniform(-0.2, 0.2))

# AWAKENING — heartbeat, inner focus
hb_t = fr(T["heroStop"])
while hb_t < fr(T["firstBrick"]):
    fast = hb_t > fr(T["push"])
    place(heartbeat(), hb_t, 0.75 if not fast else 0.9, verb=0.1)
    hb_t += 0.86 if not fast else 0.5
place(lp(rip(), 5500), fr(T["heroRip"]), 0.32, pan=-0.05, verb=0.35)
place(lp(noise(0.5), 600) * env(int(0.5 * SR), 0.05, 0.12), fr(T["clothLand"]), 0.35, verb=0.2)
# realisation: tension cluster
place(pad([hz(69), hz(70), hz(76)], 3.2, a=1.6, r=0.6, cutoff=3000), fr(T["heroSees"]), 0.12, verb=0.7)
place(boom(2.0, 70, 35) * 0.6, fr(T["heroSees"]), 0.5, verb=0.3)

# Reaching out — the push
place(lp(noise(0.12), 1500) * env(int(0.12 * SR), 0.005, 0.03), fr(T["heroReach"]), 0.3)
place(thud(0.5, 80, 0.8), fr(T["push"]), 0.85, verb=0.3)
place(whoosh(0.5, 600, 2500), fr(T["push"] - 2), 0.45, verb=0.2)
for k, f in enumerate([362, 374, 386]):
    place(thud(0.25, 90, 0.5), fr(f), 0.5 - k * 0.08, pan=0.1 * k)

# Suspension before the leap: the world falls silent, a high tone rises
place(riser(fr(T["firstBrick"] - T["staggerEnd"]), 300, 2600), fr(T["staggerEnd"]), 0.55, verb=0.5)
place(np.sin(2 * np.pi * 3520 * sec(1.2)) * 0.03 * np.linspace(0, 1, int(1.2 * SR)), fr(T["staggerEnd"]), 1.0)

# ACT III — the first brick: everything changes
fb = fr(T["firstBrick"])
place(boom(4.0, 110, 30), fb, 1.0, verb=0.5)
place(stone_thunk(True), fb, 0.9, verb=0.4)
place(note(hz(57), 5.0), fb, 0.75, verb=0.9)
place(note(hz(69), 5.0), fb, 0.4, verb=0.9)

# hope: A major bed builds from here
prog = [  # (start_frame, chord midi)
    (T["firstBrick"] + 6, [45, 52, 57, 61, 64]),
    (528, [40, 52, 56, 59, 64]),
    (588, [42, 54, 57, 61, 66]),
    (648, [38, 50, 57, 62, 66]),
]
for i, (s, ch) in enumerate(prog):
    e = prog[i + 1][0] if i + 1 < len(prog) else T["endFade"] + 10
    place(pad([hz(n) for n in ch], fr(e - s) + 1.4, a=0.9 if i else 2.0, r=1.4, cutoff=1300 + 500 * i), fr(s), 0.3 + 0.05 * i, verb=0.6)

# each step = a brick = a note, rising (A major pentatonic)
scale = [57, 61, 64, 66, 69, 73, 76, 78, 81, 85, 88]
for i, lf in enumerate(EV["bricks"]):
    if i == 0:
        continue
    late = lf > T["endFade"]
    place(stone_thunk(), fr(lf), 0.55 if not late else 0.12, pan=float(np.clip(0.1 * i, -0.5, 0.5)), verb=0.3)
    if not late:
        place(note(hz(scale[min(i - 1, len(scale) - 1)]), 3.0, 1.2), fr(lf), 0.55, pan=float(np.clip(-0.3 + 0.08 * i, -0.4, 0.4)), verb=0.8)
        place(whoosh(0.3, 200, 1500), fr(lf) - 0.3, 0.2)

# pulse — confident heartbeat turned into a rhythm
for b in range(int(fr(500) / beat), int(fr(T["endFade"]) / beat)):
    t = b * beat
    place(thud(0.4, 52, 0.25), t, 0.45, verb=0.1)
    if b % 2:
        place(hp(noise(0.08), 6000) * np.exp(-sec(0.08) / 0.015), t, 0.08, pan=0.3, verb=0.2)

# labels: CẦU TOÀN crumbles / HÀNH ĐỘNG locks in
place(crumble(1.0, 120, 5000), fr(T["labels"] + 54), 0.45, pan=-0.4, verb=0.4)
for i in range(9):
    place(np.pad(tick(), (0, 3360)) + 0.3 * thud(0.1, 200, 0.2), fr(T["labels"] + 8 + i * 2.2 + 3), 0.12, pan=0.4, verb=0.3)

# ACT IV — end card
place(riser(fr(T["end1"] - T["endFade"]), 150, 3000), fr(T["endFade"]), 0.4, verb=0.6)
place(boom(3.0, 80, 32), fr(T["end1"]), 0.6, verb=0.6)
place(note(hz(69), 4.0, 0.6), fr(T["end1"]), 0.35, verb=1.0)
place(thud(0.6, 70, 0.4), fr(T["end2"]), 0.5, verb=0.5)
place(note(hz(64), 4.0, 0.6), fr(T["end2"]), 0.3, verb=1.0)
place(stone_thunk(True), fr(T["endBrick"]), 0.85, verb=0.5)
place(boom(3.5, 100, 30), fr(T["endBrick"]), 0.7, verb=0.5)
final = [45, 57, 61, 64, 69, 73]
place(pad([hz(n) for n in final], DUR - fr(T["endBrick"]) + 0.2, a=0.3, r=1.6, cutoff=2600), fr(T["endBrick"]), 0.45, verb=0.8)
for k, n in enumerate([57, 64, 69, 73]):
    place(note(hz(n), 3.5, 0.8), fr(T["endBrick"]) + k * 0.09, 0.4, pan=-0.3 + 0.2 * k, verb=1.0)

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
