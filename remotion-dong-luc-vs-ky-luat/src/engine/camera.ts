import {V3} from './math';

export const W = 1080;
export const H = 1920;

export type Cam = {
  pos: V3;
  right: V3;
  up: V3;
  fwd: V3;
  F: number;
  roll: number;
  cx: number;
  cy: number;
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export const makeCam = (pos: V3, target: V3, F: number, roll = 0): Cam => {
  const fwd = norm(sub(target, pos));
  const right = norm(cross([0, 1, 0], fwd));
  const up = cross(fwd, right);
  return {pos, right, up, fwd, F, roll, cx: W / 2, cy: H / 2};
};

export type P2 = {x: number; y: number; z: number; s: number};

export const NEAR = 0.15;

export const project = (c: Cam, p: V3): P2 => {
  const d = sub(p, c.pos);
  let X = dot(d, c.right);
  let Y = dot(d, c.up);
  const Z = Math.max(NEAR, dot(d, c.fwd));
  if (c.roll) {
    const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
    const nx = X * cr - Y * sr;
    Y = X * sr + Y * cr;
    X = nx;
  }
  const s = c.F / Z;
  return {x: c.cx + X * s, y: c.cy - Y * s, z: Z, s};
};

/** Camera-space depth of a world point (for painter sorting). */
export const depth = (c: Cam, p: V3) => dot(sub(p, c.pos), c.fwd);

/** World -> camera space (X right, Y up, Z forward), with roll applied. */
export const toCam = (c: Cam, p: V3): V3 => {
  const d = sub(p, c.pos);
  let X = dot(d, c.right);
  let Y = dot(d, c.up);
  const Z = dot(d, c.fwd);
  if (c.roll) {
    const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
    const nx = X * cr - Y * sr;
    Y = X * sr + Y * cr;
    X = nx;
  }
  return [X, Y, Z];
};

const projCam = (c: Cam, q: V3): [number, number] => [c.cx + (q[0] * c.F) / q[2], c.cy - (q[1] * c.F) / q[2]];

/** Project a world polygon with near-plane clipping. Returns SVG points string or null. */
export const projPoly = (c: Cam, pts: V3[]): string | null => {
  const q = pts.map((p) => toCam(c, p));
  const out: V3[] = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[i];
    const b = q[(i + 1) % q.length];
    const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  if (out.length < 3) return null;
  return out.map((p) => projCam(c, p).map((v) => v.toFixed(1)).join(',')).join(' ');
};

/** Project a world segment with near-plane clipping, as an SVG path fragment. */
export const projSeg = (c: Cam, a3: V3, b3: V3): string => {
  let a = toCam(c, a3), b = toCam(c, b3);
  if (a[2] < NEAR && b[2] < NEAR) return '';
  if (a[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]; }
  if (b[2] < NEAR) { const t = (NEAR - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, NEAR]; }
  const pa = projCam(c, a), pb = projCam(c, b);
  return `M${pa[0].toFixed(1)} ${pa[1].toFixed(1)}L${pb[0].toFixed(1)} ${pb[1].toFixed(1)}`;
};
