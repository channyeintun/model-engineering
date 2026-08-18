/**
 * Minimal 16-bit PCM mono WAV encode/decode, plus silence trimming.
 *
 * Ported from next-editor's `src/studio/tts/wav.ts` (Apache-2.0). Node
 * additions: `decodeWavToFloat32` for reading the reference voice sample, and
 * a resampler so a non-24 kHz / stereo reference still works offline (the
 * browser original leaned on WebAudio's OfflineAudioContext for that).
 */

const RIFF = 0x46464952; // "RIFF" LE
const WAVE = 0x45564157; // "WAVE" LE
const FMT_ = 0x20746d66; // "fmt " LE
const DATA = 0x61746164; // "data" LE

/**
 * Trim leading/trailing silence around the voiced span. pocket-tts dialogs
 * start with ~0.5s of model silence before speech onset; a lesson's captions
 * and timings assume speech starts when the line starts.
 */
export function trimSilence(
  samples,
  sampleRate,
  { threshold = 0.004, headPadMs = 40, tailPadMs = 150 } = {},
) {
  let first = -1;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) {
      first = i;
      break;
    }
  }
  if (first === -1) {
    return samples;
  }
  let last = samples.length - 1;
  for (; last > first; last--) {
    if (Math.abs(samples[last]) > threshold) {
      break;
    }
  }
  const headPad = Math.round((headPadMs / 1000) * sampleRate);
  const tailPad = Math.round((tailPadMs / 1000) * sampleRate);
  const start = Math.max(0, first - headPad);
  const end = Math.min(samples.length, last + 1 + tailPad);
  return samples.slice(start, end);
}

export function floatTo16BitPcm(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
  }
  return pcm;
}

export function encodeWavPcm16(pcm, sampleRate) {
  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  view.setUint32(0, RIFF, true);
  view.setUint32(4, 36 + dataBytes, true);
  view.setUint32(8, WAVE, true);
  view.setUint32(12, FMT_, true);
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  view.setUint32(36, DATA, true);
  view.setUint32(40, dataBytes, true);
  new Int16Array(buffer, 44).set(pcm);

  return new Uint8Array(buffer);
}

/**
 * Decode a PCM WAV (8/16/24/32-bit int or 32-bit float, any channel count) to
 * interleaved-averaged mono float32 in [-1, 1].
 */
export function decodeWavToFloat32(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.byteLength < 44 ||
    view.getUint32(0, true) !== RIFF ||
    view.getUint32(8, true) !== WAVE
  ) {
    throw new Error("Not a RIFF/WAVE file");
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let format = 0;
  let dataStart = -1;
  let dataLength = 0;

  while (offset + 8 <= bytes.byteLength) {
    const chunkId = view.getUint32(offset, true);
    const chunkSize = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (chunkId === FMT_) {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
      if (format === 0xfffe && chunkSize >= 40) {
        // WAVE_FORMAT_EXTENSIBLE: the real format tag is the first GUID field.
        format = view.getUint16(body + 24, true);
      }
    } else if (chunkId === DATA) {
      dataStart = body;
      dataLength = Math.min(chunkSize, bytes.byteLength - body);
    }
    offset = body + chunkSize + (chunkSize % 2);
  }

  if (dataStart < 0 || sampleRate === 0 || channels === 0) {
    throw new Error("WAV is missing fmt or data chunk");
  }
  if (format !== 1 && format !== 3) {
    throw new Error(`Unsupported WAV encoding (need PCM or IEEE float): format=${format}`);
  }

  const bytesPerSample = bitsPerSample / 8;
  const frameBytes = bytesPerSample * channels;
  const frames = Math.floor(dataLength / frameBytes);
  const mono = new Float32Array(frames);

  const readSample = (at) => {
    if (format === 3) {
      return bitsPerSample === 64 ? view.getFloat64(at, true) : view.getFloat32(at, true);
    }
    if (bitsPerSample === 8) return (view.getUint8(at) - 128) / 128;
    if (bitsPerSample === 16) return view.getInt16(at, true) / 32768;
    if (bitsPerSample === 24) {
      const raw = view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getInt8(at + 2) << 16);
      return raw / 8388608;
    }
    if (bitsPerSample === 32) return view.getInt32(at, true) / 2147483648;
    throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`);
  };

  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    const base = dataStart + frame * frameBytes;
    for (let channel = 0; channel < channels; channel++) {
      sum += readSample(base + channel * bytesPerSample);
    }
    mono[frame] = sum / channels;
  }

  return { samples: mono, sampleRate, channels };
}

/** Linear resample — only ever used when a reference sample isn't already 24 kHz. */
export function resampleLinear(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.floor(samples.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(samples.length - 1, left + 1);
    const frac = position - left;
    out[i] = samples[left] * (1 - frac) + samples[right] * frac;
  }
  return out;
}
