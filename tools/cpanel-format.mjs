import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'html-minifier';
import { syntax } from 'csso';
import { minify as minifyJs } from 'terser';
import * as prettier from 'prettier';
import { parsers as htmlParsers } from 'prettier/plugins/html';
import xml from '@prettier/plugin-xml';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('html-minifier.config.json', root), 'utf8'));
const supported = new Set(['.html', '.css', '.svg', '.xml', '.js', '.mjs', '.json', '.jsonld']);

const jsOptions = {
  compress: false, mangle: false,
  format: { comments: 'all', quote_style: 3, keep_quoted_props: true, keep_numbers: true },
};

async function compactJavaScript(source, inline = false, module = false) {
  return (await minifyJs(source, {
    ...jsOptions, module: Boolean(module), parse: { bare_returns: Boolean(inline) },
  })).code;
}

function compactCss(source) {
  let result = '';
  syntax.tokenize(source, (type, start, end) => {
    const token = source.slice(start, end);
    result += /^[\t\n\f\r ]+$/u.test(token) ? ' ' : token;
  });
  return result.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/gu, '');
}

const graphicContainers = new Set(['svg', 'g', 'defs', 'symbol', 'clipPath', 'mask', 'marker', 'pattern', 'linearGradient', 'radialGradient', 'filter', 'urlset', 'url', 'sitemapindex', 'sitemap']);

// Remove indentation only in known element-only containers. Text, mixed
// content, graphic labels, metadata and xml:space retain their original bytes.
function compactXml(source) {
  const ranges = [];
  function visit(element) {
    if (element.attribute.some(attr => attr.Name === 'xml:space')) return;
    if (!graphicContainers.has(element.Name) || !element.content) return;
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

// XML's strict mode preserves adjacent text runs. Supply indentation only
// where the SVG or sitemap grammar defines element-only content.
async function prettyXml(source) {
  const compact = compactXml(source);
  const inserts = [];
  function visit(element, depth) {
    const content = element.content;
    if (!graphicContainers.has(element.Name) || !content?.element.length ||
      element.attribute.some(attr => attr.Name === 'xml:space') ||
      content.chardata.some(node => node.TEXT) || content.CData.length || content.reference.length) return;
    for (const child of content.element) {
      inserts.push([child.location.startOffset, depth + 1]);
      visit(child, depth + 1);
    }
    inserts.push([compact.lastIndexOf('</', element.location.endOffset), depth]);
  }
  visit(xml.parsers.xml.parse(compact).element, 0);
  let start = 0;
  const parts = [];
  for (const [offset, depth] of inserts) {
    parts.push(compact.slice(start, offset), '\n', '  '.repeat(depth));
    start = offset;
  }
  return prettier.format(parts.join('') + compact.slice(start), {
    plugins: [xml], parser: 'xml', xmlWhitespaceSensitivity: 'strict',
  });
}

// Protect real preformatted content at DOM offsets. A template literal
// containing "<pre>" remains JavaScript and goes through the JS printer.
async function formatHtml(source, pretty = false) {
  const options = { ...config, minifyCSS: compactCss, minifySVG: { plugins: [] }, minifyJS: compactJavaScript };
  const format = html => pretty ? prettier.format(html, { parser: 'html' }) : minify(html, options);
  if (!/<(?:pre|textarea|svg)\b/iu.test(source)) return format(source);
  const ranges = [];
  function compactInlineGraphic(node) {
    const from = node.sourceSpan.start.offset;
    let cursor = from;
    const chunks = [];
    function readChildren(parent) {
      if (!graphicContainers.has(parent.name) || parent.attrs.some(attr => attr.name === 'space')) return;
      for (const child of parent.children) {
        if (child.kind === 'text' && /^[\t\n\r ]+$/u.test(child.value)) {
          chunks.push(source.slice(cursor, child.sourceSpan.start.offset));
          cursor = child.sourceSpan.end.offset;
        } else if (child.kind === 'element') readChildren(child);
      }
    }
    readChildren(node);
    return chunks.join('') + source.slice(cursor, node.sourceSpan.end.offset);
  }
  function visit(node) {
    if (node.name === 'svg') {
      const start = node.sourceSpan.start.offset, end = node.sourceSpan.end.offset;
      ranges.push([start, end, pretty ? source.slice(start, end) : compactInlineGraphic(node)]);
    } else if ((node.name === 'pre' || node.name === 'textarea') && node.endSourceSpan) {
      const start = node.startSourceSpan.end.offset, end = node.endSourceSpan.start.offset;
      ranges.push([start, end, source.slice(start, end)]);
    } else {
      node.children?.forEach(visit);
    }
  }
  visit(htmlParsers.html.parse(source, {}));
  let prefix = 'CPANEL_VERBATIM_';
  while (source.includes(prefix)) prefix += '_';
  let cursor = 0;
  const chunks = [];
  const originals = ranges.map(([start, end, value], index) => {
    chunks.push(source.slice(cursor, start), prefix + index + '_END');
    cursor = end;
    return value;
  });
  const compact = await format(chunks.join('') + source.slice(cursor));
  return compact.replace(new RegExp(prefix + '(\\d+)_END', 'gu'), (_, index) => originals[index]);
}

export async function compactSource(file, source) {
  switch (path.extname(file)) {
    case '.html': return formatHtml(source);
    case '.svg':
    case '.xml': return compactXml(source);
    case '.js':
    case '.mjs': return compactJavaScript(source, false, file.endsWith('.mjs'));
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

export async function prettySource(file, source) {
  if (file.endsWith('.html')) return formatHtml(source, true);
  if (/\.(?:svg|xml)$/u.test(file)) return prettyXml(source);
  return prettier.format(source, { filepath: file });
}

export async function compactDeliveryBytes(file, bytes) {
  if (!supported.has(path.extname(file))) return bytes;
  return Buffer.from(await compactSource(file, bytes.toString('utf8')));
}

export async function carrierSourceFiles() {
  const json = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
  const manifest = await json('deployment/cpanel/primary-route-manifest.json');
  const files = new Set(manifest.files.map(file => file.source_path));
  const { INLINE_OWNERS } = await import('./project-investment-analysis.mjs');
  const { studioChapterInputs } = await import('./materialize-about-studio-chapters.mjs');
  for (const owner of INLINE_OWNERS) files.add(owner.path);
  for (const owner of Object.values(studioChapterInputs)) files.add(owner);
  const core = 'core-architectures-chimeric-prototype-current-pack-v0.1';
  files.add(core + '/core-architectures-chimeric-prototype-manifest-v0.1.json');
  for (const [manifestPath, directory] of [
    ['iframe-route-families/canvas/public-iframe-route-manifest-v1.json', ''],
    [core + '/public-iframe-route-manifest-v1.json', core],
  ]) {
    for (const route of (await json(manifestPath)).routes) {
      const dir = route.source_root ?? directory;
      files.add(path.posix.join(dir, route.source_file));
      for (const asset of [...route.package_files ?? [], ...route.navigation_files ?? []]) files.add(path.posix.join(dir, asset.source_file));
    }
  }
  return [...files].filter(file => supported.has(path.extname(file))).sort();
}

async function main([mode, ...args]) {
  if (!['compact','pretty','list'].includes(mode)) throw new Error('Choose compact, pretty, or list.');
  const files = args.length === 1 && args[0] === '--carrier' ? await carrierSourceFiles() : args;
  if (!files.length) throw new Error('Supply file paths or --carrier.');
  if (mode === 'list') { console.log(files.join('\n')); return; }
  const changes = new Map();
  for (const file of files) {
    if (!supported.has(path.extname(file))) throw new Error('Unsupported source format: ' + file);
    const source = await readFile(file, 'utf8');
    try {
      const output = mode === 'pretty'
        ? await prettySource(file, source)
        : (await compactSource(file, source)).trimEnd() + '\n';
      if (source !== output) changes.set(file, output);
    } catch (cause) { throw new Error('Could not format ' + file, {cause}); }
  }
  for (const [file, output] of changes) await writeFile(file, output);
}

if (isDirectExecution(import.meta.url)) await main(process.argv.slice(2));
