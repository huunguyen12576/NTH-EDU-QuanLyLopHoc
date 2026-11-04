import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {DURATION, FPS, H, W} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition id="CuaVaCuaSo" component={Film} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
