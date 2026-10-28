import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
export const embeddedContentFitSource = 'collaboration/embedded-content-fit.js';
export const embeddedContentFitTargets = Object.freeze([
  'collaboration/about-ai-method-gallery/index.html',
  'collaboration/about-prompt-conditions-explorer/index.html',
]);
const start = '<!-- embedded-content-fit:start -->';
const end = '<!-- embedded-content-fit:end -->';

export function createEmbeddedContentFitProjection(source) {
  // Raw comment openers and script closers change the HTML parser's script state.
  // The canonical adapter expresses any such literal text with JavaScript escapes.
  if (typeof source !== 'string' || source.trim().length === 0 || /<!--|<\/script\b/iu.test(source)) {
    throw new Error('The child adapter requires nonempty inline-safe JavaScript source.');
  }
  return `${start}\n<script data-embedded-content-fit>\n${source.trimEnd()}\n</script>\n${end}`;
}

export function replaceEmbeddedContentFitProjection(html, projection) {
  const first = html.indexOf(start);
  const last = html.indexOf(end);
  if (first < 0 || last < first || html.indexOf(start, first + start.length) !== -1
    || html.indexOf(end, last + end.length) !== -1) {
    throw new Error('Each child receiver requires one ordered content-fit projection boundary.');
  }
  return html.slice(0, first) + projection + html.slice(last + end.length);
}

export async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node tools/materialize-embedded-content-fit.mjs [--check]');
  }
  const [source, ...receivers] = await Promise.all(
    [embeddedContentFitSource, ...embeddedContentFitTargets].map(path => readFile(resolve(root, path), 'utf8')),
  );
  const projection = createEmbeddedContentFitProjection(source);
  // Validate every receiving boundary before preparing any repository write.
  const expected = receivers.map(receiver => replaceEmbeddedContentFitProjection(receiver, projection));
  if (args[0] === '--check') {
    const stale = embeddedContentFitTargets.filter((_path, index) => expected[index] !== receivers[index]);
    if (stale.length) throw new Error(`Child content-fit projections are stale: ${stale.join(', ')}. Run node tools/materialize-embedded-content-fit.mjs.`);
    console.log('Both child content-fit projections match their canonical layout adapter.');
    return;
  }
  for (const [index, path] of embeddedContentFitTargets.entries()) {
    if (expected[index] !== receivers[index]) await writeFile(resolve(root, path), expected[index]);
  }
  console.log('Materialized the shared content-fit adapter into its two declared instruments.');
}

if (isDirectExecution(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
