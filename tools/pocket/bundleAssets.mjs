/**
 * Pocket-tts ONNX bundle metadata + asset loading, Node port.
 *
 * Ported from next-editor's `src/studio/tts/pocket/bundleAssets.ts`, itself a
 * port of the pocket-tts-web demo (Apache-2.0,
 * KevinAHM/pocket-tts-web@d0c0c79b7712256a32d691c67f20b8ae2e020d00; model
 * weights under Kyutai's pocket-tts terms).
 *
 * Difference from the browser original: assets are cached on disk under
 * `.narration-cache/onnx/` instead of the Cache Storage API, so the ~125 MB
 * bundle downloads once per checkout.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
/** tools/pocket -> tools -> project root */
export const PROJECT_ROOT = join(HERE, "..", "..");

/** Pinned, public, immutable bundle revision. */
export const DEFAULT_BUNDLE_BASE_URL =
  "https://huggingface.co/spaces/KevinAHM/pocket-tts-web/resolve/d0c0c79b7712256a32d691c67f20b8ae2e020d00/onnx/english_2026-04";

export const DEFAULT_CACHE_DIR = join(PROJECT_ROOT, ".narration-cache", "onnx");

function cachePathFor(cacheDir, baseUrl, filename) {
  // The revision is pinned, but key on the base URL anyway so switching
  // bundles never serves a stale file.
  const bucket = createHash("sha256").update(baseUrl).digest("hex").slice(0, 12);
  return join(cacheDir, bucket, filename);
}

/**
 * Fetch one bundle asset, memoised on disk. Returns a Node Buffer (which is a
 * Uint8Array, so it feeds straight into ort.InferenceSession.create).
 */
export async function fetchBundleAsset(baseUrl, filename, cacheDir = DEFAULT_CACHE_DIR) {
  const path = cachePathFor(cacheDir, baseUrl, filename);
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const url = `${baseUrl}/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());

  await mkdir(dirname(path), { recursive: true });
  // Write-then-rename so an interrupted download never leaves a truncated
  // cache entry that later runs would happily reuse.
  const temp = `${path}.${process.pid}.partial`;
  await writeFile(temp, bytes);
  await rename(temp, path);
  return bytes;
}

export async function fetchBundleMetadata(baseUrl, cacheDir = DEFAULT_CACHE_DIR) {
  const bytes = await fetchBundleAsset(baseUrl, "bundle.json", cacheDir);
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** ArrayBuffer view over a Buffer's exact bytes (Buffers share a pooled one). */
export function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
