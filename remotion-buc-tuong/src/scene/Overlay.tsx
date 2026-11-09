import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, easeOut, invLerp, smooth} from '../engine/math';
import {DURATION, T} from '../timeline';

const FONT = 'Montserrat, sans-serif';

/** Letters arrive one by one: each rises, sharpens and brightens, like a thought being typed. */
const Typed: React.FC<{text: string; start: number; cps?: number; size: number; weight: number; color?: string; spacing?: number; glow?: string}> = ({
  text, start, cps = 2.2, size, weight, color = '#fff', spacing = 0.04, glow,
}) => {
  const f = useCurrentFrame();
  const chars = Array.from(text);
  return (
    <span style={{whiteSpace: 'pre-wrap'}}>
      {chars.map((ch, i) => {
        const t = clamp((f - start - i / cps * 1) / 7);
        const e = easeOut(t);
        return (
          <span key={i} style={{
            display: 'inline-block', opacity: e, transform: `translateY(${(1 - e) * size * 0.35}px)`, filter: `blur(${(1 - e) * 6}px)`,
            fontFamily: FONT, fontWeight: weight, fontSize: size, color, letterSpacing: size * spacing, textShadow: glow,
          }}>{ch === ' ' ? ' ' : ch}</span>
        );
      })}
    </span>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const topOut = 1 - smooth(invLerp(T.endFade1, T.endFade1 + 20, f));
  const endOut = 1 - smooth(invLerp(DURATION - 22, DURATION - 2, f));
  const l1Dim = 1 - 0.45 * smooth(invLerp(T.line2 - 6, T.line2 + 10, f));
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {f >= T.line1 - 2 && topOut > 0 ? (
        <div style={{position: 'absolute', top: 190, left: 70, right: 70, textAlign: 'center', opacity: topOut, lineHeight: 1.5}}>
          <div style={{opacity: l1Dim}}>
            <Typed text="Bức tường này," start={T.line1} size={46} weight={300} color="#d9d9d9" />
            <br />
            <Typed text="ta đã cùng nhau xây." start={T.line1 + 16} size={46} weight={600} color="#f2f2f2" />
          </div>
          {f >= T.line2 - 2 ? (
            <div style={{marginTop: 26}}>
              <Typed text="Vậy hãy cùng nhau" start={T.line2} size={46} weight={300} color="#ffffff" />
              <br />
              <Typed text="gỡ bỏ nó." start={T.line2 + 18} size={58} weight={800} color="#ffffff" glow="0 0 24px rgba(255,255,255,0.55)" spacing={0.06} />
            </div>
          ) : null}
        </div>
      ) : null}

      {f >= T.end1 - 2 ? (
        <div style={{position: 'absolute', top: 1500, left: 60, right: 60, textAlign: 'center', opacity: endOut, lineHeight: 1.35}}>
          <div style={{marginBottom: 30}}>
            <Typed text="Mỗi lời nói nặng là một viên gạch." start={T.end1} cps={3} size={40} weight={400} color="#cfcfcf" spacing={0.02} />
          </div>
          <div>
            <Typed text="Hãy là người" start={T.end2} cps={2.4} size={66} weight={300} color="#ffffff" spacing={0.02} />
            <br />
            <Typed text="gỡ viên đầu tiên." start={T.end2 + 12} cps={2.4} size={72} weight={800} color="#ffffff" spacing={0.01} glow="0 0 30px rgba(255,255,255,0.45)" />
          </div>
          <div style={{
            margin: '44px auto 0', height: 3, borderRadius: 2, background: '#e8402a',
            width: 120 * easeOut(clamp((f - T.end2 - 28) / 16)), boxShadow: '0 0 18px rgba(232,64,42,0.8)',
          }} />
        </div>
      ) : null}
    </div>
  );
};
