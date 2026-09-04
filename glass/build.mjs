/* Regenerates the static glass assets inlined into index.html / style.css.
   Run: node glass/build.mjs   (vendored from PrepTools OptiverPrep src/lib/glass) */
import { writeFileSync } from 'node:fs';
import { glassFilter } from './filters.js';

const defs = glassFilter('title-dark', 'l') + glassFilter('title-dark', 's');

writeFileSync(new URL('./defs.html', import.meta.url),
  `<svg class="lg-defs" aria-hidden="true" focusable="false"><defs>${defs}</defs></svg>\n`);
console.log('defs.html', defs.length, 'bytes');
