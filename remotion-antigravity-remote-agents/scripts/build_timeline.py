"""Builds src/timeline.json from audio/alignment.json (word timestamps of the single Charon take).
Every scene cut, motion beat, caption and sound cue is keyed to these real timestamps."""
import json,os
H=os.path.dirname(os.path.abspath(__file__));R=os.path.dirname(H)
A=json.load(open(os.path.join(R,'audio/alignment.json'),encoding='utf-8'))
KEYS="""lid code write voly bepga truoc giao giaoxong canh tatmay tatbep noinguoi dodang ngoi maymo mat dat khongai thoigian
vagio reveal cloud thayvi noicom bamnut roidi dong vannau github drive tep tiendo browser nhungnho comchin nem codeagent doclai
claude codex antig huong vagoogle roro nghiemtuc cauhoi maila roidi2 tieptuc dadi dolua""".split()
P=A['phrases'];assert len(P)==len(KEYS),(len(P),len(KEYS))
# attach words to phrases
W=A['words'];i=0;out=[]
for k,p in zip(KEYS,P):
    n=len(p['text'].split());ws=W[i:i+n];i+=n
    out.append(dict(key=k,text=p['text'],start=p['start'],end=min(p['end'],ws[-1]['end']),words=ws))
FPS=30;TAIL=3.6
voice_end=out[-1]['end']
json.dump(dict(fps=FPS,voiceDuration=A['duration'],durationInFrames=int(round((voice_end+TAIL)*FPS)),phrases=out),
          open(os.path.join(R,'src/timeline.json'),'w'),ensure_ascii=False,indent=1)
# SRT from real timestamps (phrase-level, merged into readable lines of <= ~42 chars)
def ts(t):
    ms=int(round(t*1000));h=ms//3600000;m=ms//60000%60;s=ms//1000%60;return f"{h:02}:{m:02}:{s:02},{ms%1000:03}"
cues=[];cur=None
for p in out:
    if cur and len(cur['text'])+1+len(p['text'])<=44 and p['start']-cur['end']<0.5 and not cur['text'].endswith(('.','?')):
        cur['text']+=' '+p['text'];cur['end']=p['end']
    else:
        if cur:cues.append(cur)
        cur=dict(text=p['text'],start=p['start'],end=p['end'])
cues.append(cur)
with open(os.path.join(R,'out/bep-van-do-lua.srt'),'w',encoding='utf-8') as f:
    for n,c in enumerate(cues,1): f.write(f"{n}\n{ts(c['start'])} --> {ts(c['end']+0.15)}\n{c['text']}\n\n")
print('frames',int(round((voice_end+TAIL)*FPS)),'cues',len(cues))
