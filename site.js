/* ------------------------------------------------------------------
   1. Wave: slide the header wave so its peak sits exactly halfway
      between the end of the name and the start of the nav links.
   2. Flock: a JavaScript port of my Python boids simulation (boids.py).
      Same rules and constants, slowed down to read as a calm background,
      steering away from the edges of its area and from text and images.

   Flock options, set on <div class="flock" data-flock ...>:
     data-count   number of boids
     data-origin  "bottom" (default) or "right": where the flock starts
     data-drift   downward lean; switched off once the visitor reaches the bottom
   ------------------------------------------------------------------ */

(function () {
  var PEAK = 660 / 1280;   // x of the wave's peak, as a fraction of the drawing's width
  var SPEED = 4;           // boids.py speed
  var PACE = 0.35;         // fraction of one boids.py frame per screen frame (calmer motion)
  var EDGE = 60;           // distance at which edges and text start pushing (px)
  var TURN = 0.5;          // strength of that push at contact
  var CELL = 120;          // neighbour grid cell = largest perception radius (cohesion)

  var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1f7a96';

  // ---------------- wave ----------------
  function placeWave() {
    var wave = document.querySelector('.wave'), name = document.querySelector('.name'),
        nav = document.querySelector('.nav'), page = document.querySelector('.page');
    if (!wave || !name || !nav || !page) return;
    var left = page.getBoundingClientRect().left;
    var nameEnd = name.getBoundingClientRect().right - left;
    var navStart = nav.getBoundingClientRect().left - left;
    // on narrow screens the nav wraps under the name; then centre the peak on the page
    var mid = navStart > nameEnd ? (nameEnd + navStart) / 2 : page.clientWidth / 2;
    wave.style.left = (mid - PEAK * wave.getBoundingClientRect().width) + 'px';
  }

  // ---------------- flock ----------------
  function Flock(area) {
    this.canvas = area.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.count = +area.getAttribute('data-count') || 120;
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
    c.width = Math.round(this.W * dpr);
    c.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Text and images marked data-boid-avoid, in the canvas's own pixels.
  // Only needed when the layout changes (resize, images loading), not every frame.
  Flock.prototype.measure = function () {
    var cr = this.canvas.getBoundingClientRect(), els = document.querySelectorAll('[data-boid-avoid]');
    this.obstacles = [];
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.bottom < cr.top - EDGE || r.top > cr.bottom + EDGE) continue;
      this.obstacles.push({ x0: r.left - cr.left, y0: r.top - cr.top, x1: r.right - cr.left, y1: r.bottom - cr.top });
    }
  };

  // As in boids.py, the flock bursts out from one point in random directions:
  // bottom-centre of its area, or the upper right side on project pages.
  Flock.prototype.spawn = function () {
    var x = this.origin === 'right' ? this.W - EDGE - 20 : this.W / 2;
    var y = this.origin === 'right' ? EDGE + 40 : this.H - EDGE - 20;
    this.boids = [];
    for (var i = 0; i < this.count; i++) {
      var a = Math.random() * Math.PI * 2;
      this.boids.push({ x: x, y: y, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED });
    }
  };

  Flock.prototype.step = function () {
    var b = this.boids, W = this.W, H = this.H, obs = this.obstacles, i, j, k;
    this.driftNow += ((reachedBottom ? 0 : this.drift) - this.driftNow) * 0.02;

    // bucket boids into a grid so each one only checks nearby cells (not the whole flock)
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
          var seen = p.vx * dx + p.vy * dy > -0.5 * SPEED * d;     // within 120 degrees of heading
          if (seen) {
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
      if (p.x < EDGE) accx += TURN * (EDGE - p.x) / EDGE;
      else if (p.x > W - EDGE) accx -= TURN * (p.x - W + EDGE) / EDGE;
      if (p.y < EDGE) accy += TURN * (EDGE - p.y) / EDGE;
      else if (p.y > H - EDGE) accy -= TURN * (p.y - H + EDGE) / EDGE;

      // text and images: the same push, from the nearest point on each block
      for (k = 0; k < obs.length; k++) {
        var r = obs[k];
        if (r.y1 < p.y - EDGE || r.y0 > p.y + EDGE || r.x1 < p.x - EDGE || r.x0 > p.x + EDGE) continue;
        var ex = p.x - Math.max(r.x0, Math.min(p.x, r.x1)), ey = p.y - Math.max(r.y0, Math.min(p.y, r.y1));
        var ed = Math.sqrt(ex * ex + ey * ey);
        if (ed === 0) {   // inside a block: leave through the nearest side
          var l = p.x - r.x0, rt = r.x1 - p.x, t = p.y - r.y0, bt = r.y1 - p.y, m = Math.min(l, rt, t, bt);
          if (m === l) accx -= TURN; else if (m === rt) accx += TURN; else if (m === t) accy -= TURN; else accy += TURN;
        } else if (ed < EDGE) {
          var f = TURN * (EDGE - ed) / (EDGE * ed);
          accx += ex * f; accy += ey * f;
        }
      }

      p.vx += accx * PACE; p.vy += accy * PACE;
      var vm = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
      p.vx *= SPEED / vm; p.vy *= SPEED / vm;
      p.x = Math.min(W, Math.max(0, p.x + p.vx * PACE));
      p.y = Math.min(H, Math.max(0, p.y + p.vy * PACE));
    }
  };

  // short ticks along each heading; boids within 30 px of the area's edge fade out
  Flock.prototype.draw = function () {
    var ctx = this.ctx, b = this.boids, W = this.W, H = this.H, i, p, e, fading = [];
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();                       // one path for every fully visible boid
    for (i = 0; i < b.length; i++) {
      p = b[i];
      e = Math.min(p.x, W - p.x, p.y, H - p.y);
      if (e < 30) { fading.push(p, e); continue; }
      ctx.moveTo(p.x - p.vx * 1.125, p.y - p.vy * 1.125);
      ctx.lineTo(p.x + p.vx * 0.625, p.y + p.vy * 0.625);
    }
    ctx.stroke();
    for (i = 0; i < fading.length; i += 2) {
      p = fading[i];
      ctx.globalAlpha = 0.35 * Math.max(0, fading[i + 1]) / 30;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 1.125, p.y - p.vy * 1.125);
      ctx.lineTo(p.x + p.vx * 0.625, p.y + p.vy * 0.625);
      ctx.stroke();
    }
  };

  // ---------------- start ----------------
  var reachedBottom = false;

  function start() {
    placeWave();
    var flocks = [].map.call(document.querySelectorAll('[data-flock]'), function (a) { return new Flock(a); });

    function relayout() {
      placeWave();
      flocks.forEach(function (f) { f.resize(); f.measure(); });
    }
    window.addEventListener('resize', relayout);
    if (document.fonts) document.fonts.ready.then(relayout);
    // re-measure when the page's layout changes, e.g. once images finish loading
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(document.body);

    if (!flocks.length) return;

    // the downward lean switches off once the visitor reaches the bottom of the page
    if (flocks.some(function (f) { return f.drift; })) {
      window.addEventListener('scroll', function () {
        var de = document.documentElement;
        if (innerHeight + scrollY >= de.scrollHeight - 4) reachedBottom = true;
      }, { passive: true });
    }

    // only animate flocks that are on screen
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
