import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer('swangle');

// Use a locally installed headless Chrome if provided (offline / CI environments).
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME);
