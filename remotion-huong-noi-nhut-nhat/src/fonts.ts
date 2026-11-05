import {continueRender, delayRender} from 'remotion';
import '@fontsource/montserrat/vietnamese-500.css';
import '@fontsource/montserrat/vietnamese-600.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/vietnamese-700.css';
import '@fontsource/montserrat/vietnamese-800.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';

// Block rendering until Montserrat (incl. Vietnamese glyphs) is ready so text never flashes a fallback.
const handle = delayRender('Loading Montserrat');
const probe = 'Hướng nội nhút nhát ỔN Ờ';
Promise.all(
  ['500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px Montserrat`, probe))
)
  .then(() => document.fonts.ready)
  .then(() => continueRender(handle))
  .catch(() => continueRender(handle));
