// Shaded 3D box (brick) with back-face culling.
import {Cam, depth, projPoly} from './camera';
import {V3} from './math';

const LIGHT: V3 = (() => {
  const l: V3 = [-0.45, 1, -0.55];
  const n = Math.hypot(...l);
  return [l[0] / n, l[1] / n, l[2] / n];
})();

const rotM = (r: V3) => {
  const [a, b, c] = r;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  // R = Ry(b) * Rx(a) * Rz(c)
  return (v: V3): V3 => {
    // Rz
    let x = v[0] * cc - v[1] * sc;
    let y = v[0] * sc + v[1] * cc;
    let z = v[2];
    // Rx
    const y2 = y * ca - z * sa;
    const z2 = y * sa + z * ca;
    y = y2; z = z2;
    // Ry
    const x3 = x * cb + z * sb;
    const z3 = -x * sb + z * cb;
    return [x3, y, z3];
  };
};

export type BoxFace = {pts: string; fill: string; shade: number; normal: V3; depth: number; isTop: boolean};

const FACES: {idx: number[]; n: V3}[] = [
  {idx: [4, 5, 6, 7], n: [0, 1, 0]}, // top
  {idx: [0, 3, 2, 1], n: [0, -1, 0]}, // bottom
  {idx: [0, 1, 5, 4], n: [0, 0, -1]}, // front (towards camera)
  {idx: [2, 3, 7, 6], n: [0, 0, 1]}, // back
  {idx: [1, 2, 6, 5], n: [1, 0, 0]}, // right
  {idx: [3, 0, 4, 7], n: [-1, 0, 0]}, // left
];

/**
 * Returns visible faces of a box, with Lambert shading.
 * base: [r,g,b] 0..255. topBoost multiplies the top face.
 */
export const boxFaces = (c: Cam, center: V3, size: V3, rot: V3, base: V3, opts: {topBoost?: number; fog?: number; amb?: number} = {}): BoxFace[] => {
  const R = rotM(rot);
  const hx = size[0] / 2, hy = size[1] / 2, hz = size[2] / 2;
  const local: V3[] = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
    [-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz],
  ];
  const world = local.map((v) => {
    const r = R(v);
    return [r[0] + center[0], r[1] + center[1], r[2] + center[2]] as V3;
  });
  const out: BoxFace[] = [];
  const amb = opts.amb ?? 0.22;
  for (const face of FACES) {
    const n = R(face.n);
    const fc: V3 = [0, 0, 0];
    face.idx.forEach((i) => { fc[0] += world[i][0] / 4; fc[1] += world[i][1] / 4; fc[2] += world[i][2] / 4; });
    const toCam: V3 = [c.pos[0] - fc[0], c.pos[1] - fc[1], c.pos[2] - fc[2]];
    if (n[0] * toCam[0] + n[1] * toCam[1] + n[2] * toCam[2] <= 0) continue;
    const pts = projPoly(c, face.idx.map((i) => world[i]));
    if (!pts) continue;
    const lam = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    let shade = amb + (1 - amb) * lam;
    const isTop = face.n[1] === 1;
    if (isTop) shade *= opts.topBoost ?? 1;
    shade *= opts.fog ?? 1;
    const col = base.map((v) => Math.round(Math.min(255, v * shade)));
    out.push({pts, fill: `rgb(${col[0]},${col[1]},${col[2]})`, shade, normal: n, depth: depth(c, fc), isTop});
  }
  return out.sort((a, b) => b.depth - a.depth);
};
