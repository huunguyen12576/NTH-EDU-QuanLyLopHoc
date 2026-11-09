// Exports every sound-relevant event straight from the scene logic, so audio is frame-accurate.
import {writeFileSync} from 'node:fs';
import {heatAt, SEAL_F, soundEvents, warmthAt} from '../src/engine/story';
import {DURATION, FPS, T} from '../src/timeline';

const heat: number[] = [];
const warmth: number[] = [];
for (let f = 0; f <= DURATION; f++) { heat.push(+heatAt(f).toFixed(4)); warmth.push(+warmthAt(f).toFixed(4)); }
const events = soundEvents().sort((a, b) => a.f - b.f);
writeFileSync('audio/events.json', JSON.stringify({FPS, DURATION, T: {...T, seal: SEAL_F}, heat, warmth, events}));
const count: Record<string, number> = {};
events.forEach((e) => (count[e.t] = (count[e.t] ?? 0) + 1));
console.log(count);
