import React from 'react';
import {useCurrentFrame} from 'remotion';
import {boxFaces} from '../engine/box';
import {Cam, H, makeCam, project, projPoly, W} from '../engine/camera';
import {clamp, hash, invLerp, lerp, noise1, smooth, V3} from '../engine/math';
import {LEN} from '../engine/rig';
import {
  BD, BH, BrickState, bricksAt, cameraAt, COLLAPSE_SIM, fadeAt, figureAt, FigureState, heatAt, HOLE_SIM, HOLE_Y, lifeAt, SEAL_F,
  SIDE, THROWN, warmthAt,
} from '../engine/story';
import {SHOUTS, T} from '../timeline';

type Item = {d: number; el: React.ReactNode};
const rgb = (r: number, g: number, b: number) => `rgb(${Math.round(clamp(r, 0, 255))},${Math.round(clamp(g, 0, 255))},${Math.round(clamp(b, 0, 255))})`;

// ------------------------------------------------------------------ figure
const drawFigure = (c: Cam, fs: FigureState, mirror: boolean, heat: number, warmth: number): {d: number; el: React.ReactNode} | null => {
  const j = fs.joints;
  const W3 = (p: [number, number]): V3 => {
    const y = fs.y + p[1];
    return [fs.x + fs.facing * p[0], mirror ? -y : y, fs.z];
  };
  const P = (p: [number, number]) => project(c, W3(p));
  const hip = P(j.hip);
  if (hip.z < 0.3) return null;
  const v = 255 * fs.lum;
  const front = rgb(v, v, v);
  const back = rgb(v * 0.72, v * 0.72, v * 0.72);
  const sw = 0.09 * hip.s;
  const pl = (...ps: [number, number][]) => ps.map((p, i) => {
    const q = P(p);
    return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }).join('');
  const head = P(j.head);
  const r = LEN.headR * head.s;
  const strokes = (fr: string, bk: string, k = 1) => (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={pl(j.hip, j.lK, j.lF)} stroke={bk} strokeWidth={sw * k} />
      <path d={pl(j.sh, j.lE, j.lH)} stroke={bk} strokeWidth={sw * 0.92 * k} />
      <path d={pl(j.hip, j.neck)} stroke={fr} strokeWidth={sw * 1.1 * k} />
      <path d={pl(j.hip, j.rK, j.rF)} stroke={fr} strokeWidth={sw * k} />
      <path d={pl(j.sh, j.rE, j.rH)} stroke={fr} strokeWidth={sw * 0.92 * k} />
      <circle cx={head.x} cy={head.y} r={r * (k > 1 ? 1.15 : 1)} fill={fr} stroke="none" />
    </g>
  );
  // glow colour: fire red during the argument, clean white light at the end
  const gr = lerp(255, 255, warmth), gg = lerp(60, 250, clamp(warmth * 1.4)), gb = lerp(40, 245, clamp(warmth * 1.4));
  const hugK = smooth(invLerp(T.stepIn, T.hug, fs.t));
  const glowA = clamp(heat * 0.7 + warmth * (0.9 - 0.4 * hugK) + fs.shout * 0.4, 0, 1);
  // angry stress marks (as in the reference) at shout peaks
  let marks: React.ReactNode = null;
  if (!mirror && fs.shout > 0.05) {
    const a = j.headAng;
    const base: [number, number] = [j.head[0] + Math.sin(a) * 0.04 + Math.cos(a) * 0.12, j.head[1] + Math.cos(a) * 0.04];
    const lines = [-0.5, 0.1, 0.7].map((ang, i) => {
      const L0 = 0.07 + 0.05 * fs.shout, L1 = L0 + 0.08 * fs.shout;
      const dir: [number, number] = [Math.cos(ang - 0.3), Math.sin(-ang + 0.9)];
      const p0 = P([base[0] + dir[0] * L0, base[1] + dir[1] * L0]);
      const p1 = P([base[0] + dir[0] * L1, base[1] + dir[1] * L1]);
      return <path key={i} d={`M${p0.x} ${p0.y}L${p1.x} ${p1.y}`} stroke="#ff3b2f" strokeWidth={sw * 0.45} strokeLinecap="round" />;
    });
    marks = <g opacity={clamp(fs.shout * 1.4)} filter="url(#softGlow)">{lines}</g>;
  }
  return {
    d: hip.z,
    el: (
      <g key={`fig${fs.who}${mirror ? 'm' : ''}`}>
        {glowA > 0.02 ? <g filter="url(#figGlow)" opacity={glowA * (mirror ? 0.5 : 0.9)}>{strokes(rgb(gr, gg, gb), rgb(gr, gg, gb), 1.9 - 0.4 * hugK)}</g> : null}
        {strokes(front, back)}
        {marks}
      </g>
    ),
  };
};

// ------------------------------------------------------------------ brick
const drawBrick = (c: Cam, b: BrickState, f: number, mirror: boolean, heat: number, warmth: number, life: number): Item | null => {
  if (!b.visible || b.fade <= 0.001) return null;
  const center: V3 = mirror ? [b.p[0], -b.p[1], b.p[2]] : b.p;
  const rot: V3 = mirror ? [-b.r[0], b.r[1], -b.r[2]] : b.r;
  const faces = boxFaces(c, center, b.size, rot, [255, 255, 255], {amb: 0.3});
  if (!faces.length) return null;
  const pc = project(c, center);
  const fireLight = heat * clamp(1 - b.p[1] / 2.8) * 70;
  const holeD = Math.hypot(b.p[0], b.p[1] - HOLE_Y);
  const whiteLight = warmth * 70 * Math.exp(-holeD * 0.8);
  const g = lerp(118, 150, life);
  const els = faces.map((fc, i) => {
    const sh = fc.shade;
    let r = g * sh + fireLight * (0.5 + 0.5 * sh) + whiteLight * sh;
    let gg = g * sh + fireLight * 0.18 + whiteLight * sh;
    let bb = g * sh * 1.02 + fireLight * 0.1 + whiteLight * sh;
    // incandescent: thrown words are red-hot and cool into grey stone
    const hot = b.hot;
    r = lerp(r, 255 * (0.75 + 0.25 * sh), hot);
    gg = lerp(gg, (70 + 120 * sh) * (fc.isTop ? 1.1 : 0.85), hot);
    bb = lerp(bb, 40 * sh, hot);
    return <polygon key={i} points={fc.pts} fill={rgb(r, gg, bb)} stroke={rgb(r * 0.55, gg * 0.55, bb * 0.55)} strokeWidth={0.6} strokeLinejoin="round" />;
  });
  const front = faces.find((fc) => Math.abs(fc.normal[2] + 1) < 0.35);
  const crack = b.crack * (1 - smooth(invLerp(T.collapse + 10, T.collapse + 60, f)));
  return {
    d: pc.z,
    el: (
      <g key={`b${b.id}${mirror ? 'm' : ''}`} opacity={b.fade}>
        {b.hot > 0.04 && !mirror ? (
          <circle cx={pc.x} cy={pc.y} r={BH * 1.3 * pc.s} fill="#ff3a1a" opacity={0.4 * b.hot} filter="url(#bigBlur)" />
        ) : null}
        {els}
        {crack > 0.01 && front && !mirror ? (
          <polygon points={front.pts} fill="none" stroke="#fffaf0" strokeWidth={2.4} opacity={crack} filter="url(#softGlow)" />
        ) : null}
      </g>
    ),
  };
};

// ------------------------------------------------------------------ flames
const FL_N = 46;
const drawFlames = (c: Cam, f: number, heat: number, z: number, layer: number, mirror: boolean) => {
  if (heat < 0.01) return null;
  const paths: React.ReactNode[] = [];
  for (let i = 0; i < FL_N; i++) {
    const h0 = hash(i * 3.7 + layer * 11);
    const x = -2.4 + (4.8 * (i + 0.5 * h0)) / FL_N;
    const env = 1 - smooth((Math.abs(x) - 1.2) / 1.1);
    const flick = 0.55 + 0.45 * noise1(f * (0.28 + 0.1 * h0) + i * 7.1, layer) + 0.25 * noise1(f * 0.9 + i, layer + 4);
    const hw = (0.22 + 0.42 * hash(i * 1.3 + layer)) * env * flick * heat * (layer === 1 ? 1.1 : 0.85);
    if (hw < 0.02) continue;
    const base = project(c, [x, 0, z]);
    if (base.z < 0.3) continue;
    const Hpx = hw * base.s * (mirror ? -0.8 : 1);
    const Wpx = (0.1 + 0.08 * h0) * base.s * (0.7 + 0.3 * flick);
    const sway = noise1(f * 0.18 + i * 2.3, layer + 8) * Wpx * 0.9;
    const tipX = base.x + sway, tipY = base.y - Hpx;
    const d = `M${(base.x - Wpx / 2).toFixed(1)} ${base.y.toFixed(1)}Q${(base.x - Wpx * 0.55 + sway * 0.3).toFixed(1)} ${(base.y - Hpx * 0.5).toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}Q${(base.x + Wpx * 0.5 + sway * 0.4).toFixed(1)} ${(base.y - Hpx * 0.45).toFixed(1)} ${(base.x + Wpx / 2).toFixed(1)} ${base.y.toFixed(1)}Z`;
    paths.push(<path key={i} d={d} fill={mirror ? 'url(#flameGradM)' : 'url(#flameGrad)'} />);
  }
  const b0 = project(c, [-2.2, 0, z]), b1 = project(c, [2.2, 0, z]), bm = project(c, [0, 0, z]);
  return (
    <g style={{mixBlendMode: 'screen'}}>
      <ellipse cx={bm.x} cy={bm.y} rx={(b1.x - b0.x) / 2} ry={0.07 * bm.s} fill="#ff6a2a" opacity={0.55 * Math.min(1, heat)} filter="url(#bigBlur)" />
      <g filter="url(#flameBloom)" opacity={0.9}>{paths}</g>
      <g opacity={mirror ? 0.6 : 1}>{paths}</g>
    </g>
  );
};

// ------------------------------------------------------------------ particles
const embers = (c: Cam, f: number) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 70; i++) {
    const period = 40 + 40 * hash(i * 2.1);
    const ph = (f + hash(i) * period) / period;
    const k = Math.floor(ph);
    const t = ph - k;
    const birth = f - t * period;
    const hb = heatAt(Math.max(0, birth));
    if (hb < 0.05) continue;
    const x0 = (hash(i * 9.1 + k) - 0.5) * 3.6;
    const p = project(c, [x0 + noise1(f * 0.05 + i, 3) * 0.25, t * (0.9 + 1.4 * hash(i * 4 + k)), (hash(i * 5 + k) - 0.5) * 1.2]);
    if (p.z < 0.3) continue;
    const a = hb * Math.sin(Math.PI * t) * (0.5 + 0.5 * Math.sin(f * 0.7 + i));
    out.push(<circle key={i} cx={p.x} cy={p.y} r={Math.max(1.2, 0.012 * p.s)} fill={t < 0.4 ? '#ffd27a' : '#ff5a26'} opacity={a} />);
  }
  return <g filter="url(#softGlow)">{out}</g>;
};

const smoke = (c: Cam, f: number) => {
  const t0 = SEAL_F + 6;
  if (f < t0 || f > t0 + 120) return null;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const st = t0 + hash(i * 7) * 30;
    const t = (f - st) / 90;
    if (t <= 0 || t >= 1) continue;
    const x = (hash(i * 3.3) - 0.5) * 3.4;
    const p = project(c, [x + noise1(f * 0.03 + i, 2) * 0.3, 0.1 + t * 1.6, (hash(i) - 0.5) * 0.8]);
    out.push(<circle key={i} cx={p.x} cy={p.y} r={(0.12 + 0.3 * t) * p.s} fill="#9a9a9a" opacity={0.16 * Math.sin(Math.PI * t)} />);
  }
  return <g filter="url(#bigBlur)">{out}</g>;
};

type Puff = {f: number; p: V3; n: number; power: number; hot: boolean};
const PUFFS: Puff[] = [
  ...THROWN.map((b) => ({f: Math.round(b.land), p: [b.slot.x, b.slot.y, -BD / 2] as V3, n: b.shout === 0 || b === THROWN[THROWN.length - 1] ? 26 : 7, power: b.shout === 0 || b === THROWN[THROWN.length - 1] ? 1.6 : 0.7, hot: true})),
  ...[...HOLE_SIM, ...COLLAPSE_SIM].flatMap((s) => s.hits.slice(0, 1).map((hf) => {
    const st = s.states[hf - s.start];
    return {f: hf, p: [st.p[0], 0.02, st.p[2]] as V3, n: 6, power: 0.6, hot: false};
  })),
];
const dust = (c: Cam, f: number, warmth: number) => {
  const out: React.ReactNode[] = [];
  PUFFS.forEach((pf, pi) => {
    const dt = (f - pf.f) / 30;
    if (dt < 0 || dt > 0.9) return;
    for (let k = 0; k < pf.n; k++) {
      const a = hash(pi * 31 + k) * Math.PI * 2;
      const sp = (0.4 + hash(pi * 7 + k * 3) * 1.4) * pf.power;
      const vx = Math.cos(a) * sp, vy = Math.abs(Math.sin(a)) * sp * 0.9 + 0.3, vz = (hash(k + pi) - 0.5) * sp;
      const drag = 1 - Math.exp(-dt * 4);
      const p = project(c, [pf.p[0] + vx * drag / 4, pf.p[1] + (vy * drag) / 4 - 0.6 * dt * dt, pf.p[2] + (vz * drag) / 4]);
      if (p.z < 0.3) continue;
      const life = 1 - dt / 0.9;
      const spark = pf.hot && k % 2 === 0;
      out.push(
        <circle key={`${pi}_${k}`} cx={p.x} cy={p.y} r={Math.max(1, (spark ? 0.008 : 0.016 + 0.03 * dt) * p.s)}
          fill={spark ? '#ffcf70' : warmth > 0.3 ? '#e8e8e8' : '#8a8a8a'} opacity={(spark ? 0.95 : 0.35) * life} />,
      );
    }
  });
  return <g filter="url(#softGlow)">{out}</g>;
};

// bricks dissolving into rising light
const motes = (c: Cam, f: number, bricks: BrickState[]) => {
  if (f < T.dissolve - 2) return null;
  const out: React.ReactNode[] = [];
  bricks.forEach((b) => {
    const st = T.dissolve + hash(b.id) * 25;
    for (let k = 0; k < 4; k++) {
      const t = (f - st - k * 3) / 70;
      if (t <= 0 || t >= 1) continue;
      const p = project(c, [b.p[0] + (hash(b.id * 3 + k) - 0.5) * 0.3 + noise1(f * 0.04 + k + b.id, 1) * 0.15, b.p[1] + t * (1.2 + hash(b.id + k * 9) * 1.6), b.p[2]]);
      if (p.z < 0.3) continue;
      out.push(<circle key={`${b.id}_${k}`} cx={p.x} cy={p.y} r={Math.max(1.2, 0.011 * p.s)} fill="#fffbe8" opacity={Math.sin(Math.PI * t) * 0.9} />);
    }
  });
  return <g filter="url(#softGlow)">{out}</g>;
};

// ------------------------------------------------------------------ words: each shout is a word that hardens into a brick
const words = (c: Cam, f: number) => {
  const out: React.ReactNode[] = [];
  SHOUTS.forEach((s, si) => {
    const b = THROWN.find((t) => t.shout === si && t.word)!;
    const t0 = s.f - 1, t1 = b.launch + 2;
    if (f < t0 || f > t1 + 1) return;
    const p = project(c, b.from);
    if (p.z < 0.3) return;
    const pop = smooth((f - t0) / 4);
    const squeeze = smooth((f - (b.launch - 1)) / 3);
    const fs = Math.max(si === 0 ? 0 : 50, 0.105 * p.s * (si === 0 ? 1.0 : 1.15));
    const sx = lerp(1, 0.35, squeeze) * (0.6 + 0.4 * pop + 0.08 * Math.sin(Math.min(1, (f - t0) / 6) * Math.PI));
    const sy = lerp(1, 0.25, squeeze) * (0.6 + 0.4 * pop);
    const dx = SIDE[s.who] * -0.25 * p.s * (1 - pop) ;
    const jitter = noise1(f * 1.3, si) * 0.012 * p.s;
    out.push(
      <g key={si} transform={`translate(${(p.x + dx + jitter).toFixed(1)} ${(p.y - 0.06 * p.s).toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`} opacity={1 - squeeze * 0.9}>
        <text textAnchor="middle" dominantBaseline="middle" fontFamily="Montserrat" fontWeight={800} fontSize={fs} fill="#ff4a22" filter="url(#wordGlow)" letterSpacing={fs * 0.02}>{s.word}</text>
        <text textAnchor="middle" dominantBaseline="middle" fontFamily="Montserrat" fontWeight={800} fontSize={fs} fill="#fff1d6" letterSpacing={fs * 0.02}>{s.word}</text>
      </g>,
    );
    // shockwave arcs from the mouth
    const sw = (f - s.f) / 10;
    if (sw > 0 && sw < 1) {
      const fsx = s.who === 'A' ? 1 : -1;
      const m = project(c, [SIDE[s.who] * (0.95 - 0.2), 1.72, 0]);
      for (let k = 0; k < 2; k++) {
        const rr = (0.08 + sw * 0.32 + k * 0.08) * m.s;
        const a0 = -0.7, a1 = 0.7;
        const pa = [m.x + fsx * Math.cos(a0) * rr, m.y + Math.sin(a0) * rr];
        const pb = [m.x + fsx * Math.cos(a1) * rr, m.y + Math.sin(a1) * rr];
        out.push(<path key={`sw${si}${k}`} d={`M${pa[0]} ${pa[1]}A${rr} ${rr} 0 0 ${fsx > 0 ? 1 : 0} ${pb[0]} ${pb[1]}`} stroke="#ff4b2b" strokeWidth={Math.max(2, 0.012 * m.s)} fill="none" opacity={(1 - sw) * 0.8} filter="url(#softGlow)" />);
      }
    }
  });
  return out;
};

// ------------------------------------------------------------------ main
export const World: React.FC = () => {
  const f = useCurrentFrame();
  const cs = cameraAt(f);
  const c = makeCam(cs.pos, cs.tgt, cs.F, cs.roll);
  const heat = heatAt(f);
  const warmth = warmthAt(f);
  const life = lifeAt(f);
  const bricks = bricksAt(f);
  const figs = [figureAt('A', f), figureAt('B', f)];

  // background light pools
  const glowC = project(c, [0, 1.0, 0.4]);
  const holeC = project(c, [0, f < T.collapse + 40 ? HOLE_Y : lerp(HOLE_Y, 1.25, smooth(invLerp(T.collapse + 40, T.hug, f))), 0]);
  const floor = projPoly(c, [[-9, 0, -3], [9, 0, -3], [9, 0, 14], [-9, 0, 14]]);
  const floorC = project(c, [0, 0, 0]);

  // main items (depth sorted)
  const items: Item[] = [];
  bricks.forEach((b) => { const it = drawBrick(c, b, f, false, heat, warmth, life); if (it) items.push(it); });
  figs.forEach((fs) => { const it = drawFigure(c, fs, false, heat, warmth); if (it) items.push({d: it.d - 0.02, el: it.el}); });
  items.sort((a, b) => b.d - a.d);

  const mItems: Item[] = [];
  bricks.forEach((b) => { const it = drawBrick(c, b, f, true, heat, warmth, life); if (it) mItems.push(it); });
  figs.forEach((fs) => { const it = drawFigure(c, fs, true, heat, warmth); if (it) mItems.push({d: it.d, el: it.el}); });
  mItems.sort((a, b) => b.d - a.d);

  // the wall's core: fire glows through the mortar joints, later the light of reconciliation does
  const walled = bricks.filter((b) => b.visible && !b.flying);
  const topY = walled.length ? Math.max(...walled.map((b) => b.p[1])) + BH / 2 : 0;
  const coreA = f < T.collapse + 20 ? 1 : 1 - smooth(invLerp(T.collapse + 20, T.collapse + 40, f));
  const core = topY > 0.05 && coreA > 0 ? projPoly(c, [[-0.26, 0.005, 0.1], [0.26, 0.005, 0.1], [0.26, Math.min(topY, 2.37) - 0.005, 0.1], [-0.26, Math.min(topY, 2.37) - 0.005, 0.1]]) : null;
  const holeOpen = smooth(invLerp(T.pushA + 6, T.pushEnd, f));
  const crackR = 0.02 + 0.38 * holeOpen + 2.0 * smooth(invLerp(T.touch, T.collapse + 6, f));

  const groundTone = 0.6 * heat + 0.5 * warmth;
  const fade = fadeAt(f);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="fireBg" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ff2a10" stopOpacity={0.55} />
          <stop offset="0.45" stopColor="#8a0c04" stopOpacity={0.35} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="lightBg" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="0.35" stopColor="#d9dce6" stopOpacity={0.18} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="floorG" gradientUnits="userSpaceOnUse" cx={floorC.x} cy={floorC.y} r={2.6 * floorC.s}>
          <stop offset="0" stopColor={rgb(30 + 120 * heat + 50 * warmth, 16 + 15 * heat + 50 * warmth, 14 + 8 * heat + 52 * warmth)} />
          <stop offset="0.5" stopColor={rgb(8 + 30 * heat + 10 * warmth, 6 + 4 * heat + 10 * warmth, 6 + 10 * warmth)} />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff6d0" />
          <stop offset="0.18" stopColor="#ffc35a" />
          <stop offset="0.45" stopColor="#ff5a1e" />
          <stop offset="0.8" stopColor="#c8160a" stopOpacity={0.7} />
          <stop offset="1" stopColor="#600000" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="flameGradM" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb050" />
          <stop offset="0.4" stopColor="#e2401a" />
          <stop offset="1" stopColor="#600000" stopOpacity={0} />
        </linearGradient>
        <radialGradient id="coreG" gradientUnits="userSpaceOnUse" cx={holeC.x} cy={holeC.y} r={Math.max(1, crackR * holeC.s)}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#f4f1ea" stopOpacity={0.9} />
          <stop offset="1" stopColor="#f4f1ea" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="reflMaskG" gradientUnits="userSpaceOnUse" x1={0} y1={floorC.y} x2={0} y2={floorC.y + 1.1 * floorC.s}>
          <stop offset="0" stopColor="#fff" stopOpacity={0.6} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id="reflMask" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <rect x={0} y={floorC.y - 400} width={W} height={H} fill="url(#reflMaskG)" />
        </mask>
        <filter id="figGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={14} /></filter>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={3} result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="wordGlow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation={9} /></filter>
        <filter id="bigBlur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={22} /></filter>
        <filter id="flameBloom" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation={10} /></filter>
        <filter id="reflBlur"><feGaussianBlur stdDeviation={2.5} /></filter>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={1} seed={f % 9} />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0" />
        </filter>
        <radialGradient id="vig" cx="50%" cy="48%" r="75%">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.85} />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="#000" />
      <g opacity={fade}>
        {/* light pools */}
        {heat > 0.01 ? <ellipse cx={glowC.x} cy={glowC.y} rx={2.6 * glowC.s} ry={2.0 * glowC.s} fill="url(#fireBg)" opacity={Math.min(1, heat * 1.05)} /> : null}
        {warmth > 0.01 ? <ellipse cx={holeC.x} cy={holeC.y} rx={(1.2 + warmth) * holeC.s} ry={(1.2 + warmth) * holeC.s} fill="url(#lightBg)" opacity={Math.min(1, warmth)} /> : null}
        {floor ? <polygon points={floor} fill="url(#floorG)" /> : null}
        <path d={`M0 ${floorC.y}L${W} ${floorC.y}`} stroke={rgb(40 + 140 * groundTone, 40 + 60 * groundTone, 40 + 60 * groundTone)} strokeWidth={1} opacity={0.35} />

        {/* reflection on glossy floor */}
        <g mask="url(#reflMask)">
          <g filter="url(#reflBlur)" opacity={0.75}>
            {drawFlames(c, f, heat, 0.35, 0, true)}
            {mItems.map((it) => it.el)}
            {drawFlames(c, f, heat, -0.3, 1, true)}
          </g>
        </g>

        {drawFlames(c, f, heat, 0.38, 0, false)}
        {core ? (
          <g opacity={coreA}>
            <polygon points={core} fill={rgb(60 + 200 * heat, 10 + 30 * heat, 5)} opacity={0.5 * heat} />
            {f >= T.pushA ? <polygon points={core} fill="url(#coreG)" /> : null}
          </g>
        ) : null}
        {items.map((it) => it.el)}
        {/* light spilling through the opened hole */}
        {holeOpen > 0.02 && f < T.collapse + 30 ? (() => {
          const a = project(c, [0, HOLE_Y, -0.12]);
          const k = holeOpen * (1 - smooth(invLerp(T.collapse, T.collapse + 30, f)));
          return (
            <g style={{mixBlendMode: 'screen'}}>
              <ellipse cx={a.x} cy={a.y} rx={0.45 * a.s} ry={0.12 * a.s} fill="#fff8ec" opacity={0.55 * k} filter="url(#bigBlur)" />
              <ellipse cx={a.x} cy={a.y} rx={0.2 * a.s} ry={0.045 * a.s} fill="#ffffff" opacity={0.7 * k} filter="url(#softGlow)" />
            </g>
          );
        })() : null}
        {f >= T.touch - 1 && f < T.touch + 26 ? (() => {
          const a = project(c, [0, HOLE_Y, -0.15]);
          const t = (f - T.touch + 1) / 26;
          return <circle cx={a.x} cy={a.y} r={(0.05 + 0.55 * Math.sqrt(t)) * a.s} fill="none" stroke="#fff" strokeWidth={Math.max(1.5, 0.02 * a.s * (1 - t))} opacity={1 - t} filter="url(#softGlow)" />;
        })() : null}
        {words(c, f)}
        {drawFlames(c, f, heat, -0.32, 1, false)}
        {embers(c, f)}
        {smoke(c, f)}
        {dust(c, f, warmth)}
        {motes(c, f, bricks)}
      </g>
      <rect width={W} height={H} fill="url(#vig)" />
      <rect width={W} height={H} filter="url(#grain)" opacity={0.045} />
      {/* hook flash */}
      {f >= T.hookLand && f < T.hookLand + 6 ? <rect width={W} height={H} fill="#ff5a2a" opacity={0.28 * (1 - (f - T.hookLand) / 6)} style={{mixBlendMode: 'screen'}} /> : null}
      {f >= SEAL_F && f < SEAL_F + 8 ? <rect width={W} height={H} fill="#ff7040" opacity={0.3 * (1 - (f - SEAL_F) / 8)} style={{mixBlendMode: 'screen'}} /> : null}
    </svg>
  );
};
