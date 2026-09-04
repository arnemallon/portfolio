/* The glass itself: one static SVG filter per material × size bucket, referenced
   from glass.css as `filter: url(#lg-…)`. Every filter is a pure function of the
   tables below and is generated once (GlassDefs.svelte asks for it on mount); the
   only thing touched at runtime is the key matrix (`result="lit"`) the pointer light
   in glass.js rewrites.

   Optics (see the brief): everything after the field derives from SourceAlpha,
   so any string works and the same filter serves every heading of its bucket.
     1. field — feImage of the material's wallpaper, stretched over the region
        exactly like the page copy (fields.js). On paper the picture has no ground:
        the body is translucent and the page shows through the tint.
     2. edge lens — a normal map from blur(SourceAlpha) via ±1 px offsets, driving
        feDisplacementMap with a NEGATIVE scale: the field just outside the contour
        is pulled ≈ 0.35 stem into the outer third of the stroke, flat in the centre
     3. frost < 1 px, saturation / transmission, clipped to the glyph
     4. body tint — Apple's tinted variant on paper (a neutral ink at ~50 %, so the
        body reads ≥ 3:1 on #fcfcfc and heavier than the copy beneath it), clear on
        the dark page (8 % white) and white-leaning on the band (30 %, 34 % on a pass)
        so the score stays the brightest object there
     5. lens band — an inner glow decaying exponentially from the rim over ~0.3 stem;
        on dark grounds keyed to the light so exit edges carry ≤ 0.4 of the lit band
     6. thickness line — 1 px darker line just inside the shadow-side edge (dark only)
     7. rim — a 1 px hairline on every edge, cut morphologically (SourceAlpha minus
        its 1 px erosion) so it follows corners exactly instead of rounding them off,
        keyed to the normal · light direction (top-left key), blooming at concave joins
     8. ground terms — a neutral cast shadow down-right on paper; on dark, no shadow,
        only a 1 px contact line. Both are composited OUTSIDE the glyph only, so a
        translucent body never carries its own shadow.

   Units: filterUnits="objectBoundingBox" with a fixed percentage region, so one
   filter fits any heading; primitiveUnits stay userSpaceOnUse (CSS px), so blur
   radii are bucketed per nominal stem width (Geist 700: stem ≈ 0.152 em).
   Only SVG 1.1 primitives; feImage with a data URI; integer feMorphology radii;
   explicit region; colour math in sRGB. */

import { fieldURI, gridURI } from './fields.js';

const f2 = (n) => Math.round(n * 100) / 100;
const f3 = (n) => Math.round(n * 1000) / 1000;

/* the region every filter uses, as fractions of the heading's box. The page-side
   field gets the same insets through PAGE_INSET below (glass.js → `--lg-inset`). */
export const REGION = { x: -0.3, y: -0.5, w: 1.6, h: 2.0 };

/* size buckets: nominal stem in px. glass.js stamps data-lg-size from the
   computed font-size; the score has one bucket (64–104 px type, 10–16 px stems). */
export const SIZES = {
  l: { stem: 9 }, // 48–67 px type (desktop titles)
  s: { stem: 6 }, // 32–48 px type (mobile titles, the review heading)
  score: { stem: 13 } // 64–104 px type (the band score)
};

/* the ground colours the dark materials bake in (app.css tokens; glass.js asserts
   them in dev): the page's dark ground, and the band under each theme */
export const GROUNDS = { page: '#fcfcfc', dark: '#0a0a0a', bandLight: '#121212', bandDark: '#1a1a1a' };

/* the key-light tables: rim strength against the angle between the edge normal
   and the light (0 = faces away … 1 = faces it); light from the top-left */
const KEY_LIGHT = [0.55, 0.57, 0.6, 0.64, 0.69, 0.75, 0.82, 0.89, 0.95, 0.98, 1.0];
const KEY_LIGHT_S = [0.7, 0.71, 0.73, 0.76, 0.8, 0.85, 0.9, 0.94, 0.97, 0.99, 1.0];
const KEY_DARK = [0.08, 0.085, 0.09, 0.1, 0.12, 0.18, 0.34, 0.58, 0.8, 0.95, 1.0];
/* the band score: every edge carries a line (40–60 % on the exit edges) */
const KEY_SCORE = [0.12, 0.13, 0.15, 0.18, 0.24, 0.34, 0.5, 0.68, 0.84, 0.95, 1.0];
const GLOW_KEY_DARK = [0.4, 0.41, 0.43, 0.47, 0.54, 0.63, 0.74, 0.86, 0.95, 1.0, 1.0];
const GLOW_KEY_SCORE = [0.15, 0.16, 0.18, 0.22, 0.29, 0.4, 0.55, 0.72, 0.88, 1.0, 1.0];

/* materials — alphas 0..1, colours hex. field: name in fields.js; page / glass:
   strengths {a: ambient, s: streaks} of the same wallpaper on the page / inside the
   glass; ground: null for a translucent body (paper), else the opaque ground the
   in-glass copy is drawn over */
export const MATERIALS = {
  'title-light': {
    field: 'title-light', page: { a: 0, s: 0.06 }, glass: { a: 0.34, s: 0.8 }, ground: null,
    sat: 1.0, trans: 1.0, frost: 0.5,
    tint: '#1c1f25', tintA: 0.5,
    glow: '#ffffff', glowA: 0.17, glowKey: null,
    rim: '#ffffff', rimA: 1.0, key: KEY_LIGHT, keyS: KEY_LIGHT_S, bloom: 1.6, bloomG: 1.0,
    tirA: 0, shadowA: 0.15, shadowSig: 0.24, shadowDx: 0.32, shadowDy: 0.45, contactA: 0
  },
  'title-dark': {
    field: 'title-dark', page: { a: 0.2, s: 0.2 }, glass: { a: 0.26, s: 0.3 }, ground: GROUNDS.dark,
    sat: 0.5, trans: 1.0, frost: 0.7,
    tint: '#ffffff', tintA: 0.08,
    glow: '#ffffff', glowA: 0.24, glowKey: GLOW_KEY_DARK,
    rim: '#ffffff', rimA: 1.0, key: KEY_DARK, keyS: KEY_DARK, bloom: 2.2, bloomG: 2.0,
    tir: '#000000', tirA: 0.06, shadowA: 0, contactA: 0.4
  },
  /* the band score: the brightest object on the band — white-leaning body, strong
     rim and lens band. `-light` / `-dark` is the page theme: the band is #121212
     under the light theme and #1a1a1a under dark. */
  'score-band-light': {
    field: 'score-band', page: { a: 0.24, s: 0.2 }, glass: { a: 0.34, s: 0.3 }, ground: GROUNDS.bandLight,
    sat: 0.55, trans: 1.0, frost: 0.7,
    tint: '#ffffff', tintA: 0.3,
    glow: '#ffffff', glowA: 0.42, glowKey: GLOW_KEY_SCORE,
    rim: '#ffffff', rimA: 1.0, key: KEY_SCORE, keyS: KEY_SCORE, bloom: 2.2, bloomG: 2.0,
    tir: '#000000', tirA: 0.06, shadowA: 0, contactA: 0.45
  },
  /* passed: a brighter neutral body; the green lives in the rim, the lens band and
     the field's glow on the band */
  'score-pass-light': {
    field: 'score-pass', page: { a: 0.34, s: 0.2 }, glass: { a: 0.42, s: 0.3 }, ground: GROUNDS.bandLight,
    sat: 0.8, trans: 1.0, frost: 0.7,
    tint: '#ffffff', tintA: 0.34,
    glow: '#4ade80', glowA: 0.55, glowKey: GLOW_KEY_SCORE,
    rim: '#ccfbe3', rimA: 1.0, key: KEY_SCORE, keyS: KEY_SCORE, bloom: 2.2, bloomG: 2.0,
    tir: '#000000', tirA: 0.06, shadowA: 0, contactA: 0.45
  }
};
MATERIALS['score-band-dark'] = { ...MATERIALS['score-band-light'], ground: GROUNDS.bandDark };
MATERIALS['score-pass-dark'] = { ...MATERIALS['score-pass-light'], ground: GROUNDS.bandDark };

/* which buckets exist: material × size */
export const BUCKETS = [
  ['title-light', 'l'],
  ['title-light', 's'],
  ['title-dark', 'l'],
  ['title-dark', 's'],
  ['score-band-light', 'score'],
  ['score-band-dark', 'score'],
  ['score-pass-light', 'score'],
  ['score-pass-dark', 'score']
];
export const filterId = (material, size) => (size === 'score' ? `lg-${material}` : `lg-${material}-${size}`);

/* ---- fragments ------------------------------------------------------------ */

/* height field → normal map: dx in R, dy in G, 0.5 = flat. Offsets + arithmetic
   only, alpha held at 1 throughout so premultiplication never bites. */
function normals(inName, sigma, gain, out) {
  const g = f3(gain);
  return (
    `<feGaussianBlur in="${inName}" stdDeviation="${f2(sigma)}" result="${out}_h"/>` +
    `<feColorMatrix in="${out}_h" type="matrix" values="0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1" result="${out}_hg"/>` +
    `<feOffset in="${out}_hg" dx="-1" dy="0" result="${out}_l"/>` +
    `<feOffset in="${out}_hg" dx="1" dy="0" result="${out}_r"/>` +
    `<feColorMatrix in="${out}_l" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="${out}_lR"/>` +
    `<feColorMatrix in="${out}_r" type="matrix" values="0 0 0 0 0  1 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="${out}_rG"/>` +
    `<feComposite in="${out}_lR" in2="${out}_rG" operator="arithmetic" k2="1" k3="1" result="${out}_x"/>` +
    `<feColorMatrix in="${out}_x" type="matrix" values="${g} ${-g} 0 0 0.5  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="${out}_dx"/>` +
    `<feOffset in="${out}_hg" dx="0" dy="-1" result="${out}_u"/>` +
    `<feOffset in="${out}_hg" dx="0" dy="1" result="${out}_d"/>` +
    `<feColorMatrix in="${out}_u" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="${out}_uR"/>` +
    `<feColorMatrix in="${out}_d" type="matrix" values="0 0 0 0 0  1 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="${out}_dG"/>` +
    `<feComposite in="${out}_uR" in2="${out}_dG" operator="arithmetic" k2="1" k3="1" result="${out}_y"/>` +
    `<feColorMatrix in="${out}_y" type="matrix" values="0 0 0 0 0  ${g} ${-g} 0 0 0.5  0 0 0 0 0  0 0 0 0 1" result="${out}_dy"/>` +
    `<feComposite in="${out}_dx" in2="${out}_dy" operator="arithmetic" k2="1" k3="1" result="${out}"/>`
  );
}

/* saturation and transmission in one matrix */
function satTrans(s, t) {
  const lr = 0.2126;
  const lg = 0.7152;
  const lb = 0.0722;
  const m = [
    lr + (1 - lr) * s, lg - lg * s, lb - lb * s,
    lr - lr * s, lg + (1 - lg) * s, lb - lb * s,
    lr - lr * s, lg - lg * s, lb + (1 - lb) * s
  ].map((v) => f3(v * t));
  return `${m[0]} ${m[1]} ${m[2]} 0 0  ${m[3]} ${m[4]} ${m[5]} 0 0  ${m[6]} ${m[7]} ${m[8]} 0 0  0 0 0 1 0`;
}

/** the rim key: alpha = 0.5 + (outward normal · light direction), read off the normal map */
export function litValues(L) {
  const c = f3(0.5 + 0.5 * (L.x + L.y));
  return `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${f3(-L.x)} ${f3(-L.y)} 0 0 ${c}`;
}
export const KEY_DIR = { x: -0.707, y: -0.707 }; // top-left

/* ---- the glass ----------------------------------------------------------- */

export function glassFilter(material, size) {
  const M = MATERIALS[material];
  const { stem } = SIZES[size];
  const small = size === 's';
  const id = filterId(material, size);
  const href = fieldURI(M.field, M.glass, M.ground);

  const sigL = f2(Math.max(1.2, 0.25 * stem)); // contour normal / lens reach
  const gain = 0.6 * sigL; // peak |v − 0.5| ≈ 0.48 in the normal map
  const disp = f2((small ? 0.45 : 0.72) * stem); // ≈ 0.35 stem at the contour, 0 in the centre
  const sigG = f2(small ? 0.6 : Math.max(1.2, 0.3 * stem)); // lens band ~0.28 stem (~0.1 on small stems)
  const cS = f2(Math.max(1.5, 0.65 * stem)); // concave-join detection radius
  const tT = f2(Math.max(0.8, Math.min(1.6, 0.09 * stem))); // thickness line, 1 px inside the exit edge
  const frost = f2(small ? 0.35 : M.frost); // small stems stay crisp: no milk
  const glowA = f2(M.glowA * (small ? 0.6 : 1));
  const tintA = f2(small ? Math.min(1, M.tintA * 1.1) : M.tintA); // a touch more body where the stroke is thin
  const tirA = small ? 0 : M.tirA;
  const key = small ? M.keyS : M.key;
  const sSig = f2(Math.max(0.8, (M.shadowSig || 0) * stem));
  const sdx = f2((M.shadowDx || 0) * stem);
  const sdy = f2((M.shadowDy || 0) * stem);

  const lens =
    normals('SourceAlpha', sigL, gain, 'nm') +
    `<feDisplacementMap in="fld" in2="nm" scale="${f2(-disp)}" xChannelSelector="R" yChannelSelector="G" result="fd"/>` +
    `<feGaussianBlur in="fd" stdDeviation="${frost}" result="fb"/>`;

  // lens band gate (dark grounds): the band follows the key light with a floor
  const glowGate = M.glowKey
    ? `<feComponentTransfer in="lit" result="gkey"><feFuncA type="table" tableValues="${M.glowKey.join(' ')}"/></feComponentTransfer>` +
      `<feComposite in="gsh" in2="gkey" operator="arithmetic" k1="1" result="gsk"/>`
    : `<feOffset in="gsh" dx="0" dy="0" result="gsk"/>`;

  const tir = tirA
    ? `<feOffset in="SourceAlpha" dx="${f2(-tT - 1)}" dy="${f2(-tT - 1)}" result="oBR"/>` +
      `<feComposite in="SourceAlpha" in2="oBR" operator="out" result="br0"/>` +
      `<feComposite in="br0" in2="erA" operator="in" result="br1"/>` +
      `<feGaussianBlur in="br1" stdDeviation="0.5" result="br2"/>` +
      `<feFlood flood-color="${M.tir || '#000'}" flood-opacity="${f2(tirA)}" result="tirc"/>` +
      `<feComposite in="tirc" in2="br2" operator="in" result="tir"/>` +
      `<feComposite in="tir" in2="body2" operator="over" result="body3"/>`
    : `<feOffset in="body2" dx="0" dy="0" result="body3"/>`;

  // ground terms live outside the glyph only (`out` SourceAlpha): the body is translucent on paper
  const shadow = M.shadowA
    ? `<feGaussianBlur in="SourceAlpha" stdDeviation="${sSig}" result="sb"/>` +
      `<feOffset in="sb" dx="${sdx}" dy="${sdy}" result="so"/>` +
      `<feFlood flood-color="#000000" flood-opacity="${f2(M.shadowA)}" result="sc"/>` +
      `<feComposite in="sc" in2="so" operator="in" result="s1"/>` +
      `<feComposite in="s1" in2="SourceAlpha" operator="out" result="s2"/>`
    : '';
  const contact = M.contactA
    ? `<feOffset in="SourceAlpha" dx="0.4" dy="1.3" result="cl0"/>` +
      `<feGaussianBlur in="cl0" stdDeviation="0.5" result="cl1"/>` +
      `<feFlood flood-color="#000000" flood-opacity="${f2(M.contactA)}" result="clc"/>` +
      `<feComposite in="clc" in2="cl1" operator="in" result="cl"/>` +
      `<feComposite in="cl" in2="SourceAlpha" operator="out" result="cl2"/>`
    : '';
  const merge =
    `<feMerge>${M.shadowA ? '<feMergeNode in="s2"/>' : ''}${M.contactA ? '<feMergeNode in="cl2"/>' : ''}` +
    `<feMergeNode in="glyph"/></feMerge>`;

  return (
    `<filter id="${id}" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB" ` +
    `x="${REGION.x}" y="${REGION.y}" width="${REGION.w}" height="${REGION.h}">` +
    // 1. the field, fitted like the page copy (href for SVG 2, xlink:href for SVG 1.1 engines)
    `<feImage href="${href}" xlink:href="${href}" preserveAspectRatio="none" result="fld"/>` +
    // 2. the edge lens
    lens +
    // 3. transmission, clipped to the glyph
    `<feColorMatrix in="fb" type="matrix" values="${satTrans(M.sat, M.trans)}" result="fc"/>` +
    `<feComposite in="fc" in2="SourceAlpha" operator="in" result="body0"/>` +
    // 4. body tint
    `<feFlood flood-color="${M.tint}" flood-opacity="${tintA}" result="tc"/>` +
    `<feComposite in="tc" in2="SourceAlpha" operator="in" result="tint"/>` +
    `<feComposite in="tint" in2="body0" operator="over" result="body1"/>` +
    // 5. lens band: 1 at the contour, exponential decay to 0 by ~0.3 stem
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${sigG}" result="gb"/>` +
    `<feColorMatrix in="gb" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 2" result="gbi"/>` +
    `<feComponentTransfer in="gbi" result="gsh"><feFuncA type="table" tableValues="0 0.02 0.1 0.28 0.58 1"/></feComponentTransfer>` +
    // the key (also used by the rim): outward normal · light
    `<feColorMatrix in="nm" type="matrix" values="${litValues(KEY_DIR)}" result="lit"/>` +
    glowGate +
    `<feComposite in="gsk" in2="SourceAlpha" operator="in" result="gA"/>` +
    `<feFlood flood-color="${M.glow}" flood-opacity="${glowA}" result="gc"/>` +
    `<feComposite in="gc" in2="gA" operator="in" result="glow"/>` +
    `<feComposite in="glow" in2="body1" operator="over" result="body2"/>` +
    // the 1 px erosion the rim and the thickness line share
    `<feMorphology in="SourceAlpha" operator="erode" radius="1" result="erA"/>` +
    // 6. thickness line (dark grounds)
    tir +
    // 7. rim: a 1 px hairline on every edge (exact at corners), keyed, blooming at concave joins
    `<feComposite in="SourceAlpha" in2="erA" operator="out" result="ring0"/>` +
    `<feGaussianBlur in="ring0" stdDeviation="0.35" result="ring1"/>` +
    `<feComponentTransfer in="ring1" result="band"><feFuncA type="table" tableValues="0 0.7 1 1 1"/></feComponentTransfer>` +
    `<feComponentTransfer in="lit" result="key"><feFuncA type="table" tableValues="${key.join(' ')}"/></feComponentTransfer>` +
    `<feComposite in="band" in2="key" operator="arithmetic" k1="1" result="rA0"/>` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${cS}" result="cb"/>` +
    `<feComponentTransfer in="cb" result="cc"><feFuncA type="table" tableValues="0 0 0 0 0 0 0 0.35 1 1 1"/></feComponentTransfer>` +
    `<feComposite in="rA0" in2="cc" operator="arithmetic" k1="${f2(M.bloom)}" k2="1" result="rA1"/>` +
    `<feComposite in="gA" in2="cc" operator="arithmetic" k1="1" result="rB0"/>` +
    `<feGaussianBlur in="rB0" stdDeviation="1.2" result="rB1"/>` +
    `<feComposite in="rA1" in2="rB1" operator="arithmetic" k2="1" k3="${f2(M.bloomG)}" result="rA2"/>` +
    `<feFlood flood-color="${M.rim}" flood-opacity="${f2(M.rimA)}" result="rc"/>` +
    `<feComposite in="rc" in2="rA2" operator="in" result="rim"/>` +
    `<feComposite in="rim" in2="body3" operator="over" result="body4"/>` +
    // clip to the glyph's own antialiased edge
    `<feComposite in="body4" in2="SourceAlpha" operator="in" result="glyph"/>` +
    // 8. ground terms
    shadow +
    contact +
    merge +
    `</filter>`
  );
}

/* debug filters: the raw field over the region (page strength, transparent) merged
   with the glyph at 40 %, and the registration grid — both compared against the
   page copy underneath (glass.js, `?lg=field` / `?lg=reg`) */
function debugFilters() {
  const region = `filterUnits="objectBoundingBox" x="${REGION.x}" y="${REGION.y}" width="${REGION.w}" height="${REGION.h}"`;
  const fade = `<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" result="g"/>`;
  let out = '';
  for (const name of ['title-light', 'title-dark', 'score-band', 'score-pass']) {
    const M = Object.values(MATERIALS).find((m) => m.field === name);
    out +=
      `<filter id="lg-debug-${name}" ${region}><feImage href="${fieldURI(name, M.page)}" preserveAspectRatio="none" result="f"/>` +
      `${fade}<feMerge><feMergeNode in="f"/><feMergeNode in="g"/></feMerge></filter>`;
  }
  for (const kind of ['title', 'score']) {
    out +=
      `<filter id="lg-debug-reg-${kind}" ${region}><feFlood flood-color="#00ffff" flood-opacity="0.15" result="bg"/>` +
      `<feImage href="${gridURI(kind)}" preserveAspectRatio="none" result="f"/>` +
      `${fade}<feMerge><feMergeNode in="bg"/><feMergeNode in="f"/><feMergeNode in="g"/></feMerge></filter>`;
  }
  return out;
}

let defsCache = '';
/** every filter, once, built on first request (the debug filters only in dev builds) */
export function getDefs() {
  if (!defsCache) {
    defsCache = BUCKETS.map(([m, s]) => glassFilter(m, s)).join('') + '';
  }
  return defsCache;
}

let fieldsCache = null;
/** the page-side field of each material, at its page strengths (no ground), built on first request */
export function getPageFields() {
  if (!fieldsCache) {
    fieldsCache = {
      'title-light': fieldURI('title-light', MATERIALS['title-light'].page),
      'title-dark': fieldURI('title-dark', MATERIALS['title-dark'].page),
      'score-band': fieldURI('score-band', MATERIALS['score-band-light'].page),
      'score-pass': fieldURI('score-pass', MATERIALS['score-pass-light'].page),
      
    };
  }
  return fieldsCache;
}

/** the page-side field's insets (glass.css `[data-lg]::before`), from the same region the filters use */
export const PAGE_INSET = `${f2(REGION.y * 100)}% ${f2(REGION.x * 100)}%`;
