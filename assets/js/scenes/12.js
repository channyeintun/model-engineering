/* =========================================================================
   Lesson 12 — Tiny speech synthesis. Six scenes:

     tts-pipeline   text → normalised text → phonemes → mel → waveform
     tts-normalise  what a voice must actually say
     tts-duration   the length regulator, and where rhythm comes from
     tts-vocoder    the missing phase, and two ways to invent it
     tts-stream     one shot versus chunked, on a time axis
     tts-size       what you get at what file size, on a log axis

   Colour is meaning, everywhere: data = cyan, param = amber, loss = red,
   ok = green, frozen = grey.
   ========================================================================= */

(function () {
  'use strict';

  var S = window.SVG;

  /* Thousands separators, for the big element counts. */
  function group(v) {
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* A hand-built waveform path. `rough` adds high-frequency buzz. */
  function wavePath(x0, x1, cy, amp, seed, rough) {
    var n = 200, d = 'M' + x0 + ',' + cy.toFixed(1);
    for (var i = 1; i <= n; i++) {
      var t = i / n;
      var env = 0.32 + 0.68 * Math.sin(t * Math.PI);
      var y = cy + amp * env * Math.sin(t * 41 + seed);
      if (rough) y += amp * 0.30 * env * Math.sin(t * 233 + seed * 3);
      d += ' L' + (x0 + t * (x1 - x0)).toFixed(1) + ',' + y.toFixed(1);
    }
    return d;
  }

  /* ======================================================================
     Scene 1 — the whole pipeline, and where the numbers appear
     ====================================================================== */

  Scene.register('tts-pipeline', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#tp-plot');

    var ST = [
      { t: 'raw text',   s: '[1, 78]',      n: 'characters',        role: 'data' },
      { t: 'normalised', s: 'still text',   n: 'said, not written', role: 'data' },
      { t: 'phonemes',   s: '[1, 62]',      n: 'IPA symbols',       role: 'data' },
      { t: 'mel',        s: '[1, 80, 500]', n: '40,000 numbers',    role: 'data' },
      { t: 'waveform',   s: '[1, 128000]',  n: '5.3 s at 24 kHz',   role: 'ok' }
    ];

    var W = 148, H = 84, Y = 56, X0 = 26, GAP = 28;
    var boxes = [], arrows = [];

    ST.forEach(function (s, i) {
      var x = X0 + i * (W + GAP);
      var b = S.box(x, Y, W, H, { title: s.t, sub: s.s, note: s.n, role: s.role });
      host.appendChild(b);
      boxes.push(b);
      if (i > 0) {
        var a = S.arrow(x - 26, Y + H / 2, x - 5, Y + H / 2, { role: 'data' });
        host.appendChild(a);
        arrows.push(a);
      }
    });

    var BX = 100, BY = 240, BW = 760, BH = 18;
    host.appendChild(S.label(BX, 228, 'numbers in this tensor', { small: true }));
    host.appendChild(S.e('rect', {
      x: BX, y: BY, width: BW, height: BH, rx: 9, fill: 'var(--surface-3)'
    }));
    var fill = S.e('rect', {
      x: BX, y: BY, width: 0.6, height: BH, rx: 9, fill: 'var(--c-data)'
    });
    host.appendChild(fill);

    var readout = S.e('text', {
      x: 860, y: 228, 'text-anchor': 'end', class: 'dg-mono',
      'font-size': 15, fill: 'var(--c-data)'
    }, '78');
    host.appendChild(readout);

    var foot = S.label(BX, 282,
      'Linear scale. Full width = 128,000 samples.', { small: true, opacity: 0 });
    host.appendChild(foot);

    function widthFor(n) { return Math.max(0.6, n / 128000 * BW); }

    tl.step('You type a sentence. Seventy-eight characters, and no sound anywhere yet.');
    tl.to(boxes[0], { opacity: 1, duration: 0.45 });

    tl.step('<b>Text normalisation</b> rewrites it into what a voice must say out loud. Still text, but a different string.');
    tl.to(arrows[0], { opacity: 1, duration: 0.25 });
    tl.to(boxes[1], { opacity: 1, duration: 0.4 });

    tl.step('<b>Grapheme-to-phoneme</b> turns letters into 62 sound symbols. This short list is the entire input the acoustic model ever sees.');
    tl.to(arrows[1], { opacity: 1, duration: 0.25 });
    tl.to(boxes[2], { opacity: 1, duration: 0.4 });
    k.count(tl, readout, 78, 62, { duration: 0.4, format: group, position: '<' });

    tl.step('The <b>acoustic model</b> expands 62 symbols into 500 frames of a mel spectrogram. That is 40,000 numbers.');
    tl.to(arrows[2], { opacity: 1, duration: 0.25 });
    tl.to(boxes[3], { opacity: 1, duration: 0.4 });
    tl.to(fill, { attr: { width: widthFor(40000) }, duration: 0.7, ease: 'power2.out' }, '<');
    k.count(tl, readout, 62, 40000, { duration: 0.7, format: group, position: '<' });

    tl.step('The <b>vocoder</b> turns those 500 frames into 128,000 audio samples — about 2000 samples for every phoneme.');
    tl.to(arrows[3], { opacity: 1, duration: 0.25 });
    tl.to(boxes[4], { opacity: 1, duration: 0.4 });
    tl.to(fill, { attr: { width: BW }, duration: 0.9, ease: 'power2.out' }, '<');
    k.count(tl, readout, 40000, 128000, { duration: 0.9, format: group, position: '<' });

    tl.step('Now look at the bar. The three text stages produce almost nothing. Nearly all the arithmetic in a speech synthesiser happens after the phonemes.');
    tl.to(foot, { opacity: 1, duration: 0.35 });
    k.pulse(tl, fill, { scale: 1.04 });
    k.dim(tl, [boxes[0], boxes[1], boxes[2]], { to: 0.4 });
  });

  /* ======================================================================
     Scene 2 — text normalisation
     ====================================================================== */

  Scene.register('tts-normalise', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#tn-plot');

    var words = ['Dr.', 'Smith', 'paid', '$4.50', 'on', '3/4/26'];
    var row = S.tokens(76, 40, words, { w: 118, h: 38, gap: 8, opacity: 0 });
    host.appendChild(row);

    var HARD = [
      { i: 0, say: 'Doctor',                         note: 'title, not "Drive"' },
      { i: 3, say: 'four dollars fifty cents',       note: 'symbol first, spoken last' },
      { i: 5, say: 'March fourth twenty twenty six', note: 'US order — in the UK, 3 April' }
    ];

    HARD.forEach(function (h) {
      var cx = row.cells[h.i].cx;
      h.arrow = S.arrow(cx, 84, cx, 106, { role: 'ok' });
      host.appendChild(h.arrow);
      h.sayEl = S.e('text', {
        x: cx, y: 126, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 13, fill: 'var(--c-ok)', opacity: 0
      }, h.say);
      host.appendChild(h.sayEl);
      h.noteEl = S.e('text', {
        x: cx, y: 147, 'text-anchor': 'middle', class: 'dg-label dg-label--sm', opacity: 0
      }, h.note);
      host.appendChild(h.noteEl);
    });

    var outLabel = S.label(76, 176, 'what every later stage actually receives',
      { small: true, opacity: 0 });
    host.appendChild(outLabel);

    var out = S.e('text', {
      x: 450, y: 200, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 13.5, fill: 'var(--c-ok)', opacity: 0
    }, 'Doctor Smith paid four dollars fifty cents on March fourth twenty twenty six.');
    host.appendChild(out);

    var warn = S.e('text', {
      x: 450, y: 234, 'text-anchor': 'middle', class: 'dg-label dg-label--sm',
      fill: 'var(--c-loss)', opacity: 0
    }, 'Get this string wrong and every later stage does its job perfectly — on the wrong words.');
    host.appendChild(warn);

    tl.step('Six words. Three of them are not what a voice has to say.');
    tl.set(row, { opacity: 1 });
    k.appear(tl, row.cells.map(function (c) { return c.g; }), { stagger: 0.06, y: 6 });

    tl.step('<span class="kw">Dr.</span> is a title here. In "12 Oak Dr." the same three characters mean Drive. A rule decides, and the rule needs the words around it.');
    tl.to(HARD[0].arrow, { opacity: 1, duration: 0.25 });
    tl.to([HARD[0].sayEl, HARD[0].noteEl], { opacity: 1, duration: 0.35 });
    tl.to(row.cells[0].rect, {
      stroke: 'var(--c-loss)', fill: 'var(--c-loss-dim)', duration: 0.35
    }, '<');

    tl.step('The currency symbol is written <b>before</b> the number and spoken <b>after</b> it. Nothing in the characters tells you that.');
    tl.to(HARD[1].arrow, { opacity: 1, duration: 0.25 });
    tl.to([HARD[1].sayEl, HARD[1].noteEl], { opacity: 1, duration: 0.35 });
    tl.to(row.cells[3].rect, {
      stroke: 'var(--c-loss)', fill: 'var(--c-loss-dim)', duration: 0.35
    }, '<');

    tl.step('<span class="kw">3/4/26</span> has no single correct reading. March fourth in the United States, the third of April in the United Kingdom. Your locale is part of the model.');
    tl.to(HARD[2].arrow, { opacity: 1, duration: 0.25 });
    tl.to([HARD[2].sayEl, HARD[2].noteEl], { opacity: 1, duration: 0.35 });
    tl.to(row.cells[5].rect, {
      stroke: 'var(--c-loss)', fill: 'var(--c-loss-dim)', duration: 0.35
    }, '<');

    tl.step('This expanded string is the real input to the pipeline. Normalisation is regular expressions and locale rules, not a neural network — so no amount of training will rescue it.');
    tl.to([outLabel, out], { opacity: 1, duration: 0.4 });
    tl.to(warn, { opacity: 1, duration: 0.4 }, '+=0.15');
    k.dim(tl, row, { to: 0.45, position: '<' });
  });

  /* ======================================================================
     Scene 3 — duration prediction and the length regulator
     ====================================================================== */

  Scene.register('tts-duration', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#td-plot');

    var PH = ['m', 'ɒ', 'd', 'ə', 'l'];
    var D  = [5, 14, 6, 4, 12];   /* frames per phoneme, sum 41 */
    var D2 = [4, 11, 5, 3, 10];   /* the same durations at 0.8, sum 33 */
    var TOT = 41;
    var X0 = 60, CELL = 17, GAP = 2.5, STEP = CELL + GAP;   /* 19.5 px per frame */

    function starts(list) {
      var out = [], acc = 0;
      list.forEach(function (d) { out.push(acc); acc += d; });
      return out;
    }

    host.appendChild(S.label(60, 32, 'encoder output — one vector per phoneme', { small: true }));
    var rlabel = S.label(857, 32, 'predicted duration, in frames',
      { small: true, anchor: 'end', opacity: 0 });
    host.appendChild(rlabel);

    var pills = [], dnums = [];
    PH.forEach(function (p, i) {
      var x = X0 + i * 160, w = 150;
      var g = S.g({ opacity: 0 });
      var r = S.e('rect', {
        x: x, y: 44, width: w, height: 34, rx: 17,
        fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', 'stroke-width': 1.5
      });
      var t = S.e('text', {
        x: x + w / 2, y: 67, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 15, fill: 'var(--c-data)'
      }, p);
      S.add(g, r, t);
      host.appendChild(g);
      pills.push({ g: g, rect: r, text: t });

      var n = S.e('text', {
        x: x + w / 2, y: 100, 'text-anchor': 'middle', class: 'dg-mono',
        'font-size': 13, fill: 'var(--c-data)', opacity: 0
      }, String(D[i]));
      host.appendChild(n);
      dnums.push(n);
    });

    var strip = S.matrix(X0, 116, 1, TOT, {
      cell: CELL, gap: GAP, fill: 'var(--c-data-dim)',
      stroke: 'var(--c-data)', cellOpacity: 0
    });
    host.appendChild(strip);

    host.appendChild(S.e('line', {
      x1: X0, y1: 150, x2: 857, y2: 150, stroke: 'var(--line)', 'stroke-width': 1.4
    }));
    host.appendChild(S.e('text', {
      x: 60, y: 170, class: 'dg-mono dg-label--sm'
    }, '0 ms'));
    var endTick = S.e('text', {
      x: 857, y: 170, 'text-anchor': 'end', class: 'dg-mono dg-label--sm'
    }, '437 ms');
    host.appendChild(endTick);
    host.appendChild(S.e('text', {
      x: 458, y: 170, 'text-anchor': 'middle', class: 'dg-label dg-label--sm'
    }, '10.7 ms per frame'));

    var panel = S.g({ opacity: 0 });
    S.add(panel, S.e('rect', {
      x: 60, y: 192, width: 290, height: 68, rx: 12,
      fill: 'var(--surface-2)', stroke: 'var(--line)', 'stroke-width': 1.4
    }));
    S.add(panel, S.e('text', { x: 78, y: 218, class: 'dg-label dg-label--sm' }, 'total frames'));
    var vFrames = S.e('text', {
      x: 332, y: 220, 'text-anchor': 'end', class: 'dg-mono',
      'font-size': 18, fill: 'var(--c-data)'
    }, '41');
    S.add(panel, vFrames);
    S.add(panel, S.e('text', { x: 78, y: 246, class: 'dg-label dg-label--sm' }, 'audio length'));
    var vMs = S.e('text', {
      x: 332, y: 248, 'text-anchor': 'end', class: 'dg-mono',
      'font-size': 18, fill: 'var(--c-data)'
    }, '437 ms');
    S.add(panel, vMs);
    host.appendChild(panel);

    var notes = [
      'targets come from a forced aligner, run before training',
      'the length regulator has no weights at all',
      'scale every duration and the same words come out faster'
    ].map(function (txt, i) {
      var t = S.label(382, 206 + i * 24, '·  ' + txt, { small: true, opacity: 0 });
      host.appendChild(t);
      return t;
    });

    function reflow(list, tag) {
      var st = starts(list);
      list.forEach(function (d, i) {
        var x = X0 + st[i] * STEP, w = d * STEP - 3;
        tl.to(pills[i].rect, { attr: { x: x, width: w }, duration: 0.7, ease: 'power2.inOut' },
              i === 0 ? tag : '<');
        tl.to(pills[i].text, { attr: { x: x + w / 2 }, duration: 0.7, ease: 'power2.inOut' }, '<');
        tl.to(dnums[i], { attr: { x: x + w / 2 }, duration: 0.7, ease: 'power2.inOut' }, '<');
      });
    }

    tl.step('The encoder gives one vector per phoneme. A phoneme carries no length of its own, so at this point every symbol is the same size.');
    tl.to(pills.map(function (p) { return p.g; }), { opacity: 1, duration: 0.4, stagger: 0.07 });

    tl.step('A small <b>duration predictor</b> reads each vector and says how many mel frames that sound should occupy. Its targets come from a <b>forced aligner</b> run over the training recordings, and the loss is squared error on <span class="kw">log(d + 1)</span>.');
    tl.to(rlabel, { opacity: 1, duration: 0.3 });
    tl.to(dnums, { opacity: 1, duration: 0.35, stagger: 0.06 });
    tl.to(notes[0], { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('The <b>length regulator</b> then repeats each vector that many times. That is all it is: one call to <span class="kw">repeat_interleave</span>, with no learned parameters.');
    reflow(D, undefined);
    tl.to(strip.flat, { opacity: 1, duration: 0.35, stagger: 0.012 }, '-=0.3');
    tl.to(notes[1], { opacity: 1, duration: 0.3 }, '<');

    tl.step('Forty-one frames at 93.75 frames per second is 437 ms of audio. The rhythm of the word <b>is</b> this list of integers. Nothing else decides it.');
    tl.to(panel, { opacity: 1, duration: 0.4 });
    k.pulse(tl, vMs, { scale: 1.2 });

    tl.step('Because the total length is known before any frame exists, all 41 frames come out of <b>one</b> forward pass. An autoregressive decoder would need 41 steps, one after another.');
    k.pulse(tl, strip.flat, { scale: 1.25, stagger: 0.008 });

    tl.step('Multiply every duration by 0.8 and the same words are spoken faster, with no retraining. Piper exposes exactly this knob as <span class="kw">length_scale</span>.');
    reflow(D2, undefined);
    tl.to(strip.flat.slice(33), { opacity: 0.12, duration: 0.5 }, '<');
    tl.call(function () {
      D2.forEach(function (d, i) { dnums[i].textContent = String(d); });
      endTick.textContent = '352 ms';
    }, null, '<');
    k.count(tl, vFrames, 41, 33, { duration: 0.6, position: '<' });
    k.count(tl, vMs, 437, 352, {
      duration: 0.6, position: '<',
      format: function (v) { return Math.round(v) + ' ms'; }
    });
    tl.to(notes[2], { opacity: 1, duration: 0.3 });
  });

  /* ======================================================================
     Scene 4 — the vocoder and the missing phase
     ====================================================================== */

  Scene.register('tts-vocoder', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#tv-plot');

    /* --- magnitude: a small mel spectrogram --------------------------- */
    host.appendChild(S.label(40, 44, 'magnitude — 80 mel bands × 500 frames', { small: true }));
    var mag = S.matrix(40, 54, 5, 14, {
      cell: 14, gap: 2, fill: 'var(--c-data-dim)',
      stroke: 'var(--c-data)', cellOpacity: 0
    });
    host.appendChild(mag);

    /* A deterministic "energy" pattern, so the block reads as a spectrogram. */
    var energy = mag.flat.map(function (cell, i) {
      var r = Math.floor(i / 14), c = i % 14;
      var v = Math.abs(Math.sin(c * 0.9 + r * 1.7) * Math.cos(r * 0.6 - c * 0.25));
      return 0.22 + 0.78 * Math.min(1, v);
    });

    /* --- phase: the panel that is not in the file --------------------- */
    var phLabel = S.label(40, 166, 'phase — thrown away by the transform',
      { small: true, opacity: 0 });
    host.appendChild(phLabel);
    var phase = S.matrix(40, 176, 5, 14, {
      cell: 14, gap: 2, fill: 'var(--surface-3)',
      stroke: 'var(--c-frozen)', cellOpacity: 0
    });
    host.appendChild(phase);
    var phNote = S.e('text', {
      x: 40, y: 274, class: 'dg-label dg-label--sm', fill: 'var(--c-frozen)', opacity: 0
    }, 'the spectrogram file does not contain it');
    host.appendChild(phNote);

    /* --- the two ways to invent it ------------------------------------ */
    var voc = S.box(320, 100, 176, 84, { title: 'neural vocoder', sub: 'HiFi-GAN', role: 'param' });
    host.appendChild(voc);
    var gl = S.box(320, 222, 176, 52, { title: 'Griffin-Lim', role: 'frozen' });
    host.appendChild(gl);

    var aMagVoc = S.arrow(266, 92, 314, 128, { role: 'data' });
    var aMagGl  = S.arrow(266, 126, 314, 240, { role: 'frozen', dashed: true });
    var aInvent = S.arrow(316, 178, 268, 204, { role: 'data', dashed: true });
    var aVocOut = S.arrow(500, 142, 548, 142, { role: 'ok' });
    var aGlOut  = S.arrow(500, 250, 548, 250, { role: 'frozen' });
    [aMagVoc, aMagGl, aInvent, aVocOut, aGlOut].forEach(function (a) { host.appendChild(a); });

    /* --- the two waveforms -------------------------------------------- */
    host.appendChild(S.label(556, 100, 'learned phase', { small: true }));
    var wNeural = S.e('path', {
      d: wavePath(556, 870, 142, 30, 0.4, false), fill: 'none',
      stroke: 'var(--c-ok)', 'stroke-width': 1.8, 'stroke-linejoin': 'round', opacity: 0
    });
    host.appendChild(wNeural);

    var glLabel = S.label(556, 222, 'guessed phase', { small: true, opacity: 0 });
    host.appendChild(glLabel);
    var wGl = S.e('path', {
      d: wavePath(556, 870, 252, 15, 1.1, true), fill: 'none',
      stroke: 'var(--c-frozen)', 'stroke-width': 1.6, 'stroke-linejoin': 'round', opacity: 0
    });
    host.appendChild(wGl);

    var stats = [
      '167.9× real time on a V100',
      '13.4× real time on a CPU, light variant'
    ].map(function (t, i) {
      var el = S.label(556, 190 + i * 17, t, { small: true, opacity: 0 });
      host.appendChild(el);
      return el;
    });

    tl.step('A mel spectrogram is a table of <b>magnitudes</b>: how much energy each of 80 frequency bands holds in each 10.7 ms frame.');
    tl.to(mag.flat, {
      opacity: function (i) { return energy[i]; },
      duration: 0.4, stagger: 0.008
    });

    tl.step('The transform that made it also produced a <b>phase</b> for every bin — where each wave sits in time. Taking the magnitude threw all of that away.');
    tl.to(phLabel, { opacity: 1, duration: 0.3 });
    tl.to(phase.flat, { opacity: 1, duration: 0.35, stagger: 0.008 });
    tl.to(phNote, { opacity: 1, duration: 0.3 }, '-=0.2');

    tl.step('So the transform cannot be run backwards. Something must <b>invent</b> a phase that is consistent between overlapping frames. That invention is the vocoder\'s whole job.');
    k.pulse(tl, phase.flat, { scale: 1.12, stagger: 0.006 });

    tl.step('<b>Griffin-Lim</b> invents it by iteration: go to audio, come back, keep the magnitude you were given, keep the phase you just got. Thirty-two to sixty rounds. It needs no training and it sounds metallic.');
    tl.to(aMagGl, { opacity: 1, duration: 0.3 });
    tl.to(gl, { opacity: 1, duration: 0.35 });
    tl.to([glLabel, aGlOut], { opacity: 1, duration: 0.3 });
    tl.to(wGl, { opacity: 1, duration: 0.01 });
    k.draw(tl, wGl, { duration: 1.2, ease: 'none' });

    tl.step('A <b>neural vocoder</b> learns the mapping instead, trained against a <b>discriminator</b> — a second network whose only job is to tell real recordings from generated ones. HiFi-GAN reshapes the waveform by period (2, 3, 5, 7, 11) so that judge can hear pitch periodicity a plain distance loss never sees.');
    tl.to(aMagVoc, { opacity: 1, duration: 0.3 });
    tl.to(voc, { opacity: 1, duration: 0.35 });
    tl.to([aInvent, aVocOut], { opacity: 1, duration: 0.3 });
    tl.to(phase.flat, {
      fill: 'var(--c-data-dim)', stroke: 'var(--c-data)', duration: 0.5
    }, '<');
    tl.to(wNeural, { opacity: 1, duration: 0.01 });
    k.draw(tl, wNeural, { duration: 1.2, ease: 'none' });
    k.dim(tl, [wGl, gl, glLabel], { to: 0.35, position: '<' });

    tl.step('HiFi-GAN reported 167.9 times real time on a V100, and a lightweight variant reached 13.4 times real time on a CPU. Even so, on a phone this is normally the slowest stage — it produces about 2000 samples per phoneme.');
    tl.to(stats, { opacity: 1, duration: 0.35, stagger: 0.12 });
    k.pulse(tl, voc, { scale: 1.06 });
  });

  /* ======================================================================
     Scene 5 — streaming, and time to first audio
     ====================================================================== */

  Scene.register('tts-stream', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#ts-plot');

    var X0 = 80, SPAN = 780, MAX = 4400;
    function x(ms) { return X0 + ms / MAX * SPAN; }

    /* ---- row A: one shot --------------------------------------------- */
    var aLabel = S.label(80, 34, 'one shot — build the whole paragraph, then play', { small: true });
    host.appendChild(aLabel);

    var aCompute = S.e('rect', {
      x: X0, y: 44, width: 0, height: 24, rx: 6,
      fill: 'var(--c-loss-dim)', stroke: 'var(--c-loss)', 'stroke-width': 1.4
    });
    host.appendChild(aCompute);
    var aComputeTxt = S.e('text', {
      x: 434, y: 60, 'text-anchor': 'middle', class: 'dg-label dg-label--sm',
      fill: 'var(--c-loss)', opacity: 0
    }, '20 s of audio at RTF 0.2  =  4000 ms of compute');
    host.appendChild(aComputeTxt);

    var aAudio = S.e('rect', {
      x: x(4000), y: 72, width: 858 - x(4000), height: 24, rx: 6,
      fill: 'var(--c-ok-dim)', stroke: 'var(--c-ok)', 'stroke-width': 1.4, opacity: 0
    });
    host.appendChild(aAudio);

    var aMark = S.e('line', {
      x1: x(4000), y1: 38, x2: x(4000), y2: 100,
      stroke: 'var(--c-loss)', 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: 0
    });
    host.appendChild(aMark);
    var aMarkTxt = S.e('text', {
      x: x(4000) - 8, y: 114, 'text-anchor': 'end', class: 'dg-mono',
      'font-size': 13, fill: 'var(--c-loss)', opacity: 0
    }, 'first audio · 4000 ms');
    host.appendChild(aMarkTxt);

    /* ---- row B: chunked ---------------------------------------------- */
    var bLabel = S.label(80, 140, 'chunked — one phrase at a time', { small: true, opacity: 0 });
    host.appendChild(bLabel);

    var chunks = [0, 1, 2].map(function (i) {
      var r = S.e('rect', {
        x: x(i * 200), y: 150, width: x(200) - X0 - 2, height: 24, rx: 5,
        fill: 'var(--c-loss-dim)', stroke: 'var(--c-loss)', 'stroke-width': 1.4, opacity: 0
      });
      host.appendChild(r);
      return r;
    });
    var bRest = S.e('rect', {
      x: x(600), y: 150, width: x(4000) - x(600), height: 24, rx: 5,
      fill: 'none', stroke: 'var(--c-loss)', 'stroke-width': 1.2,
      'stroke-dasharray': '4 5', opacity: 0
    });
    host.appendChild(bRest);
    var bRestTxt = S.e('text', {
      x: (x(600) + x(4000)) / 2, y: 167, 'text-anchor': 'middle',
      class: 'dg-label dg-label--sm', fill: 'var(--c-loss)', opacity: 0
    }, 'later chunks, built while chunk 1 is already playing');
    host.appendChild(bRestTxt);

    var bAudio = S.e('rect', {
      x: x(200), y: 178, width: 0, height: 24, rx: 6,
      fill: 'var(--c-ok-dim)', stroke: 'var(--c-ok)', 'stroke-width': 1.4
    });
    host.appendChild(bAudio);
    var bAudioTxt = S.e('text', {
      x: 500, y: 194, 'text-anchor': 'middle', class: 'dg-label dg-label--sm',
      fill: 'var(--c-ok)', opacity: 0
    }, 'audio playing');
    host.appendChild(bAudioTxt);

    var bMark = S.e('line', {
      x1: x(200), y1: 144, x2: x(200), y2: 206,
      stroke: 'var(--c-ok)', 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: 0
    });
    host.appendChild(bMark);
    var bMarkTxt = S.e('text', {
      x: x(200) + 8, y: 220, class: 'dg-mono', 'font-size': 13,
      fill: 'var(--c-ok)', opacity: 0
    }, 'first audio · 200 ms');
    host.appendChild(bMarkTxt);

    /* ---- axis --------------------------------------------------------- */
    host.appendChild(S.e('line', {
      x1: X0, y1: 240, x2: 860, y2: 240, stroke: 'var(--line)', 'stroke-width': 1.4
    }));
    [0, 1000, 2000, 3000, 4000].forEach(function (ms) {
      host.appendChild(S.e('line', {
        x1: x(ms), y1: 236, x2: x(ms), y2: 245, stroke: 'var(--line)', 'stroke-width': 1.4
      }));
      host.appendChild(S.e('text', {
        x: x(ms), y: 261, 'text-anchor': 'middle', class: 'dg-mono dg-label--sm'
      }, ms === 0 ? '0' : (ms / 1000) + ' s'));
    });

    var foot = S.label(80, 282,
      'Same model, same RTF. Only the order of the work changed.', { small: true, opacity: 0 });
    host.appendChild(foot);

    tl.step('One model, one machine. Its <b>real-time factor</b> is 0.2 — compute time divided by audio length. It produces one second of speech in 0.2 seconds, so it is five times faster than real time.');

    tl.step('Give it a whole 20-second paragraph and it works for 4000 ms before the last frame is finished.');
    tl.to(aCompute, { attr: { width: x(4000) - X0 }, duration: 1.1, ease: 'none' });
    tl.to(aComputeTxt, { opacity: 1, duration: 0.3 }, '-=0.5');

    tl.step('Only then can playback start. The user waited four seconds and heard nothing. RTF was excellent the whole time — <b>RTF is not the number a user feels</b>.');
    tl.to([aMark, aMarkTxt], { opacity: 1, duration: 0.35 });
    tl.to(aAudio, { opacity: 1, duration: 0.35 }, '<');

    tl.step('Now split the text at sentence or clause boundaries and synthesise only the first phrase: one second of audio, 200 ms of work.');
    k.dim(tl, [aCompute, aComputeTxt, aAudio, aMark, aMarkTxt, aLabel], { to: 0.3 });
    tl.to(bLabel, { opacity: 1, duration: 0.3 }, '<');
    tl.to(chunks[0], { opacity: 1, duration: 0.35 });
    tl.to([bMark, bMarkTxt], { opacity: 1, duration: 0.35 });

    tl.step('Play it at once and build chunk two while chunk one is in the ears. Time to first audio falls from 4000 ms to 200 ms, and the model did not get any faster.');
    tl.to(bAudio, { attr: { width: 858 - x(200) }, duration: 1.2, ease: 'none' });
    tl.to([chunks[1], chunks[2]], { opacity: 1, duration: 0.3, stagger: 0.15 }, '<');
    tl.to([bRest, bRestTxt], { opacity: 1, duration: 0.3 }, '<+=0.4');
    tl.to(bAudioTxt, { opacity: 1, duration: 0.3 }, '-=0.3');

    tl.step('Two things break here. Pitch resets at every boundary, so the speech sounds like glued clips. And if the instantaneous RTF ever rises above 1.0 the buffer empties and the audio stutters — keep 200 to 400 ms of audio in reserve.');
    tl.to(foot, { opacity: 1, duration: 0.35 });
    k.pulse(tl, [chunks[0], chunks[1], chunks[2]], { scale: 1.15, stagger: 0.06 });
  });

  /* ======================================================================
     Scene 6 — size versus what you actually get
     ====================================================================== */

  Scene.register('tts-size', function (ctx) {
    var tl = ctx.tl, q = ctx.q, k = ctx.k;
    var host = q('#tz-plot');

    var X0 = 80, SPAN = 760, DEC = 2.602;   /* 10 MB … about 4000 MB */
    function xOf(mb) { return X0 + (Math.log(mb) / Math.LN10 - 1) / DEC * SPAN; }

    var BANDS = [
      { a: 10,   b: 30,   role: 'data' },
      { a: 50,   b: 100,  role: 'ok' },
      { a: 250,  b: 350,  role: 'data' },
      { a: 500,  b: 1000, role: 'data' },
      { a: 3000, b: 4500, role: 'loss' }
    ].map(function (d) {
      var r = S.e('rect', {
        x: xOf(d.a), y: 48, width: xOf(d.b) - xOf(d.a), height: 44, rx: 8,
        fill: 'var(--c-' + d.role + '-dim)', stroke: 'var(--c-' + d.role + ')',
        'stroke-width': 1.4, opacity: 0
      });
      host.appendChild(r);
      return r;
    });

    var budget = S.e('line', {
      x1: xOf(100), y1: 42, x2: xOf(100), y2: 102,
      stroke: 'var(--c-ok)', 'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: 0
    });
    host.appendChild(budget);
    var budgetTxt = S.e('text', {
      x: xOf(100), y: 32, 'text-anchor': 'middle', class: 'dg-mono',
      'font-size': 12.5, fill: 'var(--c-ok)', opacity: 0
    }, 'budget for this project: 100 MB');
    host.appendChild(budgetTxt);

    var MODELS = [
      { mb: 25,   text: 'KittenTTS nano · 25 MB',   up: true },
      { mb: 60,   text: 'Piper voice · ~60 MB',     up: false },
      { mb: 86,   text: 'Kokoro q8f16 · 86 MB',     up: true },
      { mb: 262,  text: 'Supertonic 3 · 262 MB',    up: false },
      { mb: 326,  text: 'Kokoro fp32 · 326 MB',     up: true },
      { mb: 4000, text: 'Orpheus-3B Q8_0 · ≈ 4 GB', up: false, anchor: 'end' }
    ].map(function (m) {
      var mx = xOf(m.mb);
      var g = S.g({ opacity: 0 });
      S.add(g, S.e('circle', { cx: mx, cy: 126, r: 5, fill: 'var(--c-data)' }));
      S.add(g, S.e('line', {
        x1: mx, y1: m.up ? 119 : 133, x2: mx, y2: m.up ? 114 : 148,
        stroke: 'var(--c-data)', 'stroke-width': 1.2, opacity: 0.7
      }));
      S.add(g, S.e('text', {
        x: mx, y: m.up ? 110 : 158, 'text-anchor': m.anchor || 'middle',
        class: 'dg-mono', 'font-size': 11.5, fill: 'var(--text-soft)'
      }, m.text));
      host.appendChild(g);
      return g;
    });

    host.appendChild(S.e('line', {
      x1: X0, y1: 210, x2: 860, y2: 210, stroke: 'var(--line)', 'stroke-width': 1.4
    }));
    [[10, '10 MB', 'start'], [100, '100 MB', 'middle'],
     [1000, '1 GB', 'middle'], [4000, '4 GB', 'end']].forEach(function (t) {
      host.appendChild(S.e('line', {
        x1: xOf(t[0]), y1: 206, x2: xOf(t[0]), y2: 215,
        stroke: 'var(--line)', 'stroke-width': 1.4
      }));
      host.appendChild(S.e('text', {
        x: xOf(t[0]), y: 231, 'text-anchor': t[2], class: 'dg-mono dg-label--sm'
      }, t[1]));
    });
    host.appendChild(S.e('text', {
      x: 470, y: 255, 'text-anchor': 'middle', class: 'dg-label dg-label--sm'
    }, 'file size on disk · logarithmic'));

    var foot = S.label(80, 282,
      'Size on disk does not predict latency. Measure peak memory and time to first audio on the real device.',
      { small: true, opacity: 0 });
    host.appendChild(foot);

    tl.step('Every voice on this axis runs on a device. The axis is file size, and it is logarithmic — each step to the right is ten times bigger.');
    tl.to(MODELS, { opacity: 1, duration: 0.4, stagger: 0.09 });

    tl.step('Below 30 MB the speech is correct and clearly synthetic: flat rhythm, occasional mispronunciation. Good enough for navigation prompts and notifications. Not good enough for an audiobook.');
    tl.to(BANDS[0], { opacity: 1, duration: 0.4 });

    tl.step('Between 50 and 100 MB is the 2026 sweet spot. Piper is the fast, boring, safe choice; Kokoro sounds noticeably more natural and needs a heavier front end. Neither can copy a voice.');
    tl.to(BANDS[1], { opacity: 1, duration: 0.4 });
    k.dim(tl, BANDS[0], { to: 0.4, position: '<' });

    tl.step('If 100 MB is not enough: between 250 and 350 MB you reach near-commercial quality for short utterances. Supertonic 3 reports a real-time factor of 0.3 even on a Raspberry Pi.');
    tl.to(BANDS[2], { opacity: 1, duration: 0.4 });
    k.dim(tl, BANDS[1], { to: 0.4, position: '<' });

    tl.step('Above half a gigabyte you buy voice cloning and expressive rhythm, and you pay in latency. Above three billion parameters you are not on a phone at all — that is a laptop GPU or a server.');
    tl.to([BANDS[3], BANDS[4]], { opacity: 1, duration: 0.4, stagger: 0.2 });
    k.dim(tl, BANDS[2], { to: 0.4, position: '<' });

    tl.step('The dashed line is the budget for this lesson\'s project. Everything left of it fits — and in 2026 nothing right of it gives you both voice cloning and real-time speech on a budget phone.');
    tl.to([budget, budgetTxt], { opacity: 1, duration: 0.4 });
    tl.to(BANDS[1], { opacity: 1, duration: 0.4 }, '<');
    tl.to(foot, { opacity: 1, duration: 0.35 });
  });

})();
