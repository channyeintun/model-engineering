/* =========================================================================
   Lesson 05 — Fine-tuning and LoRA. Six scenes:

     lo-memory  the memory bill of full fine-tuning, and how LoRA/QLoRA cut it
     lo-lora    one frozen matrix W, two thin trainable matrices A and B
     lo-rank    the rank dial: r = 4, 8, 16, 64 and what it costs
     lo-mask    which tokens of a chat example are actually graded
     lo-merge   B times A added back into W, leaving one ordinary matrix
     lo-forget  the narrow task rising while general ability falls, and replay

   Colour is meaning, as everywhere in this course:
     param  = trainable weights      frozen = weights that never move
     grad   = gradients              data   = activations flowing forward
     loss   = a cost we want smaller ok     = the finished, correct thing
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var e = S.e, add = S.add;

  /* A plain rectangle with a role colour, created invisible. */
  function rect(x, y, w, h, o) {
    o = o || {};
    return e('rect', {
      x: x, y: y, width: w, height: h, rx: o.rx != null ? o.rx : 4,
      fill: o.fill || (o.role ? S.tintOf(o.role) : 'var(--surface-2)'),
      stroke: o.stroke || (o.role ? S.role(o.role) : 'var(--line)'),
      'stroke-width': o.sw != null ? o.sw : 1.5,
      'stroke-dasharray': o.dashed ? '5 5' : null,
      opacity: o.opacity != null ? o.opacity : 0
    });
  }

  function sym(x, y, t, size) {
    return e('text', {
      x: x, y: y, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': size || 18, fill: 'var(--text-dim)', opacity: 0
    }, t);
  }

  /* ======================================================================
     Scene 1 — the memory bill
     ====================================================================== */

  Scene.register('lo-memory', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#mem-plot');

    var BASE = 286, PX = 4.6;          // 4.6 pixels per gigabyte
    var h = function (gb) { return gb * PX; };
    var top = function (gb, below) { return BASE - h(below) - h(gb); };

    /* axes */
    add(host, e('line', { x1: 118, y1: 46, x2: 118, y2: BASE, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('line', { x1: 118, y1: BASE, x2: 870, y2: BASE, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, S.label(118, 32, 'memory needed to train, in GB', { small: true }));

    /* a bar segment that grows out of the baseline */
    function seg(x, gb, below, role) {
      var r = rect(x, BASE, 120, 0, { role: role, rx: 3, opacity: 1 });
      host.appendChild(r);
      r.__to = { y: top(gb, below), height: h(gb) };
      return r;
    }

    /* column A — full fine-tuning of a 3.08 B model */
    var wBar = seg(150, 12.32, 0, 'param');
    var gBar = seg(150, 12.32, 12.32, 'grad');
    var aBar = rect(150, BASE, 120, 0, { fill: 'var(--c-grad-dim)', stroke: 'var(--c-grad)', rx: 3, opacity: 1 });
    host.appendChild(aBar);
    aBar.__to = { y: top(24.64, 24.64), height: h(24.64) };

    var wTxt = S.label(282, 262, '12.3 GB   weights', { small: true, role: 'param', opacity: 0 });
    var gTxt = S.label(282, 205, '12.3 GB   gradients', { small: true, role: 'grad', opacity: 0 });
    var aTxt = S.label(282, 120, '24.6 GB   AdamW state', { small: true, role: 'grad', opacity: 0 });
    add(host, wTxt, gTxt, aTxt);

    var totA = e('text', { x: 210, y: 49, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 15, fill: 'var(--c-loss)', opacity: 0 }, '49.3 GB');
    host.appendChild(totA);

    /* the laptop line */
    var lineG = e('g', { opacity: 0 });
    add(lineG, e('line', { x1: 118, y1: 212.4, x2: 870, y2: 212.4, stroke: 'var(--c-loss)', 'stroke-width': 2, 'stroke-dasharray': '7 5' }));
    add(lineG, e('text', { x: 856, y: 206, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-loss)' }, '16 GB laptop'));
    host.appendChild(lineG);

    /* column B — LoRA */
    var loBase = seg(470, 6.16, 0, 'frozen');
    var loAd = seg(470, 0.48, 6.16, 'param');
    var totB = e('text', { x: 530, y: 245, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 15, fill: 'var(--c-ok)', opacity: 0 }, '6.6 GB');
    host.appendChild(totB);

    /* column C — QLoRA */
    var qlBase = seg(700, 1.54, 0, 'frozen');
    var qlAd = seg(700, 0.48, 1.54, 'param');
    var totC = e('text', { x: 760, y: 266, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 15, fill: 'var(--c-ok)', opacity: 0 }, '2.0 GB');
    host.appendChild(totC);

    /* column names */
    var nameA = S.label(210, 308, 'full fine-tune', { anchor: 'middle', small: true, opacity: 0 });
    var nameB = S.label(530, 308, 'LoRA   r = 16', { anchor: 'middle', small: true, opacity: 0 });
    var nameC = S.label(760, 308, 'QLoRA   r = 16', { anchor: 'middle', small: true, opacity: 0 });
    add(host, nameA, nameB, nameC);

    function grow(bar, label, dur) {
      tl.to(bar, { attr: bar.__to, duration: dur || 0.6, ease: 'power2.out' });
      if (label) tl.to(label, { opacity: 1, duration: 0.3 }, '-=0.25');
    }

    tl.step('SmolLM3-3B has 3.08 billion parameters. In bf16 the weights are 6.2 GB — but training keeps a float32 copy, so start at <b>12.3 GB</b>.');
    tl.to(nameA, { opacity: 1, duration: 0.3 });
    grow(wBar, wTxt);

    tl.step('Every parameter needs its own <b>gradient</b>. That is the same size again.');
    grow(gBar, gTxt);

    tl.step('AdamW keeps <b>two running averages</b> of the gradient, for every parameter. Twice the model, once more.');
    grow(aBar, aTxt, 0.8);

    tl.step('49.3 GB, and no activation is stored yet. A 16 GB laptop is not close, and neither is a free Colab card.');
    tl.to(totA, { opacity: 1, duration: 0.3 });
    tl.to(lineG, { opacity: 1, duration: 0.4 }, '-=0.1');
    k.pulse(tl, totA, { scale: 1.25 });

    tl.step('<b>LoRA</b> freezes the base. Gradients and optimizer state now exist only for the adapter, and the frozen base can stay in bf16.');
    tl.to(nameB, { opacity: 1, duration: 0.3 });
    grow(loBase, null, 0.5);
    grow(loAd, totB, 0.3);

    tl.step('<b>QLoRA</b> also stores the frozen base in 4 bits. The last big bar shrinks, and the whole run fits in about 2 GB.');
    tl.to(nameC, { opacity: 1, duration: 0.3 });
    grow(qlBase, null, 0.5);
    grow(qlAd, totC, 0.3);
    k.dim(tl, [wBar, gBar, aBar, wTxt, gTxt, aTxt, totA], { to: 0.3 });
  });

  /* ======================================================================
     Scene 2 — W plus B times A
     ====================================================================== */

  Scene.register('lo-lora', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#lo-plot');

    var inPill = S.pill(40, 132, 56, 36, 'x', { role: 'data' });
    var inArr = S.arrow(100, 150, 144, 150, { role: 'data' });

    var split = e('g', { opacity: 0 });
    add(split, e('line', { x1: 150, y1: 88, x2: 150, y2: 202, stroke: 'var(--c-data)', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
    var toW = S.arrow(150, 88, 196, 88, { role: 'data' });
    var toA = S.arrow(150, 202, 174, 202, { role: 'data' });

    var W = S.box(200, 52, 150, 72, {
      title: 'W', sub: '2048 × 2048', role: 'frozen',
      note: 'frozen · 4,194,304 numbers'
    });

    var A = S.box(178, 170, 118, 62, { title: 'A', sub: '16 × 2048', role: 'param' });
    var ab = S.arrow(300, 201, 316, 201, { role: 'data' });
    var B = S.box(320, 170, 118, 62, { title: 'B', sub: '2048 × 16', role: 'param' });
    var trainTag = S.label(308, 254, 'trainable', { anchor: 'middle', small: true, role: 'param', opacity: 0 });

    var plus = e('g', { opacity: 0 });
    add(plus, e('circle', { cx: 560, cy: 150, r: 24, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.6 }));
    add(plus, e('text', { x: 560, y: 157, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 18, fill: 'var(--text)' }, '+'));

    var cW = S.curve(350, 88, 536, 142, { role: 'data', bow: 60 });
    var cB = S.curve(438, 201, 536, 158, { role: 'data', bow: 50 });
    var scale = S.pill(452, 214, 76, 26, 'α / r', { role: 'param' });

    var outArr = S.arrow(584, 150, 632, 150, { role: 'data' });
    var outPill = S.pill(636, 132, 60, 36, 'h', { role: 'data' });

    var zero = e('text', {
      x: 560, y: 108, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12.5,
      fill: 'var(--c-frozen)', opacity: 0
    }, 'B = 0  →  B A = 0');

    var noGrad = S.pill(215, 14, 120, 26, 'no gradient', { role: 'frozen' });
    var gA = S.arrow(237, 278, 237, 238, { role: 'grad' });
    var gB = S.arrow(379, 278, 379, 238, { role: 'grad' });

    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', { x: 690, y: 196, width: 190, height: 88, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(panel, S.label(706, 222, 'trainable here', { small: true }));
    add(panel, e('text', { x: 866, y: 222, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 13, fill: 'var(--c-param)' }, '65,536'));
    add(panel, S.label(706, 248, 'frozen here', { small: true }));
    add(panel, e('text', { x: 866, y: 248, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 13, fill: 'var(--c-frozen)' }, '4,194,304'));
    add(panel, e('text', { x: 706, y: 272, class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-ok)' }, '1.6 % of this matrix'));

    add(host, inPill, inArr, split, toW, toA, W, A, ab, B, trainTag,
              cW, cB, plus, scale, outArr, outPill, zero, noGrad, gA, gB, panel);

    tl.step('One weight matrix inside the model: the query projection of a single layer. 2048 × 2048 is <b>4,194,304 numbers</b>, and full fine-tuning rewrites all of them.');
    tl.to([inPill, inArr, split, toW, W], { opacity: 1, duration: 0.4, stagger: 0.08 });

    tl.step('LoRA <b>freezes</b> it. Not one number inside W changes during training.');
    k.pulse(tl, W, { scale: 1.04 });
    tl.to(noGrad, { opacity: 1, duration: 0.35 });

    tl.step('Beside it we put two thin matrices. <b>A</b> squeezes the 2048 inputs down to r = 16 numbers. <b>B</b> expands those 16 back to 2048.');
    tl.to([toA, A, ab, B, trainTag], { opacity: 1, duration: 0.35, stagger: 0.1 });

    tl.step('The two paths are added. The layer now computes <span class="kw">W x + (α/r) · B A x</span>, and the shapes match because B A is 2048 × 2048.');
    tl.to([cW, cB, plus], { opacity: 1, duration: 0.35, stagger: 0.08 });
    tl.to([scale, outArr, outPill], { opacity: 1, duration: 0.35, stagger: 0.08 });

    tl.step('<b>B starts as all zeros</b>, so the second path contributes exactly nothing at step 0. The adapted model begins as the model you downloaded — there is no accuracy cliff.');
    tl.to(zero, { opacity: 1, duration: 0.35 });
    k.pulse(tl, B, { scale: 1.08 });

    tl.step('Only A and B receive gradients: <span class="kw">16 × (2048 + 2048) = 65,536</span> numbers. Backward never touches W, which is where the memory went.');
    tl.to(zero, { opacity: 0, duration: 0.25 });
    tl.to([gA, gB], { opacity: 1, duration: 0.35, stagger: 0.1 });
    tl.to(panel, { opacity: 1, duration: 0.4 }, '-=0.1');
  });

  /* ======================================================================
     Scene 3 — the rank dial
     ====================================================================== */

  Scene.register('lo-rank', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#rk-plot');

    var RANKS = [
      { r: 4,  params: '7.6 M',   pct: '0.25 %', frac: 0.245, x: 576 },
      { r: 8,  params: '15.1 M',  pct: '0.49 %', frac: 0.49,  x: 668 },
      { r: 16, params: '30.2 M',  pct: '0.98 %', frac: 0.98,  x: 760 },
      { r: 64, params: '120.9 M', pct: '3.9 %',  frac: 3.93,  x: 852 }
    ];
    var METER = 276;

    /* the frozen base matrix */
    add(host, rect(60, 64, 150, 150, { role: 'frozen', rx: 5, opacity: 1 }));
    add(host, S.label(135, 236, 'W  frozen  2048 × 2048', { anchor: 'middle', small: true }));

    var bRect = rect(232, 64, 6, 150, { role: 'param', rx: 3, opacity: 1 });
    var aRect = rect(360, 208, 150, 6, { role: 'param', rx: 3, opacity: 1 });
    add(host, bRect, aRect);
    add(host, S.label(232, 236, 'B  2048 × r', { small: true, role: 'param' }));
    add(host, S.label(435, 236, 'A  r × 2048', { anchor: 'middle', small: true, role: 'param' }));

    /* readout panel */
    add(host, e('rect', { x: 556, y: 56, width: 316, height: 170, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, S.label(576, 90, 'rank r', { small: true }));
    var rTxt = e('text', { x: 852, y: 96, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 26, fill: 'var(--c-param)' }, '4');
    add(host, rTxt);
    add(host, S.label(576, 132, 'trainable parameters', { small: true }));
    var pTxt = e('text', { x: 852, y: 132, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 16, fill: 'var(--c-param)' }, '7.6 M');
    add(host, pTxt);
    add(host, S.label(576, 168, 'share of the 3.08 B model', { small: true }));
    var sTxt = e('text', { x: 852, y: 168, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 16, fill: 'var(--c-ok)' }, '0.25 %');
    add(host, sTxt);

    add(host, e('rect', { x: 576, y: 188, width: METER, height: 12, rx: 6, fill: 'var(--surface-3)' }));
    var meter = e('rect', { x: 576, y: 188, width: 0.245 / 4 * METER, height: 12, rx: 6, fill: 'var(--c-param)' });
    add(host, meter);
    add(host, S.label(576, 216, '0 – 4 % of all 3.08 B parameters', { small: true }));

    /* the dial itself */
    add(host, e('line', { x1: 576, y1: 258, x2: 852, y2: 258, stroke: 'var(--line)', 'stroke-width': 2 }));
    add(host, S.label(566, 262, 'rank', { anchor: 'end', small: true }));
    RANKS.forEach(function (d) {
      add(host, e('circle', { cx: d.x, cy: 258, r: 3, fill: 'var(--text-dim)' }));
      add(host, S.label(d.x, 278, String(d.r), { anchor: 'middle', small: true }));
    });
    var knob = e('circle', { cx: 576, cy: 258, r: 7, fill: 'var(--c-param)' });
    add(host, knob);

    var aPill = S.pill(60, 258, 110, 26, 'α / r', { role: 'param' });
    var aNote = S.label(182, 276, 'a scale on the output, not extra capacity', { small: true, opacity: 0 });
    add(host, aPill, aNote);

    function setRank(i, dur) {
      var d = RANKS[i], w = 1.5 * d.r;
      tl.to(bRect, { attr: { width: w }, duration: dur, ease: 'power2.inOut' });
      tl.to(aRect, { attr: { height: w, y: 214 - w }, duration: dur, ease: 'power2.inOut' }, '<');
      tl.to(knob, { attr: { cx: d.x }, duration: dur, ease: 'power2.inOut' }, '<');
      tl.to(meter, { attr: { width: d.frac / 4 * METER }, duration: dur, ease: 'power2.inOut' }, '<');
      tl.call(function () {
        rTxt.textContent = String(d.r);
        pTxt.textContent = d.params;
        sTxt.textContent = d.pct;
      }, null, '<');
    }

    tl.step('The base matrix is frozen. Beside it, B and A meet at a bottleneck exactly <b>r</b> numbers wide. Start at r = 4.');
    k.pulse(tl, [bRect, aRect], { scale: 1.06 });

    tl.step('Double the rank to 8 and both strips double. Trainable parameters grow <b>linearly</b> with r: 1,889,280 × r across the whole model.');
    setRank(1, 0.7);

    tl.step('r = 16 is the sensible place to start for a small model: 30.2 million numbers, <b>under 1%</b> of the model.');
    setRank(2, 0.7);

    tl.step('r = 64 is a real new task rather than a style change. The strips are now visibly thick, and gradients plus optimizer state grow with them.');
    setRank(3, 0.9);

    tl.step('<b>Alpha is not a second rank.</b> It only scales the adapter output by α/r, which is what keeps the best learning rate roughly independent of r.');
    tl.to([aPill, aNote], { opacity: 1, duration: 0.4, stagger: 0.1 });
    k.pulse(tl, aPill, { scale: 1.1 });
  });

  /* ======================================================================
     Scene 4 — loss masking on a chat template
     ====================================================================== */

  Scene.register('lo-mask', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#mk-plot');

    add(host, S.label(80, 34, 'one training example, after the chat template', { small: true }));
    var counter = e('text', {
      x: 840, y: 34, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 13, fill: 'var(--c-ok)', opacity: 0
    }, 'tokens in the loss:  13 / 13');
    add(host, counter);

    add(host, S.label(80, 52, 'user turn', { small: true }));
    add(host, S.label(80, 142, 'assistant turn', { small: true }));

    var rowA = S.tokens(80, 60, ['<|im_start|>', 'user', 'Summarise', 'the', 'invoice', '<|im_end|>'],
                        { w: 100, h: 34, gap: 7, size: 11, opacity: 0 });
    var rowB = S.tokens(80, 150, ['<|im_start|>', 'assistant', 'The', 'invoice', 'is', 'late', '<|im_end|>'],
                        { w: 100, h: 34, gap: 7, size: 11, opacity: 0 });
    add(host, rowA, rowB);

    /* the label under every cell: "in loss" or "-100" */
    var labA = rowA.cells.map(function (c) {
      var t = e('text', { x: c.cx, y: 114, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 11, fill: 'var(--c-ok)', opacity: 0 }, 'in loss');
      add(host, t); return t;
    });
    var labB = rowB.cells.map(function (c) {
      var t = e('text', { x: c.cx, y: 208, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 11, fill: 'var(--c-ok)', opacity: 0 }, 'in loss');
      add(host, t); return t;
    });

    /* GRADED = the assistant's own words plus the token that ends its turn */
    var GRADED = [2, 3, 4, 5, 6];
    var marks = GRADED.map(function (i) {
      var c = rowB.cells[i];
      var m = e('rect', { x: c.cx - 18, y: 190, width: 36, height: 3, rx: 1.5, fill: 'var(--c-grad)', opacity: 0 });
      add(host, m); return m;
    });

    /* the realistic ratio, as a bar */
    var barG = e('g', { opacity: 0 });
    add(barG, S.label(80, 234, 'a realistic example — one long document, one short answer', { small: true }));
    add(barG, e('rect', { x: 80, y: 242, width: 740, height: 20, rx: 6, fill: 'var(--surface-3)' }));
    add(barG, e('rect', { x: 598, y: 242, width: 222, height: 20, rx: 6, fill: 'var(--c-grad)' }));
    add(barG, e('text', { x: 80, y: 280, class: 'dg-mono', 'font-size': 12, fill: 'var(--text-soft)' }, '312 of 1,024 positions carry a gradient'));
    add(host, barG);

    tl.step('The chat template turns a list of messages into <b>one flat string of tokens</b>. The role markers are real tokens, not metadata.');
    tl.to(rowA, { opacity: 1, duration: 0.4 });
    tl.to(rowB, { opacity: 1, duration: 0.4 }, '-=0.2');

    tl.step('Train on that string as plain text and <b>every</b> position is graded. Thirteen of thirteen.');
    tl.to(labA.concat(labB), { opacity: 1, duration: 0.3, stagger: 0.04 });
    tl.to(counter, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('That also trains the model to write the <b>user\'s</b> half of the conversation. You will never ask it to do that — and a model good at inventing user turns will invent one after its answer.');
    k.pulse(tl, rowA, { scale: 1.03 });
    tl.to(rowA.cells.map(function (c) { return c.rect; }), { stroke: 'var(--c-loss)', duration: 0.4 }, '<');

    tl.step('<span class="kw">assistant_only_loss=True</span> replaces the prompt labels with <b>-100</b>, the ignore index. Cross-entropy skips those positions entirely.');
    tl.to(rowA.cells.map(function (c) { return c.rect; }), { stroke: 'var(--c-frozen)', duration: 0.4 });
    tl.to(rowA, { opacity: 0.35, duration: 0.4 }, '<');
    tl.call(function () {
      labA.forEach(function (t) { t.textContent = '-100'; t.setAttribute('fill', 'var(--c-frozen)'); });
      labB[0].textContent = '-100'; labB[0].setAttribute('fill', 'var(--c-frozen)');
      labB[1].textContent = '-100'; labB[1].setAttribute('fill', 'var(--c-frozen)');
      counter.textContent = 'tokens in the loss:  5 / 13';
    });
    tl.to(marks, { opacity: 1, duration: 0.3, stagger: 0.06 });
    k.pulse(tl, counter, { scale: 1.15 });

    tl.step('The ratio is what really matters. With a long document and a short answer, unmasked training would spend most of its gradient on text the model never has to produce.');
    tl.to(barG, { opacity: 1, duration: 0.45 });
  });

  /* ======================================================================
     Scene 5 — merging the adapter back in
     ====================================================================== */

  Scene.register('lo-merge', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#mg-plot');

    add(host, S.label(80, 40, 'merging the adapter back into the base', { small: true }));

    var B = rect(120, 70, 26, 120, { role: 'param' });
    var mul = sym(162, 140, '×');
    var A = rect(178, 118, 120, 26, { role: 'param' });
    var eq1 = sym(318, 140, '=');
    var dW = rect(338, 70, 120, 120, { role: 'param', dashed: true });
    var plus = sym(478, 140, '+');
    var W = rect(498, 70, 120, 120, { role: 'frozen' });
    var eq2 = sym(638, 140, '=');
    var W2 = rect(658, 70, 120, 120, { role: 'param' });
    add(host, B, mul, A, eq1, dW, plus, W, eq2, W2);

    var lB = S.label(133, 212, 'B  2048 × 16', { anchor: 'middle', small: true, opacity: 0 });
    var lA = S.label(238, 212, 'A  16 × 2048', { anchor: 'middle', small: true, opacity: 0 });
    var lD = S.label(398, 212, '(α/r) · B A', { anchor: 'middle', small: true, opacity: 0 });
    var lW = S.label(558, 212, 'W  frozen', { anchor: 'middle', small: true, opacity: 0 });
    var l2 = S.label(718, 212, 'W′  ordinary weights', { anchor: 'middle', small: true, opacity: 0 });
    add(host, lB, lA, lD, lW, l2);

    /* the inference-cost rows */
    var row1 = e('g', { opacity: 0 });
    add(row1, S.label(80, 258, 'adapter attached', { small: true }));
    add(row1, e('rect', { x: 220, y: 246, width: 16, height: 16, rx: 3, fill: 'var(--c-frozen-dim)', stroke: 'var(--c-frozen)', 'stroke-width': 1.4 }));
    add(row1, e('rect', { x: 244, y: 246, width: 16, height: 16, rx: 3, fill: 'var(--c-param-dim)', stroke: 'var(--c-param)', 'stroke-width': 1.4 }));
    add(row1, e('rect', { x: 268, y: 246, width: 16, height: 16, rx: 3, fill: 'var(--c-param-dim)', stroke: 'var(--c-param)', 'stroke-width': 1.4 }));
    add(row1, S.label(300, 258, '3 matrix multiplies per targeted layer', { small: true, role: 'loss' }));

    var row2 = e('g', { opacity: 0 });
    add(row2, S.label(80, 286, 'merged', { small: true }));
    add(row2, e('rect', { x: 220, y: 274, width: 16, height: 16, rx: 3, fill: 'var(--c-param-dim)', stroke: 'var(--c-param)', 'stroke-width': 1.4 }));
    add(row2, S.label(300, 286, '1 — exactly the base model\'s cost', { small: true, role: 'ok' }));
    add(host, row1, row2);

    tl.step('Training is over. The base never moved, and the adapter is a separate file: 30.2 M numbers, about <b>60 MB</b> in bf16, beside a 6.2 GB base.');
    tl.to([W, lW], { opacity: 1, duration: 0.4 });
    tl.to([B, A, lB, lA], { opacity: 1, duration: 0.4, stagger: 0.08 }, '-=0.15');

    tl.step('You can serve them exactly like this — the cost is <b>two extra matrix multiplies</b> per targeted layer, on every token. Or you merge: multiply B by A once, scale by α/r, and the product has <b>exactly the shape of W</b> — 2048 × 2048, dense, no longer low-rank to look at.');
    tl.to(row1, { opacity: 1, duration: 0.4 });
    tl.to([mul, eq1], { opacity: 1, duration: 0.25 });
    tl.to(dW, { opacity: 1, duration: 0.5 });
    tl.to(lD, { opacity: 1, duration: 0.3 }, '-=0.25');

    tl.step('Add it into the frozen matrix. What comes out is an <b>ordinary weight matrix</b>. There is no adapter left to attach.');
    tl.to([plus, eq2], { opacity: 1, duration: 0.25 });
    tl.to([W2, l2], { opacity: 1, duration: 0.5 });
    k.dim(tl, [B, A, dW, lB, lA, lD, mul, eq1], { to: 0.2 });

    tl.step('The merged model has the base model\'s shape, file size and speed — one multiply again. <b>Lesson 09 needs this file</b>, because export tools follow one graph of ordinary weights, not a base model plus a separate adapter file.');
    tl.to(row2, { opacity: 1, duration: 0.4 });
    k.dim(tl, row1, { to: 0.3, position: '<' });
    k.pulse(tl, W2, { scale: 1.05 });
  });

  /* ======================================================================
     Scene 6 — catastrophic forgetting, and what replay does to it
     ====================================================================== */

  Scene.register('lo-forget', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#fg-plot');

    /* axes */
    add(host, e('line', { x1: 100, y1: 250, x2: 690, y2: 250, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('line', { x1: 100, y1: 40, x2: 100, y2: 250, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, S.label(100, 32, 'score on a held-out set', { small: true }));
    add(host, S.label(690, 272, 'training steps →', { anchor: 'end', small: true }));

    /* where both scores start, before a single step */
    var start = e('g', { opacity: 0 });
    add(start, e('line', { x1: 100, y1: 88, x2: 690, y2: 88, stroke: 'var(--line)', 'stroke-width': 1.2, 'stroke-dasharray': '4 6' }));
    add(start, e('circle', { cx: 120, cy: 215, r: 5, fill: 'var(--c-ok)' }));
    add(start, e('circle', { cx: 120, cy: 88, r: 5, fill: 'var(--c-data)' }));
    add(start, S.label(130, 78, 'the base model, before you train', { small: true }));
    host.appendChild(start);

    var task = e('path', {
      d: 'M120,215 C220,180 300,124 400,102 C480,86 570,76 660,70',
      fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0
    });
    var gen = e('path', {
      d: 'M120,88 C200,92 260,106 340,130 C430,158 540,186 660,206',
      fill: 'none', stroke: 'var(--c-data)', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0
    });
    var replay = e('path', {
      d: 'M120,88 C220,92 320,98 420,104 C520,110 580,113 660,116',
      fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 2.4, 'stroke-linecap': 'round',
      'stroke-dasharray': '7 5', opacity: 0
    });
    host.appendChild(task); host.appendChild(gen); host.appendChild(replay);

    var lTask = S.label(652, 58, 'your task', { anchor: 'end', small: true, role: 'ok', opacity: 0 });
    var lGen = S.label(652, 226, 'everything else', { anchor: 'end', small: true, role: 'data', opacity: 0 });
    var lRep = S.label(652, 138, 'with replay', { anchor: 'end', small: true, role: 'ok', opacity: 0 });
    add(host, lTask, lGen, lRep);

    var gap = e('g', { opacity: 0 });
    add(gap, e('line', { x1: 596, y1: 92, x2: 596, y2: 196, stroke: 'var(--c-loss)', 'stroke-width': 2 }));
    add(gap, e('text', { x: 588, y: 148, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-loss)' }, 'what you lost'));
    host.appendChild(gap);

    /* readout */
    add(host, e('rect', { x: 706, y: 52, width: 170, height: 152, rx: 12, fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, S.label(722, 80, 'after 3 epochs, in points', { small: true }));
    add(host, S.label(876, 224, 'illustrative, not measured', { anchor: 'end', small: true, role: 'loss' }));

    function row(y, name, value, role) {
      var g = e('g', { opacity: 0 });
      add(g, S.label(722, y, name, { small: true }));
      add(g, e('text', { x: 860, y: y, 'text-anchor': 'end', class: 'dg-mono', 'font-size': 14, fill: 'var(--c-' + role + ')' }, value));
      host.appendChild(g);
      return g;
    }
    var rTask = row(112, 'your task', '+38', 'ok');
    var rGen = row(146, 'everything else', '-21', 'loss');
    var rRep = row(180, 'with 5% replay', '-4', 'ok');

    tl.step('Two numbers matter here, not one: how good the model is at <b>your task</b>, and how good it is at <b>everything else</b>. Record both before you train a single step.');
    tl.to(start, { opacity: 1, duration: 0.5 });

    tl.step('The task score climbs. This is the curve you were watching, and for most people it is the only one they ever record.');
    tl.to(task, { opacity: 1, duration: 0.01 });
    k.draw(tl, task, { duration: 1.2, ease: 'none' });
    tl.to([lTask, rTask], { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('And the other one falls. The weights moved toward your narrow data, so ordinary conversation got worse. Nothing warns you, because your evaluation set does not test it.');
    tl.to(gen, { opacity: 1, duration: 0.01 });
    k.draw(tl, gen, { duration: 1.2, ease: 'none' });
    tl.to([lGen, rGen], { opacity: 1, duration: 0.3 }, '-=0.3');
    tl.to(gap, { opacity: 1, duration: 0.4 });

    tl.step('<b>Replay</b> is the cheap defence: mix 1 – 10% of general instruction data back into your narrow set. Same task score, and the second curve nearly flattens.');
    tl.to(replay, { opacity: 1, duration: 0.01 });
    k.draw(tl, replay, { duration: 1.1, ease: 'none' });
    tl.to([lRep, rRep], { opacity: 1, duration: 0.3 }, '-=0.3');
    k.dim(tl, [gen, lGen, gap], { to: 0.35 });

    tl.step('None of this is visible unless you measure it. Three general prompts, answered before and after, is the whole ritual — <b>five minutes</b>, and the only way you will notice.');
    k.pulse(tl, [rGen, rRep], { scale: 1.12, stagger: 0.1 });
  });

})();
