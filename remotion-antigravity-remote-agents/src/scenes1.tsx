import React from 'react';
import {Abs, C, E, Ember, Figure, Laptop, MONO, SERIF, T, TE, TW, TWE, Txt, clamp, fbm, mix, ramp, spring, win, wispPath} from './lib';

export type SP = {t: number};

const CODE = ['› task: Fix the flaky login test', '  ✎ auth/login.spec.ts', "  + await page.waitForURL('/home')", '  ↻ chạy lại kiểm thử…'];

/** characters of a list of lines revealed by progress 0..1 */
const typed = (lines: string[], k: number) => {
  const total = lines.reduce((s, l) => s + l.length, 0);
  let n = Math.floor(total * clamp(k));
  return lines.map((l) => {
    const take = Math.min(l.length, Math.max(0, n));
    n -= l.length;
    return l.slice(0, take);
  });
};

// ═════════════ 1 · HOOK — the lid shuts, the work goes on ═════════════
export const Hook: React.FC<SP> = ({t}) => {
  const gap = TW('lid', 1); // "gập"
  const close = ramp(t, gap + 0.05, gap + 0.5, E.in); // gravity: accelerates into the hinge
  const open = 1 - close;
  const landed = t > gap + 0.5;
  const thud = landed ? Math.exp(-(t - gap - 0.5) * 9) * Math.sin((t - gap - 0.5) * 40) * 5 : 0;
  const push = 1 + 0.05 * ramp(t, 0, 4.4, E.soft);
  // ember escapes the seam of the closed lid
  const rise = ramp(t, T('code') - 0.1, T('code') + 1.3, E.out);
  const ey = mix(1018, 700, rise);
  const eheat = ramp(t, T('code') - 0.15, T('code') + 0.35, E.soft);
  const sink = ramp(t, T('voly') - 0.25, T('voly') + 0.4, E.inOut); // only used at very end
  const writeK = ramp(t, T('write'), TE('write') + 0.7, E.lin);
  const lines = typed(CODE, writeK);
  const screenLines = typed(['› Refactor the settings page', '› Add a dark mode toggle', '› Fix the flaky login test'], ramp(t, -0.4, 0.5, E.lin));
  return (
    <Abs style={{transform: `scale(${push}) translateY(${thud}px)`, transformOrigin: '540px 1000px'}}>
      {/* cold screen spill on the desk — dies with the lid */}
      <Abs
        style={{
          background: `radial-gradient(ellipse 48% 22% at 50% 54%, rgba(150,175,255,${0.22 * open}) 0%, rgba(0,0,0,0) 70%)`,
        }}
      />
      <Laptop cx={540} hy={1020} w={600} open={open} screenGlow={1}>
        <g fontFamily={MONO} fontSize={22} fill={C.screen}>
          {screenLines.map((l, i) => (
            <text key={i} x={30} y={60 + i * 44} opacity={0.85}>
              {l}
            </text>
          ))}
          <rect x={30} y={200} width={10} height={24} fill={C.screen} opacity={Math.sin(t * 9) > 0 ? 0.8 : 0} />
        </g>
      </Laptop>
      {/* hinge seam light leak at the instant of closing */}
      <Abs
        style={{
          left: 240,
          top: 1012,
          width: 600,
          height: 14,
          inset: undefined,
          borderRadius: 7,
          background: 'rgba(190,210,255,0.9)',
          filter: 'blur(6px)',
          opacity: landed ? Math.exp(-(t - gap - 0.5) * 5) * 0.8 : close * 0.6,
        }}
      />
      {/* the code keeps writing itself in the dark, lit only by the ember */}
      <div style={{position: 'absolute', left: 120, top: 330, width: 860, fontFamily: MONO, fontSize: 34, lineHeight: 1.75, color: C.emberCore, opacity: 1 - sink}}>
        {lines.map((l, i) => (
          <div key={i} style={{opacity: 0.55 + 0.4 * (i === lines.findIndex((x, j) => x.length < CODE[j].length) ? 1 : 0.6), whiteSpace: 'pre'}}>
            {l}
            {l.length > 0 && l.length < CODE[i].length ? <span style={{color: C.ember}}>▍</span> : null}
          </div>
        ))}
      </div>
      <Ember x={540} y={mix(ey, 1018, sink)} r={20} heat={eheat * (1 - 0.6 * sink)} t={t} />
    </Abs>
  );
};

// ═════════════ 2 · "Nghe vô lý?" — the seam becomes a gas stove ═════════════
const Burner: React.FC<{t: number; cx: number; y: number; ign: number; out: number; w?: number}> = ({t, cx, y, ign, out, w = 300}) => {
  const n = 13;
  const live = ign * (1 - out);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <radialGradient id="gasglow" cx="0.5" cy="1" r="0.8">
          <stop offset="0" stopColor={C.gas} stopOpacity={0.55 * live} />
          <stop offset="1" stopColor={C.gas} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={y - 30} rx={w * 0.9} ry={110} fill="url(#gasglow)" />
      <ellipse cx={cx} cy={y} rx={w / 2} ry={w * 0.09} fill="none" stroke={C.paper} strokeOpacity={0.6} strokeWidth={3} />
      {Array.from({length: n}).map((_, i) => {
        const a = (i / (n - 1)) * Math.PI;
        const px = cx - Math.cos(a) * (w / 2) * 0.92;
        const py = y - Math.sin(a) * w * 0.05;
        const stagger = clamp(ign * 1.6 - Math.abs(i - n / 2) / n);
        const hgt = (30 + 9 * fbm(t * 7, i)) * stagger * (1 - out) * (0.85 + 0.3 * Math.sin(a));
        if (hgt < 0.5) return null;
        return (
          <path
            key={i}
            d={`M${px - 9},${py} Q${px},${py - hgt * 1.4} ${px + fbm(t * 4, i + 20) * 3},${py - hgt} Q${px + 2},${py - hgt * 0.4} ${px + 9},${py} Z`}
            fill={C.gas}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
};

export const BepGa: React.FC<SP> = ({t}) => {
  const q = win(t, T('voly') + 0.02, T('bepga') + 0.4, 0.35, 0.45);
  const ign = ramp(t, TW('bepga', 4) - 0.05, TW('bepga', 4) + 0.5, E.out); // "bếp"
  const lineToRing = ramp(t, T('bepga') - 0.1, TW('bepga', 4), E.inOut);
  return (
    <Abs>
      <Txt y={560} size={150} font={SERIF} italic weight={400} op={q} style={{transform: `translateY(${(1 - q) * 18}px)`}}>
        vô lý?
      </Txt>
      {/* the closed-lid line folds into the burner */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <line
          x1={mix(240, 390, lineToRing)}
          y1={1019}
          x2={mix(840, 690, lineToRing)}
          y2={1019}
          stroke={C.paper}
          strokeOpacity={0.8 * (1 - lineToRing)}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
      <Abs style={{opacity: lineToRing}}>
        <Burner t={t} cx={540} y={1030} ign={ign} out={0} />
      </Abs>
    </Abs>
  );
};

// ═════════════ 3 · The old way — a flame on a pipe ═════════════
export const OldWay: React.FC<SP> = ({t}) => {
  const a = T('truoc');
  const pull = ramp(t, a - 0.3, a + 1.0, E.inOut); // camera pulls back to reveal the pot
  const s = mix(1.35, 1, pull);
  const potIn = ramp(t, a - 0.2, a + 0.7, E.out);
  const ticket = ramp(t, TW('giao', 0), TW('giao', 0) + 0.9, E.in);
  const lidShut = ramp(t, T('tatmay'), T('tatmay') + 0.3, E.in);
  const drain = ramp(t, T('tatmay') + 0.15, T('tatbep') + 0.1, E.inOut);
  const flameOut = ramp(t, TW('tatbep', 2) - 0.05, TW('tatbep', 2) + 0.35, E.in);
  const cool = ramp(t, T('noinguoi'), T('noinguoi') + 0.9, E.inOut);
  const stuck = ramp(t, T('dodang') - 0.1, T('dodang') + 0.4, E.out);
  const watcher = ramp(t, T('canh') - 0.1, T('canh') + 0.6, E.out);
  const smokeK = ramp(t, TW('tatbep', 2), TW('tatbep', 2) + 0.6, E.out);
  const potStroke = cool > 0 ? `rgba(${mix(236, 107, cool)},${mix(230, 111, cool)},${mix(218, 118, cool)},0.85)` : 'rgba(236,230,218,0.85)';
  const steam = (1 - cool) * potIn;
  // cable from laptop (left) to the stove: the "gas pipe"
  const cable = 'M300,1258 C380,1300 430,1200 540,1150';
  return (
    <Abs style={{transform: `scale(${s})`, transformOrigin: '540px 1040px'}}>
      <Burner t={t} cx={540} y={1030} ign={1} out={flameOut} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {/* stove body */}
        <rect x={330} y={1040} width={420} height={110} rx={10} fill="#121218" stroke={C.paper} strokeOpacity={0.35} strokeWidth={2} />
        {/* pot */}
        <g opacity={potIn} transform={`translate(0, ${(1 - potIn) * -40})`}>
          <path d="M350,760 L730,760 L712,1000 Q708,1018 690,1018 L390,1018 Q372,1018 368,1000 Z" fill="#101015" stroke={potStroke} strokeWidth={3} />
          <path d="M350,760 L310,750 M730,760 L770,750" stroke={potStroke} strokeWidth={6} strokeLinecap="round" />
          <rect x={340} y={742} width={400} height={18} rx={9} fill="#16161c" stroke={potStroke} strokeWidth={2.5} />
          <text x={540} y={902} textAnchor="middle" fontFamily={MONO} fontSize={34} fill={potStroke}>
            AI agent
          </text>
          {/* progress, frozen half-way */}
          <rect x={420} y={940} width={240} height={8} rx={4} fill="#25252c" />
          <rect x={420} y={940} width={240 * mix(0.2, 0.52, ramp(t, a, T('tatmay'), E.lin))} height={8} rx={4} fill={cool > 0.5 ? C.ash : C.gas} />
          {stuck > 0 ? (
            <text x={540} y={990} textAnchor="middle" fontFamily={MONO} fontSize={24} fill={C.ash} opacity={stuck * (0.6 + 0.4 * Math.sin(t * 6))}>
              ▍ dừng
            </text>
          ) : null}
        </g>
        {/* steam */}
        {[0, 1, 2].map((i) => (
          <path key={i} d={wispPath(470 + i * 70, 720, 230, t + i, i + 2, 18)} stroke={C.paper} strokeOpacity={0.35 * steam} strokeWidth={5} fill="none" strokeLinecap="round" />
        ))}
        {/* smoke puff when the flame dies */}
        {smokeK > 0
          ? [0, 1, 2, 3].map((i) => (
              <path
                key={i}
                d={wispPath(450 + i * 60, 1020 - smokeK * 60, 140 + smokeK * 240, t * 0.6 + i, i + 9, 22)}
                stroke={C.ash}
                strokeOpacity={0.5 * (1 - ramp(t, T('dodang') + 0.6, T('ngoi'), E.soft)) * smokeK}
                strokeWidth={7}
                fill="none"
                strokeLinecap="round"
              />
            ))
          : null}
        {/* the pipe */}
        <path d={cable} stroke="#2A2C34" strokeWidth={7} fill="none" strokeLinecap="round" />
        <path d={cable} stroke={C.gas} strokeWidth={3} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={`${1 - drain} 1`} strokeDashoffset={-drain} opacity={0.9 * (1 - flameOut * 0.5)} />
        {/* task ticket dropped into the pot */}
        {ticket > 0 && ticket < 1 ? (
          <g transform={`translate(${mix(-120, 0, ticket)}, ${mix(-380, 120, ticket)}) rotate(${mix(-12, 4, ticket)} 540 680)`} opacity={1 - ramp(ticket, 0.85, 1)}>
            <rect x={420} y={640} width={240} height={64} rx={6} fill={C.paper} />
            <text x={540} y={680} textAnchor="middle" fontFamily={MONO} fontSize={20} fill={C.ink}>
              Fix login test
            </text>
          </g>
        ) : null}
      </svg>
      <Laptop cx={232} hy={1262} w={150} open={1 - lidShut} screenGlow={1 - lidShut} op={ramp(t, a, a + 0.6)} />
      <Figure x={880} y={1265} s={0.95} op={watcher * (1 - 0.5 * cool)} />
      {/* line of sight: someone has to watch the pot */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: watcher * 0.45 * (1 - cool)}}>
        <line x1={862} y1={1052} x2={735} y2={930} stroke={C.paper} strokeWidth={2} strokeDasharray="6 10" strokeDashoffset={-t * 30} />
      </svg>
    </Abs>
  );
};

// ═════════════ 4 · Waiting — time burns like incense ═════════════
export const Waiting: React.FC<SP> = ({t}) => {
  const a = T('ngoi');
  const vis = ramp(t, a - 0.25, a + 0.45, E.soft);
  const burn = ramp(t, a, T('vagio') - 0.6, (x) => x * x * 0.55 + x * 0.45);
  const tipY = mix(640, 1010, burn);
  const screen = ramp(t, T('maymo') - 0.1, T('maymo') + 0.5, E.out);
  const flick = 0.85 + 0.15 * fbm(t * 3, 4);
  const eye = win(t, T('mat') - 0.05, T('dat') - 0.05, 0.4, 0.35);
  const blink = 1 - Math.max(0, 1 - Math.abs(t - (T('mat') + 1.0)) * 12);
  const top = win(t, T('dat') - 0.05, T('vagio') - 0.55, 0.35, 0.4);
  const ai = ramp(t, TW('khongai', 4) - 0.1, TW('khongai', 4) + 0.3, E.out);
  const strike = ramp(t, TWE('khongai', 4) + 0.05, TWE('khongai', 4) + 0.4, E.inOut);
  const crumble = ramp(t, T('thoigian') - 0.35, T('thoigian') + 0.25, E.in);
  const you = ramp(t, T('thoigian') + 0.3, T('thoigian') + 0.9, E.out);
  const out = 1 - ramp(t, T('vagio') - 0.6, T('vagio') - 0.05, E.soft); // to black before "Và giờ"
  const ashBits = Array.from({length: 9}).map((_, i) => {
    const t0 = a + 1.2 + i * 0.95;
    const k = (t - t0) / 1.3;
    if (k < 0 || k > 1) return null;
    const y0 = mix(640, 1010, ramp(t0, a, T('vagio') - 0.6));
    return <circle key={i} cx={540 + Math.sin(i * 3.1) * 6 + k * 8} cy={y0 + k * k * (1180 - y0)} r={4} fill={C.ash} opacity={1 - k * 0.6} />;
  });
  return (
    <Abs style={{opacity: vis * out}}>
      {/* cold screen light from off-frame left */}
      <Abs style={{background: `radial-gradient(ellipse 70% 55% at 0% 45%, rgba(150,175,255,${0.28 * screen * flick}) 0%, rgba(0,0,0,0) 70%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {/* holder bowl of ash */}
        <path d="M430,1180 Q540,1270 650,1180 Z" fill="#141419" stroke={C.ash} strokeWidth={2.5} />
        <ellipse cx={540} cy={1180} rx={110} ry={14} fill="#1b1b21" stroke={C.ash} strokeWidth={2} />
        {/* stick */}
        <line x1={540} y1={1178} x2={540} y2={tipY} stroke="#7A5A3C" strokeWidth={6} strokeLinecap="round" />
        <line x1={540} y1={tipY} x2={540} y2={tipY - 8} stroke={C.ash} strokeWidth={6} strokeLinecap="round" />
        {/* smoke of the burning minute */}
        <path d={wispPath(540, tipY - 10, 520, t, 3, 30)} stroke={C.paper} strokeOpacity={0.22} strokeWidth={4} fill="none" strokeLinecap="round" />
        <path d={wispPath(540, tipY - 10, 380, t + 3, 8, 22)} stroke={C.paper} strokeOpacity={0.12} strokeWidth={3} fill="none" strokeLinecap="round" />
        {ashBits}
        {/* the watching eye, a screen caught in its pupil */}
        <g opacity={eye} transform={`translate(540 430) scale(1 ${blink})`}>
          <path d="M-170,0 Q0,-110 170,0 Q0,110 -170,0 Z" fill="none" stroke={C.paper} strokeWidth={3} strokeOpacity={0.8} />
          <circle r={52} fill="#0d0f16" stroke={C.paper} strokeOpacity={0.5} strokeWidth={2} />
          <rect x={-24} y={-17} width={48} height={32} rx={3} fill={C.screen} opacity={0.85 * flick} />
        </g>
      </svg>
      <Abs style={{background: 'radial-gradient(circle at 540px ' + tipY + 'px, rgba(210,84,42,0.35) 0, rgba(210,84,42,0) 60px)'}} />
      <Ember x={540} y={tipY - 4} r={6} heat={0.55} t={t} seed={5} />
      {/* typography: the price is not the AI — it's you */}
      <Txt y={330} size={36} weight={400} track={0.18} color={C.ash} op={top}>
        THỨ ĐẮT NHẤT
      </Txt>
      <div style={{position: 'absolute', left: 0, width: 1080, top: 400, height: 260, opacity: top * ai * (1 - crumble)}}>
        <Txt y={0} size={200} weight={700} color={strike > 0.5 ? C.ash : C.paper} track={0.02} style={{filter: `blur(${crumble * 6}px)`, transform: `translateY(${crumble * 40}px)`}}>
          AI
        </Txt>
        <svg width={1080} height={260} style={{position: 'absolute', left: 0, top: 0}}>
          <line x1={400} y1={140} x2={mix(400, 680, strike)} y2={128} stroke={C.ember} strokeWidth={8} strokeLinecap="round" opacity={strike > 0 ? 1 : 0} />
        </svg>
      </div>
      <Txt y={420} size={118} font={SERIF} italic weight={400} op={top * you} lh={1.2} style={{transform: `translateY(${(1 - you) * 20}px)`}}>
        thời gian
        <br />
        <span style={{fontFamily: "'Be Vietnam Pro'", fontStyle: 'normal', fontSize: 54, fontWeight: 400, color: C.paper, letterSpacing: '0.02em'}}>của chính bạn</span>
      </Txt>
    </Abs>
  );
};
