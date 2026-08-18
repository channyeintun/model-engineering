/* =========================================================================
   Home page — the course in one animation, plus the lesson cards.
   ========================================================================= */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  function e(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function add(p) { for (var i = 1; i < arguments.length; i++) p.appendChild(arguments[i]); return p; }

  /* ----------------------------------------------------- the hero scene */

  Scene.register('pipeline', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap;
    var host = q('#pl-plot');

    var X0 = 70, FULL = 560, BY = 118, BH = 62;

    /* track */
    add(host, e('rect', {
      x: X0, y: BY, width: FULL, height: BH, rx: 10,
      fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.5, 'stroke-dasharray': '5 6'
    }));

    /* the model itself */
    var bar = e('rect', { x: X0, y: BY, width: FULL, height: BH, rx: 10, fill: 'var(--c-param)', opacity: 0.9 });
    host.appendChild(bar);

    var barLabel = e('text', { x: X0 + 16, y: BY + 37, class: 'dg-mono', 'font-size': 15, fill: 'var(--bg)', 'font-weight': 700 }, 'FP32');
    host.appendChild(barLabel);

    /* size readout */
    var sizeT = e('text', { x: X0, y: BY - 18, class: 'dg-mono', 'font-size': 22, fill: 'var(--text)' }, '3.4 GB');
    host.appendChild(sizeT);
    var stageT = e('text', { x: X0, y: BY + BH + 30, class: 'dg-label' }, 'a small language model, as it comes out of training');
    host.appendChild(stageT);

    /* quality meter */
    var qy = 252;
    add(host, e('text', { x: X0, y: qy - 10, class: 'dg-label dg-label--sm' }, 'quality kept'));
    add(host, e('rect', { x: X0, y: qy, width: 220, height: 8, rx: 4, fill: 'var(--surface-3)' }));
    var qBar = e('rect', { x: X0, y: qy, width: 220, height: 8, rx: 4, fill: 'var(--c-ok)' });
    host.appendChild(qBar);
    var qT = e('text', { x: X0 + 236, y: qy + 9, class: 'dg-mono', 'font-size': 13, fill: 'var(--c-ok)' }, '100%');
    host.appendChild(qT);

    /* the phone */
    var phone = e('g', { opacity: 0 });
    add(phone, e('rect', { x: 716, y: 42, width: 128, height: 216, rx: 20, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 2 }));
    var screen = e('rect', { x: 726, y: 58, width: 108, height: 184, rx: 12, fill: 'var(--bg)' });
    add(phone, screen);
    add(phone, e('rect', { x: 762, y: 48, width: 36, height: 5, rx: 2.5, fill: 'var(--line)' }));
    host.appendChild(phone);

    var glow = e('rect', { x: 726, y: 58, width: 108, height: 184, rx: 12, fill: 'var(--c-ok)', opacity: 0 });
    host.appendChild(glow);

    var offline = e('text', { x: 780, y: 282, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: 'var(--c-ok)', opacity: 0 }, 'offline · no server');
    host.appendChild(offline);

    var tile = e('g', { opacity: 0 });
    add(tile, e('rect', { x: 0, y: 0, width: 116, height: 62, rx: 10, fill: 'var(--c-data)' }));
    add(tile, e('text', { x: 58, y: 37, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13, fill: 'var(--accent-ink)', 'font-weight': 700 }, '.pte'));
    host.appendChild(tile);
    gsap.set(tile, { x: X0, y: BY });

    tl.step('An instruct model of 1.7 billion parameters, at two bytes each. <b>3.4 GB</b> — far too big to sit inside a phone app.');

    tl.step('<b>Lesson 06 · Distillation.</b> A smaller student model learns to copy the bigger one, keeping most of its behaviour.');
    tl.to(bar, { attr: { width: FULL * 0.212 }, duration: 0.9, ease: 'power2.inOut' });
    ctx.k.count(tl, sizeT, 3.4, 0.72, {
      duration: 0.9, position: '<',
      format: function (v) { return v >= 1 ? v.toFixed(2) + ' GB' : Math.round(v * 1000) + ' MB'; }
    });
    tl.to(qBar, { attr: { width: 220 * 0.97 }, duration: 0.9 }, '<');
    ctx.k.count(tl, qT, 100, 97, { duration: 0.9, position: '<', format: function (v) { return Math.round(v) + '%'; } });
    tl.call(function () { stageT.textContent = 'a 360 M student, taught by the 1.7 B teacher \u2014 720 MB'; });

    tl.step('<b>Lesson 07 · Quantization.</b> Store each weight in four bits instead of sixteen. The model gets four times lighter, and four times faster to read.');
    tl.to(bar, { attr: { width: FULL * 0.053 }, duration: 0.9, ease: 'power2.inOut' });
    tl.to(bar, { fill: 'var(--c-data)', duration: 0.5 }, '<');
    tl.call(function () { barLabel.textContent = 'INT4'; }, null, '<+=0.45');
    ctx.k.count(tl, sizeT, 0.72, 0.18, {
      duration: 0.9, position: '<',
      format: function (v) { return v >= 1 ? v.toFixed(2) + ' GB' : Math.round(v * 1000) + ' MB'; }
    });
    tl.to(qBar, { attr: { width: 220 * 0.95 }, duration: 0.9 }, '<');
    ctx.k.count(tl, qT, 97, 95, { duration: 0.9, position: '<', format: function (v) { return Math.round(v) + '%'; } });
    tl.call(function () { stageT.textContent = 'four bits per weight \u2014 180 MB, and most of the quality'; });

    tl.step('<b>Lesson 09 · Export.</b> Leave Python behind. The graph becomes one file that a phone runtime can open directly.');
    tl.to([bar, barLabel], { opacity: 0, duration: 0.3 });
    tl.to(tile, { opacity: 1, duration: 0.3 }, '<');
    tl.call(function () { stageT.textContent = 'one file: ExecuTorch .pte, ONNX, Core ML or GGUF'; });

    tl.step('<b>Lesson 10 · On the device.</b> It loads, it runs, and it never asks the network for anything.');
    tl.to(phone, { opacity: 1, duration: 0.4 });
    tl.to(tile, { x: 722, y: 120, duration: 0.9, ease: 'power2.inOut' });
    tl.to(tile, { opacity: 0, duration: 0.3 }, '-=0.1');
    tl.to(glow, { opacity: 0.16, duration: 0.5 }, '<');
    tl.to(offline, { opacity: 1, duration: 0.4 }, '<');
    tl.call(function () { stageT.textContent = 'the same model, now in your pocket'; });
  });

  /* ------------------------------------------------- lesson cards by part */

  document.addEventListener('DOMContentLoaded', function () {
    var host = document.getElementById('partsHost');
    if (!host || !window.COURSE) return;
    var C = window.COURSE, html = '';

    C.parts.forEach(function (p) {
      html += '<div class="part-head">' +
                '<span class="part-head__n">' + p.n + '</span>' +
                '<h2>' + p.name + '</h2>' +
                '<p>' + p.blurb + '</p>' +
              '</div><div class="cards">';
      C.lessons.filter(function (l) { return l.part === p.id; }).forEach(function (l) {
        html += '<a class="card" data-card="' + l.id + '" href="lessons/' + l.id + '.html">' +
                  '<span class="card__n">LESSON ' + l.id + '</span>' +
                  '<span class="card__t">' + l.title + '</span>' +
                  '<span class="card__d">' + l.desc + '</span>' +
                  '<span class="card__f"><span>' + l.minutes + ' min</span><span>·</span><span>' + l.project + '</span></span>' +
                '</a>';
      });
      html += '</div>';
    });
    host.innerHTML = html;
    if (window.Course) window.Course.refresh();

    /* Cards rise slightly as they come into view. */
    if (!Scene.reduced && window.gsap) {
      var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          gsap.to(en.target, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
          io.unobserve(en.target);
        });
      }, { threshold: 0.15 });
      cards.forEach(function (c) { gsap.set(c, { opacity: 0, y: 14 }); io.observe(c); });

      /* Safety net: hidden content is worse than an unanimated entrance, so
         if anything stops the observer, show every card anyway. */
      setTimeout(function () {
        cards.forEach(function (c) {
          /* gsap.set, not gsap.to: this must land even if animation frames
             are not running, which is exactly when the net is needed. */
          if (parseFloat(getComputedStyle(c).opacity) < 0.9) gsap.set(c, { opacity: 1, y: 0 });
        });
        io.disconnect();
      }, 2500);
    }
  });

})();
