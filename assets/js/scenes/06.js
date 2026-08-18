/* =========================================================================
   Lesson 06 — Distillation: teacher to student.

   Seven scenes:
     kd-soft      one-hot label vs the teacher's full distribution, on a log axis
     kd-temp      the temperature dial: the same logits, four different lessons
     kd-step      one training step: two forwards, two losses, one backward
     kd-unstruct  half the weights zeroed, and nothing gets faster
     kd-struct    whole rows removed, the shape shrinks, the score heals
     kd-24        2:4 sparsity, and the gap between promised and measured
     kd-onpolicy  the student writes, the teacher grades its own words

   Colour convention (do not change): data = cyan (things flowing forward),
   param = amber (weights), grad = magenta (gradients), loss = red (error and
   cost), ok = green (correct, finished), frozen = grey (frozen, deleted,
   the old way).
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var e = S.e, add = S.add;

  var LINE   = 'var(--line)';
  var DIM    = 'var(--text-dim)';
  var SOFT   = 'var(--text-soft)';
  var DATA   = 'var(--c-data)';
  var PARAM  = 'var(--c-param)';
  var GRAD   = 'var(--c-grad)';
  var LOSS   = 'var(--c-loss)';
  var OK     = 'var(--c-ok)';
  var FROZEN = 'var(--c-frozen)';
  var SURF   = 'var(--surface-2)';

  /* Small text helper, same shape as the one used in Lesson 07. */
  function txt(x, y, s, o) {
    o = o || {};
    return e('text', {
      x: x, y: y, 'text-anchor': o.anchor || 'start',
      class: o.mono ? 'dg-mono' : (o.small ? 'dg-label dg-label--sm' : 'dg-label'),
      'font-size': o.size || null, fill: o.fill || null,
      opacity: o.opacity != null ? o.opacity : null
    }, s);
  }

  function panel(x, y, w, h) {
    return e('rect', { x: x, y: y, width: w, height: h, rx: 12,
                       fill: SURF, stroke: LINE, 'stroke-width': 1.5 });
  }

  /* An arc drawn as a sampled polyline — unambiguous, unlike SVG arc flags.
     Angles are in degrees, 0 = right, 90 = up, 180 = left.               */
  function arcPath(cx, cy, r, a0, a1, steps) {
    var d = '', i, a, x, y;
    for (i = 0; i <= steps; i++) {
      a = (a0 + (a1 - a0) * i / steps) * Math.PI / 180;
      x = cx + r * Math.cos(a);
      y = cy - r * Math.sin(a);
      d += (i === 0 ? 'M' : ' L') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    return d;
  }

  /* ======================================================================
     Scene 1 — kd-soft
     One label, or a whole distribution.  viewBox 900 x 320
     Left chart 64..394, right chart 520..850, baseline 250.
     ====================================================================== */

  Scene.register('kd-soft', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ds-plot');

    var BASE = 250, SCALE = 170, BW = 24, GAP = 10;
    var LX = 64, RX = 520;                       /* 10 slots span 330 px */

    /* The numbers from the lesson text: 0.93 on the 7, 0.06 on the 1,
       0.004 on the 3, 0.0005 on the 8. The rest share what is left.     */
    var TEACHER = [0.0012, 0.06, 0.0009, 0.004, 0.0006, 0.0011, 0.0014, 0.93, 0.0005, 0.0003];
    var LABEL   = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0];
    var CORRECT = 7;
    var NAMED   = [1, 3, 7, 8];

    function slot(x0, i) { return x0 + i * (BW + GAP); }

    /* A log axis over four decades: p = 1 sits at the top, p = 0.0001 at 0. */
    function logFrac(p) {
      if (p <= 0) return 0;
      var f = 1 + (Math.log(p) / Math.LN10) / 4;
      return f < 0 ? 0 : f;
    }

    /* ---- gridlines for the log axis, over the teacher chart only ---- */
    var grid = S.g({ opacity: 0 });
    [['1', 1], ['0.1', 0.75], ['0.01', 0.5], ['0.001', 0.25]].forEach(function (row) {
      var y = BASE - row[1] * SCALE;
      add(grid, e('line', { x1: 506, y1: y, x2: 864, y2: y,
                            stroke: LINE, 'stroke-width': 1, 'stroke-dasharray': '3 5' }));
      add(grid, txt(500, y + 4, row[0], { anchor: 'end', mono: true, size: 11, fill: DIM }));
    });
    add(grid, txt(500, BASE + 4, '0.0001', { anchor: 'end', mono: true, size: 11, fill: DIM }));
    host.appendChild(grid);

    /* ---- the two baselines ---- */
    add(host, e('line', { x1: 50, y1: BASE, x2: 408, y2: BASE, stroke: LINE, 'stroke-width': 1.5 }));
    add(host, e('line', { x1: 506, y1: BASE, x2: 864, y2: BASE, stroke: LINE, 'stroke-width': 1.5 }));

    /* ---- bars ---- */
    function chart(x0, values, colour) {
      var bars = [];
      values.forEach(function (v, i) {
        var h = v * SCALE;
        var r = e('rect', {
          x: slot(x0, i), y: BASE - h, width: BW, height: h, rx: 3,
          fill: i === CORRECT ? OK : colour, opacity: 0
        });
        host.appendChild(r);
        bars.push(r);
        add(host, e('line', { x1: slot(x0, i) + BW / 2, y1: BASE,
                              x2: slot(x0, i) + BW / 2, y2: BASE + 5,
                              stroke: LINE, 'stroke-width': 1 }));
        add(host, txt(slot(x0, i) + BW / 2, BASE + 21, String(i),
                      { anchor: 'middle', mono: true, size: 11, fill: DIM }));
      });
      return bars;
    }

    var labelBars   = chart(LX, LABEL, OK);
    var teacherBars = chart(RX, TEACHER, DATA);

    /* value captions on the four classes the lesson names */
    var caps = {};
    NAMED.forEach(function (i) {
      var v = TEACHER[i];
      var t = txt(slot(RX, i) + BW / 2, BASE - v * SCALE - 8,
                  v < 0.01 ? v.toFixed(4) : v.toFixed(3),
                  { anchor: 'middle', mono: true, size: 10.5,
                    fill: i === CORRECT ? OK : DATA, opacity: 0 });
      host.appendChild(t);
      caps[i] = t;
    });
    var oneCap = txt(slot(LX, CORRECT) + BW / 2, BASE - SCALE - 8, '1.00',
                     { anchor: 'middle', mono: true, size: 10.5, fill: OK, opacity: 0 });
    host.appendChild(oneCap);

    /* ---- titles and notes ---- */
    var tL = txt(LX, 34, 'the dataset label', { fill: SOFT, opacity: 0 });
    var tR = txt(RX, 34, 'the teacher\'s answer', { fill: SOFT, opacity: 0 });
    var nL = txt(LX, 294, 'one fact, and nine impossibilities', { small: true, opacity: 0 });
    var nR = txt(RX, 294, 'ten numbers, and nine of them are not zero', { small: true, opacity: 0 });
    add(host, tL, tR, nL, nR);

    /* ---- the strip where the tiny bars hide ---- */
    var hide = S.g({ opacity: 0 });
    add(hide, e('rect', { x: 506, y: 244, width: 358, height: 10, rx: 4,
                          fill: 'none', stroke: DIM, 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
    add(hide, txt(685, 226, 'eight more bars live in here', { anchor: 'middle', small: true, fill: DIM }));
    host.appendChild(hide);

    /* ---- the ratio sentence ---- */
    var ratio = txt(RX, 62, '0.060 against 0.0005 — about 120 times more likely',
                    { small: true, fill: DATA, opacity: 0 });
    host.appendChild(ratio);

    tl.step('A handwritten 7. The dataset label says one thing: class 7 is certain, and every other class is impossible.');
    tl.to([tL, nL], { opacity: 1, duration: 0.35 });
    tl.to(labelBars, { opacity: 1, duration: 0.4, stagger: 0.03 }, '<');
    tl.to(oneCap, { opacity: 1, duration: 0.3 }, '-=0.15');

    tl.step('Ask a trained teacher the same question. Almost all the mass sits in the same place, so this looks like the same fact written less tidily.');
    tl.to([tR, nR], { opacity: 1, duration: 0.35 });
    tl.to(teacherBars, { opacity: 1, duration: 0.45, stagger: 0.03 }, '<');
    tl.to([caps[7], caps[1]], { opacity: 1, duration: 0.3 }, '-=0.15');

    tl.step('It is not. <b>Eight more bars are not zero</b> — they are only too short to see while the axis is linear.');
    tl.to(hide, { opacity: 1, duration: 0.4 });
    k.pulse(tl, hide, { scale: 1.02 });

    tl.step('Redraw the same ten numbers on a <b>log axis</b>. Each gridline is ten times smaller than the one above it.');
    tl.to(hide, { opacity: 0, duration: 0.3 });
    tl.to(grid, { opacity: 1, duration: 0.4 }, '<');
    TEACHER.forEach(function (v, i) {
      var h = logFrac(v) * SCALE;
      tl.to(teacherBars[i], { attr: { y: BASE - h, height: h }, duration: 0.8, ease: 'power2.inOut' },
            i === 0 ? undefined : '<');
      if (caps[i]) {
        tl.to(caps[i], { attr: { y: BASE - h - 8 }, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, '<');
      }
    });

    tl.step('Now the teacher is readable. It says a 7 resembles a <b>1</b> about a hundred times more than it resembles an <b>8</b>. Nothing in the dataset ever says that.');
    tl.to(ratio, { opacity: 1, duration: 0.35 });
    k.dim(tl, teacherBars.filter(function (_, i) { return i !== 1 && i !== 8; }), { to: 0.28, position: '<' });
    k.pulse(tl, [teacherBars[1], teacherBars[8]], { scale: 1.12 });

    tl.step('The label chart did not move, because nine zeros look the same on every axis. That difference is <b>dark knowledge</b>, and a hard label throws all of it away.');
    tl.to(teacherBars, { opacity: 1, duration: 0.4 });
    k.pulse(tl, labelBars[CORRECT], { scale: 1.08 });
    tl.to(nL, { fill: LOSS, duration: 0.4 }, '<');
  });

  /* ======================================================================
     Scene 2 — kd-temp
     The temperature dial.  viewBox 900 x 300
     Dial centred (150, 210) r = 82; bars 350..804, baseline 232.
     ====================================================================== */

  Scene.register('kd-temp', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap, k = ctx.k;
    var host = q('#tp-plot');

    var LOGITS = [4.0, 1.2, 0.4, -0.6, -1.2, -2.0];
    var TEMPS  = [1, 2, 4, 10];
    var P = [
      [0.904, 0.055, 0.025, 0.009, 0.005, 0.002],
      [0.611, 0.151, 0.101, 0.061, 0.045, 0.030],
      [0.368, 0.183, 0.150, 0.117, 0.100, 0.082],
      [0.237, 0.179, 0.165, 0.149, 0.141, 0.130]
    ];

    var BASE = 232, SCALE = 145, BW = 54, GAP = 26, X0 = 350;
    var CX = 150, CY = 210, R = 82;

    function ang(T) { return 180 - 180 * (Math.log(T) / Math.LN10); }
    function cxOf(i) { return X0 + i * (BW + GAP) + BW / 2; }

    /* ---- the dial ---- */
    var dial = S.g({ opacity: 0 });
    add(dial, e('path', { d: arcPath(CX, CY, R, 180, 0, 48), fill: 'none',
                          stroke: 'var(--surface-3)', 'stroke-width': 7, 'stroke-linecap': 'round' }));
    var good = e('path', { d: arcPath(CX, CY, R, ang(2), ang(4), 20), fill: 'none',
                           stroke: OK, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0 });
    add(dial, good);

    TEMPS.forEach(function (T) {
      var a = ang(T) * Math.PI / 180;
      add(dial, e('line', {
        x1: CX + (R - 5) * Math.cos(a), y1: CY - (R - 5) * Math.sin(a),
        x2: CX + (R + 7) * Math.cos(a), y2: CY - (R + 7) * Math.sin(a),
        stroke: DIM, 'stroke-width': 1.8
      }));
      add(dial, txt(CX + (R + 19) * Math.cos(a), CY - (R + 19) * Math.sin(a) + 4,
                    String(T), { anchor: 'middle', mono: true, size: 11.5, fill: DIM }));
    });
    add(dial, e('line', { x1: CX - R - 4, y1: CY, x2: CX + R + 4, y2: CY,
                          stroke: LINE, 'stroke-width': 1.2 }));
    host.appendChild(dial);

    var needle = S.g({ opacity: 0 });
    add(needle, e('line', { x1: CX, y1: CY, x2: CX - (R - 12), y2: CY,
                            stroke: DATA, 'stroke-width': 3.2, 'stroke-linecap': 'round' }));
    add(needle, e('circle', { cx: CX, cy: CY, r: 6.5, fill: DATA }));
    host.appendChild(needle);
    /* svgOrigin, not transformOrigin: on an SVG element GSAP measures a px
       transformOrigin from the element's own bounding box, which would put
       the pivot outside the dial and swing the needle off the stage.
       svgOrigin is given in SVG user coordinates, which is what we want. */
    gsap.set(needle, { svgOrigin: CX + ' ' + CY });

    var tRead = txt(CX, 246, 'τ = 1', { anchor: 'middle', mono: true, size: 21, fill: DATA, opacity: 0 });
    var tSub  = txt(CX, 268, 'temperature', { anchor: 'middle', small: true, opacity: 0 });
    add(host, tRead, tSub);

    /* ---- the bars ---- */
    add(host, e('line', { x1: 330, y1: BASE, x2: 820, y2: BASE, stroke: LINE, 'stroke-width': 1.5 }));

    var bars = [], caps = [];
    LOGITS.forEach(function (z, i) {
      var h = P[0][i] * SCALE;
      var r = e('rect', {
        x: X0 + i * (BW + GAP), y: BASE - h, width: BW, height: h, rx: 4,
        fill: i === 0 ? OK : DATA, opacity: 0
      });
      host.appendChild(r); bars.push(r);

      var c = txt(cxOf(i), BASE - h - 8, P[0][i].toFixed(3),
                  { anchor: 'middle', mono: true, size: 11, fill: i === 0 ? OK : DATA, opacity: 0 });
      host.appendChild(c); caps.push(c);

      add(host, txt(cxOf(i), 252, String(i), { anchor: 'middle', mono: true, size: 11, fill: DIM }));
      add(host, txt(cxOf(i), 274, z.toFixed(1), { anchor: 'middle', mono: true, size: 11.5, fill: SOFT }));
    });
    add(host, txt(340, 252, 'class', { anchor: 'end', small: true }));
    var zHead = txt(340, 274, 'logits z', { anchor: 'end', mono: true, size: 11.5, fill: SOFT, opacity: 0 });
    add(host, zHead);

    /* Move the needle and reshape every bar for one temperature.
       `shown` tracks which row of P the captions currently display, so the
       counters always start from the number the reader can actually see.   */
    var shown = 0;
    function setT(idx, dur) {
      var T = TEMPS[idx], from = shown;
      tl.to(needle, { rotation: 180 - ang(T), duration: dur, ease: 'power2.inOut' });
      tl.call(function () { tRead.textContent = 'τ = ' + T; }, null, '<');
      P[idx].forEach(function (p, i) {
        var h = p * SCALE;
        tl.to(bars[i], { attr: { y: BASE - h, height: h }, duration: dur, ease: 'power2.inOut' }, '<');
        tl.to(caps[i], { attr: { y: BASE - h - 8 }, duration: dur, ease: 'power2.inOut' }, '<');
        k.count(tl, caps[i], P[from][i], p, { duration: dur, decimals: 3, position: '<' });
      });
      shown = idx;
    }

    tl.step('Six raw scores from the teacher. Nothing after this point will change them — only what we divide them by.');
    tl.to([zHead, dial, needle, tRead, tSub], { opacity: 1, duration: 0.4, stagger: 0.05 });

    tl.step('At <b>τ = 1</b> this is the ordinary softmax. One class takes 0.904 and the other five lie almost flat against the axis.');
    tl.call(function () {
      caps.forEach(function (c, i) { c.textContent = P[0][i].toFixed(3); });
    });
    tl.to(bars, { opacity: 1, duration: 0.4, stagger: 0.04 });
    tl.to(caps, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Turn the dial to <b>τ = 2</b>. The same scores, divided by two. The second and third choices lift off the floor.');
    setT(1, 0.9);

    tl.step('<b>τ = 4</b>. The winner is down to 0.368, and the gaps between the wrong answers are now large enough for a gradient to carry.');
    setT(2, 0.9);

    tl.step('<b>τ = 10</b> goes too far. Every class sits near 0.17 and the teacher\'s ordering has almost dissolved.');
    setT(3, 0.9);
    k.pulse(tl, bars, { scale: 1.03, stagger: 0.03 });

    tl.step('So <b>τ = 2 to 4</b> for classifiers. Higher is not better: you are trading the teacher\'s confidence for its uncertainty, and you want both.');
    setT(1, 0.8);
    tl.to(good, { opacity: 1, duration: 0.5 });
    k.pulse(tl, good, { scale: 1.04 });
  });

  /* ======================================================================
     Scene 3 — kd-step
     One training step, end to end.  viewBox 900 x 340
     ====================================================================== */

  Scene.register('kd-step', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#st-plot');

    var batch   = S.box(24, 130, 122, 74, { role: 'data',   title: 'one batch', sub: '(B, T)' });
    var teacher = S.box(190, 30, 152, 76, { role: 'frozen', title: 'teacher',   sub: 'frozen' });
    var student = S.box(190, 214, 152, 76, { role: 'param', title: 'student',   sub: 'trainable' });
    var klBox   = S.box(396, 34, 172, 76,  { role: 'loss',  title: 'KL term',   sub: 'τ² · KL(t ‖ s)' });
    var ceBox   = S.box(396, 196, 172, 76, { role: 'loss',  title: 'CE term',   sub: 'vs the label' });
    var lossBox = S.box(640, 116, 172, 76, { role: 'loss',  title: 'one number', sub: '0.439' });
    add(host, batch, teacher, student, klBox, ceBox, lossBox);

    var tNote = txt(266, 128, 'eval() · requires_grad_(False)',
                    { anchor: 'middle', small: true, fill: FROZEN, opacity: 0 });
    var sNote = txt(266, 308, 'these weights move',
                    { anchor: 'middle', small: true, fill: PARAM, opacity: 0 });
    var form  = txt(726, 106, 'α·CE + (1−α)·τ²·KL',
                    { anchor: 'middle', mono: true, size: 12.5, fill: SOFT, opacity: 0 });
    add(host, tNote, sNote, form);

    var a1 = S.arrow(148, 152, 186, 82);            /* batch -> teacher  */
    var a2 = S.arrow(148, 182, 186, 240);           /* batch -> student  */
    var a3 = S.arrow(346, 62, 392, 62, { role: 'frozen' });   /* teacher -> KL */
    var a4 = S.arrow(348, 222, 424, 116, { role: 'data' });   /* student -> KL */
    var a5 = S.arrow(346, 234, 392, 234, { role: 'data' });   /* student -> CE */
    var a6 = S.arrow(572, 82, 636, 136, { role: 'loss' });
    var a7 = S.arrow(572, 224, 636, 172, { role: 'loss' });
    add(host, a1, a2, a3, a4, a5, a6, a7);

    /* the gradient, returning along the bottom to the student only */
    var gPath = e('path', {
      d: 'M726,196 L726,316 L360,316 L360,252 L352,252',
      fill: 'none', stroke: GRAD, 'stroke-width': 2.4,
      'stroke-dasharray': '7 5', 'stroke-linecap': 'round', opacity: 0
    });
    var gHead = e('path', { d: 'M344,252 l10,-5 l0,10 z', fill: GRAD, opacity: 0 });
    add(host, gPath, gHead);

    /* the gradient that never reaches the teacher */
    var blocked = S.g({ opacity: 0 });
    add(blocked, e('line', { x1: 392, y1: 105, x2: 364, y2: 105,
                             stroke: GRAD, 'stroke-width': 2.2, 'stroke-dasharray': '5 4' }));
    add(blocked, e('path', { d: 'M358,105 l10,-5 l0,10 z', fill: GRAD }));
    add(blocked, e('line', { x1: 352, y1: 88, x2: 352, y2: 122,
                             stroke: FROZEN, 'stroke-width': 4, 'stroke-linecap': 'round' }));
    add(blocked, txt(372, 158, 'no gradient', { anchor: 'middle', small: true, fill: FROZEN }));
    host.appendChild(blocked);

    tl.step('The same batch goes into <b>two</b> models. Only one of them will learn anything from it.');
    tl.to(batch, { opacity: 1, duration: 0.4 });
    tl.to([a1, a2], { opacity: 1, duration: 0.3, stagger: 0.08 });
    tl.to([teacher, student], { opacity: 1, duration: 0.4, stagger: 0.1 });
    tl.to(sNote, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('The teacher is <b>frozen</b>. It runs in <span class="kw">eval()</span> mode inside <span class="kw">no_grad()</span>, so PyTorch never records a tape for it.');
    tl.to(tNote, { opacity: 1, duration: 0.35 });
    k.pulse(tl, teacher, { scale: 1.03 });

    tl.step('The <b>KL term</b> compares the two distributions. It grades every class at once, not only the right one.');
    tl.to([a3, a4], { opacity: 1, duration: 0.3, stagger: 0.08 });
    tl.to(klBox, { opacity: 1, duration: 0.4 });

    tl.step('The <b>cross-entropy term</b> grades one number: the probability the student put on the correct token.');
    tl.to(a5, { opacity: 1, duration: 0.3 });
    tl.to(ceBox, { opacity: 1, duration: 0.4 });

    tl.step('<b>α</b> weighs the two and they become one number. That single number is what <span class="kw">backward()</span> is called on.');
    tl.to([a6, a7], { opacity: 1, duration: 0.3, stagger: 0.08 });
    tl.to([lossBox, form], { opacity: 1, duration: 0.4 });
    k.pulse(tl, lossBox, { scale: 1.05 });

    tl.step('The gradient flows back to <b>the student only</b>. The teacher has no <span class="kw">.grad</span> to fill, and building a tape for it would be pure waste.');
    tl.to([gPath, gHead], { opacity: 1, duration: 0.3 });
    k.draw(tl, gPath, { duration: 1.1, ease: 'none' });
    tl.to(blocked, { opacity: 1, duration: 0.4 });
    k.pulse(tl, student, { scale: 1.05 });
  });

  /* ======================================================================
     Scene 4 — kd-unstruct
     Half the weights are zero, and nothing got faster.  viewBox 900 x 320
     ====================================================================== */

  Scene.register('kd-unstruct', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#up-plot');

    var ROWS = 8, COLS = 12, CS = 22, CG = 3, MX = 60, MY = 68;

    var m = S.matrix(MX, MY, ROWS, COLS, {
      cell: CS, gap: CG, fill: 'var(--c-param-dim)', stroke: PARAM, opacity: 0
    });
    host.appendChild(m);

    add(host, txt(MX, 52, 'one nn.Linear weight matrix', { small: true }));
    var mNote = txt(MX, 288, 'shape (8, 12) — before and after', { mono: true, size: 12, fill: PARAM, opacity: 0 });
    add(host, mNote);

    /* Pick half the cells, deterministically, so the picture looks scattered. */
    var seed = 42;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var order = [], r, c, i, j, tmp;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) order.push([r, c]);
    for (i = order.length - 1; i > 0; i--) {
      j = Math.floor(rnd() * (i + 1));
      tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    var zeroed = order.slice(0, (ROWS * COLS) / 2);

    var zeroCells = [], zeroTexts = [];
    zeroed.forEach(function (rc) {
      zeroCells.push(m.at(rc[0], rc[1]));
      var t = txt(MX + rc[1] * (CS + CG) + CS / 2, MY + rc[0] * (CS + CG) + CS / 2 + 4,
                  '0', { anchor: 'middle', mono: true, size: 10, fill: FROZEN, opacity: 0 });
      host.appendChild(t);
      zeroTexts.push(t);
    });

    /* ---- the measurement panel ---- */
    add(host, panel(434, 56, 436, 240));
    add(host, txt(456, 82, 'what the hardware actually does', { small: true, fill: DIM }));

    var METERS = [
      { label: 'weights set to zero', role: 'frozen', from: 0, to: 0.5, text: '0%' },
      { label: 'bytes read per token', role: 'loss', from: 1, to: 1, text: '1.00×' },
      { label: 'time per token', role: 'loss', from: 1, to: 1, text: '1.00×' },
      { label: 'file size on disk', role: 'loss', from: 1, to: 1, text: '1.00×' }
    ];
    var MW = 336, MXX = 456;
    var rowsUI = METERS.map(function (spec, n) {
      var y = 106 + n * 50;
      var g = S.g({ opacity: 0 });
      add(g, txt(MXX, y - 9, spec.label, { small: true }));
      var mt = S.meter(MXX, y, MW, 16, { value: spec.from, role: spec.role });
      add(g, mt);
      var val = txt(802, y + 13, spec.text, { mono: true, size: 12.5,
                    fill: spec.role === 'frozen' ? FROZEN : LOSS });
      add(g, val);
      host.appendChild(g);
      return { g: g, meter: mt, val: val };
    });

    tl.step('One <span class="kw">nn.Linear</span> weight matrix, and four meters: how much of it you deleted, then the three things you actually wanted — bytes read, time per token, file size. All four sit at their starting value.');
    tl.to(m, { opacity: 1, duration: 0.45 });
    tl.to(rowsUI.map(function (u) { return u.g; }), { opacity: 1, duration: 0.35, stagger: 0.08 });

    tl.step('Rank the weights by <span class="kw">|w|</span> and set the smallest half to zero. Half the numbers in the tensor are gone.');
    tl.to(zeroCells, { fill: 'var(--c-frozen-dim)', stroke: FROZEN, duration: 0.7, stagger: 0.004 });
    tl.to(zeroTexts, { opacity: 1, duration: 0.4, stagger: 0.004 }, '-=0.5');
    tl.to(rowsUI[0].meter.fill, { attr: { width: 0.5 * MW }, duration: 0.8, ease: 'power2.inOut' }, '<');
    k.count(tl, rowsUI[0].val, 0, 50, { duration: 0.8, position: '<',
      format: function (v) { return Math.round(v) + '%'; } });

    tl.step('Now watch the second meter. The tensor still has the same shape, so the memory system still <b>reads every zero</b>.');
    k.pulse(tl, rowsUI[1].g, { scale: 1.02 });
    tl.to(rowsUI[1].val, { fill: LOSS, duration: 0.3 }, '<');
    tl.to(mNote, { opacity: 1, duration: 0.35 });

    tl.step('And the third. A dense matrix multiply still multiplies by every zero, so <b>time per token does not move at all</b>.');
    k.pulse(tl, rowsUI[2].g, { scale: 1.02 });
    k.pulse(tl, rowsUI[2].val, { scale: 1.25, position: '<' });

    tl.step('The file is the same size too. A dense format has no way to write down "this one is a zero".');
    k.pulse(tl, rowsUI[3].g, { scale: 1.02 });

    tl.step('<b>Unstructured sparsity is a research metric.</b> To make real hardware faster you have to change the <b>shape</b>, not the values.');
    k.dim(tl, [m].concat(zeroTexts), { to: 0.4 });
    k.pulse(tl, [rowsUI[1].g, rowsUI[2].g, rowsUI[3].g], { scale: 1.03, stagger: 0.08 });
  });

  /* ======================================================================
     Scene 5 — kd-struct
     Whole rows removed, and the score heals.  viewBox 900 x 300
     Matrix 60..287, importance 306..426, plot 560..872.
     ====================================================================== */

  Scene.register('kd-struct', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap, k = ctx.k;
    var host = q('#sp-plot');

    var ROWS = 9, COLS = 10, CS = 20, CG = 3, MX = 60, MY = 56;
    var BX = 306, BW = 120;
    var SCORES = [0.82, 0.34, 0.91, 0.12, 0.66, 0.55, 0.19, 0.74, 0.47];
    var DROP = [3, 6, 1];                   /* the three weakest rows */

    add(host, txt(MX, 46, 'one weight matrix — 9 output rows', { small: true }));
    add(host, txt(BX, 46, 'importance,  |w| × ‖x‖', { small: true }));

    var rowsUI = [], r, c;
    for (r = 0; r < ROWS; r++) {
      var g = S.g({ opacity: 0 });
      var cells = [];
      for (c = 0; c < COLS; c++) {
        var cell = e('rect', {
          x: MX + c * (CS + CG), y: MY + r * (CS + CG), width: CS, height: CS, rx: 3,
          fill: 'var(--c-param-dim)', stroke: PARAM, 'stroke-width': 1
        });
        add(g, cell); cells.push(cell);
      }
      var cy = MY + r * (CS + CG) + CS / 2;
      var bar = e('rect', { x: BX, y: cy - 6, width: SCORES[r] * BW, height: 12, rx: 3, fill: DATA });
      add(g, bar);
      add(g, txt(BX + BW + 10, cy + 4, SCORES[r].toFixed(2), { mono: true, size: 11.5, fill: DATA }));
      host.appendChild(g);
      rowsUI.push({ g: g, bar: bar, cells: cells });
    }

    var shape = txt(MX, 276, 'shape (9, 10)', { mono: true, size: 12, fill: PARAM, opacity: 0 });
    add(host, shape);

    /* ---- the task-score plot ---- */
    var plot = S.g({ opacity: 0 });
    add(plot, S.axes(560, 60, 872, 240, { yLabel: 'task score' }));

    var Y_HI = 81, Y_LO = 178, Y_END = 93;
    add(plot, e('line', { x1: 662, y1: Y_HI, x2: 866, y2: Y_HI,
                          stroke: FROZEN, 'stroke-width': 1.2, 'stroke-dasharray': '4 5' }));
    var cut = S.g({ opacity: 0 });
    add(cut, e('line', { x1: 671, y1: 60, x2: 671, y2: 240,
                         stroke: LOSS, 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }));
    add(cut, txt(671, 52, 'the cut', { anchor: 'middle', mono: true, size: 11.5, fill: LOSS }));

    var p1 = e('path', { d: 'M578,' + Y_HI + ' L662,' + Y_HI,
                         fill: 'none', stroke: OK, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 });
    var p2 = e('path', { d: 'M662,' + Y_HI + ' L680,' + Y_LO,
                         fill: 'none', stroke: LOSS, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 });
    var p3 = e('path', { d: 'M680,' + Y_LO + ' C724,150 780,110 860,' + Y_END,
                         fill: 'none', stroke: OK, 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 });
    add(plot, p1, p2, p3);
    add(plot, cut);

    var lblParent = txt(582, 72, 'parent', { small: true, fill: FROZEN, opacity: 0 });
    var lblCut    = txt(690, 196, 'straight after the cut', { small: true, fill: LOSS, opacity: 0 });
    var lblHeal   = txt(864, 136, 'after healing', { anchor: 'end', small: true, fill: OK, opacity: 0 });
    add(plot, lblParent, lblCut, lblHeal);

    var healArrow = S.g({ opacity: 0 });
    add(healArrow, e('line', { x1: 690, y1: 250, x2: 850, y2: 250,
                               stroke: OK, 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
    add(healArrow, e('path', { d: 'M858,250 l-10,-5 l0,10 z', fill: OK }));
    add(healArrow, txt(726, 268, 'healing — the frozen parent teaches the child',
                       { anchor: 'middle', small: true, fill: OK }));
    add(plot, healArrow);
    host.appendChild(plot);

    tl.step('Score every output row of the matrix. A good score uses the activations that reach the row, not only the size of its weights.');
    tl.to(rowsUI.map(function (u) { return u.g; }), { opacity: 1, duration: 0.4, stagger: 0.05 });

    tl.step('Three rows carry almost nothing. Structured pruning deletes <b>whole rows</b>, never scattered weights.');
    DROP.forEach(function (r2, n) {
      tl.to(rowsUI[r2].cells, { stroke: LOSS, duration: 0.35 }, n === 0 ? undefined : '<');
      tl.to(rowsUI[r2].bar, { fill: LOSS, duration: 0.35 }, '<');
    });
    k.pulse(tl, DROP.map(function (r2) { return rowsUI[r2].g; }), { scale: 1.02 });

    tl.step('They are removed, and the rows below slide up. The tensor is now <span class="kw">(6, 10)</span> — a real shape change that every runtime feels.');
    tl.to(DROP.map(function (r2) { return rowsUI[r2].g; }), { opacity: 0, duration: 0.45 });
    var keep = [];
    for (r = 0; r < ROWS; r++) if (DROP.indexOf(r) === -1) keep.push(r);
    keep.forEach(function (r2, newIdx) {
      tl.to(rowsUI[r2].g, { y: (newIdx - r2) * (CS + CG), duration: 0.7, ease: 'power2.inOut' },
            newIdx === 0 ? '-=0.15' : '<');
    });
    tl.to(shape, { opacity: 1, duration: 0.3 }, '<');
    tl.call(function () { shape.textContent = 'shape (6, 10)  ·  a third of the rows gone'; });

    tl.step('The cut costs accuracy immediately. The child scores well below the parent it came from.');
    tl.to(plot, { opacity: 1, duration: 0.35 });
    tl.to([p1, lblParent], { opacity: 1, duration: 0.3 });
    k.draw(tl, p1, { duration: 0.5, ease: 'none' });
    tl.to([p2, cut], { opacity: 1, duration: 0.3 });
    k.draw(tl, p2, { duration: 0.4, ease: 'none' });
    tl.to(lblCut, { opacity: 1, duration: 0.3 });

    tl.step('Then you <b>heal</b>: keep training the child with the unpruned parent as its teacher. Minitron drops the label term completely — <span class="kw">alpha = 0</span>.');
    tl.to([p3, healArrow], { opacity: 1, duration: 0.3 });
    k.draw(tl, p3, { duration: 1.2, ease: 'none' });
    tl.to(lblHeal, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('Most of the loss comes back, and the model stays permanently smaller and faster. <b>Prune first, distil second</b> — that is the 2026 recipe.');
    k.pulse(tl, lblHeal, { scale: 1.15 });
    tl.to(shape, { fill: OK, duration: 0.4 }, '<');
  });

  /* ======================================================================
     Scene 6 — kd-24
     Two kept out of every four, and what it really buys.  viewBox 900 x 280
     Groups 40..459, bars 552..792.
     ====================================================================== */

  Scene.register('kd-24', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#nm-plot');

    var CS = 30, CG = 3, GAP = 16, GW = 4 * CS + 3 * CG;   /* 129 */
    var GX = [40, 40 + GW + GAP, 40 + 2 * (GW + GAP)];     /* 40, 185, 330 */

    var GROUPS = [
      { v: [0.41, -0.07, 0.02, -0.35], keep: [0, 3] },
      { v: [-0.12, 0.58, 0.44, 0.05],  keep: [1, 2] },
      { v: [0.09, -0.03, -0.62, 0.28], keep: [2, 3] }
    ];

    function shortNum(v) {
      var s = Math.abs(v).toFixed(2).slice(1);
      return (v < 0 ? '-' : '') + s;
    }
    function bits(n) { return (n & 2 ? '1' : '0') + (n & 1 ? '1' : '0'); }

    add(host, txt(40, 42, 'a row of weights, read in groups of four', { small: true }));

    /* ---- row 1: the dense groups ---- */
    var dense = [];
    GROUPS.forEach(function (g, gi) {
      g.v.forEach(function (v, i) {
        var x = GX[gi] + i * (CS + CG);
        var cell = S.g({ opacity: 0 });
        add(cell, e('rect', { x: x, y: 54, width: CS, height: 34, rx: 4,
                              fill: 'var(--c-param-dim)', stroke: PARAM, 'stroke-width': 1.2 }));
        add(cell, txt(x + CS / 2, 76, shortNum(v),
                      { anchor: 'middle', mono: true, size: 11, fill: PARAM }));
        host.appendChild(cell);
        dense.push({ g: cell, gi: gi, i: i, keep: g.keep.indexOf(i) !== -1 });
      });
    });

    var l2 = txt(40, 110, 'in every group of four, exactly two survive',
                 { small: true, opacity: 0 });
    add(host, l2);

    /* ---- row 2: survivors packed left, each with a 2-bit index ---- */
    var packed = S.g({ opacity: 0 });
    GROUPS.forEach(function (g, gi) {
      g.keep.forEach(function (slot, n) {
        var x = GX[gi] + n * (CS + CG);
        add(packed, e('rect', { x: x, y: 124, width: CS, height: 34, rx: 4,
                                fill: 'var(--c-param-dim)', stroke: PARAM, 'stroke-width': 1.2 }));
        add(packed, txt(x + CS / 2, 146, shortNum(g.v[slot]),
                        { anchor: 'middle', mono: true, size: 11, fill: PARAM }));
        var ix = GX[gi] + 70 + n * 29;
        add(packed, e('rect', { x: ix, y: 130, width: 26, height: 22, rx: 5,
                                fill: 'var(--c-data-dim)', stroke: DATA, 'stroke-width': 1.2 }));
        add(packed, txt(ix + 13, 145, bits(slot),
                        { anchor: 'middle', mono: true, size: 10.5, fill: DATA }));
      });
    });
    host.appendChild(packed);

    var l3 = txt(40, 182, 'each kept value carries a 2-bit index for its slot',
                 { small: true, fill: DATA, opacity: 0 });
    var l4 = txt(40, 208, 'exactly 50% sparsity, in a layout the chip can predict',
                 { small: true, fill: OK, opacity: 0 });
    add(host, l3, l4);

    /* ---- the speed-up bars ---- */
    var PX = 120;                     /* pixels per 1.00x */
    var BX0 = 552;
    add(host, txt(BX0, 38, 'measured speed-up', { small: true, fill: DIM }));

    var mark = S.g({ opacity: 0 });
    add(mark, e('line', { x1: BX0 + PX, y1: 64, x2: BX0 + PX, y2: 222,
                          stroke: LINE, 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
    add(mark, txt(BX0 + PX, 58, '1.0×', { anchor: 'middle', mono: true, size: 11, fill: DIM }));
    host.appendChild(mark);

    var BARS = [
      { y: 78,  v: 2.00, role: FROZEN, label: 'theoretical peak (the datasheet)', text: '2.00×' },
      { y: 134, v: 1.23, role: OK,     label: 'BERT-Large SQuAD, batch 16, A100', text: '1.23×' },
      { y: 190, v: 1.44, role: OK,     label: 'Llama-2-7B end to end, H800',      text: '1.40–1.44×' }
    ];
    var barUI = BARS.map(function (b) {
      var g = S.g({ opacity: 0 });
      add(g, txt(BX0, b.y - 7, b.label, { small: true }));
      add(g, e('rect', { x: BX0, y: b.y, width: b.v * PX, height: 26, rx: 5, fill: b.role }));
      add(g, txt(BX0 + b.v * PX + 10, b.y + 18, b.text, { mono: true, size: 12.5, fill: b.role }));
      host.appendChild(g);
      return g;
    });

    var note = txt(BX0, 246, 'and only when the batch or the prompt is long enough',
                   { small: true, fill: LOSS, opacity: 0 });
    add(host, note);

    tl.step('Weights sit in memory in a fixed order. Cut that order into groups of four.');
    tl.to(dense.map(function (d) { return d.g; }), { opacity: 1, duration: 0.4, stagger: 0.03 });

    tl.step('<b>2:4 sparsity</b> is a rule about shape, not about size: in every group of four, exactly two must be zero.');
    tl.to(l2, { opacity: 1, duration: 0.3 });
    tl.to(dense.filter(function (d) { return !d.keep; }).map(function (d) { return d.g; }),
          { opacity: 0.3, duration: 0.6, stagger: 0.05 });
    k.pulse(tl, dense.filter(function (d) { return d.keep; }).map(function (d) { return d.g; }),
            { scale: 1.08, stagger: 0.04 });

    tl.step('Store only the survivors, plus a <b>2-bit index</b> saying which of the four slots each one came from. Two bits is all it takes to name one of four.');
    tl.to(packed, { opacity: 1, duration: 0.5 });
    tl.to([l3, l4], { opacity: 1, duration: 0.35, stagger: 0.12 });

    tl.step('Sparse tensor cores on Ampere and later read that index and skip the rest. The datasheet promises <b>2.00×</b>.');
    tl.to(mark, { opacity: 1, duration: 0.3 });
    tl.to(barUI[0], { opacity: 1, duration: 0.45 });

    tl.step('What people measure is smaller. PyTorch\'s own tutorial gets <b>1.23×</b> on BERT-Large, and end-to-end Llama-2-7B reaches <b>1.40–1.44×</b>.');
    tl.to(barUI[1], { opacity: 1, duration: 0.4 });
    tl.to(barUI[2], { opacity: 1, duration: 0.4 }, '-=0.15');
    k.dim(tl, barUI[0], { to: 0.45 });

    tl.step('So <b>1.2× to 1.45×</b> is the honest range, and it only arrives when the batch or the prompt is long enough to pay for the sparse kernel.');
    tl.to(note, { opacity: 1, duration: 0.35 });
    k.pulse(tl, [barUI[1], barUI[2]], { scale: 1.03, stagger: 0.08 });
  });

  /* ======================================================================
     Scene 7 — kd-onpolicy
     The student writes, the teacher grades its own words.  viewBox 900 x 300
     ====================================================================== */

  Scene.register('kd-onpolicy', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#op-plot');

    var prompt  = S.box(24, 30, 132, 62, { role: 'data', title: 'prompt' });
    var student = S.box(24, 178, 132, 66, { role: 'param', title: 'student', sub: 'trainable' });
    var teacher = S.box(690, 30, 186, 66, { role: 'frozen', title: 'teacher', sub: 'frozen' });
    add(host, prompt, student, teacher);

    /* the sampled completion: four tokens the student wrote itself */
    var toks = S.tokens(204, 40, ['the', 'answer', 'is', 'six'], { w: 92, h: 42, gap: 10, role: 'ok', opacity: 0 });
    add(host, toks);
    var tLbl = txt(204, 22, 'a completion the student sampled — no gradient here',
                   { small: true, fill: OK, opacity: 0 });
    add(host, tLbl);

    var frozen = txt(204, 104, 'from this point the four tokens are fixed data',
                     { small: true, fill: FROZEN, opacity: 0 });
    add(host, frozen);

    var kl = S.box(300, 176, 300, 70, { role: 'loss', title: 'reverse KL, per token',
                                        sub: 'KL( student ‖ teacher )' });
    add(host, kl);

    var a1 = S.arrow(90, 172, 90, 100, { role: 'data' });          /* student -> up */
    var a2 = S.arrow(162, 60, 198, 60, { role: 'param' });         /* prompt -> tokens */
    var a3 = S.arrow(610, 60, 684, 60, { role: 'frozen' });        /* tokens -> teacher */
    var a4 = S.arrow(700, 100, 596, 172, { role: 'frozen' });      /* teacher -> KL */
    var a5 = S.arrow(162, 210, 294, 210, { role: 'param' });       /* student -> KL */
    add(host, a1, a2, a3, a4, a5);

    var reLbl = txt(94, 140, 'step 1: sample', { anchor: 'middle', small: true, fill: OK, opacity: 0 });
    var grLbl = txt(204, 160, 'step 2: re-run with gradient', { small: true, fill: PARAM, opacity: 0 });
    var oneLbl = txt(876, 120, 'step 3: one forward pass', { anchor: 'end', small: true, fill: FROZEN, opacity: 0 });
    add(host, reLbl, grLbl, oneLbl);

    var gPath = e('path', {
      d: 'M450,252 L450,278 L96,278 L96,250',
      fill: 'none', stroke: GRAD, 'stroke-width': 2.4,
      'stroke-dasharray': '7 5', 'stroke-linecap': 'round', opacity: 0
    });
    var gHead = e('path', { d: 'M96,244 l-5,10 l10,0 z', fill: GRAD, opacity: 0 });
    add(host, gPath, gHead);

    tl.step('The <b>student</b> writes first. Give it the prompt and let it sample a completion of its own.');
    tl.to([prompt, student], { opacity: 1, duration: 0.4, stagger: 0.1 });
    tl.to([a1, a2], { opacity: 1, duration: 0.3, stagger: 0.08 });
    tl.to(reLbl, { opacity: 1, duration: 0.3 }, '-=0.2');
    tl.to(toks, { opacity: 1, duration: 0.5 });
    tl.to(tLbl, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Sampling is not differentiable — so nothing differentiates through it. Those four tokens are now <b>fixed data</b>, exactly like a batch read from disk.');
    tl.to(frozen, { opacity: 1, duration: 0.4 });
    k.pulse(tl, toks, { scale: 1.02 });

    tl.step('Now re-run the <b>student</b> over prompt plus completion, this time with gradient, and run the <b>teacher</b> over that same fixed sequence once.');
    tl.to([a3, teacher], { opacity: 1, duration: 0.4, stagger: 0.1 });
    tl.to([oneLbl, grLbl], { opacity: 1, duration: 0.3, stagger: 0.1 });

    tl.step('Compare the two distributions at <b>every token</b>, with the student written first: reverse KL.');
    tl.to([a4, a5], { opacity: 1, duration: 0.3, stagger: 0.08 });
    tl.to(kl, { opacity: 1, duration: 0.45 });
    k.pulse(tl, kl, { scale: 1.04 });

    tl.step('The gradient goes back to the <b>student</b> only. One extra teacher forward pass is the whole added cost — far cheaper than a reinforcement-learning rollout.');
    tl.to([gPath, gHead], { opacity: 1, duration: 0.3 });
    k.draw(tl, gPath, { duration: 1.0, ease: 'none' });
    k.pulse(tl, student, { scale: 1.05 });
  });

})();
