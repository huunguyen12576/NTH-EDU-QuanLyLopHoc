// Single source of truth for timing. Shared by the renderer and the audio exporter.
export const FPS = 30;
export const DURATION = 870; // 29s

export const BEAT = 15; // crowd marches one step every 15 frames (120 BPM)

export const T = {
  // ACT I — HOOK: a blindfolded figure falls as the brick under it gives way
  hookCrack: 2,
  hookDrop: 12,
  // ACT I — REVEAL: endless, synchronized, blindfolded crowd marching in place
  revealStart: 64,
  text1: 86,
  text2: 128,
  textOut: 192,
  // ACT II — AWAKENING
  heroStop: 204,
  heroRaise: 214,
  heroRip: 236,
  clothLand: 266,
  heroSees: 282,
  // ACT II — REACHING OUT
  heroTurn: 300,
  heroReach: 328,
  push: 350,
  staggerEnd: 392,
  // ACT III — THE LEAP
  firstBrick: 428,
  steady: 446,
  turnForward: 462,
  // bricks rise to meet each step
  bricks: [428, 500, 528, 552, 574, 594, 613, 631, 648, 664, 680, 696, 712, 728, 744, 760, 776, 792, 808, 824, 840, 856],
  labels: 604,
  labelsOut: 690,
  // ACT IV — END CARD
  endFade: 688,
  end1: 712,
  end2: 752,
  endBrick: 784,
};
