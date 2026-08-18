/* =========================================================================
   Lesson 03 — Inside a Transformer.
   Six scenes: tokenization, scaled dot-product attention, the causal mask,
   multi-head splitting, GQA and the KV cache, and the pre-norm block.

   Colour is meaning, everywhere:
     data (cyan)   activations — tokens, q/k/v, the residual stream
     param (amber) learned matrices and norm gains
     grad (magenta) the backward pass
     loss (red)    memory we want smaller
     ok (green)    the finished output of a step
     frozen (grey) masked-out, discarded, "cannot be read"
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;

  /* ======================================================================
     Scene 1 — text becomes pieces, pieces become ids, ids become vectors
     ====================================================================== */

  Scene.register('tf-tokens', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#tk-plot');

    var PIECES = ['Token', 'izers', 'split', 'rare', 'words'];
    var IDS    = ['20328', '11466', '6733', '8912', '4471'];
    var W = 112, GAP = 10, X0 = 40;
    function colX(i) { return X0 + i * (W + GAP); }      /* 40 .. 640 */
    function colC(i) { return colX(i) + W / 2; }

    /* --- the raw string ------------------------------------------------ */
    var raw = S.g({ opacity: 0 });
    S.add(raw, S.e('rect', {
      x: 40, y: 20, width: 600, height: 40, rx: 10,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.5
    }));
    S.add(raw, S.e('text', {
      x: 340, y: 45, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 14, fill: 'var(--text)'
    }, '"Tokenizers split rare words."'));
    host.appendChild(raw);

    /* --- the token pieces ---------------------------------------------- */
    var toks = S.tokens(X0, 92, PIECES, { w: W, h: 38, gap: GAP, role: 'data', opacity: 0 });
    host.appendChild(toks);

    /* --- the integer ids ------------------------------------------------ */
    var idG = S.g({ opacity: 0 });
    PIECES.forEach(function (_, i) {
      S.add(idG, S.e('rect', {
        x: colX(i), y: 148, width: W, height: 30, rx: 8,
        fill: 'var(--surface-2)', stroke: 'var(--line-soft)', 'stroke-width': 1.2
      }));
      S.add(idG, S.e('text', {
        x: colC(i), y: 168, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 13, fill: 'var(--c-param)'
      }, IDS[i]));
    });
    host.appendChild(idG);

    /* --- the embedding rows --------------------------------------------- */
    var vecG = S.g({ opacity: 0 });
    var squares = [];
    PIECES.forEach(function (_, i) {
      var sx = colC(i) - 49;
      for (var j = 0; j < 6; j++) {
        var r = S.e('rect', {
          x: sx + j * 17, y: 196, width: 14, height: 14, rx: 3,
          fill: 'var(--c-data)', opacity: 0.25 + 0.55 * ((i * 7 + j * 3) % 5) / 4
        });
        S.add(vecG, r); squares.push(r);
      }
    });
    host.appendChild(vecG);

    var note = S.label(40, 250, 'one row of the embedding table per token — shape (B, T, d)', { small: true });
    note.setAttribute('opacity', 0);
    host.appendChild(note);

    /* --- the table panel ------------------------------------------------ */
    var panel = S.g({ opacity: 0 });
    S.add(panel, S.e('rect', {
      x: 666, y: 92, width: 214, height: 150, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--c-param)', 'stroke-width': 1.5
    }));
    S.add(panel, S.e('text', { x: 773, y: 118, 'text-anchor': 'middle', class: 'dg-title' }, 'embedding table'));
    S.add(panel, S.e('text', { x: 686, y: 146, class: 'dg-mono', 'font-size': 13, fill: 'var(--text-dim)' }, 'V        = 128,256'));
    S.add(panel, S.e('text', { x: 686, y: 168, class: 'dg-mono', 'font-size': 13, fill: 'var(--text-dim)' }, 'd_model  =   2,048'));
    var big = S.e('text', { x: 773, y: 202, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 20, fill: 'var(--c-param)' }, '0 M');
    S.add(panel, big);
    S.add(panel, S.e('text', { x: 773, y: 226, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'numbers · Llama 3.2 1B'));
    host.appendChild(panel);

    /* --- steps ---------------------------------------------------------- */
    tl.step('A model cannot read a string. The tokenizer stands between text and integers, and it is fixed before training starts.');
    tl.to(raw, { opacity: 1, duration: 0.4 });

    tl.step('Byte-level <b>BPE</b> — byte pair encoding — cuts the text at the joins it saw most often while it was built. Frequent words stay whole; rare ones break into pieces.');
    tl.to(toks, { opacity: 1, duration: 0.45 });
    k.appear(tl, toks.cells.map(function (c) { return c.g; }), { stagger: 0.07, y: -10 });
    tl.to(raw, { opacity: 0.3, duration: 0.3 }, '<');

    tl.step('Each piece has one fixed <b>id</b>. The alphabet underneath is the 256 byte values, so no text is ever unknown — not emoji, not Chinese, not broken UTF-8.');
    tl.to(idG, { opacity: 1, duration: 0.4 });

    tl.step('The id is a <b>row number</b>. The embedding table hands back that row: <span class="kw">d_model</span> learned numbers describing this token.');
    tl.to(vecG, { opacity: 1, duration: 0.4 });
    k.appear(tl, squares, { stagger: 0.008, y: 6, position: '<' });
    tl.to(note, { opacity: 1, duration: 0.3 });

    tl.step('The table is <b>V × d_model</b>. For Llama 3.2 1B that is 263 million numbers — about a fifth of the entire model, spent on a lookup.');
    tl.to(panel, { opacity: 1, duration: 0.4 });
    k.count(tl, big, 0, 263, { duration: 1.0, decimals: 0, format: function (v) { return Math.round(v) + ' M'; } });
    k.pulse(tl, big, { scale: 1.2 });
  });

  /* ======================================================================
     Scene 2 — one query, five keys, a weighted mixture of values
     ====================================================================== */

  Scene.register('tf-attend', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#at-plot');

    var WORDS = ['The', 'cat', 'sat', 'on', 'it'];
    var RAW   = [1.6, 20.8, 6.4, 0.8, 10.4];
    var SCALED = [0.20, 2.60, 0.80, 0.10, 1.30];
    var WGT   = [0.06, 0.62, 0.10, 0.05, 0.17];
    var W = 90, STEP = 102, X0 = 90;
    function colX(i) { return X0 + i * STEP; }           /* 90 .. 588 */
    function colC(i) { return colX(i) + W / 2; }

    /* row labels on the left */
    ['tokens', 'keys', 'q · k', 'softmax', 'values'].forEach(function (t, i) {
      var y = [45, 78, 113, 169, 228][i];
      host.appendChild(S.label(80, y, t, { anchor: 'end', small: true }));
    });

    /* --- tokens --------------------------------------------------------- */
    var toks = S.tokens(X0, 22, WORDS, { w: W, h: 36, gap: STEP - W, role: 'data', opacity: 0 });
    host.appendChild(toks);

    var keyLbl = S.g({ opacity: 0 });
    WORDS.forEach(function (_, i) {
      S.add(keyLbl, S.e('text', {
        x: colC(i), y: 78, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 12, fill: 'var(--c-data)'
      }, 'k' + i));
    });
    host.appendChild(keyLbl);

    /* --- raw scores ------------------------------------------------------ */
    var scoreG = S.g({ opacity: 0 });
    var scoreT = [];
    WORDS.forEach(function (_, i) {
      S.add(scoreG, S.e('rect', {
        x: colX(i), y: 92, width: W, height: 32, rx: 8,
        fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.3
      }));
      var t = S.e('text', {
        x: colC(i), y: 113, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 13, fill: 'var(--text)'
      }, RAW[i].toFixed(2));
      S.add(scoreG, t); scoreT.push(t);
    });
    host.appendChild(scoreG);

    /* --- softmax weights -------------------------------------------------- */
    var wG = S.g({ opacity: 0 });
    var fills = [], wT = [];
    WORDS.forEach(function (_, i) {
      S.add(wG, S.e('rect', {
        x: colX(i), y: 148, width: W, height: 32, rx: 8,
        fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.3
      }));
      var f = S.e('rect', {
        x: colX(i), y: 148, width: 0, height: 32, rx: 8,
        fill: 'var(--c-data)', opacity: 0.55
      });
      S.add(wG, f); fills.push(f);
      var t = S.e('text', {
        x: colC(i), y: 169, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 13, fill: 'var(--text)'
      }, '0.00');
      S.add(wG, t); wT.push(t);
    });
    host.appendChild(wG);

    /* --- value boxes ------------------------------------------------------ */
    var vG = S.g({ opacity: 0 });
    var vBox = [];
    WORDS.forEach(function (_, i) {
      var g = S.g({});
      S.add(g, S.e('rect', {
        x: colX(i), y: 200, width: W, height: 46, rx: 8,
        fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.4
      }));
      S.add(g, S.e('text', {
        x: colC(i), y: 228, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 14, fill: 'var(--c-data)'
      }, 'v' + i));
      S.add(vG, g); vBox.push(g);
    });
    host.appendChild(vG);

    /* --- the right-hand panel --------------------------------------------- */
    var learned = S.pill(630, 20, 250, 32, 'Wq  Wk  Wv  Wo   learned', { role: 'param' });
    var qBox    = S.box(630, 70, 250, 48, { title: 'query q  ·  from "it"', role: 'data' });
    var scaleB  = S.box(630, 136, 250, 40, { title: '÷ √d_h   =   ÷ 8', role: 'frozen' });
    var softB   = S.box(630, 192, 250, 40, { title: 'softmax  ·  Σ = 1.00', role: 'data' });
    var outB    = S.box(630, 248, 250, 64, { title: 'out = Σ wi · vi', sub: '(B, T, d_h)', role: 'ok' });
    var outArrow = S.arrow(596, 223, 622, 272, { role: 'ok' });
    host.appendChild(learned); host.appendChild(qBox); host.appendChild(scaleB);
    host.appendChild(softB); host.appendChild(outArrow); host.appendChild(outB);

    var verdict = S.label(90, 300, '"it" pulled in 62% of the value of "cat".', { small: true, role: 'ok' });
    verdict.setAttribute('opacity', 0);
    host.appendChild(verdict);

    /* --- steps ------------------------------------------------------------ */
    tl.step('Every token becomes three vectors through three learned matrices: a <b>query</b> (what it wants), a <b>key</b> (what it offers) and a <b>value</b> (what it hands over).');
    tl.to(toks, { opacity: 1, duration: 0.4 });
    tl.to([learned, keyLbl], { opacity: 1, duration: 0.35 }, '-=0.15');
    tl.to(vG, { opacity: 1, duration: 0.35 }, '-=0.2');

    tl.step('On its own, the vector for "it" knows nothing about the cat. So take its query and compare it with the key of <b>every</b> token — one dot product each. A large dot product means the two vectors point the same way.');
    tl.to(qBox, { opacity: 1, duration: 0.35 });
    tl.to(toks.cells[4].rect, { stroke: 'var(--c-ok)', 'stroke-width': 2.6, duration: 0.3 }, '<');
    tl.to(scoreG, { opacity: 1, duration: 0.4 });
    k.appear(tl, scoreT, { stagger: 0.08, y: -6, position: '<' });

    tl.step('Divide every score by <span class="kw">√d_h</span>, the square root of the head dimension. A dot product of two 64-number vectors already has a spread of about ±8; leave it and the softmax saturates and the gradient dies.');
    tl.to(scaleB, { opacity: 1, duration: 0.35 });
    scoreT.forEach(function (t, i) {
      k.count(tl, t, RAW[i], SCALED[i], { duration: 0.6, decimals: 2, position: i === 0 ? undefined : '<' });
    });

    tl.step('<b>Softmax</b> turns the row into weights. All positive, and they add up to 1.00 — exactly the function you met in Lesson 01.');
    tl.to(softB, { opacity: 1, duration: 0.35 });
    tl.to(wG, { opacity: 1, duration: 0.3 }, '<');
    WGT.forEach(function (w, i) {
      tl.to(fills[i], { attr: { width: w * W }, duration: 0.7, ease: 'power2.out' }, i === 0 ? undefined : '<');
      k.count(tl, wT[i], 0, w, { duration: 0.7, decimals: 2, position: '<' });
    });

    tl.step('Now mix the <b>values</b>, not the keys. Each value vector is scaled by its own weight, so "cat" contributes most and "on" almost nothing.');
    WGT.forEach(function (w, i) {
      tl.to(vBox[i], { opacity: 0.2 + 0.8 * (w / 0.62), duration: 0.5 }, i === 0 ? undefined : '<');
    });
    k.dim(tl, [scoreG, keyLbl], { to: 0.25, position: '<' });

    tl.step('Add them together. That sum is the output at this position, shape <span class="kw">(B, T, d_h)</span>. Attention is a weighted average — nothing more exotic than that.');
    tl.to([outArrow, outB], { opacity: 1, duration: 0.4, stagger: 0.12 });
    tl.to(verdict, { opacity: 1, duration: 0.3 });
    k.pulse(tl, outB, { scale: 1.06 });
  });

  /* ======================================================================
     Scene 3 — the causal mask
     ====================================================================== */

  Scene.register('tf-mask', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#mk-plot');

    var WORDS = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'it'];
    var N = 8, CELL = 26, GAP = 3, MX = 150, MY = 52;
    var ROW5 = [0.18, 0.22, 0.14, 0.19, 0.11, 0.16, 0, 0];

    host.appendChild(S.label(150, 26, 'key position — what this row may look at  →', { small: true }));
    host.appendChild(S.label(140, 30, 'query ↓', { anchor: 'end', small: true }));

    for (var c = 0; c < N; c++) {
      host.appendChild(S.label(MX + c * (CELL + GAP) + CELL / 2, 44, String(c),
        { anchor: 'middle', mono: true, size: 11 }));
    }
    WORDS.forEach(function (w, r) {
      host.appendChild(S.label(140, MY + r * (CELL + GAP) + 18, w,
        { anchor: 'end', mono: true, size: 11.5 }));
    });

    var m = S.matrix(MX, MY, N, N, { cell: CELL, gap: GAP, fill: 'var(--c-data)' });
    m.flat.forEach(function (el) { el.setAttribute('opacity', 0); });
    host.appendChild(m);

    /* a stable pseudo-score for every cell, so the picture looks like real data */
    function score(r, c) { return 0.14 + 0.72 * ((r * 5 + c * 3 + (r * c) % 7) % 9) / 8; }

    /* --- the extracted row 5 --------------------------------------------- */
    var stripG = S.g({ opacity: 0 });
    S.add(stripG, S.e('text', { x: 430, y: 84, class: 'dg-label dg-label--sm' }, 'row 5, after the softmax'));
    var strip = S.matrix(430, 96, 1, N, { cell: 30, gap: 4, fill: 'var(--c-data)' });
    strip.flat.forEach(function (el) { el.setAttribute('opacity', 0.1); });
    S.add(stripG, strip);
    var stripT = [];
    for (var i = 0; i < N; i++) {
      var t = S.e('text', {
        x: 430 + i * 34 + 15, y: 146, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 11, fill: 'var(--text-dim)'
      }, '—');
      S.add(stripG, t); stripT.push(t);
    }
    host.appendChild(stripG);

    var rule = S.box(430, 180, 420, 52, { title: 'mask[i, j] = −inf   where   j > i', role: 'frozen' });
    host.appendChild(rule);

    var n1 = S.label(430, 264, 'Row 0 predicts from 1 token. Row 7 predicts from 8.', { small: true });
    var n2 = S.label(430, 286, 'One forward pass therefore trains T predictions at once.', { small: true, role: 'ok' });
    n1.setAttribute('opacity', 0); n2.setAttribute('opacity', 0);
    host.appendChild(n1); host.appendChild(n2);

    /* --- steps ------------------------------------------------------------ */
    tl.step('The score matrix holds every query row against every key column. Eight tokens give an 8 × 8 grid, and its size grows with the <b>square</b> of the sequence length.');
    tl.to(m.flat, {
      opacity: function (idx) { return score(Math.floor(idx / N), idx % N); },
      duration: 0.45, stagger: 0.01
    });

    tl.step('Look at <b>row 5</b>. It is token 5 asking about the sequence. Columns 6 and 7 are its future, and it must never read them.');
    var row5 = [];
    for (var c5 = 0; c5 < N; c5++) row5.push(m.at(5, c5));
    tl.to(row5, { stroke: 'var(--c-ok)', 'stroke-width': 2, duration: 0.4 });
    tl.to([m.at(5, 6), m.at(5, 7)], { stroke: 'var(--c-loss)', 'stroke-width': 2.4, duration: 0.35 });
    k.pulse(tl, [m.at(5, 6), m.at(5, 7)], { scale: 1.25 });

    tl.step('So <b>before</b> the softmax, every cell above the diagonal is filled with negative infinity. That is the whole causal mask.');
    var upper = [];
    m.flat.forEach(function (el, idx) {
      var r = Math.floor(idx / N), c = idx % N;
      if (c > r) upper.push(el);
    });
    tl.to(upper, { fill: 'var(--c-frozen)', opacity: 0.16, stroke: 'var(--line-soft)', 'stroke-width': 1, duration: 0.6, stagger: 0.008 });

    tl.step('e<sup>−inf</sup> is 0, so those weights are exactly zero and cost nothing. Each row still sums to 1 over the part it is allowed to see.');
    tl.to(stripG, { opacity: 1, duration: 0.35 });
    ROW5.forEach(function (w, i) {
      tl.to(strip.at(0, i), {
        opacity: w > 0 ? 0.2 + w * 2.6 : 0.08,
        fill: w > 0 ? 'var(--c-data)' : 'var(--c-frozen)',
        duration: 0.45
      }, i === 0 ? undefined : '<' + (i * 0.05));
      tl.call(function () {
        stripT[i].textContent = w > 0 ? w.toFixed(2) : '0';
        stripT[i].setAttribute('fill', w > 0 ? 'var(--c-data)' : 'var(--c-frozen)');
      }, null, '<');
    });
    tl.to(rule, { opacity: 1, duration: 0.35 });

    tl.step('Row 0 sees one token, row 7 sees eight. One pass over a sequence of length T produces <b>T separate training signals</b> — that is why next-token prediction is such a cheap way to learn.');
    tl.to([n1, n2], { opacity: 1, duration: 0.4, stagger: 0.2 });
    k.pulse(tl, n2, { scale: 1.06 });
  });

  /* ======================================================================
     Scene 4 — multi-head: one wide vector, six narrow heads
     ====================================================================== */

  Scene.register('tf-heads', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#hd-plot');

    var H = 6, HW = 120, HGAP = 10, HX0 = 65;           /* 65 .. 835 */
    function headX(i) { return HX0 + i * (HW + HGAP); }
    function headC(i) { return headX(i) + HW / 2; }

    var NAMES = ['previous token', 'the first token', 'itself', 'everything so far', 'two tokens back', 'a mixed pattern'];

    /* the wide vector */
    var wide = S.g({ opacity: 0 });
    S.add(wide, S.e('rect', {
      x: 60, y: 36, width: 780, height: 34, rx: 8,
      fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.6
    }));
    S.add(wide, S.e('text', {
      x: 450, y: 58, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 13, fill: 'var(--c-data)'
    }, 'q for one token  ·  d_model = 384 numbers'));
    host.appendChild(wide);

    /* the six slices */
    var heads = [], links = [];
    for (var i = 0; i < H; i++) {
      var g = S.g({ opacity: 0 });
      S.add(g, S.e('rect', {
        x: headX(i), y: 100, width: HW, height: 42, rx: 8,
        fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.5
      }));
      S.add(g, S.e('text', { x: headC(i), y: 120, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--text)' }, 'head ' + i));
      S.add(g, S.e('text', { x: headC(i), y: 135, 'text-anchor': 'middle', class: 'dg-label dg-label--sm' }, 'd_h = 64'));
      host.appendChild(g); heads.push(g);

      var ln = S.e('line', {
        x1: headC(i), y1: 70, x2: headC(i), y2: 100,
        stroke: 'var(--c-data)', 'stroke-width': 1.6, opacity: 0
      });
      host.appendChild(ln); links.push(ln);
    }

    /* one 4x4 attention pattern per head */
    var pats = [], patLbl = [];
    function lit(h, r, c) {
      if (c > r) return 0;                       /* causal */
      if (h === 0) return c === r - 1 ? 1 : 0.05;
      if (h === 1) return c === 0 ? 1 : 0.05;
      if (h === 2) return c === r ? 1 : 0.05;
      if (h === 3) return 0.55;
      if (h === 4) return c === r - 2 ? 1 : 0.05;
      return (c + r) % 2 === 0 ? 0.8 : 0.15;
    }
    for (var h = 0; h < H; h++) {
      var mm = S.matrix(headC(h) - 21, 160, 4, 4, { cell: 9, gap: 2, fill: 'var(--c-data)' });
      mm.flat.forEach(function (el) { el.setAttribute('opacity', 0); });
      mm.setAttribute('opacity', 0);
      host.appendChild(mm); pats.push(mm);

      var lb = S.label(headC(h), 218, NAMES[h], { anchor: 'middle', small: true });
      lb.setAttribute('opacity', 0);
      host.appendChild(lb); patLbl.push(lb);
    }

    /* the concatenation */
    var cat = S.g({ opacity: 0 });
    S.add(cat, S.e('rect', {
      x: 60, y: 244, width: 780, height: 30, rx: 8,
      fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.6
    }));
    S.add(cat, S.e('text', {
      x: 450, y: 264, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 12.5, fill: 'var(--c-data)'
    }, 'six outputs laid end to end  ·  back to 384'));
    host.appendChild(cat);

    var down = [];
    for (var j = 0; j < H; j++) {
      var dl = S.e('line', {
        x1: headC(j), y1: 206, x2: headC(j), y2: 244,
        stroke: 'var(--c-data)', 'stroke-width': 1.6, opacity: 0
      });
      host.appendChild(dl); down.push(dl);
    }

    var last = S.label(450, 292, 'then one more learned matrix, Wo, mixes the six slices together', { anchor: 'middle', small: true });
    last.setAttribute('opacity', 0);
    host.appendChild(last);

    /* --- steps ------------------------------------------------------------ */
    tl.step('One softmax row is one weighted average, so one head can express exactly one relation per position. That is not enough.');
    tl.to(wide, { opacity: 1, duration: 0.4 });

    tl.step('A head is <b>not</b> a copy of the layer. The 384 numbers are cut into six slices of 64. Narrower slices, same total width — so six heads cost the same arithmetic as one wide head.');
    tl.to(links, { opacity: 1, duration: 0.3, stagger: 0.04 });
    tl.to(heads, { opacity: 1, duration: 0.35, stagger: 0.06 }, '-=0.2');

    tl.step('Each slice gets its own <b>Wq, Wk and Wv</b>, and runs its own attention over the same tokens. Six independent score matrices, computed in parallel.');
    tl.to(pats, { opacity: 1, duration: 0.3, stagger: 0.05 });
    pats.forEach(function (mm, hi) {
      tl.to(mm.flat, {
        opacity: function (idx) { return lit(hi, Math.floor(idx / 4), idx % 4) * 0.9; },
        duration: 0.4, stagger: 0.012
      }, hi === 0 ? undefined : '<0.12');
    });

    tl.step('Heads specialise on their own. One tracks the previous token, one always looks back at the first token, one copies a pattern it has already seen. Nobody programmed these roles.');
    tl.to(patLbl, { opacity: 1, duration: 0.35, stagger: 0.07 });

    tl.step('The six outputs are laid end to end, back to 384 numbers, and one more matrix mixes them before the result rejoins the residual stream.');
    tl.to(patLbl, { opacity: 0.18, duration: 0.3 });
    tl.to(down, { opacity: 1, duration: 0.3, stagger: 0.04 }, '<');
    tl.to(cat, { opacity: 1, duration: 0.4 }, '-=0.1');
    tl.to(last, { opacity: 1, duration: 0.3 });
  });

  /* ======================================================================
     Scene 5 — MHA, GQA, MQA and the size of the KV cache
     ====================================================================== */

  Scene.register('tf-gqa', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#gq-plot');

    var NQ = 32, TW = 13, TSTEP = 17, TX0 = 40;         /* 40 .. 580 */
    function qx(i) { return TX0 + i * TSTEP; }
    function qc(i) { return qx(i) + TW / 2; }

    host.appendChild(S.label(40, 42, '32 query heads', { small: true }));

    /* query heads */
    var qG = S.g({ opacity: 0 });
    for (var i = 0; i < NQ; i++) {
      S.add(qG, S.e('rect', {
        x: qx(i), y: 52, width: TW, height: 30, rx: 4,
        fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.2
      }));
    }
    host.appendChild(qG);

    /* three key/value layouts, cross-faded */
    function kvRow(count, w, step) {
      var g = S.g({ opacity: 0 });
      for (var j = 0; j < count; j++) {
        S.add(g, S.e('rect', {
          x: TX0 + j * step, y: 146, width: w, height: 30, rx: 4,
          fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.6
        }));
      }
      host.appendChild(g);
      return g;
    }
    var kvMHA = kvRow(32, TW, TSTEP);
    var kvGQA = kvRow(8, 64, 68);
    var kvMQA = kvRow(1, 540, 540);

    function linkRow(centreFor) {
      var g = S.g({ opacity: 0 });
      for (var j = 0; j < NQ; j++) {
        S.add(g, S.e('line', {
          x1: qc(j), y1: 82, x2: centreFor(j), y2: 146,
          stroke: 'var(--c-data)', 'stroke-width': 1, opacity: 0.55
        }));
      }
      host.appendChild(g);
      return g;
    }
    var lnMHA = linkRow(function (j) { return qc(j); });
    var lnGQA = linkRow(function (j) { return TX0 + Math.floor(j / 4) * 68 + 32; });
    var lnMQA = linkRow(function () { return TX0 + 270; });

    var kvCap = S.e('text', { x: 40, y: 212, class: 'dg-mono', 'font-size': 13, fill: 'var(--text-dim)', opacity: 0 }, '');
    host.appendChild(kvCap);

    /* the readout panel */
    var panel = S.box(630, 40, 250, 44, { title: 'KV cache', role: 'frozen' });
    host.appendChild(panel);
    var sub = S.label(755, 104, 'Llama 3.2 1B · 8,192 tokens · fp16', { anchor: 'middle', small: true });
    sub.setAttribute('opacity', 0);
    host.appendChild(sub);

    var big = S.e('text', {
      x: 755, y: 156, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 26, fill: 'var(--c-loss)', opacity: 0
    }, '1024 MiB');
    host.appendChild(big);

    var meter = S.meter(645, 174, 220, 14, { value: 1, role: 'loss', opacity: 0 });
    host.appendChild(meter);

    var f1 = S.label(755, 214, '2 × layers × kv_heads', { anchor: 'middle', small: true });
    var f2 = S.label(755, 232, '× d_head × tokens × 2 bytes', { anchor: 'middle', small: true });
    var vLbl = S.e('text', { x: 755, y: 268, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 14, fill: 'var(--c-data)', opacity: 0 }, 'MHA · 32 KV heads');
    f1.setAttribute('opacity', 0); f2.setAttribute('opacity', 0);
    host.appendChild(f1); host.appendChild(f2); host.appendChild(vLbl);

    function fmt(v) { return Math.round(v) + ' MiB'; }

    /* --- steps ------------------------------------------------------------ */
    tl.step('While the model generates, it stores one key and one value for every token it has already seen, in every layer. That store is the <b>KV cache</b>, and it grows with the conversation.');
    tl.to([panel, sub, f1, f2], { opacity: 1, duration: 0.35, stagger: 0.08 });

    tl.step('Plain multi-head attention — MHA — gives each query head its own key/value head: 32 and 32. Every extra KV head is memory you must keep for the whole context.');
    tl.to(qG, { opacity: 1, duration: 0.4 });
    tl.to([kvMHA, lnMHA], { opacity: 1, duration: 0.4 }, '-=0.15');
    tl.to([big, meter, vLbl], { opacity: 1, duration: 0.35 }, '-=0.1');
    tl.call(function () { kvCap.textContent = '32 key/value heads — nothing is shared'; });
    tl.to(kvCap, { opacity: 1, duration: 0.3 });

    tl.step('Now group them. Four query heads share <b>one</b> key/value head. The queries stay at 32, the stored heads drop to 8. This is grouped-query attention, GQA.');
    tl.to([kvMHA, lnMHA], { opacity: 0, duration: 0.3 });
    tl.to([kvGQA, lnGQA], { opacity: 1, duration: 0.45 }, '-=0.1');
    k.count(tl, big, 1024, 256, { duration: 0.8, format: fmt, position: '<' });
    tl.to(meter.fill, { attr: { width: 0.25 * meter.track }, duration: 0.8 }, '<');
    tl.call(function () {
      kvCap.textContent = '8 key/value heads — 4 queries per group';
      vLbl.textContent = 'GQA · 8 KV heads';
    });

    tl.step('The cache falls from 1 GiB to <b>256 MiB</b> at an 8k context, and quality stays close to full multi-head. That trade is why GQA is in almost every model shipped in 2026.');
    k.pulse(tl, big, { scale: 1.18 });
    k.pulse(tl, meter, { scale: 1.04 });

    tl.step('Push it to a single shared key/value head and you have multi-query attention, MQA. The cache is 32× smaller — but now the quality drop is noticeable. Gemma 4 E2B accepts that trade because it is built for a device.');
    tl.to([kvGQA, lnGQA], { opacity: 0, duration: 0.3 });
    tl.to([kvMQA, lnMQA], { opacity: 1, duration: 0.45 }, '-=0.1');
    k.count(tl, big, 256, 32, { duration: 0.8, format: fmt, position: '<' });
    tl.to(meter.fill, { attr: { width: 0.03125 * meter.track }, duration: 0.8 }, '<');
    tl.call(function () {
      kvCap.textContent = '1 key/value head — every query shares it';
      vLbl.textContent = 'MQA · 1 KV head';
    });

    tl.step('Remember which number moved. The <b>query</b> head count never entered the formula. On a phone the cache, not the weights, is usually what runs out of memory first.');
    k.dim(tl, [qG, lnMQA], { to: 0.3 });
    k.pulse(tl, vLbl, { scale: 1.15 });
  });

  /* ======================================================================
     Scene 6 — the pre-norm block and the residual highway
     ====================================================================== */

  Scene.register('tf-block', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#bk-plot');

    /* the highway */
    var road = S.e('path', {
      d: 'M40,150 H880', fill: 'none', stroke: 'var(--c-data)',
      'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0
    });
    host.appendChild(road);
    var inDot = S.e('circle', { cx: 40, cy: 150, r: 6, fill: 'var(--c-data)', opacity: 0 });
    host.appendChild(inDot);
    var inLbl = S.label(40, 134, 'x  (B, T, d)', { mono: true, size: 12.5, role: 'data' });
    inLbl.setAttribute('opacity', 0);
    host.appendChild(inLbl);

    var roadLbl = S.label(60, 186, 'the residual stream — no matrix ever sits on it', { small: true });
    roadLbl.setAttribute('opacity', 0);
    host.appendChild(roadLbl);

    /* branch 1 — attention, above the stream */
    var tap1 = S.e('path', {
      d: 'M100,150 V77 H124', fill: 'none', stroke: 'var(--c-data)',
      'stroke-width': 2, opacity: 0
    });
    host.appendChild(tap1);
    var norm1 = S.box(130, 52, 110, 50, { title: 'RMSNorm', role: 'param' });
    var a1 = S.arrow(244, 77, 262, 77, { role: 'data' });
    var attn = S.box(265, 52, 175, 50, { title: 'self-attention', role: 'param' });
    var ret1 = S.e('path', {
      d: 'M440,77 H460 V136', fill: 'none', stroke: 'var(--c-data)',
      'stroke-width': 2, opacity: 0
    });
    host.appendChild(norm1); host.appendChild(a1); host.appendChild(attn); host.appendChild(ret1);

    var plus1 = S.g({ opacity: 0 });
    S.add(plus1, S.e('circle', { cx: 460, cy: 150, r: 14, fill: 'var(--bg)', stroke: 'var(--c-data)', 'stroke-width': 2 }));
    S.add(plus1, S.e('text', { x: 460, y: 156, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 16, fill: 'var(--c-data)' }, '+'));
    host.appendChild(plus1);

    var b1note = S.label(285, 124, 'reads a normalised copy, writes a correction', { anchor: 'middle', small: true });
    b1note.setAttribute('opacity', 0);
    host.appendChild(b1note);

    /* branch 2 — MLP, below the stream */
    var tap2 = S.e('path', {
      d: 'M520,150 V245 H544', fill: 'none', stroke: 'var(--c-data)',
      'stroke-width': 2, opacity: 0
    });
    host.appendChild(tap2);
    var norm2 = S.box(550, 220, 110, 50, { title: 'RMSNorm', role: 'param' });
    var a2 = S.arrow(664, 245, 682, 245, { role: 'data' });
    var mlp = S.box(685, 220, 150, 50, { title: 'SwiGLU MLP', role: 'param' });
    var ret2 = S.e('path', {
      d: 'M835,245 H858 V164', fill: 'none', stroke: 'var(--c-data)',
      'stroke-width': 2, opacity: 0
    });
    host.appendChild(norm2); host.appendChild(a2); host.appendChild(mlp); host.appendChild(ret2);

    var plus2 = S.g({ opacity: 0 });
    S.add(plus2, S.e('circle', { cx: 858, cy: 150, r: 14, fill: 'var(--bg)', stroke: 'var(--c-data)', 'stroke-width': 2 }));
    S.add(plus2, S.e('text', { x: 858, y: 156, 'text-anchor': 'middle', class: 'dg-mono', 'font-size': 16, fill: 'var(--c-data)' }, '+'));
    host.appendChild(plus2);

    var b2note = S.label(692, 292, 'most of the parameters of the model live here', { anchor: 'middle', small: true });
    b2note.setAttribute('opacity', 0);
    host.appendChild(b2note);

    var outLbl = S.label(880, 132, 'on to the next block  · × N', { anchor: 'end', mono: true, size: 12.5, role: 'ok' });
    outLbl.setAttribute('opacity', 0);
    host.appendChild(outLbl);

    var preNote = S.label(285, 34, 'the norm sits inside the branch, not on the stream', { anchor: 'middle', small: true, role: 'param' });
    preNote.setAttribute('opacity', 0);
    host.appendChild(preNote);

    /* the backward pass */
    var back = S.arrow(880, 110, 60, 110, { role: 'grad', dashed: true });
    var backLbl = S.label(470, 98, 'gradient, on the way back', { anchor: 'middle', small: true, role: 'grad' });
    backLbl.setAttribute('opacity', 0);
    host.appendChild(back); host.appendChild(backLbl);

    /* --- steps ------------------------------------------------------------ */
    tl.step('The block starts and ends on the same wire. Shape <span class="kw">(B, T, d)</span> in, the same shape out. Call it the <b>residual stream</b>.');
    tl.to([road, inDot, inLbl], { opacity: 1, duration: 0.4, stagger: 0.08 });
    tl.to(roadLbl, { opacity: 1, duration: 0.3 });

    tl.step('Attention does not consume the stream. It reads a <b>normalised copy</b> of it. RMSNorm divides by the root mean square of the vector — no mean, no bias, half the parameters of LayerNorm.');
    tl.to(tap1, { opacity: 1, duration: 0.35 });
    tl.to(norm1, { opacity: 1, duration: 0.35 }, '-=0.1');
    tl.to([a1, attn], { opacity: 1, duration: 0.35, stagger: 0.1 });

    tl.step('Its output is <b>added back</b>. The stream is edited, never replaced — so information from the embedding is still present at layer 36.');
    tl.to(ret1, { opacity: 1, duration: 0.35 });
    tl.to(plus1, { opacity: 1, duration: 0.3 }, '-=0.1');
    tl.to(b1note, { opacity: 1, duration: 0.3 });
    k.pulse(tl, plus1, { scale: 1.2 });

    tl.step('The MLP — the feed-forward network — repeats the pattern: normalise, transform, add. <b>SwiGLU</b> uses two matrices going up, one of them a gate, and one matrix coming back down.');
    tl.to(tap2, { opacity: 1, duration: 0.35 });
    tl.to(norm2, { opacity: 1, duration: 0.35 }, '-=0.1');
    tl.to([a2, mlp], { opacity: 1, duration: 0.35, stagger: 0.1 });
    tl.to([ret2, plus2], { opacity: 1, duration: 0.35, stagger: 0.1 });
    tl.to([b2note, outLbl], { opacity: 1, duration: 0.3 }, '-=0.1');

    tl.step('Notice <b>where</b> the norms are: inside each branch, not on the stream. That is pre-norm. Put them on the stream instead and you need a learning-rate warmup and the model becomes unstable as it gets deeper.');
    tl.to(preNote, { opacity: 1, duration: 0.35 });
    k.pulse(tl, [norm1, norm2], { scale: 1.08 });

    tl.step('Now run it backwards. The gradient travels the whole stream with <b>nothing multiplying it</b>. Lesson 02 showed gradients shrinking through a chain of matrices; this unbroken path is why 36 layers train at all.');
    k.dim(tl, [norm1, attn, norm2, mlp, b1note, b2note, preNote], { to: 0.3 });
    tl.to(back, { opacity: 1, duration: 0.3 }, '<');
    k.draw(tl, back.querySelector('line'), { duration: 1.0, ease: 'none' });
    tl.to(backLbl, { opacity: 1, duration: 0.3 }, '-=0.4');
    k.tint(tl, road, 'grad', { stroke: true, duration: 0.5 });
  });

})();
