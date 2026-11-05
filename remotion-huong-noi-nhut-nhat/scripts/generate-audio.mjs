// Procedurally synthesised score + sound design.
// Every sound in this project is generated from math in this file, so it is 100% original
// and free for commercial use (no third-party samples, no licences needed).
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
const OUT = path.resolve('public/audio');
fs.mkdirSync(OUT, {recursive: true});

// deterministic PRNG
let seed = 1337;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;

const buf = (sec) => [new Float32Array(Math.ceil(sec * SR)), new Float32Array(Math.ceil(sec * SR))];

const writeWav = (name, [L, R], gain = 1) => {
  const n = L.length;
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = peak > 0 ? Math.min(1, 0.95 / peak) * gain : 1;
  const data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 4, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const l = Math.tanh(L[i] * norm * 1.05);
    const r = Math.tanh(R[i] * norm * 1.05);
    data.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(OUT, `${name}.wav`), data);
  console.log('wrote', name, (n / SR).toFixed(2) + 's');
};

// biquad filter (RBJ cookbook)
const biquad = (type, freq, q = 0.707) => {
  const w = (2 * Math.PI * freq) / SR;
  const cs = Math.cos(w);
  const a = Math.sin(w) / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
  if (type === 'hp') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
  if (type === 'bp') [b0, b1, b2] = [a, 0, -a];
  [a0, a1, a2] = [1 + a, -2 * cs, 1 - a];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
};

const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));

// simple stereo reverb (feedback comb + allpass network)
const reverb = ([L, R], mix = 0.25, size = 1) => {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round(d * size * (SR / 44100)));
  const out = [new Float32Array(L.length), new Float32Array(L.length)];
  [L, R].forEach((ch, c) => {
    const lines = combs.map((d) => ({b: new Float32Array(d + c * 23), i: 0}));
    const lp = biquad('lp', 5200);
    for (let n = 0; n < ch.length; n++) {
      let acc = 0;
      for (const ln of lines) {
        const v = ln.b[ln.i];
        acc += v;
        ln.b[ln.i] = ch[n] + v * 0.83;
        ln.i = (ln.i + 1) % ln.b.length;
      }
      out[c][n] = ch[n] * (1 - mix) + lp(acc / lines.length) * mix * 1.6;
    }
  });
  return out;
};

const add = (dst, src, at, g = 1, pan = 0) => {
  const off = Math.round(at * SR);
  const gl = g * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = g * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < src[0].length && off + i < dst[0].length; i++) {
    if (off + i < 0) continue;
    dst[0][off + i] += src[0][i] * gl;
    dst[1][off + i] += src[1][i] * gr;
  }
};

const mono = (sec, fn) => {
  const b = buf(sec);
  for (let i = 0; i < b[0].length; i++) {
    const v = fn(i / SR, i);
    b[0][i] = v;
    b[1][i] = v;
  }
  return b;
};

// ----------------------------------------------------------------- instruments
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** soft felt piano: inharmonic partials with fast hammer + long decay */
const piano = (m, dur = 3, vel = 0.6) => {
  const f0 = midi(m);
  const lp = biquad('lp', 2400 + vel * 2000);
  return mono(dur, (t) => {
    let v = 0;
    for (let h = 1; h <= 7; h++) {
      const fh = f0 * h * Math.sqrt(1 + 0.0004 * h * h);
      v += (Math.sin(2 * Math.PI * fh * t) / (h * h * 0.7 + 0.3)) * Math.exp(-t * (0.7 + h * 0.55));
    }
    const hammer = noise() * Math.exp(-t * 90) * 0.15;
    return lp((v + hammer) * vel * Math.min(1, t * 400) * (t > dur - 0.3 ? (dur - t) / 0.3 : 1));
  });
};

/** warm pad: detuned triangles, slow attack */
const pad = (notes, dur, att = 1.2, rel = 1.5, g = 0.12) => {
  const b = buf(dur);
  const lpL = biquad('lp', 1300);
  const lpR = biquad('lp', 1200);
  for (let i = 0; i < b[0].length; i++) {
    const t = i / SR;
    const e = Math.min(1, t / att) * Math.min(1, Math.max(0, (dur - t) / rel));
    let l = 0, r = 0;
    for (const m of notes) {
      const f = midi(m);
      const tri = (ph) => 2 * Math.abs(2 * (ph - Math.floor(ph + 0.5))) - 1;
      l += tri(f * 0.998 * t) + 0.5 * Math.sin(2 * Math.PI * f * 2.003 * t);
      r += tri(f * 1.002 * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.997 * t);
    }
    b[0][i] = lpL(l) * e * g;
    b[1][i] = lpR(r) * e * g;
  }
  return b;
};

// ----------------------------------------------------------------- SFX
const sfx = {};

sfx.click = mono(0.5, (t) => {
  const hp = 0;
  return (noise() * Math.exp(-t * 260) * 0.9 + Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 40) * 0.6) + hp;
});

{
  // filament buzz while flickering
  const bp = biquad('bp', 240, 4);
  sfx.buzz = mono(0.75, (t) => {
    const gate = [0, 0.08, 0.15, 0.23, 0.31, 0.39, 0.47].some((s) => t > s && t < s + 0.045) ? 1 : 0.15;
    const v = Math.sign(Math.sin(2 * Math.PI * 100 * t)) * 0.3 + noise() * 0.2;
    return bp(v) * gate * Math.exp(-t * 2.5) * 1.6;
  });
}

{
  const bp = biquad('bp', 3200, 0.8);
  const bp2 = biquad('bp', 1500, 0.6);
  sfx.page = mono(0.55, (t) => {
    const e = Math.sin(Math.min(1, t / 0.4) * Math.PI) ** 2 * (t < 0.4 ? 1 : 0);
    const flutter = 0.6 + 0.4 * Math.sin(t * 90);
    return (bp(noise()) * 0.8 + bp2(noise()) * 0.4) * e * flutter;
  });
}

sfx.pop = mono(0.25, (t) => {
  const f = 520 + 900 * (1 - Math.exp(-t * 60));
  return Math.sin(2 * Math.PI * f * t) * env(t, 0.003, 0.05) * 0.8 + noise() * Math.exp(-t * 400) * 0.15;
});

sfx.bloop = mono(0.45, (t) => {
  const f = 330 + 160 * (1 - Math.exp(-t * 18)) + Math.sin(t * 40) * 6;
  return (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * env(t, 0.02, 0.12) * 0.7;
});

sfx.tick = mono(0.2, (t) => Math.sin(2 * Math.PI * 2100 * t) * env(t, 0.001, 0.02) * 0.4 + Math.sin(2 * Math.PI * 1050 * t) * env(t, 0.001, 0.04) * 0.3);

sfx.heart = mono(1.0, (t) => {
  const beat = (s, g) => Math.sin(2 * Math.PI * 52 * (t - s)) * env(t - s, 0.008, 0.07) * g;
  return beat(0, 1) + beat(0.22, 0.7);
});

{
  const lp = biquad('lp', 400);
  sfx.step = mono(0.25, (t) => lp(noise()) * env(t, 0.004, 0.035) * 2.2 + Math.sin(2 * Math.PI * 80 * t) * env(t, 0.002, 0.03) * 0.5);
}

{
  const bp = biquad('bp', 520, 3);
  sfx.chair = mono(0.6, (t) => {
    const e = Math.sin(Math.min(1, t / 0.45) * Math.PI) * (t < 0.45 ? 1 : 0);
    const chatter = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 38);
    return bp(noise()) * e * chatter * 1.4;
  });
}

sfx.thud = (() => {
  const lp = biquad('lp', 300);
  return mono(0.4, (t) => lp(noise()) * env(t, 0.003, 0.05) * 1.5 + Math.sin(2 * Math.PI * 65 * t) * env(t, 0.003, 0.08) * 0.6);
})();

{
  // airy whoosh with sweeping band
  sfx.whoosh = (() => {
    const b = buf(0.9);
    let bp = biquad('bp', 400, 1.2);
    for (let i = 0; i < b[0].length; i++) {
      const t = i / SR;
      if (i % 256 === 0) bp = ((prev) => prev)(bp);
      const fc = 300 + 2600 * Math.sin(Math.min(1, t / 0.9) * Math.PI * 0.5);
      if (i % 128 === 0) bp = biquad('bp', fc, 1.4);
      const e = Math.sin(Math.min(1, t / 0.9) * Math.PI) ** 1.5;
      const v = bp(noise()) * e;
      b[0][i] = v;
      b[1][i] = v * 0.85;
    }
    return b;
  })();
}

sfx.startle = (() => {
  // quick rising "boing" + intake of breath
  const bp = biquad('bp', 2500, 1);
  return mono(0.5, (t) => {
    const f = 280 * Math.pow(3.2, Math.min(1, t / 0.16));
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.005, 0.12) * 0.5 + bp(noise()) * env(t, 0.03, 0.08) * 0.5;
  });
})();

sfx.flip = (() => {
  // the moment thoughts become words: bright shimmer arpeggio
  const b = buf(2.2);
  [84, 88, 91, 96, 100].forEach((m, k) => {
    const n = mono(1.8, (t) => {
      const f = midi(m);
      return (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2.76 * t)) * env(t, 0.002, 0.45) * 0.35;
    });
    add(b, n, k * 0.045, 1, k % 2 ? 0.4 : -0.4);
  });
  return reverb(b, 0.4, 1.1);
})();

sfx.impact = (() => {
  const lp = biquad('lp', 180);
  return mono(2.0, (t) => {
    const f = 62 * Math.exp(-t * 1.5) + 34;
    return Math.sin(2 * Math.PI * f * t) * env(t, 0.004, 0.55) * 0.9 + lp(noise()) * env(t, 0.002, 0.12) * 0.6;
  });
})();

sfx.swell = (() => {
  // reverse-cymbal-like rise into a beat
  const hp = biquad('hp', 2500);
  return mono(1.2, (t) => hp(noise()) * Math.pow(t / 1.2, 3) * 0.6);
})();

/** "ha ha" — formant-synthesised laughter, a few voices */
const laughVoice = (f0, syll = 3, gap = 0.16) => {
  const formants = [
    [800, 5],
    [1200, 6],
    [2600, 8],
  ].map(([fq, q]) => biquad('bp', fq, q));
  const dur = syll * gap + 0.25;
  let ph = 0;
  return mono(dur, (t) => {
    const k = Math.floor(t / gap);
    const lt = t - k * gap;
    const on = k < syll ? 1 : 0;
    const e = on * Math.sin(Math.min(1, lt / (gap * 0.75)) * Math.PI) ** 1.2;
    const f = f0 * (1.08 - 0.12 * (lt / gap) - k * 0.03);
    ph += f / SR;
    const saw = 2 * (ph - Math.floor(ph)) - 1;
    const breath = noise() * (lt < 0.04 ? 0.9 : 0.25);
    const src = saw * 0.6 + breath;
    let v = 0;
    formants.forEach((fl, i) => (v += fl(src) * [1, 0.6, 0.25][i]));
    return v * e * 1.4;
  });
};
sfx.laugh = (() => {
  const b = buf(1.1);
  add(b, laughVoice(190, 3, 0.15), 0, 0.8, -0.3);
  add(b, laughVoice(150, 3, 0.17), 0.06, 0.8, 0.25);
  add(b, laughVoice(230, 2, 0.14), 0.12, 0.6, 0.05);
  return reverb(b, 0.3, 0.7);
})();

// ----------------------------------------------------------------- ambience (café room tone + murmur)
const TOTAL = 28.4;
{
  const b = buf(TOTAL);
  const lp = biquad('lp', 260);
  const bps = [biquad('bp', 420, 2), biquad('bp', 760, 2.5), biquad('bp', 1150, 3)];
  const bpsR = [biquad('bp', 460, 2), biquad('bp', 820, 2.5), biquad('bp', 1250, 3)];
  for (let i = 0; i < b[0].length; i++) {
    const t = i / SR;
    const murmur = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 4.3 + Math.sin(t * 1.7) * 3) * (0.5 + 0.5 * Math.sin(t * 0.9));
    const murmur2 = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 5.1 + Math.sin(t * 1.3) * 2.4);
    const room = lp(noise()) * 0.5;
    let l = room, r = room;
    bps.forEach((f) => (l += f(noise()) * murmur * 0.35));
    bpsR.forEach((f) => (r += f(noise()) * murmur2 * 0.35));
    const fade = Math.min(1, t / 0.6) * (t > TOTAL - 2.5 ? Math.max(0, (TOTAL - t) / 2.5) : 1);
    b[0][i] = l * fade;
    b[1][i] = r * fade;
  }
  // distant cup clinks
  [3.1, 7.8, 12.4, 18.2, 22.9].forEach((s, k) => {
    const c = mono(0.6, (t) => (Math.sin(2 * Math.PI * 3150 * t) + 0.6 * Math.sin(2 * Math.PI * 4720 * t)) * env(t, 0.001, 0.09) * 0.25);
    add(b, c, s, 1, k % 2 ? 0.6 : -0.5);
  });
  writeWav('ambience', reverb(b, 0.25, 1.2), 0.9);
}

// ----------------------------------------------------------------- score
// Story arc in harmony: A-minor loneliness → suspended question → silence → C-major bloom.
{
  const b = buf(TOTAL);
  const P = (m, at, vel = 0.5, dur = 3.5, pan = 0) => add(b, piano(m, dur, vel), at, 1, pan);
  const PAD = (notes, at, dur, g = 0.1) => add(b, pad(notes, dur, 1.4, 1.6, g), at);

  // hook: low drone under the lamp flicker
  PAD([45, 52], 0.2, 4.2, 0.08);
  // 1. loneliness: sparse Am(add9) → Fmaj7 arpeggios
  const arp = (notes, at, step = 0.375, vel = 0.42) => notes.forEach((m, k) => P(m, at + k * step, vel * (k === 0 ? 1.2 : 1), 3.2, k % 2 ? 0.35 : -0.35));
  arp([57, 64, 71, 72], 2.0);
  PAD([57, 64, 72], 2.0, 3.2, 0.06);
  arp([53, 60, 64, 69], 3.6);
  // 2. shy's inner voice: each thought a hesitant high note (synced to bubbles)
  P(76, 4.07, 0.38); P(79, 5.07, 0.38); P(83, 6.13, 0.4, 4);
  PAD([50, 57, 65, 72], 5.2, 3.0, 0.07);
  arp([50, 57, 60, 65], 6.8, 0.42, 0.36);
  // 3. the invitation to the introvert — light & friendly
  arp([53, 60, 64, 67], 8.5, 0.375, 0.4);
  P(72, 9.8, 0.42); P(74, 10.2, 0.36);
  PAD([48, 55, 64], 9.6, 2.6, 0.06);
  // 4. second invitation — suspended E7sus4, held breath
  arp([52, 59, 62, 69], 11.6, 0.4, 0.4);
  PAD([52, 57, 59, 62], 12.4, 1.6, 0.08);
  // (silence ~13.7–14.0s, then everything blooms at 14.0s)
  // 5. bloom: Cmaj9
  [48, 55, 64, 71, 74].forEach((m, k) => P(m, 14.0 + k * 0.03, 0.55, 4.5, (k - 2) * 0.2));
  PAD([48, 55, 64, 67, 71], 14.0, 3.4, 0.11);
  arp([67, 72, 74, 76], 15.2, 0.3, 0.38);
  // 6. G/B → Am7: the walk to the table
  [47, 55, 62, 67].forEach((m, k) => P(m, 17.4 + k * 0.03, 0.45, 3.5));
  arp([71, 74, 79], 17.8, 0.33, 0.35);
  // 7. warmth: Fmaj9 when shy sits, laughter
  [41, 53, 60, 64, 67].forEach((m, k) => P(m, 19.55 + k * 0.03, 0.5, 4));
  PAD([53, 57, 64, 67, 72], 19.5, 4.2, 0.1);
  arp([72, 76, 79, 81], 20.4, 0.32, 0.34);
  // 8. message: two answers — Am(add9) for silence of peace, Fmaj7 for waiting
  [45, 57, 64, 71].forEach((m, k) => P(m, 21.66 + k * 0.04, 0.45, 3.4, -0.3));
  [41, 57, 64, 69, 76].forEach((m, k) => P(m, 23.33 + k * 0.04, 0.45, 3.4, 0.3));
  // 9. resolution: C major, final chord rings out
  [36, 48, 55, 64, 67, 72, 76].forEach((m, k) => P(m, 25.4 + k * 0.035, 0.55, 3.0, (k - 3) * 0.12));
  PAD([48, 55, 64, 67, 72], 25.3, 3.1, 0.12);
  writeWav('score', reverb(b, 0.38, 1.25), 0.95);
}

for (const [k, v] of Object.entries(sfx)) writeWav(k, v, 0.95);
