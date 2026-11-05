import React from 'react';
import {Audio, Sequence, interpolate, staticFile} from 'remotion';
import {B} from './beats';

type Cue = [frame: number, file: string, volume: number];

// Master gain keeps the summed mix below 0 dBFS (true-peak headroom for social platforms).
const MASTER = 0.68;

const steps = (from: number, to: number, every: number, vol = 0.35): Cue[] => {
  const out: Cue[] = [];
  for (let f = from; f < to; f += every) out.push([Math.round(f), 'step', vol]);
  return out;
};

// Every visual beat has a sonic counterpart.
const CUES: Cue[] = [
  [B.lampOn, 'click', 0.7],
  [B.lampOn + 1, 'buzz', 0.35],
  [B.hook1 - 2, 'whoosh', 0.18],
  [B.hook2, 'tick', 0.25],
  [B.labelI, 'tick', 0.2],
  [B.labelS, 'tick', 0.2],
  [B.page, 'page', 0.55],
  [30, 'laugh', 0.22],
  [132, 'laugh', 0.18],
  [240, 'laugh', 0.16],
  [B.t1, 'bloop', 0.45],
  [B.t2, 'bloop', 0.45],
  [B.t3, 'bloop', 0.5],
  [B.t1 - 4, 'heart', 0.5],
  [B.t2 - 4, 'heart', 0.55],
  [B.t3 - 4, 'heart', 0.6],
  [B.aStand - 2, 'chair', 0.4],
  ...steps(B.aStand + 14, B.aArrive1, 9),
  [B.aAsk1, 'pop', 0.45],
  [B.iReply, 'pop', 0.4],
  [B.iReply + 30, 'page', 0.25],
  [B.aOk, 'pop', 0.4],
  ...steps(B.aGo2 + 2, B.aArrive2, 9),
  [B.aAsk2, 'pop', 0.45],
  [B.startle - 30, 'swell', 0.35],
  [B.startle, 'startle', 0.5],
  [B.startle + 2, 'chair', 0.3],
  [B.flip, 'impact', 0.6],
  [B.flip, 'flip', 0.55],
  [B.flip, 'pop', 0.35],
  [B.flip + 5, 'pop', 0.35],
  [B.flip + 10, 'pop', 0.35],
  [B.aYes, 'pop', 0.4],
  [B.aCome, 'pop', 0.45],
  ...steps(B.walkBack + 2, B.sitBack - 6, 9, 0.3),
  ...steps(B.walkBack + 6, B.sitBack - 2, 10, 0.25),
  [B.sitBack + 4, 'thud', 0.35],
  [B.sitBack - 6, 'chair', 0.25],
  [B.laugh, 'laugh', 0.4],
  [B.laugh + 26, 'laugh', 0.32],
  [B.laugh + 54, 'laugh', 0.26],
  [B.msg1 - 30, 'swell', 0.25],
  [B.msg1, 'whoosh', 0.18],
  [B.msg2, 'whoosh', 0.18],
  [B.cta - 34, 'swell', 0.4],
  [B.cta, 'impact', 0.55],
  [B.cta, 'flip', 0.3],
];

export const Soundtrack: React.FC = () => (
  <>
    <Audio src={staticFile('audio/score.wav')} volume={0.85 * MASTER} />
    <Audio
      src={staticFile('audio/ambience.wav')}
      volume={(f) => interpolate(f, [0, 20, B.flip - 6, B.flip, B.flip + 30, B.msg1, B.msg1 + 40], [0, 0.32, 0.32, 0.08, 0.3, 0.3, 0.12], {extrapolateRight: 'clamp'}) * MASTER}
    />
    {CUES.map(([f, file, v], i) => (
      <Sequence key={i} from={f} durationInFrames={90} layout="none">
        <Audio src={staticFile(`audio/${file}.wav`)} volume={v * MASTER} />
      </Sequence>
    ))}
  </>
);
