// Single source of truth for timing. Shared by the renderer and the audio exporter.
export const FPS = 30;
export const DURATION = 780; // 26s

export const T = {
  // HOOK — darkness, then the lights slam on a man lifting like his life depends on it
  lightsOn: 4,
  revealStart: 24,
  revealEnd: 72,
  hudIn: 58,
  // JAN 1 — the motivated fire burns out on day one
  mFadeStart: 70,
  // THE YEAR — calendar accelerates
  yearStart: 128,
  yearEnd: 400,
  // motivation bursts (triggered by the phone) — each shorter than the last
  bursts: [
    {on: 166, len: 44},
    {on: 236, len: 32},
    {on: 300, len: 22},
    {on: 352, len: 14},
  ],
  // DEC 31 — the lift
  liftStart: 410,
  liftDrive: 438,
  lockout: 450,
  liftDown: 476,
  liftEnd: 494,
  // JAN 1 — the loop
  newYear: 512,
  mJump: 524,
  mJumpLen: 26,
  // END
  endDim: 600,
  end1: 616,
  end2: 668,
  finalRep: 712,
  d367: 728,
  fadeOut: 762,
};

// Disciplined loads plates progressively (day thresholds).
export const PLATE_DAYS = [36, 130, 250];
export const M_PLATES = 3; // the motivated one starts too heavy
