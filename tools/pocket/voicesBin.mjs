/**
 * Parsers for the pocket-tts ONNX bundle's binary sidecars.
 *
 * Ported from next-editor's `src/studio/tts/pocket/voicesBin.ts` (Apache-2.0,
 * originally KevinAHM/pocket-tts-web@d0c0c79b7712256a32d691c67f20b8ae2e020d00):
 * - `voices.bin` (PTVB1): per-voice precomputed flow-LM state tensors, so
 *   built-in voices need no reference audio or mimi encoder at runtime.
 * - `.npy` float32 tensors (the learned BOS-before-voice embedding).
 *
 * Node difference: inputs are Uint8Array/Buffer rather than ArrayBuffer.
 */

function viewOf(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function sliceCopy(bytes, start, length) {
  // Copy so the typed-array views are aligned and independent of Node's
  // shared Buffer pool.
  return bytes.buffer.slice(bytes.byteOffset + start, bytes.byteOffset + start + length);
}

export function parseVoiceStatesBin(bytes) {
  const view = viewOf(bytes);
  let offset = 0;
  const magic = new TextDecoder().decode(bytes.subarray(0, 5));
  offset += 5;
  if (magic !== "PTVB1") {
    throw new Error("Invalid voices.bin header");
  }

  const voices = {};
  const voiceCount = view.getUint32(offset, true);
  offset += 4;

  for (let voiceIndex = 0; voiceIndex < voiceCount; voiceIndex++) {
    const nameLen = view.getUint16(offset, true);
    offset += 2;
    const name = new TextDecoder().decode(bytes.subarray(offset, offset + nameLen));
    offset += nameLen;

    const tensorCount = view.getUint16(offset, true);
    offset += 2;
    const tensors = {};

    for (let tensorIndex = 0; tensorIndex < tensorCount; tensorIndex++) {
      const keyLen = view.getUint16(offset, true);
      offset += 2;
      const key = new TextDecoder().decode(bytes.subarray(offset, offset + keyLen));
      offset += keyLen;

      const dtypeCode = view.getUint8(offset);
      offset += 1;
      const rank = view.getUint8(offset);
      offset += 1;

      const shape = [];
      for (let dimIndex = 0; dimIndex < rank; dimIndex++) {
        shape.push(view.getUint32(offset, true));
        offset += 4;
      }

      const byteLength = view.getUint32(offset, true);
      offset += 4;

      let data;
      let dtype;
      if (dtypeCode === 0) {
        data = new Float32Array(sliceCopy(bytes, offset, byteLength));
        dtype = "float32";
      } else if (dtypeCode === 1) {
        data = new BigInt64Array(sliceCopy(bytes, offset, byteLength));
        dtype = "int64";
      } else if (dtypeCode === 2) {
        data = new Uint8Array(sliceCopy(bytes, offset, byteLength));
        dtype = "bool";
      } else {
        throw new Error(`Unsupported voices.bin dtype code: ${dtypeCode}`);
      }
      offset += byteLength;

      tensors[key] = { data, shape, dtype };
    }

    voices[name] = tensors;
  }

  return voices;
}

export function parseNpyFloat32(bytes) {
  const view = viewOf(bytes);
  const expected = [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59];
  for (let i = 0; i < expected.length; i++) {
    if (bytes[i] !== expected[i]) {
      throw new Error("Invalid NPY file");
    }
  }

  const major = view.getUint8(6);
  const headerLen = major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
  const headerOffset = major === 1 ? 10 : 12;
  const headerText = new TextDecoder().decode(
    bytes.subarray(headerOffset, headerOffset + headerLen),
  );
  const shapeMatch = headerText.match(/\(\s*([0-9,\s]+)\)/);
  if (!shapeMatch) {
    throw new Error("Could not parse NPY shape");
  }
  const shape = shapeMatch[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10));
  const dataOffset = headerOffset + headerLen;
  return {
    data: new Float32Array(sliceCopy(bytes, dataOffset, bytes.byteLength - dataOffset)),
    shape,
  };
}
