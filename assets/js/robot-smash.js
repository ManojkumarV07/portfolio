/* ============================================================
   ROBOT SMASH — 3D nav link demolition
   A small bot walks over empty-handed, picks a mallet up off
   the floor, raises it overhead and brings it down on the
   clicked nav item. The label shatters, the page scrolls.

   The bot is real CSS 3D geometry: every part is a six-faced
   box in a perspective scene, shaded per face from one light.
   No WebGL, no dependencies.

   Self-contained: injects its own CSS, binds its own events.
   Delete this file + its <script> tag to remove entirely.
   ============================================================ */

(function () {
  'use strict';

  var CFG = {
    // PACING — one knob. 1 = brisk, 1.5 = current, 2 = slower still.
    // Scales every beat below.
    speed: 1.2,

    minWidth: 900,        // below this, skip the show and just scroll
    stride: 300,          // base ms per footstep — held constant at any distance
    walkMin: 600,         // base ms — everything here gets multiplied by speed
    walkMax: 900,
    settle: 60,           // arrives, plants his feet
    bend: 260,            // crouches and takes hold of it
    lift: 340,            // stands up, brings it upright
    show: 220,            // held vertical — the pose that reads the barrel
    wind: 300,            // turns his back, mallet drops to horizontal
    cock: 110,            // loaded
    swing: 140,           // whips around — quick, or it reads as weak
    scrollDelay: 140,     // ms after impact before the page starts moving
    restore: 820,         // ms after impact before the nav label comes back

    // CAMERA — resting yaw. 0 is dead-on and looks flat.
    yawIdle: -25,         // three-quarter, facing the camera
    yawWind: 120,         // back to the camera, mallet cocked out to his left
    yawFollow: -48,       // carries through past the target
    perspective: 900,

    sectors: 9,           // fracture wedges
    rings: 3              // fracture rings
  };

  /* GEOMETRY — the navbar hugs the top of the viewport, so the
     headroom above the nav label is all the room there is for a
     raised mallet. Every dimension below is sized to fit inside
     it: bot head clears by 11px, raised mallet by 2px. */
  var STAGE_W = 104, STAGE_H = 88;
  var FEET = 71;          // local y of the soles — bot is pinned so this meets the navbar's lower edge
  var PIVOT_X = 52, PIVOT_Y = 49;   // shoulder sits low, which buys headroom for a big mallet
  var RIG_X = 36, RIG_Y = 48;
  var ARM = 20;           // shoulder to mallet-head centre — short handle, huge head

  // swing angles, CSS rotateZ convention: 0 = forward, 90 = down, 270 = up
  var A_REST = 95;        // arm at his side while walking, mallet not yet in hand
  var A_GRAB = 118;       // reaches down to the floor for it
  var A_UP2 = 270;        // held straight up, so the barrel silhouette reads
  var A_LEVEL = 360;      // dropped to horizontal for the swing
  var HEAD_H = 32;        // mallet head diameter

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var layer = null;
  var running = null;

  /* ---------- styles ---------- */

  var CSS = [
    '.rs-layer{position:fixed;inset:0;z-index:150;pointer-events:none;overflow:hidden}',
    '.rs-bot{position:absolute;will-change:transform,opacity}',
    '.rs-scene{position:absolute;width:' + STAGE_W + 'px;height:' + STAGE_H + 'px;',
    'perspective:' + CFG.perspective + 'px;perspective-origin:' + RIG_X + 'px 36px}',
    '.rs-rig{position:absolute;inset:0;transform-style:preserve-3d;',
    'transform-origin:' + RIG_X + 'px ' + RIG_Y + 'px}',
    '.rs-part{position:absolute;width:0;height:0;transform-style:preserve-3d}',
    '.rs-hammer{position:absolute;width:0;height:0;transform-style:preserve-3d;opacity:0}',
    '.rs-box{position:absolute;transform-style:preserve-3d}',
    '.rs-box>i{position:absolute;left:50%;top:50%;display:block;backface-visibility:hidden;',
    'box-shadow:inset 0 0 0 .5px rgba(255,255,255,.14)}',
    '.rs-barrel,.rs-cyl{position:absolute;transform-style:preserve-3d}',
    '.rs-cyl>i,.rs-barrel>i{position:absolute;left:0;top:0;display:block;',
    'backface-visibility:hidden}',
    '.rs-visor{position:absolute;border-radius:2px;background:#c4ff4d;',
    'box-shadow:0 0 9px 2px rgba(196,255,77,.55)}',
    '.rs-bulb{position:absolute;border-radius:50%;',
    'background:radial-gradient(circle at 32% 30%,#f2ffcf,#c4ff4d 55%,#8fc21f);',
    'box-shadow:0 0 8px 2px rgba(196,255,77,.6)}',
    '.rs-cast{position:absolute;border-radius:50%;filter:blur(3px);',
    'background:radial-gradient(ellipse,rgba(0,0,0,.6),rgba(0,0,0,0) 70%)}',
    '.rs-shards{position:absolute;pointer-events:none;perspective:700px}',
    '.rs-shard{position:absolute;inset:0;will-change:transform,opacity;backface-visibility:hidden}',
    '.rs-cracks{position:absolute;pointer-events:none;overflow:visible}',
    '.rs-arc{position:absolute;pointer-events:none;overflow:visible}',
    '.rs-flash{position:absolute;border-radius:50%;pointer-events:none;',
    'background:radial-gradient(circle,rgba(196,255,77,.85) 0%,rgba(196,255,77,.25) 40%,transparent 70%)}',
    '.rs-gone{visibility:hidden}'
  ].join('');

  /* ---------- 3D primitives ----------
     One light, up and to the front-left. Every face gets a fixed
     shade off the part's base colour — the geometry alone would
     read as flat cutouts; the per-face lighting makes the volume. */

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function m(c) {
      return Math.max(0, Math.min(255, Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f))));
    }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }

  function box(w, h, d, hex, opts) {
    opts = opts || {};
    var hw = w / 2, hh = h / 2, hd = d / 2;
    var faces = [
      [w, h, 'translateZ(' + hd + 'px)', 0],
      [w, h, 'rotateY(180deg) translateZ(' + hd + 'px)', -0.45],
      [d, h, 'rotateY(90deg) translateZ(' + hw + 'px)', -0.14],
      [d, h, 'rotateY(-90deg) translateZ(' + hw + 'px)', -0.34],
      [w, d, 'rotateX(90deg) translateZ(' + hh + 'px)', 0.28],
      [w, d, 'rotateX(-90deg) translateZ(' + hh + 'px)', -0.52]
    ];
    var s = 'position:absolute;width:' + w + 'px;height:' + h + 'px;margin-left:' + -hw +
      'px;margin-top:' + -hh + 'px;' + (opts.style || '');
    var html = '<div class="rs-box" style="' + s + '">';
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i];
      html += '<i style="width:' + f[0] + 'px;height:' + f[1] + 'px;margin-left:' + (-f[0] / 2) +
        'px;margin-top:' + (-f[1] / 2) + 'px;transform:' + f[2] +
        ';background:' + shade(hex, f[3]) +
        (opts.radius ? ';border-radius:' + opts.radius + 'px' : '') + '"></i>';
    }
    return html + '</div>';
  }

  /* A cylinder: `segs` lateral panels wrapped around the Z axis. Each
     panel is shaded by the angle of its own outward normal against the
     same light the boxes use, which is what turns a prism into a
     cylinder. Panels are circumscribed and overlapped 4% so no seams
     show between them. */

  function lateral(r, len, segs, hex) {
    var w = 2 * r * Math.tan(Math.PI / segs) * 1.04;
    var html = '';
    for (var i = 0; i < segs; i++) {
      var a = (i / segs) * 360, t = a * Math.PI / 180;
      var f = 0.36 * (0.9 * Math.cos(t) - 0.4 * Math.sin(t));   // light: up, slightly left
      html += '<i style="width:' + w.toFixed(2) + 'px;height:' + len.toFixed(2) +
        'px;margin-left:' + (-w / 2).toFixed(2) + 'px;margin-top:' + (-len / 2).toFixed(2) +
        'px;transform:rotateZ(' + a.toFixed(2) + 'deg) rotateX(90deg) translateZ(' +
        r.toFixed(2) + 'px);background:' + shade(hex, f) + '"></i>';
    }
    return html;
  }

  function disc(r, z, hex, f, flip) {
    return '<i style="width:' + (r * 2).toFixed(1) + 'px;height:' + (r * 2).toFixed(1) +
      'px;margin-left:' + (-r).toFixed(1) + 'px;margin-top:' + (-r).toFixed(1) +
      'px;border-radius:50%;transform:' + (flip ? 'rotateY(180deg) ' : '') +
      'translateZ(' + z.toFixed(1) + 'px);background:' + shade(hex, f) + '"></i>';
  }

  function tube(r, len, segs, hex, zOff) {
    return '<div class="rs-cyl"' +
      (zOff ? ' style="transform:translateZ(' + zOff.toFixed(1) + 'px)"' : '') +
      '>' + lateral(r, len, segs, hex) + '</div>';
  }

  /* The mallet head — a barrel, not a block: narrow banded ends, fat
     middle, flat discs capping each face. */
  function malletHead(r, len, wood, band, accent) {
    var S = 14;
    var eL = len * 0.22, mL = len - eL * 2, off = (mL + eL) / 2;
    return '<div class="rs-barrel">' +
      tube(r * 0.85, eL, S, band, -off) +
      tube(r, mL, S, wood, 0) +
      tube(r * 1.02, 4, S, accent, 0) +
      tube(r * 0.85, eL, S, band, off) +
      disc(r * 0.85, len / 2, wood, 0.22, false) +
      disc(r * 0.85, len / 2, wood, -0.42, true) +
      '</div>';
  }

  function part(x, y, cls, inner, style) {
    return '<div class="rs-part' + (cls ? ' ' + cls : '') + '" style="left:' + x + 'px;top:' + y +
      'px' + (style ? ';' + style : '') + '">' + inner + '</div>';
  }

  /* ---------- the bot ---------- */

  function buildBot() {
    // Palette has to survive a near-black page. The mallet is the hero
    // prop, so it gets bright steel; the bot stays dark but not black.
    var DARK = '#2e2e2e', HEAD = '#3a3a3a', LIMB = '#282828', METAL = '#8a8a8a';
    // mallet: pale warm timber with dark iron hoops. Push WOOD/SHAFT
    // toward brown for full cartoon-wood, or grey for steel.
    var WOOD = '#cac3b6', SHAFT = '#a99e8d', HOOP = '#38383a';

    var leg =
      box(6, 8, 7, LIMB, { radius: 2, style: 'margin-top:0px;top:0px' }) +
      box(9, 3, 11, METAL, { radius: 1.5, style: 'margin-top:0px;top:8px' });

    // everything from the handle out lives in .rs-hammer, which starts hidden
    var hammer =
      '<div class="rs-hammer">' +
        part(6, 0, '', '<div class="rs-cyl" style="transform:rotateY(90deg)">' +
          lateral(2.6, 16, 8, SHAFT) + disc(2.6, 8, SHAFT, 0.2) + '</div>') +   // round shaft
        part(14, 0, '', '<div class="rs-cyl" style="transform:rotateY(90deg)">' +
          lateral(3.5, 5, 10, HOOP) + '</div>') +                              // ferrule
        part(ARM, 0, '', malletHead(16, 30, WOOD, HOOP, '#c4ff4d'))            // barrel head
      '</div>';

    var arm =
      part(-6, 0, '', box(12, 7, 8, DARK, { radius: 3 })) +            // upper arm to the torso
      box(8, 8, 10, METAL, { radius: 3 }) + hammer;                    // shoulder + mallet

    var rig =
      '<div class="rs-cast" style="left:17px;top:69px;width:38px;height:9px"></div>' +
      part(41, 60, 'rs-leg rs-leg-b', leg) +
      part(31, 60, 'rs-leg rs-leg-a', leg) +
      '<div class="rs-body" style="position:absolute;inset:0;transform-style:preserve-3d;' +
        'transform-origin:' + RIG_X + 'px 58px">' +
        part(RIG_X, 50, '', box(26, 24, 20, DARK, { radius: 4 })) +
        part(RIG_X, 29, '', box(22, 18, 18, HEAD, { radius: 4 }) +
          '<div class="rs-visor" style="left:-8px;top:-4px;width:16px;height:5px;' +
          'transform:translateZ(9.5px)"></div>') +
        part(RIG_X, 18, '', box(2, 6, 2, METAL)) +
        '<div class="rs-bulb" style="left:33px;top:10.5px;width:6px;height:6px"></div>' +
      '</div>' +
      part(PIVOT_X, PIVOT_Y, 'rs-arm', arm);

    return '<div class="rs-scene"><div class="rs-rig">' + rig + '</div></div>';
  }

  /* ---------- helpers ---------- */

  function el(cls, tag) {
    var n = document.createElement(tag || 'div');
    if (cls) n.className = cls;
    return n;
  }

  function track(node) { if (running) running.nodes.push(node); return node; }

  function after(ms, fn) {
    var id = setTimeout(fn, ms * CFG.speed);
    if (running) running.timers.push(id);
    return id;
  }

  function play(node, frames, opts) {
    if (opts && opts.duration) {
      opts = Object.assign({}, opts, { duration: opts.duration * CFG.speed });
    }
    var a = node.animate(frames, opts);
    if (running) running.anims.push(a);
    return a;
  }

  function rot(deg) { return { transform: 'rotateZ(' + deg + 'deg)' }; }
  function yaw(deg) { return { transform: 'rotateY(' + deg + 'deg)' }; }

  function ensureLayer() {
    if (layer && document.body.contains(layer)) return layer;
    var s = document.getElementById('rs-style');
    if (!s) {
      s = document.createElement('style');
      s.id = 'rs-style';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    layer = el('rs-layer');
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    return layer;
  }

  function cleanup() {
    if (!running) return;
    running.timers.forEach(clearTimeout);
    running.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    running.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (running.link) running.link.classList.remove('rs-gone');
    running = null;
  }

  /* ---------- fracture geometry ----------
     Shared vertex grid, so neighbouring shards use the exact same
     corner points — no seams, no gaps. */

  function fracture(w, h, ix, iy) {
    var S = CFG.sectors, R = CFG.rings;
    var maxR = Math.max(
      Math.sqrt(ix * ix + iy * iy),
      Math.sqrt((w - ix) * (w - ix) + iy * iy),
      Math.sqrt(ix * ix + (h - iy) * (h - iy)),
      Math.sqrt((w - ix) * (w - ix) + (h - iy) * (h - iy))
    ) * 1.12;

    var ang = [], i, r;
    for (i = 0; i < S; i++) {
      ang.push((i / S) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI * 2 / S) * 0.55);
    }

    var V = [];
    for (i = 0; i < S; i++) {
      V[i] = [[ix, iy]];
      for (r = 1; r <= R; r++) {
        var base = maxR * Math.pow(r / R, 1.55);
        var rad = r === R ? base : base * (0.78 + Math.random() * 0.42);
        V[i].push([ix + Math.cos(ang[i]) * rad, iy + Math.sin(ang[i]) * rad]);
      }
    }

    var shards = [];
    for (i = 0; i < S; i++) {
      var j = (i + 1) % S;
      for (r = 0; r < R; r++) {
        shards.push(r === 0
          ? [V[i][0], V[i][1], V[j][1]]
          : [V[i][r], V[j][r], V[j][r + 1], V[i][r + 1]]);
      }
    }
    return { shards: shards, verts: V };
  }

  function polygon(pts) {
    return 'polygon(' + pts.map(function (p) {
      return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px';
    }).join(',') + ')';
  }

  function centroid(pts) {
    var x = 0, y = 0;
    pts.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / pts.length, y / pts.length];
  }

  /* ---------- the shatter ----------
     Shards tumble on all three axes and carry Z, so near ones grow
     as they come at the camera and far ones recede. */

  function shatter(link, impactX, impactY) {
    var rect = link.getBoundingClientRect();
    var pad = 8;
    var w = rect.width + pad * 2, h = rect.height + pad * 2;
    var ix = impactX - rect.left + pad;
    var iy = impactY - rect.top + pad;
    var f = fracture(w, h, ix, iy);

    var field = track(el('rs-shards'));
    field.style.cssText = 'left:' + (rect.left - pad) + 'px;top:' + (rect.top - pad) +
      'px;width:' + w + 'px;height:' + h + 'px';

    f.shards.forEach(function (pts) {
      var piece = el('rs-shard');
      var clone = link.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('href');
      clone.style.cssText = 'position:absolute;left:' + pad + 'px;top:' + pad +
        'px;width:' + rect.width + 'px;height:' + rect.height + 'px;display:block';
      piece.appendChild(clone);
      piece.style.clipPath = polygon(pts);
      piece.style.webkitClipPath = polygon(pts);
      field.appendChild(piece);

      var c = centroid(pts);
      var dx = c[0] - ix, dy = c[1] - iy;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var push = 14 + Math.random() * 34;
      var z = (Math.random() * 2 - 0.65) * 90;
      var rx = (Math.random() - 0.5) * 300;
      var ry = (Math.random() - 0.5) * 300;
      var rz = (Math.random() - 0.5) * 180;
      var spin = Math.max(Math.abs(rx), Math.abs(ry));
      var axis = rx.toFixed(2) + ',' + ry.toFixed(2) + ',' + rz.toFixed(2);

      play(piece, [
        { transform: 'translate3d(0,0,0) rotate3d(0,0,1,0deg)', opacity: 1, offset: 0 },
        {
          transform: 'translate3d(' + (dx / d * push * 0.45).toFixed(1) + 'px,' +
            (dy / d * push * 0.45 - 7).toFixed(1) + 'px,' + (z * 0.55).toFixed(1) + 'px) ' +
            'rotate3d(' + axis + ',' + (spin * 0.22).toFixed(1) + 'deg)',
          opacity: 1, offset: 0.28
        },
        {
          transform: 'translate3d(' + (dx / d * push).toFixed(1) + 'px,' +
            (dy / d * push + 54).toFixed(1) + 'px,' + z.toFixed(1) + 'px) ' +
            'rotate3d(' + axis + ',' + spin.toFixed(1) + 'deg)',
          opacity: 0, offset: 1
        }
      ], {
        duration: 560 + Math.random() * 280,
        easing: 'cubic-bezier(.32,.62,.42,1)',
        fill: 'forwards'
      });
    });
    layer.appendChild(field);

    var ns = 'http://www.w3.org/2000/svg';
    var svg = track(document.createElementNS(ns, 'svg'));
    svg.setAttribute('class', 'rs-cracks');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.style.cssText = 'left:' + (rect.left - pad) + 'px;top:' + (rect.top - pad) + 'px';

    f.verts.forEach(function (col, i) {
      var dpath = 'M' + col.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', dpath);
      path.setAttribute('stroke', i % 3 === 0 ? '#c4ff4d' : 'rgba(255,255,255,.9)');
      path.setAttribute('stroke-width', '1.2');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
      path.style.strokeDasharray = 220;
      path.style.strokeDashoffset = 220;
      play(path, [{ strokeDashoffset: 220 }, { strokeDashoffset: 0 }],
        { duration: 150, easing: 'ease-out', fill: 'forwards' });
    });
    layer.appendChild(svg);
    play(svg, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 0, offset: 1 }],
      { duration: 520, fill: 'forwards' });

    var flash = track(el('rs-flash'));
    flash.style.cssText = 'left:' + (impactX - 45) + 'px;top:' + (impactY - 45) + 'px;width:90px;height:90px';
    layer.appendChild(flash);
    play(flash, [
      { transform: 'scale(.2)', opacity: .9 },
      { transform: 'scale(1.5)', opacity: 0 }
    ], { duration: 380, easing: 'ease-out', fill: 'forwards' });
  }

  /* ---------- swing smear ----------
     The head sweeps a horizontal circle, which projects to an almost
     flat streak at the mallet's height. Drawn from where it starts to
     where it lands, revealed in step with the swing itself. */

  function sweepSmear(x0, x1, y, thickness) {
    var ns = 'http://www.w3.org/2000/svg';
    var pad = thickness;
    var w = Math.abs(x1 - x0) + pad * 2;
    var svg = track(document.createElementNS(ns, 'svg'));
    svg.setAttribute('class', 'rs-arc');
    svg.setAttribute('width', w);
    svg.setAttribute('height', pad * 2);
    svg.style.cssText = 'left:' + (Math.min(x0, x1) - pad) + 'px;top:' + (y - pad) + 'px';

    var lx = Math.min(x0, x1) - pad;
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M' + (x0 - lx).toFixed(1) + ' ' + pad +
      'Q' + ((x0 + x1) / 2 - lx).toFixed(1) + ' ' + (pad + thickness * 0.28).toFixed(1) +
      ' ' + (x1 - lx).toFixed(1) + ' ' + pad);
    path.setAttribute('stroke', 'rgba(255,255,255,.15)');
    path.setAttribute('stroke-width', thickness);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    layer.appendChild(svg);

    var len = Math.abs(x1 - x0) * 1.1;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    play(path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: CFG.swing, easing: 'cubic-bezier(.7,0,.9,.25)', fill: 'forwards' });
    play(svg, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: .4 }, { opacity: 0, offset: 1 }],
      { duration: CFG.swing + 200, fill: 'forwards' });
  }

  /* ---------- page shake ----------
     Deliberately NOT a transform on <body>: that would make body the
     containing block for every position:fixed element, so the navbar
     would tear loose and jump to the document top whenever the page is
     scrolled. Shaking each top-level block instead leaves every
     containing block intact. Cursor and loader sit it out. */

  function shakePage() {
    var frames = [
      { transform: 'translate(0,0)' },
      { transform: 'translate(-2px,1.5px)', offset: .14 },
      { transform: 'translate(2px,-1.5px)', offset: .3 },
      { transform: 'translate(-1.5px,-1px)', offset: .47 },
      { transform: 'translate(1.5px,1px)', offset: .63 },
      { transform: 'translate(-1px,.5px)', offset: .79 },
      { transform: 'translate(.5px,-.5px)', offset: .9 },
      { transform: 'translate(0,0)' }
    ];
    var kids = Array.prototype.slice.call(document.body.children);
    kids.forEach(function (k) {
      if (k.tagName === 'SCRIPT' || k.tagName === 'STYLE' || k.tagName === 'LINK') return;
      if (k.classList && (k.classList.contains('cursor-dot') ||
                          k.classList.contains('cursor-ring') ||
                          k.classList.contains('loader'))) return;
      play(k, frames, { duration: 240, easing: 'ease-out' });
    });
  }

  /* ---------- main sequence ---------- */

  function run(link, target) {
    var nav = document.getElementById('navbar');
    var list = document.getElementById('navLinks');
    var navRect = nav.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    var brand = document.querySelector('.nav-brand');
    var brandRect = brand ? brand.getBoundingClientRect() : { right: 40 };

    ensureLayer();
    running = { timers: [], nodes: [], anims: [], link: link };

    var bot = track(el('rs-bot'));
    bot.innerHTML = buildBot();

    var impactX = linkRect.left + linkRect.width * 0.5;
    var impactY = linkRect.top + linkRect.height * 0.5;
    var botTop = navRect.bottom - FEET;

    /* Strike angle is measured, not hardcoded — holds up at any navbar
       height, font size or zoom. 360 + angle so the slam interpolates
       forward over the top from A_UP rather than backwards. */
    var pivotPageY = botTop + PIVOT_Y;

    /* The swing is a horizontal circle traced by the body's own rotation.
       The arm holds level; its small pitch just sets the head's height so
       it meets the middle of the word. Everything is measured, so this
       holds at any navbar height, font size or zoom. */
    var hitPitch = Math.atan2(impactY - pivotPageY, ARM) * 180 / Math.PI;
    hitPitch = Math.max(-22, Math.min(22, hitPitch));
    var A_HIT = 360 + hitPitch;

    // distance from the body's turning axis out to the mallet head
    var reach = (PIVOT_X + ARM * Math.cos(hitPitch * Math.PI / 180)) - RIG_X;

    // where the head projects on screen at a given body yaw
    function sweepX(phi) {
      var t = phi * Math.PI / 180;
      var z = -reach * Math.sin(t);
      return RIG_X + reach * Math.cos(t) * (CFG.perspective / (CFG.perspective - z));
    }

    var yawHit = -10;
    var endX = impactX - sweepX(yawHit);
    var startX = Math.min(brandRect.right + 6, endX - 40);

    bot.style.left = '0px';
    bot.style.top = botTop + 'px';
    layer.appendChild(bot);

    var rig = bot.querySelector('.rs-rig');
    var arm = bot.querySelector('.rs-arm');
    var hammer = bot.querySelector('.rs-hammer');
    var legA = bot.querySelector('.rs-leg-a');
    var legB = bot.querySelector('.rs-leg-b');
    var body = bot.querySelector('.rs-body');
    var bulb = bot.querySelector('.rs-bulb');

    rig.style.transform = 'rotateY(' + CFG.yawIdle + 'deg)';
    arm.style.transform = 'rotateZ(' + A_REST + 'deg)';   // empty-handed

    var dist = Math.abs(endX - startX);
    /* Snap the walk to a whole number of strides so every footstep lasts
       exactly CFG.stride. Deriving steps from a free-running duration made
       long walks quicker per step than short ones — the bot sped up the
       further he had to come, which is backwards for something heavy. */
    var walk = Math.max(CFG.walkMin, Math.min(CFG.walkMax, dist * 1.8));
    var steps = Math.max(2, Math.round(walk / CFG.stride));
    walk = steps * CFG.stride;

    /* --- 1. walks in empty-handed --- */
    play(bot, [
      { transform: 'translateX(' + startX + 'px)', opacity: 0 },
      { transform: 'translateX(' + (startX + (endX - startX) * 0.12) + 'px)', opacity: 1, offset: 0.12 },
      { transform: 'translateX(' + endX + 'px)', opacity: 1 }
    ], { duration: walk, easing: 'cubic-bezier(.4,.05,.35,1)', fill: 'forwards' });

    var legOpts = { duration: walk / steps, iterations: steps, easing: 'ease-in-out' };
    play(legA, [{ transform: 'rotateX(26deg)' }, { transform: 'rotateX(-26deg)' }, { transform: 'rotateX(26deg)' }], legOpts);
    play(legB, [{ transform: 'rotateX(-26deg)' }, { transform: 'rotateX(26deg)' }, { transform: 'rotateX(-26deg)' }], legOpts);
    play(body, [
      { transform: 'translateY(0)' }, { transform: 'translateY(-1.5px)' }, { transform: 'translateY(0)' }
    ], { duration: walk / steps, iterations: steps, easing: 'ease-in-out' });
    play(rig, [
      yaw(CFG.yawIdle - 4), yaw(CFG.yawIdle + 4), yaw(CFG.yawIdle - 4)
    ], { duration: CFG.stride * 2, iterations: steps / 2, easing: 'ease-in-out' });
    play(bulb, [{ opacity: 1 }, { opacity: .35 }, { opacity: 1 }],
      { duration: 480, iterations: Math.ceil((walk + 1400) / 480) });

    /* --- 2. bends down and takes hold of it --- */
    var tBend = walk + CFG.settle;
    after(tBend, function () {
      play(arm, [rot(A_REST), rot(A_GRAB)],
        { duration: CFG.bend, easing: 'ease-out', fill: 'forwards' });
      // squat: rig drops and compresses, torso bows forward over the hips
      play(rig, [
        { transform: yaw(CFG.yawIdle).transform + ' translateY(0) scaleY(1)' },
        { transform: yaw(CFG.yawIdle).transform + ' translateY(5px) scaleY(.88)' }
      ], { duration: CFG.bend, easing: 'ease-out', fill: 'forwards' });
      play(body, [
        { transform: 'rotateX(0deg)' }, { transform: 'rotateX(-30deg)' }
      ], { duration: CFG.bend, easing: 'ease-out', fill: 'forwards' });
      // braces his feet
      play(legA, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(15deg)' }],
        { duration: CFG.bend, easing: 'ease-out', fill: 'forwards' });
      play(legB, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-15deg)' }],
        { duration: CFG.bend, easing: 'ease-out', fill: 'forwards' });
      // it comes up off the floor into his hand
      play(hammer, [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: CFG.bend * 0.75, delay: CFG.bend * 0.25 * CFG.speed, easing: 'ease-out', fill: 'both' });
    });

    /* --- 3. straightens up, mallet vertical --- */
    var tLift = tBend + CFG.bend;
    after(tLift, function () {
      play(arm, [rot(A_GRAB), rot(A_UP2)],
        { duration: CFG.lift, easing: 'cubic-bezier(.3,0,.25,1)', fill: 'forwards' });
      play(rig, [
        { transform: yaw(CFG.yawIdle).transform + ' translateY(5px) scaleY(.88)' },
        { transform: yaw(CFG.yawIdle).transform + ' translateY(-1px) scaleY(1.02)', offset: .7 },
        { transform: yaw(CFG.yawIdle).transform + ' translateY(0) scaleY(1)' }
      ], { duration: CFG.lift, easing: 'cubic-bezier(.3,0,.25,1)', fill: 'forwards' });
      play(body, [{ transform: 'rotateX(-30deg)' }, { transform: 'rotateX(0deg)' }],
        { duration: CFG.lift, easing: 'cubic-bezier(.3,0,.25,1)', fill: 'forwards' });
      play(legA, [{ transform: 'rotateX(15deg)' }, { transform: 'rotateX(0deg)' }],
        { duration: CFG.lift, easing: 'ease-out', fill: 'forwards' });
      play(legB, [{ transform: 'rotateX(-15deg)' }, { transform: 'rotateX(0deg)' }],
        { duration: CFG.lift, easing: 'ease-out', fill: 'forwards' });
    });

    /* --- 4. turns his back, mallet swings down to level --- */
    var tWind = tLift + CFG.lift + CFG.show;
    after(tWind, function () {
      play(arm, [rot(A_UP2), rot(A_LEVEL)],
        { duration: CFG.wind, easing: 'cubic-bezier(.35,0,.4,1)', fill: 'forwards' });
      play(rig, [yaw(CFG.yawIdle), yaw(CFG.yawWind)],
        { duration: CFG.wind, easing: 'cubic-bezier(.35,0,.4,1)', fill: 'forwards' });
      play(body, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(4deg)' }],
        { duration: CFG.wind, easing: 'ease-out', fill: 'forwards' });
    });

    /* --- 5. whips around, left to right --- */
    var tSwing = tWind + CFG.wind + CFG.cock;
    after(tSwing, function () {
      play(rig, [yaw(CFG.yawWind), yaw(yawHit)],
        { duration: CFG.swing, easing: 'cubic-bezier(.7,0,.9,.25)', fill: 'forwards' });
      play(arm, [rot(A_LEVEL), rot(A_HIT)],
        { duration: CFG.swing, easing: 'cubic-bezier(.7,0,.9,.25)', fill: 'forwards' });
      sweepSmear(endX + sweepX(CFG.yawWind), endX + sweepX(yawHit),
                 pivotPageY, HEAD_H * 0.7);
    });

    /* --- 6. impact --- */
    var tImpact = tSwing + CFG.swing;
    after(tImpact, function () {
      link.classList.add('rs-gone');
      shatter(link, impactX, impactY);
      shakePage();

      // stopped dead, then the mallet rides up and away so the break shows
      play(arm, [
        rot(A_HIT),
        { transform: 'rotateZ(' + (A_HIT + 5) + 'deg)', offset: .1 },
        { transform: 'rotateZ(' + (A_HIT - 44) + 'deg)', offset: .55 },
        { transform: 'rotateZ(' + (A_HIT - 32) + 'deg)' }
      ], { duration: 460, easing: 'cubic-bezier(.22,1,.35,1)', fill: 'forwards' });

      // takes the shock through the knees, then carries the turn through
      play(rig, [
        { transform: yaw(yawHit).transform + ' scaleY(1)' },
        { transform: yaw(yawHit).transform + ' scaleY(.88) translateY(4px)', offset: .1 },
        { transform: yaw(CFG.yawFollow).transform + ' scaleY(1.04) translateZ(-7px)', offset: .45 },
        { transform: yaw(CFG.yawIdle).transform + ' scaleY(1)' }
      ], { duration: 460, easing: 'cubic-bezier(.22,1,.35,1)', fill: 'forwards' });

      play(bot, [
        { transform: 'translateX(' + endX + 'px) translateY(0)' },
        { transform: 'translateX(' + (endX - 3) + 'px) translateY(2px)', offset: .3 },
        { transform: 'translateX(' + endX + 'px) translateY(0)' }
      ], { duration: 240, easing: 'ease-out', fill: 'forwards' });

      if (list) {
        play(list, [
          { transform: 'translate(0,0)' }, { transform: 'translate(-3px,2px)', offset: .2 },
          { transform: 'translate(2px,-2px)', offset: .45 }, { transform: 'translate(-1px,1px)', offset: .7 },
          { transform: 'translate(0,0)' }
        ], { duration: 260, easing: 'ease-out' });
      }
    });

    after(tImpact + CFG.scrollDelay, function () {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* --- 7. off he goes --- */
    after(tImpact + 520, function () {
      play(bot, [
        { transform: 'translateX(' + endX + 'px) translateY(0)', opacity: 1 },
        { transform: 'translateX(' + (endX - 14) + 'px) translateY(-3px)', opacity: 0 }
      ], { duration: 280, easing: 'ease-in', fill: 'forwards' });
      play(legA, [{ transform: 'rotateX(-18deg)' }, { transform: 'rotateX(18deg)' }], { duration: 140, iterations: 2 });
      play(legB, [{ transform: 'rotateX(18deg)' }, { transform: 'rotateX(-18deg)' }], { duration: 140, iterations: 2 });
    });

    after(tImpact + CFG.restore, function () {
      link.classList.remove('rs-gone');
      play(link, [
        { opacity: 0, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0)' }
      ], { duration: 260, easing: 'ease-out' });
      cleanup();
    });
  }

  /* ---------- binding ---------- */

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.nav-links a[href^="#"]') : null;
    if (!link) return;

    var id = link.getAttribute('href');
    if (!id || id === '#') return;
    var target = document.querySelector(id);
    if (!target) return;

    /* script.js hides the navbar on any downward scroll, which left an
       empty band above the heading you just navigated to. Pin it for the
       duration of the scroll. */
    document.body.classList.add('nav-locked');
    clearTimeout(run.navTimer);
    run.navTimer = setTimeout(function () {
      document.body.classList.remove('nav-locked');
    }, 1400);

    if (running) {
      cleanup();
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (reduceMotion.matches ||
        window.innerWidth < CFG.minWidth ||
        !document.getElementById('navbar') ||
        typeof document.body.animate !== 'function') {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    run(link, target);
  }, true);

  window.addEventListener('pagehide', cleanup);
})();
