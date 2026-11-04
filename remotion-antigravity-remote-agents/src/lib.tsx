import React from 'react';
import {Easing, Img, staticFile} from 'remotion';
import TL from './timeline.json';

// ───────────────────────── Palette (see docs/ART_DIRECTION.md) ─────────────────────────
export const C = {
  ink: '#0A0A0C', // Ma — the night you leave behind
  ink2: '#111116',
  paper: '#ECE6DA', // the human voice
  ash: '#6B6F76', // the old fire, gone cold
  ember: '#FF7A2F', // the agent, alive
  emberCore: '#FFD9A8',
  indigo: '#1B2340', // the cloud, distance
  gas: '#5B8CFF', // a flame that needs a pipe
  screen: '#BFD3FF', // cold light of waiting
};
export const SANS = "'Be Vietnam Pro', sans-serif";
export const SERIF = "'Noto Serif Display', serif";
export const MONO = "'JetBrains Mono', monospace";

// ───────────────────────── Timeline (real word timestamps) ─────────────────────────
export type Word = {w: string; start: number; end: number};
export type Phrase = {key: string; text: string; start: number; end: number; words: Word[]};
export const FPS = TL.fps;
export const DURATION = TL.durationInFrames;
export const PHRASES = TL.phrases as Phrase[];
const BY = Object.fromEntries(PHRASES.map((p) => [p.key, p]));
export const P = (k: string): Phrase => {
  const p = BY[k];
  if (!p) throw new Error('no phrase ' + k);
  return p;
};
export const T = (k: string) => P(k).start;
export const TE = (k: string) => P(k).end;
/** start time of the n-th word (0-based) inside phrase k */
export const TW = (k: string, n: number) => P(k).words[Math.min(n, P(k).words.length - 1)].start;
export const TWE = (k: string, n: number) => P(k).words[Math.min(n, P(k).words.length - 1)].end;

// ───────────────────────── Motion math ─────────────────────────
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // weighted settle
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 0.9, 0.4), // gravity
  soft: Easing.bezier(0.33, 0, 0.2, 1),
  lin: (x: number) => x,
};
/** 0→1 between seconds a and b, eased */
export const ramp = (t: number, a: number, b: number, e: (x: number) => number = E.inOut) =>
  e(clamp((t - a) / Math.max(1e-6, b - a)));
/** fade in over [a,a+fi], hold, fade out over [b-fo,b] */
export const win = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) =>
  Math.min(ramp(t, a, a + fi, E.soft), 1 - ramp(t, b - fo, b, E.soft));
/** damped spring 0→1 starting at a, with physical overshoot */
export const spring = (t: number, a: number, freq = 2.2, damp = 5.5) => {
  const x = t - a;
  if (x <= 0) return 0;
  return 1 - Math.exp(-damp * x) * Math.cos(2 * Math.PI * freq * x);
};
// smooth deterministic value noise
const h = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const noise = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return mix(h(i + seed * 57), h(i + 1 + seed * 57), u) * 2 - 1;
};
export const fbm = (x: number, seed = 0) => noise(x, seed) * 0.6 + noise(x * 2.3, seed + 3) * 0.3 + noise(x * 5.1, seed + 7) * 0.1;

// ───────────────────────── Primitives ─────────────────────────
export const Abs: React.FC<{style?: React.CSSProperties; children?: React.ReactNode}> = ({style, children}) => (
  <div style={{position: 'absolute', inset: 0, ...style}}>{children}</div>
);

/** The agent: a living ember. Its own light is the only warm light in the film. */
export const Ember: React.FC<{x: number; y: number; r?: number; heat?: number; t: number; seed?: number; cold?: number}> = ({
  x,
  y,
  r = 22,
  heat = 1,
  t,
  seed = 1,
  cold = 0,
}) => {
  if (heat <= 0.001) return null;
  const fl = 1 + 0.07 * fbm(t * 5, seed) + 0.04 * Math.sin(t * 2.1 + seed);
  const k = heat * fl;
  const core = cold > 0 ? `rgba(200,200,205,${0.9 * k})` : `rgba(255,244,224,${Math.min(1, k)})`;
  const mid = cold > 0 ? `rgba(107,111,118,${0.6 * k})` : `rgba(255,122,47,${Math.min(1, 0.85 * k)})`;
  const halo = cold > 0 ? `rgba(107,111,118,${0.15 * k})` : `rgba(255,110,40,${0.28 * k})`;
  const R = r * (0.92 + 0.08 * fl);
  const disc = (s: number, bg: string) => (
    <div
      style={{
        position: 'absolute',
        left: x - s / 2,
        top: y - s / 2,
        width: s,
        height: s,
        borderRadius: '50%',
        background: bg,
      }}
    />
  );
  return (
    <>
      {disc(R * 22 * Math.sqrt(heat), `radial-gradient(circle, ${halo} 0%, rgba(255,110,40,0) 62%)`)}
      {disc(R * 6, `radial-gradient(circle, ${mid} 0%, rgba(255,122,47,${0.25 * k}) 30%, rgba(255,122,47,0) 70%)`)}
      {disc(R * 2, `radial-gradient(circle, ${core} 0%, rgba(255,217,168,${Math.min(1, k)}) 38%, ${mid} 78%, rgba(255,122,47,0) 100%)`)}
    </>
  );
};

/** Film grain: one static texture, jittered every frame (cheap, organic). */
export const Grain: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 0.07}) => {
  const ox = Math.floor(h(frame * 1.7) * 100);
  const oy = Math.floor(h(frame * 3.1 + 9) * 100);
  return (
    <Img
      src={staticFile('img/grain.png')}
      style={{
        position: 'absolute',
        left: -ox,
        top: -oy,
        width: 1300,
        height: 2100,
        opacity,
        mixBlendMode: 'overlay',
        imageRendering: 'auto',
      }}
    />
  );
};

export const Vignette: React.FC<{k?: number}> = ({k = 1}) => (
  <Abs
    style={{
      background: `radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.75 * k}) 100%)`,
    }}
  />
);

/** Text block — typography is a character: kerned, Vietnamese diacritics given room (line-height ≥ 1.25). */
export const Txt: React.FC<{
  x?: number;
  y: number;
  w?: number;
  size: number;
  font?: string;
  weight?: number;
  color?: string;
  italic?: boolean;
  track?: number;
  align?: 'center' | 'left' | 'right';
  op?: number;
  lh?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({x = 540, y, w = 920, size, font = SANS, weight = 500, color = C.paper, italic, track = 0, align = 'center', op = 1, lh = 1.28, style, children}) => {
  if (op <= 0.001) return null;
  const left = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: y,
        width: w,
        textAlign: align,
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight: lh,
        fontStyle: italic ? 'italic' : 'normal',
        letterSpacing: `${track}em`,
        color,
        opacity: op,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Wisp of steam / smoke as an SVG path whose shape is driven by noise. */
export const wispPath = (x0: number, y0: number, len: number, t: number, seed: number, amp = 26) => {
  const pts: string[] = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const y = y0 - k * len;
    const x = x0 + fbm(k * 2.2 - t * 0.55, seed) * amp * (0.3 + k * 1.4) + Math.sin(k * 5 + t * 1.3 + seed) * amp * 0.25 * k;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
};

/** Closed-laptop silhouette + lid that rotates shut around the hinge. open: 1 = open, 0 = closed. */
export const Laptop: React.FC<{cx: number; hy: number; w: number; open: number; screenGlow?: number; children?: React.ReactNode; stroke?: string; op?: number}> = ({
  cx,
  hy,
  w,
  open,
  screenGlow = 1,
  children,
  stroke = C.paper,
  op = 1,
}) => {
  const sh = w * 0.62 * open; // foreshortened lid height
  const bw = w * 1.08;
  const bh = w * 0.045;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: op, overflow: 'visible'}}>
      <defs>
        <linearGradient id={`scr${cx}${hy}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A2136" />
          <stop offset="1" stopColor="#0F1322" />
        </linearGradient>
      </defs>
      {/* base slab */}
      <path
        d={`M${cx - w / 2},${hy} L${cx + w / 2},${hy} L${cx + bw / 2},${hy + bh} L${cx - bw / 2},${hy + bh} Z`}
        fill="#15151B"
        stroke={stroke}
        strokeOpacity={0.55}
        strokeWidth={2}
      />
      {/* lid */}
      {sh > 1.5 ? (
        <g>
          <rect x={cx - w / 2} y={hy - sh} width={w} height={sh} rx={Math.min(14, sh / 2)} fill="#0D0E13" stroke={stroke} strokeOpacity={0.7} strokeWidth={2.5} />
          <rect x={cx - w / 2 + 14} y={hy - sh + 14 * open} width={w - 28} height={Math.max(0, sh - 28 * open)} rx={6} fill={`url(#scr${cx}${hy})`} opacity={screenGlow} />
          {children ? (
            <g transform={`translate(${cx - w / 2 + 14}, ${hy - sh + 14 * open}) scale(1, ${Math.max(0.001, open)})`} opacity={screenGlow}>
              {children}
            </g>
          ) : null}
        </g>
      ) : (
        <line x1={cx - w / 2} y1={hy - 1} x2={cx + w / 2} y2={hy - 1} stroke={stroke} strokeOpacity={0.8} strokeWidth={3} strokeLinecap="round" />
      )}
    </svg>
  );
};

/** A minimal human: head + body line. Weight-bearing posture, no face (anyone). */
export const Figure: React.FC<{x: number; y: number; s?: number; op?: number; color?: string; step?: number}> = ({x, y, s = 1, op = 1, color = C.paper, step = 0}) => {
  if (op <= 0.001) return null;
  const sw = Math.sin(step * Math.PI * 2) * 14 * s;
  const bob = Math.abs(Math.sin(step * Math.PI * 2)) * 4 * s;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: op}}>
      <g stroke={color} strokeWidth={4 * s} strokeLinecap="round" fill="none" transform={`translate(0, ${-bob})`}>
        <circle cx={x} cy={y - 210 * s} r={22 * s} fill={color} stroke="none" />
        <path d={`M${x},${y - 182 * s} L${x},${y - 90 * s}`} />
        <path d={`M${x},${y - 90 * s} L${x - 16 * s + sw},${y}`} />
        <path d={`M${x},${y - 90 * s} L${x + 16 * s - sw},${y}`} />
        <path d={`M${x},${y - 165 * s} L${x - 22 * s - sw * 0.6},${y - 105 * s}`} />
        <path d={`M${x},${y - 165 * s} L${x + 22 * s + sw * 0.6},${y - 105 * s}`} />
      </g>
    </svg>
  );
};
