import {continueRender, delayRender, staticFile} from 'remotion';

// Montserrat, self-hosted (SIL Open Font License). Latin + Vietnamese subsets, joined by unicode-range.
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+258D';
const VIET = 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB';

let loaded = false;
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('Loading Montserrat');
  const faces: FontFace[] = [];
  for (const w of [300, 400, 600, 800]) {
    for (const [subset, range] of [['latin', LATIN], ['vietnamese', VIET]] as const) {
      faces.push(new FontFace('Montserrat', `url(${staticFile(`fonts/montserrat-${subset}-${w}-normal.woff2`)}) format('woff2')`, {weight: String(w), unicodeRange: range}));
    }
  }
  Promise.all(faces.map((ff) => ff.load().then((x) => document.fonts.add(x))))
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
