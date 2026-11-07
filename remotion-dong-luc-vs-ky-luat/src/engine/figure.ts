// Frontal pictogram rig (x right, y up, metres, origin on the floor between the feet).
// Two-bone IK for legs and arms; the figure is a billboard placed in the 3D world.
import {FigState} from './story';
import {lerp} from './math';

export type P = [number, number];
export type FigJoints = {
  pelvis: P;
  neck: P;
  head: P;
  headR: number;
  hip: [P, P];
  knee: [P, P];
  foot: [P, P];
  sh: [P, P];
  el: [P, P];
  hand: [P, P];
  limbW: number;
  torsoW: number;
  grip: number; // hands-on-bar weight
  barY: number; // y of the bar when held
};

const ik = (a: P, b: P, l1: number, l2: number, side: number, pref: (p: P) => number): P => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(d, l1 + l2 - 1e-4);
  d = Math.max(d, Math.abs(l1 - l2) + 1e-4);
  const ang = Math.atan2(dy, dx);
  const c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const c1: P = [a[0] + Math.cos(ang + c) * l1, a[1] + Math.sin(ang + c) * l1];
  const c2: P = [a[0] + Math.cos(ang - c) * l1, a[1] + Math.sin(ang - c) * l1];
  return pref(c1) * side >= pref(c2) * side ? c1 : c2;
};

export const SHOULDER_Y = 1.47;
export const REACH = 0.57;

export const rig = (s: FigState, opts: {muscle?: number; sway?: number} = {}): FigJoints => {
  const muscle = opts.muscle ?? 0;
  const sit = s.sit;
  const hipY = lerp(0.97, 0.5, sit) - s.dip * 0.085;
  const lean = s.slump * 0.75;
  const pelvis: P = [opts.sway ?? 0, hipY];
  const torsoLen = 0.56 * Math.cos(lean * 0.8);
  const neck: P = [pelvis[0], hipY + torsoLen];
  const headAng = lean + s.slump * 0.75;
  const head: P = [neck[0], neck[1] + 0.2 * Math.cos(headAng) + 0.02];
  const shW = 0.2 + 0.035 * muscle;
  const shY = neck[1] - 0.05;
  const sh: [P, P] = [[neck[0] - shW, shY], [neck[0] + shW, shY]];

  const thigh = lerp(0.47, 0.34, sit);
  const shin = 0.47;
  const footX = lerp(0.17, 0.3, sit);
  const hip: [P, P] = [[pelvis[0] - 0.1, hipY], [pelvis[0] + 0.1, hipY]];
  const foot: [P, P] = [[-footX, 0.04], [footX, 0.04]];
  const knee: [P, P] = [0, 1].map((i) => {
    const side = i ? 1 : -1;
    return ik(hip[i], foot[i], thigh, shin, side, (p) => p[0]);
  }) as [P, P];

  // hands: grip on bar vs. resting (phone between knees)
  const press = s.press;
  const gripY = shY + 0.03 + press * REACH + (s.strain ? Math.sin(s.press * 80) * 0.004 * s.strain : 0);
  const gripX = 0.36 + 0.02 * muscle;
  const restY = hipY + 0.2 + 0.08 * (1 - s.slump) + 0.1 * s.look;
  const hand: [P, P] = [0, 1].map((i) => {
    const side = i ? 1 : -1;
    const g: P = [neck[0] + side * gripX, gripY];
    const r: P = [neck[0] + side * 0.05, restY];
    return [lerp(r[0], g[0], s.hold), lerp(r[1], g[1], s.hold)] as P;
  }) as [P, P];
  const fs = lerp(0.74, 1, press); // forearm foreshortening when elbows point at camera
  const el: [P, P] = [0, 1].map((i) => {
    const side = i ? 1 : -1;
    const up = press * s.hold;
    return ik(sh[i], hand[i], 0.31 * fs, 0.3 * fs, side, (p) => p[0] * (0.4 + up) - p[1] * (1 - up) * side);
  }) as [P, P];

  return {
    pelvis,
    neck,
    head,
    headR: 0.128,
    hip,
    knee,
    foot,
    sh,
    el,
    hand,
    limbW: 0.09 * (1 + 0.32 * muscle),
    torsoW: 0.2 * (1 + 0.22 * muscle),
    grip: s.hold,
    barY: gripY,
  };
};
