import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { NODE_FLOOR, NODE_RANGE, isDirectExecution, requireNode, supportsNode } from '../../tools/check-node-runtime.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const checker = join(root, 'tools/check-node-runtime.mjs');
const floor = '22.23.4';
const range = '>=22.23.4 <23';
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

function runNode(args, options = {}) {
  const env = { ...process.env, PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}` };
  delete env.NODE_OPTIONS;
  delete env.NODE_TEST_CONTEXT;
  const { executable = process.execPath, ...childOptions } = options;
  const result = spawnSync(executable, args, {
    cwd: root, encoding: 'utf8', timeout: 20_000, ...childOptions,
    env: { ...env, ...options.env },
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null, 'the subprocess reaches its own terminal result');
  return result;
}

async function fixture(t) {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'node-runtime-contract-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, 'tools'));
  await copyFile(checker, join(directory, 'tools/check-node-runtime.mjs'));
  const stale = join(directory, 'stale-version.mjs');
  // This fixture changes the observed property in an isolated child process.
  // Actual old-executable compatibility remains a separate runtime observation.
  await writeFile(stale, "Object.defineProperty(process, 'version', { value: 'v22.23.3' });\n");
  return { directory, staleOptions: `--import=${pathToFileURL(stale).href}` };
}

async function npmCli() {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
    join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!candidate.endsWith('npm-cli.js')) continue;
    try { await access(candidate); return candidate; } catch { /* Try the next installed npm location. */ }
  }
  assert.fail('Run with the reviewed Node distribution and its bundled npm, or through npm run test:node-runtime.');
}

async function exists(path) {
  try { await access(path); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

test('stable Node 22 admission uses the reviewed floor and numeric patch ordering', () => {
  assert.equal(NODE_FLOOR, floor);
  assert.equal(NODE_RANGE, range);
  for (const value of ['22.23.4', 'v22.23.4', '22.23.5', '22.23.10', '22.24.0', '22.100.0', '22.23.4+metadata', 'v22.23.4+build.001', '22.24.0+vendor-build.a-1']) {
    assert.equal(supportsNode(value), true, value);
    assert.doesNotThrow(() => requireNode(value));
  }
  for (const value of ['22.0.0', '22.22.99', '22.23.0', '22.23.3', '21.99.99', '23.0.0', '24.22.0', '24.22.1', '26.12.0', '26.12.1', '27.0.0']) {
    assert.equal(supportsNode(value), false, value);
  }
});

test('version admission rejects malformed, prerelease, ambiguous, and oversized values', () => {
  const rejected = [
    undefined, null, 22.23, {}, ['22.23.4'], new String('22.23.4'),
    '', '22', '22.23', '22.23.4.1', 'V22.23.4', 'vv22.23.4',
    ' 22.23.4', '22.23.4 ', '22.23.4\n', '22.23.4\0',
    '022.23.4', '22.023.4', '22.23.04', '+22.23.4', '22.-23.4',
    '22.23.4-rc.1', '22.24.0-nightly', '22.23.4+', '22.23.4+..', '22.23.4+vendor..one', '22.23.4+meta_data',
    '22.9007199254740992.0', '22.23.9007199254740992', `22.23.${'9'.repeat(65)}`,
  ];
  for (const value of rejected) assert.equal(supportsNode(value), false, String(value));
});

test('runtime refusal carries the observed version, policy, and recovery action', () => {
  assert.throws(() => requireNode('v22.23.3'), error => {
    assert.equal(error.code, 'ERR_NODE_RUNTIME');
    for (const fragment of ['v22.23.3', range, '.node-version', 'rerun', 'NODE-RUNTIME.md']) {
      assert.ok(error.message.includes(fragment), fragment);
    }
    return true;
  });
});

test('CLI receipt describes the actual executable and quiet admission stays silent', () => {
  const result = runNode([checker]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.owner, 'repository-selected-node');
  assert.equal(receipt.node, process.version);
  assert.equal(receipt.selected, floor);
  assert.equal(receipt.supported, range);
  assert.equal(receipt.platform, process.platform);
  assert.equal(receipt.architecture, process.arch);
  assert.deepEqual(receipt.components, Object.fromEntries(
    ['v8', 'openssl', 'uv', 'zlib', 'brotli', 'ares', 'modules'].map(name => [name, process.versions[name] ?? null]),
  ));
  const quiet = runNode([checker, '--quiet']);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(quiet.stdout, '');
  assert.equal(quiet.stderr, '');
});

test('CLI rejects a stale observed runtime and unsupported arguments with nonzero results', async t => {
  const { staleOptions } = await fixture(t);
  const stale = runNode([checker], { env: { NODE_OPTIONS: staleOptions } });
  assert.equal(stale.status, 1);
  assert.equal(stale.stdout, '');
  assert.match(stale.stderr, /ERR_NODE_RUNTIME: Detected Node v22\.23\.3/u);
  assert.ok(stale.stderr.includes(range));
  for (const args of [['--version'], ['--quiet', '--quiet'], ['22.23.4']]) {
    const result = runNode([checker, ...args]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /ERR_NODE_RUNTIME_USAGE:/u);
  }
});

test('symlinked CLI invocation preserves admission and the runtime receipt', async t => {
  const { directory, staleOptions } = await fixture(t);
  const alias = join(directory, 'checker-alias.mjs');
  await symlink(join(directory, 'tools/check-node-runtime.mjs'), alias);
  const admitted = runNode([alias]);
  assert.equal(admitted.status, 0, admitted.stderr);
  assert.equal(JSON.parse(admitted.stdout).node, process.version);
  const refused = runNode([alias], { env: { NODE_OPTIONS: staleOptions } });
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.match(refused.stderr, /ERR_NODE_RUNTIME: Detected Node v22\.23\.3/u);
});

test('direct execution follows physical identity while distinct module URLs stay inert', async t => {
  const { directory } = await fixture(t);
  const entry = join(directory, 'owned #100%.mjs');
  const alias = join(directory, 'alias #100%.mjs');
  await writeFile(entry, 'export {};\n');
  await symlink(entry, alias);
  const url = pathToFileURL(entry);
  assert.equal(isDirectExecution(url, entry), true);
  assert.equal(isDirectExecution(url.href, alias), true);
  assert.equal(isDirectExecution(pathToFileURL(alias), entry), true);
  for (const input of [null, '', '-', join(directory, 'missing.mjs'), join(entry, 'child.mjs')]) {
    assert.equal(isDirectExecution(url, input), false, String(input));
  }
  assert.equal(isDirectExecution(pathToFileURL(join(directory, 'missing.mjs')), entry), false);
  for (const suffix of ['?view=import', '#module', '?view=import#module']) {
    assert.equal(isDirectExecution(url.href + suffix, entry), false, suffix);
  }
  assert.equal(isDirectExecution('data:text/javascript,export{}', entry), false);
});

test('direct execution preserves filesystem failures beyond missing paths', async t => {
  const { directory } = await fixture(t);
  const first = join(directory, 'loop-a.mjs');
  const second = join(directory, 'loop-b.mjs');
  await symlink(second, first);
  await symlink(first, second);
  assert.throws(() => isDirectExecution(pathToFileURL(checker), first), { code: 'ELOOP' });
});

test('maintained tool symlinks preserve owned work across caller directories', async t => {
  const { directory } = await fixture(t);
  const routes = [
    { name: 'readme', entry: join(root, 'tools/check-readme-routes.mjs'), args: [root] },
    { name: 'inventory', entry: join(root, 'tools/node-route-inventory.mjs'), args: [] },
  ];
  for (const { name, entry, args } of routes) {
    const direct = runNode([entry, ...args], { cwd: directory });
    assert.equal(direct.status, 0, direct.stderr);
    assert.equal(direct.stderr, '');
    if (name === 'readme') {
      const counts = direct.stdout.match(/^README route check passed: (\d+) README files, (\d+) local links, (\d+) checked fragments\.\n$/u);
      assert.ok(counts, 'the README entrypoint reports completed route inspection');
      assert.ok(counts.slice(1).every(value => Number(value) > 0), 'the explicit repository root supplies the inspected population');
    } else {
      const receipt = JSON.parse(direct.stdout);
      assert.equal(receipt.ok, true);
      assert.ok(receipt.files > 0, 'the inventory entrypoint inspects repository-owned files');
      assert.deepEqual(receipt.diagnostics, []);
    }
    const aliasName = `${name}-alias.mjs`;
    const alias = join(directory, aliasName);
    await symlink(entry, alias);
    for (const invocation of [
      { path: alias, cwd: root },
      { path: `./${aliasName}`, cwd: directory },
    ]) {
      const linked = runNode([invocation.path, ...args], { cwd: invocation.cwd });
      assert.equal(linked.status, 0, linked.stderr);
      assert.equal(linked.stderr, '');
      assert.equal(linked.stdout, direct.stdout, `${name} performs the same work through its alias`);
    }
  }
});

test('a symlinked Issue-route command retains its owned argument failure', async t => {
  const { directory } = await fixture(t);
  const entry = join(root, 'tools/repository-handoff-issue-route.mjs');
  const alias = join(directory, 'issue-route-alias.mjs');
  await symlink(entry, alias);
  const direct = runNode([entry, '--plan'], { cwd: directory });
  assert.equal(direct.status, 1);
  assert.equal(direct.stdout, '');
  assert.match(direct.stderr, /Issue-route operation held \(arguments\): Choose the destination with --repo OWNER\/REPOSITORY\./u);
  const linked = runNode([alias, '--plan'], { cwd: directory });
  assert.equal(linked.status, direct.status);
  assert.equal(linked.stdout, direct.stdout);
  assert.equal(linked.stderr, direct.stderr, 'the alias reaches the same argument validation before GitHub work');
});

test('genuine imports through tool aliases leave their CLI work inert', async t => {
  const { directory } = await fixture(t);
  for (const name of ['check-readme-routes', 'node-route-inventory']) {
    const alias = join(directory, `${name}-alias.mjs`);
    await symlink(join(root, `tools/${name}.mjs`), alias);
    const source = `await import(${JSON.stringify(pathToFileURL(alias).href)}); process.stdout.write('import-complete');`;
    for (const invocation of [{ args: ['--input-type=module', '-e', source] }, { args: ['--input-type=module', '-'], input: source }]) {
      const result = runNode(invocation.args, { cwd: directory, input: invocation.input });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, 'import-complete', `${name} exposes its module without running its CLI`);
      assert.equal(result.stderr, '');
    }
  }
});

test('imports expose policy without running the CLI', () => {
  const source = `await import(${JSON.stringify(pathToFileURL(checker).href)}); process.stdout.write('import-complete');`;
  const result = runNode(['--input-type=module', '-e', source]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'import-complete');
  assert.equal(result.stderr, '');
});

test('explicit npm guards protect effects with ignore-scripts, changed CWD, and Worker prefix', async t => {
  const { directory, staleOptions } = await fixture(t);
  const cli = await npmCli();
  const worker = join(directory, 'cloudflare/schemas-worker');
  const caller = join(directory, 'caller');
  await mkdir(worker, { recursive: true });
  await mkdir(caller);
  const guards = new Map([
    [directory, 'node tools/check-node-runtime.mjs --quiet && '],
    [worker, 'node ../../tools/check-node-runtime.mjs --quiet && '],
  ]);
  for (const [packageRoot, guard] of guards) {
    await writeFile(join(packageRoot, 'sentinel.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('effect.json', JSON.stringify({ node: process.version, cwd: process.cwd() }));\n");
    await writeFile(join(packageRoot, 'lifecycle.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('lifecycle-ran', 'yes');\n");
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({
      private: true, scripts: { preprobe: 'node lifecycle.mjs', probe: `${guard}node sentinel.mjs` },
    }));
  }
  const calls = [
    { packageRoot: directory, cwd: directory, prefix: [] },
    { packageRoot: directory, cwd: caller, prefix: ['--prefix', directory] },
    { packageRoot: worker, cwd: worker, prefix: [] },
    { packageRoot: worker, cwd: caller, prefix: ['--prefix', worker] },
  ];
  for (const { packageRoot, cwd, prefix } of calls) {
    const args = [cli, '--ignore-scripts', '--silent', ...prefix, 'run', 'probe'];
    const guarded = runNode(args, { cwd, env: { NODE_OPTIONS: staleOptions } });
    assert.notEqual(guarded.status, 0, 'npm propagates the admission refusal');
    assert.match(guarded.stderr, /ERR_NODE_RUNTIME: Detected Node v22\.23\.3/u);
    assert.equal(await exists(join(packageRoot, 'effect.json')), false, 'admission precedes the original command');
    assert.equal(await exists(join(packageRoot, 'lifecycle-ran')), false, 'the guard remains effective while lifecycle hooks are disabled');

    const accepted = runNode(args, { cwd });
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.deepEqual(await readJson(join(packageRoot, 'effect.json')), { node: process.version, cwd: packageRoot });
    await rm(join(packageRoot, 'effect.json'));

    // Removing only the explicit guard makes the same stale fixture observable.
    // This contrast attributes refusal to the package boundary rather than npm.
    const manifestPath = join(packageRoot, 'package.json');
    const manifest = await readJson(manifestPath);
    const original = manifest.scripts.probe;
    manifest.scripts.probe = 'node sentinel.mjs';
    await writeFile(manifestPath, JSON.stringify(manifest));
    const unguarded = runNode(args, { cwd, env: { NODE_OPTIONS: staleOptions } });
    assert.equal(unguarded.status, 0, unguarded.stderr);
    assert.deepEqual(await readJson(join(packageRoot, 'effect.json')), { node: 'v22.23.3', cwd: packageRoot });
    await rm(join(packageRoot, 'effect.json'));
    manifest.scripts.probe = original;
    await writeFile(manifestPath, JSON.stringify(manifest));
  }
});

test('both installation roots and every npm command express the same admission policy', async () => {
  assert.equal((await readFile(join(root, '.node-version'), 'utf8')).trim(), floor);
  for (const [relativeRoot, checkerPath] of [['', 'tools/check-node-runtime.mjs'], ['cloudflare/schemas-worker', '../../tools/check-node-runtime.mjs']]) {
    const packageRoot = join(root, relativeRoot);
    const manifest = await readJson(join(packageRoot, 'package.json'));
    const lock = await readJson(join(packageRoot, 'package-lock.json'));
    assert.equal(manifest.engines.node, range, `${relativeRoot || 'root'} manifest`);
    assert.equal(lock.packages[''].engines.node, range, `${relativeRoot || 'root'} lock`);
    assert.match(await readFile(join(packageRoot, '.npmrc'), 'utf8'), /^engine-strict=true$/mu);
    for (const [alias, command] of Object.entries(manifest.scripts)) {
      if (alias === 'check:node-runtime') {
        assert.equal(command, `node ${checkerPath}`);
      } else {
        const prefix = `node ${checkerPath} --quiet && `;
        assert.ok(command.startsWith(prefix), `${relativeRoot || 'root'}:${alias} admits the runtime first`);
        assert.ok(command.slice(prefix.length).trim(), `${alias} retains its owned command`);
      }
    }
  }
});

test('active setup-node jobs select the exact patch and record admission before installation', async () => {
  const workflows = join(root, '.github/workflows');
  let jobsObserved = 0;
  // Current execution is owned by this directory. Frozen Worker publication
  // copies retain their separate accepted-publication byte-verification owner.
  for (const name of (await readdir(workflows)).filter(name => /\.ya?ml$/u.test(name))) {
    const source = await readFile(join(workflows, name), 'utf8');
    const jobs = source.slice(source.indexOf('\njobs:')).split(/(?=^  [\w-]+:\s*$)/mu);
    for (const job of jobs) {
      const setups = [...job.matchAll(/uses: actions\/setup-node@/gu)].map(match => match.index);
      for (let index = 0; index < setups.length; index += 1) {
        jobsObserved += 1;
        const selection = job.slice(setups[index], setups[index + 1] ?? job.length);
        const selected = selection.match(/\bnode-version:\s*["']?([^"'\s]+)["']?/u)?.[1];
        assert.equal(selected, floor, `${name} selects the reviewed patch`);
        const receiptCommand = name === 'schema-pages.yml'
          ? 'run: node release-tools/tools/check-node-runtime.mjs'
          : 'run: node tools/check-node-runtime.mjs';
        const receipt = selection.indexOf(receiptCommand);
        assert.ok(receipt > 0, `${name} emits the workflow-owned runtime receipt`);
        const install = selection.search(/\bnpm\s+ci\b/u);
        assert.ok(install > receipt, `${name} admits the runtime before its first install`);
      }
    }
  }
  assert.ok(jobsObserved > 0, 'active CI Node owners remain discoverable');
});


test('direct maintained scripts, test entrypoints, and builders refuse a stale runtime', async t => {
  const { directory, staleOptions } = await fixture(t);
  const calls = [
    [checker],
    [join(root, 'tools/check-readme-routes.mjs')],
    [join(root, 'tools/node-route-inventory.mjs')],
    ['--test', join(root, 'tests/attribution/governance.test.mjs')],
    [join(root, 'tools/build-prod-projection.mjs'), '--check'],
    [join(root, 'cloudflare/schemas-worker/verify-accepted-publication.mjs')],
  ];
  for (const name of ['check-readme-routes', 'node-route-inventory']) {
    const alias = join(directory, `${name}-alias.mjs`);
    await symlink(join(root, `tools/${name}.mjs`), alias);
    calls.push([alias]);
  }
  const modes = [{ env: { NODE_OPTIONS: staleOptions } }];
  if (process.env.NODE_RUNTIME_STALE_EXECUTABLE) {
    const executable = process.env.NODE_RUNTIME_STALE_EXECUTABLE;
    const coordinate = runNode(['--version'], { executable });
    assert.equal(coordinate.status, 0, coordinate.stderr);
    assert.equal(coordinate.stdout.trim(), 'v22.23.3', 'the supplied diagnostic executable has the prior patch coordinate');
    modes.push({ executable });
  }
  for (const mode of modes) {
    for (const args of calls) {
      const result = runNode(args, { cwd: directory, ...mode });
      assert.notEqual(result.status, 0, `the maintained entrypoint refuses the stale runtime: ${args.map(value => value.split('/').at(-1)).join(' ')}`);
      assert.match(result.stderr + result.stdout, /ERR_NODE_RUNTIME: Detected Node v22\.23\.3/u);
      if (args[0] !== '--test') assert.equal(result.stdout, '', 'refusal precedes owned work and success receipts');
    }
  }
});

test('first-dependency admission precedes dependency and entrypoint effects', async t => {
  const { directory, staleOptions } = await fixture(t);
  await copyFile(join(root, 'tools/node-runtime-admission.mjs'), join(directory, 'tools/node-runtime-admission.mjs'));
  await writeFile(join(directory, 'dependency.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('dependency-effect', 'ran');\n");
  const entry = join(directory, 'builder.mjs');
  const body = "import './dependency.mjs';\nimport { writeFileSync } from 'node:fs'; writeFileSync('entry-effect', 'ran');\n";
  await writeFile(entry, "import './tools/node-runtime-admission.mjs';\n" + body);
  const denied = runNode([entry], { cwd: directory, env: { NODE_OPTIONS: staleOptions } });
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /ERR_NODE_RUNTIME/u);
  for (const marker of ['dependency-effect', 'entry-effect']) assert.equal(await exists(join(directory, marker)), false);
  const admitted = runNode([entry], { cwd: directory });
  assert.equal(admitted.status, 0, admitted.stderr);
  for (const marker of ['dependency-effect', 'entry-effect']) {
    assert.equal(await readFile(join(directory, marker), 'utf8'), 'ran');
    await rm(join(directory, marker));
  }
  await writeFile(entry, body);
  const restoredFault = runNode([entry], { cwd: directory, env: { NODE_OPTIONS: staleOptions } });
  assert.equal(restoredFault.status, 0, restoredFault.stderr);
  for (const marker of ['dependency-effect', 'entry-effect']) assert.equal(await readFile(join(directory, marker), 'utf8'), 'ran');
});


test('stable build metadata agrees with the installed npm engine evaluator', async () => {
  const npmRequire = createRequire(pathToFileURL(await npmCli()));
  const { satisfies } = npmRequire('semver');
  const coordinates = [
    '22.23.4', '22.23.4+metadata', '22.23.4+build.001', '22.24.0+vendor.a-1',
    '22.23.3+metadata', '22.23.4-rc.1', '22.24.0-rc.1+build.1', '24.22.1+build',
  ];
  for (const coordinate of coordinates) {
    assert.equal(supportsNode(coordinate), satisfies(coordinate, range), coordinate);
  }
});
