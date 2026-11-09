import { getCapabilityDefinition } from './capabilities.mjs';
import { getChangeFramework } from './change-models.mjs';
import { CONTRIBUTION_CATEGORIES } from './roles.mjs';
import { describeArrangementReference } from './coordination-arrangements.mjs';
import { describeAssuranceReference } from './assurance-models.mjs';
import { describeScoreReference } from './score-reference.mjs';

const categories = new Map(CONTRIBUTION_CATEGORIES.map(row => [row.id, row.label]));
const referenceNames = Object.freeze({ people: 'Person', teams: 'Team', work: 'Work', connections: 'Connection',
  contributions: 'Contribution', abilities: 'Ability', practices: 'Practice', capabilityEvidence: 'Evidence',
  arrangements: 'Arrangement', scoreSettings: 'Workflow record', assuranceSettings: 'Quality record', changeSettings: 'Change framework' });
function record(state, collection, id) {
  const row = state[collection]?.find(row => row.id === id);
  if (!row) throw new TypeError(`Removal reference requires an accepted ${collection} record: ${id}`);
  return row;
}
function capabilityName(state, kind, id) {
  const row = record(state, kind === 'ability' ? 'abilities' : 'practices', id);
  return getCapabilityDefinition(kind, row.definitionId, row.definitionVersion).action;
}
const recordLabels = Object.freeze({
  people: (state, row) => `Person: ${row.label}`,
  teams: (state, row) => `Team: ${row.label}`,
  work: (state, row) => `Work: ${row.label}`,
  connections: (state, row) => `Connection: ${row.sharedObject}`,
  contributions: (state, row) => `Contribution: ${categories.get(row.categoryId)}`,
  abilities: (state, row) => `Ability: ${capabilityName(state, 'ability', row.id)}`,
  practices: (state, row) => `Practice: ${capabilityName(state, 'practice', row.id)}${row.teamId ? ` · ${record(state, 'teams', row.teamId).label}` : ''}`,
  capabilityEvidence: (state, row) => `Evidence: ${capabilityName(state, row.subject.kind, row.subject.instanceId)} · ${row.context}`,
});
const linked = (label, chapter, text, dataset) => ({ label, link: { href: `#native-studio-${chapter}`, text, dataset } });

// Undo can remove a referenced record while a failed removal draft stays open.
// Keep its stable identity readable; a new reference family still needs an owner.
export function describeRemovalReference(state, reference) {
  const { collection, id } = reference;
  if (!Object.hasOwn(referenceNames, collection)) throw new TypeError(`Unsupported removal reference: ${collection}/${id}/${reference.field}`);
  const previous = { label: `${referenceNames[collection]}: ${id} (earlier plan)` };
  if (Object.hasOwn(recordLabels, collection)) {
    const row = state[collection].find(row => row.id === id);
    return row ? { label: recordLabels[collection](state, row) } : previous;
  }
  if (collection === 'arrangements') {
    const arrangement = describeArrangementReference(state, reference);
    if (arrangement) return linked(arrangement.label, 'coordination', 'Review the arrangement', { nativeOpenArrangement: arrangement.id });
  } else if (collection === 'scoreSettings') {
    const score = describeScoreReference(state.scoreSettings, reference);
    if (score) return linked(score.label, 'coordination', 'Review in the coordination horizon', { nativeOpenScore: score.kind, nativeScoreId: score.id });
  } else if (collection === 'assuranceSettings') {
    return linked(describeAssuranceReference(state.assuranceSettings, reference), 'assurance', 'Review in Quality & recovery', { nativeOpenAssurance: '' });
  } else if (collection === 'changeSettings') {
    const mapping = state.changeSettings.frameworkMaps.find(row => row.frameworkId === id);
    if (mapping) return linked(getChangeFramework(id, mapping.version).name, 'change', 'Review linked work in Change', { nativeOpenChange: '' });
  }
  return previous;
}

export function renderRemovalReferences(list, state, references = []) {
  const document = list.ownerDocument;
  const items = references.map(reference => {
    const description = describeRemovalReference(state, reference), item = document.createElement('li');
    item.textContent = description.label;
    if (description.link) {
      const link = document.createElement('a'); link.className = 'native-control--navigate';
      link.href = description.link.href; link.textContent = description.link.text;
      link.setAttribute('aria-label', `${description.link.text}: ${description.label}`);
      Object.assign(link.dataset, description.link.dataset); item.append('. ', link);
    }
    return item;
  });
  list.replaceChildren(...items); list.hidden = items.length === 0;
}
