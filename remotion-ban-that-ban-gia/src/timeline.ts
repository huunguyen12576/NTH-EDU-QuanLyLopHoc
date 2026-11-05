import {pw} from './lib/anim';

// Single source of truth for timing. Shared by renderer and audio exporter.
export const FPS = 30;
export const DURATION = 960; // 32 s

export type Variant = 'fake' | 'real';

/** Scene-time beats (frames of story time `s`, identical clock for both variants). */
export const S = {
  splash: 72, // front wheel enters the puddle
  hit: 77, // mud reaches B
  // FAKE
  laugh: 110, poke: 166, look: 182, wipe: 198, smirk: 214, leave: 240, fakeEnd: 290,
  // REAL
  stop: 140, decide: 158, windup: 180, takeoff: 200, land: 220, giggle: 232, reach: 262, up: 290, cheek: 292, together: 318, walk: 340, realEnd: 520,
};

/** Output frame -> what the camera is looking at. The film tells the same night twice; rewinds connect them. */
export type Seg = {variant: Variant; s: number; rewind: number; act: 'hook' | 'fake' | 'rw1' | 'real' | 'end'};

export const OUT = {hookEnd: 60, rw1: 350, act2: 380, end: 740, slowA: 586, slowB: 632};

const hookMap: [number, number][] = [[0, 63], [34, 77.4], [44, 78.0], [46, 78.1]];
const realMap: [number, number][] = [[OUT.act2, 0], [OUT.slowA, 206], [OUT.slowB, 221], [OUT.end, 329], [DURATION, 549]];

export const segAt = (f: number): Seg => {
  if (f < 46) return {variant: 'fake', s: pw(f, hookMap), rewind: 0, act: 'hook'};
  if (f < OUT.hookEnd) {
    const t = (f - 46) / (OUT.hookEnd - 46);
    return {variant: 'fake', s: 78.1 * (1 - t * t * (3 - 2 * t)), rewind: Math.sin(Math.PI * t), act: 'hook'};
  }
  if (f < OUT.rw1) return {variant: 'fake', s: f - OUT.hookEnd, rewind: 0, act: 'fake'};
  if (f < OUT.act2) {
    const t = (f - OUT.rw1) / (OUT.act2 - OUT.rw1);
    const e = t * t * (3 - 2 * t);
    return {variant: 'fake', s: S.fakeEnd * (1 - e), rewind: Math.sin(Math.PI * t), act: 'rw1'};
  }
  return {variant: 'real', s: pw(f, realMap), rewind: 0, act: f < OUT.end ? 'real' : 'end'};
};

/** Inverse map used by the audio exporter: story frame -> output frame for a given act. */
export const outOf = (variant: Variant, s: number) => {
  if (variant === 'fake') return OUT.hookEnd + s;
  for (let i = 1; i < realMap.length; i++) {
    const [o0, s0] = realMap[i - 1], [o1, s1] = realMap[i];
    if (s <= s1) return o0 + ((s - s0) / (s1 - s0)) * (o1 - o0);
  }
  return DURATION;
};
