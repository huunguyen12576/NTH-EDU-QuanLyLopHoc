"""
Original score + sound design, synthesised from scratch (no samples, no third-party
recordings) -> 100% owned, safe for commercial use.

Cues are placed in *story time* and mapped to film frames exactly like the visuals
(cold-open hook -> rewind -> story), using audio/events.json exported from the scene data.

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
Fm = EV["F"]
S = EV["S"]
H0, H1 = EV["HOOK_S0"], EV["HOOK_S1"]
SR = 48000
DUR = EV["DURATION"] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(11)

dry = np.zeros((2, N))
verb_send = np.zeros((2, N))
music = np.zeros((2, N))  # separate bus so it can be ducked


def sec(n):
    return np.arange(int(n * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, hz, order=2):
    return sosfilt(butter(order, hz, btype="low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, btype="high", fs=SR, output="sos"), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def place(sig, t, gain=1.0, pan=0.0, verb=0.0, bus=None):
    bus = dry if bus is None else bus
    i = int(t * SR)
    if i >= N or t < -len(sig) / SR:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    bus[0, i : i + len(sig)] += sig * l
    bus[1, i : i + len(sig)] += sig * r
    if verb:
        verb_send[0, i : i + len(sig)] += sig * l * verb
        verb_send[1, i : i + len(sig)] += sig * r * verb


# --------------------------------------------------------------- time mapping
def film_t(s):
    """Story second -> list of film seconds where it is shown (hook + main story)."""
    out = [(Fm["rewindEnd"] + s * FPS) / FPS]
    return out


def hook_t(s):
    return (s - H0) if H0 <= s <= H1 else None


def at(s, sig, gain=1.0, pan=0.0, verb=0.0, hook=False, bus=None):
    """Place a story-time event in the main story, and (optionally) in the cold-open hook."""
    for t in film_t(s):
        place(sig, t, gain, pan, verb, bus)
    if hook:
        h = hook_t(s)
        if h is not None:
            place(sig, h, gain, pan, verb, bus)


# strict room sits slightly left, chill room slightly right: two worlds, one mix
PAN = {"strict": -0.22, "chill": 0.22}


# --------------------------------------------------------------- sound atoms
def mx(*sigs):
    """Sum signals of different lengths."""
    n = max(len(x) for x in sigs)
    out = np.zeros(n)
    for x in sigs:
        out[: len(x)] += x
    return out


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def thud(d=0.35, f0=62, click=0.25, decay=0.09):
    t = sec(d)
    f = f0 * (1 + 0.8 * np.exp(-t / 0.02))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    n = lp(noise(d), 900) * np.exp(-t / 0.025) * click
    return body + n


def boom(d=3.0, f_hi=95, f_lo=28):
    t = sec(d)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    s += lp(noise(d), 300) * np.exp(-t / 0.12) * 0.6
    return np.tanh(s * 1.6) * 0.8


def step(heavy=False, muffled=False):
    d = 0.16
    t = sec(d)
    s = thud(d, 85 if heavy else 120, 0.9, 0.03) * (1.0 if heavy else 0.7)
    s += bp(noise(d), 1500, 6000) * np.exp(-t / 0.008) * 0.25  # sole scuff
    if muffled:
        s = lp(s, 500)
    return s


def creak(d=0.8, f0=300, f1=520, rough=0.6):
    """Wooden hinge creak: a pitched, stick-slip friction tone."""
    t = sec(d)
    f = f0 + (f1 - f0) * (t / d) + 30 * np.sin(2 * np.pi * 3 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    pulses = (np.sin(ph) > 0.6).astype(float)
    s = bp(pulses * (1 + rough * noise(d)), 400, 3200)
    shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    return s * shape * 0.35


def latch():
    t = sec(0.12)
    return mx(bp(noise(0.12), 1800, 7000) * np.exp(-t / 0.01), 0.6 * thud(0.12, 220, 0.3, 0.02))


def slam():
    return mx(boom(1.2, 90, 40) * 0.9, thud(0.4, 70, 0.9), latch() * 0.8)


def click():
    t = sec(0.05)
    return hp(noise(0.05), 2500) * np.exp(-t / 0.004) + 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.006)


def blip(freq, bright=1.0):
    """Speech-bubble pop: a soft, rounded pluck."""
    t = sec(0.25)
    f = freq * (1 + 0.25 * np.exp(-t / 0.015))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07)
    s += bright * 0.3 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR) * np.exp(-t / 0.03)
    return s * np.minimum(1, t / 0.003) * 0.5


def whoosh(d=0.9, lo=300, hi=3000):
    x = noise(d)
    t = np.linspace(0, 1, len(x))
    shape = np.sin(np.pi * t) ** 2
    out = np.zeros_like(x)
    seg = 10
    L = len(x) // seg
    for k in range(seg):
        c = lo + (hi - lo) * (k / seg)
        out[k * L : (k + 1) * L] = bp(x, c * 0.7, min(c * 1.4, SR / 2 - 100))[k * L : (k + 1) * L]
    return out * shape * 0.8


def rustle(d=0.4):
    t = sec(d)
    return bp(noise(d), 700, 5000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * t))) * np.sin(np.pi * t / d) * 0.4


def bed_creak():
    return mx(creak(0.45, 180, 240, 0.9) * 0.8, thud(0.3, 60, 0.4) * 0.5)


def note(freq, d=3.0, bright=1.0):
    """Felt-piano tone: slightly inharmonic partials + soft hammer."""
    t = sec(d)
    s = np.zeros_like(t)
    for h, a in [(1, 1.0), (2, 0.42 * bright), (3, 0.2 * bright), (4, 0.1 * bright), (5, 0.05 * bright)]:
        fh = freq * h * (1 + 0.0004 * h * h)
        s += a * np.sin(2 * np.pi * fh * t) * np.exp(-t * (0.8 + 0.75 * h))
    s += lp(noise(d), 2200) * np.exp(-t / 0.006) * 0.12
    return s * np.minimum(1, t / 0.004) * 0.5


def pluck(freq, d=0.6):
    t = sec(d)
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.12) + 0.4 * np.sin(4 * np.pi * freq * t) * np.exp(-t / 0.05)
    return s * np.minimum(1, t / 0.002) * 0.4


def pad(freqs, d, a=1.2, r=1.5, cutoff=1400):
    t = sec(d)
    s = np.zeros_like(t)
    for fq in freqs:
        for det in (-0.13, 0.0, 0.12):
            ph = rng.uniform(0, 2 * np.pi)
            f = fq * (1 + det / 100)
            for h in range(1, 7):
                s += np.sin(2 * np.pi * f * h * t + ph * h) / h * 0.18
    s = lp(s, cutoff)
    e = np.minimum(1, t / a) * np.minimum(1, np.maximum(0, d - t) / r)
    return s * np.clip(e, 0, 1) / len(freqs)


def tick(bright=1.0):
    t = sec(0.03)
    return bp(noise(0.03), 3000 * bright, 9000) * np.exp(-t / 0.004)


def heartbeat():
    a = thud(0.3, 48, 0.05)
    b = np.concatenate([np.zeros(int(0.17 * SR)), thud(0.3, 44, 0.03) * 0.7])[: len(a)]
    return a + b


def sting(freqs, d=1.6):
    """Dissonant string-like stab."""
    t = sec(d)
    s = np.zeros_like(t)
    for fq in freqs:
        for h in range(1, 9):
            s += np.sin(2 * np.pi * fq * h * t * (1 + 0.002 * rng.standard_normal())) / h
    s = lp(s, 4000) * np.exp(-t / 0.45) * np.minimum(1, t / 0.01)
    return s / len(freqs) * 0.6


def hz(n):
    return 440 * 2 ** ((n - 69) / 12)


# --------------------------------------------------------------- AMBIENCE (the night itself)
def crickets(d):
    t = sec(d)
    out = np.zeros_like(t)
    for k, (f, rate, ph) in enumerate([(4300, 2.6, 0.0), (4700, 3.1, 1.3), (3900, 2.2, 2.1)]):
        gate = (np.sin(2 * np.pi * rate * t + ph) > 0.55).astype(float)
        trill = 0.5 + 0.5 * np.sin(2 * np.pi * 34 * t)
        out += np.sin(2 * np.pi * f * t) * lp(gate, 60) * trill * (0.5 if k else 0.7)
    return out * 0.05


room = lp(noise(DUR), 180) * 0.05 + crickets(DUR) * 0.8
place(room, 0, 0.9, 0.0, 0.15)
# distant city hum
place(lp(noise(DUR), 400) * 0.03, 0, 0.6, -0.1)


# wind through the strict room's open window: only while it is open
def wind_curve(s):
    if s < S["winOpen"]:
        return 0
    if s < 7.0:
        return (s - S["winOpen"]) / (7.0 - S["winOpen"])
    if s < 16.9:
        return 1
    if s < 17.6:
        return 1 - 0.65 * (s - 16.9) / 0.7
    return 0.35


ft = np.arange(N) / SR
story_s = np.array([0.0] * N)
fr_ = ft * FPS
hook = fr_ <= Fm["hookEnd"]
story_s[hook] = H0 + ft[hook]
mid = (fr_ > Fm["hookEnd"]) & (fr_ <= Fm["rewindStart"])
story_s[mid] = H1
rw = (fr_ > Fm["rewindStart"]) & (fr_ <= Fm["rewindEnd"])
u = (fr_[rw] - Fm["rewindStart"]) / (Fm["rewindEnd"] - Fm["rewindStart"])
story_s[rw] = H1 * (1 - u * u * (3 - 2 * u))
after = fr_ > Fm["rewindEnd"]
story_s[after] = (fr_[after] - Fm["rewindEnd"]) / FPS
wc = np.vectorize(wind_curve)(story_s[:: 480])
wc = np.interp(np.arange(N), np.arange(0, N, 480), wc)
wind = bp(noise(DUR), 200, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * ft)) * wc
wind[ft * FPS > Fm["storyEnd"]] *= 0
place(wind, 0, 0.11, PAN["strict"] - 0.15, 0.3)

# --------------------------------------------------------------- COLD OPEN (01:40)
place(pad([hz(38), hz(45), hz(50)], H1 - H0 + 0.4, a=0.3, r=0.3, cutoff=500), 0, 0.5)
at(S["climbIn"], creak(1.0, 260, 420), 0.55, PAN["strict"], 0.3, hook=True)
at(16.35, rustle(0.3), 0.35, PAN["strict"], 0.2, hook=True)
at(16.9, rustle(0.4), 0.4, PAN["strict"], 0.2, hook=True)
at(17.32, bed_creak(), 0.35, PAN["strict"], 0.2, hook=True)
for k in range(3):  # heart races as the kid sneaks in
    at(16.1 + k * 0.45, heartbeat(), 0.55, 0.0, 0.05, hook=True)
# the reveal
at(S["lampOn"], click(), 0.9, PAN["strict"] + 0.1, 0.25, hook=True)
at(S["lampOn"] + 0.02, boom(2.5, 80, 30), 0.85, 0.0, 0.35, hook=True)
at(S["caught"], sting([hz(62), hz(63), hz(69)]), 0.55, 0.0, 0.6, hook=True)

# REWIND: tape spooling backwards, rising chirp + garble
rw0 = Fm["rewindStart"] / FPS
rwd = (Fm["rewindEnd"] - Fm["rewindStart"]) / FPS
t = sec(rwd)
chirp = np.sin(2 * np.pi * np.cumsum(300 + 2600 * (t / rwd) ** 2) / SR) * 0.15
garble = bp(noise(rwd), 800, 5000) * (0.5 + 0.5 * np.sin(2 * np.pi * 37 * t)) * 0.5
place((chirp + garble) * np.sin(np.pi * t / rwd) ** 0.5, rw0, 0.55, 0.0, 0.2)
for k in range(18):
    place(tick(1.3), rw0 + k * rwd / 18, 0.22, rng.uniform(-0.3, 0.3))
place(thud(0.3, 140, 0.6), Fm["rewindEnd"] / FPS, 0.6)  # "play" clunk

# --------------------------------------------------------------- SCORE (main story)
BEAT = 60 / 96
t0 = Fm["rewindEnd"] / FPS


def st(s):
    return t0 + s


# Act I — innocent, curious motif (D major-ish, plucked)
motif = [62, 66, 69, 66, 64, 69, 67, 66]
for b in range(8):
    place(pluck(hz(motif[b])), st(0.1 + b * BEAT * 0.5), 0.45, 0.1 * ((b % 2) * 2 - 1), 0.5, bus=music)
place(pad([hz(50), hz(57), hz(62)], 3.3, a=0.4, r=1.0, cutoff=900), st(0.0), 0.3, 0.0, 0.5, bus=music)
# the split: one answer darkens the room, the other lifts it
place(sting([hz(50), hz(51)], 1.2), st(S["answer"]), 0.25, PAN["strict"], 0.5)
for k, n in enumerate([62, 66, 69, 74]):
    place(pluck(hz(n), 0.8), st(S["answer"] + 0.35 + k * 0.09), 0.3, PAN["chill"], 0.6, bus=music)

# Act II — sneaking out: low minor ostinato
for b in range(int((8.0 - 4.3) / (BEAT / 2))):
    s = 4.3 + b * BEAT / 2
    n = [38, 45, 41, 45][b % 4]
    place(pluck(hz(n), 0.5) * 0.9, st(s), 0.5, -0.1, 0.25, bus=music)
place(pad([hz(38), hz(45), hz(48), hz(53)], 4.0, a=1.5, r=0.8, cutoff=700), st(4.3), 0.25, 0.0, 0.5, bus=music)

# waiting — a lonely piano line over a cold pad, the clock does the rest
place(pad([hz(43), hz(50), hz(55), hz(58)], 7.5, a=1.2, r=1.2, cutoff=800), st(9.2), 0.28, PAN["strict"], 0.6, bus=music)
for s, n in [(11.5, 69), (12.4, 67), (13.3, 65), (14.2, 64), (15.2, 62), (16.0, 61)]:
    place(note(hz(n), 3.0, 0.7), st(s), 0.3, -0.25, 0.9, bus=music)
# warmth returns in the other room
place(pad([hz(50), hz(57), hz(62), hz(66), hz(69)], 4.6, a=0.6, r=1.2, cutoff=1500), st(S["howWasIt"]), 0.22, PAN["chill"], 0.6, bus=music)
for k, n in enumerate([74, 78, 81, 78, 76, 74]):
    place(pluck(hz(n), 0.7), st(13.1 + k * 0.32), 0.25, PAN["chill"] + 0.1, 0.6, bus=music)

# 16.0 -> 17.4: music thins to nothing; the lamp click owns the silence
# dialogue beat: one note per line, then the gut-punch
place(note(hz(45), 5.5, 0.5), st(S["iDid"]), 0.5, 0.0, 1.0, bus=music)
place(note(hz(57), 5.5, 0.4), st(S["iDid"] + 0.02), 0.25, 0.0, 1.0, bus=music)
place(pad([hz(45), hz(52), hz(57), hz(60)], 3.6, a=1.4, r=1.4, cutoff=900), st(S["iDid"] + 0.2), 0.22, 0.0, 0.8, bus=music)

# --------------------------------------------------------------- SFX in the story
# bubbles: each speaker has a voice-colour
at(S["ask"], blip(hz(76)), 0.4, 0.0, 0.3)
at(S["answer"], blip(hz(57), 0.2), 0.45, PAN["strict"], 0.2)
at(S["answer"] + 0.02, blip(hz(81)), 0.32, PAN["chill"], 0.3)
at(S["howWasIt"], blip(hz(79)), 0.38, PAN["chill"], 0.3)
at(S["couldAsk"], blip(hz(55), 0.3), 0.42, PAN["strict"], 0.25)
at(S["iDid"], blip(hz(64), 0.4), 0.38, PAN["strict"], 0.3)
# "?!"
at(S["huh"], sting([hz(61), hz(62), hz(68)]), 0.6, PAN["strict"], 0.6)
at(S["huh"], boom(1.5, 90, 40), 0.45, 0.0, 0.2)
# doors
at(S["strictDoorShut"], slam(), 0.95, PAN["strict"] + 0.3, 0.4)
at(S["chillDoorShut"], latch(), 0.45, PAN["chill"] + 0.3, 0.3)
at(S["chillDoorShut"] - 0.35, creak(0.4, 380, 330, 0.3), 0.2, PAN["chill"] + 0.3, 0.3)
at(8.75, creak(0.5, 330, 460), 0.4, PAN["strict"] + 0.3, 0.3)
at(11.45, creak(1.0, 250, 200, 0.3), 0.25, PAN["strict"] + 0.3, 0.4)  # draft swings it ajar
at(12.25, creak(0.4, 360, 420, 0.3), 0.25, PAN["chill"] + 0.3, 0.3)
at(12.3, latch(), 0.3, PAN["chill"] + 0.3, 0.3)
at(19.95, creak(0.4, 380, 330, 0.3), 0.15, PAN["chill"] + 0.3, 0.3)
at(S["chillDoorShut2"], latch(), 0.35, PAN["chill"] + 0.3, 0.3)
# window, bed, climbing
at(6.0, rustle(0.3), 0.3, PAN["strict"], 0.2)
at(6.35, bed_creak(), 0.35, PAN["strict"], 0.2)
at(S["winOpen"], mx(latch() * 0.7, creak(0.45, 420, 640)), 0.5, PAN["strict"], 0.3)
at(6.9, whoosh(1.2, 300, 1600), 0.3, PAN["strict"] - 0.2, 0.5)
at(7.05, rustle(0.45), 0.4, PAN["strict"], 0.2)
at(7.75, lp(thud(0.3, 70, 0.5), 400), 0.3, PAN["strict"] - 0.2, 0.3)
at(11.2, bed_creak(), 0.35, PAN["strict"], 0.2)
at(15.0, bed_creak(), 0.3, PAN["chill"], 0.2)
at(15.25, bed_creak(), 0.3, PAN["chill"], 0.2)
at(18.8, mx(rustle(0.5), bed_creak() * 0.5), 0.3, PAN["chill"], 0.2)
at(3.2, step(False) * 0.9, 0.55, PAN["chill"], 0.2)  # the cheer lands
at(13.35, step(False) * 0.8, 0.45, PAN["chill"], 0.2)
# lamps
at(S["chillLampOn"], click(), 0.6, PAN["chill"], 0.2)
at(S["chillLampOff"], click(), 0.55, PAN["chill"], 0.2)
# footsteps from the animation itself
for e in EV["steps"]:
    pan = PAN[e["side"]] + (e["x"] - 540) / 1600
    g = 0.42 if e["heavy"] else 0.3
    at(e["s"], step(e["heavy"], e["layer"] == "hall"), g * (0.55 if e["layer"] == "hall" else 1), pan, 0.15, hook=False)
# time-lapses: whoosh + racing clock
for a, b in [(8.0, 9.0), (11.4, 12.4), (15.0, 16.0)]:
    at(a - 0.1, whoosh(b - a + 0.3, 250, 2600), 0.35, 0.0, 0.5)
    for k in range(22):
        at(a + k * (b - a) / 22, tick(1.2), 0.12 * np.sin(np.pi * k / 22) + 0.03, 0.0, 0.2)
# clock: a soft LED tick on each minute change (outside time-lapses)
for s in [4.4, 7.4, 9.9, 12.9, 17.3, 19.4, 21.2]:
    at(s, mx(tick(0.7), 0.3 * np.sin(2 * np.pi * 1800 * sec(0.02)) * np.exp(-sec(0.02) / 0.004)), 0.18, 0.0, 0.2)
# waiting: an old clock ticks in the strict room
for k in range(int((16.0 - 11.4) / 0.5)):
    s = 11.4 + k * 0.5
    if 12.4 < s < 15.0:
        at(s, tick(0.6), 0.09, PAN["strict"] - 0.3, 0.3)
# zzz
for k in range(4):
    at(20.5 + k * 0.55, pluck(hz(86 - k * 2), 0.5), 0.08, PAN["chill"] + 0.2, 0.7)

# --------------------------------------------------------------- END CARD
e1, e2, e3 = Fm["end1"] / FPS, Fm["end2"] / FPS, Fm["end3"] / FPS
place(whoosh(0.9, 2400, 300), Fm["fadeOut"] / FPS, 0.25, 0.0, 0.6)
place(note(hz(50), 4.5, 0.5), e1, 0.45, -0.1, 1.0, bus=music)
place(note(hz(57), 4.5, 0.5), e1 + 0.03, 0.25, 0.1, 1.0, bus=music)
place(note(hz(53), 4.0, 0.5), e2, 0.42, -0.1, 1.0, bus=music)
place(note(hz(60), 4.0, 0.5), e2 + 0.03, 0.22, 0.1, 1.0, bus=music)
place(pad([hz(41), hz(48), hz(53), hz(57)], e3 - e1, a=1.5, r=0.6, cutoff=900), e1, 0.22, 0.0, 0.7, bus=music)
# the door opens: warm light, resolution to D major
place(creak(0.9, 300, 380, 0.2), e3 - 0.45, 0.22, 0.0, 0.5)
place(boom(3.0, 70, 32), e3, 0.4, 0.0, 0.5)
place(pad([hz(38), hz(50), hz(57), hz(62), hz(66), hz(69)], DUR - e3 + 0.2, a=0.6, r=1.2, cutoff=2600), e3 - 0.1, 0.42, 0.0, 0.8, bus=music)
for k, n in enumerate([62, 66, 69, 74, 78]):
    place(note(hz(n), 3.5, 0.8), e3 + k * 0.11, 0.33, -0.3 + 0.15 * k, 1.0, bus=music)
for k in range(3):  # the kid's steps, home, through the door
    place(step(False), e3 + 0.25 + k * 0.38, 0.18, 0.0, 0.4)

# --------------------------------------------------------------- mix
# duck the music under the key silences: before the lamp click and under the last line
duck = np.ones(N)


def dip(t_a, t_b, depth, ramp=0.2):
    i0, i1 = int(t_a * SR), int(t_b * SR)
    r = int(ramp * SR)
    duck[i0:i1] = np.minimum(duck[i0:i1], depth)
    duck[max(0, i0 - r) : i0] = np.minimum(duck[max(0, i0 - r) : i0], np.linspace(1, depth, i0 - max(0, i0 - r)))
    duck[i1 : i1 + r] = np.minimum(duck[i1 : i1 + r], np.linspace(depth, 1, len(duck[i1 : i1 + r])))


dip(st(16.0), st(S["iDid"]), 0.15, 0.5)
music *= duck

ir_len = int(2.4 * SR)
t = np.arange(ir_len) / SR
ir = np.stack([rng.standard_normal(ir_len) * np.exp(-t / 0.5), rng.standard_normal(ir_len) * np.exp(-t / 0.5)])
ir[:, : int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
ir = np.stack([lp(ir[0], 6000), lp(ir[1], 6000)])
ir /= np.sqrt((ir**2).sum(axis=1, keepdims=True))
wet = np.stack([fftconvolve(verb_send[c], ir[c])[:N] for c in range(2)]) * 0.5
mix = dry + music + wet
mix = np.stack([hp(mix[c], 25) for c in range(2)])
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
fade = int(0.4 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade)
mix[:, : int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))

# loudness: normalise to ~ -14 LUFS-ish (RMS proxy), keep peaks under -1 dBFS
rms = np.sqrt(np.mean(mix**2))
mix *= 10 ** (-17.0 / 20) / max(rms, 1e-9)
peak = np.max(np.abs(mix))
if peak > 0.8:
    mix = np.tanh(mix / peak * 1.2) / np.tanh(1.2) * 0.8

# look-ahead peak limiter (5 ms window, smooth release) so transients don't dictate loudness
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

thr = 0.5
envl = maximum_filter1d(np.max(np.abs(mix), axis=0), 480)
g = np.minimum(1.0, thr / np.maximum(envl, 1e-9))
g = uniform_filter1d(minimum_filter1d(g, 960), 480)
mix *= g
mix *= 0.82 / np.max(np.abs(mix))

# true-peak safety (4x oversampled): keep inter-sample peaks under -1 dBTP
from scipy.signal import resample_poly

tp = max(np.max(np.abs(resample_poly(mix[c], 4, 1))) for c in range(2))
if tp > 0.85:
    mix *= 0.85 / tp

out = os.path.join(HERE, "..", "public", "audio", "soundtrack.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
pcm = (np.clip(mix.T, -1, 1) * (2**23 - 1)).astype("<i4")
raw = np.frombuffer(pcm.tobytes(), dtype=np.uint8).reshape(-1, 4)[:, :3]
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(3)
    w.setframerate(SR)
    w.writeframes(raw.tobytes())
print("wrote", out, f"{DUR:.2f}s")
