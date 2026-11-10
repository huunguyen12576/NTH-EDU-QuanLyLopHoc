"""Ask a Gemini model to listen to a take and flag mispronunciations / glitches (voice QA)."""
import base64, json, os, sys, urllib.request
wav, model = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "gemini-2.5-pro"
script = open(os.path.join(os.path.dirname(__file__), "narration.txt"), encoding="utf-8").read()
q = ("You are a strict Vietnamese voice-over QA engineer. Listen to the audio and compare it with the script below. "
     "List every word that is mispronounced (wrong tone/diacritic, wrong syllable), skipped, added, slurred, any audio glitch, "
     "any unnatural pause, and how the English names Gemini/Claude/ChatGPT/Google/Gmail/Docs/Sheets/YouTube sound. "
     "Give timestamps (mm:ss). Then give an overall score /10 for naturalness and for clarity. Be concise.\n\nSCRIPT:\n" + script)
body = {"contents": [{"parts": [{"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(open(wav, "rb").read()).decode()}}, {"text": q}]}]}
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
res = json.load(urllib.request.urlopen(req, timeout=600))
print("".join(p.get("text", "") for p in res["candidates"][0]["content"]["parts"]))
