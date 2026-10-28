import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
export const heatmapSourcePath = 'collaboration/about-heatmap-comparison/index.html';
export const aboutPath = 'context-canvas-project-surface/context-canvas/index.html';
const start = '<!-- about-heatmap-projection:start -->';
const end = '<!-- about-heatmap-projection:end -->';
const classes = new Set(['eyebrow', 'controls', 'status', 'views', 'view', 'marker', 'foot']);

// The standalone instrument owns this deliberately small, authored HTML vocabulary.
// A changed shape returns to this receiving adapter before a projection is written.
export function createAboutHeatmapProjection(source) {
  const mains = [...source.matchAll(/<main\b[^>]*>[\s\S]*?<\/main>/gu)];
  if (mains.length !== 1) throw new Error('Heatmap source requires one semantic main owner.');
  let content = mains[0][0];
  for (const mode of ['before', 'after']) {
    if ([...content.matchAll(new RegExp(`<figure class="view" data-view="${mode}">`, 'gu'))].length !== 1) {
      throw new Error(`Heatmap source requires one ${mode} figure.`);
    }
  }
  if (!content.startsWith('<main id="comparison" data-mode="side" aria-labelledby="comparison-title">')) {
    throw new Error('Heatmap source requires its named static comparison state.');
  }
  content = content
    .replace(/^<main[^>]*>/u, '<section class="about-heatmap" data-about-heatmap data-mode="side" aria-labelledby="about-heatmap-title">')
    .replace(/<\/main>$/u, '</section>')
    .replace('<header>', '<div class="about-heatmap__header">').replace('</header>', '</div>')
    .replace('<h1 id="comparison-title">', '<h3 id="about-heatmap-title">').replace('</h1>', '</h3>')
    .replace('id="status"', 'id="about-heatmap-status"')
    .replaceAll('../../context-canvas-project-surface/img/', '../img/')
    .replace(/class="([^"]+)"/gu, (match, value) => {
      if (value.startsWith('about-heatmap')) return match;
      if (!classes.has(value)) throw new Error(`Heatmap projection needs a receiver for class ${value}.`);
      return `class="about-heatmap__${value}"`;
    })
    .replace('class="about-heatmap__controls"', 'class="about-heatmap__controls" hidden')
    .replace('class="about-heatmap__status"', 'class="about-heatmap__status" hidden');
  if (/\bid="(?:comparison|status)"|<main\b|<h1\b/u.test(content)) throw new Error('Heatmap projection retains a standalone-only identity.');
  return `${start}\n${content}\n${end}`;
}

export function replaceAboutHeatmapProjection(about, projection) {
  const starts = [...about.matchAll(/<!-- about-heatmap-projection:start -->/gu)];
  const ends = [...about.matchAll(/<!-- about-heatmap-projection:end -->/gu)];
  if (starts.length !== 1 || ends.length !== 1 || starts[0].index >= ends[0].index) {
    throw new Error('About requires one ordered heatmap projection boundary.');
  }
  return about.slice(0, starts[0].index) + projection + about.slice(ends[0].index + end.length);
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) throw new Error('Usage: node tools/materialize-about-heatmap.mjs [--check]');
  const [source, about] = await Promise.all([heatmapSourcePath, aboutPath].map(path => readFile(resolve(root, path), 'utf8')));
  const expected = replaceAboutHeatmapProjection(about, createAboutHeatmapProjection(source));
  if (args[0] === '--check') {
    if (expected !== about) throw new Error('About heatmap projection is stale; run node tools/materialize-about-heatmap.mjs.');
    console.log('About heatmap projection matches its standalone content owner.');
  } else {
    if (expected !== about) await writeFile(resolve(root, aboutPath), expected);
    console.log('Materialized the native About heatmap from its standalone content owner.');
  }
}
if (isDirectExecution(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
