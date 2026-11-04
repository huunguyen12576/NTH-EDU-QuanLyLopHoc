# Energy-based forced alignment: known transcript + silence boundaries + syllable-proportional timing,
# anchored to sentence onsets from an ASR pass. Vietnamese is monosyllabic -> 1 word ~ 1 syllable.
import wave,numpy as np,json,re,sys
S=sys.argv[1]
w=wave.open(S+'/charon.wav');raw=b'\0'*44+w.readframes(w.getnframes())
x=np.frombuffer(raw[44:],dtype=np.int16).astype(np.float32)/32768;sr=24000
hop=240  # 10ms
n=len(x)//hop;fr=x[:n*hop].reshape(n,hop)
db=20*np.log10(np.sqrt((fr**2).mean(1))+1e-9)
thr=db.max()-38
voiced=db>thr
# smooth: close tiny gaps <60ms, drop blips <40ms
def runs(b):
    r=[];i=0
    while i<len(b):
        j=i
        while j<len(b) and b[j]==b[i]: j+=1
        r.append([b[i],i,j]);i=j
    return r
v=voiced.copy()
for val,i,j in runs(v):
    if not val and j-i<6 and i>0: v[i:j]=True
for val,i,j in runs(v):
    if val and j-i<4: v[i:j]=False
segs=[(i*0.01,j*0.01) for val,i,j in runs(v) if val]
gaps=[(segs[k][1],segs[k+1][0]) for k in range(len(segs)-1)]
text=open(S+'/narration.txt',encoding='utf-8').read()
SYL={'laptop':2,'ai':2,'agent':2,'agents':2,'google':2,'antigravity':5,'remote':2,'github':2,'drive':1,'claude':1,'codex':2,'code':1}
toks=[]
for line in text.strip().split('\n'):
    for m in re.finditer(r"[^\s]+",line):
        t=m.group(0);core=re.sub(r"[^\wÀ-ỹ]","",t)
        punct=re.search(r"[,.?:…!]$",t) is not None
        toks.append(dict(w=t,core=core,syl=SYL.get(core.lower(),1),p=punct))
# phrases
phr=[];cur=[]
for t in toks:
    cur.append(t)
    if t['p']: phr.append(cur);cur=[]
if cur: phr.append(cur)
syl=[sum(t['syl'] for t in p) for p in phr]
T0,T1=segs[0][0],segs[-1][1]
voicedT=sum(b-a for a,b in segs); rate=voicedT/sum(syl)
# DP: choose gap index for each of n-1 boundaries
G=len(gaps);N=len(phr)
gl=[b-a for a,b in gaps]
INF=1e18
def pcost(a,b,s):
    d=b-a; e=d-rate*s*1.08
    return e*e/max(s,1)*4
# cost[i][g]: phrases 0..i placed, boundary after phrase i at gap g
import functools
best=np.full((N,G+1),INF);bp=np.zeros((N,G+1),int)
for g in range(G):
    best[0][g]=pcost(T0,gaps[g][0],syl[0]) + sum(gl[:g])*3
for i in range(1,N-1):
    for g in range(G):
        for h in range(g):
            c=best[i-1][h]+pcost(gaps[h][1],gaps[g][0],syl[i])+sum(gl[h+1:g])*3
            if c<best[i][g]: best[i][g]=c;bp[i][g]=h
fin=INF;fg=0
for h in range(G):
    c=best[N-2][h]+pcost(gaps[h][1],T1,syl[N-1])+sum(gl[h+1:])*3
    if c<fin: fin=c;fg=h
bnd=[0]*(N-1);g=fg
for i in range(N-2,-1,-1):
    bnd[i]=g; g=bp[i][g]
spans=[]
for i in range(N):
    a=T0 if i==0 else gaps[bnd[i-1]][1]
    b=T1 if i==N-1 else gaps[bnd[i]][0]
    spans.append((a,b))
words=[]
for p,(a,b) in zip(phr,spans):
    # voiced sub-intervals inside span
    sub=[(max(s0,a),min(s1,b)) for s0,s1 in segs if s1>a and s0<b]
    tot=sum(y-x for x,y in sub);S_=sum(t['syl'] for t in p)
    def tmap(f):  # fraction of voiced time -> absolute
        acc=f*tot
        for x0,y0 in sub:
            if acc<=y0-x0: return x0+acc
            acc-=y0-x0
        return sub[-1][1]
    k=0
    for t in p:
        s=tmap(k/S_); k+=t['syl']; e=tmap(k/S_)
        words.append(dict(w=t['w'],start=round(s,3),end=round(e,3)))
json.dump(dict(duration=len(x)/sr,words=words,phrases=[dict(text=' '.join(t['w'] for t in p),start=round(a,3),end=round(b,3)) for p,(a,b) in zip(phr,spans)]),open(S+'/alignment.json','w'),ensure_ascii=False,indent=1)
for p,(a,b) in zip(phr,spans): print(f"{a:6.2f}-{b:6.2f}  {' '.join(t['w'] for t in p)}")
print('rate',rate,'segs',len(segs),'phr',N)
