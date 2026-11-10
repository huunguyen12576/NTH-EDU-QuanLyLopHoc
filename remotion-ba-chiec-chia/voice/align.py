"""
Forced alignment: word timestamps from the FINAL voice file.
Whisper-small (faster-whisper, CTranslate2 int8) transcribes with word timestamps,
then the recognised words are aligned to the known script (difflib on normalised
syllables), so every script word gets a real start/end from the audio.
Unmatched script words are interpolated between matched neighbours.

  python3 voice/align.py <wav> <model_dir>  -> voice/words.json, voice/asr.txt
"""
import difflib, json, os, re, sys, unicodedata
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
wav, model_dir = sys.argv[1], sys.argv[2]

def norm(s):
    s = unicodedata.normalize("NFC", s.lower())
    return re.sub(r"[^\w]", "", s)

script_raw = open(os.path.join(HERE, "narration.txt"), encoding="utf-8").read()
script = [w for w in script_raw.split() if norm(w)]

import numpy as np, soundfile as sf
from scipy.signal import resample_poly
_x, _sr = sf.read(wav, dtype="float32")
if _x.ndim > 1: _x = _x.mean(1)
from math import gcd
_g = gcd(16000, _sr); audio = resample_poly(_x, 16000 // _g, _sr // _g).astype("float32")
m = WhisperModel(model_dir, device="cpu", compute_type="int8")
segs, info = m.transcribe(audio, language="vi", word_timestamps=True, beam_size=5,
                          initial_prompt="Gemini, Claude, ChatGPT, Google, Gmail, Docs, Sheets, YouTube, AI.",
                          vad_filter=False, condition_on_previous_text=False)
asr = []
for s in segs:
    for w in s.words:
        for piece in w.word.split():
            if norm(piece):
                asr.append({"w": piece, "s": w.start, "e": w.end})
open(os.path.join(HERE, "asr.txt"), "w").write(" ".join(a["w"] for a in asr))

A = [norm(a["w"]) for a in asr]
B = [norm(w) for w in script]
sm = difflib.SequenceMatcher(None, B, A, autojunk=False)
times = [None] * len(B)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1):
            times[i1 + k] = (asr[j1 + k]["s"], asr[j1 + k]["e"])
    elif tag == "replace":
        # spread the recognised span across the script span (e.g. 'ChatGPT' vs 'chat gpt')
        s0, e0 = asr[j1]["s"], asr[j2 - 1]["e"]
        n = i2 - i1
        for k in range(n):
            times[i1 + k] = (s0 + (e0 - s0) * k / n, s0 + (e0 - s0) * (k + 1) / n)
matched = sum(1 for t in times if t)
# interpolate gaps
for i in range(len(times)):
    if times[i] is None:
        j = i
        while j < len(times) and times[j] is None:
            j += 1
        a = times[i - 1][1] if i > 0 else 0.0
        b = times[j][0] if j < len(times) else a + 0.3 * (j - i)
        n = j - i
        for k in range(n):
            times[i + k] = (a + (b - a) * k / n, a + (b - a) * (k + 1) / n)
words = [{"w": w, "s": round(t[0], 3), "e": round(t[1], 3)} for w, t in zip(script, times)]
json.dump({"duration": info.duration, "words": words}, open(os.path.join(HERE, "words.json"), "w"), ensure_ascii=False, indent=1)
print(f"script words {len(B)}, asr words {len(A)}, ratio {sm.ratio():.3f}, matched {matched}")

# ---- refine phrase boundaries on the real waveform -------------------------------
# Whisper word times are ~±0.1 s. Pauses are measured exactly from the signal
# (frame RMS below -42 dBFS for >= 0.18 s) and phrase edges are snapped to them.
x = _x
hop = int(_sr * 0.01)
rms = np.sqrt(np.convolve(x ** 2, np.ones(hop * 2) / (hop * 2), mode="same")[::hop] + 1e-12)
db = 20 * np.log10(rms + 1e-9)
quiet = db < -42
sil = []  # (start, end) seconds
i = 0
while i < len(quiet):
    if quiet[i]:
        j = i
        while j < len(quiet) and quiet[j]:
            j += 1
        if (j - i) * 0.01 >= 0.18:
            sil.append((i * 0.01, j * 0.01))
        i = j
    else:
        i += 1
W = words
if sil and sil[0][0] <= 0.02:
    W[0]["s"] = round(max(W[0]["s"], sil[0][1]), 3)
for k in range(1, len(W)):
    gap_mid = (W[k - 1]["e"] + W[k]["s"]) / 2
    best = min(sil, key=lambda p: abs((p[0] + p[1]) / 2 - gap_mid))
    if abs((best[0] + best[1]) / 2 - gap_mid) < 0.45 and best[1] - best[0] >= 0.18:
        if best[0] > W[k - 1]["s"] and best[1] < W[k]["e"]:
            W[k - 1]["e"] = round(best[0], 3)
            W[k]["s"] = round(best[1], 3)
last_voice = len(db) - 1
while last_voice > 0 and quiet[last_voice]:
    last_voice -= 1
W[-1]["e"] = round(min(W[-1]["e"] if W[-1]["e"] > W[-1]["s"] else 1e9, (last_voice + 1) * 0.01), 3)
json.dump({"duration": info.duration, "voice_end": (last_voice + 1) * 0.01, "words": W},
          open(os.path.join(HERE, "words.json"), "w"), ensure_ascii=False, indent=1)
print(f"pauses {len(sil)}, voice ends {(last_voice + 1) * 0.01:.2f}s, first word {W[0]['s']:.2f}s")
