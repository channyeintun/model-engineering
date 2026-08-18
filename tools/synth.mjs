#!/usr/bin/env node
/**
 * Offline pocket-tts synthesiser with voice cloning, for course narration.
 *
 * Built on a Node port of next-editor's `src/studio/tts/pocket/*` (Apache-2.0),
 * itself ported from the pocket-tts-web demo
 * (KevinAHM/pocket-tts-web@d0c0c79b7712256a32d691c67f20b8ae2e020d00; model
 * weights under Kyutai's pocket-tts terms). Nothing here needs the gated
 * `kyutai/pocket-tts` Hugging Face repo — the same model is served as a public
 * ONNX bundle, and cloning runs through its `mimi_encoder_int8.onnx`.
 *
 * Usage:
 *   node tools/synth.mjs --text "hello there" --out out.wav \
 *        [--voice voice/myvoice.wav] [--seed 12345]
 *   node tools/synth.mjs --batch batch.json --outdir DIR [--voice ...] [--seed ...]
 *
 * batch.json: [{"id":"a01","text":"...","out":"/abs/path/a01.wav"}, ...]
 * `out` may be omitted when --outdir is given (it becomes <outdir>/<id>.wav).
 *
 * Output is always 24 kHz mono 16-bit PCM WAV with leading/trailing silence
 * trimmed. The noise seed is fixed by default: pocket-tts flow noise colours
 * timbre as well as prosody, so every line in a lesson must share one seed or
 * the narrator audibly changes between segments.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { DEFAULT_BUNDLE_BASE_URL, PROJECT_ROOT } from "./pocket/bundleAssets.mjs";
import { PocketTtsEngine } from "./pocket/engine.mjs";
import { loadReferenceVoice } from "./pocket/referenceVoice.mjs";
import { encodeWavPcm16, floatTo16BitPcm, trimSilence } from "./pocket/wav.mjs";

/** Constant across a lesson on purpose — see the module header. */
const DEFAULT_SEED = 20260418;
const DEFAULT_BUILTIN_VOICE = "alba";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const eq = token.indexOf("=");
    const key = eq === -1 ? token.slice(2) : token.slice(2, eq);
    let value;
    if (eq !== -1) {
      value = token.slice(eq + 1);
    } else if (key === "quiet" || key === "help" || key === "raw-reference") {
      value = "true";
    } else {
      value = argv[++i];
      if (value === undefined) {
        throw new Error(`Missing value for --${key}`);
      }
    }
    args[key] = value;
  }
  return args;
}

const USAGE = `Usage:
  node tools/synth.mjs --text "..." --out FILE [--voice REF.wav] [--seed N]
  node tools/synth.mjs --batch batch.json --outdir DIR [--voice REF.wav] [--seed N]

Options:
  --text TEXT        line to synthesize (single-line mode)
  --out FILE         output WAV path (single-line mode)
  --batch FILE       JSON array of {id, text, out?}
  --outdir DIR       output directory for batch entries without an explicit out
  --voice PATH       reference WAV to clone (24 kHz mono preferred, 20 s max)
  --builtin NAME     built-in bundle voice when --voice is absent (default ${DEFAULT_BUILTIN_VOICE})
  --seed N           noise seed (default ${DEFAULT_SEED}); keep constant across a lesson
  --bundle URL       override the pinned ONNX bundle base URL
  --raw-reference    skip reference peak normalization (browser-reference behaviour;
                     a quiet recording then clones to equally quiet narration)
  --quiet            suppress progress logging`;

/** Resolve a possibly-relative path against the project root, not the cwd. */
function resolvePath(path) {
  return isAbsolute(path) ? path : resolve(PROJECT_ROOT, path);
}

async function writeWav(outPath, samples, sampleRate) {
  const trimmed = trimSilence(samples, sampleRate);
  const bytes = encodeWavPcm16(floatTo16BitPcm(trimmed), sampleRate);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, bytes);
  return { bytes: bytes.length, seconds: trimmed.length / sampleRate };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.text && !args.batch)) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }
  if (args.text && args.batch) {
    throw new Error("Use either --text or --batch, not both");
  }

  const log = args.quiet ? () => {} : (...parts) => console.error(...parts);
  const seed = args.seed === undefined ? DEFAULT_SEED : Number(args.seed);
  if (!Number.isFinite(seed)) {
    throw new Error(`--seed must be a number, got ${JSON.stringify(args.seed)}`);
  }

  /** @type {{id: string, text: string, out: string}[]} */
  let jobs;
  if (args.text) {
    if (!args.out) throw new Error("--text requires --out");
    jobs = [{ id: "single", text: args.text, out: resolvePath(args.out) }];
  } else {
    const batchPath = resolvePath(args.batch);
    const entries = JSON.parse(await readFile(batchPath, "utf8"));
    if (!Array.isArray(entries)) {
      throw new Error(`${batchPath} must contain a JSON array`);
    }
    const outdir = args.outdir ? resolvePath(args.outdir) : null;
    jobs = entries.map((entry, index) => {
      const id = entry.id ?? `line-${index + 1}`;
      if (typeof entry.text !== "string" || !entry.text.trim()) {
        throw new Error(`Batch entry ${id} has no text`);
      }
      const out = entry.out ? resolvePath(entry.out) : outdir ? join(outdir, `${id}.wav`) : null;
      if (!out) {
        throw new Error(`Batch entry ${id} has no "out" and no --outdir was given`);
      }
      return { id, text: entry.text, out };
    });
  }

  // --- Load the engine and derive the voice state exactly once. -------------
  const loadStart = performance.now();
  let customVoiceSamples;
  if (args.voice) {
    const referencePath = resolvePath(args.voice);
    const reference = await loadReferenceVoice(referencePath, {
      normalize: !args["raw-reference"],
    });
    customVoiceSamples = reference.samples;
    log(
      `reference ${referencePath}: ${reference.sourceSampleRate} Hz / ${reference.sourceChannels} ch / ` +
        `${reference.sourceSeconds.toFixed(2)}s source -> ${(
          customVoiceSamples.length / 24000
        ).toFixed(2)}s at 24 kHz, gain x${reference.gain.toFixed(2)}`,
    );
  }

  const engine = await PocketTtsEngine.load(
    {
      bundleBaseUrl: args.bundle ?? DEFAULT_BUNDLE_BASE_URL,
      voice: args.builtin ?? DEFAULT_BUILTIN_VOICE,
      customVoiceSamples,
    },
    (phase) => log(`  [${((performance.now() - loadStart) / 1000).toFixed(2)}s] ${phase}`),
  );
  const loadSeconds = (performance.now() - loadStart) / 1000;
  log(
    `engine loaded in ${loadSeconds.toFixed(2)}s ` +
      `(${args.voice ? "cloned voice" : `built-in "${args.builtin ?? DEFAULT_BUILTIN_VOICE}"`}, seed ${seed})`,
  );

  // --- Synthesize every line against that one voice state. -----------------
  const synthStart = performance.now();
  let audioSeconds = 0;
  for (const job of jobs) {
    const jobStart = performance.now();
    const result = await engine.synthesize(job.text, seed);
    const written = await writeWav(job.out, result.samples, result.sampleRate);
    const elapsed = (performance.now() - jobStart) / 1000;
    audioSeconds += written.seconds;
    log(
      `  ${job.id}: ${written.seconds.toFixed(2)}s audio in ${elapsed.toFixed(2)}s ` +
        `(${(written.seconds / elapsed).toFixed(2)}x realtime) -> ${job.out}`,
    );
  }
  const synthSeconds = (performance.now() - synthStart) / 1000;

  log(
    `done: ${jobs.length} file(s), ${audioSeconds.toFixed(2)}s audio in ${synthSeconds.toFixed(2)}s ` +
      `synthesis (${(audioSeconds / synthSeconds).toFixed(2)}x realtime); ` +
      `${(loadSeconds + synthSeconds).toFixed(2)}s wall clock including load`,
  );

  await engine.release();
}

main().catch((error) => {
  console.error(`synth: ${error.message}`);
  process.exitCode = 1;
});
