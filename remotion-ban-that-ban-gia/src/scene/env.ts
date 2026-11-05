// Night street: wall with lit windows, wet sidewalk, curb, road, street lamp, the red car.
import {clamp, hash, lerp, smooth, V3} from '../lib/math';
import {Cam, H, P2, project, W} from '../world/camera';
import {ROAD_Z} from '../world/story';

type Ctx = CanvasRenderingContext2D;

export const WALL_Z = 2.6;
export const CURB_Z = -0.9;
export const ROAD_Y = -0.15;
export const LAMP: V3 = [1.6, 4.35, -0.15];
export const LAMP_POLE: V3 = [1.6, 0, -0.7];

export type Win = {x: number; y: number; w: number; h: number; lit: number; cool?: boolean};
export const WINDOWS: Win[] = [
  {x: -5.4, y: 0.95, w: 1.7, h: 1.95, lit: 1},
  {x: -2.6, y: 1.25, w: 1.0, h: 1.5, lit: 0.0},
  {x: 3.2, y: 0.95, w: 1.7, h: 1.95, lit: 0.85},
  {x: 7.4, y: 0.95, w: 1.7, h: 1.95, lit: 0.6},
  {x: -4.9, y: 4.5, w: 1.0, h: 1.3, lit: 0.75},
  {x: -2.3, y: 4.5, w: 1.0, h: 1.3, lit: 0},
  {x: 0.3, y: 4.5, w: 1.0, h: 1.3, lit: 0.0},
  {x: 2.9, y: 4.5, w: 1.0, h: 1.3, lit: 0.55},
  {x: 5.5, y: 4.5, w: 1.0, h: 1.3, lit: 0},
  {x: 8.1, y: 4.5, w: 1.0, h: 1.3, lit: 0.7},
  {x: -7.6, y: 4.5, w: 1.0, h: 1.3, lit: 0},
  {x: -9.4, y: 0.95, w: 1.7, h: 1.95, lit: 0.5},
];

const poly = (ctx: Ctx, ps: P2[]) => {
  ctx.beginPath();
  ps.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
};

const quad = (c: Cam, x0: number, x1: number, y0: number, y1: number, z: number) => [project(c, [x0, y0, z]), project(c, [x1, y0, z]), project(c, [x1, y1, z]), project(c, [x0, y1, z])];
const gquad = (c: Cam, x0: number, x1: number, z0: number, z1: number, y: number) => {
  const zn = Math.max(z0, c.z + 0.25);
  return [project(c, [x0, y, zn]), project(c, [x1, y, zn]), project(c, [x1, y, z1]), project(c, [x0, y, z1])];
};

export type EnvLight = {lamp: number; warm: number; cold: number; exposure: number};

/** Wall: concrete panels, warm shop windows, door, drainpipe. Drawn into its own layer (for depth blur). */
export function drawWall(ctx: Ctx, c: Cam, el: EnvLight, t: number) {
  const z = WALL_Z;
  const x0 = c.x - 30, x1 = c.x + 30;
  poly(ctx, quad(c, x0, x1, 0, 14, z));
  const top = project(c, [0, 9, z]).y, bot = project(c, [0, 0, z]).y;
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, `rgb(${14 * el.exposure},${15 * el.exposure},${21 * el.exposure})`);
  g.addColorStop(1, `rgb(${30 * el.exposure},${31 * el.exposure},${40 * el.exposure})`);
  ctx.fillStyle = g;
  ctx.fill();
  // lamp wash on the wall
  const lp = project(c, [LAMP[0], 2.0, z]);
  const lr = 4.2 * lp.s;
  const lg = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, lr);
  lg.addColorStop(0, `rgba(255,190,120,${0.2 * el.lamp})`);
  lg.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(lp.x - lr, lp.y - lr, lr * 2, lr * 2);
  // panel seams + plinth
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = Math.max(1, 0.025 * project(c, [0, 0, z]).s);
  for (let x = Math.floor(x0 / 3) * 3; x < x1; x += 3) {
    const a = project(c, [x + 1.3, 0.6, z]), b = project(c, [x + 1.3, 14, z]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const y of [0.6, 3.7, 3.85]) {
    const a = project(c, [x0, y, z]), b = project(c, [x1, y, z]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  poly(ctx, quad(c, x0, x1, 0, 0.6, z));
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  // door (dark recess)
  poly(ctx, quad(c, -0.2, 1.0, 0, 2.3, z));
  ctx.fillStyle = 'rgba(6,6,9,0.85)';
  ctx.fill();
  poly(ctx, quad(c, -0.12, 0.92, 0.0, 2.22, z));
  ctx.strokeStyle = 'rgba(70,70,86,0.35)';
  ctx.stroke();
  // drainpipe
  poly(ctx, quad(c, -3.75, -3.62, 0, 14, z - 0.05));
  ctx.fillStyle = 'rgba(40,42,52,0.9)';
  ctx.fill();
  // windows
  for (const wd of WINDOWS) {
    if (wd.x + wd.w < x0 || wd.x > x1) continue;
    const flick = wd.lit > 0 ? 1 - 0.04 * Math.max(0, Math.sin(t * 0.13 + wd.x)) : 0;
    const L = wd.lit * flick * (1 - 0.25 * el.cold) * el.exposure;
    // frame
    poly(ctx, quad(c, wd.x - 0.08, wd.x + wd.w + 0.08, wd.y - 0.08, wd.y + wd.h + 0.08, z));
    ctx.fillStyle = 'rgb(10,10,13)';
    ctx.fill();
    const q = quad(c, wd.x, wd.x + wd.w, wd.y, wd.y + wd.h, z);
    poly(ctx, q);
    if (L > 0) {
      const gg = ctx.createLinearGradient(0, q[2].y, 0, q[0].y);
      gg.addColorStop(0, `rgb(${255 * L},${150 * L},${60 * L})`);
      gg.addColorStop(1, `rgb(${210 * L},${100 * L},${36 * L})`);
      ctx.fillStyle = gg;
    } else ctx.fillStyle = 'rgb(18,20,28)';
    ctx.fill();
    // mullions / blinds
    ctx.strokeStyle = L > 0 ? `rgba(90,40,10,${0.5 * L})` : 'rgba(40,44,56,0.6)';
    ctx.lineWidth = Math.max(1, 0.03 * q[0].s);
    const mx = project(c, [wd.x + wd.w / 2, wd.y, z]), mt = project(c, [wd.x + wd.w / 2, wd.y + wd.h, z]);
    ctx.beginPath();
    ctx.moveTo(mx.x, mx.y);
    ctx.lineTo(mt.x, mt.y);
    ctx.stroke();
    if (L > 0) {
      for (let k = 1; k < 6; k++) {
        const yy = wd.y + wd.h * (0.55 + k * 0.08);
        const a = project(c, [wd.x, yy, z]), b = project(c, [wd.x + wd.w, yy, z]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      // glow halo
      const cc = project(c, [wd.x + wd.w / 2, wd.y + wd.h / 2, z]);
      const r = (wd.w + wd.h) * 0.95 * cc.s;
      const hg = ctx.createRadialGradient(cc.x, cc.y, r * 0.2, cc.x, cc.y, r);
      hg.addColorStop(0, `rgba(255,150,60,${0.16 * L})`);
      hg.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hg;
      ctx.fillRect(cc.x - r, cc.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

/** Sidewalk, curb, road + wet reflections. */
export function drawGround(ctx: Ctx, c: Cam, el: EnvLight, t: number) {
  const x0 = c.x - 40, x1 = c.x + 40;
  // ROAD
  poly(ctx, gquad(c, x0, x1, -30, CURB_Z, ROAD_Y));
  ctx.fillStyle = `rgb(${12 * el.exposure},${13 * el.exposure},${17 * el.exposure})`;
  ctx.fill();
  // curb face
  poly(ctx, quad(c, x0, x1, ROAD_Y, 0, CURB_Z));
  ctx.fillStyle = `rgb(${92 * el.exposure},${94 * el.exposure},${104 * el.exposure})`;
  ctx.fill();
  // SIDEWALK
  const sw = gquad(c, x0, x1, CURB_Z, WALL_Z, 0);
  poly(ctx, sw);
  const gy0 = sw[2].y, gy1 = sw[0].y;
  const g = ctx.createLinearGradient(0, gy0, 0, gy1);
  g.addColorStop(0, `rgb(${30 * el.exposure},${30 * el.exposure},${36 * el.exposure})`);
  g.addColorStop(1, `rgb(${44 * el.exposure},${44 * el.exposure},${50 * el.exposure})`);
  ctx.fillStyle = g;
  ctx.fill();
  // curb top highlight
  const ca = project(c, [x0, 0, CURB_Z]), cb = project(c, [x1, 0, CURB_Z]);
  ctx.beginPath();
  ctx.moveTo(ca.x, ca.y);
  ctx.lineTo(cb.x, cb.y);
  ctx.strokeStyle = `rgba(170,172,184,${0.55 * el.exposure})`;
  ctx.lineWidth = Math.max(1.5, 0.03 * ca.s);
  ctx.stroke();
  // tile seams
  ctx.save();
  poly(ctx, sw);
  ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  for (const z of [-0.1, 0.75, 1.6]) {
    const a = project(c, [x0, 0, z]), b = project(c, [x1, 0, z]);
    ctx.lineWidth = Math.max(1, 0.02 * a.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let x = Math.floor(x0 / 1.5) * 1.5; x < x1; x += 1.5) {
    const a = project(c, [x, 0, Math.max(CURB_Z, c.z + 0.3)]), b = project(c, [x, 0, WALL_Z]);
    ctx.lineWidth = Math.max(1, 0.015 * b.s);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // lamp light pool + window spill
  ctx.globalCompositeOperation = 'lighter';
  const pool = (x: number, z: number, rx: number, rz: number, col: string, a: number) => {
    const p = project(c, [x, 0, z]);
    const px = rx * p.s, pz = Math.max(4, rz * p.s * Math.abs(c.y) / Math.max(1, p.d) * 1.0);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, pz / px);
    const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, px);
    gg.addColorStop(0, `rgba(${col},${a})`);
    gg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gg;
    ctx.fillRect(-px, -px, px * 2, px * 2);
    ctx.restore();
  };
  pool(LAMP[0], 0.4, 3.4, 3.4, '255,176,100', 0.3 * el.lamp);
  pool(LAMP[0], 0.3, 1.5, 1.5, '255,200,140', 0.2 * el.lamp);
  for (const wd of WINDOWS) if (wd.lit > 0 && wd.y < 2) pool(wd.x + wd.w / 2, 1.9, 1.8, 1.4, '255,140,60', 0.16 * wd.lit * (1 - 0.3 * el.cold));
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';

  // wet reflections (mirror below ground): lamp + windows
  ctx.save();
  poly(ctx, gquad(c, x0, x1, -30, WALL_Z, 0));
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const refl = (p: V3, w: number, h: number, col: string, a: number, groundY: number) => {
    const m = project(c, [p[0], 2 * groundY - p[1], p[2]]);
    const g0 = project(c, [p[0], groundY, p[2]]);
    const rw = w * m.s, rh = Math.abs(m.y - g0.y) + h * m.s;
    const gg = ctx.createLinearGradient(0, g0.y, 0, g0.y + rh);
    gg.addColorStop(0, `rgba(${col},${a})`);
    gg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.ellipse(m.x, (g0.y + m.y) / 2 + rh * 0.15, rw, rh * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  // lamp streak on road (long, broken by ripples)
  ctx.filter = 'blur(5px)';
  for (let k = 0; k < 16; k++) {
    const z = -1.2 - k * 0.26;
    if (z < c.z + 0.4) continue;
    const m = project(c, [LAMP[0] + Math.sin(t * 0.05 + k) * 0.03, ROAD_Y, z]);
    const w = (0.22 + 0.05 * Math.sin(k * 2.1 + t * 0.07)) * m.s;
    const hh = 0.24 * m.s;
    ctx.fillStyle = `rgba(255,190,120,${0.07 * el.lamp * (1 - k / 17)})`;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, w, hh * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'none';
  refl([LAMP[0], LAMP[1], LAMP[2]], 0.5, 0.6, '255,190,120', 0.08 * el.lamp, 0);
  for (const wd of WINDOWS) {
    if (wd.lit <= 0 || wd.y > 2) continue;
    const m0 = project(c, [wd.x, 0, WALL_Z - 0.02]), m1 = project(c, [wd.x + wd.w, 0, WALL_Z - 0.02]);
    const md = project(c, [wd.x, -0.9, WALL_Z - 0.02]);
    const gg = ctx.createLinearGradient(0, m0.y, 0, m0.y + (md.y - m0.y) * 1.2);
    gg.addColorStop(0, `rgba(255,140,60,${0.18 * wd.lit})`);
    gg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(m0.x, m0.y, m1.x - m0.x, (md.y - m0.y) * 1.2);
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';

  // road puddle (dark mirror with a lamp glint)
  const pc = project(c, [0.2, ROAD_Y, ROAD_Z]);
  if (ROAD_Z > c.z + 0.3) {
    ctx.save();
    ctx.translate(pc.x, pc.y);
    const prx = 1.25 * pc.s, prz = Math.max(3, 0.38 * pc.s * (c.y - ROAD_Y) / pc.d);
    ctx.scale(1, prz / prx);
    const gg = ctx.createRadialGradient(0, 0, prx * 0.4, 0, 0, prx);
    gg.addColorStop(0, 'rgba(30,22,16,0.95)');
    gg.addColorStop(1, 'rgba(30,22,16,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(0, 0, prx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Street lamp pole + head (drawn in front of the figures). */
export function drawLampPole(ctx: Ctx, c: Cam, el: EnvLight) {
  const b = project(c, LAMP_POLE), tp = project(c, [LAMP_POLE[0], 4.45, LAMP_POLE[2]]);
  if (b.d < 0.3) return;
  const w = 0.07 * b.s;
  ctx.fillStyle = 'rgb(14,14,18)';
  ctx.fillRect(b.x - w / 2, tp.y, w, b.y - tp.y);
  ctx.fillStyle = `rgba(255,190,130,${0.18 * el.lamp})`;
  ctx.fillRect(b.x + w * 0.15, tp.y, w * 0.18, b.y - tp.y);
  // base
  ctx.fillStyle = 'rgb(10,10,13)';
  ctx.fillRect(b.x - w * 0.9, b.y - 0.35 * b.s, w * 1.8, 0.35 * b.s);
  // arm to head
  const h = project(c, LAMP);
  ctx.strokeStyle = 'rgb(14,14,18)';
  ctx.lineWidth = 0.05 * h.s;
  ctx.beginPath();
  ctx.moveTo(tp.x, tp.y);
  ctx.quadraticCurveTo(tp.x, h.y - 0.12 * h.s, h.x, h.y - 0.08 * h.s);
  ctx.stroke();
  ctx.fillStyle = 'rgb(18,18,22)';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y - 0.04 * h.s, 0.34 * h.s, 0.09 * h.s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = `rgb(255,${226},${170})`;
  ctx.beginPath();
  ctx.ellipse(h.x, h.y, 0.26 * h.s, 0.04 * h.s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Volumetric cone, drawn into a low-res buffer so it reads as soft haze. */
export function drawLampCone(ctx: Ctx, c: Cam, el: EnvLight) {
  const h = project(c, LAMP);
  if (h.d < 0.3) return;
  const g0 = project(c, [LAMP[0], 0, LAMP[2]]);
  const spread = 2.3 * g0.s;
  const cone = ctx.createLinearGradient(0, h.y, 0, g0.y);
  cone.addColorStop(0, `rgba(255,196,130,${0.2 * el.lamp})`);
  cone.addColorStop(0.5, `rgba(255,180,110,${0.07 * el.lamp})`);
  cone.addColorStop(1, `rgba(255,170,100,${0.025 * el.lamp})`);
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(h.x - 0.22 * h.s, h.y);
  ctx.lineTo(h.x + 0.22 * h.s, h.y);
  ctx.lineTo(g0.x + spread, g0.y);
  ctx.lineTo(g0.x - spread, g0.y);
  ctx.closePath();
  ctx.fill();
}

/** Lamp halo, drifting motes (additive). */
export function drawLampLight(ctx: Ctx, c: Cam, el: EnvLight, t: number) {
  const h = project(c, LAMP);
  if (h.d < 0.3) return;
  ctx.globalCompositeOperation = 'lighter';
  // halo
  for (const [r, a] of [[1.6, 0.16], [0.55, 0.35], [0.2, 0.6]] as const) {
    const rr = r * h.s;
    const hg = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, rr);
    hg.addColorStop(0, `rgba(255,214,160,${a * el.lamp})`);
    hg.addColorStop(1, 'rgba(255,214,160,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(h.x - rr, h.y - rr, rr * 2, rr * 2);
  }
  // motes in the cone
  for (let i = 0; i < 70; i++) {
    const hh = (k: number) => hash(i * 9.1 + k);
    const yy = ((hh(1) * 4.0 - t * 0.004 * (0.5 + hh(2))) % 4.0 + 4.0) % 4.0;
    const spreadAt = 0.2 + (1 - yy / 4.2) * 2.0;
    const xx = LAMP[0] + (hh(3) - 0.5) * 2 * spreadAt * 0.8 + Math.sin(t * 0.03 + i) * 0.05;
    const zz = LAMP[2] + (hh(4) - 0.5) * 1.6;
    if (zz < c.z + 0.5) continue;
    const p = project(c, [xx, yy + 0.2, zz]);
    const a = 0.35 * smooth(1 - Math.abs(xx - LAMP[0]) / spreadAt) * el.lamp * (0.4 + 0.6 * Math.sin(t * 0.1 + i) ** 2);
    ctx.fillStyle = `rgba(255,220,180,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.8, 0.008 * p.s), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// --------------------------------------------------------------------------- CAR
const PROFILE: [number, number][] = [
  [0.0, 0.42], [0.04, 0.72], [0.4, 0.84], [1.15, 0.9], [1.7, 1.2], [2.5, 1.26], [3.0, 1.14], [3.5, 0.92], [4.3, 0.78], [4.56, 0.6], [4.58, 0.4], [4.4, 0.24], [0.12, 0.24],
];
const GLASS: [number, number][] = [[1.3, 0.93], [1.76, 1.17], [2.48, 1.21], [2.92, 1.1], [3.32, 0.94]];
export const CAR_NEAR = -2.45, CAR_FAR = -0.88, WHEEL_R = 0.34;
const WHEELS = [0.86, 3.56];

/** Renders the car (in its own layer, for motion blur). frontWheelX = world x of front axle. */
export function drawCar(ctx: Ctx, c: Cam, frontWheelX: number, spin: number, el: EnvLight, headK: number) {
  const ox = frontWheelX - WHEELS[1];
  const P = (x: number, y: number, z: number) => project(c, [ox + x, ROAD_Y + y, z]);
  const near = PROFILE.map(([x, y]) => P(x, y, CAR_NEAR));
  const far = PROFILE.map(([x, y]) => P(x, y, CAR_FAR));
  if (near[0].d < 0.3) return;
  // contact shadow
  const sh0 = P(-0.2, 0, CAR_NEAR + 0.1), sh1 = P(4.8, 0, CAR_NEAR + 0.1);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.ellipse((sh0.x + sh1.x) / 2, sh0.y, (sh1.x - sh0.x) / 2, 0.08 * sh0.s, 0, 0, Math.PI * 2);
  ctx.fill();
  // far side
  poly(ctx, far);
  ctx.fillStyle = 'rgb(70,8,12)';
  ctx.fill();
  // connecting faces (top/front/back), back-face culled in screen space
  for (let i = 0; i < PROFILE.length; i++) {
    const j = (i + 1) % PROFILE.length;
    const q = [near[i], near[j], far[j], far[i]];
    const cross = (q[1].x - q[0].x) * (q[2].y - q[0].y) - (q[1].y - q[0].y) * (q[2].x - q[0].x);
    if (cross < 0) continue;
    const ex = PROFILE[j][0] - PROFILE[i][0], ey = PROFILE[j][1] - PROFILE[i][1];
    const ny = ex / Math.hypot(ex, ey); // up-facing component
    const lum = clamp(0.35 + 0.55 * ny);
    const isGlass = i >= 4 && i <= 6;
    poly(ctx, q);
    ctx.fillStyle = isGlass ? `rgb(${20 + 30 * lum},${22 + 30 * lum},${30 + 40 * lum})` : `rgb(${150 + 90 * lum},${18 + 30 * lum},${24 + 26 * lum})`;
    ctx.fill();
  }
  // near side body with metallic gradient
  poly(ctx, near);
  const top = P(0, 1.26, CAR_NEAR).y, bot = P(0, 0.24, CAR_NEAR).y;
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, 'rgb(150,14,20)');
  g.addColorStop(0.36, 'rgb(226,32,38)');
  g.addColorStop(0.47, 'rgb(255,120,110)');
  g.addColorStop(0.52, 'rgb(218,28,34)');
  g.addColorStop(0.85, 'rgb(132,10,16)');
  g.addColorStop(1, 'rgb(60,4,8)');
  ctx.fillStyle = g;
  ctx.fill();
  // lamp reflection travelling along the body
  const lr = project(c, [LAMP[0], ROAD_Y + 0.8, CAR_NEAR]);
  ctx.save();
  poly(ctx, near);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(lr.x, P(0, 0.78, CAR_NEAR).y, 0, lr.x, P(0, 0.78, CAR_NEAR).y, 0.9 * lr.s);
  rg.addColorStop(0, `rgba(255,220,180,${0.45 * el.lamp})`);
  rg.addColorStop(1, 'rgba(255,220,180,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  // side glass
  poly(ctx, GLASS.map(([x, y]) => P(x, y, CAR_NEAR - 0.005)));
  const gg = ctx.createLinearGradient(P(1.3, 0, 0).x, 0, P(3.3, 0, 0).x, 0);
  gg.addColorStop(0, 'rgb(12,13,18)');
  gg.addColorStop(0.55, 'rgb(34,36,46)');
  gg.addColorStop(0.62, 'rgb(90,92,110)');
  gg.addColorStop(0.7, 'rgb(28,30,40)');
  gg.addColorStop(1, 'rgb(14,15,20)');
  ctx.fillStyle = gg;
  ctx.fill();
  // door seam + handle + sill
  const d0 = P(2.95, 1.1, CAR_NEAR - 0.006), d1 = P(3.05, 0.3, CAR_NEAR - 0.006);
  ctx.strokeStyle = 'rgba(60,0,4,0.7)';
  ctx.lineWidth = Math.max(1, 0.012 * d0.s);
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.stroke();
  const s0 = P(0.5, 0.33, CAR_NEAR - 0.006), s1 = P(4.2, 0.33, CAR_NEAR - 0.006);
  ctx.strokeStyle = 'rgba(30,0,2,0.8)';
  ctx.beginPath();
  ctx.moveTo(s0.x, s0.y);
  ctx.lineTo(s1.x, s1.y);
  ctx.stroke();
  // wheels
  for (const wx of WHEELS) {
    const wc = P(wx, WHEEL_R, CAR_NEAR - 0.01);
    const r = WHEEL_R * wc.s;
    ctx.fillStyle = 'rgb(18,4,6)';
    ctx.beginPath();
    ctx.arc(wc.x, wc.y, r * 1.12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgb(10,10,12)';
    ctx.beginPath();
    ctx.arc(wc.x, wc.y, r, 0, Math.PI * 2);
    ctx.fill();
    const rim = ctx.createRadialGradient(wc.x, wc.y, 0, wc.x, wc.y, r * 0.66);
    rim.addColorStop(0, 'rgb(120,122,130)');
    rim.addColorStop(0.7, 'rgb(170,172,182)');
    rim.addColorStop(1, 'rgb(60,62,70)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.arc(wc.x, wc.y, r * 0.64, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,46,0.8)';
    ctx.lineWidth = r * 0.09;
    for (let k = 0; k < 5; k++) {
      const a = spin + (k * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(wc.x + Math.cos(a) * r * 0.15, wc.y + Math.sin(a) * r * 0.15);
      ctx.lineTo(wc.x + Math.cos(a) * r * 0.6, wc.y + Math.sin(a) * r * 0.6);
      ctx.stroke();
    }
  }
  // tail light
  const tl = P(0.02, 0.62, CAR_NEAR - 0.01);
  ctx.fillStyle = 'rgb(255,40,40)';
  ctx.fillRect(tl.x - 0.02 * tl.s, tl.y - 0.06 * tl.s, 0.1 * tl.s, 0.1 * tl.s);
  // headlight lens
  const hl = P(4.5, 0.62, CAR_NEAR - 0.01);
  ctx.fillStyle = `rgba(255,250,235,${0.6 + 0.4 * headK})`;
  ctx.beginPath();
  ctx.ellipse(hl.x - 0.06 * hl.s, hl.y, 0.1 * hl.s, 0.05 * hl.s, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

/** Headlight beams + glare (additive, drawn over everything). */
export function drawHeadlights(ctx: Ctx, c: Cam, frontWheelX: number, k: number) {
  if (k <= 0.001) return;
  const ox = frontWheelX - WHEELS[1];
  ctx.globalCompositeOperation = 'lighter';
  for (const z of [CAR_NEAR, CAR_FAR]) {
    const src = project(c, [ox + 4.5, ROAD_Y + 0.62, z]);
    if (src.d < 0.3) continue;
    // beam on the road + air
    const end = project(c, [ox + 16, ROAD_Y, z + 0.6]);
    const endT = project(c, [ox + 16, ROAD_Y + 2.2, z + 0.6]);
    const bg = ctx.createLinearGradient(src.x, src.y, end.x, end.y);
    bg.addColorStop(0, `rgba(255,248,230,${0.26 * k * (z === CAR_NEAR ? 1 : 0.6)})`);
    bg.addColorStop(1, 'rgba(255,248,230,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(src.x, src.y - 0.05 * src.s);
    ctx.lineTo(endT.x, endT.y);
    ctx.lineTo(end.x, end.y + 0.3 * end.s);
    ctx.lineTo(src.x, src.y + 0.05 * src.s);
    ctx.closePath();
    ctx.fill();
    // glare + anamorphic streak
    const r = 0.5 * src.s;
    const hg = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, r);
    hg.addColorStop(0, `rgba(255,255,245,${0.95 * k})`);
    hg.addColorStop(0.25, `rgba(255,240,210,${0.4 * k})`);
    hg.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(src.x - r, src.y - r, r * 2, r * 2);
    ctx.save();
    ctx.translate(src.x, src.y);
    ctx.scale(1, 0.018);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.8);
    sg.addColorStop(0, `rgba(160,200,255,${0.5 * k})`);
    sg.addColorStop(1, 'rgba(160,200,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-W, -W, W * 2, W * 2);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
}

export const headlightPos = (frontWheelX: number): V3 => [frontWheelX - WHEELS[1] + 4.5, ROAD_Y + 0.62, (CAR_NEAR + CAR_FAR) / 2];

export {lerp, H};
