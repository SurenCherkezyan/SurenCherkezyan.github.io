/* ------------------------------------------------------------------
   1. Wave: slide the header wave so its peak sits exactly halfway
      between the end of the name and the start of the nav links
      (or centres it when the nav wraps under the name on phones).
   2. Flock: a JavaScript port of my Python boids simulation (boids.py).
      Same rules and constants, slowed down to read as a calm background,
      drawn as small fish, steering away from the edges of its area and
      from text and images.

   Flock options, set on <div class="flock" data-flock ...>:
     data-count   number of fish on a full-width desktop screen (fewer on phones)
     data-origin  "bottom" (default) or "right": where the school starts
     data-drift   downward lean; switched off once the visitor reaches the bottom
   ------------------------------------------------------------------ */

(function () {
  var PEAK = 660 / 1280;   // x of the wave's peak, as a fraction of the drawing's width
  var SPEED = 4;           // boids.py speed
  var PACE = 0.35;         // fraction of one boids.py frame per screen frame (calmer motion)
  var TURN = 0.5;          // strength of the push from edges and text at contact
  var CELL = 120;          // neighbour grid cell = largest perception radius (cohesion)
  var ALPHA = 0.28;        // fish opacity

  var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1f7a96';

  // ---------------- wave ----------------
  function placeWave() {
    var wave = document.querySelector('.wave'), name = document.querySelector('.name'),
        nav = document.querySelector('.nav'), page = document.querySelector('.page');
    if (!wave || !name || !nav || !page) return;
    var left = page.getBoundingClientRect().left;
    var nameEnd = name.getBoundingClientRect().right - left;
    var navStart = nav.getBoundingClientRect().left - left;
    var mid = navStart > nameEnd ? (nameEnd + navStart) / 2 : page.clientWidth / 2;
    wave.style.left = (mid - PEAK * wave.getBoundingClientRect().width) + 'px';
  }

  // ---------------- flock ----------------
  function Flock(area) {
    this.canvas = area.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.baseCount = +area.getAttribute('data-count') || 120;
    this.origin = area.getAttribute('data-origin') || 'bottom';
    this.drift = +area.getAttribute('data-drift') || 0;
    this.driftNow = this.drift;
    this.visible = true;
    this.resize();
    this.measure();
    this.spawn();
  }

  Flock.prototype.resize = function () {
    var c = this.canvas, dpr = window.devicePixelRatio || 1;
    this.W = Math.max(1, c.clientWidth);
    this.H = Math.max(1, c.clientHeight);
    // narrow screens: text fills the width, so let fish come closer before turning
    this.edge = this.W < 700 ? 30 : 60;
    c.width = Math.round(this.W * dpr);
    c.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Text and images marked data-boid-avoid, in the canvas's own pixels.
  // Only re-measured when the layout changes (resize, fonts or images loading).
  Flock.prototype.measure = function () {
    var cr = this.canvas.getBoundingClientRect(), els = document.querySelectorAll('[data-boid-avoid]'), E = this.edge;
    this.obstacles = [];
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.bottom < cr.top - E || r.top > cr.bottom + E) continue;
      this.obstacles.push({ x0: r.left - cr.left, y0: r.top - cr.top, x1: r.right - cr.left, y1: r.bottom - cr.top });
    }
  };

  // As in boids.py, the school bursts out from one point in random directions:
  // bottom-centre of its area, or the upper right side on project pages.
  // Phones get proportionally fewer fish.
  Flock.prototype.spawn = function () {
    var E = this.edge, n = Math.round(this.baseCount * Math.min(1, Math.max(0.35, this.W / 1200)));
    var x = this.origin === 'right' ? this.W - E - 20 : this.W / 2;
    var y = this.origin === 'right' ? E + 40 : this.H - E - 20;
    this.boids = [];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      this.boids.push({ x: x, y: y, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, ph: Math.random() * 6.283 });
    }
  };

  Flock.prototype.step = function () {
    var b = this.boids, W = this.W, H = this.H, E = this.edge, obs = this.obstacles, i, j, k;
    this.driftNow += ((reachedBottom ? 0 : this.drift) - this.driftNow) * 0.02;

    // bucket fish into a grid so each one only checks nearby cells, not the whole school
    var cols = Math.ceil(W / CELL) + 1, grid = {};
    for (i = 0; i < b.length; i++) {
      var key = Math.floor(b[i].y / CELL) * cols + Math.floor(b[i].x / CELL);
      (grid[key] || (grid[key] = [])).push(b[i]);
    }

    for (i = 0; i < b.length; i++) {
      var p = b[i], gx = Math.floor(p.x / CELL), gy = Math.floor(p.y / CELL);
      var ax = 0, ay = 0, na = 0, cx = 0, cy = 0, nc = 0, sx = 0, sy = 0;
      for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
        var cell = grid[(gy + oy) * cols + gx + ox];
        if (!cell) continue;
        for (j = 0; j < cell.length; j++) {
          var o = cell[j];
          if (o === p) continue;
          var dx = o.x - p.x, dy = o.y - p.y, d2 = dx * dx + dy * dy;
          if (d2 === 0 || d2 >= CELL * CELL) continue;
          var d = Math.sqrt(d2);
          if (p.vx * dx + p.vy * dy > -0.5 * SPEED * d) {            // within 120 degrees of heading
            cx += dx; cy += dy; nc++;                               // cohesion, radius 120
            if (d < 25) { ax += o.vx; ay += o.vy; na++; }           // alignment, radius 25
          }
          if (d < 20) { sx -= dx / d2; sy -= dy / d2; }             // separation, radius 20
        }
      }

      var accx = sx * 10, accy = sy * 10 + this.driftNow;
      if (na) { accx += (ax / na - p.vx) * 0.05; accy += (ay / na - p.vy) * 0.05; }
      if (nc) { accx += cx / nc * 0.004; accy += cy / nc * 0.004; }
      var am = Math.sqrt(accx * accx + accy * accy);
      if (am > 0.25) { accx *= 0.25 / am; accy *= 0.25 / am; }

      // edges of the area: turn away, harder the closer they get (added after the cap so walls win)
      if (p.x < E) accx += TURN * (E - p.x) / E;
      else if (p.x > W - E) accx -= TURN * (p.x - W + E) / E;
      if (p.y < E) accy += TURN * (E - p.y) / E;
      else if (p.y > H - E) accy -= TURN * (p.y - H + E) / E;

      // text and images: the same push, from the nearest point on each block
      for (k = 0; k < obs.length; k++) {
        var r = obs[k];
        if (r.y1 < p.y - E || r.y0 > p.y + E || r.x1 < p.x - E || r.x0 > p.x + E) continue;
        var ex = p.x - Math.max(r.x0, Math.min(p.x, r.x1)), ey = p.y - Math.max(r.y0, Math.min(p.y, r.y1));
        var ed = Math.sqrt(ex * ex + ey * ey);
        if (ed === 0) {   // inside a block: leave through the nearest side
          var l = p.x - r.x0, rt = r.x1 - p.x, t = p.y - r.y0, bt = r.y1 - p.y, m = Math.min(l, rt, t, bt);
          if (m === l) accx -= TURN; else if (m === rt) accx += TURN; else if (m === t) accy -= TURN; else accy += TURN;
        } else if (ed < E) {
          var f = TURN * (E - ed) / (E * ed);
          accx += ex * f; accy += ey * f;
        }
      }

      p.vx += accx * PACE; p.vy += accy * PACE;
      var vm = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
      p.vx *= SPEED / vm; p.vy *= SPEED / vm;
      p.x = Math.min(W, Math.max(0, p.x + p.vx * PACE));
      p.y = Math.min(H, Math.max(0, p.y + p.vy * PACE));
      p.ph += 0.3;                                                   // tail-beat phase
    }
  };

  // One fish: a filled teardrop body with a forked tail that sways gently.
  // Points are given in the fish's own frame (x forward) and turned to its heading.
  function addFish(ctx, p) {
    var hx = p.vx / SPEED, hy = p.vy / SPEED, X = p.x, Y = p.y;
    function mx(a, b) { return X + a * hx - b * hy; }
    function my(a, b) { return Y + a * hy + b * hx; }
    ctx.moveTo(mx(5.5, 0), my(5.5, 0));
    ctx.quadraticCurveTo(mx(1, -3), my(1, -3), mx(-4, 0), my(-4, 0));
    ctx.quadraticCurveTo(mx(1, 3), my(1, 3), mx(5.5, 0), my(5.5, 0));
    ctx.closePath();
    var w = Math.sin(p.ph) * 0.35, c = Math.cos(w), s = Math.sin(w);
    function tx(a, b) { return mx(-4 + a * c - b * s, a * s + b * c); }
    function ty(a, b) { return my(-4 + a * c - b * s, a * s + b * c); }
    ctx.moveTo(tx(0, 0), ty(0, 0));
    ctx.lineTo(tx(-4, -2.8), ty(-4, -2.8));
    ctx.lineTo(tx(-2.6, 0), ty(-2.6, 0));
    ctx.lineTo(tx(-4, 2.8), ty(-4, 2.8));
    ctx.closePath();
  }

  // All fish in one fill; those within 30 px of the area's edge fade out separately.
  Flock.prototype.draw = function () {
    var ctx = this.ctx, b = this.boids, W = this.W, H = this.H, i, p, e, fading = [];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = accent;
    ctx.globalAlpha = ALPHA;
    ctx.beginPath();
    for (i = 0; i < b.length; i++) {
      p = b[i];
      e = Math.min(p.x, W - p.x, p.y, H - p.y);
      if (e < 30) fading.push(p, e); else addFish(ctx, p);
    }
    ctx.fill();
    for (i = 0; i < fading.length; i += 2) {
      ctx.globalAlpha = ALPHA * Math.max(0, fading[i + 1]) / 30;
      ctx.beginPath();
      addFish(ctx, fading[i]);
      ctx.fill();
    }
  };

  // ---------------- start ----------------
  var reachedBottom = false;

  function start() {
    placeWave();
    var flocks = [].map.call(document.querySelectorAll('[data-flock]'), function (a) { return new Flock(a); });

    var lastW = innerWidth;
    function relayout() {
      placeWave();
      flocks.forEach(function (f) {
        f.resize(); f.measure();
        if (innerWidth !== lastW) f.spawn();   // e.g. phone rotated: re-fit the school
      });
      lastW = innerWidth;
    }
    window.addEventListener('resize', relayout);
    if (document.fonts) document.fonts.ready.then(relayout);
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(document.body);

    if (!flocks.length) return;

    if (flocks.some(function (f) { return f.drift; })) {
      window.addEventListener('scroll', function () {
        if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) reachedBottom = true;
      }, { passive: true });
    }

    // only animate schools that are on screen
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          flocks.forEach(function (f) { if (f.canvas === en.target) f.visible = en.isIntersecting; });
        });
      });
      flocks.forEach(function (f) { io.observe(f.canvas); });
    }

    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flocks.forEach(function (f) { for (var k = 0; k < 400; k++) f.step(); f.draw(); });
      return;
    }
    (function loop() {
      for (var i = 0; i < flocks.length; i++) {
        if (flocks[i].visible) { flocks[i].step(); flocks[i].draw(); }
      }
      requestAnimationFrame(loop);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
