import json,os,base64,urllib.request
KEY=os.environ["GEMINI_KEY"]
audio=base64.b64encode(open("audio/voice_tts.wav","rb").read()).decode()
phr=[l.strip() for l in open("audio/phrases.txt",encoding="utf-8") if l.strip()]
q=("Đây là một bản ghi giọng đọc tiếng Việt. Với MỖI cụm dưới đây (theo đúng thứ tự), hãy cho biết thời điểm bắt đầu và kết thúc "
"(tính bằng giây, 2 chữ số thập phân) mà cụm đó được đọc trong audio. Đồng thời ghi lại 'heard' là văn bản bạn thực sự nghe. "
"Trả về JSON: [{\"i\":0,\"start\":..,\"end\":..,\"heard\":\"..\"}]\n\n"+"\n".join(f"{i}. {p}" for i,p in enumerate(phr)))
body={"contents":[{"parts":[{"inlineData":{"mimeType":"audio/wav","data":audio}},{"text":q}]}],"generationConfig":{"responseMimeType":"application/json"}}
for model in ["gemini-3.8-flash","gemini-3.5-flash","gemini-flash-latest"]:
    try:
        req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={KEY}",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
        r=json.load(urllib.request.urlopen(req,timeout=300)); break
    except Exception as e: print(model,e)
t=r["candidates"][0]["content"]["parts"][-1]["text"]; open("audio/gemini_align.json","w").write(t)
for o in json.loads(t): print(f'{o["start"]:6.2f} {o["end"]:6.2f} {phr[o["i"]][:30]:32s}| {o["heard"]}')
