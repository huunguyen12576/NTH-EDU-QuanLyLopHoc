import React from 'react';
import {useCurrentFrame} from 'remotion';
import {boxFaces} from '../engine/box';
import {Cam, depth, H, makeCam, project, projPoly, projSeg, W} from '../engine/camera';
import {clamp, hash, hash2, invLerp, smooth, V3} from '../engine/math';
import {LEN} from '../engine/rig';
import {
  brickAt, bridge, CELL, cameraAt, cellIx, clothAt, crumbleEvents, crumbleTime, DEPTH, FigureState, figuresAt, focusAt,
  IXMAX, IZMAX, rowEdge, XMIN,
} from '../engine/world';
import {T} from '../timeline';

const EVENTS = crumbleEvents();
const RED = [226, 34, 44];

type Item = {key: number; el: React.ReactNode; blur?: number};

const fogLum = (d: number) => 1 - 0.66 * smooth((d - 3.2) / 15);

// ------------------------------------------------------------------ figure
const figureWorld = (fs: FigureState, p: [number, number], mirror = false): V3 => {
  const y = fs.y + p[1];
  return [fs.x + fs.facing * p[0], mirror ? -y : y, fs.z];
};

const drawFigure = (c: Cam, fs: FigureState, f: number, key: string, mirror = false): React.ReactNode => {
  const j = fs.joints;
  const P = (p: [number, number]) => project(c, figureWorld(fs, p, mirror));
  const hip = P(j.hip);
  if (hip.z < 0.3) return null;
  const d = hip.z;
  const fallFade = fs.falling ? clamp(1 + (fs.y - 0.9) / 7.5) : 1;
  const lum = clamp(fogLum(d) * fs.bright * (fs.hero ? 1 : 0.97), 0, 1.2);
  const v = Math.round(255 * Math.min(1, lum));
  const vb = Math.round(255 * Math.min(1, lum * 0.74));
  const front = `rgb(${v},${v},${v})`;
  const back = `rgb(${vb},${vb},${vb})`;
  const sw = 0.088 * hip.s;
  const pl = (...ps: [number, number][]) => ps.map((p, i) => {
    const q = P(p);
    return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  }).join('');
  const head = P(j.head);
  const r = LEN.headR * head.s;

  // blindfold band in head-local frame
  let band: React.ReactNode = null;
  if (fs.blind > 0) {
    const a = j.headAng;
    const upv: [number, number] = [Math.sin(a), Math.cos(a)];
    const fw: [number, number] = [Math.cos(a), -Math.sin(a)];
    const c0: [number, number] = [j.head[0] + upv[0] * 0.012 + fs.bandShift[0], j.head[1] + upv[1] * 0.012 + fs.bandShift[1]];
    const hw = LEN.headR * 1.06, hh = 0.038;
    const corner = (sx: number, sy: number): [number, number] => [c0[0] + fw[0] * hw * sx + upv[0] * hh * sy, c0[1] + fw[1] * hw * sx + upv[1] * hh * sy];
    const quad = [corner(-1, 1), corner(1, 1.15), corner(1, -0.85), corner(-1, -1)].map(P);
    const knot = P([c0[0] - fw[0] * hw * 1.02, c0[1] - fw[1] * hw * 1.02]);
    // tails stream behind, in world space
    const kw = figureWorld(fs, [c0[0] - fw[0] * hw * 1.02, c0[1] - fw[1] * hw * 1.02], mirror);
    const tails = [0, 1].map((ti) => {
      const pts: string[] = [`M${knot.x.toFixed(1)} ${knot.y.toFixed(1)}`];
      for (let k = 1; k <= 4; k++) {
        const ph = f * (fs.falling ? 0.9 : 0.32) + k * 1.2 + ti * 2.1 + fs.seed * 10;
        const lift = fs.falling ? 0.07 * k : -0.028 * k - ti * 0.012 * k;
        const wp: V3 = [kw[0] - fs.facing * 0.055 * k, kw[1] + (mirror ? -lift : lift) + 0.018 * Math.sin(ph), kw[2] + 0.01 * k * (ti ? 1 : -1)];
        const q = project(c, wp);
        pts.push(`L${q.x.toFixed(1)} ${q.y.toFixed(1)}`);
      }
      return pts.join('');
    });
    const lr = Math.min(1, fogLum(d) * (fs.hero ? 1 : 0.9 + 0.1 * fs.bright));
    const red = `rgb(${Math.round(RED[0] * lr)},${Math.round(RED[1] * lr)},${Math.round(RED[2] * lr)})`;
    const hi = `rgba(255,${Math.round(150 * lr)},${Math.round(150 * lr)},${0.55 * lr})`;
    band = (
      <g opacity={fs.blind}>
        {tails.map((t, i) => (
          <path key={i} d={t} stroke={red} strokeWidth={sw * (i ? 0.45 : 0.55)} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <polygon points={quad.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')} fill={red} />
        <path d={`M${quad[0].x} ${quad[0].y}L${quad[1].x} ${quad[1].y}`} stroke={hi} strokeWidth={sw * 0.28} strokeLinecap="round" transform={`translate(0 ${(sw * 0.4).toFixed(1)})`} />
        <circle cx={knot.x} cy={knot.y} r={sw * 0.42} fill={red} />
      </g>
    );
  }

  const limbs = (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={pl(j.hip, j.lK, j.lF)} stroke={back} strokeWidth={sw} />
      <path d={pl(j.sh, j.lE, j.lH)} stroke={back} strokeWidth={sw * 0.92} />
      <path d={pl(j.hip, j.neck)} stroke={front} strokeWidth={sw * 1.08} />
      <path d={pl(j.hip, j.rK, j.rF)} stroke={front} strokeWidth={sw} />
      <path d={pl(j.sh, j.rE, j.rH)} stroke={front} strokeWidth={sw * 0.92} />
      <circle cx={head.x} cy={head.y} r={r} fill={front} stroke="none" />
    </g>
  );
  return (
    <g key={key} opacity={fallFade}>
      {fs.glow > 0 && !mirror ? (
        <g filter="url(#glow)" opacity={0.75 * fs.glow}>{limbs}</g>
      ) : null}
      {limbs}
      {band}
    </g>
  );
};

// ------------------------------------------------------------------ main
export const World3D: React.FC = () => {
  const f = useCurrentFrame();
  const cs = cameraAt(f);
  const c = makeCam(cs.pos, cs.tgt, cs.F, cs.roll);
  const focus = focusAt(f);
  const blurOf = (d: number) => {
    const coc = Math.abs(1 / Math.max(0.3, d) - 1 / focus.dist) * focus.aperture;
    return coc < 0.6 ? 0 : coc < 1.6 ? 1 : coc < 3 ? 2 : coc < 5 ? 3 : 4;
  };

  const figs = figuresAt(f);
  const hero = figs.find((x) => x.hero)!;

  const below: Item[] = [];
  const above: Item[] = [];
  const refl: React.ReactNode[] = [];
  const defs: React.ReactNode[] = [];

  // ---------------- platform: per-row geometry
  const edges: number[] = [];
  for (let iz = 0; iz <= IZMAX; iz++) edges.push(rowEdge(iz, f));
  const floorPolys: string[] = [];
  let joints = '';
  let mortar = '';
  let mortarHi = '';
  for (let iz = 0; iz <= IZMAX; iz++) {
    const z0 = iz * CELL, z1 = z0 + CELL;
    const e = edges[iz];
    if (e <= XMIN) continue;
    const poly = projPoly(c, [[XMIN, 0, z0], [e, 0, z0], [e, 0, z1], [XMIN, 0, z1]]);
    if (poly) floorPolys.push(poly);
    // top joints (staggered bricks)
    const off = iz % 2 ? CELL / 2 : 0;
    for (let x = XMIN + off; x < e - 0.01; x += CELL) joints += projSeg(c, [x, 0, z0], [x, 0, z1]);
    joints += projSeg(c, [XMIN, 0, z0], [Math.max(e, iz > 0 ? edges[iz - 1] : e), 0, z0]);

    // exposed front face
    const prevE = iz === 0 ? XMIN : edges[iz - 1];
    if (e > prevE + 0.001) {
      const x0 = prevE, x1 = e;
      const pts = projPoly(c, [[x0, 0, z0], [x1, 0, z0], [x1, -DEPTH, z0], [x0, -DEPTH, z0]]);
      if (pts) {
        const ptop = project(c, [(x0 + x1) / 2, 0, z0]);
        const pbot = project(c, [(x0 + x1) / 2, -DEPTH, z0]);
        const gid = `ff${iz}`;
        defs.push(
          <linearGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" x1={0} y1={ptop.y} x2={0} y2={pbot.y}>
            <stop offset="0" stopColor="#2b2b2b" />
            <stop offset="0.12" stopColor="#1b1b1b" />
            <stop offset="0.6" stopColor="#0a0a0a" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>,
        );
        let m = '', mh = '';
        for (let k = 1; k <= 9; k++) {
          const y = -0.3 * k;
          m += projSeg(c, [x0, y, z0], [x1, y, z0]);
          mh += projSeg(c, [x0, y - 0.012, z0], [x1, y - 0.012, z0]);
        }
        for (let k = 0; k < 9; k++) {
          const ya = -0.3 * k, yb = -0.3 * (k + 1);
          const o = (k + iz) % 2 ? CELL / 2 : 0;
          const startX = Math.ceil((x0 - o) / CELL) * CELL + o;
          for (let x = startX; x < x1 - 0.02; x += CELL) if (x > x0 + 0.02) m += projSeg(c, [x, ya, z0], [x, yb, z0]);
        }
        below.push({
          key: z0 + 0.0001,
          el: (
            <g key={`ff${iz}`}>
              <polygon points={pts} fill={`url(#${gid})`} />
              <path d={m} stroke="#000" strokeWidth={2.2} opacity={0.8} />
              <path d={mh} stroke="#3a3a3a" strokeWidth={1} opacity={0.35} />
              <path d={projSeg(c, [x0, 0, z0], [x1, 0, z0])} stroke="#8a8a8a" strokeWidth={1.6} opacity={0.75} />
            </g>
          ),
        });
      }
    }
    // exposed side face (only visible when camera is to the right of the edge)
    if (c.pos[0] > e + 0.01 && e < (IXMAX + 1) * CELL) {
      const pts = projPoly(c, [[e, 0, z0], [e, 0, z1], [e, -DEPTH, z1], [e, -DEPTH, z0]]);
      if (pts) {
        const gid = `sf${iz}`;
        const ptop = project(c, [e, 0, z0 + 0.3]);
        const pbot = project(c, [e, -DEPTH, z0 + 0.3]);
        defs.push(
          <linearGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" x1={0} y1={ptop.y} x2={0} y2={pbot.y}>
            <stop offset="0" stopColor="#1e1e1e" />
            <stop offset="0.5" stopColor="#070707" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>,
        );
        below.push({
          key: z0 + 0.3 + 0.01,
          el: (
            <g key={`sf${iz}`}>
              <polygon points={pts} fill={`url(#${gid})`} />
              <path d={projSeg(c, [e, 0, z0], [e, 0, z1])} stroke="#6a6a6a" strokeWidth={1.2} opacity={0.6} />
            </g>
          ),
        });
      }
    }
  }
  void mortar; void mortarHi;

  // ---------------- crumbling bricks & dust
  for (const ev of EVENTS) {
    if (ev.f > f || ev.f < f - 75) continue;
    const t = (f - ev.f) / 30;
    const cx = (ev.ix + 0.5) * CELL, cz = (ev.iz + 0.5) * CELL;
    const slow = ev.ix === 4 && ev.iz === 0 ? 0.6 : 1; // the hook brick falls in slow motion
    const ts = t * slow;
    const dy = -0.5 * 9.8 * ts * ts;
    const s = hash2(ev.ix, ev.iz);
    const fog = clamp(1 + dy / 6);
    if (fog <= 0.02) continue;
    // body of the column (front face visible) — falls first
    const bodyDy = -0.5 * 9.8 * (ts + 0.05) * (ts + 0.05) + 0.5 * 9.8 * 0.0025;
    boxFaces(c, [cx, -0.3 - (DEPTH - 0.3) / 2 + bodyDy, cz], [CELL * 0.99, DEPTH - 0.3, CELL * 0.99], [0, 0, 0], [34, 34, 34], {fog: fog * 0.9, amb: 0.5}).forEach((fc, i) =>
      below.push({key: cz + 0.02 - i * 1e-4, el: <polygon key={`b${ev.ix}_${ev.iz}_${i}`} points={fc.pts} fill={fc.fill} />}),
    );
    // top cap brick — tumbles
    const rot: V3 = [ts * (1.5 + s * 2) * (s > 0.5 ? 1 : -1), ts * 0.8 * (s - 0.5), -ts * (1.2 + s * 1.5)];
    boxFaces(c, [cx + ts * 0.35, -0.14 + dy, cz], [CELL * 0.96, 0.28, CELL * 0.96], rot, [70, 70, 70], {fog, topBoost: 1.25}).forEach((fc, i) =>
      below.push({key: cz - 0.01 - i * 1e-4, el: <polygon key={`t${ev.ix}_${ev.iz}_${i}`} points={fc.pts} fill={fc.fill} stroke="#5a5a5a" strokeWidth={0.6} strokeOpacity={0.5} />}),
    );
    // dust
    if (t < 1.4) {
      const dots: React.ReactNode[] = [];
      for (let k = 0; k < 8; k++) {
        const h1 = hash2(ev.ix * 13 + k, ev.iz * 7), h2 = hash2(k * 3.3, ev.ix + ev.iz * 31), h3 = hash(k * 9.1 + ev.ix * 1.7 + ev.iz);
        const vx = (h1 - 0.3) * 1.3, vy = 0.4 + h2 * 1.4, vz = (h3 - 0.5) * 0.8;
        const p: V3 = [cx - CELL / 2 + h3 * CELL + vx * t, vy * t - 0.5 * 6 * t * t + 0.02, cz - CELL / 2 + h1 * CELL + vz * t];
        const q = project(c, p);
        if (q.z < 0.3) continue;
        const a = clamp(1 - t / 1.4) * 0.8;
        dots.push(<circle key={k} cx={q.x} cy={q.y} r={Math.max(0.6, (0.008 + 0.014 * h2) * q.s)} fill="#cfcfcf" opacity={a} />);
      }
      above.push({key: depth(c, [cx, 0, cz]) - 0.01, el: <g key={`d${ev.ix}_${ev.iz}`}>{dots}</g>});
    }
  }

  // ---------------- the hook crack
  let crack: React.ReactNode = null;
  if (f >= T.hookCrack && f < T.hookDrop) {
    const cx = 4 * CELL, cz = 0;
    const flick = 0.5 + 0.5 * Math.sin(f * 2.3);
    const pts: V3[] = [[cx + 0.05, 0, cz + 0.6], [cx + 0.12, 0, cz + 0.42], [cx + 0.06, 0, cz + 0.28], [cx + 0.14, 0, cz + 0.12], [cx + 0.08, 0, cz], [cx + 0.11, -0.12, cz], [cx + 0.05, -0.3, cz]];
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) d += projSeg(c, pts[i], pts[i + 1]);
    crack = <path d={d} stroke="#fff" strokeWidth={2} opacity={0.5 + 0.5 * flick} filter="url(#glow)" fill="none" />;
  }

  // ---------------- figures
  for (const fs of figs) {
    const hp = project(c, [fs.x, fs.y, fs.z]);
    if (hp.z < 0.4) continue;
    // cull off-screen
    if (hp.x < -400 || hp.x > W + 400 || hp.y < -600 || hp.y > H + 900) continue;
    const el = drawFigure(c, fs, f, `fig${fs.id}`);
    const d = depth(c, [fs.x, fs.y, fs.z]);
    if (fs.falling) below.push({key: fs.z, el, blur: blurOf(d)});
    else {
      above.push({key: d, el, blur: fs.hero && f > T.heroStop ? Math.min(1, blurOf(d)) : blurOf(d)});
      // reflection on the glossy floor (only while standing on the platform)
      const onFloor = fs.x < edges[Math.max(0, Math.floor(fs.z / CELL))] - 0.05 && fs.y < 1.3;
      if (onFloor) refl.push(drawFigure(c, fs, f, `r${fs.id}`, true));
    }
  }

  // ---------------- the bridge of action
  for (const b of bridge) {
    const st = brickAt(b, f);
    if (!st) continue;
    const faces = boxFaces(c, st.pos, b.size, st.rot, [236, 236, 236], {amb: 0.3, topBoost: 1.05, fog: clamp(1 + (st.pos[1] + 0.5) / 4)});
    const d = depth(c, st.pos);
    above.push({
      key: d + 0.25,
      el: (
        <g key={`br${b.i}`} opacity={st.alpha}>
          {st.pulse > 0.02 ? (
            <g filter="url(#glowRed)" opacity={st.pulse}>
              {faces.map((fc, i) => <polygon key={i} points={fc.pts} fill="none" stroke="rgb(255,40,50)" strokeWidth={6} />)}
            </g>
          ) : null}
          {faces.map((fc, i) => <polygon key={i} points={fc.pts} fill={fc.fill} stroke={`rgba(255,${Math.round(255 - 215 * st.pulse)},${Math.round(255 - 205 * st.pulse)},${0.25 + 0.6 * st.pulse})`} strokeWidth={1 + 2 * st.pulse} strokeLinejoin="round" />)}
        </g>
      ),
      blur: blurOf(d),
    });
    // lock puff
    const tl = (f - b.lockF) / 30;
    if (tl >= 0 && tl < 0.9) {
      const dots: React.ReactNode[] = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + b.i;
        const sp = 0.6 + hash(k + b.i * 5) * 0.9;
        const p: V3 = [b.pos[0] + Math.cos(a) * (0.3 + sp * tl), b.pos[1] + 0.1 + 0.4 * tl - 1.2 * tl * tl, b.pos[2] + Math.sin(a) * (0.28 + sp * tl * 0.7)];
        const q = project(c, p);
        dots.push(<circle key={k} cx={q.x} cy={q.y} r={Math.max(0.7, 0.012 * q.s)} fill="#fff" opacity={(1 - tl / 0.9) * 0.8} />);
      }
      above.push({key: depth(c, b.pos) - 0.3, el: <g key={`pf${b.i}`}>{dots}</g>});
    }
  }

  // ---------------- the discarded blindfold
  const handW: V3 = [hero.x + hero.facing * hero.joints.rH[0], hero.y + hero.joints.rH[1], hero.z];
  const cloth = clothAt(f, handW);
  if (cloth && crumbleTime(0, 0) > f) {
    const pp = cloth.pts.map((p) => project(c, [p[0], p[1], p[2]]));
    const d = 'M' + pp.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join('L');
    const sw = 0.055 * pp[0].s;
    const rd = cloth.pts.map((p) => project(c, [p[0], -p[1], p[2]]));
    const dr = 'M' + rd.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join('L');
    refl.push(<path key="clothR" d={dr} stroke="rgb(226,34,44)" strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />);
    const glowPool = project(c, [0.3, 0, 0.42]);
    above.push({
      key: depth(c, [0.25, 0, 0.42]) + 0.2,
      el: (
        <g key="cloth">
          {cloth.onFloor > 0 ? <ellipse cx={glowPool.x} cy={glowPool.y} rx={0.5 * glowPool.s} ry={0.11 * glowPool.s} fill="url(#redPool)" opacity={cloth.onFloor * 0.8} /> : null}
          <path d={d} stroke="rgb(226,34,44)" strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} stroke="rgba(255,150,150,0.5)" strokeWidth={sw * 0.25} fill="none" strokeLinecap="round" transform={`translate(0 ${-sw * 0.2})`} />
        </g>
      ),
    });
  }

  // ---------------- compose
  below.sort((a, b) => b.key - a.key);
  above.sort((a, b) => b.key - a.key);
  const group = (items: Item[]) => {
    const out: React.ReactNode[] = [];
    let cur: React.ReactNode[] = [];
    let lvl = -1;
    const flush = () => {
      if (cur.length) out.push(<g key={`g${out.length}`} filter={lvl > 0 ? `url(#dof${lvl})` : undefined}>{cur}</g>);
      cur = [];
    };
    for (const it of items) {
      const l = it.blur ?? 0;
      if (l !== lvl) {
        flush();
        lvl = l;
      }
      cur.push(it.el);
    }
    flush();
    return out;
  };

  const floorClip = floorPolys.map((p, i) => <polygon key={i} points={p} />);
  const pool = project(c, [-1.2, 0, 3.4]);
  const heroPool = project(c, [hero.x, Math.max(0, hero.y - 1), hero.z]);
  const heroLight = smooth(invLerp(T.heroRip, T.heroRip + 18, f));
  const horizon = project(c, [0, 0, 60]);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        {defs}
        {[1, 2, 3, 4].map((l) => (
          <filter key={l} id={`dof${l}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={[0, 1.1, 2.2, 3.6, 5.5][l]} />
          </filter>
        ))}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={9} />
        </filter>
        <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={7} />
        </filter>
        <filter id="reflBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={2.6} />
        </filter>
        <clipPath id="floorClip">{floorClip}</clipPath>
        <radialGradient id="pool" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity={0.13} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="redPool" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="rgb(226,34,44)" stopOpacity={0.45} />
          <stop offset="1" stopColor="rgb(226,34,44)" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset={clamp(horizon.y / H, 0.05, 0.95)} stopColor="#0d0d0d" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      {group(below)}
      {/* floor */}
      <g>
        {floorPolys.map((p, i) => <polygon key={i} points={p} fill="#101010" />)}
        <g clipPath="url(#floorClip)">
          <ellipse cx={pool.x} cy={pool.y} rx={9 * pool.s} ry={3.2 * pool.s} fill="url(#pool)" />
          {heroLight > 0 ? <ellipse cx={heroPool.x} cy={heroPool.y} rx={1.6 * heroPool.s} ry={0.5 * heroPool.s} fill="url(#pool)" opacity={heroLight * 1.6} /> : null}
          <path d={joints} stroke="#1f1f1f" strokeWidth={1.2} />
          <g filter="url(#reflBlur)" opacity={0.2}>{refl}</g>
        </g>
        {crack}
      </g>
      {group(above)}
    </svg>
  );
};
