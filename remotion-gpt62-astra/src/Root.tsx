import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import T from './timeline.json';

export const Root: React.FC = () => (
  <Composition
    id="AstraTeaser"
    component={Film}
    durationInFrames={Math.round(T.duration * T.fps)}
    fps={T.fps}
    width={1080}
    height={1920}
  />
);
