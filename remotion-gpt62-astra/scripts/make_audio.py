"""Original score + SFX synthesized from scratch (numpy), voice processing and final mix.
Everything here is generated procedurally -> no third-party music/SFX licensing involved."""
import json, wave, subprocess, numpy as np
SR=48000; T=json.load(open("src/timeline.json")); D=T["duration"]
WP=T["warp"]
def W(lt):  # legacy story time -> real video time (inverse of the warp table)
    for (a0,b0),(a1,b1) in zip(WP,WP[1:]):
        if lt<=b1: return a0+(lt-b0)/(b1-b0)*(a1-a0)
    return WP[-1][0]
B={k:W(v) for k,v in T["beats"].items()}
N=int(D*SR); t=np.arange(N)/SR; rng=np.random.default_rng(7)
def note(m): return 440*2**((m-69)/12)
def env(n,a,r): 
    e=np.ones(n); a=int(a*SR); r=int(r*SR)
    if a: e[:a]=np.linspace(0,1,a)
    if r: e[-r:]*=np.linspace(1,0,r)
    return e
def lp(x,fc):  # one-pole lowpass, fc may be array
    fc=np.broadcast_to(np.asarray(fc,float),x.shape); a=np.exp(-2*np.pi*fc/SR); y=np.empty_like(x); s=0.0
    for i in range(len(x)): s=(1-a[i])*x[i]+a[i]*s; y[i]=s
    return y
def put(buf,sig,at,g=1.0):
    i=int(at*SR); j=min(len(buf),i+len(sig)); 
    if i<len(buf): buf[i:j]+=g*sig[:j-i]
L=np.zeros(N); R=np.zeros(N)
# ---- Pad: Dm9 - Bbmaj7 - Fadd9 - C(sus) ; long chords, detuned saws, lowpassed
prog=[(0,[50,57,62,65,69]),(W(11.5),[46,53,58,62,69]),(W(18.24),[41,53,57,60,67]),(W(27.8),[46,53,58,62,65]),(W(30.88),[50,57,62,65,72]),(W(38.04),[41,53,57,60,64])]
pad=np.zeros(N)
for k,(st,ch) in enumerate(prog):
    en=prog[k+1][0] if k+1<len(prog) else D; n=int((en-st+1.5)*SR); tt=np.arange(n)/SR; s=np.zeros(n)
    for m in ch:
        for det in (-0.08,0.08):
            f=note(m+det/1.0); s+=((tt*f)%1*2-1)*0.06
    s*=env(n,1.2,1.5); put(pad,s,st)
cut=300+1500*(0.5+0.5*np.sin(2*np.pi*t/9))*np.clip((t-2)/10,0.15,1)
pad=lp(lp(pad,cut),2500)
# tension drop: duck pad at "Nhưng"
padg=np.ones(N); 
for a,b,g in [(W(18.0),W(18.5),0.25),(W(37.6),W(38.2),0.5)]:
    i,j=int(a*SR),int(b*SR); padg[i:j]=np.linspace(1,g,j-i); padg[j:j+int(1.2*SR)]=np.linspace(g,1,int(1.2*SR))
pad*=padg
# ---- Sub drone
sub=0.18*np.sin(2*np.pi*note(38)*t)*np.clip(t/3,0,1)*np.clip((D-t)/3,0,1)
# ---- Pulse (plucks) 100 BPM eighths, from scale to rumor, arpeggio of chord
pulse=np.zeros(N); step=60/100/2; arp=[62,69,65,72,62,69,65,74]
tt=np.arange(int(0.35*SR))/SR
for i,st in enumerate(np.arange(B["scale"]-0.0,B["rumor"]-0.3,step)):
    if B["but"]-0.2<st<B["price"]-0.1: continue
    m=arp[i%8]-12+(0 if st<B["but"] else -2 if st<B["bigger"] else 0)
    s=(np.sin(2*np.pi*note(m)*tt)+0.3*np.sin(4*np.pi*note(m)*tt))*np.exp(-tt*14)
    put(pulse,s*0.09*(0.7 if i%2 else 1),st)
# ---- Shimmer bells at reveal & end
bell=np.zeros(N)
for st,ms in [(B["astra"],[81,86,88,93]),(B["end"]-0.2,[81,84,88,91,96]),(B["many"],[86,91,93])]:
    for k,m in enumerate(ms):
        tt=np.arange(int(3*SR))/SR; s=(np.sin(2*np.pi*note(m)*tt)+0.2*np.sin(2*np.pi*note(m)*2.76*tt))*np.exp(-tt*1.6)
        put(bell,s*0.035,st+k*0.11)
# ---- SFX
sfx=np.zeros(N)
def boom(at,g=1.0):
    tt=np.arange(int(2.2*SR))/SR; f=55*np.exp(-tt*3)+32; ph=2*np.pi*np.cumsum(f)/SR
    s=np.sin(ph)*np.exp(-tt*2.2)+lp(rng.standard_normal(len(tt)),900)*np.exp(-tt*18)*0.8
    put(sfx,s*0.55*g,at)
def riser(at_end,dur,g=1.0):
    n=int(dur*SR); tt=np.arange(n)/SR; nz=rng.standard_normal(n); s=lp(nz,200+4000*(tt/dur)**2)*(tt/dur)**2
    put(sfx,s*0.35*g,at_end-dur)
def whoosh(at,g=1.0):
    n=int(0.7*SR); tt=np.arange(n)/SR; s=lp(rng.standard_normal(n),300+2500*np.sin(np.pi*tt/0.7))*np.sin(np.pi*tt/0.7)**2
    put(sfx,s*0.3*g,at-0.35)
def tick(at,g=1.0):
    tt=np.arange(int(0.03*SR))/SR; put(sfx,np.sin(2*np.pi*2400*tt)*np.exp(-tt*200)*0.12*g,at)
riser(B["reveal"],2.0); boom(B["reveal"]); boom(B["tenT"],1.1); riser(B["tenT"],1.2,0.7)
boom(B["bigger"],0.8); boom(B["cheap"],0.6); boom(B["end"]-0.2,0.7)
for a in [B["hint"]-0.1,B["big"]-0.2,B["scale"],B["price"],B["insight"],B["many"],B["rumor"],B["answer"]]: whoosh(a,0.8)
for k in np.arange(B["scale"]+0.6,B["tenT"],0.07): tick(k,0.6+0.4*(k-B["scale"])/2.4)
# heartbeat in tension gap (but -> price)
for k in [W(18.5),W(19.3),W(20.1)]:
    tt=np.arange(int(0.4*SR))/SR; put(sfx,np.sin(2*np.pi*48*tt)*np.exp(-tt*12)*0.35,k); put(sfx,np.sin(2*np.pi*45*tt)*np.exp(-tt*12)*0.25,k+0.22)
# ---- room tone (very low, "environment")
room=lp(rng.standard_normal(N),400)*0.004
music=pad*0.9+sub+pulse+bell
fade=np.clip((D-t)/2.5,0,1)*np.clip(t/0.3,0,1)
# stereo: widen pad/bells with small delay
dl=int(0.012*SR)
L=(music+sfx+room)*fade; R=(np.concatenate([np.zeros(dl),music[:-dl]])+sfx+room)*fade
def wr(fn,l,r):
    st=np.stack([l,r],1); st=st/max(1e-9,np.abs(st).max())*0.9
    w=wave.open(fn,"wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close()
wr("audio/score_sfx.wav",L,R)
print("score ok")
