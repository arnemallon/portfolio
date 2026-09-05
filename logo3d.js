/* The logo, as a slab of glass beside the name. static/logo.svg is extruded with a
   bevel (so the edges have something to catch) and lit by a neutral room
   environment plus a key and a rim, tuned to the same optic as the name's
   liquid glass (glass/filters.js, title-dark): a body barely lighter than the
   page, a thin rim keyed from the top-left, a soft lens band inside the edge.
   The name's body is not see-through either: its dark material bakes the page
   ground in. So the logo is an opaque body at that same ground-plus-tint, and
   Fresnel on a wide rounded bevel is the rim and the band. (Transmission was
   tried and rejected: over a transparent canvas three.js clears its
   transmission buffer to white, so a clear body reads as silver whatever is
   behind the page.) Drag to turn it; let go and it spins home — one round in
   the direction it was dragged, never back the way it came. A click spins it
   once.

   While it spins, the name's own key light spins with it — one turn of the
   logo is one turn of the rim highlight on "Arne Mallon" (glass-runtime.js's
   window.__glassLight, its yaw read straight off logo.rotation.y).

   Layout contract (style.css): the host is a fixed corner mark, sized on its
   own; its aspect is set here from the extruded mark so the front face fills
   it exactly. The canvas is a square around the host big enough for the
   logo's bounding sphere at the nearest it can come to the camera, so no
   orientation is ever clipped; it is transparent and takes no pointer
   events — the host does.

   The scene pieces are exported for tools/favicon.html, which renders the same
   glass to the site icon. */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const DRAG = 0.0085;           // radians per CSS px of drag
const TILT_MAX = Math.PI / 3;  // the pitch stays readable
const SPRING = 34;             // the return home: stiffness, 1/s²
const OMEGA = Math.sqrt(SPRING);
const DAMPING = 2 * OMEGA;     // critically damped — it settles, it does not wobble
const TAU = Math.PI * 2;
export const K = 3;            // camera distance in bounding-sphere radii: the perspective strength
const PAD = 1.06;              // canvas margin beyond the worst-case silhouette

/* ---- the scene, shared with the favicon renderer ------------------------------ */

export function makeRenderer(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', ...opts });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export function makeScene(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-2.5, 3, 4);                 // top-left, like the glass headings
  const rim = new THREE.DirectionalLight(0xf2f4ff, 0.7);
  rim.position.set(3, -1.5, -3);
  scene.add(key, rim);
  return scene;
}

export function makeMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x171717,          // the page ground under the name's 8 % white tint
    metalness: 0,
    roughness: 0.08,          // crisp, like the 1 px rim on the type
    ior: 1.5,                 // F0 ≈ 4 %: flat faces stay near the page, grazing angles light up
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 0.6,
    specularIntensity: 1
  });
}

/** the extruded mark, centred on the origin: { logo, size, R } */
export async function loadLogo(url) {
  const data = await new SVGLoader().loadAsync(url);
  const material = makeMaterial();
  // a wide, well-rounded bevel is the lens band: the highlight decays across it
  const extrude = { depth: 8, bevelEnabled: true, bevelThickness: 1.7, bevelSize: 1.6, bevelSegments: 6, curveSegments: 28 };
  const inner = new THREE.Group();
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      inner.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extrude), material));
    }
  }
  inner.scale.y = -1;                           // SVG y runs down
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  inner.position.sub(box.getCenter(new THREE.Vector3()));
  const logo = new THREE.Group();
  logo.add(inner);
  return { logo, size, R: size.length() / 2 };
}

/* ---- the page ----------------------------------------------------------------- */

const host = document.querySelector('.logo-3d');
if (host) init(host).catch((err) => { console.warn('[logo3d]', err); host.remove(); });

async function init(host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);

  const renderer = makeRenderer(canvas);
  const scene = makeScene(renderer);
  const { logo, size, R } = await loadLogo('static/logo.svg');
  scene.add(logo);
  host.style.aspectRatio = `${size.x} / ${size.y}`;   // the front face fills the host exactly

  /* ---- fit -------------------------------------------------------------------
     Camera at K radii. The nearest the sphere can come is R closer, magnified
     by K/(K-1); the canvas is a square of that silhouette plus a margin, and
     the fov is whatever makes that square the frustum at the front face — so
     the host, the central patch, shows the front face at exactly its size. */
  const dist = K * R;
  const need = 2 * R * (K / (K - 1)) * PAD;   // world units across the canvas at the front face
  const camera = new THREE.PerspectiveCamera(2 * THREE.MathUtils.radToDeg(Math.atan(need / 2 / dist)), 1, 0.1, 2000);
  camera.position.set(0, 0, size.z / 2 + dist);
  camera.updateProjectionMatrix();

  function fit() {
    const hw = host.clientWidth, hh = host.clientHeight;
    if (!hw || !hh) return;
    const s = Math.min(hw / size.x, hh / size.y);   // CSS px per world unit at the front face
    const c = Math.round(need * s);
    canvas.style.width = canvas.style.height = c + 'px';
    canvas.style.left = (hw - c) / 2 + 'px';
    canvas.style.top = (hh - c) / 2 + 'px';
    renderer.setSize(c, c, false);
    render();
  }
  function render() {
    renderer.render(scene, camera);
    // the name's rim light turns with the logo's yaw — same angle, no lag of
    // its own beyond glass-runtime.js's own easing loop (setAngle just aims it)
    const gl = window.__glassLight;
    if (gl) gl.setAngle(gl.baseAngle + logo.rotation.y);
  }
  new ResizeObserver(fit).observe(host);
  fit();

  /* ---- drag to turn; let go and it spins home ------------------------------
     A critically damped spring carries the release velocity into the return.
     The yaw target is the next full turn AHEAD in the drag direction — chosen
     far enough that a fling never has to reverse: with D ≥ v/ω a critically
     damped spring approaches without crossing, so a hard fling simply adds
     whole turns. A click, with nothing to finish, gets one turn. Pitch returns
     to level. */

  let dragging = false;
  let lx = 0, ly = 0, lt = 0;
  let vx = 0, vy = 0;   // angular velocity, radians per second
  let net = 0;          // yaw over this gesture: its sign is the drag direction
  let ty = 0;           // the yaw the spring pulls toward (pitch always to 0)
  let raf = 0, last = 0;

  function frame(t) {
    raf = 0;
    if (dragging) { render(); return; }
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60);
    last = t;
    const ex = logo.rotation.x;
    const ey = logo.rotation.y - ty;
    vx += (-SPRING * ex - DAMPING * vx) * dt;
    vy += (-SPRING * ey - DAMPING * vy) * dt;
    logo.rotation.x += vx * dt;
    logo.rotation.y += vy * dt;
    if (Math.abs(ex) + Math.abs(ey) < 0.002 && Math.abs(vx) + Math.abs(vy) < 0.02) { home(); return; }
    render();
    raf = requestAnimationFrame(frame);
  }
  function home() {
    logo.rotation.set(0, 0, 0);  // exactly, and the turn count with it
    vx = vy = 0;
    last = 0;
    render();
    if (window.__glassLight) window.__glassLight.held = false;  // hand the light back
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

  host.addEventListener('pointerdown', (e) => {
    dragging = true;
    try { host.setPointerCapture(e.pointerId); } catch (_) { /* a pointer already gone: fine */ }
    lx = e.clientX; ly = e.clientY; lt = e.timeStamp;
    vx = vy = 0;
    net = 0;
    host.classList.add('dragging');
    // claim the name's light for the whole gesture: this same pointermove also
    // reaches glass-runtime.js's window listener, and without the claim its
    // cursor-follow would fight setAngle over target every frame (see its
    // heldByLogo). Released in home(), once the spring actually settles there.
    if (window.__glassLight) window.__glassLight.held = true;
    kick();
  });
  host.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    const dt = Math.max(1, e.timeStamp - lt) / 1000;
    lx = e.clientX; ly = e.clientY; lt = e.timeStamp;
    const yaw = dx * DRAG;    // horizontal drag spins about the vertical axis
    const pitch = dy * DRAG;
    logo.rotation.y += yaw;
    logo.rotation.x = THREE.MathUtils.clamp(logo.rotation.x + pitch, -TILT_MAX, TILT_MAX);
    net += yaw;
    vy = 0.5 * vy + 0.5 * (yaw / dt);   // smoothed, so one jittery event does not set the fling
    vx = 0.5 * vx + 0.5 * (pitch / dt);
    kick();
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    host.classList.remove('dragging');
    if (e && e.timeStamp - lt > 80) vx = vy = 0;   // held still before letting go: no fling
    if (reduced.matches) { home(); return; }        // no spin for readers who asked for less motion
    const y = logo.rotation.y;
    // the drag direction; a click has none and turns forward
    const dir = Math.abs(vy) > 0.5 ? Math.sign(vy) : (Math.abs(net) > 1e-3 ? Math.sign(net) : 1);
    // where the fling alone would carry it, then the next full turn beyond
    const ahead = y + (Math.sign(vy) === dir ? vy / OMEGA : 0);
    const k = dir > 0 ? Math.ceil(ahead / TAU + 1e-6) : Math.floor(ahead / TAU - 1e-6);
    ty = k * TAU;
    kick();
  };
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);
  host.addEventListener('lostpointercapture', release);
}
