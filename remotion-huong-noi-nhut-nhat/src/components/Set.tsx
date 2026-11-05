import React from 'react';
import {random} from 'remotion';

export const WORLD = {
  wallBase: 1250,
  backFloor: 1290,
  frontFloor: 1440,
  counterTop: 1262,
  counterFace: 1284,
  counterBottom: 1318,
  counterFloor: 1530,
  lampX: 560,
  lampY: 812,
  tableX: 560,
  tableY: 1150,
};

const OUT = '#0A0A0C';

export const Defs: React.FC = () => (
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#070708" />
      <stop offset="0.45" stopColor="#141519" />
      <stop offset="1" stopColor="#1C1D22" />
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stopColor="#B9D2F5" />
      <stop offset="0.6" stopColor="#8DAEE3" />
      <stop offset="1" stopColor="#6E8DC6" />
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#1A1B20" />
      <stop offset="0.3" stopColor="#101114" />
      <stop offset="1" stopColor="#060607" />
    </linearGradient>
    <linearGradient id="counterTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#6E6F78" />
      <stop offset="1" stopColor="#4A4B53" />
    </linearGradient>
    <linearGradient id="counterFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#2E2F35" />
      <stop offset="1" stopColor="#1A1A1F" />
    </linearGradient>
    <linearGradient id="bookRed" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#FF4248" />
      <stop offset="0.6" stopColor="#E0202A" />
      <stop offset="1" stopColor="#A3121B" />
    </linearGradient>
    <radialGradient id="bulb" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#FFF4DA" stopOpacity="1" />
      <stop offset="0.25" stopColor="#FFD79A" stopOpacity="0.7" />
      <stop offset="1" stopColor="#FFB45C" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#FFD9A0" stopOpacity="0.34" />
      <stop offset="0.7" stopColor="#FFC780" stopOpacity="0.1" />
      <stop offset="1" stopColor="#FFC780" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#9DBBEB" stopOpacity="0.16" />
      <stop offset="1" stopColor="#9DBBEB" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="underShadow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#000" stopOpacity="0.72" />
      <stop offset="0.55" stopColor="#000" stopOpacity="0.3" />
      <stop offset="1" stopColor="#000" stopOpacity="0" />
    </linearGradient>
    <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#FFCF8E" stopOpacity="0.5" />
      <stop offset="1" stopColor="#FFCF8E" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="coldPool" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#7FA6E6" stopOpacity="0.35" />
      <stop offset="1" stopColor="#7FA6E6" stopOpacity="0" />
    </radialGradient>
    <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
    <filter id="blur18" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18" />
    </filter>
    <filter id="blur40" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="40" />
    </filter>
    <filter id="bookglow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="16" />
    </filter>
    <filter id="figShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000" floodOpacity="0.6" />
    </filter>
  </defs>
);

const Window: React.FC<{x: number; y: number; w: number; h: number; cols: number; rows: number; city?: boolean; par: number; light: number}> = ({
  x, y, w, h, cols, rows, city, par, light,
}) => {
  const id = `win-${x}`;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      {/* window bloom on the wall */}
      <rect x={x - 30} y={y - 30} width={w + 60} height={h + 60} fill="#8EAEE6" opacity={0.12 * light} filter="url(#blur40)" />
      <g clipPath={`url(#${id})`}>
        <rect x={x} y={y} width={w} height={h} fill="url(#glass)" opacity={0.35 + 0.65 * light} />
        {city && (
          <g transform={`translate(${par} 0)`}>
            <rect x={x + 34} y={y + h * 0.34} width={92} height={h} fill="#46619A" opacity={0.85} />
            <rect x={x + 150} y={y + h * 0.58} width={70} height={h} fill="#5670A8" opacity={0.6} />
            {Array.from({length: 7}).map((_, r) =>
              Array.from({length: 4}).map((__, c) => (
                <rect key={`${r}-${c}`} x={x + 44 + c * 19} y={y + h * 0.38 + r * 26} width={11} height={14}
                  fill={random(`cw${r}${c}`) > 0.35 ? '#E4EEFF' : '#6C86BD'} opacity={0.9} />
              ))
            )}
          </g>
        )}
        {/* reflection streak */}
        <path d={`M${x + w * 0.2} ${y} L${x + w * 0.45} ${y} L${x + w * 0.1} ${y + h} L${x - w * 0.15} ${y + h} Z`} fill="#fff" opacity={0.07} />
      </g>
      {/* mullions */}
      {Array.from({length: cols - 1}).map((_, i) => (
        <rect key={`c${i}`} x={x + ((i + 1) * w) / cols - 5} y={y} width={10} height={h} fill="#0E0F12" />
      ))}
      {Array.from({length: rows - 1}).map((_, i) => (
        <rect key={`r${i}`} x={x} y={y + ((i + 1) * h) / rows - 5} width={w} height={10} fill="#0E0F12" />
      ))}
      <rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill="none" stroke="#0B0B0E" strokeWidth={16} />
      <rect x={x - 14} y={y + h + 6} width={w + 28} height={14} fill="#24252B" />
    </g>
  );
};

export const BackWall: React.FC<{light: number; cityPar: number}> = ({light, cityPar}) => (
  <g>
    <rect x={-600} y={-200} width={2280} height={WORLD.wallBase + 200} fill="url(#wall)" />
    {/* wall panels */}
    {Array.from({length: 13}).map((_, i) => (
      <rect key={i} x={-560 + i * 180} y={0} width={3} height={WORLD.wallBase} fill="#fff" opacity={0.018} />
    ))}
    <Window x={10} y={430} w={300} h={420} cols={2} rows={3} city par={cityPar} light={light} />
    <Window x={700} y={410} w={360} h={440} cols={3} rows={3} par={cityPar} light={light} />
    {/* window light beams falling into the room */}
    <path d="M10 850 L310 850 L420 1260 L-120 1260 Z" fill="url(#beam)" opacity={light} />
    <path d="M700 850 L1060 850 L1180 1260 L640 1260 Z" fill="url(#beam)" opacity={light} />
    <rect x={-600} y={WORLD.wallBase - 40} width={2280} height={40} fill="#0B0B0D" />
  </g>
);

export const Lamp: React.FC<{on: number}> = ({on}) => {
  const {lampX: x, lampY: y} = WORLD;
  return (
    <g>
      <line x1={x} y1={-200} x2={x} y2={y - 40} stroke="#2A2B30" strokeWidth={3} />
      <circle cx={x} cy={y} r={170} fill="url(#bulb)" opacity={0.55 * on} />
      <path d={`M${x - 70} ${y} Q${x - 62} ${y - 44} ${x} ${y - 46} Q${x + 62} ${y - 44} ${x + 70} ${y} Z`} fill="#1E1F24" stroke={OUT} strokeWidth={3} />
      <path d={`M${x - 70} ${y} Q${x - 62} ${y - 44} ${x} ${y - 46}`} stroke="#FFDCA8" strokeWidth={2} fill="none" opacity={0.25 * on} />
      <ellipse cx={x} cy={y + 2} rx={66} ry={9} fill="#FFF1D2" opacity={0.15 + 0.85 * on} />
      <ellipse cx={x} cy={y + 2} rx={90} ry={22} fill="#FFE2B0" opacity={0.5 * on} filter="url(#blur18)" />
    </g>
  );
};

export const LightCone: React.FC<{on: number; warm: number}> = ({on, warm}) => {
  const {lampX: x, lampY: y} = WORLD;
  return (
    <g style={{mixBlendMode: 'screen'}}>
      <path d={`M${x - 64} ${y + 4} L${x + 64} ${y + 4} L${x + 330} ${WORLD.counterTop + 20} L${x - 330} ${WORLD.counterTop + 20} Z`} fill="url(#cone)" opacity={on * (0.8 + 0.5 * warm)} filter="url(#blur6)" />
      <ellipse cx={x} cy={WORLD.tableY + 10} rx={330 + 40 * warm} ry={70} fill="url(#pool)" opacity={on * (0.55 + 0.45 * warm)} />
    </g>
  );
};

export const Dust: React.FC<{f: number; on: number}> = ({f, on}) => {
  const {lampX: x, lampY: y} = WORLD;
  return (
    <g style={{mixBlendMode: 'screen'}} opacity={on}>
      {Array.from({length: 46}).map((_, i) => {
        const r1 = random(`d${i}a`);
        const r2 = random(`d${i}b`);
        const r3 = random(`d${i}c`);
        const t = f / 30;
        const py = y + 40 + ((r2 * 400 + t * (6 + r3 * 10)) % 400);
        const spread = ((py - y) / 420) * 300;
        const px = x + (r1 * 2 - 1) * spread + Math.sin(t * (0.4 + r3) + i) * 12;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + r1 * 2) + i));
        return <circle key={i} cx={px} cy={py} r={0.8 + r3 * 2.2} fill="#FFE7C2" opacity={0.55 * tw} />;
      })}
    </g>
  );
};

export const Floor: React.FC<{on: number; warm: number}> = ({on, warm}) => (
  <g>
    <rect x={-600} y={WORLD.wallBase} width={2280} height={1100} fill="url(#floor)" />
    {/* glossy reflections of window + lamp on the floor */}
    <ellipse cx={WORLD.lampX} cy={WORLD.counterFloor + 120} rx={360} ry={60} fill="#FFC985" opacity={0.08 * on * (1 + warm)} filter="url(#blur40)" />
    <rect x={20} y={WORLD.counterFloor + 30} width={260} height={220} fill="#8EAEE6" opacity={0.05} filter="url(#blur40)" />
    <rect x={720} y={WORLD.counterFloor + 30} width={320} height={220} fill="#8EAEE6" opacity={0.05} filter="url(#blur40)" />
  </g>
);

export const Stool: React.FC<{x: number; floorY: number; s: number; seatY: number}> = ({x, floorY, s, seatY}) => (
  <g>
    <ellipse cx={x} cy={floorY + 2} rx={40 * s} ry={7 * s} fill="#000" opacity={0.6} filter="url(#blur6)" />
    <rect x={x - 5 * s} y={seatY} width={10 * s} height={floorY - seatY} fill="#1F2025" stroke={OUT} strokeWidth={2} />
    <ellipse cx={x} cy={floorY - 2} rx={22 * s} ry={5 * s} fill="#25262C" stroke={OUT} strokeWidth={2} />
    <rect x={x - 34 * s} y={seatY - 6 * s} width={68 * s} height={12 * s} rx={6 * s} fill="#2D2E35" stroke={OUT} strokeWidth={2.5} />
  </g>
);

export const GroupTable: React.FC<{warm: number}> = ({warm}) => {
  const {tableX: x, tableY: y} = WORLD;
  return (
    <g>
      <ellipse cx={x} cy={WORLD.backFloor} rx={120} ry={14} fill="#000" opacity={0.7} filter="url(#blur6)" />
      <rect x={x - 9} y={y} width={18} height={WORLD.backFloor - y} fill="#1F2025" stroke={OUT} strokeWidth={2} />
      <ellipse cx={x} cy={y + 8} rx={190} ry={28} fill="#2A2B31" stroke={OUT} strokeWidth={3} />
      <ellipse cx={x} cy={y} rx={190} ry={26} fill="#5E5F68" stroke={OUT} strokeWidth={3} />
      <ellipse cx={x} cy={y - 2} rx={172} ry={19} fill="#FFD9A0" opacity={0.18 + 0.14 * warm} />
      {/* cups & plates */}
      {[[-110, 0], [-30, -7], [50, -5], [125, 1]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${x + dx} ${y + dy})`}>
          <ellipse cx={0} cy={2} rx={20} ry={5} fill="#D9D9DE" stroke={OUT} strokeWidth={2} />
          <rect x={-7} y={-16} width={14} height={16} rx={3} fill="#EDEDF0" stroke={OUT} strokeWidth={2} />
        </g>
      ))}
    </g>
  );
};

export const Counter: React.FC<{on: number; steam: number; f: number}> = ({on, steam, f}) => {
  const {counterTop: t, counterFace: fa, counterBottom: b, counterFloor: fl} = WORLD;
  return (
    <g>
      {[60, 1020].map((lx) => (
        <g key={lx}>
          <rect x={lx - 10} y={b} width={20} height={fl - b} fill="#1A1B20" stroke={OUT} strokeWidth={2} />
          <ellipse cx={lx} cy={fl} rx={46} ry={8} fill="#000" opacity={0.6} filter="url(#blur6)" />
        </g>
      ))}
      <ellipse cx={540} cy={fl + 6} rx={560} ry={22} fill="#000" opacity={0.45} filter="url(#blur18)" />
      <rect x={-70} y={b} width={1220} height={fl - b + 40} fill="url(#underShadow)" />
      <path d={`M-60 ${t} L1140 ${t} L1150 ${fa} L-70 ${fa} Z`} fill="url(#counterTop)" stroke={OUT} strokeWidth={3} strokeLinejoin="round" />
      <rect x={-70} y={fa} width={1220} height={b - fa} fill="url(#counterFace)" stroke={OUT} strokeWidth={3} />
      <line x1={-60} y1={t + 2} x2={1140} y2={t + 2} stroke="#B8B9C4" strokeWidth={2} opacity={0.35} />
      {/* warm sheen from lamp across the counter top */}
      <ellipse cx={WORLD.lampX} cy={t + 10} rx={330} ry={10} fill="#FFD9A0" opacity={0.22 * on} filter="url(#blur6)" />
      {/* introvert's tea with steam */}
      <g transform={`translate(398 ${t + 8})`}>
        <ellipse cx={0} cy={2} rx={34} ry={7} fill="#CFCFD5" stroke={OUT} strokeWidth={2.5} />
        <rect x={-14} y={-30} width={28} height={32} rx={5} fill="#EEEFF3" stroke={OUT} strokeWidth={3} />
        <path d="M14 -22 q12 2 10 12 q-2 8 -10 6" stroke={OUT} strokeWidth={3} fill="none" />
        {[0, 1, 2].map((i) => {
          const tt = ((f + i * 22) % 66) / 66;
          return (
            <path key={i} d={`M${-4 + i * 4} ${-36 - tt * 60} q${8 * Math.sin(tt * 6 + i)} -12 0 -24`} stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" opacity={steam * 0.35 * Math.sin(tt * Math.PI)} filter="url(#blur6)" />
          );
        })}
      </g>
      {/* shy's untouched cup */}
      <g transform={`translate(722 ${t + 8})`}>
        <ellipse cx={0} cy={2} rx={30} ry={6} fill="#CFCFD5" stroke={OUT} strokeWidth={2.5} />
        <rect x={-12} y={-26} width={24} height={28} rx={5} fill="#E5E6EB" stroke={OUT} strokeWidth={3} />
      </g>
    </g>
  );
};
