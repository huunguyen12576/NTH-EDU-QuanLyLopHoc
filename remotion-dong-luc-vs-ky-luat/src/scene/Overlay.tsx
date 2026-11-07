import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {makeCam, project} from '../engine/camera';
import {clamp, easeOut, easeOutBack, invLerp, keys, lerp, smooth, spring01} from '../engine/math';
import {calDoy, cameraAt, D_X, dateOf, dCount, dState, lastFlip, mCount, mState} from '../engine/story';
import {T} from '../timeline';

const FONT = 'Montserrat, sans-serif';
const RED = '#ec343a';

/** Odometer digits: each digit rolls up when it changes. */
const Counter: React.FC<{n: number; f: number; prev: number; flipAt: number; color: string; size: number}> = ({n, prev, f, flipAt, color, size}) => {
  const s = String(n).padStart(3, '0');
  const p = String(prev).padStart(3, '0');
  const t = easeOut(clamp((f - flipAt) / 4));
  return (
    <span style={{display: 'inline-flex', overflow: 'hidden', height: size * 1.15, fontVariantNumeric: 'tabular-nums'}}>
      {s.split('').map((ch, i) => {
        const changed = ch !== p[i];
        return (
          <span key={i} style={{position: 'relative', width: size * 0.7, height: size * 1.15, display: 'inline-block', textAlign: 'center'}}>
            {changed && t < 1 ? <span style={{position: 'absolute', left: 0, right: 0, top: -t * size * 1.15, color, opacity: 1 - t}}>{p[i]}</span> : null}
            <span style={{position: 'absolute', left: 0, right: 0, top: changed ? (1 - t) * size * 1.15 : 0, color}}>{ch}</span>
          </span>
        );
      })}
    </span>
  );
};

const findChange = (f: number, fn: (x: number) => number) => {
  const cur = fn(f);
  for (let k = 0; k < 8; k++) if (fn(f - k - 1) !== cur) return {at: f - k, prev: fn(f - k - 1)};
  return {at: -99, prev: cur};
};

const Column: React.FC<{title: string; f: number; x: number; active: number; n: (f: number) => number; red: number; enter: number}> = ({title, f, x, active, n, red, enter}) => {
  const ch = findChange(f, n);
  const col = red > 0.05 ? RED : `rgb(${Math.round(lerp(110, 255, active))},${Math.round(lerp(110, 255, active))},${Math.round(lerp(114, 255, active))})`;
  const e = easeOut(clamp(enter));
  return (
    <div style={{position: 'absolute', left: x - 260, width: 520, top: 268, textAlign: 'center', fontFamily: FONT, opacity: e, transform: `translateY(${(1 - e) * 24}px)`}}>
      <div style={{fontWeight: 800, fontSize: 50, letterSpacing: '0.14em', color: `rgba(255,255,255,${lerp(0.42, 1, active)})`, textShadow: active > 0.5 ? `0 0 ${24 * active}px rgba(255,255,255,0.35)` : 'none', paddingLeft: '0.14em'}}>
        {title}
      </div>
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 12, marginTop: 6}}>
        <span style={{fontWeight: 600, fontSize: 22, letterSpacing: '0.2em', color: `rgba(255,255,255,${lerp(0.35, 0.7, active)})`}}>NGÀY</span>
        <span style={{fontWeight: 600, fontSize: 44, textShadow: red > 0.05 ? `0 0 ${20 * red}px rgba(236,52,58,0.9)` : 'none'}}>
          <Counter n={n(f)} prev={ch.prev} flipAt={ch.at} f={f} color={col} size={44} />
        </span>
      </div>
    </div>
  );
};

const Calendar: React.FC<{f: number; enter: number}> = ({f, enter}) => {
  const doy = calDoy(f);
  const {m, d} = dateOf(doy);
  const lf = lastFlip(f);
  const prev = dateOf(calDoy(lf - 1));
  const t = clamp((f - lf) / 5);
  const flipping = t < 1;
  const fast = f > T.yearStart + 60 && f < T.yearEnd;
  // Dec 31 lands with weight; Jan 1 lands with a punch
  const landDec = f >= T.yearEnd ? spring01((f - T.yearEnd) / 30, 2.4, 0.35) : 1;
  const landJan = f >= T.newYear ? spring01((f - T.newYear) / 30, 3, 0.3) : 1;
  const scale = (f >= T.newYear ? lerp(1.35, 1, landJan) : f >= T.yearEnd ? lerp(1.25, 1, landDec) : 1) * (0.9 + 0.1 * easeOut(clamp(enter)));
  const e = easeOutBack(clamp(enter), 1.4);
  const w = 150, h = 168;
  const page = (mm: number, dd: number, extra: React.CSSProperties = {}) => (
    <div style={{position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', background: 'linear-gradient(180deg,#fdfdfd,#e2e2e6)', boxShadow: '0 18px 40px rgba(0,0,0,0.6), inset 0 -3px 0 rgba(0,0,0,0.12)', ...extra}}>
      <div style={{height: 44, background: f >= T.newYear && f < T.newYear + 50 && mm === 1 ? RED : '#1b1b1f', color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 19, letterSpacing: '0.16em', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        THÁNG {mm}
      </div>
      <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 84, color: '#111', textAlign: 'center', lineHeight: '120px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em'}}>{dd}</div>
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 540 - w / 2, top: 450, width: w, height: h, perspective: 600, opacity: clamp(enter * 2), transform: `scale(${scale * e})`, filter: fast ? `blur(${0.6}px)` : undefined}}>
      {/* rings */}
      {[-36, 36].map((x) => (
        <div key={x} style={{position: 'absolute', left: w / 2 + x - 5, top: -12, width: 10, height: 26, borderRadius: 5, background: 'linear-gradient(90deg,#666,#ddd,#666)', zIndex: 3}} />
      ))}
      {page(m, d)}
      {flipping ? (
        <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 0%', transform: `rotateX(${t * 105}deg)`, opacity: 1 - t * 0.8, backfaceVisibility: 'hidden'}}>{page(prev.m, prev.d)}</div>
      ) : null}
    </div>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const ms = mState(f);
  const ds = dState(f);
  const mc = mCount(f);

  const hudEnter = invLerp(T.hudIn, T.hudIn + 16, f);
  const hudOut = 1 - smooth(invLerp(T.endDim, T.endDim + 16, f));
  const mActive = clamp(ms.glow * 1.3 + (1 - ms.sit) * 0.4);
  const dActive = clamp(0.45 + 0.55 * ((ds.bright - 0.52) / 0.48));

  const endDim = smooth(invLerp(T.endDim, T.endDim + 30, f));
  const blackIn = f < T.lightsOn ? 1 : 0;
  const fadeOut = smooth(invLerp(T.fadeOut, 778, f));

  // world-anchored day badge above the disciplined at the end
  const cs = cameraAt(f);
  const cam = makeCam(cs.pos, cs.tgt, cs.F, cs.roll);
  const badgeP = project(cam, [D_X, 2.95, 0]);
  const badgeIn = easeOut(invLerp(T.end2 + 26, T.end2 + 44, f));
  const n367 = findChange(f, dCount);

  return (
    <AbsoluteFill>
      {/* end dimming (keeps the light on the disciplined) */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 40% 30% at 76% 66%, rgba(0,0,0,${0.25 * endDim}) 0%, rgba(0,0,0,${0.72 * endDim}) 100%)`}} />

      <AbsoluteFill style={{opacity: hudOut}}>
        <Column title="ĐỘNG LỰC" f={f} x={270} active={mActive} n={(x) => mCount(x).n} red={mc.red} enter={hudEnter} />
        <Column title="KỶ LUẬT" f={f} x={810} active={dActive} n={dCount} red={0} enter={invLerp(T.hudIn + 6, T.hudIn + 22, f)} />
        <Calendar f={f} enter={invLerp(T.hudIn + 10, T.hudIn + 28, f)} />
      </AbsoluteFill>

      {/* END CARD */}
      {f >= T.end1 ? (
        <AbsoluteFill style={{fontFamily: FONT, textAlign: 'center', alignItems: 'center'}}>
          <div style={{position: 'absolute', top: 250, width: '100%'}}>
            {['Động lực luôn', 'bắt đầu lại từ'].map((line, i) => {
              const s = T.end1 + i * 7;
              const a = easeOut(invLerp(s, s + 20, f));
              return (
                <div key={i} style={{fontWeight: 300, fontSize: 62, lineHeight: 1.22, color: '#d6d6d6', opacity: a, transform: `translateY(${(1 - a) * 26}px)`, filter: `blur(${(1 - a) * 8}px)`}}>
                  {line}
                </div>
              );
            })}
            {(() => {
              const s = T.end1 + 18;
              const a = easeOutBack(invLerp(s, s + 16, f), 1.6);
              const o = clamp(invLerp(s, s + 6, f));
              return (
                <div style={{fontWeight: 800, fontSize: 70, lineHeight: 1.25, color: RED, opacity: o, transform: `scale(${lerp(1.4, 1, a)})`, textShadow: `0 0 30px rgba(236,52,58,${0.6 * o})`}}>
                  ngày 1.
                </div>
              );
            })()}
            <div style={{height: 44}} />
            {['Kỷ luật', 'thì không.'].map((line, i) => {
              const s = T.end2 + i * 9;
              const a = spring01((f - s) / 30, 2.2, 0.5);
              const o = clamp(invLerp(s, s + 6, f));
              return (
                <div key={i} style={{fontWeight: 800, fontSize: 104, lineHeight: 1.08, letterSpacing: '-0.01em', color: '#fff', opacity: o, transform: `translateY(${(1 - a) * 60}px)`, textShadow: `0 0 40px rgba(255,255,255,${0.28 * o})`}}>
                  {line}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      ) : null}

      {/* world-anchored streak badge */}
      {badgeIn > 0 ? (
        <div style={{position: 'absolute', left: badgeP.x - 150, top: badgeP.y - 30, width: 300, textAlign: 'center', fontFamily: FONT, opacity: badgeIn * (1 - fadeOut), transform: `translateY(${(1 - badgeIn) * 14}px)`}}>
          <span style={{fontWeight: 600, fontSize: 24, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', marginRight: 12}}>NGÀY</span>
          <span style={{fontWeight: 800, fontSize: 46, color: '#fff', textShadow: f >= T.d367 ? `0 0 ${30 * clamp(1 - (f - T.d367) / 30)}px rgba(255,255,255,0.9)` : 'none'}}>
            <Counter n={dCount(f)} prev={n367.prev} flipAt={n367.at} f={f} color="#fff" size={46} />
          </span>
        </div>
      ) : null}

      {/* lens: vignette + grain */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 62% at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.8) 100%)'}} />
      <AbsoluteFill style={{opacity: 0.06, mixBlendMode: 'screen'}}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 24} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
      {/* flashes: lights on, lockout, new year */}
      <AbsoluteFill
        style={{
          background: '#fff',
          opacity: keys(f, [[T.lightsOn - 1, 0], [T.lightsOn, 0.22], [T.lightsOn + 5, 0]]) + keys(f, [[T.lockout - 1, 0], [T.lockout, 0.14], [T.lockout + 8, 0]]),
        }}
      />
      <AbsoluteFill style={{background: RED, mixBlendMode: 'screen', opacity: keys(f, [[T.newYear - 1, 0], [T.newYear, 0.16], [T.newYear + 8, 0]])}} />
      <AbsoluteFill style={{background: '#000', opacity: Math.max(blackIn, fadeOut)}} />
    </AbsoluteFill>
  );
};
