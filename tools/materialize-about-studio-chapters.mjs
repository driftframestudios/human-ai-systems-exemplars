import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { readDocumentSpans } from './html-document-spans.mjs';
import { createEmbeddedContentFitProjection, embeddedContentFitSource } from './materialize-embedded-content-fit.mjs';

export const studioSourcePath = 'collaboration/initiative-costing-calculator/index.html';
export const studioChaptersPath = 'collaboration/about-investment-studio-chapters/index.html';
export const studioChapterInputs = Object.freeze({
  source: studioSourcePath,
  styles: 'collaboration/about-investment-studio-chapters/chapters.css',
  adapter: 'collaboration/about-investment-studio-chapters/chapters.js',
  fit: embeddedContentFitSource,
});
const root = resolve(import.meta.dirname, '..');

export async function readStudioChapterInputs(repositoryRoot = root) {
  return Object.fromEntries(await Promise.all(Object.entries(studioChapterInputs)
    .map(async ([key, path]) => [key, await readFile(resolve(repositoryRoot, path), 'utf8')])));
}

export function createStudioChapterProjection({ source, styles, adapter, fit }) {
  if (source.includes('data-about-studio-chapters')) throw new Error('Studio chapter derivation requires the original full Studio.');
  if (!styles.trim() || /<\/style\b/iu.test(styles)) throw new Error('Chapter styles require inline-safe CSS.');
  if (!adapter.trim() || /<!--|<\/script\b/iu.test(adapter)) throw new Error('Chapter presentation requires inline-safe JavaScript.');
  // The original document remains an exact subsequence: this receiver adds a
  // presentation layer while retaining every original control and model script.
  const { closingOffset } = readDocumentSpans(source);
  const head = closingOffset('head');
  const body = closingOffset('body');
  return source.slice(0, head) + '<style data-about-studio-chapters>' + styles.trimEnd() + '</style>'
    + source.slice(head, body) + '<script data-about-studio-chapters>' + adapter.trimEnd() + '</script>'
    + createEmbeddedContentFitProjection(fit) + source.slice(body);
}

export function assertStudioChapterProjection(html, inputs) {
  if (html !== createStudioChapterProjection(inputs)) {
    throw new Error('About Studio chapters are stale; run npm run build:about-studio-chapters.');
  }
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length && args[0] !== '--check')) {
    throw new Error('Usage: node tools/materialize-about-studio-chapters.mjs [--check]');
  }
  const inputs = await readStudioChapterInputs();
  const expected = createStudioChapterProjection(inputs);
  const output = resolve(root, studioChaptersPath);
  if (args[0] === '--check') {
    assertStudioChapterProjection(await readFile(output, 'utf8'), inputs);
    console.log('About Studio chapters match their full Studio, presentation, and layout owners.');
  } else {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, expected);
    console.log('Materialized About Studio chapters while preserving the full Studio source.');
  }
}

if (isDirectExecution(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
