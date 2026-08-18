/* =========================================================================
   Lesson 11 — Tiny speech recognition. Seven scenes:
     asr-frontend  waveform -> windows -> FFT bins -> mel bands -> picture
     asr-melscale  equal steps in mel are unequal steps in Hz
     asr-ctc       the collapse rule, and what the blank is for
     asr-align     many frame paths, one word, one summed loss
     asr-transducer  the lattice: blank goes right, a token goes down
     asr-stream    Whisper's fixed 30 s box vs chunks with look-ahead
     asr-wer       one substitution, one deletion, one insertion
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;
  var e = S.e, add = S.add;

  /* A plain labelled cell, used by several scenes below. */
  function cell(x, y, w, h, text, opts) {
    opts = opts || {};
    var col = opts.role ? 'var(--c-' + opts.role + ')' : 'var(--line)';
    var bg = opts.role ? 'var(--c-' + opts.role + '-dim)' : 'var(--surface-2)';
    var g = e('g', { opacity: opts.opacity != null ? opts.opacity : 0 });
    var r = e('rect', {
      x: x, y: y, width: w, height: h, rx: 7,
      fill: opts.hollow ? 'none' : bg, stroke: col,
      'stroke-width': opts.sw || 1.5,
      'stroke-dasharray': opts.dashed ? '5 4' : null
    });
    add(g, r);
    var t = null;
    if (text) {
      t = e('text', {
        x: x + w / 2, y: y + h / 2 + 6, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': opts.size || 16,
        fill: opts.role ? 'var(--c-' + opts.role + ')' : 'var(--text)'
      }, text);
      add(g, t);
    }
    g.rect = r; g.txt = t;
    g.cx = x + w / 2; g.cy = y + h / 2;
    return g;
  }

  function small(x, y, text, opts) {
    opts = opts || {};
    return e('text', {
      x: x, y: y, 'text-anchor': opts.anchor || 'start',
      class: opts.mono ? 'dg-mono' : 'dg-label dg-label--sm',
      'font-size': opts.size || null,
      fill: opts.role ? 'var(--c-' + opts.role + ')' : (opts.fill || null),
      opacity: opts.opacity != null ? opts.opacity : 1
    }, text);
  }

  /* ======================================================================
     Scene 1 — the front end: waveform to spectrogram
     viewBox 900 x 320
     ====================================================================== */

  Scene.register('asr-frontend', function (ctx) {
    var tl = ctx.tl, q = ctx.q, gsap = ctx.gsap, k = ctx.k;
    var host = q('#fe-plot');

    /* ---- the waveform, x 60..540, centred on y = 80 ------------------- */
    var X0 = 60, X1 = 540, MID = 80, N = 260;
    function frac(n) { return n - Math.floor(n); }
    var d = '';
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var x = X0 + t * (X1 - X0);
      var amp;
      if (t < 0.20) amp = 2;
      else if (t < 0.62) amp = 28 * Math.sin(Math.PI * (t - 0.20) / 0.42);
      else if (t < 0.70) amp = 1.5;
      else amp = 13;
      var v;
      if (t >= 0.70) v = frac(Math.sin(i * 91.7) * 43758.5453) * 2 - 1;
      else v = Math.sin(t * Math.PI * 22) * 0.8 + Math.sin(t * Math.PI * 66) * 0.2;
      var y = MID + amp * v;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    var wave = e('path', {
      d: d, fill: 'none', stroke: 'var(--c-data)', 'stroke-width': 1.6,
      'stroke-linejoin': 'round', opacity: 0
    });
    add(host, wave);
    add(host, small(60, 30, '16,000 numbers per second'));
    var counter = small(540, 30, 'frame 1 / 8', { anchor: 'end', mono: true, size: 13 });
    counter.setAttribute('opacity', 0);
    add(host, counter);

    /* the sliding 25 ms window — a marker, so deliberately no role colour */
    var win = e('rect', {
      x: 60, y: 44, width: 120, height: 76, rx: 6,
      fill: 'none', stroke: 'var(--text-soft)', 'stroke-width': 2.2, opacity: 0
    });
    add(host, win);

    /* ---- the spectrogram grid, 10 rows x 8 columns -------------------- */
    var E = [
      [0.05, 0.05, 0.05, 0.05, 0.08, 0.10, 0.75, 0.80],
      [0.05, 0.05, 0.08, 0.08, 0.10, 0.12, 0.80, 0.85],
      [0.05, 0.06, 0.10, 0.12, 0.12, 0.15, 0.70, 0.72],
      [0.06, 0.08, 0.18, 0.20, 0.18, 0.12, 0.55, 0.58],
      [0.06, 0.08, 0.30, 0.32, 0.28, 0.10, 0.40, 0.42],
      [0.07, 0.10, 0.45, 0.50, 0.45, 0.10, 0.30, 0.30],
      [0.08, 0.12, 0.62, 0.68, 0.60, 0.12, 0.22, 0.22],
      [0.08, 0.14, 0.78, 0.82, 0.75, 0.12, 0.18, 0.18],
      [0.09, 0.16, 0.88, 0.92, 0.86, 0.14, 0.15, 0.15],
      [0.10, 0.18, 0.80, 0.84, 0.78, 0.14, 0.12, 0.12]
    ];
    var grid = [], cols = [];
    for (var r = 0; r < 10; r++) {
      grid[r] = [];
      for (var c = 0; c < 8; c++) {
        var cr = e('rect', {
          x: 98 + 48 * c, y: 158 + r * 14, width: 44, height: 12, rx: 2,
          fill: 'var(--c-data)', opacity: 0
        });
        cr.__lvl = E[r][c];
        add(host, cr);
        grid[r][c] = cr;
        if (!cols[c]) cols[c] = [];
        cols[c].push(cr);
      }
    }
    function lvlOf(i, t) { return t.__lvl; }
    add(host, small(92, 168, 'mel 79', { anchor: 'end' }));
    add(host, small(92, 292, 'mel 0', { anchor: 'end' }));
    add(host, small(470, 312, 'time →', { anchor: 'end' }));

    /* ---- the "one window" workshop on the right ----------------------- */
    var shop = e('g', { opacity: 0 });
    add(shop, small(712, 30, 'one window → one column', { anchor: 'middle' }));
    add(host, shop);

    var bins = [], binG = e('g', { opacity: 0 });
    for (var b = 0; b < 24; b++) {
      var lvl = 0.10 + 0.78 * Math.pow(b / 23, 1.6);
      if (b % 3 !== 0) lvl *= 0.55;
      var br = e('rect', {
        x: 628, y: 40 + b * 9, width: 48, height: 8, rx: 1.5,
        fill: 'var(--text-soft)', opacity: 0
      });
      br.__lvl = Math.max(0.08, Math.min(0.95, lvl));
      add(binG, br); bins.push(br);
    }
    add(binG, small(652, 272, '201 FFT bins', { anchor: 'middle' }));
    add(host, binG);

    var melCells = [], melG = e('g', { opacity: 0 });
    for (var m = 0; m < 10; m++) {
      var mr = e('rect', {
        x: 730, y: 40 + m * 21.5, width: 66, height: 20, rx: 2.5,
        fill: 'var(--c-data)', opacity: 0
      });
      mr.__lvl = E[m][3];
      add(melG, mr); melCells.push(mr);
    }
    add(melG, small(763, 272, '80 mel bands', { anchor: 'middle' }));
    add(melG, small(712, 296, 'triangle filters, then log', { anchor: 'middle' }));
    add(host, melG);

    var toMel = S.arrow(684, 145, 722, 145, { role: 'data' });
    add(host, toMel);

    /* ---- annotations for the last step -------------------------------- */
    var noteA = e('g', { opacity: 0 });
    add(noteA, e('rect', { x: 194, y: 214, width: 148, height: 84, rx: 4,
                           fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 1.8 }));
    add(noteA, small(268, 312, 'a vowel: energy low down', { anchor: 'middle', role: 'ok' }));
    add(host, noteA);

    var noteB = e('g', { opacity: 0 });
    add(noteB, e('rect', { x: 386, y: 154, width: 92, height: 60, rx: 4,
                           fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 1.8 }));
    add(noteB, small(432, 148, 'an /s/: high, no stripes', { anchor: 'middle', role: 'ok' }));
    add(host, noteB);

    /* ---- steps -------------------------------------------------------- */
    tl.step('Sound arrives as one number per sample. At 16 kHz that is 16,000 numbers every second, and nothing in them looks like a letter yet.');
    tl.to(wave, { opacity: 1, duration: 0.01 });
    k.draw(tl, wave, { duration: 1.2, ease: 'none' });

    tl.step('Cut it into <b>25 ms windows</b> that move only <b>10 ms</b> at a time. The windows overlap, so no sound falls between two of them.');
    tl.to([win, counter], { opacity: 1, duration: 0.35 });
    [1, 2, 3].forEach(function (c) {
      tl.to(win, { x: 48 * c, duration: 0.35, ease: 'power1.inOut' });
      tl.call(function () { counter.textContent = 'frame ' + (c + 1) + ' / 8'; }, null, '<');
    });

    tl.step('One window is 400 samples. An FFT turns it into <b>201 numbers</b>, one for each band of 40 Hz.');
    tl.to([shop, binG], { opacity: 1, duration: 0.35 });
    tl.to(bins, { opacity: lvlOf, duration: 0.3, stagger: 0.012 });

    tl.step('80 triangular mel filters squash those 201 bins into <b>80</b>, and a logarithm compresses the loudness. That is the column.');
    tl.to([toMel, melG], { opacity: 1, duration: 0.35 });
    tl.to(melCells, { opacity: lvlOf, duration: 0.3, stagger: 0.03 });
    tl.to(cols[3], { opacity: lvlOf, duration: 0.35 }, '-=0.2');

    tl.step('Do that for every window and stand the columns side by side. 100 columns per second, and sound has become a picture.');
    tl.to(win, { x: 0, duration: 0.25 });
    for (var col = 0; col < 8; col++) {
      (function (cc) {
        tl.to(win, { x: 48 * cc, duration: 0.22, ease: 'none' });
        tl.call(function () { counter.textContent = 'frame ' + (cc + 1) + ' / 8'; }, null, '<');
        tl.to(cols[cc], { opacity: lvlOf, duration: 0.22 }, '<');
      })(col);
    }

    tl.step('And it is readable. Strong energy in the low bands is a vowel. A bright block at the top with no stripes is an <span class="kw">/s/</span>.');
    tl.to([noteA, noteB], { opacity: 1, duration: 0.4, stagger: 0.2 });
    k.dim(tl, [binG, melG, toMel, shop], { to: 0.3, position: '<' });
  });

  /* ======================================================================
     Scene 2 — the mel scale
     viewBox 900 x 290
     ====================================================================== */

  Scene.register('asr-melscale', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ms-plot');

    var X0 = 60, X1 = 840, W = X1 - X0, FMAX = 8000, NB = 20;
    var HZY = 130, MELY = 207;

    function hz2mel(f) { return 2595 * Math.log(1 + f / 700) / Math.LN10; }
    function mel2hz(m) { return 700 * (Math.pow(10, m / 2595) - 1); }
    var MMAX = hz2mel(FMAX);

    var xh = [], xm = [];
    for (var i = 0; i <= NB; i++) {
      var mel = i * MMAX / NB;
      var f = mel2hz(mel);
      xh.push(X0 + (f / FMAX) * W);
      xm.push(X0 + (i / NB) * W);
    }

    /* axes */
    add(host, e('line', { x1: X0, y1: HZY, x2: X1, y2: HZY, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, e('line', { x1: X0, y1: MELY, x2: X1, y2: MELY, stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(host, small(852, HZY + 4, 'Hz'));
    add(host, small(852, MELY + 5, 'mel'));

    /* Hz scale numbers */
    var hzNums = e('g', { opacity: 0 });
    [[0, '0'], [2000, '2k'], [4000, '4k'], [6000, '6k'], [8000, '8k']].forEach(function (p) {
      add(hzNums, small(X0 + (p[0] / FMAX) * W, 46, p[1], { anchor: 'middle', mono: true, size: 12 }));
    });
    add(host, hzNums);

    /* mel ticks */
    var melTicks = [];
    var melG = e('g', { opacity: 0 });
    for (var j = 0; j <= NB; j++) {
      var mt = e('rect', { x: xm[j] - 1.2, y: MELY, width: 2.4, height: 11, fill: 'var(--c-data)' });
      add(melG, mt); melTicks.push(mt);
    }
    add(host, melG);

    /* connectors mel -> Hz */
    var links = [];
    for (var c = 0; c <= NB; c++) {
      var ln = e('line', {
        x1: xm[c], y1: MELY - 2, x2: xh[c], y2: HZY + 11,
        stroke: 'var(--text-soft)', 'stroke-width': 1.1, opacity: 0
      });
      add(host, ln); links.push(ln);
    }

    /* Hz ticks */
    var hzTicks = [];
    for (var h = 0; h <= NB; h++) {
      var ht = e('rect', { x: xh[h] - 1.2, y: HZY, width: 2.4, height: 10, fill: 'var(--c-data)', opacity: 0 });
      add(host, ht); hzTicks.push(ht);
    }

    /* triangular filters */
    var tris = [];
    for (var t = 1; t < NB; t++) {
      var tp = e('path', {
        d: 'M' + xh[t - 1].toFixed(1) + ',' + HZY + ' L' + xh[t].toFixed(1) + ',66 L' + xh[t + 1].toFixed(1) + ',' + HZY,
        fill: 'none', stroke: 'var(--c-data)', 'stroke-width': 1.4, opacity: 0
      });
      add(host, tp); tris.push(tp);
    }

    add(host, small(60, 244, 'equal steps in mel …'));
    var right = small(840, 244, '… are very unequal steps in Hz', { anchor: 'end' });
    right.setAttribute('opacity', 0);
    add(host, right);
    var readout = small(450, 272, 'about 43 of the 80 filter centres lie below 2 kHz',
                        { anchor: 'middle', mono: true, size: 13, role: 'ok' });
    readout.setAttribute('opacity', 0);
    add(host, readout);

    tl.step('The ear is not linear in frequency. 100 Hz to 200 Hz is a huge change; 4000 Hz to 4100 Hz is almost nothing. The <b>mel</b> axis is built so equal distances sound equally different.');
    tl.to(melG, { opacity: 1, duration: 0.4 });

    tl.step('Place the 80 filter centres at <b>equal distance along the mel axis</b>. On this axis they are perfectly even.');
    k.pulse(tl, melTicks, { scale: 1.6, stagger: 0.015 });

    tl.step('Now map every centre back to real frequency. The even spacing collapses at the left and stretches at the right.');
    tl.to(links, { opacity: 0.5, duration: 0.5, stagger: 0.02 });
    tl.to(hzTicks, { opacity: 1, duration: 0.3, stagger: 0.02 }, '-=0.4');
    tl.to(hzNums, { opacity: 1, duration: 0.3 }, '<');
    tl.to(right, { opacity: 1, duration: 0.35 });

    tl.step('Each centre becomes a triangular filter. Narrow and crowded low down, wide and few up high — exactly where the ear cares less.');
    tl.to(tris, { opacity: 0.75, duration: 0.35, stagger: 0.03 });

    tl.step('So 201 FFT bins become 80 numbers, and those 80 numbers spend their resolution where speech actually lives.');
    tl.to(readout, { opacity: 1, duration: 0.4 });
    k.dim(tl, links, { to: 0.2, position: '<' });
  });

  /* ======================================================================
     Scene 3 — CTC collapse
     viewBox 900 x 300
     ====================================================================== */

  Scene.register('asr-ctc', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ct-plot');

    var W = 60, H = 44, PITCH = 68, LEFT = 112;
    var frames = ['h', 'h', 'ε', 'e', 'ε', 'l', 'l', 'ε', 'l', 'o'];

    add(host, small(LEFT, 54, 'one symbol per frame · ε = blank'));
    var row1 = [];
    frames.forEach(function (s, i) {
      var g = cell(LEFT + i * PITCH, 66, W, H, s, { role: s === 'ε' ? 'frozen' : 'data' });
      add(host, g); row1.push(g);
    });

    /* merge brackets over frames 0-1 and 5-6 */
    function bracket(i0, i1) {
      var x = LEFT + i0 * PITCH - 5;
      var w = (i1 - i0) * PITCH + W + 10;
      var g = e('g', { opacity: 0 });
      add(g, e('rect', { x: x, y: 61, width: w, height: 54, rx: 9,
                         fill: 'none', stroke: 'var(--c-ok)', 'stroke-width': 2 }));
      add(host, g);
      return g;
    }
    var brA = bracket(0, 1), brB = bracket(5, 6);

    var lbl2 = small(LEFT, 138, 'rule 1 · merge identical neighbours');
    lbl2.setAttribute('opacity', 0);
    add(host, lbl2);
    var row2X = [146, 248, 316, 384, 486, 588, 656, 724];
    var row2S = ['h', 'ε', 'e', 'ε', 'l', 'ε', 'l', 'o'];
    var row2 = [];
    row2S.forEach(function (s, i) {
      var g = cell(row2X[i], 150, W, H, s, { role: s === 'ε' ? 'frozen' : 'data' });
      add(host, g); row2.push(g);
    });

    var lbl3 = small(LEFT, 222, 'rule 2 · delete every ε');
    lbl3.setAttribute('opacity', 0);
    add(host, lbl3);
    var row3X = [146, 316, 486, 656, 724];
    var row3S = ['h', 'e', 'l', 'l', 'o'];
    var row3 = [];
    row3S.forEach(function (s, i) {
      var g = cell(row3X[i], 234, W, H, s, { role: 'ok' });
      add(host, g); row3.push(g);
    });

    /* the "helo" alternative, same row, hidden */
    var altX = [146, 316, 486, 596, 706];
    var altS = ['h', 'e', 'l', '', 'o'];
    var alt = [];
    altS.forEach(function (s, i) {
      var g = cell(altX[i], 234, W, H, s, i === 3
        ? { role: 'loss', dashed: true, hollow: true }
        : { role: 'ok' });
      add(host, g); alt.push(g);
    });
    var altNote = small(626, 292, 'a letter is gone', { anchor: 'middle', role: 'loss', mono: true, size: 12 });
    altNote.setAttribute('opacity', 0);
    add(host, altNote);

    tl.step('The model emits one symbol per frame — 100 per second. Most frames say <span class="kw">ε</span>, the blank, which means "no new letter here". It is not silence.');
    k.appear(tl, row1, { stagger: 0.05 });

    tl.step('<b>Rule 1:</b> merge neighbours that are the same symbol. The two <span class="kw">h</span> frames become one <span class="kw">h</span>, and the pair of <span class="kw">l</span> frames become one <span class="kw">l</span>.');
    tl.to([brA, brB], { opacity: 1, duration: 0.35 });
    tl.to(lbl2, { opacity: 1, duration: 0.3 });
    k.appear(tl, row2, { stagger: 0.05 });

    tl.step('<b>Rule 2:</b> delete every blank. Ten frames have become five letters, and no human ever said where the <span class="kw">e</span> begins.');
    tl.to(lbl3, { opacity: 1, duration: 0.3 });
    k.appear(tl, row3, { stagger: 0.06 });
    k.dim(tl, [brA, brB], { to: 0, position: '<' });

    tl.step('Look at the blank between the two <span class="kw">l</span> frames. It is doing real work: it keeps them apart so rule 1 cannot merge them.');
    k.pulse(tl, row1[7], { scale: 1.25 });
    tl.to(row1[7].rect, { stroke: 'var(--c-ok)', 'stroke-width': 3, duration: 0.4 }, '<');
    k.dim(tl, row2.concat(row3), { to: 0.3, position: '<' });

    tl.step('Take that one blank away and the word loses a letter: <b>helo</b>. That is the whole reason the blank symbol exists.');
    tl.to(row1[7].rect, { stroke: 'var(--c-loss)', duration: 0.3 });
    tl.to(row1[7].txt, { fill: 'var(--c-loss)', duration: 0.3 }, '<');
    tl.to(row1[7], { opacity: 0.25, duration: 0.4 });
    tl.to(row3, { opacity: 0, duration: 0.3 }, '<');
    k.appear(tl, alt, { stagger: 0.05 });
    tl.to(altNote, { opacity: 1, duration: 0.3 });
    k.pulse(tl, alt[3], { scale: 1.2 });
  });

  /* ======================================================================
     Scene 4 — every alignment counts
     viewBox 900 x 300
     ====================================================================== */

  Scene.register('asr-align', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#al-plot');

    var W = 54, H = 40, PITCH = 60, LEFT = 56;
    var paths = [
      { y: 64, name: 'path A', s: ['c', 'c', 'ε', 'a', 'a', 't', 't', 'ε'] },
      { y: 132, name: 'path B', s: ['ε', 'c', 'ε', 'ε', 'a', 'ε', 't', 't'] },
      { y: 200, name: 'path C', s: ['c', 'ε', 'a', 'a', 'a', 'ε', 'ε', 't'] }
    ];
    var rows = paths.map(function (p) {
      var lab = small(LEFT, p.y - 10, p.name);
      lab.setAttribute('opacity', 0);
      add(host, lab);
      var cells = p.s.map(function (sym, i) {
        var g = cell(LEFT + i * PITCH, p.y, W, H, sym,
                     { role: sym === 'ε' ? 'frozen' : 'data', size: 15 });
        add(host, g);
        return g;
      });
      return { label: lab, cells: cells };
    });

    var arcs = [
      S.curve(536, 84, 632, 140, { role: 'data', bow: 46 }),
      S.curve(536, 152, 632, 152, { role: 'data', bow: 46 }),
      S.curve(536, 220, 632, 164, { role: 'data', bow: 46 })
    ];
    arcs.forEach(function (a) { add(host, a); });

    var resLbl = small(718, 118, 'always the same word', { anchor: 'middle', role: 'ok' });
    resLbl.setAttribute('opacity', 0);
    add(host, resLbl);
    var res = ['c', 'a', 't'].map(function (s, i) {
      var g = cell(640 + i * 54, 130, 48, 44, s, { role: 'ok' });
      add(host, g);
      return g;
    });

    var panel = e('g', { opacity: 0 });
    add(panel, e('rect', { x: 600, y: 200, width: 280, height: 82, rx: 12,
                           fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5 }));
    add(panel, small(740, 226, 'frame paths that give "cat"', { anchor: 'middle' }));
    var bigN = e('text', {
      x: 740, y: 258, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 24, fill: 'var(--text)'
    }, '0');
    add(panel, bigN);
    add(panel, small(740, 276, 'for 8 frames · far more for 1000', { anchor: 'middle' }));
    add(host, panel);

    var eq = small(56, 264, 'loss = − log ( p(A) + p(B) + p(C) + … )',
                   { mono: true, size: 14, role: 'loss' });
    eq.setAttribute('opacity', 0);
    add(host, eq);

    tl.step('A short word, eight frames. This path says the <span class="kw">c</span> lasted two frames and the <span class="kw">t</span> lasted two more.');
    tl.to(rows[0].label, { opacity: 1, duration: 0.3 });
    k.appear(tl, rows[0].cells, { stagger: 0.05 });

    tl.step('This path puts the letters in different places and pads the rest with blanks.');
    tl.to(rows[1].label, { opacity: 1, duration: 0.3 });
    k.appear(tl, rows[1].cells, { stagger: 0.05 });

    tl.step('And this one holds the vowel for three frames. Three different stories about when each sound happened.');
    tl.to(rows[2].label, { opacity: 1, duration: 0.3 });
    k.appear(tl, rows[2].cells, { stagger: 0.05 });

    tl.step('Apply the collapse rule to all three and you get the same three characters — the same word. The differences vanish.');
    tl.to(arcs, { opacity: 1, duration: 0.4, stagger: 0.1 });
    tl.to(resLbl, { opacity: 1, duration: 0.3 });
    k.appear(tl, res, { stagger: 0.08 });

    tl.step('For 8 frames and the word "cat" there are <b>462</b> such paths. CTC does not pick one. It adds the probability of every single one.');
    tl.to(panel, { opacity: 1, duration: 0.35 });
    k.count(tl, bigN, 0, 462, { duration: 1.1, decimals: 0 });

    tl.step('The loss is minus the log of that whole sum. A forward algorithm computes it with dynamic programming, so 1000 frames cost about 1000 steps, not an astronomical number of them.');
    tl.to(eq, { opacity: 1, duration: 0.4 });
    k.pulse(tl, eq, { scale: 1.08 });
  });

  /* ======================================================================
     Scene 5 — the transducer lattice
     viewBox 900 x 320
     Frames run across, emitted tokens run down. Blank steps right, a token
     steps down and stays on the same frame — the move CTC does not have.
     ====================================================================== */

  Scene.register('asr-transducer', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#tr-plot');

    var XS = [200, 330, 460, 590, 720];      /* t = 0 .. 4 frames consumed */
    var YS = [88, 142, 196, 250];            /* u = 0 .. 3 tokens emitted  */

    /* ---- grid lines ---------------------------------------------------- */
    var gridG = e('g', { opacity: 0 });
    YS.forEach(function (y) {
      add(gridG, e('line', { x1: XS[0], y1: y, x2: XS[4], y2: y,
                             stroke: 'var(--line)', 'stroke-width': 1 }));
    });
    XS.forEach(function (x) {
      add(gridG, e('line', { x1: x, y1: YS[0], x2: x, y2: YS[3],
                             stroke: 'var(--line)', 'stroke-width': 1 }));
    });
    add(host, gridG);

    var nodes = [];
    var nodeG = e('g', { opacity: 0 });
    XS.forEach(function (x, ti) {
      nodes[ti] = [];
      YS.forEach(function (y, ui) {
        var c = e('circle', { cx: x, cy: y, r: 6,
                              fill: 'var(--surface-2)', stroke: 'var(--line)',
                              'stroke-width': 1.5 });
        add(nodeG, c);
        nodes[ti][ui] = c;
      });
    });
    add(host, nodeG);

    add(host, small(44, 34, 'the lattice — encoder frames across, emitted tokens down'));
    var startLbl = small(200, 72, 'start', { anchor: 'middle', size: 12 });
    startLbl.setAttribute('opacity', 0);
    add(host, startLbl);
    var endLbl = small(720, 274, 'finish', { anchor: 'middle', size: 12 });
    endLbl.setAttribute('opacity', 0);
    add(host, endLbl);

    /* ---- the three networks -------------------------------------------- */
    var netG = e('g', { opacity: 0 });
    add(netG, small(126, 60, 'encoder h', { anchor: 'end', size: 12 }));
    ['h1', 'h2', 'h3', 'h4'].forEach(function (h, i) {
      add(netG, small((XS[i] + XS[i + 1]) / 2, 60, h,
                      { anchor: 'middle', mono: true, size: 13, role: 'data' }));
    });
    var rowText = ['—', 'c', 'c a', 'c a t'];
    ['g0', 'g1', 'g2', 'g3'].forEach(function (gl, i) {
      add(netG, small(186, YS[i] + 5, gl, { anchor: 'end', mono: true, size: 13, role: 'param' }));
      add(netG, small(132, YS[i] + 5, rowText[i], { anchor: 'end', mono: true, size: 12 }));
    });
    add(host, netG);

    /* ---- notes that swap along the bottom ------------------------------ */
    function note(y, text, opts) {
      opts = opts || {};
      var n = small(460, y, text, { anchor: 'middle', size: 13, role: opts.role });
      n.setAttribute('opacity', 0);
      add(host, n);
      return n;
    }
    var nJoint = note(292, 'at every node the joint network mixes h and g, then softmaxes over the vocabulary plus blank');
    var nTwo = note(313, 'frame 2 wrote c and then a — two tokens, one frame. CTC cannot do this.', { role: 'ok' });
    var nCtc = note(313, 'delete the down-moves and you have CTC: right only, one symbol per frame', { role: 'frozen' });

    /* ---- the path ------------------------------------------------------ */
    function right(ti, ui) {
      var a = S.arrow(XS[ti] + 11, YS[ui], XS[ti + 1] - 10, YS[ui],
                      { role: 'data', sw: 2.4, label: 'ε' });
      add(host, a);
      return a;
    }
    function down(ti, ui, tok) {
      var a = S.arrow(XS[ti], YS[ui] + 11, XS[ti], YS[ui + 1] - 10,
                      { role: 'ok', sw: 2.4 });
      add(host, a);
      var t = small(XS[ti] + 14, (YS[ui] + YS[ui + 1]) / 2 + 5, tok,
                    { mono: true, size: 15, role: 'ok' });
      t.setAttribute('opacity', 0);
      add(host, t);
      a.tok = t;
      return a;
    }

    var r1 = right(0, 0);
    var d1 = down(1, 0, 'c');
    var d2 = down(1, 1, 'a');
    var r2 = right(1, 2);
    var r3 = right(2, 2);
    var d3 = down(3, 2, 't');
    var r4 = right(3, 3);

    var out = small(786, YS[3] + 5, '"cat"', { mono: true, size: 18, role: 'ok' });
    out.setAttribute('opacity', 0);
    add(host, out);

    /* ---- steps ---------------------------------------------------------- */
    tl.step('A grid. <b>Audio frames run across</b>, <b>emitted tokens run down</b>. Decoding starts in the top-left corner and must reach the bottom-right one.');
    tl.to(gridG, { opacity: 1, duration: 0.4 });
    tl.to(nodeG, { opacity: 1, duration: 0.4 }, '-=0.2');
    tl.to([startLbl, endLbl], { opacity: 1, duration: 0.3 });

    tl.step('The three networks meet here. The encoder supplies <span class="kw">h</span> along the top, one vector per frame. The prediction network supplies <span class="kw">g</span> down the side, one per token written so far.');
    tl.to(netG, { opacity: 1, duration: 0.45 });
    tl.to(nJoint, { opacity: 1, duration: 0.35 });

    tl.step('<b>Emit the blank and you step right.</b> On to the next audio frame, having written nothing.');
    tl.to(r1, { opacity: 1, duration: 0.4 });
    k.pulse(tl, nodes[1][0], { scale: 1.8 });

    tl.step('<b>Emit a token and you step down</b> — writing one token, staying on the <b>same</b> frame. So frame 2 writes <span class="kw">c</span>, and then writes <span class="kw">a</span>, without advancing at all.');
    tl.to(d1, { opacity: 1, duration: 0.35 });
    tl.to(d1.tok, { opacity: 1, duration: 0.3 }, '-=0.15');
    tl.to(d2, { opacity: 1, duration: 0.35 });
    tl.to(d2.tok, { opacity: 1, duration: 0.3 }, '-=0.15');
    tl.to(nJoint, { opacity: 0.25, duration: 0.3 }, '<');
    tl.to(nTwo, { opacity: 1, duration: 0.35 });
    k.pulse(tl, [d1, d2], { scale: 1.06 });

    tl.step('Two blanks carry us across the quiet frames, <span class="kw">t</span> comes out on frame 4, and one last blank finishes the audio. The path spells the word.');
    tl.to([r2, r3], { opacity: 1, duration: 0.3, stagger: 0.15 });
    tl.to(d3, { opacity: 1, duration: 0.35 });
    tl.to(d3.tok, { opacity: 1, duration: 0.3 }, '-=0.15');
    tl.to(r4, { opacity: 1, duration: 0.3 });
    tl.to(out, { opacity: 1, duration: 0.4 });
    k.pulse(tl, out, { scale: 1.15 });

    tl.step('Now take the three down-moves away. What is left may only step right — one symbol per frame, always. That is <b>CTC</b>, and it is why a transducer wins on fast speech.');
    tl.to(nTwo, { opacity: 0, duration: 0.25 });
    tl.to([d1, d2, d3], { opacity: 0.18, duration: 0.4 });
    tl.to([d1.tok, d2.tok, d3.tok], { opacity: 0.18, duration: 0.4 }, '<');
    tl.to(nCtc, { opacity: 1, duration: 0.35 });
    k.pulse(tl, [r1, r2, r3, r4], { scale: 1.05, stagger: 0.06 });
  });

  /* ======================================================================
     Scene 6 — the 30-second box vs streaming chunks
     viewBox 900 x 310
     ====================================================================== */

  Scene.register('asr-stream', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#st-plot');

    add(host, small(60, 30, 'Whisper — one fixed 30 s window, always'));

    var outer = e('rect', {
      x: 60, y: 44, width: 780, height: 46, rx: 8, fill: 'none',
      stroke: 'var(--c-frozen)', 'stroke-width': 1.6, 'stroke-dasharray': '6 5', opacity: 0
    });
    add(host, outer);
    var audio = e('rect', {
      x: 64, y: 48, width: 74, height: 38, rx: 5,
      fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.6, opacity: 0
    });
    add(host, audio);
    var audioT = small(101, 73, '3 s', { anchor: 'middle', mono: true, size: 12, role: 'data' });
    audioT.setAttribute('opacity', 0);
    add(host, audioT);

    var pad = e('rect', {
      x: 142, y: 48, width: 694, height: 38, rx: 5,
      fill: 'var(--surface-2)', stroke: 'var(--c-frozen)', 'stroke-width': 1.2,
      'stroke-dasharray': '4 4', opacity: 0
    });
    add(host, pad);
    var padT = small(489, 73, '27 s of zeros', { anchor: 'middle', mono: true, size: 13, role: 'frozen' });
    padT.setAttribute('opacity', 0);
    add(host, padT);

    add(host, e('rect', { x: 60, y: 102, width: 780, height: 12, rx: 6, fill: 'var(--surface-3)' }));
    var meter = e('rect', { x: 60, y: 102, width: 0, height: 12, rx: 6, fill: 'var(--c-loss)' });
    add(host, meter);
    var meterT = small(60, 132, 'encoder work: 1500 states, the same for a 3 s command as for a 30 s meeting',
                       { role: 'loss' });
    meterT.setAttribute('opacity', 0);
    add(host, meterT);

    /* zoom fan into the streaming row */
    var fan = e('g', { opacity: 0 });
    add(fan, e('line', { x1: 64, y1: 92, x2: 60, y2: 176, stroke: 'var(--line)',
                         'stroke-width': 1.2, 'stroke-dasharray': '4 5' }));
    add(fan, e('line', { x1: 138, y1: 92, x2: 840, y2: 176, stroke: 'var(--line)',
                         'stroke-width': 1.2, 'stroke-dasharray': '4 5' }));
    add(fan, small(450, 158, 'the first 3.2 seconds, zoomed', { anchor: 'middle' }));
    add(host, fan);

    var streamLbl = small(60, 196, 'cache-aware streaming encoder — 320 ms chunks');
    streamLbl.setAttribute('opacity', 0);
    add(host, streamLbl);

    var chunks = [];
    for (var c = 0; c < 10; c++) {
      var cr = e('rect', {
        x: 60 + 78 * c, y: 212, width: 74, height: 36, rx: 5,
        fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.5, opacity: 0
      });
      add(host, cr); chunks.push(cr);
    }
    var chunkT = small(97, 264, '320 ms', { anchor: 'middle', mono: true, size: 12 });
    chunkT.setAttribute('opacity', 0);
    add(host, chunkT);

    var look = e('rect', {
      x: 446, y: 212, width: 19.5, height: 36, rx: 3,
      fill: 'var(--c-loss-dim)', stroke: 'var(--c-loss)', 'stroke-width': 1.5,
      'stroke-dasharray': '4 3', opacity: 0
    });
    add(host, look);
    var lookT = small(470, 202, '+80 ms look-ahead', { anchor: 'middle', role: 'loss', mono: true, size: 12 });
    lookT.setAttribute('opacity', 0);
    add(host, lookT);

    var lat = small(500, 268, 'latency ≈ chunk + look-ahead + compute', { anchor: 'middle', mono: true, size: 13 });
    lat.setAttribute('opacity', 0);
    add(host, lat);
    var trade = small(450, 292, '80 ms chunks → 8.43 % WER   ·   1.12 s chunks → 6.93 % WER   ·   same weights',
                      { anchor: 'middle', mono: true, size: 13, role: 'ok' });
    trade.setAttribute('opacity', 0);
    add(host, trade);

    tl.step('Whisper always processes exactly 30 seconds. Your 3-second command goes in, and 27 seconds of zeros are added to fill the box.');
    tl.to([outer, audio, audioT], { opacity: 1, duration: 0.35 });
    tl.to([pad, padT], { opacity: 1, duration: 0.5 }, '+=0.1');

    tl.step('The encoder cost does not depend on how much you said. It is 1500 states every time, so most of the work is spent on silence you invented.');
    tl.to(meter, { attr: { width: 780 }, duration: 1.0, ease: 'power1.inOut' });
    tl.to(meterT, { opacity: 1, duration: 0.35 }, '-=0.3');

    tl.step('A streaming encoder does the opposite. Zoom into the same three seconds and give it one small chunk at a time.');
    tl.to(fan, { opacity: 1, duration: 0.4 });
    tl.to(streamLbl, { opacity: 1, duration: 0.3 });
    k.dim(tl, [outer, pad, padT, meterT], { to: 0.3, position: '<' });
    tl.to(chunks, { opacity: 1, duration: 0.25, stagger: 0.09 });
    tl.to(chunkT, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Each chunk may also peek a little way into the future. Look-ahead buys accuracy and costs exactly its own duration in delay.');
    tl.to([look, lookT], { opacity: 1, duration: 0.4 });
    k.pulse(tl, look, { scale: 1.3 });
    tl.to(lat, { opacity: 1, duration: 0.35 });

    tl.step('The chunk size is a runtime flag, not a retrain. Fourteen times more delay buys about 1.5 points of word error rate.');
    tl.to(trade, { opacity: 1, duration: 0.45 });
    k.pulse(tl, trade, { scale: 1.05 });
  });

  /* ======================================================================
     Scene 7 — WER, worked
     viewBox 900 x 280
     ====================================================================== */

  Scene.register('asr-wer', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#we-plot');

    var LEFT = 44, W = 76, PITCH = 82;
    var refW = ['i', 'would', 'like', 'to', 'book', 'a', 'flight', 'to', 'boston', ''];
    var hypW = ['i', 'would', 'like', '', 'book', 'a', 'flight', 'two', 'boston', 'today'];
    var kind = ['ok', 'ok', 'ok', 'del', 'ok', 'ok', 'ok', 'sub', 'ok', 'ins'];

    add(host, small(LEFT, 62, 'reference — what was actually said'));
    add(host, small(LEFT, 132, 'hypothesis — what the model wrote'));

    var refC = [], hypC = [];
    refW.forEach(function (w, i) {
      var empty = (kind[i] === 'ins');
      var g = cell(LEFT + i * PITCH, 74, W, 34, w,
        empty ? { role: 'frozen', dashed: true, hollow: true, size: 13 } : { role: 'data', size: 13 });
      add(host, g); refC.push(g);
    });
    hypW.forEach(function (w, i) {
      var empty = (kind[i] === 'del');
      var g = cell(LEFT + i * PITCH, 144, W, 34, w,
        empty ? { role: 'frozen', dashed: true, hollow: true, size: 13 } : { role: 'data', size: 13 });
      add(host, g); hypC.push(g);
    });

    function mark(i, letter, word) {
      var g = e('g', { opacity: 0 });
      add(g, e('text', {
        x: LEFT + i * PITCH + W / 2, y: 202, 'text-anchor': 'middle',
        class: 'dg-mono', 'font-size': 15, fill: 'var(--c-loss)'
      }, letter));
      add(g, small(LEFT + i * PITCH + W / 2, 218, word, { anchor: 'middle', role: 'loss' }));
      add(host, g);
      return g;
    }
    var mD = mark(3, 'D', 'deletion');
    var mS = mark(7, 'S', 'substitution');
    var mI = mark(9, 'I', 'insertion');

    var tally = e('g', { opacity: 0 });
    [['S = 1', 210], ['D = 1', 330], ['I = 1', 450], ['n_ref = 9', 570]].forEach(function (p) {
      add(tally, e('text', {
        x: p[1], y: 244, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 15,
        fill: p[0][0] === 'n' ? 'var(--c-data)' : 'var(--c-loss)'
      }, p[0]));
    });
    add(host, tally);

    var final = e('text', {
      x: 450, y: 272, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 18,
      fill: 'var(--c-ok)', opacity: 0
    }, 'WER = (1 + 1 + 1) / 9 = 33.3 %');
    add(host, final);

    tl.step('The reference is what the person actually said. Count the words: there are <b>nine</b>. That number becomes the denominator.');
    k.appear(tl, refC.slice(0, 9), { stagger: 0.05 });

    tl.step('The hypothesis is what the model wrote. Line the two up by <b>edit distance</b>, not by position — otherwise one early mistake would mark everything after it wrong.');
    k.appear(tl, hypC.filter(function (_, i) { return kind[i] !== 'del'; }), { stagger: 0.05 });

    tl.step('The word "to" before "book" is missing from the output. That is one <b>deletion</b>, and it opens a gap in the alignment.');
    tl.to(hypC[3], { opacity: 1, duration: 0.4 });
    tl.to(mD, { opacity: 1, duration: 0.3 });
    tl.to(refC[3].rect, { stroke: 'var(--c-loss)', duration: 0.3 }, '<');

    tl.step('"to" came back as "two": one <b>substitution</b>. And "today" was never said at all: one <b>insertion</b>.');
    tl.to([refC[7].rect, hypC[7].rect], { stroke: 'var(--c-loss)', duration: 0.3 });
    tl.to([refC[7].txt, hypC[7].txt], { fill: 'var(--c-loss)', duration: 0.3 }, '<');
    tl.to(mS, { opacity: 1, duration: 0.3 });
    tl.to([refC[9], hypC[9]], { opacity: 1, duration: 0.4 });
    tl.to(hypC[9].rect, { stroke: 'var(--c-loss)', duration: 0.3 });
    tl.to(hypC[9].txt, { fill: 'var(--c-loss)', duration: 0.3 }, '<');
    tl.to(mI, { opacity: 1, duration: 0.3 });

    tl.step('Add the three error types and divide by the nine reference words. Insertions are not limited by that nine, which is why WER can pass 100 %.');
    tl.to(tally, { opacity: 1, duration: 0.4 });
    tl.to(final, { opacity: 1, duration: 0.5 });
    k.pulse(tl, final, { scale: 1.12 });
  });

})();
