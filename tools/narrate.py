#!/usr/bin/env python3
"""
narrate.py — turn a lesson's narration script into audio, captions and timings.

Reads   data/narration/NN.js        (the authored script)
Writes  assets/audio/NN.opus        one continuous narration track
        assets/audio/NN.m4a         the same, for browsers without Opus
        assets/audio/NN.vtt         WebVTT captions with real timings
        data/narration/NN.timing.js the cue table the player reads

Speech is generated locally with Kyutai's pocket-tts, which is the same kind
of small on-device model this course teaches you to build. Nothing is sent
anywhere.

    npm install            # once, for onnxruntime-node
    python3 tools/narrate.py 01
    python3 tools/narrate.py all
    python3 tools/narrate.py 03 --force     # re-record even if unchanged

Segments are cached by a hash of what is actually spoken, so re-running after
an edit only re-records the lines you changed.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NARR = os.path.join(ROOT, "data", "narration")
OUT = os.path.join(ROOT, "assets", "audio")
CACHE = os.path.join(ROOT, ".narration-cache")

# A fixed pause between every line is one of the things that makes narration
# sound machine-made. Real speech breathes with the structure: a short beat
# inside one idea, a longer one when the picture changes, longest either side
# of a title card.
GAP = 0.35          # within one figure
GAP_SCENE = 0.65    # when the figure changes
GAP_CARD = 0.95     # into or out of a title/end card
SR = 24000          # pocket-tts sample rate


def gap_between(prev, nxt):
    if prev.get("scene") is None or nxt.get("scene") is None:
        return GAP_CARD
    if prev.get("scene") != nxt.get("scene"):
        return GAP_SCENE
    return GAP


# ---------------------------------------------------------------- parsing

TAG = re.compile(r"<[^>]+>")


def strip_tags(s):
    return TAG.sub("", s).replace("&amp;", "and").replace("&nbsp;", " ").strip()


def read_script(lesson):
    """Pull the segments out of the narration JS without needing a JS engine."""
    path = os.path.join(NARR, f"{lesson}.js")
    if not os.path.exists(path):
        return None
    src = open(path, encoding="utf-8").read()

    # strip comments so their braces do not confuse the scanner
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"^\s*//.*$", "", src, flags=re.M)

    voice = "alba"
    m = re.search(r"voice:\s*'([^']+)'", src)
    if m:
        voice = m.group(1)

    title = ""
    m = re.search(r"title:\s*'((?:[^'\\]|\\.)*)'", src)
    if m:
        title = m.group(1).replace("\\'", "'")

    segments = []
    # each segment is a { ... } block containing an id:
    for block in re.finditer(r"\{\s*id:\s*'([^']+)'(.*?)\}\s*(?=,\s*\{|\s*\]\s*)", src, flags=re.S):
        sid, body = block.group(1), block.group(2)

        def field(name):
            mm = re.search(rf"\b{name}:\s*'((?:[^'\\]|\\.)*)'", body, flags=re.S)
            return mm.group(1).replace("\\'", "'").replace("\\\\", "\\") if mm else None

        text = field("text") or ""
        say = field("say")
        spoken = strip_tags(say if say is not None else text)
        spoken = re.sub(r"\s+", " ", spoken).strip()
        if not spoken:
            continue
        sc = re.search(r"\bscene:\s*'([^']+)'", body)
        segments.append({"id": sid, "text": text, "say": spoken,
                         "scene": sc.group(1) if sc else None})

    return {"voice": voice, "title": title, "segments": segments}


# ---------------------------------------------------------------- audio

def clip_path(voice, spoken):
    h = hashlib.sha256((voice + "::" + spoken).encode("utf-8")).hexdigest()[:20]
    return os.path.join(CACHE, f"{h}.wav")


SYNTH = os.path.join(ROOT, "tools", "synth.mjs")


def synth_missing(voice, wanted):
    """Render every line that is not already cached, in ONE node process.

    Speech comes from tools/synth.mjs, which runs pocket-tts over ONNX. That
    path supports voice cloning without the gated Hugging Face weights the
    Python package needs, so `--voice path/to/sample.wav` works out of the box.
    Batching matters: the engine takes a few seconds to load and derive the
    voice state, and doing that per line would dominate the run.
    """
    os.makedirs(CACHE, exist_ok=True)
    todo = [(spoken, path) for spoken, path in wanted if not os.path.exists(path)]
    if not todo:
        return 0

    with tempfile.TemporaryDirectory() as tmp:
        batch = os.path.join(tmp, "batch.json")
        with open(batch, "w", encoding="utf-8") as f:
            json.dump([{"id": str(i), "text": spoken, "out": path}
                       for i, (spoken, path) in enumerate(todo)], f)
        cmd = ["node", SYNTH, "--batch", batch, "--voice", voice]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            sys.exit("\nSpeech synthesis failed:\n" +
                     (proc.stderr or proc.stdout or "").strip()[:2000] + "\n")

    missing = [p for _, p in todo if not os.path.exists(p)]
    if missing:
        sys.exit(f"\nsynth.mjs reported success but {len(missing)} clip(s) are missing.\n")
    return len(todo)


def project_voice():
    """A voice/*.wav at the project root means 'narrate everything in this voice'."""
    d = os.path.join(ROOT, "voice")
    if not os.path.isdir(d):
        return None
    for f in sorted(os.listdir(d)):
        if f.lower().endswith((".wav", ".safetensors")):
            return os.path.join(d, f)
    return None


def read_wav(path):
    """Return (frames, sample_rate) for a 16-bit mono wav, using the stdlib."""
    with wave.open(path, "rb") as w:
        if w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise SystemExit(f"{path}: expected 16-bit mono")
        return w.readframes(w.getnframes()), w.getframerate()


def wav_seconds(path):
    with wave.open(path, "rb") as w:
        return w.getnframes() / float(w.getframerate())


def vtt_time(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


# ---------------------------------------------------------------- driver

# The narrator comes out of the model at about -20 LUFS with peaks a third of
# a decibel below full scale: quiet to listen to, yet close enough to the
# ceiling that a decoder can push it over and clip. Two passes fix both. The
# first only measures; the second applies the result as a *static* gain
# (`linear=true`), so nothing is compressed and the track stays sample-for-
# sample as long as the cue table says it is. -16 LUFS is the spoken-word
# convention, and -1.5 dBTP leaves room for the codec.
#
# One thing that looks like a bug and is not: with a filter in the graph the
# MP4 container declares a few tens of milliseconds more than the cue table
# ends at. The decoded audio is identical in length and alignment — that tail
# is encoder padding at -240 dBFS. The drift check below compares the stitched
# samples, which is the number that actually governs the captions.
LUFS = -16.0
PEAK = -1.5


def loudness_filter(wav):
    """Measure `wav`, then return a loudnorm filter that levels it statically."""
    probe = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", wav,
         "-af", f"loudnorm=I={LUFS}:TP={PEAK}:LRA=11:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True)
    body = probe.stderr[probe.stderr.rfind("{"):probe.stderr.rfind("}") + 1]
    try:
        m = json.loads(body)
        return (f"loudnorm=I={LUFS}:TP={PEAK}:LRA=11:linear=true"
                f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
                f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}")
    except (ValueError, KeyError):
        # No measurement is not a reason to ship an unlevelled track.
        print("    ! loudness measurement failed, levelling in one pass")
        return f"loudnorm=I={LUFS}:TP={PEAK}:LRA=11"


# ---- word timings ---------------------------------------------------------
#
# The captions used to hand each word a slice of its segment proportional to
# how many characters it had, which is wrong twice over. Characters are a poor
# stand-in for how long a word takes to say — "through" is one syllable and
# "area" is three — and two thirds of these segments are read from a `say`
# field that differs from the caption, so "1 x 28 x 28 = 784" is six words on
# screen and thirteen out loud. Worst of all, a pause got smeared across the
# words either side of it instead of landing between them, and a pause is
# exactly where the eye checks whether the highlight is keeping up.
#
# So measure the audio. `silencedetect` gives the real pauses; the words are
# then laid out along *speaking* time rather than wall-clock time, which drops
# every pause into the gap it belongs to and leaves only within-phrase spacing
# to estimate. A word stays lit through the pause that follows it, because its
# end is the next word's start.

TAG = re.compile(r"<[^>]*>")
VOWELS = re.compile(r"[aeiouy]+")
SILENCE_DB = -45
SILENCE_MIN = 0.10


def caption_words(html):
    """Tokenise exactly as film.js does: text between tags, split on spaces."""
    return [w for chunk in TAG.split(html) for w in chunk.split()]


def spoken_weight(word):
    """Rough syllable count — a far better duration proxy than word length."""
    digits = sum(c.isdigit() for c in word)
    w = re.sub(r"[^a-z']", "", word.lower())
    if not w:
        # Bare punctuation, an em dash on its own. It takes no time to say.
        return 0.3 if not digits else digits * 1.6
    n = len(VOWELS.findall(w))
    if w.endswith("e") and n > 1 and not w.endswith(("le", "ee", "ye", "re")):
        n -= 1
    return max(1, n) + digits * 1.6


def silences(wav):
    """[(start, end)] of every pause in the track, measured not guessed."""
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", wav,
         "-af", f"silencedetect=noise={SILENCE_DB}dB:d={SILENCE_MIN}",
         "-f", "null", "-"],
        capture_output=True, text=True).stderr
    spans, start = [], None
    for m in re.finditer(r"silence_(start|end): *(-?[0-9.]+)", out):
        if m.group(1) == "start":
            start = float(m.group(2))
        elif start is not None:
            spans.append((start, float(m.group(2))))
            start = None
    return spans


def voiced_runs(spans, lo, hi):
    """The complement of the pauses inside [lo, hi]."""
    runs, t = [], lo
    for a, b in spans:
        if b <= lo or a >= hi:
            continue
        a, b = max(a, lo), min(b, hi)
        if a > t:
            runs.append((t, a))
        t = max(t, b)
    if t < hi:
        runs.append((t, hi))
    return runs or [(lo, hi)]


def word_starts(html, lo, hi, spans):
    """When each caption word lights up, as offsets from the segment start."""
    words = caption_words(html)
    if not words:
        return []
    runs = voiced_runs(spans, lo, hi)
    speech = sum(b - a for a, b in runs)
    weights = [spoken_weight(w) for w in words]
    total = sum(weights) or 1.0
    if speech <= 0:
        speech, runs = hi - lo, [(lo, hi)]

    starts, cum, ri, used = [], 0.0, 0, 0.0
    for wt in weights:
        target = (cum / total) * speech      # how much speaking comes first
        while ri < len(runs) - 1 and used + (runs[ri][1] - runs[ri][0]) <= target:
            used += runs[ri][1] - runs[ri][0]
            ri += 1
        starts.append(round(runs[ri][0] + (target - used) - lo, 2))
        cum += wt
    return starts


def build(lesson, force=False, voice_override=None):
    script = read_script(lesson)
    if not script:
        print(f"  lesson {lesson}: no narration script, skipping")
        return False
    segs = script["segments"]
    if not segs:
        print(f"  lesson {lesson}: script has no segments, skipping")
        return False

    voice = voice_override or project_voice() or script["voice"]
    shown = os.path.basename(voice) if os.path.sep in voice else voice
    os.makedirs(OUT, exist_ok=True)
    print(f"  lesson {lesson}: {len(segs)} segments, voice '{shown}'")

    wanted = [(sg["say"], clip_path(voice, sg["say"])) for sg in segs]
    if force:
        for _, path in wanted:
            if os.path.exists(path):
                os.remove(path)
    made = synth_missing(voice, wanted)

    parts, cues, gaps, t = [], [], [], 0.0
    for i, (sg, (_, path)) in enumerate(zip(segs, wanted)):
        d = wav_seconds(path)
        parts.append(path)
        cues.append({"id": sg["id"], "start": round(t, 3), "end": round(t + d, 3),
                     "text": sg["text"], "say": sg["say"]})
        t += d
        if i < len(segs) - 1:
            g = gap_between(sg, segs[i + 1])
            gaps.append(g)
            t += g

    # Stitch sample-exactly rather than with ffmpeg's concat demuxer, which
    # silently shortened the silences and drifted the captions by seconds
    # over a lesson. Raw frames, so the cue table describes the real track.
    chunks = []
    for i, p in enumerate(parts):
        frames, sr = read_wav(p)
        if sr != SR:
            raise SystemExit(f"clip {p} is {sr} Hz, expected {SR}")
        chunks.append(frames)
        if i < len(parts) - 1:
            chunks.append(b"\x00\x00" * int(round(gaps[i] * SR)))
    joined = b"".join(chunks)

    with tempfile.TemporaryDirectory() as tmp:
        full = os.path.join(tmp, "full.wav")
        with wave.open(full, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(joined)
        # AAC rather than mp3: at 24 kHz mono, mp3 drops into MPEG-2 LSF mode
        # and loses badly at the same bitrate. 96 kbit/s is where AAC stops
        # improving on this material — measured segmental SNR against the
        # stitched source is 31.4 dB at 64k, 42.6 dB at 96k, and 42.7 dB at
        # 128k, so 96 buys everything there is to buy. `faststart` moves the
        # index to the front of the file, which matters because Cloudflare
        # Pages answers with 200, not 206: the player cannot range-request
        # its way to a header sitting at the end.
        af = loudness_filter(full)

        # Opus is the one the player asks for. At 64 kbit/s it leaves SILK for
        # CELT, and that is where it stops being a speech codec and starts
        # matching AAC: log-mel distance from the stitched source is 0.53 dB
        # below 6 kHz and 0.76 dB above it, against 0.41 and 0.51 for AAC at
        # 96k — the same quality in 27% fewer bytes. Below 64k the distance
        # trebles, and it does so in the speech band, not only in the treble,
        # so there is nothing to be won by going lower.
        opus = os.path.join(OUT, f"{lesson}.opus")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", full, "-af", af,
             "-c:a", "libopus", "-b:a", "64k", "-application", "audio",
             "-ar", "24000", "-ac", "1", opus],
            check=True)

        # AAC stays as the fallback: Safari has never played Ogg. Same audio,
        # same mastering, chosen by canPlayType in film.js.
        m4a = os.path.join(OUT, f"{lesson}.m4a")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", full, "-af", af,
             "-c:a", "aac", "-ar", str(SR), "-ac", "1", "-b:a", "96k",
             "-movflags", "+faststart", m4a],
            check=True)

        # Measured on the stitched track, so the pauses are the ones the
        # listener will actually hear.
        spans = silences(full)
        for c in cues:
            c["w"] = word_starts(c["text"], c["start"], c["end"], spans)

    # The cue table must describe the track that was actually written.
    measured = len(joined) / 2 / SR
    expected = cues[-1]["end"]
    if abs(measured - expected) > 0.05:
        print(f"    ! drift: cues end at {expected:.2f}s but the track is {measured:.2f}s")

    # captions
    with open(os.path.join(OUT, f"{lesson}.vtt"), "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for c in cues:
            f.write(f"{c['id']}\n{vtt_time(c['start'])} --> {vtt_time(c['end'])}\n"
                    f"{strip_tags(c['text'])}\n\n")

    # timings for the player
    slim = [{"id": c["id"], "start": c["start"], "end": c["end"], "w": c["w"]}
            for c in cues]
    with open(os.path.join(NARR, f"{lesson}.timing.js"), "w", encoding="utf-8") as f:
        f.write("/* generated by tools/narrate.py — do not edit by hand */\n")
        f.write("window.NARRATION_TIMING = window.NARRATION_TIMING || {};\n")
        f.write(f"window.NARRATION_TIMING['{lesson}'] = ")
        json.dump(slim, f, indent=1)
        f.write(";\n")

    size = os.path.getsize(os.path.join(OUT, f"{lesson}.opus")) / 1e6
    pauses = sum(len(voiced_runs(spans, c["start"], c["end"])) - 1 for c in cues)
    print(f"    -> {t:.0f}s of narration, {size:.1f} MB, {made} new clip(s), "
          f"{pauses} measured pauses")
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("lessons", nargs="+", help="lesson numbers, or 'all'")
    ap.add_argument("--force", action="store_true", help="re-record every line")
    ap.add_argument("--voice", default=None,
                    help="built-in voice name, or a path to a .wav to clone. "
                         "Overrides voice/ and the script's own setting.")
    args = ap.parse_args()

    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is required and was not found on PATH.")

    ids = args.lessons
    if len(ids) == 1 and ids[0] == "all":
        ids = sorted(f[:-3] for f in os.listdir(NARR)
                     if re.fullmatch(r"\d\d\.js", f))

    chosen = args.voice or project_voice()
    if chosen and os.path.sep in chosen:
        print(f"Voice: cloning {os.path.basename(chosen)}")
    print(f"Narrating {len(ids)} lesson(s)")
    done = 0
    for lesson in ids:
        if build(lesson, force=args.force, voice_override=args.voice):
            done += 1
    print(f"Done. {done} lesson(s) written to assets/audio/")


if __name__ == "__main__":
    main()
