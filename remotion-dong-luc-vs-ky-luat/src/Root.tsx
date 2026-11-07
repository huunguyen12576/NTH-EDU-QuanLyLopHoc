import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {DURATION, FPS} from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="DongLucVsKyLuat" component={Film} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{withAudio: true}} />
    <Composition id="Preview" component={Film} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{withAudio: false}} />
  </>
);
