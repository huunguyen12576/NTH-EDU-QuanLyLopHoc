import React from 'react';
import {clamp, evalChar, hash, kf, lerp} from '../anim';
import {camera, CHARS, G, props, Side} from '../story';
import {clockMinutes, inLapse} from '../timeline';
import {Figure, mix, Silhouette} from './Figure';

export const PW = 1080;
export const PH = 700;

const {door: D, win: Wn} = G;

// ----------------------------------------------------------------- sky
const STARS = Array.from({length: 46}, (_, i) => ({x: lerp(Wn.x0 - 30, Wn.x1 + 30, hash(i * 3.1)), y: lerp(Wn.y0 - 10, Wn.y1 - 70, hash(i * 7.7)), r: 0.6 + hash(i * 1.3) * 1.5, ph: hash(i) * 6.28}));
const BUILD = (() => {
  const out: {x: number; w: number; h: number; wins: {x: number; y: number; k: number}[]}[] = [];
  let x = Wn.x0 - 50;
  let i = 0;
  while (x < Wn.x1 + 50) {
    const w = 20 + hash(i * 9.3) * 34;
    const h = 30 + hash(i * 4.1) * (i % 3 === 1 ? 110 : 70);
    const wins: {x: number; y: number; k: number}[] = [];
    for (let yy = Wn.y1 - h + 8; yy < Wn.y1 - 6; yy += 9) for (let xx = x + 4; xx < x + w - 5; xx += 7) wins.push({x: xx, y: yy, k: hash(xx * 0.37 + yy * 1.91)});
    out.push({x, w, h, wins});
    x += w + 2 + hash(i * 2.2) * 6;
    i++;
  }
  return out;
})();

const Sky: React.FC<{s: number; par: [number, number]; id: string}> = ({s, par, id}) => {
  const m = clockMinutes(s);
  const p = clamp((m - 1290) / (1543 - 1290));
  const mx = lerp(505, 372, p), my = lerp(178, 150, Math.sin(p * Math.PI) * 0.6 + p * 0.4);
  const lit = 0.18 + 0.8 * (1 - p); // the city goes to sleep as the night goes on
  return (
    <g transform={`translate(${par[0]} ${par[1]})`}>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a22" />
          <stop offset="0.65" stopColor="#111a3e" />
          <stop offset="1" stopColor="#2a2a52" />
        </linearGradient>
        <radialGradient id={`moon-${id}`}>
          <stop offset="0" stopColor="#dfe6ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#dfe6ff" stopOpacity="0" />
        </radialGradient>
        <mask id={`cres-${id}`}>
          <circle cx={mx} cy={my} r={13} fill="#fff" />
          <circle cx={mx + 6} cy={my - 3} r={11.5} fill="#000" />
        </mask>
      </defs>
      <rect x={Wn.x0 - 80} y={Wn.y0 - 60} width={Wn.x1 - Wn.x0 + 160} height={Wn.y1 - Wn.y0 + 80} fill={`url(#sky-${id})`} />
      {STARS.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#cfd8ff" opacity={0.35 + 0.45 * (0.5 + 0.5 * Math.sin(s * 2.2 + st.ph))} />
      ))}
      <circle cx={mx} cy={my} r={60} fill={`url(#moon-${id})`} />
      <circle cx={mx} cy={my} r={13} fill="#f2f4ff" mask={`url(#cres-${id})`} />
      {BUILD.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={Wn.y1 - b.h} width={b.w} height={b.h + 20} fill={i % 2 ? '#0a0e1c' : '#0d1224'} />
          {b.wins.map((w, k) => (w.k < lit * 0.55 ? <rect key={k} x={w.x} y={w.y} width={3.2} height={4} fill="#ffcf7a" opacity={0.55 + 0.4 * w.k} /> : null))}
        </g>
      ))}
    </g>
  );
};

// ----------------------------------------------------------------- pieces
const Curtain: React.FC<{x: number; side: -1 | 1; s: number; wind: number; id: string}> = ({x, side, s, wind, id}) => {
  const sway = wind * (14 * Math.sin(s * 2.3 + side) + 7 * Math.sin(s * 5.1 + side * 2));
  const bil = wind * (18 + 8 * Math.sin(s * 1.7));
  const w = 52;
  const top = 96, bot = 432;
  const inner = side < 0 ? x + w : x;
  const outer = side < 0 ? x : x + w;
  const d = `M${outer} ${top} L${inner} ${top} C${inner + side * -bil * 0.3} ${top + 120} ${inner + sway - side * bil} ${bot - 90} ${inner + sway * 1.4 - side * bil * 0.6} ${bot} L${outer + sway * 0.6} ${bot + 4} C${outer + sway * 0.4} ${bot - 120} ${outer} ${top + 100} ${outer} ${top} Z`;
  return (
    <g>
      <defs>
        <linearGradient id={`cur-${id}`} x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${x} 0) scale(17 1)`}>
          <stop offset="0" stopColor="#4c5068" />
          <stop offset="0.5" stopColor="#373a4f" />
          <stop offset="1" stopColor="#4c5068" />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#cur-${id})`} />
      <path d={d} fill="none" stroke="#14151d" strokeWidth={2} opacity={0.6} />
    </g>
  );
};

const Pane: React.FC<{x0: number; x1: number; open: number; hinge: 'l' | 'r'}> = ({x0, x1, open, hinge}) => {
  const pw = x1 - x0;
  const th = open * 1.3;
  const free = hinge === 'l' ? x0 + pw * Math.cos(th) : x1 - pw * Math.cos(th);
  const hx = hinge === 'l' ? x0 : x1;
  const e = pw * 0.14 * Math.sin(th);
  const y0 = Wn.y0, y1 = Wn.y1;
  const pts = `${hx},${y0} ${free},${y0 - e} ${free},${y1 + e} ${hx},${y1}`;
  const glassOp = 0.1 + 0.12 * Math.sin(th);
  const midY0 = (y0 + y0 - e) / 2;
  void midY0;
  return (
    <g>
      <polygon points={pts} fill="#9fb2ff" opacity={glassOp} />
      {/* glass reflection streak */}
      <polygon points={`${lerp(hx, free, 0.2)},${y0 + 10} ${lerp(hx, free, 0.45)},${y0 + 10} ${lerp(hx, free, 0.25)},${y1 - 30} ${lerp(hx, free, 0.05)},${y1 - 30}`} fill="#ffffff" opacity={0.05 + 0.05 * (1 - open)} />
      <polygon points={pts} fill="none" stroke="#c9ccd8" strokeWidth={7} strokeLinejoin="round" />
      <line x1={hx} y1={(y0 + y1) / 2} x2={free} y2={(y0 + y1) / 2} stroke="#c9ccd8" strokeWidth={4} />
    </g>
  );
};

const DoorSlab: React.FC<{open: number; shade: number}> = ({open, shade}) => {
  const W = D.x1 - D.x0;
  const th = open * 1.68;
  const xf = D.x1 - W * Math.cos(th) + W * 0.12 * Math.sin(th);
  const e = W * 0.17 * Math.sin(th);
  const lit = mix('#2c2d39', '#6d6a72', shade * (0.45 + 0.55 * Math.abs(Math.cos(th))));
  const P = (u: number, v: number) => {
    // u along width from hinge (0) to free edge (1); v top (0) to bottom (1)
    const x = lerp(D.x1, xf, u);
    const ty = lerp(D.y0, D.y0 - e, u), by = lerp(D.y1, D.y1 + e, u);
    return `${x.toFixed(1)},${lerp(ty, by, v).toFixed(1)}`;
  };
  const quad = (u0: number, u1: number, v0: number, v1: number) => `${P(u0, v0)} ${P(u1, v0)} ${P(u1, v1)} ${P(u0, v1)}`;
  const k = P(0.86, 0.53).split(',').map(Number);
  return (
    <g>
      <polygon points={quad(0, 1, 0, 1)} fill={lit} stroke="#14141b" strokeWidth={2} />
      <polygon points={quad(0.15, 0.85, 0.07, 0.44)} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={3} />
      <polygon points={quad(0.15, 0.85, 0.52, 0.93)} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={3} />
      <circle cx={k[0]} cy={k[1]} r={5.5} fill="#c9b27a" />
    </g>
  );
};

// ----------------------------------------------------------------- the room
export const Room: React.FC<{side: Side; s: number}> = ({side, s}) => {
  const id = side;
  const pr = props(side, s);
  const cam = camera(side, s);
  // handheld micro drift
  const hx = Math.sin(s * 0.9 + (side === 'strict' ? 0 : 2)) * 2.2 + Math.sin(s * 2.3) * 0.8;
  const hy = Math.cos(s * 0.7) * 1.6;
  const z = cam.z;
  const cx = clamp(cam.x, PW / (2 * z), PW - PW / (2 * z)) + hx;
  const cy = clamp(cam.y, PH / (2 * z), PH - PH / (2 * z)) + hy;
  const world = `translate(${PW / 2} ${PH / 2}) scale(${z}) translate(${-cx} ${-cy})`;
  const par: [number, number] = [(cx - PW / 2) * 0.12, (cy - PH / 2) * 0.12];

  const hallL = pr.door * pr.hall;
  const lamp = pr.lamp;
  const lapse = inLapse(s);
  const dark = clamp(0.6 - 0.22 * hallL - 0.36 * lamp, 0.12, 0.8);

  const chars = CHARS[side].map((c) => ({c, st: evalChar(c, s)}));
  const inRoom = chars.filter((o) => o.st.layer === 'room');
  const inHall = chars.filter((o) => o.st.layer === 'hall');
  const outside = chars.filter((o) => o.st.layer === 'out');

  const lightFor = (x: number, y: number) => {
    const dDoor = Math.hypot(x - 900, y - 470);
    const dLamp = Math.hypot(x - G.lamp.x, y - G.lamp.y);
    const dWin = Math.hypot(x - 430, y - 300);
    return clamp(0.16 + 0.75 * hallL * Math.exp(-dDoor / 260) + 0.85 * lamp * Math.exp(-dLamp / 520) + 0.18 * Math.exp(-dWin / 260));
  };
  const warmFor = (x: number, y: number) => clamp(hallL * Math.exp(-Math.hypot(x - 900, y - 470) / 300) + lamp * Math.exp(-Math.hypot(x - G.lamp.x, y - G.lamp.y) / 420));

  const fig = (o: (typeof chars)[number], i: number) => (
    <Figure key={o.c.name} st={o.st} id={`${id}-${i}-${o.c.name}`} base={o.c.base} dark={o.c.dark} light={lightFor(o.st.x, o.st.y)} warm={warmFor(o.st.x, o.st.y)} rimX={lamp > 0.3 ? Math.sign(G.lamp.x - o.st.x) : 1} />
  );

  // floor planks in perspective
  const vp = {x: 540, y: 150};
  const planks = [];
  for (let x = -600; x <= 1700; x += 64) {
    const bx = vp.x + (x - vp.x) * ((760 - vp.y) / (G.wallY - vp.y));
    planks.push(<line key={x} x1={x} y1={G.wallY} x2={bx} y2={760} stroke="#000" strokeOpacity={0.28} strokeWidth={1.4} />);
  }
  const seams = [566, 590, 622, 664, 718].map((y, i) => <line key={y} x1={-300} y1={y} x2={1400} y2={y} stroke="#000" strokeOpacity={0.12 + i * 0.02} strokeWidth={1} />);

  // moonlight shaft (moves with the moon)
  const mp = clamp((clockMinutes(s) - 1290) / 253);
  const sh = lerp(-40, 60, mp);
  const shaft = `${Wn.x0 + 6},${Wn.y0 + 10} ${Wn.x1 - 6},${Wn.y0 + 10} ${Wn.x1 + 120 + sh},700 ${Wn.x0 + 60 + sh},700`;

  const doorSpill = `${D.x0},${D.y1} ${D.x1 - 10},${D.y1} ${D.x1 + 40},760 ${D.x0 - 240},760`;

  return (
    <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{display: 'block'}}>
      <defs>
        <clipPath id={`winclip-${id}`}>
          <rect x={Wn.x0} y={Wn.y0} width={Wn.x1 - Wn.x0} height={Wn.y1 - Wn.y0} />
        </clipPath>
        <clipPath id={`doorclip-${id}`}>
          <rect x={D.x0} y={D.y0} width={D.x1 - D.x0} height={D.y1 - D.y0} />
        </clipPath>
        <clipPath id={`wallclip-${id}`}>
          <rect x={-400} y={-200} width={1900} height={G.wallY + 200} />
        </clipPath>
        <linearGradient id={`wall-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d3142" />
          <stop offset="0.75" stopColor="#3c4157" />
          <stop offset="1" stopColor="#353a4e" />
        </linearGradient>
        <linearGradient id={`floor-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24252f" />
          <stop offset="1" stopColor="#3a3b47" />
        </linearGradient>
        <linearGradient id={`hall-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix('#111116', '#f3dfbd', pr.hall)} />
          <stop offset="0.85" stopColor={mix('#0c0c10', '#caa983', pr.hall)} />
          <stop offset="1" stopColor={mix('#08080a', '#8a6f54', pr.hall)} />
        </linearGradient>
        <radialGradient id={`lampglow-${id}`} cx={G.lamp.x} cy={G.lamp.y} r={560} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd8a0" stopOpacity={0.62 * lamp} />
          <stop offset="0.18" stopColor="#ffc37e" stopOpacity={0.32 * lamp} />
          <stop offset="1" stopColor="#ff9a50" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`lampfloor-${id}`} cx={G.lamp.x} cy={640} r={220} gradientUnits="userSpaceOnUse" gradientTransform={`translate(${G.lamp.x} 640) scale(1.6 0.35) translate(${-G.lamp.x} -640)`}>
          <stop offset="0" stopColor="#ffd6a0" stopOpacity={0.35 * lamp} />
          <stop offset="1" stopColor="#ffd6a0" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`spill-${id}`} x1="0" y1={D.y1} x2="0" y2="760" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffdcae" stopOpacity={0.5 * hallL} />
          <stop offset="1" stopColor="#ffdcae" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`doorglow-${id}`} cx={(D.x0 + D.x1) / 2} cy={380} r={330} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd9a6" stopOpacity={0.3 * hallL} />
          <stop offset="1" stopColor="#ffd9a6" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`shaft-${id}`} x1="0" y1={Wn.y0} x2="0" y2="700" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b9c8ff" stopOpacity={0.16} />
          <stop offset="1" stopColor="#b9c8ff" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`vig-${id}`} cx="50%" cy="48%" r="75%">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.7" />
        </radialGradient>
        <filter id={`blur3-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id={`blur8-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <linearGradient id={`stripe-${id}`} x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat" gradientUnits="userSpaceOnUse" gradientTransform="scale(30 1)">
          <stop offset="0" stopColor="#3f5290" />
          <stop offset="0.5" stopColor="#3f5290" />
          <stop offset="0.5" stopColor="#5a6db0" />
          <stop offset="1" stopColor="#5a6db0" />
        </linearGradient>
      </defs>
      <rect width={PW} height={PH} fill="#050508" />

      <g transform={world}>
        {/* ---- beyond the window */}
        <g clipPath={`url(#winclip-${id})`}>
          <Sky s={s} par={par} id={id} />
          {outside.map(fig)}
        </g>
        {/* ---- the hallway */}
        <g clipPath={`url(#doorclip-${id})`}>
          <rect x={D.x0 - 20} y={D.y0 - 20} width={D.x1 - D.x0 + 40} height={D.y1 - D.y0 + 40} fill={`url(#hall-${id})`} />
          <rect x={D.x0 + 50 + par[0]} y={D.y0 + 40} width={4} height={D.y1 - D.y0} fill="#000" opacity={0.12} />
          {inHall.map(fig)}
        </g>
        {/* ---- back wall with openings */}
        <path
          fillRule="evenodd"
          fill={`url(#wall-${id})`}
          d={`M-400 -200 H1500 V${G.wallY} H-400 Z M${Wn.x0} ${Wn.y0} V${Wn.y1} H${Wn.x1} V${Wn.y0} Z M${D.x0} ${D.y0} V${D.y1} H${D.x1} V${D.y0} Z`}
        />
        {/* wainscot line + baseboard */}
        <rect x={-400} y={G.wallY - 12} width={1900} height={12} fill="#2a2d3b" />
        <rect x={-400} y={G.wallY - 13} width={1900} height={2} fill="#555a72" opacity={0.6} />
        {/* picture: mountains */}
        <g>
          <rect x={128} y={148} width={128} height={104} fill="#1a1c26" stroke="#22242f" strokeWidth={6} />
          <polygon points="140,240 178,190 200,212 222,182 246,240" fill="#3d4258" />
          <circle cx={226} cy={170} r={7} fill="#575d78" />
        </g>
        {/* window: frame, panes, sill */}
        <rect x={Wn.x0 - 10} y={Wn.y0 - 10} width={Wn.x1 - Wn.x0 + 20} height={Wn.y1 - Wn.y0 + 20} fill="none" stroke="#babdcb" strokeWidth={9} />
        <Pane x0={Wn.x0} x1={(Wn.x0 + Wn.x1) / 2} open={pr.win} hinge="l" />
        <Pane x0={(Wn.x0 + Wn.x1) / 2} x1={Wn.x1} open={pr.win} hinge="r" />
        <rect x={Wn.x0 - 24} y={Wn.y1 + 4} width={Wn.x1 - Wn.x0 + 48} height={12} rx={2} fill="#c4c7d4" />
        <rect x={Wn.x0 - 24} y={Wn.y1 + 16} width={Wn.x1 - Wn.x0 + 48} height={5} fill="#000" opacity={0.35} />
        {/* curtain rod + curtains */}
        <rect x={Wn.x0 - 70} y={90} width={Wn.x1 - Wn.x0 + 140} height={6} rx={3} fill="#22242f" />
        <Curtain x={Wn.x0 - 64} side={-1} s={s} wind={pr.wind} id={`${id}-l`} />
        <Curtain x={Wn.x1 + 12} side={1} s={s + 1.3} wind={pr.wind} id={`${id}-r`} />
        {/* door frame + slab */}
        <rect x={D.x0 - 12} y={D.y0 - 12} width={D.x1 - D.x0 + 24} height={D.y1 - D.y0 + 12} fill="none" stroke="#585b6c" strokeWidth={11} />
        {/* light under / around a closed door */}
        <rect x={D.x0 + 4} y={D.y1 - 3} width={D.x1 - D.x0 - 8} height={3} fill="#ffdcae" opacity={pr.hall * (1 - pr.door) * 0.95} />
        <DoorSlab open={pr.door} shade={0.35 + 0.65 * pr.hall} />

        {/* ---- floor */}
        <rect x={-400} y={G.wallY} width={1900} height={260} fill={`url(#floor-${id})`} />
        {planks}
        {seams}
        {/* floor reflections: window, door, lamp */}
        <rect x={Wn.x0 + 40} y={608} width={Wn.x1 - Wn.x0 - 40} height={70} fill="#9fb0ff" opacity={0.05} filter={`url(#blur8-${id})`} />
        <polygon points={doorSpill} fill={`url(#spill-${id})`} style={{mixBlendMode: 'screen'}} />
        <ellipse cx={(D.x0 + D.x1) / 2} cy={D.y1 + 4} rx={70} ry={8} fill="#ffdcae" opacity={pr.hall * (1 - pr.door) * 0.25} filter={`url(#blur3-${id})`} />
        <rect x={-400} y={G.wallY} width={1900} height={300} fill={`url(#lampfloor-${id})`} style={{mixBlendMode: 'screen'}} />

        {/* ---- bed */}
        <g>
          <rect x={84} y={372} width={30} height={218} rx={8} fill="#3e3029" />
          <rect x={84} y={372} width={30} height={10} rx={5} fill="#5a463b" />
          <rect x={556} y={466} width={20} height={124} rx={5} fill="#3e3029" />
          <polygon points={`108,474 560,474 566,508 100,508`} fill="#6274b4" />
          <rect x={100} y={506} width={466} height={62} fill={`url(#stripe-${id})`} />
          <rect x={100} y={506} width={466} height={62} fill="#000" opacity={0.18} />
          <rect x={100} y={506} width={466} height={4} fill="#9aa8dc" opacity={0.5} />
          <rect x={96} y={566} width={474} height={14} fill="#2c221e" />
          <rect x={104} y={578} width={10} height={14} fill="#2c221e" />
          <rect x={552} y={578} width={10} height={14} fill="#2c221e" />
          <path d="M120 474 Q118 456 140 454 L206 454 Q224 456 222 474 Z" fill="#d4d7e4" />
          <path d="M126 470 Q170 462 216 470" stroke="#a9adbf" strokeWidth={2} fill="none" />
        </g>
        {/* ---- nightstand + lamp */}
        <g>
          <rect x={598} y={476} width={96} height={112} fill="#3f322b" />
          <rect x={594} y={470} width={104} height={10} rx={2} fill="#574539" />
          <rect x={608} y={492} width={76} height={36} fill="none" stroke="#2a201b" strokeWidth={2} />
          <circle cx={646} cy={510} r={3} fill="#a7916b" />
          <rect x={602} y={588} width={8} height={6} fill="#2a201b" />
          <rect x={682} y={588} width={8} height={6} fill="#2a201b" />
          <ellipse cx={G.lamp.x} cy={470} rx={17} ry={4} fill="#1e1e26" />
          <rect x={G.lamp.x - 2.5} y={440} width={5} height={30} fill="#7c7e8c" />
        </g>
        {/* moon shaft + dust */}
        <polygon points={shaft} fill={`url(#shaft-${id})`} style={{mixBlendMode: 'screen'}} opacity={1 - lamp * 0.7} />
        {Array.from({length: 14}, (_, i) => {
          const t = s * 0.12 + hash(i * 5.3);
          const yy = lerp(Wn.y0 + 30, 640, (t * 0.6 + hash(i)) % 1);
          const xx = lerp(Wn.x0 + 30, Wn.x1 + 60, hash(i * 2.9)) + Math.sin(s * 0.8 + i) * 10 + (yy - Wn.y0) * 0.25;
          return <circle key={i} cx={xx} cy={yy} r={1.2 + hash(i * 1.7)} fill="#dfe6ff" opacity={0.25 * (1 - lamp * 0.6)} />;
        })}

        {/* ---- darkness, then light */}
        <rect x={-400} y={-200} width={1900} height={1100} fill="#04050b" opacity={dark} />
        <rect x={-400} y={-200} width={1900} height={1100} fill={`url(#lampglow-${id})`} style={{mixBlendMode: 'screen'}} />
        <rect x={-400} y={-200} width={1900} height={1100} fill={`url(#doorglow-${id})`} style={{mixBlendMode: 'screen'}} />
        {/* the lamp shade glows on top of the darkness */}
        <polygon points={`${G.lamp.x - 22},400 ${G.lamp.x + 22},400 ${G.lamp.x + 35},442 ${G.lamp.x - 35},442`} fill={mix('#3a3b46', '#fff1d2', lamp)} />
        <ellipse cx={G.lamp.x} cy={420} rx={60} ry={48} fill="#ffe2b0" opacity={0.5 * lamp} filter={`url(#blur8-${id})`} style={{mixBlendMode: 'screen'}} />

        {/* ---- shadows */}
        {lamp > 0.01 && (
          <g clipPath={`url(#wallclip-${id})`} opacity={0.5 * clamp(lamp)} filter={`url(#blur3-${id})`}>
            {inRoom.map((o) => (
              <g key={o.c.name} transform={`translate(${G.lamp.x} ${G.lamp.y - 30}) scale(1.38) translate(${-G.lamp.x} ${-G.lamp.y + 30}) translate(${(o.st.x - G.lamp.x) * 0.25} -14)`}>
                <Silhouette st={o.st} fill="#000" />
              </g>
            ))}
          </g>
        )}
        {hallL > 0.02 &&
          inRoom.map((o) => {
            const fy = o.st.foot;
            if (fy < G.wallY + 4) return null;
            const dx = o.st.x - 900, dy = fy - 470;
            const L = Math.hypot(dx, dy);
            const ux = dx / L, uy = dy / L;
            const k = 0.65;
            const m = `matrix(1 0 ${-k * ux} ${-k * uy} ${k * ux * fy} ${fy * (1 + k * uy)})`;
            return (
              <g key={o.c.name} transform={m} opacity={0.42 * hallL * Math.exp(-L / 500)} filter={`url(#blur3-${id})`}>
                <Silhouette st={o.st} fill="#000" />
              </g>
            );
          })}
        {inRoom.map((o) => (
          <ellipse key={o.c.name} cx={o.st.x} cy={o.st.foot + 2} rx={0.38 * o.st.px} ry={0.06 * o.st.px} fill="#000" opacity={o.st.foot > G.wallY + 4 ? 0.5 : 0.35} filter={`url(#blur3-${id})`} />
        ))}
        {/* glossy floor reflections */}
        {inRoom.map((o) => {
          const fy = o.st.foot;
          if (fy < G.wallY + 4 || Math.abs(o.st.rot) > 0.01) return null;
          return (
            <g key={o.c.name} transform={`matrix(1 0 0 -1 0 ${2 * fy + 4})`} opacity={0.1}>
              <Silhouette st={o.st} fill={mix(o.c.dark, o.c.base, lightFor(o.st.x, o.st.y))} />
            </g>
          );
        })}

        {/* ---- the people */}
        {inRoom.map(fig)}
        {/* time-lapse: a breath of cold blue light washes across */}
        {lapse > 0 && <rect x={-400} y={-200} width={1900} height={1100} fill="#6d86ff" opacity={0.06 * lapse} style={{mixBlendMode: 'screen'}} />}
      </g>
      <rect width={PW} height={PH} fill={`url(#vig-${id})`} />
    </svg>
  );
};

export const camOf = (side: Side, s: number) => {
  const cam = camera(side, s);
  const z = cam.z;
  const cx = clamp(cam.x, PW / (2 * z), PW - PW / (2 * z));
  const cy = clamp(cam.y, PH / (2 * z), PH - PH / (2 * z));
  return (p: [number, number]): [number, number] => [PW / 2 + (p[0] - cx) * z, PH / 2 + (p[1] - cy) * z];
};
export {kf};
