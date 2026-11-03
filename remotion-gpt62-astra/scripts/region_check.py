import json,os,base64,urllib.request,subprocess,sys,concurrent.futures as cf
KEY=os.environ["GEMINI_KEY"]
R=[(0.22,1.12),(1.36,2.26),(2.62,3.06),(3.46,4.10),(4.48,6.26),(6.80,8.20),(8.62,9.72),(10.26,11.04),(12.00,12.34),(12.88,14.46),(15.46,16.72),(17.20,17.64),(18.70,19.10),(19.32,20.12),(20.46,21.44),(22.16,24.32),(25.46,26.12),(26.88,28.66),(29.70,30.44),(30.80,31.44),(32.28,34.92),(35.38,37.68),(39.26,39.84),(40.34,41.14),(42.34,42.70),(43.08,45.16),(45.66,46.00),(46.18,47.12),(47.38,48.28),(49.50,49.90),(50.16,50.70),(51.38,51.84),(52.38,53.34)]
def go(i):
    a,b=R[i]; f=f"/tmp/claude-0/reg/{i}.wav"
    subprocess.run(["ffmpeg","-y","-v","error","-ss",str(max(0,a-0.05)),"-to",str(b+0.05),"-i","audio/voice_tts.wav",f])
    d=base64.b64encode(open(f,"rb").read()).decode()
    body={"contents":[{"parts":[{"inlineData":{"mimeType":"audio/wav","data":d}},{"text":"Chép lại chính xác những từ tiếng Việt nghe được trong đoạn audio ngắn này. Chỉ trả về văn bản; nếu không có lời nói thì trả về [none]."}]}]}
    for m in ["gemini-3.5-flash","gemini-flash-latest","gemini-3-flash-preview"]:
        try:
            req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={KEY}",data=json.dumps(body).encode(),headers={"Content-Type":"application/json"})
            r=json.load(urllib.request.urlopen(req,timeout=120)); return i,r["candidates"][0]["content"]["parts"][-1]["text"].strip()
        except Exception as e: err=str(e)
    return i,"ERR "+err
import time
idx=[int(x) for x in sys.argv[1:]] or range(len(R))
with cf.ThreadPoolExecutor(1) as ex:
    for i,t in sorted(ex.map(lambda i:(time.sleep(2),go(i))[1],idx)): print(f"R{i+1:02d} {R[i][0]:6.2f}-{R[i][1]:6.2f} {t}")
