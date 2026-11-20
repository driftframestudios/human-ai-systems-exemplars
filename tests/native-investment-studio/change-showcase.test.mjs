import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { changeShowcaseConfiguration, changeShowcaseEntries, projectChangeEmphasis, frameworkEmphasisEntries } from '../../collaboration/native-investment-studio/change-showcase.mjs';
import { createChangeSettings, projectChange, listChangeFrameworks, listInterpretiveLenses, getChangeFramework } from '../../collaboration/native-investment-studio/change-models.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createShowcasePlan, listPresets, preparePreset } from '../../collaboration/native-investment-studio/presets.mjs';

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

test('each framework fader owns one independent component emphasis and leaves support intact', () => {
  for (const framework of listChangeFrameworks()) {
    for (const component of framework.components) {
      const settings = createChangeSettings(); settings.activeFramework.frameworkId = framework.id;
      settings.attention.channels.forEach(channel => { channel.parts = 7; });
      const before = JSON.stringify(settings.frameworkMaps);
      const entries = new Map(frameworkEmphasisEntries(framework.id, component.id, 23));
      settings.attention.channels.forEach(channel => {
        if (entries.has(`attention.${channel.channelId}`)) channel.parts = Number(entries.get(`attention.${channel.channelId}`));
      });
      const reading = projectChangeEmphasis(projectChange(settings));
      assert.deepEqual(reading.map(row => row.emphasis), framework.components.map(row => row.id === component.id ? 23 : 7));
      assert.equal(JSON.stringify(settings.frameworkMaps), before);
    }
  }
});

test('authored pilot starts with genuine session support while every preset remains admissible', () => {
  const plan = createShowcasePlan(), workIds = new Set(plan.work.map(work => work.id));
  assert.ok(plan.changeSettings.frameworkMaps[0].components.every(component => component.workIds.length && component.workIds.every(id => workIds.has(id))));
  for (const preset of listPresets()) assert.ok(preparePreset(preset.id, preset.version).projection.state);
});
