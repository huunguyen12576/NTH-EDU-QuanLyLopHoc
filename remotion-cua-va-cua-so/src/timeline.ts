// Single source of truth for time.
// "Story time" (s, seconds) is what both rooms live in; the film maps frames -> story time,
// which lets the cold-open hook play the climax and then *rewind* the same deterministic world.
export const FPS = 30;
export const W = 1080;
export const H = 1920;

// Film structure (frames)
export const F = {
  hookEnd: 57, // cold open: 01:40, the lamp clicks on
  rewindStart: 63,
  rewindEnd: 87,
  storyEnd: 756, // story time 22.3 s reached
  fadeOut: 734,
  end1: 768,
  end2: 808,
  end3: 862,
};
export const DURATION = 960; // 32 s

export const HOOK_S0 = 15.8; // story second shown at frame 0
export const HOOK_S1 = HOOK_S0 + F.hookEnd / FPS; // 17.7

const smooth = (t: number) => t * t * (3 - 2 * t);

/** frame -> story seconds */
export const storyAt = (f: number): number => {
  if (f <= F.hookEnd) return HOOK_S0 + f / FPS;
  if (f <= F.rewindStart) return HOOK_S1;
  if (f <= F.rewindEnd) {
    const u = (f - F.rewindStart) / (F.rewindEnd - F.rewindStart);
    return HOOK_S1 * (1 - smooth(u));
  }
  return (f - F.rewindEnd) / FPS;
};

/** story seconds -> film frame (first occurrence after the rewind) */
export const frameOf = (s: number) => F.rewindEnd + s * FPS;

// Story beats (story seconds)
export const S = {
  ask: 0.35,
  answer: 1.95,
  strictLeave: 3.3,
  strictDoorShut: 4.25,
  chillCheer: 2.9,
  chillExit: 3.9,
  chillDoorShut: 5.75,
  toWindow: 5.1,
  winOpen: 6.45,
  outSill: 6.95,
  gone: 7.7,
  lapse1: [8.0, 9.0] as const,
  parentIn: 8.9,
  huh: 9.75,
  sitDown: 11.0,
  lapse2: [11.4, 12.4] as const,
  chillHome: 12.4,
  howWasIt: 13.0,
  chillLampOn: 14.5,
  lapse3: [15.0, 16.0] as const,
  climbIn: 16.0,
  lampOn: 17.4,
  caught: 17.5,
  couldAsk: 17.95,
  iDid: 19.75,
  chillPat: 17.9,
  chillLampOff: 19.0,
  chillDoorShut2: 20.3,
  end: 22.3,
};

// Story clock: minutes since 00:00 (may exceed 1440 after midnight)
const CLOCK: [number, number][] = [
  [0, 21 * 60 + 30],
  [3.0, 21 * 60 + 30],
  [4.4, 21 * 60 + 31],
  [7.4, 21 * 60 + 32],
  [8.0, 21 * 60 + 32.2],
  [9.0, 22 * 60 + 48],
  [11.4, 22 * 60 + 49.6],
  [12.4, 23 * 60 + 56],
  [12.9, 23 * 60 + 58],
  [15.0, 23 * 60 + 59.4],
  [16.0, 24 * 60 + 99],
  [17.3, 24 * 60 + 100],
  [19.4, 24 * 60 + 101],
  [21.2, 24 * 60 + 102],
  [30, 24 * 60 + 103],
];
export const clockMinutes = (s: number) => {
  for (let i = 0; i < CLOCK.length - 1; i++) {
    const [a, ma] = CLOCK[i];
    const [b, mb] = CLOCK[i + 1];
    if (s <= b) {
      const u = Math.max(0, (s - a) / (b - a));
      return ma + (mb - ma) * u;
    }
  }
  return CLOCK[CLOCK.length - 1][1];
};
export const inLapse = (s: number) =>
  [S.lapse1, S.lapse2, S.lapse3].reduce((m, [a, b]) => Math.max(m, s > a && s < b ? Math.sin(((s - a) / (b - a)) * Math.PI) : 0), 0);
