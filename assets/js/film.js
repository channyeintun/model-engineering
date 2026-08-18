/* =========================================================================
   film.js — the narrated walkthrough.

   It is not a video file. It is the lesson's own animated figures, played in
   order, driven by a narration track, with captions. The figures are the very
   same DOM elements that live in the page: the player MOVES them into a
   cinema stage and puts them back afterwards, so nothing is duplicated and
   every animation already written works unchanged.

   Needs, per lesson NN:
     data/narration/NN.js         the script   (authored)
     data/narration/NN.timing.js  the timings  (generated with the audio)
     assets/audio/NN.m4a          the narration (generated)
     assets/audio/NN.vtt          the captions  (generated)

   With no audio it still runs: segments advance on a reading-speed estimate
   and the captions carry the explanation. That is the "silent film" mode.
   ========================================================================= */

(function () {
  'use strict';

  var WPM = 155;           // narration pace, for the silent-mode estimate
  var GAP = 0.35;          // breath between segments, matches the generator

  var ICON = {
    play:  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8v10.4c0 .5.6.8 1 .5l8-5.2c.4-.2.4-.8 0-1L5.5 2.3c-.4-.3-1 0-1 .5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="1"/><rect x="9" y="3" width="3" height="10" rx="1"/></svg>',
    prev:  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M12 3.2v9.6c0 .5-.6.8-1 .5L5.3 8.9a1 1 0 010-1.8L11 2.7c.4-.3 1 0 1 .5z"/><rect x="3" y="3" width="1.8" height="10" rx=".9"/></svg>',
    next:  '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 3.2v9.6c0 .5.6.8 1 .5l5.7-4.4a1 1 0 000-1.8L5 2.7c-.4-.3-1 0-1 .5z"/><rect x="11.2" y="3" width="1.8" height="10" rx=".9"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    cc:    '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3.5h12a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1v-7a1 1 0 011-1zm2.6 3a1.6 1.6 0 00-1.6 1.6v.3A1.6 1.6 0 004.6 10h.6a1.5 1.5 0 001.4-1H5.4a.6.6 0 01-.5.3h-.3a.7.7 0 01-.6-.7v-.3c0-.4.3-.7.6-.7h.3c.2 0 .4.1.5.3h1.2A1.5 1.5 0 005.2 6.5zm5 0A1.6 1.6 0 009 8.1v.3A1.6 1.6 0 0010.6 10h.6a1.5 1.5 0 001.4-1h-1.2a.6.6 0 01-.5.3h-.3a.7.7 0 01-.6-.7v-.3c0-.4.3-.7.6-.7h.3c.2 0 .4.1.5.3h1.2a1.5 1.5 0 00-1.4-1.4z"/></svg>'
  };

  var lesson = document.body.getAttribute('data-lesson');
  var script = (window.NARRATION || {})[lesson];
  if (!lesson || !script || !script.segments || !script.segments.length) return;

  var timing = (window.NARRATION_TIMING || {})[lesson] || null;
  var segs = script.segments;

  /* ---- merge authored script with generated timings ------------------- */

  var byId = {};
  (timing || []).forEach(function (t) { byId[t.id] = t; });

  var cursor = 0;
  segs.forEach(function (s) {
    var t = byId[s.id];
    if (t) { s.start = t.start; s.end = t.end; s.wordAt = t.w || null; }
    else {
      var words = (s.text || '').trim().split(/\s+/).length;
      var d = Math.max(2.2, (words / WPM) * 60) + (s.hold || 0);
      s.start = cursor; s.end = cursor + d;
      cursor = s.end + GAP;
    }
  });

  var TOTAL = segs.length ? segs[segs.length - 1].end : 0;
  var HAS_AUDIO = !!timing;

  /* ---- captions: lines, and a time for every word ---------------------
     A whole paragraph on screen at once is not a subtitle, so each segment is
     split into short lines and every word gets its own moment.

     When the audio exists, those moments were measured against it by
     tools/narrate.py: the pauses are real, so the highlight arrives on the
     word the voice is on. Without audio there is nothing to measure, and the
     fallback below shares a line's time out by word length — good enough to
     read along with a reading-speed estimate, which is all silent mode is. */

  var MAX_CHARS = 76;      // a comfortable subtitle line
  var MAX_WORDS = 12;

  /* Flatten caption HTML to words, remembering which were emphasised so the
     styling survives being re-wrapped one word per span. */
  function wordsOf(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    var out = [];
    (function walk(node, style) {
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/\s+/).forEach(function (w) {
            if (w) out.push({ w: w, s: style });
          });
        } else if (n.nodeType === 1) {
          var next = style;
          if (/^(B|STRONG|EM)$/.test(n.tagName)) next = 'em';
          else if (n.classList && n.classList.contains('kw')) next = 'kw';
          walk(n, next);
        }
      });
    })(d, '');
    return out;
  }

  function splitLines(words) {
    var lines = [], cur = [], chars = 0;
    for (var i = 0; i < words.length; i++) {
      cur.push(words[i]);
      chars += words[i].w.length + 1;
      var endsSentence = /[.!?]["')\]]?$/.test(words[i].w);
      var full = chars >= MAX_CHARS || cur.length >= MAX_WORDS;
      var enough = chars >= MAX_CHARS * 0.45;
      if ((endsSentence && enough) || full) { lines.push(cur); cur = []; chars = 0; }
    }
    if (cur.length) {
      /* avoid a lonely tail line */
      if (lines.length && cur.length <= 2) lines[lines.length - 1] = lines[lines.length - 1].concat(cur);
      else lines.push(cur);
    }
    return lines.length ? lines : [words];
  }

  /* Measured times. A word stays lit until the next one starts, so a pause
     leaves the word before it highlighted rather than blanking the line. */
  function timeFromAudio(s, lines, offsets) {
    var flat = [], i;
    lines.forEach(function (ln) { flat = flat.concat(ln); });
    if (flat.length !== offsets.length) return false;
    for (i = 0; i < flat.length; i++) {
      flat[i].start = s.start + offsets[i];
      flat[i].end = (i + 1 < flat.length) ? s.start + offsets[i + 1] : s.end;
    }
    lines.forEach(function (ln) {
      ln.start = ln[0].start;
      ln.end = ln[ln.length - 1].end;
    });
    return true;
  }

  /* No audio to measure: share each line's time out by word length. */
  function timeByLength(s, lines) {
    var dur = Math.max(0.4, s.end - s.start), total = 0;
    lines.forEach(function (ln) {
      ln.weight = ln.reduce(function (a, w) { return a + w.w.length + 1; }, 0);
      total += ln.weight;
    });
    var t = s.start;
    lines.forEach(function (ln) {
      ln.start = t;
      ln.end = t + dur * (ln.weight / total);
      var wt = ln.start;
      ln.forEach(function (w) {
        w.start = wt;
        wt += (ln.end - ln.start) * ((w.w.length + 1) / ln.weight);
        w.end = wt;
      });
      t = ln.end;
    });
  }

  segs.forEach(function (s) {
    var lines = splitLines(wordsOf(s.text));
    if (!s.wordAt || !timeFromAudio(s, lines, s.wordAt)) timeByLength(s, lines);
    s.lines = lines;
  });

  /* ---- build the overlay ---------------------------------------------- */

  var root, stage, capEl, playBtn, bar, barFill, barBuf, timeEl, idxEl, audio;
  var placeholder = document.createComment('film-slot');
  var moved = null;          // the figure currently on stage
  var cur = -1;              // current segment index
  var playing = false;
  var rafId = null;
  var t0 = 0;                // silent-mode clock origin
  var silentT = 0;           // silent-mode position
  var captionsOn = true;
  var lastSceneKey = '';

  function build() {
    root = document.createElement('div');
    root.className = 'film';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Narrated walkthrough');
    root.innerHTML =
      '<div class="film__bar">' +
        '<span class="film__badge">walkthrough</span>' +
        '<span class="film__title">' + (script.title || '') + '</span>' +
        '<span class="film__spacer"></span>' +
        '<button class="film__x" aria-label="Close the walkthrough">' + ICON.close + '</button>' +
      '</div>' +
      '<div class="film__stage" id="filmStage"></div>' +
      '<div class="film__cap" id="filmCap" aria-live="polite"></div>' +
      '<div class="film__ui">' +
        '<button class="film__btn" id="filmPrev" aria-label="Previous section">' + ICON.prev + '</button>' +
        '<button class="film__btn film__btn--main" id="filmPlay" aria-label="Play">' + ICON.play + '</button>' +
        '<button class="film__btn" id="filmNext" aria-label="Next section">' + ICON.next + '</button>' +
        '<span class="film__time" id="filmTime">0:00</span>' +
        '<div class="film__track" id="filmBar">' +
          '<div class="film__buffer"></div><div class="film__fill"></div>' +
        '</div>' +
        '<span class="film__time" id="filmIdx">1/' + segs.length + '</span>' +
        '<button class="film__btn film__btn--cc is-on" id="filmCC" aria-label="Hide captions" title="Captions">' + ICON.cc + '</button>' +
      '</div>';
    document.body.appendChild(root);

    stage = root.querySelector('#filmStage');
    capEl = root.querySelector('#filmCap');
    playBtn = root.querySelector('#filmPlay');
    bar = root.querySelector('#filmBar');
    barFill = bar.querySelector('.film__fill');
    barBuf = bar.querySelector('.film__buffer');
    timeEl = root.querySelector('#filmTime');
    idxEl = root.querySelector('#filmIdx');

    if (HAS_AUDIO) {
      audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.src = '../assets/audio/' + lesson + '.m4a';
      var track = document.createElement('track');
      track.kind = 'captions';
      track.srclang = 'en';
      track.label = 'English';
      track.src = '../assets/audio/' + lesson + '.vtt';
      track.default = true;
      audio.appendChild(track);
      root.appendChild(audio);
      audio.addEventListener('ended', function () { pause(); });
    }

    root.querySelector('.film__x').addEventListener('click', close);
    playBtn.addEventListener('click', function () { playing ? pause() : play(); });
    root.querySelector('#filmPrev').addEventListener('click', function () { jump(cur - 1); });
    root.querySelector('#filmNext').addEventListener('click', function () { jump(cur + 1); });
    root.querySelector('#filmCC').addEventListener('click', function () {
      captionsOn = !captionsOn;
      this.classList.toggle('is-on', captionsOn);
      this.setAttribute('aria-label', captionsOn ? 'Hide captions' : 'Show captions');
      capEl.style.visibility = captionsOn ? '' : 'hidden';
    });
    bar.addEventListener('click', function (e) {
      var r = bar.getBoundingClientRect();
      if (!r.width) return;                   // hidden or mid-transition: no target
      var frac = (e.clientX - r.left) / r.width;
      if (!isFinite(frac)) return;
      seek(Math.max(0, Math.min(1, frac)) * TOTAL);
    });

    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (!root || !root.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); jump(cur + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); jump(cur - 1); }
  }

  /* ---- moving the real figures in and out ------------------------------ */

  function putBack() {
    if (moved && placeholder.parentNode) {
      placeholder.parentNode.insertBefore(moved, placeholder);
      placeholder.parentNode.removeChild(placeholder);
      moved.classList.remove('is-filming');
      moved = null;
    }
  }

  function showScene(id) {
    var fig = document.querySelector('[data-scene="' + id + '"]');
    if (!fig || fig === moved) return;
    putBack();
    fig.parentNode.insertBefore(placeholder, fig);
    fig.classList.add('is-filming');
    stage.appendChild(fig);
    moved = fig;
    var inst = window.Scene && window.Scene.get(id);
    if (inst) inst.started = true;      // stop the page observer replaying it
  }

  /* ---- the clock ------------------------------------------------------- */

  /* A seek is refused while the target is not buffered yet: currentTime snaps
     back and the captions would then describe a different moment from the one
     you can hear. So we remember what was asked for, re-apply it as data
     arrives, and report the requested position until the audio gets there. */
  /* Seeking lives in assets/js/seek.js, with a fake element driving it in
     tools/test-seek.mjs. Three of this player's bugs were in there, all in
     states a browser will not reproduce on demand. */
  var seeker = window.Seek && window.Seek.create({
    audio: function () { return audio; },
    isPlaying: function () { return playing; },
    onWait: function (waiting) { if (root) root.classList.toggle('is-waiting', waiting); }
  });
  var TOL = (window.Seek && window.Seek.TOL) || 0.35;

  function seekAudio(t) { if (seeker) seeker.seek(t); }
  function pendingTarget() { return seeker ? seeker.target() : null; }

  function now() {
    if (HAS_AUDIO && audio) {
      /* While a seek is in flight, report where it is going rather than where
         the element still is. Cloudflare Pages ignores Range and answers every
         request with the whole file, so a seek past the downloaded part cannot
         land until the download gets there — longer than any timeout worth
         having. Reporting the element instead drags the scrub bar, the
         captions and the figures back to the old position, which reads as the
         seek having been refused. */
      var want = pendingTarget();
      if (want != null && Math.abs(audio.currentTime - want) > TOL) return want;
      return audio.currentTime;
    }
    if (playing) return silentT + (performance.now() - t0) / 1000;
    return silentT;
  }

  function indexAt(t) {
    for (var i = segs.length - 1; i >= 0; i--) if (t >= segs[i].start - 0.001) return i;
    return 0;
  }

  function fmt(s) {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  /* ---- title and end cards, so the stage is never blank --------------- */

  function lessonMeta() {
    var C = window.COURSE || { lessons: [], parts: [] };
    var i = C.lessons.findIndex(function (l) { return l.id === lesson; });
    var me = C.lessons[i];
    var part = me && C.parts.filter(function (p) { return p.id === me.part; })[0];
    return { me: me, part: part, next: C.lessons[i + 1] };
  }

  function showCard(kind) {
    putBack();
    var m = lessonMeta();
    var card = stage.querySelector('.film__card');
    if (!card) {
      card = document.createElement('div');
      card.className = 'film__card';
      stage.appendChild(card);
    }
    if (card.dataset.kind === kind) return;
    card.dataset.kind = kind;

    if (kind === 'end') {
      card.innerHTML =
        '<span class="film__card-kicker">End of lesson ' + lesson + '</span>' +
        '<h2 class="film__card-title">' + (m.me ? m.me.title : '') + '</h2>' +
        (m.me ? '<p class="film__card-sub">Now build it · <b>' + m.me.project + '</b></p>' : '') +
        (m.next ? '<p class="film__card-next">Next · Lesson ' + m.next.id + ' — ' + m.next.title + '</p>' : '');
    } else {
      card.innerHTML =
        '<span class="film__card-kicker">' + (m.part ? m.part.n + ' · ' + m.part.name : 'Model Engineering') + '</span>' +
        '<span class="film__card-num">' + lesson + '</span>' +
        '<h2 class="film__card-title">' + (m.me ? m.me.title : (script.title || '')) + '</h2>' +
        '<p class="film__card-sub">Narrated walkthrough · ' + fmt(TOTAL) + '</p>';
    }
    if (window.gsap && !Scene.reduced) {
      window.gsap.fromTo(card.children,
        { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
    }
  }

  function hideCard() {
    var card = stage.querySelector('.film__card');
    if (card) { card.remove(); }
  }

  /* ---- captions -------------------------------------------------------- */

  var renderedLine = null;
  var wordSpans = [];

  function lineAt(s, t) {
    var L = s.lines;
    for (var i = L.length - 1; i >= 0; i--) if (t >= L[i].start - 0.001) return L[i];
    return L[0];
  }

  function renderLine(line) {
    if (line === renderedLine) return;
    renderedLine = line;
    capEl.innerHTML = '';
    wordSpans = line.map(function (w) {
      var el = document.createElement('span');
      el.className = 'cap-w' + (w.s ? ' cap-w--' + w.s : '');
      el.textContent = w.w;
      capEl.appendChild(el);
      capEl.appendChild(document.createTextNode(' '));
      return el;
    });
  }

  function updateCaption(t) {
    var s = segs[cur];
    if (!s || !s.lines) return;
    var line = lineAt(s, t);
    renderLine(line);
    for (var i = 0; i < line.length; i++) {
      var w = line[i], el = wordSpans[i];
      if (!el) continue;
      var said = t >= w.end, nowW = !said && t >= w.start;
      if (el.__said !== said) { el.classList.toggle('is-said', said); el.__said = said; }
      if (el.__now !== nowW) { el.classList.toggle('is-now', nowW); el.__now = nowW; }
    }
  }

  function applySegment(i, force) {
    if (i === cur && !force) return;
    cur = i;
    var s = segs[i];
    if (!s) return;

    renderedLine = null;
    idxEl.textContent = (i + 1) + '/' + segs.length;

    if (s.scene) {
      hideCard();
      var key = s.scene + ':' + (s.step == null ? '-' : s.step);
      showScene(s.scene);
      var inst = window.Scene && window.Scene.get(s.scene);
      if (inst && key !== lastSceneKey) {
        lastSceneKey = key;
        if (s.step == null) inst.playAll();
        else inst.playStep(s.step);
      }
    } else {
      lastSceneKey = '';
      showCard(i >= segs.length - 1 ? 'end' : 'title');
    }
  }

  /* render() only draws. tick() owns the clock and the frame loop, and
     pause() owns the transport. Keeping those apart matters: an earlier
     version had tick() call pause() at the end of the track while pause()
     called tick(), which recursed until the stack blew. */
  function render(t) {
    applySegment(indexAt(t));
    updateCaption(t);
    barFill.style.width = (TOTAL ? (t / TOTAL) * 100 : 0) + '%';
    timeEl.textContent = fmt(t);
    /* How far you can actually seek to. Worth drawing, because on a host that
       ignores Range this trails the playhead for the first minute or so and
       a seek beyond it has to wait. */
    if (barBuf && HAS_AUDIO && audio && audio.buffered && audio.buffered.length) {
      var end = audio.buffered.end(audio.buffered.length - 1);
      barBuf.style.width = (TOTAL ? Math.min(1, end / TOTAL) * 100 : 0) + '%';
    }
  }

  function tick() {
    var t = now();
    var atEnd = t >= TOTAL;
    if (atEnd) t = TOTAL;
    render(t);
    if (atEnd) { if (playing) pause(); return; }
    if (playing) rafId = requestAnimationFrame(tick);
  }

  function play() {
    playing = true;
    playBtn.innerHTML = ICON.pause;
    playBtn.setAttribute('aria-label', 'Pause');
    if (HAS_AUDIO && audio) {
      audio.play().catch(function () { /* autoplay blocked: user will press again */ });
    } else {
      t0 = performance.now();
    }
    applySegment(cur < 0 ? 0 : cur, true);
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function pause() {
    var wasPlaying = playing;
    playing = false;
    playBtn.innerHTML = ICON.play;
    playBtn.setAttribute('aria-label', 'Play');
    if (HAS_AUDIO && audio) audio.pause();
    else if (wasPlaying) silentT = Math.min(TOTAL, now());
    cancelAnimationFrame(rafId);
    render(Math.min(TOTAL, now()));
  }

  function seek(t) {
    t = Math.max(0, Math.min(TOTAL - 0.05, t));
    if (HAS_AUDIO && audio) seekAudio(t);
    else { silentT = t; t0 = performance.now(); }
    lastSceneKey = '';
    renderedLine = null;
    applySegment(indexAt(t), true);
    updateCaption(t);
    if (!playing) render(t);
  }

  function jump(i) {
    i = Math.max(0, Math.min(segs.length - 1, i));
    seek(segs[i].start);
  }

  /* ---- open / close ---------------------------------------------------- */

  function open(atIndex) {
    if (!root) build();
    root.classList.add('is-open');
    document.body.classList.add('film-open');
    cur = -1; lastSceneKey = '';
    seek(segs[Math.max(0, Math.min(segs.length - 1, atIndex || 0))].start);
    root.focus();
    play();
  }

  function close() {
    pause();
    putBack();
    root.classList.remove('is-open');
    document.body.classList.remove('film-open');
    if (moved) putBack();
  }

  /* ---- the page entry points ------------------------------------------- */

  function inject() {
    var prose = document.querySelector('.prose');
    if (!prose) return;

    /* the "watch it" card, right after the outcomes box */
    var after = prose.querySelector('.outcomes') || prose.querySelector('.lesson-head');
    var card = document.createElement('div');
    card.className = 'watch';
    card.innerHTML =
      '<button class="watch__go" aria-label="Play the narrated walkthrough">' + ICON.play + '</button>' +
      '<div class="watch__body">' +
        '<span class="watch__label">Narrated walkthrough</span>' +
        '<p class="watch__desc">The figures of this lesson, in order, explained out loud.' +
        (HAS_AUDIO ? '' : ' <em>Audio not generated yet — captions only.</em>') + '</p>' +
      '</div>' +
      '<span class="watch__meta">' + fmt(TOTAL) + ' · ' + segs.length + ' parts' +
        (HAS_AUDIO ? '' : ' · silent') + '</span>';
    after.parentNode.insertBefore(card, after.nextSibling);
    card.querySelector('.watch__go').addEventListener('click', function () { open(0); });
    card.addEventListener('click', function (e) {
      if (e.target.closest('.watch__go')) return;
      open(0);
    });

    /* the transcript, at the end */
    var host = prose.querySelector('.terms') || prose.lastElementChild;
    var det = document.createElement('details');
    det.className = 'transcript';
    var rows = segs.map(function (s, i) {
      return '<li><button data-seg="' + i + '"><span class="transcript__t">' + fmt(s.start) + '</span>' +
             '<span class="transcript__x">' + s.text + '</span></button></li>';
    }).join('');
    det.innerHTML =
      '<summary>Transcript of the walkthrough <span class="muted">· ' + segs.length + ' parts, ' + fmt(TOTAL) + '</span></summary>' +
      '<ol class="transcript__list">' + rows + '</ol>';
    host.parentNode.insertBefore(det, host);
    det.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-seg]');
      if (!b) return;
      e.preventDefault();
      open(parseInt(b.getAttribute('data-seg'), 10));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();

  window.Film = {
    open: open, close: close, segments: segs, hasAudio: HAS_AUDIO,
    /* exposed so the transport can be driven and inspected from the console */
    seek: seek, at: function () { return now(); }, audio: function () { return audio; }
  };
})();
