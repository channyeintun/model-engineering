/* =========================================================================
   Lesson 01 — animated figures.
   Six scenes: gradient descent, tensor shapes, autograd, cross-entropy,
   optimizers, the training loop, and reading a loss curve.
   ========================================================================= */

(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* Tiny SVG builder: e('rect', {x:1}, 'text') */
  function e(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) parent.appendChild(arguments[i]);
    return parent;
  }

  /* A labelled box, the basic unit of most diagrams here. */
  function box(x, y, w, h, opts) {
    opts = opts || {};
    var g = e('g', { opacity: opts.opacity != null ? opts.opacity : 0 });
    add(g, e('rect', {
      x: x, y: y, width: w, height: h, rx: opts.rx || 10,
      fill: opts.fill || 'var(--surface-2)',
      stroke: opts.stroke || 'var(--line)', 'stroke-width': opts.sw || 1.5
    }));
    if (opts.title) {
      add(g, e('text', {
        x: x + w / 2, y: y + (opts.sub ? 28 : h / 2 + 5),
        'text-anchor': 'middle', class: 'dg-title'
      }, opts.title));
    }
    if (opts.sub) {
      add(g, e('text', {
        x: x + w / 2, y: y + 52, 'text-anchor': 'middle',
        class: 'dg-mono', fill: opts.subFill || 'var(--c-data)', 'font-size': 14
      }, opts.sub));
    }
    if (opts.note) {
      add(g, e('text', {
        x: x + w / 2, y: y + h + 20, 'text-anchor': 'middle',
        class: 'dg-label dg-label--sm'
      }, opts.note));
    }
    return g;
  }

  function arrow(x1, y1, x2, y2, opts) {
    opts = opts || {};
    var g = e('g', { opacity: opts.opacity != null ? opts.opacity : 0 });
    add(g, e('line', {
      x1: x1, y1: y1, x2: x2 - 8, y2: y2,
      stroke: opts.stroke || 'var(--text-dim)', 'stroke-width': opts.sw || 1.6,
      'stroke-linecap': 'round'
    }));
    add(g, e('path', {
      d: 'M' + x2 + ',' + y2 + ' l-9,-4.5 l0,9 z',
      fill: opts.stroke || 'var(--text-dim)'
    }));
    return g;
  }

  /* ======================================================================
     Scene 1 — gradient descent
     ====================================================================== */

  Scene.register('gd', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap;

    /* Real gradient descent on this curve, not equally spaced samples.
       For a quadratic loss the distance to the minimum shrinks by a constant
       factor each step, so the steps get visibly smaller on their own — which
       is the whole point the caption makes. Earlier these six points were
       spaced 56 px apart and the picture argued against its own caption.
       Curve: x(t) = 100 + 700t, y(t) = 60 + 700t - 662t^2; minimum at x = 470. */
    var P = [[170, 123.4], [284, 198.3], [354.7, 227.1], [398.6, 238.1], [425.7, 242.4], [442.6, 244]];
    var ANG = [39.0, 26.7, 17.3, 10.9, 6.8, 4.2];
    var LOSS = [2.94, 1.13, 0.43, 0.17, 0.06, 0.02];
    var STEP = ['0.42', '0.26', '0.16', '0.10', '0.06'];

    var curve = q('#gd-curve'), ball = q('#gd-ball'), tan = q('#gd-tan'),
        min = q('#gd-min'), readout = q('#gd-readout'),
        lossT = q('#gd-loss'), stepT = q('#gd-step'), trail = q('#gd-steps');

    gsap.set(ball, { x: P[0][0], y: P[0][1] });
    gsap.set(tan, { x: P[0][0], y: P[0][1], rotation: ANG[0] });

    tl.step('The loss depends on the weight. We can never see this whole curve — the model has millions of weights. We can only stand at one point and measure.');
    ctx.k.draw(tl, curve, { duration: 1.0 });
    tl.to(curve, { opacity: 1, duration: 0.01 }, 0);

    tl.step('The model starts at a <b>random weight</b>. The loss is high, and we do not know which way is down.');
    tl.to([ball, readout], { opacity: 1, duration: 0.4 });

    tl.step('So we measure the <b>slope</b> at exactly this point. That slope is the gradient: <span class="kw">∂L/∂w</span>.');
    tl.to(tan, { opacity: 1, duration: 0.35 });
    ctx.k.pulse(tl, tan, { scale: 1.08 });

    tl.step('Step in the <b>opposite</b> direction of the slope — but only a small fraction of it. That fraction is the learning rate.');
    stepAt(1);

    tl.step('Repeat. Notice what happens without anyone asking: as the curve flattens, the slope shrinks, so <b>the steps shrink by themselves</b>.');
    stepAt(2); stepAt(3); stepAt(4); stepAt(5);
    tl.to(min, { opacity: 1, duration: 0.4 }, '-=0.2');
    tl.to(tan, { opacity: 0.35, duration: 0.3 }, '<');

    tl.step('Now make the learning rate too large. Every step jumps <b>past</b> the valley, and the loss climbs instead of falling. This is what a <span class="kw">nan</span> looks like a few steps before it appears.');
    tl.to(trail, { opacity: 0.25, duration: 0.3 });
    tl.to(min, { opacity: 0.3, duration: 0.3 }, '<');
    tl.set(ball, { x: P[0][0], y: P[0][1] });
    tl.to(ball.querySelector('circle'), { fill: 'var(--c-loss)', duration: 0.2 });
    tl.set(stepT, { fill: 'var(--c-loss)' });
    /* Both landings must sit HIGHER on the curve than the start (y = 123.4 at
       x = 170), or the ball visibly drops while the loss readout climbs. The
       curve is y = 60 + 700t - 662t², x = 100 + 700t, so it only rises back
       above the starting height past x ≈ 770. x = 790 gives y = 106.8. */
    tl.to(ball, { x: 790, y: 106.8, duration: 0.5, ease: 'power1.inOut' });
    ctx.k.count(tl, lossT, 2.94, 3.65, { duration: 0.5, decimals: 2, position: '<' });
    tl.call(function () { stepT.textContent = '2.10'; });
    tl.to(ball, { x: 121, y: 80.4, duration: 0.5, ease: 'power1.inOut' });
    ctx.k.count(tl, lossT, 3.65, 4.9, { duration: 0.5, decimals: 2, position: '<' });
    tl.call(function () { stepT.textContent = '5.80'; });
    ctx.k.pulse(tl, lossT, { scale: 1.3 });

    function stepAt(i) {
      var from = P[i - 1], to = P[i];
      tl.to(ball, { x: to[0], y: to[1], duration: 0.55, ease: 'power2.inOut' });
      tl.to(tan, { x: to[0], y: to[1], rotation: ANG[i], duration: 0.55, ease: 'power2.inOut' }, '<');
      ctx.k.count(tl, lossT, LOSS[i - 1], LOSS[i], { duration: 0.55, decimals: 2, position: '<' });
      tl.call(function () {
        stepT.textContent = STEP[i - 1];
        var d = e('circle', { cx: from[0], cy: from[1], r: 3.5, fill: 'var(--c-data)', opacity: 0.4 });
        trail.appendChild(d);
      }, null, '<');
    }
  });

  /* ======================================================================
     Scene 2 — tensor shapes
     ====================================================================== */

  Scene.register('shapes', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap;
    var host = q('#sh-stations'), flow = q('#sh-flow');

    var st = [
      { x: 24,  t: 'input',            s: '(32, 1, 28, 28)', n: 'a batch of images' },
      { x: 244, t: 'view(32, -1)',     s: '(32, 784)',       n: 'each image is one long row' },
      { x: 464, t: 'Linear 784→128',   s: '(32, 128)',       n: 'squeezed into 128 features' },
      { x: 684, t: 'Linear 128→10',    s: '(32, 10)',        n: 'one score per digit' }
    ];
    var W = 192, H = 96, Y = 56;
    var groups = [];

    st.forEach(function (s, i) {
      var g = box(s.x, Y, W, H, { title: s.t, sub: s.s, note: s.n });
      host.appendChild(g);
      groups.push(g);
      if (i < st.length - 1) {
        host.appendChild(arrow(s.x + W + 4, Y + H / 2, st[i + 1].x - 4, Y + H / 2));
      }
    });
    var arrows = Array.prototype.slice.call(host.querySelectorAll('g')).filter(function (g) {
      return groups.indexOf(g) === -1;
    });

    /* the travelling dot */
    var dot = e('circle', { r: 6, fill: 'var(--c-data)', opacity: 0, cy: Y + H / 2, cx: 0 });
    flow.appendChild(dot);

    /* the "32" that never changes */
    var underline = e('rect', { x: 0, y: 0, width: 26, height: 3, rx: 2, fill: 'var(--c-ok)', opacity: 0 });
    flow.appendChild(underline);

    tl.step('A batch of 32 grey images. Four numbers: <b>batch, channels, height, width</b>.');
    tl.to(groups[0], { opacity: 1, duration: 0.45 });

    tl.step('Flatten each image into a single row of 784 numbers. 1 × 28 × 28 = 784.');
    tl.to(arrows[0], { opacity: 1, duration: 0.25 });
    tl.to(dot, { opacity: 1, cx: st[0].x + W, duration: 0.01 });
    tl.to(dot, { cx: st[1].x, duration: 0.45, ease: 'none' });
    tl.to(groups[1], { opacity: 1, duration: 0.4 }, '-=0.15');

    /* The two linear layers share one step: the walkthrough describes them in
       one breath, and splitting them left the second station unnarrated. */
    tl.step('A linear layer maps 784 numbers to 128 — the matrix is <span class="kw">(784, 128)</span>, and the shared dimension disappears. Then a second layer takes 128 down to 10, one score for each digit from 0 to 9.');
    tl.to(arrows[1], { opacity: 1, duration: 0.25 });
    tl.to(dot, { cx: st[2].x, duration: 0.45, ease: 'none' });
    tl.to(groups[2], { opacity: 1, duration: 0.4 }, '-=0.15');
    tl.to(arrows[2], { opacity: 1, duration: 0.25 });
    tl.to(dot, { cx: st[3].x, duration: 0.45, ease: 'none' });
    tl.to(groups[3], { opacity: 1, duration: 0.4 }, '-=0.15');
    tl.to(dot, { opacity: 0, duration: 0.2 });

    tl.step('Now look at the <b>first number in every shape</b>. It never changed. The 32 examples travel side by side and never mix — that is all a batch is.');
    tl.call(function () {
      /* place a marker under each leading "32" */
      flow.querySelectorAll('.sh-mark').forEach(function (n) { n.remove(); });
      st.forEach(function (s) {
        var m = e('rect', {
          class: 'sh-mark', x: s.x + W / 2 - 34, y: Y + 58, width: 22, height: 2.5,
          rx: 2, fill: 'var(--c-ok)', opacity: 0
        });
        flow.appendChild(m);
        gsap.to(m, { opacity: 1, duration: 0.3, delay: 0.05 });
      });
    });
    tl.to({}, { duration: 0.5 });
    tl.to(underline, { opacity: 0, duration: 0.01 });
  });

  /* ======================================================================
     Scene 3 — autograd
     ====================================================================== */

  Scene.register('autograd', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap;
    var host = q('#ag-graph');

    var Y = 88, R = 30;
    var nodes = [
      { id: 'w', x: 80,  y: Y - 42, label: 'w', val: '3.0', kind: 'param' },
      { id: 'x', x: 80,  y: Y + 62, label: 'x', val: '2.0', kind: 'data' },
      { id: 'mul', x: 250, y: Y + 10, label: '×', val: 'y = 6.0', kind: 'op' },
      { id: 'sub', x: 430, y: Y + 10, label: '− 10', val: 'u = −4.0', kind: 'op' },
      { id: 'sq',  x: 610, y: Y + 10, label: 'u²', val: 'L = 16.0', kind: 'op' },
      { id: 'L',   x: 780, y: Y + 10, label: 'loss', val: '16.0', kind: 'loss' }
    ];
    var byId = {};

    nodes.forEach(function (n) {
      var fill = n.kind === 'param' ? 'var(--c-param-dim)'
               : n.kind === 'data'  ? 'var(--c-data-dim)'
               : n.kind === 'loss'  ? 'var(--c-loss-dim)' : 'var(--surface-2)';
      var stroke = n.kind === 'param' ? 'var(--c-param)'
                 : n.kind === 'data'  ? 'var(--c-data)'
                 : n.kind === 'loss'  ? 'var(--c-loss)' : 'var(--line)';
      var g = e('g', { opacity: 0 });
      add(g, e('circle', { cx: n.x, cy: n.y, r: R, fill: fill, stroke: stroke, 'stroke-width': 1.8 }));
      add(g, e('text', { x: n.x, y: n.y + 5, 'text-anchor': 'middle', class: 'dg-title' }, n.label));
      var v = e('text', { x: n.x, y: n.y + R + 20, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm', opacity: 0 }, n.val);
      add(g, v);
      host.appendChild(g);
      byId[n.id] = { g: g, v: v, n: n };
    });

    var edges = [
      ['w', 'mul'], ['x', 'mul'], ['mul', 'sub'], ['sub', 'sq'], ['sq', 'L']
    ];
    var edgeEls = edges.map(function (pair) {
      var a = byId[pair[0]].n, b = byId[pair[1]].n;
      var p = e('path', {
        d: 'M' + (a.x + R) + ',' + a.y + ' C' + (a.x + R + 40) + ',' + a.y + ' ' +
           (b.x - R - 40) + ',' + b.y + ' ' + (b.x - R) + ',' + b.y,
        fill: 'none', stroke: 'var(--line)', 'stroke-width': 2, opacity: 0
      });
      host.appendChild(p);
      return p;
    });

    /* backward labels */
    var grads = [
      { x: 700, y: 205, t: '∂L/∂u = −8' },
      { x: 520, y: 205, t: '∂L/∂y = −8' },
      { x: 300, y: 205, t: '∂L/∂w = −16' }
    ].map(function (g) {
      var t = e('text', { x: g.x, y: g.y, 'text-anchor': 'middle', class: 'dg-mono', fill: 'var(--c-grad)', 'font-size': 13, opacity: 0 }, g.t);
      host.appendChild(t);
      return t;
    });

    var backArrow = e('path', {
      d: 'M790,175 L110,175', fill: 'none', stroke: 'var(--c-grad)', 'stroke-width': 2,
      'stroke-dasharray': '6 5', opacity: 0, 'marker-end': ''
    });
    host.appendChild(backArrow);
    var backHead = e('path', { d: 'M110,175 l10,-5 l0,10 z', fill: 'var(--c-grad)', opacity: 0 });
    host.appendChild(backHead);

    tl.step('The smallest real example: one weight <b>w = 3</b>, one input <b>x = 2</b>. You write ordinary Python, and PyTorch quietly records <b>every operation</b> you perform, in order.');
    tl.to([byId.w.g, byId.x.g], { opacity: 1, duration: 0.4, stagger: 0.1 });
    tl.to([byId.w.v, byId.x.v], { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Forward pass: data flows left to right. Each node also remembers what it did and what came in.');
    edgeEls.forEach(function (p, i) {
      tl.to(p, { opacity: 1, duration: 0.22 }, i === 0 ? undefined : '-=0.05');
      if (i >= 1) {
        var target = byId[edges[i][1]];
        tl.to(target.g, { opacity: 1, duration: 0.3 }, '-=0.12');
        tl.to(target.v, { opacity: 1, duration: 0.25 }, '-=0.1');
      } else {
        tl.to(byId.mul.g, { opacity: 1, duration: 0.3 }, '-=0.12');
        tl.to(byId.mul.v, { opacity: 1, duration: 0.25 }, '-=0.1');
      }
    });
    tl.to(edgeEls, { stroke: 'var(--c-data)', duration: 0.4, stagger: 0.05 });

    tl.step('Call <span class="kw">loss.backward()</span> and PyTorch walks that recording <b>backwards</b>.');
    tl.to([backArrow, backHead], { opacity: 1, duration: 0.4 });
    ctx.k.draw(tl, backArrow, { duration: 0.7, reverse: false });

    tl.step('At each step it multiplies by that operation\'s own derivative. This is the chain rule, done for you.');
    tl.to(grads[0], { opacity: 1, duration: 0.3 });
    tl.to(grads[1], { opacity: 1, duration: 0.3 }, '+=0.15');
    tl.to(grads[2], { opacity: 1, duration: 0.3 }, '+=0.15');

    tl.step('The answer lands in <span class="kw">w.grad = −16</span>. Negative, so raising <b>w</b> would lower the loss — and the update rule subtracts, so <b>w</b> goes up.');
    ctx.k.pulse(tl, byId.w.g, { scale: 1.15 });
    tl.to(byId.w.g.querySelector('circle'), { stroke: 'var(--c-grad)', 'stroke-width': 3, duration: 0.4 }, '<');
  });

  /* ======================================================================
     Scene 4 — cross-entropy
     ====================================================================== */

  Scene.register('ce', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap;
    var host = q('#ce-plot');

    var logits = [-0.4, 1.2, 0.3, 2.1, -1.1, 0.6];
    var probs  = [0.043, 0.212, 0.086, 0.521, 0.021, 0.116];
    var after  = [0.018, 0.058, 0.024, 0.860, 0.008, 0.032];
    var CORRECT = 3;

    /* SCALE maps a probability of 1.0 to this many pixels of bar. */
    var BASE = 236, SCALE = 190, BW = 58, GAP = 34, X0 = 120;
    var bars = [], caps = [];

    add(host, e('line', { x1: 90, y1: BASE, x2: 640, y2: BASE, stroke: 'var(--line)', 'stroke-width': 1.5 }));

    logits.forEach(function (v, i) {
      var x = X0 + i * (BW + GAP);
      var h = Math.abs(v) * 42;
      var up = v >= 0;
      var r = e('rect', {
        x: x, y: up ? BASE - h : BASE, width: BW, height: h, rx: 5,
        fill: i === CORRECT ? 'var(--c-ok)' : 'var(--c-data)', opacity: 0
      });
      host.appendChild(r); bars.push(r);

      var c = e('text', { x: x + BW / 2, y: BASE + 24, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm' }, String(i));
      host.appendChild(c);

      var val = e('text', {
        x: x + BW / 2, y: up ? BASE - h - 9 : BASE + h + 18, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 12, opacity: 0,
        fill: i === CORRECT ? 'var(--c-ok)' : 'var(--text-dim)'
      }, v.toFixed(1));
      host.appendChild(val); caps.push(val);
    });

    add(host, e('text', { x: 90, y: BASE + 46, class: 'dg-label dg-label--sm' }, 'class'));

    var title = e('text', { x: 90, y: 26, class: 'dg-title', opacity: 0 }, 'raw scores (logits)');
    host.appendChild(title);

    var arrowTag = e('text', { x: X0 + CORRECT * (BW + GAP) + BW / 2, y: BASE + 46, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm', fill: 'var(--c-ok)', opacity: 0 }, '↑ correct');
    host.appendChild(arrowTag);

    /* loss readout */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', { x: 690, y: 66, width: 190, height: 120, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(panel, e('text', { x: 785, y: 94, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'p (correct class)'));
    var pT = e('text', { x: 785, y: 122, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 22, fill: 'var(--c-ok)' }, '0.52');
    add(panel, pT);
    add(panel, e('text', { x: 785, y: 148, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'loss = −log p'));
    var lT = e('text', { x: 785, y: 174, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 22, fill: 'var(--c-loss)' }, '0.65');
    add(panel, lT);
    host.appendChild(panel);

    tl.step('The model produces one <b>raw score</b> per class. They can be negative, and they do not add up to anything.');
    tl.to(bars, { opacity: 1, duration: 0.4, stagger: 0.05 });
    tl.to(caps, { opacity: 1, duration: 0.3 }, '-=0.2');
    tl.to(title, { opacity: 1, duration: 0.3 }, '<');

    tl.step('<b>Softmax</b> exponentiates them and divides by the total. Now they are probabilities: all positive, adding to 1.');
    tl.to(title, { opacity: 0, duration: 0.2 });
    tl.call(function () { title.textContent = 'probabilities after softmax'; });
    tl.to(title, { opacity: 1, duration: 0.2 });
    probs.forEach(function (p, i) {
      var h = p * SCALE;
      var x = X0 + i * (BW + GAP);
      tl.to(bars[i], { attr: { y: BASE - h, height: h }, duration: 0.6, ease: 'power2.inOut' }, i === 0 ? undefined : '<');
      tl.to(caps[i], { attr: { y: BASE - h - 9 }, duration: 0.6, ease: 'power2.inOut' }, '<');
      tl.call(function () { caps[i].textContent = p.toFixed(2); }, null, '<');
    });

    tl.step('Only <b>one</b> of these bars is graded: the one for the correct class. Everything else is ignored by the loss.');
    tl.to(arrowTag, { opacity: 1, duration: 0.3 });
    ctx.k.dim(tl, bars.filter(function (_, i) { return i !== CORRECT; }), { to: 0.2, position: '<' });
    ctx.k.dim(tl, caps.filter(function (_, i) { return i !== CORRECT; }), { to: 0.2, position: '<' });
    tl.to(panel, { opacity: 1, duration: 0.35 });

    tl.step('Training pushes that one bar up. As <b>p</b> rises toward 1, the loss falls toward 0. That is the entire objective.');
    var h2 = after[CORRECT] * SCALE;
    tl.to(bars[CORRECT], { attr: { y: BASE - h2, height: h2 }, duration: 1.1, ease: 'power2.inOut' });
    tl.to(caps[CORRECT], { attr: { y: BASE - h2 - 9 }, duration: 1.1, ease: 'power2.inOut' }, '<');
    ctx.k.count(tl, caps[CORRECT], 0.521, 0.86, { duration: 1.1, decimals: 2, position: '<' });
    ctx.k.count(tl, pT, 0.52, 0.86, { duration: 1.1, decimals: 2, position: '<' });
    ctx.k.count(tl, lT, 0.65, 0.15, { duration: 1.1, decimals: 2, position: '<' });

    tl.step('If the model had been <b>confidently wrong</b> — p = 0.01 — the loss would be 4.6 instead of 0.15. Confident mistakes are punished hardest.');
    ctx.k.pulse(tl, lT, { scale: 1.35 });
  });

  /* ======================================================================
     Scene 5 — optimizers
     ====================================================================== */

  Scene.register('optim', function (ctx) {
    var tl = ctx.tl, q = ctx.q;
    var host = q('#op-plot');

    /* The valley: lines of equal loss, stretched so it is long and narrow. */
    var CX = 560, CY = 168;
    for (var i = 5; i >= 1; i--) {
      host.appendChild(e('ellipse', {
        cx: CX, cy: CY, rx: 52 * i, ry: 19 * i,
        transform: 'rotate(-8 ' + CX + ' ' + CY + ')',
        fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.2, opacity: 0.7
      }));
    }
    host.appendChild(e('circle', { cx: CX, cy: CY, r: 5, fill: 'var(--c-ok)' }));
    host.appendChild(e('text', { x: CX, y: CY + 26, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm', fill: 'var(--c-ok)' }, 'minimum'));

    var paths = [
      { name: 'SGD', color: 'var(--c-frozen)',
        d: 'M110,48 L160,255 L215,70 L272,248 L325,92 L378,232 L425,110 L470,215 L505,132 L540,196 L560,168' },
      { name: '+ momentum', color: 'var(--c-param)',
        d: 'M110,48 C160,140 185,205 230,196 C285,185 290,118 340,124 C400,131 415,190 468,184 C515,179 535,158 560,166' },
      { name: 'Adam', color: 'var(--c-data)',
        d: 'M110,48 C200,88 250,132 320,150 C410,173 480,166 560,167' }
    ];

    var els = paths.map(function (p, i) {
      var el = e('path', {
        d: p.d, fill: 'none', stroke: p.color, 'stroke-width': 2.4,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0
      });
      host.appendChild(el);
      var g = e('g', { opacity: 0 });
      add(g, e('rect', { x: 646, y: 24 + i * 24, width: 12, height: 3, rx: 1.5, fill: p.color }));
      add(g, e('text', { x: 666, y: 30 + i * 24, class: 'dg-mono', 'font-size': 13, fill: p.color }, p.name));
      host.appendChild(g);
      return { path: el, label: g };
    });

    host.appendChild(e('circle', { cx: 110, cy: 48, r: 6, fill: 'var(--text-soft)' }));
    host.appendChild(e('text', { x: 110, y: 32, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm' }, 'start'));

    tl.step('Two parameters now, so the loss is a landscape seen from above. The rings are lines of equal loss, like a hiking map. The centre is the bottom of the valley.');

    tl.step('<b>SGD</b> — plain stochastic gradient descent — follows the steepest slope, which points across the valley, not along it. So it crosses the valley again and again.');
    tl.to(els[0].path, { opacity: 1, duration: 0.01 });
    ctx.k.draw(tl, els[0].path, { duration: 1.6, ease: 'none' });
    tl.to(els[0].label, { opacity: 1, duration: 0.3 }, '-=0.4');

    tl.step('<b>Momentum</b> averages recent gradients. The side-to-side parts cancel, the forward part adds up.');
    tl.to(els[1].path, { opacity: 1, duration: 0.01 });
    ctx.k.draw(tl, els[1].path, { duration: 1.2, ease: 'none' });
    tl.to(els[1].label, { opacity: 1, duration: 0.3 }, '-=0.4');
    ctx.k.dim(tl, els[0].path, { to: 0.4, position: '<' });

    tl.step('<b>Adam</b> also tracks how big each parameter\'s recent gradients have been, and divides its step by that. That is why it works with almost no tuning — and why it stores two extra numbers per parameter.');
    tl.to(els[2].path, { opacity: 1, duration: 0.01 });
    ctx.k.draw(tl, els[2].path, { duration: 1.0, ease: 'none' });
    tl.to(els[2].label, { opacity: 1, duration: 0.3 }, '-=0.4');
    ctx.k.dim(tl, els[1].path, { to: 0.4, position: '<' });

    tl.step('Use <b>AdamW</b> by default. Every model you meet in this course was trained with it.');
    ctx.k.pulse(tl, els[2].label, { scale: 1.2 });
  });

  /* ======================================================================
     Scene 6 — the training loop
     ====================================================================== */

  Scene.register('loop', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap;
    var host = q('#lp-plot');

    var CX = 400, CY = 168, R = 118;
    var stations = [
      { a: -90,  n: '1', t: 'zero_grad()',  d: 'clear old gradients', c: 'var(--c-frozen)' },
      { a: -18,  n: '2', t: 'forward',      d: 'build the tape',      c: 'var(--c-data)' },
      { a: 54,   n: '3', t: 'loss',         d: 'one number',          c: 'var(--c-loss)' },
      { a: 126,  n: '4', t: 'backward()',   d: 'fill .grad',          c: 'var(--c-grad)' },
      { a: 198,  n: '5', t: 'step()',       d: 'nudge the weights',   c: 'var(--c-param)' }
    ];

    stations.forEach(function (s) {
      var rad = s.a * Math.PI / 180;
      s.x = CX + R * Math.cos(rad);
      s.y = CY + R * Math.sin(rad);
    });

    /* connecting ring */
    host.appendChild(e('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }));

    var nodes = stations.map(function (s) {
      var g = e('g', { opacity: 0.28 });
      add(g, e('circle', { cx: s.x, cy: s.y, r: 27, fill: 'var(--surface-2)', stroke: s.c, 'stroke-width': 2 }));
      add(g, e('text', { x: s.x, y: s.y + 6, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 15, fill: s.c }, s.n));
      var lx = s.x + (s.x > CX ? 40 : s.x < CX - 10 ? -40 : 0);
      var anchor = s.x > CX + 10 ? 'start' : s.x < CX - 10 ? 'end' : 'middle';
      var ly = s.y + (Math.abs(s.x - CX) < 12 ? (s.y < CY ? -42 : 48) : 0);
      add(g, e('text', { x: lx, y: ly, 'text-anchor': anchor, class: 'dg-mono', 'font-size': 13, fill: 'var(--text)' }, s.t));
      add(g, e('text', { x: lx, y: ly + 16, 'text-anchor': anchor, class: 'dg-label dg-label--sm' }, s.d));
      host.appendChild(g);
      return g;
    });

    /* centre readout */
    var centre = e('text', { x: CX, y: CY + 5, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13, fill: 'var(--text-dim)', opacity: 0 }, 'one batch');
    host.appendChild(centre);

    /* gradient bar for the failure demo */
    var failG = e('g', { opacity: 0 });
    add(failG, e('text', { x: 690, y: 96, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'size of .grad'));
    add(failG, e('rect', { x: 660, y: 108, width: 60, height: 150, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.2 }));
    var failBar = e('rect', { x: 663, y: 228, width: 54, height: 27, rx: 4, fill: 'var(--c-grad)' });
    add(failG, failBar);
    var failTxt = e('text', { x: 690, y: 276, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm', fill: 'var(--c-grad)' }, 'batch 1');
    add(failG, failTxt);
    host.appendChild(failG);

    tl.step('Every training run is this cycle, repeated. Once per batch, thousands of times per epoch.');
    tl.to(centre, { opacity: 1, duration: 0.3 });

    stations.forEach(function (s, i) {
      var caption = [
        'First: <b>throw away last batch\'s gradients</b>. PyTorch adds to <span class="kw">.grad</span> instead of replacing it, so this line is not optional.',
        '<b>Forward.</b> Data flows through the model and the tape is recorded.',
        'The <b>loss</b> compares the output with the target and gives one number.',
        '<b>Backward.</b> The tape is replayed in reverse and every parameter gets its gradient.',
        '<b>Step.</b> The optimizer moves every parameter a little way downhill. Then back to 1.'
      ][i];
      tl.step(caption);
      tl.to(nodes[i], { opacity: 1, duration: 0.35 });
      if (i > 0) tl.to(nodes[i - 1], { opacity: 0.45, duration: 0.35 }, '<');
    });

    tl.step('Now delete line 1. Nothing crashes — the gradients just keep <b>piling up</b>. Batch 3 is trained on the sum of batches 1, 2 and 3, so your real learning rate grows every step.');
    tl.to(nodes[0], { opacity: 0.12, duration: 0.4 });
    tl.to(failG, { opacity: 1, duration: 0.4 }, '<');
    tl.to(failBar, { attr: { y: 200, height: 55 }, duration: 0.5 });
    tl.call(function () { failTxt.textContent = '+ batch 2'; });
    tl.to(failBar, { attr: { y: 170, height: 85 }, duration: 0.5 });
    tl.call(function () { failTxt.textContent = '+ batch 3'; });
    tl.to(failBar, { attr: { y: 128, height: 127 }, duration: 0.5 });
    tl.call(function () { failTxt.textContent = '+ batch 4 …'; });
    tl.to(failBar, { fill: 'var(--c-loss)', duration: 0.3 });

    tl.step('The same behaviour is also a <b>feature</b>: run four small batches, then step once. That is gradient accumulation, and it is how you train big batches on a small machine.');
    tl.to(nodes[0], { opacity: 1, duration: 0.4 });
    tl.to(failBar, { fill: 'var(--c-ok)', duration: 0.3 }, '<');
    tl.call(function () { failTxt.textContent = 'on purpose'; });
  });

  /* ======================================================================
     Scene 7 — reading a loss curve
     ====================================================================== */

  Scene.register('fit', function (ctx) {
    var tl = ctx.tl, q = ctx.q;
    var host = q('#ft-plot');

    add(host, e('line', { x1: 90, y1: 230, x2: 830, y2: 230, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('line', { x1: 90, y1: 30, x2: 90, y2: 230, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('text', { x: 830, y: 250, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'epochs →'));
    add(host, e('text', { x: 82, y: 38, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'loss'));

    var train = e('path', {
      d: 'M110,52 C190,112 250,150 330,168 C420,188 520,198 620,206 C700,212 760,216 815,219',
      fill: 'none', stroke: 'var(--c-data)', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0
    });
    var val = e('path', {
      d: 'M110,58 C190,118 250,152 330,164 C370,170 390,172 410,174 C470,180 530,150 600,116 C680,78 750,58 815,44',
      fill: 'none', stroke: 'var(--c-param)', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0
    });
    host.appendChild(train); host.appendChild(val);

    var lTrain = e('text', { x: 828, y: 224, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-data)', opacity: 0 }, 'train');
    var lVal = e('text', { x: 828, y: 40, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-param)', opacity: 0 }, 'validation');
    host.appendChild(lTrain); host.appendChild(lVal);

    var stopLine = e('line', { x1: 410, y1: 30, x2: 410, y2: 230, stroke: 'var(--c-ok)', 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: 0 });
    var stopLbl = e('text', { x: 410, y: 24, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-ok)', opacity: 0 }, 'stop here');
    host.appendChild(stopLine); host.appendChild(stopLbl);

    var gap = e('path', { d: 'M600,116 L600,206', stroke: 'var(--c-loss)', 'stroke-width': 2, opacity: 0 });
    var gapLbl = e('text', { x: 616, y: 164, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-loss)', opacity: 0 }, 'the gap = memorising');
    host.appendChild(gap); host.appendChild(gapLbl);

    tl.step('The <b>training loss</b> falls, and keeps falling. On its own this tells you almost nothing.');
    tl.to(train, { opacity: 1, duration: 0.01 });
    ctx.k.draw(tl, train, { duration: 1.4, ease: 'none' });
    tl.to(lTrain, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Now add data the model never trains on. At first it improves too — the model is learning something real.');
    tl.to(val, { opacity: 1, duration: 0.01 });
    ctx.k.draw(tl, val, { duration: 1.4, ease: 'none' });
    tl.to(lVal, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Then it turns upward. From this point the model is <b>memorising the training set</b> instead of learning the task.');
    tl.to([gap, gapLbl], { opacity: 1, duration: 0.4 });

    tl.step('The best model is the one from just before the turn. Keeping that checkpoint is called <b>early stopping</b>, and it is the cheapest fix in machine learning.');
    tl.to([stopLine, stopLbl], { opacity: 1, duration: 0.4 });
    tl.to([gap, gapLbl], { opacity: 0.35, duration: 0.3 }, '<');
  });

})();
