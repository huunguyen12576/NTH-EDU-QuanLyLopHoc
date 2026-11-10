"""
Original score + sound design, synthesised from scratch with NumPy (no samples, no
third-party recordings) -> fully owned, safe for commercial use.

Inputs : voice/narration_charon.wav (the ONE continuous Gemini TTS take, untouched)
         audio/cues.json            (exported from src/cues.ts: same cues as the picture)
Outputs: public/audio/mix.wav         final mix, 48 kHz 24-bit stereo
         audio/stems/music_sfx.flac   score + sfx (ducked), no voice (wav, converted to FLAC for the repo)
         audio/stems/voice_48k.wav    the voice, resampled only

Run: python3 audio/make_audio.py
"""
import json
import os
import wave
from math import gcd

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CUES = json.load(open(os.path.join(HERE, "cues.json")))
SR = 48000
DUR = CUES["total"]
N = int(DUR * SR) + SR // 10
CLIMAX = CUES["climax"]
rng = np.random.default_rng(3)

music = np.zeros((2, N))
sfx = np.zeros((2, N))
send = np.zeros((2, N))  # reverb send


def sec(d):
    return np.arange(int(d * SR)) / SR


def lp(x, hz, o=2):
    return sosfilt(butter(o, hz, btype="low", fs=SR, output="sos"), x)


def hp(x, hz, o=2):
    return sosfilt(butter(o, hz, btype="high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], btype="band", fs=SR, output="sos"), x)


def place(buf, sig, t, gain=1.0, pan=0.0, verb=0.0):
    i = int(t * SR)
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4) * gain, np.sin((pan + 1) * np.pi / 4) * gain
    buf[0, i : i + len(sig)] += l * sig
    buf[1, i : i + len(sig)] += r * sig
    if verb:
        send[0, i : i + len(sig)] += l * sig * verb
        send[1, i : i + len(sig)] += r * sig * verb


def env(n, a, r, sustain=True):
    """attack a s, release r s (exp), over n samples"""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if sustain:
        tail = np.clip((n / SR - t) / max(r, 1e-4), 0, 1)
        return e * tail ** 1.5
    return e * np.exp(-t / r)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


# ------------------------------------------------------------------ instruments
def pad(notes, t0, d, gain=0.06, bright=1800, pan_spread=0.5):
    n = int(d * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, m in enumerate(notes):
        f = hz(m)
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            for h in range(1, 7):
                out += np.sin(2 * np.pi * ff * h * t + ph * h) / (h ** 1.4)
    out = lp(out, bright) / (len(notes) * 6)
    e = env(n, min(1.8, d * 0.4), min(2.2, d * 0.45))
    trem = 1 + 0.06 * np.sin(2 * np.pi * 0.17 * t)
    sig = out * e * trem
    place(music, sig, t0, gain, -pan_spread * 0.5, 0.35)
    place(music, np.roll(sig, 480), t0, gain, pan_spread * 0.5, 0.35)


def bell(f, t0, gain=0.25, dec=2.2, pan=0.0, verb=0.6):
    n = int((dec * 2.5) * SR)
    t = np.arange(n) / SR
    parts = [(1, 1, 1), (2.76, 0.45, 0.55), (5.40, 0.25, 0.32), (8.93, 0.12, 0.2), (0.5, 0.25, 1.4)]
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (dec * dd)) for r, a, dd in parts)
    s *= np.minimum(1, t / 0.002)
    place(sfx, s, t0, gain, pan, verb)


def pluck(f, t0, gain=0.12, dec=1.1, pan=0.0):
    n = int(dec * 3 * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * h * t) * np.exp(-t * h / dec) / h ** 1.2 for h in range(1, 6))
    s *= np.minimum(1, t / 0.004)
    place(music, lp(s, 3500), t0, gain, pan, 0.4)


def noise(d):
    return rng.standard_normal(int(d * SR))


def tick(t0, g=0.12):
    s = hp(noise(0.012), 2500) * np.exp(-sec(0.012) / 0.003)
    p = np.sin(2 * np.pi * 2300 * sec(0.05)) * np.exp(-sec(0.05) / 0.012) * 0.5
    place(sfx, np.concatenate([s, np.zeros(len(p) - len(s))]) + p, t0, g, rng.uniform(-0.3, 0.3), 0.2)


def brush(t0, g=0.32):
    d = 0.42
    t = sec(d)
    s = bp(noise(d), 900, 7000) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 * np.exp(-t / 0.3)
    place(sfx, s, t0 - 0.04, g, -0.2, 0.25)
    place(sfx, s[::-1] * 0.0 + np.roll(s, 300), t0 - 0.04, g * 0.7, 0.3, 0.25)


def jingle(t0, g=0.16):
    for k in range(14):
        tt = t0 + rng.uniform(0, 0.75) * (k / 14) ** 0.6
        bell(rng.uniform(2600, 6200), tt, g * rng.uniform(0.3, 1), 0.18, rng.uniform(-0.6, 0.6), 0.3)
        tick(tt, g * 0.5)


def slide(t0, g=0.09):
    d = 0.9
    t = sec(d)
    s = bp(noise(d), 1800, 5200) * np.sin(np.pi * np.clip(t / d, 0, 1)) * (1 + 0.5 * np.sin(2 * np.pi * 31 * t))
    place(sfx, s, t0, g, -0.35, 0.2)


def click(t0, g=0.5):
    for dt, gg in ((0.0, 1.0), (0.028, 0.7)):
        s = hp(noise(0.02), 1200) * np.exp(-sec(0.02) / 0.004)
        place(sfx, s, t0 + dt, g * gg * 0.6, 0.05, 0.15)
    th = np.sin(2 * np.pi * 115 * sec(0.18)) * np.exp(-sec(0.18) / 0.045)
    place(sfx, th, t0 + 0.01, g * 0.7, 0, 0.1)


def swell(t0, g=0.25):
    d = 1.6
    t = sec(d)
    s = bp(noise(d), 300, 5000) * (t / d) ** 2 * np.exp(-np.maximum(0, t - d * 0.8) / 0.1)
    place(sfx, s, t0 - d * 0.75, g * 0.5, 0, 0.5)
    for k, m in enumerate((86, 90, 93, 98)):
        bell(hz(m), t0 + k * 0.05, g * 0.18, 1.6, (k - 1.5) * 0.3, 0.9)


def rattle(t0, g=0.3):
    for k in range(9):
        tt = t0 + k * 0.11 + rng.uniform(-0.02, 0.02)
        s = hp(noise(0.025), 900) * np.exp(-sec(0.025) / 0.006)
        place(sfx, s, tt, g * rng.uniform(0.5, 1), 0.25, 0.1)
        th = np.sin(2 * np.pi * rng.uniform(150, 210) * sec(0.06)) * np.exp(-sec(0.06) / 0.02)
        place(sfx, th, tt, g * 0.4, 0.25, 0)


def crack(t0, g=0.22):
    for k in range(7):
        tt = t0 + k * 0.19 + rng.uniform(0, 0.08)
        s = hp(noise(0.008), 3000) * np.exp(-sec(0.008) / 0.0015)
        place(sfx, s, tt, g * rng.uniform(0.4, 1), rng.uniform(-0.4, 0.4), 0.3)


def boom(t0, g=0.55):
    d = 3.0
    t = sec(d)
    f = 62 * np.exp(-t / 1.2) + 34
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.1)
    place(music, s, t0, g, 0, 0.2)


# ------------------------------------------------------------------ score
# D minor world -> D major at the revelation. Chords as MIDI notes.
Dm, Bb, F, C, Gm, A, Dsus, D, Bbmaj7 = (
    [38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [41, 53, 57, 60, 65], [36, 48, 55, 60, 64],
    [43, 50, 55, 58, 62], [45, 52, 57, 61, 64], [38, 50, 57, 62, 67], [38, 50, 57, 62, 66], [34, 50, 57, 62, 65])
sc = {s["id"]: s for s in CUES["scenes"]}

# hook: a low drone only (space, "Ma")
pad([26, 38, 45], 0.0, sc["mother"]["start"] + 1.5, 0.05, 700)
# mother -> three: warm, intimate progression
t = sc["mother"]["start"]
for ch in (Dm, Bb, F, C):
    pad(ch, t, 3.4, 0.055, 1500)
    t += 3.0
# chapters: progression continues with a gentle pulse
prog = [Dm, Bb, F, C, Gm, Bb, F, A]
t = sc["chatgpt"]["start"]
k = 0
while t < sc["limit"]["start"]:
    ch = prog[k % len(prog)]
    pad(ch, t, 3.4, 0.05, 1700)
    for b in range(6):  # pulse at 0.5 s
        pluck(hz(ch[2] + 12 + (0, 5, 7, 12, 7, 5)[b]), t + b * 0.5, 0.05, 0.6, (b % 2 - 0.5) * 0.4)
    t += 3.0
    k += 1
# limit: suspended, tension, riser into the climax
t = sc["limit"]["start"]
pad([38, 50, 55, 62, 64], t, 4.4, 0.05, 1400)
pad([34, 46, 53, 60, 62], t + 4.0, CLIMAX - t - 4.0 + 0.3, 0.055, 1900)
d = CLIMAX - (sc["reveal"]["start"] - 1.0)
rt = sec(d)
riser = bp(noise(d), 400, 6000) * (rt / d) ** 3
place(music, riser, CLIMAX - d, 0.08, 0, 0.5)
for b in range(int((CLIMAX - sc["reveal"]["start"]) / 0.25)):
    pluck(hz(62 + (b % 4) * 0), sc["reveal"]["start"] + b * 0.25, 0.03 + 0.002 * b, 0.3)
# CLIMAX: D major opens, low boom, shimmer
boom(CLIMAX - 0.02, 0.5)
pad(Dsus, CLIMAX, 1.2, 0.09, 3500)
pad(D + [74, 78], CLIMAX + 0.9, 4.6, 0.085, 3800)
for k, m in enumerate((74, 78, 81, 86, 90)):
    bell(hz(m), CLIMAX + 0.08 * k, 0.07, 2.4, (k - 2) * 0.25, 1.0)
# method + caution: lighter, hopeful
t = sc["method"]["start"] + 0.6
for ch in ([38, 50, 57, 62, 66], [43, 50, 59, 62, 67], [35, 47, 54, 62, 66], [43, 50, 59, 62, 67], [38, 50, 57, 62, 66]):
    pad(ch, t, 3.4, 0.05, 2000)
    t += 3.0
t = sc["caution"]["start"]
for b in range(int((sc["payoff"]["start"] - t) / 0.75)):
    pluck(hz((74, 69, 71, 66)[b % 4]), t + b * 0.75, 0.04, 1.0, 0.2)
# payoff: Bbmaj7 -> D major, long resolve under the end card
t = sc["payoff"]["start"]
pad(Bbmaj7, t, 3.2, 0.055, 1800)
pad([43, 50, 59, 62, 67], t + 2.8, 2.6, 0.06, 2200)
pad(D + [74], t + 5.0, DUR - t - 5.0 + 0.1, 0.07, 2600)
boom(t + 2.6, 0.25)

# ------------------------------------------------------------------ sound events
BELLS = [hz(74), hz(77), hz(81)]  # one voice per key: D, F, A
for e in CUES["events"]:
    ty, tt, v = e["type"], e["t"], e.get("v", 0)
    if ty == "bell":
        bell(BELLS[int(v) % 3] if tt < CUES["voiceEnd"] else hz(86), tt, 0.13, 2.4, (int(v) - 1) * 0.3)
    elif ty == "tick":
        tick(tt, 0.08 if v else 0.11)
    elif ty == "brush":
        brush(tt, 0.3 * (v or 1))
    elif ty == "glint":
        bell(hz(93), tt, 0.06, 1.8, 0, 1)
    elif ty == "jingle":
        jingle(tt, 0.14 * (v or 1))
    elif ty == "slide":
        slide(tt)
    elif ty == "click":
        click(tt, 0.45 * (v or 1))
    elif ty == "swell":
        swell(tt, 0.22 * (v or 1))
    elif ty == "ping":
        scale = [74, 76, 78, 81, 83, 86]
        bell(hz(scale[int(v) % 10 % 6]), tt, 0.05, 1.2, 0.2, 0.7)
    elif ty == "rattle":
        rattle(tt, 0.26 * (v or 1))
    elif ty == "crack":
        crack(tt)

# ------------------------------------------------------------------ reverb (synthetic hall)
ir_t = sec(2.8)
ir = np.stack([lp(rng.standard_normal(len(ir_t)), 6000) * np.exp(-ir_t / 0.75) for _ in range(2)])
ir[:, : int(0.012 * SR)] = 0
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)]) * 0.11
bed = music + sfx + wet
bed = np.stack([hp(bed[c], 32) for c in range(2)])

# ------------------------------------------------------------------ voice + ducking
v, vsr = sf.read(os.path.join(ROOT, "voice", "narration_charon.wav"), dtype="float64")
if v.ndim > 1:
    v = v.mean(1)
g = gcd(SR, vsr)
v = resample_poly(v, SR // g, vsr // g)
v = hp(v, 70)
v = v / (np.max(np.abs(v)) + 1e-9) * 0.5
voice = np.zeros(N)
voice[: min(N, len(v))] = v[:N]
# envelope follower (10 ms attack, 350 ms release) -> up to -9 dB on the bed
a = np.abs(voice)
win = int(0.02 * SR)
rms = np.sqrt(np.convolve(a ** 2, np.ones(win) / win, mode="same"))
envv = np.zeros(N)
att, rel = np.exp(-1 / (0.01 * SR)), np.exp(-1 / (0.35 * SR))
# vectorised-ish one-pole on a decimated signal, then upsample
dec = 48
r = rms[::dec]
e = np.zeros_like(r)
for i in range(1, len(r)):
    c = att ** dec if r[i] > e[i - 1] else rel ** dec
    e[i] = c * e[i - 1] + (1 - c) * r[i]
envv = np.interp(np.arange(N), np.arange(len(e)) * dec, e)
duck_db = -9 * np.clip(envv / 0.05, 0, 1)
# the climax is allowed to breathe over the voice a little
tt = np.arange(N) / SR
duck_db *= 1 - 0.45 * np.exp(-((tt - CLIMAX - 0.8) ** 2) / (2 * 0.9 ** 2))
bed = bed * 10 ** (duck_db / 20)

# ---- loudness staging (ITU-R BS.1770 via pyloudnorm)
import pyloudnorm as pyln

meter = pyln.Meter(SR)
vmask = slice(0, int(CUES["voiceEnd"] * SR))
v_l = meter.integrated_loudness(voice[vmask])
voice *= 10 ** ((-16.0 - v_l) / 20)
b_l = meter.integrated_loudness(bed.T)
bed *= 10 ** ((-25.5 - b_l) / 20)

fade = np.clip((DUR - tt) / 1.6, 0, 1) ** 1.5
bed *= fade
mix = bed + voice[None, :]


def soft_limit(x, ceil=0.84):
    # smooth knee limiter: transparent below 0.7*ceil
    k = 0.7 * ceil
    y = x.copy()
    over = np.abs(x) > k
    y[over] = np.sign(x[over]) * (k + (ceil - k) * np.tanh((np.abs(x[over]) - k) / (ceil - k)))
    return y


m_l = meter.integrated_loudness(mix.T)
g_out = 10 ** ((-14.0 - m_l) / 20)
mix = soft_limit(mix * g_out)
bed_out = bed * g_out
voice_out = voice * g_out
print("voice", round(v_l, 1), "-> -16 | bed", round(b_l, 1), "-> -25.5 | mix", round(meter.integrated_loudness(mix.T), 1), "LUFS")


def write(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, x.T if x.ndim > 1 else x, SR, subtype="PCM_24")


write(os.path.join(ROOT, "public", "audio", "mix.wav"), mix)
write(os.path.join(HERE, "stems", "music_sfx.wav"), bed_out)
write(os.path.join(HERE, "stems", "voice_48k.wav"), voice_out / np.max(np.abs(voice_out)) * 0.89)
print("ok", f"{DUR:.2f}s")
