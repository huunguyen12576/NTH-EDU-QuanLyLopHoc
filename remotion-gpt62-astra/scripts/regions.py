# Detect speech regions (energy envelope), then transcribe each via Gemini to verify content & alignment.
import sys,json,os,base64,urllib.request,subprocess,time,wave,numpy as np
WAV=sys.argv[1]; KEY=os.environ["GEMINI_KEY"]
w=wave.open(WAV);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(float)/32768
hop=sr//50; db=np.array([20*np.log10(np.sqrt(np.mean(x[i:i+hop]**2))+1e-9) for i in range(0,len(x)-hop,hop)])
on=db>-36; segs=[];s=None
for i,v in enumerate(on):
    if v and s is None: s=i
    if not v and s is not None: segs.append([s,i]); s=None
if s is not None: segs.append([s,len(on)])
m=[]
for a,b in segs:
    if m and a-m[-1][1]<12: m[-1][1]=b
    else: m.append([a,b])
R=[(a*0.02,b*0.02) for a,b in m if b-a>3]
os.makedirs("/tmp/claude-0/reg2",exist_ok=True); out=[]
for i,(a,b) in enumerate(R):
    f=f"/tmp/claude-0/reg2/{i}.wav"; subprocess.run(["ffmpeg","-y","-v","error","-ss",str(max(0,a-0.05)),"-to",str(b+0.08),"-i",WAV,f])
    d=base64.b64encode(open(f,"rb").read()).decode()
    body={"contents":[{"parts":[{"inlineData":{"mimeType":"audio/wav","data":d}},{"text":"Chép lại chính xác những từ nghe được trong đoạn audio ngắn này (tiếng Việt hoặc tiếng Anh). Viết số bằng chữ. Chỉ trả về văn bản."}]}]}
    txt="ERR"
    for mdl in ["gemini-3-flash-preview","gemini-3.5-flash","gemini-flash-latest"]:
        try:
            req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{mdl}:generateContent?key={KEY}",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
            r=json.load(urllib.request.urlopen(req,timeout=90)); txt=r["candidates"][0]["content"]["parts"][-1]["text"].strip(); break
        except Exception as e: txt=f"ERR {e}"; time.sleep(2)
    out.append([round(a,2),round(b,2),txt]); print(f"{a:6.2f}-{b:6.2f} {txt}",flush=True)
json.dump(out,open(WAV.replace(".wav","_regions.json"),"w"),ensure_ascii=False)
