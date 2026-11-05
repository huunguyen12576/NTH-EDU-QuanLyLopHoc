import {clamp, easeInOut} from './math';

export type Ease = (t: number) => number;
export type Key<T> = [number, T, Ease?];

type Num = Record<string, unknown>;

const mix = (a: unknown, b: unknown, t: number): unknown => {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], t));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o: Num = {};
    for (const k of Object.keys(a as Num)) o[k] = k in (b as Num) ? mix((a as Num)[k], (b as Num)[k], t) : (a as Num)[k];
    return o;
  }
  return t < 0.5 ? a : b;
};

/** Keyframe interpolation. Each key's ease shapes the segment arriving at it. */
export function kf<T>(s: number, keys: Key<T>[]): T {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [s1, v1, e] = keys[i];
    if (s <= s1) {
      const [s0, v0] = keys[i - 1];
      const t = clamp((s - s0) / (s1 - s0));
      return mix(v0, v1, (e ?? easeInOut)(t)) as T;
    }
  }
  return keys[keys.length - 1][1];
}

/** Piecewise-linear remap (monotone time warps). */
export const pw = (x: number, pts: [number, number][]) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
};
