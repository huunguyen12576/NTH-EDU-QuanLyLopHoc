import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {loadFonts} from './fonts';
import {Overlay} from './scene/Overlay';
import {Stage} from './scene/Stage';

loadFonts();

export const Film: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <Stage />
    <Overlay />
    {audio && <Audio src={staticFile('audio/soundtrack.wav')} />}
  </AbsoluteFill>
);
