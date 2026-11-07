import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import {loadFonts} from './fonts';
import {Overlay} from './scene/Overlay';
import {World} from './scene/World';

loadFonts();

export const Film: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <World />
    <Overlay />
    {withAudio ? <Audio src={staticFile('audio/soundtrack.wav')} /> : null}
  </AbsoluteFill>
);
