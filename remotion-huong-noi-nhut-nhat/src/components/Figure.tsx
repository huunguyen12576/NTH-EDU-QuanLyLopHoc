import React from 'react';

export type Vec = [number, number];
export type Eyes = 'open' | 'happy' | 'wide' | 'down' | 'closed';
export type Mouth = 'smile' | 'soft' | 'flat' | 'o' | 'laugh' | 'worried' | 'grin';
export type Brow = 'none' | 'worry' | 'raise' | 'puzzled';

export type Pose = {
  x: number; // hip x (world)
  y: number; // hip y (world)
  s: number; // scale (depth)
  face: 1 | -1;
  lean: number; // torso lean forward (deg)
  tilt: number; // head tilt forward (deg)
  handF: Vec; // local hand targets (in facing space)
  handB: Vec;
  footF: Vec;
  footB: Vec;
  eyes: Eyes;
  look: Vec;
  blink: number;
  mouth: Mouth;
  brow: Brow;
  blush: number;
  tone: 'white' | 'gray';
  squash: number; // 1 = none; >1 stretched
  rim: string; // rim light colour
  rimSide: number; // -1 light from left, 1 from right (world)
  rimAmt: number;
  floorY?: number;
  book?: {open: number; glow: number; flip: number};
  cup?: boolean;
};

export const T = 92; // torso
export const HR = 38; // head radius
const UA = 52;
const FA = 50;
const TH = 78;
const SH = 78;

const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const polar = (a: number, l: number): Vec => [Math.sin(rad(a)) * l, -Math.cos(rad(a)) * l];

/** Two-bone IK: returns the middle joint. bend = +1 / -1 picks the elbow side. */
const ik = (o: Vec, t: Vec, l1: number, l2: number, bend: number): {j: Vec; e: Vec} => {
  const dx = t[0] - o[0];
  const dy = t[1] - o[1];
  let d = Math.hypot(dx, dy);
  const maxD = l1 + l2 - 0.5;
  const minD = Math.abs(l1 - l2) + 0.5;
  const base = Math.atan2(dy, dx);
  const dc = Math.min(maxD, Math.max(minD, d));
  const e: Vec = d > maxD || d < minD ? [o[0] + Math.cos(base) * dc, o[1] + Math.sin(base) * dc] : t;
  d = dc;
  const a = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const j: Vec = [o[0] + Math.cos(base + bend * a) * l1, o[1] + Math.sin(base + bend * a) * l1];
  return {j, e};
};

const PALETTE = {
  white: {hi: '#FFFFFF', mid: '#E9E9EE', lo: '#A9AAB4', back: '#B7B8C2', backLo: '#7D7E89'},
  gray: {hi: '#C9CAD0', mid: '#A2A3AB', lo: '#6C6D77', back: '#80818A', backLo: '#55565F'},
};
const OUT = '#0A0A0C';

const Limb: React.FC<{pts: Vec[]; w: number; color: string; outline?: number}> = ({pts, w, color, outline = 6}) => {
  const d = `M${pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L')}`;
  return (
    <>
      <path d={d} stroke={OUT} strokeWidth={w + outline} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
};

const Face: React.FC<{p: Pose; id: string}> = ({p, id}) => {
  const [lx, ly] = p.look;
  const ox = 7 + lx;
  const oy = 2 + ly;
  const eyeY = -4 + oy;
  const eL = -9 + ox;
  const eR = 13 + ox;
  const openY = 1 - p.blink;
  const eyeR = p.eyes === 'wide' ? 5.6 : 4.4;

  const eyes = (() => {
    if (p.eyes === 'happy' || p.blink > 0.92) {
      const c = p.eyes === 'happy' ? -1 : 1;
      return [eL, eR].map((x, i) => (
        <path key={i} d={`M${x - 6} ${eyeY + 1} Q${x} ${eyeY + 1 + 6 * c} ${x + 6} ${eyeY + 1}`} stroke={OUT} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      ));
    }
    if (p.eyes === 'closed') {
      return [eL, eR].map((x, i) => (
        <path key={i} d={`M${x - 6} ${eyeY + 2} Q${x} ${eyeY + 6} ${x + 6} ${eyeY + 2}`} stroke={OUT} strokeWidth={3.2} fill="none" strokeLinecap="round" />
      ));
    }
    const dy = p.eyes === 'down' ? 3 : 0;
    return [eL, eR].map((x, i) => (
      <g key={i}>
        {p.eyes === 'down' && (
          <path d={`M${x - 6} ${eyeY - 1} Q${x} ${eyeY - 4} ${x + 6} ${eyeY - 1}`} stroke={OUT} strokeWidth={2.6} fill="none" strokeLinecap="round" opacity={0.85} />
        )}
        <ellipse cx={x} cy={eyeY + dy} rx={eyeR} ry={eyeR * Math.max(0.12, openY) * (p.eyes === 'down' ? 0.75 : 1)} fill={OUT} />
        {p.eyes === 'wide' && <circle cx={x + 1.6} cy={eyeY - 1.6} r={1.5} fill="#fff" />}
      </g>
    ));
  })();

  const my = 17 + oy;
  const mx = 2 + ox;
  const mouth = (() => {
    switch (p.mouth) {
      case 'smile':
        return <path d={`M${mx - 8} ${my - 1} Q${mx} ${my + 7} ${mx + 8} ${my - 1}`} stroke={OUT} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
      case 'soft':
        return <path d={`M${mx - 6} ${my} Q${mx} ${my + 3.5} ${mx + 6} ${my}`} stroke={OUT} strokeWidth={3} fill="none" strokeLinecap="round" />;
      case 'flat':
        return <path d={`M${mx - 5} ${my + 1} L${mx + 5} ${my + 1}`} stroke={OUT} strokeWidth={3} strokeLinecap="round" />;
      case 'worried':
        return <path d={`M${mx - 6} ${my + 3} Q${mx} ${my - 2} ${mx + 6} ${my + 3}`} stroke={OUT} strokeWidth={3} fill="none" strokeLinecap="round" />;
      case 'o':
        return <ellipse cx={mx} cy={my + 2} rx={4} ry={5.2} fill={OUT} />;
      case 'grin':
        return <path d={`M${mx - 9} ${my - 2} Q${mx} ${my + 9} ${mx + 9} ${my - 2} Z`} fill={OUT} />;
      case 'laugh':
        return (
          <g>
            <path d={`M${mx - 10} ${my - 3} Q${mx} ${my + 13} ${mx + 10} ${my - 3} Z`} fill={OUT} />
            <path d={`M${mx - 4} ${my + 5} Q${mx} ${my + 2} ${mx + 4} ${my + 5} L${mx + 3} ${my + 7} Q${mx} ${my + 8} ${mx - 3} ${my + 7} Z`} fill="#E0607A" />
          </g>
        );
    }
  })();

  const brows = (() => {
    if (p.brow === 'none') return null;
    const by = eyeY - 11;
    if (p.brow === 'worry')
      return (
        <g stroke={OUT} strokeWidth={3} strokeLinecap="round">
          <path d={`M${eL - 6} ${by + 1} L${eL + 4} ${by - 3}`} />
          <path d={`M${eR - 4} ${by - 3} L${eR + 6} ${by + 1}`} />
        </g>
      );
    if (p.brow === 'raise')
      return (
        <g stroke={OUT} strokeWidth={3} strokeLinecap="round" fill="none">
          <path d={`M${eL - 6} ${by - 2} Q${eL} ${by - 7} ${eL + 6} ${by - 2}`} />
          <path d={`M${eR - 6} ${by - 2} Q${eR} ${by - 7} ${eR + 6} ${by - 2}`} />
        </g>
      );
    return (
      <g stroke={OUT} strokeWidth={3} strokeLinecap="round" fill="none">
        <path d={`M${eL - 6} ${by} L${eL + 5} ${by + 1}`} />
        <path d={`M${eR - 6} ${by - 5} Q${eR} ${by - 8} ${eR + 6} ${by - 4}`} />
      </g>
    );
  })();

  return (
    <g>
      {p.blush > 0 && (
        <g opacity={p.blush} filter={`url(#soft-${id})`}>
          <ellipse cx={eL - 3} cy={eyeY + 11} rx={7} ry={4} fill="#FF7A8A" />
          <ellipse cx={eR + 3} cy={eyeY + 11} rx={7} ry={4} fill="#FF7A8A" />
        </g>
      )}
      {brows}
      {eyes}
      {mouth}
    </g>
  );
};

export const Figure: React.FC<{p: Pose; id: string}> = ({p, id}) => {
  const pal = PALETTE[p.tone];
  const hip: Vec = [0, 0];
  const top = polar(p.lean, T);
  const shoulder = polar(p.lean, T - 14);
  const headC = add(top, polar(p.lean + p.tilt, HR + 4));

  const legF = ik(hip, p.footF, TH, SH, -1);
  const legB = ik(hip, p.footB, TH, SH, -1);
  const armF = ik(shoulder, p.handF, UA, FA, 1);
  const armB = ik(shoulder, p.handB, UA, FA, 1);

  // Rim light comes from a world side; convert to local (mirrored) space
  const rimLocal = p.rimSide * p.face;
  const grad = `g-${id}`;
  const headGrad = `hg-${id}`;
  const clip = `hc-${id}`;
  const W = 21;

  return (
    <g>
      <defs>
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1={-60 * rimLocal} y1={-220} x2={60 * rimLocal} y2={140}>
          <stop offset="0" stopColor={pal.hi} />
          <stop offset="0.55" stopColor={pal.mid} />
          <stop offset="1" stopColor={pal.lo} />
        </linearGradient>
        <radialGradient id={headGrad} cx={0.5 + 0.18 * rimLocal} cy={0.32} r={0.75}>
          <stop offset="0" stopColor={pal.hi} />
          <stop offset="0.6" stopColor={pal.mid} />
          <stop offset="1" stopColor={pal.lo} />
        </radialGradient>
        <clipPath id={clip}>
          <circle cx={headC[0]} cy={headC[1]} r={HR} />
        </clipPath>
        <filter id={`soft-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2} />
        </filter>
      </defs>
      <g transform={`translate(${p.x} ${p.y}) scale(${p.s * p.face} ${p.s}) scale(${1 / Math.sqrt(p.squash)} ${p.squash})`}>
        {/* back limbs */}
        <Limb pts={[shoulder, armB.j, armB.e]} w={W - 2} color={pal.back} />
        <Limb pts={[hip, legB.j, legB.e]} w={W} color={pal.back} />
        {/* torso */}
        <Limb pts={[hip, top]} w={W + 12} color={`url(#${grad})`} />
        <Limb pts={[hip, legF.j, legF.e]} w={W} color={`url(#${grad})`} />
        {p.cup && (
          <g transform={`translate(${p.handF[0] + 4} ${p.handF[1] - 6})`}>
            <rect x={-10} y={-14} width={20} height={24} rx={4} fill="#EDEDED" stroke={OUT} strokeWidth={3} />
          </g>
        )}
        {p.book && (
          <g transform={`translate(${shoulder[0] + 34} ${shoulder[1] + 32}) rotate(-8)`}>
            {p.book.glow > 0 && (
              <ellipse cx={0} cy={-6} rx={70} ry={60} fill="#FFB36B" opacity={0.22 * p.book.glow} filter={`url(#bookglow)`} />
            )}
            <rect x={-6} y={-36} width={40} height={64} rx={3} fill="#F4EFE4" stroke={OUT} strokeWidth={3} />
            {p.book.flip > 0 && p.book.flip < 1 && (
              <rect x={-6} y={-36} width={40 * Math.abs(Math.cos(p.book.flip * Math.PI))} height={64} fill="#FFFFFF" stroke={OUT} strokeWidth={2} transform={`translate(${p.book.flip > 0.5 ? 0 : 0} 0)`} />
            )}
            <path d="M-12 -40 L22 -44 L22 30 L-12 34 Z" fill="url(#bookRed)" stroke={OUT} strokeWidth={3.5} strokeLinejoin="round" />
            <path d="M-12 -40 L-6 -36 L-6 28 L-12 34 Z" fill="#7E0E14" stroke={OUT} strokeWidth={2} strokeLinejoin="round" />
            <path d="M-2 -30 L16 -32" stroke="#FFB0A8" strokeWidth={2} opacity={0.5} strokeLinecap="round" />
          </g>
        )}
        <Limb pts={[shoulder, armF.j, armF.e]} w={W - 2} color={`url(#${grad})`} />
        {/* head */}
        <circle cx={headC[0]} cy={headC[1]} r={HR + 3.2} fill={OUT} />
        <g clipPath={`url(#${clip})`}>
          <rect x={headC[0] - HR - 2} y={headC[1] - HR - 2} width={HR * 2 + 4} height={HR * 2 + 4} fill={p.rim} opacity={p.rimAmt} />
          <rect x={headC[0] - HR - 2} y={headC[1] - HR - 2} width={HR * 2 + 4} height={HR * 2 + 4} fill={pal.lo} opacity={1 - p.rimAmt} />
          <circle cx={headC[0] - rimLocal * 5} cy={headC[1] + 3} r={HR} fill={`url(#${headGrad})`} />
        </g>
        <g transform={`translate(${headC[0]} ${headC[1]}) rotate(${(p.lean + p.tilt) * 0.35})`}>
          <Face p={p} id={id} />
        </g>
      </g>
    </g>
  );
};

// ---------- pose builders ----------

const LEG = TH + SH;

export type Base = Pick<Pose, 'x' | 's' | 'face'> & {floorY: number; seatDrop: number};

/** Leg targets for sitting↔standing↔walking. sit 0..1, walk phase (radians), walkAmt 0..1 */
export const legs = (sit: number, phase: number, walkAmt: number, seatDrop: number) => {
  const standY = LEG - 3;
  const sitF: Vec = [64, seatDrop];
  const sitB: Vec = [54, seatDrop];
  const stride = 34 * walkAmt;
  const lift = 20 * walkAmt;
  const wf: Vec = [6 + Math.sin(phase) * stride, standY - Math.max(0, Math.cos(phase)) * lift];
  const wb: Vec = [-2 + Math.sin(phase + Math.PI) * stride, standY - Math.max(0, Math.cos(phase + Math.PI)) * lift];
  const footF: Vec = [wf[0] + (sitF[0] - wf[0]) * sit, wf[1] + (sitF[1] - wf[1]) * sit];
  const footB: Vec = [wb[0] + (sitB[0] - wb[0]) * sit, wb[1] + (sitB[1] - wb[1]) * sit];
  return {footF, footB};
};

/** Hip y in world for a given floor / sit state, including walk bob. */
export const hipY = (floorY: number, s: number, sit: number, seatDrop: number, phase: number, walkAmt: number) => {
  const stand = floorY - (LEG - 3) * s;
  const seat = floorY - seatDrop * s;
  const bob = -Math.abs(Math.cos(phase)) * 5 * walkAmt * s;
  return stand + (seat - stand) * sit + bob;
};
