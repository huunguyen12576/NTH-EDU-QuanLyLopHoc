import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, clamp, hash, SANS, words, ws, we} from './lib';

// ---------------------------------------------------------------------------
// Lacquer ground + one motivated light + grain + vignette
// ---------------------------------------------------------------------------
export const Ground: React.FC<{light?: {x: number; y: number; r: number; a: number; color?: string}}> = ({light}) => (
  <AbsoluteFill style={{backgroundColor: C.then}}>
    <Img src={staticFile('tex/lacquer.png')} style={{width: 1080, height: 1920, position: 'absolute'}} />
    {light && light.a > 0 && (
      <div
        style={{
          position: 'absolute',
          left: light.x - light.r,
          top: light.y - light.r,
          width: light.r * 2,
          height: light.r * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${light.color ?? 'rgba(255,196,110,0.55)'} 0%, rgba(255,170,80,0.12) 38%, rgba(0,0,0,0) 70%)`,
          opacity: light.a,
          mixBlendMode: 'screen',
        }}
      />
    )}
  </AbsoluteFill>
);

export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{background: 'radial-gradient(ellipse 75% 60% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}}
      />
      <Img
        src={staticFile(`tex/grain${f % 6}.png`)}
        style={{position: 'absolute', width: 1080, height: 1920, opacity: 0.09, mixBlendMode: 'overlay'}}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Brass gradients (unique ids per svg)
// ---------------------------------------------------------------------------
export const BrassDefs: React.FC<{id: string}> = ({id}) => (
  <defs>
    <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#5E4318" />
      <stop offset="0.28" stopColor="#E8C67A" />
      <stop offset="0.45" stopColor="#FFF0C2" />
      <stop offset="0.62" stopColor="#B88B3E" />
      <stop offset="1" stopColor="#4A3312" />
    </linearGradient>
    <radialGradient id={`${id}-bow`} cx="0.38" cy="0.32" r="0.8">
      <stop offset="0" stopColor="#FFF0C2" />
      <stop offset="0.35" stopColor="#D9B064" />
      <stop offset="1" stopColor="#4F3714" />
    </radialGradient>
    <radialGradient id={`${id}-hole`} cx="0.5" cy="0.4" r="0.6">
      <stop offset="0" stopColor="#FFF6DA" />
      <stop offset="0.45" stopColor={C.glow} />
      <stop offset="1" stopColor="#B87A2A" />
    </radialGradient>
  </defs>
);

// ---------------------------------------------------------------------------
// The key. Drawn horizontally, bow centre at (0,0), tip at (+len, 0).
// `turn` = rotation around its own long axis (0 = bit down, 1 = bit up).
// ---------------------------------------------------------------------------
export type KeyStyle = 'ring' | 'trefoil' | 'house' | 'plain';
export const KeyShape: React.FC<{
  id: string;
  len?: number;
  bow?: KeyStyle;
  teeth?: number[];
  inlay?: string;
  turn?: number;
  cracks?: number;
  shake?: number;
}> = ({id, len = 380, bow = 'ring', teeth = [0.6, 1, 0.45, 0.85], inlay, turn = 0, cracks = 0, shake = 0}) => {
  const R = 64;
  const sy = Math.cos(Math.PI * clamp(turn)); // squash for axial rotation
  const shaftH = 22;
  const bitW = Math.min(150, len * 0.36);
  const bitH = 70;
  // bit polygon with notches
  const n = teeth.length;
  const pts: string[] = [`${len - bitW},${shaftH / 2}`];
  for (let k = 0; k < n; k++) {
    const x0 = len - bitW + (bitW / n) * k;
    const x1 = x0 + bitW / n;
    const d = shaftH / 2 + bitH * teeth[k];
    pts.push(`${x0 + 3},${d}`, `${x1 - 3},${d}`);
  }
  pts.push(`${len - 4},${shaftH / 2}`);
  const bowPath = (() => {
    if (bow === 'trefoil')
      return `M ${-R * 0.9} 0 a ${R * 0.55} ${R * 0.55} 0 1 1 ${R * 1.1} 0 a ${R * 0.55} ${R * 0.55} 0 1 1 -${R * 1.1} 0 Z
              M ${-R * 0.35} ${-R * 0.55} a ${R * 0.55} ${R * 0.55} 0 1 1 0.1 0 Z`;
    if (bow === 'house')
      return `M ${-R} ${R * 0.75} L ${-R} ${-R * 0.15} L 0 ${-R * 0.95} L ${R} ${-R * 0.15} L ${R} ${R * 0.75} Z`;
    return `M ${-R} 0 a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0 Z`;
  })();
  const holeR = bow === 'house' ? R * 0.32 : R * 0.42;
  return (
    <g transform={`translate(${shake * Math.sin(shake * 91)}, 0)`}>
      <g transform={`scale(1, ${sy === 0 ? 0.001 : sy})`}>
        {/* bit + shaft */}
        <polygon points={pts.join(' ')} fill={`url(#${id}-brass)`} />
        <rect x={R * 0.7} y={-shaftH / 2} width={len - R * 0.7} height={shaftH} rx={6} fill={`url(#${id}-brass)`} />
        {/* collar */}
        <rect x={R * 0.85} y={-20} width={16} height={40} rx={4} fill={`url(#${id}-brass)`} />
        <rect x={R * 0.85 + 22} y={-15} width={8} height={30} rx={3} fill={`url(#${id}-brass)`} />
      </g>
      {/* bow (rotation hides nothing: bow is roughly symmetric) */}
      <g transform={`scale(1, ${0.35 + 0.65 * Math.abs(sy)})`}>
        <path d={bowPath} fill={`url(#${id}-bow)`} fillRule="evenodd" />
        <circle r={holeR} fill={C.then} />
        {inlay && <circle r={holeR * 0.55} fill={inlay} opacity={0.9} />}
        {inlay && <circle r={holeR * 0.55} fill="none" stroke="rgba(255,240,200,0.6)" strokeWidth={2} />}
        {cracks > 0 && <Cracks r={R} p={cracks} />}
      </g>
    </g>
  );
};

/** eggshell crackle (vỏ trứng): beauty of imperfection */
const Cracks: React.FC<{r: number; p: number}> = ({r, p}) => {
  const lines = [] as string[];
  for (let k = 0; k < 9; k++) {
    const a = hash(k + 3) * Math.PI * 2;
    let x = Math.cos(a) * r * 0.5;
    let y = Math.sin(a) * r * 0.5;
    let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let s = 0; s < 4; s++) {
      const aa = a + (hash(k * 7 + s) - 0.5) * 1.6;
      x += Math.cos(aa) * r * 0.16;
      y += Math.sin(aa) * r * 0.16;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    lines.push(d);
  }
  return (
    <g>
      {lines.map((d, k) => (
        <path
          key={k}
          d={d}
          fill="none"
          stroke={C.ivory}
          strokeWidth={2.2}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - clamp(p * 1.6 - k * 0.07)}
          opacity={0.92}
        />
      ))}
    </g>
  );
};

/** keyhole glyph centred on (0,0); size ~ 80 x 150 at scale 1 */
export const keyholePath =
  'M 0 -78 a 38 38 0 0 1 22 69 L 34 70 L -34 70 L -22 -9 A 38 38 0 0 1 0 -78 Z';

// ---------------------------------------------------------------------------
// Son brush stroke (thư pháp): tapered, slightly rough, drawn left -> right
// ---------------------------------------------------------------------------
export const Brush: React.FC<{x: number; y: number; w: number; p: number; color?: string; tilt?: number; h?: number}> = ({
  x,
  y,
  w,
  p,
  color = C.son,
  tilt = -4,
  h = 26,
}) => {
  if (p <= 0) return null;
  const N = 40;
  const top: string[] = [];
  const bot: string[] = [];
  const end = clamp(p);
  for (let k = 0; k <= N; k++) {
    const u = (k / N) * end;
    const px = u * w;
    const thick = h * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08))) * (0.85 + 0.3 * hash(k));
    const wob = Math.sin(u * 9) * 2.5;
    top.push(`${px.toFixed(1)},${(wob - thick / 2).toFixed(1)}`);
    bot.unshift(`${px.toFixed(1)},${(wob + thick / 2 + (hash(k + 50) - 0.5) * 3).toFixed(1)}`);
  }
  return (
    <g transform={`translate(${x}, ${y}) rotate(${tilt})`}>
      <polygon points={[...top, ...bot].join(' ')} fill={color} opacity={0.94} />
      {/* dry-brush hairs */}
      {[0.2, 0.5, 0.8].map((o, k) => (
        <line key={k} x1={0} x2={w * end * (0.9 + 0.1 * o)} y1={(o - 0.5) * h * 0.7} y2={(o - 0.5) * h * 0.6} stroke={C.then} strokeOpacity={0.25} strokeWidth={1.4} />
      ))}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Subtitles: phrase chunks, word-by-word ink-in, timed by the real voice.
// ---------------------------------------------------------------------------
type Chunk = {from: number; to: number};
const chunks: Chunk[] = (() => {
  const out: Chunk[] = [];
  let a = 0;
  for (let i = 0; i < words.length; i++) {
    const end = /[.,?!:…]$/.test(words[i].w) || i === words.length - 1;
    if (end && (i - a >= 2 || /[.?!]$/.test(words[i].w) || i === words.length - 1)) {
      out.push({from: a, to: i});
      a = i + 1;
    }
  }
  return out;
})();
export const subtitleChunks = chunks;

export const Subtitles: React.FC<{t: number; hidden: (t: number) => number}> = ({t, hidden}) => {
  const ch = chunks.find((c, k) => t >= ws(c.from) - 0.08 && t < (chunks[k + 1] ? ws(chunks[k + 1].from) - 0.08 : we(c.to) + 1.2));
  if (!ch) return null;
  const vis = clamp(Math.min((t - (ws(ch.from) - 0.08)) / 0.15, (we(ch.to) + 0.9 - t) / 0.3)) * (1 - hidden(t));
  if (vis <= 0.01) return null;
  const ws_ = words.slice(ch.from, ch.to + 1);
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 90,
        top: 1488,
        textAlign: 'center',
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: 42,
        lineHeight: 1.35,
        letterSpacing: 0.2,
        opacity: vis,
        textShadow: '0 2px 18px rgba(0,0,0,0.9)',
      }}
    >
      {ws_.map((w, k) => {
        const i = ch.from + k;
        const on = clamp((t - ws(i) + 0.02) / 0.12);
        return (
          <span key={i} style={{color: on > 0.5 ? C.ivory : 'rgba(237,229,211,0.38)', transition: 'none'}}>
            {w.w.replace('...', '…')}{' '}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Text that lands with mass at a word timestamp
// ---------------------------------------------------------------------------
export const Land: React.FC<{
  t: number;
  at: number;
  out?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  dy?: number;
  blur?: boolean;
}> = ({t, at, out = 1e9, children, style, dy = 26, blur = true}) => {
  const a = clamp((t - at) / 0.45);
  const e = 1 - Math.pow(1 - a, 3);
  const o = clamp((out - t) / 0.35);
  if (a <= 0 || o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        opacity: e * o,
        transform: `translateY(${(1 - e) * dy}px)`,
        filter: blur && e < 1 ? `blur(${(1 - e) * 8}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
