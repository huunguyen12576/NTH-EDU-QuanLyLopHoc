import json,base64,sys,urllib.request,os
wav,model,out=sys.argv[1],sys.argv[2],sys.argv[3]
prompt=sys.argv[4] if len(sys.argv)>4 else "Transcribe this Vietnamese audio verbatim. Return JSON: {\"words\":[{\"w\":word,\"start\":seconds,\"end\":seconds}]} with precise word-level timestamps in seconds (3 decimals)."
body={"contents":[{"parts":[{"inlineData":{"mimeType":"audio/wav","data":base64.b64encode(open(wav,'rb').read()).decode()}},{"text":prompt}]}],
 "generationConfig":{"responseMimeType":"application/json","temperature":0}}
req=urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",data=json.dumps(body).encode(),headers={"Content-Type":"application/json","x-goog-api-key":os.environ["GK"]})

try:
  r=json.load(urllib.request.urlopen(req,timeout=600))
except urllib.error.HTTPError as e:
  print(e.read().decode()[:800]);sys.exit(1)
t=r["candidates"][0]["content"]["parts"][0]["text"]
open(out,'w').write(t);print(t[:3000])
