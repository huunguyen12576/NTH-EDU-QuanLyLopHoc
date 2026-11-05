// Render a contact sheet of key frames for visual QA: node scripts/stills.mjs out_dir f1 f2 ...
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_CHROME ?? null;
const composition = await selectComposition({serveUrl, id: 'HuongNoiNhutNhat', browserExecutable});
for (const f of frames) {
  await renderStill({composition, serveUrl, frame: Number(f), output: path.join(outDir, `s${String(f).padStart(3, '0')}.png`), scale: 0.5, browserExecutable, chromiumOptions: {gl: 'swangle'}});
  console.log('frame', f);
}
