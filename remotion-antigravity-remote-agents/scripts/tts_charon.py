import json,base64,sys,urllib.request,os,wave
S=sys.argv[1]; model=sys.argv[2]
text=open(S+'/narration.txt',encoding='utf-8').read()
prompt0=("Hãy đọc đoạn sau bằng tiếng Việt chuẩn, giọng một người kể chuyện điện ảnh: trầm, ấm, tự tin, "
"chậm rãi vừa phải, có nhấn nhá và ngừng tự nhiên theo dấu câu, như đang nói chuyện trực tiếp với một người bạn. "
"Câu đầu tiên đọc chậm, đầy bí ẩn. Câu cuối đọc nhẹ, lắng đọng.\n\n"+text)
prompt="Read aloud, in a deep, warm, confident cinematic storyteller voice, natural Vietnamese, with expressive pauses at punctuation. Only speak the transcript after the colon.\n\nTRANSCRIPT:\n"+text
body={"contents":[{"parts":[{"text":prompt}]}],
 "generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Charon"}}}}}
req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
 data=json.dumps(body).encode(),headers={"Content-Type":"application/json","x-goog-api-key":os.environ["GK"]})
r=json.load(urllib.request.urlopen(req,timeout=300))
p=r["candidates"][0]["content"]["parts"][0]["inlineData"]
print(p["mimeType"])
pcm=base64.b64decode(p["data"])
w=wave.open(S+'/charon_raw.wav','wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(pcm);w.close()
print(len(pcm)/48000,"s")
