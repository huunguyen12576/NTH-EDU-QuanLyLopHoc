import {blend, fk, groundHip, Joints, Pose, walk} from './rig';

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const EASE = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  // overshoot then settle: reads as weight / follow-through
  back: (t: number) => {
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  // damped spring 0 -> 1
  spring: (t: number) => 1 - Math.exp(-6 * t) * Math.cos(9 * t),
};
export type EaseName = keyof typeof EASE;

/** Scalar keyframes: [[t, v], ...] with optional per-segment easing (ease of the segment *ending* at that key). */
export const kf = (s: number, keys: [number, number, EaseName?][], def: EaseName = 'inOut') => {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b, vb, e] = keys[i + 1];
    if (s <= b) return lerp(va, vb, EASE[e ?? def](clamp((s - a) / (b - a))));
  }
  return keys[keys.length - 1][1];
};

export type Layer = 'room' | 'hall' | 'out';
export type Key = {
  t: number;
  x: number;
  y: number; // screen y of feet (anchor 'feet') or hip (anchor 'hip')
  anchor?: 'feet' | 'hip';
  d?: number; // depth line used for perspective scale (defaults to y for feet)
  face: number; // +1 right, -1 left
  pose: Pose | ((s: number) => Pose);
  ease?: EaseName; // easing of the segment that ENDS at this key
  walk?: boolean; // walk cycle on the segment that STARTS at this key
  arc?: number; // hop height (px) on the segment that ENDS at this key
  layer?: Layer;
  rot?: number; // whole-body rotation (rad)
  alpha?: number;
};
export type Char = {unit: number; base: string; dark: string; keys: Key[]; name: string};

export const depthScale = (d: number) => 0.8 + ((d - 548) / 100) * 0.26;

export type CharState = {
  x: number; y: number; // hip, screen px
  foot: number; // ground line for shadows / reflections
  px: number; // pixels per rig unit
  face: number;
  rot: number;
  pose: Pose;
  j: Joints;
  layer: Layer;
  alpha: number;
  walking: number;
};

const poseAt = (k: Key, s: number) => (typeof k.pose === 'function' ? k.pose(s) : k.pose);

const hipOf = (k: Key, pose: Pose, unit: number) => {
  const sc = depthScale(k.d ?? k.y) * unit;
  if (k.anchor === 'hip') return k.y;
  return k.y - groundHip(fk(pose)) * sc;
};

export const evalChar = (c: Char, s: number): CharState => {
  const ks = c.keys;
  let i = 0;
  while (i < ks.length - 1 && s > ks[i + 1].t) i++;
  const a = ks[i];
  const b = ks[Math.min(i + 1, ks.length - 1)];
  const raw = b.t > a.t ? clamp((s - a.t) / (b.t - a.t)) : 1;
  const u = EASE[b.ease ?? 'inOut'](raw);
  const pa = poseAt(a, s);
  const pb = poseAt(b, s);
  let pose = blend(pa, pb, clamp(u, -0.3, 1.3));
  const d = lerp(a.d ?? a.y, b.d ?? b.y, u);
  const px = depthScale(d) * c.unit;
  let x = lerp(a.x, b.x, a.walk ? raw : u);
  let walking = 0;
  if (a.walk && s >= a.t && s <= b.t) {
    // phase locked to distance travelled -> no foot sliding
    const dist = Math.abs(x - a.x);
    const cycle = 1.7 * px;
    const env = clamp(Math.min(raw, 1 - raw) / 0.12);
    walking = env;
    pose = walk(dist / cycle, env, pose);
  }
  let y: number;
  const bothFeet = (a.anchor ?? 'feet') === 'feet' && (b.anchor ?? 'feet') === 'feet';
  if (bothFeet) {
    const g = lerp(a.y, b.y, u);
    y = g - groundHip(fk(pose)) * px;
  } else {
    y = lerp(hipOf(a, pa, c.unit), hipOf(b, pb, c.unit), u);
  }
  if (b.arc && s > a.t && s < b.t) y -= b.arc * Math.sin(Math.PI * raw);
  // breathing — the figure is never a statue
  const br = Math.sin(s * 2 * Math.PI * 0.32 + c.unit);
  pose = {...pose, lean: pose.lean + 0.012 * br, lSh: pose.lSh + 0.02 * br, rSh: pose.rSh + 0.02 * br};
  const face = lerp(a.face, b.face, u);
  const rot = lerp(a.rot ?? 0, b.rot ?? 0, u);
  const alpha = lerp(a.alpha ?? 1, b.alpha ?? 1, u);
  const foot = lerp(a.anchor === 'hip' ? a.d ?? a.y : a.y, b.anchor === 'hip' ? b.d ?? b.y : b.y, u);
  return {x, y, foot, px, face, rot, pose, j: fk(pose), layer: (raw >= 1 ? b.layer : a.layer) ?? 'room', alpha, walking};
};

/** Head position in screen px. */
export const headPos = (st: CharState): [number, number] => {
  const [hx, hy] = st.j.head;
  const c = Math.cos(st.rot), sn = Math.sin(st.rot);
  const lx = hx * st.face * st.px;
  const ly = -hy * st.px;
  return [st.x + lx * c - ly * sn, st.y + lx * sn + ly * c];
};

// deterministic noise
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const noise1 = (t: number, seed = 0) => {
  const i = Math.floor(t), f = t - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57), hash(i + 1 + seed * 57), u) * 2 - 1;
};
