/* =========================================================================
   Lesson 07 — Quantization: fewer bits.

   Seven scenes:
     q-levels    the same range at FP32, INT8 and INT4 resolution
     q-memory    360 million weights in four containers
     q-roundtrip one weight, divided, rounded, stored, multiplied back
     q-grain     per-tensor -> per-row -> per-group, and the error meter
     q-outlier   one huge value, and the other seven collapse
     q-ste       rounding forward, identity backward
     q-damage    what four bits costs, benchmark by benchmark

   Colour convention (do not change): data = cyan, param = amber,
   grad = magenta, loss = red, ok = green, frozen = grey.
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var e = S.e, add = S.add;

  var LINE   = 'var(--line)';
  var DIM    = 'var(--text-dim)';
  var PARAM  = 'var(--c-param)';
  var LOSS   = 'var(--c-loss)';
  var GRAD   = 'var(--c-grad)';
  var DATA   = 'var(--c-data)';
  var FROZEN = 'var(--c-frozen)';
  var SURF   = 'var(--surface-2)';

  function panel(x, y, w, h) {
    return e('rect', { x: x, y: y, width: w, height: h, rx: 12,
                       fill: SURF, stroke: LINE, 'stroke-width': 1.5 });
  }
  function txt(x, y, s, o) {
    o = o || {};
    return e('text', {
      x: x, y: y, 'text-anchor': o.anchor || 'start',
      class: o.mono ? 'dg-mono' : (o.small ? 'dg-label dg-label--sm' : 'dg-label'),
      'font-size': o.size || null, fill: o.fill || null,
      opacity: o.opacity != null ? o.opacity : null
    }, s);
  }

  /* ======================================================================
     Scene 1 — the number line at three resolutions
     viewBox 900 x 300
     ====================================================================== */

  Scene.register('q-levels', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ql-plot');

    var X0 = 110, X1 = 640;                 /* the line spans v = -1 .. +1 */
    function X(v) { return 375 + v * 265; }

    var ROWS = [
      { y: 90,  name: 'FP32', sub: 'continuous' },
      { y: 175, name: 'INT8', sub: '256 levels' },
      { y: 260, name: 'INT4', sub: '16 levels' }
    ];

    ROWS.forEach(function (r) {
      add(host, e('line', { x1: X0, y1: r.y, x2: X1, y2: r.y,
                            stroke: LINE, 'stroke-width': r.y === 90 ? 3 : 1.6,
                            'stroke-linecap': 'round' }));
      add(host, txt(98, r.y - 1, r.name, { anchor: 'end', mono: true, size: 13 }));
      add(host, txt(98, r.y + 16, r.sub, { anchor: 'end', small: true }));
    });

    /* 256 INT8 ticks, then 16 INT4 ticks */
    var g8 = S.g({ opacity: 0 }), g4 = S.g({ opacity: 0 });
    var i;
    for (i = 0; i < 256; i++) {
      var x8 = X0 + i * ((X1 - X0) / 255);
      add(g8, e('line', { x1: x8, y1: 168, x2: x8, y2: 182, stroke: FROZEN, 'stroke-width': 1 }));
    }
    for (i = 0; i < 16; i++) {
      var x4 = X0 + i * ((X1 - X0) / 15);
      add(g4, e('line', { x1: x4, y1: 249, x2: x4, y2: 271, stroke: FROZEN, 'stroke-width': 1.8 }));
    }
    host.appendChild(g8); host.appendChild(g4);

    /* one real weight, and where it lands on each grid */
    var vTrue = 0.63;
    var guide = e('line', { x1: X(vTrue), y1: 58, x2: X(vTrue), y2: 282,
                            stroke: PARAM, 'stroke-width': 1, 'stroke-dasharray': '3 5', opacity: 0 });
    host.appendChild(guide);

    function dot(x, y) {
      var c = e('circle', { cx: x, cy: y, r: 6, fill: PARAM, opacity: 0 });
      host.appendChild(c); return c;
    }
    var d32 = dot(X(vTrue), 90);
    var d8  = dot(X0 + 208 * ((X1 - X0) / 255), 175);   /* nearest of 256 */
    var d4  = dot(X0 + 12 * ((X1 - X0) / 15), 260);     /* nearest of 16  */

    /* readout */
    var p = S.g({ opacity: 0 });
    add(p, panel(665, 60, 215, 185));
    add(p, txt(681, 86, 'the weight', { small: true }));
    add(p, txt(864, 86, '0.6300', { anchor: 'end', mono: true, size: 14, fill: PARAM }));
    add(p, txt(681, 124, 'INT8 stores', { small: true }));
    add(p, txt(864, 124, '0.6314', { anchor: 'end', mono: true, size: 14, fill: PARAM }));
    add(p, txt(681, 146, 'error', { small: true }));
    add(p, txt(864, 146, '0.0014', { anchor: 'end', mono: true, size: 13, fill: LOSS }));
    add(p, txt(681, 184, 'INT4 stores', { small: true }));
    add(p, txt(864, 184, '0.6000', { anchor: 'end', mono: true, size: 14, fill: PARAM }));
    var e4 = txt(864, 206, '0.0300', { anchor: 'end', mono: true, size: 13, fill: LOSS });
    add(p, txt(681, 206, 'error', { small: true }));
    add(p, e4);
    host.appendChild(p);

    tl.step('One weight, one real number. In FP32 the line is divided so finely that we can treat it as continuous.');
    tl.to([d32, guide, p], { opacity: 1, duration: 0.45 });

    tl.step('INT8 keeps <b>256 levels</b> across the same range. The steps are 0.0078 apart, so the weight barely has to move.');
    tl.to(g8, { opacity: 1, duration: 0.5 });
    tl.to(d8, { opacity: 1, duration: 0.35 });

    tl.step('INT4 keeps <b>16</b>. Now the steps are 0.133 apart, and the weight must jump to 0.60.');
    tl.to(g4, { opacity: 1, duration: 0.5 });
    tl.to(d4, { opacity: 1, duration: 0.35 });
    ctx.k.pulse(tl, d4, { scale: 1.5 });

    tl.step('The error is the distance to the nearest level: 0.0014 at INT8, 0.0300 at INT4. More than fifteen times worse, from four bits fewer — the exact ratio depends on where the weight happens to fall between levels.');
    ctx.k.pulse(tl, e4, { scale: 1.3 });

    tl.step('That is the whole trade. Every bit you remove <b>halves</b> the number of levels, doubles the step, and doubles the worst-case error.');
    k.dim(tl, g8, { to: 0.25 });
    tl.to(g4, { opacity: 1, duration: 0.3 }, '<');
    ctx.k.pulse(tl, g4, { scale: 1.02 });
  });

  /* ======================================================================
     Scene 2 — memory
     viewBox 900 x 300
     ====================================================================== */

  Scene.register('q-memory', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#qm-plot');

    var X0 = 210, PX = 560 / 1440;   /* pixels per megabyte */

    var rows = [
      { y: 51,  name: 'FP32',  bits: '32 bits',   mb: 1440 },
      { y: 113, name: 'BF16',  bits: '16 bits',   mb: 720 },
      { y: 175, name: 'INT8',  bits: '8 bits',    mb: 360 },
      { y: 237, name: 'INT4',  bits: '4.25 bits', mb: 191 }
    ];

    add(host, txt(60, 30, '360 million weights — the same model, four containers', { small: true }));

    var bars = [], vals = [], bitLabels = [];
    rows.forEach(function (r) {
      var w = r.mb * PX;
      add(host, txt(196, r.y + 18, r.name, { anchor: 'end', mono: true, size: 14 }));
      var bl = txt(196, r.y + 35, r.bits, { anchor: 'end', small: true });
      add(host, bl); bitLabels.push(bl);

      var bar = e('rect', { x: X0, y: r.y, width: 0, height: 38, rx: 6,
                            fill: PARAM, opacity: 0.85 });
      host.appendChild(bar); bars.push({ el: bar, w: w });

      var v = txt(X0 + w + 12, r.y + 25, String(r.mb) + ' MB',
                  { mono: true, size: 14, fill: PARAM, opacity: 0 });
      host.appendChild(v); vals.push(v);
    });

    var note = txt(60, 288, 'generating one token reads every one of these bytes',
                   { small: true, opacity: 0 });
    host.appendChild(note);

    function grow(i, dur) {
      tl.to(bars[i].el, { attr: { width: bars[i].w }, duration: dur, ease: 'power2.out' });
      tl.to(vals[i], { opacity: 1, duration: 0.3 }, '-=0.25');
    }

    tl.step('Four bytes per weight is the FP32 default. 360 million weights is <b>1440 MB</b>, and nothing about the model has changed yet.');
    grow(0, 0.9);

    tl.step('BF16 halves it to 720 MB. It keeps the same exponent as FP32, so the <b>range</b> is unchanged and only precision drops.');
    grow(1, 0.7);

    tl.step('INT8 gives 360 MB. For weight-only quantization this is close to free — assume no measurable accuracy loss.');
    grow(2, 0.6);

    tl.step('And INT4 gives 191 MB. But look at the label: <b>4.25 bits</b>, not 4. Each group of 128 weights carries a scale and a zero point.');
    grow(3, 0.5);
    ctx.k.pulse(tl, bitLabels[3], { scale: 1.25 });

    tl.step('This is the number that matters on a device. Fewer bytes to read is the whole win here — how much of it shows up as a faster token is what Lesson 08 measures.');
    tl.to(note, { opacity: 1, duration: 0.4 });
    k.dim(tl, [bars[0].el, bars[1].el], { to: 0.3, position: '<' });
  });

  /* ======================================================================
     Scene 3 — the round trip on one number
     viewBox 900 x 340
     ====================================================================== */

  Scene.register('q-roundtrip', function (ctx) {
    var tl = ctx.tl, q = ctx.q;
    var host = q('#qr-plot');

    /* ---- row A: the full range, -1.75 .. 1.75, ticks every s = 0.25 ---- */
    function XA(v) { return 405 + v * 168.571; }

    add(host, txt(60, 34, 'the weight, and the levels symmetric INT4 can store', { small: true }));
    add(host, e('line', { x1: 110, y1: 76, x2: 700, y2: 76, stroke: LINE, 'stroke-width': 1.6 }));

    var gridA = S.g({ opacity: 0 });
    for (var qi = -7; qi <= 7; qi++) {
      var xt = XA(qi * 0.25);
      add(gridA, e('line', { x1: xt, y1: 69, x2: xt, y2: 83, stroke: FROZEN, 'stroke-width': 1.6 }));
    }
    host.appendChild(gridA);

    var wDot = e('circle', { cx: XA(0.55), cy: 76, r: 6, fill: PARAM, opacity: 0 });
    host.appendChild(wDot);
    var wLbl = txt(XA(0.55), 56, 'w = 0.55', { anchor: 'middle', mono: true, size: 13, fill: PARAM, opacity: 0 });
    host.appendChild(wLbl);

    /* the width of one step */
    var sBrk = S.g({ opacity: 0 });
    add(sBrk, e('line', { x1: XA(0), y1: 98, x2: XA(0.25), y2: 98, stroke: DIM, 'stroke-width': 1.4 }));
    add(sBrk, e('line', { x1: XA(0), y1: 93, x2: XA(0), y2: 103, stroke: DIM, 'stroke-width': 1.4 }));
    add(sBrk, e('line', { x1: XA(0.25), y1: 93, x2: XA(0.25), y2: 103, stroke: DIM, 'stroke-width': 1.4 }));
    add(sBrk, txt(426, 118, 's = 0.25', { anchor: 'middle', mono: true, size: 12.5 }));
    host.appendChild(sBrk);

    /* ---- the zoom ---- */
    var zoom = S.g({ opacity: 0 });
    add(zoom, e('rect', { x: XA(0.25), y: 62, width: XA(0.75) - XA(0.25), height: 28, rx: 4,
                          fill: 'none', stroke: DIM, 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
    add(zoom, e('line', { x1: XA(0.25), y1: 90, x2: 120, y2: 178, stroke: DIM,
                          'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: 0.7 }));
    add(zoom, e('line', { x1: XA(0.75), y1: 90, x2: 620, y2: 178, stroke: DIM,
                          'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: 0.7 }));
    host.appendChild(zoom);

    /* ---- row B: the zoomed grid, 0.25 .. 0.75 ---- */
    function XB(v) { return 120 + (v - 0.25) * 1000; }

    var gridB = S.g({ opacity: 0 });
    add(gridB, e('line', { x1: 120, y1: 196, x2: 620, y2: 196, stroke: LINE, 'stroke-width': 1.6 }));
    [[0.25, 'q = 1'], [0.50, 'q = 2'], [0.75, 'q = 3']].forEach(function (t) {
      var x = XB(t[0]);
      add(gridB, e('line', { x1: x, y1: 184, x2: x, y2: 208, stroke: FROZEN, 'stroke-width': 2.2 }));
      add(gridB, txt(x, 228, t[0].toFixed(2), { anchor: 'middle', mono: true, size: 12.5 }));
      add(gridB, txt(x, 246, t[1], { anchor: 'middle', small: true }));
    });
    host.appendChild(gridB);

    var mark = S.g({ opacity: 0 });
    add(mark, e('line', { x1: XB(0.55), y1: 164, x2: XB(0.55), y2: 208, stroke: PARAM, 'stroke-width': 2 }));
    add(mark, e('circle', { cx: XB(0.55), cy: 196, r: 6, fill: PARAM }));
    add(mark, txt(XB(0.55), 148, '0.55 sits at 2.2', { anchor: 'middle', mono: true, size: 12.5, fill: PARAM }));
    host.appendChild(mark);

    var rnd = S.arrow(414, 174, 378, 174, { stroke: DIM, sw: 1.6 });
    host.appendChild(rnd);
    var rndLbl = txt(396, 166, 'round', { anchor: 'middle', small: true, opacity: 0 });
    host.appendChild(rndLbl);

    var landed = e('circle', { cx: XB(0.50), cy: 196, r: 6, fill: PARAM, opacity: 0 });
    host.appendChild(landed);

    /* ---- the error ---- */
    var err = S.g({ opacity: 0 });
    add(err, e('line', { x1: XB(0.50), y1: 262, x2: XB(0.55), y2: 262, stroke: LOSS, 'stroke-width': 2 }));
    add(err, e('line', { x1: XB(0.50), y1: 255, x2: XB(0.50), y2: 262, stroke: LOSS, 'stroke-width': 2 }));
    add(err, e('line', { x1: XB(0.55), y1: 255, x2: XB(0.55), y2: 262, stroke: LOSS, 'stroke-width': 2 }));
    add(err, txt(395, 282, 'e = −0.05', { anchor: 'middle', mono: true, size: 13, fill: LOSS }));
    host.appendChild(err);

    var bound = txt(120, 308, 'the error can never exceed s / 2 = 0.125', { small: true, opacity: 0 });
    host.appendChild(bound);

    /* ---- the arithmetic panel ---- */
    var pnl = S.g({ opacity: 0 });
    add(pnl, panel(718, 44, 164, 124));
    host.appendChild(pnl);
    var l1 = txt(730, 72,  'w / s = 2.2',        { mono: true, size: 12, opacity: 0 });
    var l2 = txt(730, 96,  'q = round(2.2) = 2', { mono: true, size: 12, opacity: 0 });
    var l3 = txt(730, 120, 'ŵ = 0.25 × 2 = 0.50', { mono: true, size: 12, opacity: 0, fill: PARAM });
    var l4 = txt(730, 144, 'e = ŵ − w = −0.05',  { mono: true, size: 12, opacity: 0, fill: LOSS });
    add(host, l1, l2, l3, l4);

    /* ---- the four bits ---- */
    var bits = S.g({ opacity: 0 });
    add(bits, txt(800, 188, 'stored in 4 bits', { anchor: 'middle', small: true }));
    ['0', '0', '1', '0'].forEach(function (b, i) {
      var bx = 728 + i * 38;
      add(bits, e('rect', { x: bx, y: 196, width: 30, height: 30, rx: 5,
                            fill: SURF, stroke: PARAM, 'stroke-width': 1.4 }));
      add(bits, txt(bx + 15, 216, b, { anchor: 'middle', mono: true, size: 14, fill: PARAM }));
    });
    add(bits, txt(800, 248, 'q = 2', { anchor: 'middle', mono: true, size: 13, fill: PARAM }));
    host.appendChild(bits);

    tl.step('One weight: <b>0.55</b>. This is the only real number in the picture. Everything else is bookkeeping.');
    tl.to([wDot, wLbl], { opacity: 1, duration: 0.4 });

    tl.step('Choose a scale. Here <span class="kw">s = 0.25</span>, and the storable values are the multiples of s. The weight is not on one of them.');
    tl.to(gridA, { opacity: 1, duration: 0.5 });
    tl.to(sBrk, { opacity: 1, duration: 0.4 }, '-=0.2');

    tl.step('Zoom in on three levels and divide by the scale: 0.55 / 0.25 = <b>2.2</b>. That is where the weight sits in grid units.');
    tl.to(zoom, { opacity: 1, duration: 0.35 });
    tl.to(gridB, { opacity: 1, duration: 0.4 });
    tl.to(mark, { opacity: 1, duration: 0.4 });
    tl.to([pnl, l1], { opacity: 1, duration: 0.35 });

    tl.step('Round to the nearest whole number: <b>2</b>. This is the only lossy step in the entire method.');
    tl.to([rnd, rndLbl], { opacity: 1, duration: 0.3 });
    tl.to(landed, { opacity: 1, duration: 0.35 });
    tl.to(l2, { opacity: 1, duration: 0.3 }, '<');

    tl.step('Store the 2. Four bits hold 16 codes; symmetric quantization uses 15 of them, −7 to 7, so zero stays in the middle. This weight costs <b>4 bits</b> plus a share of one scale.');
    tl.to(bits, { opacity: 1, duration: 0.4 });

    tl.step('To read it back, multiply by the scale: 0.25 × 2 = <b>0.50</b>. The missing 0.05 is the quantization error, and it can never be more than half a step.');
    tl.to(l3, { opacity: 1, duration: 0.3 });
    tl.to([err, l4], { opacity: 1, duration: 0.4 });
    tl.to(bound, { opacity: 1, duration: 0.35 });
    ctx.k.pulse(tl, l4, { scale: 1.2 });
  });

  /* ======================================================================
     Scene 4 — granularity
     viewBox 900 x 320
     ====================================================================== */

  Scene.register('q-grain', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#qg-plot');

    add(host, txt(80, 44, 'one linear layer, 6 rows × 8 columns', { small: true }));

    var m = S.matrix(80, 70, 6, 8, { cell: 30, gap: 4, opacity: 0 });
    host.appendChild(m);

    /* one scale for everything */
    var pTensor = S.pill(372, 156, 88, 28, '1 scale', { role: 'param' });
    host.appendChild(pTensor);

    /* one scale per row */
    var rowPills = [], grpPills = [], r;
    for (r = 0; r < 6; r++) {
      var y = 70 + r * 34 + 2;
      var a = S.pill(372, y, 44, 26, 's', { role: 'param' });
      var b = S.pill(424, y, 44, 26, 's', { role: 'param' });
      host.appendChild(a); host.appendChild(b);
      rowPills.push(a); grpPills.push(b);
    }

    var divider = e('line', { x1: 214, y1: 70, x2: 214, y2: 270,
                              stroke: PARAM, 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0 });
    host.appendChild(divider);
    var head1 = txt(394, 62, '1–4', { anchor: 'middle', small: true, opacity: 0 });
    var head2 = txt(446, 62, '5–8', { anchor: 'middle', small: true, opacity: 0 });
    add(host, head1, head2);

    /* the cost panel */
    add(host, txt(520, 56, 'cost for a real 4096 × 4096 layer', { small: true }));
    var costRows = [
      ['per-tensor', '1 scale'],
      ['per-row',    '4096 scales · +0.004 bits'],
      ['group 128',  '131,072 scales · +0.25 bits'],
      ['group 32',   '524,288 scales · +1.0 bits']
    ].map(function (c, i) {
      var y = 96 + i * 32;
      var a = txt(520, y, c[0], { mono: true, size: 13, opacity: 0 });
      var b = txt(880, y, c[1], { anchor: 'end', mono: true, size: 12.5, fill: DIM, opacity: 0 });
      add(host, a, b);
      return [a, b];
    });

    add(host, txt(520, 236, 'quantization error', { small: true }));
    var meter = S.meter(520, 244, 360, 16, { value: 1, role: 'loss' });
    host.appendChild(meter);
    var caption = txt(520, 284, 'smaller group → smaller scale → smaller error', { small: true, opacity: 0 });
    host.appendChild(caption);

    tl.step('A weight matrix. Quantization needs a scale, and the only real question is how many scales you are willing to store.');
    tl.to(m, { opacity: 1, duration: 0.5 });

    tl.step('<b>Per-tensor</b>: one scale for every weight. Free in memory, and the most fragile — the single largest weight anywhere sets the step size for all of them.');
    tl.to(pTensor, { opacity: 1, duration: 0.4 });
    tl.to(costRows[0][0], { opacity: 1, duration: 0.3 }, '<');
    tl.to(costRows[0][1], { opacity: 1, duration: 0.3 }, '<');

    tl.step('<b>Per-row</b>: one scale per output row. For a 4096 × 4096 layer that is 4096 extra numbers — 4096 × 16 bits over 16.8 million weights, or 0.004 bits each — and no row can damage another.');
    tl.to(pTensor, { opacity: 0, duration: 0.3 });
    tl.to(rowPills, { opacity: 1, duration: 0.4, stagger: 0.05 });
    tl.to(costRows[1][0], { opacity: 1, duration: 0.3 }, '<');
    tl.to(costRows[1][1], { opacity: 1, duration: 0.3 }, '<');
    tl.to(meter.fill, { attr: { width: 178 }, duration: 0.6 }, '<');

    tl.step('<b>Per-group</b>: split each row again. One scale per 128 weights costs 0.25 bits per weight, and it is the standard choice for INT4.');
    tl.to([divider, head1, head2], { opacity: 1, duration: 0.35 });
    tl.to(grpPills, { opacity: 1, duration: 0.4, stagger: 0.05 });
    tl.to(costRows[2][0], { opacity: 1, duration: 0.3 }, '<');
    tl.to(costRows[2][1], { opacity: 1, duration: 0.3 }, '<');
    tl.to(meter.fill, { attr: { width: 108 }, duration: 0.6 }, '<');
    tl.to(caption, { opacity: 1, duration: 0.3 });

    tl.step('Group 32 is more accurate still, but the metadata now costs a whole extra bit per weight — and a smaller group may hit a slower kernel. Measure both.');
    tl.to(costRows[3][0], { opacity: 1, duration: 0.3 });
    tl.to(costRows[3][1], { opacity: 1, duration: 0.3 }, '<');
    tl.to(meter.fill, { attr: { width: 74 }, duration: 0.6 }, '<');
    k.pulse(tl, costRows[3][1], { scale: 1.1 });
  });

  /* ======================================================================
     Scene 5 — the outlier
     viewBox 900 x 330
     ====================================================================== */

  Scene.register('q-outlier', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#qo-plot');

    var ZERO = 160, SPAN = 110;           /* pixels from zero to the top level */
    var W = [-0.42, 0.13, 1.75, -0.08, 0.55, -1.20, 0.31, 0.02];
    var QA = [-0.50, 0.25, 1.75, 0.00, 0.50, -1.25, 0.25, 0.00];

    var fA = SPAN / 1.75, fB = SPAN / 17.5, fG = SPAN / 1.20;

    /* the 15 storable levels */
    var grid = S.g({ opacity: 0 });
    for (var gi = -7; gi <= 7; gi++) {
      var gy = ZERO - gi * (SPAN / 7);
      add(grid, e('line', { x1: 90, y1: gy, x2: 560, y2: gy, stroke: FROZEN,
                            'stroke-width': gi === 0 ? 1.6 : 1,
                            'stroke-dasharray': gi === 0 ? null : '4 5' }));
    }
    host.appendChild(grid);

    var axTop = txt(82, 54, '1.75', { anchor: 'end', mono: true, size: 12 });
    var axMid = txt(82, 164, '0', { anchor: 'end', mono: true, size: 12 });
    var axBot = txt(82, 274, '−1.75', { anchor: 'end', mono: true, size: 12 });
    add(host, axTop, axMid, axBot);

    function barGeom(v, f) {
      var y = ZERO - v * f;
      return { y: Math.min(ZERO, y), h: Math.max(1.5, Math.abs(ZERO - y)) };
    }

    var bars = [], marks = [], labels = [];
    W.forEach(function (v, i) {
      var bx = 100 + i * 56;
      var g = barGeom(v, fA);
      var b = e('rect', { x: bx, y: g.y, width: 30, height: g.h, rx: 3, fill: PARAM, opacity: 0 });
      host.appendChild(b); bars.push(b);

      var mk = e('rect', { x: bx - 2, y: ZERO - QA[i] * fA - 1.5, width: 34, height: 3, rx: 1.5,
                           fill: DATA, opacity: 0 });
      host.appendChild(mk); marks.push(mk);

      var lb = txt(bx + 15, 292, v.toFixed(2), { anchor: 'middle', mono: true, size: 10.5, opacity: 0 });
      host.appendChild(lb); labels.push(lb);
    });

    var divider = e('line', { x1: 311, y1: 45, x2: 311, y2: 275, stroke: PARAM,
                              'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0 });
    host.appendChild(divider);
    var gl1 = txt(200, 314, 'group 1 · s = 2.50', { anchor: 'middle', mono: true, size: 12, opacity: 0 });
    var gl2 = txt(430, 314, 'group 2 · s = 0.17', { anchor: 'middle', mono: true, size: 12, opacity: 0 });
    add(host, gl1, gl2);

    /* readout */
    var pnl = S.g({ opacity: 0 });
    add(pnl, panel(596, 44, 286, 150));
    host.appendChild(pnl);
    var r1 = txt(612, 78,  'absmax = 1.75',          { mono: true, size: 13, opacity: 0 });
    var r2 = txt(612, 104, 's = absmax / 7 = 0.25',  { mono: true, size: 13, opacity: 0 });
    var r3 = txt(612, 130, 'worst error = 0.12',     { mono: true, size: 13, fill: LOSS, opacity: 0 });
    var r4 = txt(612, 168, '7 of 8 weights → 0.00',  { mono: true, size: 13, fill: LOSS, opacity: 0 });
    add(host, r1, r2, r3, r4);

    tl.step('Eight weights from one group. The dashed lines are the 15 values symmetric INT4 can store.');
    tl.to(grid, { opacity: 1, duration: 0.4 });
    tl.to(bars, { opacity: 1, duration: 0.4, stagger: 0.04 });
    tl.to(labels, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('The scale comes from the largest magnitude: 1.75 / 7 = <b>0.25</b>. Every weight lands on a nearby line, and the worst error is 0.12.');
    tl.to(pnl, { opacity: 1, duration: 0.35 });
    tl.to([r1, r2, r3], { opacity: 1, duration: 0.3, stagger: 0.12 });
    tl.to(marks, { opacity: 1, duration: 0.35, stagger: 0.04 }, '-=0.3');

    tl.step('Now change one weight to <b>17.50</b>. Only that weight changes. Watch what happens to the other seven.');
    tl.call(function () {
      labels[2].textContent = '17.50';
      axTop.textContent = '17.50';
      axBot.textContent = '−17.50';
      r1.textContent = 'absmax = 17.50';
      r2.textContent = 's = absmax / 7 = 2.50';
      r3.textContent = 'worst error = 1.20';
    });
    W.forEach(function (v, i) {
      var vv = i === 2 ? 17.5 : v;
      var g = barGeom(vv, fB);
      tl.to(bars[i], { attr: { y: g.y, height: g.h }, duration: 0.8, ease: 'power2.inOut' },
            i === 0 ? undefined : '<');
      var my = i === 2 ? ZERO - SPAN - 1.5 : ZERO - 1.5;
      tl.to(marks[i], { attr: { y: my }, duration: 0.8, ease: 'power2.inOut' }, '<');
    });

    tl.step('The ruler is ten times coarser, so <b>seven of the eight weights round to exactly zero</b>. One outlier destroyed the group.');
    tl.to(r4, { opacity: 1, duration: 0.35 });
    k.pulse(tl, bars[2], { scale: 1.1 });
    tl.to(bars.filter(function (_, i) { return i !== 2; }), { fill: LOSS, duration: 0.4 }, '<');

    tl.step('The fix is granularity. Give each group of four its own scale: the outlier is trapped in group 1, and group 2 gets a scale of 0.17.');
    tl.to([divider, gl1, gl2], { opacity: 1, duration: 0.4 });
    k.dim(tl, grid, { to: 0.2, position: '<' });
    [4, 5, 6, 7].forEach(function (i) {
      var g = barGeom(W[i], fG);
      tl.to(bars[i], { attr: { y: g.y, height: g.h }, fill: PARAM, duration: 0.8, ease: 'power2.inOut' },
            i === 4 ? undefined : '<');
    });
    var QG = [0.514286, -1.20, 0.342857, 0.00];
    [4, 5, 6, 7].forEach(function (i) {
      tl.to(marks[i], { attr: { y: ZERO - QG[i - 4] * fG - 1.5 }, duration: 0.8, ease: 'power2.inOut' }, '<');
    });

    tl.step('Weights rarely look like this. <b>Activations do.</b> In a large language model a few feature dimensions carry values about twenty times larger than the rest, in every layer — which is why quantizing activations is far harder than quantizing weights.');
    k.pulse(tl, bars[2], { scale: 1.12 });
    tl.to(bars[2], { fill: LOSS, duration: 0.4 }, '<');
  });

  /* ======================================================================
     Scene 6 — QAT and the straight-through estimator
     viewBox 900 x 320
     ====================================================================== */

  Scene.register('q-ste', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#qs-plot');

    add(host, txt(60, 42, 'forward', { small: true, fill: DATA }));

    var bW    = S.box(60, 60, 120, 76, { title: 'w', sub: '0.5482', role: 'param' });
    var bQ    = S.box(240, 60, 170, 76, { title: 'fake quantize', sub: 'ŵ = 0.50' });
    var bLin  = S.box(470, 60, 140, 76, { title: 'linear', sub: 'ŵ · x', role: 'data' });
    var bLoss = S.box(670, 60, 140, 76, { title: 'loss', sub: '3.10', role: 'loss' });
    add(host, bW, bQ, bLin, bLoss);

    var a1 = S.arrow(180, 98, 240, 98, { role: 'data' });
    var a2 = S.arrow(410, 98, 470, 98, { role: 'data' });
    var a3 = S.arrow(610, 98, 670, 98, { role: 'data' });
    add(host, a1, a2, a3);

    var back = S.arrow(740, 170, 130, 170, { role: 'grad', dashed: true, sw: 2 });
    host.appendChild(back);
    var backLbl = txt(820, 166, 'gradient', { mono: true, size: 12.5, fill: GRAD, opacity: 0 });
    host.appendChild(backLbl);

    var rule1 = txt(60, 204, '∂L/∂w  :=  ∂L/∂ŵ', { mono: true, size: 13, fill: GRAD, opacity: 0 });
    var rule2 = txt(60, 226, 'identity inside the clip range, 0 outside', { small: true, opacity: 0 });
    add(host, rule1, rule2);

    /* the staircase and the line the backward pass pretends to see */
    add(host, txt(524, 190, 'round( ), and what backward pretends', { small: true }));
    add(host, e('line', { x1: 524, y1: 288, x2: 760, y2: 288, stroke: LINE, 'stroke-width': 1.4 }));
    add(host, e('line', { x1: 530, y1: 196, x2: 530, y2: 288, stroke: LINE, 'stroke-width': 1.4 }));

    var stair = e('path', {
      d: 'M530,268 H574 V248 H618 V228 H662 V208 H706',
      fill: 'none', stroke: FROZEN, 'stroke-width': 2.4,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0
    });
    host.appendChild(stair);

    var ident = e('line', { x1: 530, y1: 278, x2: 706, y2: 198, stroke: GRAD,
                            'stroke-width': 2.2, 'stroke-dasharray': '6 5', opacity: 0 });
    host.appendChild(ident);

    var lblReal = txt(524, 308, 'real slope: 0', { small: true, fill: FROZEN, opacity: 0 });
    var lblUsed = txt(880, 308, 'used in backward: 1', { anchor: 'end', small: true, fill: GRAD, opacity: 0 });
    add(host, lblReal, lblUsed);

    tl.step('In quantization-aware training the forward pass rounds <b>on purpose</b>. The weights stay in floating point; the rounding is simulated.');
    tl.to([bW, bQ], { opacity: 1, duration: 0.4, stagger: 0.15 });
    tl.to(a1, { opacity: 1, duration: 0.25 }, '-=0.2');

    tl.step('The loss is then computed from the <b>rounded</b> weights, so the model feels the damage while it can still move.');
    tl.to([a2, bLin, a3, bLoss], { opacity: 1, duration: 0.35, stagger: 0.12 });

    tl.step('Now the obstacle. <span class="kw">round()</span> is flat between its steps, so its derivative is exactly zero almost everywhere. A gradient reaching it would be multiplied by zero and vanish.');
    tl.to(stair, { opacity: 1, duration: 0.4 });
    tl.to(lblReal, { opacity: 1, duration: 0.3 }, '-=0.15');
    k.pulse(tl, stair, { scale: 1.04 });

    tl.step('The <b>straight-through estimator</b> lies about the backward pass: pretend the rounding was the identity function, a straight line of slope 1.');
    tl.to(ident, { opacity: 1, duration: 0.5 });
    tl.to(lblUsed, { opacity: 1, duration: 0.3 }, '-=0.2');
    k.dim(tl, stair, { to: 0.35, position: '<' });

    tl.step('So the gradient reaches <b>w</b> unchanged, and the weight learns to sit where rounding hurts least. In PyTorch this is one line: <span class="kw">w + (w_q - w).detach()</span>.');
    tl.to([back, backLbl], { opacity: 1, duration: 0.45 });
    tl.to([rule1, rule2], { opacity: 1, duration: 0.35 }, '-=0.2');
    tl.to(bQ.querySelector('rect'), { stroke: GRAD, 'stroke-width': 2.4, duration: 0.4 }, '<');
    k.pulse(tl, bW, { scale: 1.1 });
  });

  /* ======================================================================
     Scene 7 — what the damage looks like, benchmark by benchmark
     viewBox 900 x 330
     ====================================================================== */

  Scene.register('q-damage', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#qd-plot');

    var ZERO = 430, PPT = 36;             /* x of the baseline, pixels per point lost */
    var ROWS = [
      { name: 'FP16',   ppl: '7.32', gsm: 0.0,  hel: 0.0  },
      { name: 'Q8_0',   ppl: '7.33', gsm: 0.1,  hel: 0.0  },
      { name: 'Q5_0',   ppl: '7.43', gsm: -1.5, hel: -0.1 },
      { name: 'Q4_K_S', ppl: '—',    gsm: 0.3,  hel: -0.3 },
      { name: 'Q3_K_S', ppl: '8.96', gsm: 9.3,  hel: 0.6  }
    ];

    /* The name column is only 60..250 wide, and 'perplexity' right-aligns at
       its far end. Anything longer than this reaches under it. */
    add(host, txt(60, 34, 'five formats', { small: true }));
    add(host, txt(250, 34, 'perplexity', { anchor: 'end', small: true }));
    add(host, txt(300, 34, 'how each score moved — right is worse', { small: true }));

    /* legend */
    add(host, e('rect', { x: 620, y: 26, width: 22, height: 9, rx: 2, fill: LOSS }));
    add(host, txt(648, 34, 'GSM8K · reasoning', { small: true }));
    add(host, e('rect', { x: 772, y: 26, width: 22, height: 9, rx: 2, fill: DATA }));
    add(host, txt(800, 34, 'HellaSwag', { small: true }));

    /* the baseline itself */
    add(host, e('line', { x1: ZERO, y1: 52, x2: ZERO, y2: 296, stroke: LINE,
                          'stroke-width': 1.6 }));
    add(host, txt(ZERO, 314, '0', { anchor: 'middle', small: true }));
    add(host, txt(ZERO + 5 * PPT, 314, '5 points', { anchor: 'middle', small: true }));
    add(host, txt(ZERO + 9 * PPT, 314, '9 points', { anchor: 'middle', small: true }));

    /* the band inside which a score difference means nothing */
    var band = e('rect', { x: ZERO - 1.6 * PPT, y: 52, width: 3.2 * PPT, height: 244,
                           fill: DATA, opacity: 0 });
    host.appendChild(band);
    var bandLbl = txt(ZERO, 68, 'measurement noise', { anchor: 'middle', small: true, opacity: 0 });
    host.appendChild(bandLbl);

    var rows = ROWS.map(function (r, i) {
      var y = 88 + i * 42;
      var g = S.g({ opacity: 0 });
      add(g, txt(60, y + 16, r.name, { mono: true, size: 13 }));
      add(g, txt(250, y + 16, r.ppl, { anchor: 'end', mono: true, size: 13, fill: PARAM }));

      function bar(v, yy, colour) {
        var bw = Math.max(2, Math.abs(v) * PPT);
        add(g, e('rect', { x: v < 0 ? ZERO - bw : ZERO, y: yy, width: bw, height: 11, rx: 2,
                           fill: colour, opacity: 0.9 }));
        var lx = v < 0 ? ZERO - bw - 8 : ZERO + bw + 8;
        var sign = v > 0 ? '−' : (v < 0 ? '+' : '');
        var lb = txt(lx, yy + 10, sign + Math.abs(v).toFixed(1),
                     { anchor: v < 0 ? 'end' : 'start', mono: true, size: 11.5,
                       fill: Math.abs(v) > 1 ? colour : DIM });
        add(g, lb);
        return lb;
      }
      var gsmLbl = bar(r.gsm, y + 3, LOSS);
      bar(r.hel, y + 18, DATA);

      host.appendChild(g);
      return { g: g, lbl: gsmLbl };
    });

    var verdict = txt(60, 314, 'reasoning degrades first; common sense degrades last',
                      { small: true, fill: LOSS, opacity: 0 });
    host.appendChild(verdict);

    tl.step('Five formats of one model. Perplexity on the left; on the right, how far each benchmark score moved against the FP16 baseline. Right is worse.');
    tl.to(rows[0].g, { opacity: 1, duration: 0.45 });

    tl.step('8-bit weight-only. Perplexity moves by 0.01, GSM8K by a tenth of a point, and HellaSwag not at all. This is what <b>free</b> looks like.');
    tl.to(rows[1].g, { opacity: 1, duration: 0.4 });

    tl.step('Q5_0 scores 1.5 points <b>higher</b> on GSM8K than the FP16 model did. A quantized model cannot really be better, so that bar is the size of your measurement noise.');
    tl.to(rows[2].g, { opacity: 1, duration: 0.4 });
    tl.to(band, { opacity: 0.14, duration: 0.5 }, '-=0.1');
    tl.to(bandLbl, { opacity: 1, duration: 0.3 }, '<');
    k.pulse(tl, rows[2].lbl, { scale: 1.2 });

    tl.step('Q4_K_S is the size most people ship. Perplexity was not reported for this row; both benchmarks sit inside the noise band.');
    tl.to(rows[3].g, { opacity: 1, duration: 0.4 });

    tl.step('Now three bits. Perplexity climbs from 7.32 to <b>8.96</b> — and watch the two bars come apart.');
    tl.to(rows[4].g, { opacity: 1, duration: 0.6 });
    k.pulse(tl, rows[4].lbl, { scale: 1.25 });

    tl.step('GSM8K loses <b>9.3 points</b>. HellaSwag loses 0.6. Reasoning degrades first, recall and common sense last — and perplexity alone would never have told you which.');
    tl.to(verdict, { opacity: 1, duration: 0.4 });
    k.dim(tl, [rows[0].g, rows[1].g, rows[3].g], { to: 0.35, position: '<' });
  });

})();
