# Syllable-proportional alignment of phrases onto detected speech regions, snapped to pauses.
import subprocess, re, json
WAV="audio/voice_tts.wav"
dur=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",WAV]))
log=subprocess.run(["ffmpeg","-hide_banner","-i",WAV,"-af","silencedetect=n=-38dB:d=0.12","-f","null","-"],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r"silence_start: ([\d.]+)",log)]; en=[float(x) for x in re.findall(r"silence_end: ([\d.]+)",log)]
sil=list(zip(st,en))
if len(en)>len(st): sil=[(0,en[0])]+list(zip(st,en[1:]))
speech=[];t=0
for a,b in sil:
    if a>t: speech.append((t,a))
    t=b
if t<dur: speech.append((t,dur))
phrases=[l.strip() for l in open("audio/phrases.txt",encoding="utf-8") if l.strip()]
syl=[len(p.split()) for p in phrases]
tot=sum(b-a for a,b in speech); S=sum(syl)
def at(frac):  # speech-time fraction -> wall time
    x=frac*tot
    for a,b in speech:
        if x<=b-a: return a+x
        x-=b-a
    return speech[-1][1]
gaps=[(a,b) for a,b in sil]
def snap(t):
    best=min(gaps,key=lambda g:min(abs(t-g[0]),abs(t-g[1])))
    return best if min(abs(t-best[0]),abs(t-best[1]))<0.6 else None
out=[];c=0;prev_end=speech[0][0]
for i,p in enumerate(phrases):
    c+=syl[i]
    if i==len(phrases)-1: end=speech[-1][1]; nxt=None
    else:
        t=at(c/S); g=snap(t); end=g[0] if g else t; nxt=g[1] if g else t
    out.append({"text":p,"start":round(prev_end,3),"end":round(end,3)})
    prev_end=nxt if nxt else end
json.dump({"duration":dur,"phrases":out},open("src/timing.json","w"),ensure_ascii=False,indent=1)
for o in out: print(f'{o["start"]:6.2f} {o["end"]:6.2f}  {o["text"]}')
