import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  CHANGE_CATALOGUE_VERSION, FOUR_ACTIONS_METHOD, createChangeSettings,
  getChangeFramework, getChangeComponent, getChangeSuggestion, getInterpretiveLens,
  listChangeFrameworks, listInterpretiveLenses, listAttentionChannels,
  listComponentSuggestions, preferredChangeSuggestion, selectFourActions, projectChange,
} from '../../collaboration/native-investment-studio/change-models.mjs';

test('the native definitions retain the original authored explanations, suggestions, receivers and lens fields', async () => {
  const source = await readFile(new URL('../../collaboration/initiative-costing-calculator/index.html', import.meta.url), 'utf8');
  const { CHANGE_FRAMEWORKS } = await import('../../collaboration/native-investment-studio/roles.mjs');
  function literal(name, end) {
    const marker = '  var ' + name + '=', begin = source.indexOf(marker);
    assert.ok(begin >= 0);
    const start = begin + marker.length, finish = source.indexOf(end, start);
    assert.ok(finish > start);
    return JSON.parse(JSON.stringify(vm.runInNewContext('(' + source.slice(start, finish) + ')')));
  }
  const original = { frameworks: literal('frameworks', ';\n  function createDefaultFrameworkStates'),
    lenses: literal('lenses', ';\n'), attention: literal('changeComponents', ';\n'),
    allocations: [12, 10, 12, 14, 14, 12, 13, 13], stableIds: CHANGE_FRAMEWORKS };
  assert.deepEqual(listChangeFrameworks().map(row => row.id), Object.keys(original.frameworks));
  for (const row of listChangeFrameworks()) {
    const source = original.frameworks[row.id];
    assert.deepEqual({ name: row.name, short: row.short, note: row.note },
      { name: source.name, short: source.short, note: source.note });
    assert.deepEqual(row.components.map(component => [component.label, component.explanation,
      component.coreSuggestions.map(item => item.label), component.enterpriseSuggestions.map(item => item.label), component.receiverRole]), source.components);
    assert.deepEqual(row.components.map(component => ({ id: component.id, label: component.label })),
      original.stableIds.find(candidate => candidate.id === row.id).components);
  }
  assert.deepEqual(listInterpretiveLenses().map(({ id, version, ...fields }) => [id, fields]), Object.entries(original.lenses));
  assert.deepEqual(listAttentionChannels().map(row => [row.label, row.description]), original.attention);
  assert.deepEqual(listAttentionChannels().map(row => row.defaultParts), original.allocations);
  assert.equal(getInterpretiveLens('technical', '1.0.0').trigger, 'A dependency or failure mode crosses a system boundary');
  assert.equal(getChangeComponent('npt', '1.0.0', 'elasticity-plasticity').receiverRole, 'Architecture steward');
});

test('exact versions and immutable definitions keep a later edit within its own receiving plan', () => {
  assert.equal(getChangeFramework('kotter', '0.0.0'), null);
  assert.equal(getChangeFramework('__proto__', CHANGE_CATALOGUE_VERSION), null);
  assert.equal(getInterpretiveLens('toString', CHANGE_CATALOGUE_VERSION), null);
  assert.equal(getChangeComponent('kotter', '1.0.0', 'coherence'), null);
  assert.throws(() => { listChangeFrameworks()[0].components[0].coreSuggestions[0].label = 'Changed'; }, TypeError);
  const first = createChangeSettings(), second = createChangeSettings();
  first.frameworkMaps[0].components[0].workIds.push('review');
  first.frameworkMaps[0].components[0].status = 'planned';
  first.attention.channels[0].parts = 0;
  assert.deepEqual(second.frameworkMaps[0].components[0], {
    componentId: 'urgency', mapped: true, status: 'partial', workIds: [], capabilityRefs: [],
  });
  assert.equal(second.attention.channels[0].parts, 12);
  assert.deepEqual(second.activeFramework, { frameworkId: 'kotter', version: '1.0.0' });
  assert.deepEqual(second.lens, { lensId: 'executive', version: '1.0.0' });
});

test('source choice preserves authored order and the original gap-suggestion preference', () => {
  const urgency = getChangeComponent('kotter', '1.0.0', 'urgency');
  assert.deepEqual(listComponentSuggestions(urgency, 'all').map(row => row.id),
    ['practitioner-judgment-probes', 'field-watch', 'stakeholder-inquiry', 'measurement']);
  assert.equal(preferredChangeSuggestion(urgency, 'core').label, 'Practitioner Judgment Probes');
  assert.equal(preferredChangeSuggestion(urgency, 'enterprise').label, 'stakeholder inquiry');
  assert.equal(preferredChangeSuggestion(urgency, 'all').label, 'stakeholder inquiry');
  const onlyCore = { coreSuggestions: urgency.coreSuggestions, enterpriseSuggestions: [] };
  const onlyEnterprise = { coreSuggestions: [], enterpriseSuggestions: urgency.enterpriseSuggestions };
  assert.equal(preferredChangeSuggestion(onlyCore, 'all').label, 'Practitioner Judgment Probes');
  assert.equal(preferredChangeSuggestion(onlyEnterprise, 'core').label, 'stakeholder inquiry');
  assert.equal(getChangeSuggestion('kotter', '1.0.0', 'urgency', 'enterprise', 'stakeholder-inquiry').label, 'stakeholder inquiry');
  assert.equal(getChangeSuggestion('kotter', '1.0.0', 'urgency', 'core', 'stakeholder-inquiry'), null);
});

test('Four Actions preserves status preferences, authored tie order and small-framework reuse', () => {
  const settings = createChangeSettings();
  const select = id => selectFourActions(getChangeFramework(id, '1.0.0'), settings.frameworkMaps.find(row => row.frameworkId === id).components);
  assert.deepEqual(select('kotter').map(row => row.componentId), ['coalition', 'urgency', 'vision', 'broad-participation']);
  assert.deepEqual(select('weick').map(row => row.componentId), ['selection', 'enactment', 'retention', 'enactment']);
  assert.deepEqual(select('dual').map(row => row.componentId), ['network', 'hierarchy', 'hierarchy', 'network']);
  assert.deepEqual(select('dual').map(row => [row.label, row.time]), [['Raise', 'Now'], ['Reduce', 'Next'], ['Eliminate', 'Now'], ['Create', 'Later']]);
  const kotter = settings.frameworkMaps[0].components;
  kotter.forEach(row => { row.status = 'planned'; row.mapped = false; });
  kotter.find(row => row.componentId === 'anchor-in-culture').status = 'outside';
  kotter.find(row => row.componentId === 'short-term-wins').status = 'partial';
  kotter.find(row => row.componentId === 'vision').status = 'look';
  assert.deepEqual(select('kotter').map(row => row.componentId), ['vision', 'short-term-wins', 'anchor-in-culture', 'urgency']);
  assert.match(FOUR_ACTIONS_METHOD.adaptation, /form planning questions/);
});

test('the projection separates mapping gaps from support records and keeps relative attention through framework changes', () => {
  const settings = createChangeSettings();
  const row = settings.frameworkMaps[0].components[0];
  row.workIds.push('review');
  row.capabilityRefs.push({ kind: 'practice', instanceId: 'expectations' });
  row.status = 'partial';
  const before = JSON.stringify(settings), initial = projectChange(settings);
  assert.equal(initial.mappingGaps.some(item => item.componentId === 'urgency'), false);
  assert.equal(initial.mappingGaps.some(item => item.componentId === 'coalition'), true);
  assert.deepEqual(initial.attention.top.map(item => item.id), ['broad-participation', 'remove-barriers', 'sustain-acceleration']);
  assert.deepEqual(initial.attention.lowest.map(item => item.id), ['coalition', 'urgency']);
  assert.equal(JSON.stringify(settings), before);
  assert.equal(Object.isFrozen(settings.frameworkMaps[0].components[0].workIds), false);
  assert.equal(Object.isFrozen(settings.frameworkMaps[0].components[0].capabilityRefs[0]), false);
  row.mapped = false; row.workIds.push('preparation');
  assert.deepEqual(initial.components[0].workIds, ['review']);
  assert.equal(projectChange(settings).mappingGaps.some(item => item.componentId === 'urgency'), true);
  settings.activeFramework.frameworkId = 'dual';
  settings.lens.lensId = 'people';
  const dual = projectChange(settings);
  assert.equal(dual.lens.name, 'Affected people');
  assert.deepEqual(dual.attention.channels.map(item => item.parts), [12, 10, 12, 14, 14, 12, 13, 13]);
  assert.equal(dual.attention.top.length, 8);
  settings.attention.channels.forEach(channel => { channel.parts = 0; });
  const zero = projectChange(settings);
  assert.equal(zero.attention.totalParts, 0);
  assert.deepEqual(zero.attention.ranked.map(item => item.id), listAttentionChannels().map(item => item.id));
  assert.deepEqual(settings.frameworkMaps[0].components[0].workIds, ['review', 'preparation']);
});
