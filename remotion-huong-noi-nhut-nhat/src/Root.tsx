import React from 'react';
import {Composition} from 'remotion';
import './fonts';
import {DURATION, Main} from './Main';

export const RemotionRoot: React.FC = () => (
  <Composition id="HuongNoiNhutNhat" component={Main} durationInFrames={DURATION} fps={30} width={1080} height={1920} />
);
