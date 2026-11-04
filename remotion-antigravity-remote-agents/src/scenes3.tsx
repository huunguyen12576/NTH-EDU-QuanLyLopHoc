import React from 'react';
import {Abs, C, DURATION, E, Ember, FPS, Laptop, MONO, SERIF, T, TE, TW, TWE, Txt, fbm, mix, ramp, win} from './lib';
import type {SP} from './scenes1';

// ═════════════ 9 · The race — one vanishing point ═════════════
const VP = {x: 540, y: 600};
export const Race: React.FC<SP> = ({t}) => {
  const a = T('claude');
  const vis = ramp(t, a - 0.35, a + 0.3, E.soft);
  const out = ramp(t, T('cauhoi') - 0.45, T('cauhoi') - 0.05, E.soft);
  const go = ramp(t, T('huong') - 0.1, TE('huong') + 0.2, E.inOut);
  const flare = ramp(t, TW('nghiemtuc', 1) - 0.1, TW('nghiemtuc', 1) + 0.5, E.out); // "nấu"
  const lanes = [
    {k: 'claude', label: 'Claude Code', x0: 290},
    {k: 'codex', label: 'Codex', x0: 790},
    {k: 'antig', label: 'Antigravity', x0: 540, w: 4},
  ];
  const y0 = 1250;
  const along = (x0: number, k: number) => ({x: mix(x0, VP.x, k), y: mix(y0, VP.y, k)});
  return (
    <Abs style={{opacity: vis * (1 - out)}}>
      {/* corridor floor: Kubrick one-point symmetry */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id="fade" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={C.paper} stopOpacity={0.22} />
            <stop offset="1" stopColor={C.paper} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={540 + i * 210} y1={1500} x2={VP.x} y2={VP.y} stroke="url(#fade)" strokeWidth={1.5} />
        ))}
        {Array.from({length: 9}).map((_, i) => {
          const z = ((i + t * 0.9 * (0.3 + go)) % 9) / 9;
          const y = mix(VP.y, 1500, z * z);
          return <line key={'h' + i} x1={0} y1={y} x2={1080} y2={y} stroke={C.paper} strokeOpacity={0.1 * z} strokeWidth={1.5} />;
        })}
        {/* horizon glow where all paths meet */}
        <line x1={140} y1={VP.y} x2={940} y2={VP.y} stroke={C.ember} strokeOpacity={0.25 + 0.4 * go} strokeWidth={2} />
      </svg>
      <Abs style={{background: `radial-gradient(ellipse 40% 10% at 50% ${(VP.y / 1920) * 100}%, rgba(255,122,47,${0.12 + 0.25 * go + 0.25 * flare}) 0%, rgba(0,0,0,0) 70%)`}} />
      {lanes.map((l, i) => {
        const appear = ramp(t, T(l.k) - 0.05, T(l.k) + 0.45, E.out);
        const k = go * 0.58; // same direction, not the same point
        const p = along(l.x0, k);
        const sc = mix(1, 0.35, k);
        const isG = l.k === 'antig';
        const heat = appear * (isG ? 1 + 1.2 * flare : 0.85);
        return (
          <React.Fragment key={l.k}>
            <Ember x={p.x} y={p.y} r={20 * sc * (isG ? 1 + 0.35 * flare : 1)} heat={heat} t={t} seed={i + 11} />
            {isG && flare > 0
              ? [0, 1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    style={{
                      position: 'absolute',
                      left: p.x - 4 + (j - 2) * 9 * sc,
                      top: p.y - 18 * sc - (30 + 18 * fbm(t * 6, j)) * sc * flare,
                      width: 8 * sc,
                      height: (30 + 18 * fbm(t * 6, j)) * sc * flare,
                      borderRadius: 8,
                      background: `linear-gradient(to top, ${C.ember}, rgba(255,217,168,0))`,
                      opacity: 0.8,
                    }}
                  />
                ))
              : null}
            <Txt
              x={p.x}
              y={isG ? p.y + 40 * sc + 10 : p.y - 40 * sc - mix(62, 46, k)}
              w={420}
              align="center"
              size={mix(38, 30, k)}
              font={MONO}
              weight={400}
              color={isG ? C.paper : 'rgba(236,230,218,0.75)'}
              op={appear}
            >
              {l.label}
            </Txt>
          </React.Fragment>
        );
      })}
    </Abs>
  );
};

// ═════════════ 10 · The real question ═════════════
export const Question: React.FC<SP> = ({t}) => {
  const a = T('cauhoi');
  const q1 = ramp(t, TW('cauhoi', 5) - 0.15, TW('cauhoi', 5) + 0.45, E.out); // "AI viết code…"
  const strike = ramp(t, TWE('cauhoi', 10) + 0.05, TWE('cauhoi', 10) + 0.45, E.inOut);
  const q2 = ramp(t, T('roidi2') - 0.1, T('roidi2') + 0.5, E.out);
  const q3 = ramp(t, T('tieptuc') - 0.05, T('tieptuc') + 0.5, E.out);
  const fadeAll = ramp(t, T('dadi') - 0.55, T('dadi') - 0.05, E.inOut);
  const cursorOn = Math.sin(t * 7) > -0.2 ? 1 : 0.25;
  return (
    <Abs>
      <Abs style={{opacity: 1 - fadeAll}}>
        <div style={{position: 'absolute', top: 560, left: 0, width: 1080, opacity: q1 * mix(1, 0.4, strike)}}>
          <Txt y={0} size={58} weight={600} color={strike > 0.5 ? C.ash : C.paper}>
            AI viết code nhanh cỡ nào?
          </Txt>
          <svg width={1080} height={100} style={{position: 'absolute', left: 0, top: 0}}>
            <line x1={150} y1={40} x2={mix(150, 930, strike)} y2={38} stroke={C.ash} strokeWidth={5} strokeLinecap="round" opacity={strike > 0 ? 1 : 0} />
          </svg>
        </div>
        <Txt y={790} size={112} font={SERIF} italic weight={400} op={q2} style={{transform: `translateY(${(1 - q2) * 18}px)`}}>
          Khi bạn rời đi,
        </Txt>
        <Txt y={960} w={880} size={56} weight={500} op={q3} lh={1.35}>
          nó có tiếp tục làm việc
          <br />
          cho bạn không?
        </Txt>
      </Abs>
      {/* the cursor — becomes the final ember */}
      <Ember x={mix(812, 540, fadeAll)} y={mix(1080, 640, fadeAll)} r={mix(9, 20, fadeAll)} heat={q3 * mix(cursorOn, 1, fadeAll)} t={t} seed={8} />
    </Abs>
  );
};

// ═════════════ 11 · Ending — you are gone, the stove is still lit ═════════════
export const Ending: React.FC<SP> = ({t}) => {
  const a = T('dadi');
  const desk = ramp(t, a - 0.2, a + 0.8, E.soft);
  const line = ramp(t, T('dolua') - 0.1, T('dolua') + 0.8, E.out);
  const end = DURATION / FPS;
  const sign = ramp(t, TE('dolua') + 0.6, TE('dolua') + 1.4, E.soft);
  const fade = 1 - ramp(t, end - 0.9, end - 0.05, E.soft);
  const breathe = 1 + 0.12 * Math.sin((t - a) * 1.7);
  const chars = '{ } ; ( ) => ✓ < / >'.split(' ');
  return (
    <Abs style={{opacity: fade}}>
      <Abs style={{background: `radial-gradient(circle at 540px 640px, rgba(255,122,47,${0.1 * breathe}) 0, rgba(0,0,0,0) 520px)`}} />
      <Laptop cx={540} hy={1120} w={600} open={0} op={desk * 0.9} />
      {/* faint code embers drifting upward: the work continues */}
      {chars.map((c, i) => {
        const ph = ((t - a) * 0.12 + i / chars.length) % 1;
        const x = 540 + Math.sin(i * 2.4) * 190 + fbm(t * 0.3, i) * 30;
        const y = mix(1060, 470, ph);
        const o = Math.sin(ph * Math.PI) * 0.45 * desk;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, fontFamily: MONO, fontSize: 30, color: C.emberCore, opacity: o}}>
            {c}
          </div>
        );
      })}
      <Ember x={540} y={640} r={20 * breathe} heat={1} t={t} seed={8} />
      <Txt y={1300} size={92} font={SERIF} italic weight={400} op={line} style={{transform: `translateY(${(1 - line) * 14}px)`}}>
        Bếp vẫn đỏ lửa.
      </Txt>
      <Txt y={1470} size={24} weight={500} track={0.34} color={C.ash} op={sign}>
        GOOGLE ANTIGRAVITY · REMOTE AGENTS
      </Txt>
    </Abs>
  );
};

