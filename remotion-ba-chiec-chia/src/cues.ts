// Every visual beat AND every sound cue is defined here, from real word timestamps.
// scripts/export-cues.ts writes them to audio/cues.json for the score/sfx generator,
// so picture and sound can never drift apart.
import {scene, ws, we, VOICE_END, TOTAL_SEC} from './lib';
import type {KeyStyle} from './parts';

export type KeyDef = {name: string; bow: KeyStyle; len: number; teeth: number[]; inlay: string};
export const KEYS: KeyDef[] = [
  {name: 'ChatGPT', bow: 'trefoil', len: 340, teeth: [0.5, 0.9, 0.35, 0.8, 0.55, 1], inlay: '#7FB59B'},
  {name: 'Claude', bow: 'ring', len: 430, teeth: [1, 0.55, 0.95, 0.7], inlay: '#D28B62'},
  {name: 'Gemini', bow: 'house', len: 350, teeth: [0.7, 0.4, 1, 0.6, 0.85], inlay: '#7E93D6'},
];

const hook = {
  names: [ws(0), ws(1), ws(3)],
  question: ws(4),
  shuffleStart: ws(4) - 0.05,
  shuffleEnd: ws(8) - 0.1,
  slash: ws(13) + 0.03,
  dark: we(13) + 0.35,
  keyhole: we(13) + 0.55,
};

const mother = {
  ...scene('mother'),
  label: ws(14),
  jingle: ws(18),
  q1: ws(26) - 0.1,
  q1fade: ws(30),
  q2: ws(33) - 0.05,
};

const three = {...scene('three'), lift: ws(38) - 0.1, names: [ws(43), ws(43) + 0.18, ws(43) + 0.36]};

type Chapter = {
  start: number;
  end: number;
  idx: number;
  name: number;
  tag: string;
  tagAt: number;
  turn: number;
  open: number;
  items: {label: string; at: number}[];
};
const ch = (id: 'chatgpt' | 'claude' | 'gemini', idx: number, tag: string, tagW: number, turnW: number, items: [string, number][]): Chapter => {
  const sc = scene(id);
  const turn = ws(turnW);
  return {
    start: sc.start,
    end: sc.end,
    idx,
    name: ws(sc.w),
    tag,
    tagAt: ws(tagW),
    turn,
    open: turn + 0.5,
    items: items.map(([label, w]) => ({label, at: ws(w)})),
  };
};
export const CHAPTERS = [
  ch('chatgpt', 0, 'Chìa vạn năng', 48, 48, [['Lên ý tưởng', 51], ['Viết bài nhanh', 54], ['Vẽ hình minh họa', 57], ['Trò chuyện bằng giọng nói', 61]]),
  ch('claude', 1, 'Chìa cho việc cần chiều sâu', 68, 68, [['Viết code', 74], ['Hợp đồng hàng trăm trang', 76], ['Văn bản quan trọng', 83]]),
  ch('gemini', 2, 'Chìa của nhà Google', 91, 91, [['Gmail', 95], ['Docs', 96], ['Sheets', 97], ['YouTube', 98], ['Tin mới nhất', 101]]),
];

const limit = {
  ...scene('limit'),
  title: ws(106),
  grid: ws(109),
  gridEnd: we(117),
  pair: ws(118) - 0.1,
  smooth: ws(122),
  hard: ws(126),
};

const reveal = {
  ...scene('reveal'),
  l1: ws(131),
  l2: ws(134),
  slash: we(135) - 0.05,
  l3: ws(136),
  l4: ws(139),
};

const method = {
  ...scene('method'),
  door: ws(142),
  label: ws(147),
  tries: [ws(153) - 0.05, ws(153) + 0.45, ws(156) - 0.1],
  open: ws(158),
};

const caution = {
  ...scene('caution'),
  key: ws(165),
  crack: ws(169),
  t1: ws(170),
  t2: ws(173),
  t3: ws(176),
  check: we(180) - 0.25,
};

const payoff = {
  ...scene('payoff'),
  l1: ws(181),
  l2: ws(186),
  door: ws(190) - 0.1,
  l3: ws(192),
  final: VOICE_END + 0.5,
  last: VOICE_END + 2.4,
};

export const CUE = {hook, mother, three, limit, reveal, method, caution, payoff, END: TOTAL_SEC};

// ---------------------------------------------------------------------------
// Sound events (consumed by audio/make_audio.py through audio/cues.json)
// ---------------------------------------------------------------------------
export const soundEvents = () => {
  const ev: {t: number; type: string; v?: number}[] = [];
  hook.names.forEach((t, k) => ev.push({t, type: 'bell', v: k}));
  for (let t = hook.shuffleStart; t < hook.shuffleEnd - 0.2; t += 0.3) ev.push({t, type: 'tick'});
  ev.push({t: hook.slash, type: 'brush'});
  ev.push({t: hook.keyhole, type: 'glint'});
  ev.push({t: mother.jingle - 0.15, type: 'jingle'});
  ev.push({t: three.lift, type: 'jingle', v: 0.6});
  three.names.forEach((t, k) => ev.push({t, type: 'bell', v: k}));
  CHAPTERS.forEach((c) => {
    ev.push({t: c.start + 0.05, type: 'slide'});
    ev.push({t: c.turn + 0.42, type: 'click'});
    ev.push({t: c.open, type: 'swell', v: 0.7});
    c.items.forEach((it, k) => ev.push({t: it.at, type: 'ping', v: c.idx * 10 + k}));
  });
  for (let k = 0; k < 11; k++) ev.push({t: limit.grid + 0.25 + k * ((limit.gridEnd - limit.grid) / 11), type: 'tick', v: 0.5});
  ev.push({t: limit.smooth + 0.4, type: 'click'});
  ev.push({t: limit.hard, type: 'rattle'});
  ev.push({t: reveal.slash, type: 'brush'});
  ev.push({t: reveal.l4, type: 'climax'});
  method.tries.forEach((t, k) => ev.push({t: t + 0.2, type: k < 2 ? 'rattle' : 'click', v: 0.6}));
  ev.push({t: method.open, type: 'swell', v: 1});
  ev.push({t: caution.crack, type: 'crack'});
  ev.push({t: caution.check, type: 'brush', v: 0.6});
  ev.push({t: payoff.door, type: 'swell', v: 1.2});
  ev.push({t: payoff.final, type: 'bell', v: 1});
  return ev.sort((a, b) => a.t - b.t);
};
