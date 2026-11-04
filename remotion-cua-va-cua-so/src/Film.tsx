import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {clamp, hash, kf} from './anim';
import {loadFonts} from './fonts';
import {Bubbles, Clock, EndCard, Header, Label} from './scene/Overlay';
import {PH, Room} from './scene/Room';
import {F, storyAt} from './timeline';

loadFonts();

const TOP = 150; // panel 1
const MID = 850; // clock band
const BOT = 950; // panel 2

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const rewinding = f > F.rewindStart && f < F.rewindEnd ? Math.sin(((f - F.rewindStart) / (F.rewindEnd - F.rewindStart)) * Math.PI) : 0;
  // hook: the chill room is hidden in the cold open, then revealed by the rewind
  const chillVis = kf(f, [[0, 0], [F.rewindStart, 0], [F.rewindStart + 8, 1]]);
  const out = 1 - clamp((f - F.fadeOut) / (F.storyEnd - F.fadeOut));
  const intro = clamp(f / 5);
  const jitter = rewinding ? (hash(f) - 0.5) * 14 * rewinding : 0;
  const slide = kf(f, [[0, 0], [F.rewindStart - 2, 0], [F.rewindEnd - 2, 1]]);
  const top1 = 590 + (TOP - 590) * slide;
  const panelStyle = (top: number, o: number): React.CSSProperties => ({position: 'absolute', left: jitter, top, width: 1080, height: PH, overflow: 'hidden', opacity: o, filter: rewinding ? `saturate(${1 - 0.7 * rewinding}) contrast(${1 + 0.25 * rewinding}) brightness(${1 + 0.25 * rewinding})` : undefined});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Audio src={staticFile('audio/soundtrack.wav')} />
      {f < F.storyEnd + 2 && (
        <>
          <Header frame={f} top={top1 - 92} />
          <div style={panelStyle(top1, out * intro)}>
            <Room side="strict" s={s} />
            <Label text="BỐ MẸ NGHIÊM KHẮC" accent="#ff3b2f" s={s} />
            <Bubbles side="strict" s={s} />
          </div>
          <div style={{position: 'absolute', top: top1 + MID - TOP, left: 0, width: 1080, height: 100, opacity: out * intro}}>
            <Clock s={s} frame={f} rewinding={rewinding} />
          </div>
          <div style={panelStyle(BOT, out * Math.max(chillVis, 0) * intro)}>
            <Room side="chill" s={s} />
            <Label text="BỐ MẸ DỄ TÍNH" accent="#ffc46b" s={s} />
            <Bubbles side="chill" s={s} />
          </div>
          {/* rewind: tape scan lines */}
          {rewinding > 0 && (
            <AbsoluteFill style={{opacity: rewinding}}>
              {Array.from({length: 7}, (_, i) => {
                const y = (hash(i * 13 + f * 0.37) * 1920) | 0;
                return <div key={i} style={{position: 'absolute', left: 0, right: 0, top: y, height: 2 + hash(i + f) * 10, background: 'rgba(255,255,255,0.22)', mixBlendMode: 'screen'}} />;
              })}
              <div style={{position: 'absolute', left: 44, top: 60, fontFamily: 'Montserrat', fontWeight: 800, fontSize: 40, color: '#fff', letterSpacing: '-0.1em'}}>◀◀</div>
            </AbsoluteFill>
          )}
        </>
      )}
      {f >= F.storyEnd - 2 && <EndCard frame={f} />}
      {/* film grain */}
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('tex/grain.png')})`, backgroundPosition: `${(hash(f) * 256) | 0}px ${(hash(f + 0.5) * 256) | 0}px`, opacity: 0.07, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};
