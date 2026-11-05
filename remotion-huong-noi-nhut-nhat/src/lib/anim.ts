import {Easing, random, spring} from 'remotion';

export const FPS = 30;
export const easeIO = Easing.bezier(0.45, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.5, 0, 0.9, 0.4);

export type Key = [number, number] | [number, number, (t: number) => number];

/** Piecewise keyframe interpolation. Each key may carry the easing used to reach it. */
export const kf = (f: number, keys: Key[], fallback = easeIO): number => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, e] = keys[i] as [number, number, ((t: number) => number) | undefined];
    const [f0, v0] = keys[i - 1];
    if (f <= f1) {
      const t = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
      return v0 + (v1 - v0) * (e ?? fallback)(t);
    }
  }
  return keys[keys.length - 1][1];
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (f: number, a: number, b: number, e = easeIO) => e(clamp((f - a) / (b - a)));

/** Window that fades in over `fin` frames at `a`, and out over `fout` frames ending at `b`. */
export const win = (f: number, a: number, b: number, fin = 8, fout = 8) =>
  Math.min(ramp(f, a, a + fin, easeOut), 1 - ramp(f, b - fout, b, easeIn));

export const pop = (f: number, start: number, stiff = 220, damping = 13) =>
  f < start ? 0 : spring({frame: f - start, fps: FPS, config: {stiffness: stiff, damping, mass: 0.7}});

/** Smooth value noise (deterministic) for hand-held camera drift and idle motion. */
export const noise1 = (seed: string, t: number) => {
  const i = Math.floor(t);
  const fr = t - i;
  const a = random(`${seed}-${i}`) * 2 - 1;
  const b = random(`${seed}-${i + 1}`) * 2 - 1;
  const s = fr * fr * (3 - 2 * fr);
  return a + (b - a) * s;
};

/** Periodic blink: returns 0 (open) .. 1 (closed). */
export const blink = (f: number, seed: string, every = 95) => {
  const cycle = Math.floor(f / every);
  const offset = Math.floor(random(`${seed}-b${cycle}`) * (every - 12));
  const local = f - cycle * every - offset;
  if (local < 0 || local > 6) return 0;
  return Math.sin((local / 6) * Math.PI);
};
