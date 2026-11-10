import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, SANS, SERIF, clamp, lerp, easeOut, easeInOut, ramp, settle, pendulum, hash, expoOut} from './lib';
import {BrassDefs, Brush, KeyShape, Land, keyholePath} from './parts';
import {CHAPTERS, CUE, KEYS} from './cues';

const W = 1080;
const H = 1920;
const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, ...style}}>
    {children}
  </svg>
);
const center = (top: number, extra?: React.CSSProperties): React.CSSProperties => ({left: 80, right: 80, top, textAlign: 'center', ...extra});

// glowing keyhole of light (the film's emblem)
const Keyhole: React.FC<{id: string; x: number; y: number; s: number; a: number; glow?: number}> = ({id, x, y, s, a, glow = 1}) => (
  <g transform={`translate(${x}, ${y}) scale(${s})`} opacity={a}>
    <defs>
      <radialGradient id={`${id}-kg`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="rgba(255,213,138,0.55)" />
        <stop offset="1" stopColor="rgba(255,213,138,0)" />
      </radialGradient>
    </defs>
    <circle r={260} fill={`url(#${id}-kg)`} opacity={0.65 * glow} />
    <path d={keyholePath} fill={`url(#${id}-hole)`} />
  </g>
);

// ===========================================================================
// 1. HOOK: three names jostle for "#1", then the question is struck out
// ===========================================================================
const PERMS = [
  [0, 1, 2],
  [2, 0, 1],
  [1, 2, 0],
  [0, 2, 1],
  [2, 1, 0],
  [1, 0, 2],
  [0, 1, 2],
];
export const Hook: React.FC<{t: number}> = ({t}) => {
  const h = CUE.hook;
  const dark = 1 - ramp(t, h.dark, 0.9, easeInOut);
  // ranking shuffle: names physically trade places
  const step = 0.3;
  const sh = clamp((t - h.shuffleStart) / (h.shuffleEnd - h.shuffleStart));
  const raw = sh > 0 && sh < 1 ? (t - h.shuffleStart) / step : sh >= 1 ? PERMS.length - 1 : 0;
  const k0 = Math.min(PERMS.length - 1, Math.floor(raw));
  const k1 = Math.min(PERMS.length - 1, k0 + 1);
  const fr = easeInOut(clamp((raw - k0) / 0.55));
  const yOf = (slot: number) => 940 + slot * 170;
  const settleDim = 1 - 0.7 * ramp(t, h.shuffleEnd, 0.6);
  return (
    <>
      <Svg>
        <BrassDefs id="hk" />
        <Keyhole id="hk" x={540} y={960} s={0.9} a={ramp(t, h.keyhole, 1.2)} glow={0.9 + 0.1 * Math.sin(t * 3)} />
        {/* the ranking rails */}
        <g opacity={dark * ramp(t, h.names[0], 0.5) * 0.5}>
          {[0, 1, 2].map((s) => (
            <text key={s} x={160} y={yOf(s) + 16} fill={C.gold} fontFamily={SANS} fontWeight={300} fontSize={44}>
              {s + 1}
            </text>
          ))}
          <line x1={215} x2={215} y1={yOf(0) - 50} y2={yOf(2) + 40} stroke={C.gold} strokeOpacity={0.35} strokeWidth={1.5} />
        </g>
        <Brush x={300} y={612} w={500} p={ramp(t, h.slash, 0.32, expoOut)} tilt={-5} h={30} />
      </Svg>
      {[2, 1, 0].map((ki, i) => {
        const k = KEYS[ki];
        const sa = PERMS[k0].indexOf(i);
        const sb = PERMS[k1].indexOf(i);
        const y = lerp(yOf(sa), yOf(sb), fr);
        const xo = Math.sin(fr * Math.PI) * Math.sign(sb - sa) * 70;
        const glint = clamp(1 - Math.abs(t - h.names[i] - 0.25) / 0.35);
        return (
          <Land key={k.name} t={t} at={h.names[i]} out={h.dark + 0.6} dy={30} style={{left: 270 + xo, top: y - 80, opacity: settleDim}}>
            <div
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: 120,
                color: C.ivory,
                letterSpacing: -1,
                opacity: settleDim * dark,
                textShadow: `0 0 ${30 * glint}px rgba(255,213,138,${0.8 * glint})`,
              }}
            >
              {k.name}
            </div>
          </Land>
        );
      })}
      <Land t={t} at={h.question} out={h.dark + 0.6} style={center(410)}>
        <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 60, color: C.ivory, letterSpacing: 6, opacity: dark}}>AI NÀO</div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 168, color: C.goldHi, lineHeight: 1.05, opacity: dark}}>
          giỏi nhất?
        </div>
      </Land>
    </>
  );
};

// ===========================================================================
// 2. MOTHER'S KEY RING (also re-used, smaller, in the payoff)
// ===========================================================================
const RING = {x: 540, y: 430, r: 66};
const RING_KEYS = [
  {key: {bow: 'plain' as const, len: 280, teeth: [0.8, 0.4, 0.9], inlay: undefined as string | undefined}, phi: -0.95},
  {key: KEYS[0], phi: -0.5},
  {key: KEYS[1], phi: -0.05},
  {key: KEYS[2], phi: 0.42},
  {key: {bow: 'ring' as const, len: 250, teeth: [0.5, 1, 0.6], inlay: undefined}, phi: 0.82},
];
export const ringPose = (k: number, t: number, kick: number, scale = 1) => {
  const rk = RING_KEYS[k];
  const P = {x: RING.x + RING.r * Math.sin(rk.phi), y: RING.y + RING.r * Math.cos(rk.phi)};
  const swingDeg =
    (pendulum(t - kick, 9 + 6 * hash(k), 3.1 + 0.5 * hash(k + 9), 0.55, k) + 1.2 * Math.sin(t * 0.9 + k * 1.7)) * (k % 2 ? 1 : -1);
  const alpha = 90 - rk.phi * 28 + swingDeg;
  const a = (alpha * Math.PI) / 180;
  const R = 64 * scale;
  return {x: P.x + R * Math.cos(a), y: P.y + R * Math.sin(a), alpha, scale};
};

const KeyRing: React.FC<{t: number; kick: number; only?: number[]; fadeOthers?: number; id: string}> = ({t, kick, only, fadeOthers = 1, id}) => (
  <g>
    {/* nail + ring */}
    <circle cx={RING.x} cy={RING.y - RING.r - 22} r={9} fill="#2a2016" stroke={C.gold} strokeOpacity={0.5} strokeWidth={2} />
    <circle cx={RING.x} cy={RING.y} r={RING.r} fill="none" stroke={`url(#${id}-brass)`} strokeWidth={10} opacity={fadeOthers} />
    {RING_KEYS.map((rk, k) => {
      const p = ringPose(k, t, kick);
      const a = only && !only.includes(k) ? fadeOthers : 1;
      if (a <= 0.01) return null;
      return (
        <g key={k} transform={`translate(${p.x}, ${p.y}) rotate(${p.alpha}) scale(${p.scale})`} opacity={a}>
          <KeyShape id={id} {...rk.key} />
        </g>
      );
    })}
  </g>
);

export const Mother: React.FC<{t: number}> = ({t}) => {
  const m = CUE.mother;
  const push = 1 + 0.05 * easeInOut((t - m.start) / (m.end - m.start));
  return (
    <>
      <Svg style={{transform: `scale(${push})`, transformOrigin: '540px 700px'}}>
        <BrassDefs id="mo" />
        <KeyRing t={t} kick={m.jingle - 0.15} id="mo" />
      </Svg>
      <Land t={t} at={m.label} style={center(220)}>
        <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 30, letterSpacing: 9, color: C.gold, opacity: 0.85}}>CHÙM CHÌA KHÓA CỦA MẸ</div>
      </Land>
      <Land t={t} at={m.q1} style={center(1180)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 80, color: C.ivory, opacity: 1 - 0.72 * ramp(t, m.q1fade, 0.6)}}>
          “Chìa nào tốt nhất?”
        </div>
        <div
          style={{
            height: 3,
            background: C.ivoryDim,
            margin: '-58px auto 0',
            width: `${70 * ramp(t, m.q1fade, 0.5)}%`,
          }}
        />
      </Land>
      <Land t={t} at={m.q2} style={center(1310)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 84, color: C.goldHi, textShadow: '0 0 40px rgba(255,200,110,0.35)'}}>
          “Mình đang mở cửa nào?”
        </div>
      </Land>
    </>
  );
};

// ===========================================================================
// 3. THREE KEYS leave the ring and become three named tools
// ===========================================================================
const THREE_Y = [720, 980, 1240];
export const Three: React.FC<{t: number}> = ({t}) => {
  const c = CUE.three;
  const fade = 1 - ramp(t, c.lift, 0.6);
  return (
    <>
      <Svg>
        <BrassDefs id="th" />
        <g opacity={fade}>
          <KeyRing t={t} kick={CUE.mother.jingle - 0.15} only={[]} fadeOthers={fade} id="th" />
        </g>
        {[1, 2, 3].map((rk, i) => {
          const from = ringPose(rk, c.lift, CUE.mother.jingle - 0.15);
          const p = settle(t, c.lift + i * 0.12, 1.1);
          const x = lerp(from.x, 190, p);
          const y = lerp(from.y, THREE_Y[i], p);
          const al = lerp(from.alpha, 0, p);
          const s = lerp(from.scale, 1, p);
          return (
            <g key={i} transform={`translate(${x}, ${y}) rotate(${al}) scale(${s})`}>
              <KeyShape id="th" {...KEYS[i]} />
            </g>
          );
        })}
      </Svg>
      {KEYS.map((k, i) => (
        <Land key={k.name} t={t} at={c.names[i]} dy={0} style={{left: 690, top: THREE_Y[i] - 50}}>
          <div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 70, color: C.ivory, borderLeft: `3px solid ${k.inlay}`, paddingLeft: 22}}>{k.name}</div>
        </Land>
      ))}
    </>
  );
};

// ===========================================================================
// 4. CHAPTERS: key -> keyhole -> turn -> click -> lacquer doors open on gold leaf
// ===========================================================================
const PANEL = {x: 150, y: 600, w: 780, h: 820};
const INK = '#1B140C';

const Icon: React.FC<{kind: string; p: number; t: number}> = ({kind, p, t}) => {
  const d = (len: number) => ({pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - clamp(p * len)});
  const st = {fill: 'none', stroke: INK, strokeWidth: 6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  switch (kind) {
    case 'Lên ý tưởng':
      return (
        <g {...st}>
          <path d="M -30 20 C -55 -5 -45 -60 0 -62 C 45 -60 55 -5 30 20 L 26 40 L -26 40 Z" {...d(1.2)} />
          <path d="M -20 55 L 20 55 M -12 68 L 12 68" {...d(1.4)} />
          {[-1, 0, 1].map((k) => (
            <path key={k} d={`M ${k * 52} ${-82 + Math.abs(k) * 18} l ${k * 12} -14`} {...d(2)} />
          ))}
        </g>
      );
    case 'Viết bài nhanh':
      return (
        <g {...st}>
          <path d="M 40 -55 L 60 -35 L -5 30 L -32 38 L -24 11 Z" {...d(1.2)} />
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M ${-70 - k * 10} ${-25 + k * 22} l ${-35 + k * 8} 0`} {...d(1.6)} />
          ))}
        </g>
      );
    case 'Vẽ hình minh họa':
      return (
        <g {...st}>
          <rect x={-62} y={-52} width={124} height={104} rx={6} {...d(1.2)} />
          <path d="M -50 38 L -12 -8 L 12 18 L 26 4 L 50 38" {...d(1.3)} />
          <circle cx={30} cy={-24} r={10} {...d(1.6)} />
        </g>
      );
    case 'Trò chuyện bằng giọng nói':
      return (
        <g {...st}>
          {[-48, -32, -16, 0, 16, 32, 48].map((x, k) => {
            const a = p > 0.5 ? 0.45 + 0.55 * Math.abs(Math.sin(t * 7 + k * 1.3)) : 0.3;
            const hh = (14 + 40 * Math.sin(((k + 0.5) / 7) * Math.PI)) * a * clamp(p * 2);
            return <line key={k} x1={x} x2={x} y1={-hh} y2={hh} />;
          })}
        </g>
      );
    case 'Viết code':
      return (
        <g {...st}>
          <path d="M -30 -40 L -70 0 L -30 40 M 30 -40 L 70 0 L 30 40 M 14 -52 L -14 52" {...d(1.2)} />
        </g>
      );
    case 'Hợp đồng hàng trăm trang': {
      const n = Math.round(22 * clamp(p * 1.2));
      return (
        <g {...st} strokeWidth={4}>
          {Array.from({length: n}).map((_, k) => (
            <path key={k} d={`M ${-55 + k * 1.2} ${40 - k * 4} l 100 0`} opacity={0.55 + 0.45 * (k / 22)} />
          ))}
          <rect x={-55 + n * 1.2} y={-60 - n * 4 + 40} width={100} height={0} />
        </g>
      );
    }
    case 'Văn bản quan trọng':
      return (
        <g {...st}>
          <path d="M -45 -60 L 25 -60 L 45 -40 L 45 60 L -45 60 Z" {...d(1.2)} />
          <path d="M -28 -30 L 25 -30 M -28 -10 L 25 -10 M -28 10 L 5 10" {...d(1.4)} />
          <circle cx={22} cy={36} r={17 * easeOut(clamp(p * 1.5 - 0.5))} fill={C.son} stroke="none" />
        </g>
      );
    default:
      return null;
  }
};

const Doors: React.FC<{p: number; id: string}> = ({p, id}) => {
  const {x, y, w, h} = PANEL;
  const half = w / 2;
  const off = half * easeInOut(p);
  return (
    <g>
      <rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} fill="none" stroke={C.gold} strokeOpacity={0.45} strokeWidth={2} />
      {/* leaves (lacquer) slide apart; panel behind is gold leaf */}
      <clipPath id={`${id}-pc`}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#${id}-pc)`}>
        <rect x={x - off} y={y} width={half} height={h} fill="#120E0A" stroke={C.gold} strokeOpacity={0.35} strokeWidth={2} />
        <rect x={x + half + off} y={y} width={half} height={h} fill="#120E0A" stroke={C.gold} strokeOpacity={0.35} strokeWidth={2} />
      </g>
    </g>
  );
};

export const Chapter: React.FC<{t: number; i: number}> = ({t, i}) => {
  const c = CHAPTERS[i];
  const k = KEYS[i];
  const id = `ch${i}`;
  const holeX = 700;
  const holeY = 1010;
  // key slides in with weight, stops in the keyhole
  const inP = settle(t, c.start + 0.05, 1.0);
  const bowX = lerp(-480, holeX - k.len + 26, inP);
  const turn = ramp(t, c.turn, 0.42, easeInOut);
  const open = ramp(t, c.open, 0.9, easeInOut);
  const keyA = 1 - ramp(t, c.open - 0.05, 0.3);
  const burst = clamp(1 - Math.abs(t - c.open) / 0.5);
  const {x, y, w, h} = PANEL;
  return (
    <>
      <Svg>
        <BrassDefs id={id} />
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="rgba(255,226,160,0.85)" />
            <stop offset="1" stopColor="rgba(255,213,138,0)" />
          </radialGradient>
          <clipPath id={`${id}-kc`}>
            <rect x={-10} y={0} width={holeX + 4} height={H} />
          </clipPath>
          <pattern id={`${id}-gl`} patternUnits="userSpaceOnUse" width={800} height={1000}>
            <image href={staticFile('tex/goldleaf.png')} width={800} height={1000} />
          </pattern>
        </defs>
        {/* gold leaf panel behind the doors */}
        <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-gl)`} opacity={open > 0 ? 1 : 0} />
        <rect x={x} y={y} width={w} height={h} fill="rgba(255,236,190,0.25)" opacity={burst} />
        {/* stage, drawn in black lacquer on gold */}
        {open > 0.3 && <Stage t={t} i={i} />}
        <Doors p={open} id={id} />
        {/* keyhole on the seam + key */}
        <g opacity={keyA}>
          <g transform={`translate(${holeX}, ${holeY}) scale(0.62)`}>
            <path d={keyholePath} fill={turn > 0.95 ? `url(#${id}-hole)` : '#050403'} />
          </g>
          <circle cx={holeX} cy={holeY} r={260 * (0.4 + burst)} fill={`url(#${id}-glow)`} opacity={burst} />
          <g clipPath={`url(#${id}-kc)`}>
            <g transform={`translate(${bowX}, ${holeY - 20})`}>
              <KeyShape id={id} {...k} turn={turn} />
            </g>
          </g>
        </g>
      </Svg>
      {/* titles */}
      <Land t={t} at={c.start + 0.1} dy={0} style={{left: 150, top: 205}}>
        <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 28, letterSpacing: 8, color: C.gold}}>
          CHÌA SỐ {c.idx + 1} <span style={{color: k.inlay}}>●</span>
        </div>
      </Land>
      <Land t={t} at={c.name - 0.15} style={{left: 142, top: 250}}>
        <div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 150, color: C.ivory, letterSpacing: -2, lineHeight: 1.05}}>{k.name}</div>
      </Land>
      <Land t={t} at={c.tagAt} style={{left: 150, top: 440}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 52, color: C.goldHi}}>{c.tag}</div>
      </Land>
    </>
  );
};

/** what's behind each door */
const Stage: React.FC<{t: number; i: number}> = ({t, i}) => {
  const c = CHAPTERS[i];
  const {x, y, w, h} = PANEL;
  const label = (s: string, cx: number, cy: number, a: number, size = 36) => (
    <text x={cx} y={cy} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={size} fill={INK} opacity={a}>
      {s}
    </text>
  );
  if (i === 0) {
    // 2x2 universal grid
    return (
      <g>
        <line x1={x + w / 2} x2={x + w / 2} y1={y + 60} y2={y + h - 60} stroke={INK} strokeOpacity={0.25} strokeWidth={2} />
        <line x1={x + 60} x2={x + w - 60} y1={y + h / 2} y2={y + h / 2} stroke={INK} strokeOpacity={0.25} strokeWidth={2} />
        {c.items.map((it, k) => {
          const cx = x + w / 4 + (k % 2) * (w / 2);
          const cy = y + h / 4 + Math.floor(k / 2) * (h / 2);
          const p = ramp(t, it.at - 0.05, 0.8, (v) => v);
          const a = ramp(t, it.at - 0.05, 0.3);
          const lines = it.label === 'Trò chuyện bằng giọng nói' ? ['Trò chuyện', 'bằng giọng nói'] : [it.label];
          return (
            <g key={k}>
              <g transform={`translate(${cx}, ${cy - 40}) scale(1.15)`} opacity={a}>
                <Icon kind={it.label} p={p} t={t} />
              </g>
              {lines.map((l, j) => label(l, cx, cy + 108 + j * 44, a, 38))}
            </g>
          );
        })}
      </g>
    );
  }
  if (i === 1) {
    // depth: one-point perspective corridor + three deep tasks
    const vp = {x: x + w / 2, y: y + h / 2};
    return (
      <g>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const s = Math.pow(0.72, k) * (1 - 0.04 * ((t * 0.6) % 1));
          return (
            <rect
              key={k}
              x={vp.x - (w / 2) * s}
              y={vp.y - (h / 2) * s}
              width={w * s}
              height={h * s}
              fill="none"
              stroke={INK}
              strokeOpacity={0.1 + 0.05 * k}
              strokeWidth={2}
            />
          );
        })}
        {[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([px, py], k) => (
          <line key={k} x1={px} y1={py} x2={vp.x} y2={vp.y} stroke={INK} strokeOpacity={0.12} strokeWidth={2} />
        ))}
        {c.items.map((it, k) => {
          const cy = y + 150 + k * 260;
          const p = ramp(t, it.at - 0.05, 0.9, (v) => v);
          const a = ramp(t, it.at - 0.05, 0.3);
          return (
            <g key={k} opacity={a}>
              <rect x={x + 60} y={cy - 95} width={w - 120} height={190} fill="rgba(255,244,214,0.55)" />
              <g transform={`translate(${x + 170}, ${cy})`}>
                <Icon kind={it.label} p={p} t={t} />
              </g>
              <text x={x + 290} y={cy + 13} fontFamily={SANS} fontWeight={700} fontSize={k === 1 ? 34 : 40} fill={INK}>
                {it.label === 'Hợp đồng hàng trăm trang' ? (
                  <>
                    <tspan x={x + 290} dy={-22}>Hợp đồng</tspan>
                    <tspan x={x + 290} dy={46}>hàng trăm trang</tspan>
                  </>
                ) : (
                  it.label
                )}
              </text>
            </g>
          );
        })}
      </g>
    );
  }
  // i === 2: the Google "house" whose windows light up
  const hx = x + w / 2;
  const roofY = y + 120;
  const wallY = y + 300;
  const wins = [
    [hx - 190, wallY + 40],
    [hx + 0, wallY + 40],
    [hx + 190, wallY + 40],
    [hx - 95, wallY + 230],
    [hx + 95, wallY + 230],
  ];
  return (
    <g>
      <path
        d={`M ${x + 40} ${wallY} L ${hx} ${roofY} L ${x + w - 40} ${wallY} L ${x + w - 70} ${wallY} L ${x + w - 70} ${y + h - 50} L ${x + 70} ${y + h - 50} L ${x + 70} ${wallY} Z`}
        fill={INK}
        opacity={0.92}
      />
      {c.items.map((it, k) => {
        const [cx, cy] = wins[k];
        const on = ramp(t, it.at - 0.05, 0.35);
        const ww = k === 4 ? 230 : 160;
        return (
          <g key={k}>
            <rect x={cx - ww / 2} y={cy} width={ww} height={150} fill="#2a2016" />
            <rect x={cx - ww / 2} y={cy} width={ww} height={150} fill={C.goldHi} opacity={on} />
            <rect x={cx - ww / 2 - 40} y={cy - 40} width={ww + 80} height={230} fill={C.glow} opacity={on * 0.18} />
            <text x={cx} y={cy + 88} textAnchor="middle" fontFamily={SANS} fontWeight={800} fontSize={k === 4 ? 32 : 34} fill={INK} opacity={on}>
              {it.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// ===========================================================================
// 5. LIMIT OF THE METAPHOR: nearly every door opens; smooth vs forced
// ===========================================================================
export const Limit: React.FC<{t: number}> = ({t}) => {
  const L = CUE.limit;
  const gridA = ramp(t, L.grid - 0.2, 0.5) * (1 - ramp(t, L.pair - 0.1, 0.45));
  const pairA = ramp(t, L.pair + 0.15, 0.5);
  const cols = 3;
  const rows = 4;
  const dw = 170;
  const dh = 180;
  const gx = 540 - (cols * dw + (cols - 1) * 60) / 2;
  const gy = 540;
  const dark = 7; // the one door that stays (mostly) shut
  const smooth = ramp(t, L.smooth, 0.45, easeInOut);
  const hardT = t - L.hard;
  const hard = hardT > 0 ? clamp(0.3 * Math.abs(Math.sin(hardT * 3.2)) * (hardT < 1.6 ? 1 : 0.4) + 0.15 * clamp(hardT / 1.6)) : 0;
  const shake = hardT > 0 && hardT < 1.6 ? 6 * Math.sin(hardT * 60) * (1 - hardT / 1.6) : 0;
  return (
    <>
      <Svg>
        <BrassDefs id="li" />
        <defs>
          <radialGradient id="li-glow">
            <stop offset="0" stopColor="rgba(255,213,138,0.55)" />
            <stop offset="1" stopColor="rgba(255,213,138,0)" />
          </radialGradient>
        </defs>
        <g opacity={gridA}>
          {Array.from({length: cols * rows}).map((_, k) => {
            const cx = gx + (k % cols) * (dw + 60);
            const cy = gy + Math.floor(k / cols) * (dh + 34);
            const order = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 11, 7].indexOf(k);
            const on = k === dark ? 0.12 : ramp(t, L.grid + 0.25 + order * ((L.gridEnd - L.grid) / 11), 0.35);
            return (
              <g key={k}>
                <rect x={cx} y={cy} width={dw} height={dh} fill="#120E0A" stroke={C.gold} strokeOpacity={0.4} strokeWidth={2} />
                <rect x={cx} y={cy} width={dw} height={dh} fill={C.goldHi} opacity={on * 0.9} />
                <rect x={cx - 20} y={cy - 20} width={dw + 40} height={dh + 40} fill={C.glow} opacity={on * 0.12} />
                {[KEYS[0].inlay, KEYS[1].inlay, KEYS[2].inlay].map((col, j) => (
                  <circle key={j} cx={cx + dw / 2 + (j - 1) * 24} cy={cy + dh - 28} r={7} fill={col} opacity={on > 0.5 ? 1 : 0.25} />
                ))}
              </g>
            );
          })}
        </g>
        <g opacity={pairA}>
          {[0, 1].map((side) => {
            const cx = side ? 760 : 320;
            const cy = 1010;
            const tr = side ? hard : smooth;
            const ok = side === 0 && smooth > 0.95;
            return (
              <g key={side}>
                <circle cx={cx} cy={cy} r={230} fill="url(#li-glow)" opacity={ok ? 1 : 0} />
                <g transform={`translate(${cx}, ${cy}) scale(0.8)`}>
                  <path d={keyholePath} fill={ok ? 'url(#li-hole)' : '#050403'} stroke={C.gold} strokeOpacity={0.4} strokeWidth={3} />
                </g>
                {/* vertical key, tip into the hole */}
                <g transform={`translate(${cx + (side ? shake : 0)}, ${cy - 330}) rotate(90)`}>
                  <g transform={`scale(1, ${Math.cos(Math.PI * tr) || 0.001})`}>
                    <KeyShape id="li" {...KEYS[side ? 1 : 0]} len={300} inlay={undefined} bow="plain" />
                  </g>
                </g>
              </g>
            );
          })}
        </g>
      </Svg>
      <Land t={t} at={L.title} out={L.pair} style={center(330)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 78, color: C.ivory}}>Nhưng khác chìa thật…</div>
      </Land>
      <Land t={t} at={L.smooth + 0.3} style={{left: 170, width: 300, top: 1150, textAlign: 'center'}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 64, color: C.goldHi}}>mở êm</div>
      </Land>
      <Land t={t} at={L.hard + 0.2} style={{left: 610, width: 300, top: 1150, textAlign: 'center'}}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 64, color: C.son}}>vặn mạnh</div>
      </Land>
    </>
  );
};

// ===========================================================================
// 6. REVELATION
// ===========================================================================
export const Reveal: React.FC<{t: number}> = ({t}) => {
  const R = CUE.reveal;
  const bloom = ramp(t, R.l4 - 0.1, 1.1, expoOut);
  const rays = Array.from({length: 18});
  return (
    <>
      <Svg>
        <BrassDefs id="rv" />
        <defs>
          <radialGradient id="rv-soft">
            <stop offset="0" stopColor="rgba(255,220,150,0.42)" />
            <stop offset="0.5" stopColor="rgba(255,200,120,0.12)" />
            <stop offset="1" stopColor="rgba(255,200,120,0)" />
          </radialGradient>
        </defs>
        <g opacity={bloom}>
          {rays.map((_, k) => {
            const a = (k / rays.length) * Math.PI * 2 + t * 0.05;
            const len = 1300 * bloom;
            const wd = 0.05 + 0.03 * hash(k);
            return (
              <polygon
                key={k}
                points={`540,1180 ${540 + Math.cos(a - wd) * len},${1180 + Math.sin(a - wd) * len} ${540 + Math.cos(a + wd) * len},${1180 + Math.sin(a + wd) * len}`}
                fill="rgba(255,205,120,0.07)"
              />
            );
          })}
          <circle cx={540} cy={1180} r={620} fill="url(#rv-soft)" />
        </g>
        <Keyhole id="rv" x={540} y={1460} s={0.55 + 0.1 * bloom} a={bloom} />
        <Brush x={250} y={790} w={590} p={ramp(t, R.slash, 0.3, expoOut)} tilt={-4} h={32} />
      </Svg>
      <Land t={t} at={R.l1} style={center(560)}>
        <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 56, letterSpacing: 6, color: C.ivory, opacity: 1 - 0.5 * bloom}}>KHÔNG CÓ AI</div>
      </Land>
      <Land t={t} at={R.l2} style={center(640)}>
        <div style={{fontFamily: SERIF, fontWeight: 600, fontSize: 160, color: C.ivory, opacity: 1 - 0.55 * bloom}}>giỏi nhất.</div>
      </Land>
      <Land t={t} at={R.l3} style={center(960)}>
        <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 56, letterSpacing: 6, color: C.ivory}}>CHỈ CÓ AI</div>
      </Land>
      <Land t={t} at={R.l4} dy={40} style={center(1030)}>
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 150,
            lineHeight: 1.05,
            color: C.goldHi,
            textShadow: `0 0 ${60 * bloom}px rgba(255,200,110,0.6)`,
          }}
        >
          hợp việc
          <br />
          nhất.
        </div>
      </Land>
    </>
  );
};

// ===========================================================================
// 7. METHOD: your real task, try all three, the smooth one is the answer
// ===========================================================================
export const Method: React.FC<{t: number}> = ({t}) => {
  const M = CUE.method;
  const doorA = ramp(t, M.door - 0.2, 0.6);
  const open = ramp(t, M.open, 1.0, easeInOut);
  const dx = 540;
  const dy = 520;
  const dw = 460;
  const dh = 760;
  const holeY = dy + dh / 2 + 40;
  return (
    <>
      <Svg>
        <BrassDefs id="me" />
        <defs>
          <radialGradient id="me-soft">
            <stop offset="0" stopColor="rgba(255,220,150,0.35)" />
            <stop offset="1" stopColor="rgba(255,220,150,0)" />
          </radialGradient>
        </defs>
        <g opacity={doorA}>
          {/* light behind the door */}
          <rect x={dx - dw / 2} y={dy} width={dw} height={dh} fill={C.goldHi} opacity={open} />
          <ellipse cx={dx} cy={dy + dh / 2} rx={dw} ry={dh * 0.8} fill="url(#me-soft)" opacity={open} />
          {/* door leaf swings open (perspective squash) */}
          <g transform={`translate(${dx - dw / 2}, 0) scale(${1 - 0.86 * open}, 1) translate(${-(dx - dw / 2)}, 0)`}>
            <rect x={dx - dw / 2} y={dy} width={dw} height={dh} fill="#120E0A" stroke={C.gold} strokeOpacity={0.5} strokeWidth={3} />
            <rect x={dx - dw / 2 + 40} y={dy + 40} width={dw - 80} height={dh / 2 - 60} fill="none" stroke={C.gold} strokeOpacity={0.18} strokeWidth={2} />
            <rect x={dx - dw / 2 + 40} y={dy + dh / 2 + 120} width={dw - 80} height={dh / 2 - 160} fill="none" stroke={C.gold} strokeOpacity={0.18} strokeWidth={2} />
            <g transform={`translate(${dx + 150}, ${holeY}) scale(0.5)`}>
              <path d={keyholePath} fill="#050403" stroke={C.gold} strokeOpacity={0.5} strokeWidth={4} />
            </g>
          </g>
          <rect x={dx - dw / 2 - 12} y={dy - 12} width={dw + 24} height={dh + 24} fill="none" stroke={C.gold} strokeOpacity={0.5} strokeWidth={2} />
        </g>
        {/* three anonymous tries (plain keys on purpose: the answer depends on your task, not the brand) */}
        {M.tries.map((t0, k) => {
          const local = t - t0;
          if (local < 0 || local > (k === 2 ? 0.75 : 0.55)) return null;
          const ins = easeOut(clamp(local / 0.18));
          const back = k < 2 ? easeInOut(clamp((local - 0.36) / 0.18)) : 0;
          const shake = k < 2 && local > 0.18 && local < 0.36 ? 7 * Math.sin(local * 90) : 0;
          const turn = k === 2 ? ramp(local, 0.2, 0.3, easeInOut) : 0;
          const x = lerp(dx + 150 - 310 - 160, dx + 150 - 310 + 14, ins * (1 - back));
          return (
            <g key={k} transform={`translate(${x}, ${holeY - 12 + shake * 0.3})`} opacity={1 - back}>
              <g transform="scale(0.8)">
                <KeyShape id="me" bow={(['ring', 'trefoil', 'plain'] as const)[k]} len={400} teeth={[0.6, 1, 0.5, 0.8]} turn={turn} shake={shake} />
              </g>
            </g>
          );
        })}
      </Svg>
      <Land t={t} at={M.label} style={center(400)}>
        <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 34, letterSpacing: 10, color: C.gold}}>VIỆC THẬT CỦA BẠN</div>
      </Land>
      <Land t={t} at={M.tries[0]} out={M.open + 0.2} style={center(1330)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 64, color: C.ivory}}>Thử cả ba.</div>
      </Land>
      <Land t={t} at={M.open + 0.5} style={center(1310)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 60, color: C.goldHi, lineHeight: 1.2}}>Cửa nào mở êm,<br />đó là câu trả lời.</div>
      </Land>
    </>
  );
};

// ===========================================================================
// 8. CAUTION: every key can be wrong (eggshell cracks), verify what matters
// ===========================================================================
export const Caution: React.FC<{t: number}> = ({t}) => {
  const K = CUE.caution;
  const crack = ramp(t, K.crack, 1.4, (v) => v);
  const tilt = pendulum(t - K.key, 3, 2.4, 0.9);
  return (
    <>
      <Svg>
        <BrassDefs id="ca" />
        <g transform={`translate(330, 760) rotate(${tilt}) scale(1.7)`}>
          <KeyShape id="ca" bow="ring" len={300} teeth={[0.7, 1, 0.5]} cracks={crack} />
        </g>
        {/* gold check, brushed */}
        <path
          d="M 300 1395 l 32 34 l 70 -78"
          fill="none"
          stroke={C.goldHi}
          strokeWidth={14}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - ramp(t, K.check, 0.35)}
        />
      </Svg>
      <Land t={t} at={K.t1} style={center(1000)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 86, color: C.ivory, lineHeight: 1.15}}>Chìa nào cũng<br />có lúc sai.</div>
      </Land>
      <Land t={t} at={K.t2} style={center(1250)}>
        <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 44, letterSpacing: 4, color: C.ivoryDim}}>VIỆC QUAN TRỌNG</div>
      </Land>
      <Land t={t} at={K.t3} style={{left: 430, top: 1352}}>
        <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 62, color: C.goldHi}}>tự kiểm tra lại</div>
      </Land>
    </>
  );
};

// ===========================================================================
// 9. PAYOFF: back to mother's ring; then one door, one person, full light
// ===========================================================================
export const Payoff: React.FC<{t: number}> = ({t}) => {
  const P = CUE.payoff;
  const ringA = 1 - ramp(t, P.door, 0.8);
  const open = ramp(t, P.door, 1.6, easeInOut);
  const fin = ramp(t, P.final, 0.9, easeInOut);
  const dy = 600;
  const dw = 400;
  const dh = 760;
  const walk = ramp(t, P.door + 0.6, 2.6, easeOut);
  return (
    <>
      <Svg>
        <BrassDefs id="po" />
        <defs>
          <radialGradient id="po-soft">
            <stop offset="0" stopColor="rgba(255,220,150,0.4)" />
            <stop offset="1" stopColor="rgba(255,220,150,0)" />
          </radialGradient>
        </defs>
        <g opacity={ringA} transform="translate(0, 40)">
          <KeyRing t={t} kick={P.start - 2} id="po" />
        </g>
        <g opacity={open * (1 - 0.65 * fin)}>
          <ellipse cx={540} cy={dy + dh / 2} rx={dw * 1.3} ry={dh * 0.85} fill="url(#po-soft)" opacity={open} />
          <rect x={540 - (dw / 2) * open} y={dy} width={dw * open} height={dh} fill="#FFF3D6" />
          <rect x={540 - dw / 2 - 12} y={dy - 12} width={dw + 24} height={dh + 24} fill="none" stroke={C.gold} strokeOpacity={0.6} strokeWidth={2} />
          {/* floor light spill (Kubrick axis) */}
          <polygon points={`${540 - (dw / 2) * open},${dy + dh} ${540 + (dw / 2) * open},${dy + dh} ${540 + 420 * open},1920 ${540 - 420 * open},1920`} fill="rgba(255,226,170,0.16)" />
          {/* a person seen from behind, walking toward the light */}
          <g transform={`translate(540, ${lerp(1500, dy + dh - 4, walk)}) scale(${lerp(1.25, 0.72, walk)})`}>
            <circle cx={0} cy={-232} r={30} fill="#0D0A07" />
            <path d="M -46 -190 Q 0 -205 46 -190 L 38 -70 L 24 0 L 6 0 L 0 -80 L -6 0 L -24 0 L -38 -70 Z" fill="#0D0A07" />
          </g>
        </g>
      </Svg>
      <Land t={t} at={P.l1} out={P.door + 0.3} style={center(1080)}>
        <div style={{fontFamily: SERIF, fontWeight: 400, fontSize: 76, color: C.ivory, lineHeight: 1.2}}>Người giỏi không phải</div>
      </Land>
      <Land t={t} at={P.l2} out={P.door + 0.3} style={center(1180)}>
        <div style={{fontFamily: SERIF, fontWeight: 400, fontSize: 76, color: C.ivoryDim, lineHeight: 1.2}}>người cầm chìa tốt nhất.</div>
      </Land>
      <Land t={t} at={P.l3} out={P.final} style={center(1395)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 600, fontSize: 70, color: C.goldHi, lineHeight: 1.2}}>
          mà là người biết mình
          <br />
          đang mở cửa nào.
        </div>
      </Land>
      {/* end card */}
      <Land t={t} at={P.final} style={center(220)}>
        <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 46, letterSpacing: 3, color: C.ivoryDim}}>
          <span style={{textDecoration: 'line-through', textDecorationColor: C.son, textDecorationThickness: 4}}>Không có AI giỏi nhất.</span>
        </div>
      </Land>
      <Land t={t} at={P.final + 0.5} style={center(290)}>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 96, color: C.goldHi, lineHeight: 1.1, textShadow: '0 0 40px rgba(0,0,0,0.6)'}}>
          Chỉ có AI
          <br />
          hợp việc nhất.
        </div>
      </Land>
      <Land t={t} at={P.last} style={center(1440)}>
        <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 46, color: C.ivory, letterSpacing: 1}}>Bạn đang mở cửa nào?</div>
      </Land>
    </>
  );
};
