import React from 'react';
import {C, PHRASES, SANS, clamp} from './lib';

// Phrases whose words are already spoken on screen as typography — no duplicate subtitle.
const HIDE = new Set(['voly', 'dat', 'khongai', 'thoigian', 'reveal', 'vannau', 'cauhoi', 'maila', 'roidi2', 'tieptuc', 'dolua']);

export const Captions: React.FC<{t: number}> = ({t}) => {
  const i = PHRASES.findIndex((p, k) => t >= p.start - 0.08 && t < Math.min(p.end + 0.45, PHRASES[k + 1]?.start ?? 1e9) - 0.04);
  if (i < 0) return null;
  const p = PHRASES[i];
  if (HIDE.has(p.key)) return null;
  const nextStart = PHRASES[i + 1]?.start ?? p.end + 0.6;
  const op = Math.min(clamp((t - p.start + 0.08) / 0.12), clamp((Math.min(p.end + 0.45, nextStart) - 0.04 - t) / 0.12));
  return (
    <div style={{position: 'absolute', left: 90, width: 900, top: 1420, textAlign: 'center', opacity: op, fontFamily: SANS, fontWeight: 500, fontSize: 50, lineHeight: 1.32, textShadow: '0 2px 18px rgba(0,0,0,0.9)'}}>
      {p.words.map((w, j) => {
        const said = t >= w.start - 0.02;
        const now = said && t < w.end + 0.05;
        return (
          <span key={j} style={{color: now ? C.ember : C.paper, opacity: said ? 1 : 0.32}}>
            {w.w}
            {j < p.words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};
