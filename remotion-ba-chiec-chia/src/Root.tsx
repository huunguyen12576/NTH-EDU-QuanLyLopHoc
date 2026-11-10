import {Composition} from 'remotion';
import {Film} from './Film';
import {FPS, TOTAL_FRAMES} from './lib';

export const Root: React.FC = () => (
  <Composition id="BaChiecChia" component={Film} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />
);
