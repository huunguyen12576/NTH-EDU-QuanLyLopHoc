import {continueRender, delayRender, staticFile} from 'remotion';

// Self-hosted, SIL Open Font License 1.1: Be Vietnam Pro (sans, drawn for Vietnamese),
// Noto Serif Display (emotional keywords), JetBrains Mono (code). Latin + Vietnamese subsets.
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-21FF, U+2212, U+2215, U+2460-24FF, U+25A0-25FF, U+2700-27BF, U+FEFF, U+FFFD';
const VIET = 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB';

type F = [family: string, file: string, weight: number, style: 'normal' | 'italic'];
const FACES: F[] = [];
for (const w of [300, 400, 500, 700]) FACES.push(['Be Vietnam Pro', 'be-vietnam-pro', w, 'normal']);
for (const w of [400, 600]) {
  FACES.push(['Noto Serif Display', 'noto-serif-display', w, 'normal']);
  FACES.push(['Noto Serif Display', 'noto-serif-display', w, 'italic']);
}
FACES.push(['JetBrains Mono', 'jetbrains-mono', 400, 'normal']);

let loaded = false;
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('fonts');
  const all: FontFace[] = [];
  for (const [fam, file, w, st] of FACES)
    for (const [sub, range] of [['latin', LATIN], ['vietnamese', VIET]] as const)
      all.push(new FontFace(fam, `url(${staticFile(`fonts/${file}-${sub}-${w}-${st}.woff2`)}) format('woff2')`, {weight: String(w), style: st, unicodeRange: range}));
  Promise.all(all.map((f) => f.load().then((x) => (document.fonts as any).add(x))))
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
