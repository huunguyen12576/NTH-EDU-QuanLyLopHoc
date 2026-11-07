// Pure story logic: what every character / prop / counter is doing at frame f.
// Used by the renderer AND by scripts/export-events.ts, so sound is frame-exact.
import {PLATE_DAYS, T} from '../timeline';
import {clamp, easeIn, easeInOut, easeOut, easeOutBack, hash, invLerp, Key, keys, keysV3, lerp, noise1, smooth, spring01, V3} from './math';

// ------------------------------------------------------------------ calendar
export const dayAt = (f: number) => {
  if (f < T.yearStart) return 1;
  if (f < T.yearEnd) return 1 + Math.floor(364 * Math.pow((f - T.yearStart) / (T.yearEnd - T.yearStart), 2.15) + 1e-6);
  return 365;
};

/** Day of the (calendar) year shown on the flip calendar. */
export const calDoy = (f: number) => (f < T.newYear ? dayAt(f) : f < T.d367 ? 1 : 2);

/** Disciplined streak counter. */
export const dCount = (f: number) => (f < T.newYear ? dayAt(f) : f < T.d367 ? 366 : 367);

const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const dateOf = (doy: number) => {
  let d = doy;
  for (let m = 0; m < 12; m++) {
    if (d <= MDAYS[m]) return {m: m + 1, d};
    d -= MDAYS[m];
  }
  return {m: 12, d: 31};
};

/** Last frame (<= f) at which the calendar page changed. */
export const lastFlip = (f: number) => {
  const cur = calDoy(f);
  for (let k = 0; k < 40; k++) if (calDoy(f - k - 1) !== cur) return f - k;
  return -999;
};

// ------------------------------------------------------------------ reps
export type Rep = {s: number; P: number; who: 'd' | 'm'; fail?: boolean};

const dPeriod = (f: number) => (f < T.yearStart ? 40 : f < T.yearEnd ? lerp(40, 15, smooth(invLerp(T.yearStart, T.yearStart + 170, f))) : 40);

export const D_REPS: Rep[] = (() => {
  const out: Rep[] = [];
  let s = 10;
  while (true) {
    const P = Math.round(dPeriod(s));
    if (s + P > T.liftStart - 2) break;
    out.push({s, P, who: 'd'});
    s += P;
  }
  s = T.liftEnd + 30;
  while (s + 40 <= T.endDim + 20) {
    out.push({s, P: 40, who: 'd'});
    s += 40;
  }
  out.push({s: T.finalRep, P: 44, who: 'd'});
  return out;
})();

/** Press curve of one rep, t in [0,1]. */
const repPress = (t: number) => {
  if (t < 0.12) return 0;
  if (t < 0.42) return easeInOut((t - 0.12) / 0.3);
  if (t < 0.52) return 1;
  if (t < 0.9) return 1 - easeInOut((t - 0.52) / 0.38);
  return 0;
};
const repDip = (t: number) => (t < 0.16 ? Math.sin((t / 0.16) * Math.PI) : t > 0.88 && t < 1 ? 0.35 * Math.sin(((t - 0.88) / 0.12) * Math.PI) : 0);
/** Frantic rep: explosive up, sloppy down. */
const franticPress = (t: number) => (t < 0.08 ? 0 : t < 0.36 ? easeOut((t - 0.08) / 0.28) : t < 0.44 ? 1 : t < 0.86 ? 1 - easeIn((t - 0.44) / 0.42) : 0);
/** A failed rep: grinds to ~half, then collapses. */
const failPress = (t: number) => (t < 0.55 ? 0.55 * Math.sin((t / 0.55) * Math.PI * 0.5) * (1 + 0.05 * Math.sin(t * 90)) : 0.55 * (1 - easeIn((t - 0.55) / 0.45)));

export const repTop = (r: Rep) => r.s + Math.round(r.P * (r.who === 'd' ? 0.42 : 0.36));
export const repBottom = (r: Rep) => r.s + Math.round(r.P * (r.who === 'd' ? 0.9 : 0.86));

// ------------------------------------------------------------------ disciplined
export const growth = (f: number) => (f < T.newYear ? (dayAt(f) - 1) / 364 : 1);

export const plateCount = (f: number) => {
  const d = f < T.newYear ? dayAt(f) : 999;
  return 1 + PLATE_DAYS.filter((x) => d >= x).length;
};
export const PLATE_FRAMES = PLATE_DAYS.map((d) => {
  for (let f = T.yearStart; f < T.yearEnd; f++) if (dayAt(f) >= d) return f;
  return T.yearEnd;
});

export type FigState = {
  press: number; // 0 bar at shoulders, 1 locked out overhead
  dip: number; // knee dip 0..1
  sit: number; // 0 standing, 1 seated
  slump: number; // 0 upright, 1 head hanging
  hold: number; // 1 hands on bar, 0 hands resting (phone)
  glow: number; // motivation fire 0..1
  bright: number; // body brightness 0..1
  scale: number;
  strain: number; // tremble
  look: number; // head lifted toward phone flash
};

export const dState = (f: number): FigState => {
  const g = growth(f);
  let press = 0;
  let dip = 0;
  let strain = 0;
  if (f >= T.liftStart && f < T.liftEnd) {
    // the Dec 31 lift: slow, deliberate, heavy
    if (f < T.liftDrive) dip = easeInOut(invLerp(T.liftStart, T.liftStart + 18, f)) * 1.6;
    else dip = 1.6 * (1 - easeOut(invLerp(T.liftDrive, T.liftDrive + 6, f)));
    press = keys(f, [[T.liftDrive, 0], [T.lockout, 1], [T.liftDown, 1], [T.liftEnd, 0]], (t) => easeInOut(t));
    strain = keys(f, [[T.liftDrive - 6, 0], [T.liftDrive, 1], [T.lockout, 0.8], [T.lockout + 8, 0]]);
  } else {
    for (const r of D_REPS) {
      if (f >= r.s && f < r.s + r.P) {
        const t = (f - r.s) / r.P;
        press = repPress(t);
        dip = repDip(t);
      }
    }
  }
  const lockBloom = keys(f, [[T.lockout - 2, 0], [T.lockout, 1], [T.lockout + 50, 0.25]], easeOut);
  return {
    press,
    dip,
    sit: 0,
    slump: 0,
    hold: 1,
    glow: 0,
    bright: lerp(0.52, 1, smooth(g)) + 0.15 * lockBloom,
    scale: 1 + 0.12 * smooth(g),
    strain,
    look: 0,
  };
};

// ------------------------------------------------------------------ motivated
export type Episode = {on: number; frantic: number; rack: number; seat: number; jump: boolean; P: number};

export const EPISODES: Episode[] = [
  {on: 0, frantic: T.mFadeStart, rack: 96, seat: 118, jump: false, P: 12},
  ...T.bursts.map((b) => ({on: b.on, frantic: b.on + b.len, rack: b.on + b.len + 18, seat: b.on + b.len + 34, jump: true, P: 11})),
  {on: T.mJump, frantic: T.mJump + T.mJumpLen, rack: T.mJump + T.mJumpLen + 18, seat: T.mJump + T.mJumpLen + 34, jump: true, P: 11},
];

export const M_REPS: Rep[] = (() => {
  const out: Rep[] = [];
  for (const e of EPISODES) {
    let s = e.jump ? e.on + 8 : T.lightsOn;
    let P = e.P;
    while (s + P <= e.frantic) {
      out.push({s, P, who: 'm'});
      s += P;
      if (!e.jump && s > T.mFadeStart - 30) P += 4; // fatigue on day one
    }
    out.push({s: Math.max(s, e.frantic), P: e.rack - Math.max(s, e.frantic), who: 'm', fail: true});
  }
  return out;
})();

const episodeAt = (f: number) => EPISODES.find((e) => f >= e.on - 16 && f < e.seat + 30);

export const mState = (f: number): FigState => {
  const base = {press: 0, dip: 0, sit: 1, slump: 1, hold: 0, glow: 0, bright: 0.5, scale: 1, strain: 0, look: 0};
  // brightness slowly drains with every relapse
  const relapses = EPISODES.filter((e) => f > e.seat).length;
  base.bright = Math.max(0.36, 0.56 - relapses * 0.035);
  const e = episodeAt(f);
  if (!e) return base;
  const s = {...base};

  // anticipation: phone flashes, head lifts
  if (e.jump) s.look = keys(f, [[e.on - 14, 0], [e.on - 2, 1], [e.on + 6, 0]]);

  // sit / stand
  if (e.jump) {
    if (f < e.on) s.sit = 1;
    else if (f < e.on + 9) s.sit = 1 - easeOutBack(invLerp(e.on, e.on + 9, f), 2.2);
    else s.sit = 0;
  } else s.sit = 0;
  if (f >= e.rack + 2) {
    const t = invLerp(e.rack + 2, e.seat, f);
    // gravity drop onto the bench, then a heavy settle
    s.sit = t < 0.7 ? easeIn(t / 0.7) : 1 - 0.06 * Math.sin(((t - 0.7) / 0.3) * Math.PI) * (1 - (t - 0.7) / 0.3);
    if (f >= e.seat) s.sit = 1;
  }
  // slump
  s.slump = f < e.on ? 1 - 0.75 * s.look : f < e.rack ? 0 : smooth(invLerp(e.rack, e.seat + 14, f));
  // hands
  s.hold = e.jump ? smooth(invLerp(e.on + 1, e.on + 7, f)) : 1;
  if (f >= e.rack) s.hold = 1 - smooth(invLerp(e.rack, e.rack + 8, f));

  // reps
  for (const r of M_REPS) {
    if (f >= r.s && f < r.s + r.P && f >= e.on - 1 && f <= e.rack) {
      const t = (f - r.s) / r.P;
      s.press = r.fail ? failPress(t) : franticPress(t);
      s.dip = r.fail ? 0.4 : t < 0.1 ? Math.sin((t / 0.1) * Math.PI) * 0.8 : 0;
      s.strain = r.fail ? 1 : 0.25;
    }
  }

  // motivation fire: flare, flicker, sputter out
  const flick = 0.85 + 0.15 * noise1(f * 0.9, e.on);
  const on = e.jump ? keys(f, [[e.on - 4, 0], [e.on, 1]]) : f >= T.lightsOn ? 1 : 0;
  const decayStart = e.jump ? e.frantic - 6 : T.mFadeStart - 30;
  const off = 1 - smooth(invLerp(decayStart, e.rack + 4, f));
  const sputter = f > decayStart ? 0.6 + 0.4 * Math.max(0, Math.sin(f * 2.3) * Math.sin(f * 0.71)) : 1;
  s.glow = clamp(on * off * flick * sputter);
  s.bright = lerp(s.bright, 1, clamp(s.glow * 1.2));
  return s;
};

/** Motivated streak counter + whether it is flashing red (reset). */
export const mCount = (f: number): {n: number; red: number} => {
  if (f >= T.newYear) return {n: 1, red: Math.max(redPulse(f, T.newYear), redPulse(f, EPISODES[EPISODES.length - 1].rack))};
  for (const e of EPISODES.slice(1, 1 + T.bursts.length)) {
    if (f >= e.on && f < e.rack) return {n: dayAt(f) - dayAt(e.on) + 1, red: 0};
  }
  let red = 0;
  for (const e of EPISODES.slice(1)) red = Math.max(red, redPulse(f, e.rack));
  return {n: 1, red};
};
const redPulse = (f: number, at: number) => (f < at ? 0 : clamp(1 - (f - at) / 40) * (0.6 + 0.4 * (Math.floor((f - at) / 3) % 2)));

/** Frames where the motivated counter resets (for audio + HUD). */
export const RESETS = EPISODES.slice(1).map((e) => e.rack);

// ------------------------------------------------------------------ phone
/** 0..1 phone presence in his hands, and screen intensity / redness. */
export const phone = (f: number) => {
  const e = episodeAt(f);
  const seatedSince = (() => {
    let last = -1;
    for (const ep of EPISODES) if (f >= ep.seat - 4) last = ep.seat - 4;
    return last;
  })();
  let inHand = seatedSince >= 0 ? smooth(invLerp(seatedSince, seatedSince + 14, f)) : 0;
  let toss = -1;
  if (e && e.jump && f >= e.on && f < e.seat - 4) {
    inHand = 0;
    toss = clamp((f - e.on) / 14);
  }
  const everTossed = f >= EPISODES[1].on;
  const flash = e && e.jump ? keys(f, [[e.on - 14, 0], [e.on - 3, 1], [e.on + 2, 0]]) : 0;
  const scroll = 0.75 + 0.25 * noise1(f * 0.35, 3);
  return {inHand, toss, everTossed, red: flash, intensity: scroll + flash * 1.4};
};

// ------------------------------------------------------------------ clutter
export type Box = {f: number; x: number; z: number; w: number; h: number; d: number; rest: number; rot: number};
export const BOXES: Box[] = [
  {f: 142, x: -0.36, z: 0.42, w: 0.44, h: 0.34, d: 0.38, rest: 0, rot: 0.12},
  {f: 214, x: 0.34, z: 0.44, w: 0.4, h: 0.3, d: 0.36, rest: 0, rot: -0.2},
  {f: 222, x: -0.34, z: 0.4, w: 0.34, h: 0.28, d: 0.3, rest: 0.34, rot: 0.32},
  {f: 280, x: 0.0, z: 0.66, w: 0.62, h: 0.4, d: 0.3, rest: 0, rot: 0.05},
  {f: 288, x: 0.38, z: 0.42, w: 0.3, h: 0.26, d: 0.3, rest: 0.3, rot: 0.42},
  {f: 336, x: -0.38, z: 0.42, w: 0.3, h: 0.22, d: 0.26, rest: 0.62, rot: -0.26},
  {f: 342, x: 0.02, z: 0.64, w: 0.44, h: 0.3, d: 0.28, rest: 0.4, rot: -0.1},
  {f: 384, x: 0.5, z: 0.12, w: 0.28, h: 0.28, d: 0.28, rest: 0, rot: 0.3},
  {f: 392, x: -0.52, z: 0.08, w: 0.26, h: 0.24, d: 0.26, rest: 0, rot: -0.4},
  {f: 590, x: 0.36, z: 0.42, w: 0.26, h: 0.2, d: 0.24, rest: 0.56, rot: 0.5},
];
const FALL = 3.4; // metres
const G = 9.8;
export const boxPose = (b: Box, f: number): {y: number; tilt: number; vis: boolean} => {
  const tf = Math.sqrt((2 * FALL) / G) * 30;
  const t0 = b.f - tf;
  if (f < t0) return {y: 0, tilt: 0, vis: false};
  if (f < b.f) {
    const t = (f - t0) / 30;
    return {y: b.rest + FALL - 0.5 * G * t * t + b.h / 2, tilt: (b.f - f) * 0.02 * (hash(b.f) - 0.5), vis: true};
  }
  // small bounce + settle
  const t = (f - b.f) / 30;
  const v = Math.sqrt(2 * G * FALL) * 0.16;
  const hop = Math.max(0, v * t - 0.5 * G * t * t);
  const tilt = 0.12 * Math.exp(-t * 7) * Math.sin(t * 40) * (hash(b.f + 1) - 0.5) * 2;
  return {y: b.rest + b.h / 2 + hop, tilt, vis: true};
};

// ------------------------------------------------------------------ camera
export type CamState = {pos: V3; tgt: V3; F: number; roll: number};

const CP: Key<V3>[] = [
  [0, [-1.05, 1.75, -3.3]],
  [T.revealStart, [-1.05, 1.75, -3.5]],
  [T.revealEnd, [0, 1.9, -6.4]],
  [T.yearStart, [0, 1.9, -6.35]],
  [T.yearEnd - 6, [0.1, 1.85, -5.9]],
  [T.liftStart + 8, [0.9, 0.8, -4.4]],
  [T.lockout + 22, [0.95, 0.75, -4.0]],
  [T.liftEnd + 8, [0, 1.9, -6.4]],
  [T.newYear + 6, [0, 1.9, -6.4]],
  [T.mJump + 10, [-0.4, 1.75, -5.7]],
  [T.mJump + T.mJumpLen + 34, [-0.45, 1.75, -5.5]],
  [T.endDim + 8, [0.1, 2.15, -7.0]],
  [780, [0.1, 2.3, -7.7]],
];
const CT: Key<V3>[] = [
  [0, [-1.05, 1.55, 0]],
  [T.revealStart, [-1.05, 1.55, 0]],
  [T.revealEnd, [0, 1.9, 0]],
  [T.yearStart, [0, 1.9, 0]],
  [T.yearEnd - 6, [0.08, 1.85, 0]],
  [T.liftStart + 8, [0.98, 1.72, 0]],
  [T.lockout + 22, [1.0, 1.86, 0]],
  [T.liftEnd + 8, [0, 1.9, 0]],
  [T.newYear + 6, [0, 1.9, 0]],
  [T.mJump + 10, [-0.4, 1.7, 0]],
  [T.mJump + T.mJumpLen + 34, [-0.45, 1.7, 0]],
  [T.endDim + 8, [0.1, 2.6, 0]],
  [780, [0.1, 2.8, 0]],
];

export const SHAKES: [number, number][] = [
  [T.lightsOn, 0.05],
  [T.lockout, 0.07],
  ...BOXES.map((b): [number, number] => [b.f, 0.008]),
];

export const cameraAt = (f: number): CamState => {
  const pos = keysV3(f, CP);
  const tgt = keysV3(f, CT);
  let sx = 0, sy = 0;
  for (const [at, a] of SHAKES) {
    if (f < at || f > at + 30) continue;
    const t = (f - at) / 30;
    const k = a * Math.exp(-t * 6);
    sx += k * Math.sin(t * 95);
    sy += k * Math.cos(t * 77);
  }
  // breathing handheld
  const hx = 0.012 * noise1(f / 40, 1);
  const hy = 0.01 * noise1(f / 47, 2);
  pos[0] += sx + hx;
  pos[1] += sy + hy;
  tgt[0] += sx * 0.5 + hx;
  tgt[1] += sy * 0.5 + hy;
  return {pos, tgt, F: 1650, roll: 0.004 * noise1(f / 60, 5) + sx * 0.08};
};

export const M_X = -1.05;
export const D_X = 1.05;
