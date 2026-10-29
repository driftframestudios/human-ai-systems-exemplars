import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, access, unlink } from 'node:fs/promises';
import { cpus, arch, platform, totalmem, loadavg } from 'node:os';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { FIXTURE_NAMES, createFixture } from './fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const local = resolve(here, '.local');
const sourceRoot = resolve(local, 'app');
const require = createRequire(import.meta.url);
const protocol = JSON.parse(await readFile(resolve(here, 'protocol.json'), 'utf8'));
const CANONICAL = ['config', 'contract', 'state', 'draft', 'controller'].map(name => `collaboration/native-investment-studio/${name}.mjs`);
const digest = value => createHash('sha256').update(value).digest('hex');
const exists = async path => access(path).then(() => true, () => false);
async function hashFile(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }
async function exclusive(path, value) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }); }
async function loadFixtures() {
  const { createExamplePlan } = await import(pathToFileURL(resolve(sourceRoot, CANONICAL[1])).href);
  return FIXTURE_NAMES.map(name => createFixture(name, createExamplePlan));
}

async function inputs() {
  const paths = ['study.mjs', 'protocol.json', 'PROTOCOL.md', 'fixtures.mjs', 'fixtures.test.mjs', 'core.mjs', 'core.test.mjs', 'node.mjs', 'browser.mjs'].sort();
  const study = Object.fromEntries(await Promise.all(paths.map(async path => [path, await hashFile(resolve(here, path))])));
  const source = {};
  // Bind the actual selected app bytes against immutable Git objects. The whole
  // archive supplies provenance; these owners supply executable identity.
  const page = 'context-canvas-project-surface/context-canvas/';
  const owners = [...CANONICAL, `${page}index.html`, `${page}canvas-shell.css`, `${page}canvas-shell.js`,
    `${page}about-media.js`, `${page}about-heatmap.js`, `${page}about-content-fit.js`, `${page}visitor-boundary-contract.js`,
    ...['core/tokens', 'core/foundation', 'components/site-navigation', 'components/tables', 'components/route-card-grid', 'routes/about', 'routes/about-noscript'].map(name => `${page}styles/${name}.css`),
    'tools/core-architecture-browser-helper.mjs', 'tools/node-runtime-admission.mjs', 'tools/check-node-runtime.mjs', 'tools/attribution-contract.mjs',
    'attribution.yml', '.node-version', 'package-lock.json'];
  for (const path of owners.sort()) {
    const actual = await readFile(resolve(sourceRoot, path));
    const accepted = execFileSync('git', ['show', `${protocol.sourceCommit}:${path}`], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    assert.equal(digest(actual), digest(accepted), `Pinned source differs: ${path}`);
    source[path] = digest(actual);
  }
  const fixtures = Object.fromEntries((await loadFixtures()).map(fixture => [fixture.id, { sha256: digest(JSON.stringify(fixture.plan)), ...fixture.facts }]));
  const playwrightPackage = require.resolve('@playwright/test/package.json');
  const driver = await json(playwrightPackage);
  const pinnedLock = await json(resolve(sourceRoot, 'package-lock.json'));
  assert.equal(driver.version, pinnedLock.packages['node_modules/@playwright/test'].version, 'the installed driver matches the accepted lock');
  const { chromium, firefox, webkit } = await import('@playwright/test');
  const engines = {};
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    engines[name] = await hashFile(engine.executablePath());
  }
  return { sourceCommit: protocol.sourceCommit, sourceTree: execFileSync('git', ['rev-parse', `${protocol.sourceCommit}^{tree}`], { cwd: root, encoding: 'utf8' }).trim(),
    study, source, fixtures, runtime: { node: process.version, executableSha256: await hashFile(process.execPath),
      playwright: driver.version, driverPackageSha256: await hashFile(playwrightPackage), browserExecutableSha256: engines } };
}

async function prepare() {
  assert.match(protocol.sourceCommit, /^[a-f0-9]{40}$/u);
  await mkdir(local, { recursive: true });
  const archive = resolve(local, 'accepted-source.tar');
  if (!(await exists(archive))) execFileSync('git', ['archive', '--format=tar', '-o', archive, protocol.sourceCommit], { cwd: root });
  if (!(await exists(sourceRoot))) {
    await mkdir(sourceRoot);
    execFileSync('tar', ['-xf', archive, '-C', sourceRoot]);
  }
  const input = await inputs();
  process.stdout.write(`Prepared ${input.sourceCommit}; ${Object.keys(input.source).length} source owners; ${Object.keys(input.fixtures).length} fixtures.\n`);
}

async function freeze(epoch) {
  const directory = resolve(local, 'epochs', epoch);
  await mkdir(directory, { recursive: true });
  const value = { protocolId: protocol.id, epoch, preparedAt: new Date().toISOString(), inputs: await inputs() };
  value.digest = digest(JSON.stringify(value.inputs));
  await exclusive(resolve(directory, 'freeze.json'), value);
  process.stdout.write(`Frozen ${epoch}: ${value.digest}\n`);
}

async function verify(epoch) {
  const directory = resolve(local, 'epochs', epoch);
  const frozen = await json(resolve(directory, 'freeze.json'));
  assert.equal(digest(JSON.stringify(await inputs())), frozen.digest, 'study, source and runtime still match the reviewed freeze');
  const review = await json(resolve(directory, 'review.json'));
  assert.equal(review.freezeDigest, frozen.digest);
  assert.equal(review.decision, 'accepted');
  assert.equal(typeof review.reviewer, 'string');
  assert.ok(review.reviewer.length > 0);
  return { directory, frozen };
}

async function run(kind, epoch) {
  const { directory, frozen } = await verify(epoch);
  const start = { sourceCommit: protocol.sourceCommit, freezeDigest: frozen.digest, startedAt: new Date().toISOString(),
    environment: { node: process.version, platform: platform(), arch: arch(), logicalCpus: cpus().length,
      cpuModel: cpus()[0]?.model, memoryGiB: Math.round(totalmem() / 1024 ** 3), load: loadavg(), background: 'ordinary desktop services; sequential study jobs' } };
  await exclusive(resolve(directory, `${kind}-start.json`), start);
  const running = resolve(local, 'running.json');
  await exclusive(running, { epoch, kind, pid: process.pid, startedAt: start.startedAt });
  try {
    const fixtures = await loadFixtures();
    const onProgress = event => process.stdout.write(`${kind}: ${JSON.stringify(event)}\n`);
    const outputDirectory = resolve(directory, kind);
    const runner = kind === 'node' ? (await import('./node.mjs')).runNodeStudy : (await import('./browser.mjs')).runBrowserStudy;
    const result = await runner({ sourceRoot, outputDirectory, protocol, fixtures, onProgress });
    await verify(epoch);
    await exclusive(resolve(directory, `${kind}-complete.json`), { freezeDigest: frozen.digest, completedAt: new Date().toISOString(),
      environmentAfter: { load: loadavg() }, runCount: result.runs.length, versions: result.versions ?? null });
    process.stdout.write(`${kind}: complete ${result.runs.length} runs.\n`);
  } finally { await unlink(running); }

}

const [command, epoch = 'epoch-01'] = process.argv.slice(2);
assert.match(epoch, /^epoch-\d{2}$/u, 'choose an epoch-NN identifier');
if (command === 'prepare') await prepare();
else if (command === 'freeze') await freeze(epoch);
else if (command === 'verify') { await verify(epoch); process.stdout.write('Reviewed freeze verified.\n'); }
else if (command === 'node' || command === 'browser') await run(command, epoch);
else throw new Error('Choose prepare, freeze, verify, node, or browser.');
