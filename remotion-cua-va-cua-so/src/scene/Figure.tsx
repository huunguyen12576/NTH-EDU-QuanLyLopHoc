import React from 'react';
import {CharState} from '../anim';
import {LEN, V2} from '../rig';

export const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(1, Math.max(0, t))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};

export const toScreen = (st: CharState) => {
  const c = Math.cos(st.rot), s = Math.sin(st.rot);
  return (p: V2): V2 => {
    const lx = p[0] * st.face * st.px;
    const ly = -p[1] * st.px;
    return [st.x + lx * c - ly * s, st.y + lx * s + ly * c];
  };
};
const path = (pts: V2[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

export const figurePaths = (st: CharState) => {
  const T = toScreen(st);
  const j = st.j;
  return {
    farLeg: path([j.hip, j.lK, j.lF].map(T)),
    farArm: path([j.sh, j.lE, j.lH].map(T)),
    torso: path([j.hip, j.neck].map(T)),
    nearLeg: path([j.hip, j.rK, j.rF].map(T)),
    nearArm: path([j.sh, j.rE, j.rH].map(T)),
    head: T(j.head),
    r: LEN.headR * st.px,
    w: 0.1 * st.px,
  };
};

/** Solid silhouette (shadows / reflections). */
export const Silhouette: React.FC<{st: CharState; fill: string}> = ({st, fill}) => {
  const g = figurePaths(st);
  const sp = {fill: 'none', stroke: fill, strokeWidth: g.w * 1.05, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <g>
      <path d={g.farLeg} {...sp} />
      <path d={g.farArm} {...sp} />
      <path d={g.torso} {...sp} strokeWidth={g.w * 1.25} />
      <path d={g.nearLeg} {...sp} />
      <path d={g.nearArm} {...sp} />
      <circle cx={g.head[0]} cy={g.head[1]} r={g.r} fill={fill} />
    </g>
  );
};

/**
 * Lit stick figure. `light` 0..1 sets how much of the base colour shows (0 = lost in darkness).
 * `warm` tints the lit side; far limbs are shaded darker for 2.5D depth; head is a shaded sphere.
 */
export const Figure: React.FC<{st: CharState; id: string; base: string; dark: string; light: number; warm: number; rimX: number}> = ({st, id, base, dark, light, warm, rimX}) => {
  const g = figurePaths(st);
  const col = mix(dark, base, light);
  const warmCol = mix(base, '#ffd9a8', 0.55);
  const lit = mix(col, warmCol, warm * 0.45);
  const far = mix(dark, base, light * 0.72);
  const outline = '#0a0a0e';
  const ow = g.w + Math.max(3, g.w * 0.42);
  const sp = (stroke: string, w: number) => ({fill: 'none', stroke, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const});
  // the head's highlight sits toward the main light
  const hx = 0.5 - 0.32 * rimX;
  return (
    <g opacity={st.alpha}>
      <defs>
        <radialGradient id={`hd-${id}`} cx={hx} cy={0.3} r={0.85}>
          <stop offset="0" stopColor={lit} />
          <stop offset="0.55" stopColor={lit} />
          <stop offset="1" stopColor={far} />
        </radialGradient>
      </defs>
      {/* far limbs */}
      <path d={g.farLeg} {...sp(outline, ow)} />
      <path d={g.farArm} {...sp(outline, ow)} />
      <path d={g.farLeg} {...sp(far, g.w)} />
      <path d={g.farArm} {...sp(far, g.w)} />
      {/* body */}
      <path d={g.torso} {...sp(outline, ow * 1.15)} />
      <path d={g.nearLeg} {...sp(outline, ow)} />
      <circle cx={g.head[0]} cy={g.head[1]} r={g.r + ow / 2 - g.w / 2} fill={outline} />
      <path d={g.torso} {...sp(lit, g.w * 1.2)} />
      <path d={g.nearLeg} {...sp(lit, g.w)} />
      <circle cx={g.head[0]} cy={g.head[1]} r={g.r} fill={`url(#hd-${id})`} />
      {/* near arm drawn last, over the torso */}
      <path d={g.nearArm} {...sp(outline, ow)} />
      <path d={g.nearArm} {...sp(lit, g.w)} />
    </g>
  );
};
