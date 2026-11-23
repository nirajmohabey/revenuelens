import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'web');
const destination = join(root, 'dist');
const required = ['index.html', 'market.js', 'market-model.mjs', 'lab.html', 'styles.css', 'app.js', 'model.mjs'];
for (const file of required) {
  const entry = await stat(join(source, file));
  if (!entry.isFile()) throw new Error(`Missing web source: ${file}`);
}
await mkdir(destination, { recursive: true });
// Deliberately copy individual source entries: dist/data is owned by the pipeline.
const entries = await readdir(source, { withFileTypes: true });
if (entries.some((entry) => entry.name === 'data')) {
  throw new Error('web/data is reserved; analytical exports belong in dist/data.');
}
for (const entry of entries) {
  await cp(join(source, entry.name), join(destination, entry.name), { recursive: true });
}
console.log(`Built ${entries.length} web entries; retained analytical exports in dist/data.`);
