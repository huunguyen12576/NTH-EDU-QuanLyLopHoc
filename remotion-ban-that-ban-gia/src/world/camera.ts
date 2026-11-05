import {V3} from '../lib/math';

export const W = 1080;
export const H = 1920;

export type Cam = {x: number; y: number; z: number; F: number; roll: number; shift: number};
export type P2 = {x: number; y: number; s: number; d: number};

export const project = (c: Cam, p: V3): P2 => {
  const d = Math.max(0.05, p[2] - c.z);
  const s = c.F / d;
  let x = (p[0] - c.x) * s;
  let y = -(p[1] - c.y) * s + c.shift;
  if (c.roll) {
    const cs = Math.cos(c.roll), sn = Math.sin(c.roll);
    [x, y] = [x * cs - y * sn, x * sn + y * cs];
  }
  return {x: W / 2 + x, y: H / 2 + y, s, d};
};
