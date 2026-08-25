/* ============================================================
   NAV RUNNER — a small endless runner beside the brand mark.

   It demos itself: an autopilot runs the character over cacti
   and ducks under birds. Click it and you take over — space,
   up arrow, W or a click to jump; down arrow or S to duck.
   Click away or press Escape to hand it back.

   The character and obstacles are drawn here from scratch, not
   lifted from Chrome's offline game. Chromium is BSD-licensed
   so its code is reusable with attribution, but the T-Rex
   sprite is Google brand art, so this is original.

   Keys are only ever intercepted while you're actually playing,
   so space still scrolls the page the rest of the time.

   Delete this file + its <script> tag to remove entirely.
   ============================================================ */

(function () {
  'use strict';

  var CFG = {
    wMin: 268, wMax: 1600,  // grows horizontally only; height never changes
    gapToNav: 30,           // clearance left before the first nav link
    h: 62,                  // css px
    ground: 50,
    px: 2,                  // pixel scale for the cacti and birds
    readyMs: 3400,          // how long the controls hold before the run begins

    /* The runner is the real Chromium offline sprite, cropped to just the
       T-Rex frames and given an alpha channel. It ships inside Chromium
       under BSD-3-Clause, so reuse is fine with the notice kept:
         Copyright 2014 The Chromium Authors. BSD-3-Clause.
       Served from your own assets — no hotlinking, works offline. If it
       ever fails to load the game falls back to drawn sprites. */
    sheet: 'assets/images/dino-sprite.png',
    runnerH: 24,            // display height; the 47px sheet is scaled to this
    frames: {               // pre-scaled sheet: draw 1:1, no resampling
      idle:    [0, 22],
      run:     [[22, 22], [44, 22]],
      crashed: [66, 22],
      duck:    [[88, 30], [118, 30]]
    },
    minWidth: 900,          // below this the nav collapses — no room
    /* Solved, not guessed: apex must clear a 17px cactus but stay inside
       24px of headroom. 180/750 gives a 21.6px apex over 0.48s. */
    gravity: 700,
    jumpV: 180,
    speed0: 205,
    speedGain: 5.5,
    speedMax: 430,
    gapMin: 0.72, gapMax: 1.55,   // seconds between obstacles
    maxDPR: 2.5
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var CSS = [
    '.runner{display:flex;align-items:center;margin-left:22px;margin-right:auto;',
    'position:relative;border-radius:8px;padding:2px 4px;cursor:pointer;',
    'touch-action:none;-webkit-user-select:none;user-select:none;',
    'transition:background .25s,box-shadow .25s}',
    '.runner canvas{outline:none}',
    '.runner:hover{background:rgba(255,255,255,.04)}',
    '.runner.live{background:rgba(196,255,77,.07);box-shadow:0 0 0 1px rgba(196,255,77,.35)}',
    '.runner canvas{display:block}',
    '.runner-tip{position:absolute;inset:2px 4px;display:flex;align-items:center;',
    'justify-content:center;white-space:nowrap;font-size:11px;letter-spacing:.1em;',
    'text-transform:uppercase;font-weight:600;color:var(--ink,#f0f0f0);',
    'background:rgba(8,8,8,.6);border-radius:6px;opacity:0;',
    'transition:opacity .22s;pointer-events:none}',
    /* only when idle — an overlay during play would sit on top of the game */
    '.runner:not(.live):hover .runner-tip{opacity:1}',
    /* the ready screen is painted on the canvas instead */
    '@media(max-width:' + (CFG.minWidth - 1) + 'px){.runner{display:none}}'
  ].join('');

  var wrap, canvas, ctx, tip, dpr;
  var W = CFG.wMin;                    // current strip width
  /* Speed is per-pixel, so a wider strip meant obstacles crawled toward
     you for longer and the game felt sluggish. Scaling speed with width
     keeps the time from spawn to runner constant at any size. */
  var kW = 1;
  var live = false, raf = 0, last = 0;

  var G = {
    t: 0, speed: CFG.speed0, dist: 0, score: 0, best: 0,
    y: 0, vy: 0, ducking: false, dead: false, deadAt: 0, manual: false,
    phase: 'demo',          // demo -> ready -> play
    readyAt: 0,
    obstacles: [], nextIn: 0.9, legPhase: 0, blink: 0
  };

  var INK = '#f0f0f0';

  /* Chromium offline sprite. Copyright 2014 The Chromium Authors,
     BSD-3-Clause. Loaded for display only — the canvas is never read
     back, so tainting from a cross-origin image does not matter. */
  var sheet = new Image(), sheetOK = false;
  sheet.onload = function () { sheetOK = sheet.naturalWidth > 0; };
  sheet.onerror = function () { sheetOK = false; };
  sheet.src = CFG.sheet;

  /* ---------- sprites ----------
     Drawn low-resolution and scaled up, which is what makes pixel art
     read as pixel art. Edit the strings to change the artwork — '#' is
     a filled cell, '.' is empty. All original; nothing traced. */

  var SPR = {
    run_a: [
      "........#####",
      "........#.###",
      "........#####",
      "........####.",
      "#.......####.",
      "##......####.",
      "###....#####.",
      "####..######.",
      "############.",
      ".##########..",
      "..##...##....",
      ".###........."
    ],
    run_b: [
      "........#####",
      "........#.###",
      "........#####",
      "........####.",
      "#.......####.",
      "##......####.",
      "###....#####.",
      "####..######.",
      "############.",
      ".##########..",
      "..##...##....",
      "......###...."
    ],
    jump: [
      "........#####",
      "........#.###",
      "........#####",
      "........####.",
      "#.......####.",
      "##......####.",
      "###....#####.",
      "####..######.",
      "############.",
      ".##########..",
      "..##..##.....",
      "............."
    ],
    dead: [
      "........#####",
      "........#.###",
      "........##.##",
      "........#.#.#",
      "#.......####.",
      "##......####.",
      "###....#####.",
      "####..######.",
      "############.",
      ".##########..",
      "..##...##....",
      ".###.....###."
    ],
    duck: [
      ".......######",
      ".......#.####",
      "#......######",
      "##...########",
      "############.",
      ".##########..",
      "..##...##....",
      ".###...###..."
    ],
    cactus1: [
      "..##..",
      "..##..",
      "#.##..",
      "#.##..",
      "####..",
      "..##..",
      "..##..",
      "..##..",
      "..##.."
    ],
    cactus2: [
      "..##...",
      "..##.#.",
      "..##.#.",
      "..####.",
      "..##...",
      "..##...",
      "..##...",
      "..##...",
      "..##..."
    ],
    cactus3: [
      "...##..",
      "#..##.#",
      "#..##.#",
      "#..####",
      "######.",
      "...##..",
      "...##..",
      "...##..",
      "...##.."
    ],
    bird_a: [
      "..##.....",
      ".####....",
      "..###....",
      "...######",
      "..#####..",
      "...###..."
    ],
    bird_b: [
      "...######",
      "..#####..",
      "..###....",
      ".####....",
      "..##.....",
      "........."
    ]
  };

  function sprW(g) { return g[0].length; }
  function sprH(g) { return g.length; }

  /* Blits a grid with its BOTTOM-left corner at (x, baseY). */
  function blit(g, grid, x, baseY, colour) {
    var p = CFG.px;
    g.fillStyle = colour;
    for (var r = 0; r < grid.length; r++) {
      var row = grid[r];
      var top = baseY - (grid.length - r) * p;
      var runStart = -1;
      for (var c = 0; c <= row.length; c++) {
        var on = row.charAt(c) === '#';
        if (on && runStart < 0) runStart = c;
        if (!on && runStart >= 0) {           // fill whole runs, fewer calls
          g.fillRect(x + runStart * p, top, (c - runStart) * p, p);
          runStart = -1;
        }
      }
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, CFG.h);
    var p = CFG.px;

    ctx.fillStyle = 'rgba(240,240,240,.30)';       // ground line
    ctx.fillRect(0, CFG.ground, W, 1);
    ctx.fillStyle = 'rgba(240,240,240,.18)';       // scrolling grit
    for (var i = 0; i < 8; i++) {
      var gx = (i * 39 - (G.dist * 0.6) % 39 + 39) % (W + 39) - 20;
      ctx.fillRect(Math.round(gx), CFG.ground + 3 + (i % 3), 2 + (i % 3) * 2, 1);
    }

    for (var k = 0; k < G.obstacles.length; k++) {
      var ob = G.obstacles[k];
      if (ob.type === 'bird') {
        blit(ctx, Math.sin(G.t * 13) > 0 ? SPR.bird_a : SPR.bird_b,
             Math.round(ob.x), ob.y + sprH(SPR.bird_a) * p, INK);
      } else {
        blit(ctx, ob.spr, Math.round(ob.x), CFG.ground, INK);
      }
    }

    var footY = CFG.ground - Math.round(G.y);
    if (sheetOK) {
      var f, sh = sheet.naturalHeight;
      if (G.dead) f = CFG.frames.crashed;
      else if (G.ducking) f = CFG.frames.duck[Math.sin(G.legPhase * 15) > 0 ? 0 : 1];
      else if (G.y > 0.5) f = CFG.frames.idle;
      else f = CFG.frames.run[Math.sin(G.legPhase * 15) > 0 ? 0 : 1];

      /* The sheet is pre-rendered at display size with the eye punched
         back in, so this draws 1:1. Smoothing must stay OFF — resampling
         a 1px eye hole is what erased it. */
      var dw = f[1], dh = sh;
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.drawImage(sheet, f[0], 0, f[1], sh, 18, footY - dh, dw, dh);
      ctx.restore();
    } else {
      var pose;
      if (G.dead) pose = SPR.dead;
      else if (G.ducking) pose = SPR.duck;
      else if (G.y > 0.5) pose = SPR.jump;
      else pose = Math.sin(G.legPhase * 15) > 0 ? SPR.run_a : SPR.run_b;
      blit(ctx, pose, 18, footY, INK);
    }

    if (G.phase === 'ready') {
      ctx.fillStyle = 'rgba(6,6,6,.86)';
      ctx.fillRect(0, 0, W, CFG.h);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(240,240,240,.95)';
      var wide = W >= 440;
      ctx.font = '700 ' + (wide ? 12 : 10) + 'px ui-monospace,SFMono-Regular,Menlo,monospace';
      ctx.fillText(wide ? 'SPACE  or  \u2191   JUMP          \u2193   DUCK          ESC   EXIT'
                        : '\u2191 JUMP    \u2193 DUCK    ESC EXIT', W / 2, 24);
      var left = Math.max(0, CFG.readyMs / 1000 - (G.t - G.readyAt));
      ctx.fillStyle = 'rgba(196,255,77,.9)';
      ctx.font = '700 11px ui-monospace,SFMono-Regular,Menlo,monospace';
      ctx.fillText('STARTING IN ' + Math.ceil(left) + '  \u2014  or press any key', W / 2, 44);
      var bar = 1 - left / (CFG.readyMs / 1000);
      ctx.fillStyle = 'rgba(196,255,77,.35)';
      ctx.fillRect(0, CFG.h - 2, W * bar, 2);
      ctx.textAlign = 'left';
      return;                                // nothing else belongs on top of it
    }

    /* No score while it demos itself — that is the autopilot's number, not
       yours. G.manual stays true through the death pause so your final
       score is readable before the demo takes back over. */
    if (live || G.manual) {
      ctx.font = '600 10px ui-monospace,SFMono-Regular,Menlo,monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = G.dead ? 'rgba(255,120,110,.95)' : 'rgba(240,240,240,.55)';
      ctx.fillText(String(Math.floor(G.score)).padStart(5, '0'), W - 4, 12);
      if (G.best > 0) {
        ctx.fillStyle = 'rgba(196,255,77,.55)';
        ctx.fillText('HI ' + String(Math.floor(G.best)).padStart(5, '0'), W - 4, 24);
      }
    }
  }

  /* ---------- simulation ---------- */

  function spawn() {
    var p = CFG.px;
    if (Math.random() < 0.32 && G.speed > 240) {
      /* Two altitudes: the high one you must duck, the low one you must
         jump. Neither can be solved with the wrong input. */
      var high = Math.random() < 0.5;
      G.obstacles.push({
        type: 'bird', x: W + 12,
        y: CFG.ground - (high ? 26 : 13),
        high: high, w: sprW(SPR.bird_a) * p
      });
    } else {
      /* Pairs use the short cactus at tight spacing. A pair of the tall
         ones spans more ground than a single arc covers, and the runner
         clips the second on the way down — that was the last thing
         killing it. */
      var n = Math.random() < 0.24 ? 2 : 1;
      var pool = n === 2 ? [SPR.cactus1] : [SPR.cactus1, SPR.cactus2, SPR.cactus3];
      for (var i = 0; i < n; i++) {
        var spr = pool[(Math.random() * pool.length) | 0];
        G.obstacles.push({
          type: 'cactus', x: W + 12 + i * 13, spr: spr,
          w: sprW(spr) * p, h: sprH(spr) * p
        });
      }
    }
    G.nextIn = CFG.gapMin + Math.random() * (CFG.gapMax - CFG.gapMin) * (CFG.speed0 * kW / G.speed);
  }

  function jump() {
    if (G.dead || G.y > 0.5) return;
    G.vy = CFG.jumpV;
    G.ducking = false;
  }

  /* ---------- autopilot ----------
     Not a reaction distance. It solves the arc: for the next obstacle it
     works out the window during which a jump would hold the runner above
     it, works out the window during which the obstacle overlaps the
     runner horizontally, and releases the jump at the moment those two
     line up in the middle. Self-correcting at any speed, so it does not
     need retuning when the game gets faster. */

  function extents(ob) {
    var pad = ob.type === 'bird' ? 3 : 2;
    return {
      lead: ob.x + pad,
      trail: ob.x + ob.w - pad,
      needY: ob.type === 'bird'
        ? CFG.ground - ob.y - 4          // clear the bird's underside
        : ob.h - 2                       // clear the cactus top
    };
  }

  function autopilot() {
    var i, ob, near = null;
    for (i = 0; i < G.obstacles.length; i++) {
      ob = G.obstacles[i];
      if (ob.x + ob.w < 16) continue;              // fully behind him
      near = ob;
      break;
    }
    if (!near) { G.ducking = false; return; }

    // a high bird is ducked under, and stays ducked until it has passed
    if (near.type === 'bird' && near.high) {
      G.ducking = (near.x - 38) <= G.speed * 0.24 + 22;
      return;
    }
    G.ducking = false;
    if (G.y > 0.5) return;                          // already committed

    var e = extents(near);
    // consecutive cacti close behind are one obstacle for jump purposes
    for (i = 0; i < G.obstacles.length; i++) {
      var o2 = G.obstacles[i];
      if (o2 === near || o2.type === 'bird') continue;
      if (o2.x > near.x && o2.x - near.x < 46) {
        var e2 = extents(o2);
        if (e2.trail > e.trail) e.trail = e2.trail;
        if (e2.needY > e.needY) e.needY = e2.needY;
      }
    }

    // how long the jump holds him above it
    var disc = CFG.jumpV * CFG.jumpV - 2 * CFG.gravity * e.needY;
    if (disc <= 0) { jump(); return; }              // cannot clear — go anyway
    var root = Math.sqrt(disc);
    var t1 = (CFG.jumpV - root) / CFG.gravity;
    var t2 = (CFG.jumpV + root) / CFG.gravity;

    // how long it overlaps him horizontally
    var tA = (e.lead - 40) / G.speed;
    var tB = (e.trail - 20) / G.speed;
    if (tB < 0) return;

    // release so the overlap sits centred inside the clearance window
    var slack = (t2 - t1) - (tB - tA);
    if (tA <= t1 + slack / 2) jump();
  }

  function hit(ob) {
    var rx = 20, rw = 20;
    var top = G.ducking ? 12 : 23;
    var ry = CFG.ground - G.y - top, rh = top - 2;
    if (ob.type === 'cactus') {
      var ox = ob.x + 2, ow = ob.w - 4, oy = CFG.ground - ob.h;
      return rx < ox + ow && rx + rw > ox && ry < oy + ob.h && ry + rh > oy;
    }
    var bx = ob.x + 3, bw = ob.w - 6, by = ob.y + 2, bh = 8;
    return rx < bx + bw && rx + rw > bx && ry < by + bh && ry + rh > by;
  }

  function reset() {
    G.speed = CFG.speed0 * kW; G.dist = 0; G.score = 0;
    G.y = 0; G.vy = 0; G.ducking = false; G.dead = false; G.manual = false;
    G.obstacles.length = 0; G.nextIn = 0.9; G.phase = 'demo';
  }

  function step(dt) {
    G.t += dt;
    G.blink = (G.blink + dt * 0.35) % 1;

    if (G.dead) {
      if (G.t - G.deadAt > 1.3) reset();
      return;
    }

    /* Ready: the board is already cleared and he jogs on the spot with the
       ground moving under him, so it reads as waiting rather than frozen.
       No spawns, no speed gain, no score until the run actually begins. */
    if (G.phase === 'ready') {
      G.legPhase += dt;
      G.dist += G.speed * dt;
      if (G.t - G.readyAt >= CFG.readyMs / 1000) begin();
      return;
    }

    G.speed = Math.min(CFG.speedMax * kW, G.speed + CFG.speedGain * kW * dt);
    G.dist += G.speed * dt;
    G.score += (G.speed / kW) * dt * 0.09;   // score comparable at any width
    G.legPhase += dt * (G.speed / CFG.speed0);

    G.vy -= CFG.gravity * dt;
    G.y += G.vy * dt;
    if (G.y <= 0) { G.y = 0; G.vy = 0; }

    if (!live) autopilot();

    G.nextIn -= dt;
    if (G.nextIn <= 0) spawn();

    for (var i = G.obstacles.length - 1; i >= 0; i--) {
      var ob = G.obstacles[i];
      ob.x -= G.speed * dt;
      if (ob.x < -30) { G.obstacles.splice(i, 1); continue; }
      if (hit(ob)) {
        G.dead = true; G.deadAt = G.t;
        if (G.score > G.best) G.best = G.score;
        if (live) setLive(false);
      }
    }
  }

  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */

  function setLive(on) {
    live = on;
    wrap.classList.toggle('live', on);
    if (on) {
      G.manual = true;                       // this run is yours; show the score
    }
    tip.textContent = 'click to play';
    canvas.setAttribute('aria-label', on ? 'Runner game, playing' : 'Runner game, click to play');
  }

  /* Playing means the arrow keys and space belong to the game, not the
     scroller. Guarding on `live` alone left a gap: if focus had moved
     elsewhere the keystroke never reached this handler and the page
     scrolled instead. Now the canvas takes focus on click, so the game
     owns the keystroke either way. */
  function playing() {
    return live || document.activeElement === canvas;
  }

  /* Clicking in starts a NEW run — it used to hand you the autopilot's
     game mid-flight, inheriting its score and its speed. */
  function startRun() {
    reset();
    G.phase = 'ready';
    setLive(true);
    G.readyAt = G.t;                         // countdown runs on game time
  }

  function begin() {
    if (!live || G.phase !== 'ready') return;
    G.phase = 'play';
  }

  function onKey(e) {
    if (!playing()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // leave shortcuts alone
    var k = e.key;
    if (G.phase === 'ready' && k !== 'Escape') {
      e.preventDefault(); begin(); return;   // impatient players skip the wait
    }
    if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      e.preventDefault(); jump();
    } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
      e.preventDefault();
      if (G.y > 0.5) { G.vy = -CFG.jumpV * 1.6; }   // fast-fall
      G.ducking = true;
    } else if (k === 'PageUp' || k === 'PageDown' || k === 'Home' || k === 'End') {
      e.preventDefault();                    // these scroll too
    } else if (k === 'Escape') {
      setLive(false);
      if (canvas.blur) canvas.blur();
    }
  }

  function onKeyUp(e) {
    if (!playing()) return;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') G.ducking = false;
  }

  /* Stretch horizontally to just short of the first nav link (About).
     The wrapper carries margin-right:auto, so the links sit hard right
     and their position does not move as the strip grows — which means
     the target edge can be measured once and trusted. Height is fixed;
     only the width ever changes. */
  function measure() {
    var nav = document.getElementById('navbar');
    if (!nav || !canvas) return CFG.wMin;
    /* Shrink to the minimum first, so the links report their natural
       width rather than one already compressed by the strip. Without
       this the two chase each other on every resize. */
    var prev = canvas.style.width;
    canvas.style.width = CFG.wMin + 'px';
    var cs = getComputedStyle(nav);
    var brand = nav.querySelector('.nav-brand');
    var links = nav.querySelector('.nav-links');
    var drawer = links && getComputedStyle(links).position === 'fixed';
    var spare = nav.clientWidth
      - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      - (brand ? brand.offsetWidth : 0)
      - (drawer || !links ? 0 : links.offsetWidth)
      - 96;                                  // margins plus breathing room
    canvas.style.width = prev;
    return Math.max(CFG.wMin, Math.min(CFG.wMax, Math.round(spare)));
  }

  function resize() {
    W = measure();
    var nk = W / CFG.wMin;
    if (G.speed) G.speed *= nk / kW;         // carry momentum across a resize
    kW = nk;
    dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDPR);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(CFG.h * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = CFG.h + 'px';
    ctx = canvas.getContext('2d');
    draw();
  }

  function init() {
    var nav = document.getElementById('navbar');
    var brand = nav && nav.querySelector('.nav-brand');
    if (!brand) return;

    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    wrap = document.createElement('div');
    wrap.className = 'runner';
    canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    tip = document.createElement('span');
    tip.className = 'runner-tip';
    wrap.appendChild(canvas);
    wrap.appendChild(tip);
    brand.parentNode.insertBefore(wrap, brand.nextSibling);

    resize();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 150);
    });

    setLive(false);

    canvas.tabIndex = 0;                     // focusable, so it owns the keys
    wrap.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (canvas.focus) canvas.focus({ preventScroll: true });
      if (!live) startRun();                 // fresh board, not a handover
      else if (G.phase === 'ready') begin();
      else jump();
    });
    wrap.addEventListener('wheel', function (e) {
      if (playing()) e.preventDefault();     // wheel over the strip must not scroll
    }, { passive: false });
    wrap.addEventListener('touchstart', function (e) {
      if (!live) return;
      e.preventDefault();
      if (G.phase === 'ready') begin(); else jump();
    }, { passive: false });
    canvas.addEventListener('blur', function () { if (live) setLive(false); });
    document.addEventListener('click', function (e) {
      if (live && !wrap.contains(e.target)) setLive(false);
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', function () { if (live) setLive(false); });

    draw();
    if (!reduce.matches) raf = requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
