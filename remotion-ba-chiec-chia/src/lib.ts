import WORDS from './words.json';
import TL from './timeline.json';

// ---------------------------------------------------------------------------
// Time: everything is driven by real word timestamps from the final Charon file.
// ---------------------------------------------------------------------------
export const FPS = TL.fps;
export type Word = {w: string; s: number; e: number};
export const words: Word[] = WORDS.words;
export const VOICE_END: number = WORDS.voice_end;
export const TOTAL_SEC = VOICE_END + TL.outro;
export const TOTAL_FRAMES = Math.ceil(TOTAL_SEC * FPS);

/** start (s) of word i */
export const ws = (i: number) => words[i].s;
/** end (s) of word i */
export const we = (i: number) => words[i].e;

const LEAD = 0.42;
export type SceneId = (typeof TL.scenes)[number]['id'];
export const scenes = TL.scenes.map((sc, k) => {
  const first = sc.w;
  const start = k === 0 ? 0 : Math.max(we(first - 1) + 0.12, ws(first) - LEAD);
  return {id: sc.id as SceneId, w: first, start};
});
scenes.forEach((sc, k) => ((sc as any).end = k < scenes.length - 1 ? scenes[k + 1].start : TOTAL_SEC));
export const scene = (id: SceneId) => scenes.find((s) => s.id === id)! as {id: SceneId; w: number; start: number; end: number};

// ---------------------------------------------------------------------------
// Math / easing (motion with mass: no linear moves, no gratuitous bounce)
// ---------------------------------------------------------------------------
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const easeInOut = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
/** progress 0..1 of a ramp starting at t0 lasting d seconds */
export const ramp = (t: number, t0: number, d: number, ease = easeOut) => ease((t - t0) / d);
/** critically-damped-ish settle: 0 -> 1 with a tiny physical overshoot */
export const settle = (t: number, t0: number, d = 0.7) => {
  const x = clamp((t - t0) / d);
  if (x <= 0) return 0;
  return 1 - Math.exp(-6 * x) * Math.cos(x * 5.2);
};
/** fade in at a, fade out at b */
export const window01 = (t: number, a: number, b: number, fin = 0.35, fout = 0.35) =>
  clamp(Math.min((t - a) / fin, (b - t) / fout));
/** damped pendulum (radians) */
export const pendulum = (t: number, amp: number, omega: number, zeta: number, phase = 0) =>
  t < 0 ? 0 : amp * Math.exp(-zeta * t) * Math.cos(omega * t + phase);
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------------------
// Palette (see docs/ART_DIRECTION.md)
// ---------------------------------------------------------------------------
export const C = {
  then: '#0A0908',
  thenWarm: '#16120E',
  ivory: '#EDE5D3',
  ivoryDim: 'rgba(237,229,211,0.55)',
  gold: '#D4A853',
  goldHi: '#F3D48E',
  glow: '#FFD58A',
  son: '#C2412D',
  jade: '#7FB59B',
  terra: '#D28B62',
  indigo: '#7E93D6',
};
export const SERIF = 'PFD, serif';
export const SANS = 'BVP, sans-serif';
