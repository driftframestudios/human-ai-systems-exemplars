import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { listChangeFrameworks } from '../../collaboration/native-investment-studio/change-models.mjs';
import { getChangeMethod, listChangeMethods } from '../../collaboration/native-investment-studio/change-methods.mjs';

const root = new URL('../../', import.meta.url);
const canonicalRoot = 'core-architectures-chimeric-prototype-current-pack-v0.1/';
const canvasRoot = 'context-canvas-project-surface/context-canvas/';
const receivingRoot = canvasRoot + 'prototypes/core-architectures/chimeric-pack-v0.1/';
const manifestName = 'core-architectures-chimeric-prototype-manifest-v0.1.json';
const read = path => readFile(new URL(path, root), 'utf8');

test('each offered suggestion receives usable guidance while preserving its authored identity', () => {
  const offered = new Map();
  for (const framework of listChangeFrameworks()) for (const component of framework.components) {
    for (const source of ['core', 'enterprise']) for (const suggestion of component[source + 'Suggestions']) {
      const method = getChangeMethod(suggestion.id);
      assert.ok(method, `${framework.name}: ${suggestion.label} needs guidance`);
      assert.equal(method.source, source);
      assert.equal(method.label, suggestion.label);
      offered.set(suggestion.id, method);
      for (const field of ['displayLabel', 'purpose', 'useWhen', 'leaveWith', 'question', 'example', 'sessionLabel', 'sourceNote']) {
        assert.equal(typeof method[field], 'string', `${suggestion.id}.${field}`);
        assert.ok(method[field].trim(), `${suggestion.id}.${field}`);
      }
      assert.ok(Array.isArray(method.bring) && method.bring.length > 0);
      assert.ok(method.bring.every(value => typeof value === 'string' && value.trim()));
      assert.notEqual(method.sessionLabel, method.label, 'A proposed session names the intended work.');
    }
  }
  assert.deepEqual(new Set(listChangeMethods().map(method => method.id)), new Set(offered.keys()));
  assert.equal(getChangeMethod('measurement').displayLabel, 'Measurement');
  assert.equal(getChangeMethod('frv-matrix').displayLabel, 'First Responsible Version Matrix');
});

test('prototype guidance follows canonical identity and the separately adapted receiving manifest', async () => {
  const [canonical, receiving] = await Promise.all([
    read(canonicalRoot + manifestName).then(JSON.parse),
    read(receivingRoot + manifestName).then(JSON.parse),
  ]);
  const canonicalById = new Map(canonical.prototypes.map(row => [row.id, row]));
  const receivingById = new Map(receiving.prototypes.map(row => [row.id, row]));
  for (const method of listChangeMethods()) {
    const source = method.provenance;
    if (!source.sourcePath.startsWith(canonicalRoot)) continue;
    const original = canonicalById.get(source.semanticId);
    const local = receivingById.get(source.semanticId);
    assert.ok(original && local, method.id);
    assert.equal(source.sourcePath, canonicalRoot + original.file);
    assert.equal(source.sourceVersion, original.version);
    assert.equal(source.receivingVersion, local.version);
    if (method.id === 'poda') {
      assert.deepEqual(method.readingRoute, {
        path: canvasRoot + 'poda.html', fragment: 'poda-prototype-title', label: 'Explore PODA and its prototype',
      });
    } else assert.equal(method.readingRoute.path, receivingRoot + local.file);
  }
  assert.equal(getChangeMethod('frv-matrix').provenance.semanticId, 'first-responsible-version-matrix');
  assert.equal(getChangeMethod('shared-surface-priority-map').provenance.semanticId, 'cross-channel-blueprint');
});

test('companion routes resolve within the existing Context Canvas receiving tree', async () => {
  const carrier = JSON.parse(await read('deployment/cpanel/primary-route-manifest.json'));
  const projectedBySource = new Map(carrier.files.map(row => [row.source_path, row.projected_path]));
  const routes = new Map();
  const sourcePaths = new Set();
  for (const method of listChangeMethods()) {
    sourcePaths.add(method.provenance.sourcePath);
    if (!method.readingRoute) continue;
    const { path, fragment, label } = method.readingRoute;
    assert.ok(path.startsWith(canvasRoot), `${method.id} uses a Context Canvas receiver`);
    assert.equal(path.split('/').includes('..'), false);
    assert.equal(projectedBySource.get(path), path.slice(canvasRoot.length), `${method.id} resolves after primary projection`);
    assert.ok(label.trim());
    routes.set(path + '#' + (fragment ?? ''), method.readingRoute);
  }
  await Promise.all([...sourcePaths].map(path => access(new URL(path, root))));
  await Promise.all([...routes.values()].map(async ({ path, fragment }) => {
    if (!fragment) return access(new URL(path, root));
    const html = await read(path);
    assert.ok(html.includes(`id="${fragment}"`) || html.includes(`id='${fragment}'`), `${path}#${fragment}`);
  }));
});

test('the core examples preserve the decision each method supports', async () => {
  const poda = getChangeMethod('poda'), impact = getChangeMethod('impact-map'), strategy = getChangeMethod('strategy-canvas');
  const [podaSource, impactSource, strategySource] = await Promise.all([
    read(poda.provenance.sourcePath), read(impact.provenance.sourcePath),
    read(canonicalRoot + 'strategy-canvas-system-v0.2/canonical.template.html'),
  ]);
  assert.ok(podaSource.includes('Purpose, Objectives, Discoverables, Activities'));
  assert.match(poda.leaveWith, /Purpose → Objectives → Discoverables → Activities/);
  assert.match(poda.example, /Discoverable: where does ownership need clarification\?/);
  assert.ok(impactSource.includes('Goal → Actor → Impact → Discoverable'));
  assert.match(impact.leaveWith, /Goal → Actor → Impact → Discoverable/);
  assert.match(impact.example, /Actor: service coordinator\. Impact: can identify the next responsible owner\./);
  assert.ok(strategySource.includes('Offering level moves the curve.'));
  assert.ok(strategySource.includes('Consequence weight directs discussion attention'));
  assert.match(strategy.bring.join(' '), /observable scale anchors, evidence/);
  assert.match(strategy.example, /Keep consequence weight separate from the support score/);
});

test('Studio-authored guidance carries its own standing and the catalogue remains read-only', () => {
  for (const id of ['expectation-architecture', 'field-watch', 'interstitial-compression', 'measurement']) {
    const method = getChangeMethod(id);
    assert.equal(method.provenance.kind, 'studio-guidance');
    assert.equal(method.provenance.sourcePath, 'collaboration/native-investment-studio/change-methods.mjs');
    assert.equal(method.sourceNote, 'Planning guidance authored for this Studio suggestion.');
  }
  assert.equal(getChangeMethod('expectation-architecture').readingRoute, null);
  assert.equal(getChangeMethod('__proto__'), null);
  assert.equal(getChangeMethod(null), null);
  assert.throws(() => { getChangeMethod('poda').bring.push('Changed'); }, TypeError);
  assert.throws(() => { getChangeMethod('strategy-canvas').readingRoute.path = 'changed'; }, TypeError);
});
