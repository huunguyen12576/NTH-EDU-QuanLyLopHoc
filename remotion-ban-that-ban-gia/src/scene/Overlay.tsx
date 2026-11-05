import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {clamp, easeOut, range} from '../lib/math';
import {DURATION, OUT, segAt} from '../timeline';

const FONT = 'Montserrat, sans-serif';
const COLD = '#e9ecf2';
const AMBER = '#ffb15c';
const MUDC = '#c98a54';

/** Words rise out of a soft blur, tracking tightens: premium kinetic type. */
const Words: React.FC<{text: string; at: number; f: number; size: number; weight: number; color?: string; stagger?: number; spacing?: number; out?: number; italic?: boolean; accent?: Record<string, string>}> = ({text, at, f, size, weight, color = '#fff', stagger = 4, spacing = 0, out, accent = {}}) => {
  const words = text.split(' ');
  const fadeOut = out !== undefined ? 1 - range(out, out + 12, f) : 1;
  return (
    <div style={{fontFamily: FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.22, letterSpacing: `${spacing}em`, textAlign: 'center', opacity: fadeOut}}>
      {words.map((w, i) => {
        const t = clamp((f - at - i * stagger) / 16);
        const e = easeOut(t);
        const key = w.replace(/[.,]/g, '');
        return (
          <span key={i} style={{display: 'inline-block', marginRight: '0.28em', opacity: e, transform: `translateY(${(1 - e) * 0.45}em)`, filter: `blur(${(1 - e) * 10}px)`, color: accent[key] ?? color}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

const Label: React.FC<{text: string; f: number; at: number; until: number; color: string}> = ({text, f, at, until, color}) => {
  const t = easeOut(clamp((f - at) / 22));
  const o = t * (1 - range(until - 10, until, f));
  return (
    <div style={{position: 'absolute', top: 190, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: o}}>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 44, letterSpacing: `${0.62 - 0.22 * t}em`, color, textShadow: `0 0 28px ${color}55`, paddingLeft: '0.4em'}}>{text}</div>
      <div style={{marginTop: 18, height: 3, width: 120 * t, background: color, opacity: 0.8, borderRadius: 2}} />
    </div>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const seg = segAt(f);
  const endIn = OUT.end + 34;
  const end2 = OUT.end + 112;
  const fadeAll = 1 - range(DURATION - 14, DURATION - 1, f);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: fadeAll}}>
      {/* HOOK */}
      {f < OUT.hookEnd && (
        <div style={{position: 'absolute', top: 300, width: '100%', opacity: 1 - range(44, 52, f)}}>
          <Words text="Cùng một vũng bùn." at={8} f={f} size={70} weight={600} color={COLD} />
          <div style={{height: 18}} />
          <Words text="Hai kiểu bạn." at={22} f={f} size={44} weight={300} color="#c7ccd6" spacing={0.04} />
        </div>
      )}
      {/* ACT LABELS */}
      <Label text="BẠN GIẢ" f={f} at={OUT.hookEnd + 4} until={OUT.rw1} color={COLD} />
      <Label text="BẠN THẬT" f={f} at={OUT.act2 + 4} until={OUT.end + 8} color={AMBER} />
      {/* REWIND tag */}
      {seg.rewind > 0.02 && (
        <div style={{position: 'absolute', top: 120, left: 80, fontFamily: FONT, fontWeight: 800, fontSize: 40, color: '#fff', opacity: clamp(seg.rewind * 2.5), letterSpacing: '0.12em', textShadow: '3px 0 0 rgba(255,40,60,0.7), -3px 0 0 rgba(40,200,255,0.7)'}}>
          ◀◀ TUA LẠI
        </div>
      )}
      {/* END */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 900, background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0))', opacity: range(endIn - 20, endIn + 10, f)}} />
      {f >= endIn - 2 && (
        <div style={{position: 'absolute', top: 300, width: '100%', padding: '0 70px', boxSizing: 'border-box'}}>
          <Words text="Ai cũng muốn đứng cạnh bạn" at={endIn} f={f} size={52} weight={400} color={COLD} out={end2 - 10} />
          <Words text="khi bạn còn sạch sẽ." at={endIn + 22} f={f} size={52} weight={600} color={COLD} out={end2 - 10} />
        </div>
      )}
      {f >= end2 - 2 && (
        <div style={{position: 'absolute', top: 270, width: '100%', padding: '0 60px', boxSizing: 'border-box'}}>
          <Words text="Bạn thật" at={end2} f={f} size={128} weight={800} color={AMBER} stagger={6} />
          <div style={{height: 16}} />
          <Words text="là người dám lấm bẩn" at={end2 + 16} f={f} size={60} weight={600} color="#fff" stagger={4} accent={{lấm: MUDC, bẩn: MUDC}} />
          <Words text="cùng bạn." at={end2 + 34} f={f} size={60} weight={600} color="#fff" stagger={4} />
          <div style={{margin: '42px auto 0', width: interpolate(f, [end2 + 40, end2 + 70], [0, 160], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), height: 3, background: AMBER, opacity: 0.7, borderRadius: 2}} />
        </div>
      )}
    </AbsoluteFill>
  );
};
