import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Captions} from './Captions';
import {loadFonts} from './fonts';
import {Abs, C, FPS, Grain, T, Vignette, win} from './lib';
import {BepGa, Hook, OldWay, SP, Waiting} from './scenes1';
import {Kitchen, Reveal, Taste} from './scenes2';
import {Ending, Question, Race} from './scenes3';

loadFonts();

// Scene windows come straight from the voice timestamps: picture follows voice.
const SCENES: {C: React.FC<SP>; a: number; b: number; fi: number; fo: number}[] = [
  {C: Hook, a: 0, b: T('voly') + 0.45, fi: 0, fo: 0.4},
  {C: BepGa, a: T('voly') - 0.1, b: T('truoc') + 0.2, fi: 0.05, fo: 0.05},
  {C: OldWay, a: T('truoc') - 0.3, b: T('ngoi') - 0.05, fi: 0.3, fo: 0.55},
  {C: Waiting, a: T('ngoi') - 0.6, b: T('vagio'), fi: 0.01, fo: 0.01},
  {C: Reveal, a: T('vagio') - 0.2, b: T('noicom') + 0.35, fi: 0.2, fo: 0.3},
  {C: Kitchen, a: T('noicom') - 0.5, b: T('nhungnho'), fi: 0.4, fo: 0.01},
  {C: Taste, a: T('nhungnho') - 0.15, b: T('claude'), fi: 0.01, fo: 0.01},
  {C: Race, a: T('claude') - 0.4, b: T('cauhoi'), fi: 0.01, fo: 0.01},
  {C: Question, a: T('cauhoi') - 0.2, b: T('dadi') + 0.05, fi: 0.3, fo: 0.05},
  {C: Ending, a: T('dadi') - 0.1, b: 1e9, fi: 0.05, fo: 0.01},
];

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{background: C.ink, overflow: 'hidden'}}>
      {SCENES.filter((s) => t >= s.a && t < s.b).map((s, i) => (
        <Abs key={i} style={{opacity: win(t, s.a, s.b, s.fi, s.fo)}}>
          <s.C t={t} />
        </Abs>
      ))}
      <Captions t={t} />
      <Vignette />
      <Grain frame={frame} />
      <Audio src={staticFile('audio/mix.wav')} />
    </AbsoluteFill>
  );
};
