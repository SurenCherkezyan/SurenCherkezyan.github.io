/* ------------------------------------------------------------------
   1. Wave: slide the header wave so its peak sits exactly halfway
      between the end of the name and the start of the nav links.
   2. Flock: a JavaScript port of my Python boids simulation (boids.py).
      Same rules and constants; slowed down ("pace") so it reads as a
      calm background, steering away from page edges, text and images.
   ------------------------------------------------------------------ */

(function () {
  // ---------------- wave ----------------
  var PEAK = 660 / 1280; // x of the wave's peak as a fraction of the drawing's width

  function placeWave() {
    var wave = document.querySelector('.wave');
    var name = document.querySelector('.name');
    var nav = document.querySelector('.nav');
    var page = document.querySelector('.page');
    if (!wave || !name || !nav || !page) return;
    var p = page.getBoundingClientRect();
    var nameEnd = name.getBoundingClientRect().right - p.left;
    var navStart = nav.getBoundingClientRect().left - p.left;
    var mid = (nameEnd + navStart) / 2;
    // on narrow screens the nav wraps under the name; then centre the peak on the page
    if (navStart <= nameEnd) mid = p.width / 2;
    wave.style.left = (mid - PEAK * wave.getBoundingClientRect().width) + 'px';
  }

  // ---------------- flock ----------------
  function Flock(area) {
    this.area = area;
    this.canvas = area.querySelector('canvas');
    this.count = parseInt(area.getAttribute('data-count') || '120', 10);
    this.drift = parseFloat(area.getAttribute('data-drift') || '0');
    this.avoid = area.hasAttribute('data-no-avoid') ? null : '[data-boid-avoid]';
    this.obstacles = [];
    this.frame = 0;
    this.reachedBottom = false;
    this.resize();
    this.refresh();
    this.spawn();
  }

  Flock.prototype.resize = function () {
    var c = this.canvas, dpr = window.devicePixelRatio || 1;
    this.W = Math.max(1, c.clientWidth);
    this.H = Math.max(1, c.clientHeight);
    c.width = Math.round(this.W * dpr);
    c.height = Math.round(this.H * dpr);
    this.ctx = c.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // text and images marked data-boid-avoid, measured in the canvas's own pixels
  Flock.prototype.refresh = function () {
    this.obstacles = [];
    if (!this.avoid) return;
    var cr = this.canvas.getBoundingClientRect();
    var els = document.querySelectorAll(this.avoid);
    for (var i = 0; i < els.length; i++) {
      var r = els[i].getBoundingClientRect();
      this.obstacles.push({ x0: r.left - cr.left, y0: r.top - cr.top, x1: r.right - cr.left, y1: r.bottom - cr.top });
    }
  };

  // as in boids.py: every boid starts at the centre heading in a random direction
  Flock.prototype.spawn = function () {
    this.boids = [];
    for (var i = 0; i < this.count; i++) {
      var a = Math.random() * Math.PI * 2;
      this.boids.push({ x: this.W / 2, y: this.H / 2, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4 });
    }
  };

  // field of view: within 120 degrees of the heading
  function canSee(p, dx, dy, d) {
    var v = Math.hypot(p.vx, p.vy);
    return v > 0 && d > 0 && (p.vx * dx + p.vy * dy) / (v * d) > -0.5;
  }

  Flock.prototype.step = function () {
    var b = this.boids, S = 4, dt = 0.35, M = 60, TURN = 0.5, obs = this.obstacles;
    var target = this.reachedBottom ? 0 : this.drift;
    this.driftNow = (this.driftNow === undefined ? target : this.driftNow) + (target - (this.driftNow || 0)) * 0.02;
    for (var i = 0; i < b.length; i++) {
      var p = b[i], ax = 0, ay = 0, na = 0, cx = 0, cy = 0, nc = 0, sx = 0, sy = 0, ns = 0;
      for (var j = 0; j < b.length; j++) {
        if (i === j) continue;
        var o = b[j], dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
        if (d <= 0 || d >= 120) continue;
        var seen = canSee(p, dx, dy, d);
        if (d < 25 && seen) { ax += o.vx; ay += o.vy; na++; }          // align, radius 25
        if (seen) { cx += dx; cy += dy; nc++; }                          // cohesion, radius 120
        if (d < 20) { sx -= dx / (d * d); sy -= dy / (d * d); ns++; }    // separation, radius 20
      }
      var accx = 0, accy = 0;
      if (na) { accx += (ax / na - p.vx) * 0.05; accy += (ay / na - p.vy) * 0.05; }
      if (nc) { accx += (cx / nc) * 0.004; accy += (cy / nc) * 0.004; }
      if (ns) { accx += sx * 10; accy += sy * 10; }
      accy += this.driftNow;                                              // optional downward lean
      var am = Math.hypot(accx, accy);
      if (am > 0.25) { accx = accx / am * 0.25; accy = accy / am * 0.25; }

      // edges of the area: turn away, harder the closer they get
      if (p.x < M) accx += TURN * (M - p.x) / M;
      if (p.x > this.W - M) accx -= TURN * (p.x - (this.W - M)) / M;
      if (p.y < M) accy += TURN * (M - p.y) / M;
      if (p.y > this.H - M) accy -= TURN * (p.y - (this.H - M)) / M;

      // text and images: the same push, from the nearest point on each block
      for (var k = 0; k < obs.length; k++) {
        var r = obs[k];
        if (r.y1 < p.y - M || r.y0 > p.y + M || r.x1 < p.x - M || r.x0 > p.x + M) continue;
        var nx = Math.max(r.x0, Math.min(p.x, r.x1)), ny = Math.max(r.y0, Math.min(p.y, r.y1));
        var ex = p.x - nx, ey = p.y - ny, ed = Math.hypot(ex, ey);
        if (ed === 0) {
          var dl = p.x - r.x0, dr = r.x1 - p.x, dtp = p.y - r.y0, db = r.y1 - p.y, mn = Math.min(dl, dr, dtp, db);
          if (mn === dl) accx -= TURN; else if (mn === dr) accx += TURN; else if (mn === dtp) accy -= TURN; else accy += TURN;
        } else if (ed < M) {
          var f = TURN * (M - ed) / M;
          accx += f * ex / ed; accy += f * ey / ed;
        }
      }

      p.vx += accx * dt; p.vy += accy * dt;
      var vm = Math.hypot(p.vx, p.vy);
      if (vm > 0) { p.vx = p.vx / vm * S; p.vy = p.vy / vm * S; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); } else if (p.x > this.W) { p.x = this.W; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); } else if (p.y > this.H) { p.y = this.H; p.vy = -Math.abs(p.vy); }
    }
  };

  // short ticks along each heading, fading out near the area's edges
  Flock.prototype.draw = function () {
    var ctx = this.ctx, col = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1f7a96';
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    for (var i = 0; i < this.boids.length; i++) {
      var p = this.boids[i], m = Math.hypot(p.vx, p.vy) || 1, hx = p.vx / m, hy = p.vy / m;
      var edge = Math.min(p.x, this.W - p.x, p.y, this.H - p.y);
      ctx.globalAlpha = 0.35 * Math.max(0, Math.min(1, edge / 30));
      ctx.beginPath();
      ctx.moveTo(p.x - hx * 4.5, p.y - hy * 4.5);
      ctx.lineTo(p.x + hx * 2.5, p.y + hy * 2.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  // ---------------- start ----------------
  function start() {
    placeWave();
    var flocks = [];
    var areas = document.querySelectorAll('[data-flock]');
    for (var i = 0; i < areas.length; i++) flocks.push(new Flock(areas[i]));

    function onResize() {
      placeWave();
      flocks.forEach(function (f) { f.resize(); f.refresh(); });
    }
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

    // the downward lean switches off once the visitor reaches the bottom of the page
    window.addEventListener('scroll', function () {
      var de = document.documentElement;
      if (de.scrollHeight - innerHeight > 8 && innerHeight + scrollY >= de.scrollHeight - 4) {
        flocks.forEach(function (f) { f.reachedBottom = true; });
      }
      flocks.forEach(function (f) { f.refresh(); });
    }, { passive: true });

    if (!flocks.length) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flocks.forEach(function (f) { for (var k = 0; k < 400; k++) f.step(); f.draw(); });
      return;
    }
    (function loop() {
      flocks.forEach(function (f) {
        if (++f.frame % 30 === 0) f.refresh();
        f.step();
        f.draw();
      });
      requestAnimationFrame(loop);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
