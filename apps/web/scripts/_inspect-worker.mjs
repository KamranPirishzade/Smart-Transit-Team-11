import fs from 'node:fs';
const w = fs.readFileSync(
  new URL('../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url),
  'utf8',
);
console.log(w.slice(0, 500));
console.log('---imports---');
console.log([...w.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((x) => x[1]).slice(0, 20));
