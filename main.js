/* Katérina Vinciguerra — site interactions
   1. entrance of the name and reveal-on-scroll
   2. the figure: a line-drawn street. A self-driving car cruises; behind a building,
      a humanoid robot walks and its footsteps send sound waves around the corner.
      The car hears them, slows down, and only then sees the robot step out and greet it.
*/
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. entrance + reveal ---------- */
  function loaded() { requestAnimationFrame(function () { root.classList.add('is-loaded'); }); }
  if (document.fonts && document.fonts.ready) {
    var fallback = setTimeout(loaded, 1200);
    document.fonts.ready.then(function () { clearTimeout(fallback); loaded(); });
  } else { loaded(); }

  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- layout mode: one long page, or separate pages ---------- */
  var mode = root.getAttribute('data-mode');
  var PAGES = ['about', 'collaborations', 'competitions'];
  var TITLES = {
    about: 'Katérina Vinciguerra',
    collaborations: 'Collaborations — Katérina Vinciguerra',
    competitions: 'Competitions of 2026 — Katérina Vinciguerra'
  };
  if (mode === 'pages') {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var markNav = function (id) {
      document.querySelectorAll('.masthead nav a').forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      document.title = TITLES[id];
    };
    var replay = function (page) {
      var els = page.querySelectorAll('.reveal');
      els.forEach(function (el) { el.classList.remove('is-in'); });
      void page.offsetWidth;
      els.forEach(function (el, i) {
        if (reduceMotion) el.classList.add('is-in');
        else setTimeout(function () { el.classList.add('is-in'); }, 60 + Math.min(i, 6) * 90);
      });
      if (page.id === 'about' && !reduceMotion) {
        root.classList.remove('is-loaded'); void page.offsetWidth;
        requestAnimationFrame(function () { root.classList.add('is-loaded'); });
      }
    };
    var show = function (id, push) {
      if (PAGES.indexOf(id) < 0) id = 'about';
      var cur = root.getAttribute('data-page');
      if (push) history.pushState(null, '', id === 'about' ? location.pathname + location.search : '#' + id);
      if (id === cur) { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
      var curEl = document.getElementById(cur);
      var swap = function () {
        if (curEl) curEl.classList.remove('is-leaving');
        root.setAttribute('data-page', id);
        window.scrollTo(0, 0);
        markNav(id);
        replay(document.getElementById(id));
        window.dispatchEvent(new Event('resize'));       // lets the figure re-measure itself
      };
      if (reduceMotion || !curEl) swap();
      else { curEl.classList.add('is-leaving'); setTimeout(swap, 380); }
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (PAGES.indexOf(id) > -1) { e.preventDefault(); show(id, true); }
    });
    window.addEventListener('popstate', function () { show(location.hash.slice(1), false); });
    markNav(root.getAttribute('data-page'));
    window.scrollTo(0, 0);
    window.addEventListener('load', function () { setTimeout(function () { window.scrollTo(0, 0); }, 0); });
  }

  /* ---------- 2. the figure ---------- */
  var canvas = document.getElementById('scene');
  if (!canvas || !canvas.getContext || typeof Path2D === 'undefined') return;
  var ctx = canvas.getContext('2d');

  var C = { gold: '#A8874E', ink: '#1C1A17', ivory: '#F8F4EA' };
  (function readColors() {
    var cs = getComputedStyle(root);
    ['gold', 'ink', 'ivory'].forEach(function (k) {
      var v = cs.getPropertyValue('--' + k).trim();
      if (v) C[k] = v;
    });
  })();

  var LOOP = 14;                 // seconds for one little film
  var W, H, dpr, G;              // canvas size, ground line
  var P = {};                    // scene parameters (depend on size)
  var steps = [];                // footsteps: { t, wx } and when their wave reaches the car

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rgba(hex, a) {
    var h = hex.replace('#', '');
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }

  /* An original, low mid-engine coupé in profile, drawn in units (length 100, ground at y = 0). */
  var CAR = {
    body: new Path2D('M98.6 -3.4 C100.4 -4.2 100.9 -5.4 100.2 -6.5 C96 -9 91 -16.5 84 -19.2 C80.5 -20.2 76 -19.8 72 -18.6 C66 -21 59 -24.2 51 -25 C45 -25.6 39 -25.2 34 -24.2 C29 -23 24 -21.6 20 -21 C14 -20.3 7 -19.4 2 -18.6 C1 -15 0.6 -11 1 -7.8 L2.8 -4.4 L10.83 -4.4 A10 10 0 1 1 29.17 -4.4 L68.83 -4.4 A10 10 0 1 1 87.17 -4.4 L94.5 -3.6 Z'),
    glass: new Path2D('M70.5 -19.2 C65 -21.4 58 -23.6 51 -24.2 C45.5 -24.7 40 -24.3 35.5 -23.4 C31 -22.4 27.5 -21.4 25 -20.7 C40 -19.8 56 -19.3 70.5 -19.2 Z'),
    lines: new Path2D('M97 -8 C85 -11 70 -12.6 50 -13.2 C35 -13.6 18 -14.4 3 -15.5 M42 -13.4 C38 -12 35 -9 34 -6 M67 -19 C65.5 -14 65 -9.5 66 -5 M69.2 -19.8 C70.2 -21.2 72.6 -21.2 73.3 -19.8'),
    lamp: new Path2D('M91 -13.8 C94 -11.8 97 -9.2 99 -7.4 M1.3 -16 L8 -17.4'),
    lidar: new Path2D('M45.4 -25.4 A2.6 2.6 0 0 1 50.6 -25.4 Z'),
    wheels: [20, 78], wr: 8.4,
    mic: [48, -26.9], cam: [57, -24]
  };

  function layout() {
    W = Math.max(240, Math.round(canvas.getBoundingClientRect().width));
    H = Math.round(W * 0.75);
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    G = H * 0.8;

    P.carX = W * 0.05;
    P.s = W * 0.46 / 100;                       // px per car unit
    P.v0 = W * 0.13;                            // cruising speed (px/s)
    P.t1 = 2.2; P.t2 = 5.0;                     // start braking, stopped
    P.Dend = P.v0 * (P.t1 + (P.t2 - P.t1) / 2);
    P.bld = W * 0.79 + P.Dend;                  // building corner, world x
    P.top = H * 0.07;
    P.Hr = W * 0.245;                             // robot height
    P.vr = W * 0.072;                           // walking speed
    P.ws = 0.4;                                 // starts walking
    P.rx0 = P.bld + W * 0.16;                   // hidden behind the building
    P.rx1 = P.bld - W * 0.12;                   // where it stops, in the open
    P.we = P.ws + (P.rx0 - P.rx1) / P.vr;       // stops walking
    P.stride = P.Hr * 0.7;
    P.c = W * 0.32;                             // speed of sound (of the drawing!)
    P.rmax = W * 0.78;

    // footsteps and when each wavefront reaches the car's microphones
    steps = [];
    var mx = P.carX + CAR.mic[0] * P.s, my = G + CAR.mic[1] * P.s;
    for (var k = 0; ; k++) {
      var walked = P.stride * (0.25 + 0.5 * k);
      var t = P.ws + walked / P.vr;
      if (t > P.we - 0.05) break;
      var wx = P.rx0 - walked - 0.1 * P.Hr;
      var hit = null;
      for (var u = t; u < t + P.rmax / P.c; u += 0.01) {
        var d = Math.hypot(wx - D(u) - mx, G - my);
        if (P.c * (u - t) >= d) { hit = u; break; }
      }
      steps.push({ t: t, wx: wx, hit: hit });
    }
  }

  // distance the car has travelled at time t (cruise, then brake smoothly)
  function D(t) {
    if (t < P.t1) return P.v0 * t;
    if (t < P.t2) { var u = t - P.t1, d = P.t2 - P.t1; return P.v0 * P.t1 + P.v0 * (u - u * u / (2 * d)); }
    return P.Dend;
  }

  /* ---------- drawing helpers ---------- */
  function capsule(ax, ay, bx, by, r) {
    var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-6;
    var nx = -dy / len * r, ny = dx / len * r, a = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(ax + nx, ay + ny);
    ctx.lineTo(bx + nx, by + ny);
    ctx.arc(bx, by, r, a + Math.PI / 2, a - Math.PI / 2, true);
    ctx.lineTo(ax - nx, ay - ny);
    ctx.arc(ax, ay, r, a - Math.PI / 2, a + Math.PI / 2, true);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  function drawRobot(rx, phi, amp, greet, t) {
    var Hr = P.Hr, f = -1;                                  // facing left, toward the car
    function X(x) { return rx + f * x * Hr; }
    function Y(y) { return G - y * Hr; }
    var hipY = 0.53 + 0.008 * amp * Math.cos(2 * phi);

    function leg(p, alpha) {
      var th = amp * 0.36 * Math.sin(p);
      var bend = 0.1 + amp * 0.62 * Math.max(0, Math.cos(p));
      var kx = 0.25 * Math.sin(th), ky = hipY - 0.25 * Math.cos(th);
      var sa = th - bend;
      var ax = kx + 0.25 * Math.sin(sa), ay = ky - 0.25 * Math.cos(sa);
      ctx.strokeStyle = rgba(C.ink, alpha);
      capsule(X(0), Y(hipY), X(kx), Y(ky), 0.034 * Hr);
      capsule(X(kx), Y(ky), X(ax), Y(ay), 0.027 * Hr);
      capsule(X(ax - 0.014), Y(ay - 0.012), X(ax + 0.07), Y(ay - 0.017), 0.014 * Hr);
      ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.arc(X(kx), Y(ky), 0.009 * Hr, 0, 7); ctx.fill();
      ctx.fillStyle = C.ivory;
    }
    function arm(p, alpha, g) {
      var ua = amp * 0.3 * Math.sin(p) + 0.05;
      var fa = ua + 0.2 + 0.1 * amp;
      if (g > 0) {
        ua = lerp(ua, 2.35, g);
        fa = lerp(fa, 2.35 + 0.5 + 0.3 * Math.sin(t * Math.PI * 3.2), g);
      }
      var sx = -0.005, sy = 0.822;
      var ex = sx + 0.165 * Math.sin(ua), ey = sy - 0.165 * Math.cos(ua);
      var wx = ex + 0.15 * Math.sin(fa), wy = ey - 0.15 * Math.cos(fa);
      ctx.strokeStyle = rgba(C.ink, alpha);
      capsule(X(sx), Y(sy), X(ex), Y(ey), 0.026 * Hr);
      capsule(X(ex), Y(ey), X(wx), Y(wy), 0.021 * Hr);
      ctx.beginPath(); ctx.arc(X(wx + 0.012 * Math.sin(fa)), Y(wy - 0.012 * Math.cos(fa)), 0.02 * Hr, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.arc(X(ex), Y(ey), 0.008 * Hr, 0, 7); ctx.fill();
      ctx.fillStyle = C.ivory;
    }

    ctx.lineWidth = 1;
    ctx.fillStyle = C.ivory;
    // far side first, lighter
    arm(phi, 0.45, 0);
    leg(phi + Math.PI, 0.45);

    // pelvis + torso
    ctx.strokeStyle = rgba(C.ink, 0.95);
    ctx.beginPath(); ctx.ellipse(X(0), Y(0.535), 0.062 * Hr, 0.042 * Hr, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(-0.058), Y(0.57));
    ctx.quadraticCurveTo(X(-0.085), Y(0.72), X(-0.055), Y(0.838));
    ctx.quadraticCurveTo(X(-0.012), Y(0.876), X(0.04), Y(0.85));
    ctx.quadraticCurveTo(X(0.098), Y(0.78), X(0.068), Y(0.675));
    ctx.quadraticCurveTo(X(0.046), Y(0.62), X(0.055), Y(0.57));
    ctx.quadraticCurveTo(X(0), Y(0.54), X(-0.058), Y(0.57));
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.beginPath(); ctx.arc(X(0.026), Y(0.752), 0.015 * Hr, 0, 7); ctx.stroke();       // core
    ctx.strokeStyle = rgba(C.ink, 0.35);
    ctx.beginPath(); ctx.moveTo(X(-0.05), Y(0.645)); ctx.quadraticCurveTo(X(0.005), Y(0.628), X(0.058), Y(0.645)); ctx.stroke();

    // neck + head
    ctx.strokeStyle = rgba(C.ink, 0.95);
    capsule(X(0.002), Y(0.85), X(0.006), Y(0.888), 0.017 * Hr);
    ctx.beginPath(); ctx.ellipse(X(0.012), Y(0.942), 0.05 * Hr, 0.062 * Hr, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6;                                     // visor
    ctx.beginPath(); ctx.ellipse(X(0.014), Y(0.947), 0.042 * Hr, 0.033 * Hr, 0, Math.PI - 0.35, Math.PI + 0.75); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(C.ink, 0.6);                              // ear: a microphone
    ctx.beginPath(); ctx.arc(X(-0.008), Y(0.937), 0.012 * Hr, 0, 7); ctx.stroke();

    // near side
    leg(phi, 0.95);
    arm(phi + Math.PI, 0.95, greet);
  }

  function drawBuilding(bx) {
    var top = P.top, w = W - bx + 20;
    if (bx > W + 10) return;
    ctx.fillStyle = C.ivory;
    ctx.fillRect(bx, top, w, G - top);
    // engraved hatching
    ctx.strokeStyle = rgba(C.gold, 0.24); ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (var x = bx + 9; x < W; x += 5) { ctx.moveTo(x, top + 9); ctx.lineTo(x, G); }
    ctx.stroke();
    // windows
    var ww = W * 0.075, wh = H * 0.11;
    for (var cx = bx + W * 0.055; cx < W; cx += W * 0.14) {
      for (var y = top + H * 0.075; y + wh < G - H * 0.24; y += H * 0.165) {
        ctx.fillStyle = C.ivory; ctx.fillRect(cx, y, ww, wh);
        ctx.strokeStyle = rgba(C.gold, 0.9); ctx.lineWidth = 0.9; ctx.strokeRect(cx, y, ww, wh);
        ctx.strokeStyle = rgba(C.gold, 0.5); ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(cx + ww / 2, y); ctx.lineTo(cx + ww / 2, y + wh); ctx.moveTo(cx, y + wh * 0.38); ctx.lineTo(cx + ww, y + wh * 0.38); ctx.stroke();
        ctx.strokeStyle = rgba(C.ink, 0.5); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx - 3, y + wh + 2.5); ctx.lineTo(cx + ww + 3, y + wh + 2.5); ctx.stroke();
      }
    }
    // an arched doorway
    var dx = bx + W * 0.062, dw = W * 0.09, dh = H * 0.17, r = dw / 2;
    ctx.beginPath();
    ctx.moveTo(dx, G); ctx.lineTo(dx, G - dh + r); ctx.arc(dx + r, G - dh + r, r, Math.PI, 0); ctx.lineTo(dx + dw, G);
    ctx.fillStyle = C.ivory; ctx.fill();
    ctx.strokeStyle = rgba(C.gold, 0.9); ctx.lineWidth = 0.9; ctx.stroke();
    // cornice and corner
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx - 7, top); ctx.lineTo(W, top);
    ctx.moveTo(bx, top); ctx.lineTo(bx, G);
    ctx.stroke();
    ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - 3, top + 5); ctx.lineTo(W, top + 5);
    ctx.moveTo(bx + 4.5, top + 5); ctx.lineTo(bx + 4.5, G);
    ctx.stroke();
  }

  function drawCar(dist) {
    var s = P.s;
    ctx.save();
    ctx.translate(P.carX, G);
    // engraved shadow
    ctx.strokeStyle = rgba(C.ink, 0.16); ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(6 * s, 2); ctx.lineTo(94 * s, 2);
    ctx.moveTo(14 * s, 4.5); ctx.lineTo(86 * s, 4.5);
    ctx.moveTo(26 * s, 7); ctx.lineTo(74 * s, 7);
    ctx.stroke();

    ctx.scale(s, s);
    var hair = 1 / s;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = C.ivory; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1 * hair;
    ctx.fill(CAR.body); ctx.stroke(CAR.body);
    ctx.fillStyle = rgba(C.gold, 0.1); ctx.fill(CAR.glass);
    ctx.lineWidth = 0.9 * hair; ctx.stroke(CAR.glass);
    ctx.strokeStyle = rgba(C.ink, 0.5); ctx.lineWidth = 0.8 * hair; ctx.stroke(CAR.lines);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.8 * hair; ctx.stroke(CAR.lamp);
    ctx.fillStyle = C.ivory; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.9 * hair;
    ctx.fill(CAR.lidar); ctx.stroke(CAR.lidar);
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(CAR.mic[0], CAR.mic[1] + 1.2, 0.6, 0, 7); ctx.fill();

    // wheels
    var rot = dist / (CAR.wr * s);
    CAR.wheels.forEach(function (cx) {
      var cy = -CAR.wr;
      ctx.fillStyle = C.ivory; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.1 * hair;
      ctx.beginPath(); ctx.arc(cx, cy, CAR.wr, 0, 7); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.8 * hair; ctx.strokeStyle = rgba(C.ink, 0.8);
      ctx.beginPath(); ctx.arc(cx, cy, 6.2, 0, 7); ctx.stroke();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2.4 * hair;                    // caliper
      ctx.beginPath(); ctx.arc(cx, cy, 4.6, -2.5, -1.55); ctx.stroke();
      ctx.strokeStyle = rgba(C.ink, 0.75); ctx.lineWidth = 0.7 * hair;
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        var a = rot + i * Math.PI * 2 / 5;
        for (var j = -1; j <= 1; j += 2) {
          var b = a + j * 0.1;
          ctx.moveTo(cx + Math.cos(b) * 1.7, cy + Math.sin(b) * 1.7);
          ctx.lineTo(cx + Math.cos(b) * 6.0, cy + Math.sin(b) * 6.0);
        }
      }
      ctx.stroke();
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(cx, cy, 1.2, 0, 7); ctx.fill();
    });
    ctx.restore();
  }

  /* ---------- one frame at time t (seconds into the loop) ---------- */
  function frame(t) {
    var dist = D(t);
    var fade = smooth(0, 0.7, t) * (1 - smooth(LOOP - 1.4, LOOP - 0.1, t));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = fade;

    // the street
    ctx.strokeStyle = rgba(C.ink, 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, G + 0.5); ctx.lineTo(W, G + 0.5); ctx.stroke();
    ctx.strokeStyle = rgba(C.ink, 0.16);
    ctx.beginPath(); ctx.moveTo(0, G + H * 0.12); ctx.lineTo(W, G + H * 0.12); ctx.stroke();
    var gap = W * 0.075, off = dist % gap;
    ctx.strokeStyle = rgba(C.gold, 0.75); ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var x = -off; x < W; x += gap) { ctx.moveTo(x, G + H * 0.06); ctx.lineTo(x + gap * 0.42, G + H * 0.06); }
    ctx.stroke();

    // street lamps in the distance
    ctx.strokeStyle = rgba(C.ink, 0.22); ctx.lineWidth = 0.8;
    for (var k = 0; k < 6; k++) {
      var lx = W * 0.22 + k * W * 0.52 - dist;
      if (lx < -30 || lx > W + 30) continue;
      var lt = G - H * 0.5;
      ctx.beginPath();
      ctx.moveTo(lx, G); ctx.lineTo(lx, lt);
      ctx.quadraticCurveTo(lx, lt - 12, lx + 14, lt - 10);
      ctx.moveTo(lx + 9, lt - 9); ctx.lineTo(lx + 19, lt - 9);
      ctx.stroke();
    }

    var bx = P.bld - dist;

    // footstep waves, travelling around the corner (never through the building)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, G);
    ctx.rect(bx, P.top, W - bx + 20, G - P.top);
    ctx.clip('evenodd');
    ctx.lineWidth = 1;
    steps.forEach(function (st) {
      var age = t - st.t;
      if (age <= 0) return;
      var r = age * P.c;
      if (r > P.rmax) return;
      var a = 0.75 * Math.pow(1 - r / P.rmax, 1.3);
      var cx = st.wx - dist;
      for (var e = 0; e < 3; e++) {                       // three thin echoes per step
        var rr = r - e * W * 0.018;
        if (rr <= 1) continue;
        ctx.strokeStyle = rgba(C.gold, (a * (1 - e * 0.3)).toFixed(3));
        ctx.beginPath(); ctx.arc(cx, G, rr, Math.PI, Math.PI * 2); ctx.stroke();
      }
    });
    ctx.restore();

    // the robot (behind the building until it steps out)
    var walked = clamp((t - P.ws) * P.vr, 0, P.rx0 - P.rx1);
    var rxw = P.rx0 - walked;
    var amp = smooth(P.ws, P.ws + 0.35, t) * (1 - smooth(P.we - 0.35, P.we, t));
    var phi = walked / P.stride * Math.PI * 2;
    var greet = smooth(5.3, 6.0, t) * (1 - smooth(9.4, 10.2, t));
    var rx = rxw - dist;
    drawRobot(rx, phi, amp, greet, t);

    drawBuilding(bx);
    drawCar(dist);

    // the car's microphones light up when a wavefront arrives
    var mx = P.carX + CAR.mic[0] * P.s, my = G + CAR.mic[1] * P.s;
    steps.forEach(function (st) {
      if (st.hit === null) return;
      var age = t - st.hit;
      if (age < 0 || age > 0.9) return;
      ctx.strokeStyle = rgba(C.gold, (0.9 * (1 - age / 0.9)).toFixed(3));
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, my, 3 + age * 26, 0, 7); ctx.stroke();
    });

    // ... and the cameras only see the robot once it has stepped out
    var Hr = P.Hr;
    var xl = rx - 0.18 * Hr, xr = rx + 0.14 * Hr;
    var yt = G - (1.05 + 0.18 * greet) * Hr, yb = G + 2;
    var seen = smooth(0.35, 1, (bx - xl) / (xr - xl));
    if (seen > 0) {
      var cxm = P.carX + CAR.cam[0] * P.s, cym = G + CAR.cam[1] * P.s;
      ctx.globalAlpha = fade * seen;
      ctx.fillStyle = rgba(C.gold, 0.06);
      ctx.beginPath(); ctx.moveTo(cxm, cym); ctx.lineTo(xl, yt); ctx.lineTo(xl, yb); ctx.closePath(); ctx.fill();
      ctx.setLineDash([2, 4]); ctx.strokeStyle = rgba(C.gold, 0.8); ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(cxm, cym); ctx.lineTo(xl, yt); ctx.moveTo(cxm, cym); ctx.lineTo(xl, yb); ctx.stroke();
      ctx.setLineDash([]);
      var c = Hr * 0.09;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xl, yt + c); ctx.lineTo(xl, yt); ctx.lineTo(xl + c, yt);
      ctx.moveTo(xr - c, yt); ctx.lineTo(xr, yt); ctx.lineTo(xr, yt + c);
      ctx.moveTo(xl, yb - c); ctx.lineTo(xl, yb); ctx.lineTo(xl + c, yb);
      ctx.moveTo(xr - c, yb); ctx.lineTo(xr, yb); ctx.lineTo(xr, yb - c);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- run ---------- */
  var start = performance.now(), running = false, visible = true, raf = 0;
  function loop(now) {
    frame(((now - start) / 1000) % LOOP);
    raf = requestAnimationFrame(loop);
  }
  function play() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true; raf = requestAnimationFrame(loop);
  }
  function pause() { running = false; cancelAnimationFrame(raf); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? play() : pause();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { layout(); if (!running) frame(reduceMotion ? 6.2 : ((performance.now() - start) / 1000) % LOOP); }, 120);
  });

  layout();
  frame(reduceMotion ? 6.2 : 0);   // with reduced motion: one still frame, the robot greeting the car
  play();

})();
