// Stick-figure rig: forward kinematics in a 2D sagittal plane (u = forward, v = up),
// later placed in the 3D world as a billboard plane at constant z.
import {lerp} from './math';

export type Pose = {
  lean: number; // torso lean forward (rad)
  head: number; // extra head tilt forward (rad)
  lHip: number; lKnee: number; // far leg
  rHip: number; rKnee: number; // near leg
  lSh: number; lEl: number; // far arm
  rSh: number; rEl: number; // near arm
};

export const LEN = {
  torso: 0.56,
  neck: 0.17,
  headR: 0.125,
  thigh: 0.47,
  shin: 0.47,
  upper: 0.31,
  fore: 0.3,
  foot: 0.035,
};

export const STAND: Pose = {lean: 0.03, head: 0, lHip: 0.03, lKnee: 0.04, rHip: -0.03, rKnee: 0.04, lSh: -0.08, lEl: 0.15, rSh: 0.08, rEl: 0.15};

export const blend = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (o[k] = lerp(a[k], b[k], t)));
  return o;
};

/** Mechanical march in place. phase in cycles. */
export const march = (phase: number, amp = 1): Pose => {
  const a = phase * Math.PI * 2;
  const l = Math.max(0, Math.sin(a));
  const r = Math.max(0, Math.sin(a + Math.PI));
  return {
    lean: 0.06,
    head: 0.04 + 0.03 * Math.sin(a * 2),
    lHip: 0.95 * l * amp, lKnee: 1.55 * l * amp + 0.04,
    rHip: 0.95 * r * amp, rKnee: 1.55 * r * amp + 0.04,
    lSh: (0.42 * Math.sin(a + Math.PI) - 0.05) * amp, lEl: 0.35 + 0.25 * Math.max(0, Math.sin(a + Math.PI)),
    rSh: (0.42 * Math.sin(a) - 0.05) * amp, rEl: 0.35 + 0.25 * Math.max(0, Math.sin(a)),
  };
};

/** Forward walking cycle; phase in cycles (one cycle = two steps). */
export const walk = (phase: number, amp = 1): Pose => {
  const a = phase * Math.PI * 2;
  const swingL = Math.cos(a);
  const swingR = Math.cos(a + Math.PI);
  return {
    lean: 0.1,
    head: 0.02,
    lHip: 0.5 * Math.sin(a) * amp, lKnee: (0.1 + 0.9 * Math.max(0, swingL)) * amp,
    rHip: 0.5 * Math.sin(a + Math.PI) * amp, rKnee: (0.1 + 0.9 * Math.max(0, swingR)) * amp,
    lSh: -0.45 * Math.sin(a) * amp, lEl: 0.35,
    rSh: -0.45 * Math.sin(a + Math.PI) * amp, rEl: 0.35,
  };
};

/** Flailing while falling. t in seconds since fall began. */
export const flail = (t: number, seed: number): Pose => {
  const w = 9 + seed * 4;
  return {
    lean: -0.25,
    head: -0.35,
    lHip: 0.9 + 0.5 * Math.sin(t * w + seed), lKnee: 1.2 + 0.4 * Math.sin(t * w * 1.3),
    rHip: 0.2 + 0.6 * Math.sin(t * w + 2 + seed), rKnee: 0.7 + 0.5 * Math.sin(t * w * 0.9 + 1),
    lSh: 2.6 + 0.5 * Math.sin(t * w * 1.1 + seed), lEl: 0.5 + 0.4 * Math.sin(t * w),
    rSh: 2.1 + 0.6 * Math.sin(t * w * 0.8 + 3), rEl: 0.6 + 0.4 * Math.sin(t * w * 1.2),
  };
};

export type Joints = {
  hip: [number, number];
  neck: [number, number];
  head: [number, number];
  sh: [number, number];
  lK: [number, number]; lF: [number, number];
  rK: [number, number]; rF: [number, number];
  lE: [number, number]; lH: [number, number];
  rE: [number, number]; rH: [number, number];
  headAng: number;
};

const dir = (ang: number): [number, number] => [Math.sin(ang), -Math.cos(ang)]; // 0 = straight down
const add = (p: [number, number], d: [number, number], l: number): [number, number] => [p[0] + d[0] * l, p[1] + d[1] * l];

/** Joints relative to the hip at (0,0). */
export const fk = (p: Pose): Joints => {
  const hip: [number, number] = [0, 0];
  const up: [number, number] = [Math.sin(p.lean), Math.cos(p.lean)];
  const neck = add(hip, up, LEN.torso);
  const sh = add(hip, up, LEN.torso - 0.05);
  const headAng = p.lean + p.head;
  const head = add(neck, [Math.sin(headAng), Math.cos(headAng)], LEN.neck);
  const lK = add(hip, dir(p.lHip), LEN.thigh);
  const lF = add(lK, dir(p.lHip - p.lKnee), LEN.shin);
  const rK = add(hip, dir(p.rHip), LEN.thigh);
  const rF = add(rK, dir(p.rHip - p.rKnee), LEN.shin);
  const lE = add(sh, dir(p.lSh + p.lean), LEN.upper);
  const lH = add(lE, dir(p.lSh + p.lean + p.lEl), LEN.fore);
  const rE = add(sh, dir(p.rSh + p.lean), LEN.upper);
  const rH = add(rE, dir(p.rSh + p.lean + p.rEl), LEN.fore);
  return {hip, neck, head, sh, lK, lF, rK, rF, lE, lH, rE, rH, headAng};
};

/** Hip height so that the lowest foot touches the ground. */
export const groundHip = (j: Joints) => -Math.min(j.lF[1], j.rF[1]) + LEN.foot;
