/* The ambient light field behind each glass material — the "wallpaper" the glass
   refracts. One SVG per material, rasterised twice from the same source: once on
   the page (the heading's ::before, at the page strengths) and once inside the
   filter (feImage, at the in-glass strengths). Both are stretched over the same
   box (`background-size: 100% 100%` and `preserveAspectRatio="none"`), so they
   register by construction.

   Two layers, with separate strengths for each copy:
     ambient — the base wash, three hue blobs and the wordmark's drifting colour
               spots (on paper the page copy carries none of it: Apple's wordmark
               sits on untouched white, so the wash lives inside the glass only)
     streaks — two or three fine, low-contrast diagonal bands, edge blur ≥ 0.34 stem,
               that the edge lens kinks at every contour it crosses; never bright
               enough to read as a gloss bar (peak ≤ L150 on dark, ≤ L240 on light)

   Geometry is expressed in fractions of the filter region, which is the heading's
   box grown 30 % sideways and 50 % up and down (glass.css / filters.js), and the
   picture is stretched to that box (no cropping: a mask that fades out inside the
   picture fades out inside the region on every heading). So the glyph run always
   sits at x 18.75–81.25 %, y 25–75 % of the picture, and one stem of Geist 700
   (0.152 em) is ≈ 0.08 of the picture height whatever the type size.

   The in-glass copy is drawn over an opaque ground on dark grounds (the filter
   owns the interior, desaturated) and over nothing on paper (the body is
   translucent: the page, its graticule included, shows through the tint).

   Everything is computed once: pure functions of the tables below. */

const f2 = (n) => Math.round(n * 100) / 100;

/* picture boxes: a wide one for titles (the region of "80 IN 8" at 67 px is ≈ 4:1,
   "NUMBERLOGIC" ≈ 6.5:1), a squarer one for the score ("+42" ≈ 1.8:1, "0" ≈ 0.6:1) */
const BOX = { title: [500, 100], score: [200, 100] };
const STEM = 8; // one stem, in picture units (H = 100)

/* base:    [colour, alpha]
   blobs:   [colour, alpha, cx, cy, rx, ry]     fractions of the picture
   spots:   [colour, alpha, cx, cy, r]           r in stems — the wordmark's drifting refracted colour
   streaks: [colour, alpha, width, blur, deg, cx, cy]   width/blur in stems; negative deg = rising
   mask:    [x0, y0, x1, y1, blur]               fractions; the pill the wash lives in */
export const FIELDS = {
  /* paper — Apple's tinted variant: nothing on the page; inside the glass a faint
     cool base, the three low-saturation colour spots and grey streaks fine enough
     for the edge lens to bend. Grey, not white: white is invisible on paper. */
  'title-light': {
    kind: 'title',
    base: ['#c9ced9', 0.42],
    blobs: [
      ['#aeb9dc', 0.3, 0.48, 0.62, 0.34, 0.5],
      ['#ffe9d2', 0.42, 0.2, 0.3, 0.16, 0.34],
      ['#cfeefa', 0.36, 0.8, 0.44, 0.18, 0.4]
    ],
    spots: [
      ['#ffc4d2', 0.7, 0.3, 0.62, 1.2],
      ['#ffd8ae', 0.66, 0.6, 0.4, 1.1],
      ['#c9f0c6', 0.66, 0.76, 0.58, 1.2]
    ],
    streaks: [
      ['#7f8aa8', 0.3, 0.34, 0.36, -24, 0.4, 0.4],
      ['#7f8aa8', 0.26, 0.3, 0.36, -24, 0.56, 0.66],
      ['#ffffff', 0.6, 0.36, 0.36, -24, 0.68, 0.5],
      ['#aab5cf', 0.22, 2.2, 0.8, -24, 0.7, 0.5]
    ],
    mask: [0.16, 0.14, 0.84, 0.86, 7]
  },

  /* dark page — clear glass on black: a cool, low-saturation wash with colour only
     where the spots sit; the streaks stay inside the glyph run */
  'title-dark': {
    kind: 'title',
    base: ['#1a2040', 0.22],
    blobs: [
      ['#3a52c8', 0.32, 0.45, 0.62, 0.38, 0.6],
      ['#6a48d8', 0.3, 0.8, 0.28, 0.22, 0.5],
      ['#2ab0e8', 0.22, 0.62, 0.86, 0.24, 0.5]
    ],
    spots: [
      ['#9fd8ff', 0.55, 0.36, 0.34, 1.2],
      ['#c7b3ff', 0.45, 0.7, 0.68, 1.3]
    ],
    streaks: [
      ['#c8d4ff', 0.26, 0.6, 0.4, -24, 0.42, 0.38],
      ['#dfe7ff', 0.16, 0.4, 0.4, -58, 0.6, 0.5],
      ['#8ea4ff', 0.24, 1.4, 0.7, -24, 0.66, 0.55]
    ],
    mask: [0.17, 0.14, 0.83, 0.86, 8]
  },

  /* the band score: the same cool field, framed square, never above the kicker */
  'score-band': {
    kind: 'score',
    base: ['#1a2040', 0.24],
    blobs: [
      ['#3a52c8', 0.36, 0.45, 0.6, 0.42, 0.56],
      ['#6a48d8', 0.32, 0.82, 0.3, 0.26, 0.46],
      ['#2ab0e8', 0.24, 0.6, 0.86, 0.3, 0.42]
    ],
    spots: [
      ['#9fd8ff', 0.55, 0.34, 0.36, 1.2],
      ['#c7b3ff', 0.45, 0.7, 0.7, 1.3]
    ],
    streaks: [
      ['#c8d4ff', 0.16, 0.6, 0.44, -24, 0.42, 0.4],
      ['#dfe7ff', 0.1, 0.4, 0.4, -58, 0.62, 0.52],
      ['#8ea4ff', 0.24, 1.6, 0.7, -24, 0.66, 0.56]
    ],
    mask: [0.1, 0.27, 0.9, 0.86, 6]
  },

  /* passed: a green field under a bright neutral body — the green is the rim's, the
     lens band's and the backdrop glow's (filters.js), never a green interior */
  'score-pass': {
    kind: 'score',
    base: ['#163425', 0.26],
    blobs: [
      ['#22a35f', 0.34, 0.45, 0.6, 0.42, 0.56],
      ['#14b8a6', 0.24, 0.82, 0.3, 0.26, 0.46],
      ['#86d94a', 0.16, 0.6, 0.86, 0.3, 0.42]
    ],
    spots: [
      ['#b8ffd6', 0.45, 0.34, 0.36, 1.2],
      ['#d9f99d', 0.35, 0.7, 0.7, 1.3]
    ],
    streaks: [
      ['#d9ffe6', 0.16, 0.6, 0.44, -24, 0.42, 0.4],
      ['#eafff1', 0.1, 0.4, 0.4, -58, 0.62, 0.52],
      ['#8ee0b0', 0.24, 1.6, 0.7, -24, 0.66, 0.56]
    ],
    mask: [0.1, 0.27, 0.9, 0.86, 6]
  }
};

/** The field as an SVG data URI. `strength` is `{ a, s }` — the group opacity of the
 *  ambient layer and of the streaks; `ground` (optional) an opaque backdrop for the
 *  in-filter copy on dark grounds. A zero layer is left out of the picture. */
export function fieldURI(name, strength, ground = null) {
  const P = FIELDS[name];
  const [w, h] = BOX[P.kind];
  const stem = STEM;
  const { a: ambA = 0, s: strA = 0 } = strength;
  const defs = [];
  const amb = [];
  const str = [];
  if (ambA > 0) {
    amb.push(`<rect width="${w}" height="${h}" fill="${P.base[0]}" fill-opacity="${P.base[1]}"/>`);
    P.blobs.forEach((B, i) => {
      defs.push(
        `<radialGradient id="b${i}"><stop offset="0" stop-color="${B[0]}" stop-opacity="${B[1]}"/><stop offset=".55" stop-color="${B[0]}" stop-opacity="${f2(B[1] * 0.45)}"/><stop offset="1" stop-color="${B[0]}" stop-opacity="0"/></radialGradient>`
      );
      amb.push(`<ellipse cx="${f2(B[2] * w)}" cy="${f2(B[3] * h)}" rx="${f2(B[4] * w)}" ry="${f2(B[5] * h)}" fill="url(#b${i})"/>`);
    });
    P.spots.forEach((S, i) => {
      defs.push(
        `<radialGradient id="p${i}"><stop offset="0" stop-color="${S[0]}" stop-opacity="${S[1]}"/><stop offset=".5" stop-color="${S[0]}" stop-opacity="${f2(S[1] * 0.5)}"/><stop offset="1" stop-color="${S[0]}" stop-opacity="0"/></radialGradient>`
      );
      amb.push(`<ellipse cx="${f2(S[2] * w)}" cy="${f2(S[3] * h)}" rx="${f2(S[4] * stem * 1.3)}" ry="${f2(S[4] * stem)}" fill="url(#p${i})"/>`);
    });
  }
  if (strA > 0) {
    P.streaks.forEach((S, i) => {
      const [c, a, sw, sb, deg, cx, cy] = S;
      const t = (deg * Math.PI) / 180;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      // long enough to cross the picture, its ends feathered over the outer 30 %
      const R = 0.5 * 1.15 * (Math.abs(ct) > 0.7 ? w / Math.abs(ct) : h / Math.abs(st));
      const dx = ct * R;
      const dy = st * R;
      const x = cx * w;
      const y = cy * h;
      defs.push(
        `<linearGradient id="sg${i}" gradientUnits="userSpaceOnUse" x1="${f2(x - dx)}" y1="${f2(y - dy)}" x2="${f2(x + dx)}" y2="${f2(y + dy)}"><stop offset="0" stop-color="${c}" stop-opacity="0"/><stop offset=".3" stop-color="${c}" stop-opacity="${a}"/><stop offset=".7" stop-color="${c}" stop-opacity="${a}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`
      );
      defs.push(
        `<filter id="s${i}" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><feGaussianBlur stdDeviation="${f2(Math.max(0.3, sb * stem))}"/></filter>`
      );
      str.push(
        `<line x1="${f2(x - dx)}" y1="${f2(y - dy)}" x2="${f2(x + dx)}" y2="${f2(y + dy)}" stroke="url(#sg${i})" stroke-width="${f2(Math.max(1, sw * stem))}" filter="url(#s${i})"/>`
      );
    });
  }
  const [mx0, my0, mx1, my1, mb] = P.mask;
  const mw = (mx1 - mx0) * w;
  const mh = (my1 - my0) * h;
  const g = ground ? `<rect width="${w}" height="${h}" fill="${ground}"/>` : '';
  const layer = (els, alpha) => (els.length ? `<g mask="url(#m)" opacity="${alpha}">${els.join('')}</g>` : '');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
    `<defs>${defs.join('')}` +
    `<filter id="fe" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="${mb}"/></filter>` +
    `<mask id="m"><rect x="${f2(mx0 * w)}" y="${f2(my0 * h)}" width="${f2(mw)}" height="${f2(mh)}" rx="${f2(Math.min(mh / 2, 40))}" fill="#fff" filter="url(#fe)"/></mask>` +
    `</defs>${g}${layer(amb, ambA)}${layer(str, strA)}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* A registration target for the debug mode (`?lg=reg`): a crisp grid in the title
   box. Painted on the page and inside the filter, the two copies must coincide. */
export function gridURI(kind = 'title') {
  const [w, h] = BOX[kind];
  let lines = '';
  for (let x = 0; x <= w; x += w / 20) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`;
  for (let y = 0; y <= h; y += h / 10) lines += `<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
    `<g stroke="#f0f" stroke-width="0.6" fill="none">${lines}</g>` +
    `<circle cx="${w / 2}" cy="${h / 2}" r="${h * 0.3}" stroke="#0af" stroke-width="0.8" fill="none"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
