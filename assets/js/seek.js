/* =========================================================================
   Seeking an <audio> element, which is harder than it looks and has now
   been wrong three times. It lives in its own file so it can be driven by
   a fake element from Node — see tools/test-seek.mjs — because the three
   bugs it has had were all in states a browser will not reproduce on
   demand: a cold element with no metadata, a target past the end of the
   download, and a seek superseded halfway through.

   The awkward facts it exists to handle:

   1. Seeking is asynchronous. Reading currentTime straight after assigning
      it returns the old position, so "did it take?" cannot be answered by
      reading it back. The element reports success by firing 'seeked'.

   2. Assigning currentTime the value it already holds is a no-op and fires
      nothing. Waiting for a 'seeked' that is never coming leaves the seek
      pending forever, and a pending seek stands in for the clock.

   3. Before metadata exists there is no timeline, so the assignment is
      discarded silently and the track carries on from wherever it was.

   4. A host that ignores Range — Cloudflare Pages does — answers every
      request with the whole file, so a position past the downloaded part
      is simply not reachable yet, however long you wait for one attempt.

   The caller gets `target()`: the position a pending seek is heading for,
   or null. Report that as the clock while it is set. Reporting the element
   instead drags the scrub bar and the captions back to the old position,
   which reads as the seek having been refused.
   ========================================================================= */

(function (global) {
  'use strict';

  var TOL = 0.35;          // a seek lands on a frame boundary, not exactly
  var GIVE_UP = 60000;     // a seek must not outlive its attempt forever

  function create(opts) {
    var getAudio = opts.audio;
    var isPlaying = opts.isPlaying || function () { return false; };
    var onWait = opts.onWait || function () {};
    var giveUp = opts.timeout || GIVE_UP;

    var want = null;
    var token = 0;
    var resumeAfter = false;

    function covers(audio, x) {
      if (!audio.seekable || audio.seekable.length === 0) return true;   // unknown: let it try
      for (var i = 0; i < audio.seekable.length; i++) {
        if (x >= audio.seekable.start(i) - 0.01 && x <= audio.seekable.end(i) + 0.01) return true;
      }
      return false;
    }

    function seek(t) {
      if (!isFinite(t)) return;               // never hand the element a NaN
      var audio = getAudio();
      if (!audio) return;

      var mine = ++token;
      want = t;
      var retries = 3;
      var timer = null;

      function done() {
        if (mine !== token) return;           // a newer seek already supersedes this
        want = null;
        onWait(false);
        /* Playback was stopped so the voice would not carry on from the old
           position while we waited. It is legitimate again now. */
        if (resumeAfter) {
          resumeAfter = false;
          if (isPlaying() && audio.play) { try { audio.play(); } catch (e) {} }
        }
        audio.removeEventListener('seeked', onSeeked);
        audio.removeEventListener('error', done);
        if (timer) { clearTimeout(timer); timer = null; }
      }

      /* Wait for the download to reach the target, then apply it once.
         Guarded by the token, so a newer seek always wins and a stale target
         can never drag playback backwards. */
      function waitForData() {
        /* Waiting can take seconds. Holding the voice at the old position for
           all of them is worse than silence: it contradicts the figures, which
           have already jumped to where the seek asked for. */
        if (!audio.paused && audio.pause) { resumeAfter = true; audio.pause(); }
        onWait(true);
        var evs = ['progress', 'canplay', 'canplaythrough', 'loadeddata', 'durationchange'];
        function stop() { evs.forEach(function (e) { audio.removeEventListener(e, look); }); }
        function look() {
          if (mine !== token) { stop(); return; }
          if (Math.abs(audio.currentTime - t) < TOL) { stop(); done(); return; }
          if (!covers(audio, t)) return;
          stop();
          try { audio.currentTime = t; } catch (e) { done(); }
        }
        evs.forEach(function (e) { audio.addEventListener(e, look); });
        setTimeout(stop, giveUp);
        look();
      }

      function onSeeked() {
        if (mine !== token) return;
        if (Math.abs(audio.currentTime - t) > TOL && retries > 0) { retries--; waitForData(); return; }
        done();
      }

      /* Already there, and the element has a timeline to prove it. */
      if (audio.readyState >= 1 && Math.abs(audio.currentTime - t) < TOL) {
        want = null;
        onWait(false);
        return;
      }

      audio.addEventListener('seeked', onSeeked);
      audio.addEventListener('error', done);
      timer = setTimeout(done, giveUp);

      function apply() {
        if (mine !== token) return;
        /* Already there. Assigning currentTime the value it already holds
           fires nothing, so settle now rather than wait for an event that is
           never coming. This is the cold-open case: readyState is 0 when the
           player opens, so the check above was skipped, and by the time
           metadata arrives the track is sitting at 0 — exactly where the seek
           wanted it. Leaving it pending froze the clock at zero while the
           audio played on: the voice talked, the captions never moved, and no
           figure ever reached the stage. */
        if (Math.abs(audio.currentTime - t) < TOL) { done(); return; }
        if (!covers(audio, t)) { waitForData(); return; }
        try { audio.currentTime = t; } catch (e) { done(); }
      }

      if (audio.readyState < 1 /* HAVE_METADATA */) {
        audio.addEventListener('loadedmetadata', function once() {
          audio.removeEventListener('loadedmetadata', once);
          apply();
        });
      } else {
        apply();
      }
    }

    return {
      seek: seek,
      /* Where a pending seek is heading, or null when nothing is pending. */
      target: function () { return want; }
    };
  }

  global.Seek = { create: create, TOL: TOL };
})(typeof self !== 'undefined' ? self : globalThis);
