// Exports every sound-relevant event straight from the story logic, so audio is frame-accurate.
import {writeFileSync} from 'node:fs';
import {BOXES, calDoy, D_REPS, EPISODES, M_REPS, mState, PLATE_FRAMES, RESETS, repBottom, repTop} from '../src/engine/story';
import {DURATION, FPS, T} from '../src/timeline';

const flips: number[] = [];
for (let f = 1; f < DURATION; f++) if (calDoy(f) !== calDoy(f - 1)) flips.push(f);
const glow = Array.from({length: DURATION}, (_, f) => +mState(f).glow.toFixed(3));

writeFileSync(
  'audio/events.json',
  JSON.stringify(
    {
      FPS,
      DURATION,
      T,
      dReps: D_REPS.map((r) => ({s: r.s, P: r.P, top: repTop(r), bottom: repBottom(r)})),
      mReps: M_REPS.map((r) => ({s: r.s, P: r.P, fail: !!r.fail, top: repTop(r), bottom: repBottom(r)})),
      episodes: EPISODES,
      resets: RESETS,
      flips,
      plates: PLATE_FRAMES,
      boxes: BOXES.map((b) => ({f: b.f, x: b.x})),
      glow,
    },
    null,
    1,
  ),
);
console.log(`dReps ${D_REPS.length}, mReps ${M_REPS.length}, flips ${flips.length}`);
