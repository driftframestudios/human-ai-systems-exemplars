import '../../tools/node-runtime-admission.mjs';
import { isDirectExecution } from '../../tools/check-node-runtime.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, realpath, unlink, access } from 'node:fs/promises';
import { cpus, arch, platform, totalmem, loadavg } from 'node:os';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { FIXTURE_NAMES, createFixture, templateFixture } from './fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url)), repository = resolve(here, '../..');
const local = resolve(here, '.local'), inherited = resolve(here, '../native-studio-edit-cost');
const running = resolve(inherited, '.local/running.json');
const digest = value => createHash('sha256').update(value).digest('hex');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const exists = async path => access(path).then(() => true, () => false);
const exclusive = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
const git = (cwd, args, encoding = 'utf8') => execFileSync('git', args, { cwd, encoding, maxBuffer: 32 * 1024 * 1024 });
const epochPath = epoch => { assert.match(epoch, /^epoch-\d{2}$/u); return resolve(local, 'epochs', epoch); };
async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
async function collectionIdentity(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const identity = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    assert.ok(entry.isFile(), 'Raw collection entries remain ordinary owned files.');
    identity[entry.name] = await hashFile(resolve(directory, entry.name));
  }
  return identity;
}
async function configuration() {
  const protocol = await json(resolve(here, 'protocol.json'));
  assert.match(protocol.sourceCommit, /^[a-f0-9]{40}$/u);
  const sourceRoot = await realpath(resolve(process.env.NATIVE_STUDIO_SOURCE_ROOT ?? resolve(local, 'app')));
  assert.equal(process.versions.node, '22.23.4', 'Use the selected measurement runtime.');
  return { protocol, sourceRoot };
}
function requireCleanSource(sourceRoot, protocol) {
  assert.equal(git(sourceRoot, ['rev-parse', '--show-toplevel']).trim(), sourceRoot, 'Supply the root of the pinned clean checkout.');
  assert.equal(git(sourceRoot, ['rev-parse', 'HEAD']).trim(), protocol.sourceCommit, 'The source checkout is the pinned commit.');
  assert.equal(git(sourceRoot, ['status', '--porcelain=v1', '--untracked-files=normal']).trim(), '', 'Keep the source checkout clean during collection.');
}
async function fixturesFor(sourceRoot) {
  const { createExamplePlan } = await import(pathToFileURL(resolve(sourceRoot, 'collaboration/native-investment-studio/contract.mjs')));
  return FIXTURE_NAMES.map(name => createFixture(name, createExamplePlan));
}
function localReference(owner, value) {
  if (/^(?:data:|https?:|\/\/|#)/u.test(value)) return null;
  assert.ok(value && !/[?#]/u.test(value), 'Local source assets retain exact paths.');
  const boundary = '/source-root', path = relative(boundary, resolve(boundary, dirname(owner), value));
  assert.ok(path && path !== '..' && !path.startsWith('../') && !value.startsWith('/'), 'Source assets stay relative to their owner.');
  return path;
}
async function stylesheetOwners(sourceRoot, pagePath, page) {
  const owners = new Set(), pending = [];
  for (const match of page.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gu)) {
    const href = match[0].match(/\bhref=["']([^"']+)["']/u)?.[1];
    const path = localReference(pagePath, href); if (path) pending.push(path);
  }
  while (pending.length) {
    const path = pending.pop(); if (owners.has(path)) continue; owners.add(path);
    if (extname(path) !== '.css') continue;
    const css = await readFile(resolve(sourceRoot, path), 'utf8');
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/gu)) {
      const child = localReference(path, (match[1] ?? match[2]).trim()); if (child) pending.push(child);
    }
  }
  return [...owners];
}

export async function collectInputs({ sourceRoot, protocol }) {
  assert.deepEqual(await json(resolve(here, 'protocol.json')), protocol, 'The supplied protocol is the current declared configuration.');
  requireCleanSource(sourceRoot, protocol);
  const pinnedHash = async path => {
    const bytes = await readFile(resolve(sourceRoot, path));
    assert.equal(digest(bytes), digest(git(sourceRoot, ['show', `${protocol.sourceCommit}:${path}`], null)), `Pinned source differs: ${path}`);
    return digest(bytes);
  };
  const closureOwner = 'tools/native-studio-module-closure.mjs';
  for (const path of [closureOwner, 'tools/node-route-inventory.mjs', 'tools/node-runtime-admission.mjs', 'tools/check-node-runtime.mjs']) await pinnedHash(path);
  const { readNativeModuleClosure } = await import(pathToFileURL(resolve(sourceRoot, closureOwner)));
  const closure = await readNativeModuleClosure(sourceRoot); assert.equal(closure.paths.length, 26);
  const pagePath = 'context-canvas-project-surface/context-canvas/index.html', page = await readFile(resolve(sourceRoot, pagePath), 'utf8');
  const owners = new Set([...closure.paths, pagePath, ...await stylesheetOwners(sourceRoot, pagePath, page),
    closureOwner, 'tools/node-route-inventory.mjs', 'tools/core-architecture-browser-helper.mjs',
    'tools/node-runtime-admission.mjs', 'tools/check-node-runtime.mjs', 'tools/attribution-contract.mjs',
    'deployment/cpanel/primary-route-manifest.json', 'attribution.yml', '.node-version', 'package.json', 'package-lock.json']);
  for (const match of page.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gu)) {
    const path = localReference(pagePath, match[1]); if (path) owners.add(path);
  }
  const source = {};
  for (const path of [...owners].sort()) source[path] = await pinnedHash(path);
  const collectorNames = ['study.mjs', 'node.mjs', 'browser.mjs', 'browser.test.mjs', 'core.mjs', 'core.test.mjs',
    'fixtures.mjs', 'fixtures.test.mjs', 'protocol.json', 'PROTOCOL.md'];
  const additionalTests = (await readdir(here)).filter(name => name.endsWith('.test.mjs') && name !== 'report.test.mjs');
  const collector = {};
  for (const name of [...new Set([...collectorNames, ...additionalTests])].sort()) collector[name] = await hashFile(resolve(here, name));
  collector['../native-studio-edit-cost/core.mjs'] = await hashFile(resolve(inherited, 'core.mjs'));
  for (const name of ['tools/node-runtime-admission.mjs', 'tools/check-node-runtime.mjs']) collector[`../../${name}`] = await hashFile(resolve(repository, name));
  const fixtures = {};
  for (const fixture of await fixturesFor(sourceRoot)) for (const input of [fixture, templateFixture(fixture)])
    fixtures[input.id] = { sha256: digest(JSON.stringify(input.plan)), ...input.facts };
  const require = createRequire(resolve(sourceRoot, 'package.json')), lock = await json(resolve(sourceRoot, 'package-lock.json'));
  const installed = {};
  for (const name of ['@playwright/test', 'playwright', 'playwright-core', 'acorn', 'esbuild']) {
    const path = require.resolve(`${name}/package.json`), pkg = await json(path);
    assert.equal(pkg.version, lock.packages[`node_modules/${name}`].version, `${name} follows the pinned source lock.`);
    installed[name] = { version: pkg.version, packageSha256: await hashFile(path) };
  }
  const corePackage = require.resolve('playwright-core/package.json');
  const browserRevisionsSha256 = await hashFile(resolve(dirname(corePackage), 'browsers.json'));
  const engines = require('@playwright/test'), browserExecutableSha256 = {};
  for (const name of protocol.browser.engines) browserExecutableSha256[name] = await hashFile(engines[name].executablePath());
  requireCleanSource(sourceRoot, protocol);
  assert.deepEqual(await json(resolve(here, 'protocol.json')), protocol, 'The protocol stays unchanged while inputs are bound.');
  return { sourceRoot, sourceCommit: protocol.sourceCommit, sourceTree: git(sourceRoot, ['rev-parse', 'HEAD^{tree}']).trim(),
    collector, source, fixtures, runtime: { node: process.version, executableSha256: await hashFile(process.execPath),
      components: { ...process.versions }, platform: platform(), architecture: arch(), installed, browserRevisionsSha256, browserExecutableSha256 } };
}

async function prepare(config) {
  await mkdir(local, { recursive: true });
  const inputs = await collectInputs(config), archive = resolve(local, `source-${config.protocol.sourceCommit}.tar`);
  if (!(await exists(archive))) git(config.sourceRoot, ['archive', '--format=tar', '-o', archive, config.protocol.sourceCommit]);
  const receipt = resolve(local, 'source.json'), value = { sourceRoot: config.sourceRoot, sourceCommit: config.protocol.sourceCommit,
    sourceTree: inputs.sourceTree, archiveSha256: await hashFile(archive) };
  if (await exists(receipt)) assert.deepEqual(await json(receipt), value, 'The private source receipt retains its original identity.');
  else await exclusive(receipt, value);
  process.stdout.write(`Prepared pinned source; ${Object.keys(inputs.source).length} owners; ${Object.keys(inputs.fixtures).length} fixture shapes.\n`);
}
async function freeze(epoch, config) {
  const directory = epochPath(epoch); await mkdir(directory, { recursive: true });
  const inputs = await collectInputs(config), value = { protocolId: config.protocol.id, epoch, preparedAt: new Date().toISOString(), inputs, digest: digest(JSON.stringify(inputs)) };
  await exclusive(resolve(directory, 'freeze.json'), value);
  process.stdout.write(`Frozen ${epoch}: ${value.digest}\n`);
}
export async function verifyEpoch(epoch, config) {
  const directory = epochPath(epoch), frozen = await json(resolve(directory, 'freeze.json'));
  assert.equal(frozen.epoch, epoch); assert.equal(frozen.protocolId, config.protocol.id);
  assert.equal(digest(JSON.stringify(frozen.inputs)), frozen.digest, 'The freeze retains its own input identity.');
  assert.equal(digest(JSON.stringify(await collectInputs(config))), frozen.digest, 'Inputs match the reviewed freeze.');
  const review = await json(resolve(directory, 'review.json'));
  assert.equal(review.freezeDigest, frozen.digest); assert.equal(review.decision, 'accepted');
  assert.ok(typeof review.reviewer === 'string' && review.reviewer.trim().length > 0, 'Name the independent reviewer.');
  return { directory, frozen };
}
async function run(kind, epoch, config) {
  await mkdir(dirname(running), { recursive: true });
  const lock = { study: config.protocol.id, epoch, kind, pid: process.pid, token: randomUUID(), startedAt: new Date().toISOString() };
  await exclusive(running, lock);
  let directory, frozen, began = false;
  try {
    ({ directory, frozen } = await verifyEpoch(epoch, config));
    await exclusive(resolve(directory, `${kind}-start.json`), { freezeDigest: frozen.digest, sourceCommit: config.protocol.sourceCommit,
      startedAt: lock.startedAt, environment: { node: process.version, platform: platform(), arch: arch(), logicalCpus: cpus().length,
        cpuModel: cpus()[0]?.model, memoryGiB: Math.round(totalmem() / 1024 ** 3), load: loadavg(), background: 'ordinary desktop services; sequential timing job' } });
    began = true;
    const fixtures = await fixturesFor(config.sourceRoot), runner = kind === 'node'
      ? (await import('./node.mjs')).runNodeStudy : (await import('./browser.mjs')).runBrowserStudy;
    const result = await runner({ sourceRoot: config.sourceRoot, outputDirectory: resolve(directory, kind), protocol: config.protocol,
      fixtures: kind === 'node' ? fixtures : fixtures.filter(fixture => fixture.id !== 'byte-pressure'),
      onProgress: event => process.stdout.write(`${kind}: ${JSON.stringify(event)}\n`) });
    await verifyEpoch(epoch, config);
    await exclusive(resolve(directory, `${kind}-complete.json`), { freezeDigest: frozen.digest, completedAt: new Date().toISOString(),
      environmentAfter: { load: loadavg() }, runCount: result.runs.length, versions: result.versions ?? null,
      rawFiles: await collectionIdentity(resolve(directory, kind)) });
    process.stdout.write(`${kind}: complete ${result.runs.length} cells.\n`);
  } catch (error) {
    if (began) await exclusive(resolve(directory, `${kind}-incomplete.json`), { freezeDigest: frozen.digest,
      endedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Collection failed.' });
    throw error;
  } finally {
    if (await exists(running) && (await json(running)).token === lock.token) await unlink(running);
  }
}
async function summarize(epoch, analysis, config) {
  assert.match(analysis, /^analysis-\d{2}$/u);
  const { directory, frozen } = await verifyEpoch(epoch, config), populations = {}, rawIdentities = {};
  for (const kind of ['node', 'browser']) {
    assert.equal(await exists(resolve(directory, `${kind}-incomplete.json`)), false, 'Retain incomplete attempts for a fresh epoch.');
    const complete = await json(resolve(directory, `${kind}-complete.json`)); assert.equal(complete.freezeDigest, frozen.digest);
    const output = resolve(directory, kind);
    assert.deepEqual(await collectionIdentity(output), complete.rawFiles, 'Raw observations retain their completed identity.');
    rawIdentities[kind] = complete.rawFiles;
    const names = (await readdir(output)).filter(name => /^\d{3}.*\.json$/u.test(name)).sort();
    populations[kind] = { runs: await Promise.all(names.map(name => json(resolve(output, name)))) };
    assert.equal(populations[kind].runs.length, complete.runCount);
    if (kind === 'node') populations.node.clock = await json(resolve(output, 'calibration.json'));
    else populations.browser.versions = complete.versions;
  }
  const analysisIdentity = { reportSha256: await hashFile(resolve(here, 'report.mjs')), reportTestSha256: await hashFile(resolve(here, 'report.test.mjs')) };
  const { summarizeStudy, renderMarkdown } = await import('./report.mjs');
  const summary = summarizeStudy({ freezeDigest: frozen.digest, sourceCommit: config.protocol.sourceCommit,
    node: populations.node, browser: populations.browser, protocol: config.protocol });
  const markdown = renderMarkdown(summary);
  assert.deepEqual({ reportSha256: await hashFile(resolve(here, 'report.mjs')), reportTestSha256: await hashFile(resolve(here, 'report.test.mjs')) }, analysisIdentity, 'Analysis inputs stay unchanged while summarizing.');
  await verifyEpoch(epoch, config);
  for (const kind of ['node', 'browser']) assert.deepEqual(await collectionIdentity(resolve(directory, kind)), rawIdentities[kind], 'Raw observations stay unchanged while summarizing.');
  const output = resolve(directory, analysis); await mkdir(output);
  await exclusive(resolve(output, 'analysis.json'), { freezeDigest: frozen.digest, ...analysisIdentity });
  await exclusive(resolve(output, 'results.json'), summary);
  await writeFile(resolve(output, 'results.md'), markdown, { flag: 'wx' });
  process.stdout.write(`Prepared ${analysis}; its allowlisted aggregate is ready for independent review.\n`);
}
export async function main(args = process.argv.slice(2)) {
  const [command, epoch = 'epoch-01', analysis = 'analysis-01'] = args;
  assert.ok(args.length <= 3); epochPath(epoch);
  if (command !== 'node' && command !== 'browser') assert.equal(await exists(running), false, 'Wait for the active timing job before inspecting study inputs.');
  const config = await configuration();
  if (command === 'prepare') await prepare(config);
  else if (command === 'freeze') await freeze(epoch, config);
  else if (command === 'verify') { await verifyEpoch(epoch, config); process.stdout.write('Reviewed freeze verified.\n'); }
  else if (command === 'node' || command === 'browser') await run(command, epoch, config);
  else if (command === 'summarize') await summarize(epoch, analysis, config);
  else throw new Error('Choose prepare, freeze, verify, node, browser, or summarize.');
}
if (isDirectExecution(import.meta.url)) await main();
