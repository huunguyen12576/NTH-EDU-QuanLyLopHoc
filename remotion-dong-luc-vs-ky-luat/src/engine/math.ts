export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smooth = (t: number) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const easeOutBack = (t: number, s = 1.6) => {
  t = clamp(t) - 1;
  return t * t * ((s + 1) * t + s) + 1;
};

/** Damped spring response 0 -> 1 (t in seconds). */
export const spring01 = (t: number, freq = 2.2, damp = 0.32) => {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  return 1 - Math.exp(-damp * w * t) * Math.cos(w * Math.sqrt(1 - damp * damp) * t);
};

/** Deterministic hash noise. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const hash2 = (a: number, b: number) => hash(a * 57.31 + b * 113.97);

/** Smooth 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i + seed * 101.3) * 2 - 1;
  const b = hash(i + 1 + seed * 101.3) * 2 - 1;
  return lerp(a, b, smooth(f));
};

export type Key<T> = [number, T];

/** Piecewise interpolation of numbers with a per-segment easing. */
export const keys = (f: number, ks: Key<number>[], ease: (t: number) => number = easeInOut) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [f0, v0] = ks[i];
    const [f1, v1] = ks[i + 1];
    if (f <= f1) return lerp(v0, v1, ease((f - f0) / (f1 - f0)));
  }
  return ks[ks.length - 1][1];
};

export type V3 = [number, number, number];

/** Catmull-Rom through vector keyframes with time remapped by smoothstep per segment for weighty camera moves. */
export const keysV3 = (f: number, ks: Key<V3>[]): V3 => {
  if (f <= ks[0][0]) return ks[0][1];
  if (f >= ks[ks.length - 1][0]) return ks[ks.length - 1][1];
  let i = 0;
  while (f > ks[i + 1][0]) i++;
  const p0 = ks[Math.max(0, i - 1)][1];
  const p1 = ks[i][1];
  const p2 = ks[i + 1][1];
  const p3 = ks[Math.min(ks.length - 1, i + 2)][1];
  const t = easeInOut((f - ks[i][0]) / (ks[i + 1][0] - ks[i][0]));
  const out: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
    // centripetal-ish tension 0.5, damped to avoid overshoot
    const m1 = (c - a) * 0.25;
    const m2 = (d - b) * 0.25;
    const t2 = t * t, t3 = t2 * t;
    out[k] = (2 * t3 - 3 * t2 + 1) * b + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * c + (t3 - t2) * m2;
  }
  return out;
};
