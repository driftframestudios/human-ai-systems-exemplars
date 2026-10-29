import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NATIVE_STUDIO_ROOT as root, NATIVE_STUDIO_ENTRY as entry,
  NativeModuleClosureError, parseNativeModuleGraph, verifyNativeModuleOwnership,
} from '../../tools/native-studio-module-closure.mjs';

const dependency = `${root}/dependency.mjs`;
const extra = `${root}/extra.mjs`;
const graph = [entry, dependency].sort();
const manifest = paths => paths.map(source_path => ({ source_path, projected_path: source_path, media_type: 'text/javascript' }));
const error = code => value => value instanceof NativeModuleClosureError && value.code === code;
const parse = (source, other = 'export const value = 1;') => parseNativeModuleGraph(name =>
  new Map([[entry, source], [dependency, other]]).get(name));

test('static imports and re-exports retain cycles, deduplicate edges and load each file once', async () => {
  const sources = new Map([
    [entry, "import './dependency.mjs'; export { value } from './dependency.mjs'; export * from './dependency.mjs';"],
    [dependency, "import './controller.mjs'; export const value = 1;"],
  ]);
  const loads = [];
  assert.deepEqual(await parseNativeModuleGraph(name => { loads.push(name); return sources.get(name); }), graph);
  assert.deepEqual(loads, [entry, dependency]);
  assert.doesNotThrow(() => verifyNativeModuleOwnership(graph, manifest(graph), graph));
});

test('strings, comments, regular expressions and import.meta remain ordinary JavaScript', async () => {
  assert.deepEqual(await parse(`
    // import('./absent.mjs'); require('x')
    const text = "import(value) require(value)";
    const pattern = /require\\('x'\\)/;
    export const location = import.meta.url;
    export const example = { import() { return text; } };
  `), [entry]);
});

for (const [name, source, code] of [
  ['literal dynamic', "import('./dependency.mjs')", 'dynamic-import'],
  ['computed dynamic', 'const destination = globalThis.destination; import(destination)', 'dynamic-import'],
  ['dead dynamic', "if (false) import('./dependency.mjs')", 'dynamic-import'],
  ['nested template dynamic', 'const text = `${import(`${globalThis.destination}`)}`;', 'dynamic-import'],
  ['literal CommonJS', "require('./dependency.mjs')", 'commonjs-load'],
  ['computed CommonJS', 'require(globalThis.destination)', 'commonjs-load'],
  ['dead CommonJS', "if (false) require('./dependency.mjs')", 'commonjs-load'],
  ['aliased CommonJS', 'const load = require; load(globalThis.destination)', 'commonjs-load'],
  ['escaped CommonJS', "requ\\u0069re('./dependency.mjs')", 'commonjs-load'],
  ['bare', "import 'package'", 'import-path'],
  ['URL', "import 'https://example.test/dependency.mjs'", 'import-path'],
  ['query', "import './dependency.mjs?version=1'", 'import-path'],
  ['fragment', "import './dependency.mjs#part'", 'import-path'],
  ['encoded path', "import './%64ependency.mjs'", 'import-path'],
  ['outside root', "import '../outside.mjs'", 'module-path'],
  ['JSON attributes', "import value from './dependency.mjs' with { type: 'json' }", 'import-attributes'],
  ['syntax', 'export const value = ;', 'module-syntax'],
]) test(`syntax admission diagnoses ${name} before delivery`, async () => {
  await assert.rejects(parse(source), error(code));
});

test('missing files and invalid UTF-8 retain typed module context', async () => {
  await assert.rejects(parse("import './missing.mjs'"), value =>
    error('module-missing')(value) && value.module === `${root}/missing.mjs`);
  await assert.rejects(parseNativeModuleGraph(() => { throw new Error('read failed'); }), error('module-missing'));
  await assert.rejects(parseNativeModuleGraph(() => Buffer.from([0xff])), error('module-syntax'));
});

for (const [name, source] of [
  ['named', "import { missing } from './dependency.mjs'; console.log(missing)"],
  ['default', "import missing from './dependency.mjs'; console.log(missing)"],
  ['re-export', "export { missing } from './dependency.mjs'"],
]) test(`static linking diagnoses a missing ${name} binding before browser startup`, async () => {
  await assert.rejects(parse(source), error('module-link'));
});

for (const [name, change, code] of [
  ['missing manifest owner', rows => rows.pop(), 'manifest-missing'],
  ['orphan manifest owner', rows => rows.push(...manifest([extra])), 'manifest-orphan'],
  ['duplicate manifest owner', rows => rows.push({ ...rows[0] }), 'manifest-duplicate'],
  ['wrong MIME', rows => { rows[0].media_type = 'text/plain'; }, 'manifest-media'],
  ['changed import geometry', rows => { rows[0].projected_path = `assets/${rows[0].source_path}`; }, 'manifest-geometry'],
]) test(`ownership comparison diagnoses ${name}`, () => {
  const rows = manifest(graph); change(rows);
  assert.throws(() => verifyNativeModuleOwnership(graph, rows, graph), error(code));
});

for (const [name, paths, code] of [
  ['missing', [entry], 'inventory-missing'],
  ['orphan', [...graph, extra], 'inventory-orphan'],
  ['duplicate', [...graph, entry], 'inventory-duplicate'],
]) test(`browser inventory ${name} has an independent diagnostic`, () => {
  assert.throws(() => verifyNativeModuleOwnership(graph, manifest(graph), paths), error(code));
});

test('source and projected syntax receive independent graph observations', async () => {
  const source = await parse("import './dependency.mjs'");
  const projected = await parse('export const value = 1;');
  assert.deepEqual(source, graph);
  assert.deepEqual(projected, [entry]);
  assert.throws(() => verifyNativeModuleOwnership(projected, manifest(graph), graph), error('manifest-orphan'));
});
