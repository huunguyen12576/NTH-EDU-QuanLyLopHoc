import React from 'react';
import {Easing, interpolate, random} from 'remotion';

export const FONT = "'Be Vietnam Pro', 'Inter', sans-serif";
export const C = {
  ink: '#0D1117',
  paper: '#F2F7F8',
  night: '#05080B',
  green: '#1FB874',
  teal: '#12A99A',
  blue: '#1F5BFF',
  mint: '#5FF0C4',
  lilac: '#B7C0F4',
  red: '#E5484D',
  amber: '#F5B544',
};
export const GRAD = `linear-gradient(100deg, ${C.green} 0%, ${C.teal} 55%, ${C.blue} 100%)`;

const out = Easing.out(Easing.cubic);
const inOut = Easing.inOut(Easing.cubic);

/** clamp-interpolate on seconds */
export const r = (s: number, a: number, b: number, from = 0, to = 1, ease: (x: number) => number = out) =>
  interpolate(s, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
export const rio = (s: number, a: number, b: number, from = 0, to = 1) => r(s, a, b, from, to, inOut);

/** window opacity: fade in at a, fade out ending at b */
export const win = (s: number, a: number, b: number, fi = 0.25, fo = 0.3) =>
  Math.min(r(s, a, a + fi), 1 - r(s, b - fo, b, 0, 1, Easing.in(Easing.cubic)));

/** damped spring-ish pop starting at t0 */
export const pop = (s: number, t0: number, k = 9, z = 0.42) => {
  const x = Math.max(0, s - t0);
  if (s < t0) return 0;
  return 1 - Math.exp(-k * z * x) * Math.cos(k * Math.sqrt(1 - z * z) * x);
};

/** decaying camera shake from impacts */
export const shake = (s: number, hits: number[], amp = 14) => {
  let x = 0, y = 0;
  for (const h of hits) {
    const d = s - h;
    if (d < 0 || d > 0.6) continue;
    const e = Math.exp(-d * 9) * amp;
    x += Math.sin(d * 90 + h) * e;
    y += Math.cos(d * 77 + h * 2) * e;
  }
  return {x, y};
};

/** Original 4-point "astra" star glyph (not any company's logo) */
export const Star: React.FC<{size: number; glow?: number; rot?: number; id: string}> = ({size, glow = 1, rot = 0, id}) => (
  <svg width={size} height={size} viewBox="-100 -100 200 200" style={{overflow: 'visible', transform: `rotate(${rot}deg)`}}>
    <defs>
      <linearGradient id={`sg-${id}`} x1="-1" y1="-1" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0" stopColor={C.green} />
        <stop offset="0.55" stopColor={C.teal} />
        <stop offset="1" stopColor={C.blue} />
      </linearGradient>
      <radialGradient id={`sglow-${id}`}>
        <stop offset="0" stopColor="#7CF5D2" stopOpacity={0.75 * glow} />
        <stop offset="1" stopColor="#7CF5D2" stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle r={150} fill={`url(#sglow-${id})`} />
    <path d="M0,-96 C8,-30 30,-8 96,0 C30,8 8,30 0,96 C-8,30 -30,8 -96,0 C-30,-8 -8,-30 0,-96 Z" fill={`url(#sg-${id})`} />
    <path d="M0,-40 C3,-12 12,-3 40,0 C12,3 3,12 0,40 C-3,12 -12,3 -40,0 C-12,-3 -3,-12 0,-40 Z" fill="#fff" opacity={0.85} />
  </svg>
);

/** soft flowing waves, DNA of the reference key visual */
export const Waves: React.FC<{s: number; speed?: number; dark: number}> = ({s, speed = 1, dark}) => {
  const ph = s * 0.35 * speed;
  const band = (base: number, amp: number, k: number, p: number, top: boolean) => {
    const pts: string[] = [];
    for (let x = -40; x <= 1120; x += 40) {
      const y = base + amp * Math.sin(x * k + p) + amp * 0.35 * Math.sin(x * k * 2.3 - p * 1.4);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return top ? `M-40,-40 L${pts.join(' L')} L1120,-40 Z` : `M-40,1960 L${pts.join(' L')} L1120,1960 Z`;
  };
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="wA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B8F78" />
          <stop offset="1" stopColor="#5ADFC0" stopOpacity={0.25} />
        </linearGradient>
        <linearGradient id="wB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9EDE3" stopOpacity={0.9} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="wC" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={C.lilac} />
          <stop offset="0.5" stopColor="#8FE3D3" stopOpacity={0.7} />
          <stop offset="1" stopColor="#17B993" />
        </linearGradient>
        <linearGradient id="wD" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.0} />
          <stop offset="1" stopColor="#0FA58A" />
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <g opacity={1 - dark * 0.75} filter="url(#soft)">
        <path d={band(330, 90, 0.0042, ph, true)} fill="url(#wB)" />
        <path d={band(200, 120, 0.0035, ph * 0.8 + 1.7, true)} fill="url(#wA)" opacity={0.85} />
        <path d={band(1620, 110, 0.0038, -ph * 0.9 + 0.6, false)} fill="url(#wC)" opacity={0.8} />
        <path d={band(1760, 80, 0.0047, -ph * 1.2 + 2.4, false)} fill="url(#wD)" opacity={0.9} />
      </g>
    </svg>
  );
};

export const Grain: React.FC<{frame: number; o?: number}> = ({frame, o = 0.07}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: o, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
    <filter id={`g${frame % 8}`}>
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 8} />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="1080" height="1920" filter={`url(#g${frame % 8})`} />
  </svg>
);

export const rnd = (k: string) => random(k);
