/* =========================================================================
   Lesson 02 — animated figures.
   Six scenes: one neuron, backpropagation with real numbers, the collapse of
   stacked linear layers, activation curves, initialisation across depth, and
   a convolution kernel sliding over an image.
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var NS = 'http://www.w3.org/2000/svg';

  function e(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  function roleCol(r) { return 'var(--c-' + r + ')'; }
  function roleDim(r) { return 'var(--c-' + r + '-dim)'; }

  /* A grid of cells that carry numbers. Returns a <g> with .rects and .texts
     in row-major order, plus .w and .h so callers can do their arithmetic. */
  function cells(x, y, rows, cols, vals, o) {
    o = o || {};
    var s = o.cell || 40, gap = o.gap != null ? o.gap : 4;
    var grp = e('g', { opacity: o.opacity != null ? o.opacity : 0 });
    var rects = [], texts = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cx = x + c * (s + gap), cy = y + r * (s + gap);
        var rect = e('rect', {
          x: cx, y: cy, width: s, height: s, rx: 5,
          fill: o.role ? roleDim(o.role) : 'var(--surface-2)',
          stroke: o.role ? roleCol(o.role) : 'var(--line)', 'stroke-width': 1.3
        });
        add(grp, rect); rects.push(rect);
        var t = e('text', {
          x: cx + s / 2, y: cy + s / 2 + 4.5, 'text-anchor': 'middle',
          class: 'dg-mono', 'font-size': o.size || 13,
          fill: o.role ? roleCol(o.role) : 'var(--text)'
        }, String(vals[r * cols + c]));
        add(grp, t); texts.push(t);
      }
    }
    grp.rects = rects; grp.texts = texts;
    grp.w = cols * (s + gap) - gap;
    grp.h = rows * (s + gap) - gap;
    return grp;
  }

  function poly(pts) {
    return pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0] + ',' + p[1];
    }).join(' ');
  }

  function sym(x, y, t, size) {
    return e('text', {
      x: x, y: y, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': size || 18, fill: 'var(--text-dim)', opacity: 0
    }, t);
  }

  /* ======================================================================
     Scene 1 — one neuron
     ====================================================================== */

  Scene.register('nn-neuron', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#nu-plot');

    var IN = [{ y: 40, v: '1.0', n: 'x₁' }, { y: 106, v: '−2.0', n: 'x₂' }, { y: 172, v: '0.5', n: 'x₃' }];
    var pills = [], names = [], arrows = [], wLabels = [];

    IN.forEach(function (d, i) {
      var p = S.pill(60, d.y, 86, 34, d.v, { role: 'data' });
      host.appendChild(p); pills.push(p);
      var nm = S.label(52, d.y + 22, d.n, { anchor: 'end', mono: true, size: 13, role: 'data' });
      nm.setAttribute('opacity', 0);
      host.appendChild(nm); names.push(nm);
      var a = S.arrow(150, d.y + 17, 386, 123, { role: 'data' });
      host.appendChild(a); arrows.push(a);
    });

    [['w₁ = 0.8', 262, 78], ['w₂ = −0.5', 262, 114], ['w₃ = 1.4', 262, 172]].forEach(function (d) {
      var t = e('text', {
        x: d[1], y: d[2], 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 13, fill: roleCol('param'), opacity: 0
      }, d[0]);
      host.appendChild(t); wLabels.push(t);
    });

    var sumG = e('g', { opacity: 0 });
    add(sumG, e('circle', {
      cx: 420, cy: 123, r: 32, fill: roleDim('data'),
      stroke: roleCol('data'), 'stroke-width': 1.8
    }));
    add(sumG, e('text', { x: 420, y: 132, 'text-anchor': 'middle', class: 'dg-title', 'font-size': 22 }, 'Σ'));
    host.appendChild(sumG);

    var prod = e('text', {
      x: 420, y: 62, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 13.5, fill: roleCol('data'), opacity: 0
    }, '0.8 + 1.0 + 0.7 = 2.5');
    host.appendChild(prod);

    var biasP = S.pill(378, 202, 84, 30, 'b = −0.3', { role: 'param' });
    var biasA = S.arrow(420, 198, 420, 160, { role: 'param' });
    host.appendChild(biasA); host.appendChild(biasP);

    var zArrow = S.arrow(454, 123, 552, 123, { role: 'data' });
    host.appendChild(zArrow);
    var zText = e('text', {
      x: 503, y: 110, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 13.5, fill: roleCol('data'), opacity: 0
    }, 'z = 2.2');
    host.appendChild(zText);

    var actBox = S.box(560, 58, 140, 130, { role: 'data' });
    host.appendChild(actBox);
    var actIn = e('g', { opacity: 0 });
    add(actIn, e('text', { x: 630, y: 80, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13, fill: roleCol('data') }, 'ReLU'));
    add(actIn, e('line', { x1: 580, y1: 160, x2: 686, y2: 160, stroke: 'var(--line)', 'stroke-width': 1.2 }));
    add(actIn, e('line', { x1: 630, y1: 168, x2: 630, y2: 92, stroke: 'var(--line)', 'stroke-width': 1.2 }));
    add(actIn, e('path', { d: 'M582,160 L630,160 L680,110', fill: 'none', stroke: roleCol('data'), 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
    host.appendChild(actIn);

    var outA = S.arrow(704, 123, 752, 123, { role: 'ok' });
    var outP = S.pill(756, 106, 104, 34, 'a = 2.2', { role: 'ok' });
    host.appendChild(outA); host.appendChild(outP);
    var outL = S.label(808, 168, 'activation', { anchor: 'middle', small: true });
    outL.setAttribute('opacity', 0);
    host.appendChild(outL);

    var outTxt = outP.querySelector('text');
    var outRect = outP.querySelector('rect');

    tl.step('A neuron takes a few numbers in. Here there are three, and each one arrives on its own wire.');
    tl.to(pills, { opacity: 1, duration: 0.4, stagger: 0.08 });
    tl.to(names, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Every wire has its own <b>weight</b>. The weight is a number the training loop is allowed to change.');
    tl.to(arrows, { opacity: 1, duration: 0.35, stagger: 0.07 });
    tl.to(wLabels, { opacity: 1, duration: 0.3, stagger: 0.07 }, '-=0.25');

    tl.step('Multiply each input by its weight, then add the results. 0.8 + 1.0 + 0.7 = 2.5. That single sum is a <b>dot product</b>.');
    tl.to(sumG, { opacity: 1, duration: 0.4 });
    tl.to(prod, { opacity: 1, duration: 0.4 }, '-=0.2');

    tl.step('Add the <b>bias</b>. The bias shifts the whole sum, so the neuron does not have to fire around zero. 2.5 − 0.3 = 2.2.');
    tl.to([biasP, biasA], { opacity: 1, duration: 0.4 });
    tl.to([zArrow, zText], { opacity: 1, duration: 0.35 });

    tl.step('Last, push the sum through a non-linear function. ReLU passes 2.2 through unchanged, so the neuron outputs 2.2.');
    tl.to([actBox, actIn], { opacity: 1, duration: 0.4 });
    tl.to([outA, outP, outL], { opacity: 1, duration: 0.4 });
    k.pulse(tl, outP, { scale: 1.1 });

    tl.step('Now flip the signs of the inputs. The sum becomes −2.8, ReLU returns 0, and the neuron says nothing at all.');
    tl.call(function () {
      pills[0].querySelector('text').textContent = '−1.0';
      pills[1].querySelector('text').textContent = '2.0';
      pills[2].querySelector('text').textContent = '−0.5';
      prod.textContent = '−0.8 − 1.0 − 0.7 = −2.5';
      zText.textContent = 'z = −2.8';
      outTxt.textContent = 'a = 0';
    });
    k.pulse(tl, [prod, zText], { scale: 1.12 });
    tl.to(outRect, { stroke: roleCol('frozen'), fill: roleDim('frozen'), duration: 0.4 });
    tl.to(outTxt, { fill: roleCol('frozen'), duration: 0.4 }, '<');
    k.pulse(tl, outP, { scale: 1.1 });
  });

  /* ======================================================================
     Scene 2 — backpropagation with real numbers
     ====================================================================== */

  Scene.register('nn-backprop', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#bp-plot');

    var B = [
      S.box(30, 110, 110, 60, { title: 'x', sub: '2.0', note: 'input', role: 'data' }),
      S.box(180, 110, 140, 60, { title: 'z₁', sub: '1.1', note: 'w₁·x + b₁', role: 'data' }),
      S.box(350, 110, 140, 60, { title: 'a₁', sub: '1.1', note: 'ReLU(z₁)', role: 'data' }),
      S.box(530, 110, 140, 60, { title: 'z₂', sub: '−1.25', note: 'w₂·a₁ + b₂', role: 'data' }),
      S.box(710, 110, 150, 60, { title: 'L', sub: '5.0625', note: '(z₂ − y)²,  y = 1.0', role: 'loss' })
    ];
    B.forEach(function (b) { host.appendChild(b); });

    var A = [
      S.arrow(142, 140, 176, 140, { role: 'data' }),
      S.arrow(322, 140, 346, 140, { role: 'data' }),
      S.arrow(492, 140, 526, 140, { role: 'data' }),
      S.arrow(672, 140, 706, 140, { role: 'data' })
    ];
    A.forEach(function (a) { host.appendChild(a); });

    var P = [
      S.pill(180, 36, 66, 28, 'w₁ 0.5', { role: 'param' }),
      S.pill(254, 36, 66, 28, 'b₁ 0.1', { role: 'param' }),
      S.pill(530, 36, 70, 28, 'w₂ −1.5', { role: 'param' }),
      S.pill(606, 36, 64, 28, 'b₂ 0.4', { role: 'param' })
    ];
    P.forEach(function (p) { host.appendChild(p); });

    [[213, 64, 213, 106], [563, 64, 563, 106]].forEach(function (d) {
      host.appendChild(e('line', {
        x1: d[0], y1: d[1], x2: d[2], y2: d[3], stroke: roleCol('param'),
        'stroke-width': 1.2, 'stroke-dasharray': '3 4', opacity: 0.45
      }));
    });

    var back = S.arrow(862, 214, 34, 214, { role: 'grad', dashed: true, sw: 2 });
    host.appendChild(back);

    function gtext(x, y, t, size) {
      var n = e('text', {
        x: x, y: y, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': size || 13, fill: roleCol('grad'), opacity: 0
      }, t);
      host.appendChild(n);
      return n;
    }

    var g2a = gtext(600, 248, '∂L/∂z₂ = −4.50');
    var g2b = gtext(600, 266, '= 2(z₂ − y)', 12);
    var g1a = gtext(420, 248, '∂L/∂a₁ = 6.75');
    var g1b = gtext(420, 266, '= ∂L/∂z₂ × w₂', 12);
    var g0a = gtext(250, 248, '∂L/∂z₁ = 6.75');
    var g0b = gtext(250, 266, '× ReLU′(z₁) = 1', 12);
    var gw2 = gtext(600, 298, '∂L/∂w₂ = −4.95    ∂L/∂b₂ = −4.50', 12.5);
    var gw1 = gtext(250, 298, '∂L/∂w₁ = 13.50    ∂L/∂b₁ = 6.75', 12.5);

    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 700, y: 24, width: 180, height: 76, rx: 10,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4
    }));
    add(panel, e('text', { x: 790, y: 46, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'after one step, lr = 0.1'));
    add(panel, e('text', { x: 790, y: 68, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 16, fill: roleCol('ok') }, 'L = 0.0225'));
    add(panel, e('text', { x: 790, y: 90, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: roleCol('loss') }, 'z₁ = −2.275 → a₁ = 0'));
    host.appendChild(panel);

    tl.step('One input, one target, four parameters. Every number here is real — check them with a calculator.');
    tl.to(B[0], { opacity: 1, duration: 0.4 });
    tl.to(P, { opacity: 1, duration: 0.35, stagger: 0.06 }, '-=0.2');

    tl.step('<b>Forward.</b> 0.5 × 2.0 + 0.1 = 1.1. ReLU leaves it alone. Then −1.5 × 1.1 + 0.4 = −1.25.');
    tl.to(A[0], { opacity: 1, duration: 0.2 });
    tl.to(B[1], { opacity: 1, duration: 0.35 });
    tl.to(A[1], { opacity: 1, duration: 0.2 });
    tl.to(B[2], { opacity: 1, duration: 0.35 });
    tl.to(A[2], { opacity: 1, duration: 0.2 });
    tl.to(B[3], { opacity: 1, duration: 0.35 });

    tl.step('The target is 1.0, so the error is −2.25 and the squared loss is <b>5.0625</b>. That one number is what we shrink.');
    tl.to(A[3], { opacity: 1, duration: 0.2 });
    tl.to(B[4], { opacity: 1, duration: 0.4 });
    k.pulse(tl, B[4], { scale: 1.08 });

    tl.step('<b>Backward.</b> Start at the end. The derivative of a square is 2 × the inside: <span class="kw">2(z₂ − y) = −4.50</span>.');
    tl.to(back, { opacity: 1, duration: 0.5 });
    tl.to([g2a, g2b], { opacity: 1, duration: 0.35 });

    tl.step('Each step to the left multiplies by one <b>local derivative</b>. Past w₂: −4.50 × −1.5 = 6.75. Through ReLU: × 1, because z₁ was positive.');
    tl.to([g1a, g1b], { opacity: 1, duration: 0.35 });
    tl.to([g0a, g0b], { opacity: 1, duration: 0.35 }, '+=0.2');

    tl.step('The weight gradients drop out of the same chain. <span class="kw">∂L/∂w₁ = ∂L/∂z₁ × x = 6.75 × 2 = 13.50</span>.');
    tl.to(gw2, { opacity: 1, duration: 0.35 });
    tl.to(gw1, { opacity: 1, duration: 0.35 }, '+=0.15');
    tl.to(P.map(function (p) { return p.querySelector('rect'); }),
      { stroke: roleCol('grad'), duration: 0.3 }, '-=0.2');

    tl.step('One SGD step with lr = 0.1 cuts the loss to 0.0225 — but it also drives z₁ to −2.275. That ReLU now outputs 0 and its gradient is 0 forever. The unit is <b>dead</b>.');
    tl.call(function () {
      P[0].querySelector('text').textContent = 'w₁ −0.85';
      P[1].querySelector('text').textContent = 'b₁ −0.575';
      P[2].querySelector('text').textContent = 'w₂ −1.005';
      P[3].querySelector('text').textContent = 'b₂ 0.85';
    });
    k.pulse(tl, P, { scale: 1.12, stagger: 0.05 });
    tl.to(panel, { opacity: 1, duration: 0.4 });
    tl.to(B[2], { opacity: 0.3, duration: 0.4 }, '<');
  });

  /* ======================================================================
     Scene 3 — two linear layers collapse into one
     ====================================================================== */

  Scene.register('nn-collapse', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#cl-plot');

    function cap(x, y, t, role) {
      var n = e('text', {
        x: x, y: y, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13,
        fill: role ? roleCol(role) : 'var(--text-dim)', opacity: 0
      }, t);
      host.appendChild(n);
      return n;
    }

    /* ---- row 1: two layers ---- */
    var xv = cells(50, 92, 1, 2, ['1', '−1'], { cell: 40, role: 'data' });
    var W1 = cells(170, 70, 2, 2, ['2', '−1', '0', '3'], { cell: 40, role: 'param' });
    var hv = cells(288, 92, 1, 2, ['2', '−4'], { cell: 40, role: 'data' });
    var W2 = cells(408, 70, 2, 2, ['1', '4', '2', '0'], { cell: 40, role: 'param' });
    var ov = cells(526, 92, 1, 2, ['−6', '8'], { cell: 40, role: 'ok' });
    [xv, W1, hv, W2, ov].forEach(function (g) { host.appendChild(g); });

    var lx = cap(92, 84, 'x', 'data'), lw1 = cap(212, 62, 'W₁', 'param'),
        lh = cap(330, 84, 'h', 'data'), lw2 = cap(450, 62, 'W₂', 'param'),
        lo = cap(568, 84, 'out', 'ok');

    var s1 = sym(152, 120, '×'), s2 = sym(271, 120, '='),
        s3 = sym(390, 120, '×'), s4 = sym(509, 120, '=');
    [s1, s2, s3, s4].forEach(function (s) { host.appendChild(s); });

    /* ---- merged matrix on the right ---- */
    var Wm = cells(700, 70, 2, 2, ['0', '8', '6', '0'], { cell: 40, role: 'param' });
    host.appendChild(Wm);
    var lmA = cap(742, 44, 'multiply them first'), lmB = cap(742, 62, 'W = W₁W₂', 'param');

    /* ---- row 2: one layer ---- */
    var xv2 = cells(50, 230, 1, 2, ['1', '−1'], { cell: 40, role: 'data' });
    var Wr = cells(170, 208, 2, 2, ['0', '8', '6', '0'], { cell: 40, role: 'param' });
    var ov2 = cells(288, 230, 1, 2, ['−6', '8'], { cell: 40, role: 'ok' });
    [xv2, Wr, ov2].forEach(function (g) { host.appendChild(g); });
    var s5 = sym(152, 258, '×'), s6 = sym(271, 258, '=');
    host.appendChild(s5); host.appendChild(s6);

    var note1 = e('text', { x: 392, y: 252, class: 'dg-label dg-label--sm', opacity: 0 },
      'Same output. One matrix. The second layer added nothing.');
    var note2 = e('text', { x: 392, y: 272, class: 'dg-label dg-label--sm', opacity: 0 },
      'Fifty stacked linear layers are still one matrix.');
    host.appendChild(note1); host.appendChild(note2);

    /* ---- the ReLU that blocks the merge ---- */
    var relu = S.pill(292, 150, 76, 26, 'ReLU', { role: 'ok' });
    var reluA = S.arrow(330, 134, 330, 148, { role: 'data' });
    host.appendChild(reluA); host.appendChild(relu);

    var neq = e('text', {
      x: 568, y: 176, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13,
      fill: roleCol('loss'), opacity: 0
    }, '≠ (−6, 8) from the merged matrix');
    host.appendChild(neq);

    tl.step('One input row, two weight matrices, one after the other. No activation between them yet.');
    tl.to([xv, lx, s1, W1, lw1, s2], { opacity: 1, duration: 0.35, stagger: 0.05 });
    tl.to([hv, lh], { opacity: 1, duration: 0.35 });
    tl.to([s3, W2, lw2, s4, ov, lo], { opacity: 1, duration: 0.35, stagger: 0.05 });

    tl.step('Matrix multiplication is associative. So multiply the two <b>weight</b> matrices together first, before any data arrives.');
    tl.to([lmA, lmB, Wm], { opacity: 1, duration: 0.4, stagger: 0.06 });
    k.pulse(tl, Wm, { scale: 1.08 });

    tl.step('That single matrix produces the same output, (−6, 8), for this input — and for <b>every</b> input.');
    tl.to([xv2, s5, Wr, s6, ov2], { opacity: 1, duration: 0.35, stagger: 0.05 });
    tl.to([note1, note2], { opacity: 1, duration: 0.4 }, '-=0.1');

    tl.step('So depth on its own buys nothing. Without a non-linearity, a deep network has exactly the power of one matrix.');
    k.dim(tl, [W1, W2, lw1, lw2], { to: 0.3 });
    k.pulse(tl, Wr, { scale: 1.1 });

    tl.step('Now drop <b>ReLU</b> between the layers. It clips the −4 to 0, and the output changes to (2, 8).');
    tl.to([W1, W2, lw1, lw2], { opacity: 1, duration: 0.3 });
    tl.to([relu, reluA], { opacity: 1, duration: 0.4 });
    tl.call(function () {
      hv.texts[1].textContent = '0';
      ov.texts[0].textContent = '2';
    });
    tl.to([hv.rects[1], ov.rects[0]], { stroke: roleCol('ok'), duration: 0.3 });
    k.pulse(tl, [hv, ov], { scale: 1.06 });

    tl.step('(2, 8) is not (−6, 8), and no fixed matrix can copy ReLU for every input. The merge is blocked, so the second layer is now real work.');
    tl.to(neq, { opacity: 1, duration: 0.4 });
    k.dim(tl, [xv2, Wr, ov2, s5, s6, note1, note2], { to: 0.28, position: '<' });
  });

  /* ======================================================================
     Scene 4 — activation curves
     ====================================================================== */

  Scene.register('nn-acts', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ac-plot');

    /* axes: origin (340, 180); 55 px per unit of x, 40 px per unit of y */
    add(host, e('line', { x1: 110, y1: 180, x2: 570, y2: 180, stroke: 'var(--line)', 'stroke-width': 1.4 }));
    add(host, e('line', { x1: 340, y1: 36, x2: 340, y2: 250, stroke: 'var(--line)', 'stroke-width': 1.4 }));
    [['−4', 120], ['−2', 230], ['2', 450], ['4', 560]].forEach(function (d) {
      add(host, e('text', { x: d[1], y: 208, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, d[0]));
    });
    add(host, e('text', { x: 556, y: 234, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'input x →'));
    add(host, e('text', { x: 334, y: 46, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, 'output'));

    var GELU = [[120, 180.0], [175, 180.2], [202.5, 180.6], [230, 181.8], [257.5, 184.0],
                [285, 186.4], [298.8, 186.8], [312.5, 186.2], [340, 180], [367.5, 166.2],
                [395, 146.4], [422.5, 124.0], [450, 101.8], [477.5, 80.6], [505, 60.2], [527, 44.1]];
    var SILU = [[120, 182.9], [175, 185.7], [202.5, 187.6], [230, 189.5], [257.5, 190.9],
                [285, 190.8], [312.5, 187.6], [340, 180], [367.5, 167.6], [395, 150.8],
                [422.5, 131.0], [450, 109.5], [477.5, 87.6], [505, 65.7], [527, 48.4]];

    var pRelu = e('path', { d: 'M120,180 L340,180 L527,44', fill: 'none', stroke: roleCol('frozen'), 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0 });
    var pGelu = e('path', { d: poly(GELU), fill: 'none', stroke: roleCol('data'), 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 });
    var pSilu = e('path', { d: poly(SILU), fill: 'none', stroke: roleCol('ok'), 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 });
    host.appendChild(pRelu); host.appendChild(pGelu); host.appendChild(pSilu);

    var dead = e('line', {
      x1: 120, y1: 180, x2: 340, y2: 180, stroke: roleCol('loss'),
      'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0
    });
    host.appendChild(dead);
    var deadT = e('text', {
      x: 230, y: 165, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12.5,
      fill: roleCol('loss'), opacity: 0
    }, 'flat: gradient exactly 0');
    host.appendChild(deadT);

    var leg = [];
    [['ReLU   max(0, x)', 'frozen', 60], ['GELU   x·Φ(x)', 'data', 82], ['SiLU   x·σ(x)', 'ok', 104]]
      .forEach(function (d) {
        var g = e('g', { opacity: 0 });
        add(g, e('line', { x1: 130, y1: d[2] - 4, x2: 152, y2: d[2] - 4, stroke: roleCol(d[1]), 'stroke-width': 3, 'stroke-linecap': 'round' }));
        add(g, e('text', { x: 160, y: d[2], class: 'dg-mono', 'font-size': 12.5, fill: roleCol(d[1]) }, d[0]));
        host.appendChild(g); leg.push(g);
      });

    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', { x: 600, y: 40, width: 280, height: 214, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4 }));
    add(panel, e('text', { x: 618, y: 66, class: 'dg-label dg-label--sm' }, 'what happens left of zero'));
    host.appendChild(panel);

    function row(y, mono, monoRole, small) {
      var g = e('g', { opacity: 0 });
      add(g, e('text', { x: 618, y: y, class: 'dg-mono', 'font-size': 13, fill: roleCol(monoRole) }, mono));
      add(g, e('text', { x: 618, y: y + 20, class: 'dg-label dg-label--sm' }, small));
      host.appendChild(g);
      return g;
    }
    var r1 = row(96, 'ReLU′(x) = 0', 'frozen', 'a unit pushed there never returns');
    var r2 = row(150, 'GELU′(x) is small, never 0', 'data', 'the unit can always come back');
    var r3 = row(204, 'SwiGLU = SiLU(xW) ⊙ (xV)', 'ok', 'a gate: one half decides how much');
    add(r3, e('text', { x: 618, y: 240, class: 'dg-label dg-label--sm' }, 'of the other half passes through'));

    tl.step('<b>ReLU</b> is the simplest useful non-linearity: keep positive numbers, replace everything else with zero.');
    tl.to(pRelu, { opacity: 1, duration: 0.01 });
    k.draw(tl, pRelu, { duration: 1.0, ease: 'none' });
    tl.to(leg[0], { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Its slope is 1 on the right and <b>exactly 0</b> on the left. A unit whose sum lands on the flat side gets no gradient, so training can never move it back.');
    tl.to([dead, deadT], { opacity: 1, duration: 0.4 });
    tl.to(panel, { opacity: 1, duration: 0.3 }, '<');
    tl.to(r1, { opacity: 1, duration: 0.35 });

    tl.step('<b>GELU</b> is the same shape with the corner rounded off. Left of zero it dips slightly below and approaches zero smoothly, so the slope is small but never nothing.');
    tl.to(pGelu, { opacity: 1, duration: 0.01 });
    k.draw(tl, pGelu, { duration: 1.0, ease: 'none' });
    tl.to([leg[1], r2], { opacity: 1, duration: 0.3 }, '-=0.3');
    tl.to(dead, { opacity: 0.35, duration: 0.3 }, '<');

    tl.step('<b>SiLU</b> — also written x·σ(x) — has the same character. Note that both curves are almost identical to ReLU once x is above about 2.');
    tl.to(pSilu, { opacity: 1, duration: 0.01 });
    k.draw(tl, pSilu, { duration: 1.0, ease: 'none' });
    tl.to(leg[2], { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('<b>SwiGLU</b> is not a curve at all. It is a gate: the layer computes two projections, passes one through SiLU, and multiplies them element by element.');
    tl.to(r3, { opacity: 1, duration: 0.4 });
    k.pulse(tl, r3, { scale: 1.06 });
  });

  /* ======================================================================
     Scene 5 — initialisation across depth
     ====================================================================== */

  Scene.register('nn-init', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#in-plot');

    var X = [90, 174, 258, 342, 426, 510, 594, 678, 762];
    var Y_SMALL = [127.2, 141.3, 155.3, 169.4, 183.5, 197.5, 211.6, 225.7, 239.7];
    var Y_LARGE = [127.2, 119.5, 111.7, 104.0, 96.3, 88.5, 80.8, 73.1, 65.3];
    var Y_GOOD = X.map(function () { return 127.2; });

    [[61.8, '×10³'], [127.2, '×1'], [192.6, '÷10³'], [258.0, '÷10⁶']].forEach(function (d) {
      add(host, e('line', {
        x1: 88, y1: d[0], x2: 766, y2: d[0], stroke: 'var(--line)',
        'stroke-width': 1, 'stroke-dasharray': '3 6', opacity: 0.55
      }));
      add(host, e('text', { x: 76, y: d[0] + 4, 'text-anchor': 'end', class: 'dg-label dg-label--sm' }, d[1]));
    });

    add(host, e('text', { x: 90, y: 36, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'in'));
    for (var i = 1; i < X.length; i++) {
      add(host, e('text', { x: X[i], y: 36, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, String(i)));
    }
    add(host, e('text', { x: 90, y: 288, class: 'dg-label dg-label--sm' }, '8 linear layers, 256 units each, ReLU between them. Signal size relative to the input.'));

    function line(ys, roleName) {
      var pts = X.map(function (x, j) { return [x, ys[j]]; });
      var p = e('path', {
        d: poly(pts), fill: 'none', stroke: roleCol(roleName), 'stroke-width': 2.8,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0
      });
      host.appendChild(p);
      return p;
    }
    var pSmall = line(Y_SMALL, 'frozen');
    var pLarge = line(Y_LARGE, 'loss');
    var pGood = line(Y_GOOD, 'ok');

    function tag(y1, y2, a, b, roleName) {
      var g = e('g', { opacity: 0 });
      add(g, e('text', { x: 774, y: y1, class: 'dg-mono', 'font-size': 12.5, fill: roleCol(roleName) }, a));
      add(g, e('text', { x: 774, y: y2, class: 'dg-mono', 'font-size': 12.5, fill: roleCol(roleName) }, b));
      host.appendChild(g);
      return g;
    }
    var tLarge = tag(58, 74, 'std 0.20', '× 690', 'loss');
    var tGood = tag(120, 136, '√(2/n)', '× 1', 'ok');
    var tSmall = tag(232, 248, 'std 0.02', '÷ 150 000', 'frozen');

    var start = e('circle', { cx: 90, cy: 127.2, r: 6, fill: roleCol('data'), opacity: 0 });
    host.appendChild(start);

    tl.step('Eight layers, 256 units each, ReLU between them. The activations that enter have a size we call 1.');
    tl.to(start, { opacity: 1, duration: 0.4 });
    k.pulse(tl, start, { scale: 1.4 });

    tl.step('Draw every weight from a normal distribution with standard deviation <b>0.02</b>. Each layer shrinks the signal by a factor of about 4.4.');
    tl.to(pSmall, { opacity: 1, duration: 0.01 });
    k.draw(tl, pSmall, { duration: 1.3, ease: 'none' });
    tl.to(tSmall, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('By layer 8 the signal is 150 000 times smaller. The gradients that travel back are shrunk by the same chain, so the early layers barely move. This is the <b>vanishing</b> case.');
    k.pulse(tl, tSmall, { scale: 1.15 });

    tl.step('Now standard deviation <b>0.20</b>. The same rule runs the other way: 690 times larger after 8 layers, and with more depth the numbers reach <span class="kw">inf</span>.');
    tl.to(pLarge, { opacity: 1, duration: 0.01 });
    k.draw(tl, pLarge, { duration: 1.3, ease: 'none' });
    tl.to(tLarge, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Between them sits one value that makes the gain exactly 1: <span class="kw">√(2 / fan_in)</span>. The 2 pays for the half of the signal that ReLU throws away.');
    tl.to(pGood, { opacity: 1, duration: 0.01 });
    k.draw(tl, pGood, { duration: 1.1, ease: 'none' });
    tl.to(tGood, { opacity: 1, duration: 0.3 }, '-=0.3');
    k.dim(tl, [pSmall, pLarge, tSmall, tLarge], { to: 0.35, position: '<' });

    tl.step('The signal now keeps the same size at every depth. That single square root is the whole of He initialisation, and it is why deep networks train at all.');
    k.pulse(tl, pGood, { scale: 1.02 });
    k.pulse(tl, tGood, { scale: 1.15 });
  });

  /* ======================================================================
     Scene 6 — a convolution kernel slides
     ====================================================================== */

  Scene.register('nn-conv', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#cv-plot');

    /* input: 7x7, columns 0-2 are 0 and columns 3-6 are 1 — a vertical edge */
    var inVals = [];
    for (var r = 0; r < 7; r++) for (var c = 0; c < 7; c++) inVals.push(c < 3 ? '0' : '1');
    var grid = cells(60, 68, 7, 7, inVals, { cell: 30, gap: 2, size: 12, role: 'data' });
    host.appendChild(grid);
    add(host, e('text', { x: 171, y: 58, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'input 7 × 7, a vertical edge'));

    var kern = cells(306, 110, 3, 3, ['−1', '0', '1', '−1', '0', '1', '−1', '0', '1'],
      { cell: 26, gap: 2, size: 11.5, role: 'param' });
    host.appendChild(kern);
    add(host, e('text', { x: 347, y: 100, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'kernel 3 × 3'));
    var kArrow = S.arrow(392, 151, 406, 151, { role: 'param' });
    host.appendChild(kArrow);

    var mapVals = [];
    for (var i = 0; i < 25; i++) mapVals.push('');
    var map = cells(412, 68, 5, 5, mapVals, { cell: 30, gap: 2, size: 12, role: 'ok' });
    host.appendChild(map);
    add(host, e('text', { x: 491, y: 58, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'feature map 5 × 5'));

    var hl = e('rect', {
      x: 60, y: 68, width: 94, height: 94, rx: 5, fill: 'none',
      stroke: roleCol('param'), 'stroke-width': 3, opacity: 0
    });
    host.appendChild(hl);

    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', { x: 600, y: 70, width: 280, height: 190, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4 }));
    add(panel, e('text', { x: 618, y: 98, class: 'dg-label dg-label--sm' }, 'one 3 × 3 kernel, one channel'));
    add(panel, e('text', { x: 618, y: 122, class: 'dg-mono', 'font-size': 14, fill: roleCol('param') }, '9 weights + 1 bias = 10'));
    add(panel, e('text', { x: 618, y: 156, class: 'dg-label dg-label--sm' }, 'a dense layer, 784 → 676'));
    add(panel, e('text', { x: 618, y: 180, class: 'dg-mono', 'font-size': 14, fill: roleCol('frozen') }, '529 984 weights'));
    add(panel, e('text', { x: 618, y: 214, class: 'dg-label dg-label--sm' }, 'the same 10 numbers are reused'));
    add(panel, e('text', { x: 618, y: 232, class: 'dg-label dg-label--sm' }, 'at all 25 positions — weight sharing'));
    host.appendChild(panel);

    var formula = e('text', {
      x: 60, y: 318, class: 'dg-mono', 'font-size': 13, fill: 'var(--text-dim)', opacity: 0
    }, 'H_out = (H_in + 2·padding − kernel) / stride + 1   →   (7 + 0 − 3) / 1 + 1 = 5');
    host.appendChild(formula);

    var ROW = ['0', '3', '3', '0', '0'];

    function slideTo(r, c) {
      tl.to(hl, { attr: { x: 60 + c * 32, y: 68 + r * 32 }, duration: 0.35, ease: 'power2.inOut' });
    }
    function writeCell(r, c) {
      var idx = r * 5 + c;
      tl.call(function () { map.texts[idx].textContent = ROW[c]; });
      tl.to(map.rects[idx], { fill: roleDim('ok'), stroke: roleCol('ok'), duration: 0.25 });
    }

    tl.step('The input is a picture with one edge in it: zeros on the left, ones on the right. The kernel is nine weights.');
    tl.to(grid, { opacity: 1, duration: 0.45 });
    tl.to(kern, { opacity: 1, duration: 0.4 }, '-=0.2');
    tl.to([kArrow, map], { opacity: 1, duration: 0.4 });

    tl.step('Lay the kernel over the top-left 3 × 3 patch. Multiply the nine pairs, add them up, write one number. Here every value is 0, so the answer is 0.');
    tl.to(hl, { opacity: 1, duration: 0.35 });
    writeCell(0, 0);

    tl.step('Slide one column right. Now the patch straddles the edge: three zeros on the left, three ones on the right, so the sum is <b>+3</b>.');
    slideTo(0, 1);
    writeCell(0, 1);

    tl.step('Keep sliding. Every output cell is produced by the <b>same nine weights</b> — only the patch under them changes.');
    slideTo(0, 2); writeCell(0, 2);
    slideTo(0, 3); writeCell(0, 3);
    slideTo(0, 4); writeCell(0, 4);

    tl.step('Then down a row and across again. The kernel found the edge, and it found it everywhere, because the same detector was applied at every position.');
    [1, 2, 3, 4].forEach(function (r) {
      slideTo(r, 0);
      for (var c = 0; c < 5; c++) {
        tl.call(function (rr, cc) {
          return function () { map.texts[rr * 5 + cc].textContent = ROW[cc]; };
        }(r, c));
        tl.to(map.rects[r * 5 + c], { fill: roleDim('ok'), stroke: roleCol('ok'), duration: 0.08 });
      }
      tl.to(hl, { attr: { x: 60 + 4 * 32 }, duration: 0.2, ease: 'none' });
    });
    tl.to(formula, { opacity: 1, duration: 0.4 });

    tl.step('The map is 5 × 5, not 7 × 7, because the kernel needs a full patch. Padding puts the border back when you want the size preserved.');
    k.pulse(tl, formula, { scale: 1.04 });

    tl.step('A dense layer doing the same job would need 529 984 weights. The kernel needs 10, and it works on an image of any size.');
    tl.to(panel, { opacity: 1, duration: 0.45 });
    k.pulse(tl, panel, { scale: 1.03 });
  });

})();
