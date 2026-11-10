// Writes audio/cues.json from the same cue definitions the picture uses.
import fs from 'node:fs';
import {soundEvents, CUE} from '../src/cues';
import {scenes, TOTAL_SEC, VOICE_END} from '../src/lib';
fs.writeFileSync(
  'audio/cues.json',
  JSON.stringify({total: TOTAL_SEC, voiceEnd: VOICE_END, scenes, climax: CUE.reveal.l4, events: soundEvents()}, null, 1),
);
console.log('events', soundEvents().length, 'total', TOTAL_SEC.toFixed(2));
