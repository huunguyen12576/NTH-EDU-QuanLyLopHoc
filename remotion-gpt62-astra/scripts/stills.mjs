import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
const frames=process.argv.slice(3).map(Number); const out=process.argv[2];
const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
const comp=await selectComposition({serveUrl,id:'AstraTeaser',chromiumOptions:{gl:'swangle'},browserExecutable:process.env.REMOTION_CHROME});
for(const f of frames){await renderStill({composition:comp,serveUrl,frame:f,output:`${out}/f${String(f).padStart(4,'0')}.jpg`,imageFormat:'jpeg',jpegQuality:85,scale:0.5,chromiumOptions:{gl:'swangle'},browserExecutable:process.env.REMOTION_CHROME});}
console.log('done');
