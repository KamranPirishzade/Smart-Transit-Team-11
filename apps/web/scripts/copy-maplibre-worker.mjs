/**
 * MapLibre v6's worker imports maplibre-gl-shared.mjs by relative path.
 * Turbopack/Next rewrite the worker URL but not that sibling, so maps stay blank.
 * Serve both files from /public/maplibre instead (see MapLibre "Turbopack" docs).
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const dist = path.join(path.dirname(require.resolve('maplibre-gl/package.json')), 'dist');
const dest = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'maplibre');

mkdirSync(dest, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(dist, file), path.join(dest, file));
}
console.log(`[copy-maplibre-worker] copied worker + shared into ${dest}`);
