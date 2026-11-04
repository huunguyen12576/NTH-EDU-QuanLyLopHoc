// Stick-figure rig: forward kinematics in a 2D sagittal plane (x = facing direction, y = up).
export type Pose = {
  lean: number; // torso lean forward (rad)
  head: number; // extra head tilt forward
  lHip: number; lKnee: number; // far leg (0 = straight down, + = forward)
  rHip: number; rKnee: number; // near leg
  lSh: number; lEl: number; // far arm
  rSh: number; rEl: number; // near arm
};
export type V2 = [number, number];

export const LEN = {torso: 0.56, neck: 0.15, headR: 0.15, thigh: 0.46, shin: 0.46, upper: 0.3, fore: 0.29, foot: 0.04};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const blend = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (o[k] = lerp(a[k], b[k], t)));
  return o;
};
export const add = (a: Pose, d: Partial<Pose>): Pose => {
  const o = {...a};
  (Object.keys(d) as (keyof Pose)[]).forEach((k) => (o[k] += d[k] ?? 0));
  return o;
};
const P = (lean: number, head: number, lHip: number, lKnee: number, rHip: number, rKnee: number, lSh: number, lEl: number, rSh: number, rEl: number): Pose => ({lean, head, lHip, lKnee, rHip, rKnee, lSh, lEl, rSh, rEl});

// ---------------------------------------------------------------- pose library
export const POSE = {
  stand: P(0.02, 0, 0.06, 0.05, -0.06, 0.05, -0.1, 0.18, 0.1, 0.22),
  ask: P(0.1, -0.12, 0.08, 0.06, -0.05, 0.06, 0.95, 1.15, 1.05, 1.1), // hands clasped, looking up
  slump: P(0.22, 0.45, 0.04, 0.12, -0.04, 0.12, 0.05, 0.05, 0.12, 0.05),
  crossArms: P(-0.05, -0.08, 0.08, 0.04, -0.08, 0.04, 0.55, 1.95, 0.6, 2.05),
  noPoint: P(0.06, 0.02, 0.08, 0.04, -0.08, 0.04, 0.5, 1.9, 1.55, 0.05),
  openArm: P(0.04, 0.12, 0.08, 0.06, -0.06, 0.06, 0.15, 0.3, 1.1, -0.15),
  thumbs: P(0.0, 0.1, 0.08, 0.06, -0.06, 0.06, 0.1, 0.3, 0.9, 1.55),
  cheer: P(0.0, -0.2, 0.0, 0.1, 0.0, 0.1, 0.3, 0.6, 2.75, 0.75),
  crouch: P(0.35, -0.1, 1.2, 2.0, 0.9, 1.7, 0.6, 0.4, 0.8, 0.3),
  stepUp: P(0.25, -0.1, 1.55, 1.9, -0.1, 0.1, 1.7, 0.4, 2.0, 0.3),
  reachUp: P(0.12, -0.3, 0.1, 0.1, -0.05, 0.1, 2.5, 0.25, 2.7, 0.2),
  sill: P(0.55, -0.25, 2.1, 2.55, 1.85, 2.4, 1.4, 0.4, 1.2, 0.5),
  hang: P(0.05, -0.2, 0.2, 0.3, -0.1, 0.4, 2.9, 0.1, 3.0, 0.1),
  shock: P(-0.12, -0.15, 0.12, 0.08, -0.15, 0.08, 2.4, 2.4, 2.55, 2.35), // hands on head
  startled: P(-0.18, -0.12, 0.3, 0.5, -0.25, 0.45, 1.9, 1.1, 2.2, 0.9),
  sit: P(-0.02, 0.0, 1.5, 1.35, 1.45, 1.3, 0.25, 0.5, 0.35, 0.45),
  sitLean: P(0.35, 0.25, 1.5, 1.4, 1.45, 1.35, 0.55, 0.55, 0.7, 0.6), // elbows on knees
  headInHands: P(0.55, 0.65, 1.5, 1.45, 1.45, 1.4, 0.75, 2.05, 0.85, 2.0),
  sitUpWatch: P(0.12, -0.1, 1.5, 1.35, 1.45, 1.3, 0.4, 0.6, 0.5, 0.6),
  sitReach: P(0.0, 0.0, 1.5, 1.35, 1.45, 1.3, 0.3, 0.5, -1.25, 0.2), // near arm back to the lamp
  sitPalms: P(0.12, 0.05, 1.5, 1.35, 1.45, 1.3, 0.9, -0.4, 1.0, -0.5), // "you could've asked"
  sitTalk: P(0.05, -0.1, 1.5, 1.3, 1.45, 1.25, 1.2, 0.6, 1.9, 0.9),
  sitLaugh: P(-0.2, -0.35, 1.6, 1.3, 1.5, 1.25, 0.6, 1.4, 0.7, 1.5),
  sadDrop: P(0.18, 0.5, 0.08, 0.1, -0.08, 0.1, 0.02, 0.05, 0.08, 0.05),
  pat: P(0.08, 0.15, 0.08, 0.06, -0.06, 0.06, 0.1, 0.3, 1.55, 0.35),
  lampReach: P(0.25, 0.1, 0.08, 0.06, -0.06, 0.06, 0.1, 0.3, 1.25, 0.1),
  lie: P(0.0, -0.1, 0.25, 0.45, 0.15, 0.35, 0.3, 0.6, 0.15, 0.4),
};

/** Forward walking cycle; phase in cycles (one cycle = two steps). */
export const walk = (phase: number, amp = 1, base: Pose = POSE.stand): Pose => {
  const a = phase * Math.PI * 2;
  const lift = (x: number) => Math.max(0, x);
  return {
    ...base,
    lean: base.lean + 0.07 * amp,
    lHip: 0.48 * Math.sin(a) * amp,
    lKnee: (0.08 + 0.85 * lift(Math.cos(a))) * amp,
    rHip: 0.48 * Math.sin(a + Math.PI) * amp,
    rKnee: (0.08 + 0.85 * lift(Math.cos(a + Math.PI))) * amp,
    lSh: base.lSh * (1 - amp) - 0.42 * Math.sin(a) * amp,
    rSh: base.rSh * (1 - amp) - 0.42 * Math.sin(a + Math.PI) * amp,
    lEl: base.lEl * (1 - amp) + 0.3 * amp,
    rEl: base.rEl * (1 - amp) + 0.3 * amp,
  };
};

export type Joints = {
  hip: V2; neck: V2; head: V2; sh: V2;
  lK: V2; lF: V2; rK: V2; rF: V2;
  lE: V2; lH: V2; rE: V2; rH: V2;
};
const dir = (ang: number): V2 => [Math.sin(ang), -Math.cos(ang)]; // y up
const mv = (p: V2, d: V2, l: number): V2 => [p[0] + d[0] * l, p[1] + d[1] * l];

/** Joints relative to hip (0,0), y up, x = facing direction. */
export const fk = (p: Pose): Joints => {
  const hip: V2 = [0, 0];
  const up: V2 = [Math.sin(p.lean), Math.cos(p.lean)];
  const neck = mv(hip, up, LEN.torso);
  const sh = mv(hip, up, LEN.torso - 0.05);
  const ha = p.lean + p.head;
  const head = mv(neck, [Math.sin(ha), Math.cos(ha)], LEN.neck + LEN.headR * 0.7);
  const lK = mv(hip, dir(p.lHip), LEN.thigh);
  const lF = mv(lK, dir(p.lHip - p.lKnee), LEN.shin);
  const rK = mv(hip, dir(p.rHip), LEN.thigh);
  const rF = mv(rK, dir(p.rHip - p.rKnee), LEN.shin);
  const lE = mv(sh, dir(p.lSh + p.lean), LEN.upper);
  const lH = mv(lE, dir(p.lSh + p.lean + p.lEl), LEN.fore);
  const rE = mv(sh, dir(p.rSh + p.lean), LEN.upper);
  const rH = mv(rE, dir(p.rSh + p.lean + p.rEl), LEN.fore);
  return {hip, neck, head, sh, lK, lF, rK, rF, lE, lH, rE, rH};
};

/** Hip height (units) so the lowest foot touches y=0. */
export const groundHip = (j: Joints) => -Math.min(j.lF[1], j.rF[1]) + LEN.foot;
