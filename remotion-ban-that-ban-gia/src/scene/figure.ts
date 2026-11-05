// 2.5D stick figure renderer: depth-sorted capsule limbs with ink outline, cylinder shading,
// bone-attached mud and a face drawn on the head sphere (true foreshortening).
import {clamp, hash, lerp, smooth, V3} from '../lib/math';
import {Cam, P2, project} from '../world/camera';
import {L, Skel} from '../world/rig';
import {Expr, MudState, Splat} from '../world/story';

export type RGB = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const rgb = (c: RGB, k: RGB | number = 1, a = 1) => {
  const m = typeof k === 'number' ? [k, k, k] : k;
  return `rgba(${Math.round(clamp(c[0] * m[0], 0, 255))},${Math.round(clamp(c[1] * m[1], 0, 255))},${Math.round(clamp(c[2] * m[2], 0, 255))},${a})`;
};

export const INK: RGB = [16, 15, 19];
export const WHITE: RGB = [243, 242, 246];
export const MUD: RGB = [104, 63, 36];
export const MUD_D: RGB = [70, 41, 24];
export const MUD_L: RGB = [140, 92, 54];

export type Lighting = {mult: RGB; dir: [number, number]; rim: RGB; rimK: number};

type Part = {name: string; pts: P2[]; r: number; d: number};

const capsule = (ctx: Ctx, pts: P2[], r: number) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const ang = Math.atan2(dy, dx);
    ctx.moveTo(a.x + Math.cos(ang - Math.PI / 2) * r, a.y + Math.sin(ang - Math.PI / 2) * r);
    ctx.arc(b.x, b.y, r, ang - Math.PI / 2, ang + Math.PI / 2, false);
    ctx.arc(a.x, a.y, r, ang + Math.PI / 2, ang + (3 * Math.PI) / 2, false);
    ctx.closePath();
  }
};

const along = (pts: P2[], t: number): {x: number; y: number; nx: number; ny: number} => {
  const seg = pts.length - 1;
  const u = clamp(t) * seg;
  const i = Math.min(seg - 1, Math.floor(u));
  const f = u - i;
  const a = pts[i], b = pts[i + 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  return {x: a.x + dx * f, y: a.y + dy * f, nx: -dy / l, ny: dx / l};
};

const blob = (ctx: Ctx, x: number, y: number, r: number, seed: number, lobes = 6) => {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
  for (let i = 0; i < lobes; i++) {
    const a = hash(seed + i) * Math.PI * 2;
    const d = r * (0.55 + 0.45 * hash(seed + i + 0.5));
    const rr = r * (0.35 + 0.35 * hash(seed + i + 0.25));
    const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
    ctx.moveTo(cx + rr, cy);
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  }
};

const mudCol = (tone: number): RGB => (tone < 0.33 ? MUD_D : tone < 0.8 ? MUD : MUD_L);

// face/sphere helpers -----------------------------------------------------------
const sphereDir = (sk: Skel, fx: number, fy: number): V3 => {
  const a = fx * 0.95, b = fy * 0.85;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  // +fx toward the figure's own left (-right), +fy up
  return [
    sk.hf[0] * ca * cb - sk.hrt[0] * sa * cb + sk.hu[0] * sb,
    sk.hf[1] * ca * cb - sk.hrt[1] * sa * cb + sk.hu[1] * sb,
    sk.hf[2] * ca * cb - sk.hrt[2] * sa * cb + sk.hu[2] * sb,
  ];
};

export type DrawOpts = {mirror?: boolean; muddyEyes?: boolean; silhouette?: boolean};

/** Draws one figure into ctx (which should be a transparent layer). */
export function drawFigure(ctx: Ctx, cam: Cam, sk: Skel, ex: Expr, mud: MudState, lt: Lighting, opts: DrawOpts = {}) {
  const my = opts.mirror ? -1 : 1;
  const Pj = (p: V3) => project(cam, [p[0], p[1] * my, p[2]]);
  const head = Pj(sk.head);
  const rad = (p: P2, k = 1) => L.limbR * p.s * k;
  const parts: Part[] = [];
  const mk = (name: string, ps: V3[], k = 1) => {
    const pts = ps.map(Pj);
    const d = pts.reduce((a, p) => a + p.d, 0) / pts.length;
    parts.push({name, pts, r: rad(pts[0], k), d});
  };
  mk('legL', [sk.hiL, sk.knL, sk.ftL]);
  mk('legR', [sk.hiR, sk.knR, sk.ftR]);
  mk('armL', [sk.shL, sk.elL, sk.haL], 0.95);
  mk('armR', [sk.shR, sk.elR, sk.haR], 0.95);
  mk('torso', [sk.hip, sk.neck], 1.18);
  // torso depth biased slightly back so arms swinging alongside read in front
  const torso = parts[4];
  torso.d += 0.0;
  const headD = head.d + 0.0;
  const items: ({kind: 'part'; p: Part} | {kind: 'head'})[] = parts.map((p) => ({kind: 'part' as const, p}));
  items.push({kind: 'head'});
  const dOf = (it: (typeof items)[number]) => (it.kind === 'head' ? headD - 0.001 : it.p.d);
  items.sort((a, b) => dOf(b) - dOf(a));

  const o = Math.max(1.2, 0.017 * head.s); // ink outline width
  const refD = torso.d;
  const splatsBy: Record<string, {sp: Splat; k: number}[]> = {};
  for (const s of mud.splats) (splatsBy[s.sp.part] ??= []).push(s);
  const cleanBy: Record<string, {sp: Splat; k: number}[]> = {};
  for (const s of mud.clean) (cleanBy[s.sp.part] ??= []).push(s);
  const [lx, ly] = lt.dir;

  const shadeCapsule = (p: Part, depthDark: number) => {
    // cylinder shading across the limb axis, lit side toward the key light
    const a = p.pts[0], b = p.pts[p.pts.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const g = ctx.createLinearGradient(cx - nx * p.r, cy - ny * p.r, cx + nx * p.r, cy + ny * p.r);
    const dk = 1 - depthDark;
    g.addColorStop(0, rgb([255, 255, 255], 0.56 * dk));
    g.addColorStop(0.55, rgb([255, 255, 255], 0.9 * dk));
    g.addColorStop(1, rgb([255, 255, 255], 1.0 * dk));
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g;
    ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
    // rim light
    if (lt.rimK > 0.01) {
      const g2 = ctx.createLinearGradient(cx + nx * p.r * 0.35, cy + ny * p.r * 0.35, cx + nx * p.r, cy + ny * p.r);
      g2.addColorStop(0, rgb(lt.rim, 1, 0));
      g2.addColorStop(1, rgb(lt.rim, 1, 0.5 * lt.rimK * dk));
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = g2;
      ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawMud = (list: {sp: Splat; k: number}[] | undefined, pos: (sp: Splat) => {x: number; y: number; s: number} | null, gloss: boolean) => {
    if (!list) return;
    for (const {sp, k} of list) {
      const q = pos(sp);
      if (!q) continue;
      const r = sp.r * q.s * k;
      ctx.beginPath();
      blob(ctx, q.x, q.y, r, sp.seed);
      ctx.fillStyle = rgb(mudCol(sp.tone), lt.mult);
      ctx.fill();
      if (sp.drip > 0) {
        const len = r * (0.8 + 2.2 * sp.drip) * k;
        ctx.beginPath();
        ctx.ellipse(q.x + r * 0.1, q.y + len * 0.6 * my, r * 0.32, len * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (gloss && sp.r > 0.05) {
        ctx.beginPath();
        ctx.ellipse(q.x + lx * r * 0.4, q.y + ly * r * 0.4, r * 0.22, r * 0.12, Math.atan2(ly, lx) + 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,236,210,${0.35 * mud.gloss})`;
        ctx.fill();
      }
    }
  };

  for (const it of items) {
    if (it.kind === 'part') {
      const p = it.p;
      const depthDark = clamp((p.d - refD) / 0.2) * 0.42;
      const base: RGB = opts.silhouette ? [0, 0, 0] : WHITE;
      // ink outline
      ctx.beginPath();
      capsule(ctx, p.pts, p.r + o);
      ctx.fillStyle = rgb(INK);
      ctx.fill();
      if (opts.silhouette) continue;
      ctx.save();
      ctx.beginPath();
      capsule(ctx, p.pts, p.r);
      ctx.clip();
      ctx.fillStyle = rgb(base, lt.mult);
      ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
      if (mud.wash > 0) {
        ctx.fillStyle = rgb(MUD, lt.mult, mud.wash * 0.96);
        ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
      }
      const posOn = (sp: Splat) => {
        const q = along(p.pts, sp.t);
        return {x: q.x + q.nx * sp.off * p.r * 0.9, y: q.y + q.ny * sp.off * p.r * 0.9, s: p.pts[0].s};
      };
      drawMud(splatsBy[p.name], posOn, true);
      if (cleanBy[p.name]) {
        for (const {sp, k} of cleanBy[p.name]) {
          const q = posOn(sp);
          ctx.beginPath();
          blob(ctx, q.x, q.y, sp.r * q.s * k, sp.seed, 3);
          ctx.fillStyle = rgb([226, 214, 200], lt.mult, 0.9);
          ctx.fill();
        }
      }
      shadeCapsule(p, depthDark);
      // wet sheen along the lit edge
      if (mud.wash > 0.3) {
        const a = p.pts[0], b = p.pts[p.pts.length - 1];
        let nx = -(b.y - a.y), ny = b.x - a.x;
        const l = Math.hypot(nx, ny) || 1;
        nx /= l; ny /= l;
        if (nx * lx + ny * ly < 0) { nx = -nx; ny = -ny; }
        ctx.beginPath();
        for (let i = 0; i < p.pts.length; i++) {
          const q = p.pts[i];
          const x = q.x + nx * p.r * 0.55, y = q.y + ny * p.r * 0.55;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,228,196,${0.32 * mud.gloss * mud.wash * (1 - depthDark)})`;
        ctx.lineWidth = p.r * 0.22;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // HEAD
      const R = L.headR * head.s;
      ctx.beginPath();
      ctx.arc(head.x, head.y, R + o, 0, Math.PI * 2);
      ctx.fillStyle = rgb(INK);
      ctx.fill();
      if (opts.silhouette) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(head.x, head.y, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = rgb(WHITE, lt.mult);
      ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
      if (mud.wash > 0) {
        ctx.fillStyle = rgb(MUD, lt.mult, mud.wash * 0.96);
        ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
      }
      const camPos: V3 = [cam.x, cam.y, cam.z];
      const toCam = (() => {
        const v: V3 = [camPos[0] - sk.head[0], camPos[1] - sk.head[1] * my, camPos[2] - sk.head[2]];
        const l = Math.hypot(v[0], v[1], v[2]);
        return [v[0] / l, v[1] / l, v[2] / l] as V3;
      })();
      const onSphere = (fx: number, fy: number) => {
        const d = sphereDir(sk, fx, fy);
        const dd: V3 = [d[0], d[1] * my, d[2]];
        const vis = dd[0] * toCam[0] + dd[1] * toCam[1] + dd[2] * toCam[2];
        const w: V3 = [sk.head[0] + d[0] * L.headR, sk.head[1] + d[1] * L.headR, sk.head[2] + d[2] * L.headR];
        return {p: Pj(w), vis};
      };
      const headSplat = (sp: Splat) => {
        const q = onSphere(sp.off * 1.6, sp.t * 2.4 - 1.2);
        if (q.vis < -0.1) return null;
        return {x: q.p.x, y: q.p.y, s: head.s};
      };
      drawMud(splatsBy.head, headSplat, true);
      if (cleanBy.head) {
        for (const {sp, k} of cleanBy.head) {
          const q = headSplat(sp);
          if (!q) continue;
          ctx.beginPath();
          blob(ctx, q.x, q.y, sp.r * q.s * k, sp.seed, 3);
          ctx.fillStyle = rgb([226, 214, 200], lt.mult, 0.9);
          ctx.fill();
        }
      }
      // sphere shading
      const g = ctx.createRadialGradient(head.x + lx * R * 0.45, head.y + ly * R * 0.45, R * 0.1, head.x, head.y, R * 1.25);
      g.addColorStop(0, 'rgb(255,255,255)');
      g.addColorStop(0.6, 'rgb(222,222,226)');
      g.addColorStop(1, 'rgb(120,122,134)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g;
      ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
      if (lt.rimK > 0.01) {
        const g2 = ctx.createRadialGradient(head.x - lx * R * 0.5, head.y - ly * R * 0.5, R * 1.05, head.x - lx * R * 0.5, head.y - ly * R * 0.5, R * 1.55);
        g2.addColorStop(0, rgb(lt.rim, 1, 0));
        g2.addColorStop(1, rgb(lt.rim, 1, 0.55 * lt.rimK));
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = g2;
        ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
      }
      ctx.globalCompositeOperation = 'source-over';
      if (mud.wash > 0.3) {
        ctx.beginPath();
        ctx.ellipse(head.x + lx * R * 0.42, head.y + ly * R * 0.42, R * 0.26, R * 0.14, Math.atan2(ly, lx) + Math.PI / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,236,214,${0.42 * mud.gloss * mud.wash})`;
        ctx.fill();
      }
      if (!opts.mirror) drawFace(ctx, onSphere, ex, R, lt, !!opts.muddyEyes);
      ctx.restore();
    }
  }
}

type OnSphere = (fx: number, fy: number) => {p: P2; vis: number};

function drawFace(ctx: Ctx, onSphere: OnSphere, e: Expr, R: number, lt: Lighting, muddy: boolean) {
  // local affine frame on the sphere at (fx, fy): unit x = right on face, unit y = up
  const frame = (fx: number, fy: number, scale: number) => {
    const eps = 0.04;
    const c = onSphere(fx, fy), px = onSphere(fx - eps, fy), py = onSphere(fx, fy + eps);
    const k = scale / (eps * 0.95);
    return {
      vis: c.vis,
      set: () => ctx.setTransform((px.p.x - c.p.x) * k * 0.95, (px.p.y - c.p.y) * k * 0.95, (py.p.x - c.p.x) * k * 0.85 * 1.12, (py.p.y - c.p.y) * k * 0.85 * 1.12, c.p.x, c.p.y),
    };
  };
  const base = ctx.getTransform();
  const ink = rgb(INK);
  const lookX = e.lookX * 0.1, lookY = e.lookY * 0.08;
  const eyeY = 0.16;
  // NB: in this frame, +x is the figure's RIGHT on screen when facing camera
  for (const side of [-1, 1]) {
    const fx = side * 0.36 + lookX * 0.7;
    const fr = frame(-fx, eyeY + lookY * 0.6, 0.105 * e.size);
    const a = smooth((fr.vis - 0.02) / 0.3);
    if (a <= 0.01) continue;
    ctx.globalAlpha = a;
    fr.set();
    const happy = clamp(e.happy);
    const open = clamp(e.open) * (1 - smooth((happy - 0.2) / 0.5));
    if (muddy) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.45, 1.45 * Math.max(0.25, open), 0, 0, Math.PI * 2);
      ctx.fillStyle = rgb([236, 230, 222], lt.mult);
      ctx.fill();
    }
    if (open > 0.08) {
      ctx.beginPath();
      ctx.ellipse(lookX * 3, lookY * 3, 0.92, 1.05 * open, 0, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
      // catchlight
      if (e.size > 1.1 || muddy) {
        ctx.beginPath();
        ctx.arc(lookX * 3 + 0.3, lookY * 3 + 0.35 * open, 0.26, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
      }
    } else if (happy < 0.4) {
      ctx.beginPath();
      ctx.moveTo(-1, 0);
      ctx.lineTo(1, 0);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.42;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    if (happy > 0.4) {
      ctx.beginPath();
      ctx.moveTo(-1.05, -0.35);
      ctx.quadraticCurveTo(0, 1.25, 1.05, -0.35);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.42;
      ctx.lineCap = 'round';
      ctx.globalAlpha = a * smooth((happy - 0.4) / 0.3);
      ctx.stroke();
    }
    // brows
    const bAmt = clamp(Math.abs(e.brow) * 1.4 + e.browUp * 0.6 + e.browAsym);
    if (bAmt > 0.05) {
      const up = e.browUp * 0.35 + (side > 0 ? e.browAsym * 0.45 : -e.browAsym * 0.1);
      const tilt = e.brow * 0.45 * side; // inner end (toward centre) goes down when angry
      ctx.beginPath();
      ctx.moveTo(-1.1, 1.75 + up - tilt);
      ctx.lineTo(1.1, 1.75 + up + tilt);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.38;
      ctx.lineCap = 'round';
      ctx.globalAlpha = a * clamp(bAmt * 1.5);
      ctx.stroke();
    }
  }
  // mouth
  const sm = e.smirk;
  const mx = 0.06 * sm;
  const fr = frame(-mx, -0.36 + 0.02 * e.smile, 0.2);
  const a = smooth((fr.vis - 0.02) / 0.3);
  if (a > 0.01) {
    ctx.globalAlpha = a;
    fr.set();
    const w = 0.85 + 0.25 * Math.max(0, e.smile) + 0.15 * e.mOpen;
    const cl = 0.42 * e.smile + 0.05 + sm * -0.05;
    const cr = 0.42 * e.smile + 0.05 + sm * 0.55;
    const mid = -0.28 * e.smile;
    const op = clamp(e.mOpen) * 1.3;
    ctx.lineWidth = 0.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = ink;
    if (op < 0.08) {
      ctx.beginPath();
      ctx.moveTo(-w, cl);
      ctx.quadraticCurveTo(0, mid * 2 - (cl + cr) / 4, w, cr);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-w, cl);
      ctx.quadraticCurveTo(0, mid * 0.6 + 0.04, w, cr);
      ctx.quadraticCurveTo(0, mid * 2 - op * 1.4, -w, cl);
      ctx.closePath();
      ctx.fillStyle = 'rgb(46,18,20)';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(0, mid - op * 0.65, w * 0.55, op * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(206,86,92)';
      ctx.fill();
      // teeth line on big laughs
      if (e.smile > 0.6) {
        ctx.beginPath();
        ctx.ellipse(0, mid * 0.6 + 0.04, w * 0.8, 0.12 + op * 0.06, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgb(250,248,244)';
        ctx.fill();
      }
      ctx.restore();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(base);
}

/** Ground shadow of a figure cast by a point light onto y=0 (as thick strokes). */
export function drawCastShadow(ctx: Ctx, cam: Cam, sk: Skel, light: V3, plane: 'ground' | 'wall', wallZ = 2.6) {
  const proj = (p: V3): P2 | null => {
    if (plane === 'ground') {
      if (p[1] >= light[1] - 0.05) return null;
      const t = light[1] / (light[1] - p[1]);
      return project(cam, [light[0] + (p[0] - light[0]) * t, 0, light[2] + (p[2] - light[2]) * t]);
    }
    if (p[2] <= light[2] + 0.05) return null;
    const t = (wallZ - light[2]) / (p[2] - light[2]);
    return project(cam, [light[0] + (p[0] - light[0]) * t, light[1] + (p[1] - light[1]) * t, wallZ]);
  };
  const width = (p: V3) => {
    // shadow thickness scales with the projection
    const t = plane === 'ground' ? light[1] / Math.max(0.1, light[1] - p[1]) : (wallZ - light[2]) / Math.max(0.1, p[2] - light[2]);
    return t;
  };
  const chains: V3[][] = [[sk.hiL, sk.knL, sk.ftL], [sk.hiR, sk.knR, sk.ftR], [sk.shL, sk.elL, sk.haL], [sk.shR, sk.elR, sk.haR], [sk.hip, sk.neck]];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  for (const ch of chains) {
    const ps = ch.map(proj);
    if (ps.some((p) => !p)) continue;
    ctx.beginPath();
    ps.forEach((p, i) => (i ? ctx.lineTo(p!.x, p!.y) : ctx.moveTo(p!.x, p!.y)));
    ctx.lineWidth = 2 * L.limbR * ps[0]!.s * width(ch[0]) * (ch.length === 2 ? 1.2 : 1);
    ctx.stroke();
  }
  const hp = proj(sk.head);
  if (hp) {
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, L.headR * hp.s * width(sk.head), 0, Math.PI * 2);
    ctx.fill();
  }
}

export {lerp};
