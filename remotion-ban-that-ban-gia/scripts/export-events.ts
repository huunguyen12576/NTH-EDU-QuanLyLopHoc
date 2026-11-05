// Exports every sound-relevant event from the scene logic itself, in OUTPUT frames, so audio is frame-accurate
// (handles slow-motion, the hook's time-ramp and skips rewinds, which get their own tape FX).
import {writeFileSync} from 'node:fs';
import {camAt} from '../src/world/direction';
import {actorsAt, laughBeat} from '../src/world/story';
import {DURATION, FPS, OUT, S, segAt, Variant} from '../src/timeline';

type Ev = {name: string; f: number; rate: number; pan: number; who?: string; muddy?: boolean; gain?: number};
const out: Ev[] = [];

// laugh syllables land on peaks of |sin(s*0.55)|
const peaks = (a: number, b: number, w = 0.55, ph = 0) => {
  const r: number[] = [];
  for (let n = 0; n < 200; n++) {
    const s = (Math.PI / 2 + n * Math.PI - ph) / w;
    if (s >= a && s <= b) r.push(s);
  }
  return r;
};
const named: Record<Variant, [string, number, string?][]> = {
  fake: [
    ['car', 40], ['flinch', 71], ['splash', S.splash], ['hit', S.hit], ['shock', 92],
    ...peaks(S.laugh + 2, 148).map((s) => ['laughA', s, 'A'] as [string, number, string]),
    ['step', 150], ['poke', S.poke + 5], ['look', S.look + 3],
    ...peaks(S.wipe + 4, S.smirk - 2, 1.25).map((s) => ['rub', s] as [string, number]),
    ['smirk', S.smirk + 8], ['leave', S.leave], ['alone', 262],
  ],
  real: [
    ['car', 40], ['flinch', 71], ['splash', S.splash], ['hit', S.hit], ['shock', 92],
    ...peaks(S.laugh + 2, S.stop - 2).map((s) => ['laughA', s, 'A'] as [string, number, string]),
    ['stop', S.stop], ['decide', S.decide], ['nod', S.windup - 4], ['breath', S.takeoff - 12], ['takeoff', S.takeoff], ['land', S.land],
    ...peaks(S.land + 4, S.reach + 4, 0.5).map((s) => ['flap', s] as [string, number]),
    ...peaks(S.giggle + 3, S.reach - 2, 0.55, 0.55 * 3).map((s) => ['laughB', s, 'B'] as [string, number, string]),
    ['grab', S.reach + 14], ['pull', S.up - 8], ['cheek', S.cheek + 6],
    ...peaks(S.cheek + 4, S.together, 0.55).map((s) => ['laughBoth', s] as [string, number]),
    ...peaks(362, 420, 0.44).map((s) => ['laughBoth', s] as [string, number]),
  ],
};

const prevFoot: Record<string, number> = {};
for (let f = 0; f < DURATION; f++) {
  const a = segAt(f), b = segAt(f + 1);
  if (a.rewind > 0 || b.rewind > 0 || a.variant !== b.variant) continue;
  const s0 = a.s, s1 = b.s, rate = s1 - s0;
  if (rate <= 0) continue;
  const cam = camAt(f);
  for (const [name, se, who] of named[a.variant]) {
    if (se >= s0 && se < s1) out.push({name, f: f + (se - s0) / rate, rate, pan: 0, who});
  }
  // footsteps from the skeletons
  const actors = actorsAt(a.variant, s0);
  for (const ac of actors) {
    for (const side of ['L', 'R'] as const) {
      const ft = side === 'L' ? ac.skel.ftL : ac.skel.ftR;
      const key = ac.id + side + a.variant;
      const h = ft[1] - ac.skel.ground;
      const was = prevFoot[key] ?? 1;
      if (was > 0.08 && h <= 0.08 && ac.walking > 0.3) {
        const muddy = ac.id === 'B' ? s0 > S.hit : a.variant === 'real' && s0 > S.land;
        out.push({name: 'step', f, rate, pan: Math.max(-1, Math.min(1, (ft[0] - cam.x) / 2.5)), who: ac.id, muddy, gain: Math.min(1, 4 / (ft[2] - cam.z))});
      }
      prevFoot[key] = h;
    }
  }
}
out.sort((p, q) => p.f - q.f);
writeFileSync('audio/events.json', JSON.stringify({FPS, DURATION, OUT, events: out, laughBeat: laughBeat(0)}, null, 1));
console.log(`${out.length} events`, Object.entries(out.reduce((m, e) => ((m[e.name] = (m[e.name] ?? 0) + 1), m), {} as Record<string, number>)));
