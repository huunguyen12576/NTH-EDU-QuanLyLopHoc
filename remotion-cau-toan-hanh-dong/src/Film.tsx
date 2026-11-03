import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {loadFonts} from './fonts';
import {Overlay} from './scene/Overlay';
import {World3D} from './scene/World3D';

loadFonts();

export const Film: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    <World3D />
    <Overlay />
    <Audio src={staticFile('audio/soundtrack.wav')} />
  </AbsoluteFill>
);
