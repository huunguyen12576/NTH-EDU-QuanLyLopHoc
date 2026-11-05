import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {blink, clamp, easeIn, easeIO, easeOut, kf, lerp, noise1, pop, ramp, win} from './lib/anim';
import {Figure, Pose, Vec, hipY, legs} from './components/Figure';
import {BackWall, Counter, Defs, Dust, Floor, GroupTable, Lamp, LightCone, Stool, WORLD} from './components/Set';
import {Bubble, FONT, Label} from './components/Bubble';
import {Soundtrack} from './Soundtrack';
import {B} from './beats';
export {B};

export const DURATION = 840;

// ---------------------------------------------------------------- beats


const RED = '#FF3B45';
const BLUE = '#8DB4F0';
const AMBER = '#FFC46B';

// depth helpers: d = 0 (group table) .. 1 (front counter)
const floorAt = (d: number) => lerp(WORLD.backFloor, WORLD.frontFloor, d);
const scaleAt = (d: number) => lerp(1.04, 1.3, d);
const SEAT = 90;

// ---------------------------------------------------------------- camera
const camKeys = {
  x: [[0, 545], [75, 545], [112, 545], [140, 725], [204, 715], [236, 470], [262, 400], [342, 410], [384, 700], [414, 708], [422, 752, easeOut], [446, 680], [500, 665], [534, 620], [604, 545], [680, 545], [840, 545]],
  y: [[0, 960], [75, 969], [112, 969], [140, 954], [204, 954], [236, 974], [262, 974], [342, 974], [384, 954], [414, 949], [422, 914, easeOut], [446, 939], [500, 949], [534, 964], [604, 964], [680, 954], [840, 934]],
  z: [[0, 1.95], [75, 1.36], [112, 1.38], [140, 1.6], [204, 1.58], [236, 1.5], [262, 1.62], [342, 1.62], [384, 1.58], [414, 1.62], [422, 1.8, easeOut], [446, 1.64], [500, 1.6], [534, 1.45], [604, 1.36], [680, 1.3], [840, 1.37]],
} as const;

type Cam = {x: number; y: number; z: number; r: number};
const camera = (f: number): Cam => {
  const k = (keys: readonly (readonly number[] | readonly [number, number, (t: number) => number])[]) => kf(f, keys as never);
  const shake = Math.exp(-Math.max(0, f - B.flip) / 6) * (f >= B.flip ? 1 : 0);
  return {
    x: k(camKeys.x) + noise1('cx', f / 40) * 5 + Math.sin(f * 2.1) * 4 * shake,
    y: k(camKeys.y) + noise1('cy', f / 45) * 4 + Math.cos(f * 2.7) * 3 * shake,
    z: k(camKeys.z),
    r: noise1('cr', f / 60) * 0.18,
  };
};

const layer = (c: Cam, d: number) => {
  const z = 1 + (c.z - 1) * d;
  const cx = 540 + (c.x - 540) * d;
  const cy = 960 + (c.y - 960) * d;
  return `translate(540 960) rotate(${c.r * d}) scale(${z}) translate(${-cx} ${-cy})`;
};

// ---------------------------------------------------------------- poses
const base = (over: Partial<Pose>): Pose => ({
  x: 0, y: 0, s: 1, face: 1, lean: 6, tilt: 6,
  handF: [40, -40], handB: [30, -40], footF: [64, SEAT], footB: [54, SEAT],
  eyes: 'open', look: [0, 0], blink: 0, mouth: 'soft', brow: 'none', blush: 0,
  tone: 'white', squash: 1, rim: '#FFD08A', rimSide: 1, rimAmt: 0.6,
  ...over,
});

/** walk phase from accumulated path length up to frame f */
const walkPhase = (f: number, px: (f: number) => number, pd: (f: number) => number) => {
  let dist = 0;
  for (let i = 1; i <= f; i++) {
    dist += Math.hypot(px(i) - px(i - 1), (pd(i) - pd(i - 1)) * 160);
  }
  return dist / 22;
};
const speedAt = (f: number, px: (f: number) => number, pd: (f: number) => number) =>
  clamp(Math.hypot(px(f + 1) - px(f - 1), (pd(f + 1) - pd(f - 1)) * 160) / 6);

const laughEnv = (f: number) =>
  Math.max(win(f, 26, 92, 6, 14), win(f, 128, 176, 6, 12), win(f, 236, 280, 6, 12), win(f, B.laugh, 704, 8, 20));

// Introvert ------------------------------------------------------------
const introvert = (f: number): Pose => {
  const look = ramp(f, B.iLook, B.iLook + 10, easeOut) * (1 - ramp(f, 346, 360));
  const happy = win(f, B.iReply + 4, 344, 4, 6);
  const flip = clamp((f - B.page) / 14);
  const breath = Math.sin(f / 22) * 1.4;
  return base({
    x: 300, s: 1.3, y: WORLD.frontFloor - SEAT * 1.3 + breath * 0.3, face: 1,
    lean: 9 - look * 6, tilt: lerp(16, -4, look) + breath,
    handF: [54, -42], handB: [42, -52],
    eyes: happy > 0.5 ? 'happy' : look > 0.4 ? 'open' : 'down',
    look: [lerp(3, 5, look), lerp(5, -2, look)],
    blink: look > 0.4 && happy < 0.5 ? blink(f, 'i', 70) : 0,
    mouth: happy > 0.3 ? 'smile' : 'soft',
    rim: '#FFC98A', rimSide: 1, rimAmt: 0.55 + 0.3 * ramp(f, B.iReply, B.iReply + 40),
    book: {open: 1, glow: 0.45 + 0.55 * ramp(f, B.iReply + 6, B.iReply + 50) , flip},
  });
};

// Shy --------------------------------------------------------------------
const shyX = (f: number) => kf(f, [[B.walkBack, 790], [B.sitBack, 742]]);
const shyD = (f: number) => kf(f, [[B.walkBack, 1], [B.sitBack, 0]]);
const shy = (f: number): Pose => {
  const d = shyD(f);
  const s = scaleAt(d);
  const sit = Math.max(1 - ramp(f, B.startle + 2, B.startle + 16, easeOut), ramp(f, B.sitBack - 4, B.sitBack + 12));
  const phase = walkPhase(f, shyX, shyD);
  const walkAmt = speedAt(f, shyX, shyD);
  const jump = f >= B.startle ? Math.exp(-(f - B.startle) / 4) * Math.sin(((f - B.startle) / 8) * Math.PI) : 0;
  const hope = Math.max(win(f, B.t1, B.t1 + 22, 5, 14), win(f, B.t2, B.t2 + 22, 5, 14), win(f, B.t3, B.t3 + 26, 5, 16));
  const chin = 1 - ramp(f, B.startle - 2, B.startle + 4);
  const joined = ramp(f, B.sitBack, B.sitBack + 20);
  const laughing = f > B.laugh ? laughEnv(f) : 0;
  const lg = foot(sit, phase, walkAmt);
  const wide = f >= B.startle && f < B.flip + 26;
  const smiley = f >= B.aYes + 8;
  const sitHandsF: Vec = [lerp(30, 46, 1 - chin), lerp(-98, -44, 1 - chin)];
  const walkHandF: Vec = [10 + Math.sin(phase + Math.PI) * 18 * walkAmt, 8];
  const scratch = win(f, B.aYes + 4, B.aCome, 6, 8); // shy scratches head, embarrassed
  const standHandF: Vec = scratch > 0 ? [lerp(10, 2, scratch), lerp(8, -150, scratch)] : [10, 8];
  const handF: Vec = sit > 0.5 ? sitHandsF : walkAmt > 0.05 ? walkHandF : standHandF;
  return base({
    x: shyX(f), s,
    y: hipY(floorAt(d), s, sit, SEAT, phase, walkAmt) - jump * 34,
    face: -1,
    lean: lerp(4, 14, chin * sit) - hope * 6 + laughing * Math.sin(f * 0.9) * 3 - jump * 6,
    tilt: lerp(-2, 10, chin * sit) - hope * 8 - laughing * 8,
    handF, handB: sit > 0.5 ? [52, -44] : [-6 + Math.sin(phase) * 16 * walkAmt, 8],
    footF: lg.footF, footB: lg.footB,
    eyes: laughing > 0.3 ? 'happy' : wide ? 'wide' : smiley && f > B.aYes + 20 ? 'happy' : 'open',
    look: wide ? [3, -1] : f < B.t1 ? [5, 0] : f < 210 ? [4, -1 - hope * 2] : f < 380 ? [5, 1] : [4, 0],
    blink: wide ? 0 : blink(f, 's', 80),
    mouth: laughing > 0.3 ? 'laugh' : f >= B.startle && f < B.flip + 2 ? 'o' : f >= B.flip && f < B.aYes ? 'grin' : smiley ? 'smile' : hope > 0.3 ? 'soft' : 'worried',
    brow: wide ? 'raise' : f < B.startle && f > B.t1 - 10 ? 'worry' : 'none',
    blush: win(f, B.flip + 4, B.sitBack + 10, 8, 20) * 0.9,
    squash: 1 + jump * 0.08 - (f >= B.sitBack + 2 && f < B.sitBack + 12 ? Math.sin(((f - B.sitBack - 2) / 10) * Math.PI) * 0.05 : 0),
    rim: joined > 0.5 ? '#FFD08A' : '#9DBCF0',
    rimSide: -1,
    rimAmt: 0.55 + 0.25 * joined,
  });
};
const foot = (sit: number, phase: number, walkAmt: number) => legs(sit, phase, walkAmt, SEAT);

// A: the friend who invites ----------------------------------------------
const aX = (f: number) => kf(f, [[B.aStand + 12, 440], [B.aArrive1, 470], [B.aGo2, 470], [B.aArrive2, 668], [B.walkBack, 668], [B.sitBack - 8, 440]]);
const aD = (f: number) => kf(f, [[B.aStand + 12, 0], [B.aArrive1, 1], [B.walkBack, 1], [B.sitBack - 8, 0]]);
const friendA = (f: number): Pose => {
  const d = aD(f);
  const s = scaleAt(d);
  const up = ramp(f, B.aStand, B.aStand + 14, easeOut);
  const down = ramp(f, B.sitBack - 8, B.sitBack + 6);
  const sit = Math.max(1 - up, down);
  const anticip = win(f, B.aStand - 6, B.aStand + 8, 6, 6);
  const phase = walkPhase(f, aX, aD);
  const walkAmt = speedAt(f, aX, aD);
  const lg = foot(sit, phase, walkAmt);
  const facing: 1 | -1 =
    f < B.aStand + 10 ? 1 : f < B.aGo2 ? -1 : f < B.walkBack ? 1 : f < B.sitBack - 4 ? -1 : 1;
  const talking = Math.max(win(f, B.aAsk1, 330), win(f, B.aOk, 360), win(f, B.aAsk2, 446), win(f, B.aYes, 492), win(f, B.aCome, 532));
  const wave = win(f, B.aAsk1 - 2, B.aAsk1 + 26, 6, 8) + win(f, B.aAsk2 - 2, B.aAsk2 + 26, 6, 8) + win(f, B.aCome, B.aCome + 30, 4, 8);
  const shrug = win(f, B.aYes, B.aYes + 34, 6, 8);
  const laughing = sit > 0.5 ? laughEnv(f) : 0;
  const waveHand: Vec = [46 + Math.sin(f * 0.6) * 12, -150 + Math.cos(f * 0.6) * 6];
  const restHand: Vec = walkAmt > 0.05 ? [8 + Math.sin(phase + Math.PI) * 20 * walkAmt, 8] : [14, 8];
  const handF: Vec = sit > 0.5 ? [52, -46] : wave > 0.01 ? [lerp(restHand[0], waveHand[0], clamp(wave)), lerp(restHand[1], waveHand[1], clamp(wave))] : shrug > 0 ? [lerp(14, 40, shrug), lerp(8, -50, shrug)] : restHand;
  const handB: Vec = sit > 0.5 ? [40, -44] : shrug > 0 ? [lerp(-6, -26, shrug), lerp(8, -48, shrug)] : [-6 + Math.sin(phase) * 20 * walkAmt, 8];
  return base({
    x: aX(f), s, face: facing,
    y: hipY(floorAt(d), s, sit, SEAT, phase, walkAmt),
    lean: 4 + anticip * 22 + laughing * 6 * Math.sin(f * 0.8) + walkAmt * 6,
    tilt: shrug * 10 - laughing * 10 + talking * Math.sin(f * 0.7) * 3,
    handF, handB, footF: lg.footF, footB: lg.footB,
    eyes: laughing > 0.3 ? 'happy' : f > B.aOk && f < B.aOk + 22 ? 'happy' : 'open',
    look: [4, 0], blink: blink(f, 'a', 75),
    mouth: laughing > 0.3 ? 'laugh' : talking > 0.5 && Math.sin(f * 1.3) > -0.2 ? 'grin' : 'smile',
    brow: shrug > 0.3 ? 'puzzled' : 'none',
    tone: 'gray', rim: '#FFD08A', rimSide: d < 0.5 ? 1 : 1, rimAmt: 0.55,
  });
};

const groupMember = (f: number, x: number, face: 1 | -1, seed: string, shiftX = 0): Pose => {
  const l = laughEnv(f + (seed === 'b' ? 2 : 5));
  const s = scaleAt(0);
  return base({
    x: x + shiftX, s, face,
    y: WORLD.backFloor - SEAT * s + Math.sin(f * 0.9 + seed.length) * 2.5 * l,
    lean: 10 + Math.sin(f * 0.85 + (seed === 'c' ? 1 : 0)) * 5 * l,
    tilt: 4 - l * 12,
    handF: [50, -48], handB: [38, -46],
    eyes: l > 0.3 ? 'happy' : 'open', look: [4, 1], blink: blink(f, seed, 85),
    mouth: l > 0.3 ? 'laugh' : 'smile',
    tone: 'gray', rim: '#FFD08A', rimSide: x < WORLD.lampX ? 1 : -1, rimAmt: 0.6,
  });
};

// head position helper for labels / tails
const headOf = (p: Pose): Vec => {
  const lean = (p.lean * Math.PI) / 180;
  const tl = ((p.lean + p.tilt) * Math.PI) / 180;
  const lx = Math.sin(lean) * 92 + Math.sin(tl) * 42;
  const ly = -Math.cos(lean) * 92 - Math.cos(tl) * 42;
  return [p.x + lx * p.s * p.face, p.y + ly * p.s * p.squash];
};

// ---------------------------------------------------------------- overlay text
const Words: React.FC<{text: string; start: number; f: number; size: number; weight?: number; color?: string; accent?: string[]; accentColor?: string; align?: 'left' | 'center' | 'right'}> = ({
  text, start, f, size, weight = 700, color = '#F4F4F6', accent = [], accentColor = AMBER, align = 'center',
}) => {
  const words = text.split(' ');
  return (
    <div style={{fontFamily: FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.22, letterSpacing: '-0.01em', textAlign: align, textShadow: '0 6px 30px rgba(0,0,0,0.8)'}}>
      {words.map((w, i) => {
        const t = ramp(f, start + i * 3, start + i * 3 + 14, easeOut);
        const isAccent = accent.includes(w.replace(/[.,!?…]/g, ''));
        return (
          <span key={i} style={{display: 'inline-block', marginRight: '0.26em', opacity: t, transform: `translateY(${(1 - t) * 26}px)`, filter: `blur(${(1 - t) * 8}px)`, color: isAccent ? accentColor : undefined}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- composition
export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f);

  const on = f < B.lampOn ? 0 : f < 20 ? [1, 0.15, 0.9, 0.3, 1, 0.6, 1][Math.floor((f - B.lampOn) / 2.3)] ?? 1 : 1;
  const winLight = ramp(f, 2, 40);
  const warm = ramp(f, B.sitBack - 10, B.sitBack + 30);
  const endDim = ramp(f, B.msg1 - 10, B.msg1 + 30) * 0.42 + ramp(f, B.cta - 6, B.cta + 24) * 0.2;

  const I = introvert(f);
  const S = shy(f);
  const A = friendA(f);
  const G1 = groupMember(f, 545, 1, 'b', -ramp(f, B.walkBack, B.sitBack) * 8);
  const G2 = groupMember(f, 648, -1, 'c', -ramp(f, B.walkBack, B.sitBack) * 14);

  const sD = shyD(f);
  const aD_ = aD(f);
  const back: [string, Pose][] = [['g1', G1], ['g2', G2]];
  const front: [string, Pose][] = [];
  (aD_ < 0.08 ? back : front).push(['a', A]);
  (sD < 0.08 ? back : front).push(['s', S]);
  front.push(['i', I]);
  back.sort((a, b) => a[1].s - b[1].s);
  front.sort((a, b) => a[1].s - b[1].s);

  const hS = headOf(S);
  const hI = headOf(I);
  const hA = headOf(A);
  const mouthS: Vec = [hS[0] - 14 * S.s, hS[1] + 24 * S.s];
  const mouthA: Vec = [hA[0] + 10 * A.face, hA[1] + 22 * A.s];

  // shy's inner voice
  const thoughtMode = (k: number) => ramp(f, B.flip + k * 5, B.flip + k * 5 + 8, easeIO);
  const lift = kf(f, [[B.startle, 0], [B.flip + 6, -96, easeOut]]);
  const bob = (k: number) => Math.sin(f / 18 + k) * 3;
  const thoughtsOut = (1 - ramp(f, B.aCome - 6, B.aCome + 8, easeIn)) * (1 - 0.7 * win(f, 226, 384, 14, 16));
  const flash = (k: number) => win(f, B.flip + k * 5 + 3, B.flip + k * 5 + 18, 2, 12);
  const tX = 880;
  const t1: Vec = [tX + 4, 1038 + lift + bob(0)];
  const t2: Vec = [tX - 6, 958 + lift + bob(1)];
  const t3: Vec = [tX - 18, 860 + lift + bob(2)];

  const cityPar = (cam.x - 540) * 0.08;

  return (
    <AbsoluteFill style={{backgroundColor: '#050506'}}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute'}}>
        <Defs />
        <g transform={layer(cam, 0.88)}>
          <BackWall light={winLight} cityPar={cityPar} />
        </g>
        <g transform={layer(cam, 0.95)}>
          <Lamp on={on} />
        </g>
        <g transform={layer(cam, 1)}>
          <Floor on={on} warm={warm} />
          <LightCone on={on} warm={warm} />
          {/* stools */}
          <Stool x={436} floorY={WORLD.backFloor} s={1.04} seatY={WORLD.backFloor - SEAT * 1.04} />
          <Stool x={640} floorY={WORLD.backFloor} s={1.04} seatY={WORLD.backFloor - SEAT * 1.04} />
          <Stool x={742} floorY={WORLD.backFloor} s={1.04} seatY={WORLD.backFloor - SEAT * 1.04} />
          {back.map(([id, p]) => (
            <g key={id} filter="url(#figShadow)">
              <Figure p={p} id={id} />
            </g>
          ))}
          <GroupTable warm={warm} />
          {/* cold window pool around shy, warm pool around introvert's book */}
          <ellipse cx={800} cy={1180} rx={190} ry={170} fill="url(#coldPool)" opacity={(1 - warm) * winLight} style={{mixBlendMode: 'screen'}} />
          <ellipse cx={330} cy={1180} rx={200} ry={170} fill="url(#pool)" opacity={(0.35 + 0.35 * I.book!.glow) * on} style={{mixBlendMode: 'screen'}} />
          <Stool x={300 + 30} floorY={WORLD.frontFloor} s={1.3} seatY={WORLD.frontFloor - SEAT * 1.3} />
          <Stool x={790 - 30} floorY={WORLD.frontFloor} s={1.3} seatY={WORLD.frontFloor - SEAT * 1.3} />
          {front.map(([id, p]) => (
            <g key={id} filter="url(#figShadow)">
              <Figure p={p} id={id} />
            </g>
          ))}
          <Counter on={on} steam={1} f={f} />

          {/* group laughter */}
          {[[30, 470, 1020], [52, 640, 1000], [132, 560, 1005], [150, 470, 1015], [240, 600, 1010], [612, 680, 990], [628, 520, 1000], [650, 760, 985], [672, 600, 990]].map(([s0, x, y], i) => {
            const t = clamp((f - s0) / 34);
            if (t <= 0 || t >= 1) return null;
            const late = s0 > 600;
            return (
              <text key={i} x={x + Math.sin(t * 5 + i) * 6} y={y - t * 60} textAnchor="middle" fontFamily={FONT} fontWeight={800}
                fontSize={late ? 30 : 24} fill={late ? AMBER : '#C9CAD0'} opacity={Math.sin(t * Math.PI) * (late ? 1 : 0.75)} letterSpacing="0.08em">
                ha ha
              </text>
            );
          })}

          {/* shy's inner voice → spoken words */}
          <Bubble x={t3[0]} y={t3[1]} lines={['Mình ngồi cùng', 'được không?']} appear={pop(f, B.t3)} mode={thoughtMode(2)} tail={[t2[0] + 30, t2[1] - 56]} opacity={thoughtsOut} flash={flash(2)} seed={2} />
          <Bubble x={t2[0]} y={t2[1]} lines={['Chào mọi người!']} appear={pop(f, B.t2)} mode={thoughtMode(1)} tail={[t1[0] + 10, t1[1] - 50]} opacity={thoughtsOut} flash={flash(1)} seed={1} />
          <Bubble x={t1[0]} y={t1[1]} lines={['Chào.']} appear={pop(f, B.t1)} mode={thoughtMode(0)} tail={f > B.flip ? mouthS : [hS[0] + 6, hS[1] - 46]} opacity={thoughtsOut} flash={flash(0)} seed={0} />

          {/* A's lines */}
          <Bubble x={470} y={900} lines={['Ngồi chung với', 'tụi mình không?']} appear={pop(f, B.aAsk1)} opacity={1 - ramp(f, 326, 336)} mode={1} tail={mouthA} />
          <Bubble x={262} y={1010} lines={['Thôi, mình ổn mà.']} appear={pop(f, B.iReply)} opacity={1 - ramp(f, 352, 364)} mode={1} tail={[hI[0] + 18, hI[1] + 22]} />
          <Bubble x={520} y={940} lines={['Okê!']} appear={pop(f, B.aOk)} opacity={1 - ramp(f, 362, 372)} mode={1} tail={mouthA} />
          <Bubble x={540} y={1000} lines={['Ngồi chung với', 'tụi mình không?']} appear={pop(f, B.aAsk2)} opacity={1 - ramp(f, B.flip + 14, B.flip + 24)} mode={1} tail={mouthA} />
          <Bubble x={520} y={1000} lines={['Ờ… được chứ?']} appear={pop(f, B.aYes)} opacity={1 - ramp(f, B.aCome - 4, B.aCome + 4)} mode={1} tail={mouthA} />
          <Bubble x={560} y={990} lines={['Lại đây ngồi!']} appear={pop(f, B.aCome)} opacity={1 - ramp(f, B.walkBack + 10, B.walkBack + 20)} mode={1} tail={mouthA} />

          {/* labels */}
          <Label x={hI[0] - 10} y={hI[1] - 58} text="HƯỚNG NỘI" color={RED} o={win(f, B.labelI, B.msg1, 10, 16)} under={ramp(f, B.labelI + 4, B.labelI + 20, easeOut)} />
          <Label x={hS[0] + 6} y={hS[1] - 58 * S.s} text="NHÚT NHÁT" color={warm > 0.5 ? AMBER : BLUE} o={win(f, B.labelS, B.msg1, 10, 16)} under={ramp(f, B.labelS + 4, B.labelS + 20, easeOut)} />

          <g transform="translate(0 0)">
            <Dust f={f} on={on} />
          </g>
        </g>
      </svg>

      {/* cinematic grade: vignette + bloom tint + grain */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 100%)'}} />
      <AbsoluteFill style={{background: `rgba(3,3,4,${endDim})`}} />
      <AbsoluteFill style={{background: `rgba(0,0,0,${1 - clamp(f / 4)})`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', opacity: 0.07, mixBlendMode: 'overlay'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 9} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#grain)" />
      </svg>

      {/* hook */}
      <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 210, opacity: 1 - ramp(f, 92, 108)}}>
        <Words text="Cùng ngồi một mình." start={B.hook1} f={f} size={66} weight={800} />
        <div style={{height: 14}} />
        <Words text="Nhưng không giống nhau." start={B.hook2} f={f} size={52} weight={600} color="#D4D5DC" />
      </AbsoluteFill>

      {/* ending: two stanzas tied spatially to the two characters, then the call */}
      <AbsoluteFill style={{opacity: 1 - ramp(f, 828, 840)}}>
        <div style={{position: 'absolute', left: 64, top: 1560, width: 620}}>
          <Words text="Có người im lặng" start={B.msg1} f={f} size={44} weight={500} color="#D9DAE0" align="left" />
          <Words text="vì thấy bình yên." start={B.msg1 + 10} f={f} size={54} weight={800} accent={['bình', 'yên']} accentColor={RED} align="left" />
        </div>
        <div style={{position: 'absolute', right: 64, top: 1716, width: 640}}>
          <Words text="Có người im lặng" start={B.msg2} f={f} size={44} weight={500} color="#D9DAE0" align="right" />
          <Words text="vì chờ một lời mời." start={B.msg2 + 10} f={f} size={54} weight={800} accent={['lời', 'mời']} accentColor={AMBER} align="right" />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 220, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <Words text="Hãy là người" start={B.cta} f={f} size={54} weight={500} color="#E6E6EA" />
          <Words text="mở lời trước." start={B.cta + 8} f={f} size={86} weight={800} accent={['mở', 'lời']} accentColor={AMBER} />
          <div style={{marginTop: 26, height: 4, borderRadius: 2, background: AMBER, width: 220 * ramp(f, B.cta + 24, B.cta + 44, easeOut), boxShadow: `0 0 24px ${AMBER}`}} />
        </div>
      </AbsoluteFill>

      <Soundtrack />
    </AbsoluteFill>
  );
};
