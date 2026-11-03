import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {boxFaces} from '../engine/box';
import {makeCam, project} from '../engine/camera';
import {clamp, easeOut, easeOutBack, hash, invLerp, keys, smooth, spring01} from '../engine/math';
import {cameraAt} from '../engine/world';
import {T} from '../timeline';

const FONT = 'Montserrat, sans-serif';

/** Letter-by-letter reveal like a terminal caption — the DNA of the reference. */
const Typed: React.FC<{text: string; start: number; end: number; f: number; style?: React.CSSProperties}> = ({text, start, end, f, style}) => {
  const chars = Array.from(text);
  const n = Math.floor(clamp((f - start) / 1.1, 0, chars.length));
  const out = clamp(1 - (f - end) / 10);
  return (
    <div style={{opacity: out, filter: `blur(${(1 - out) * 6}px)`, ...style}}>
      {chars.map((ch, i) => (
        <span key={i} style={{opacity: i < n ? 1 : 0, display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${i < n ? 0 : 6}px)`}}>
          {ch}
        </span>
      ))}
      <span style={{opacity: n < chars.length && Math.floor(f / 4) % 2 === 0 && f >= start ? 0.8 : 0, display: 'inline-block', width: 0}}>▍</span>
    </div>
  );
};

const caption: React.CSSProperties = {
  fontFamily: FONT,
  fontWeight: 600,
  fontSize: 33,
  letterSpacing: '0.2em',
  color: '#f2f2f2',
  textAlign: 'center',
  textTransform: 'uppercase',
  lineHeight: 1.7,
  textShadow: '0 0 18px rgba(0,0,0,0.9)',
};

/** "CẦU TOÀN" — letters crumble and fall like the bricks. */
const Crumbling: React.FC<{text: string; f: number; start: number; fall: number}> = ({text, f, start, fall}) => {
  const chars = Array.from(text);
  return (
    <div style={{display: 'flex', justifyContent: 'center'}}>
      {chars.map((ch, i) => {
        const appear = easeOut(invLerp(start + i * 1.5, start + 12 + i * 1.5, f));
        const tf = Math.max(0, (f - (fall + hash(i * 3.7) * 18)) / 30);
        const dy = 0.5 * 2600 * tf * tf;
        const rot = tf * (hash(i * 1.3) - 0.5) * 220;
        return (
          <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: appear * clamp(1 - tf * 1.6), transform: `translateY(${(1 - appear) * 18 + dy}px) rotate(${rot}deg)`}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** "HÀNH ĐỘNG" — letters rise and lock into place like the bricks. */
const Rising: React.FC<{text: string; f: number; start: number}> = ({text, f, start}) => {
  const chars = Array.from(text);
  return (
    <div style={{display: 'flex', justifyContent: 'center'}}>
      {chars.map((ch, i) => {
        const t = (f - (start + 8 + i * 2.2)) / 30;
        const s = spring01(t, 2.4, 0.45);
        return (
          <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: clamp(t * 6), transform: `translateY(${(1 - s) * 80}px)`}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

const RedBrick: React.FC<{f: number}> = ({f}) => {
  const t = (f - T.endBrick) / 30;
  if (t < -0.5) return null;
  const s = spring01(t, 2.0, 0.38);
  const c = makeCam([1.2, 1.6, -3.2], [0, 0, 0], 900);
  c.cx = 300;
  c.cy = 160;
  const y = (1 - s) * 2.2;
  const faces = boxFaces(c, [0, y, 0], [1.1, 0.48, 0.62], [0, 0.18 * (1 - s) - 0.05, 0.04], [226, 40, 48], {amb: 0.35, topBoost: 1.15});
  const glow = Math.exp(-Math.max(0, t) * 2.2);
  const p = project(c, [0, -0.3, 0]);
  return (
    <svg width={600} height={320} viewBox="0 0 600 320" style={{opacity: clamp((t + 0.5) * 4)}}>
      <defs>
        <filter id="eb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={14} /></filter>
        <radialGradient id="ebp"><stop offset="0" stopColor="rgb(226,34,44)" stopOpacity={0.55} /><stop offset="1" stopColor="rgb(226,34,44)" stopOpacity={0} /></radialGradient>
      </defs>
      <ellipse cx={p.x} cy={p.y + 6} rx={150} ry={22} fill="url(#ebp)" opacity={clamp(s)} />
      <g filter="url(#eb)" opacity={0.5 + glow * 0.5}>{faces.map((fc, i) => <polygon key={i} points={fc.pts} fill="rgb(255,40,50)" />)}</g>
      {faces.map((fc, i) => <polygon key={i} points={fc.pts} fill={fc.fill} stroke="rgba(255,140,140,0.6)" strokeWidth={1.2} strokeLinejoin="round" />)}
    </svg>
  );
};

export const Overlay: React.FC = () => {
  const f = useCurrentFrame();

  // world-anchored labels
  const cs = cameraAt(f);
  const cam = makeCam(cs.pos, cs.tgt, cs.F, cs.roll);
  const crowdP0 = project(cam, [-2.6, 2.6, 3.0]);
  const crowdP = {x: 330 + 0 * crowdP0.x, y: 1330};
  const actP0 = project(cam, [6.0, 3.2, 0.4]);
  const actP = {x: 740 + 0 * actP0.x, y: 600};
  const labelsOn = f >= T.labels && f < T.labelsOut + 30;
  const labelsFade = clamp(1 - (f - T.labelsOut) / 14);

  const endDim = smooth(invLerp(T.endFade, T.endFade + 26, f));
  const fadeOut = smooth(invLerp(865, 870, f));
  const fadeIn = 0;

  return (
    <AbsoluteFill>
      {/* captions — the reference's top-centre typed line, in Vietnamese */}
      <AbsoluteFill style={{top: 330, height: 'auto'}}>
        {f >= T.text1 && f < T.textOut + 12 ? (
          <div>
            <Typed text="Họ chờ mọi thứ thật hoàn hảo." start={T.text1} end={T.textOut} f={f} style={caption} />
            <Typed text="Nhưng mặt đất không chờ ai." start={T.text2} end={T.textOut} f={f} style={{...caption, color: '#ff4d55'}} />
          </div>
        ) : null}
      </AbsoluteFill>

      {labelsOn ? (
        <AbsoluteFill style={{opacity: labelsFade}}>
          <div style={{position: 'absolute', left: crowdP.x - 300, top: crowdP.y - 120, width: 600, textAlign: 'center', fontFamily: FONT}}>
            <div style={{fontWeight: 800, fontSize: 66, letterSpacing: '0.08em', color: '#8d8d8d'}}>
              <Crumbling text="CẦU TOÀN" f={f} start={T.labels} fall={T.labels + 52} />
            </div>
            <div style={{fontWeight: 400, fontSize: 25, letterSpacing: '0.16em', color: '#6c6c6c', marginTop: 4, opacity: clamp((f - T.labels - 12) / 10) * clamp(1 - (f - T.labels - 52) / 12)}}>
              ĐỨNG YÊN CHỜ HOÀN HẢO
            </div>
          </div>
          <div style={{position: 'absolute', left: actP.x - 300, top: actP.y - 120, width: 600, textAlign: 'center', fontFamily: FONT}}>
            <div style={{fontWeight: 800, fontSize: 66, letterSpacing: '0.08em', color: '#fff', textShadow: '0 0 30px rgba(255,255,255,0.35)'}}>
              <Rising text="HÀNH ĐỘNG" f={f} start={T.labels + 22} />
            </div>
            <div style={{margin: '10px auto 0', height: 5, width: 300 * easeOut(invLerp(T.labels + 40, T.labels + 58, f)), background: 'rgb(226,34,44)', boxShadow: '0 0 18px rgba(226,34,44,0.9)'}} />
            <div style={{fontWeight: 400, fontSize: 25, letterSpacing: '0.16em', color: '#d8d8d8', marginTop: 12, opacity: clamp((f - T.labels - 46) / 10)}}>
              BƯỚC ĐI, ĐƯỜNG SẼ HIỆN
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* end card */}
      <AbsoluteFill style={{background: `rgba(0,0,0,${0.86 * endDim})`}} />
      {f >= T.end1 ? (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT, textAlign: 'center'}}>
          <div style={{transform: 'translateY(-90px)'}}>
            <div
              style={{
                fontWeight: 300,
                fontSize: 58,
                letterSpacing: '0.04em',
                color: '#bdbdbd',
                opacity: easeOut(invLerp(T.end1, T.end1 + 18, f)),
                filter: `blur(${(1 - easeOut(invLerp(T.end1, T.end1 + 18, f))) * 10}px)`,
                transform: `translateY(${(1 - easeOut(invLerp(T.end1, T.end1 + 24, f))) * 20}px)`,
              }}
            >
              Đừng chờ hoàn hảo.
            </div>
            <div style={{height: 40}} />
            {['Hãy đặt', 'viên gạch đầu tiên.'].map((line, i) => {
              const s = T.end2 + i * 10;
              const a = easeOutBack(invLerp(s, s + 16, f), 1.2);
              return (
                <div
                  key={i}
                  style={{
                    fontWeight: 800,
                    fontSize: i ? 80 : 80,
                    lineHeight: 1.12,
                    letterSpacing: '-0.01em',
                    color: '#fff',
                    opacity: clamp(invLerp(s, s + 8, f)),
                    transform: `translateY(${(1 - a) * 40}px)`,
                  }}
                >
                  {line}
                </div>
              );
            })}
            <div style={{display: 'flex', justifyContent: 'center', marginTop: 30}}>
              <RedBrick f={f} />
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {/* lens: vignette + grain */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)'}} />
      <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'screen'}}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 24} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
      {/* impact flashes */}
      <AbsoluteFill style={{background: '#fff', opacity: keys(f, [[T.firstBrick - 1, 0], [T.firstBrick, 0.16], [T.firstBrick + 6, 0]]) + keys(f, [[T.hookDrop + 1, 0], [T.hookDrop + 2, 0.08], [T.hookDrop + 7, 0]])}} />
      <AbsoluteFill style={{background: '#000', opacity: Math.max(fadeOut, fadeIn)}} />
    </AbsoluteFill>
  );
};
