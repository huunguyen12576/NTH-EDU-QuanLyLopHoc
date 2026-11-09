// Single source of truth for every beat of the film. Picture and sound both read from here.
export const FPS = 30;
export const DURATION = 780; // 26 s

export type Who = 'A' | 'B';
export type Shout = {f: number; who: Who; n: number; word: string; flight: number; gap: number};

// Each shout is a hurtful word that hardens into bricks. Pace accelerates: escalation.
export const SHOUTS: Shout[] = [
  {f: 8, who: 'A', n: 1, word: 'ÍCH KỶ!', flight: 30, gap: 0},
  {f: 72, who: 'B', n: 1, word: 'VÔ LÝ!', flight: 17, gap: 0},
  {f: 98, who: 'A', n: 1, word: 'TẠI AI?', flight: 16, gap: 0},
  {f: 120, who: 'B', n: 2, word: 'CỐ CHẤP!', flight: 15, gap: 4},
  {f: 140, who: 'A', n: 2, word: 'VÔ TÂM!', flight: 14, gap: 4},
  {f: 158, who: 'B', n: 3, word: 'LÚC NÀO CŨNG THẾ!', flight: 13, gap: 3},
  {f: 174, who: 'A', n: 3, word: 'IM ĐI!', flight: 12, gap: 3},
  {f: 188, who: 'B', n: 4, word: 'MẶC KỆ!', flight: 12, gap: 2},
  {f: 200, who: 'A', n: 5, word: 'PHIỀN QUÁ!', flight: 11, gap: 2},
  {f: 211, who: 'B', n: 6, word: 'BIẾT GÌ MÀ NÓI!', flight: 11, gap: 1.6},
  {f: 221, who: 'A', n: 6, word: 'ĐỦ RỒI!', flight: 10, gap: 1.5},
  {f: 229, who: 'B', n: 6, word: 'ĐỪNG HÒNG!', flight: 10, gap: 1.4},
  {f: 236, who: 'A', n: 6, word: 'SAI RỒI!', flight: 10, gap: 1.3},
  {f: 243, who: 'B', n: 1, word: 'KỆ NHAU!', flight: 15, gap: 0}, // the sealing brick
];

export const T = {
  hookLand: 44,
  wide: 92,
  seal: 258,
  snuffEnd: 290,
  slump: 280,
  turnAway: 302,
  awayEnd: 338,
  turnBack: 370,
  walkBackEnd: 408,
  handsOnWall: 428,
  pushA: 440,
  pushEnd: 458,
  holeLand: 474,
  reachA: 470,
  reachB: 486,
  touch: 505,
  collapse: 522,
  joinDown: 572,
  stepIn: 598,
  hug: 628,
  dissolve: 586,
  line1: 266,
  line2: 492,
  endFade1: 640,
  end1: 668,
  end2: 704,
  fadeOut: 756,
};
