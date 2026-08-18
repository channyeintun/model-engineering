/* =========================================================================
   course.js — the shell around the lessons.
   Builds the top bar, the sidebar, the "on this page" list and the footer
   from data/lessons.js, so a lesson file only has to contain the lesson.
   Also: theme, progress, code copying, syntax colours, self-check
   questions and glossary tooltips.
   ========================================================================= */

(function () {
  'use strict';

  var C = window.COURSE || { lessons: [], parts: [], extras: [] };
  var STORE = 'me.progress.v2';
  var THEME = 'me.theme';

  var root = document.documentElement;
  var here = document.body.getAttribute('data-lesson') || null;   // '01' … '13'
  var page = document.body.getAttribute('data-page') || null;     // 'home', 'glossary', …

  /* Lesson pages live in /lessons/, everything else at the root. */
  var UP = here ? '../' : '';

  /* ------------------------------------------------------------ progress */

  function read() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function write(o) {
    try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {}
  }
  var progress = read();
  function isDone(id) { return !!progress[id]; }
  function setDone(id, v) {
    if (v) progress[id] = Date.now(); else delete progress[id];
    write(progress); paint();
  }
  function doneCount() { return C.lessons.filter(function (l) { return isDone(l.id); }).length; }

  /* --------------------------------------------------------------- theme */

  function applyTheme(t) {
    if (t === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem(THEME, t); } catch (e) {}
  }
  var saved = null;
  try { saved = localStorage.getItem(THEME); } catch (e) {}
  if (saved) applyTheme(saved);

  /* ---------------------------------------------------------------- icons */

  var I = {
    sun:  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1"/></svg>',
    moon: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M13.4 9.6A5.8 5.8 0 016.4 2.6a.6.6 0 00-.8-.7 6.9 6.9 0 108.5 8.5.6.6 0 00-.7-.8z"/></svg>',
    menu: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>',
    check:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>'
  };

  /* --------------------------------------------------------------- topbar */

  function topbar() {
    if (document.querySelector('.topbar')) return;
    var el = document.createElement('header');
    el.className = 'topbar';
    el.innerHTML =
      '<button class="tb-btn menu-toggle" id="menuToggle" aria-label="Open the lesson list">' + I.menu + '</button>' +
      '<a class="brand" href="' + UP + 'index.html">' +
        '<span class="brand__mark" aria-hidden="true"></span>' +
        '<span class="brand__name">Model Engineering <span>· on-device</span></span>' +
      '</a>' +
      '<div class="topbar__spacer"></div>' +
      '<div class="tb-progress" title="Lessons you have marked as done">' +
        '<div class="tb-progress__track"><div class="tb-progress__fill" id="tbFill"></div></div>' +
        '<span id="tbCount">0/' + C.lessons.length + '</span>' +
      '</div>' +
      '<button class="tb-btn" id="themeToggle" aria-label="Switch between dark and light"></button>';
    document.body.insertBefore(el, document.body.firstChild);

    var tt = el.querySelector('#themeToggle');
    function paintTheme() {
      var light = root.getAttribute('data-theme') === 'light';
      tt.innerHTML = light ? I.moon : I.sun;
    }
    paintTheme();
    tt.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
      paintTheme();
    });

    var mt = el.querySelector('#menuToggle');
    mt.addEventListener('click', function () {
      var rail = document.querySelector('.rail');
      var scrim = document.querySelector('.scrim');
      if (!rail) return;
      var open = rail.classList.toggle('is-open');
      if (scrim) scrim.classList.toggle('is-open', open);
    });
  }

  /* ----------------------------------------------------------- side rail */

  function rail() {
    var host = document.querySelector('.rail');
    if (!host) return;
    var html = '';
    C.parts.forEach(function (p) {
      html += '<div class="rail__part"><div class="rail__part-label">' + p.n + ' · ' + p.name + '</div>';
      C.lessons.filter(function (l) { return l.part === p.id; }).forEach(function (l) {
        html += '<a class="rail__link" data-lesson-link="' + l.id + '" href="' + UP + 'lessons/' + l.id + '.html">' +
                  '<span class="rail__num">' + l.id + '</span>' +
                  '<span>' + l.short + '</span>' +
                '</a>';
      });
      html += '</div>';
    });
    html += '<div class="rail__meta">';
    html += '<a href="' + UP + 'index.html">Course home</a>';
    (C.extras || []).forEach(function (e) { html += '<a href="' + UP + e.href + '">' + e.label + '</a>'; });
    html += '</div>';
    host.innerHTML = html;

    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', function () {
      host.classList.remove('is-open'); scrim.classList.remove('is-open');
    });
    document.body.appendChild(scrim);
  }

  /* --------------------------------------------------- "on this page" toc */

  function toc() {
    var host = document.querySelector('.toc-rail');
    if (!host) return;
    /* Only real section headings — not the ones inside outcome boxes,
       project cards, callouts or self-check questions. */
    var heads = Array.prototype.slice.call(
      document.querySelectorAll('.prose h2[id], .prose h3[id]')
    ).filter(function (h) {
      return !h.closest('.outcomes, .project, .check, .callout, .scene, .compare, .terms');
    });
    if (heads.length < 3) { host.innerHTML = ''; return; }

    var html = '<nav class="toc"><span class="toc__label">On this page</span>';
    heads.forEach(function (h) {
      var t = h.querySelector('.h-num') ? h.textContent.replace(h.querySelector('.h-num').textContent, '') : h.textContent;
      html += '<a class="' + (h.tagName === 'H3' ? 'lvl-3' : 'lvl-2') + '" href="#' + h.id + '">' + t.trim() + '</a>';
    });
    html += '</nav>';
    host.innerHTML = html;

    var links = Array.prototype.slice.call(host.querySelectorAll('a'));
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    /* Pick the last heading that has passed the top of the screen. Watching
       for headings to cross a band misses every heading you jump over, which
       leaves nothing highlighted; this always resolves to exactly one. */
    var current = null;
    function mark() {
      var line = 96;                       // just below the top bar
      var found = heads[0];
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].getBoundingClientRect().top <= line) found = heads[i];
        else break;
      }
      if (found === current) return;
      current = found;
      links.forEach(function (a) { a.classList.remove('is-active'); });
      var a = byId[found.id];
      if (a) {
        a.classList.add('is-active');
        /* keep the highlighted item visible when the list itself scrolls */
        var nav = a.parentNode;
        if (nav.scrollHeight > nav.clientHeight) {
          var top = a.offsetTop - nav.clientHeight / 2;
          nav.scrollTop = Math.max(0, top);
        }
      }
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { mark(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    mark();
  }

  /* ---------------------------------------------------------- lesson foot */

  function foot() {
    if (!here) return;
    var main = document.querySelector('.main');
    if (!main || main.querySelector('.lesson-foot')) return;

    var i = C.lessons.findIndex(function (l) { return l.id === here; });
    var prev = i > 0 ? C.lessons[i - 1] : null;
    var next = i >= 0 && i < C.lessons.length - 1 ? C.lessons[i + 1] : null;

    var el = document.createElement('div');
    el.className = 'lesson-foot';
    el.innerHTML =
      '<button class="done-btn" id="doneBtn"></button>' +
      '<nav class="pager">' +
        (prev ? '<a href="' + prev.id + '.html"><span class="pager__dir">← Previous</span>' +
                '<span class="pager__title">' + prev.title + '</span></a>'
              : '<a class="pager__empty" href="#" aria-hidden="true" tabindex="-1"><span class="pager__dir">·</span><span class="pager__title">·</span></a>') +
        (next ? '<a href="' + next.id + '.html"><span class="pager__dir">Next →</span>' +
                '<span class="pager__title">' + next.title + '</span></a>'
              : '<a href="' + UP + 'index.html"><span class="pager__dir">Finished →</span>' +
                '<span class="pager__title">Back to the course map</span></a>') +
      '</nav>';
    main.appendChild(el);

    var btn = el.querySelector('#doneBtn');
    function paintBtn() {
      var d = isDone(here);
      btn.classList.toggle('is-done', d);
      btn.innerHTML = (d ? I.check + ' Lesson ' + here + ' is done' : 'Mark lesson ' + here + ' as done');
    }
    paintBtn();
    btn.addEventListener('click', function () { setDone(here, !isDone(here)); paintBtn(); });
  }

  /* ------------------------------------------------------- paint progress */

  function paint() {
    var n = doneCount(), total = C.lessons.length;
    var fill = document.getElementById('tbFill');
    var count = document.getElementById('tbCount');
    if (fill) fill.style.width = (total ? (n / total) * 100 : 0) + '%';
    if (count) count.textContent = n + '/' + total;

    document.querySelectorAll('[data-lesson-link]').forEach(function (a) {
      var id = a.getAttribute('data-lesson-link');
      a.classList.toggle('is-done', isDone(id));
      if (id === here) a.setAttribute('aria-current', 'page');
    });
    document.querySelectorAll('[data-card]').forEach(function (c) {
      c.classList.toggle('is-done', isDone(c.getAttribute('data-card')));
    });
    var hp = document.getElementById('homeProgress');
    if (hp) hp.textContent = n + ' of ' + total + ' lessons done';
  }

  /* ---------------------------------------------------------------- code */

  var KW = ('def class return if elif else for while in not and or import from as with try except finally raise ' +
            'lambda yield pass break continue None True False global nonlocal assert async await del is print ' +
            'const let var function new export default extends super this typeof instanceof void').split(' ');
  var KWRE = new RegExp('\\b(?:' + KW.join('|') + ')\\b');

  var TOKEN = new RegExp([
    '(#[^\\n]*)',                                   // 1 python comment
    '(//[^\\n]*)',                                  // 2 js comment
    '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\')',    // 3 docstring
    '("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)', // 4 string
    '(@[A-Za-z_][\\w.]*)',                          // 5 decorator
    '(\\b\\d[\\d_]*\\.?\\d*(?:[eE][-+]?\\d+)?\\b)', // 6 number
    '([A-Za-z_]\\w*)'                               // 7 word
  ].join('|'), 'g');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(src) {
    return src.replace(TOKEN, function (m, com1, com2, doc, str, dec, num, word, off, whole) {
      if (com1 || com2) return '<span class="tok-com">' + esc(m) + '</span>';
      if (doc || str)   return '<span class="tok-str">' + esc(m) + '</span>';
      if (dec)          return '<span class="tok-dec">' + esc(m) + '</span>';
      if (num)          return '<span class="tok-num">' + esc(m) + '</span>';
      if (word) {
        if (KWRE.test(word) && new RegExp('^(?:' + KW.join('|') + ')$').test(word)) {
          return '<span class="tok-kw">' + word + '</span>';
        }
        if (whole.charAt(off + m.length) === '(') return '<span class="tok-fn">' + word + '</span>';
        return word;
      }
      return esc(m);
    });
  }

  function code() {
    document.querySelectorAll('.code pre > code').forEach(function (el) {
      if (el.dataset.hl) return;
      el.dataset.hl = '1';
      el.innerHTML = highlight(el.textContent);
    });

    document.querySelectorAll('.code').forEach(function (box) {
      var head = box.querySelector('.code__head');
      if (!head || head.querySelector('.copy-btn')) return;
      var b = document.createElement('button');
      b.className = 'copy-btn'; b.type = 'button'; b.textContent = 'Copy';
      var lang = head.querySelector('.lang');
      if (lang) head.insertBefore(b, lang); else head.appendChild(b);
      b.addEventListener('click', function () {
        var pre = box.querySelector('pre');
        if (!pre) return;
        var text = pre.innerText;
        var done = function () {
          b.textContent = 'Copied'; b.classList.add('is-done');
          setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('is-done'); }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        } else {
          var ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      });
    });
  }

  /* --------------------------------------------------------- self-checks */

  function checks() {
    document.querySelectorAll('.check').forEach(function (box) {
      if (box.dataset.wired) return;
      box.dataset.wired = '1';
      var why = box.querySelector('.check__why');
      box.querySelectorAll('.check__opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
          var right = opt.hasAttribute('data-right');
          opt.classList.add(right ? 'is-right' : 'is-wrong');
          if (!right) {
            var r = box.querySelector('.check__opt[data-right]');
            if (r) r.classList.add('is-right');
          }
          box.querySelectorAll('.check__opt').forEach(function (o) { o.disabled = true; });
          if (why) why.classList.add('is-open');
        });
      });
    });
  }

  /* ------------------------------------------------------------- glossary */

  function glossary() {
    var G = window.GLOSSARY || {};
    var tip = null;

    function show(el) {
      var key = el.getAttribute('data-term') || el.textContent.trim().toLowerCase();
      var entry = G[key];
      if (!entry) return;
      hide();
      tip = document.createElement('div');
      tip.className = 'tip';
      tip.innerHTML = '<b>' + (entry.term || key) + '</b>' + entry.short;
      document.body.appendChild(tip);
      var r = el.getBoundingClientRect();
      var t = tip.getBoundingClientRect();
      var left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), window.innerWidth - t.width - 8);
      var top = r.top - t.height - 9;
      if (top < 8) top = r.bottom + 9;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      if (window.gsap) window.gsap.to(tip, { opacity: 1, duration: 0.16, y: 0 });
      else tip.style.opacity = 1;
    }
    function hide() { if (tip) { tip.remove(); tip = null; } }

    document.querySelectorAll('.term').forEach(function (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      el.addEventListener('mouseenter', function () { show(el); });
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', function () { show(el); });
      el.addEventListener('blur', hide);
      el.addEventListener('click', function (e) { e.preventDefault(); show(el); });
    });
    window.addEventListener('scroll', hide, { passive: true });
  }

  /* -------------------------------------------------------- heading links */

  function anchors() {
    document.querySelectorAll('.prose h2, .prose h3').forEach(function (h, i) {
      if (!h.id) {
        h.id = (h.textContent || 'section').toLowerCase()
          .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 48) || 'section-' + i;
      }
    });
  }

  /* ----------------------------------------------------------------- boot */

  function boot() {
    anchors();
    topbar();
    rail();
    toc();
    foot();
    code();
    checks();
    glossary();
    paint();

    /* Deep links: the browser tried to scroll before we finished building the
       page, so do it again now that the headings and the shell exist. */
    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) requestAnimationFrame(function () {
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: 'auto' });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Course = {
    progress: { isDone: isDone, setDone: setDone, count: doneCount, reset: function () { progress = {}; write(progress); paint(); } },
    refresh: function () { code(); checks(); glossary(); paint(); }
  };
})();
