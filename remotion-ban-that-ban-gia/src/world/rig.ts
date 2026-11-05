import {V3} from '../lib/math';

// Body proportions (metres). Figure stands ~1.8 m.
export const L = {thigh: 0.44, shin: 0.44, torso: 0.54, neck: 0.15, upper: 0.29, fore: 0.29, headR: 0.155, limbR: 0.047, hipW: 0.085, shW: 0.15};

/** Joint angles. f = flex forward, e = elbow bend, ab = abduction (out to own side). h = hip flex, k = knee bend. */
export type Pose = {
  lean: number; // upper-body pitch forward around hip
  pitch: number; // whole-body pitch around hip (negative = falling backward)
  yaw: number; // 0 = facing +x (screen right), PI = facing left, -PI/2 = facing camera
  hy: number; // head yaw (relative), positive turns toward own left (toward camera when facing right)
  hp: number; // head pitch, positive = nod down
  hr: number; // head roll
  aL: [number, number, number];
  aR: [number, number, number];
  lL: [number, number, number];
  lR: [number, number, number];
  air: number;
};

export const STAND: Pose = {
  lean: 0.03, pitch: 0, yaw: 0, hy: 0.55, hp: 0, hr: 0,
  aL: [0.06, 0.18, 0.1], aR: [-0.04, 0.16, 0.1], lL: [0.03, 0.04, 0.02], lR: [-0.03, 0.05, 0.02], air: 0,
};

export type Skel = {
  hip: V3; neck: V3; head: V3;
  hf: V3; hu: V3; hrt: V3; // head basis: forward, up, right
  shL: V3; elL: V3; haL: V3; shR: V3; elR: V3; haR: V3;
  hiL: V3; knL: V3; ftL: V3; hiR: V3; knR: V3; ftR: V3;
  ground: number; // y of lowest point (for contact shadows)
};

const rotU = (p: V3, a: number): V3 => {
  // rotate in the (u,y) plane: positive tips "up" toward "forward"
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c, p[2]];
};
const rotYawLocal = (p: V3, a: number): V3 => {
  // rotate around local up; positive turns forward toward -w (own left)
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};
const limbDir = (f: number, ab: number, side: number): V3 => [Math.sin(f) * Math.cos(ab), -Math.cos(f) * Math.cos(ab), side * Math.sin(ab)];

/** Forward kinematics. root = [x, groundY, z]. Feet (or whatever is lowest) rest on the ground unless air > 0. */
export const solve = (p: Pose, root: V3): Skel => {
  const up: V3[] = [];
  const shL: V3 = [0, L.torso - 0.05, -L.shW];
  const shR: V3 = [0, L.torso - 0.05, L.shW];
  const neck: V3 = [0, L.torso, 0];
  const arm = (sh: V3, a: [number, number, number], side: number) => {
    const d1 = limbDir(a[0], a[2], side), d2 = limbDir(a[0] + a[1], a[2], side);
    const el: V3 = [sh[0] + d1[0] * L.upper, sh[1] + d1[1] * L.upper, sh[2] + d1[2] * L.upper];
    const ha: V3 = [el[0] + d2[0] * L.fore, el[1] + d2[1] * L.fore, el[2] + d2[2] * L.fore];
    return [el, ha];
  };
  const [elL, haL] = arm(shL, p.aL, -1);
  const [elR, haR] = arm(shR, p.aR, 1);
  // head basis (local), then neck offset
  let hf: V3 = [1, 0, 0], hu: V3 = [0, 1, 0], hrt: V3 = [0, 0, 1];
  const headLocal = (v: V3) => {
    let q = v;
    // roll around forward
    const c = Math.cos(p.hr), s = Math.sin(p.hr);
    q = [q[0], q[1] * c - q[2] * s, q[1] * s + q[2] * c];
    q = rotU(q, p.hp);
    q = rotYawLocal(q, p.hy);
    return q;
  };
  hf = headLocal(hf); hu = headLocal(hu); hrt = headLocal(hrt);
  const head: V3 = [neck[0] + hu[0] * L.neck, neck[1] + hu[1] * L.neck, neck[2] + hu[2] * L.neck];
  up.push(neck, head, shL, elL, haL, shR, elR, haR);

  const leg = (hi: V3, l: [number, number, number], side: number) => {
    const d1 = limbDir(l[0], l[2], side), d2 = limbDir(l[0] - l[1], l[2], side);
    const kn: V3 = [hi[0] + d1[0] * L.thigh, hi[1] + d1[1] * L.thigh, hi[2] + d1[2] * L.thigh];
    const ft: V3 = [kn[0] + d2[0] * L.shin, kn[1] + d2[1] * L.shin, kn[2] + d2[2] * L.shin];
    return [kn, ft];
  };
  const hiL: V3 = [0, 0, -L.hipW], hiR: V3 = [0, 0, L.hipW];
  const [knL, ftL] = leg(hiL, p.lL, -1);
  const [knR, ftR] = leg(hiR, p.lR, 1);

  // lean (upper body), then whole-body pitch, then yaw
  const lean = (v: V3) => rotU(v, p.lean);
  const pitch = (v: V3) => rotU(v, p.pitch);
  const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw);
  const yaw = (v: V3): V3 => [v[0] * cy - v[2] * sy, v[1], v[0] * sy + v[2] * cy];
  const U = (v: V3) => yaw(pitch(lean(v)));
  const Lo = (v: V3) => yaw(pitch(v));
  const dirU = (v: V3) => yaw(pitch(lean(v)));

  const pts = {
    hip: Lo([0, 0, 0]), neck: U(neck), head: U(head),
    shL: U(shL), elL: U(elL), haL: U(haL), shR: U(shR), elR: U(elR), haR: U(haR),
    hiL: Lo(hiL), knL: Lo(knL), ftL: Lo(ftL), hiR: Lo(hiR), knR: Lo(knR), ftR: Lo(ftR),
  };
  // grounding: lowest point (with radius) touches root y
  let minY = Infinity;
  for (const [k, v] of Object.entries(pts)) {
    const r = k === 'head' ? L.headR : L.limbR;
    minY = Math.min(minY, v[1] - r);
  }
  const oy = root[1] - minY + p.air;
  const T = (v: V3): V3 => [v[0] + root[0], v[1] + oy, v[2] + root[2]];
  const out = {} as Skel;
  for (const [k, v] of Object.entries(pts)) (out as unknown as Record<string, V3>)[k] = T(v);
  out.hf = dirU(hf); out.hu = dirU(hu); out.hrt = dirU(hrt);
  out.ground = root[1];
  return out;
};

/** Walk cycle overlay. ph in radians. */
export const walkPose = (base: Pose, ph: number, amt = 1, stride = 1): Pose => {
  const s = Math.sin(ph), c = Math.cos(ph);
  const sw = (x: number) => Math.max(0, x);
  const thigh = 0.42 * stride;
  const hL = thigh * s, hR = -thigh * s;
  // knee bends during swing (thigh travelling forward)
  const kL = 0.08 + 0.85 * stride * Math.pow(sw(c), 1.6) + 0.12 * sw(-s);
  const kR = 0.08 + 0.85 * stride * Math.pow(sw(-c), 1.6) + 0.12 * sw(s);
  const m = (a: number, b: number) => a + (b - a) * amt;
  return {
    ...base,
    lean: m(base.lean, base.lean + 0.06 + 0.015 * Math.cos(2 * ph)),
    lL: [m(base.lL[0], hL), m(base.lL[1], kL), base.lL[2]],
    lR: [m(base.lR[0], hR), m(base.lR[1], kR), base.lR[2]],
    aL: [m(base.aL[0], -0.34 * s * stride), m(base.aL[1], 0.22 + 0.2 * sw(-s)), base.aL[2]],
    aR: [m(base.aR[0], 0.34 * s * stride), m(base.aR[1], 0.22 + 0.2 * sw(s)), base.aR[2]],
  };
};
