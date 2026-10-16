import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let html = await readFile(path.join(root, 'src/page.html'), 'utf8');
for (const name of ['core', 'learning', 'curriculum', 'tools']) {
  const code = await readFile(path.join(root, `src/${name}.js`), 'utf8');
  if (/<\/script\s*>/i.test(code)) throw new Error(`Unexpected closing script tag in ${name}`);
  const marker = `<!-- script:${name} -->`;
  if (!html.includes(marker)) throw new Error(`Missing ${marker}`);
  html = html.replace(marker, () => `<script>\n${code}</script>`);
}
if (process.argv.includes('--check')) {
  if (html !== await readFile(path.join(root, 'index.html'), 'utf8')) throw new Error('Run npm run build and commit index.html');
} else {
  await writeFile(path.join(root, 'index.html'), html);
}
