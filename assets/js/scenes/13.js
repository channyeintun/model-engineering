/* =========================================================================
   Lesson 13 — animated figures.

   Eight scenes, in reading order:
     fd-paradox    a reply that starts before the question ends
     fd-cascade    six threads, eight queues, one side channel
     fd-bargein    one counter cancels work in three threads
     fd-waterfall  the honest phone latency budget  (the lesson's signature)
     fd-endpoint   the turn that reopened
     fd-rtf        file size does not predict speed
     fd-layers     four places to put the duplex decision
     fd-offline    the finished offline assistant

   Colour convention, everywhere: data = cyan, param = amber, grad = magenta,
   loss = red, ok = green, frozen = grey.
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var e = S.e, add = S.add;

  /* A plain labelled bar. Used in every timeline scene here. */
  function bar(x, y, w, h, opts) {
    opts = opts || {};
    var g = e('g', { opacity: opts.opacity != null ? opts.opacity : 0 });
    add(g, e('rect', {
      x: x, y: y, width: w, height: h, rx: opts.rx != null ? opts.rx : 5,
      fill: opts.fill || 'var(--surface-2)',
      stroke: opts.stroke || null,
      'stroke-width': opts.sw || null,
      'stroke-dasharray': opts.dashed ? '5 4' : null,
      'fill-opacity': opts.fillOpacity != null ? opts.fillOpacity : 1
    }));
    if (opts.text) {
      add(g, e('text', {
        x: x + w / 2, y: y + h / 2 + 4.5, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': opts.size || 12,
        fill: opts.textFill || 'var(--text)'
      }, opts.text));
    }
    return g;
  }

  function txt(x, y, s, opts) {
    opts = opts || {};
    return e('text', {
      x: x, y: y, 'text-anchor': opts.anchor || 'start',
      class: opts.mono ? 'dg-mono' : 'dg-label dg-label--sm',
      'font-size': opts.size || null,
      fill: opts.fill || null,
      opacity: opts.opacity != null ? opts.opacity : 1
    }, s);
  }

  function vline(x, y1, y2, color, opts) {
    opts = opts || {};
    return e('line', {
      x1: x, y1: y1, x2: x, y2: y2, stroke: color,
      'stroke-width': opts.sw || 2,
      'stroke-dasharray': opts.solid ? null : '5 5',
      opacity: opts.opacity != null ? opts.opacity : 0
    });
  }

  /* ======================================================================
     Scene 1 — the 200 ms paradox
     ====================================================================== */

  Scene.register('fd-paradox', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#px-plot');

    /* 1 ms = 0.35 px on this timeline */
    var A_END = 470, B_START = 540, PLAN_START = 330;

    add(host, txt(112, 73, 'A speaks', { anchor: 'end' }));
    add(host, txt(112, 115, 'B replies', { anchor: 'end' }));
    add(host, txt(112, 178, 'B is planning', { anchor: 'end' }));
    add(host, txt(112, 252, 'the machine', { anchor: 'end' }));

    var aBar = bar(120, 54, A_END - 120, 30, {
      fill: 'var(--c-data)', fillOpacity: 0.95, text: 'the question', textFill: 'var(--bg)'
    });
    var bBar = bar(B_START, 96, 260, 30, {
      fill: 'var(--c-ok)', fillOpacity: 0.95, text: 'the answer', textFill: 'var(--bg)'
    });
    add(host, aBar, bBar);

    var g1 = vline(A_END, 48, 132, 'var(--text-dim)', { sw: 1.4 });
    var g2 = vline(B_START, 48, 132, 'var(--text-dim)', { sw: 1.4 });
    var gapLbl = txt(505, 44, '200 ms', { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-ok)', opacity: 0 });
    add(host, g1, g2, gapLbl);

    var plan = bar(PLAN_START, 160, B_START - PLAN_START, 26, {
      fill: 'var(--c-param)', fillOpacity: 0.9, text: '600 ms to plan one word', textFill: 'var(--bg)', size: 11.5
    });
    add(host, plan);

    var deficit = e('g', { opacity: 0 });
    add(deficit, e('rect', {
      x: PLAN_START, y: 194, width: A_END - PLAN_START, height: 12, rx: 3,
      fill: 'var(--c-loss)', 'fill-opacity': 0.5
    }));
    add(deficit, txt(400, 224, '400 ms of planning done while A was still talking',
      { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-loss)' }));
    add(host, deficit);

    var det = bar(A_END, 234, 210, 26, {
      fill: 'var(--c-frozen)', fillOpacity: 0.35, stroke: 'var(--c-frozen)', sw: 1.4, dashed: true,
      text: 'can only start here', textFill: 'var(--text-dim)', size: 11.5
    });
    var detLbl = txt(700, 252, 'answers 400 ms late', { mono: true, size: 12, fill: 'var(--c-frozen)', opacity: 0 });
    add(host, det, detLbl);

    var scale = e('g', { opacity: 0 });
    add(scale, e('line', { x1: 120, y1: 284, x2: 470, y2: 284, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(scale, e('line', { x1: 120, y1: 279, x2: 120, y2: 289, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(scale, e('line', { x1: 470, y1: 279, x2: 470, y2: 289, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(scale, txt(295, 298, '1 second', { anchor: 'middle' }));
    host.appendChild(scale);

    tl.step('Two people, one conversation. Time runs to the right, and the bar at the bottom is one second.');
    tl.to([aBar, scale], { opacity: 1, duration: 0.4 });

    tl.step('B answers. Across ten languages the gap between them peaks at about <b>200 ms</b>, and half of all transitions are shorter than that.');
    tl.to([g1, g2], { opacity: 1, duration: 0.3 });
    tl.to(gapLbl, { opacity: 1, duration: 0.3 }, '<');
    tl.to(bBar, { opacity: 1, duration: 0.4 });

    tl.step('Now the awkward fact. Naming a single word takes a person about <b>600 ms</b>. A whole sentence takes around 1500. So the plan has to fit somewhere.');
    tl.to(plan, { opacity: 1, duration: 0.45 });

    tl.step('It only fits backwards. Four hundred milliseconds of that planning happened while A was <b>still speaking</b>. B was predicting the end of the turn, not waiting for it.');
    tl.to(deficit, { opacity: 1, duration: 0.4 });
    k.pulse(tl, deficit, { scale: 1.03 });

    tl.step('A machine that waits for silence starts here instead. Same 600 ms of work, begun 400 ms later, so it answers 400 ms late. That gap is exactly the head start it never took.');
    tl.to(det, { opacity: 1, duration: 0.4 });
    tl.to(detLbl, { opacity: 1, duration: 0.3 }, '<');
    k.dim(tl, [plan, deficit], { to: 0.35, position: '<' });

    tl.step('So conversation is a <b>prediction</b> system, not a detection system. Everything else in this lesson is a response to that one sentence.');
    k.pulse(tl, [aBar, bBar], { scale: 1.02 });
  });

  /* ======================================================================
     Scene 2 — six threads, eight queues
     ====================================================================== */

  Scene.register('fd-cascade', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#cs-plot');

    var R1 = 64, R2 = 176, BH = 52, PY1 = R1 + 13, PY2 = R2 + 13;

    /* --- row 1 --- */
    var qIn   = S.pill(14, PY1, 72, 26, 'audio in', { role: 'data' });
    var aIn   = S.arrow(86, R1 + 26, 102, R1 + 26, { role: 'data' });
    var bVad  = S.box(102, R1, 100, BH, { title: 'detector', role: 'param' });
    var a1    = S.arrow(202, R1 + 26, 218, R1 + 26, { role: 'data' });
    var qSeg  = S.pill(218, PY1, 80, 26, 'segments', { role: 'data' });
    var a2    = S.arrow(298, R1 + 26, 314, R1 + 26, { role: 'data' });
    var bStt  = S.box(314, R1, 100, BH, { title: 'recognise', role: 'param' });
    var a3    = S.arrow(414, R1 + 26, 430, R1 + 26, { role: 'data' });
    var qTxt  = S.pill(430, PY1, 72, 26, 'text', { role: 'data' });
    var a4    = S.arrow(502, R1 + 26, 518, R1 + 26, { role: 'data' });
    var bNot  = S.box(518, R1, 140, BH, { title: 'notifier', note: 'emits protocol events' });
    var a5    = S.arrow(658, R1 + 26, 674, R1 + 26, { role: 'data' });
    var qPro  = S.pill(674, PY1, 86, 26, 'prompt', { role: 'data' });
    add(host, qIn, aIn, bVad, a1, qSeg, a2, bStt, a3, qTxt, a4, bNot, a5, qPro);

    /* --- the wrap --- */
    var wrap = e('g', { opacity: 0 });
    add(wrap, e('path', {
      d: 'M760,90 L812,90 L812,150 L84,150 L84,202',
      fill: 'none', stroke: 'var(--c-data)', 'stroke-width': 1.6
    }));
    add(wrap, e('path', { d: 'M102,202 l-9,-4.5 l0,9 z', fill: 'var(--c-data)' }));
    host.appendChild(wrap);

    /* --- row 2 --- */
    var bLm   = S.box(102, R2, 100, BH, { title: 'language', role: 'param' });
    var a6    = S.arrow(202, R2 + 26, 218, R2 + 26, { role: 'data' });
    var qRep  = S.pill(218, PY2, 80, 26, 'reply', { role: 'data' });
    var a7    = S.arrow(298, R2 + 26, 314, R2 + 26, { role: 'data' });
    var bOrd  = S.box(314, R2, 140, BH, { title: 'output order', note: 'one queue, no overtaking' });
    var a8    = S.arrow(454, R2 + 26, 470, R2 + 26, { role: 'data' });
    var qOrd  = S.pill(470, PY2, 80, 26, 'ordered', { role: 'data' });
    var a9    = S.arrow(550, R2 + 26, 566, R2 + 26, { role: 'data' });
    var bTts  = S.box(566, R2, 100, BH, { title: 'speak', role: 'param' });
    var a10   = S.arrow(666, R2 + 26, 682, R2 + 26, { role: 'ok' });
    var qOut  = S.pill(682, PY2, 78, 26, 'audio out', { role: 'ok' });
    add(host, bLm, a6, qRep, a7, bOrd, a8, qOrd, a9, bTts, a10, qOut);

    /* --- the side channel --- */
    var side = e('g', { opacity: 0 });
    add(side, e('path', {
      d: 'M152,116 L152,274 M364,116 L364,274 M440,228 L440,274 M152,274 L536,274 M624,274 L754,274',
      fill: 'none', stroke: 'var(--c-grad)', 'stroke-width': 1.5, 'stroke-dasharray': '5 5'
    }));
    add(side, e('path', { d: 'M764,274 l-9,-4.5 l0,9 z', fill: 'var(--c-grad)' }));
    add(side, txt(390, 266, 'protocol events, straight to the client',
      { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--c-grad)' }));
    /* the eighth queue: the text-output side channel, drawn as a pill so it can be counted */
    add(side, S.pill(540, 261, 84, 26, 'text out', { role: 'grad', opacity: 1 }));
    host.appendChild(side);
    var client = S.box(770, 250, 110, 48, { title: 'client', role: 'ok' });
    host.appendChild(client);

    var tally = txt(880, 40, '6 threads · 8 queues',
      { anchor: 'end', mono: true, size: 13, fill: 'var(--c-param)', opacity: 0 });
    var stopLbl = txt(20, 40, 'each box: one thread, one stop flag',
      { mono: true, size: 12, fill: 'var(--text-dim)', opacity: 0 });
    add(host, tally, stopLbl);

    tl.step('Audio arrives at sixteen thousand samples a second whether you are ready or not. So each stage is a <b>thread</b>, and between two threads sits a <b>queue</b>.');
    tl.to(stopLbl, { opacity: 1, duration: 0.3 });
    tl.to([qIn, aIn, bVad], { opacity: 1, duration: 0.35, stagger: 0.12 });

    tl.step('The detector cuts the stream into segments. The recogniser drains that queue and fills the next one with text. Neither waits for the other to finish.');
    tl.to([a1, qSeg, a2, bStt], { opacity: 1, duration: 0.3, stagger: 0.1 });

    tl.step('Here is the first stage nobody predicts. A <b>notifier</b> emits protocol events, so the client can be told what is happening before any answer exists.');
    tl.to([a3, qTxt, a4, bNot], { opacity: 1, duration: 0.3, stagger: 0.1 });

    tl.step('The prompt goes to the language model, which is where most people stop drawing.');
    tl.to([a5, qPro], { opacity: 1, duration: 0.3, stagger: 0.1 });
    tl.to(wrap, { opacity: 1, duration: 0.35 });
    tl.to([bLm, a6, qRep], { opacity: 1, duration: 0.3, stagger: 0.1 });

    tl.step('And here is the second. An <b>output processor</b> puts text parts, tool calls and synthesis inputs on one queue, so a later part cannot overtake an earlier one. Skip it and the user hears the sentence out of order.');
    tl.to([a7, bOrd, a8, qOrd], { opacity: 1, duration: 0.3, stagger: 0.1 });
    tl.to([a9, bTts, a10, qOut], { opacity: 1, duration: 0.3, stagger: 0.1 });

    tl.step('One dashed path is left, and the <b>text out</b> queue on it is the eighth. Protocol events bypass the audio path entirely, which is how the client learns you started speaking before a single word has been transcribed.');
    tl.to([side, client], { opacity: 1, duration: 0.4 });
    tl.to(tally, { opacity: 1, duration: 0.35 });
    k.pulse(tl, tally, { scale: 1.12 });
  });

  /* ======================================================================
     Scene 3 — interruption is bookkeeping
     ====================================================================== */

  Scene.register('fd-bargein', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#bi-plot');

    /* 1 ms = 1 px on this timeline: the two marks below are 50 px and 50 ms apart */
    add(host, txt(142, 72, 'model', { anchor: 'end' }));
    add(host, txt(142, 118, 'you', { anchor: 'end' }));

    var speak = bar(150, 54, 320, 28, { fill: 'var(--c-ok)', fillOpacity: 0.95, text: 'the model is speaking', textFill: 'var(--bg)' });
    var buf   = bar(470, 54, 400, 28, { fill: 'var(--c-loss)', fillOpacity: 0.85 });
    var you   = bar(420, 100, 280, 28, { fill: 'var(--c-data)', fillOpacity: 0.95, text: 'you start talking', textFill: 'var(--bg)' });
    add(host, speak, buf, you);

    var mark1 = vline(420, 46, 136, 'var(--c-data)');
    var mark2 = vline(470, 46, 136, 'var(--c-ok)');
    var lbl1  = txt(420, 40, 'you start speaking', { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-data)', opacity: 0 });
    var lbl2  = txt(470, 152, 'cancel decided in 50 ms', { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-ok)', opacity: 0 });
    var bufLbl = txt(670, 74, '400 ms already handed to the speaker',
      { anchor: 'middle', mono: true, size: 12, fill: 'var(--bg)', opacity: 0 });
    add(host, mark1, mark2, lbl1, lbl2, bufLbl);

    var title2 = txt(56, 186, 'the same interruption, seen inside the graph', { size: 13, opacity: 0 });
    host.appendChild(title2);

    var wAsr = S.box(90, 202, 130, 58, { title: 'recognise', sub: 'gen 7', role: 'param' });
    var wLm  = S.box(270, 202, 130, 58, { title: 'language', sub: 'gen 7', role: 'param' });
    var wTts = S.box(450, 202, 130, 58, { title: 'speak', sub: 'gen 7', role: 'param' });
    add(host, wAsr, wLm, wTts);

    var ctr = e('g', { opacity: 0 });
    add(ctr, e('rect', {
      x: 650, y: 202, width: 190, height: 58, rx: 10,
      fill: 'var(--c-grad-dim)', stroke: 'var(--c-grad)', 'stroke-width': 1.5
    }));
    add(ctr, e('text', { x: 745, y: 228, 'text-anchor': 'middle', class: 'dg-title' }, 'generation'));
    var ctrN = e('text', {
      x: 745, y: 252, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 17, fill: 'var(--c-grad)'
    }, '7');
    add(ctr, ctrN);
    host.appendChild(ctr);

    var stale = e('g', { opacity: 0 });
    [155, 335, 515].forEach(function (cx) {
      add(stale, e('line', { x1: cx - 22, y1: 209, x2: cx + 22, y2: 253, stroke: 'var(--c-loss)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
      add(stale, e('line', { x1: cx + 22, y1: 209, x2: cx - 22, y2: 253, stroke: 'var(--c-loss)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    });
    add(stale, txt(335, 288, 'stale, and dropped wherever it happened to be sitting',
      { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-loss)' }));
    host.appendChild(stale);

    tl.step('The model is halfway through an answer. Its audio is leaving the speaker right now.');
    tl.to(speak, { opacity: 1, duration: 0.4 });

    tl.step('You talk over it. Nothing below works unless the microphone stayed <b>open</b> while the speaker was playing.');
    tl.to(you, { opacity: 1, duration: 0.4 });
    tl.to([mark1, lbl1], { opacity: 1, duration: 0.3 }, '<');

    tl.step('Fifty milliseconds later the system decides to stop. But stopping generation is not stopping <b>sound</b>: with a 400 ms buffer, the user still hears 450 ms of a cancelled answer.');
    tl.to([mark2, lbl2], { opacity: 1, duration: 0.3 });
    tl.to([buf, bufLbl], { opacity: 1, duration: 0.35 }, '-=0.1');
    k.pulse(tl, buf, { scale: 1.08 });

    tl.step('Now look inside. Three threads are each holding work, and every item is stamped with the generation it belongs to. Right now that is seven.');
    tl.to(title2, { opacity: 1, duration: 0.3 });
    tl.to([wAsr, wLm, wTts, ctr], { opacity: 1, duration: 0.35, stagger: 0.1 });
    k.dim(tl, [speak, buf, you, mark1, mark2, lbl1, lbl2, bufLbl], { to: 0.28, position: '<' });

    tl.step('Interruption increments the counter. Nothing is chased down and nothing is timed out. Every item stamped seven is simply stale now, and each thread drops it at the top of its own loop.');
    k.count(tl, ctrN, 7, 8, { duration: 0.4 });
    k.pulse(tl, ctr, { scale: 1.1, position: '<' });
    tl.to(stale, { opacity: 1, duration: 0.4 });

    tl.step('That is the whole cancellation mechanism: <b>one integer</b>. No races, no half-cancelled state. What it does not do is stop the sound — that still needs an explicit flush.');
    k.dim(tl, [wAsr, wLm, wTts], { to: 0.3 });
    tl.to([buf, bufLbl], { opacity: 1, duration: 0.35 }, '<');
    k.pulse(tl, buf, { scale: 1.1 });
  });

  /* ======================================================================
     Scene 4 — the latency waterfall, on a phone
     ====================================================================== */

  Scene.register('fd-waterfall', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#fw-plot');

    var X0 = 170, MS = 0.4;
    function X(ms) { return X0 + ms * MS; }

    var rows = [
      { n: 'capture and framing', ms: 32 },
      { n: 'silence detection', ms: 64 },
      { n: 'turn decision', ms: 40 },
      { n: 'recognition finalise', ms: 150 },
      { n: 'first token', ms: 300 },
      { n: 'decode first clause', ms: 400 },
      { n: 'first audio chunk', ms: 200 },
      { n: 'playback buffer', ms: 60 }
    ];
    var TOP = 70, PITCH = 25, H = 19;

    /* reference lines: the architectural floor, and the course target */
    var floor = vline(X(500), 56, 300, 'var(--c-frozen)', { sw: 1.6 });
    var floorLbl = txt(X(500), 48, 'L0 floor 500 ms · server class',
      { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-frozen)', opacity: 0 });
    var target = vline(X(1500), 56, 300, 'var(--c-ok)', { sw: 1.6 });
    var targetLbl = txt(X(1500), 48, 'target 1.5 s',
      { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-ok)', opacity: 0 });
    add(host, floor, floorLbl, target, targetLbl);

    /* axis */
    var axis = e('g', { opacity: 0 });
    add(axis, e('line', { x1: X0, y1: 300, x2: 800, y2: 300, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    [0, 500, 1000, 1500].forEach(function (t) {
      add(axis, e('line', { x1: X(t), y1: 300, x2: X(t), y2: 306, stroke: 'var(--line)', 'stroke-width': 1.5 }));
      add(axis, txt(X(t), 320, String(t), { anchor: 'middle' }));
    });
    add(axis, txt(X0, 334, 'milliseconds after your last word'));
    host.appendChild(axis);

    var acc = 0, bars = [], names = [], totals = [], starts = [];
    rows.forEach(function (r, i) {
      var y = TOP + i * PITCH;
      starts.push(acc);
      acc += r.ms;

      var b = e('rect', {
        x: X(starts[i]), y: y, width: 0, height: H, rx: 4,
        fill: 'var(--c-loss)', 'fill-opacity': 0.75
      });
      host.appendChild(b); bars.push(b);
      var nm = txt(162, y + 14, r.n, { anchor: 'end', opacity: 0 });
      host.appendChild(nm); names.push(nm);
      var tt = txt(884, y + 14, '', { anchor: 'end', mono: true, size: 12.5, fill: 'var(--c-loss)', opacity: 0 });
      host.appendChild(tt); totals.push(tt);
    });

    /* the commit hold runs alongside everything after the silence decision */
    var HY = TOP + 8 * PITCH;
    var holdName = txt(162, HY + 14, 'commit hold, parallel', { anchor: 'end', opacity: 0 });
    var hold = e('rect', {
      x: X(96), y: HY, width: 800 * MS, height: H, rx: 4,
      fill: 'var(--c-ok)', 'fill-opacity': 0.45, opacity: 0
    });
    var holdLbl = txt(884, HY + 14, 'ends at 896 ms',
      { anchor: 'end', mono: true, size: 12.5, fill: 'var(--c-ok)', opacity: 0 });
    add(host, hold, holdName, holdLbl);

    function draw(i) {
      var from = starts[i], to = starts[i] + rows[i].ms;
      tl.to(names[i], { opacity: 1, duration: 0.22 });
      tl.to(totals[i], { opacity: 1, duration: 0.22 }, '<');
      tl.to(bars[i], { attr: { width: rows[i].ms * MS }, duration: 0.45, ease: 'power2.out' }, '<');
      k.count(tl, totals[i], from, to, {
        duration: 0.45, position: '<',
        format: function (v) { return Math.round(v) + ' ms'; }
      });
    }

    tl.step('The clock starts at your <b>last audio sample</b>. Two lines are drawn before anything else: the architectural floor for this kind of system, and the target this course asks you to hit.');
    tl.to(axis, { opacity: 1, duration: 0.4 });
    tl.to([floor, floorLbl, target, targetLbl], { opacity: 1, duration: 0.35 });

    tl.step('The first three rows are <b>policy</b>, not computation. Framing, then 64 ms to be sure the silence is real, then a small classifier judging whether you actually finished.');
    draw(0); draw(1); draw(2);

    tl.step('Only now does the expensive work start. The recogniser flushes its transcript, and the language model reads the prompt and produces one token.');
    draw(3); draw(4);

    tl.step('It has to keep decoding until there is a whole clause to say. Then synthesis produces its first chunk, and the player holds a little audio back so nothing stutters.');
    draw(5); draw(6); draw(7);

    tl.step('Twelve hundred and forty-six milliseconds — past the 500 ms floor, inside the 1.5 second target. Notice that no row here is the model being slow.');
    tl.to(totals[7], { attr: { 'font-size': 16 }, duration: 0.3 });
    k.pulse(tl, totals[7], { scale: 1.2 });

    tl.step('And the 800 ms commit hold? It starts when the silence is detected and runs <b>alongside</b> all of this, finishing at 896. On this phone it is free. On a server whose pipeline finishes in 300 ms, that same hold would be the entire latency.');
    tl.to([hold, holdName, holdLbl], { opacity: 1, duration: 0.4 });
    k.dim(tl, bars, { to: 0.4, position: '<' });
  });

  /* ======================================================================
     Scene 5 — the turn that reopened
     ====================================================================== */

  Scene.register('fd-endpoint', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ep-plot');

    /* 1 ms = 0.16 px */
    var words = [
      { x: 150, w: 48, t: 'my' },
      { x: 203, w: 80, t: 'number' },
      { x: 288, w: 32, t: 'is' },
      { x: 324, w: 64, t: 'four' },
      { x: 476, w: 56, t: 'two' },
      { x: 537, w: 80, t: 'seven' }
    ];
    var CLOSE1 = 399, DELAY_END = 495, RESUME = 476, CLOSE2 = 627, COMMIT = 755;

    add(host, txt(142, 76, 'audio', { anchor: 'end' }));
    add(host, txt(142, 128, 'detector', { anchor: 'end' }));
    add(host, txt(142, 167, 'classifier', { anchor: 'end' }));
    add(host, txt(142, 211, 'revision 1', { anchor: 'end' }));
    add(host, txt(142, 239, 'revision 2', { anchor: 'end' }));

    var wordEls = words.map(function (w) {
      var g = bar(w.x, 56, w.w, 32, { fill: 'var(--c-data)', fillOpacity: 0.95, text: w.t, textFill: 'var(--bg)', size: 11.5 });
      host.appendChild(g);
      return g;
    });
    var pauseLbl = txt(432, 78, '550 ms pause', { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--text-dim)', opacity: 0 });
    host.appendChild(pauseLbl);

    var det1 = bar(150, 112, 238, 22, { fill: 'var(--c-data)', fillOpacity: 0.45 });
    var det2 = bar(476, 112, 141, 22, { fill: 'var(--c-data)', fillOpacity: 0.45 });
    var c1 = vline(CLOSE1, 50, 140, 'var(--c-data)');
    var c1l = txt(CLOSE1, 44, 'silence 64 ms', { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--c-data)', opacity: 0 });
    var c2 = vline(CLOSE2, 50, 140, 'var(--c-data)');
    var c2l = txt(CLOSE2, 44, 'silence 64 ms', { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--c-data)', opacity: 0 });
    add(host, det1, det2, c1, c1l, c2, c2l);

    var wait = bar(CLOSE1, 150, DELAY_END - CLOSE1, 24, {
      fill: 'var(--c-param)', fillOpacity: 0.9
    });
    /* Only 505..619 is free here — the 'complete' pill starts at CLOSE2 = 627 —
       so the duration goes above the stall bar it belongs to instead. */
    var waitLbl = txt(505, 167, 'incomplete',
      { mono: true, size: 11.5, fill: 'var(--c-param)', opacity: 0 });
    var waitMs = txt((CLOSE1 + DELAY_END) / 2, 144, '600 ms',
      { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--c-param)', opacity: 0 });
    var done = S.pill(CLOSE2, 150, 92, 24, 'complete', { role: 'ok' });
    add(host, wait, waitLbl, waitMs, done);

    var resume = vline(RESUME, 100, 200, 'var(--c-ok)', { sw: 1.6 });
    var resumeLbl = txt(476, 104, 'speech resumes, inside the window',
      { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--c-ok)', opacity: 0 });
    add(host, resume, resumeLbl);

    var rev1 = bar(150, 196, RESUME - 150, 22, {
      fill: 'var(--c-frozen)', fillOpacity: 0.3, stroke: 'var(--c-frozen)', sw: 1.3, dashed: true,
      text: 'discarded before anyone heard it', textFill: 'var(--text-dim)', size: 11
    });
    var rev2 = bar(150, 224, CLOSE2 - 150, 22, {
      fill: 'var(--c-ok)', fillOpacity: 0.9, text: 'the whole turn, re-emitted', textFill: 'var(--bg)', size: 11
    });
    add(host, rev1, rev2);

    var commit = vline(COMMIT, 190, 252, 'var(--c-ok)', { sw: 1.6 });
    var commitLbl = txt(COMMIT, 266, 'output commits after the 800 ms hold',
      { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--c-ok)', opacity: 0 });
    add(host, commit, commitLbl);

    var scale = e('g', { opacity: 0 });
    add(scale, e('line', { x1: 150, y1: 284, x2: 310, y2: 284, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(scale, txt(230, 296, '1 second', { anchor: 'middle' }));
    host.appendChild(scale);

    tl.step('Somebody is reading out a number and stops in the middle to remember the rest. The pause is 550 milliseconds long.');
    tl.to(wordEls.slice(0, 4), { opacity: 1, duration: 0.3, stagger: 0.1 });
    tl.to([pauseLbl, scale], { opacity: 1, duration: 0.3 });

    tl.step('The <b>detector</b> knows nothing about words. It sees speech, then quiet, and after 64 milliseconds it closes the segment. That is all it is for.');
    tl.to(det1, { opacity: 1, duration: 0.3 });
    tl.to([c1, c1l], { opacity: 1, duration: 0.3 });

    tl.step('The <b>classifier</b> reads the waveform of that segment and says: not finished. So the system deliberately stalls 600 milliseconds before spending any compute on it.');
    tl.to(wait, { opacity: 1, duration: 0.35 });
    tl.to([waitLbl, waitMs], { opacity: 1, duration: 0.3 }, '<');

    tl.step('Speech resumes inside that window. The turn <b>reopens as a new revision</b>: the work already in flight is thrown away, and the accumulated audio is re-emitted as one turn.');
    tl.to([resume, resumeLbl], { opacity: 1, duration: 0.3 });
    tl.to(rev1, { opacity: 1, duration: 0.3 });
    tl.to(rev2, { opacity: 1, duration: 0.35 });
    tl.to(wordEls.slice(4), { opacity: 1, duration: 0.3, stagger: 0.12 }, '<');

    tl.step('Second silence, same 64 milliseconds. This time the classifier says complete, so the work starts at once and the output commits after the hold.');
    tl.to(det2, { opacity: 1, duration: 0.3 });
    tl.to([c2, c2l], { opacity: 1, duration: 0.3 });
    tl.to(done, { opacity: 1, duration: 0.3 });
    tl.to([commit, commitLbl], { opacity: 1, duration: 0.35 });

    tl.step('That classifier is right about 92.63% of the time, which is one turn in thirteen wrong. The reopen window is not defensive coding. It is what makes being wrong survivable.');
    k.pulse(tl, [rev1, rev2], { scale: 1.02 });
  });

  /* ======================================================================
     Scene 6 — file size does not predict speed
     ====================================================================== */

  Scene.register('fd-rtf', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#rt-plot');

    var Y0 = 78, PITCH = 30;
    function Y(i) { return Y0 + i * PITCH; }

    var left = [
      { t: 'Piper int8 · 22 MB', to: 3, bad: false },
      { t: 'Kitten Nano fp16 · 23 MB', to: 4, bad: false },
      { t: 'Piper fp16 · 38 MB', to: 2, bad: false },
      { t: 'Piper fp32 · 75 MB', to: 0, bad: false },
      { t: 'Matcha fp32 · 122 MB', to: 1, bad: false },
      { t: 'Kokoro int8 · 128 MB', to: 6, bad: true },
      { t: 'Kokoro fp32 · 330 MB', to: 5, bad: true }
    ];
    var right = [
      { t: 'Piper fp32 · 0.114', bad: false },
      { t: 'Matcha fp32 · 0.118', bad: false },
      { t: 'Piper fp16 · 0.123', bad: false },
      { t: 'Piper int8 · 0.320', bad: false },
      { t: 'Kitten Nano fp16 · 0.389', bad: false },
      { t: 'Kokoro fp32 · 1.128', bad: true },
      { t: 'Kokoro int8 · 1.972', bad: true }
    ];

    var hL = txt(330, 52, 'ranked by file size, smallest first', { anchor: 'end', size: 12.5, opacity: 0 });
    var hR = txt(570, 52, 'ranked by real-time factor, fastest first', { size: 12.5, opacity: 0 });
    add(host, hL, hR);

    var lEls = left.map(function (r, i) {
      var t = txt(330, Y(i), r.t, {
        anchor: 'end', mono: true, size: 12.5,
        fill: r.bad ? 'var(--c-loss)' : 'var(--c-param)', opacity: 0
      });
      host.appendChild(t); return t;
    });
    var rEls = right.map(function (r, i) {
      var t = txt(570, Y(i), r.t, {
        mono: true, size: 12.5,
        fill: r.bad ? 'var(--c-loss)' : 'var(--c-ok)', opacity: 0
      });
      host.appendChild(t); return t;
    });

    var lines = left.map(function (r, i) {
      var ln = e('line', {
        x1: 342, y1: Y(i) - 4, x2: 558, y2: Y(r.to) - 4,
        stroke: r.bad ? 'var(--c-loss)' : 'var(--line)',
        'stroke-width': r.bad ? 2.2 : 1.4, opacity: 0
      });
      host.appendChild(ln); return ln;
    });

    var rtLine = e('line', {
      x1: 560, y1: 213, x2: 880, y2: 213,
      stroke: 'var(--c-loss)', 'stroke-width': 1.6, 'stroke-dasharray': '6 5', opacity: 0
    });
    /* Below the line rather than above it, and short enough to stay right of
       where the two slowest rows end at x = 707. */
    var rtLbl = txt(880, 228, 'slower than real time',
      { anchor: 'end', mono: true, size: 11.5, fill: 'var(--c-loss)', opacity: 0 });
    add(host, rtLine, rtLbl);

    var foot = txt(450, 300, 'one CPU thread, one MacBook Pro, one runtime — every row measured the same way',
      { anchor: 'middle', size: 12, fill: 'var(--text-dim)', opacity: 0 });
    host.appendChild(foot);

    tl.step('Seven text-to-speech builds, ranked by the number you can read off a download page: file size. Smallest at the top.');
    tl.to(hL, { opacity: 1, duration: 0.3 });
    tl.to(lEls, { opacity: 1, duration: 0.3, stagger: 0.08 });

    tl.step('Now the same seven, ranked by <b>real-time factor</b> on a single CPU thread. Lower is better, and 1.0 means exactly real time.');
    tl.to(hR, { opacity: 1, duration: 0.3 });
    tl.to(rEls, { opacity: 1, duration: 0.3, stagger: 0.08 });

    tl.step('Join them up. The order does not survive. The smallest file is fourth fastest, and the fastest model is the fourth largest.');
    tl.to(lines, { opacity: 1, duration: 0.4, stagger: 0.06 });

    tl.step('Draw the line at 1.0 and both Kokoro rows fall below it. At 82 million parameters Kokoro is the <b>largest</b> model here, and the only one that cannot keep up on one core.');
    tl.to([rtLine, rtLbl], { opacity: 1, duration: 0.35 });
    k.dim(tl, lines.filter(function (_, i) { return !left[i].bad; }), { to: 0.25, position: '<' });
    k.pulse(tl, [lEls[5], lEls[6], rEls[5], rEls[6]], { scale: 1.05 });

    tl.step('And look at the two Kokoro rows against each other. The int8 build is 2.6 times smaller on disk and <b>1.75 times slower</b>. Quantization buys bytes. It buys milliseconds only when the kernels exist.');
    tl.to(foot, { opacity: 1, duration: 0.35 });
  });

  /* ======================================================================
     Scene 7 — four places to put the duplex decision
     ====================================================================== */

  Scene.register('fd-layers', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ly-plot');

    var PW = 196, XS = [26, 246, 466, 686];
    var titles = ['L0 · module level', 'L1 · hidden state', 'L2 · token level', 'L3 · shared latent'];
    var egs = [
      ['FireRedChat, FlexDuo,', 'X-Talk, SoulX-Duplug'],
      ['MinMo,', 'Freeze-Omni'],
      ['Moshi, OmniFlatten,', 'SyncLLM, Mini-Omni2'],
      ['—', 'nothing published yet']
    ];

    var panels = XS.map(function (x, i) {
      var g = e('g', { opacity: 0 });
      add(g, e('rect', {
        x: x, y: 64, width: PW, height: 200, rx: 12,
        fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.5
      }));
      add(g, txt(x + PW / 2, 52, titles[i], { anchor: 'middle', mono: true, size: 12.5 }));
      add(g, e('rect', {
        x: x + 26, y: 158, width: 144, height: 64, rx: 9,
        fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4
      }));
      add(g, e('text', {
        x: x + PW / 2, y: 182, 'text-anchor': 'middle', class: 'dg-title'
      }, 'the model'));
      add(g, txt(x + PW / 2, 240, egs[i][0], { anchor: 'middle', size: 11.5, fill: 'var(--text-dim)' }));
      add(g, txt(x + PW / 2, 254, egs[i][1], { anchor: 'middle', size: 11.5, fill: 'var(--text-dim)' }));
      host.appendChild(g);
      return g;
    });

    /* L0 — the decision sits outside, above */
    var d0 = e('g', { opacity: 0 });
    add(d0, e('rect', {
      x: XS[0] + 40, y: 88, width: 116, height: 34, rx: 8,
      fill: 'var(--c-param-dim)', stroke: 'var(--c-param)', 'stroke-width': 1.5
    }));
    add(d0, txt(XS[0] + 98, 109, 'scheduler', { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-param)' }));
    host.appendChild(d0);
    var a0 = S.arrow(XS[0] + 98, 124, XS[0] + 98, 156, { role: 'param' });
    var n0 = txt(XS[0] + 98, 284, 'what you are building', { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-ok)', opacity: 0 });
    add(host, a0, n0);

    /* L1 — a head reads the hidden state */
    var d1 = e('g', { opacity: 0 });
    add(d1, e('rect', {
      x: XS[1] + 40, y: 88, width: 116, height: 34, rx: 8,
      fill: 'var(--c-grad-dim)', stroke: 'var(--c-grad)', 'stroke-width': 1.5
    }));
    add(d1, txt(XS[1] + 98, 109, 'state head', { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-grad)' }));
    host.appendChild(d1);
    var a1 = S.arrow(XS[1] + 98, 156, XS[1] + 98, 126, { role: 'grad' });
    var n1 = txt(XS[1] + 98, 284, 'a head is one added output layer',
      { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--text-dim)', opacity: 0 });
    add(host, a1, n1);

    /* L2 — the decision is in the token row */
    var d2 = e('g', { opacity: 0 });
    [0, 1, 2, 3, 4].forEach(function (j) {
      add(d2, e('rect', {
        x: XS[2] + 35 + j * 26, y: 192, width: 22, height: 18, rx: 3,
        fill: j === 2 ? 'var(--c-grad)' : 'var(--surface-3)',
        stroke: 'var(--line)', 'stroke-width': 1
      }));
    });
    add(d2, txt(XS[2] + 98, 226, 'in the tokens', { anchor: 'middle', mono: true, size: 11.5, fill: 'var(--c-grad)' }));
    host.appendChild(d2);

    /* L3 — nothing */
    var d3 = e('g', { opacity: 0 });
    add(d3, e('rect', {
      x: XS[3] + 40, y: 190, width: 116, height: 24, rx: 8,
      fill: 'none', stroke: 'var(--c-frozen)', 'stroke-width': 1.5, 'stroke-dasharray': '5 5'
    }));
    add(d3, txt(XS[3] + 98, 207, 'shared latent', { anchor: 'middle', mono: true, size: 11, fill: 'var(--c-frozen)' }));
    host.appendChild(d3);

    var floorLbl = txt(450, 306, 'L0 has a structural floor near 500 ms — and that assumes a server-class forward pass',
      { anchor: 'middle', mono: true, size: 12, fill: 'var(--c-loss)', opacity: 0 });
    host.appendChild(floorLbl);

    tl.step('One question sorts every voice agent you will ever meet: <b>where does the duplex decision live?</b> There are four possible answers and only three of them exist.');
    tl.to(panels, { opacity: 1, duration: 0.35, stagger: 0.1 });

    tl.step('<b>Outside the model.</b> A scheduler watches the audio and tells the model when to start and stop. The model itself has no idea a conversation is happening.');
    tl.to([d0, a0], { opacity: 1, duration: 0.35, stagger: 0.1 });
    tl.to(n0, { opacity: 1, duration: 0.3 });
    k.dim(tl, [panels[1], panels[2], panels[3]], { to: 0.35, position: '<' });

    tl.step('<b>On its hidden state.</b> A <b>head</b> here means one added output layer, not an attention head. It reads the last hidden layer and predicts the conversational state. Freeze-Omni froze a seven billion parameter model and trained only this layer, on sixty thousand dialogues.');
    tl.to(panels[1], { opacity: 1, duration: 0.3 });
    tl.to([d1, a1, n1], { opacity: 1, duration: 0.35, stagger: 0.1 });
    k.dim(tl, [panels[0], d0, a0, n0], { to: 0.35, position: '<' });

    tl.step('<b>Inside the token sequence.</b> There is no scheduler and no head, because taking a turn is just another thing the model predicts. This is Moshi.');
    tl.to(panels[2], { opacity: 1, duration: 0.3 });
    tl.to(d2, { opacity: 1, duration: 0.35 });
    k.dim(tl, [panels[1], d1, a1, n1], { to: 0.35, position: '<' });

    tl.step('<b>A shared latent across both streams.</b> The survey names this layer and then leaves it empty. Nobody has published one.');
    tl.to(panels[3], { opacity: 1, duration: 0.3 });
    tl.to(d3, { opacity: 1, duration: 0.35 });
    k.dim(tl, [panels[2], d2], { to: 0.35, position: '<' });

    tl.step('Yours is the first column, and it has a floor. Roughly 500 milliseconds, <b>assuming a server-class forward pass</b>. A phone lands above it. Aim at the manners instead.');
    tl.to([panels[0], d0, a0, n0], { opacity: 1, duration: 0.35 });
    tl.to(floorLbl, { opacity: 1, duration: 0.35 });
  });

  /* ======================================================================
     Scene 8 — the finished offline assistant
     ====================================================================== */

  Scene.register('fd-offline', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#of-plot');

    var deviceLbl = txt(56, 44, 'one device · aeroplane mode on', { size: 13, opacity: 0 });
    var device = e('rect', { x: 44, y: 56, width: 660, height: 194, rx: 18,
                             fill: 'none', stroke: 'var(--line)', 'stroke-width': 2, opacity: 0 });
    add(host, deviceLbl, device);

    var mic  = S.box(58, 88, 110, 58, { title: 'microphone', sub: '16 kHz', role: 'data' });
    var vad  = S.box(194, 88, 110, 58, { title: 'detector', sub: '2.3 MB', role: 'param' });
    var turn = S.box(330, 88, 130, 58, { title: 'turn model', sub: '8.7 MB', role: 'param' });
    var asr  = S.box(486, 88, 140, 58, { title: 'streaming ASR', sub: '68 MB', role: 'param' });
    var lm   = S.box(58, 168, 180, 58, { title: 'language model', sub: '191 MB', role: 'param' });
    var tts  = S.box(264, 168, 140, 58, { title: 'Piper voice', sub: '75 MB', role: 'param' });
    var spk  = S.box(430, 168, 110, 58, { title: 'speaker', sub: '24 kHz', role: 'ok' });
    add(host, mic, vad, turn, asr, lm, tts, spk);

    var r1 = [S.arrow(168, 117, 194, 117, { role: 'data' }),
              S.arrow(304, 117, 330, 117, { role: 'data' }),
              S.arrow(460, 117, 486, 117, { role: 'data' })];
    var r2 = [S.arrow(238, 197, 264, 197, { role: 'data' }),
              S.arrow(404, 197, 430, 197, { role: 'data' }),
              S.arrow(540, 197, 600, 197, { role: 'ok' })];
    r1.concat(r2).forEach(function (a) { host.appendChild(a); });
    var outLbl = txt(610, 201, 'audio out', { mono: true, size: 12, fill: 'var(--c-ok)', opacity: 0 });
    host.appendChild(outLbl);

    var wrap = e('g', { opacity: 0 });
    add(wrap, e('path', { d: 'M556,146 L556,157 L148,157 L148,162',
                          fill: 'none', stroke: 'var(--c-data)', 'stroke-width': 1.6 }));
    add(wrap, e('path', { d: 'M148,168 l-4.5,-9 l9,0 z', fill: 'var(--c-data)' }));
    host.appendChild(wrap);

    var cloud = S.box(750, 112, 120, 76, { title: 'server', role: 'frozen' });
    var link = S.arrow(708, 150, 746, 150, { dashed: true });
    var cross = e('g', { opacity: 0 });
    add(cross, e('line', { x1: 752, y1: 116, x2: 868, y2: 184, stroke: 'var(--c-loss)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    add(cross, e('line', { x1: 868, y1: 116, x2: 752, y2: 184, stroke: 'var(--c-loss)', 'stroke-width': 3, 'stroke-linecap': 'round' }));
    add(host, cloud, link, cross);

    var budget = txt(56, 276, 'median voice-to-voice under 1.5 s, offline',
      { mono: true, size: 12.5, fill: 'var(--c-ok)', opacity: 0 });
    var size = txt(700, 276, '345 MB on disk · ~2 GB resident',
      { anchor: 'end', mono: true, size: 12.5, fill: 'var(--c-param)', opacity: 0 });
    add(host, budget, size);

    tl.step('Everything from Part Five, inside one box. Audio comes in on the left and leaves on the right, and nothing in between touches a network.');
    tl.to([deviceLbl, device], { opacity: 1, duration: 0.4 });
    tl.to(mic, { opacity: 1, duration: 0.35 });

    tl.step('Two tiny models decide <b>when</b> to act. The detector gates the pipeline so nothing expensive runs on silence, and the turn model judges whether you actually finished. Eleven megabytes for both.');
    tl.to([r1[0], vad, r1[1], turn], { opacity: 1, duration: 0.3, stagger: 0.12 });

    tl.step('The recogniser streams partial text while you speak, and the brain is the checkpoint you fine-tuned in Lesson 05, quantized in Lesson 07 and exported in Lesson 09.');
    tl.to([r1[2], asr], { opacity: 1, duration: 0.3, stagger: 0.12 });
    tl.to(wrap, { opacity: 1, duration: 0.3 });
    tl.to(lm, { opacity: 1, duration: 0.35 });

    tl.step('The voice speaks the first clause while the model is still writing the second — and it is Piper, not Kokoro, because on one core Kokoro cannot keep up.');
    tl.to([r2[0], tts, r2[1], spk, r2[2], outLbl], { opacity: 1, duration: 0.3, stagger: 0.1 });
    tl.to(size, { opacity: 1, duration: 0.35 });

    tl.step('And the arrow to the server is gone. No round trip, no cost per minute, no audio leaving the room. It answers about a second later than the cloud, and it never talks over you. That is the trade, and you should say it out loud.');
    tl.to([cloud, link], { opacity: 1, duration: 0.35 });
    tl.to(cross, { opacity: 1, duration: 0.35 });
    tl.to(budget, { opacity: 1, duration: 0.35 }, '<');
    k.dim(tl, [cloud, link], { to: 0.35, position: '<' });
  });

})();
