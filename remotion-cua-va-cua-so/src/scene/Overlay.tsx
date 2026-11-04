import React from 'react';
import {clamp, EASE, evalChar, headPos, kf, lerp} from '../anim';
import {POSE} from '../rig';
import {CHARS, LINES, Side} from '../story';
import {clockMinutes, F, FPS, inLapse} from '../timeline';
import {Figure} from './Figure';
import {camOf, PW} from './Room';

const FONT = 'Montserrat, sans-serif';

// ----------------------------------------------------------------- speech bubbles
export const Bubbles: React.FC<{side: Side; s: number}> = ({side, s}) => {
  const toScr = camOf(side, s);
  return (
    <>
      {LINES[side].map((ln, i) => {
        if (s < ln.t0 - 0.01 || s > ln.t1 + 0.25) return null;
        const c = CHARS[side][ln.who];
        const st = evalChar(c, s);
        const [hx, hy] = toScr(headPos(st));
        const age = s - ln.t0;
        const out = clamp((s - ln.t1) / 0.2);
        const pop = EASE.spring(clamp(age / 0.45));
        const alpha = clamp(age / 0.08) * (1 - out);
        if (ln.kind === 'mark') {
          const shake = age < 0.35 ? Math.sin(age * 70) * 4 * (1 - age / 0.35) : 0;
          return (
            <div key={i} style={{position: 'absolute', left: hx + 18 + shake, top: hy - 120, fontFamily: FONT, fontWeight: 800, fontStyle: 'italic', fontSize: 74, color: '#fff', opacity: alpha, transform: `scale(${0.4 + 0.6 * pop}) rotate(${-8 + 8 * pop}deg)`, transformOrigin: '0% 100%', textShadow: '0 0 24px rgba(255,255,255,0.35), 0 6px 18px rgba(0,0,0,0.8)', letterSpacing: '0.02em'}}>
              {ln.text}
            </div>
          );
        }
        if (ln.kind === 'zzz') {
          return (
            <React.Fragment key={i}>
              {[0, 1, 2, 3, 4, 5].map((k) => {
                const t = age - k * 0.55;
                if (t < 0) return null;
                const u = (t % 3.3) / 3.3;
                return (
                  <div key={k} style={{position: 'absolute', left: hx + 10 + u * 60 + Math.sin(u * 7 + k) * 10, top: hy - 40 - u * 120, fontFamily: FONT, fontWeight: 600, fontSize: 22 + u * 26, color: '#dfe6ff', opacity: Math.sin(u * Math.PI) * 0.8}}>
                    z
                  </div>
                );
              })}
            </React.Fragment>
          );
        }
        const text = ln.text.toUpperCase();
        const fs = 25;
        const estW = text.length * fs * 0.8 + 52;
        const tipX = hx, tipY = hy - 0.22 * st.px - 14;
        const bcx = clamp(tipX, 24 + estW / 2, PW - 24 - estW / 2);
        const bx = bcx - estW / 2;
        const by = tipY - 66;
        // words appear a beat apart, like speech
        const words = text.split(' ');
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: 0, opacity: alpha, transform: `translate(${tipX}px, ${tipY}px) scale(${0.55 + 0.45 * pop}) translate(${-tipX}px, ${-tipY}px)`}}>
            <div style={{position: 'absolute', left: bcx, top: by, transform: 'translateX(-50%)', padding: '0 26px', height: 52, boxSizing: 'border-box', borderRadius: 26, border: '3px solid #f2f2f5', background: 'rgba(8,8,12,0.94)', boxShadow: '0 10px 30px rgba(0,0,0,0.55), 0 0 22px rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 600, fontSize: fs, letterSpacing: '0.06em', color: '#f5f5f7', whiteSpace: 'nowrap'}}>
              {words.map((w, k) => (
                <span key={k} style={{opacity: clamp((age - k * 0.06) / 0.08), marginRight: k < words.length - 1 ? '0.32em' : 0}}>
                  {w}
                </span>
              ))}
            </div>
            <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
              <path d={`M${clamp(tipX, bcx - estW / 2 + 60, bcx + estW / 2 - 60) - 11} ${by + 49} L${tipX} ${tipY} L${clamp(tipX, bcx - estW / 2 + 60, bcx + estW / 2 - 60) + 11} ${by + 49}`} fill="rgba(8,8,12,0.94)" stroke="#f2f2f5" strokeWidth={3} strokeLinejoin="round" />
              <rect x={clamp(tipX, bcx - estW / 2 + 60, bcx + estW / 2 - 60) - 9} y={by + 45} width={18} height={5} fill="rgba(8,8,12,1)" />
            </svg>
          </div>
        );
      })}
    </>
  );
};

// ----------------------------------------------------------------- the clock (7-segment)
const SEG: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};
const Digit: React.FC<{ch: string; x: number; w: number; h: number; t: number; on: string; off: string}> = ({ch, x, w, h, t, on, off}) => {
  const lit = SEG[ch] ?? '';
  if (ch === '1') x -= w / 2 - t;
  const g = t / 2, m = h / 2;
  const hz = (y: number) => `${x + g},${y} ${x + g + t / 2},${y - t / 2} ${x + w - g - t / 2},${y - t / 2} ${x + w - g},${y} ${x + w - g - t / 2},${y + t / 2} ${x + g + t / 2},${y + t / 2}`;
  const vt = (xx: number, y0: number, y1: number) => `${xx},${y0 + g} ${xx + t / 2},${y0 + g + t / 2} ${xx + t / 2},${y1 - g - t / 2} ${xx},${y1 - g} ${xx - t / 2},${y1 - g - t / 2} ${xx - t / 2},${y0 + g + t / 2}`;
  const segs: Record<string, string> = {
    a: hz(t / 2), g: hz(m), d: hz(h - t / 2),
    f: vt(x + t / 2, t / 2, m), b: vt(x + w - t / 2, t / 2, m), e: vt(x + t / 2, m, h - t / 2), c: vt(x + w - t / 2, m, h - t / 2),
  };
  return (
    <g transform={`skewX(-7)`}>
      {Object.entries(segs).map(([k, p]) => (
        <polygon key={k} points={p} fill={lit.includes(k) ? on : off} />
      ))}
    </g>
  );
};

export const Clock: React.FC<{s: number; frame: number; rewinding: number}> = ({s, frame, rewinding}) => {
  const m = clockMinutes(s);
  const mm = Math.floor(m) % 1440;
  const hh = Math.floor(mm / 60), mi = mm % 60;
  const str = `${String(hh).padStart(2, '0')}${String(mi).padStart(2, '0')}`;
  const frac = m - Math.floor(m);
  const lapse = inLapse(s);
  const pulse = lapse > 0.1 || rewinding > 0 ? 1 : 1 + 0.5 * Math.exp(-frac * 30);
  const colon = Math.floor(frame / 15) % 2 === 0 || lapse > 0.1 ? 1 : 0.3;
  const w = 50, h = 84, t = 11, gap = 14;
  const total = 4 * w + 3 * gap + 26;
  const x0 = (PW - total) / 2;
  const xs = [x0, x0 + w + gap, x0 + 2 * (w + gap) + 26, x0 + 3 * (w + gap) + 26];
  const on = '#ff2d1f';
  const off = 'rgba(255,45,31,0.07)';
  const body = (
    <>
      {str.split('').map((ch, i) => (
        <Digit key={i} ch={ch} x={xs[i]} w={w} h={h} t={t} on={on} off={off} />
      ))}
      <g transform="skewX(-7)" opacity={colon}>
        <rect x={x0 + 2 * (w + gap) - 1} y={h * 0.3 - 5} width={11} height={11} rx={2} fill={on} />
        <rect x={x0 + 2 * (w + gap) - 1} y={h * 0.7 - 6} width={11} height={11} rx={2} fill={on} />
      </g>
    </>
  );
  return (
    <svg width={PW} height={100} viewBox={`0 -8 ${PW} 100`} style={{position: 'absolute', left: 0, overflow: 'visible'}}>
      <defs>
        <filter id="clockglow" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation={6 * pulse} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="reflfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="reflmask">
          <rect x={0} y={h} width={PW} height={h} fill="url(#reflfade)" />
        </mask>
      </defs>
      <g filter="url(#clockglow)" transform={`translate(${rewinding * Math.sin(frame * 3) * 6} 0)`}>{body}</g>
      <g mask="url(#reflmask)">
        <g transform={`matrix(1 0 0 -1 0 ${2 * h + 6})`} opacity={0.8}>
          {body}
        </g>
      </g>
    </svg>
  );
};

// ----------------------------------------------------------------- panel label
export const Label: React.FC<{text: string; accent: string; s: number}> = ({text, accent}) => (
  <div style={{position: 'absolute', left: 40, top: 30, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, fontWeight: 800, fontSize: 25, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.92)', textShadow: '0 2px 12px rgba(0,0,0,0.9)'}}>
    <div style={{width: 10, height: 10, borderRadius: 5, background: accent, boxShadow: `0 0 12px ${accent}`}} />
    {text}
  </div>
);

// ----------------------------------------------------------------- end card
export const EndCard: React.FC<{frame: number}> = ({frame}) => {
  const f = frame;
  const t = (a: number, d = 18) => clamp((f - a) / d);
  const rise = (a: number) => {
    const u = EASE.out(t(a, 22));
    return {opacity: u, transform: `translateY(${(1 - u) * 26}px)`, filter: `blur(${(1 - u) * 8}px)`};
  };
  const open = EASE.inOut(t(F.end3 - 14, 34));
  const draw = EASE.inOut(t(F.storyEnd + 4, 34));
  // door in perspective, centred
  const cx = 540, top = 380, dw = 190, dh = 380, bot = top + dh;
  const x0 = cx - dw / 2, x1 = cx + dw / 2;
  const th = open * 1.45;
  const xf = x1 - dw * Math.cos(th) + dw * 0.12 * Math.sin(th);
  const e = dw * 0.16 * Math.sin(th);
  const perim = 2 * (dw + dh);
  const kidU = clamp((f - (F.end3 + 4)) / 50);
  const kid = evalChar(
    {unit: 70, base: '#ffffff', dark: '#ffffff', name: 'endKid', keys: [
      {t: 0, x: cx + 30, y: bot, face: -1, pose: POSE.stand, walk: true},
      {t: 1, x: cx - 6, y: bot, face: -1, pose: POSE.stand},
    ]},
    EASE.out(kidU),
  );
  const fade = 1 - clamp((f - (960 - 12)) / 12);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fade}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="endspill" x1="0" y1={bot} x2="0" y2={bot + 520} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffcf8a" stopOpacity={0.55 * open} />
            <stop offset="1" stopColor="#ffcf8a" stopOpacity={0} />
          </linearGradient>
          <radialGradient id="endglow" cx={cx} cy={top + dh * 0.55} r={520} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffc777" stopOpacity={0.32 * open} />
            <stop offset="1" stopColor="#ffc777" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="endinside" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3dc" />
            <stop offset="1" stopColor="#ffc982" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#endglow)" />
        {/* light through the open door */}
        <polygon points={`${x0},${bot} ${x1},${bot} ${x1 + 260},${bot + 520} ${x0 - 260},${bot + 520}`} fill="url(#endspill)" />
        <rect x={x0} y={top} width={dw} height={dh} fill="url(#endinside)" opacity={open} />
        {/* the kid comes home — through the door */}
        {kidU > 0 && (
          <g opacity={clamp(kidU * 3)}>
            <Figure st={kid} id="endkid" base="#16100a" dark="#16100a" light={1} warm={0} rimX={1} />
          </g>
        )}
        {/* slab */}
        <polygon points={`${x1},${top} ${xf},${top - e} ${xf},${bot + e} ${x1},${bot}`} fill="#15151b" stroke="#2c2c36" strokeWidth={2} />
        {/* frame drawing itself */}
        <rect x={x0 - 8} y={top - 8} width={dw + 16} height={dh + 8} fill="none" stroke="#e9e3d8" strokeWidth={3} strokeDasharray={perim + 40} strokeDashoffset={(perim + 40) * (1 - draw)} opacity={0.85} />
        <line x1={x0 - 220} y1={bot} x2={x1 + 220} y2={bot} stroke="#ffffff" strokeOpacity={0.12 * draw} strokeWidth={2} />
      </svg>
      <div style={{position: 'absolute', left: 60, right: 60, top: 1010, textAlign: 'center', fontFamily: FONT}}>
        <div style={{fontWeight: 400, fontSize: 40, color: '#9c9ca8', letterSpacing: '0.01em', lineHeight: 1.35, ...rise(F.end1)}}>Cấm đoán không giữ được con ở nhà.</div>
        <div style={{marginTop: 26, fontWeight: 800, fontSize: 52, color: '#ffffff', letterSpacing: '-0.005em', lineHeight: 1.25, ...rise(F.end2)}}>Nó chỉ khiến con chọn cửa sổ.</div>
        <div style={{marginTop: 70, width: lerp(0, 120, EASE.inOut(t(F.end3 - 6, 24))), height: 3, background: '#ffc46b', marginLeft: 'auto', marginRight: 'auto', boxShadow: '0 0 14px #ffb04a'}} />
        <div style={{marginTop: 44, fontWeight: 800, fontSize: 50, color: '#ffc46b', lineHeight: 1.25, textShadow: '0 0 34px rgba(255,176,74,0.45)', ...rise(F.end3)}}>Hãy là cánh cửa con dám gõ.</div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- header kicker
export const Header: React.FC<{frame: number; top: number}> = ({frame, top}) => {
  const a = kf(frame, [[F.rewindEnd + 4, 0], [F.rewindEnd + 18, 1], [F.rewindEnd + 150, 1], [F.rewindEnd + 170, 0]]);
  const b = kf(frame, [[F.rewindEnd + 160, 0], [F.rewindEnd + 176, 1], [F.rewindEnd + 260, 1], [F.rewindEnd + 280, 0]]);
  const hook = kf(frame, [[0, 0], [6, 1], [F.hookEnd, 1], [F.rewindStart + 6, 0]]);
  const st = (o: number): React.CSSProperties => ({position: 'absolute', left: 0, right: 0, top: Math.max(58, top + 34), textAlign: 'center', fontFamily: FONT, fontWeight: 600, fontSize: 30, letterSpacing: '0.32em', color: '#e9e9ee', opacity: o, transform: `translateY(${(1 - o) * 10}px)`});
  return (
    <>
      <div style={st(hook)}>CÙNG MỘT ĐÊM</div>
      <div style={st(a)}>CÙNG MỘT CÂU HỎI</div>
      <div style={st(b)}>HAI CÂU TRẢ LỜI</div>
    </>
  );
};

export const secs = (f: number) => f / FPS;
