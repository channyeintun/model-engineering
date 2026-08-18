/* =========================================================================
   Lesson 04 — animated figures.
   Seven scenes: the next-token objective, packing documents into blocks,
   one optimizer step (accumulation and clipping), the loss curve with
   samples, the compute budget, sampling, and the prefill / decode split
   with a key-value cache.
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var e = S.e, add = S.add;

  /* ======================================================================
     Scene 1 — the objective: one loss at every position
     ====================================================================== */

  Scene.register('gpt-objective', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap, k = ctx.k;
    var host = q('#ob-plot');

    var X0 = 150, W = 84, GAP = 8, STEP = W + GAP;          /* 92 */
    var IN_Y = 42, MODEL_Y = 104, PRED_Y = 160, TGT_Y = 214, LOSS_Y = 282;
    var N = 6;

    var words  = ['Once', 'upon', 'a', 'time', ',', 'there'];
    var guess  = ['ing', 'the', 'or', '7', 'and', 'of'];
    var losses = ['8.41', '8.29', '8.35', '8.22', '8.33', '—'];

    /* rows */
    var inputs = S.tokens(X0, IN_Y,  words, { w: W, h: 36, gap: GAP, role: 'data', cellOpacity: 0 });
    var model  = S.box(X0, MODEL_Y, 5 * STEP + W, 32, { title: 'decoder — one forward pass', role: 'param' });
    var preds  = S.tokens(X0, PRED_Y, guess, { w: W, h: 36, gap: GAP, role: 'data', cellOpacity: 0 });
    var ghost  = S.tokens(X0, IN_Y,  words, { w: W, h: 36, gap: GAP, role: 'ok', opacity: 0 });

    add(host, inputs, model, preds, ghost);

    /* the empty target slot at the last position */
    var empty = e('g', { opacity: 0 });
    add(empty, e('rect', {
      x: X0 + 5 * STEP, y: TGT_Y, width: W, height: 36, rx: 7, fill: 'none',
      stroke: 'var(--c-frozen)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4'
    }));
    add(empty, e('text', {
      x: X0 + 5 * STEP + W / 2, y: TGT_Y + 54, 'text-anchor': 'middle',
      class: 'dg-label dg-label--sm'
    }, 'no target'));
    host.appendChild(empty);

    /* row labels */
    [['input_ids', 65], ['model', 124], ['prediction', 183], ['target', 237], ['loss', 286]]
      .forEach(function (r) {
        host.appendChild(S.label(138, r[1], r[0], { anchor: 'end', small: true }));
      });

    /* per-position loss numbers */
    var lossT = [];
    for (var i = 0; i < N; i++) {
      var t = e('text', {
        x: X0 + i * STEP + W / 2, y: LOSS_Y, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 13,
        fill: i === N - 1 ? 'var(--text-dim)' : 'var(--c-loss)', opacity: 0
      }, losses[i]);
      host.appendChild(t);
      lossT.push(t);
    }

    /* the brace that collects them */
    var brace = e('path', {
      d: 'M164,300 H676 Q690,300 690,288 V278 H704',
      fill: 'none', stroke: 'var(--c-loss)', 'stroke-width': 1.6, opacity: 0
    });
    var braceHead = e('path', { d: 'M713,278 l-9,-4.5 l0,9 z', fill: 'var(--c-loss)', opacity: 0 });
    add(host, brace, braceHead);

    /* the readout panel */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 716, y: 230, width: 164, height: 88, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(panel, e('text', { x: 798, y: 254, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'mean loss'));
    add(panel, e('text', { x: 798, y: 290, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 24, fill: 'var(--c-loss)' }, '8.32'));
    add(panel, e('text', { x: 798, y: 310, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'nats per token'));
    host.appendChild(panel);

    /* the causal-mask overlay */
    var mask = e('g', { opacity: 0 });
    add(mask, e('rect', {
      x: X0 + 3 * STEP - 6, y: IN_Y - 6, width: 3 * STEP - GAP + 12, height: 48, rx: 9,
      fill: 'var(--c-frozen-dim)', stroke: 'var(--c-frozen)', 'stroke-width': 1.4, 'stroke-dasharray': '5 4'
    }));
    add(mask, e('text', {
      x: 560, y: 30, 'text-anchor': 'middle', class: 'dg-label dg-label--sm'
    }, 'hidden from position 2'));
    host.appendChild(mask);

    var cellsOf = function (grp) { return grp.cells.map(function (c) { return c.g; }); };

    tl.step('A block of <b>T</b> token ids goes in. This is one training example — not one word, the whole block.');
    k.appear(tl, cellsOf(inputs), { stagger: 0.06 });

    tl.step('One forward pass produces a prediction at <b>every</b> position at the same time, not only at the end. Right now they are nonsense: the weights are random.');
    tl.to(model, { opacity: 1, duration: 0.4 });
    k.appear(tl, cellsOf(preds), { stagger: 0.05 });

    tl.step('The target at position <i>t</i> is the token at position <i>t</i>+1. You build the labels by copying the input and sliding the copy one place to the left.');
    tl.to(ghost, { opacity: 1, duration: 0.35 });
    tl.to(ghost, { x: -STEP, y: TGT_Y - IN_Y, duration: 0.9, ease: 'power2.inOut' });

    tl.step('The slide leaves two gaps. The first token is nobody\'s target, and the last position has no target at all. Both are dropped.');
    tl.to(ghost.cells[0].g, { opacity: 0.12, duration: 0.4 });
    tl.to(empty, { opacity: 1, duration: 0.4 }, '<');

    tl.step('Now every position has a prediction and a target, so every position gets its own cross-entropy — the same loss as Lesson 01, computed T times.');
    tl.to(lossT, { opacity: 1, duration: 0.35, stagger: 0.07 });

    tl.step('Those numbers are averaged into one. A fresh model is uniform over the vocabulary, so the average starts at ln(V). Here <span class="kw">ln(4096) = 8.32</span>.');
    tl.to([brace, braceHead], { opacity: 1, duration: 0.35 });
    tl.to(panel, { opacity: 1, duration: 0.4 }, '-=0.1');
    k.pulse(tl, panel, { scale: 1.06 });

    tl.step('This is legal only because of the causal mask. Position 2 cannot see token 3, so its prediction is a real prediction and not a copy.');
    tl.to(mask, { opacity: 1, duration: 0.4 });
    k.dim(tl, [inputs.cells[3].g, inputs.cells[4].g, inputs.cells[5].g], { to: 0.25, position: '<' });
    k.pulse(tl, preds.cells[2].g, { scale: 1.14 });
  });

  /* ======================================================================
     Scene 2 — packing documents into fixed blocks
     ====================================================================== */

  Scene.register('gpt-packing', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#pk-plot');

    var X0 = 110, CW = 34, CH = 30, GAP = 4, ST = CW + GAP;   /* 38 */
    var YA = 48, YB = 90, YC = 132, YS = 208;

    function rep(ch, n) { var a = []; for (var i = 0; i < n; i++) a.push(ch); return a; }

    var docA = S.tokens(X0, YA, rep('A', 4), { w: CW, h: CH, gap: GAP, role: 'data', size: 12, opacity: 0 });
    var docB = S.tokens(X0, YB, rep('B', 2), { w: CW, h: CH, gap: GAP, role: 'data', size: 12, opacity: 0 });
    var docC = S.tokens(X0, YC, rep('C', 7), { w: CW, h: CH, gap: GAP, role: 'data', size: 12, opacity: 0 });
    add(host, docA, docB, docC);

    /* grey padding cells, to the longest document (7) */
    function pad(x, y, n) {
      var g = e('g', { opacity: 0 });
      for (var i = 0; i < n; i++) {
        add(g, e('rect', {
          x: x + i * ST, y: y, width: CW, height: CH, rx: 7,
          fill: 'var(--c-frozen-dim)', stroke: 'var(--c-frozen)',
          'stroke-width': 1.3, 'stroke-dasharray': '4 3'
        }));
      }
      return g;
    }
    var padA = pad(X0 + 4 * ST, YA, 3);
    var padB = pad(X0 + 2 * ST, YB, 5);
    add(host, padA, padB);

    /* end-of-text separators, at stream positions 4, 7 and 15 */
    function eosCell(pos) {
      var g = e('g', { opacity: 0 });
      var x = X0 + pos * ST;
      add(g, e('rect', {
        x: x, y: YS, width: CW, height: CH, rx: 7,
        fill: 'var(--c-ok-dim)', stroke: 'var(--c-ok)', 'stroke-width': 1.3
      }));
      add(g, e('text', {
        x: x + CW / 2, y: YS + CH / 2 + 4, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 9.5, fill: 'var(--c-ok)'
      }, 'eos'));
      return g;
    }
    var eosA = eosCell(4), eosB = eosCell(7), eosC = eosCell(15);
    add(host, eosA, eosB, eosC);

    /* row labels */
    [['doc A', YA + 20], ['doc B', YB + 20], ['doc C', YC + 20], ['stream', YS + 20]]
      .forEach(function (r) { host.appendChild(S.label(98, r[1], r[0], { anchor: 'end', small: true })); });

    /* the two cuts */
    function cut(pos) {
      return e('line', {
        x1: X0 + pos * ST - 2, y1: YS - 14, x2: X0 + pos * ST - 2, y2: YS + CH + 14,
        stroke: 'var(--c-loss)', 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0
      });
    }
    var cut1 = cut(6), cut2 = cut(12);
    add(host, cut1, cut2);

    var blockLbl = e('g', { opacity: 0 });
    [['block 1', 223], ['block 2', 450], ['leftover', 639]].forEach(function (b) {
      add(blockLbl, e('text', {
        x: b[1], y: YS + CH + 34, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 12, fill: b[0] === 'leftover' ? 'var(--text-dim)' : 'var(--c-loss)'
      }, b[0]));
    });
    host.appendChild(blockLbl);

    /* waste counter */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 744, y: 48, width: 136, height: 100, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    add(panel, e('text', { x: 812, y: 76, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'wasted tokens'));
    var wasteT = e('text', { x: 812, y: 116, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 26, fill: 'var(--c-loss)' }, '38%');
    add(panel, wasteT);
    add(panel, e('text', { x: 812, y: 138, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'of the batch'));
    host.appendChild(panel);

    var pct = function (v) { return Math.round(v) + '%'; };

    tl.step('Three documents, three different lengths. A batch has to be a rectangle, so something has to give.');
    tl.to([docA, docB, docC], { opacity: 1, duration: 0.45, stagger: 0.12 });

    tl.step('The naive answer is <b>padding</b> to the longest document. A grey cell costs exactly the same matrix multiply as a real token and produces no gradient.');
    tl.to([padA, padB], { opacity: 1, duration: 0.45 });
    tl.to(panel, { opacity: 1, duration: 0.4 }, '-=0.2');
    k.pulse(tl, wasteT, { scale: 1.2 });

    tl.step('Packing instead. Throw the padding away and pour every document into <b>one long stream</b>, with an end-of-text token between them.');
    tl.to([padA, padB], { opacity: 0, duration: 0.3 });
    tl.to(docA, { y: YS - YA, duration: 0.7, ease: 'power2.inOut' });
    tl.to(docB, { x: 5 * ST, y: YS - YB, duration: 0.7, ease: 'power2.inOut' }, '<');
    tl.to(docC, { x: 8 * ST, y: YS - YC, duration: 0.7, ease: 'power2.inOut' }, '<');
    tl.to([eosA, eosB, eosC], { opacity: 1, duration: 0.35, stagger: 0.08 }, '-=0.2');
    k.count(tl, wasteT, 38, 0, { duration: 0.7, format: pct, position: '<' });

    tl.step('Now cut the stream every <b>T</b> tokens. T is the context length — 256 in this lesson\'s project, six here so it fits on screen.');
    tl.to([cut1, cut2], { opacity: 1, duration: 0.4, stagger: 0.15 });
    tl.to(blockLbl, { opacity: 1, duration: 0.35 });

    tl.step('Two things you accept: document C is cut across a boundary, and the tail that does not fill a block waits for the next pass. In exchange <b>every position carries signal</b>.');
    k.pulse(tl, cut2, { scale: 1.15 });
    tl.to(wasteT, { fill: 'var(--c-ok)', duration: 0.4 });
  });

  /* ======================================================================
     Scene 3 — the loss curve, with samples
     ====================================================================== */

  Scene.register('gpt-loss', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#lc-plot');

    /* axes: loss 0 at y=252, loss 9 at y=48 */
    add(host, e('line', { x1: 90, y1: 252, x2: 520, y2: 252, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('line', { x1: 90, y1: 40, x2: 90, y2: 252, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    [2, 4, 6, 8].forEach(function (v) {
      var y = 252 - v * 22.667;
      add(host, e('line', { x1: 85, y1: y, x2: 90, y2: y, stroke: 'var(--line)', 'stroke-width': 1.2 }));
      host.appendChild(S.label(80, y + 4, String(v), { anchor: 'end', small: true }));
    });
    host.appendChild(S.label(84, 44, 'loss', { anchor: 'end', small: true }));
    var xlab = S.label(520, 272, 'tokens seen →', { anchor: 'end', small: true });
    host.appendChild(xlab);

    /* the ln(V) start marker */
    var startLine = e('line', {
      x1: 90, y1: 63, x2: 250, y2: 63, stroke: 'var(--c-param)',
      'stroke-width': 1.4, 'stroke-dasharray': '5 4', opacity: 0
    });
    var startLbl = e('text', { x: 256, y: 67, class: 'dg-mono', 'font-size': 12, fill: 'var(--c-param)', opacity: 0 }, 'start = ln(4096) = 8.32');
    add(host, startLine, startLbl);

    var curve = e('path', {
      d: 'M100,63 C108,90 118,110 135,118 C210,138 300,166 380,186 C440,200 480,206 515,210',
      fill: 'none', stroke: 'var(--c-loss)', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0
    });
    var logCurve = e('path', {
      d: 'M100,63 C210,100 330,152 515,210',
      fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0
    });
    var diverge = e('path', {
      d: 'M300,166 C322,160 336,132 352,110 C368,90 392,84 430,84',
      fill: 'none', stroke: 'var(--c-grad)', 'stroke-width': 2.4, 'stroke-linecap': 'round',
      'stroke-dasharray': '6 4', opacity: 0
    });
    add(host, curve, logCurve, diverge);

    var divLbl = e('text', {
      x: 434, y: 80, class: 'dg-mono', 'font-size': 11.5, fill: 'var(--c-grad)', opacity: 0
    }, 'grad_norm spike');
    host.appendChild(divLbl);

    /* markers on the curve */
    var MARK = [[135, 118], [300, 166], [515, 210]];
    var marks = MARK.map(function (p, i) {
      var g = e('g', { opacity: 0 });
      add(g, e('circle', { cx: p[0], cy: p[1], r: 11, fill: 'var(--surface-2)', stroke: 'var(--c-data)', 'stroke-width': 2 }));
      add(g, e('text', { x: p[0], y: p[1] + 4.5, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: 'var(--c-data)' }, String(i + 1)));
      host.appendChild(g);
      return g;
    });

    /* sample boxes */
    var SAMPLES = [
      { y: 44,  head: 'early — after the first fast drop',
        lines: ['the the , the the and the the a', 'the , a the the the and the .'] },
      { y: 128, head: 'middle — words and short clauses',
        lines: ['the girl was a dog . the dog was', 'to the was a little the girl .'] },
      { y: 212, head: 'end — sentences that hold together',
        lines: ['Once there was a little girl named', 'Mia . She had a red ball and a dog .'] }
    ];
    var boxes = SAMPLES.map(function (s, i) {
      var g = e('g', { opacity: 0 });
      add(g, e('rect', {
        x: 560, y: s.y, width: 320, height: 74, rx: 10,
        fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4
      }));
      add(g, e('circle', { cx: 580, cy: s.y + 19, r: 11, fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.6 }));
      add(g, e('text', { x: 580, y: s.y + 23.5, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: 'var(--c-data)' }, String(i + 1)));
      add(g, e('text', { x: 600, y: s.y + 23, class: 'dg-label dg-label--sm' }, s.head));
      add(g, e('text', { x: 576, y: s.y + 46, class: 'dg-mono', 'font-size': 11.5, fill: 'var(--text-soft)' }, s.lines[0]));
      add(g, e('text', { x: 576, y: s.y + 64, class: 'dg-mono', 'font-size': 11.5, fill: 'var(--text-soft)' }, s.lines[1]));
      host.appendChild(g);
      return g;
    });

    tl.step('Step 0 is not a mystery. A fresh model spreads its probability evenly over V tokens, so the loss starts at <span class="kw">ln(V)</span>.');
    tl.to([startLine, startLbl], { opacity: 1, duration: 0.4 });

    tl.step('The first few hundred steps fall almost vertically. The model is learning which tokens are common. This is free, and it says nothing about quality.');
    tl.to(curve, { opacity: 1, duration: 0.01 });
    k.draw(tl, curve, { duration: 1.5, ease: 'none' });
    tl.to(marks[0], { opacity: 1, duration: 0.3 }, '-=1.1');
    tl.to(boxes[0], { opacity: 1, duration: 0.4 }, '-=1.0');

    tl.step('Then the long middle. Each extra token buys less than the one before, and the samples become words and fragments of clauses.');
    tl.to(marks[1], { opacity: 1, duration: 0.3 });
    tl.to(boxes[1], { opacity: 1, duration: 0.4 }, '-=0.15');

    tl.step('By the end the loss is barely moving, and that is where the sentences appear. The last part of the curve is the part that matters to a reader.');
    tl.to(marks[2], { opacity: 1, duration: 0.3 });
    tl.to(boxes[2], { opacity: 1, duration: 0.4 }, '-=0.15');

    tl.step('One shape means stop the run: the gradient norm spikes ten to a hundred times, then the loss jumps and settles high. Lower the peak learning rate, lengthen warmup, check the data shard.');
    tl.to(diverge, { opacity: 1, duration: 0.01 });
    k.draw(tl, diverge, { duration: 0.9, ease: 'none' });
    tl.to(divLbl, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Last, an honesty check. On a linear axis the run looks dead after the first fifth. Plot the same numbers against <b>log(tokens)</b> and they are a straight line. That line is the scaling law.');
    tl.to([diverge, divLbl], { opacity: 0, duration: 0.3 });
    tl.to(curve, { opacity: 0.18, duration: 0.5 });
    tl.to(logCurve, { opacity: 1, duration: 0.5 }, '<');
    tl.call(function () { xlab.textContent = 'tokens seen, log scale →'; });
  });

  /* ======================================================================
     Scene 3b — one optimizer step: accumulation, then clipping
     ====================================================================== */

  Scene.register('gpt-step', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#st-plot');

    /* ---- left: eight micro-batches feeding one gradient buffer ---- */

    var accG = e('g', {});
    host.appendChild(accG);

    accG.appendChild(S.label(60, 50, 'micro-batch — 32 blocks of 256 tokens', { small: true }));

    var tiles = [];
    for (var i = 0; i < 8; i++) {
      var g1 = e('g', { opacity: 0 });
      var tx = 60 + i * 46;
      add(g1, e('rect', {
        x: tx, y: 62, width: 40, height: 40, rx: 7,
        fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.4
      }));
      add(g1, e('text', {
        x: tx + 20, y: 87, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 12, fill: 'var(--c-data)'
      }, String(i + 1)));
      accG.appendChild(g1);
      tiles.push(g1);
    }

    var down = S.arrow(241, 108, 241, 140, { role: 'grad' });
    accG.appendChild(down);

    var buf = S.box(60, 146, 362, 42, { title: '.grad — gradients add, they never replace', role: 'grad' });
    accG.appendChild(buf);

    var meter = S.meter(60, 206, 362, 12, { value: 0, role: 'grad', opacity: 0 });
    accG.appendChild(meter);

    var stepPill = S.pill(60, 240, 180, 32, 'opt.step()  once', { role: 'ok', size: 12.5 });
    stepPill.setAttribute('opacity', '0');
    accG.appendChild(stepPill);

    /* ---- left, second act: the gradient vector and the clip ball ---- */

    var OX = 120, OY = 240, R = 64;
    var clipG = e('g', { opacity: 0 });
    host.appendChild(clipG);

    add(clipG, e('circle', {
      cx: OX, cy: OY, r: R, fill: 'none', stroke: 'var(--c-ok)',
      'stroke-width': 1.4, 'stroke-dasharray': '5 4'
    }));
    add(clipG, e('text', {
      x: OX, y: OY - R - 10, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 12, fill: 'var(--c-ok)'
    }, 'clip = 1.0'));

    var longVec = S.arrow(OX, OY, OX + 224, OY - 124, { role: 'grad', sw: 2.4, opacity: 0 });
    var shortVec = S.arrow(OX, OY, OX + 56, OY - 31, { role: 'ok', sw: 2.8, opacity: 0 });
    clipG.appendChild(longVec);
    clipG.appendChild(shortVec);

    var vecLbl = e('text', {
      x: OX + 234, y: OY - 133, class: 'dg-mono', 'font-size': 12,
      fill: 'var(--c-grad)', opacity: 0
    }, 'length 4.0 — too long');
    clipG.appendChild(vecLbl);

    /* ---- right: the readout ---- */

    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', {
      x: 500, y: 46, width: 380, height: 206, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    var rows = [
      ['micro_batch', '32'], ['T — block length', '256'], ['accum_steps', '8'],
      ['world_size', '1'], ['tokens per step', '8,192'], ['grad_norm', '—']
    ];
    var vT = [];
    rows.forEach(function (r, j) {
      var y = 78 + j * 30;
      add(panel, e('text', { x: 520, y: y, class: 'dg-label dg-label--sm' }, r[0]));
      var t = e('text', {
        x: 860, y: y, 'text-anchor': 'end', class: 'dg-mono',
        'font-size': 13, fill: j === 4 ? 'var(--c-data)' : 'var(--text)'
      }, r[1]);
      add(panel, t); vT.push(t);
    });
    host.appendChild(panel);

    var thou = function (v) { return Math.round(v).toLocaleString('en-US'); };

    tl.step('Memory decides one thing only: how many blocks fit on the device at once. Here that is 32 — one <b>micro-batch</b>, 8,192 tokens.');
    tl.to(panel, { opacity: 1, duration: 0.35 });
    tl.to(tiles[0], { opacity: 1, duration: 0.35 }, '-=0.15');
    tl.to(buf, { opacity: 1, duration: 0.35 }, '-=0.1');
    tl.to(down, { opacity: 1, duration: 0.25 }, '-=0.2');

    tl.step('Run eight of them and call <b>backward()</b> on each. PyTorch adds into <code>.grad</code> instead of replacing it — Lesson 01 called that a trap, and here it is the whole feature.');
    tl.to(tiles.slice(1), { opacity: 1, duration: 0.3, stagger: 0.11 });
    tl.to(meter, { opacity: 1, duration: 0.25 }, '<');
    tl.to(meter.fill, { attr: { width: 362 }, duration: 0.9, ease: 'none' }, '<');
    k.count(tl, vT[4], 8192, 65536, { duration: 0.9, format: thou, position: '<' });

    tl.step('Then <b>one</b> optimizer step, on the average of all eight. Memory paid for 32 rows; the update behaves as if you had trained on 256.');
    tl.to(stepPill, { opacity: 1, duration: 0.4 });
    k.pulse(tl, stepPill, { scale: 1.08 });
    k.pulse(tl, vT[4], { scale: 1.15 });

    tl.step('One guard comes before that step. Treat every gradient in the model as a single long vector and measure its length. Today it is 4.0.');
    tl.to(accG, { opacity: 0.12, duration: 0.4 });
    tl.to(clipG, { opacity: 1, duration: 0.3 }, '-=0.2');
    tl.to([longVec, vecLbl], { opacity: 1, duration: 0.4 });
    tl.call(function () {
      vT[5].textContent = '4.0  before clipping';
      vT[5].setAttribute('fill', 'var(--c-grad)');
    });

    tl.step('Too long, so scale every gradient by 1.0 over 4.0 — a factor of 0.25. The arrow keeps its direction and loses its length, and the spike that would have wrecked the run never lands.');
    tl.to(shortVec, { opacity: 1, duration: 0.4 });
    k.dim(tl, longVec, { to: 0.28, position: '<' });
    tl.call(function () {
      vT[5].textContent = '1.0  after clipping';
      vT[5].setAttribute('fill', 'var(--c-ok)');
    });
    k.pulse(tl, shortVec, { scale: 1.1 });
  });

  /* ======================================================================
     Scene 4 — the compute budget
     ====================================================================== */

  Scene.register('gpt-budget', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#bd-plot');

    var boxes = [
      S.box(40,  56, 170, 86, { title: '8 layers · d 384', sub: 'V = 4,096', note: 'the shape you choose', role: 'param' }),
      S.box(250, 56, 170, 86, { title: 'N', sub: '14.2 M', note: 'non-embedding params', role: 'param' }),
      S.box(460, 56, 170, 86, { title: 'D', sub: '284 M', note: 'tokens = 20 × N', role: 'data' }),
      S.box(670, 56, 190, 86, { title: 'C = 6ND', sub: '2.4e16 FLOPs', note: '≈ 1.5–3 h on a free T4', role: 'loss' })
    ];
    var arrows = [
      S.arrow(214, 99, 246, 99),
      S.arrow(424, 99, 456, 99),
      S.arrow(634, 99, 666, 99)
    ];
    boxes.forEach(function (b) { host.appendChild(b); });
    arrows.forEach(function (a) { host.appendChild(a); });

    /* tokens-per-parameter axis, log scale from 10 to 10,000 */
    var AX = 100, AW = 740, AY = 232;
    function px(v) { return AX + (Math.log(v) / Math.LN10 - 1) * (AW / 3); }

    var axis = e('g', { opacity: 0 });
    add(axis, e('line', { x1: AX, y1: AY, x2: AX + AW, y2: AY, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    [10, 100, 1000, 10000].forEach(function (v) {
      add(axis, e('line', { x1: px(v), y1: AY, x2: px(v), y2: AY + 6, stroke: 'var(--line)', 'stroke-width': 1.2 }));
      add(axis, e('text', { x: px(v), y: AY + 22, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' },
        v.toLocaleString('en-US')));
    });
    add(axis, e('text', { x: 475, y: AY + 44, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' },
      'training tokens per parameter'));
    host.appendChild(axis);

    function marker(v, text, colour) {
      var g = e('g', { opacity: 0 });
      add(g, e('line', { x1: px(v), y1: AY - 14, x2: px(v), y2: AY, stroke: colour, 'stroke-width': 2 }));
      add(g, e('circle', { cx: px(v), cy: AY, r: 5, fill: colour }));
      add(g, e('text', { x: px(v), y: AY - 22, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: colour }, text));
      host.appendChild(g);
      return g;
    }

    var band = e('g', { opacity: 0 });
    add(band, e('rect', {
      x: px(500), y: AY - 12, width: px(2000) - px(500), height: 24, rx: 6,
      fill: 'var(--c-ok-dim)', stroke: 'var(--c-ok)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4'
    }));
    add(band, e('text', { x: (px(500) + px(2000)) / 2, y: AY - 20, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: 'var(--c-ok)' }, 'on-device target'));
    host.appendChild(band);

    var mChin = marker(20, 'Chinchilla · 20', 'var(--c-data)');
    var mSmol = marker(3700, 'SmolLM3-3B · 3,700', 'var(--c-param)');
    var mine = e('text', { x: px(20), y: AY + 44, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: 'var(--c-data)', opacity: 0 }, 'this project');
    host.appendChild(mine);

    tl.step('Pick the shape first: depth, width and vocabulary. Those three numbers fix everything that follows.');
    tl.to(boxes[0], { opacity: 1, duration: 0.4 });

    tl.step('They give you <b>N</b>, the parameter count. Only the non-embedding parameters go into the budget formula, because the embedding is a lookup and not a matrix multiply.');
    tl.to(arrows[0], { opacity: 1, duration: 0.25 });
    tl.to(boxes[1], { opacity: 1, duration: 0.4 }, '-=0.1');

    tl.step('Now choose <b>D</b>, the number of training tokens. The Chinchilla rule says the compute-optimal choice is about 20 tokens for every parameter.');
    tl.to(arrows[1], { opacity: 1, duration: 0.25 });
    tl.to(boxes[2], { opacity: 1, duration: 0.4 }, '-=0.1');

    tl.step('Compute is <span class="kw">C = 6 × N × D</span>. Divide by the FLOPs your machine really delivers and the answer is in hours, not in mystery.');
    tl.to(arrows[2], { opacity: 1, duration: 0.25 });
    tl.to(boxes[3], { opacity: 1, duration: 0.4 }, '-=0.1');
    k.pulse(tl, boxes[3], { scale: 1.06 });

    tl.step('Twenty tokens per parameter is the compute-optimal point. This project sits exactly there, and so does nanochat\'s d20 speedrun.');
    tl.to(axis, { opacity: 1, duration: 0.4 });
    tl.to(mChin, { opacity: 1, duration: 0.4 });
    tl.to(mine, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('But Chinchilla minimises <b>training</b> cost. Ship the model to a phone and you pay inference millions of times, so you train far past the optimum on purpose. SmolLM3-3B sits at about 3,700.');
    tl.to(band, { opacity: 1, duration: 0.4 });
    tl.to(mSmol, { opacity: 1, duration: 0.5 }, '-=0.15');
    k.dim(tl, mChin, { to: 0.45, position: '<' });
  });

  /* ======================================================================
     Scene 5 — sampling
     ====================================================================== */

  Scene.register('gpt-sampling', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap, k = ctx.k;
    var host = q('#sm-plot');

    var BASE = 246, SCALE = 200, X0 = 80, BW = 52, GAP = 22, ST = BW + GAP;
    var names = ['happy', 'sad', 'tired', 'excited', 'hungry', 'scared', 'quiet', 'small'];
    var base  = [0.34, 0.19, 0.13, 0.09, 0.08, 0.06, 0.06, 0.05];
    var t07   = [0.455, 0.198, 0.115, 0.068, 0.058, 0.038, 0.038, 0.030];
    var t14   = [0.267, 0.176, 0.135, 0.104, 0.095, 0.077, 0.077, 0.068];
    var topk  = [0.515, 0.288, 0.197, 0, 0, 0, 0, 0];
    var topp  = [0.410, 0.229, 0.157, 0.108, 0.096, 0, 0, 0];
    var peak  = [0.94, 0.02, 0.015, 0.01, 0.005, 0.004, 0.003, 0.003];
    var peakNames = ['time', 'day', 'little', 'hill', 'while', 'sunny', 'farm', 'magic'];

    add(host, e('line', { x1: 70, y1: BASE, x2: 666, y2: BASE, stroke: 'var(--line)', 'stroke-width': 1.5 }));

    var bars = [], vals = [], labs = [];
    base.forEach(function (p, i) {
      var x = X0 + i * ST, h = p * SCALE;
      var r = e('rect', { x: x, y: BASE - h, width: BW, height: h, rx: 5, fill: 'var(--c-data)', opacity: 0 });
      host.appendChild(r); bars.push(r);
      var v = e('text', { x: x + BW / 2, y: BASE - h - 8, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 11.5, fill: 'var(--text-soft)', opacity: 0 }, p.toFixed(2));
      host.appendChild(v); vals.push(v);
      var l = e('text', { x: x + BW / 2, y: 264, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 10.5, fill: 'var(--text-dim)', opacity: 0 }, names[i]);
      host.appendChild(l); labs.push(l);
    });

    var pick = e('path', { d: 'M0,0 l-7,11 l14,0 z', fill: 'var(--c-ok)', opacity: 0 });
    host.appendChild(pick);
    gsap.set(pick, { x: X0 + BW / 2, y: 274 });

    var bracket = e('g', { opacity: 0 });
    add(bracket, e('path', {
      d: 'M80,46 V38 H280 V46', fill: 'none', stroke: 'var(--c-loss)',
      'stroke-width': 1.8, 'stroke-dasharray': '5 4'
    }));
    add(bracket, e('text', { x: 180, y: 30, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12, fill: 'var(--c-loss)' }, 'top-k = 3 keeps all three'));
    host.appendChild(bracket);

    /* readout panel */
    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', { x: 690, y: 64, width: 190, height: 150, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    var rows = [['method', 'greedy'], ['setting', '—'], ['tokens kept', '8 of 8'], ['picked', 'happy']];
    var vT = [];
    rows.forEach(function (r, i) {
      var y = 94 + i * 32;
      add(panel, e('text', { x: 706, y: y, class: 'dg-label dg-label--sm' }, r[0]));
      var t = e('text', { x: 864, y: y, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--text)' }, r[1]);
      add(panel, t); vT.push(t);
    });
    host.appendChild(panel);

    var cur = base.slice();
    function shape(ps, dur, pos) {
      ps.forEach(function (p, i) {
        var h = Math.max(2, p * SCALE);
        tl.to(bars[i], { attr: { y: BASE - h, height: h }, duration: dur, ease: 'power2.inOut' }, i === 0 ? pos : '<');
        tl.to(vals[i], { attr: { y: BASE - h - 8 }, duration: dur, ease: 'power2.inOut' }, '<');
        k.count(tl, vals[i], cur[i], p, { decimals: 2, duration: dur, position: '<' });
      });
      cur = ps.slice();
    }
    function say(a, b, c, d) {
      tl.call(function () {
        vT[0].textContent = a; vT[1].textContent = b;
        vT[2].textContent = c; vT[3].textContent = d;
      });
    }

    tl.step('After the prompt "The little girl was very", the model gives a probability to every token in the vocabulary. These are the eight largest.');
    tl.call(function () {
      vals.forEach(function (v, i) { v.textContent = base[i].toFixed(2); });
      labs.forEach(function (l, i) { l.textContent = names[i]; });
    });
    tl.to(bars, { opacity: 1, duration: 0.4, stagger: 0.05 });
    tl.to(vals, { opacity: 1, duration: 0.3 }, '-=0.25');
    tl.to(labs, { opacity: 1, duration: 0.3 }, '<');
    tl.to(panel, { opacity: 1, duration: 0.35 }, '<');

    tl.step('<b>Greedy</b> takes the tallest bar, always. It never surprises you, which is exactly its problem: it falls into loops and repeats whole phrases.');
    tl.to(pick, { opacity: 1, duration: 0.3 });
    k.pulse(tl, bars[0], { scale: 1.06 });

    tl.step('<b>Temperature</b> — written τ here, because T is already the block length — divides the logits before softmax. Below 1 the distribution sharpens toward greedy; above 1 it flattens and the unlikely tokens get a real chance.');
    say('temperature', 'τ = 0.7', '8 of 8', 'happy');
    shape(t07, 0.8);
    say('temperature', 'τ = 1.4', '8 of 8', 'scared');
    shape(t14, 0.8);
    tl.to(pick, { x: X0 + 5 * ST + BW / 2, duration: 0.5 });

    tl.step('<b>Top-k</b> keeps a fixed number of bars, deletes the rest, and shares their probability among the survivors.');
    shape(topk, 0.7);
    k.dim(tl, [bars[3], bars[4], bars[5], bars[6], bars[7]], { to: 0.18, position: '<' });
    say('top-k', 'k = 3', '3 of 8', 'sad');
    tl.to(pick, { x: X0 + ST + BW / 2, duration: 0.4 });

    tl.step('<b>Top-p</b> keeps the shortest list whose probabilities add up to p. Here that is five tokens — the model is not confident, so the list is long.');
    tl.to([bars[3], bars[4]], { opacity: 1, duration: 0.3 });
    shape(topp, 0.7);
    say('top-p', 'p = 0.8', '5 of 8', 'tired');
    tl.to(pick, { x: X0 + 2 * ST + BW / 2, duration: 0.4 });

    tl.step('Now change the prompt to "Once upon a", where the model is certain. Top-p keeps <b>one</b> token. Top-k still keeps three, and two of them are wrong.');
    tl.call(function () { labs.forEach(function (l, i) { l.textContent = peakNames[i]; }); });
    tl.to([bars[5], bars[6], bars[7]], { opacity: 1, duration: 0.3 }, '<');
    shape(peak, 0.9);
    say('top-p', 'p = 0.8', '1 of 8', 'time');
    tl.to(pick, { x: X0 + BW / 2, duration: 0.4 });
    tl.to(bracket, { opacity: 1, duration: 0.4 });
    tl.to([bars[1], bars[2]], { fill: 'var(--c-loss)', duration: 0.4 }, '<');
  });

  /* ======================================================================
     Scene 6 — prefill and decode
     ====================================================================== */

  Scene.register('gpt-decode', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#kv-plot');

    /* left column: prompt, model, readout */
    var prompt = S.tokens(50, 44, ['Once', 'upon', 'a', 'time', ','],
      { w: 68, h: 32, gap: 6, role: 'data', size: 11.5, cellOpacity: 0 });
    var model = S.box(50, 96, 364, 34, { title: 'the model · 8 layers', role: 'param' });
    add(host, prompt, model);

    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', { x: 50, y: 162, width: 364, height: 128, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    var rows = [['phase', 'prefill'], ['positions per pass', '5'], ['bottleneck', 'arithmetic'], ['what you measure', 'time to first token']];
    var vT = [];
    rows.forEach(function (r, i) {
      var y = 190 + i * 28;
      add(panel, e('text', { x: 68, y: y, class: 'dg-label dg-label--sm' }, r[0]));
      var t = e('text', { x: 396, y: y, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-data)' }, r[1]);
      add(panel, t); vT.push(t);
    });
    host.appendChild(panel);

    /* right column: the cache */
    host.appendChild(S.label(500, 50, 'KV cache — one column per token, 4 of 8 layers shown', { small: true }));
    var m = S.matrix(500, 62, 4, 12, { cell: 22, gap: 3 });
    host.appendChild(m);

    var gen = S.tokens(500, 186, ['there', 'was', 'a', 'small', 'dog', '.'],
      { w: 58, h: 30, gap: 6, role: 'ok', size: 11, cellOpacity: 0 });
    host.appendChild(gen);

    host.appendChild(S.label(500, 236, 'KV cache memory', { small: true }));
    var meter = S.meter(500, 244, 300, 12, { value: 0, role: 'data', opacity: 0 });
    host.appendChild(meter);
    var formula = e('text', {
      x: 500, y: 286, class: 'dg-mono', 'font-size': 11.5, fill: 'var(--text-dim)', opacity: 0
    }, '2 × layers × kv_heads × head_dim × tokens');
    host.appendChild(formula);

    function col(c) { return [m.at(0, c), m.at(1, c), m.at(2, c), m.at(3, c)]; }
    function fill(cols, dur, pos) {
      var els = [];
      cols.forEach(function (c) { els = els.concat(col(c)); });
      tl.to(els, { attr: { fill: 'var(--c-data-dim)', stroke: 'var(--c-data)' }, duration: dur }, pos);
      return els;
    }
    function say(a, b, c, d, colour) {
      tl.call(function () {
        vT[0].textContent = a; vT[1].textContent = b;
        vT[2].textContent = c; vT[3].textContent = d;
        vT.forEach(function (t) { t.setAttribute('fill', colour); });
      });
    }

    tl.step('Generation is two jobs, not one. The first is called <b>prefill</b>: read the prompt.');
    k.appear(tl, prompt.cells.map(function (c) { return c.g; }), { stagger: 0.06 });
    tl.to(model, { opacity: 1, duration: 0.35 });
    tl.to(panel, { opacity: 1, duration: 0.35 }, '-=0.15');

    tl.step('All five positions go through the model in <b>one</b> pass. Large matrix multiplies, many rows at once — the chip is busy doing arithmetic.');
    k.pulse(tl, model, { scale: 1.03 });
    fill([0, 1, 2, 3, 4], 0.5);
    tl.to(meter, { opacity: 1, duration: 0.3 }, '<');
    tl.to(meter.fill, { attr: { width: 300 * 5 / 12 }, duration: 0.5 }, '<');

    tl.step('Every layer keeps the keys and values it just computed. Because no position can depend on a later one, those numbers will never change again. That store is the <b>KV cache</b>.');
    k.pulse(tl, m, { scale: 1.02 });
    tl.to(formula, { opacity: 1, duration: 0.35 });

    tl.step('Now <b>decode</b>. One token at a time, forever. Each pass reads the whole cache, produces one token, and adds exactly one new column.');
    say('decode', '1', 'memory bandwidth', 'tokens per second', 'var(--c-loss)');
    gen.cells.forEach(function (c, i) {
      tl.to(c.g, { opacity: 1, duration: 0.25 });
      fill([5 + i], 0.25, '<');
      tl.to(meter.fill, { attr: { width: 300 * (6 + i) / 12 }, duration: 0.25 }, '<');
    });

    tl.step('The arithmetic per token is tiny, but every weight in the model has to travel from memory to the chip to produce it. Decode is limited by <b>memory bandwidth</b>, not by maths.');
    k.pulse(tl, panel, { scale: 1.03 });
    k.dim(tl, prompt, { to: 0.4, position: '<' });

    tl.step('And the cache is not free. It grows by one column per token, in every layer. On a phone the cache, not the weights, is usually what runs out first.');
    fill([11], 0.3);
    tl.to(meter.fill, { attr: { width: 300 }, duration: 0.5 });
    tl.to(meter.fill, { fill: 'var(--c-loss)', duration: 0.3 }, '<');
    k.pulse(tl, formula, { scale: 1.08 });
  });

})();
