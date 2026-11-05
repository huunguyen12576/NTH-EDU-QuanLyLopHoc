import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {DURATION, FPS} from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition id="BanThatBanGia" component={Film} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{audio: true}} />
);
