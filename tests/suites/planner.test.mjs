import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { admitCatalog, createPlan, parseArgs, traceAliases, main, CatalogError } from '../../tools/test-suite-plan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const POST_BASELINE_NODE_MEMBERS = ['tests/suites/planner.test.mjs', 'tests/investment-analysis/browser-helper.test.mjs', 'tests/context-canvas/about-first-paint-css.test.mjs', 'tests/context-canvas/debrief-catalog-preview-images.test.mjs', 'tests/context-canvas/debrief-catalog-preview.browser.mjs', 'tests/context-canvas/debrief-image-derivatives.test.mjs', 'tests/context-canvas/lims-capability-transfer-model.test.mjs', 'tests/context-canvas/prompt-side-figure.browser.mjs', 'tests/visualization-fidelity-atlas/atlas-research-data.test.mjs', 'tests/visualization-fidelity-atlas/atlas-research-view.test.mjs', 'tests/visualization-fidelity-atlas/atlas-research.browser.mjs'];
const fixture = () => ({
  schemaVersion: 1, sourceRevision: 'fixture',
  profiles: [{id: 'local', runtime: 'Node', prerequisites: [], effects: [], artifacts: [], timeout: 'owner-defined'}],
  suites: [
    {id: 'source.alpha', family: 'example', kind: 'node-test', profile: 'local', owner: 'tests/README.md', members: ['tests/alpha.test.mjs'], command: {cwd: '.', argv: ['node', '--test'], appendMembers: true}, scope: 'Pure unit fixture', aliases: ['test:alpha']},
    {id: 'browser.beta', family: 'example', kind: 'node-script', profile: 'local', owner: 'tests/README.md', members: ['tests/beta.browser.mjs'], command: {cwd: '.', argv: ['node'], appendMembers: true}, scope: 'Browser fixture', aliases: []},
    {id: 'live.gamma', family: 'example', kind: 'node-script', profile: 'local', owner: 'tests/README.md', members: ['tests/gamma.mjs'], command: null, hold: 'Choose an authorized endpoint.', scope: 'Live fixture', aliases: []},
  ],
  bundles: [
    {id: 'source-unit', description: 'Source', suites: ['source.alpha']},
    {id: 'family-integration', description: 'Overlap', suites: ['source.alpha', 'browser.beta']},
    {id: 'focused-browser', description: 'Browser', suites: ['browser.beta']},
    {id: 'live', description: 'Live', suites: ['live.gamma']},
  ],
});
const errorCode = code => error => error instanceof CatalogError && error.code === code;
const catalogPromise = readFile(resolve(ROOT, 'tests/suites/catalog.json'), 'utf8').then(JSON.parse);
const baselinePromise = readFile(resolve(ROOT, 'tests/suites/baseline-e1f00de.json'), 'utf8').then(JSON.parse);

test('literal oracle selects the unit module and exact argv while browser remains separate', () => {
  const result = createPlan(fixture(), {bundles: ['source-unit']});
  assert.deepEqual(result.suites.map(s => s.id), ['source.alpha']);
  assert.deepEqual(result.suites[0].members, ['tests/alpha.test.mjs']);
  assert.deepEqual(result.suites[0].command, {cwd: '.', argv: ['node', '--test', 'tests/alpha.test.mjs']});
  assert.equal(result.summary.executedTestCases, 0);
});

test('overlapping bundles deduplicate in canonical order and retain independent reasons', () => {
  const result = createPlan(fixture(), {bundles: ['focused-browser', 'family-integration', 'source-unit']});
  assert.deepEqual(result.suites.map(s => s.id), ['source.alpha', 'browser.beta']);
  assert.deepEqual(result.suites[0].reasons, ['bundle:source-unit', 'bundle:family-integration']);
  assert.deepEqual(result.suites[1].reasons, ['bundle:family-integration', 'bundle:focused-browser']);
});

test('nonempty held route remains a plan with a named receiving condition', () => {
  const result = createPlan(fixture(), {bundles: ['live']});
  assert.equal(result.summary.suites, 1);
  assert.equal(result.summary.heldRoutes, 1);
  assert.equal(result.suites[0].command, null);
  assert.equal(result.suites[0].hold, 'Choose an authorized endpoint.');
});

for (const [name, options, code] of [
  ['empty', {}, 'empty-selection'],
  ['unknown bundle', {bundles: ['absent']}, 'unknown-bundle'],
  ['unknown suite', {suites: ['constructor']}, 'unknown-suite'],
  ['repeated selector', {bundles: ['source-unit', 'source-unit']}, 'duplicate'],
]) test('selection boundary: ' + name, () => assert.throws(() => createPlan(fixture(), options), errorCode(code)));

for (const [name, change, code] of [
  ['duplicate suite', f => f.suites.push({...f.suites[0]}), 'duplicate'],
  ['duplicate bundle', f => f.bundles.push({...f.bundles[0]}), 'duplicate'],
  ['repeated bundle member', f => f.bundles[0].suites.push('source.alpha'), 'duplicate'],
  ['matching empty members', f => {f.suites[0].members = [];}, 'array'],
  ['empty bundle', f => {f.bundles[0].suites = [];}, 'array'],
  ['unknown bundle member', f => {f.bundles[0].suites = ['source.absent'];}, 'unknown-suite'],
  ['missing held reason', f => {delete f.suites[2].hold;}, 'field'],
  ['inherited required field', f => {const s = f.suites[0]; f.suites[0] = Object.assign(Object.create({owner: s.owner}), s); delete f.suites[0].owner;}, 'record'],
  ['wrong append flag', f => {f.suites[0].command.appendMembers = 'yes';}, 'command'],
]) test('catalog boundary: ' + name, () => {
  const f = fixture(); change(f); assert.throws(() => admitCatalog(f), errorCode(code));
});

for (const member of ['../outside.mjs', '/absolute.mjs', 'https://example.test/test.mjs', 'tests/*.mjs', 'tests/a[0].mjs', 'tests/./a.mjs', 'tests/a\n.mjs']) {
  test('literal path admission: ' + JSON.stringify(member), () => {
    const f = fixture(); f.suites[0].members = [member];
    assert.throws(() => admitCatalog(f), error => error instanceof CatalogError && ['path', 'text'].includes(error.code));
  });
}

test('plans detach admitted metadata and leave surplus fields outside projection', () => {
  const f = fixture();
  Object.defineProperty(f.suites[0], 'surplus', {enumerable: true, get() {throw new Error('surplus traversed');}});
  Object.defineProperty(f.suites[0].command, 'surplus', {enumerable: true, get() {throw new Error('nested surplus traversed');}});
  const result = createPlan(f, {suites: ['source.alpha']});
  f.suites[0].members[0] = 'changed.mjs';
  f.suites[0].command.argv[0] = 'changed';
  assert.deepEqual(result.suites[0].members, ['tests/alpha.test.mjs']);
  assert.equal(result.suites[0].command.argv[0], 'node');
  assert.equal(Object.hasOwn(result.suites[0], 'surplus'), false);
});

test('CLI options have explicit selection and listing boundaries', () => {
  assert.deepEqual(parseArgs(['--suite', 'source.alpha', '--json']), {bundles: [], suites: ['source.alpha'], list: false, json: true});
  for (const args of [['--bundle'], ['--run'], ['--list', '--suite', 'source.alpha'], ['--json', '--json']]) assert.throws(() => parseArgs(args), CatalogError);
});

test('npm alias metadata retains transitive source and detects cycles and missing owners', () => {
  assert.deepEqual(traceAliases({leaf: 'node leaf.mjs', parent: 'npm run leaf && node own.mjs'}, ['parent'], {parent: ['leaf']}), [
    {name: 'leaf', script: 'node leaf.mjs', invokes: []},
    {name: 'parent', script: 'npm run leaf && node own.mjs', invokes: ['leaf']},
  ]);
  assert.throws(() => traceAliases({a: 'npm run b', b: 'npm run a'}, ['a'], {a: ['b'], b: ['a']}), errorCode('alias-cycle'));
  assert.throws(() => traceAliases({}, ['constructor']), errorCode('unknown-alias'));
});

test('plan-only CLI returns with source and alias sentinel markers untouched', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'suite-plan-'));
  try {
    await mkdir(resolve(root, 'tests/suites'), {recursive: true});
    const f = fixture();
    const sourceMarker = resolve(root, 'source-ran');
    const aliasMarker = resolve(root, 'alias-ran');
    await writeFile(resolve(root, 'tests/alpha.test.mjs'), 'import { writeFileSync } from "node:fs"; writeFileSync(' + JSON.stringify(sourceMarker) + ', "executed");');
    await writeFile(resolve(root, 'tests/suites/catalog.json'), JSON.stringify(f));
    await writeFile(resolve(root, 'package.json'), JSON.stringify({scripts: {'test:alpha': 'node -e ' + JSON.stringify('require("node:fs").writeFileSync(' + JSON.stringify(aliasMarker) + ', "executed")')}}));
    let output = '';
    const result = await main(['--suite', 'source.alpha', '--json'], {root, write: text => {output += text;}});
    assert.equal(result.mode, 'plan-only');
    await assert.rejects(access(sourceMarker), {code: 'ENOENT'});
    await assert.rejects(access(aliasMarker), {code: 'ENOENT'});
    assert.deepEqual(JSON.parse(output).suites[0].command.argv, ['node', '--test', 'tests/alpha.test.mjs']);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('catalog preserves every exact baseline Node member and separates primary browser modules', async () => {
  const [catalog, baseline] = await Promise.all([catalogPromise, baselinePromise]);
  const all = createPlan(catalog, {suites: catalog.suites.filter(s => s.kind === 'node-test' && s.members.every(p => p.startsWith('tests/'))).map(s => s.id)});
  const members = all.suites.flatMap(s => s.members).sort();
  assert.deepEqual(members, [...baseline.nonbrowser, ...baseline.browser, ...POST_BASELINE_NODE_MEMBERS].sort());
  assert.equal(baseline.nonbrowser.length, 75);
  assert.equal(baseline.browser.length, 6);
  const unitPlan = createPlan(catalog, {bundles: ['source-unit']});
  const rootMembers = unitPlan.suites.flatMap(s => s.members).filter(p => p.startsWith('tests/') && p.endsWith('.mjs') && !POST_BASELINE_NODE_MEMBERS.includes(p));
  assert.deepEqual(rootMembers.sort(), [...baseline.nonbrowser].sort());
  for (const path of baseline.browser) assert.equal(rootMembers.includes(path), false);
});

test('Context Canvas source-suite membership follows every on-disk unit module', async () => {
  const catalog = await catalogPromise;
  const suite = catalog.suites.find(candidate => candidate.id === 'node.context-canvas');
  const onDisk = (await readdir(resolve(ROOT, 'tests/context-canvas')))
    .filter(path => path.endsWith('.test.mjs'))
    .map(path => `tests/context-canvas/${path}`)
    .sort();
  assert.deepEqual([...suite.members].sort(), onDisk);
});

test('all seven bundles have explicit membership and every current source owner resolves', async () => {
  const catalog = await catalogPromise;
  assert.deepEqual(catalog.bundles.map(b => b.id), ['source-unit', 'family-integration', 'focused-browser', 'visual-media', 'carrier', 'live', 'research']);
  const registered = new Set(catalog.bundles.flatMap(b => b.suites));
  assert.deepEqual([...registered].sort(), catalog.suites.map(s => s.id).sort());
  for (const s of catalog.suites) {
    await access(resolve(ROOT, s.owner));
    for (const member of s.members) await access(resolve(ROOT, member));
  }
});

test('existing package aliases retain their exact source through the compatibility route', async () => {
  const [pkg, baseline] = await Promise.all([readFile(resolve(ROOT, 'package.json'), 'utf8').then(JSON.parse), baselinePromise]);
  for (const name of ['test:prototype-units', 'test:attribution', 'test:canvas-iframe-routes', 'visual:check']) assert.equal(typeof baseline.compatibilityScripts[name], 'string', name);
  for (const [name, value] of Object.entries(baseline.compatibilityScripts)) assert.equal(pkg.scripts[name], value, name);
  const aliases = [...new Set((await catalogPromise).suites.flatMap(s => s.aliases))];
  assert.ok(traceAliases(pkg.scripts, aliases, (await catalogPromise).inventory.npmRunEdges).length > 0);
});

test('Python table membership stays explicit and distinct from nested project and browser routes', async () => {
  const plan = createPlan(await catalogPromise, {bundles: ['source-unit']});
  const python = plan.suites.filter(s => s.kind === 'python-unittest');
  assert.deepEqual(python.flatMap(s => s.members).sort(), [
    'tests/tables/prototype-labels/test_parser.py',
    'tests/tables/test_component_entry.py',
    'tests/tables/test_hiring_table_media.py',
    'tests/tables/test_table_context.py',
    'tests/tables/visitor-labels/test_visitor_labels.py',
  ]);
  assert.equal(plan.suites.some(s => s.kind === 'python-project'), false);
});

test('known commands retain held gates and each planned profile has independent mutable arrays', () => {
  const f = fixture();
  f.suites[1].hold = 'Choose the receiving browser approval.';
  f.profiles[0].prerequisites.push('Fixture runtime.');
  const result = createPlan(f, {bundles: ['family-integration']});
  assert.equal(result.suites[1].routeStatus, 'held');
  assert.deepEqual(result.suites[1].command.argv, ['node', 'tests/beta.browser.mjs']);
  assert.equal(result.summary.heldRoutes, 1);
  result.suites[0].prerequisites.push('Edited only here.');
  assert.deepEqual(result.suites[1].prerequisites, ['Fixture runtime.']);
});

test('sparse and inherited array elements are rejected explicitly', () => {
  for (const makeArray of [() => new Array(1), () => Object.setPrototypeOf(new Array(1), {'0': 'tests/alpha.test.mjs'})]) {
    const f = fixture(); f.suites[0].members = makeArray();
    assert.throws(() => admitCatalog(f), errorCode('array'));
  }
  assert.throws(() => createPlan(fixture(), {suites: new Array(1)}), errorCode('array'));
  assert.throws(() => traceAliases({}, new Array(1)), errorCode('array'));
});

test('repository-member appending stays at the repository root and rejects option-shaped paths', () => {
  const f = fixture(); f.suites[0].command.cwd = 'package';
  assert.throws(() => admitCatalog(f), errorCode('command'));
  f.suites[0].command.cwd = '.'; f.suites[0].members = ['--help'];
  assert.throws(() => admitCatalog(f), errorCode('path'));
});

test('declared alias edges preserve dotted names and leave quoted mentions as text', () => {
  assert.deepEqual(traceAliases({'suite.unit': 'node a.mjs', parent: 'npm run suite.unit'}, ['parent'], {parent: ['suite.unit']}).map(x => x.name), ['suite.unit', 'parent']);
  assert.deepEqual(traceAliases({notice: 'echo "npm run absent"'}, ['notice']), [{name: 'notice', script: 'echo "npm run absent"', invokes: []}]);
});

test('baseline accounting includes standalone browser entries and preserves all 103 source identities', async () => {
  const catalog = await catalogPromise;
  const inventory = catalog.inventory;
  const sourcePaths = [...inventory.baselineRootMembers, ...inventory.baselineStandaloneBrowser, ...Object.values(inventory.support).flat()];
  assert.equal(sourcePaths.length, 103);
  assert.equal(new Set(sourcePaths).size, 103);
  for (const member of sourcePaths) await access(resolve(ROOT, member));
});

test('text plans show both a known command and its hold reason', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'suite-held-'));
  try {
    await mkdir(resolve(root, 'tests/suites'), {recursive: true});
    const f = fixture(); f.suites[1].hold = 'Choose browser authority.';
    await writeFile(resolve(root, 'tests/suites/catalog.json'), JSON.stringify(f));
    await writeFile(resolve(root, 'package.json'), JSON.stringify({scripts: {}}));
    let output = '';
    await main(['--suite', 'browser.beta'], {root, write: value => {output += value;}});
    assert.ok(output.includes('tests/beta.browser.mjs'));
    assert.ok(output.includes('Hold: Choose browser authority.'));
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('consequential bundle routes retain independent literal expectations', async () => {
  const catalog = await catalogPromise;
  const ids = bundle => createPlan(catalog, {bundles: [bundle]}).suites.map(s => s.id);
  assert.deepEqual(ids('live'), ['worker.live', 'live.iframe', 'live.schema-pages']);
  assert.deepEqual(ids('research'), ['research.parser-comparison']);
  assert.deepEqual(ids('visual-media'), [
    'browser.visualization-fidelity-atlas.atlas-essay.browser',
    'browser.visualization-fidelity-atlas.atlas-gallery.browser',
    'browser.tables.hiring-schema-print',
    'visual.context-canvas-visual-reference',
    'visual.requested-surface',
    'browser.context-canvas.prompt-side-figure',
    'browser.visualization-fidelity-atlas.atlas-research.browser',
  ]);
  assert.deepEqual(ids('carrier'), [
    'node.attribution', 'node.iframe-routes', 'node.prod-deployment',
    'node.public-references', 'node.schema-pages', 'node.security', 'worker.source',
    'carrier.debrief-image-derivatives', 'carrier.iframe', 'carrier.production', 'carrier.transfer', 'carrier.schemas',
  ]);
  assert.ok(createPlan(catalog, {bundles: ['focused-browser']}).suites.every(s => s.profile === 'browser' && !s.id.startsWith('visual.')));
  assert.ok(createPlan(catalog, {bundles: ['live']}).suites.every(s => s.routeStatus === 'held'));
});

test('Debrief derivative carrier exposes its non-mutating check route', async () => {
  const plan = createPlan(await catalogPromise, {suites: ['carrier.debrief-image-derivatives']});
  assert.equal(plan.suites[0].routeStatus, 'declared');
  assert.deepEqual(plan.suites[0].command, {
    cwd: '.',
    argv: ['node', 'tools/generate-debrief-image-derivatives.mjs', '--check'],
  });
});

for (const [id, selector, member] of [
  ['python.tables.parser', 'parser', 'tests/tables/prototype-labels/test_parser.py'],
  ['python.tables.hiring-table-media', 'hiring-table-media', 'tests/tables/test_hiring_table_media.py'],
  ['python.tables.table-context', 'table-context', 'tests/tables/test_table_context.py'],
  ['python.tables.visitor-labels', 'visitor-labels', 'tests/tables/visitor-labels/test_visitor_labels.py'],
]) test('owned Python component route: ' + id, async () => {
  const plan = createPlan(await catalogPromise, {suites: [id]});
  assert.deepEqual(plan.suites[0].members, [member]);
  assert.deepEqual(plan.suites[0].command, {
    cwd: '.', argv: ['env', 'PYTHONDONTWRITEBYTECODE=1', 'uv', 'run', '--isolated',
      '--no-project', '--python', '3.12', '--managed-python', '--', 'python',
      '-m', 'tests.tables.run_components', selector],
  });
  assert.deepEqual(plan.suites[0].aliases, ['test:tables:python']);
});

test('Python entry fixtures have a separate route and all-component alias keeps its scope', async () => {
  const catalog = await catalogPromise;
  const plan = createPlan(catalog, {suites: ['python.tables.component-entry']});
  assert.deepEqual(plan.suites[0].members, ['tests/tables/test_component_entry.py']);
  assert.deepEqual(plan.suites[0].command.argv.slice(-8),
    ['-m', 'unittest', 'discover', '-s', 'tests/tables', '-p', 'test_component_entry.py', '-v']);
  assert.deepEqual(catalog.suites.filter(s => s.aliases.includes('test:tables:python')).map(s => s.id),
    ['python.tables.parser', 'python.tables.hiring-table-media', 'python.tables.table-context', 'python.tables.visitor-labels']);
  assert.deepEqual(plan.suites[0].aliases, ['test:tables:python:entry']);
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:tables:python'],
    'env PYTHONDONTWRITEBYTECODE=1 uv run --isolated --no-project --python 3.12 --managed-python -- python -m tests.tables.run_components all');
});

test('nested Python projects preserve host Python through managed isolated uv routes', async () => {
  const catalog = await catalogPromise;
  const ids = [
    'python.lims-eln-enterprise-reference-v0.1',
    'python.lims-eln-enterprise-implementation',
    'python.lims-eln-program-specification',
    'python.lims-eln-simulated-final-state',
    'python.lims-eln-comparative-evidence',
    'python.site-reading-governance',
  ];
  const plan = createPlan(catalog, {suites: ids});
  assert.deepEqual(plan.suites.map(suite => suite.id), ids);
  for (const suite of plan.suites) {
    assert.ok(suite.command.argv.includes('PYTHONDONTWRITEBYTECODE=1'));
    const uv = suite.command.argv.indexOf('uv');
    assert.notEqual(uv, -1, `${suite.id} carries uv`);
    assert.deepEqual(suite.command.argv.slice(uv, uv + 7), [
      'uv', 'run', '--isolated', '--no-project', '--python', '3.12', '--managed-python',
    ]);
    assert.ok(suite.command.argv.includes('python'));
  }
  const simulated = plan.suites.find(suite => suite.id === 'python.lims-eln-simulated-final-state');
  assert.deepEqual(
    simulated.command.argv.slice(
      simulated.command.argv.indexOf('--with-editable'),
      simulated.command.argv.indexOf('--'),
    ),
    ['--with-editable', '../lims-eln-program-specification'],
  );
  const comparative = plan.suites.find(suite => suite.id === 'python.lims-eln-comparative-evidence');
  assert.deepEqual(
    comparative.command.argv.slice(
      comparative.command.argv.indexOf('--with-editable'),
      comparative.command.argv.indexOf('--'),
    ),
    ['--with-editable', '../lims-eln-program-specification', '--with-editable', '.[validation]'],
  );
});

test('hiring print and receiver-dependent browser routes name their complete prerequisites', async () => {
  const catalog = await catalogPromise;
  const hiring = createPlan(catalog, {suites: ['browser.tables.hiring-schema-print']}).suites[0];
  assert.deepEqual(hiring.command.argv, [
    'env', 'PYTHONDONTWRITEBYTECODE=1', 'uv', 'run', '--isolated', '--no-project',
    '--python', '3.12', '--managed-python', '--with', 'pymupdf==1.26.5', '--',
    'node', 'tests/tables/hiring-schema-print.browser.mjs',
  ]);
  assert.deepEqual(hiring.aliases, ['test:hiring-schema-print-browser']);

  const worker = createPlan(catalog, {suites: ['worker.browser']}).suites[0];
  assert.equal(worker.routeStatus, 'held');
  assert.equal(worker.command, null);
  assert.match(worker.hold, /HTTPS Worker receiver/u);
});

test('carrier plans distinguish local checks from receiver and release inputs', async () => {
  const plan = createPlan(await catalogPromise, {suites: ['carrier.iframe', 'carrier.production', 'carrier.transfer']});
  const byId = new Map(plan.suites.map(suite => [suite.id, suite]));
  assert.equal(byId.get('carrier.iframe').routeStatus, 'declared');
  assert.equal(byId.get('carrier.production').routeStatus, 'held');
  assert.match(byId.get('carrier.production').hold, /\.env\.public/u);
  assert.equal(byId.get('carrier.transfer').routeStatus, 'held');
  assert.equal(byId.get('carrier.transfer').command, null);
  assert.match(byId.get('carrier.transfer').hold, /--receipt FILE/u);
});

test('Prompt-Side figure keeps its browser observation separately selectable', async () => {
  const catalog = await catalogPromise;
  const plan = createPlan(catalog, {suites: ['browser.context-canvas.prompt-side-figure']});
  assert.equal(plan.suites.length, 1);
  assert.deepEqual(plan.suites[0].members, ['tests/context-canvas/prompt-side-figure.browser.mjs']);
  assert.deepEqual(plan.suites[0].command.argv, ['node', '--test', 'tests/context-canvas/prompt-side-figure.browser.mjs']);
  assert.equal(createPlan(catalog, {bundles: ['source-unit']}).suites.some(suite => suite.id === 'browser.context-canvas.prompt-side-figure'), false);
});

test('Atlas research keeps source contracts and rendered observations separately selectable', async () => {
  const catalog = await catalogPromise;
  const source = createPlan(catalog, {suites: ['node.visualization-fidelity-atlas']});
  for (const member of [
    'tests/visualization-fidelity-atlas/atlas-research-data.test.mjs',
    'tests/visualization-fidelity-atlas/atlas-research-view.test.mjs',
  ]) assert.ok(source.suites[0].members.includes(member));
  const browser = createPlan(catalog, {suites: ['browser.visualization-fidelity-atlas.atlas-research.browser']});
  assert.deepEqual(browser.suites[0].command.argv,
    ['node', '--test', 'tests/visualization-fidelity-atlas/atlas-research.browser.mjs']);
  assert.equal(createPlan(catalog, {bundles: ['source-unit']}).suites.some(
    suite => suite.id === 'browser.visualization-fidelity-atlas.atlas-research.browser'), false);
});
