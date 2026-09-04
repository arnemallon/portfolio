/* The key light on the glass heading — the little that CSS cannot do.
   Ported from PrepTools (OptiverPrep src/lib/glass/glass.js), minus the Svelte
   deps and the parts a one-heading static page does not need.

   The whole effect is one attribute: the `values` of the `[result="lit"]`
   feColorMatrix inside the active filter, which reads the contour normal map and
   turns it into the rim key. Rewriting it moves the light.

   One easing loop owns that attribute. Inputs only ever set `target`:
     · the pointer, on fine pointers (desktop);
     · the device tilt, on phones (iOS gates the sensor behind a user gesture,
       so a one-shot listener asks on the first touch);
     · a 120° sweep on load, which drives `cur` directly and then hands back.

   The loop runs on requestAnimationFrame and stops as soon as it settles, so the
   light is frame-locked to the display while moving and costs nothing at rest.
   Upstream throttles to 15 Hz because it may light several headings; there is one
   here, so it can afford the frame rate — but the easing is written against the
   same 15 Hz time constant, so the feel matches.

   Everything is skipped under prefers-reduced-motion: the light stays on the
   static top-left key the filters were built with. */
(function () {
  'use strict';

  var KEY = { x: -0.707, y: -0.707 };   // top-left, as baked by filters.js
  var MIX = 0.55;                       // how far the key follows the input
  var EASE = 0.35;                      // approach per step at REF_HZ
  var REF_HZ = 15;                      // the rate EASE is tuned against (upstream's)
  var NEAR_PX = 240;                    // pointer this close (or a heading width) lights it
  var SETTLED = 0.0004;                 // below this the loop stops and snaps to target
  var INTRO_MS = 1900;
  var INTRO_ARC = (Math.PI * 2) / 3;    // 120°: the light swings in, it does not orbit

  var head = document.querySelector('[data-lg]');
  if (!head) return;

  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var small = matchMedia('(max-width: 472px)');
  var fine = matchMedia('(pointer: fine)');

  var f3 = function (n) { return Math.round(n * 1000) / 1000; };

  /* filters.js's litValues: alpha = 0.5 − L · (n − 0.5), read off the normal map */
  function litValues(L) {
    var c = f3(0.5 + 0.5 * (L.x + L.y));
    return '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ' + f3(-L.x) + ' ' + f3(-L.y) + ' 0 0 ' + c;
  }

  /* only the bucket the media query actually references is worth relighting */
  var node = null;
  var nodeSmall = null;
  function litNode() {
    var isSmall = small.matches;
    if (!node || nodeSmall !== isSmall) {
      nodeSmall = isSmall;
      node = document.querySelector('#lg-title-dark-' + (isSmall ? 's' : 'l') + ' [result="lit"]');
    }
    return node;
  }

  /* ---- the one writer ------------------------------------------------------- */

  var cur = { x: KEY.x, y: KEY.y };
  var target = { x: KEY.x, y: KEY.y };
  var raf = 0;
  var lastT = 0;
  var sweeping = false;

  /* unconditional: a dropped write would strand `cur` and the easing would stall */
  function write(x, y) {
    var n = Math.hypot(x, y) || 1;
    cur.x = x / n;
    cur.y = y / n;
    var el = litNode();
    if (el) el.setAttribute('values', litValues(cur));
  }

  function loop(t) {
    raf = 0;
    if (reduced.matches) { target.x = KEY.x; target.y = KEY.y; write(KEY.x, KEY.y); lastT = 0; return; }
    var dt = lastT ? Math.min(100, t - lastT) : 1000 / 60;
    lastT = t;
    // frame-rate independent: the same time constant whatever the display does
    var a = 1 - Math.pow(1 - EASE, dt / (1000 / REF_HZ));
    var nx = cur.x + (target.x - cur.x) * a;
    var ny = cur.y + (target.y - cur.y) * a;
    var moved = Math.abs(nx - cur.x) + Math.abs(ny - cur.y) > SETTLED;
    if (moved) {
      write(nx, ny);
      raf = requestAnimationFrame(loop);
    } else {
      write(target.x, target.y); // land exactly, then stop asking for frames
      lastT = 0;
    }
  }

  function kick() {
    if (!raf && !sweeping) { lastT = 0; raf = requestAnimationFrame(loop); }
  }

  /** aim the light along a unit direction, blended with the static key */
  function aim(x, y) {
    var tx = KEY.x * (1 - MIX) + x * MIX;
    var ty = KEY.y * (1 - MIX) + y * MIX;
    var n = Math.hypot(tx, ty) || 1;
    target.x = tx / n;
    target.y = ty / n;
    kick();
  }
  function aimRest() { target.x = KEY.x; target.y = KEY.y; kick(); }

  /* ---- the load sweep: a 120° arc, ending on the static key ------------------ */

  function sweep(done) {
    if (reduced.matches) { write(KEY.x, KEY.y); done(); return; }
    // a hidden tab pauses rAF, so the clock cannot start at call time: it would
    // run out while paused and the sweep would be skipped the moment the reader
    // switches to the page. Wait for visible, then take t0 from the first frame.
    if (document.visibilityState !== 'visible') {
      document.addEventListener('visibilitychange', function once() {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', once);
        sweep(done);
      });
      return;
    }
    sweeping = true;
    var t0 = 0;
    var a0 = Math.atan2(KEY.y, KEY.x);
    requestAnimationFrame(function frame(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / INTRO_MS);
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      var a = a0 + INTRO_ARC * (1 - e); // starts 120° off the key, swings onto it
      write(Math.cos(a), Math.sin(a));
      if (k < 1) requestAnimationFrame(frame);
      else { write(KEY.x, KEY.y); sweeping = false; done(); }
    });
  }

  /* ---- pointer: the rect is read here, never in the loop --------------------- */

  function trackPointer() {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (!fine.matches || reduced.matches) return;
      var r = head.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy) || 1;
      if (d < Math.max(r.width, NEAR_PX)) aim(dx / d, dy / d);
      else aimRest();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', aimRest);
  }

  /* ---- device tilt ---------------------------------------------------------- */

  var NEUTRAL_BETA = 45; // a phone held at a comfortable reading angle
  var SPAN = 45;         // degrees of tilt that swing the light fully

  function onTilt(e) {
    if (reduced.matches || e.beta == null || e.gamma == null) return;
    var clamp = function (v) { return Math.max(-1, Math.min(1, v)); };
    // the light is fixed in the room: tilting the device right swings it left
    aim(-clamp(e.gamma / SPAN), -clamp((e.beta - NEUTRAL_BETA) / SPAN));
  }

  function trackTilt() {
    if (!('DeviceOrientationEvent' in window)) return;
    var DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function') {
      // iOS 13+: the sensor is gated behind a user gesture, so ask on the first tap
      window.addEventListener('touchend', function ask() {
        window.removeEventListener('touchend', ask);
        DOE.requestPermission().then(function (state) {
          if (state === 'granted') window.addEventListener('deviceorientation', onTilt);
        }).catch(function () {});
      }, { once: true });
    } else {
      window.addEventListener('deviceorientation', onTilt);
    }
  }

  /* ---- go -------------------------------------------------------------------- */

  function start() { trackPointer(); trackTilt(); }
  if (document.readyState === 'complete') sweep(start);
  else window.addEventListener('load', function () { sweep(start); });
})();
