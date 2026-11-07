// N-sided prism along the world X axis (weight plates, collars) with Lambert shading.
import {Cam, depth, projPoly} from './camera';
import {V3} from './math';
import {BoxFace} from './box';

const L: V3 = (() => {
  const l: V3 = [-0.45, 1, -0.55];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

export const prismX = (c: Cam, center: V3, r: number, halfT: number, base: V3, n = 18, amb = 0.25, rimBoost = 1): BoxFace[] => {
  const ring = (x: number) =>
    Array.from({length: n}, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [center[0] + x, center[1] + Math.sin(a) * r, center[2] + Math.cos(a) * r] as V3;
    });
  const A = ring(-halfT), B = ring(halfT);
  const out: BoxFace[] = [];
  const shadeOf = (nv: V3, boost = 1) => {
    const lam = Math.max(0, nv[0] * L[0] + nv[1] * L[1] + nv[2] * L[2]);
    return (amb + (1 - amb) * lam) * boost;
  };
  const push = (pts: V3[], nv: V3, boost = 1) => {
    const fc = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length, s[2] + p[2] / pts.length] as V3, [0, 0, 0] as V3);
    const toCam: V3 = [c.pos[0] - fc[0], c.pos[1] - fc[1], c.pos[2] - fc[2]];
    if (nv[0] * toCam[0] + nv[1] * toCam[1] + nv[2] * toCam[2] <= 0) return;
    const p = projPoly(c, pts);
    if (!p) return;
    const sh = shadeOf(nv, boost);
    const col = base.map((v) => Math.round(Math.min(255, v * sh)));
    out.push({pts: p, fill: `rgb(${col[0]},${col[1]},${col[2]})`, shade: sh, normal: nv, depth: depth(c, fc), isTop: false});
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = ((i + 0.5) / n) * Math.PI * 2;
    push([A[i], A[j], B[j], B[i]], [0, Math.sin(a), Math.cos(a)], rimBoost);
  }
  push(A, [-1, 0, 0]);
  push([...B].reverse(), [1, 0, 0]);
  return out.sort((a, b) => b.depth - a.depth);
};
