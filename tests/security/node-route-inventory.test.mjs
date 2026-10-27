import '../../tools/node-runtime-admission.mjs';

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import {
  admissionSpecifier, classifyJavaScript, discoverTrackedRoutes,
  hasFirstAdmission, inspectCommandText, inspectNodeRoutes,
} from '../../tools/node-route-inventory.mjs';

const execFileAsync = promisify(execFile);

const researchVerificationRoutes = [
  'research/table-verification-threshold/epochs/table-repair-01.test.mjs',
  'research/table-verification-threshold/model.mjs',
  'research/table-verification-threshold/model.test.mjs',
  'research/table-verification-threshold/paired-replay-02/core.mjs',
  'research/table-verification-threshold/paired-replay-02/replay.mjs',
  'research/table-verification-threshold/paired-replay-02/replay.test.mjs',
  'research/table-verification-threshold/paired-replay-02/runner-path.test.mjs',
  'research/table-verification-threshold/paired-replay-02/worker.mjs',
  'research/table-verification-threshold/scenarios.mjs',
  'research/table-verification-threshold/shadow-campaign.mjs',
  'research/table-verification-threshold/shadow-campaign.test.mjs',
];

async function fixture(t, files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'node-routes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), content);
  }
  return { root, paths: Object.keys(files) };
}

const admitted = file => `import '${admissionSpecifier(file)}';\nexport const value = 1;\n`;

test('runtime owners are explicit for browser/shared, workerd, bootstrap and new JavaScript', () => {
  assert.equal(classifyJavaScript('tools/new-tool.mjs'), 'node');
  assert.equal(classifyJavaScript('tools/check-node-runtime.mjs'), 'bootstrap');
  assert.equal(classifyJavaScript('research/table-verification-threshold/paired-replay-02/check-node-runtime.mjs'), 'bootstrap');
  assert.equal(classifyJavaScript('research/table-verification-threshold/paired-replay-02/node-runtime-admission.mjs'), 'bootstrap');
  assert.equal(admissionSpecifier('research/table-verification-threshold/paired-replay-02/core.mjs'), './node-runtime-admission.mjs');
  assert.equal(classifyJavaScript('cloudflare/r2-video-delivery/src/index.js'), 'workerd');
  assert.equal(classifyJavaScript('collaboration/investment-analysis/core.js'), 'browser-shared');
  assert.equal(classifyJavaScript('deployment/cpanel/carrier/primary-public/example.js'), 'frozen-publication');
  assert.equal(classifyJavaScript('new/browser.js'), 'unclassified');
  assert.equal(classifyJavaScript('new/cli.cjs'), 'unclassified');
  assert.throws(() => classifyJavaScript('../outside.mjs'), /repository-relative/);
});

test('first admission survives trivia and catches missing, misordered and misleading declarations', () => {
  const file = 'tests/example/run.mjs';
  assert.equal(hasFirstAdmission(`#!/usr/bin/env node\n/* owner */\n// note\n${admitted(file)}`, file), true);
  for (const source of [
    "import fs from 'node:fs';\n" + admitted(file),
    "// " + admitted(file),
    "const text = \"import '../../tools/node-runtime-admission.mjs';\";",
    "import './wrong-node-runtime-admission.mjs';",
    "import guard from '../../tools/node-runtime-admission.mjs';",
    "/* unclosed " + admitted(file),
    "export const value = 1;",
  ]) assert.equal(hasFirstAdmission(source, file), false, source);
});

test('new JavaScript and Node shebang routes require classification while Node modules require admission', async t => {
  const input = await fixture(t, {
    'tools/guarded.mjs': admitted('tools/guarded.mjs'),
    'tools/unguarded.mjs': 'export const value = 1;',
    'new.js': 'window.value = 1;',
    'scripts/runner': '#!/usr/bin/env node\nconsole.log(1);',
  });
  const result = await inspectNodeRoutes(input);
  assert.deepEqual(result.diagnostics.map(({ code, path }) => [code, path]), [
    ['first-node-admission-required', 'tools/unguarded.mjs'],
    ['javascript-owner-required', 'new.js'],
    ['javascript-owner-required', 'scripts/runner'],
  ]);
});

test('frozen publication bytes retain their existing owner and remain unchanged by inspection', async t => {
  const file = 'cloudflare/schemas-worker/public/skills/source/example.mjs';
  const doc = 'cloudflare/schemas-worker/public/skills/source/README.md';
  const carrierFile = 'deployment/cpanel/carrier/primary-public/example.js';
  const carrierDoc = 'deployment/cpanel/carrier/primary-public/receipt.json';
  const input = await fixture(t, {
    [file]: 'export const historical = true;\n',
    [doc]: '```sh\nnpx historical-example\nnode -e "process.exit()"\n```\n',
    [carrierFile]: 'window.historicalCarrier = true;\n',
    [carrierDoc]: JSON.stringify({ historical: 'node -e "process.exit()"' }),
  });
  const before = await Promise.all(input.paths.map(p => readFile(path.join(input.root, p))));
  assert.equal((await inspectNodeRoutes(input)).ok, true);
  for (let i = 0; i < input.paths.length; i += 1) assert.deepEqual(await readFile(path.join(input.root, input.paths[i])), before[i]);
});

test('catalog admission follows wrapped Node execution and the declared working directory', async t => {
  const member = 'cloudflare/schemas-worker/test/example.mjs';
  const catalog = {
    suites: [{ members: [member], command: { cwd: 'cloudflare/schemas-worker', argv: ['env', 'FLAG=1', 'uv', 'run', '--', 'node', 'test/example.mjs'], appendMembers: false } }],
  };
  const input = await fixture(t, {
    [member]: admitted(member),
    'tests/suites/catalog.json': JSON.stringify(catalog),
  });
  assert.equal((await inspectNodeRoutes(input)).ok, true);
  catalog.suites.push({ members: [member], command: { cwd: '.', argv: ['node'], appendMembers: true } });
  await writeFile(path.join(input.root, 'tests/suites/catalog.json'), JSON.stringify(catalog));
  assert.equal((await inspectNodeRoutes(input)).ok, true);
  catalog.suites.pop();
  await writeFile(path.join(input.root, 'tests/suites/catalog.json'), JSON.stringify(catalog));
  await writeFile(path.join(input.root, member), 'export const value = 1;');
  assert.deepEqual((await inspectNodeRoutes(input)).diagnostics.map(x => x.code), ['first-node-admission-required', 'concrete-node-target-admission', 'catalog-node-admission-required']);
  catalog.suites[0].members = ['new-unowned.js'];
  await writeFile(path.join(input.root, 'tests/suites/catalog.json'), JSON.stringify(catalog));
  assert.ok((await inspectNodeRoutes(input)).diagnostics.some(x => x.code === 'catalog-member-owner-required'));
});

test('literal external and inline routes require their own admitted command', () => {
  for (const [source, code] of [
    ['npx playwright install', 'external-npx-route'],
    ['env FLAG=1 npm exec -- wrangler deploy --dry-run', 'external-npm-exec-route'],
    ['node -e "process.exit()"', 'inline-node-admission'],
    ['node --input-type=module -', 'inline-node-admission'],
    ['node -p "process.version"', 'inline-node-admission'],
    ['node -p42', 'inline-node-admission'],
    ['node -eprocess.exit()', 'inline-node-admission'],
    ['node -p42 --import ./tools/node-runtime-admission.mjs', 'inline-node-admission'],
    ['node -eprocess.exit() --import ./tools/node-runtime-admission.mjs', 'inline-node-admission'],
    ['node --print=process.version', 'inline-node-admission'],
    ['node -', 'inline-node-admission'],
    ["node <<'NODE'\nprocess.exit()\nNODE", 'inline-node-admission'],
    ['cat example.mjs | node', 'inline-node-admission'],
    ['node < example.mjs', 'inline-node-admission'],
    ['node --print "--import ./tools/node-runtime-admission.mjs"', 'inline-node-admission'],
    ['node node_modules/tool/cli.js', 'external-node-admission'],
    ['node --require ./preload.cjs --import ./tools/node-runtime-admission.mjs node_modules/tool/cli.js', 'external-node-admission'],
    ['node --import ./earlier.mjs --import ./tools/node-runtime-admission.mjs node_modules/tool/cli.js', 'external-node-admission'],
    ['node --import ./tools/node-runtime-admission.mjs --require ./preload.cjs node_modules/tool/cli.js', 'external-node-admission'],
    ['node --import ./tools/node-runtime-admission.mjs --require=./preload.cjs -p42', 'inline-node-admission'],
    ['node --import ./tools/node-runtime-admission.mjs -r./preload.cjs -eprocess.exit()', 'inline-node-admission'],
    ['node node_modules/tool/cli.js --import ./tools/node-runtime-admission.mjs', 'external-node-admission'],
    ['node -- node_modules/tool/cli.js --import ./tools/node-runtime-admission.mjs', 'external-node-admission'],
    ['./node_modules/.bin/wrangler deploy --dry-run', 'external-bin-route'],
    ['node --import ./tools/node-runtime-admission.mjs --version && node -e "process.exit()"', 'inline-node-admission'],
    ['node -e "const text = \'--import ./tools/node-runtime-admission.mjs\';"', 'inline-node-admission'],
  ]) assert.ok(inspectCommandText(source).includes(code), source);
  for (const source of [
    'npm run wrangler -- deploy --dry-run',
    'node --import ./tools/node-runtime-admission.mjs -e "process.exit()"',
    'node --import=../release-tools/tools/node-runtime-admission.mjs node_modules/tool/cli.js',
    'node --import ./tools/node-runtime-admission.mjs ./node_modules/.bin/tool',
    'node --import ./tools/node-runtime-admission.mjs node_modules/tool/cli.js --require ordinary-script-argument',
    'node --test tests/example.test.mjs',
    'pre-existing status/output node',
    'node --import ./tools/node-runtime-admission.mjs --print "process.version"',
    'node --import ./tools/node-runtime-admission.mjs -p42',
    'node --import ./tools/node-runtime-admission.mjs -eprocess.exit()',
    'node --import ./tools/node-runtime-admission.mjs -',
    "node --import ./tools/node-runtime-admission.mjs <<'NODE'\nprocess.exit()\nNODE",
  ]) assert.deepEqual(inspectCommandText(source), [], source);
});

test('maintained command carriers expose inline, fenced, workflow, shell, JSON and Python literal routes', async t => {
  const input = await fixture(t, {
    'README.md': 'Use `npx tool run`.\n```sh\nnode -e "process.exit()"\n```\n',
    '.github/workflows/check.yml': 'steps:\n  - run: npm exec -- tool\n',
    'scripts/run.sh': '#!/bin/sh\n./node_modules/.bin/tool\n',
    'commands.json': JSON.stringify({ kind: 'node', command: ['node', '--input-type=module', '-e', 'process.exit()'] }),
    'scripts/run.py': 'import subprocess\nsubprocess.run(["node", "-e", "process.exit()"], check=True)\n',
    'tests/suites/baseline-e1f00de.json': JSON.stringify({ historical: 'npx old-tool' }),
  });
  const result = await inspectNodeRoutes(input);
  for (const file of input.paths.filter(file => !file.includes('baseline-'))) assert.ok(result.diagnostics.some(x => x.path === file), file);
  assert.equal(result.diagnostics.some(x => x.path.includes('baseline-')), false);
});

test('Git discovery includes tracked routes and explicit new files while unrelated untracked files stay outside', async t => {
  const input = await fixture(t, {
    'tracked.mjs': admitted('tracked.mjs'),
    'new.mjs': admitted('new.mjs'),
    'unrelated.mjs': 'export const value = 1;',
  });
  await execFileAsync('git', ['init', '--quiet'], { cwd: input.root });
  await execFileAsync('git', ['add', 'tracked.mjs'], { cwd: input.root });
  assert.deepEqual(await discoverTrackedRoutes(input.root), ['tracked.mjs']);
  assert.deepEqual(await discoverTrackedRoutes(input.root, ['new.mjs']), ['new.mjs', 'tracked.mjs']);
});


test('concrete maintained Node commands require known admitted Node targets', async t => {
  const input = await fixture(t, {
    'tools/good.mjs': admitted('tools/good.mjs'),
    'tools/bad.mjs': 'export const value = 1;',
    'collaboration/investment-analysis/core.js': 'export const value = 1;',
    'cloudflare/r2-video-delivery/src/index.js': 'export default {};',
    'new.js': 'export const value = 1;',
    'README.md': '```sh\nnode tools/good.mjs\nnode collaboration/investment-analysis/core.js\nnode cloudflare/r2-video-delivery/src/index.js\nnode new.js\nnode tools/bad.mjs\n```',
    'collaboration/investment-analysis/README.md': 'Run `node core.js`.',
    'docs/worker.md': 'Run `node r2-video-delivery/src/index.js`.',
  });
  const result = await inspectNodeRoutes(input);
  assert.equal(result.diagnostics.filter(item => item.code === 'concrete-node-target-admission').length, 3);
  assert.ok(result.diagnostics.some(item => item.code === 'concrete-node-target-admission' && item.path === 'README.md'));
  assert.ok(result.diagnostics.some(item => item.code === 'concrete-node-target-admission' && item.path === 'collaboration/investment-analysis/README.md'));
  assert.ok(result.diagnostics.some(item => item.code === 'concrete-node-target-admission' && item.path === 'docs/worker.md'));
  assert.deepEqual(inspectCommandText('node tools/good.mjs', () => ({ role: 'node', guarded: true })), []);
  for (const role of ['browser-shared', 'workerd', 'unclassified', 'frozen-publication']) {
    assert.deepEqual(inspectCommandText('node known.js', () => ({ role })), ['concrete-node-target-admission']);
  }
});


test('the tracked repository route inventory remains fully admitted', async () => {
  const result = await inspectNodeRoutes();
  assert.deepEqual(result.diagnostics, [], JSON.stringify(result.diagnostics));
});

test('research verification routes admit the reviewed runtime before owned work', async () => {
  for (const file of researchVerificationRoutes) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert.equal(hasFirstAdmission(source, file), true, file);
  }
});


test('importing the inventory from stdin leaves its CLI inactive', async () => {
  const inventory = new URL('../../tools/node-route-inventory.mjs', import.meta.url);
  const execution = execFileAsync(process.execPath, ['--input-type=module', '-']);
  execution.child.stdin.end(`await import(${JSON.stringify(inventory.href)}); process.stdout.write('import-only\\n');`);
  const { stdout, stderr } = await execution;
  assert.equal(stdout, 'import-only\n');
  assert.equal(stderr, '');
});


test('npm options preserve exec detection and guarded run routes', () => {
  for (const command of [
    'npm --prefix cloudflare/schemas-worker exec -- wrangler',
    'npm --yes exec -- wrangler',
    'npm --prefix=cloudflare/schemas-worker exec -- wrangler',
    'npm --yes --prefix cloudflare/schemas-worker exec -- wrangler',
  ]) assert.ok(inspectCommandText(command).includes('external-npm-exec-route'), command);
  for (const command of [
    'npm --prefix cloudflare/schemas-worker run wrangler -- deploy --dry-run',
    'npm --prefix=cloudflare/schemas-worker run wrangler -- deploy --dry-run',
    'npm --prefix exec run wrangler -- deploy --dry-run',
  ]) assert.deepEqual(inspectCommandText(command), [], command);
});

test('preloads precede a source module guard and require the canonical admission prefix', () => {
  const guarded = () => ({ role: 'node', guarded: true });
  for (const command of [
    'node --import ./visitor.js tools/good.mjs',
    'node --require ./preload.cjs tools/good.mjs',
    'node --import ./tools/node-runtime-admission.mjs --test-name-pattern foo --require ./preload.cjs --test tests/good.mjs',
    'node --import ./tools/node-runtime-admission.mjs --test-reporter spec -r ./preload.cjs --test tests/good.mjs',
  ]) assert.ok(inspectCommandText(command, guarded).includes('node-preload-admission'), command);
  for (const command of [
    'node tools/good.mjs',
    'node --import ./tools/node-runtime-admission.mjs --test-name-pattern foo --test tests/good.mjs',
    'node --import ./tools/node-runtime-admission.mjs --import ./visitor.js tools/good.mjs',
    'node tools/good.mjs --require ordinary-script-argument',
  ]) assert.deepEqual(inspectCommandText(command, guarded), [], command);
});
