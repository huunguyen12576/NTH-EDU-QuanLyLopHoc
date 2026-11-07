import React from 'react';
import {useCurrentFrame} from 'remotion';
import {boxFaces, BoxFace} from '../engine/box';
import {Cam, H, makeCam, project, W} from '../engine/camera';
import {FigJoints, rig} from '../engine/figure';
import {clamp, easeOut, hash, invLerp, keys, lerp, noise1, smooth, spring01, V3} from '../engine/math';
import {prismX} from '../engine/prism';
import {BOXES, boxPose, cameraAt, D_X, dState, EPISODES, FigState, growth, M_X, mState, phone, PLATE_FRAMES, plateCount} from '../engine/story';
import {M_PLATES, T} from '../timeline';

type Item = {d: number; el: React.ReactNode};

const HOOK_Y = 1.51;
const RED: V3 = [236, 52, 58];

// ------------------------------------------------------------------ lights
const lampOn = (f: number, at: number) => {
  if (f < at) return 0;
  const k = f - at;
  // fluorescent strike: flash, drop, catch
  return [1.35, 0.25, 0.9, 0.45, 1.05][k] ?? 1;
};

export const lights = (f: number) => {
  const ms = mState(f);
  const g = growth(f);
  const bloom = keys(f, [[T.lockout - 3, 0], [T.lockout, 0.8], [T.lockout + 40, 0.3], [T.liftEnd + 20, 0]], easeOut);
  const Ld = lampOn(f, T.revealStart + 12) * (0.42 + 0.58 * smooth(g)) + bloom;
  const relapses = EPISODES.filter((e) => f > e.seat).length;
  const Lm = lampOn(f, T.lightsOn) * (Math.max(0.2, 0.4 - relapses * 0.03) + 0.75 * ms.glow);
  return {Ld, Lm, glowM: ms.glow * lampOn(f, T.lightsOn), bloom};
};

const mix = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ------------------------------------------------------------------ scene
export const World: React.FC = () => {
  const f = useCurrentFrame();
  const cs = cameraAt(f);
  const cam = makeCam(cs.pos, cs.tgt, cs.F, cs.roll);
  const {Ld, Lm, glowM, bloom} = lights(f);
  const ph = phone(f);

  /** Local light at a world point: two spotlights + red motivation light + phone. */
  const lit = (base: V3, p: V3): V3 => {
    const dm = Math.exp(-((p[0] - M_X) ** 2) / 0.9 - ((p[1] - 1.4) ** 2) / 9);
    const dd = Math.exp(-((p[0] - D_X) ** 2) / 0.9 - ((p[1] - 1.4) ** 2) / 9);
    const k = 0.16 + Lm * dm * 0.95 + Ld * dd * 0.95;
    const c: V3 = [base[0] * k, base[1] * k, base[2] * k];
    const r = glowM * dm * 0.55;
    return mix(c, [RED[0] * k * 1.25, RED[1] * k * 0.9, RED[2] * k * 0.9], r);
  };

  const build = (mirror: boolean): Item[] => {
    const items: Item[] = [];
    const Y = (v: V3): V3 => (mirror ? [v[0], -v[1], v[2]] : v);
    const P = (v: V3) => project(cam, Y(v));
    const faceItems = (faces: BoxFace[], stroke = 'rgba(255,255,255,0.07)', keyBase = '') =>
      faces.forEach((fc, i) =>
        items.push({d: fc.depth, el: <polygon key={`${keyBase}${i}`} points={fc.pts} fill={fc.fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" />}),
      );
    const box = (c: V3, s: V3, base: V3, rot: V3 = [0, 0, 0], key = '', stroke?: string, amb = 0.28) =>
      faceItems(boxFaces(cam, Y(c), s, mirror ? [-rot[0], rot[1], -rot[2]] : rot, lit(base, c), {amb, topBoost: 1.12}), stroke, key);
    const plate = (c: V3, r: number, t: number, key: string, base: V3 = [92, 92, 98]) =>
      faceItems(prismX(cam, Y(c), r, t, lit(base, c), 18, 0.3), 'rgba(255,255,255,0.10)', key);

    // ---------------- racks
    const STEEL: V3 = [118, 120, 128];
    const rack = (cx: number, id: string) => {
      const ux = 0.66, zf = -0.22, zb = 0.36, top = 2.62;
      for (const sx of [-1, 1]) {
        for (const z of [zf, zb]) box([cx + sx * ux, top / 2, z], [0.08, top, 0.08], STEEL, [0, 0, 0], `${id}u${sx}${z}`);
        box([cx + sx * ux, 0.03, (zf + zb) / 2], [0.12, 0.06, 0.9], STEEL, [0, 0, 0], `${id}f${sx}`);
        box([cx + sx * ux, top - 0.04, (zf + zb) / 2], [0.07, 0.07, zb - zf], STEEL, [0, 0, 0], `${id}s${sx}`);
        // J-hooks
        box([cx + sx * (ux - 0.05), HOOK_Y - 0.05, zf + 0.06], [0.05, 0.07, 0.1], [150, 150, 158], [0, 0, 0], `${id}j${sx}`);
        // safety arms
        box([cx + sx * ux, 0.78, zf - 0.2], [0.06, 0.05, 0.4], STEEL, [0, 0, 0], `${id}a${sx}`);
      }
      for (const z of [zf, zb]) box([cx, top - 0.04, z], [ux * 2 + 0.08, 0.07, 0.07], STEEL, [0, 0, 0], `${id}c${z}`);
      // bench
      box([cx, 0.43, 0.28], [0.56, 0.08, 0.4], [70, 70, 76], [0, 0, 0], `${id}bp`);
      box([cx, 0.2, 0.28], [0.12, 0.38, 0.24], [60, 60, 66], [0, 0, 0], `${id}bl`);
      box([cx, 0.02, 0.28], [0.42, 0.04, 0.3], [60, 60, 66], [0, 0, 0], `${id}bf`);
    };
    rack(M_X, 'm');
    rack(D_X, 'd');

    // storage pegs + plates
    const storage = (cx: number, n: number, id: string) => {
      for (const sx of [-1, 1]) {
        box([cx + sx * 0.8, 0.5, 0.36], [0.22, 0.035, 0.035], STEEL, [0, 0, 0], `${id}pg${sx}`);
        for (let i = 0; i < n; i++) plate([cx + sx * (0.76 + i * 0.06), 0.5, 0.36], 0.2, 0.024, `${id}sp${sx}${i}`, [80, 80, 86]);
      }
    };
    const nD = plateCount(f);
    storage(M_X, 2, 'm');
    storage(D_X, Math.max(0, 4 - nD), 'd');

    // ---------------- barbells
    const barbell = (cx: number, y: number, n: number, id: string, newPlateAt?: number) => {
      const z = -0.08;
      const a = P([cx - 0.98, y, z]), b = P([cx + 0.98, y, z]);
      const ia = P([cx - 0.66, y, z]), ib = P([cx + 0.66, y, z]);
      const s = a.s;
      const c = lit([215, 215, 222], [cx, y, z]);
      const col = `rgb(${c.map((v) => Math.min(255, Math.round(v * 1.3))).join(',')})`;
      items.push({
        d: (a.z + b.z) / 2 - 0.05,
        el: (
          <g key={`${id}bar`}>
            <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke="#050505" strokeWidth={0.06 * s} strokeLinecap="round" />
            <path d={`M${ia.x} ${ia.y}L${ib.x} ${ib.y}`} stroke={col} strokeWidth={0.03 * s} />
            <path d={`M${a.x} ${a.y}L${ia.x} ${ia.y}M${ib.x} ${ib.y}L${b.x} ${b.y}`} stroke={col} strokeWidth={0.048 * s} strokeLinecap="round" />
            <path d={`M${a.x} ${a.y - 0.012 * s}L${b.x} ${b.y - 0.012 * s}`} stroke="rgba(255,255,255,0.5)" strokeWidth={0.008 * s} />
          </g>
        ),
      });
      for (const sx of [-1, 1]) {
        for (let i = 0; i < n; i++) {
          let off = 0;
          if (newPlateAt !== undefined && i === n - 1 && newPlateAt > -999) {
            const t = (f - newPlateAt) / 30;
            off = (1 - spring01(t, 2.6, 0.5)) * 0.6;
          }
          plate([cx + sx * (0.73 + i * 0.062 + off), y, z], 0.225, 0.028, `${id}p${sx}${i}`);
        }
        plate([cx + sx * (0.73 + n * 0.062 - 0.01), y, z], 0.045, 0.02, `${id}k${sx}`, [170, 170, 176]);
      }
    };

    // ---------------- figures
    const figure = (cx: number, st: FigState, J: FigJoints, scale: number, o: {headband?: boolean; glow: number; key: string; opacity?: number; warm?: number}) => {
      const w = (p: [number, number]): V3 => [cx + p[0] * scale, p[1] * scale, 0];
      const pp = (p: [number, number]) => P(w(p));
      const ctr = P([cx, 1.0 * scale, 0]);
      const s = ctr.s * scale;
      const L = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${pp(p).x.toFixed(1)} ${pp(p).y.toFixed(1)}`).join('');
      const legs = [0, 1].map((i) => {
        const side = i ? 1 : -1;
        return L([J.hip[i], J.knee[i], J.foot[i], [J.foot[i][0] + side * 0.07, J.foot[i][1] - 0.005]]);
      });
      const arms = [0, 1].map((i) => L([J.sh[i], J.el[i], J.hand[i]]));
      const torso = L([J.pelvis, J.neck]);
      const girdles = L([J.hip[0], J.hip[1]]) + L([J.sh[0], J.sh[1]]);
      const neck = L([J.neck, J.head]);
      const hd = pp(J.head);
      const hr = J.headR * s;
      const lw = J.limbW * s, tw = J.torsoW * s;
      const v = Math.round(255 * clamp(st.bright));
      const warm = o.warm ?? 0;
      const body = `rgb(${v},${Math.round(v * (1 - 0.1 * warm))},${Math.round(v * (1 - 0.16 * warm))})`;
      const shade = `rgb(${Math.round(v * 0.8)},${Math.round(v * 0.8)},${Math.round(v * 0.84)})`;
      const ol = 0.028 * s;
      const strokeSet = (color: string, add: number, k: string, extra?: React.SVGProps<SVGGElement>) => (
        <g key={k} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" {...extra}>
          {legs.map((d, i) => <path key={`l${i}`} d={d} strokeWidth={lw + add} />)}
          <path d={torso} strokeWidth={tw + add} />
          <path d={girdles} strokeWidth={lw + add} />
          <path d={neck} strokeWidth={lw * 0.9 + add} />
          {arms.map((d, i) => <path key={`a${i}`} d={d} strokeWidth={lw + add} />)}
        </g>
      );
      // headband
      let band: React.ReactNode = null;
      if (o.headband) {
        const yb = J.head[1] + 0.035;
        const l = pp([J.head[0] - J.headR * 0.99, yb]);
        const r = pp([J.head[0] + J.headR * 0.99, yb]);
        const k = pp([J.head[0] + J.headR * 0.95, yb]);
        const wind = 0.3 + o.glow;
        const tails = [0, 1].map((i) => {
          const ph = f * (0.35 + 0.5 * o.glow) + i * 1.7;
          const len = 0.17 + 0.03 * i;
          const ex = J.head[0] + J.headR + len * (0.55 + 0.4 * wind);
          const ey = yb - len * (0.85 - 0.6 * wind) + 0.035 * Math.sin(ph) * wind - i * 0.03;
          const mx = J.head[0] + J.headR + len * 0.45;
          const my = yb - 0.02 + 0.03 * Math.sin(ph + 1.2) * wind;
          const e = pp([ex, ey]), m = pp([mx, my]);
          return `M${k.x} ${k.y}Q${m.x} ${m.y} ${e.x} ${e.y}`;
        });
        const bandCol = `rgb(${Math.round(lerp(150, 236, clamp(st.bright)))},${Math.round(lerp(30, 52, st.bright))},${Math.round(lerp(36, 58, st.bright))})`;
        band = (
          <g>
            {o.glow > 0.05 ? <path d={`M${l.x} ${l.y}L${r.x} ${r.y}`} stroke={`rgba(255,60,60,${0.8 * o.glow})`} strokeWidth={0.09 * s} filter="url(#glowR)" /> : null}
            {tails.map((d, i) => <path key={i} d={d} stroke="#050505" strokeWidth={0.045 * s} fill="none" strokeLinecap="round" />)}
            {tails.map((d, i) => <path key={i} d={d} stroke={bandCol} strokeWidth={0.03 * s} fill="none" strokeLinecap="round" />)}
            <path d={`M${l.x} ${l.y}L${r.x} ${r.y}`} stroke={bandCol} strokeWidth={0.05 * s} />
            <path d={`M${l.x} ${l.y - 0.014 * s}L${r.x} ${r.y - 0.014 * s}`} stroke="rgba(255,200,200,0.45)" strokeWidth={0.01 * s} />
          </g>
        );
      }
      const gid = `hg${o.key}`;
      return (
        <g key={o.key} opacity={o.opacity ?? 1}>
          <defs>
            <radialGradient id={gid} cx="0.36" cy="0.32" r="0.75">
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.55" stopColor={body} />
              <stop offset="1" stopColor={shade} />
            </radialGradient>
          </defs>
          {o.glow > 0.03 ? (
            <g opacity={o.glow} filter="url(#glowR)">
              {strokeSet('rgb(255,70,50)', 0.07 * s, 'gl')}
              <circle cx={hd.x} cy={hd.y} r={hr * 1.4} fill="rgb(255,70,50)" />
            </g>
          ) : null}
          {strokeSet('#050505', ol * 2, 'ol')}
          <circle cx={hd.x} cy={hd.y} r={hr + ol} fill="#050505" />
          {strokeSet(shade, 0, 'sh')}
          {strokeSet(body, -lw * 0.22, 'bd', {transform: `translate(${-lw * 0.1} ${-lw * 0.08})`})}
          {strokeSet('rgba(255,255,255,0.55)', -lw * 0.78, 'hl', {transform: `translate(${-lw * 0.24} ${-lw * 0.2})`})}
          <circle cx={hd.x} cy={hd.y} r={hr} fill={`url(#${gid})`} />
          {band}
        </g>
      );
    };
    const fists = (cx: number, J: FigJoints, scale: number, bright: number, key: string) => {
      const v = Math.round(255 * clamp(bright));
      const out = [0, 1].map((i) => {
        const p = P([cx + J.hand[i][0] * scale, J.hand[i][1] * scale, -0.1]);
        const r = J.limbW * 0.62 * p.s * scale;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={r + 0.028 * p.s} fill="#050505" />
            <circle cx={p.x} cy={p.y} r={r} fill={`rgb(${v},${v},${v})`} />
          </g>
        );
      });
      items.push({d: P([cx, 1.5, -0.12]).z, el: <g key={key}>{out}</g>});
    };

    // disciplined
    const ds = dState(f);
    const g = growth(f);
    const renderD = (st: FigState, opacity: number, key: string, withBar: boolean) => {
      const J = rig(st, {muscle: smooth(g)});
      items.push({d: P([D_X, 0.43, 0]).z + (opacity < 1 ? 0.01 : 0), el: figure(D_X, st, J, st.scale, {glow: 0, key, opacity})});
      if (withBar) {
        const lastAdd = PLATE_FRAMES.filter((pf) => f >= pf).pop();
        barbell(D_X, J.barY * st.scale, nD, 'db', lastAdd ?? -9999);
        fists(D_X, J, st.scale, st.bright, `${key}fi`);
      }
    };
    // time-lapse ghosts during the fast part of the year
    if (!mirror && f > T.yearStart + 40 && f < T.yearEnd) {
      const k = smooth(invLerp(T.yearStart + 40, T.yearStart + 110, f)) * (1 - smooth(invLerp(T.yearEnd - 20, T.yearEnd, f)));
      [3, 6].forEach((lag, i) => {
        const gs = dState(f - lag);
        items.push({d: P([D_X, 0.43, 0]).z + 0.02 + i * 0.01, el: figure(D_X, gs, rig(gs, {muscle: smooth(g)}), gs.scale, {glow: 0, key: `ghost${i}`, opacity: k * (0.16 - i * 0.06)})});
      });
    }
    renderD(ds, 1, mirror ? 'dM' : 'd', true);

    // motivated
    const ms = mState(f);
    const MJ = rig(ms, {sway: ms.glow * 0.012 * Math.sin(f * 1.7)});
    items.push({d: P([M_X, 0.43, 0]).z, el: figure(M_X, ms, MJ, 1, {glow: glowM, key: mirror ? 'mM' : 'm', headband: true, warm: glowM})});
    barbell(M_X, ms.hold > 0.5 ? MJ.barY : HOOK_Y, M_PLATES, 'mb');
    if (ms.hold > 0.02) fists(M_X, MJ, 1, ms.bright, 'mfi');

    // phone
    {
      const handPos: V3 = [M_X + (MJ.hand[0][0] + MJ.hand[1][0]) / 2, (MJ.hand[0][1] + MJ.hand[1][1]) / 2 + 0.03, -0.14];
      const bench: V3 = [M_X + 0.18, 0.48, 0.22];
      let pos: V3 | null = null;
      let rot: V3 = [0, 0, 0];
      let size: V3 = [0.075, 0.14, 0.014];
      if (ph.toss >= 0) {
        const e = EPISODES.find((ep) => f >= ep.on && f < ep.seat) ?? EPISODES[1];
        const st0 = mState(e.on);
        const J0 = rig(st0);
        const from: V3 = [M_X + (J0.hand[0][0] + J0.hand[1][0]) / 2, (J0.hand[0][1] + J0.hand[1][1]) / 2, -0.14];
        const t = ph.toss;
        pos = [lerp(from[0], bench[0], t), lerp(from[1], bench[1], t) + Math.sin(Math.PI * t) * 0.45, lerp(from[2], bench[2], t)];
        rot = [t * 5.5, t * 2, t * 1.4];
        size = t >= 1 ? [0.075, 0.014, 0.14] : size;
      } else if (ph.inHand > 0 || ph.everTossed) {
        const t = ph.everTossed ? ph.inHand : 1;
        pos = ph.everTossed ? [lerp(bench[0], handPos[0], t), lerp(bench[1], handPos[1], t) + Math.sin(Math.PI * t) * 0.12, lerp(bench[2], handPos[2], t)] : handPos;
        size = t > 0.5 ? size : [0.075, 0.014, 0.14];
        rot = t > 0.5 ? [-0.35, 0, 0] : [0, 0.2, 0];
      }
      if (pos && (ph.everTossed || ph.inHand > 0)) box(pos, size, [40, 40, 44], rot, 'ph', 'rgba(255,255,255,0.25)', 0.5);
    }

    // clutter
    BOXES.forEach((b, i) => {
      const bp = boxPose(b, f);
      if (!bp.vis) return;
      box([M_X + b.x, bp.y, b.z], [b.w, b.h, b.d], [112, 106, 98], [0, b.rot, bp.tilt], `bx${i}`, 'rgba(255,255,255,0.08)');
      // packing tape
      const tp = P([M_X + b.x, bp.y + b.h / 2 + 0.002, b.z]);
      const tq = P([M_X + b.x, bp.y + b.h / 2 + 0.002, b.z - b.d / 2]);
      if (!mirror) items.push({d: tp.z - 0.3, el: <path key={`tp${i}`} d={`M${tp.x} ${tp.y}L${tq.x} ${tq.y}`} stroke="rgba(160,150,135,0.35)" strokeWidth={0.05 * tp.s} />});
    });
    return items;
  };

  const sorted = (items: Item[]) => items.sort((a, b) => b.d - a.d).map((it) => it.el);
  const main = sorted(build(false));
  const refl = sorted(build(true));

  // ---------------- environment geometry
  const fl = (x: number, z: number) => project(cam, [x, 0, z]);
  const floorPts = [fl(-9, -3.5), fl(9, -3.5), fl(9, 4), fl(-9, 4)].map((p) => `${p.x},${p.y}`).join(' ');
  const horizon = fl(0, 4).y;
  const floorNear = project(cam, [0, 0, 0]).y;

  const pool = (x: number, I: number, id: string, color = '255,255,255') => {
    const c = fl(x, 0.05), n = fl(x, -0.9), fr = fl(x, 1.0), l = fl(x - 1.25, 0.05), r = fl(x + 1.25, 0.05);
    const rx = (r.x - l.x) / 2, ry = Math.abs(n.y - fr.y) / 2;
    return (
      <g key={id}>
        <radialGradient id={id}>
          <stop offset="0" stopColor={`rgb(${color})`} stopOpacity={clamp(0.34 * I)} />
          <stop offset="0.6" stopColor={`rgb(${color})`} stopOpacity={clamp(0.1 * I)} />
          <stop offset="1" stopColor={`rgb(${color})`} stopOpacity={0} />
        </radialGradient>
        <ellipse cx={c.x} cy={(n.y + fr.y) / 2} rx={rx} ry={ry} fill={`url(#${id})`} />
      </g>
    );
  };
  const cone = (x: number, I: number, id: string, color = '255,255,255') => {
    const a = project(cam, [x - 0.1, 5.8, 0]), b = project(cam, [x + 0.1, 5.8, 0]);
    const c = fl(x + 1.25, 0), d = fl(x - 1.25, 0);
    return (
      <g key={id}>
        <linearGradient id={id} x1="0" y1={a.y} x2="0" y2={c.y} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={`rgb(${color})`} stopOpacity={clamp(0.16 * I)} />
          <stop offset="1" stopColor={`rgb(${color})`} stopOpacity={clamp(0.035 * I)} />
        </linearGradient>
        <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`} fill={`url(#${id})`} filter="url(#soft)" />
      </g>
    );
  };
  const lamp = (x: number, I: number, id: string) => {
    const p = project(cam, [x, 5.8, 0]);
    return (
      <g key={id}>
        <ellipse cx={p.x} cy={p.y} rx={0.32 * p.s} ry={0.05 * p.s} fill={`rgba(255,255,255,${clamp(0.85 * I)})`} filter="url(#glowW)" />
        <ellipse cx={p.x} cy={p.y} rx={0.26 * p.s} ry={0.025 * p.s} fill={`rgba(255,255,255,${clamp(I)})`} />
      </g>
    );
  };

  // ---------------- particles
  const parts: React.ReactNode[] = [];
  // embers rising off the motivated
  if (glowM > 0.04) {
    for (let i = 0; i < 46; i++) {
      const life = 18 + hash(i * 3.1) * 22;
      const age = (f + hash(i * 7.7) * life) % life;
      const t = age / life;
      const x = M_X + (hash(i * 1.9) - 0.5) * 0.8 + 0.08 * noise1(f / 9 + i, i);
      const y = 0.4 + hash(i * 5.3) * 1.5 + t * (0.7 + hash(i) * 0.8);
      const p = project(cam, [x, y, -0.15 - hash(i * 2.2) * 0.3]);
      const a = glowM * Math.sin(Math.PI * t) * (0.5 + 0.5 * hash(i * 9.1));
      parts.push(<circle key={`e${i}`} cx={p.x} cy={p.y} r={(0.008 + 0.014 * hash(i * 4.4)) * p.s} fill={`rgba(255,${Math.round(110 + 110 * hash(i * 6.1))},70,${a})`} />);
    }
  }
  // smoke as the fire dies
  for (const e of EPISODES) {
    const a0 = e.jump ? e.frantic - 4 : T.mFadeStart - 10;
    if (f < a0 || f > e.seat + 50) continue;
    for (let i = 0; i < 9; i++) {
      const t0 = a0 + i * 3;
      const t = (f - t0) / 40;
      if (t < 0 || t > 1) continue;
      const p = project(cam, [M_X + 0.05 * Math.sin(i * 2.1 + t * 3), 1.75 + t * 1.1, -0.05]);
      parts.push(<circle key={`s${e.on}${i}`} cx={p.x} cy={p.y} r={(0.04 + t * 0.14) * p.s} fill={`rgba(150,150,155,${0.07 * Math.sin(Math.PI * t)})`} filter="url(#soft)" />);
    }
  }
  // dust motes in the disciplined light
  for (let i = 0; i < 34; i++) {
    const x = D_X + (hash(i * 2.7) - 0.5) * 2.0 + 0.1 * noise1(f / 50 + i, i);
    const y = ((hash(i * 3.3) * 4.2 - f * 0.004 * (0.3 + hash(i))) % 4.2 + 4.2) % 4.2;
    const z = (hash(i * 8.1) - 0.5) * 1.4;
    const p = project(cam, [x, y, z]);
    const a = clamp(Ld) * 0.5 * (0.3 + 0.7 * hash(i * 5.5)) * (1 - Math.abs(x - D_X) / 1.1);
    if (a > 0.01) parts.push(<circle key={`d${i}`} cx={p.x} cy={p.y} r={0.006 * p.s} fill={`rgba(255,255,255,${a})`} />);
  }

  // phone glow on his face
  const ms = mState(f);
  const MJ = rig(ms);
  const phoneGlow =
    ph.inHand > 0.3 && ph.toss < 0
      ? (() => {
          const p = project(cam, [M_X + (MJ.hand[0][0] + MJ.hand[1][0]) / 2, (MJ.hand[0][1] + MJ.hand[1][1]) / 2 + 0.12, -0.12]);
          const col = ph.red > 0.02 ? `${Math.round(lerp(170, 255, ph.red))},${Math.round(lerp(200, 50, ph.red))},${Math.round(lerp(255, 50, ph.red))}` : '170,200,255';
          const I = ph.inHand * ph.intensity * lampOn(f, T.lightsOn);
          return (
            <g style={{mixBlendMode: 'screen'}}>
              <circle cx={p.x} cy={p.y} r={0.3 * p.s * (1 + 0.4 * ph.red)} fill={`rgba(${col},${0.32 * I})`} filter="url(#glowW)" />
              <circle cx={p.x} cy={p.y} r={0.1 * p.s} fill={`rgba(${col},${0.5 * I})`} filter="url(#soft)" />
            </g>
          );
        })()
      : null;

  // the spark: red shockwave as he jumps up
  const spark = EPISODES.slice(1).map((e) => {
    const t = (f - e.on + 2) / 16;
    if (t < 0 || t > 1) return null;
    const p = project(cam, [M_X, 1.2, -0.1]);
    return (
      <g key={`sp${e.on}`} style={{mixBlendMode: 'screen'}}>
        <circle cx={p.x} cy={p.y} r={(0.3 + t * 1.8) * p.s} fill="none" stroke={`rgba(255,70,60,${0.55 * (1 - t)})`} strokeWidth={0.05 * p.s * (1 - t)} filter="url(#soft)" />
        <circle cx={p.x} cy={p.y} r={(0.5 + t) * p.s} fill={`rgba(255,60,50,${0.35 * (1 - t)})`} filter="url(#glowW)" />
      </g>
    );
  });

  // Dec 31 lockout flare
  const dHead = project(cam, [D_X, 2.25 * dState(f).scale, -0.1]);
  const flare =
    bloom > 0.01 ? (
      <g style={{mixBlendMode: 'screen'}}>
        <ellipse cx={dHead.x} cy={dHead.y} rx={1.4 * dHead.s * bloom} ry={1.4 * dHead.s * bloom} fill={`rgba(255,255,255,${0.13 * bloom})`} filter="url(#glowW)" />
        <ellipse cx={dHead.x} cy={dHead.y} rx={W * 0.7 * bloom} ry={5} fill={`rgba(220,235,255,${0.5 * clamp(bloom)})`} filter="url(#soft)" />
      </g>
    ) : null;

  const mPos = project(cam, [M_X, 1.4, 0]);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={14} /></filter>
        <filter id="glowW" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={30} /></filter>
        <filter id="glowR" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={16} /></filter>
        <filter id="reflBlur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={5} /></filter>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060607" />
          <stop offset="1" stopColor="#17171a" />
        </linearGradient>
        <linearGradient id="floor" x1="0" y1={horizon} x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#141416" />
          <stop offset="0.5" stopColor="#09090a" />
          <stop offset="1" stopColor="#030303" />
        </linearGradient>
        <linearGradient id="reflFade" x1="0" y1={floorNear - 40} x2="0" y2={floorNear + 520} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id="reflMask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
          <rect x={0} y={horizon} width={W} height={H} fill="url(#reflFade)" />
        </mask>
        <radialGradient id="wallM" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={`rgba(255,${Math.round(lerp(255, 80, glowM))},${Math.round(lerp(255, 70, glowM))},${clamp(0.1 * Lm)})`} />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="wallD" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={`rgba(255,255,255,${clamp(0.1 * Ld)})`} />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#wall)" />
      {[[M_X, 'wallM'], [D_X, 'wallD']].map(([x, id]) => {
        const p = project(cam, [x as number, 2.3, 4]);
        return <ellipse key={id as string} cx={p.x} cy={p.y} rx={2.4 * p.s} ry={3.2 * p.s} fill={`url(#${id})`} />;
      })}
      <polygon points={floorPts} fill="url(#floor)" />
      <path d={`M0 ${horizon}L${W} ${horizon}`} stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
      {pool(M_X, Lm, 'poolM', glowM > 0.05 ? `255,${Math.round(lerp(255, 80, glowM))},${Math.round(lerp(255, 70, glowM))}` : '255,255,255')}
      {pool(D_X, Ld, 'poolD')}
      <g mask="url(#reflMask)">
        <g filter="url(#reflBlur)" opacity={0.26}>{refl}</g>
      </g>
      {/* contact shadows */}
      {[M_X, D_X].map((x) => {
        const a = fl(x - 0.5, 0), b = fl(x + 0.5, 0), n = fl(x, -0.12), fr = fl(x, 0.3);
        return <ellipse key={`cs${x}`} cx={(a.x + b.x) / 2} cy={(n.y + fr.y) / 2} rx={(b.x - a.x) / 2} ry={Math.max(4, Math.abs(n.y - fr.y) / 2)} fill="rgba(0,0,0,0.55)" filter="url(#soft)" />;
      })}
      <g style={{mixBlendMode: 'screen'}}>
        {cone(M_X, Lm, 'coneM', glowM > 0.05 ? `255,${Math.round(lerp(255, 90, glowM))},${Math.round(lerp(255, 80, glowM))}` : '255,255,255')}
        {cone(D_X, Ld, 'coneD')}
      </g>
      {main}
      {phoneGlow}
      {spark}
      <g style={{mixBlendMode: 'screen'}}>{parts}</g>
      {glowM > 0.03 ? <ellipse cx={mPos.x} cy={mPos.y} rx={1.5 * mPos.s} ry={1.9 * mPos.s} fill={`rgba(255,50,40,${0.1 * glowM})`} filter="url(#glowW)" style={{mixBlendMode: 'screen'}} /> : null}
      {flare}
      {lamp(M_X, Lm * 0.8, 'lm')}
      {lamp(D_X, Ld * 0.8, 'ld')}
    </svg>
  );
};
