"""
Generate the whole narration in ONE Gemini TTS call (voice: Charon).
No per-scene clips, no stitching, no artificial silences.

  GEMINI_API_KEY=... python3 voice/tts.py [model]
  -> voice/narration_charon.wav (24 kHz mono, 16-bit)
"""
import base64
import json
import os
import sys
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = sys.argv[1] if len(sys.argv) > 1 else "gemini-2.5-pro-preview-tts"
KEY = os.environ["GEMINI_API_KEY"]
text = open(os.path.join(HERE, "narration.txt"), encoding="utf-8").read().strip()

prompt = (
    "Read the following Vietnamese narration aloud, in natural Northern Vietnamese, "
    "as a warm, deep, confident storyteller speaking directly to one listener. "
    "Confident, engaging storytelling pace (not slow), intimate, with gentle emphasis on key phrases. "
    "Short natural pauses at commas and full stops; a slightly longer breath only before a new idea. "
    "Pronounce Gemini, Claude and ChatGPT the English way.\n\n" + text
)

body = {
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {
        "responseModalities": ["AUDIO"],
        "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Charon"}}},
    },
}
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
    data=json.dumps(body).encode(),
    headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
)
with urllib.request.urlopen(req, timeout=600) as r:
    res = json.load(r)

part = res["candidates"][0]["content"]["parts"][0]["inlineData"]
pcm = base64.b64decode(part["data"])
out = os.path.join(HERE, "narration_charon.wav")
if pcm[:4] == b"RIFF":  # some TTS models already return a complete WAV file
    open(out, "wb").write(pcm)
    print(out, MODEL, part.get("mimeType"))
    sys.exit(0)
rate = 24000
if "rate=" in part.get("mimeType", ""):
    rate = int(part["mimeType"].split("rate=")[1].split(";")[0])
with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(pcm)
print(out, MODEL, part.get("mimeType"), f"{len(pcm) / 2 / rate:.2f}s")
