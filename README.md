# Model Engineering

A 13-lesson course website: **build small AI models that run on your own device.**

PyTorch → Transformers → train a tiny GPT → fine-tuning and LoRA → distillation →
quantization → latency and memory → export → on the device → ASR → TTS →
full-duplex conversation → a fully offline voice assistant.

Every hard idea has an animated diagram you can step through at your own speed,
and every lesson has a **narrated walkthrough**: the same figures played in
order on a full-screen stage, explained out loud, with captions and a
transcript. It is not a video file — it is the real animations being driven by
a narration track, so it stays sharp at any size and the text is selectable.

## Open it

Double-click `index.html`. It works straight from the file system — there is no
build step, no bundler, and nothing is fetched from the network.

If your browser is strict about local files, serve the folder instead:

```bash
python3 -m http.server 8777
```

Then open <http://localhost:8777>.

## What is where

```
index.html              course home, the map, the hero animation
toolkit.html            environment setup, pinned versions, Mac and Colab notes
debugging.html          when it breaks: the check order, OOM maths, resuming a run
glossary.html           every term, searchable
resources.html          companion reading, and when to read each item
lessons/NN.html         the thirteen lessons
data/lessons.js         the course map — navigation and progress read from here
data/glossary.js        term definitions, also used for hover tooltips
assets/css/course.css   the whole design system
assets/js/scene.js      the animation engine (Play / Next / Previous, captions)
assets/js/svgkit.js     shared diagram parts, so every figure looks the same
assets/js/course.js     shell: sidebar, progress, code copying, self-checks
assets/js/scenes/NN.js  the animations for lesson NN
assets/js/film.js       the narrated-walkthrough player
assets/js/vendor/       GSAP 3.15.0, vendored so the site works offline
data/narration/NN.js    the walkthrough script for lesson NN (authored)
data/narration/*.timing.js  cue times (generated with the audio)
assets/audio/NN.m4a     the narration track (generated)
assets/audio/NN.vtt     WebVTT captions (generated)
tools/narrate.py        generates the audio, captions and timings
tools/check.mjs         static consistency checker
tools/check-narration.mjs  validates walkthrough scripts
tools/audit.js          in-browser figure audit
```

## The narrated walkthroughs

The voice is generated **locally** by [pocket-tts](https://github.com/kyutai-labs/pocket-tts),
Kyutai's 100M-parameter on-device speech model — the same kind of model Lesson 12
teaches you to build. Nothing is uploaded anywhere.

```bash
npm install                          # once: onnxruntime-node
python3 tools/narrate.py 01          # one lesson
python3 tools/narrate.py all         # everything
python3 tools/narrate.py 04 --force  # re-record even unchanged lines
```

`narrate.py` needs only the standard library; the speech itself comes from
`tools/synth.mjs`. Clips are cached against a hash of what is actually spoken,
so editing one line re-records only that line. About 3.5× real time on an
M-series Mac, and the engine loads once per lesson rather than once per line.

**Choosing the voice**, in order of precedence:

1. `--voice NAME` or `--voice path/to/sample.wav` on the command line
2. any `.wav` in `voice/` at the project root — this is how the whole course
   gets narrated in your own voice
3. the `voice:` field in the lesson's narration script
4. `alba`, the built-in default

Built-in voices: `alba`, `cosette`, `marius`, `javert`, `jean`, `fantine`,
`eponine`, `azelma` and more.

### Cloning your own voice

Put a clean recording in `voice/` and re-render:

```bash
ffmpeg -i myvoice.m4a -af "highpass=f=80,loudnorm=I=-18:TP=-2:LRA=11" -ar 24000 -ac 1 voice/myvoice.wav
python3 tools/narrate.py all --force
```

Ten to twenty seconds of clear speech is enough — and **stay under twenty**,
because pocket-tts silently discards anything past that and never says so.

The high-pass removes room rumble; `loudnorm` sets a predictable level, which
matters because pocket-tts clones loudness along with timbre and a quiet
recording otherwise yields a quiet narrator. Resist the urge to add denoising
unless the recording actually needs it: `afftdn` smears consonants, and that
costs more than the hiss it removes.

What dominates the result is not the model. It is **how the reference was
spoken** and **how the script is written**. Read the reference the way you would
teach, not the way you would read a paragraph aloud: the same voice sample gave a
34 Hz pitch spread reading written prose and 59 Hz reading like a lecturer, and
the second one is the one that sounds human.

The reference is peak-normalised before it is encoded; `--raw-reference` on
`tools/synth.mjs` turns that off.

**Cache invalidation, one trap.** Clips are keyed on the voice *path* plus the
spoken line, so replacing the file at `voice/myvoice.wav` does not invalidate
anything. Re-render with `--force`, or delete `.narration-cache/*.wav`.

**Why this does not use the `pocket-tts` pip package.** That package can only clone
using weights in the gated `kyutai/pocket-tts` repo, which needs you to accept its
terms and returns 403 until you do. `tools/synth.mjs` runs the same model from the
**public ONNX bundle** instead — via `mimi_encoder_int8.onnx` — so cloning works
with no Hugging Face account at all. The port follows the browser implementation in
`KevinAHM/pocket-tts-web` (Apache-2.0); the ~189 MB bundle is downloaded once and
cached in `.narration-cache/onnx/`.

Without the audio the walkthrough still works: it runs in **silent mode**,
advancing on a reading-speed estimate with the captions carrying the
explanation. So a lesson is never broken by missing audio.

## Deploying

The site is static with no build step, so it deploys as-is.

```bash
npx wrangler pages deploy . --project-name=model-engineering
```

Roughly 120 files and 60 MB, most of it the narration audio. The largest single
file is about 4 MB, well inside Cloudflare Pages' 25 MB per-file limit.

Deploy from a staging copy, not the working tree: `wrangler` ignores `.gitignore`,
and `.assetsignore` is a Workers feature that Pages does not read. So the 189 MB
ONNX bundle under `.narration-cache/` would otherwise be uploaded.

```bash
rsync -a --delete --exclude .git --exclude .narration-cache --exclude node_modules \
      --exclude voice --exclude .deploy --exclude 'myvoice.*' ./ .deploy/
npx wrangler pages deploy .deploy --project-name=model-engineering
```

One thing to know about Pages and this player: it answers audio requests with
`200`, not `206`, so range requests do not work. `film.js` waits for
`audio.seekable` to actually cover the target before it trusts a seek.

Two things are worth excluding from a deploy, and `.gitignore` already covers
them: `voice/` (your reference recording) and `.narration-cache/` (the per-line
wav cache and the ~189 MB ONNX bundle). Neither is needed to serve the site.

## Checking it

Static pass — run it after editing any lesson:

```bash
node tools/check.mjs
```

It reports figures with no builder, builders pointing at ids that do not exist,
missing script tags, self-checks with no correct answer, raw `<` inside code
blocks, and elements drawn outside their own viewBox.

Visual pass — static checking cannot tell you that a bar grew past the top of
its own stage, or that a rotated needle swung off the canvas. Open any lesson
and run this in the browser console:

```javascript
(await import('/tools/audit.js')).audit()
```

It steps every figure through its whole timeline and measures what actually
rendered, transforms included. It found two real bugs the static checker could
not: a bar scaled past its stage in Lesson 01, and a dial needle in Lesson 06
pivoting around the wrong point.

## Notes

- Progress ("mark lesson as done") is stored in `localStorage`, on your machine only.
- The theme follows the toggle in the top bar and is remembered.
- `prefers-reduced-motion` is respected: figures start at their final state and
  only move if you press a control.
- GSAP 3.15.0 is included under its standard no-charge licence, which covers the
  full plugin suite: https://gsap.com/standard-license
- Library versions in the lessons were checked in **August 2026**. Two of them had
  breaking releases — `transformers` v5 and `datasets` v4 — so older tutorials you
  find elsewhere will not run as written. `toolkit.html` lists what changed.
