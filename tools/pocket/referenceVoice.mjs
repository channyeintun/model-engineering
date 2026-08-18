/**
 * Reference-voice preparation for cloning.
 *
 * Ported from next-editor's `src/studio/tts/customVoices.ts` (Apache-2.0):
 * same 24 kHz mono float32 target format and the same 2 s / 20 s bounds. The
 * browser original decodes through WebAudio; offline we read WAV directly and
 * linearly resample, so the CLI stays dependency-free beyond onnxruntime-node.
 */

import { readFile } from "node:fs/promises";

import { decodeWavToFloat32, resampleLinear } from "./wav.mjs";

export const VOICE_SAMPLE_RATE = 24_000;
export const MIN_SAMPLE_SECONDS = 2;
export const MAX_SAMPLE_SECONDS = 20;

/**
 * Peak level the reference is scaled to before mimi encoding.
 *
 * Deviation from the browser reference, which feeds the sample through
 * unchanged: mimi is an audio codec, so the clone reproduces the reference's
 * *loudness* along with its timbre. A quiet phone recording (this project's
 * myvoice.wav peaks at -20.9 dBFS) therefore clones to narration at roughly
 * -42 dB mean — audible, but far too quiet to ship. Scaling by a single
 * constant leaves SNR, pitch and timbre untouched while putting the generated
 * audio at a normal speech level; -3 dBFS keeps headroom so the 16-bit encode
 * never clamps. Pass `normalize: false` to reproduce the browser behaviour.
 */
export const REFERENCE_TARGET_PEAK = 0.7;

function peakNormalize(samples, targetPeak) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const magnitude = Math.abs(samples[i]);
    if (magnitude > peak) peak = magnitude;
  }
  if (peak === 0) {
    throw new Error("Voice sample is digital silence");
  }
  const gain = targetPeak / peak;
  const scaled = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    scaled[i] = samples[i] * gain;
  }
  return { samples: scaled, gain, peak };
}

/** Clamp a prepared sample to the supported bounds (trims the tail). */
export function clampVoiceSamples(samples, sampleRate) {
  const min = MIN_SAMPLE_SECONDS * sampleRate;
  const max = MAX_SAMPLE_SECONDS * sampleRate;
  if (samples.length < min) {
    throw new Error(
      `Voice sample too short — need at least ${MIN_SAMPLE_SECONDS}s of clear speech, got ${(
        samples.length / sampleRate
      ).toFixed(2)}s`,
    );
  }
  return samples.length > max ? samples.slice(0, max) : samples;
}

/** Read a WAV reference sample as clamped 24 kHz mono float32 in [-1, 1]. */
export async function loadReferenceVoice(path, { normalize = true } = {}) {
  const bytes = await readFile(path);
  const decoded = decodeWavToFloat32(bytes);
  const resampled = resampleLinear(decoded.samples, decoded.sampleRate, VOICE_SAMPLE_RATE);
  const clamped = clampVoiceSamples(resampled, VOICE_SAMPLE_RATE);
  // Normalize the clamped window, not the whole file — only these samples
  // reach the encoder.
  const leveled = normalize
    ? peakNormalize(clamped, REFERENCE_TARGET_PEAK)
    : { samples: clamped, gain: 1, peak: 0 };
  return {
    samples: leveled.samples,
    gain: leveled.gain,
    sourcePeak: leveled.peak,
    sourceSampleRate: decoded.sampleRate,
    sourceChannels: decoded.channels,
    sourceSeconds: decoded.samples.length / decoded.sampleRate,
  };
}
