// Exports every sound-relevant event straight from the scene logic, so audio is frame-accurate.
import {writeFileSync} from 'node:fs';
import {makeCam, project} from '../src/engine/camera';
import {cameraAt, cellIx, cellIz, crowd, crumbleEvents, crumbleTime, CELL, bridge} from '../src/engine/world';
import {BEAT, DURATION, FPS, T} from '../src/timeline';

const onScreen = (f: number, p: [number, number, number]) => {
  const cs = cameraAt(f);
  const c = makeCam(cs.pos, cs.tgt, cs.F, cs.roll);
  const q = project(c, p);
  const vis = q.z > 0.3 && q.x > -150 && q.x < 1230 && q.y > -200 && q.y < 2100;
  return {vis, dist: q.z};
};

const crumbles = crumbleEvents()
  .filter((e) => e.f >= 0)
  .map((e) => ({...e, ...onScreen(e.f, [(e.ix + 0.5) * CELL, 0, (e.iz + 0.5) * CELL])}))
  .filter((e) => e.vis);

const falls = crowd
  .map((c) => ({f: crumbleTime(cellIx(c.x), cellIz(c.z)) + 2, x: c.x, z: c.z, n1: c.id === 1000}))
  .filter((e) => Number.isFinite(e.f) && e.f >= 0 && e.f < DURATION)
  .map((e) => ({...e, ...onScreen(e.f, [e.x, 1, e.z])}))
  .filter((e) => e.vis);

writeFileSync('audio/events.json', JSON.stringify({FPS, BEAT, DURATION, T, crumbles, falls, bricks: bridge.map((b) => b.lockF)}, null, 1));
console.log(`crumbles ${crumbles.length}, falls ${falls.length}`);
