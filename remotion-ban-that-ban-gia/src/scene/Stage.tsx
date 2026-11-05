import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, hash, range, V3} from '../lib/math';
import {Cam, H, project, W} from '../world/camera';
import {camAt, moodAt} from '../world/direction';
import {L} from '../world/rig';
import {Actor, actorsAt, CAR_V, carFrontWheelX, footprintsAt, mudOf, particlesAt, poolAt} from '../world/story';
import {segAt} from '../timeline';
import {
  CURB_Z, drawCar, drawGround, drawHeadlights, drawLampCone, drawLampLight, drawLampPole, drawWall, EnvLight, headlightPos, LAMP, WALL_Z, WHEEL_R, WINDOWS,
} from './env';
import {drawCastShadow, drawFigure, Lighting, MUD, MUD_D, MUD_L, RGB} from './figure';

type Ctx = CanvasRenderingContext2D;
const layers: Record<string, HTMLCanvasElement> = {};
const layer = (name: string) => {
  let c = layers[name];
  if (!c) {
    c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    layers[name] = c;
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.clearRect(0, 0, W, H);
  return {c, ctx};
};

let grain: HTMLCanvasElement | null = null;
const grainTile = () => {
  if (grain) return grain;
  grain = document.createElement('canvas');
  grain.width = grain.height = 256;
  const g = grain.getContext('2d')!;
  const im = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = Math.floor(hash(i * 0.731) * 255);
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
    im.data[i * 4 + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return grain;
};

const coc = (d: number, fd: number) => Math.min(12, 70 * Math.abs(1 / d - 1 / fd));

/** Per-actor light: ambient + lamp + shop windows + car headlights. */
const lightFor = (a: Actor, cam: Cam, el: EnvLight, hlX: number, hlK: number): Lighting & {head: number} => {
  const p: V3 = [a.skel.hip[0], 1.2, a.z];
  const dl = Math.hypot(p[0] - LAMP[0], p[1] - LAMP[1], p[2] - LAMP[2]);
  const lamp = el.lamp * 1.25 * (9 / (9 + dl * dl * 0.9));
  let win = 0;
  for (const w of WINDOWS) if (w.lit > 0 && w.y < 2) win += w.lit * Math.max(0, 1 - Math.abs(p[0] - (w.x + w.w / 2)) / 3.2) * 0.32;
  const ahead = p[0] - hlX;
  const head = hlK * (ahead > -0.6 ? Math.pow(clamp(1 - ahead / 16), 1.6) * clamp((ahead + 0.6) / 0.9) : 0);
  const amb: RGB = [0.3 + 0.06 * el.cold, 0.33 + 0.07 * el.cold, 0.42 + 0.1 * el.cold];
  const m: RGB = [
    (amb[0] + lamp * 0.95 + win * 0.95 + head * 0.9) * el.exposure,
    (amb[1] + lamp * 0.8 + win * 0.6 + head * 0.93) * el.exposure,
    (amb[2] + lamp * 0.62 + win * 0.35 + head * 1.0) * el.exposure,
  ];
  const cool = el.cold * 0.18;
  m[0] *= 1 - cool;
  m[2] *= 1 + cool * 0.4;
  const pc = project(cam, p);
  const src = head > lamp ? project(cam, headlightPos(hlX)) : project(cam, LAMP);
  let dx = src.x - pc.x, dy = src.y - pc.y;
  const l = Math.hypot(dx, dy) || 1;
  dx /= l;
  dy /= l;
  return {
    mult: [Math.min(1.15, m[0]), Math.min(1.15, m[1]), Math.min(1.15, m[2])],
    dir: [dx, dy],
    rim: head > lamp ? [210, 225, 255] : [255, 196, 140],
    rimK: clamp(Math.max(lamp * 0.9, head * 1.2)),
    head,
  };
};

export const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    render(cv.getContext('2d')!, frame);
  }, [frame]);
  return <canvas ref={ref} width={W} height={H} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />;
};

function render(ctx: Ctx, f: number) {
  const seg = segAt(f);
  const {variant: v, s} = seg;
  const ds = segAt(f + 1).s - s;
  const cam = camAt(f);
  const md = moodAt(f);
  const el: EnvLight = {lamp: md.lamp, warm: md.warm, cold: md.cold, exposure: md.exposure};
  const [A, B] = actorsAt(v, s);
  const fd = 0.3 - cam.z;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.fillStyle = '#050507';
  ctx.fillRect(0, 0, W, H);

  // car + headlights state
  const fw = carFrontWheelX(s);
  const hl = headlightPos(fw);
  const carOn = fw > cam.x - 25 && fw < cam.x + 30;
  const hlK = carOn ? clamp((fw + 30 - cam.x) / 10) : 0;

  // 1) WALL (depth blurred)
  {
    const {c, ctx: g} = layer('wall');
    drawWall(g, cam, el, f);
    // headlight wash + racing shadows on the wall
    if (hlK > 0) {
      g.globalCompositeOperation = 'lighter';
      const hit = project(cam, [hl[0] + 4.5, 1.1, WALL_Z]);
      const r = 5.5 * hit.s;
      const gg = g.createRadialGradient(hit.x, hit.y, 0, hit.x, hit.y, r);
      const near = clamp(1 - Math.abs(hl[0] - cam.x) / 18);
      gg.addColorStop(0, `rgba(230,236,255,${0.2 * hlK * near})`);
      gg.addColorStop(1, 'rgba(230,236,255,0)');
      g.fillStyle = gg;
      g.fillRect(hit.x - r, hit.y - r, r * 2, r * 2);
      g.globalCompositeOperation = 'source-over';
      const {c: sc, ctx: sg} = layer('wallShadow');
      for (const a of [A, B]) if (a.x > hl[0] - 0.3) drawCastShadow(sg, cam, a.skel, hl, 'wall', WALL_Z);
      g.globalAlpha = 0.5 * hlK * near;
      g.filter = 'blur(7px)';
      g.drawImage(sc, 0, 0);
      g.filter = 'none';
      g.globalAlpha = 1;
    }
    const wb = coc(WALL_Z - cam.z, fd);
    ctx.filter = wb > 0.6 ? `blur(${wb.toFixed(1)}px)` : 'none';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';
  }

  // 2) GROUND
  drawGround(ctx, cam, el, f);

  // mud pool on the sidewalk + footprints
  const pool = poolAt(v, s);
  if (pool.rx > 0.01) {
    for (let i = 0; i < 9; i++) {
      const ox = (hash(i + 3) - 0.5) * pool.rx * 1.1, oz = (hash(i + 7) - 0.5) * pool.rz * 0.8;
      const rr = pool.rx * (0.35 + 0.35 * hash(i + 11));
      const pc = project(cam, [pool.cx + ox, 0.002, 0.3 + oz]);
      const ry = Math.max(2, rr * pc.s * (cam.y / pc.d) * 0.62);
      ctx.fillStyle = `rgba(${MUD_D[0]},${MUD_D[1]},${MUD_D[2]},0.92)`;
      ctx.beginPath();
      ctx.ellipse(pc.x, pc.y, rr * pc.s, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // wet glint from the lamp
    const pc = project(cam, [pool.cx + 0.25, 0.003, 0.25]);
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createRadialGradient(pc.x, pc.y, 0, pc.x, pc.y, pool.rx * 0.7 * pc.s);
    gr.addColorStop(0, `rgba(255,190,130,${0.16 * el.lamp})`);
    gr.addColorStop(1, 'rgba(255,190,130,0)');
    ctx.fillStyle = gr;
    ctx.save();
    ctx.translate(pc.x, pc.y);
    ctx.scale(1, 0.18);
    ctx.translate(-pc.x, -pc.y);
    ctx.fillRect(pc.x - pool.rx * pc.s, pc.y - pool.rx * pc.s, pool.rx * 2 * pc.s, pool.rx * 2 * pc.s);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }
  for (const fp of footprintsAt(v, s)) {
    const pc = project(cam, [fp.x, 0.002, fp.z]);
    ctx.fillStyle = `rgba(${MUD[0]},${MUD[1]},${MUD[2]},${fp.a})`;
    ctx.beginPath();
    ctx.ellipse(pc.x, pc.y, 0.12 * pc.s, Math.max(1.5, 0.05 * pc.s * cam.y / pc.d * 1.4), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3) cast shadows from the lamp + contact shadows
  {
    const {c, ctx: g} = layer('shadow');
    for (const a of [A, B]) drawCastShadow(g, cam, a.skel, LAMP, 'ground');
    ctx.globalAlpha = 0.42 * el.lamp;
    ctx.filter = 'blur(5px)';
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    for (const a of [A, B]) {
      for (const ft of [a.skel.ftL, a.skel.ftR, a.skel.hip]) {
        const h = ft[1];
        if (h > 0.5) continue;
        const pc = project(cam, [ft[0], 0, ft[2]]);
        const r = (ft === a.skel.hip ? 0.4 : 0.16) * pc.s * (1 - h);
        const gr = ctx.createRadialGradient(pc.x, pc.y, 0, pc.x, pc.y, r);
        gr.addColorStop(0, `rgba(0,0,0,${0.55 * (1 - h * 1.6)})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.translate(pc.x, pc.y);
        ctx.scale(1, 0.25);
        ctx.translate(-pc.x, -pc.y);
        ctx.fillStyle = gr;
        ctx.fillRect(pc.x - r, pc.y - r, r * 2, r * 2);
        ctx.restore();
      }
    }
  }

  const lights = new Map<Actor, ReturnType<typeof lightFor>>();
  for (const a of [A, B]) lights.set(a, lightFor(a, cam, el, hl[0], hlK));

  // 4) wet-ground reflections
  {
    const {c, ctx: g} = layer('refl');
    for (const a of [A, B].sort((p, q) => q.z - p.z)) {
      const m = mudOf(a.id, v, s);
      drawFigure(g, cam, a.skel, a.expr, m, lights.get(a)!, {mirror: true});
    }
    // fade with distance from the ground line
    g.globalCompositeOperation = 'destination-in';
    const gl = project(cam, [0, 0, 0.3]).y;
    const gg = g.createLinearGradient(0, gl, 0, gl + 0.9 * project(cam, [0, 0, 0.3]).s);
    gg.addColorStop(0, 'rgba(0,0,0,1)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gg;
    g.fillRect(0, 0, W, H);
    ctx.save();
    const a0 = project(cam, [cam.x - 30, 0, Math.max(CURB_Z, cam.z + 0.3)]), a1 = project(cam, [cam.x + 30, 0, Math.max(CURB_Z, cam.z + 0.3)]);
    const b0 = project(cam, [cam.x - 30, 0, WALL_Z]), b1 = project(cam, [cam.x + 30, 0, WALL_Z]);
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(b0.x, b0.y);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.2;
    ctx.filter = 'blur(3px)';
    ctx.drawImage(c, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }

  // 5) particles behind / figures / particles in front
  const parts = particlesAt(v, s, A, B, seg.rewind > 0 ? 0.2 : ds * 0.5);
  const drawParticles = (front: boolean) => {
    ctx.lineCap = 'round';
    for (const p of parts) {
      if ((p.p[2] < 0.28) !== front) continue;
      const a = project(cam, p.p), b = project(cam, p.q);
      if (a.d < 0.3) continue;
      const lt = lights.get(B)!.mult;
      const col: RGB = p.tone < 0.3 ? MUD_D : p.tone < 0.8 ? MUD : MUD_L;
      const w = Math.max(1.3, p.r * 2 * a.s);
      ctx.strokeStyle = `rgba(${Math.round(col[0] * lt[0])},${Math.round(col[1] * lt[1])},${Math.round(col[2] * lt[2])},${p.a})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(a.x + 0.01, a.y + 0.01);
      ctx.stroke();
      if (p.r > 0.02) {
        ctx.fillStyle = 'rgba(255,225,190,0.35)';
        ctx.beginPath();
        ctx.arc(a.x - w * 0.15, a.y - w * 0.2, w * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  drawParticles(false);
  {
    for (const a of [A, B].sort((p, q) => q.z - p.z || (p.id === 'A' ? -1 : 1))) {
      const m = mudOf(a.id, v, s);
      const {c, ctx: g} = layer('fig');
      drawFigure(g, cam, a.skel, a.expr, m, lights.get(a)!, {muddyEyes: m.wash > 0.5});
      const b = coc(a.z - cam.z, fd);
      ctx.filter = b > 1 ? `blur(${b.toFixed(1)}px)` : 'none';
      ctx.drawImage(c, 0, 0);
      ctx.filter = 'none';
    }
  }
  drawParticles(true);

  // 6) lamp pole (in front of the walkers)
  drawLampPole(ctx, cam, el);

  // 7) CAR — motion-blurred layer
  if (carOn) {
    const {c, ctx: g} = layer('car');
    drawCar(g, cam, fw, -(fw / WHEEL_R), el, hlK);
    const near = project(cam, [fw, 0, -2.45]);
    const dx = CAR_V * ds * 0.38 * near.s;
    const n = Math.round(clamp(Math.abs(dx) / 7, 1, 16));
    const blur = Math.min(4, coc(-2.45 - cam.z, fd));
    ctx.filter = blur > 1 ? `blur(${blur.toFixed(1)}px)` : 'none';
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = n === 1 ? 1 : 1 / n * 1.15;
      ctx.drawImage(c, -dx * (i / Math.max(1, n - 1)), 0);
    }
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }

  // 8) light
  {
    // soft volumetric cone: quarter-res buffer, upscaled
    let lc = layers.cone;
    if (!lc) {
      lc = document.createElement('canvas');
      lc.width = W / 6;
      lc.height = H / 6;
      layers.cone = lc;
    }
    const g = lc.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, lc.width, lc.height);
    g.setTransform(1 / 6, 0, 0, 1 / 6, 0, 0);
    g.filter = 'blur(3px)';
    drawLampCone(g, cam, el);
    g.filter = 'none';
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(lc, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  drawLampLight(ctx, cam, el, f);
  drawHeadlights(ctx, cam, fw, hlK * (carOn ? 1 : 0));

  // 9) grade + atmosphere
  ctx.globalCompositeOperation = 'soft-light';
  if (md.cold > 0.01) {
    ctx.fillStyle = `rgba(70,110,170,${0.45 * md.cold})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (md.warm > 0.01) {
    ctx.fillStyle = `rgba(255,170,90,${0.35 * md.warm})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'saturation';
  if (md.cold > 0.01) {
    ctx.fillStyle = `rgba(128,128,128,${0.3 * md.cold})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.5, H * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(0,0,0,${0.72 + 0.15 * md.cold})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // 10) rewind: RGB split + tracking-line jitter
  if (seg.rewind > 0.01) rewindFX(ctx, f, seg.rewind);

  // film grain
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.07;
  const gt = grainTile();
  const ox = Math.floor(hash(f * 1.7) * 256), oy = Math.floor(hash(f * 2.3) * 256);
  ctx.save();
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(gt, 'repeat')!;
  ctx.scale(2, 2);
  ctx.fillRect(0, 0, W / 2 + 256, H / 2 + 256);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function rewindFX(ctx: Ctx, f: number, k: number) {
  const {c, ctx: g} = layer('rw');
  g.drawImage(ctx.canvas, 0, 0);
  // chromatic split
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 * k;
  ctx.filter = 'none';
  ctx.drawImage(c, 12 * k, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(${255 - 40 * k},${255 - 25 * k},255,1)`;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  // horizontal tearing bands
  for (let i = 0; i < 7; i++) {
    const y = ((hash(f * 0.37 + i) * H + f * 37) % H);
    const h = 14 + hash(i + f) * 60;
    const dx = (hash(f + i * 3.3) - 0.5) * 80 * k;
    ctx.drawImage(c, 0, y, W, h, dx, y, W, h);
  }
  // white tracking noise line
  const ty = (f * 53) % H;
  ctx.fillStyle = `rgba(255,255,255,${0.12 * k})`;
  ctx.fillRect(0, ty, W, 6);
  ctx.fillStyle = `rgba(0,0,0,${0.25 * k})`;
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
}

export const _unused = {range, L};
