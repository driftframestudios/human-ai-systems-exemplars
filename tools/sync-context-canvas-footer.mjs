import './node-runtime-admission.mjs';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const pages = new URL('../context-canvas-project-surface/context-canvas/', import.meta.url);

// Each portfolio document ends with its site footer. Earlier footer elements
// can belong to self-contained articles or instruments.
function siteFooter(source) {
  const start = source.lastIndexOf('<footer');
  const end = source.indexOf('</footer>', start);
  if (start < 0 || end < 0) throw new Error('Expected a closing site footer');
  return source.slice(start, end + '</footer>'.length);
}

const about = await readFile(new URL('index.html', pages), 'utf8');
const footer = siteFooter(about);
for (const entry of await readdir(pages, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html') || entry.name === 'index.html') continue;
  const file = new URL(entry.name, pages);
  const source = await readFile(file, 'utf8');
  const previous = siteFooter(source);
  if (previous !== footer) {
    const start = source.lastIndexOf(previous);
    await writeFile(file, source.slice(0, start) + footer + source.slice(start + previous.length));
  }
}
