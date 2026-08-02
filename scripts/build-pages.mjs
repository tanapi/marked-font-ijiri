import { cp, mkdir, rm } from 'node:fs/promises';

const outDir = new URL('../_site/', import.meta.url);
const files = [
  'index.html',
  'marked-font-ijiri.js',
  'font-ijiri.css',
];
const directories = [
  'assets',
];

await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

for (const file of files) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, outDir));
}

for (const directory of directories) {
  await cp(new URL(`../${directory}`, import.meta.url), new URL(directory, outDir), { recursive: true });
}
