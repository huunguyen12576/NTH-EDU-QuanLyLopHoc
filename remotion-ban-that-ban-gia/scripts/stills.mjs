// Usage: node scripts/stills.mjs <outDir> <scale> <frame...>  — preview stills for frame-by-frame QA.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const [outDir, scale, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_CHROME ?? null;
const inputProps = {audio: false};
const composition = await selectComposition({serveUrl, id: 'BanThatBanGia', browserExecutable, inputProps});
for (const fr of frames) {
  await renderStill({composition, serveUrl, frame: Number(fr), output: path.join(outDir, `f${String(fr).padStart(4, '0')}.png`), scale: Number(scale), browserExecutable, inputProps});
  process.stdout.write(fr + ' ');
}
