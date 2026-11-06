import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { changeShowcaseConfiguration, changeShowcaseEntries, projectChangeEmphasis } from '../../collaboration/native-investment-studio/change-showcase.mjs';
import { createChangeSettings, projectChange, listInterpretiveLenses, getChangeFramework } from '../../collaboration/native-investment-studio/change-models.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';

test('authored viewpoints select existing models while preserving supplied work and planning status', () => {
  for (const lens of listInterpretiveLenses()) {
    const preset = changeShowcaseConfiguration(lens.id);
    assert.ok(getChangeFramework(preset.frameworkId, lens.version));
    assert.equal(new Set(preset.channels.map(row => row.channelId)).size, 8);
  }
  const plan = createExamplePlan(), raw = {};
  for (const map of plan.changeSettings.frameworkMaps) for (const component of map.components) {
    raw[`map.${map.frameworkId}.${component.componentId}.workIds`] = [];
    raw[`map.${map.frameworkId}.${component.componentId}.status`] = component.status;
  }
  raw['map.kotter.coalition.workIds'] = ['review'];
  raw['map.kotter.coalition.status'] = 'look';
  const before = JSON.stringify({ plan, raw });
  const entries = new Map(changeShowcaseEntries(plan, raw, 'executive'));
  assert.equal(entries.get('framework'), 'kotter@1.0.0');
  assert.equal(entries.has('map.kotter.coalition.workIds'), false);
  assert.equal(entries.has('map.kotter.coalition.status'), false);
  assert.equal(JSON.stringify({ plan, raw }), before);
});

test('attention changes the visible emphasis within the chosen model without changing readiness or support', () => {
  const settings = createChangeSettings(); settings.activeFramework.frameworkId = 'adkar';
  settings.attention.channels.forEach(channel => { channel.parts = channel.channelId === 'remove-barriers' ? 25 : 0; });
  const before = JSON.stringify(settings), rows = projectChangeEmphasis(projectChange(settings));
  assert.deepEqual(rows.filter(row => row.lane === 'focus').map(row => row.componentId), ['ability']);
  assert.equal(JSON.stringify(settings), before);
  assert.deepEqual(rows.map(row => [row.componentId, row.status, row.workIds]),
    settings.frameworkMaps.find(row => row.frameworkId === 'adkar').components.map(row => [row.componentId, row.status, row.workIds]));
});
