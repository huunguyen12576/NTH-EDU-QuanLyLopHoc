// Everything that happens in both rooms, as pure functions of story time.
import {Char, kf, Key} from './anim';
import {add, POSE, Pose} from './rig';
import {S} from './timeline';

export type Side = 'strict' | 'chill';

const KID = {unit: 108, base: '#f6f6f8', dark: '#cfd0da'};
const PAR = {unit: 148, base: '#a9aab3', dark: '#2f313b'};

// shared geometry (panel space 1080 x 700)
export const G = {
  wallY: 548, // wall meets floor
  door: {x0: 846, x1: 956, y0: 150, y1: 548},
  win: {x0: 312, x1: 548, y0: 118, y1: 388},
  bedTop: 496,
  lamp: {x: 648, y: 425},
};


// gesture while telling the story of the night
const talk = (s: number): Pose => {
  const a = Math.sin(s * 7.3), b = Math.sin(s * 5.1 + 1), c = Math.sin(s * 2.3);
  return add(POSE.sitTalk, {rSh: 0.45 * a, rEl: 0.4 * b, lSh: 0.3 * b, lEl: 0.3 * c, lean: 0.05 * c, head: -0.08 * a});
};
const laugh = (s: number): Pose => add(POSE.sitLaugh, {lean: 0.05 * Math.sin(s * 22), head: 0.06 * Math.sin(s * 22 + 1)});
const nod = (s: number): Pose => add(POSE.sit, {head: 0.12 + 0.1 * Math.sin(s * 6), lean: 0.08});
const sitAsk = (s: number): Pose => add(POSE.sitPalms, {rSh: 0.12 * Math.sin(s * 6), lSh: 0.1 * Math.sin(s * 6 + 1), head: 0.05 * Math.sin(s * 3)});
const shiver = (s: number): Pose => add(POSE.startled, {lean: 0.015 * Math.sin(s * 40)});

// ---------------------------------------------------------------- STRICT
const strictKid: Char = {
  ...KID,
  name: 'strictKid',
  keys: [
    {t: 0, x: 600, y: 625, face: 1, pose: POSE.stand},
    {t: S.ask, x: 600, y: 625, face: 1, pose: POSE.stand},
    {t: S.ask + 0.35, x: 604, y: 625, face: 1, pose: POSE.ask, ease: 'back'},
    {t: S.answer, x: 604, y: 625, face: 1, pose: POSE.ask},
    {t: S.answer + 0.25, x: 596, y: 625, face: 1, pose: add(POSE.stand, {lean: -0.1, head: -0.05}), ease: 'back'},
    {t: S.strictLeave + 0.2, x: 596, y: 625, face: 1, pose: POSE.stand},
    {t: S.strictDoorShut + 0.05, x: 596, y: 625, face: 1, pose: POSE.slump, ease: 'out'},
    {t: 4.75, x: 596, y: 625, face: 1, pose: POSE.slump},
    {t: S.toWindow, x: 594, y: 625, face: -1, pose: add(POSE.stand, {head: -0.25}), walk: true},
    {t: 5.85, x: 470, y: 602, face: -1, pose: POSE.stand},
    {t: 6.05, x: 462, y: 602, face: -1, pose: POSE.stepUp},
    {t: 6.35, x: 440, y: G.bedTop, d: 565, face: -1, pose: POSE.stand, arc: 26, ease: 'out'},
    {t: S.winOpen, x: 436, y: G.bedTop, d: 565, face: -1, pose: POSE.reachUp},
    {t: 6.8, x: 434, y: G.bedTop, d: 565, face: -1, pose: POSE.reachUp},
    {t: S.outSill + 0.2, x: 430, y: 392, d: 565, face: -1, pose: POSE.sill, arc: 18, ease: 'out'},
    {t: 7.3, x: 428, y: 392, d: 565, face: -1, pose: POSE.sill, layer: 'out'},
    {t: S.gone, x: 418, y: 560, d: 565, face: -1, pose: POSE.hang, layer: 'out', ease: 'in'},
    {t: 8.1, x: 418, y: 800, d: 565, face: -1, pose: POSE.hang, layer: 'out', ease: 'in'},
    // ...the night passes outside...
    {t: S.climbIn, x: 430, y: 780, d: 565, face: 1, pose: POSE.hang, layer: 'out'},
    {t: 16.35, x: 430, y: 628, d: 565, face: 1, pose: POSE.hang, layer: 'out', ease: 'out'},
    {t: 16.55, x: 430, y: 628, d: 565, face: 1, pose: POSE.hang, layer: 'out'},
    {t: 16.9, x: 432, y: 391, d: 565, face: 1, pose: POSE.sill, layer: 'room', ease: 'inOut'},
    {t: 17.05, x: 434, y: 391, d: 565, face: 1, pose: POSE.sill},
    {t: 17.32, x: 440, y: G.bedTop, d: 565, face: 1, pose: POSE.crouch, arc: 12, ease: 'out'},
    {t: S.lampOn, x: 442, y: G.bedTop, d: 565, face: 1, pose: add(POSE.crouch, {lean: -0.1})},
    {t: S.caught + 0.18, x: 436, y: G.bedTop, d: 565, face: 1, pose: shiver, ease: 'back'},
    {t: 19.2, x: 436, y: G.bedTop, d: 565, face: 1, pose: shiver},
    {t: 19.65, x: 436, y: G.bedTop, d: 565, face: 1, pose: add(POSE.stand, {head: 0.05})},
    {t: 20.2, x: 436, y: G.bedTop, d: 565, face: 1, pose: add(POSE.stand, {head: -0.1, lean: 0.04})},
    {t: 21.4, x: 436, y: G.bedTop, d: 565, face: 1, pose: POSE.sadDrop, ease: 'inOut'},
    {t: 30, x: 436, y: G.bedTop, d: 565, face: 1, pose: POSE.sadDrop},
  ],
};

const SIT_X = 552, SIT_Y = 500, SIT_D = 588;
const strictParent: Char = {
  ...PAR,
  name: 'strictParent',
  keys: [
    {t: 0, x: 876, y: 568, face: -1, pose: POSE.stand},
    {t: S.answer - 0.1, x: 876, y: 568, face: -1, pose: POSE.stand},
    {t: S.answer + 0.22, x: 870, y: 568, face: -1, pose: POSE.noPoint, ease: 'back'},
    {t: 2.7, x: 870, y: 568, face: -1, pose: POSE.noPoint},
    {t: 3.0, x: 872, y: 568, face: -1, pose: POSE.crossArms},
    {t: S.strictLeave, x: 872, y: 568, face: -1, pose: POSE.crossArms},
    {t: 3.55, x: 876, y: 566, face: 1, pose: POSE.stand, walk: true},
    {t: 3.9, x: 905, y: 552, face: 1, pose: POSE.stand, layer: 'hall', walk: true},
    {t: 4.35, x: 1030, y: 548, face: 1, pose: POSE.stand, layer: 'hall'},
    {t: 8.9, x: 1030, y: 548, face: -1, pose: POSE.stand, layer: 'hall', walk: true},
    {t: 9.25, x: 906, y: 552, face: -1, pose: POSE.stand, layer: 'room', walk: true},
    {t: 9.5, x: 866, y: 574, face: -1, pose: POSE.stand},
    {t: S.huh + 0.15, x: 872, y: 574, face: -1, pose: POSE.shock, ease: 'back'},
    {t: 10.3, x: 872, y: 574, face: -1, pose: add(POSE.shock, {head: 0.15})},
    {t: 10.45, x: 868, y: 574, face: -1, pose: POSE.stand, walk: true},
    {t: 10.95, x: 574, y: 604, face: -1, pose: POSE.stand},
    {t: 11.35, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sit, ease: 'out'},
    {t: 11.7, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sit},
    {t: 12.05, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitLean},
    {t: 12.6, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.headInHands},
    {t: 13.5, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.headInHands},
    {t: 14.0, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitUpWatch},
    {t: 14.8, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitUpWatch},
    {t: 15.4, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitLean},
    {t: 16.05, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitUpWatch},
    {t: 17.2, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitUpWatch},
    {t: S.lampOn, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitReach, ease: 'out'},
    {t: 17.75, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitUpWatch},
    {t: S.couldAsk + 0.2, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: sitAsk},
    {t: 19.5, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: sitAsk},
    {t: 20.0, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: POSE.sitUpWatch},
    {t: 21.8, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: add(POSE.sitLean, {head: 0.25})},
    {t: 30, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: add(POSE.sitLean, {head: 0.25})},
  ],
};

// ---------------------------------------------------------------- CHILL
const chillKid: Char = {
  ...KID,
  name: 'chillKid',
  keys: [
    {t: 0, x: 600, y: 625, face: 1, pose: POSE.stand},
    {t: S.ask, x: 600, y: 625, face: 1, pose: POSE.stand},
    {t: S.ask + 0.35, x: 604, y: 625, face: 1, pose: POSE.ask, ease: 'back'},
    {t: S.chillCheer, x: 604, y: 625, face: 1, pose: POSE.ask},
    {t: 3.2, x: 606, y: 625, face: 1, pose: POSE.cheer, arc: 30, ease: 'out'},
    {t: 3.5, x: 608, y: 625, face: 1, pose: POSE.cheer},
    {t: 3.75, x: 610, y: 625, face: 1, pose: POSE.stand, walk: true},
    {t: 4.7, x: 878, y: 568, face: 1, pose: POSE.stand, walk: true},
    {t: 4.9, x: 906, y: 552, face: 1, pose: POSE.stand, layer: 'hall', walk: true},
    {t: 5.3, x: 1030, y: 548, face: 1, pose: POSE.stand, layer: 'hall'},
    {t: S.chillHome, x: 1030, y: 548, face: -1, pose: POSE.stand, layer: 'hall', walk: true},
    {t: 12.65, x: 906, y: 552, face: -1, pose: POSE.stand, layer: 'room', walk: true},
    {t: 13.05, x: 770, y: 612, face: -1, pose: POSE.stand},
    {t: 13.3, x: 770, y: 612, face: 1, pose: POSE.cheer, arc: 14, ease: 'out'},
    {t: 13.6, x: 770, y: 612, face: 1, pose: add(POSE.cheer, {rSh: -1.2, lSh: 1.4})},
    {t: 13.9, x: 770, y: 612, face: 1, pose: POSE.cheer},
    {t: 14.1, x: 770, y: 612, face: -1, pose: POSE.stand, walk: true},
    {t: 14.75, x: 440, y: 604, face: -1, pose: POSE.stand},
    {t: 15.05, x: 432, y: SIT_Y, d: SIT_D, anchor: 'hip', face: 1, pose: POSE.sit, ease: 'out'},
    {t: 15.35, x: 432, y: SIT_Y, d: SIT_D, anchor: 'hip', face: 1, pose: talk},
    {t: 17.3, x: 432, y: SIT_Y, d: SIT_D, anchor: 'hip', face: 1, pose: talk},
    {t: 17.6, x: 432, y: SIT_Y, d: SIT_D, anchor: 'hip', face: 1, pose: nod},
    {t: 18.3, x: 432, y: SIT_Y, d: SIT_D, anchor: 'hip', face: 1, pose: nod},
    {t: 18.95, x: 262, y: 470, d: SIT_D, anchor: 'hip', face: 1, rot: -Math.PI / 2, pose: POSE.lie, ease: 'inOut'},
    {t: 30, x: 262, y: 471, d: SIT_D, anchor: 'hip', face: 1, rot: -Math.PI / 2, pose: POSE.lie},
  ],
};

const chillParent: Char = {
  ...PAR,
  name: 'chillParent',
  keys: [
    {t: 0, x: 876, y: 568, face: -1, pose: POSE.stand},
    {t: S.answer - 0.1, x: 876, y: 568, face: -1, pose: POSE.stand},
    {t: S.answer + 0.25, x: 872, y: 568, face: -1, pose: POSE.openArm, ease: 'back'},
    {t: 2.5, x: 872, y: 568, face: -1, pose: POSE.openArm},
    {t: 2.8, x: 872, y: 568, face: -1, pose: POSE.thumbs, ease: 'back'},
    {t: 3.25, x: 872, y: 568, face: -1, pose: POSE.thumbs},
    {t: 3.45, x: 874, y: 567, face: 1, pose: POSE.stand, walk: true},
    {t: 3.75, x: 905, y: 552, face: 1, pose: POSE.stand, layer: 'hall', walk: true},
    {t: 4.2, x: 1040, y: 548, face: 1, pose: POSE.stand, layer: 'hall'},
    {t: 12.6, x: 1040, y: 548, face: -1, pose: POSE.stand, layer: 'hall', walk: true},
    {t: 12.95, x: 906, y: 552, face: -1, pose: POSE.stand, layer: 'room', walk: true},
    {t: 13.2, x: 870, y: 574, face: -1, pose: POSE.stand},
    {t: 13.45, x: 868, y: 574, face: -1, pose: POSE.openArm, ease: 'back'},
    {t: 14.05, x: 868, y: 574, face: -1, pose: POSE.openArm},
    {t: 14.15, x: 866, y: 576, face: -1, pose: POSE.stand, walk: true},
    {t: 14.4, x: 716, y: 598, face: -1, pose: POSE.stand},
    {t: S.chillLampOn, x: 714, y: 598, face: -1, pose: POSE.lampReach, ease: 'out'},
    {t: 14.7, x: 712, y: 598, face: -1, pose: POSE.stand, walk: true},
    {t: 15.0, x: 572, y: 604, face: -1, pose: POSE.stand},
    {t: 15.3, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: nod, ease: 'out'},
    {t: 16.2, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: nod},
    {t: 16.4, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: laugh, ease: 'out'},
    {t: 16.9, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: laugh},
    {t: 17.2, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: nod},
    {t: 17.45, x: SIT_X, y: SIT_Y, d: SIT_D, anchor: 'hip', face: -1, pose: nod},
    {t: 17.85, x: 520, y: 610, face: -1, pose: POSE.stand, ease: 'inOut'},
    {t: 18.15, x: 512, y: 610, face: -1, pose: POSE.pat, ease: 'out'},
    {t: 18.5, x: 512, y: 610, face: -1, pose: add(POSE.pat, {rEl: 0.25})},
    {t: 18.65, x: 514, y: 610, face: 1, pose: POSE.stand, walk: true},
    {t: 18.95, x: 700, y: 600, face: 1, pose: POSE.stand},
    {t: S.chillLampOff, x: 702, y: 600, face: -1, pose: POSE.lampReach, ease: 'out'},
    {t: 19.25, x: 704, y: 600, face: 1, pose: POSE.stand, walk: true},
    {t: 19.75, x: 905, y: 552, face: 1, pose: POSE.stand, layer: 'hall', walk: true},
    {t: 20.15, x: 1040, y: 548, face: 1, pose: POSE.stand, layer: 'hall'},
    {t: 30, x: 1040, y: 548, face: 1, pose: POSE.stand, layer: 'hall'},
  ],
};

export const CHARS: Record<Side, Char[]> = {
  strict: [strictParent, strictKid],
  chill: [chillParent, chillKid],
};

// ---------------------------------------------------------------- props
export type Props = {door: number; hall: number; lamp: number; win: number; wind: number};
const flick = (s: number, t0: number) => {
  // a real filament: a fast stutter before it settles
  const d = s - t0;
  if (d < 0) return 0;
  if (d < 0.03) return 0.75;
  if (d < 0.06) return 0.25;
  if (d < 0.1) return 1.1;
  return 1;
};
export const props = (side: Side, s: number): Props => {
  if (side === 'strict') {
    return {
      door: kf(s, [[0, 1], [3.95, 1], [S.strictDoorShut, 0, 'in'], [8.75, 0], [9.12, 1, 'out'], [11.4, 1], [12.4, 0.22, 'inOut']]),
      hall: kf(s, [[0, 1], [11.6, 1], [11.9, 0]]),
      lamp: flick(s, S.lampOn),
      win: kf(s, [[0, 0], [S.winOpen, 0], [6.85, 1, 'out'], [11.5, 1], [12.3, 0.78], [16.6, 0.82], [16.9, 1, 'out']]),
      wind: kf(s, [[0, 0], [S.winOpen, 0], [7.0, 1], [16.9, 1], [17.6, 0.35]]),
    };
  }
  return {
    door: kf(s, [[0, 1], [5.35, 1], [S.chillDoorShut, 0], [12.25, 0], [12.6, 1, 'out'], [19.95, 1], [S.chillDoorShut2, 0]]),
    hall: kf(s, [[0, 1], [20.9, 1], [21.15, 0]]),
    lamp: s < S.chillLampOn ? 0 : s < S.chillLampOff ? flick(s, S.chillLampOn) : 0,
    win: 0,
    wind: 0,
  };
};

// ---------------------------------------------------------------- dialogue
export type Line = {who: number; t0: number; t1: number; text: string; kind?: 'speech' | 'mark' | 'zzz'};
export const LINES: Record<Side, Line[]> = {
  strict: [
    {who: 1, t0: S.ask, t1: 1.85, text: 'Tối nay con đi chơi được không?'},
    {who: 0, t0: S.answer, t1: 3.55, text: 'Không.'},
    {who: 0, t0: S.huh, t1: 11.0, text: '?!', kind: 'mark'},
    {who: 1, t0: S.caught, t1: 18.2, text: '!', kind: 'mark'},
    {who: 0, t0: S.couldAsk, t1: 19.7, text: 'Con chỉ cần xin phép thôi mà.'},
    {who: 1, t0: S.iDid, t1: 30, text: 'Con đã xin rồi.'},
  ],
  chill: [
    {who: 1, t0: S.ask, t1: 1.85, text: 'Tối nay con đi chơi được không?'},
    {who: 0, t0: S.answer, t1: 3.55, text: 'Được! Về trước 12 giờ nhé.'},
    {who: 0, t0: S.howWasIt, t1: 14.35, text: 'Đi chơi vui không con?'},
    {who: 1, t0: 20.5, t1: 30, text: 'z', kind: 'zzz'},
  ],
};

// ---------------------------------------------------------------- camera (zoom, cx, cy) in panel space
export type Cam = {z: number; x: number; y: number};
export const camera = (side: Side, s: number): Cam => {
  if (side === 'strict') {
    return {
      z: kf(s, [[0, 1.05], [3.0, 1.08], [4.3, 1.05], [5.2, 1.06], [7.0, 1.14], [8.2, 1.14], [8.9, 1.02], [S.huh, 1.0], [S.huh + 0.25, 1.16, 'out'], [10.6, 1.14], [11.6, 1.06], [15.8, 1.12], [S.lampOn, 1.15], [S.lampOn + 0.2, 1.08, 'out'], [S.iDid, 1.1], [22.3, 1.24]]),
      x: kf(s, [[0, 640], [3.0, 680], [4.3, 600], [5.2, 560], [7.0, 440], [8.2, 440], [8.9, 600], [S.huh, 700], [S.huh + 0.25, 800, 'out'], [10.6, 760], [11.6, 560], [15.8, 500], [S.lampOn, 470], [S.lampOn + 0.2, 500, 'out'], [S.iDid, 470], [22.3, 455]]),
      y: kf(s, [[0, 380], [3.0, 390], [4.3, 380], [7.0, 330], [8.2, 340], [8.9, 360], [S.huh, 360], [S.huh + 0.25, 380, 'out'], [11.6, 390], [15.8, 380], [S.lampOn, 370], [S.iDid, 370], [22.3, 360]]),
    };
  }
  return {
    z: kf(s, [[0, 1.05], [3.0, 1.08], [5.4, 1.02], [12.0, 1.02], [13.4, 1.08], [15.2, 1.1], [17.5, 1.1], [19.5, 1.06], [22.3, 1.16]]),
    x: kf(s, [[0, 640], [3.0, 680], [5.4, 620], [12.0, 620], [13.4, 700], [15.2, 500], [17.5, 480], [19.5, 460], [22.3, 330]]),
    y: kf(s, [[0, 380], [3.0, 390], [5.4, 360], [13.4, 380], [15.2, 400], [19.5, 400], [22.3, 420]]),
  };
};
