#!/usr/bin/env python3
"""
narrate.py — turn a lesson's narration script into audio, captions and timings.

Reads   data/narration/NN.js        (the authored script)
Writes  assets/audio/NN.mp3         one continuous narration track
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
        mp3 = os.path.join(OUT, f"{lesson}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", full,
             "-ar", str(SR), "-ac", "1", "-b:a", "64k", mp3],
            check=True)

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
    slim = [{"id": c["id"], "start": c["start"], "end": c["end"]} for c in cues]
    with open(os.path.join(NARR, f"{lesson}.timing.js"), "w", encoding="utf-8") as f:
        f.write("/* generated by tools/narrate.py — do not edit by hand */\n")
        f.write("window.NARRATION_TIMING = window.NARRATION_TIMING || {};\n")
        f.write(f"window.NARRATION_TIMING['{lesson}'] = ")
        json.dump(slim, f, indent=1)
        f.write(";\n")

    size = os.path.getsize(os.path.join(OUT, f"{lesson}.mp3")) / 1e6
    print(f"    -> {t:.0f}s of narration, {size:.1f} MB, {made} new clip(s)")
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
