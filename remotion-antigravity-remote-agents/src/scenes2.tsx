import React from 'react';
import {Img, staticFile} from 'remotion';
import {Abs, C, E, Ember, Figure, Laptop, MONO, SANS, SERIF, T, TE, TW, TWE, Txt, clamp, fbm, mix, ramp, spring, win, wispPath} from './lib';
import type {SP} from './scenes1';

/** Night sky of the cloud: indigo field (Rothko-like), barely lit from within. */
const Sky: React.FC<{k: number; t: number}> = ({k, t}) => (
  <Abs
    style={{
      opacity: k,
      background: `radial-gradient(ellipse 90% 45% at 50% 22%, rgba(40,52,96,${0.85}) 0%, rgba(27,35,64,0.55) 45%, rgba(10,10,12,0) 80%)`,
      transform: `translateY(${Math.sin(t * 0.3) * 6}px)`,
    }}
  />
);

/** "Bếp của Google": rows of far lamps receding — a kitchen that never sleeps. */
const FarLamps: React.FC<{k: number; t: number}> = ({k, t}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, opacity: k}}>
    {[0, 1, 2, 3].map((row) =>
      Array.from({length: 9 + row * 4}).map((_, i, arr) => {
        const n = arr.length;
        const y = 560 - row * 46;
        const x = 540 + (i - (n - 1) / 2) * (110 - row * 18);
        const on = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.7 + row));
        return <circle key={`${row}-${i}`} cx={x} cy={y} r={4.5 - row} fill={C.ember} opacity={on * (1 - row * 0.2)} />;
      }),
    )}
    <line x1={60} y1={585} x2={1020} y2={585} stroke={C.paper} strokeOpacity={0.12} strokeWidth={2} />
  </svg>
);

// ═════════════ 5 · REVELATION — the ember leaves the machine ═════════════
export const Reveal: React.FC<SP> = ({t}) => {
  const a = T('reveal');
  const spark = ramp(t, T('vagio') - 0.1, T('vagio') + 0.6, E.soft);
  const rise = ramp(t, a - 0.05, a + 1.1, E.out);
  const ey = mix(1330, 360, rise) - 170 * ramp(t, TE('reveal') - 0.65, TE('reveal') - 0.2, E.inOut);
  const sky = ramp(t, a, a + 1.4, E.soft);
  const titleK = ramp(t, TW('reveal', 4) - 0.25, TW('reveal', 4) + 0.6, E.out); // "Remote"
  const brand = ramp(t, a + 0.05, a + 0.6, E.out);
  const cardIn = ramp(t, TE('reveal') - 0.45, TE('reveal') + 0.1, E.out);
  const cardOut = ramp(t, T('cloud') + 0.2, T('cloud') + 0.55, E.inOut);
  const lift = ramp(t, TE('reveal') - 0.65, TE('reveal') - 0.2, E.inOut); // title moves up to make room
  const diag = ramp(t, T('cloud') + 0.55, T('cloud') + 0.95, E.out);
  const travel = ramp(t, T('cloud') + 0.7, TWE('cloud', 6) + 0.1, E.inOut); // up to "mây"
  const cut = ramp(t, TW('thayvi', 3) - 0.05, TW('thayvi', 3) + 0.45, E.out); // "trên máy"
  const away = ramp(t, T('noicom') - 0.7, T('noicom') - 0.2, E.inOut);
  // ember path: from reveal height down to laptop, then up to the cloud
  const pathY = (k: number) => mix(1190, 470, k);
  const emberY = diag < 0.5 ? ey : pathY(travel); // fade out above, re-ignite on the laptop
  const eHeat = Math.max(spark * 0.35, rise) * (1 + 0.6 * Math.exp(-Math.max(0, t - a) * 2.5)) * (1 - Math.sin(Math.PI * diag));
  return (
    <Abs>
      <Sky k={sky * (0.6 + 0.4 * diag)} t={t} />
      {/* vertical light: the trail of ascent */}
      <Abs
        style={{
          opacity: rise * (1 - rise) * 3 * (1 - diag),
          background: `linear-gradient(to top, rgba(255,122,47,0) 0%, rgba(255,122,47,0.18) ${mix(20, 80, rise)}%, rgba(255,122,47,0) 100%)`,
          left: 500,
          width: 80,
          inset: undefined,
          top: 0,
          height: 1920,
          filter: 'blur(18px)',
        }}
      />
      {/* title */}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - cardOut, transform: `translateY(${mix(0, -600, lift)}px) scale(${mix(1, 0.66, lift)})`, transformOrigin: '540px 1000px'}}>
        <Txt y={900} size={30} weight={500} track={0.42} color={C.paper} op={brand * 0.8}>
          GOOGLE ANTIGRAVITY
        </Txt>
        <Txt y={960} w={1060} size={124} font={SERIF} weight={600} op={titleK} track={mix(0.16, 0.0, titleK)} lh={1.15} style={{whiteSpace: 'nowrap'}}>
          Remote Agents
        </Txt>
      </div>
      {/* evidence: the actual in-app announcement */}
      {cardIn > 0 && cardOut < 1 ? (
        <div style={{position: 'absolute', left: 540 - 290, top: 640 + (1 - cardIn) * 60, width: 580, opacity: cardIn * (1 - cardOut)}}>
          <div style={{borderRadius: 22, overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(236,230,218,0.15)'}}>
            <Img src={staticFile('img/antigravity_card.png')} style={{width: 580, display: 'block', filter: 'contrast(1.05) saturate(0.9) sepia(0.12)'}} />
          </div>
          <div style={{fontFamily: SANS, fontSize: 24, color: C.ash, textAlign: 'center', marginTop: 22, letterSpacing: '0.04em'}}>Thông báo trong ứng dụng Antigravity</div>
        </div>
      ) : null}
      {/* diagram: your machine ↔ the cloud */}
      <Abs style={{opacity: diag * (1 - away)}}>
        <FarLamps k={0.55} t={t} />
        <Txt y={612} size={30} weight={500} track={0.12} color={C.paper} op={0.85}>
          ĐÁM MÂY
        </Txt>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          <line x1={540} y1={1180} x2={540} y2={mix(1180, 480, travel)} stroke={C.ember} strokeOpacity={0.6 * (1 - cut)} strokeWidth={3} strokeDasharray="4 14" strokeDashoffset={t * 40} />
        </svg>
        <Laptop cx={540} hy={1240} w={230} open={1 - cut * 0.85} screenGlow={1 - cut} op={1 - cut * 0.55} />
        <Txt y={1290} size={30} weight={400} track={0.12} color={C.ash}>
          MÁY CỦA BẠN
        </Txt>
      </Abs>
      <Ember x={540} y={emberY} r={mix(18, 22, rise)} heat={eHeat * (1 - away)} t={t} seed={2} />
    </Abs>
  );
};

// ═════════════ 6–7 · The rice cooker in Google's kitchen ═════════════
const Cooker: React.FC<{t: number; lamp: number; press: number; steam: number; cx?: number; cy?: number; s?: number}> = ({t, lamp, press, steam, cx = 540, cy = 860, s = 1}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      <radialGradient id="ckGlow" cx="0.5" cy="0.6" r="0.6">
        <stop offset="0" stopColor={C.ember} stopOpacity={0.35 * lamp} />
        <stop offset="1" stopColor={C.ember} stopOpacity={0} />
      </radialGradient>
    </defs>
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <ellipse cx={0} cy={60} rx={420} ry={320} fill="url(#ckGlow)" />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={wispPath(-40 + i * 40, -235, 300, t * 1.1 + i * 2, 30 + i, 20)}
          stroke={C.paper}
          strokeOpacity={0.3 * steam}
          strokeWidth={6 - i}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {/* lid dome */}
      <path d="M-190,-110 Q-190,-230 0,-232 Q190,-230 190,-110 Z" fill="#14151B" stroke={C.paper} strokeOpacity={0.8} strokeWidth={3} />
      <rect x={-30} y={-252} width={60} height={22} rx={11} fill="#1b1c23" stroke={C.paper} strokeOpacity={0.6} strokeWidth={2} />
      {/* body */}
      <rect x={-210} y={-112} width={420} height={300} rx={70} fill="#111217" stroke={C.paper} strokeOpacity={0.8} strokeWidth={3} />
      <line x1={-200} y1={-70} x2={200} y2={-70} stroke={C.paper} strokeOpacity={0.15} strokeWidth={2} />
      {/* panel */}
      <rect x={-90} y={0} width={180} height={120} rx={24} fill="#0c0d11" stroke={C.paper} strokeOpacity={0.35} strokeWidth={2} />
      <circle cx={0} cy={68} r={30 * (1 - 0.12 * press)} fill={lamp > 0.5 ? '#2a1a12' : '#1c1d24'} stroke={C.paper} strokeOpacity={0.55} strokeWidth={2.5} />
      <circle cx={0} cy={26} r={8} fill={C.ember} opacity={0.15 + 0.85 * lamp} />
      <text x={0} y={76} textAnchor="middle" fontFamily={MONO} fontSize={18} fill={C.paper} opacity={0.6}>
        COOK
      </text>
    </g>
  </svg>
);

const Chip: React.FC<{label: string; glyph: string; x: number; y: number; op: number; s?: number}> = ({label, glyph, x, y, op, s = 1}) =>
  op <= 0.001 ? null : (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%,-50%) scale(${s})`,
        opacity: op,
        padding: '18px 34px',
        borderRadius: 999,
        border: '2px solid rgba(236,230,218,0.55)',
        background: 'rgba(17,17,22,0.92)',
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: 40,
        color: C.paper,
        whiteSpace: 'nowrap',
        display: 'flex',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <span style={{fontFamily: MONO, color: C.ember, fontSize: 36}}>{glyph}</span>
      {label}
    </div>
  );

export const Kitchen: React.FC<SP> = ({t}) => {
  const a = T('noicom');
  const inK = ramp(t, a - 0.25, a + 0.8, E.out);
  const press = Math.max(0, 1 - Math.abs(t - (TW('bamnut', 0) + 0.12)) * 7);
  const lamp = ramp(t, TW('bamnut', 0) + 0.08, TW('bamnut', 0) + 0.3, E.out);
  const emberIn = ramp(t, a + 0.2, TW('bamnut', 0) + 0.1, E.inOut); // the agent settles into the cooker's lamp
  const leave = ramp(t, T('roidi') - 0.1, T('roidi') + 1.1, E.in);
  const shut = ramp(t, T('dong') + 0.1, T('dong') + 0.45, E.in);
  const nau = ramp(t, T('vannau') - 0.05, T('vannau') + 0.5, E.out);
  // part 7 — ingredients & the browser
  const ing = (k: string, idx: number) => ramp(t, T(k) + (idx === 0 ? 0.5 : 0) - 0.1, T(k) + (idx === 0 ? 0.5 : 0) + 0.55, E.out);
  const absorb = ramp(t, T('tep') + 0.85, T('tiendo') + 0.1, E.inOut);
  const toBrowser = ramp(t, T('tiendo') - 0.05, T('browser') + 0.1, E.inOut);
  const out = ramp(t, T('nhungnho') - 0.45, T('nhungnho') - 0.05, E.soft);
  const cookerS = mix(1, 0.86, ramp(t, T('github') - 0.3, T('github') + 0.6, E.inOut));
  const cookerY = mix(860, 780, ramp(t, T('github') - 0.3, T('github') + 0.6, E.inOut));
  const chips = [
    {k: 'github', label: 'GitHub', glyph: '⑂', x0: -200, y0: 1200, x1: 540, y1: 1050},
    {k: 'drive', label: 'Google Drive', glyph: '△', x0: 1300, y0: 1250, x1: 540, y1: 1160},
    {k: 'tep', label: 'Tệp tải lên', glyph: '⇪', x0: 540, y0: 1700, x1: 540, y1: 1270},
  ];
  return (
    <Abs style={{opacity: 1 - out}}>
      <Abs style={{opacity: 1 - toBrowser, transform: `scale(${mix(1, 0.55, toBrowser)})`, transformOrigin: '540px 900px'}}>
        <Sky k={inK} t={t} />
        <Abs style={{transform: `translateY(${mix(-200, 0, inK)}px)`}}>
          <FarLamps k={0.7 * inK} t={t} />
          <Txt y={250} size={30} weight={500} track={0.3} color={C.paper} op={inK * 0.55 * (1 - ramp(t, T('github') - 0.3, T('github')))}>
            BẾP CỦA GOOGLE
          </Txt>
        </Abs>
        <Abs style={{opacity: inK, transform: `translateY(${(1 - inK) * 120}px)`}}>
          <Cooker t={t} lamp={lamp} press={press} steam={ramp(t, TW('bamnut', 0) + 0.3, TW('bamnut', 0) + 1.6, E.soft)} cy={cookerY} s={cookerS} />
        </Abs>
        <Ember x={540} y={mix(360, cookerY + 26 * cookerS, emberIn)} r={mix(22, 9, emberIn)} heat={mix(1, 0.75, emberIn) * inK} t={t} seed={2} />
        {/* you walk away */}
        <Figure x={mix(840, 1220, leave)} y={1330} s={0.8} op={inK * (1 - ramp(leave, 0.85, 1))} step={leave * 2.2} />
        <Laptop cx={200} hy={1325} w={170} open={1 - shut} screenGlow={1 - shut} op={inK * 0.9} />
        <Txt y={1180} size={110} font={SERIF} italic weight={400} op={nau * (1 - ramp(t, T('github') - 0.2, T('github') + 0.2))} style={{transform: `translateY(${(1 - nau) * 16}px)`}}>
          vẫn nấu.
        </Txt>
        {chips.map((c, i) => {
          const k = ing(c.k, i);
          const x = mix(c.x0, c.x1, k);
          const y = mix(c.y0, c.y1, k);
          return <Chip key={c.k} label={c.label} glyph={c.glyph} x={mix(x, 540, absorb)} y={mix(y, cookerY - 60, absorb)} op={k * (1 - ramp(absorb, 0.7, 1))} s={mix(1, 0.3, absorb)} />;
        })}
      </Abs>
      <Browser t={t} k={toBrowser} />
    </Abs>
  );
};

const TASKS = ['Refactor the settings page', 'Add a dark mode toggle', 'Fix the flaky login test'];
const Browser: React.FC<{t: number; k: number}> = ({t, k}) => {
  if (k <= 0.001) return null;
  const w = 720;
  const hgt = 900;
  const x = 540 - w / 2;
  const y = 470;
  return (
    <div style={{position: 'absolute', left: x, top: y + (1 - k) * 80, width: w, height: hgt, opacity: k, borderRadius: 34, border: '2px solid rgba(236,230,218,0.5)', background: '#0f1015', boxShadow: '0 50px 140px rgba(0,0,0,0.85)'}}>
      <div style={{margin: 26, height: 64, borderRadius: 32, background: '#1a1b22', display: 'flex', alignItems: 'center', paddingLeft: 30, gap: 16, fontFamily: MONO, fontSize: 26, color: C.paper}}>
        <span style={{width: 12, height: 12, borderRadius: 6, background: C.ash}} />
        antigravity.google.com
      </div>
      <div style={{padding: '24px 44px', fontFamily: SANS}}>
        <div style={{fontSize: 26, color: C.ash, letterSpacing: '0.16em', marginBottom: 26}}>AGENT CỦA BẠN</div>
        {TASKS.map((task, i) => {
          const done = i === 0;
          const pulse = 0.55 + 0.45 * Math.sin(t * 4 + i * 1.4);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24, padding: '30px 0', borderBottom: '1px solid rgba(236,230,218,0.12)'}}>
              <div style={{width: 22, height: 22, borderRadius: 11, flex: 'none', background: done ? C.paper : C.ember, opacity: done ? 0.8 : pulse, boxShadow: done ? 'none' : `0 0 ${18 * pulse}px ${C.ember}`}} />
              <div style={{flex: 1}}>
                <div style={{fontSize: 34, color: C.paper, fontWeight: 500}}>{task}</div>
                <div style={{fontSize: 26, color: done ? C.ash : C.ember, marginTop: 6}}>{done ? 'đã xong · chờ bạn xem lại' : 'đang làm…'}</div>
              </div>
            </div>
          );
        })}
        <div style={{fontSize: 22, color: C.ash, marginTop: 34, textAlign: 'center', opacity: 0.8}}>Minh họa giao diện</div>
      </div>
    </div>
  );
};

// ═════════════ 8 · Taste before you serve ═════════════
const REVIEW = ['test("login", async ({page}) => {', "  await page.goto('/login');", '  await page.fill(#email, user);', "  await page.waitForURL('/home');", '});'];
export const Taste: React.FC<SP> = ({t}) => {
  const a = T('nhungnho');
  const vis = ramp(t, a - 0.1, a + 0.5, E.soft);
  const out = ramp(t, T('claude') - 0.4, T('claude') - 0.05, E.soft);
  const sticks = ramp(t, TW('nem', 2) - 0.25, TW('nem', 2) + 0.35, E.out); // "nếm"
  const lift = ramp(t, TW('nem', 2) + 0.35, TW('nem', 2) + 0.9, E.inOut);
  const toCode = ramp(t, T('codeagent') - 0.1, T('codeagent') + 0.7, E.inOut);
  const scan = ramp(t, T('doclai'), T('claude') - 0.5, E.lin);
  const lineY = (i: number) => 520 + i * 74;
  return (
    <Abs style={{opacity: vis * (1 - out)}}>
      <Abs style={{background: `radial-gradient(ellipse 60% 35% at 50% 62%, rgba(255,122,47,0.12) 0%, rgba(0,0,0,0) 70%)`}} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {/* bowl of rice */}
        <g opacity={1 - toCode * 0.75} transform={`translate(0 ${toCode * 120})`}>
          <path d="M330,1010 Q540,1080 750,1010 Q735,1230 540,1240 Q345,1230 330,1010 Z" fill="#111217" stroke={C.paper} strokeOpacity={0.8} strokeWidth={3} />
          <path d="M350,1012 Q540,890 730,1012 Q540,1060 350,1012 Z" fill="#E9E3D6" opacity={0.92} />
          <rect x={470} y={1240} width={140} height={16} rx={8} fill="#111217" stroke={C.paper} strokeOpacity={0.6} strokeWidth={2} />
          {/* chopsticks */}
          <g opacity={sticks * (1 - toCode)} transform={`translate(${mix(220, 0, sticks)} ${mix(-260, 0, sticks) - lift * 90})`}>
            <line x1={860} y1={640} x2={568} y2={958} stroke="#B48A5A" strokeWidth={9} strokeLinecap="round" />
            <line x1={905} y1={668} x2={588} y2={968} stroke="#B48A5A" strokeWidth={9} strokeLinecap="round" />
            <ellipse cx={578} cy={966} rx={20} ry={13} fill="#EFE9DC" opacity={lift > 0 ? 1 : 0} />
          </g>
        </g>
        {/* steam → becomes code */}
        {[0, 1, 2].map((i) => (
          <path key={i} d={wispPath(480 + i * 60, 900, 300, t + i, i + 40, 18)} stroke={C.paper} strokeOpacity={0.3 * (1 - toCode)} strokeWidth={5} fill="none" strokeLinecap="round" />
        ))}
      </svg>
      {/* code lines condense out of the steam */}
      <div style={{position: 'absolute', left: 110, top: 0, width: 860, fontFamily: MONO, fontSize: 30, color: C.paper}}>
        {REVIEW.map((l, i) => {
          const k = ramp(toCode, i * 0.12, i * 0.12 + 0.5, E.out);
          const passed = scan > 0 && scan * (REVIEW.length - 1) >= i - 0.3;
          const flag = i === 2;
          return (
            <div key={i} style={{position: 'absolute', top: lineY(i) - 28 + (1 - k) * 30, opacity: k, whiteSpace: 'pre', display: 'flex', width: 860, alignItems: 'center'}}>
              <span style={{width: 56, color: flag ? C.ember : C.paper, opacity: passed ? 1 : 0, fontFamily: SANS, fontWeight: 700}}>{flag ? '?' : '✓'}</span>
              <span style={{opacity: 0.85, color: flag && passed ? C.ember : C.paper}}>{l}</span>
            </div>
          );
        })}
        {/* reading bar: a human eye passing over the work */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: lineY(0) - 34 + scan * (REVIEW.length - 1) * 74,
            width: 820,
            height: 60,
            borderRadius: 8,
            background: 'rgba(236,230,218,0.09)',
            borderLeft: `4px solid ${C.paper}`,
            opacity: scan > 0 && scan < 1 ? 1 : 0,
          }}
        />
      </div>
      <Txt y={380} size={28} weight={500} track={0.3} color={C.ash} op={toCode}>
        NGƯỜI NẾM: BẠN
      </Txt>
    </Abs>
  );
};
