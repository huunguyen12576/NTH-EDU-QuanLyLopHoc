// Camera, lighting mood and grading — keyed on OUTPUT frames (the film's clock).
import {kf, Key} from '../lib/anim';
import {easeInOut, easeOut, noise1, range} from '../lib/math';
import {OUT, S} from '../timeline';
import {Cam} from './camera';

type C = {x: number; y: number; z: number; shift: number};
const c = (x: number, y: number, z: number, shift = 0): C => ({x, y, z, shift});

const f0 = OUT.hookEnd; // act 1 starts
const f2 = OUT.act2;
const o = (s: number) => f0 + s; // act-1 story frame -> output

const WIDE_START = c(-3.25, 1.25, -5.5, -110);
const keys: Key<C>[] = [
  // HOOK — low, tight on B as the mud wall rises
  [0, c(0.5, 1.35, -4.4, -70)],
  [44, c(0.42, 1.42, -3.9, -70), (t) => t],
  [60, WIDE_START, easeInOut],
  // ACT 1 — FAKE
  [o(S.splash), c(-0.25, 1.25, -5.4, -110), (t) => t],
  [o(100), c(-0.2, 1.28, -5.2, -110)],
  [o(140), c(-0.18, 1.38, -4.6, -100)],
  [o(S.poke + 6), c(-0.08, 1.56, -3.35, -40)],
  [o(S.look + 2), c(-0.16, 1.58, -3.1, -40)],
  [o(S.wipe + 6), c(-0.12, 1.5, -3.4, -40)],
  [o(S.smirk + 10), c(-0.34, 1.62, -2.55, -10)],
  [o(S.leave + 4), c(-0.3, 1.6, -2.65, -10)],
  [o(S.leave + 22), c(0.05, 1.35, -4.8, -90)],
  [OUT.rw1, c(0.22, 1.4, -5.3, -100), (t) => t],
  // REWIND
  [f2, WIDE_START],
  // ACT 2 — REAL
  [f2 + S.splash, c(-0.25, 1.25, -5.4, -110), (t) => t],
  [f2 + 100, c(-0.2, 1.28, -5.2, -110)],
  [f2 + 134, c(-0.25, 1.4, -4.6, -100)],
  [f2 + S.stop + 10, c(-0.42, 1.6, -3.3, -30)],
  [f2 + S.decide + 18, c(-0.5, 1.6, -3.0, -20)],
  [f2 + S.windup + 6, c(-0.45, 1.3, -5.2, -40)],
  [OUT.slowA, c(-0.45, 1.25, -5.4, -50)],
  [OUT.slowB, c(-0.25, 1.0, -4.6, -40), (t) => t],
  [OUT.slowB + 30, c(-0.15, 1.05, -4.3, -40)],
  [OUT.slowB + 52, c(-0.05, 1.3, -4.8, -40)],
  [OUT.slowB + 70, c(-0.02, 1.55, -3.45, -40)],
  [OUT.end, c(0.0, 1.6, -3.3, -40)],
  // END — crane up and back as they walk on together
  [OUT.end + 40, c(0.5, 1.6, -5.0, -100)],
  [OUT.end + 220, c(2.75, 2.3, -8.6, -330), (t) => t],
];

export const camAt = (f: number): Cam => {
  const k = kf(f, keys);
  // handheld: slow breathing drift + impact shakes
  const amp = 0.012;
  let hx = noise1(f * 0.035, 1) * amp + noise1(f * 0.11, 2) * amp * 0.3;
  let hy = noise1(f * 0.03, 3) * amp + noise1(f * 0.12, 4) * amp * 0.3;
  let roll = noise1(f * 0.025, 5) * 0.004;
  const shake = (at: number, str: number, len: number) => {
    const t = f - at;
    if (t < 0 || t > len) return;
    const d = Math.exp(-t / (len / 4)) * str;
    hx += Math.sin(t * 2.7) * d;
    hy += Math.cos(t * 3.4) * d * 0.8;
    roll += Math.sin(t * 2.1) * d * 0.25;
  };
  shake(o(S.splash) + 1, 0.05, 24);
  shake(f2 + S.splash + 1, 0.05, 24);
  shake(OUT.slowB - 10, 0.06, 40);
  // pull focal length a touch during the hook for a compressed, telephoto feel
  const F = 2520 * (f < 60 ? 1.08 : 1) * (1 + 0.04 * range(OUT.end, OUT.end + 190, f) * 0);
  return {x: k.x + hx, y: k.y + hy, z: k.z, F, roll, shift: k.shift};
};

/** Lighting mood: warmth (−1 cold … +1 warm), exposure. */
export const moodAt = (f: number) => {
  const cold = range(o(S.leave - 10), o(S.leave + 30), f) * (1 - range(OUT.rw1, OUT.rw1 + 10, f));
  const warm = range(OUT.slowB - 8, OUT.slowB + 30, f) * 0.6 + range(OUT.end - 20, OUT.end + 60, f) * 0.4;
  const exposure = 1 - 0.1 * cold + 0.06 * warm;
  // the lamp — hero light — swells when the friend jumps in
  const lamp = 1 - 0.15 * cold + 0.25 * warm;
  return {cold, warm: warm * (1 - cold), exposure, lamp};
};

/** Focus distance (metres from camera) and aperture blur strength. */
export const focusAt = (f: number, cam: Cam) => {
  const subjectZ = f < 60 ? 0.3 : 0.3;
  return {focus: subjectZ - cam.z, k: 3.2 * (1 + 1.6 * easeOut(range(4.6, 2.6, -cam.z)))};
};
