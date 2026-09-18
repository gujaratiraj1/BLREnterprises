import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'style.css', 'script.js', 'assistant.js', 'assistant.css', 'site-config.js']) {
  await copyFile(new URL(file, root), new URL(file, dist));
}
await cp(new URL('assets/', root), new URL('assets/', dist), { recursive: true });
