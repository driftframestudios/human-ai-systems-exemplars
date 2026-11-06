import { CHANGE_CATALOGUE_VERSION, getChangeFramework, listAttentionChannels } from './change-models.mjs';

// These are authored discussion configurations, not readiness scores or cost multipliers.
// The fixed channel order belongs to the Change catalogue; component associations
// belong here so each framework retains its own questions as visitors turn a fader.
const CHANNELS = Object.freeze(listAttentionChannels().map(channel => channel.id));
const LENSES = Object.freeze({
  executive: { framework: 'kotter', levels: [22, 16, 24, 12, 13, 20, 10, 8] },
  people: { framework: 'adkar', levels: [12, 16, 18, 25, 22, 14, 12, 16] },
  operating: { framework: 'npt', levels: [10, 20, 15, 18, 22, 12, 24, 25] },
  technical: { framework: 'rogers', levels: [12, 10, 18, 14, 25, 23, 18, 12] },
  quality: { framework: 'adkar', levels: [14, 16, 19, 14, 25, 20, 16, 24] },
  risk: { framework: 'dual', levels: [21, 25, 17, 14, 24, 10, 22, 16] },
  staffing: { framework: 'dual', levels: [12, 25, 15, 24, 19, 12, 20, 18] },
  learning: { framework: 'weick', levels: [13, 14, 19, 20, 16, 25, 18, 23] },
});
const ASSOCIATIONS = Object.freeze({
  kotter: [['urgency'], ['coalition'], ['vision'], ['broad-participation'], ['remove-barriers'], ['short-term-wins'], ['sustain-acceleration'], ['anchor-in-culture']],
  npt: [['vision', 'urgency'], ['coalition', 'broad-participation'], ['remove-barriers'], ['short-term-wins', 'sustain-acceleration'], ['anchor-in-culture']],
  rogers: [['vision', 'urgency'], ['anchor-in-culture', 'broad-participation'], ['remove-barriers'], ['short-term-wins'], ['sustain-acceleration', 'coalition']],
  weick: [['broad-participation', 'coalition', 'short-term-wins'], ['urgency', 'vision', 'remove-barriers'], ['anchor-in-culture', 'sustain-acceleration']],
  adkar: [['urgency', 'vision'], ['coalition', 'broad-participation'], ['short-term-wins'], ['remove-barriers', 'sustain-acceleration'], ['anchor-in-culture']],
  dual: [['urgency', 'vision', 'anchor-in-culture', 'remove-barriers'], ['coalition', 'broad-participation', 'short-term-wins', 'sustain-acceleration']],
});
const SUPPORT = Object.freeze({
  urgency: 'research', coalition: 'review', vision: 'pairing', 'broad-participation': 'review',
  'remove-barriers': 'rehearsal', 'short-term-wins': 'pairing', 'sustain-acceleration': 'rehearsal', 'anchor-in-culture': 'review',
});

// Each framework partitions the stored channels. A visible fader therefore
// changes one component while preserving every other component's emphasis.
export function frameworkEmphasisEntries(frameworkId, componentId, value) {
  const framework = getChangeFramework(frameworkId, CHANGE_CATALOGUE_VERSION);
  const index = framework?.components.findIndex(component => component.id === componentId) ?? -1;
  return index < 0 ? [] : ASSOCIATIONS[frameworkId][index].map(id => [`attention.${id}`, String(value)]);
}

export function seedShowcaseChangeSupport(plan) {
  const active = new Set(plan.work.filter(work => work.lifecycle === 'active').map(work => work.id));
  for (const map of plan.changeSettings.frameworkMaps) map.components.forEach((component, index) => {
    if (component.workIds.length || component.status === 'outside') return;
    component.workIds = [...new Set(ASSOCIATIONS[map.frameworkId][index].map(id => SUPPORT[id]))].filter(id => active.has(id));
    if (component.workIds.length) component.mapped = true;
  });
  return plan;
}

export function changeShowcaseConfiguration(lensId, frameworkId) {
  const lens = LENSES[lensId] ?? LENSES.executive;
  return { frameworkId: frameworkId ?? lens.framework,
    channels: CHANNELS.map((channelId, index) => ({ channelId, parts: lens.levels[index] })) };
}

// Returning draft entries makes presets use the same owned edit/apply/cancel route
// as hand-edited settings. Existing work links and explicit statuses survive.
export function changeShowcaseEntries(plan, raw, lensId, frameworkId) {
  const configuration = changeShowcaseConfiguration(lensId, frameworkId);
  const framework = getChangeFramework(configuration.frameworkId, CHANGE_CATALOGUE_VERSION);
  if (!framework) return [];
  const entries = [['lens', `${lensId}@${CHANGE_CATALOGUE_VERSION}`], ['framework', `${framework.id}@${framework.version}`],
    ...configuration.channels.map(channel => [`attention.${channel.channelId}`, String(channel.parts)])];
  const activeWork = new Map(plan.work.filter(row => row.lifecycle === 'active').map(row => [row.id, row]));
  framework.components.forEach((component, index) => {
    const prefix = `map.${framework.id}.${component.id}.`;
    // Only the authored pilot roles seed work. An imported plan keeps its own
    // sessions and offers the existing chooser instead of guessed relationships.
    const workIds = [...new Set(ASSOCIATIONS[framework.id][index].map(id => SUPPORT[id]))].filter(id => activeWork.has(id));
    if (!raw[prefix + 'workIds'].length && workIds.length && raw[prefix + 'status'] !== 'outside') {
      entries.push([prefix + 'workIds', workIds], [prefix + 'mapped', 'yes']);
    }
  });
  return entries;
}

export function projectChangeEmphasis(reading) {
  const parts = new Map(reading.attention.channels.map(channel => [channel.id, channel.parts]));
  const associations = ASSOCIATIONS[reading.framework.id];
  const rows = reading.components.map((component, index) => ({ ...component,
    emphasis: Math.max(...associations[index].map(id => Number.isFinite(parts.get(id)) ? parts.get(id) : 0)),
    channels: associations[index], index }));
  const highest = [...rows].filter(row => row.status !== 'outside').sort((a, b) => b.emphasis - a.emphasis || a.index - b.index).slice(0, 3);
  const focus = new Set(highest.filter(row => row.emphasis > 0).map(row => row.componentId));
  const supporting = new Set([...rows].filter(row => row.status !== 'outside' && !focus.has(row.componentId))
    .sort((a, b) => b.emphasis - a.emphasis || a.index - b.index).slice(0, 3).map(row => row.componentId));
  return rows.map(row => ({ ...row, lane: focus.has(row.componentId) ? 'focus' : supporting.has(row.componentId) ? 'support' : 'available' }));
}
