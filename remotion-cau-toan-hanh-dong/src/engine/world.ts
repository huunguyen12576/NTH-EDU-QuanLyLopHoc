// Pure scene logic (no React): where everything is at frame f.
import {T, BEAT, DURATION} from '../timeline';
import {clamp, easeIn, easeInOut, easeOut, hash, hash2, invLerp, keys, lerp, smooth, spring01, V3} from './math';
import {blend, fk, flail, groundHip, Joints, march, Pose, STAND, walk} from './rig';

export const CELL = 0.6;
export const IXMIN = -24;
export const IXMAX = 8;
export const IZMAX = 30;
export const DEPTH = 3.2; // visible height of the brick cliff
export const XMIN = IXMIN * CELL;

// ---------------------------------------------------------------- the crumbling edge
/** Base x of the cliff edge for the front row: the ground that time eats away. */
const E = (f: number) =>
  keys(
    f,
    [
      [-200, 5.4],
      [0, 3.05],
      [10, 3.0],
      [12, 2.66],
      [70, 2.5],
      [190, 1.95],
      [272, 1.47],
      [384, 0.88],
      [452, 0.27],
      [545, -0.93],
      [620, -1.5],
      [700, -1.95],
      [DURATION + 60, -2.9],
    ],
    (t) => t,
  );

const rowOffset = (iz: number) => {
  if (iz <= 1) return 0;
  return 0.35 + 0.75 * (0.5 + 0.5 * Math.sin(iz * 0.83 + 1.7)) + 0.45 * hash(iz * 3.1) + iz * 0.035;
};
const cellJitter = (ix: number, iz: number) => (iz <= 1 ? 0 : (hash2(ix, iz) - 0.5) * 0.42);

const NX = IXMAX - IXMIN + 1;
const crumbleTable: number[][] = [];
(() => {
  for (let iz = 0; iz <= IZMAX; iz++) {
    const row: number[] = new Array(NX).fill(Infinity);
    for (let ix = IXMIN; ix <= IXMAX; ix++) {
      const cx = (ix + 0.5) * CELL;
      for (let f = -200; f <= DURATION + 60; f++) {
        if (E(f) - rowOffset(iz) + cellJitter(ix, iz) < cx) {
          row[ix - IXMIN] = f;
          break;
        }
      }
    }
    // right cells must go first: enforce monotonic
    for (let i = NX - 2; i >= 0; i--) row[i] = Math.max(row[i], row[i + 1]);
    crumbleTable.push(row);
  }
})();

export const crumbleTime = (ix: number, iz: number) => {
  if (iz < 0 || iz > IZMAX || ix < IXMIN) return Infinity;
  if (ix > IXMAX) return -Infinity;
  return crumbleTable[iz][ix - IXMIN];
};

/** Right boundary x of the solid part of row iz at frame f. */
export const rowEdge = (iz: number, f: number) => {
  for (let ix = IXMAX; ix >= IXMIN; ix--) if (crumbleTime(ix, iz) > f) return (ix + 1) * CELL;
  return XMIN;
};

export const cellIx = (x: number) => Math.floor(x / CELL);
export const cellIz = (z: number) => Math.floor(z / CELL);

export type CrumbleEvent = {f: number; ix: number; iz: number};
export const crumbleEvents = (): CrumbleEvent[] => {
  const out: CrumbleEvent[] = [];
  for (let iz = 0; iz <= IZMAX; iz++)
    for (let ix = IXMIN; ix <= IXMAX; ix++) {
      const t = crumbleTime(ix, iz);
      if (Number.isFinite(t) && t > -40 && t < DURATION) out.push({f: t, ix, iz});
    }
  return out.sort((a, b) => a.f - b.f);
};

// ---------------------------------------------------------------- figures
export type FigureState = {
  id: number;
  x: number;
  y: number; // world y of hip
  z: number;
  facing: 1 | -1;
  joints: Joints; // relative to hip, already rotated
  blind: number; // 1 = blindfold on, 0 = removed
  bandShift: [number, number]; // local shift of the band while being pulled off
  bright: number;
  glow: number;
  falling: boolean;
  fallT: number;
  hero: boolean;
  seed: number;
};

type CrowdSpec = {id: number; x: number; z: number; seed: number; phase: number; amp: number; fallSpeed: number};

export const HERO_HOME: V3 = [0.3, 0, 0.3];
export const N1_ID = 1000;

export const crowd: CrowdSpec[] = (() => {
  const out: CrowdSpec[] = [];
  let id = 0;
  for (let k = 0; k <= 9; k++) {
    const z = 0.3 + 1.2 * k;
    const stagger = k % 2 === 1 ? 0.6 : 0;
    for (let j = -10; j <= 3; j++) {
      const x = 0.3 + 1.2 * j + stagger;
      if (k === 0 && j === 0) continue; // hero slot
      const seed = hash2(j + 40, k + 7);
      const isN1 = k === 0 && j === -1;
      const isF0 = k === 0 && j === 2;
      out.push({
        id: isN1 ? N1_ID : id++,
        x,
        z,
        seed,
        phase: (seed - 0.5) * 0.07,
        amp: 0.9 + seed * 0.15,
        fallSpeed: isF0 ? 0.58 : 1,
      });
    }
  }
  return out;
})();

const G = 9.8;

const rotJoints = (j: Joints, r: number, pivot: [number, number] = [0, 0]): Joints => {
  if (!r) return j;
  const c = Math.cos(r), s = Math.sin(r);
  const R = (p: [number, number]): [number, number] => {
    const u = p[0] - pivot[0], v = p[1] - pivot[1];
    return [u * c + v * s + pivot[0], -u * s + v * c + pivot[1]];
  };
  const o = {...j} as Joints;
  (['hip', 'neck', 'head', 'sh', 'lK', 'lF', 'rK', 'rF', 'lE', 'lH', 'rE', 'rH'] as const).forEach((k) => (o[k] = R(j[k])));
  o.headAng = j.headAng + r;
  return o;
};

const crowdBright = (f: number) => keys(f, [[0, 1], [T.heroStop, 1], [T.heroRip, 0.58], [T.labels, 0.62], [T.labels + 30, 0.72]]);

const crowdFigure = (c: CrowdSpec, f: number): FigureState | null => {
  const tFall = crumbleTime(cellIx(c.x), cellIz(c.z)) + 2;
  const phase = f / (BEAT * 2) + c.phase;
  let pose: Pose = march(phase, c.amp);

  // N1: the one who pushes the hero away, then resumes marching as if nothing happened.
  if (c.id === N1_ID) {
    const pushIn = smooth(invLerp(T.push - 8, T.push + 1, f)) * (1 - smooth(invLerp(T.push + 14, T.push + 34, f)));
    const shove: Pose = {lean: 0.18, head: 0.05, lHip: 0.35, lKnee: 0.2, rHip: -0.25, rKnee: 0.1, lSh: 1.45, lEl: 0.05, rSh: 1.55, rEl: 0.0};
    const stopped = smooth(invLerp(T.heroReach - 6, T.heroReach + 6, f)) * (1 - smooth(invLerp(T.push + 24, T.push + 40, f)));
    pose = blend(blend(pose, STAND, stopped), shove, pushIn);
  }

  const base = fk(pose);
  if (f < tFall) {
    return {
      id: c.id, x: c.x, y: groundHip(base), z: c.z, facing: 1, joints: base, blind: 1, bandShift: [0, 0],
      bright: crowdBright(f), glow: 0, falling: false, fallT: 0, hero: false, seed: c.seed,
    };
  }
  const t = ((f - tFall) / 30) * c.fallSpeed;
  const startPose = march(tFall / (BEAT * 2) + c.phase, c.amp);
  const p = blend(startPose, flail(t, c.seed), smooth(t / 0.4));
  const y0 = groundHip(fk(startPose));
  const y = y0 - 0.5 * G * t * t;
  if (y < -16) return null;
  const rot = t * t * (1.2 + c.seed * 1.4) + t * 0.4;
  return {
    id: c.id, x: c.x + 0.45 * t, y, z: c.z, facing: 1, joints: rotJoints(fk(p), rot), blind: 1, bandShift: [0, 0],
    bright: crowdBright(f), glow: 0, falling: true, fallT: t, hero: false, seed: c.seed,
  };
};

// ---------------------------------------------------------------- the bridge built by action
export type Brick = {pos: V3; rot: V3; size: V3; lockF: number; riseDur: number; i: number};

export const BRICK_SIZE: V3 = [0.56, 0.24, 0.52];
export const bridge: Brick[] = T.bricks.map((lockF, i) => {
  const top = i === 0 ? 0 : 0.11 * Math.min(i, 3) + 0.16 * Math.max(0, i - 3) + 0.02 * Math.sin(i * 2.1);
  return {
    i,
    lockF,
    riseDur: i === 0 ? 20 : i < 3 ? 14 : 10,
    pos: [0.95 + 0.6 * i + 0.03 * Math.sin(i * 1.7), top - BRICK_SIZE[1] / 2, 0.3 + 0.05 * Math.sin(i * 1.3)],
    // imperfect: never perfectly aligned, never perfectly level
    rot: [(hash(i * 7.3) - 0.5) * 0.09, (hash(i * 3.9) - 0.5) * 0.36, (hash(i * 5.1) - 0.5) * 0.1],
    size: BRICK_SIZE,
  };
});

export const brickAt = (b: Brick, f: number): {pos: V3; rot: V3; alpha: number; pulse: number} | null => {
  const t0 = b.lockF - b.riseDur;
  if (f < t0) return null;
  const u = (f - t0) / b.riseDur;
  let dy: number;
  if (u < 1) dy = -4.2 * (1 - easeOut(u)) ** 1.6 - 0.0;
  else dy = -0.05 * Math.exp(-(f - b.lockF) / 3) * Math.cos((f - b.lockF) * 0.9); // settle
  const spin = u < 1 ? (1 - easeOut(u)) * 1.6 : 0;
  const pulse = f >= b.lockF ? Math.exp(-(f - b.lockF) / 9) : 0;
  return {
    pos: [b.pos[0], b.pos[1] + dy, b.pos[2]],
    rot: [b.rot[0] + spin * 0.4, b.rot[1] + spin, b.rot[2] - spin * 0.3],
    alpha: clamp(u * 1.5),
    pulse,
  };
};
const brickTop = (i: number) => bridge[i].pos[1] + BRICK_SIZE[1] / 2;

// ---------------------------------------------------------------- hero
const heroBright = (f: number) => keys(f, [[0, 1], [T.heroRip, 1], [T.heroRip + 6, 1.15]]);

export const heroFigure = (f: number): FigureState => {
  let x = HERO_HOME[0];
  let groundY = 0;
  let facing: 1 | -1 = 1;
  let pose: Pose = march(f / (BEAT * 2), 1);
  let blind = 1;
  let bandShift: [number, number] = [0, 0];
  let rot = 0;
  let pivot: 'lF' | 'rF' | null = null;

  // 1. stops marching — the first act of will
  const stop = smooth(invLerp(T.heroStop, T.heroStop + 10, f));
  const breathe = 0.02 * Math.sin(f * 0.21);
  const still: Pose = {...STAND, lean: 0.03 + breathe, head: 0.06};
  pose = blend(pose, still, stop);

  // 2. raises hand to the blindfold
  const raise = easeInOut(invLerp(T.heroRaise, T.heroRip - 4, f));
  const atHead: Pose = {...still, head: 0.18, rSh: 2.55, rEl: 1.95, lSh: 0.3, lEl: 0.6, lean: 0.08};
  pose = blend(pose, atHead, raise);

  // 3. rips it off
  const rip = easeOut(invLerp(T.heroRip - 2, T.heroRip + 7, f));
  const ripped: Pose = {...still, lean: -0.08, head: -0.12, rSh: -0.75, rEl: 0.25, lSh: -0.15, lEl: 0.3, lHip: -0.05, rHip: 0.1};
  pose = blend(pose, ripped, rip);
  if (f >= T.heroRip - 2) {
    bandShift = [-0.25 * rip, -0.12 * rip];
  }
  if (f >= T.heroRip + 3) blind = 0;

  // 4. settles, looks down at the fallen blindfold, then up — sees the edge
  const settle = easeInOut(invLerp(T.heroRip + 8, T.heroRip + 24, f));
  const lookDown: Pose = {...still, head: 0.45, lean: 0.08};
  pose = blend(pose, lookDown, settle * (1 - smooth(invLerp(T.clothLand + 4, T.heroSees, f))));
  const recoil = easeOut(invLerp(T.heroSees, T.heroSees + 8, f)) * (1 - smooth(invLerp(T.heroTurn - 6, T.heroTurn + 4, f)));
  const startled: Pose = {...still, lean: -0.16, head: -0.06, rSh: 0.55, rEl: 0.9, lSh: 0.4, lEl: 0.9, rHip: -0.12, lHip: 0.08};
  pose = blend(pose, startled, recoil);

  // 5. turns toward the crowd and walks to the neighbour
  if (f >= T.heroTurn + 4) facing = -1;
  const walkIn = invLerp(T.heroTurn + 4, T.heroReach - 4, f);
  if (f >= T.heroTurn + 4 && f < T.push) {
    x = lerp(HERO_HOME[0], -0.08, easeInOut(walkIn));
    const w = walk(walkIn * 1.25, 0.8 * Math.sin(Math.PI * clamp(walkIn)));
    pose = blend(still, w, Math.sin(Math.PI * clamp(walkIn)) ** 0.5);
    // reaching out
    const reach = easeInOut(invLerp(T.heroReach - 10, T.heroReach + 2, f));
    const urging = 0.07 * Math.sin((f - T.heroReach) * 0.55) * smooth(invLerp(T.heroReach, T.heroReach + 6, f));
    const reachPose: Pose = {...still, lean: 0.14, head: 0.1, rSh: 1.42 + urging, rEl: 0.1, lSh: 1.05 + urging, lEl: 0.35, lHip: 0.25, rHip: -0.2};
    pose = blend(pose, reachPose, reach);
  }

  // 6. pushed back — staggers toward the edge
  if (f >= T.push) {
    const u = invLerp(T.push, T.staggerEnd, f);
    x = lerp(-0.08, 0.6, 1 - (1 - u) ** 2.2);
    const ph = u * 1.6;
    const st = walk(-ph, 0.9);
    const thrown: Pose = {...st, lean: -0.32, head: -0.25, rSh: 1.9 + 0.6 * Math.sin(f * 0.45), rEl: 0.5, lSh: 1.4 + 0.6 * Math.sin(f * 0.45 + 2), lEl: 0.6};
    pose = blend(pose, thrown, easeOut(invLerp(T.push, T.push + 5, f)));
  }

  // 7. heel over the void: tips backward (slow, suspended)… a brick rises to meet the foot.
  if (f >= T.staggerEnd) {
    x = 0.6;
    const tip = easeIn(invLerp(T.staggerEnd, T.firstBrick, f)) * 0.55;
    const save = spring01((f - T.firstBrick) / 30, 1.6, 0.42);
    rot = -tip * (1 - save);
    pivot = 'lF';
    const wind = Math.sin((f - T.staggerEnd) * 0.32);
    const balancing: Pose = {lean: -0.2, head: -0.3, lHip: 0.32, lKnee: 0.25, rHip: -0.5, rKnee: 0.1, lSh: 2.2 + 0.7 * wind, lEl: 0.4, rSh: 1.6 - 0.7 * wind, rEl: 0.5};
    const steadied: Pose = {...still, lean: 0.06, head: 0.4, lHip: 0.28, lKnee: 0.05, rHip: -0.36, rKnee: 0.05, lSh: 0.25, lEl: 0.3, rSh: 0.1, rEl: 0.3};
    pose = blend(balancing, steadied, smooth(invLerp(T.firstBrick, T.steady, f)));
  }

  // 8. shifts onto the brick, turns to face the void
  if (f >= T.steady) {
    const sh = easeInOut(invLerp(T.steady, T.turnForward, f));
    x = lerp(0.6, 0.97, sh);
    pivot = null;
    rot = 0;
    if (f >= T.turnForward) facing = 1;
    const look: Pose = {...still, head: 0.38, lean: 0.06};
    const ready: Pose = {...still, head: 0.12, lean: 0.1};
    pose = blend(pose, f < T.turnForward ? look : ready, smooth(invLerp(T.steady, T.steady + 10, f)));
  }

  // 9. steps into the void — brick after brick
  let gy = 0;
  if (f >= T.turnForward) {
    gy = brickTop(0);
    x = 0.97;
    for (let i = 1; i < bridge.length; i++) {
      const lock = bridge[i].lockF;
      const dur = i === 1 ? 26 : i < 4 ? 20 : 15;
      const s = lock - dur + 4;
      if (f >= s) {
        const u = clamp((f - s) / dur);
        x = lerp(bridge[i - 1].pos[0] + 0.02, bridge[i].pos[0] + 0.02, easeInOut(u));
        gy = lerp(brickTop(i - 1), brickTop(i), easeInOut(invLerp(0.55, 1, u)));
        const w = walk(0.25 + u * 0.5 + (i % 2) * 0.5, 1);
        const confidence = clamp(i / 5);
        const stepPose: Pose = {...w, lean: lerp(0.18, 0.1, confidence), head: lerp(0.32, 0.0, confidence)};
        pose = stepPose;
      }
    }
  }
  groundY = gy;

  let j = fk(pose);
  let y: number;
  if (pivot) {
    const pv = j[pivot];
    j = rotJoints(j, rot, pv);
    y = groundY - pv[1] + 0.035;
  } else {
    y = groundY + groundHip(j);
  }
  // slight sink on the very first stance
  return {
    id: -1, x, y, z: HERO_HOME[2], facing, joints: j, blind, bandShift, bright: heroBright(f),
    glow: smooth(invLerp(T.heroRip, T.heroRip + 20, f)), falling: false, fallT: 0, hero: true, seed: 0.5,
  };
};

export const figuresAt = (f: number): FigureState[] => {
  const out: FigureState[] = [];
  for (const c of crowd) {
    const s = crowdFigure(c, f);
    if (s) out.push(s);
  }
  out.push(heroFigure(f));
  return out;
};

// ---------------------------------------------------------------- the discarded blindfold
export const CLOTH_N = 9;
export const clothAt = (f: number, handWorld: V3 | null): {pts: V3[]; onFloor: number} | null => {
  if (f < T.heroRip + 3) return null;
  const land = T.clothLand;
  const rest: V3[] = [];
  for (let k = 0; k < CLOTH_N; k++) {
    const a = -0.5 + k * 0.12;
    rest.push([0.02 + k * 0.07 * Math.cos(a) + 0.04 * Math.sin(k * 1.3), 0.004, 0.18 + 0.045 * Math.sin(k * 0.9) + k * 0.02]);
  }
  if (f >= land + 10) return {pts: rest, onFloor: 1};
  const start: V3 = handWorld ?? [0.05, 1.05, 0.3];
  const pts: V3[] = [];
  for (let k = 0; k < CLOTH_N; k++) {
    const u = clamp((f - (T.heroRip + 3) - k * 0.9) / (land - T.heroRip - 3));
    const yU = easeIn(u);
    const flutter = Math.sin(f * 0.6 + k * 0.9) * 0.08 * (1 - u);
    const sx = start[0] - k * 0.05;
    pts.push([lerp(sx, rest[k][0], easeOut(u)) + flutter, lerp(start[1] + k * 0.01, rest[k][1], yU) + Math.abs(flutter) * 0.5, lerp(start[2], rest[k][2], u)]);
  }
  return {pts, onFloor: clamp((f - land) / 10)};
};

// ---------------------------------------------------------------- camera
type Shot = [number, V3, V3, number];
const shots: Shot[] = [
  // HOOK — low, intimate, at the edge with F0
  [0, [1.85, 1.05, -2.35], [2.8, 0.62, 0.35], 1550],
  [18, [1.9, 1.0, -2.4], [2.9, 0.35, 0.4], 1550],
  [52, [1.8, 1.1, -2.6], [2.9, -0.05, 0.5], 1500],
  // REVEAL — pull back and rise: the scale of conformity
  [92, [1.4, 1.9, -4.4], [1.3, 0.4, 2.4], 1500],
  [150, [0.2, 2.9, -6.6], [-0.4, 0.15, 3.8], 1700],
  [196, [-0.1, 3.1, -7.0], [-0.5, 0.2, 3.9], 1700],
  // AWAKENING — push in on one face in the crowd
  [236, [0.25, 1.75, -3.3], [0.32, 1.12, 0.4], 1500],
  [266, [0.2, 1.55, -2.55], [0.36, 1.0, 0.4], 1500],
  // he sees the edge
  [292, [0.75, 1.55, -3.2], [1.3, 0.55, 0.9], 1450],
  // reaching out to the neighbour — two-shot
  [326, [-0.35, 1.6, -3.7], [-0.4, 0.95, 0.35], 1450],
  [356, [0.0, 1.5, -3.9], [0.1, 0.9, 0.35], 1450],
  // pushed to the edge — low, tight, tense
  [392, [0.75, 1.05, -3.0], [0.85, 0.55, 0.4], 1500],
  [428, [0.95, 0.55, -2.5], [1.0, 0.62, 0.4], 1500],
  // heroic low angle after the first brick
  [462, [1.05, 0.75, -2.7], [1.15, 0.65, 0.35], 1450],
  // tracking him across the void
  [520, [1.7, 1.25, -3.5], [1.9, 0.75, 0.4], 1400],
  [580, [3.0, 1.75, -4.6], [3.1, 0.95, 0.6], 1350],
  // crane up and back: two worlds
  [650, [-1.6, 2.6, -10.5], [1.0, 1.0, 3.0], 1250],
  [720, [-0.2, 3.2, -12.5], [3.0, 1.6, 3.0], 1250],
  [DURATION, [1.6, 3.8, -13.5], [5.0, 2.3, 3.0], 1250],
];

import {keysV3} from './math';
import {noise1} from './math';

export const cameraAt = (f: number) => {
  const ks = shots.map((s) => [s[0], s[1]] as [number, V3]);
  const ts = shots.map((s) => [s[0], s[2]] as [number, V3]);
  const pos = keysV3(f, ks);
  const tgt = keysV3(f, ts);
  const F = keys(f, shots.map((s) => [s[0], s[3]] as [number, number]));
  // organic handheld drift; stronger in moments of tension
  const shake = keys(f, [[0, 0.02], [60, 0.012], [200, 0.006], [350, 0.016], [430, 0.024], [470, 0.01], [650, 0.004]]);
  const n = (s: number) => noise1(f / 24, s) * shake + noise1(f / 7, s + 9) * shake * 0.25;
  // impact jolts
  const jolt = (at: number, amp: number) => (f >= at ? amp * Math.exp(-(f - at) / 4) * Math.sin((f - at) * 1.7) : 0);
  const j = jolt(T.hookDrop + 2, 0.035) + jolt(T.push, 0.03) + jolt(T.firstBrick, 0.05);
  pos[0] += n(1);
  pos[1] += n(2) + j;
  tgt[0] += n(3) * 0.6;
  tgt[1] += n(4) * 0.6 + j * 0.6;
  const roll = noise1(f / 40, 11) * shake * 0.6 + keys(f, [[380, 0], [410, -0.03], [440, 0], [460, 0]]);
  return {pos, tgt, F, roll};
};

/** Focus distance & aperture: where the eye should rest. */
export const focusAt = (f: number) => ({
  dist: keys(f, [[0, 2.1], [40, 2.6], [92, 4.5], [150, 9.0], [196, 9.5], [236, 3.6], [266, 2.95], [292, 3.5], [326, 3.9], [392, 3.4], [428, 2.9], [520, 3.6], [580, 4.6], [650, 7.5], [720, 9.5]]),
  aperture: keys(f, [[0, 32], [60, 26], [150, 16], [236, 24], [400, 28], [600, 22], [650, 14]]),
});

export {DURATION};
