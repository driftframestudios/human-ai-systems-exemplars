import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'html-minifier';
import { syntax } from 'csso';
import { minify as minifyJs } from 'terser';
import * as prettier from 'prettier';
import xml from '@prettier/plugin-xml';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('html-minifier.config.json', root), 'utf8'));
const supported = new Set(['.html', '.css', '.svg', '.xml', '.js', '.mjs', '.json', '.jsonld']);

const jsOptions = {
  compress: false, mangle: false,
  format: { comments: 'all', quote_style: 3, keep_quoted_props: true, keep_numbers: true },
};

function compactCss(source) {
  let result = '';
  syntax.tokenize(source, (type, start, end) => {
    const token = source.slice(start, end);
    result += /^\s+$/u.test(token) ? ' ' : token;
  });
  return result.trim();
}

// Remove indentation only in known element-only containers. Text, mixed
// content, graphic labels, metadata and xml:space retain their original bytes.
function compactXml(source) {
  const ranges = [];
  const containers = new Set(['svg', 'g', 'defs', 'symbol', 'clipPath', 'mask', 'marker', 'pattern', 'linearGradient', 'radialGradient', 'filter', 'urlset', 'url', 'sitemapindex', 'sitemap']);
  function visit(element) {
    if (element.attribute.some(attr => attr.Name === 'xml:space')) return;
    if (!containers.has(element.Name) || !element.content) return;
    for (const text of element.content.chardata) {
      if (text.SEA_WS) ranges.push(text.location);
    }
    element.content.element.forEach(visit);
  }
  visit(xml.parsers.xml.parse(source).element);
  let cursor = 0;
  const chunks = [];
  for (const range of ranges.sort((a,b) => a.startOffset - b.startOffset)) {
    chunks.push(source.slice(cursor, range.startOffset));
    cursor = range.endOffset + 1;
  }
  return chunks.join('') + source.slice(cursor).trimEnd();
}

export async function compactSource(file, source) {
  switch (path.extname(file)) {
    case '.html': return minify(source, { ...config, minifyCSS: compactCss, minifySVG: { plugins: [] },
      minifyJS: jsOptions });
    case '.svg':
    case '.xml': return compactXml(source);
    case '.js':
    case '.mjs': return (await minifyJs(source, jsOptions)).code;
    case '.css': return compactCss(source);
    case '.json':
    case '.jsonld': return compactJson(source);
    default: throw new Error('Unsupported source format: ' + file);
  }
}

// Preserve numeric spellings and keys, including integers beyond Number precision.
function compactJson(source) {
  JSON.parse(source);
  return source.replace(/"(?:\\[\s\S]|[^"\\])*"|[\t\r\n ]+/gu, token => token[0] === '"' ? token : '');
}

export async function compactDeliveryBytes(file, bytes) {
  if (!supported.has(path.extname(file))) return bytes;
  return Buffer.from(await compactSource(file, bytes.toString('utf8')));
}

export async function carrierSourceFiles() {
  const json = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
  const manifest = await json('deployment/cpanel/primary-route-manifest.json');
  const files = new Set(manifest.files.map(file => file.source_path));
  const core = 'core-architectures-chimeric-prototype-current-pack-v0.1';
  for (const [manifestPath, directory] of [
    ['iframe-route-families/canvas/public-iframe-route-manifest-v1.json', ''],
    [core + '/public-iframe-route-manifest-v1.json', core],
  ]) {
    for (const route of (await json(manifestPath)).routes) {
      const dir = route.source_root ?? directory;
      files.add(path.posix.join(dir, route.source_file));
      for (const asset of route.package_files ?? []) files.add(path.posix.join(dir, asset.source_file));
    }
  }
  return [...files].filter(file => supported.has(path.extname(file))).sort();
}

async function main([mode, ...args]) {
  if (!['compact','pretty','list'].includes(mode)) throw new Error('Choose compact, pretty, or list.');
  const files = args.length === 1 && args[0] === '--carrier' ? await carrierSourceFiles() : args;
  if (!files.length) throw new Error('Supply file paths or --carrier.');
  if (mode === 'list') { console.log(files.join('\n')); return; }
  for (const file of files) {
    if (!supported.has(path.extname(file))) throw new Error('Unsupported source format: ' + file);
    const source = await readFile(file, 'utf8');
    try {
      const output = mode === 'pretty' ? await prettier.format(source, {
        filepath: file, plugins: [xml], ...( /\.(svg|xml)$/u.test(file) ? {parser:'xml',xmlWhitespaceSensitivity:'preserve'} : {}),
      }) : (await compactSource(file, source)).trimEnd() + '\n';
      if (source !== output) await writeFile(file, output);
    } catch (cause) { throw new Error('Could not format ' + file, {cause}); }
  }
}

if (isDirectExecution(import.meta.url)) await main(process.argv.slice(2));
