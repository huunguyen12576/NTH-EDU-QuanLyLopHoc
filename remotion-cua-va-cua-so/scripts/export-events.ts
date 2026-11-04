// Exports sound-relevant events straight from the animation data -> audio/events.json
import {writeFileSync} from 'node:fs';
import {evalChar} from '../src/anim';
import {CHARS, Side} from '../src/story';
import {DURATION, F, FPS, HOOK_S0, HOOK_S1, S} from '../src/timeline';

// Footsteps: a step lands every half walk-cycle (phase locked to distance travelled, like the visuals).
const steps: {s: number; side: Side; who: string; heavy: boolean; layer: string; x: number}[] = [];
(['strict', 'chill'] as Side[]).forEach((side) => {
  CHARS[side].forEach((c) => {
    c.keys.forEach((a, i) => {
      const b = c.keys[i + 1];
      if (!a.walk || !b) return;
      let last = 0;
      for (let s = a.t; s <= b.t; s += 1 / 240) {
        const st = evalChar(c, s);
        const ph = Math.abs(st.x - a.x) / (1.7 * st.px);
        const n = Math.floor(ph * 2 + 0.25);
        if (n > last) {
          last = n;
          steps.push({s, side, who: c.name, heavy: c.name.includes('Parent'), layer: st.layer, x: st.x});
        }
      }
    });
  });
});
writeFileSync('audio/events.json', JSON.stringify({FPS, DURATION, F, S, HOOK_S0, HOOK_S1, steps}, null, 1));
console.log(`steps ${steps.length}`);
