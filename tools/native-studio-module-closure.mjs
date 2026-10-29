import './node-runtime-admission.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'acorn';
import { build } from 'esbuild';
import { browserSharedJavaScriptPaths } from './node-route-inventory.mjs';

export const NATIVE_STUDIO_ROOT = 'collaboration/native-investment-studio';
export const NATIVE_STUDIO_ENTRY = `${NATIVE_STUDIO_ROOT}/controller.mjs`;
const MANIFEST = 'deployment/cpanel/primary-route-manifest.json';

export class NativeModuleClosureError extends Error {
  constructor(code, module, detail = '') {
    super(`${code}: ${module}${detail ? ` (${detail})` : ''}`);
    this.name = 'NativeModuleClosureError';
    this.code = code;
    this.module = module;
  }
}

const fail = (code, module, detail) => { throw new NativeModuleClosureError(code, module, detail); };
const isNative = value => typeof value === 'string' && value.startsWith(`${NATIVE_STUDIO_ROOT}/`);
function canonicalModule(value) {
  if (!isNative(value) || path.posix.normalize(value) !== value ||
      !/^[a-zA-Z0-9_./-]+\.mjs$/u.test(value)) fail('module-path', String(value));
  return value;
}

function importedModule(owner, specifier) {
  if (typeof specifier !== 'string' || !/^\.\.?\/[a-zA-Z0-9_./-]+\.mjs$/u.test(specifier)) {
    fail('import-path', owner, String(specifier));
  }
  return canonicalModule(path.posix.normalize(path.posix.join(path.posix.dirname(owner), specifier)));
}

// Syntax admission observes even branches a bundler would remove. Runtime asset
// acquisition (for example fetch or URL construction) retains its own oracle.
function staticImports(source, owner) {
  let tree;
  try {
    const text = typeof source === 'string' ? source : new TextDecoder('utf-8', { fatal: true }).decode(source);
    tree = parse(text, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch { fail('module-syntax', owner); }
  const imports = [];
  const pending = [tree];
  while (pending.length) {
    const node = pending.pop();
    if (node.type === 'ImportExpression') fail('dynamic-import', owner);
    // Keep CommonJS loader references, including aliases, outside this ESM grammar.
    if (node.type === 'Identifier' && node.name === 'require') fail('commonjs-load', owner);
    if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
      if (node.attributes?.length) fail('import-attributes', owner);
      if (node.source) imports.push(importedModule(owner, node.source.value));
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child.type === 'string') pending.push(child);
      } else if (value && typeof value.type === 'string') pending.push(value);
    }
  }
  return imports;
}

/** Parse each reachable module once, retaining cycles and repeated imports. */
export async function parseNativeModuleGraph(load, entry = NATIVE_STUDIO_ENTRY) {
  const paths = new Set([canonicalModule(entry)]);
  const sources = new Map();
  const pending = [entry];
  while (pending.length) {
    const owner = pending.pop();
    let source;
    try { source = await load(owner); } catch { fail('module-missing', owner); }
    if (source === undefined || source === null) fail('module-missing', owner);
    sources.set(owner, source);
    for (const imported of staticImports(source, owner)) {
      if (!paths.has(imported)) { paths.add(imported); pending.push(imported); }
    }
  }
  // Retain the prior delivery check's import/export linkage observation after
  // every authored module has passed syntax admission. Resolution stays in memory.
  try {
    await build({
      entryPoints: [entry], bundle: true, write: false, platform: 'browser',
      format: 'esm', treeShaking: false, logLevel: 'silent',
      plugins: [{ name: 'native-static-link', setup(builder) {
        builder.onResolve({ filter: /.*/ }, args => {
          const resolved = args.kind === 'entry-point' ? entry : importedModule(args.importer, args.path);
          if (!sources.has(resolved)) fail('module-missing', resolved);
          return { path: resolved, namespace: 'native-static-link' };
        });
        builder.onLoad({ filter: /.*/, namespace: 'native-static-link' }, args => ({
          contents: sources.get(args.path), loader: 'js',
        }));
      } }],
    });
  } catch { fail('module-link', entry); }
  return Object.freeze([...paths].sort());
}

/** Compare independent delivery and runtime owners with parsed reachability. */
export function verifyNativeModuleOwnership(paths, manifestFiles, browserPaths) {
  const graph = new Set(paths);
  const manifested = new Set();
  for (const file of manifestFiles) {
    if (!isNative(file.source_path) && !isNative(file.projected_path)) continue;
    const source = canonicalModule(file.source_path);
    if (manifested.has(source)) fail('manifest-duplicate', source);
    manifested.add(source);
    if (file.projected_path !== source) fail('manifest-geometry', source);
    if (file.media_type !== 'text/javascript') fail('manifest-media', source);
    if (!graph.has(source)) fail('manifest-orphan', source);
  }
  const classified = new Set();
  for (const source of browserPaths.filter(isNative)) {
    canonicalModule(source);
    if (classified.has(source)) fail('inventory-duplicate', source);
    classified.add(source);
    if (!graph.has(source)) fail('inventory-orphan', source);
  }
  for (const source of graph) {
    if (!manifested.has(source)) fail('manifest-missing', source);
    if (!classified.has(source)) fail('inventory-missing', source);
  }
}

/** Keep exact bytes for both local serving and the final production projection. */
export async function readNativeModuleClosure(repositoryRoot) {
  const sources = new Map();
  const paths = await parseNativeModuleGraph(async source => {
    const bytes = await readFile(path.join(repositoryRoot, source));
    sources.set(source, bytes);
    return bytes;
  });
  const manifest = JSON.parse(await readFile(path.join(repositoryRoot, MANIFEST), 'utf8'));
  verifyNativeModuleOwnership(paths, manifest.files, browserSharedJavaScriptPaths());
  return { paths, sources };
}
