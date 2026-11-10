import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {loadFonts} from './fonts';
import {FPS, clamp, scene, SceneId} from './lib';
import {Finish, Ground, Subtitles} from './parts';
import {Caution, Chapter, Hook, Limit, Method, Mother, Payoff, Reveal, Three} from './scenes';
import {CUE} from './cues';

loadFonts();

const XF = 0.38; // crossfade (s)
const Layer: React.FC<{id: SceneId; t: number; children: (t: number) => React.ReactNode; fadeIn?: number}> = ({id, t, children, fadeIn = XF}) => {
  const sc = scene(id);
  if (t < sc.start - 0.01 || t > sc.end + XF) return null;
  const a = clamp(Math.min(fadeIn > 0 ? (t - sc.start) / fadeIn : 1, (sc.end + XF - t) / XF));
  return <AbsoluteFill style={{opacity: a}}>{children(t)}</AbsoluteFill>;
};

// subtitles stay off where the typography already *is* the line
const subHidden = (t: number) => {
  const inS = (id: SceneId, from?: number) => {
    const s = scene(id);
    return t >= (from ?? s.start) - 0.1 && t < s.end + 0.1;
  };
  if (inS('hook') || inS('reveal') || inS('caution') || inS('payoff')) return 1;
  if (inS('mother', CUE.mother.q1)) return 1;
  if (t >= CUE.limit.smooth && t < scene('limit').end + 0.1) return 1;
  if (t >= CUE.method.tries[0] && t < scene('method').end + 0.1) return 1;
  return 0;
};

// one motivated light per moment
const lightAt = (t: number) => {
  const m = scene('mother');
  if (t < m.start) return {x: 540, y: 960, r: 520, a: 0.35 * clamp((t - CUE.hook.keyhole) / 1.2)};
  if (t < scene('three').end) return {x: 540, y: 470, r: 820, a: 0.75};
  if (t < scene('limit').start) return {x: 540, y: 1010, r: 900, a: 0.45};
  if (t < scene('reveal').start) return {x: 540, y: 1000, r: 800, a: 0.35};
  if (t < scene('method').start) return {x: 540, y: 1180, r: 900, a: 0.25 + 0.6 * clamp((t - CUE.reveal.l4) / 1)};
  if (t < scene('payoff').start) return {x: 540, y: 900, r: 820, a: 0.4};
  return {x: 540, y: 600, r: 900, a: 0.6};
};

export const Film: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  return (
    <AbsoluteFill style={{backgroundColor: '#0A0908'}}>
      <Ground light={lightAt(t)} />
      <Layer id="hook" t={t} fadeIn={0}>{(tt) => <Hook t={tt} />}</Layer>
      <Layer id="mother" t={t}>{(tt) => <Mother t={tt} />}</Layer>
      <Layer id="three" t={t}>{(tt) => <Three t={tt} />}</Layer>
      <Layer id="chatgpt" t={t}>{(tt) => <Chapter t={tt} i={0} />}</Layer>
      <Layer id="claude" t={t}>{(tt) => <Chapter t={tt} i={1} />}</Layer>
      <Layer id="gemini" t={t}>{(tt) => <Chapter t={tt} i={2} />}</Layer>
      <Layer id="limit" t={t}>{(tt) => <Limit t={tt} />}</Layer>
      <Layer id="reveal" t={t}>{(tt) => <Reveal t={tt} />}</Layer>
      <Layer id="method" t={t}>{(tt) => <Method t={tt} />}</Layer>
      <Layer id="caution" t={t}>{(tt) => <Caution t={tt} />}</Layer>
      <Layer id="payoff" t={t}>{(tt) => <Payoff t={tt} />}</Layer>
      <Subtitles t={t} hidden={subHidden} />
      <Finish />
      <Audio src={staticFile('audio/mix.wav')} />
    </AbsoluteFill>
  );
};


