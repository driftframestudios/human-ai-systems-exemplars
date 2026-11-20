import './node-runtime-admission.mjs';
import { posix } from 'node:path';
import { parse } from 'acorn';

// The manifest owns file destinations. Both the compatibility document and
// its directory index can use the same root-relative asset and page links.
export function createDirectoryRoutes(manifest, baseUrl, names = {}) {
  const base = new URL(baseUrl);
  const destinations = new Map();
  const entries = new Map();
  const occupied = new Set(manifest.files.map(file => file.projected_path.toLowerCase()));
  const unusedNames = new Set(Object.keys(names));
  function reserve(directory) {
    const index = directory + '/index.html';
    if (occupied.has(index.toLowerCase()) || occupied.has(directory.toLowerCase())) {
      throw new Error('Directory index collides with a manifest destination: ' + index);
    }
    occupied.add(index.toLowerCase());
    return index;
  }
  for (const { projected_path: path, media_type: type } of manifest.files) {
    let publicPath = '/' + path;
    if (type === 'text/html' && path !== '404.html') {
      if (posix.basename(path) === 'index.html') publicPath = publicPath.slice(0, -'index.html'.length);
      else {
        const directory = path.slice(0, -'.html'.length);
        const stem = names[path];
        if (stem !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(stem)) {
          throw new Error('Invalid public directory name for ' + path);
        }
        const preferred = stem === undefined ? directory : posix.join(posix.dirname(path), stem);
        const indexes = [reserve(preferred)];
        if (preferred !== directory) indexes.push(reserve(directory));
        publicPath = '/' + preferred + '/';
        destinations.set('/' + directory + '/', publicPath);
        entries.set(path, indexes);
        unusedNames.delete(path);
      }
    }
    destinations.set('/' + path, publicPath);
  }
  if (unusedNames.size) throw new Error('No portfolio HTML route for ' + [...unusedNames].join(', '));
  function resolve(value, consumer, knownOnly = false) {
    if (!value || /^[#?]|^\/\/|^[a-z][a-z\d+.-]*:/iu.test(value) && !value.startsWith(base.href)) return value;
    const url = new URL(value, new URL(consumer, base));
    const destination = destinations.get(url.pathname);
    if (knownOnly && destination === undefined) return value;
    return (value.startsWith(base.href) ? base.origin : '') +
      (destination ?? url.pathname) + url.search + url.hash;
  }
  return { entries, resolve };
}

// A data URL can contain commas. Walk the URL and descriptor spans separately
// and leave descriptor spelling and separators intact.
export function mapImageCandidates(value, rewrite) {
  let offset = 0;
  let cursor = 0;
  const result = [];
  while (offset < value.length) {
    while (offset < value.length && /[\t\n\f\r ,]/u.test(value[offset])) offset++;
    const start = offset;
    while (offset < value.length && !/[\t\n\f\r ]/u.test(value[offset])) offset++;
    let end = offset;
    while (end > start && value[end - 1] === ',') end--;
    if (end > start) {
      result.push(value.slice(cursor, start), rewrite(value.slice(start, end)));
      cursor = end;
    }
    if (end < offset) continue;
    let depth = 0;
    while (offset < value.length) {
      const ch = value[offset++];
      if (ch === '(') depth++;
      else if (ch === ')' && depth) depth--;
      else if (ch === ',' && depth === 0) break;
    }
  }
  return result.join('') + value.slice(cursor);
}

// Change literal network/navigation destinations at their use site. Example
// filenames inside a seed, exported plan, or other data keep their meaning.
export function projectScriptUrls(source, resolve, { footer = false, module = false } = {}) {
  if (!footer && !/fetch\s*\(|\bimport\b|new\s+URL\b|\.(?:href|src|poster)\s*=/u.test(source)) return source;
  const nodes = [parse(source, { ecmaVersion: 'latest', sourceType: module ? 'module' : 'script' })];
  const edits = new Map();
  function edit(node) {
    if (node?.type !== 'Literal' || typeof node.value !== 'string') return;
    const value = resolve(node.value);
    if (value !== node.value) edits.set(node.start, { end: node.end, value: JSON.stringify(value) });
  }
  while (nodes.length) {
    const node = nodes.pop();
    if (node.type === 'ImportDeclaration' || node.type === 'ImportExpression' ||
      node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') edit(node.source);
    if (node.type === 'CallExpression' && node.callee.name === 'fetch') edit(node.arguments[0]);
    if (node.type === 'NewExpression' && node.callee.name === 'URL') {
      const base = node.arguments[1];
      if (base?.type === 'MemberExpression' && base.object.name === 'document' &&
          base.property.name === 'baseURI') edit(node.arguments[0]);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
      ['href', 'src', 'poster'].includes(node.left.property.name)) edit(node.right);
    if (footer && node.type === 'VariableDeclarator' && node.id.name === 'routes' && node.init?.type === 'ObjectExpression') {
      for (const group of node.init.properties) {
        for (const pair of group.value.elements) edit(pair.elements[1]);
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) nodes.push(...value.filter(child => child?.type));
      else if (value?.type) nodes.push(value);
    }
  }
  const chunks = [];
  let cursor = 0;
  for (const [start, { end, value }] of [...edits].sort(([a], [b]) => a - b)) {
    chunks.push(source.slice(cursor, start), value);
    cursor = end;
  }
  return chunks.join('') + source.slice(cursor);
}
