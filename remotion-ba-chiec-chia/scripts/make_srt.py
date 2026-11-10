"""SRT from the real word timestamps (voice/words.json); same phrase chunking as the on-screen subtitles."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(os.path.join(ROOT, "voice", "words.json")))["words"]
chunks, a = [], 0
for i, w in enumerate(W):
    end = re.search(r"[.,?!:…]$", w["w"]) or i == len(W) - 1
    if end and (i - a >= 2 or re.search(r"[.?!]$", w["w"]) or i == len(W) - 1):
        chunks.append((a, i)); a = i + 1
def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
out = []
for k, (i, j) in enumerate(chunks):
    start = W[i]["s"]
    end = min(W[j]["e"] + 0.35, W[chunks[k + 1][0]]["s"] - 0.04) if k + 1 < len(chunks) else W[j]["e"] + 0.6
    text = " ".join(w["w"] for w in W[i:j + 1]).replace("...", "…")
    out.append(f"{k + 1}\n{ts(start)} --> {ts(end)}\n{text}\n")
open(os.path.join(ROOT, "out", "ba-chiec-chia.srt"), "w", encoding="utf-8").write("\n".join(out))
print(len(out), "cues")
