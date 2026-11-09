// Deterministic story logic: bricks, physics, figures, camera, light. Pure functions of the frame,
// shared by the renderer (src/scene) and the audio-event exporter (scripts/export-events.ts).
import {DURATION, FPS, SHOUTS, T, Who} from '../timeline';
import {blend, fk, groundHip, Joints, LEN, Pose, STAND, walk} from './rig';
import {clamp, easeIn, easeInOut, easeOut, hash, hash2, invLerp, Key, keys, keysV3, lerp, noise1, smooth, V3} from './math';

// ------------------------------------------------------------------ wall geometry
export const BW = 0.27; // brick length (x)
export const BH = 0.125; // brick height
export const BD = 0.22; // brick depth (z)
export const ROWS = 19;
export const WALL_X = BW; // wall faces at x = ±0.27
export const HOLE_ROW = 12;
export const HOLE_Y = BH * (HOLE_ROW + 0.5);

export type Slot = {id: number; row: number; x: number; y: number; w: number};
export const SLOTS: Slot[] = [];
for (let r = 0; r < ROWS; r++) {
  const y = BH * (r + 0.5);
  const xs: [number, number][] = r % 2 === 0 ? [[-BW / 2, BW], [BW / 2, BW]] : [[-BW * 0.75, BW / 2], [0, BW], [BW * 0.75, BW / 2]];
  for (const [x, w] of xs) SLOTS.push({id: SLOTS.length, row: r, x, y, w});
}
export const HOLE_IDS = SLOTS.filter((s) => s.row === HOLE_ROW).map((s) => s.id); // [left, right]

// ------------------------------------------------------------------ figures: base placement
export const SIDE: Record<Who, number> = {A: -1, B: 1};
export const ARGUE_X = 0.95;

// ------------------------------------------------------------------ thrown bricks
export type Thrown = {slot: Slot; shout: number; who: Who; launch: number; land: number; from: V3; spin: number; word: boolean};

export const THROWN: Thrown[] = (() => {
  const raw: Omit<Thrown, 'slot'>[] = [];
  SHOUTS.forEach((s, si) => {
    for (let j = 0; j < s.n; j++) {
      const launch = s.f + 6 + j * s.gap;
      const side = SIDE[s.who];
      raw.push({
        shout: si,
        who: s.who,
        launch,
        land: launch + s.flight + (si === 0 ? 0 : (hash(si * 7 + j) - 0.5) * 2),
        from: [side * (ARGUE_X - 0.46), 1.74 - j * 0.05, -0.02],
        spin: (hash(si * 13 + j * 3) - 0.5) * 7,
        word: j === 0,
      });
    }
  });
  const sealLast = raw.pop()!; // final brick seals the top
  raw.sort((a, b) => a.land - b.land);
  raw.push(sealLast);
  return raw.map((r, i) => ({...r, slot: SLOTS[i]}));
})();
if (THROWN.length !== SLOTS.length) throw new Error(`brick count ${THROWN.length} != ${SLOTS.length}`);

export const SEAL_F = THROWN[THROWN.length - 1].land;

// ------------------------------------------------------------------ rigid body sim (floor only)
export type BodyState = {p: V3; r: V3; on: boolean};
type Body = {start: number; p: V3; v: V3; r: V3; w: V3};
const G = 9.8;
const simulate = (b: Body): BodyState[] => {
  const out: BodyState[] = [];
  const p = [...b.p] as V3, v = [...b.v] as V3, r = [...b.r] as V3, w = [...b.w] as V3;
  let rest = false;
  const SUB = 6, dt = 1 / FPS / SUB;
  for (let f = b.start; f < DURATION + 2; f++) {
    for (let s = 0; s < SUB && !rest; s++) {
      v[1] -= G * dt;
      for (let k = 0; k < 3; k++) { p[k] += v[k] * dt; r[k] += w[k] * dt; }
      const floorY = BH / 2;
      if (p[1] < floorY) {
        p[1] = floorY;
        if (v[1] < -0.6) {
          v[1] = -v[1] * 0.28;
          v[0] *= 0.55; v[2] *= 0.55;
          w[0] *= 0.45; w[1] *= 0.6; w[2] *= 0.45;
        } else {
          v[1] = 0; v[0] *= 0.82; v[2] *= 0.82; w[0] *= 0.7; w[1] *= 0.7; w[2] *= 0.7;
        }
      }
      if (p[1] <= floorY + 0.002) {
        // settle flat: pull tilt to nearest quarter turn
        for (const k of [0, 2]) {
          const tgt = Math.round(r[k] / (Math.PI / 2)) * (Math.PI / 2);
          r[k] = lerp(r[k], tgt, 0.06);
        }
        if (Math.hypot(v[0], v[1], v[2]) < 0.03) rest = true;
      }
    }
    out.push({p: [...p] as V3, r: [...r] as V3, on: p[1] <= BH / 2 + 0.003});
  }
  return out;
};

// Impact frames for audio: computed alongside the sim.
const impacts = (b: Body, states: BodyState[]) => {
  const hits: number[] = [];
  for (let i = 1; i < states.length; i++) {
    const vy = (states[i].p[1] - states[i - 1].p[1]) * FPS;
    const prevVy = i > 1 ? (states[i - 1].p[1] - states[i - 2].p[1]) * FPS : vy;
    if (states[i].p[1] <= BH / 2 + 0.01 && prevVy < -0.9 && vy > prevVy + 0.5) hits.push(b.start + i);
  }
  return hits;
};

// hole bricks: pushed through by A, fall on B's side
const PUSH_D = 0.56;
export const pushOffset = (f: number) => PUSH_D * easeInOut(invLerp(T.pushA, T.pushEnd, f)) + 0.012 * Math.sin(invLerp(T.pushA, T.pushEnd, f) * Math.PI * 9) * (f > T.pushA && f < T.pushEnd ? 1 : 0);
const holeRelease = (id: number) => {
  // released when the brick's centre passes beyond the wall face
  const s = SLOTS[id];
  for (let f = T.pushA; f <= T.pushEnd + 1; f++) if (s.x + pushOffset(f) > WALL_X + 0.02) return f;
  return T.pushEnd;
};
export const HOLE_SIM = HOLE_IDS.map((id, k) => {
  const s = SLOTS[id];
  const start = holeRelease(id);
  const x = s.x + pushOffset(start);
  const body: Body = {start, p: [x, s.y, 0], v: [0.75 + k * 0.1, 0.25, -0.15 + k * 0.32], r: [0, 0, 0], w: [0.6 - k, 0.4, -3.2 - k * 1.4]};
  const st = simulate(body);
  return {id, start, states: st, hits: impacts(body, st)};
});

// collapse: ripples outward from the touch point
export const collapseDelay = (s: Slot) => Math.hypot(s.x, s.y - HOLE_Y) * 9 + (ROWS - s.row) * 0.6 + hash(s.id * 3.1) * 4;
export const crackTime = (s: Slot) => T.touch + Math.hypot(s.x * 1.3, s.y - HOLE_Y) * 13;
export const COLLAPSE_SIM = SLOTS.filter((s) => !HOLE_IDS.includes(s.id)).map((s) => {
  const h1 = hash(s.id * 1.7), h2 = hash(s.id * 5.3 + 2), h3 = hash(s.id * 9.1 + 4);
  const start = Math.round(T.collapse + collapseDelay(s));
  const zDir = h1 < 0.5 ? -1 : 1;
  const up = clamp((s.y - 0.4) / 2);
  const body: Body = {
    start,
    p: [s.x, s.y, 0],
    v: [Math.sign(s.x || (h2 - 0.5)) * (0.15 + 0.5 * h2) * up, 0.2 + 0.7 * h3 * up, zDir * (0.35 + 1.5 * h2) * (0.35 + up)],
    r: [0, 0, 0],
    w: [zDir * (2 + 5 * h3) * (0.3 + up), (h1 - 0.5) * 3, (h2 - 0.5) * 6 * up],
  };
  const st = simulate(body);
  return {id: s.id, start, states: st, hits: impacts(body, st)};
});
const SIM_BY_ID = new Map<number, {start: number; states: BodyState[]}>();
[...HOLE_SIM, ...COLLAPSE_SIM].forEach((s) => SIM_BY_ID.set(s.id, s));

// ------------------------------------------------------------------ brick state at frame
export type BrickState = {
  id: number; p: V3; r: V3; size: V3; visible: boolean; hot: number; fade: number; flying: boolean; crack: number; thrown: Thrown;
};

const wallTremble = (f: number, s: Slot): V3 => {
  const sealShake = Math.exp(-Math.max(0, f - SEAL_F) / 5) * (f >= SEAL_F ? 1 : 0) * 0.006;
  const pre = smooth(invLerp(T.touch, T.collapse, f)) * 0.01 * (f < T.collapse + 30 ? 1 : 0);
  const a = sealShake + pre;
  if (a < 1e-4) return [0, 0, 0];
  return [noise1(f * 0.9, s.id) * a, noise1(f * 1.1, s.id + 50) * a * 0.5, noise1(f * 0.8, s.id + 90) * a];
};

export const brickAt = (b: Thrown, f: number): BrickState => {
  const s = b.slot;
  const size: V3 = [s.w - 0.012, BH - 0.012, BD];
  const base = {id: s.id, size, thrown: b, crack: clamp((f - crackTime(s)) / 8)};
  const fade = 1 - smooth(invLerp(T.dissolve + hash(s.id) * 25, T.dissolve + 30 + hash(s.id) * 25, f));
  if (f < b.launch) return {...base, p: b.from, r: [0, 0, 0], visible: false, hot: 1, fade, flying: false};
  if (f < b.land) {
    let t = (f - b.launch) / (b.land - b.launch);
    t = b.shout === 0 ? easeInOut(t) * 0.85 + t * 0.15 : t * t * 0.35 + t * 0.65; // hook brick: slow-motion arc
    const to: V3 = [s.x, s.y, 0];
    const arc = 0.28 + 0.25 * Math.abs(to[0] - b.from[0]) + 0.15 * clamp((b.from[1] - to[1]) / 2);
    const p: V3 = [lerp(b.from[0], to[0], t), lerp(b.from[1], to[1], t) + arc * 4 * t * (1 - t), lerp(b.from[2], to[2], t) - 0.2 * Math.sin(Math.PI * t)];
    const k = 1 - t;
    return {...base, p, r: [b.spin * 0.25 * k * k, b.spin * 0.4 * k, b.spin * k * k], visible: true, hot: 1, fade, flying: true};
  }
  const sim = SIM_BY_ID.get(s.id);
  if (sim && f >= sim.start) {
    const st = sim.states[Math.min(sim.states.length - 1, f - sim.start)];
    return {...base, p: st.p, r: st.r, visible: true, hot: 0, fade, flying: false};
  }
  const dt = f - b.land;
  const settle = Math.exp(-dt / 2.5) * Math.sin(dt * 1.9) * 0.018;
  const tr = wallTremble(f, s);
  let px = s.x + tr[0];
  if (HOLE_IDS.includes(s.id)) px += pushOffset(f);
  const hot = Math.exp(-dt / (b.shout === SHOUTS.length - 1 ? 30 : 16));
  return {...base, p: [px, s.y + Math.abs(settle) + tr[1], tr[2]], r: [0, 0, settle * 0.6], visible: true, hot, fade, flying: false};
};

export const bricksAt = (f: number) => THROWN.map((b) => brickAt(b, f));

// ------------------------------------------------------------------ atmosphere
export const shoutEnv = (f: number, sf: number) => {
  if (f < sf - 2) return 0;
  return f < sf + 2 ? smooth((f - sf + 2) / 4) : Math.exp(-(f - sf - 2) / 9);
};

export const heatAt = (f: number) => {
  let h = 0.22 + 0.62 * smooth(invLerp(0, 240, f));
  for (const s of SHOUTS) h += 0.22 * shoutEnv(f, s.f + 4);
  h += 0.35 * Math.exp(-Math.abs(f - SEAL_F) / 3);
  const snuff = 1 - smooth(invLerp(SEAL_F + 2, T.snuffEnd, f));
  return clamp(h, 0, 1.25) * snuff;
};

/** White light of reconciliation, 0..1. */
export const warmthAt = (f: number) => {
  const hole = 0.25 * smooth(invLerp(T.pushEnd - 6, T.reachA + 6, f));
  const touch = 0.45 * smooth(invLerp(T.touch - 3, T.touch + 10, f));
  const coll = 0.3 * smooth(invLerp(T.collapse, T.collapse + 30, f));
  const flash = 0.5 * Math.exp(-Math.max(0, f - T.touch) / 6) * (f >= T.touch ? 1 : 0);
  const out = 1 - 0.55 * smooth(invLerp(T.fadeOut - 30, DURATION, f));
  return (hole + touch + coll + flash) * out;
};

/** Saturation/brightness of the world: fire (1) -> drained grey (0) -> light (1). */
export const lifeAt = (f: number) => {
  if (f < SEAL_F) return 1;
  const drain = smooth(invLerp(SEAL_F + 4, SEAL_F + 50, f));
  const back = smooth(invLerp(T.touch - 10, T.hug, f));
  return 1 - drain * 0.42 + back * 0.42;
};

// ------------------------------------------------------------------ figure poses
type Ctx = {x: number; facing: number};

const ik = (pose: Pose, ctx: Ctx, which: 'near' | 'far', target: [number, number], bendUp = false): Pose => {
  const j = fk(pose);
  const hipY = groundHip(j);
  const tu = (target[0] - ctx.x) * ctx.facing - j.sh[0];
  const tv = target[1] - hipY - j.sh[1];
  const u = LEN.upper, fo = LEN.fore;
  const L = clamp(Math.hypot(tu, tv), 0.08, u + fo - 0.002);
  const phi = Math.atan2(tu, -tv);
  const alpha = Math.acos(clamp((u * u + L * L - fo * fo) / (2 * u * L), -1, 1));
  const beta = Math.acos(clamp((fo * fo + L * L - u * u) / (2 * fo * L), -1, 1));
  const sgn = bendUp ? -1 : 1;
  const a1 = phi - sgn * alpha;
  const el = sgn * (alpha + beta);
  const o = {...pose};
  if (which === 'near') { o.rSh = a1 - pose.lean; o.rEl = el; } else { o.lSh = a1 - pose.lean; o.lEl = el; }
  return o;
};

const breathe = (f: number, seed: number, amp = 1): Pose => {
  const b = Math.sin(f * 0.13 + seed * 3) * amp;
  return {...STAND, lean: 0.03 + 0.012 * b, head: 0.01 * b, lSh: -0.1 - 0.02 * b, rSh: 0.1 + 0.02 * b};
};

const ANGRY = (f: number, seed: number): Pose => {
  const tr = noise1(f * 0.5, seed) * 0.03;
  return {lean: 0.12 + tr, head: 0.08, lHip: -0.24, lKnee: 0.12, rHip: 0.26, rKnee: 0.32, lSh: 0.25 + tr, lEl: 1.5, rSh: 0.3 - tr, rEl: 1.65};
};
const WIND: Pose = {lean: -0.08, head: -0.2, lHip: -0.3, lKnee: 0.16, rHip: 0.2, rKnee: 0.35, lSh: 0.5, lEl: 1.2, rSh: -0.45, rEl: 1.9};
const PEAK: Pose = {lean: 0.36, head: 0.32, lHip: -0.4, lKnee: 0.08, rHip: 0.36, rKnee: 0.45, lSh: -0.65, lEl: 0.5, rSh: 1.62, rEl: 0.08};
const RECOIL: Pose = {lean: -0.14, head: -0.16, lHip: -0.3, lKnee: 0.2, rHip: 0.18, rKnee: 0.3, lSh: 0.6, lEl: 1.9, rSh: 0.7, rEl: 1.95};
const SLUMP: Pose = {lean: 0.2, head: 0.62, lHip: 0.02, lKnee: 0.1, rHip: -0.02, rKnee: 0.1, lSh: 0.02, lEl: 0.12, rSh: 0.06, rEl: 0.14};
const STUN: Pose = {lean: -0.04, head: -0.28, lHip: -0.08, lKnee: 0.05, rHip: 0.1, rKnee: 0.06, lSh: -0.12, lEl: 0.25, rSh: 0.1, rEl: 0.3};
const PEER: Pose = {lean: 0.16, head: -0.05, lHip: -0.12, lKnee: 0.1, rHip: 0.14, rKnee: 0.16, lSh: 0.1, lEl: 0.3, rSh: 0.2, rEl: 0.5};
const LEAN_WALL: Pose = {lean: 0.12, head: 0.18, lHip: -0.1, lKnee: 0.08, rHip: 0.1, rKnee: 0.12, lSh: 0.04, lEl: 0.15, rSh: 0.3, rEl: 0.4};
const PUSH: Pose = {lean: 0.3, head: 0.12, lHip: -0.34, lKnee: 0.08, rHip: 0.32, rKnee: 0.55, lSh: 0.2, lEl: 0.5, rSh: 0.5, rEl: 0.4};
const FLINCH: Pose = {lean: -0.2, head: -0.25, lHip: -0.2, lKnee: 0.12, rHip: 0.2, rKnee: 0.25, lSh: 0.4, lEl: 1.9, rSh: 0.9, rEl: 2.1};
const HOLD: Pose = {lean: 0.06, head: 0.02, lHip: -0.05, lKnee: 0.05, rHip: 0.08, rKnee: 0.08, lSh: -0.05, lEl: 0.2, rSh: 0.5, rEl: 0.3};
const HUG: Pose = {lean: 0.08, head: 0.22, lHip: -0.06, lKnee: 0.06, rHip: 0.08, rKnee: 0.1, lSh: 1.2, lEl: 1.6, rSh: 1.2, rEl: 1.6};

type Spec = (f: number, ctx: Ctx, seed: number) => Pose;
type Track = Key<Spec>[];

const evalTrack = (f: number, tr: Track, ctx: Ctx, seed: number): Pose => {
  if (f <= tr[0][0]) return tr[0][1](f, ctx, seed);
  for (let i = 0; i < tr.length - 1; i++) {
    const [f0, a] = tr[i];
    const [f1, b] = tr[i + 1];
    if (f <= f1) {
      const t = easeInOut((f - f0) / (f1 - f0));
      return t <= 0 ? a(f, ctx, seed) : t >= 1 ? b(f, ctx, seed) : blend(a(f, ctx, seed), b(f, ctx, seed), t);
    }
  }
  return tr[tr.length - 1][1](f, ctx, seed);
};

const P = (pose: Pose): Spec => () => pose;
const withBreath = (pose: Pose, amp = 1): Spec => (f, _c, seed) => {
  const b = Math.sin(f * 0.13 + seed * 3) * amp;
  return {...pose, lean: pose.lean + 0.015 * b, head: pose.head + 0.02 * b};
};
const reach = (pose: Pose, tgt: (f: number, side: number) => [number, number], arm: 'near' | 'far' = 'near'): Spec => (f, ctx, seed) =>
  ik(withBreath(pose, 0.6)(f, ctx, seed), ctx, arm, tgt(f, ctx.facing));

// Argument phase: procedural layering of shouts and recoils over seething idle.
const argue = (who: Who): Spec => (f, ctx, seed) => {
  let pose = ANGRY(f, seed);
  if (f < 4 && who === 'A') pose = blend(pose, WIND, 1);
  for (const s of SHOUTS) {
    if (s.who === who) {
      const wind = s.f - 7 < f && f <= s.f ? Math.sin(Math.PI * clamp((f - (s.f - 7)) / 8)) : 0;
      const peak = f < s.f - 1 ? 0 : f < s.f + 2 ? easeOut((f - s.f + 1) / 3) : f < s.f + 5 ? 1 : Math.exp(-(f - s.f - 5) / 6);
      if (wind > 0) pose = blend(pose, WIND, wind);
      if (peak > 0.001) pose = blend(pose, PEAK, peak * (s.n > 3 ? 0.9 : 1));
    } else {
      const hitF = s.f + 6 + s.flight * 0.6;
      const r = f < hitF - 3 ? 0 : f < hitF ? (f - hitF + 3) / 3 : Math.exp(-(f - hitF) / 7);
      if (r > 0.001) pose = blend(pose, RECOIL, r * 0.55);
    }
  }
  return pose;
};

type FigTrack = {x: Key<number>[]; facing: Key<number>[]; pose: Track};

const TRACKS: Record<Who, FigTrack> = {
  A: {
    x: [[0, -ARGUE_X], [T.turnAway + 6, -ARGUE_X], [T.awayEnd, -1.25], [T.turnBack + 6, -1.25], [T.walkBackEnd, -0.66], [T.joinDown, -0.66], [T.stepIn, -0.46], [T.stepIn + 6, -0.46], [T.hug, -0.27]],
    facing: [[T.turnAway, 1], [T.turnAway + 6, -1], [T.turnBack, -1], [T.turnBack + 6, 1]],
    pose: [
      [0, argue('A')], [SEAL_F, argue('A')], [SEAL_F + 8, P(STUN)], [T.slump, P(STUN)], [T.turnAway - 2, withBreath(SLUMP)],
      [T.awayEnd, withBreath(SLUMP)], [T.turnBack, withBreath(SLUMP, 1.4)], [T.walkBackEnd - 2, withBreath(LEAN_WALL)],
      [T.walkBackEnd + 4, reach(LEAN_WALL, (f) => [-WALL_X - 0.02, HOLE_Y - 0.25 + 0.25 * smooth(invLerp(T.walkBackEnd + 4, T.handsOnWall, f))])],
      [T.handsOnWall, reach(LEAN_WALL, () => [-WALL_X - 0.01, HOLE_Y])],
      [T.pushA - 4, reach(LEAN_WALL, () => [-WALL_X - 0.04, HOLE_Y])],
      [T.pushA + 3, reach(PUSH, (f) => [-WALL_X + Math.min(0.2, pushOffset(f)), HOLE_Y])],
      [T.pushEnd - 4, reach(PUSH, (f) => [-WALL_X + Math.min(0.2, pushOffset(f)), HOLE_Y])],
      [T.reachA, reach(LEAN_WALL, () => [-WALL_X - 0.08, HOLE_Y - 0.05])],
      [T.reachA + 18, reach(HOLD, () => [-0.04, HOLE_Y])],
      [T.touch, reach(HOLD, () => [-0.02, HOLE_Y])],
      [T.joinDown, reach(HOLD, (f) => [-0.02 + 0.006 * Math.sin(f * 0.2), HOLE_Y])],
      [T.stepIn, reach(HOLD, () => [-0.01, 1.12])],
      [T.stepIn + 10, reach(HOLD, () => [-0.01, 1.08])],
      [T.hug, (f, ctx, seed) => ik(ik(withBreath(HUG, 0.5)(f, ctx, seed), ctx, 'near', [0.3, 1.3]), ctx, 'far', [0.26, 1.42])],
    ],
  },
  B: {
    x: [[0, ARGUE_X], [T.turnAway + 6, ARGUE_X], [T.awayEnd, 1.25], [T.turnBack + 6, 1.25], [T.walkBackEnd + 4, 0.66], [T.joinDown, 0.66], [T.stepIn, 0.46], [T.stepIn + 6, 0.46], [T.hug, 0.27]],
    facing: [[T.turnAway + 3, -1], [T.turnAway + 9, 1], [T.turnBack + 4, 1], [T.turnBack + 10, -1]],
    pose: [
      [0, argue('B')], [SEAL_F, argue('B')], [SEAL_F + 10, P(STUN)], [T.slump + 4, P(STUN)], [T.turnAway, withBreath(SLUMP)],
      [T.awayEnd, withBreath(SLUMP)], [T.turnBack + 4, withBreath(SLUMP, 1.4)], [T.walkBackEnd + 2, withBreath(LEAN_WALL)],
      [T.walkBackEnd + 8, reach(LEAN_WALL, (f) => [WALL_X + 0.02, HOLE_Y - 0.25 + 0.25 * smooth(invLerp(T.walkBackEnd + 8, T.handsOnWall, f))])],
      [T.handsOnWall, reach(LEAN_WALL, () => [WALL_X + 0.01, HOLE_Y])],
      [T.pushA + 5, reach(LEAN_WALL, () => [WALL_X + 0.01, HOLE_Y])],
      [T.pushA + 10, P(FLINCH)],
      [T.holeLand - 2, P(FLINCH)],
      [T.reachB - 4, withBreath(PEER)],
      [T.reachB + 6, reach(PEER, () => [WALL_X - 0.02, HOLE_Y])],
      [T.touch, reach(HOLD, () => [0.02, HOLE_Y])],
      [T.joinDown, reach(HOLD, (f) => [0.02 + 0.006 * Math.sin(f * 0.2), HOLE_Y])],
      [T.stepIn, reach(HOLD, () => [0.01, 1.12])],
      [T.stepIn + 10, reach(HOLD, () => [0.01, 1.08])],
      [T.hug + 4, (f, ctx, seed) => ik(ik(withBreath(HUG, 0.5)(f, ctx, seed + 1), ctx, 'near', [-0.3, 1.34]), ctx, 'far', [-0.26, 1.45])],
    ],
  },
};

// locomotion: precomputed per-frame x and cumulative distance (drives the walk cycle)
const LOCO: Record<Who, {x: number[]; dist: number[]; speed: number[]}> = {A: {x: [], dist: [], speed: []}, B: {x: [], dist: [], speed: []}};
(['A', 'B'] as Who[]).forEach((w) => {
  const L = LOCO[w];
  let d = 0;
  for (let f = 0; f <= DURATION + 1; f++) {
    const x = keys(f, TRACKS[w].x);
    if (f > 0) d += Math.abs(x - L.x[f - 1]);
    L.x.push(x);
    L.dist.push(d);
  }
  for (let f = 0; f <= DURATION + 1; f++) L.speed.push(Math.abs(L.x[Math.min(DURATION + 1, f + 1)] - L.x[Math.max(0, f - 1)]) / 2 * FPS);
});

export type FigureState = {
  who: Who; t: number; x: number; y: number; z: number; facing: number; joints: Joints; lum: number; glow: number; shout: number; seed: number;
};

const STRIDE = 1.15;

export const figureAt = (who: Who, f: number): FigureState => {
  const fi = Math.max(0, Math.min(DURATION + 1, Math.floor(f)));
  const L = LOCO[who];
  const x = L.x[fi];
  const baseFacing = who === 'A' ? 1 : -1;
  const facing = keys(f, TRACKS[who].facing, easeInOut);
  const seed = who === 'A' ? 0.3 : 1.7;
  const ctx: Ctx = {x, facing: Math.sign(facing) || baseFacing};
  let pose = evalTrack(f, TRACKS[who].pose, ctx, seed);
  const sp = clamp(L.speed[fi] / 0.55);
  if (sp > 0.01) pose = blend(pose, walk(L.dist[fi] / STRIDE + seed, 1), sp);
  const joints = fk(pose);
  const y = groundHip(joints);
  let shout = 0;
  for (const s of SHOUTS) if (s.who === who) shout = Math.max(shout, shoutEnv(f, s.f));
  const life = lifeAt(f);
  return {who, t: f, x, y, z: 0, facing, joints, lum: lerp(0.5, 1, life), glow: Math.max(heatAt(f) * 0.9, warmthAt(f) * 1.1), shout, seed};
};

// ------------------------------------------------------------------ camera
export type CamState = {pos: V3; tgt: V3; F: number; roll: number};

const CAM_POS: Key<V3>[] = [
  [0, [-0.42, 1.72, -1.75]],
  [14, [-0.38, 1.66, -1.8]],
  [30, [-0.22, 0.95, -1.65]],
  [T.hookLand, [-0.02, 0.32, -1.55]],
  [52, [-0.02, 0.36, -1.75]],
  [T.wide, [0, 1.3, -6.9]],
  [190, [0.3, 1.42, -6.2]],
  [SEAL_F, [0.05, 1.5, -5.5]],
  [T.turnAway, [-0.3, 1.55, -6.9]],
  [T.turnBack, [0.45, 1.45, -7.1]],
  [T.handsOnWall, [0.1, 1.5, -5.0]],
  [T.touch, [0.0, 1.62, -4.5]],
  [T.collapse + 8, [0.0, 1.6, -4.9]],
  [T.joinDown, [0.0, 1.32, -6.0]],
  [T.hug + 20, [0.0, 1.25, -5.0]],
  [T.end1, [0.0, 1.35, -5.7]],
  [DURATION, [0.0, 1.7, -7.2]],
];
const CAM_TGT: Key<V3>[] = [
  [0, [-0.72, 1.66, 0]],
  [14, [-0.62, 1.6, 0]],
  [30, [-0.3, 0.7, 0]],
  [T.hookLand, [-0.1, 0.12, 0]],
  [52, [-0.1, 0.15, 0]],
  [T.wide, [0, 1.12, 0]],
  [190, [0, 1.2, 0]],
  [SEAL_F, [0, 1.36, 0]],
  [T.turnAway, [0, 1.2, 0]],
  [T.turnBack, [0, 1.15, 0]],
  [T.handsOnWall, [0, 1.38, 0]],
  [T.touch, [0, 1.48, 0]],
  [T.collapse + 8, [0, 1.45, 0]],
  [T.joinDown, [0, 1.1, 0]],
  [T.hug + 20, [0, 1.12, 0]],
  [T.end1, [0, 1.12, 0]],
  [DURATION, [0, 1.15, 0]],
];

export const shakeAt = (f: number) => {
  let s = 0;
  const imp = (f0: number, a: number, d = 5) => { if (f >= f0) s += a * Math.exp(-(f - f0) / d); };
  imp(T.hookLand, 0.045, 4);
  imp(SEAL_F, 0.06, 6);
  imp(T.touch, 0.012, 6);
  imp(T.collapse + 10, 0.03, 10);
  for (const t of THROWN) if (t.shout > 0 && t.land < SEAL_F) imp(t.land, 0.004 + 0.0004 * t.shout, 3);
  return s;
};

export const cameraAt = (f: number): CamState => {
  const pos = keysV3(f, CAM_POS);
  const tgt = keysV3(f, CAM_TGT);
  const sh = shakeAt(f);
  const hand = 0.012; // subtle handheld drift
  const jx = noise1(f * 0.045, 1) * hand + noise1(f * 0.9, 5) * sh;
  const jy = noise1(f * 0.04, 2) * hand * 0.7 + noise1(f * 1.1, 6) * sh;
  const F = keys(f, [[0, 1650], [T.hookLand, 1750], [T.wide, 2250], [SEAL_F, 2300], [T.touch, 2250], [DURATION, 2200]]);
  const roll = keys(f, [[0, -0.05], [30, 0.03], [T.hookLand, 0.0], [T.wide, 0]]) + noise1(f * 0.05, 3) * 0.006 + noise1(f, 9) * sh * 0.5;
  return {pos: [pos[0] + jx, pos[1] + jy, pos[2]], tgt: [tgt[0] + jx * 0.5, tgt[1] + jy * 0.5, tgt[2]], F, roll};
};

export const fadeAt = (f: number) => smooth(invLerp(-4, 4, f)) * (1 - smooth(invLerp(T.fadeOut, DURATION - 2, f)));

// ------------------------------------------------------------------ sound events (exported to audio)
export const soundEvents = () => {
  const ev: {t: string; f: number; [k: string]: unknown}[] = [];
  SHOUTS.forEach((s, i) => ev.push({t: 'shout', f: s.f, who: s.who, i, n: s.n, pan: SIDE[s.who] * 0.5}));
  THROWN.forEach((b) => {
    ev.push({t: 'launch', f: b.launch, pan: SIDE[b.who] * 0.4, i: b.shout});
    ev.push({t: 'land', f: Math.round(b.land), row: b.slot.row, i: b.shout, seal: b === THROWN[THROWN.length - 1], hook: b.shout === 0, pan: b.slot.x * 1.2});
  });
  ev.push({t: 'push', f: T.pushA, pan: 0});
  HOLE_SIM.forEach((h) => h.hits.forEach((f, k) => ev.push({t: 'brickHit', f, k, pan: 0.5, gain: 1})));
  COLLAPSE_SIM.forEach((c) => c.hits.slice(0, 2).forEach((f, k) => ev.push({t: 'brickHit', f, k, pan: clamp(SLOTS[c.id].x * 2, -1, 1), gain: 0.55})));
  COLLAPSE_SIM.forEach((c) => ev.push({t: 'loosen', f: c.start, pan: clamp(SLOTS[c.id].x * 2, -1, 1)}));
  // footsteps
  (['A', 'B'] as Who[]).forEach((w) => {
    const L = LOCO[w];
    let last = -1;
    for (let f = 1; f < DURATION; f++) {
      const step = Math.floor((L.dist[f] / STRIDE) * 2 + 0.5);
      if (L.speed[f] > 0.08 && step !== last && last !== -1) ev.push({t: 'step', f, pan: clamp(L.x[f] * 0.6, -1, 1)});
      if (L.speed[f] > 0.08) last = step; else last = -1;
    }
  });
  return ev;
};
