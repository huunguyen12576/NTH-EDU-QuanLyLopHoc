import React from 'react';
import {measureText} from '@remotion/layout-utils';

export const FONT = 'Montserrat';
const OUT = '#0A0A0C';

const widthOf = (text: string, size: number) =>
  measureText({text, fontFamily: FONT, fontSize: size, fontWeight: '700', letterSpacing: '0.01em'}).width;

/**
 * A bubble that can be a thought (black cloud, white text) or speech (white card, dark text).
 * `mode` 0 → thought, 1 → speech, animated as a card flip.
 */
export const Bubble: React.FC<{
  x: number;
  y: number; // bottom-centre of the bubble body
  lines: string[];
  appear: number; // spring 0..1+
  opacity?: number;
  mode: number;
  tail: [number, number]; // world point the tail / trail points to
  size?: number;
  flash?: number;
  seed?: number;
  dim?: number;
}> = ({x, y, lines, appear, opacity = 1, mode, tail, size = 32, flash = 0, seed = 0, dim = 0}) => {
  if (appear <= 0.001 || opacity <= 0.001) return null;
  const lh = size * 1.3;
  const w = Math.max(...lines.map((l) => widthOf(l, size))) + size * 1.4;
  const h = lines.length * lh + size * 0.9;
  const flip = Math.abs(Math.cos(mode * Math.PI));
  const speech = mode > 0.5;
  const sc = Math.max(0, appear);
  const body = {x: -w / 2, y: -h, w, h};
  const r = Math.min(h / 2, 30);

  // cloud bumps around the rounded rect (thought)
  const bumps: [number, number, number][] = [];
  const nX = Math.max(2, Math.round(w / 46));
  for (let i = 0; i <= nX; i++) {
    const px = body.x + 14 + ((w - 28) * i) / nX;
    bumps.push([px, body.y + 4, 20 + ((i * 7 + seed) % 3) * 3]);
    bumps.push([px, 0 - 4, 18 + ((i * 5 + seed) % 3) * 3]);
  }
  bumps.push([body.x + 6, body.y + h / 2, h / 2.2]);
  bumps.push([-body.x - 6, body.y + h / 2, h / 2.2]);

  const dx = tail[0] - x;
  const tx0 = 0;
  const dy = tail[1] - y;
  const tx = Math.max(-w / 2 + 26, Math.min(w / 2 - 44, dx * 0.3)) + tx0;

  return (
    <g opacity={opacity * (1 - dim * 0.55)} transform={`translate(${x} ${y}) scale(${sc * flip + 0.0001} ${sc})`}>
      {flash > 0 && <ellipse cx={0} cy={-h / 2} rx={w * 0.8} ry={h * 1.1} fill="#FFE2B0" opacity={flash * 0.6} filter="url(#blur18)" />}
      <g filter="url(#figShadow)">
        {!speech ? (
          <g>
            {/* trail of small thought dots toward the head */}
            {[0.3, 0.55, 0.78].map((t, i) => (
              <circle key={i} cx={dx * t} cy={dy * t} r={9 - i * 2.4} fill="#0B0B0D" stroke="#F3F3F6" strokeWidth={3.5} />
            ))}
            <g stroke="#F3F3F6" strokeWidth={7}>
              <rect x={body.x} y={body.y} width={w} height={h} rx={r} fill="#0B0B0D" />
              {bumps.map(([bx, by, br], i) => (
                <circle key={i} cx={bx} cy={by} r={br} fill="#0B0B0D" />
              ))}
            </g>
            <rect x={body.x} y={body.y} width={w} height={h} rx={r} fill="#0B0B0D" />
            {bumps.map(([bx, by, br], i) => (
              <circle key={`f${i}`} cx={bx} cy={by} r={br - 3.4} fill="#0B0B0D" />
            ))}
          </g>
        ) : (
          <g>
            <path d={`M${tx - 14} -6 L${dx * 0.62} ${Math.max(28, dy * 0.62)} L${tx + 18} -6 Z`} fill="#F6F6F8" stroke={OUT} strokeWidth={3} strokeLinejoin="round" />
            <rect x={body.x} y={body.y} width={w} height={h} rx={r} fill="#F6F6F8" stroke={OUT} strokeWidth={3} />
            <path d={`M${tx - 14} -6 L${dx * 0.62} ${Math.max(28, dy * 0.62)} L${tx + 18} -6 Z`} fill="#F6F6F8" />
          </g>
        )}
      </g>
      {lines.map((l, i) => (
        <text
          key={i}
          x={0}
          y={body.y + size * 0.45 + lh * (i + 0.5) + size * 0.33}
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={700}
          fontSize={size}
          letterSpacing="0.01em"
          fill={speech ? '#111114' : '#F6F6F8'}
        >
          {l}
        </text>
      ))}
    </g>
  );
};

export const Label: React.FC<{x: number; y: number; text: string; color: string; o: number; under: number}> = ({x, y, text, color, o, under}) => {
  if (o <= 0.001) return null;
  const w = measureText({text, fontFamily: FONT, fontSize: 28, fontWeight: '800', letterSpacing: '0.16em'}).width;
  return (
    <g opacity={o} transform={`translate(${x} ${y - (1 - o) * 14})`}>
      <text x={0} y={0} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={28} letterSpacing="0.16em" fill="#F4F4F6"
        style={{paintOrder: 'stroke'}} stroke="#0A0A0C" strokeWidth={6}>
        {text}
      </text>
      <rect x={(-w / 2) * under} y={12} width={w * under} height={4} rx={2} fill={color} />
    </g>
  );
};
