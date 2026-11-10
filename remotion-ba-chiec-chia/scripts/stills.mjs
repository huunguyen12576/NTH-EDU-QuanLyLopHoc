// Usage: node scripts/stills.mjs <outDir> <scale> <seconds...>
// Bundles once and renders QA stills at the given times (seconds).
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir, scale, ...secs] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_CHROME ?? null;
const composition = await selectComposition({serveUrl, id: 'BaChiecChia', browserExecutable});
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * composition.fps));
  await renderStill({composition, serveUrl, frame, output: path.join(outDir, `t${String(s).padStart(5, '0')}.png`), scale: Number(scale), browserExecutable});
  process.stdout.write(s + ' ');
}
