// Choreography. Everything is a pure function of story time `s`, so rewinds and slow-motion come for free.
import {kf, Key} from '../lib/anim';
import {clamp, easeBack, easeIn, easeInOut, easeOut, hash, lerp, noise1, range, smooth, V3} from '../lib/math';
import {S, Variant} from '../timeline';
import {Pose, Skel, solve, STAND, walkPose} from './rig';

export type Expr = {
  open: number; // eyelid opening
  happy: number; // ^ ^ arcs
  size: number; // eye size (shock > 1)
  brow: number; // -1 sad (inner up) .. +1 angry (inner down)
  browUp: number;
  browAsym: number; // raise one brow (smirk)
  mOpen: number;
  smile: number; // -1 frown .. 1 smile
  smirk: number;
  lookX: number;
  lookY: number;
};
const E0: Expr = {open: 1, happy: 0, size: 1, brow: 0, browUp: 0, browAsym: 0, mOpen: 0, smile: 0.25, smirk: 0, lookX: 0, lookY: 0};
const ex = (o: Partial<Expr>): Expr => ({...E0, ...o});
const P = (o: Partial<Pose>): Pose => ({...STAND, ...o});

export const SPEED = 0.042; // m per frame while strolling (1.26 m/s)
export const STRIDE = 1.44;
export const PUD = 0; // road puddle x
export const ROAD_Z = -1.05; // puddle depth (curb lane)
export const WALK_Z = 0.3;
export const B_X = 0.25;
export const A_X = -0.6;

export type Actor = {
  id: 'A' | 'B';
  x: number; z: number;
  pose: Pose; skel: Skel; expr: Expr;
  walkPh: number; walking: number;
};

const lb = (s: number) => Math.abs(Math.sin(s * 0.55)); // laugh rhythm (2.6 Hz)
export const laughBeat = lb;

// approach + settle: strolling until the splash, then a short weighted stop
const strollX = (stopX: number, s: number) => {
  const d = S.splash + 2 - s;
  if (d <= 0) return stopX;
  return stopX - SPEED * d + SPEED * 2 * Math.max(0, 1 - d / 2) * (1 - d / 2) * 0.5;
};

const talk = (s: number, a: number, b: number, rate = 0.95) => {
  const on = range(a, a + 3, s) * (1 - range(b - 3, b, s));
  return on * Math.max(0, Math.sin(s * rate) * 0.5 + 0.5 * Math.sin(s * rate * 2.3 + 1)) * 0.42;
};

// ------------------------------------------------------------------ shared beats
const shieldPose = P({lean: -0.14, hy: -0.4, hp: 0.25, aL: [2.05, 1.75, 0.3], aR: [0.55, 1.4, 0.15], lL: [0.38, 0.75, 0.05], lR: [-0.12, 0.55, 0.05]});
const laughPose = (s: number, point = 1): Pose => {
  const b = lb(s);
  return P({
    lean: 0.38 + 0.07 * b, hp: -0.25 - 0.12 * b, hy: 0.55,
    aL: [lerp(0.3, 1.38, point), lerp(1.4, 0.06, point), 0.05],
    aR: [0.55, 1.75, 0.08],
    lL: [0.32, 0.5, 0.05], lR: [-0.08, 0.32, 0.05],
  });
};
const laughExpr = (s: number, k = 1): Expr => ex({happy: k, mOpen: (0.55 + 0.35 * lb(s)) * k, smile: 1, brow: -0.2 * k, browUp: 0.3});
const sadExpr = ex({brow: -0.9, smile: -0.7, open: 0.85, browUp: 0.15, lookY: -0.1});
const shockExpr = ex({size: 1.3, open: 1, mOpen: 0.32, smile: -0.1, browUp: 0.8});
const squint = ex({open: 0.04, brow: 0.7, smile: -0.5, mOpen: 0.15});

const blendE = (a: Expr, b: Expr, t: number): Expr => {
  const o = {...a};
  for (const k of Object.keys(a) as (keyof Expr)[]) o[k] = lerp(a[k], b[k], t);
  return o;
};
const blendP = (a: Pose, b: Pose, t: number): Pose => kf(t, [[0, a], [1, b, (x) => x]]);

// ------------------------------------------------------------------ B (the one who gets splashed)
const B_drench = P({lean: -0.02, hy: 0.85, hp: 0.05, aL: [0.2, 0.32, 0.42], aR: [0.12, 0.3, 0.42], lL: [0.06, 0.06, 0.06], lR: [-0.05, 0.06, 0.06]});
const B_lookSelf = P({lean: 0.12, hy: 0.35, hp: 0.6, aL: [0.55, 0.45, 0.42], aR: [0.45, 0.45, 0.42]});
const B_faceA = P({yaw: 3.85, lean: 0.06, hy: -0.2, hp: 0.12, aL: [0.12, 0.3, 0.3], aR: [0.1, 0.3, 0.3]});
const B_slump = P({yaw: 4.0, lean: 0.24, hy: -0.3, hp: 0.6, aL: [0.04, 0.12, 0.08], aR: [0.02, 0.12, 0.08], lL: [0.05, 0.12, 0.04], lR: [-0.04, 0.12, 0.04]});

function actorB(v: Variant, s: number): Actor {
  let x = strollX(B_X, s), z = WALK_Z;
  const ph = ((x - (B_X - 4)) / STRIDE) * Math.PI * 2;
  let walking = 1 - range(S.splash - 1, S.splash + 3, s);
  let pose: Pose;
  let e: Expr;
  // stroll + chatter (B tells a story, glancing back at A)
  const glance = range(6, 12, s) * (1 - range(36, 44, s));
  const gest = range(12, 18, s) * (1 - range(32, 38, s));
  let walk = walkPose(P({hy: lerp(0.5, 1.45, glance)}), ph, 1);
  walk = {...walk, aL: [lerp(walk.aL[0], 0.75 + 0.12 * Math.sin(s * 0.5), gest), lerp(walk.aL[1], 1.25, gest), lerp(walk.aL[2], 0.2, gest)]};
  const talkE = ex({smile: 0.7, mOpen: talk(s, 9, 36), happy: 0.15 * glance, lookX: -0.25 * glance});
  const listenE = ex({smile: 0.55, happy: 0.35 * range(44, 50, s) * (1 - range(58, 64, s))});
  const preE = s < 40 ? talkE : listenE;

  // headlights: squint toward the road, then the hit
  const notice = range(S.splash - 6, S.splash - 1, s);
  const hitK = range(S.hit - 1, S.hit + 2, s);
  const flinch = P({lean: -0.14, hy: 1.0, hp: 0.12, aL: [0.7, 0.9, 0.55], aR: [0.6, 0.9, 0.55], lL: [0.08, 0.18, 0.06], lR: [-0.06, 0.2, 0.06]});
  if (s < S.hit) {
    pose = blendP(walk, {...walk, hy: 1.2}, notice);
    e = blendE(preE, ex({open: 0.55, brow: 0.4, smile: 0, lookX: 0.2}), notice);
  } else if (s < 92) {
    pose = kf(s, [[S.hit, blendP(walk, {...walk, hy: 1.2}, 1)], [S.hit + 3, flinch, easeOut], [83, flinch], [92, B_drench, easeBack]]);
    e = s < 84 ? squint : blendE(squint, shockExpr, range(84, 89, s));
  } else {
    pose = B_drench;
    e = shockExpr;
  }
  walking = Math.min(walking, 1 - hitK * 0);

  if (s >= 92) {
    // looks down at himself, then turns to A
    const keys: Key<Pose>[] = [[92, B_drench], [104, B_drench], [118, B_lookSelf], [124, B_lookSelf], [134, B_faceA, easeBack]];
    if (v === 'fake') {
      keys.push([S.poke + 2, B_faceA], [S.poke + 8, {...B_faceA, hr: 0.16, hy: -0.05, lean: 0.0}, easeOut], [S.look, {...B_faceA, hr: -0.05}], [S.wipe + 4, {...B_faceA, hp: 0.25}], [S.smirk + 6, {...B_faceA, hp: 0.2}], [S.smirk + 30, B_slump], [250, B_slump]);
      keys.push([256, {...B_slump, aL: [1.5, 2.0, 0.2], hp: 0.45}], [262, {...B_slump, aL: [1.55, 2.05, 0.18], hp: 0.5}], [272, B_slump]);
    } else {
      const sur = P({yaw: 3.85, lean: -0.1, hy: -0.35, hp: 0.2, aL: [0.75, 1.0, 0.5], aR: [0.6, 1.0, 0.5], lL: [0.05, 0.15, 0.06], lR: [-0.05, 0.2, 0.06]});
      keys.push([S.decide, B_faceA], [S.decide + 10, {...B_faceA, hp: 0.32, lean: 0.12}], [S.land, {...B_faceA, hp: 0.3, lean: 0.12}], [S.land + 3, sur, easeOut], [S.giggle, {...sur, hp: 0.4}]);
    }
    pose = kf(s, keys);
    if (v === 'real' && s >= S.giggle) {
      const L = {...laughPose(s + 3, 0), yaw: 3.8, hy: -0.3, hp: 0.15};
      const reach = P({yaw: 3.6, lean: 0.72, hy: -0.2, hp: 0.25, aL: [1.05, 0.1, 0.08], aR: [0.35, 0.5, 0.15], lL: [0.35, 0.55, 0.06], lR: [-0.15, 0.4, 0.06]});
      const pull = {...reach, lean: 0.25, aL: [1.2, 0.5, 0.06] as [number, number, number], lL: [0.1, 0.2, 0.06] as [number, number, number], lR: [-0.35, 0.15, 0.06] as [number, number, number]};
      const cheek = P({yaw: 3.7, lean: 0.06, hy: -0.3, hp: 0.05, hr: 0.12, aL: [1.0, 0.35, -0.05], aR: [0.15, 0.3, 0.2]});
      const lc = (ss: number) => ({...cheek, lean: 0.06 + 0.06 * lb(ss), hp: -0.1 * lb(ss)});
      pose = kf(s, [[S.giggle, pose], [S.giggle + 6, L, easeOut], [S.reach - 4, L], [S.reach + 8, reach], [S.reach + 18, reach], [S.up - 2, pull, easeOut], [S.cheek + 6, lc(s), easeOut], [S.together, lc(s)]]);
    }
    // expressions
    if (v === 'fake') {
      e = kf(s, [
        [92, shockExpr], [104, shockExpr], [112, ex({...sadExpr, lookY: -0.6, mOpen: 0.15})], [124, ex({...sadExpr, lookY: -0.5})], [134, sadExpr],
        [S.poke + 4, sadExpr], [S.poke + 7, ex({...sadExpr, open: 0.2, brow: 0.2})], [S.look, sadExpr], [S.smirk + 8, ex({...sadExpr, lookY: -0.3})],
        [S.smirk + 30, ex({...sadExpr, lookY: -0.75, open: 0.6})], [290, ex({...sadExpr, lookY: -0.8, open: 0.55})],
      ]);
    } else {
      e = kf(s, [
        [92, shockExpr], [104, shockExpr], [112, ex({...sadExpr, lookY: -0.6, mOpen: 0.15})], [124, ex({...sadExpr, lookY: -0.5})], [134, sadExpr],
        [S.decide + 10, ex({...sadExpr, lookY: -0.6, open: 0.7})], [S.land, ex({...sadExpr, lookY: -0.6, open: 0.7})],
        [S.land + 3, ex({...shockExpr, size: 1.45, mOpen: 0.55, lookY: -0.5})], [S.giggle, ex({...shockExpr, size: 1.2, mOpen: 0.25, smile: 0.4, lookY: -0.5})],
      ]);
      if (s >= S.giggle) e = blendE(e, laughExpr(s + 3), range(S.giggle, S.giggle + 6, s));
      if (s >= S.reach) e = blendE(laughExpr(s + 3), ex({smile: 0.9, happy: 0.55, mOpen: 0.2, lookY: -0.4, brow: -0.25}), range(S.reach, S.reach + 6, s) * (1 - range(S.cheek, S.cheek + 6, s)));
    }
    walking = 0;
  }

  // REAL — together, arm in arm, walking off
  if (v === 'real' && s >= S.together) {
    const k = range(S.together, S.walk, s);
    x = lerp(B_X, 0.3, k);
    z = WALK_Z;
    const arm = P({yaw: Math.PI * 2, hy: 1.35, lean: 0.04, aR: [0.0, 0.2, 0.1], aL: [0.0, 0.2, 0.1]});
    const ws = Math.max(0, s - S.walk);
    const wx = SPEED * 0.42 * (ws - 6 * (1 - Math.exp(-ws / 6)));
    x += wx;
    const wph = (wx / (STRIDE * 0.62)) * Math.PI * 2;
    const wk = range(S.walk, S.walk + 10, s);
    const walkTog = walkPose(arm, wph, wk, 0.6);
        walkTog.hp = -0.06 * lb(s * 0.8) * range(360, 380, s) * (1 - range(420, 440, s));
    const before = kf(s, [[S.together, pose], [S.together + 6, pose]]);
    pose = blendP(before, walkTog, easeInOut(k));
    walking = wk;
    const chat = laughExpr(s * 0.8, 0.85);
    e = blendE(e, ex({...chat, mOpen: chat.mOpen * 0.6, lookX: -0.4}), k);
  }
  const skel = solve(pose, [x, 0, z]);
  return {id: 'B', x, z, pose, skel, expr: e, walkPh: ph, walking};
}

// ------------------------------------------------------------------ A (the friend)
function actorA(v: Variant, s: number): Actor {
  let x = strollX(A_X, s), z = WALK_Z;
  let ph = ((x - (A_X - 4)) / STRIDE) * Math.PI * 2 + 2.2;
  let walking = 1 - range(S.splash - 1, S.splash + 3, s);
  const gest = range(40, 46, s) * (1 - range(58, 64, s));
  let walk = walkPose(P({hy: 0.35}), ph, 1);
  walk = {...walk, aL: [lerp(walk.aL[0], 0.85 + 0.1 * Math.sin(s * 0.6), gest), lerp(walk.aL[1], 1.1, gest), lerp(walk.aL[2], 0.15, gest)]};
  const chuckle = range(44, 48, s) * (1 - range(60, 65, s));
  const preE = ex({smile: 0.6, mOpen: talk(s, 40, 62, 1.05), happy: 0.25 + 0.6 * chuckle * lb(s * 0.6)});
  const notice = range(S.splash - 6, S.splash - 1, s);
  let pose: Pose = blendP(walk, {...walk, hy: 1.0}, notice);
  let e: Expr = blendE(preE, ex({open: 0.5, brow: 0.35, smile: 0, lookX: 0.2}), notice);
  if (s >= S.splash - 1) {
    const look = P({hy: 0.45, lean: -0.04, aL: [0.2, 0.4, 0.15], aR: [0.1, 0.3, 0.12]});
    pose = kf(s, [[S.splash - 1, pose], [S.splash + 2, shieldPose, easeOut], [92, shieldPose], [102, look, easeBack], [S.laugh, look]]);
    e = s < 92 ? blendE(e, squint, range(S.splash - 1, S.splash + 2, s)) : blendE(squint, shockExpr, range(94, 100, s));
    walking = 0;
  }
  if (s >= S.laugh - 4) {
    const look = P({hy: 0.45, lean: -0.04, aL: [0.2, 0.4, 0.15], aR: [0.1, 0.3, 0.12]});
    const inL = range(S.laugh - 4, S.laugh + 4, s);
    pose = blendP(look, laughPose(s), easeOut(inL));
    e = blendE(shockExpr, laughExpr(s), inL);
  }

  if (v === 'fake' && s >= 146) {
    // the poke, the look, the wipe, the smirk, the exit
    const sx = kf(s, [[148, A_X], [S.poke - 2, -0.27, easeInOut]]);
    x = sx;
    const stepPh = ((sx - A_X) / STRIDE) * Math.PI * 2;
    const stand = P({hy: 0.35, lean: 0.02, aL: [0.25, 0.5, 0.1], aR: [-0.1, 0.9, 0.2]});
    const st = walkPose(stand, stepPh * 1.4, range(148, 152, s) * (1 - range(S.poke - 4, S.poke, s)), 0.6);
    const pokeP = P({hy: 0.32, hp: 0.04, lean: 0.06, aL: [1.82, 0.04, -0.12], aR: [-0.12, 0.95, 0.22]});
    const pushed = {...pokeP, aL: [1.84, 0.02, -0.12] as [number, number, number], lean: 0.1};
    const inspect = P({hy: 0.65, hp: 0.32, lean: 0.0, aL: [0.95, 1.95, 0.25], aR: [-0.12, 0.95, 0.22]});
    const wipeP = (ss: number) => P({hy: 0.3, hp: 0.12, lean: 0.08, aL: [1.42 + 0.09 * Math.sin(ss * 1.25), 0.32, -0.1], aR: [-0.12, 0.95, 0.22]});
    const smirkP = P({yaw: -0.55, hy: 0.55, hp: -0.06, hr: 0.08, lean: -0.05, aL: [-0.22, 1.05, 0.32], aR: [-0.22, 1.05, 0.32], lL: [0.06, 0.06, 0.08], lR: [-0.06, 0.06, 0.08]});
    const laughOut = laughPose(s);
    pose = kf(s, [
      [146, laughOut], [152, st, easeOut], [S.poke - 2, st], [S.poke + 5, pokeP, easeBack], [S.poke + 10, pushed], [S.look - 4, pushed],
      [S.look + 4, inspect, easeOut], [S.wipe - 3, inspect], [S.wipe + 3, wipeP(s), easeOut], [S.smirk - 2, wipeP(s)], [S.smirk + 8, smirkP, easeBack], [S.leave, smirkP],
    ]);
    const smugE = ex({smirk: 1, browAsym: 1, happy: 0.2, open: 0.55, smile: 0.4, lookX: 0.15});
    e = kf(s, [
      [146, laughExpr(s)], [152, ex({smile: 0.8, happy: 0.6, mOpen: 0.25})], [S.poke, ex({smirk: 0.8, smile: 0.5, open: 0.75, browAsym: 0.5})], [S.look, ex({smirk: 0.6, open: 0.75, browAsym: 0.4})],
      [S.look + 4, ex({smile: -0.55, brow: 0.6, open: 0.7, lookY: -0.5, mOpen: 0.12})], [S.wipe, ex({smile: -0.45, brow: 0.5, open: 0.7, lookY: -0.45})],
      [S.wipe + 4, ex({smirk: 0.9, smile: 0.4, open: 0.6, browAsym: 0.7, lookX: 0.3})], [S.smirk + 4, smugE], [S.leave, smugE],
    ]);
    if (s >= S.leave) {
      // turn his back and stroll away, clean
      const t = s - S.leave;
      const turn = range(S.leave, S.leave + 8, s);
      const wx = -SPEED * 1.05 * Math.max(0, t - 4 - 4 * (1 - Math.exp(-Math.max(0, t - 4) / 4)));
      x = -0.27 + wx;
      ph = (-wx / STRIDE) * Math.PI * 2;
      const away = P({yaw: Math.PI, hy: 0.2, lean: -0.04, aL: [-0.22, 1.05, 0.32], aR: [-0.22, 1.05, 0.32]});
      const aw = walkPose(away, ph, range(S.leave + 4, S.leave + 10, s), 0.9);
      aw.aL = away.aL; aw.aR = away.aR;
      pose = blendP(smirkP, aw, easeInOut(turn));
      walking = range(S.leave + 4, S.leave + 10, s);
    }
  }

  if (v === 'real' && s >= S.stop - 8) {
    const look = P({hy: 0.45, lean: 0.0, hp: 0.05, aL: [0.1, 0.25, 0.12], aR: [0.06, 0.25, 0.12]});
    const down = {...look, hp: 0.55, hy: 0.3, lean: 0.1};
    const nod = {...look, hp: -0.04, hy: 0.5};
    const back1 = P({hy: 0.4, lean: 0.25, aL: [-0.9, 0.35, 0.12], aR: [-0.8, 0.35, 0.12], lL: [0.55, 1.1, 0.06], lR: [-0.25, 0.9, 0.06]});
    const run = P({hy: 0.35, lean: 0.32, aL: [0.9, 0.9, 0.12], aR: [-0.9, 0.6, 0.12], lL: [0.7, 0.9, 0.06], lR: [-0.5, 0.5, 0.06]});
    const take = P({hy: 0.6, lean: -0.1, hp: -0.25, aL: [2.75, 0.15, 0.45], aR: [2.7, 0.15, 0.45], lL: [0.35, 0.2, 0.08], lR: [-0.2, 0.25, 0.08]});
    const fly = P({pitch: -0.9, hy: 0.9, hp: -0.15, lean: -0.05, aL: [2.6, 0.1, 0.6], aR: [2.55, 0.1, 0.6], lL: [0.85, 0.35, 0.15], lR: [0.6, 0.25, 0.15]});
    const flat = (ss: number) => P({
      pitch: -1.57, hy: 1.15, hp: -0.25, lean: 0.0,
      aL: [2.35 + 0.55 * Math.sin(ss * 0.5), 0.35, 0.5 + 0.3 * Math.sin(ss * 0.5)],
      aR: [2.2 + 0.5 * Math.sin(ss * 0.5 + 0.8), 0.3, 0.5],
      lL: [0.55 + 0.35 * Math.sin(ss * 0.62 + 1), 0.55 + 0.4 * Math.max(0, Math.sin(ss * 0.62 + 1)), 0.2],
      lR: [0.4 + 0.35 * Math.sin(ss * 0.62 + 3.6), 0.5 + 0.4 * Math.max(0, Math.sin(ss * 0.62 + 3.6)), 0.2],
    });
    const reachUp = P({pitch: -1.2, hy: 1.0, hp: -0.2, lean: 0.1, aL: [1.3, 0.1, 0.05], aR: [1.2, 0.8, 0.4], lL: [0.9, 1.2, 0.15], lR: [0.5, 0.6, 0.15]});
    const sit = P({pitch: -0.25, hy: 0.6, hp: -0.1, lean: 0.25, aL: [1.6, 0.25, 0.05], aR: [0.4, 0.6, 0.2], lL: [1.2, 1.7, 0.1], lR: [0.9, 1.4, 0.1]});
    const cheek = (ss: number) => P({hy: 0.3, hp: -0.06 * lb(ss), lean: 0.05 + 0.06 * lb(ss), hr: -0.06, aL: [1.9, 0.95, -0.12], aR: [0.12, 0.3, 0.12]});
    pose = kf(s, [
      [S.stop - 8, pose], [S.stop + 6, look, easeOut], [S.decide, look], [S.decide + 8, down], [S.decide + 15, down], [S.windup - 4, nod, easeBack],
      [S.windup + 10, back1, easeInOut], [S.windup + 14, back1], [S.takeoff - 3, run, easeIn], [S.takeoff, take, easeOut], [S.takeoff + 12, fly, easeInOut], [S.land, flat(s), easeIn],
      [S.reach + 6, flat(s)], [S.reach + 14, reachUp], [S.reach + 18, reachUp], [S.up - 10, sit, easeInOut], [S.up, cheek(s), easeOut], [S.together, cheek(s)],
    ]);
    // root path
    x = kf(s, [[S.windup, A_X], [S.windup + 12, -1.0], [S.takeoff, -0.82, easeIn], [S.land, -0.05, (t) => t], [S.reach + 14, -0.05], [S.up - 10, -0.25], [S.up, -0.32]]);
    z = kf(s, [[S.takeoff, WALK_Z], [S.land, 0.02], [S.reach + 14, 0.02], [S.up, WALK_Z - 0.04]]);
    const steps = range(S.windup, S.windup + 12, s) * (1 - range(S.windup + 10, S.windup + 14, s)) + range(S.takeoff - 9, S.takeoff - 5, s) * (1 - range(S.takeoff - 2, S.takeoff, s));
    pose = walkPose(pose, ((x - A_X) / STRIDE) * Math.PI * 2 * 1.3, steps * 0.6, 0.8);
    // flight (ballistic) + landing squash
    if (s > S.takeoff && s < S.land) {
      const t = (s - S.takeoff) / (S.land - S.takeoff);
      pose.air = 4 * 0.62 * t * (1 - t);
    }
    if (s >= S.land && s < S.land + 8) pose.air = 0.05 * Math.sin(((s - S.land) / 8) * Math.PI) * Math.exp(-(s - S.land) / 4);

    e = kf(s, [
      [S.stop - 8, laughExpr(s)], [S.stop + 4, ex({happy: 0.2, smile: 0.2, mOpen: 0.1, brow: -0.3})], [S.stop + 12, ex({brow: -0.7, smile: -0.1, open: 1, browUp: 0.2})],
      [S.decide + 6, ex({brow: -0.5, lookY: -0.7, open: 0.8})], [S.decide + 15, ex({brow: -0.3, lookY: -0.6, open: 0.8, smile: 0.1})],
      [S.windup - 4, ex({smile: 0.75, brow: 0.35, browUp: 0.3, open: 0.85, smirk: 0})], [S.takeoff, ex({smile: 0.8, brow: 0.5, open: 0.9, mOpen: 0.3})],
      [S.takeoff + 6, ex({happy: 1, smile: 1, mOpen: 0.7})], [S.land - 1, ex({happy: 1, smile: 1, mOpen: 0.75})], [S.land + 2, ex({open: 0.05, smile: 0.6, mOpen: 0.45, brow: 0.3})],
    ]);
    if (s >= S.land + 4) e = blendE(e, laughExpr(s), range(S.land + 4, S.land + 10, s));
    if (s >= S.reach + 4) e = blendE(laughExpr(s), ex({smile: 0.95, happy: 0.6, mOpen: 0.25, lookX: 0.2}), range(S.reach + 4, S.reach + 10, s));
    if (s >= S.up - 2) e = blendE(e, laughExpr(s, 0.9), range(S.up - 2, S.up + 6, s));
    walking = 0;
  }

  if (v === 'real' && s >= S.together) {
    const k = range(S.together, S.walk, s);
    const x0 = x, z0 = z;
    x = lerp(x0, -0.3, k);
    z = lerp(z0, WALK_Z, k);
    const ws = Math.max(0, s - S.walk);
    const wx = SPEED * 0.42 * (ws - 6 * (1 - Math.exp(-ws / 6)));
    x += wx;
    const wph = (wx / (STRIDE * 0.62)) * Math.PI * 2 + Math.PI;
    const arm = P({yaw: 0, hy: 0.6, lean: 0.08, aL: [1.32, 0.28, 0.02], aR: [0.0, 0.2, 0.1]});
    const wk = range(S.walk, S.walk + 10, s);
    const wt = walkPose(arm, wph, wk, 0.6);
    wt.aL = arm.aL;
    wt.hp = -0.08 * lb(s * 0.8) * range(360, 380, s) * (1 - range(420, 440, s));
    pose = blendP(pose, wt, easeInOut(k));
    walking = wk;
    ph = wph;
    e = blendE(e, ex({...laughExpr(s * 0.8, 0.85), mOpen: laughExpr(s * 0.8, 0.85).mOpen * 0.6, lookX: 0.3}), k);
  }
  const skel = solve(pose, [x, 0, z]);
  return {id: 'A', x, z, pose, skel, expr: e, walkPh: ph, walking};
}

export const actorsAt = (v: Variant, s: number): [Actor, Actor] => [actorA(v, s), actorB(v, s)];

// ------------------------------------------------------------------ car
export const CAR_V = 0.62; // m per frame (~67 km/h)
export const carFrontWheelX = (s: number) => PUD + (s - S.splash) * CAR_V;

// ------------------------------------------------------------------ mud
export type Splat = {part: string; t: number; off: number; r: number; t0: number; tone: number; seed: number; drip: number};

const mkSplats = (seed: number, n: number, parts: [string, number][], t0: number, t1: number, rMin: number, rMax: number, bias?: (part: string, t: number, off: number) => number, order = true): Splat[] => {
  const out: Splat[] = [];
  const total = parts.reduce((a, p) => a + p[1], 0);
  let i = 0, guard = 0;
  while (out.length < n && guard++ < n * 20) {
    i++;
    const h = (k: number) => hash(seed * 1000 + i * 7.13 + k);
    let pick = h(1) * total, part = parts[0][0];
    for (const [p, w] of parts) {
      if ((pick -= w) <= 0) { part = p; break; }
    }
    const t = h(2), off = h(3) * 2 - 1;
    if (bias && h(4) > bias(part, t, off)) continue;
    // mud wave rises: lower body is hit first
    const heightOrder = part.startsWith('leg') ? 1 - t * 0.5 : part === 'torso' ? 0.45 : part === 'head' ? 0.05 : 0.35;
    const tt = order ? lerp(t0, t1, clamp(1 - heightOrder + (h(5) - 0.5) * 0.35)) : lerp(t0, t1, h(5));
    out.push({part, t, off, r: lerp(rMin, rMax, Math.pow(h(6), 1.6)), t0: tt, tone: h(7), seed: h(8) * 100, drip: h(9) < 0.3 ? h(10) : 0});
  }
  return out;
};

const BODY: [string, number][] = [['legL', 5], ['legR', 5], ['armL', 3.5], ['armR', 3.5], ['torso', 5], ['head', 4]];
const B_SPLATS = mkSplats(11, 170, BODY, S.hit - 0.5, S.hit + 4.5, 0.03, 0.1);
const B_CLEAN = mkSplats(12, 34, BODY, S.hit + 2, S.hit + 6, 0.012, 0.03); // pale gaps where the mud runs thin
const A_FLOP = mkSplats(21, 60, [['torso', 6], ['legL', 4], ['legR', 4], ['armL', 3], ['armR', 3], ['head', 2.5]], S.land - 0.5, S.land + 3, 0.035, 0.11, undefined, false);
const A_ROLL = mkSplats(22, 55, [['torso', 4], ['legL', 4], ['legR', 4], ['armL', 4], ['armR', 4], ['head', 2]], S.land + 4, S.reach + 6, 0.03, 0.085, undefined, false);
const A_HANDS = mkSplats(23, 8, [['armL', 1], ['armR', 1]], S.up - 8, S.up - 2, 0.03, 0.06, (_p, t) => (t > 0.8 ? 1 : 0), false);
const B_EXTRA = mkSplats(24, 14, [['legL', 1], ['legR', 1]], S.land + 1, S.land + 3, 0.02, 0.05, (_p, t) => (t > 0.6 ? 1 : 0), false);

export type MudState = {wash: number; splats: {sp: Splat; k: number}[]; clean: {sp: Splat; k: number}[]; gloss: number};

const grow = (s: number, t0: number) => (s < t0 ? 0 : easeOut(clamp((s - t0) / 1.6)));

export const mudOf = (who: 'A' | 'B', v: Variant, s: number): MudState => {
  if (who === 'B') {
    const wash = range(S.hit + 0.5, S.hit + 5, s);
    const list = [...B_SPLATS, ...(v === 'real' ? B_EXTRA : [])];
    return {
      wash,
      splats: list.map((sp) => ({sp, k: grow(s, sp.t0)})).filter((x) => x.k > 0),
      clean: B_CLEAN.map((sp) => ({sp, k: grow(s, sp.t0)})).filter((x) => x.k > 0),
      gloss: 1 - 0.45 * range(110, 300, s),
    };
  }
  if (v === 'fake') {
    // a single fingertip of mud — wiped off on his friend
    const on = range(S.poke + 6, S.poke + 8, s) * (1 - range(S.wipe + 4, S.wipe + 12, s));
    const sp: Splat = {part: 'armL', t: 0.98, off: 0, r: 0.034, t0: 0, tone: 0.3, seed: 3, drip: 0};
    return {wash: 0, splats: on > 0 ? [{sp, k: on}] : [], clean: [], gloss: 1};
  }
  const list = [...A_FLOP, ...A_ROLL, ...A_HANDS];
  return {wash: 0.0, splats: list.map((sp) => ({sp, k: grow(s, sp.t0)})).filter((x) => x.k > 0), clean: [], gloss: 1};
};

// ------------------------------------------------------------------ particles (splashes, drips)
export type Particle = {p: V3; q: V3; r: number; tone: number; a: number};
type Drop = {o: V3; v: V3; t0: number; t1: number; r: number; tone: number};
const G = 9.8 / (30 * 30); // m per frame^2

const pos = (d: Drop, t: number): V3 => [d.o[0] + d.v[0] * t, d.o[1] + d.v[1] * t - 0.5 * G * t * t, d.o[2] + d.v[2] * t];

const buildCarSplash = (): Drop[] => {
  const out: Drop[] = [];
  for (let i = 0; i < 720; i++) {
    const h = (k: number) => hash(500 + i * 3.17 + k);
    const t0 = S.splash - 0.5 + h(1) * 4.5;
    const o: V3 = [carFrontWheelX(t0) - 0.25 + h(2) * 0.5, 0.0, ROAD_Z + (h(3) - 0.5) * 0.4];
    const big = h(4) < 0.12;
    const v: V3 = [(0.6 + h(5) * 4.2) / 30, (2.0 + h(6) * 6.8) / 30, (4.2 + h(7) * 4.2) / 30];
    // when does it reach the walkers' plane, and does it hit B?
    const tz = (WALK_Z - 0.05 - o[2]) / v[2];
    let t1 = 60;
    const atB = pos({o, v, t0, t1, r: 0, tone: 0}, tz);
    if (atB[0] > B_X - 0.3 && atB[0] < B_X + 0.32 && atB[1] > 0 && atB[1] < 1.85) t1 = tz;
    else {
      // until it lands
      const a = 0.5 * G, b = -v[1], c = -o[1];
      const tg = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      const tw = (2.6 - o[2]) / v[2];
      t1 = Math.min(tg, tw);
    }
    out.push({o, v, t0, t1, r: big ? 0.028 + h(8) * 0.03 : 0.007 + h(8) * 0.016, tone: h(9)});
  }
  return out;
};
const buildFlopSplash = (): Drop[] => {
  const out: Drop[] = [];
  for (let i = 0; i < 380; i++) {
    const h = (k: number) => hash(900 + i * 2.71 + k);
    const t0 = S.land - 0.3 + h(1) * 2.2;
    const along = (h(2) - 0.5) * 1.6;
    const o: V3 = [-0.05 + along, 0.05, 0.02 + (h(3) - 0.5) * 0.3];
    const ang = h(4) * Math.PI * 2;
    const sp = 0.6 + h(5) * 2.4;
    const v: V3 = [(Math.cos(ang) * sp + along * 0.8) / 30, (1.6 + h(6) * 3.6) / 30, (Math.sin(ang) * sp * 0.7) / 30];
    const a = 0.5 * G, b = -v[1], c = -o[1];
    const tg = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    out.push({o, v, t0, t1: tg, r: h(7) < 0.1 ? 0.025 + h(8) * 0.025 : 0.006 + h(8) * 0.014, tone: h(9)});
  }
  return out;
};
const CAR_SPLASH = buildCarSplash();
const FLOP_SPLASH = buildFlopSplash();

const drips = (s: number, sk: Skel, t0: number, t1: number, seed: number, rate: number): Particle[] => {
  const out: Particle[] = [];
  const pts: V3[] = [sk.haL, sk.haR, sk.elL, sk.elR, sk.knL, sk.knR, [sk.hip[0], sk.hip[1] - 0.05, sk.hip[2]], [sk.head[0], sk.head[1] - 0.15, sk.head[2]]];
  // each drip lives ~14 frames, born on a deterministic schedule
  const period = 1 / rate;
  const first = Math.floor((s - 16 - t0) / period);
  for (let n = Math.max(0, first); n <= Math.floor((s - t0) / period); n++) {
    const born = t0 + n * period;
    if (born > t1 || born > s) continue;
    const h = (k: number) => hash(seed + n * 1.37 + k);
    const src = pts[Math.floor(h(1) * pts.length)];
    const age = s - born;
    const hang = 3 + h(2) * 5;
    const fall = Math.max(0, age - hang);
    const y = src[1] - 0.02 - 0.5 * G * fall * fall;
    if (y < 0) continue;
    const yq = src[1] - 0.02 - 0.5 * G * Math.max(0, fall - 0.6) ** 2;
    out.push({p: [src[0] + (h(3) - 0.5) * 0.04, y, src[2] - 0.04], q: [src[0] + (h(3) - 0.5) * 0.04, yq, src[2] - 0.04], r: 0.007 + h(4) * 0.007, tone: h(5), a: Math.min(1, age / 2)});
  }
  return out;
};

export const particlesAt = (v: Variant, s: number, A: Actor, B: Actor, shutter = 0.5): Particle[] => {
  const out: Particle[] = [];
  const emit = (list: Drop[]) => {
    for (const d of list) {
      const t = s - d.t0;
      if (t < 0 || t > d.t1) continue;
      const p = pos(d, t);
      const q = pos(d, Math.max(0, t - Math.min(1, Math.abs(shutter))));
      out.push({p, q, r: d.r, tone: d.tone, a: 1});
    }
  };
  emit(CAR_SPLASH);
  if (v === 'real') emit(FLOP_SPLASH);
  out.push(...drips(s, B.skel, S.hit + 6, 520, 77, v === 'fake' ? 0.55 : 0.4));
  if (v === 'real') out.push(...drips(s, A.skel, S.land + 10, 520, 99, 0.25));
  return out;
};

// ground stains: road puddle stays; sidewalk pool spreads under B; A's flop widens it
export const poolAt = (v: Variant, s: number) => {
  const b = range(S.hit, S.hit + 14, s) * (0.62 + 0.12 * range(90, 260, s));
  const a = v === 'real' ? range(S.land, S.land + 8, s) : 0;
  return {cx: lerp(B_X, -0.1, a * 0.6), rx: b + a * 0.55, rz: b * 0.42 + a * 0.12};
};

// footprints left by the two muddy friends walking off together
export const footprintsAt = (v: Variant, s: number) => {
  if (v !== 'real' || s < S.walk) return [] as {x: number; z: number; a: number; side: number}[];
  const out: {x: number; z: number; a: number; side: number}[] = [];
  const ws = s - S.walk;
  const wx = SPEED * 0.42 * (ws - 6 * (1 - Math.exp(-ws / 6)));
  const step = STRIDE / 2 * 0.85;
  for (let i = 0; i * step < wx - 0.15; i++) {
    const age = (wx - i * step) / (SPEED * 0.82);
    const a = clamp(1 - age / 260) * 0.9;
    for (const [who, z0, off] of [[0, 0.56, 0], [1, 0.0, 0.3]] as const) {
      const side = (i + who) % 2 ? 1 : -1;
      out.push({x: -0.02 + i * step + 0.25 + off * step, z: z0 + side * 0.085, a, side});
    }
  }
  return out;
};

export const smoothNoise = noise1;
export {easeOut, smooth};
