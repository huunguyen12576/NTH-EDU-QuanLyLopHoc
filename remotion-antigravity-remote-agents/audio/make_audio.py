"""
Original score + sound design, synthesised from scratch with numpy (no samples, no third-party
recordings, no generative-music service) -> fully owned, safe for commercial use.

Every cue is keyed to src/timeline.json (real word timestamps of the single Charon voice take).
Music is side-chain ducked under the voice; its climax lands on the Revelation ("Remote Agents").

Run: python3 audio/make_audio.py  ->  public/audio/mix.wav (48 kHz, 24-bit stereo) + audio/stems/*.wav
"""
import json, os, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

H = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(H)
TL = json.load(open(os.path.join(R, 'src/timeline.json'), encoding='utf-8'))
PH = {p['key']: p for p in TL['phrases']}
T = lambda k: PH[k]['start']
TE = lambda k: PH[k]['end']
TW = lambda k, n: PH[k]['words'][min(n, len(PH[k]['words']) - 1)]['start']
SR = 48000
DUR = TL['durationInFrames'] / TL['fps']
N = int(DUR * SR)
rng = np.random.default_rng(11)

def lp(x, hz, o=2): return sosfilt(butter(o, hz, 'low', fs=SR, output='sos'), x)
def hp(x, hz, o=2): return sosfilt(butter(o, hz, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.01, r=None, curve=4.0):
    t = tt(d); r = d - a if r is None else r
    e = np.minimum(1, t / max(a, 1e-4)); tail = np.clip((t - (d - r)) / max(r, 1e-4), 0, 1)
    return e * (1 - tail) ** curve if r > 0 else e
def m2f(m): return 440 * 2 ** ((m - 69) / 12)

music = np.zeros((2, N)); sfx = np.zeros((2, N)); send = np.zeros((2, N))
def place(buf, sig, t0, g=1.0, pan=0.0, verb=0.0):
    i = int(t0 * SR)
    if i < 0: sig = sig[-i:]; i = 0
    if i >= N: return
    sig = sig[:N - i]
    l = np.cos((pan + 1) * np.pi / 4) * g; r = np.sin((pan + 1) * np.pi / 4) * g
    buf[0, i:i + len(sig)] += sig * l; buf[1, i:i + len(sig)] += sig * r
    if verb: send[0, i:i + len(sig)] += sig * l * verb; send[1, i:i + len(sig)] += sig * r * verb

# ───────── instruments ─────────
def pad(midi, d, a=1.5, r=2.0, bright=1400, det=0.12):
    t = tt(d); s = np.zeros_like(t)
    for m in midi:
        f = m2f(m)
        for dv in (-det, 0, det):
            ph = rng.random() * 2 * np.pi
            ff = f * 2 ** (dv / 12)
            # soft saw from 6 harmonics
            for k in range(1, 7):
                s += np.sin(2 * np.pi * ff * k * t + ph * k) / k * (0.9 ** k)
    s = lp(s, bright) * env(d, a, r, 1.5)
    return s / (len(midi) * 9)
def sub(midi, d, a=0.8, r=1.5):
    t = tt(d); return np.sin(2 * np.pi * m2f(midi) * t) * env(d, a, r, 1.5) * 0.5
def pluck(midi, d=1.6, bright=3200):
    t = tt(d); f = m2f(midi)
    s = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3 + k * 2.2)) / k for k in range(1, 6))
    return lp(s, bright) * env(d, 0.004, d * 0.6, 2) * 0.5
def bell(midi, d=4.0):
    t = tt(d); f = m2f(midi)
    ratios = [(1, 1, 1.2), (2.76, 0.45, 2.2), (5.4, 0.25, 3.5), (8.93, 0.12, 5)]
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dc) for r, a, dc in ratios)
    return s * env(d, 0.003, d * 0.7, 1.2) * 0.4
def noise(d): return rng.standard_normal(int(d * SR))
def piano(midi, d=3.0):
    t = tt(d); f = m2f(midi)
    s = sum(np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) * np.exp(-t * (0.9 + k * 0.8)) / (k ** 1.3) for k in range(1, 8))
    return lp(s, 4000) * env(d, 0.003, d * 0.5, 1.5) * 0.45

# ───────── SCORE ─────────
D2, F2, A2, Bb1, C2, G2 = 38, 41, 45, 34, 36, 43
def chord(root, kind):
    iv = {'m9': [0, 7, 12, 15, 19, 26], 'M9': [0, 7, 12, 16, 19, 26], 'M7': [0, 7, 11, 16, 19], 'sus': [0, 7, 12, 14, 19]}[kind]
    return [root + 12 + i for i in iv]

# I. Hook + stove (0 → truoc): a single held breath in D minor, shimmer above
place(music, pad(chord(D2, 'm9'), T('truoc') + 0.5, a=1.2, r=1.2, bright=900), 0.0, 0.9, verb=0.4)
place(music, sub(D2, T('truoc') + 0.4, 1.5, 1.0), 0.0, 0.7)
# II. Old way: Bb – F – C – Dm, low, patient
sec = [(Bb1, 'M7'), (F2, 'sus'), (C2, 'sus'), (D2, 'm9')]
a, b = T('truoc') - 0.2, T('ngoi') - 0.3; L = (b - a) / 4
for i, (rt, k) in enumerate(sec):
    place(music, pad(chord(rt, k), L + 1.2, a=0.9, r=1.2, bright=1000 - i * 120), a + i * L, 0.85, verb=0.35)
    place(music, sub(rt, L + 0.8, 0.6, 0.8), a + i * L, 0.55)
# III. Waiting: tension — D minor cluster, tightening filter, clock pulse; then silence before "Và giờ"
a, b = T('ngoi') - 0.4, T('vagio') - 0.7
d = b - a
cl = pad([62, 63, 69, 74, 75], d + 0.3, a=2.5, r=0.6, bright=2200)
cl *= np.linspace(0.4, 1.0, len(cl))
place(music, cl, a, 0.6, verb=0.5)
place(music, sub(D2 - 12 + 12, d + 0.3, 1.0, 0.4), a, 0.6)
beat = 0.0
while a + beat < b:
    tick = hp(noise(0.03), 3000) * env(0.03, 0.001, 0.028, 3)
    place(sfx, tick, a + beat, 0.10, pan=0.2)
    if int(beat) % 1 == 0:
        thump = np.sin(2 * np.pi * 55 * tt(0.25)) * env(0.25, 0.005, 0.24, 4)
        place(music, thump, a + beat, 0.35)
    beat += 1.0 - min(0.35, beat * 0.04)  # the clock quietly speeds up
# IV. REVELATION: boom + open major sound (Bb maj9 → F maj9), the climax of the score
r0 = T('reveal')
rise = noise(1.0); rise = bp(rise, 300, 6000) * np.linspace(0, 1, len(rise)) ** 3
place(sfx, rise, r0 - 1.0, 0.25, verb=0.3)
boom = np.sin(2 * np.pi * (40 + 30 * np.exp(-tt(2.5) * 6)) * tt(2.5)) * env(2.5, 0.003, 2.4, 2.5)
place(music, boom, r0, 1.1)
place(music, pad(chord(Bb1 + 12, 'M9'), 3.3, a=0.05, r=2.5, bright=3200), r0, 1.25, verb=0.7)
place(music, pad(chord(F2, 'M9'), 5.5, a=1.2, r=3.0, bright=2600), r0 + 2.9, 1.0, verb=0.6)
place(music, sub(Bb1, 3.2, 0.02, 2.5), r0, 0.8); place(music, sub(F2 - 12, 5.0, 1.0, 2.5), r0 + 2.9, 0.6)
for i, m in enumerate([77, 81, 84, 89]):
    place(music, bell(m, 4.5), r0 + 0.05 + i * 0.11, 0.30, pan=-0.4 + i * 0.27, verb=0.8)
# V. Kitchen + ingredients: warm F – C/E – Dm – Bb with a soft plucked pulse
a, b = T('noicom') - 0.4, T('nhungnho') - 0.2; L = (b - a) / 4
prog = [(F2, 'M9', [65, 69, 72, 76]), (C2 + 12, 'sus', [64, 67, 72, 74]), (D2, 'm9', [62, 65, 69, 72]), (Bb1, 'M7', [62, 65, 69, 70])]
for i, (rt, k, arp) in enumerate(prog):
    place(music, pad(chord(rt, k), L + 1.0, a=0.6, r=1.0, bright=1500), a + i * L, 0.8, verb=0.35)
    place(music, sub(rt, L + 0.6, 0.4, 0.6), a + i * L, 0.5)
    step = 0.375; n = int(L / step)
    for j in range(n):
        place(music, pluck(arp[j % 4] + 12, 1.2), a + i * L + j * step, 0.22 * (0.8 + 0.2 * (j % 2 == 0)), pan=(-0.3 if j % 2 else 0.3), verb=0.3)
# VI. Taste: thin to a felt piano, intimate
a = T('nhungnho') - 0.05
for i, (m, dt) in enumerate([(69, 0), (65, 0.9), (62, 1.8), (64, 3.0), (65, 3.9), (60, 4.9)]):
    place(music, piano(m, 3.5), a + dt, 0.55, pan=-0.1 + 0.05 * i, verb=0.5)
place(music, pad(chord(D2, 'm9'), T('claude') - a + 0.6, a=1.0, r=1.0, bright=700), a, 0.5, verb=0.4)
# VII. Race: driving low pulse building to the flare on "nấu"
a, b = T('claude') - 0.3, T('cauhoi') - 0.2
pk = TW('nghiemtuc', 1)
d = b - a
place(music, pad(chord(D2, 'sus'), pk - a + 0.2, a=1.5, r=0.3, bright=1800) * 1.0, a, 0.7, verb=0.4)
place(music, pad(chord(Bb1 + 12, 'M9'), b - pk + 1.0, a=0.05, r=1.2, bright=3000), pk, 0.95, verb=0.6)
bt = a
while bt < b:
    k = (bt - a) / d
    kick = np.sin(2 * np.pi * (48 + 50 * np.exp(-tt(0.35) * 25)) * tt(0.35)) * env(0.35, 0.002, 0.33, 3)
    place(music, kick, bt, 0.25 + 0.45 * min(1, k * 1.4))
    bt += 0.5 if bt < T('huong') else 0.25 if bt < pk else 0.5
for k_ in ['claude', 'codex', 'antig']:
    place(music, bell({'claude': 74, 'codex': 77, 'antig': 81}[k_], 3.0), T(k_) + 0.05, 0.28, verb=0.7)
fl = bp(noise(1.6), 200, 3000) * env(1.6, 0.05, 1.5, 2)
place(sfx, fl, pk - 0.05, 0.22, verb=0.4)
place(music, np.sin(2 * np.pi * 42 * tt(2.0)) * env(2.0, 0.004, 1.9, 2.5), pk, 0.7)
# VIII. Question: near-silence, one held note, a lone piano
a = T('cauhoi') - 0.15
place(music, pad([62, 69], T('dadi') - a + 0.3, a=1.0, r=0.6, bright=600), a, 0.55, verb=0.6)
for m, dt in [(74, 0.2), (72, 3.3), (69, 4.4)]:
    place(music, piano(m, 4.0), a + dt, 0.45, verb=0.6)
# IX. Ending: warm resolve Bb → F (plagal), the stove still lit
a = T('dadi') - 0.1
place(music, pad(chord(Bb1 + 12, 'M7'), 2.4, a=0.4, r=1.2, bright=1600), a, 0.8, verb=0.6)
place(music, pad(chord(F2, 'M9'), DUR - a - 0.8, a=1.2, r=2.5, bright=1800), a + 1.3, 0.85, verb=0.7)
place(music, sub(F2 - 12, DUR - a - 0.6, 1.0, 2.5), a + 1.3, 0.55)
place(music, bell(77, 6.0), T('dolua') + 0.05, 0.32, verb=0.9)

# ───────── SOUND DESIGN ─────────
gap = TW('lid', 1)
thud = np.sin(2 * np.pi * (70 + 40 * np.exp(-tt(0.5) * 30)) * tt(0.5)) * env(0.5, 0.001, 0.49, 4)
click = hp(noise(0.02), 2500) * env(0.02, 0.0005, 0.019, 3)
place(sfx, thud, gap + 0.5, 0.9); place(sfx, click, gap + 0.5, 0.35)
place(sfx, lp(noise(0.4), 900) * env(0.4, 0.002, 0.39, 4), gap + 0.5, 0.25)
# ember spark: crystalline + crackle
place(sfx, bell(93, 2.5), T('code') - 0.05, 0.13, verb=0.8)
for i in range(7):
    c = hp(noise(0.006), 4000) * env(0.006, 0.0003, 0.0055, 2)
    place(sfx, c, T('code') + rng.random() * 0.9, 0.08 * rng.random() + 0.03, pan=rng.random() - 0.5)
# typing ticks while code writes itself
ta = T('write'); tb = TE('write') + 0.7; x = ta
while x < tb:
    k = hp(noise(0.012), 1800) * env(0.012, 0.0005, 0.011, 3)
    place(sfx, bp(k, 1500, 7000), x, 0.06 + 0.04 * rng.random(), pan=rng.random() * 0.6 - 0.3)
    x += 0.05 + rng.random() * 0.06
# gas ignition + hiss
ig = TW('bepga', 4)
fw = lp(noise(0.7), 600) * env(0.7, 0.01, 0.65, 3); place(sfx, fw, ig, 0.6)
place(sfx, hp(noise(0.05), 3500) * env(0.05, 0.001, 0.04), ig - 0.03, 0.25)
out = TW('tatbep', 2) + 0.05
hs = bp(noise(out - ig), 2500, 9000) * env(out - ig, 0.4, 0.1, 1)
place(sfx, hs, ig, 0.02)
# ticket tap, small lid shut, flame out
place(sfx, bp(noise(0.05), 400, 2500) * env(0.05, 0.001, 0.049, 3), TW('giao', 0) + 0.85, 0.25)
place(sfx, thud[: int(0.25 * SR)], T('tatmay') + 0.3, 0.35); place(sfx, click, T('tatmay') + 0.3, 0.2)
pf = bp(noise(0.6), 300, 2500) * env(0.6, 0.01, 0.55, 3); place(sfx, pf, out, 0.35)
# strike on "AI"
st = PH['khongai']['words'][4]['end'] + 0.05
place(sfx, bp(noise(0.35), 1500, 6000) * env(0.35, 0.005, 0.3, 2), st, 0.12, pan=0.2)
# ember travel + tether cut
place(sfx, bp(noise(1.3), 400, 3000) * np.sin(np.linspace(0, np.pi, int(1.3 * SR))) ** 2, T('cloud') + 0.1, 0.12, verb=0.5)
place(sfx, bell(96, 1.0), TW('thayvi', 3) + 0.05, 0.08, verb=0.5)
# rice cooker button: click + soft confirmation tone
bn = TW('bamnut', 0) + 0.1
place(sfx, click, bn, 0.5); place(sfx, lp(noise(0.03), 1200) * env(0.03, 0.001, 0.029), bn, 0.4)
place(sfx, np.sin(2 * np.pi * 880 * tt(0.5)) * env(0.5, 0.01, 0.45, 2), bn + 0.12, 0.08, verb=0.4)
# footsteps away
for i in range(3):
    place(sfx, lp(noise(0.08), 500) * env(0.08, 0.002, 0.075, 4), T('roidi') + 0.1 + i * 0.36, 0.22 * (1 - i * 0.25), pan=0.3 + i * 0.2)
place(sfx, thud[: int(0.25 * SR)], T('dong') + 0.45, 0.3); place(sfx, click, T('dong') + 0.45, 0.15)
# steam, soft, under "vẫn nấu"
place(sfx, bp(noise(6.0), 1200, 6000) * env(6.0, 1.0, 2.0, 1.5), T('vannau') - 0.3, 0.02)
# ingredient chips land
for k_, dt in [('github', 0.95), ('drive', 0.45), ('tep', 0.45)]:
    place(sfx, pluck(84, 0.6, 5000), T(k_) + dt, 0.18, verb=0.4)
place(sfx, bell(88, 1.2), T('tiendo') + 0.6, 0.1, verb=0.4)
# chopsticks tap + review ticks
place(sfx, hp(noise(0.015), 2000) * env(0.015, 0.0005, 0.014, 2), TW('nem', 2) + 0.3, 0.3)
sc_a, sc_b = T('doclai'), T('claude') - 0.5
for i in range(5):
    tk = sc_a + (sc_b - sc_a) * (i + 0.6) / 5.5
    place(sfx, pluck(91 if i != 2 else 86, 0.3, 6000), tk, 0.09, verb=0.3)
# question strike
place(sfx, bp(noise(0.4), 1200, 5000) * env(0.4, 0.005, 0.35, 2), PH['cauhoi']['words'][10]['end'] + 0.05, 0.1)
# final ember crackle
for i in range(40):
    tt0 = T('dadi') + rng.random() * (DUR - T('dadi') - 1.0)
    place(sfx, hp(noise(0.005), 3000) * env(0.005, 0.0002, 0.0045, 2), tt0, 0.02 + 0.03 * rng.random(), pan=rng.random() * 0.4 - 0.2)

# ───────── reverb (synthetic hall IR) ─────────
ir_t = tt(3.2)
ir = np.stack([rng.standard_normal(len(ir_t)), rng.standard_normal(len(ir_t))]) * np.exp(-ir_t * 2.2)
ir = np.stack([lp(ir[0], 6000), lp(ir[1], 6000)]) * 0.06
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
music += wet * 0.8
music = np.stack([hp(music[0], 35), hp(music[1], 35)])

# ───────── voice ─────────
w = wave.open(os.path.join(R, 'public/audio/charon_voice.wav'))
v = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
v = resample_poly(v, SR, w.getframerate())
v = hp(v, 70)
voice = np.zeros(N); voice[:min(N, len(v))] = v[:N]
# ───────── side-chain ducking ─────────
blk = 480; nb = N // blk + 1
pad_v = np.pad(voice, (0, nb * blk - N))
rms = np.sqrt((pad_v.reshape(nb, blk) ** 2).mean(1))
act = (rms > 0.01).astype(float)
envd = np.zeros(nb); cur = 0.0
for i in range(nb):
    tgt = act[i]
    cur += (tgt - cur) * (0.35 if tgt > cur else 0.035)  # fast attack, slow release
    envd[i] = cur
envd = np.repeat(envd, blk)[:N]
depth = np.full(N, 0.62)
r_a, r_b = int((T('reveal') - 0.2) * SR), int((T('cloud')) * SR)
depth[r_a:r_b] = 0.38  # let the climax breathe under the reveal line
gain_m = 1 - depth * envd
music *= gain_m; sfx *= (1 - 0.25 * envd)
# ───────── mix & master ─────────
mus_g, sfx_g, voi_g = 0.42, 0.75, 1.0
PRE = float(os.environ.get('PRE', '1.5'))
mix_ = music * mus_g + sfx * sfx_g + np.stack([voice, voice]) * voi_g
# loudness: pre-gain, then a smooth peak limiter (5 ms look-ahead, 80 ms release) to -1 dBFS
def limiter(x, ceil=0.84, la=240, rel=0.9985):
    pk = np.abs(x).max(0)
    # look-ahead max over la samples
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(pk, size=2 * la + 1)
    g_t = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    g = np.empty_like(g_t); c = 1.0
    for i in range(len(g_t)):
        c = g_t[i] if g_t[i] < c else c + (g_t[i] - c) * (1 - rel)
        g[i] = c
    return x * g
mix_ *= PRE
mix_ = limiter(mix_)
fade = int(0.8 * SR); mix_[:, -fade:] *= np.linspace(1, 0, fade) ** 2

def write(path, x):
    x = np.clip(x, -1, 1)
    i24 = (x.T * (2 ** 23 - 1)).astype(np.int32)
    b = np.zeros((i24.shape[0], i24.shape[1], 3), dtype=np.uint8)
    for k in range(3): b[:, :, k] = (i24 >> (8 * k)) & 0xFF
    ww = wave.open(path, 'wb'); ww.setnchannels(x.shape[0]); ww.setsampwidth(3); ww.setframerate(SR); ww.writeframes(b.tobytes()); ww.close()
write(os.path.join(R, 'public/audio/mix.wav'), mix_)
os.makedirs(os.path.join(H, 'stems'), exist_ok=True)
nm = np.abs(music).max() + 1e-9; ns = np.abs(sfx).max() + 1e-9
write(os.path.join(H, 'stems/music.wav'), music / nm * 0.89)
write(os.path.join(H, 'stems/sfx.wav'), sfx / ns * 0.89)
vo=np.stack([voice,voice])*voi_g*PRE; mu=music*mus_g*PRE
act_=envd>0.5
print('voice rms dB',20*np.log10(np.sqrt((vo[:,act_]**2).mean())),'music-under-voice dB',20*np.log10(np.sqrt((mu[:,act_]**2).mean())),'music-in-gaps dB',20*np.log10(np.sqrt((mu[:,~act_]**2).mean())))
print('ok', DUR, 'peak', np.abs(mix_).max())
