import json, os, sys, base64, urllib.request, wave
KEY=os.environ["GEMINI_KEY"]
text=open("audio/voiceover.txt",encoding="utf-8").read().strip()
prompt=text  # text only: flash TTS models read style instructions aloud
body={"contents":[{"parts":[{"text":prompt}]}],
 "generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Charon"}}}}}
model=sys.argv[1] if len(sys.argv)>1 else "gemini-2.5-pro-preview-tts"
OUT=sys.argv[2] if len(sys.argv)>2 else "audio/voice_tts.wav"
req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={KEY}",
 data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
r=json.load(urllib.request.urlopen(req,timeout=300))
p=r["candidates"][0]["content"]["parts"][0]["inlineData"]
print(p["mimeType"])
pcm=base64.b64decode(p["data"])
if pcm[:4]==b"RIFF": open(OUT,"wb").write(pcm); sys.exit(0)
w=wave.open(OUT,"wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm); w.close()
