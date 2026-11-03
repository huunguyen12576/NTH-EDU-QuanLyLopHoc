import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import './fonts.css';
import T from './timeline.json';
import {C, FONT, GRAD, Grain, Waves, pop, r, rio, rnd, shake, win} from './kit';

const B = T.beats;
const TIBO_AVATAR = (T as {tiboAvatar?: string | null}).tiboAvatar ?? null;

/** OpenAI logo (extracted from the user-supplied key visual) with a soft teal halo */
const Logo: React.FC<{size: number; glow?: number; rot?: number}> = ({size, glow = 1, rot = 0}) => (
  <div style={{position: 'relative', width: size, height: size}}>
    <div style={{position: 'absolute', inset: -size * 0.45, borderRadius: '50%',
      background: `radial-gradient(circle, rgba(124,245,210,${0.55 * glow}) 0%, rgba(124,245,210,0) 62%)`}} />
    <Img src={staticFile('logo_ink.png')} style={{position: 'absolute', inset: 0, width: size, height: size, transform: `rotate(${rot}deg)`}} />
  </div>
);
const W = T.warp as number[][];
const warp = (t: number) => {
  for (let i = 1; i < W.length; i++) {
    if (t <= W[i][0]) {
      const [a0, b0] = W[i - 1], [a1, b1] = W[i];
      return b0 + ((t - a0) / (a1 - a0)) * (b1 - b0);
    }
  }
  return W[W.length - 1][1];
};
const HITS = [B.reveal, B.tenT, B.bigger, B.cheap];

const center: React.CSSProperties = {position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: FONT};
const gradText: React.CSSProperties = {
  backgroundImage: GRAD,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

/* ---------------- S1 · HOOK ---------------- */
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#';
const TARGET = 'GPT-6.2 ASTRA';
const Hook: React.FC<{s: number; f: number}> = ({s, f}) => {
  const o = win(s, 0, 4.05, 0.01, 0.06);
  const head = r(s, 0.5, 1.1);
  const lock = (i: number) => s > 3.05 + i * 0.07;
  const scr = TARGET.split('').map((ch, i) => {
    if (ch === ' ' || ch === '-' || ch === '.') return ch;
    if (lock(i)) return ch;
    return GLYPHS[Math.floor(rnd(`g${i}-${Math.floor(f / 2)}`) * GLYPHS.length)];
  });
  const nameIn = r(s, 1.4, 1.9);
  const tremble = s > 2.4 ? Math.sin(s * 70) * r(s, 2.4, 4.0, 0, 3) : 0;
  const scan = ((s - 1.4) * 0.9) % 1;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{...center, top: 520, fontSize: 210, fontWeight: 900, color: C.ink, lineHeight: 1.2, whiteSpace: 'nowrap',
        letterSpacing: `${(1 - head) * 0.35 - 0.03}em`, opacity: head, filter: `blur(${(1 - head) * 18}px)`,
        transform: `scale(${1 + (1 - head) * 0.15 + r(s, 1, 4, 0, 0.04)})`}}>
        HÔM NAY
      </div>
      <div style={{...center, top: 800, fontSize: 40, fontWeight: 600, color: '#3D4B55', letterSpacing: '0.32em', opacity: nameIn}}>
        MỘT CÁI TÊN MỚI
      </div>
      <div style={{position: 'absolute', left: 90, right: 90, top: 880, height: 190, borderRadius: 28, overflow: 'hidden',
        background: 'rgba(255,255,255,0.55)', border: '2px solid rgba(13,17,23,0.08)', opacity: nameIn,
        transform: `translate(${tremble}px, ${(1 - nameIn) * 40}px)`, boxShadow: '0 30px 80px rgba(16,90,80,0.12)'}}>
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: 92, fontWeight: 900, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums'}}>
          {scr.map((ch, i) => (
            <span key={i} style={{color: lock(i) ? C.ink : 'rgba(13,17,23,0.18)', minWidth: ch === ' ' ? 30 : undefined,
              display: 'inline-block', transform: lock(i) ? `scale(${1 + 0.25 * Math.exp(-(s - 3.05 - i * 0.07) * 12)})` : undefined}}>
              {ch}
            </span>
          ))}
        </div>
        <div style={{position: 'absolute', top: 0, bottom: 0, width: 220, left: -220 + scan * 1120,
          background: 'linear-gradient(90deg, transparent, rgba(95,240,196,0.55), transparent)'}} />
      </div>
      {/* ignition: darkness split by a horizon of light */}
      <AbsoluteFill style={{background: C.night, opacity: s < 0.9 ? 1 : 0,
        WebkitMaskImage: `radial-gradient(ellipse ${r(s, 0.2, 0.85, 0, 160, Easing.in(Easing.quad))}% ${r(s, 0.2, 0.85, 0, 120, Easing.in(Easing.quad))}% at 50% 50%, transparent 70%, #000 100%)`,
        maskImage: `radial-gradient(ellipse ${r(s, 0.2, 0.85, 0, 160, Easing.in(Easing.quad))}% ${r(s, 0.2, 0.85, 0, 120, Easing.in(Easing.quad))}% at 50% 50%, transparent 70%, #000 100%)`}} />
      <div style={{position: 'absolute', top: 959, left: 540 - 540 * r(s, 0, 0.35), width: 1080 * r(s, 0, 0.35), height: 2,
        background: '#BFFFEA', boxShadow: '0 0 30px 8px rgba(95,240,196,0.8)', opacity: 1 - r(s, 0.45, 0.8)}} />
    </AbsoluteFill>
  );
};

/* ---------------- S2 · REVEAL ---------------- */
const Reveal: React.FC<{s: number}> = ({s}) => {
  const o = win(s, B.reveal, 7.2, 0.01, 0.25);
  const p = pop(s, B.reveal, 10, 0.5);
  const a = r(s, B.astra, B.astra + 0.55);
  const sweep = r(s, B.astra + 0.2, B.astra + 1.3, -60, 160);
  const exit = r(s, 6.9, 7.2);
  return (
    <AbsoluteFill style={{opacity: o, transform: `scale(${1 + exit * 0.25})`, filter: `blur(${exit * 10}px)`}}>
      <div style={{position: 'absolute', left: 540 - 150, top: 400, transform: `scale(${pop(s, B.reveal + 0.1, 8, 0.45)})`}}>
        <Logo size={300} rot={(s - B.reveal) * 6} glow={0.9 + 0.3 * Math.sin(s * 3)} />
      </div>
      <div style={{...center, top: 780, fontSize: 196, fontWeight: 900, color: C.ink, lineHeight: 1.15, letterSpacing: '-0.035em',
        transform: `scale(${1.35 - 0.35 * p})`, opacity: Math.min(1, p * 1.5)}}>
        GPT-6.2
      </div>
      <div style={{...center, top: 1000, height: 300, overflow: 'hidden'}}>
        <div style={{fontSize: 250, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.03em', transform: `translateY(${(1 - a) * 280}px)`,
          backgroundImage: `linear-gradient(100deg, rgba(255,255,255,0) ${sweep - 18}%, rgba(255,255,255,0.9) ${sweep}%, rgba(255,255,255,0) ${sweep + 18}%), ${GRAD}`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>
          Astra
        </div>
      </div>
      <AbsoluteFill style={{background: '#fff', opacity: 1 - r(s, B.reveal, B.reveal + 0.35)}} />
    </AbsoluteFill>
  );
};

/* ---------------- S3 · THE HINT ---------------- */
const SPIRAL = Array.from({length: 520}, (_, i) => {
  const ang = i * 2.39996;
  const rad = 15 * Math.sqrt(i);
  return {x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, i};
});
const Hint: React.FC<{s: number}> = ({s}) => {
  const o = win(s, 7.1, 13.9, 0.25, 0.35);
  const card = r(s, B.hint, B.hint + 0.6);
  const line2 = r(s, 9.0, 9.6);
  const grow = r(s, 9.6, 13.4, 0, 1, Easing.inOut(Easing.quad));
  const n = Math.floor(6 + 514 * grow * grow);
  const sc = 2.4 - 1.35 * grow;
  const big = pop(s, B.big + 1.0, 9, 0.5);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: 90, right: 90, top: 300, padding: '38px 44px', borderRadius: 36,
        background: 'rgba(255,255,255,0.72)', boxShadow: '0 40px 90px rgba(10,80,70,0.16)', border: '1px solid rgba(255,255,255,0.9)',
        fontFamily: FONT, opacity: card, transform: `translateY(${(1 - card) * 60}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
          {TIBO_AVATAR ? (
            <Img src={staticFile(TIBO_AVATAR)} style={{width: 96, height: 96, borderRadius: 48, objectFit: 'cover'}} />
          ) : (
            <div style={{width: 96, height: 96, borderRadius: 48, background: GRAD, color: '#fff', fontSize: 50, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center'}}>T</div>
          )}
          <div>
            <div style={{fontSize: 52, fontWeight: 800, color: C.ink, lineHeight: 1.2}}>Tibo</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 34, fontWeight: 600, color: '#5B6B75', lineHeight: 1.3}}>
              <Img src={staticFile('logo_ink.png')} style={{width: 34, height: 34, opacity: 0.85}} />OpenAI
            </div>
          </div>
          <div style={{marginLeft: 'auto', fontSize: 28, fontWeight: 800, letterSpacing: '0.18em', color: C.teal,
            border: `2px solid ${C.teal}`, borderRadius: 40, padding: '10px 20px'}}>GỢI Ý</div>
        </div>
        <div style={{marginTop: 30, fontSize: 30, fontWeight: 600, color: '#7A8A93', letterSpacing: '0.08em', opacity: line2}}>
          DIỄN GIẢI · KHÔNG PHẢI TRÍCH NGUYÊN VĂN
        </div>
        <div style={{marginTop: 10, fontSize: 60, fontWeight: 800, color: C.ink, lineHeight: 1.25, opacity: line2}}>
          “Một mô hình <span style={gradText}>tham số lớn</span>”
        </div>
      </div>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="ng"><stop offset="0" stopColor={C.teal} /><stop offset="1" stopColor={C.blue} /></radialGradient>
        </defs>
        <g transform={`translate(540 1110) scale(${sc}) rotate(${s * 6})`}>
          {SPIRAL.slice(13, n).map((p) => (
            <line key={`l${p.i}`} x1={p.x} y1={p.y} x2={SPIRAL[p.i - 13].x} y2={SPIRAL[p.i - 13].y}
              stroke={C.teal} strokeOpacity={0.22} strokeWidth={1.2 / sc} />
          ))}
          {SPIRAL.slice(0, n).map((p) => {
            const age = Math.min(1, (n - p.i) / 20);
            return <circle key={p.i} cx={p.x} cy={p.y} r={(3.4 + 2 * (1 - p.i / 520)) * age}
              fill={p.i % 7 === 0 ? C.blue : p.i % 3 === 0 ? C.green : C.teal} opacity={0.9} />;
          })}
        </g>
      </svg>
      <div style={{...center, top: 1050, fontSize: 168, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2,
        color: C.ink, opacity: Math.min(1, big * 1.4), transform: `scale(${1.3 - 0.3 * big})`,
        textShadow: '0 0 40px rgba(242,247,248,0.95), 0 0 12px rgba(242,247,248,0.95)'}}>
        CỰC LỚN
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- S4 · SCALE / 10T ---------------- */
const NUM = '10.000.000.000.000';
const Scale: React.FC<{s: number}> = ({s}) => {
  const o = win(s, 13.85, 18.2, 0.25, 0.3);
  const q = r(s, B.scale, B.scale + 0.45);
  const rowOut = r(s, B.tenT - 0.05, B.tenT + 0.25);
  const p = pop(s, B.tenT, 9, 0.45);
  let digitIdx = 0;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{...center, top: 360, fontSize: 96, fontWeight: 900, color: C.ink, lineHeight: 1.25, opacity: q,
        transform: `translateY(${(1 - q) * 30}px)`, letterSpacing: '-0.01em'}}>
        LỚN ĐẾN<br />MỨC NÀO?
      </div>
      <div style={{...center, top: 820, display: 'flex', justifyContent: 'center', fontSize: 92, fontWeight: 800,
        fontVariantNumeric: 'tabular-nums', color: C.ink, opacity: r(s, 14.5, 14.8) * (1 - rowOut),
        transform: `scaleX(${1 - rowOut * 0.6})`}}>
        {NUM.split('').map((ch, i) => {
          if (ch === '.') return <span key={i} style={{width: 22, color: '#8A99A2'}}>.</span>;
          const k = digitIdx++;
          const target = Number(ch);
          const t0 = 14.6 + k * 0.1;
          const prog = r(s, t0, t0 + 0.55, 0, 1, Easing.out(Easing.quad));
          const pos = (10 + target) * prog; // rolls through one full cycle
          return (
            <span key={i} style={{display: 'inline-block', height: 120, overflow: 'hidden', width: 58}}>
              <span style={{display: 'block', transform: `translateY(${-pos * 120}px)`}}>
                {Array.from({length: 20}, (_, d) => <span key={d} style={{display: 'block', height: 120, lineHeight: '120px',
                  ...(d === 10 + target && prog > 0.98 ? gradText : {})}}>{d % 10}</span>)}
              </span>
            </span>
          );
        })}
      </div>
      <div style={{...center, top: 970, fontSize: 46, fontWeight: 600, color: '#4A5A64', letterSpacing: '0.2em', opacity: r(s, 14.8, 15.2) * (1 - rowOut)}}>
        THAM SỐ
      </div>
      {/* 10T impact */}
      <div style={{...center, top: 640, fontSize: 420, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.1,
        ...gradText, opacity: Math.min(1, p * 2), transform: `scale(${1.6 - 0.6 * p})`, filter: 'drop-shadow(0 30px 60px rgba(18,169,154,0.35))'}}>
        10T
      </div>
      <div style={{...center, top: 1150, opacity: r(s, B.tenT + 0.3, B.tenT + 0.6)}}>
        <div style={{fontSize: 46, fontWeight: 700, color: C.ink, letterSpacing: '0.12em'}}>THAM SỐ</div>
        <div style={{display: 'inline-block', marginTop: 26, fontSize: 30, fontWeight: 800, letterSpacing: '0.18em', color: '#9A6400',
          background: 'rgba(245,181,68,0.18)', border: `2px solid ${C.amber}`, borderRadius: 40, padding: '10px 26px'}}>
          ƯỚC ĐOÁN · CHƯA XÁC NHẬN
        </div>
      </div>
      {/* burst */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - r(s, B.tenT + 0.2, B.tenT + 1.1)}}>
        {Array.from({length: 46}, (_, i) => {
          const a = rnd(`ba${i}`) * Math.PI * 2;
          const d = r(s, B.tenT, B.tenT + 1.0) * (300 + rnd(`bd${i}`) * 500);
          return <circle key={i} cx={540 + Math.cos(a) * d} cy={880 + Math.sin(a) * d} r={3 + rnd(`br${i}`) * 6}
            fill={i % 2 ? C.teal : C.green} opacity={s > B.tenT ? 0.9 : 0} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------------- S5 · THE TWIST (price) ---------------- */
const Bar: React.FC<{label: string; w: number; prog: number; hl?: boolean; note?: string; o: number}> = ({label, w, prog, hl, note, o}) => (
  <div style={{marginBottom: 54, opacity: o, transform: `translateX(${(1 - o) * -40}px)`}}>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 18, fontFamily: FONT, marginBottom: 14}}>
      <span style={{fontSize: 46, fontWeight: 800, color: hl ? '#fff' : '#C9D3D8'}}>{label}</span>
      {note && <span style={{fontSize: 26, fontWeight: 700, color: '#7F8F98', letterSpacing: '0.12em'}}>{note}</span>}
    </div>
    <div style={{height: 46, borderRadius: 23, background: 'rgba(255,255,255,0.07)', overflow: 'hidden'}}>
      <div style={{height: '100%', width: `${w * prog * 100}%`, borderRadius: 23,
        background: hl ? GRAD : 'linear-gradient(90deg,#5E6E78,#8C9CA6)', boxShadow: hl ? '0 0 40px rgba(95,240,196,0.45)' : undefined}} />
    </div>
  </div>
);
const Twist: React.FC<{s: number}> = ({s}) => {
  const o = win(s, 18.1, 27.75, 0.35, 0.3);
  const beat = [18.5, 19.3, 20.1].reduce((acc, h) => acc + (s > h ? Math.exp(-(s - h) * 10) * 0.03 : 0), 0);
  const nhung = r(s, B.but, B.but + 0.6);
  const gia = pop(s, 19.55, 8, 0.5);
  const up = r(s, B.price - 0.3, B.price + 0.3);
  const rowA = r(s, B.price, B.price + 0.5), rowB = r(s, B.price + 1.2, B.price + 1.7), rowC = r(s, B.cheaper, B.cheaper + 0.5);
  const eq = r(s, 22.6, 23.0), cheaper = pop(s, 25.3, 9, 0.5);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 45% at 50% ${38 - up * 18}%, rgba(95,240,196,0.16), transparent 70%), ${C.night}`}} />
      <div style={{...center, top: 520 - up * 330, transform: `scale(${(1 + beat) * (1 - up * 0.45)})`}}>
        <div style={{fontSize: 62, fontWeight: 600, letterSpacing: '0.5em', color: '#A9B6BD', opacity: nhung * (1 - up)}}>NHƯNG…</div>
        <div style={{fontSize: 330, fontWeight: 900, lineHeight: 1.2, ...gradText, opacity: Math.min(1, gia * 1.5),
          transform: `scale(${1.4 - 0.4 * gia})`, filter: 'drop-shadow(0 0 50px rgba(95,240,196,0.35))'}}>GIÁ</div>
      </div>
      <div style={{position: 'absolute', left: 90, right: 90, top: 720, opacity: rowA}}>
        <div style={{fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: '0.24em', color: C.mint, marginBottom: 40}}>CHI PHÍ · THEO TIN ĐỒN</div>
        <Bar label="GPT-6.2 Astra" w={0.52} prog={r(s, B.price + 0.1, B.price + 0.9)} hl o={rowA} />
        <Bar label="Claude Opus 5.5" w={0.52} prog={r(s, B.price + 1.3, B.price + 2.1)} o={rowB} />
        <Bar label="GPT-6 Astra" w={0.86} prog={r(s, B.cheaper + 0.1, B.cheaper + 1.0)} o={rowC} />
        {/* ≈ link between A and B */}
        <div style={{position: 'absolute', left: `${52}%`, top: 150, height: 330 * eq, borderLeft: `3px dashed ${C.mint}`, opacity: eq}} />
        <div style={{position: 'absolute', left: 'calc(52% + 24px)', top: 250, fontFamily: FONT, fontSize: 40, fontWeight: 900,
          color: C.night, background: C.mint, borderRadius: 30, padding: '8px 22px', opacity: eq, transform: `scale(${0.6 + 0.4 * eq})`}}>≈ NGANG</div>
        <div style={{position: 'absolute', right: 0, top: 80, fontFamily: FONT, fontSize: 44, fontWeight: 900, color: C.night,
          background: GRAD, borderRadius: 30, padding: '10px 26px', opacity: Math.min(1, cheaper * 1.4), transform: `scale(${1.5 - 0.5 * cheaper})`}}>RẺ HƠN ↓</div>
        <div style={{fontFamily: FONT, fontSize: 26, fontWeight: 600, color: '#6F7F88', marginTop: 10, opacity: rowB}}>
          Minh họa tương đối · không theo tỷ lệ · chưa có bảng giá chính thức
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- S6 · PARADOX ---------------- */
const Paradox: React.FC<{s: number}> = ({s}) => {
  const o = win(s, 27.65, 30.95, 0.1, 0.35);
  const a = pop(s, B.bigger, 10, 0.45), b = pop(s, B.cheap, 10, 0.45);
  return (
    <AbsoluteFill style={{opacity: o, background: C.night}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 960, background: 'linear-gradient(180deg,#071311,#0A1F1B)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 958, height: 4, background: GRAD, boxShadow: '0 0 40px rgba(95,240,196,0.6)',
        transform: `scaleX(${r(s, 27.7, 28.2)})`}} />
      <div style={{...center, top: 470, transform: `translateY(${(1 - a) * -260}px)`, opacity: Math.min(1, a * 2)}}>
        <div style={{fontSize: 120, fontWeight: 900, color: '#E9F4F1', lineHeight: 1}}>↑</div>
        <div style={{fontSize: 190, fontWeight: 900, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.03em'}}>LỚN HƠN</div>
      </div>
      <div style={{...center, top: 1060, transform: `translateY(${(1 - b) * 260}px)`, opacity: Math.min(1, b * 2)}}>
        <div style={{fontSize: 190, fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.03em', ...gradText}}>RẺ HƠN</div>
        <div style={{fontSize: 120, fontWeight: 900, lineHeight: 1, ...gradText}}>↓</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- S7 · INSIGHT ---------------- */
const COLS = 9, ROWS = 7;
const PHONES = Array.from({length: COLS * ROWS}, (_, i) => ({
  i, col: i % COLS, row: Math.floor(i / COLS),
  ox: (rnd(`ox${i}`) - 0.5) * 300, oy: (rnd(`oy${i}`) - 0.5) * 300, d: rnd(`dl${i}`) * 0.6,
}));
const Insight: React.FC<{s: number}> = ({s}) => {
  const o = win(s, 30.75, 38.0, 0.35, 0.35);
  const darkWipe = 1 - r(s, 30.75, 31.4);
  const orbIn = pop(s, B.insight + 0.6, 6, 0.6);
  const shatter = s >= B.many;
  const strike = r(s, 33.1, 33.6);
  const t2 = r(s, B.many + 0.4, B.many + 0.9);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{...center, top: 300, fontSize: 40, fontWeight: 700, letterSpacing: '0.3em', color: '#4A5A64', opacity: r(s, B.insight, B.insight + 0.4)}}>
        NẾU ĐÚNG, CUỘC ĐUA AI…
      </div>
      {!shatter && (
        <div style={{position: 'absolute', left: 540 - 200, top: 520, width: 400, height: 400, borderRadius: 200,
          transform: `scale(${orbIn * (1 + 0.02 * Math.sin(s * 4))})`,
          background: 'radial-gradient(circle at 35% 30%, #CFFFF0 0%, #3ED3B0 30%, #12A99A 55%, #1F5BFF 100%)',
          boxShadow: '0 50px 120px rgba(31,91,255,0.35), inset -30px -40px 80px rgba(5,8,11,0.35)'}} />
      )}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {shatter && PHONES.map((p) => {
          const k = r(s, B.many + p.d * 0.5, B.many + 0.9 + p.d, 0, 1, Easing.out(Easing.back(1.3)));
          const tx = 120 + p.col * 105, ty = 470 + p.row * 112;
          const x = 540 + p.ox * (1 - k) * 0.6 + (tx - 540) * k, y = 720 + p.oy * (1 - k) * 0.6 + (ty - 720) * k;
          const lit = s > B.many + 1.0 + (p.col + p.row) * 0.05;
          const w = 12 + 38 * k, h = 12 + 66 * k;
          return (
            <g key={p.i}>
              <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={10 * k + 6} fill={lit ? '#fff' : C.teal}
                stroke={C.teal} strokeWidth={2.5} opacity={0.95} />
              {lit && <circle cx={x} cy={y} r={11} fill={p.i % 3 ? C.teal : C.blue} opacity={0.9}>
              </circle>}
            </g>
          );
        })}
      </svg>
      <div style={{...center, top: 1050, opacity: r(s, 31.7, 32.2) * (1 - t2)}}>
        <div style={{fontSize: 52, fontWeight: 600, color: '#3D4B55'}}>không còn là</div>
        <div style={{position: 'relative', display: 'inline-block', fontSize: 150, fontWeight: 900, color: C.ink, lineHeight: 1.25}}>
          AI TO NHẤT
          <div style={{position: 'absolute', left: -10, top: '54%', height: 14, width: `${strike * 104}%`, background: C.red, borderRadius: 7}} />
        </div>
      </div>
      <div style={{...center, top: 1215, opacity: t2, transform: `translateY(${(1 - t2) * 30}px)`}}>
        <div style={{fontSize: 46, fontWeight: 600, color: '#3D4B55'}}>mà là ai đưa trí tuệ đến tay</div>
      </div>
      <div style={{...center, top: 1280, fontSize: 96, fontWeight: 900, lineHeight: 1.25, letterSpacing: '-0.02em', ...gradText,
        opacity: t2, transform: `scale(${1.15 - 0.15 * t2})`}}>
        NHIỀU NGƯỜI NHẤT
      </div>
      <AbsoluteFill style={{background: C.night, opacity: darkWipe, clipPath: `inset(${(1 - darkWipe) * 50}% 0 ${(1 - darkWipe) * 50}% 0)`}} />
    </AbsoluteFill>
  );
};

/* ---------------- S8 · ENDING ---------------- */
const Ending: React.FC<{s: number}> = ({s}) => {
  const o = win(s, 37.9, 46.5, 0.4, 0.3);
  const t1 = r(s, B.rumor, B.rumor + 0.5) * (1 - r(s, B.answer - 0.1, B.answer + 0.4));
  const stamp = pop(s, 38.75, 11, 0.4);
  const rise = r(s, B.answer, B.end + 0.6, 0, 1, Easing.out(Easing.quad));
  const word = r(s, 41.0, 41.7);
  const q = pop(s, B.end + 0.1, 8, 0.45);
  const foot = r(s, 42.9, 43.5);
  const fadeWhite = r(s, 45.2, 46);
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{...center, top: 560, opacity: t1, transform: `translateY(${(1 - r(s, B.rumor, B.rumor + 0.5)) * 30}px)`}}>
        <div style={{fontSize: 108, fontWeight: 900, color: C.ink, lineHeight: 1.25}}>TẤT CẢ<br />VẪN LÀ TIN ĐỒN</div>
        <div style={{display: 'inline-block', marginTop: 50, fontSize: 64, fontWeight: 900, letterSpacing: '0.12em', color: C.red,
          border: `6px solid ${C.red}`, borderRadius: 18, padding: '14px 34px',
          transform: `rotate(-7deg) scale(${1.8 - 0.8 * stamp})`, opacity: Math.min(1, stamp * 2)}}>
          CHƯA XÁC NHẬN
        </div>
      </div>
      {/* sunrise of the star over the horizon */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1000, height: 920, overflow: 'hidden'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1000, overflow: 'hidden', opacity: r(s, B.answer, B.answer + 0.3)}}>
        <div style={{position: 'absolute', left: 540 - 400 * (0.5 + 0.5 * rise), top: 1000 - 400 * (0.5 + 0.5 * rise), width: 800 * (0.5 + 0.5 * rise),
          height: 800 * (0.5 + 0.5 * rise), borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,245,210,0.55), transparent 65%)'}} />
        <div style={{position: 'absolute', left: 540 - 140, top: 1010 - 330 * rise - 140 + (1 - rise) * 160}}>
          <Logo size={280} rot={s * 4} glow={0.6 + 0.6 * rise} />
        </div>
      </div>
      <div style={{position: 'absolute', top: 999, left: 540 - 520 * r(s, B.answer, B.answer + 0.6), width: 1040 * r(s, B.answer, B.answer + 0.6), height: 3,
        background: GRAD, boxShadow: '0 0 36px 6px rgba(95,240,196,0.65)'}} />
      <div style={{...center, top: 1040, fontSize: 92, fontWeight: 900, letterSpacing: '-0.02em', color: C.ink, opacity: word,
        transform: `translateY(${(1 - word) * 24}px)`}}>
        GPT-6.2 <span style={gradText}>Astra</span>
      </div>
      <div style={{...center, top: 1180, fontSize: 150, fontWeight: 900, letterSpacing: '-0.02em', color: C.ink, lineHeight: 1.2,
        opacity: Math.min(1, q * 1.6), transform: `scale(${1.25 - 0.25 * q})`}}>
        HÔM NAY<span style={{...gradText, opacity: 0.55 + 0.45 * Math.abs(Math.sin(s * 2.4))}}>?</span>
      </div>
      <div style={{...center, top: 1560, fontSize: 28, fontWeight: 600, color: '#5B6B75', lineHeight: 1.5, opacity: foot}}>
        Nguồn: gợi ý từ Tibo (OpenAI) · tin đồn, chưa được xác nhận chính thức
      </div>
      <AbsoluteFill style={{background: C.paper, opacity: fadeWhite}} />
    </AbsoluteFill>
  );
};

/* ---------------- Captions ---------------- */
const KEYS = ['Hôm nay', 'hôm nay', 'GPT-6.2', 'Astra', 'Tibo', 'cực lớn', 'mười nghìn tỷ', 'giá', 'Claude Opus 5.5', 'rẻ hơn',
  'Lớn hơn', 'to nhất', 'nhiều người nhất', 'tin đồn', 'Mà lại rẻ hơn'];
const highlight = (text: string, color: string) => {
  const re = new RegExp(`(${KEYS.sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')).join('|')})`, 'g');
  return text.split(re).map((part, i) => KEYS.includes(part) ? <span key={i} style={{color}}>{part}</span> : <span key={i}>{part}</span>);
};
const Captions: React.FC<{s: number}> = ({s}) => {
  const c = T.captions.find((x) => s >= x.t - 0.05 && s < x.e + 0.15);
  if (!c) return null;
  const a = r(s, c.t - 0.05, c.t + 0.12) * (1 - r(s, c.e, c.e + 0.15));
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 1640, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, fontSize: 48, fontWeight: 700, lineHeight: 1.38, color: '#fff', textAlign: 'center',
        background: 'rgba(7,11,15,0.66)', borderRadius: 24, padding: '16px 30px', maxWidth: 900,
        opacity: a, transform: `translateY(${(1 - a) * 14}px)`, boxShadow: '0 12px 40px rgba(0,0,0,0.18)'}}>
        {highlight(c.text, C.mint)}
      </div>
    </div>
  );
};

const RumorTag: React.FC<{s: number}> = ({s}) => {
  const o = r(s, 0.7, 1.1) * (1 - r(s, 37.6, 38.0));
  const dark = s > 18.15 && s < 30.9;
  return (
    <div style={{position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div style={{fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: '0.2em', color: dark ? '#C9D3D8' : '#3D4B55',
        padding: '12px 26px', borderRadius: 40, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)',
        border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(13,17,23,0.1)'}`, display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{width: 14, height: 14, borderRadius: 7, background: C.red, opacity: 0.5 + 0.5 * Math.abs(Math.sin(s * 3))}} />
        TIN ĐỒN · CHƯA XÁC NHẬN
      </div>
    </div>
  );
};

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sv = f / fps; // real video time (captions)
  const s = warp(sv); // legacy story clock driving all scene choreography
  const dark = Math.min(rio(s, 17.9, 18.4), 1 - rio(s, 30.6, 31.3));
  const sh = shake(s, HITS);
  const push = 1.0 + 0.012 * Math.sin(s * 0.4); // slow breathing camera
  const speed = s < 4 ? 1 : s < 7 ? 2.2 : 1.2;
  return (
    <AbsoluteFill style={{background: C.paper, overflow: 'hidden'}}>
      <Audio src={staticFile('mix.wav')} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 50% at 50% 45%, #FFFFFF 0%, #EEF5F6 60%, #E2EEF0 100%)'}} />
      <Waves s={s} speed={speed} dark={dark} />
      <AbsoluteFill style={{background: C.night, opacity: dark}} />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px) scale(${push})`}}>
        {s < 4.1 && <Hook s={s} f={f} />}
        {s >= 4.0 && s < 7.3 && <Reveal s={s} />}
        {s >= 7.0 && s < 14.0 && <Hint s={s} />}
        {s >= 13.8 && s < 18.3 && <Scale s={s} />}
        {s >= 18.0 && s < 27.8 && <Twist s={s} />}
        {s >= 27.6 && s < 31.0 && <Paradox s={s} />}
        {s >= 30.7 && s < 38.1 && <Insight s={s} />}
        {s >= 37.8 && <Ending s={s} />}
      </AbsoluteFill>
      <RumorTag s={s} />
      <Captions s={sv} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 50%, transparent 60%, rgba(5,8,11,0.22) 100%)', pointerEvents: 'none'}} />
      <Grain frame={f} o={0.06} />
    </AbsoluteFill>
  );
};
