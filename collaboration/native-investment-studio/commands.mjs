import { PlanError, prepareAssemblyCommand, preparePlan } from './contract.mjs';
import { emptyRole } from './roles.mjs';

const WORK_CHANGE_FIELDS = new Map([
  ['work.participants.replace', 'personIds'], ['work.funding.set', 'funding'], ['work.status.set', 'status'],
]);
const REMOVAL_TARGETS = new Map([
  ['person.remove', ['people', 'personId']], ['team.remove', ['teams', 'teamId']], ['work.remove', ['work', 'workId']],
  ['contribution.remove', ['contributions', 'contributionId']], ['connection.remove', ['connections', 'connectionId']],
  ['capability.evidence.remove', ['capabilityEvidence', 'evidenceId']],
]);

function sameIds(left, right) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function position(rows, id, path) {
  const index = rows.findIndex(row => row.id === id);
  if (index < 0) throw new PlanError('reference', path, 'Choose an existing record.');
  return index;
}

function update(rows, index, value) {
  const next = rows.slice();
  next[index] = value;
  return next;
}

function append(rows, row, path) {
  if (rows.some(current => current.id === row.id)) {
    throw new PlanError('duplicate-id', path, 'Give the new record a distinct identifier.');
  }
  return [...rows, row];
}

function reordered(rows, ids) {
  if (ids.length !== rows.length) {
    throw new PlanError('order', 'command.ids', 'List every current record exactly once in the desired order.');
  }
  const byId = new Map(rows.map(row => [row.id, row]));
  return ids.map(id => {
    const row = byId.get(id);
    if (!row) throw new PlanError('reference', 'command.ids', 'Order the records currently in this collection.');
    return row;
  });
}

function dependencies(state, collection, id) {
  const references = [];
  const include = (rows, name, field, matches) => {
    for (const row of rows) {
      if (matches(row)) references.push(Object.freeze({ collection: name, id: row.id, field }));
    }
  };
  if (collection === 'people') {
    include(state.teams, 'teams', 'personIds', row => row.personIds.includes(id));
    include(state.work, 'work', 'personIds', row => row.personIds.includes(id));
  } else if (collection === 'teams') {
    include(state.work, 'work', 'teamId', row => row.teamId === id);
  }
  if (collection === 'people') {
    include(state.contributions, 'contributions', 'receiverPersonId', row => row.receiverPersonId === id);
    include(state.contributions, 'contributions', 'decisionOwnerPersonId', row => row.decisionOwnerPersonId === id);
    include(state.connections, 'connections', 'receiverPersonId', row => row.receiverPersonId === id);
  } else if (collection === 'teams') {
    include(state.connections, 'connections', 'senderTeamId', row => row.senderTeamId === id);
    include(state.connections, 'connections', 'receiverTeamId', row => row.receiverTeamId === id);
  } else if (collection === 'work') {
    include(state.contributions, 'contributions', 'workIds', row => row.workIds.includes(id));
    include(state.connections, 'connections', 'workIds', row => row.workIds.includes(id));
  }
  for (const name of ['abilities', 'practices']) {
    if (collection === 'people') {
      include(state[name], name, 'responsiblePersonIds', row => row.responsiblePersonIds.includes(id));
      include(state[name], name, 'decisionOwnerPersonId', row => row.decisionOwnerPersonId === id);
    } else if (collection === 'teams') {
      include(state[name], name, 'teamId', row => row.teamId === id);
    } else if (collection === 'work') {
      for (const row of state[name]) row.supportBindings.forEach((binding, index) => {
        if (binding.workIds.includes(id)) references.push(Object.freeze({ collection: name, id: row.id, field: `supportBindings[${index}].workIds` }));
      });
    } else if (collection === 'abilities' || collection === 'practices') {
      const kind = collection === 'abilities' ? 'ability' : 'practice';
      include(state[name], name, 'prerequisites', row => row.prerequisites.some(reference => reference.kind === kind && reference.instanceId === id));
    }
  }
  if (collection === 'people') {
    include(state.capabilityEvidence, 'capabilityEvidence', 'recorderPersonId', row => row.recorderPersonId === id);
  } else if (collection === 'abilities' || collection === 'practices') {
    const kind = collection === 'abilities' ? 'ability' : 'practice';
    include(state.capabilityEvidence, 'capabilityEvidence', 'subject', row => row.subject.kind === kind && row.subject.instanceId === id);
  }
  if (collection === 'work' || collection === 'abilities' || collection === 'practices') {
    const kind = collection === 'abilities' ? 'ability' : 'practice';
    state.changeSettings.frameworkMaps.forEach((mapping, mapIndex) => mapping.components.forEach((component, componentIndex) => {
      const field = collection === 'work' ? 'workIds' : 'capabilityRefs';
      const matches = collection === 'work' ? component.workIds.includes(id)
        : component.capabilityRefs.some(edge => edge.kind === kind && edge.instanceId === id);
      if (matches) references.push(Object.freeze({ collection: 'changeSettings', id: mapping.frameworkId,
        field: `frameworkMaps[${mapIndex}].components[${componentIndex}].${field}` }));
    }));
  }
  const assurance = state.assuranceSettings;
  const assuranceReference = (recordId, field) => references.push(Object.freeze({ collection: 'assuranceSettings', id: recordId, field }));
  if (collection === 'people' && assurance.context.recoveryRatePersonIds.includes(id)) {
    assuranceReference('recovery-rate-population', 'context.recoveryRatePersonIds');
  }
  if (collection === 'work') assurance.quality.concepts.forEach((row, index) => {
    if (row.workIds.includes(id)) assuranceReference(row.conceptId, `quality.concepts[${index}].workIds`);
  });
  for (const [name, human] of [['recoveryEvents', 'receiverPersonId'], ['learningActions', 'decisionOwnerPersonId'], ['rehearsals', 'reviewerPersonId']]) {
    assurance[name].forEach((row, index) => {
      if (collection === 'people' && row[human] === id) assuranceReference(row.id, `${name}[${index}].${human}`);
      if (collection === 'work' && row.workIds.includes(id)) assuranceReference(row.id, `${name}[${index}].workIds`);
      if (name === 'rehearsals') {
        if (collection === 'people' && row.personIds.includes(id)) assuranceReference(row.id, `${name}[${index}].personIds`);
        if (collection === 'connections' && row.connectionIds.includes(id)) assuranceReference(row.id, `${name}[${index}].connectionIds`);
      }
    });
  }
  return Object.freeze(references);
}

function removal(base, collection, id, targetField) {
  const rows = base.state[collection];
  const index = position(rows, id, `command.${targetField}`);
  const references = dependencies(base.state, collection, id);
  if (references.length) {
    return { projection: base, error: Object.freeze({
      code: 'dependencies', path: `command.${targetField}`,
      message: 'Review and reassign the listed references before removing this record.', references,
    }) };
  }
  return { collection, rows: [...rows.slice(0, index), ...rows.slice(index + 1)] };
}

// This transition owns no accepted state. The Studio supplies its immutable
// projection and checks exact freshness again after all caller reflection.
export function prepareAssembly(base, candidate) {
  const command = prepareAssemblyCommand(candidate);
  const state = base.state;
  let collection;
  let rows;
  switch (command.type) {
    case 'change.settings.replace':
      if (JSON.stringify(command.changeSettings) === JSON.stringify(state.changeSettings)) return { projection: base };
      return { projection: preparePlan({ ...state, revision: state.revision + 1, changeSettings: command.changeSettings }) };
    case 'assurance.settings.replace': {
      const previous = new Map(state.assuranceSettings.rehearsals.map(row => [row.id, row]));
      for (const row of command.assuranceSettings.rehearsals) {
        const existing = previous.get(row.id);
        if (existing && (existing.definitionId !== row.definitionId || existing.definitionVersion !== row.definitionVersion)) {
          throw new PlanError('rehearsal-definition-change', 'command.assuranceSettings.rehearsals', 'Use a new rehearsal identifier for another scenario so observations retain their original subject.');
        }
      }
      if (JSON.stringify(command.assuranceSettings) === JSON.stringify(state.assuranceSettings)) return { projection: base };
      return { projection: preparePlan({ ...state, revision: state.revision + 1, assuranceSettings: command.assuranceSettings }) };
    }
    case 'person.create':
      collection = 'people'; rows = append(state.people, { role: emptyRole(), lifecycle: 'active', ...command.person }, 'command.person.id'); break;
    case 'team.create':
      collection = 'teams'; rows = append(state.teams, { lifecycle: 'active', ...command.team }, 'command.team.id'); break;
    case 'work.create':
      collection = 'work'; rows = append(state.work, { lifecycle: 'active', ...command.work }, 'command.work.id'); break;
    case 'team.update': {
      const index = position(state.teams, command.teamId, 'command.teamId');
      const current = state.teams[index];
      const team = { ...current, ...command.team };
      if (team.id !== command.teamId) throw new PlanError('target', 'command.teamId', 'Keep the team replacement bound to its original identity.');
      if (team.lifecycle === current.lifecycle && team.label === current.label && sameIds(team.personIds, current.personIds)) return { projection: base };
      collection = 'teams'; rows = update(state.teams, index, team); break;
    }
    case 'team.members.replace': {
      const index = position(state.teams, command.teamId, 'command.teamId');
      const current = state.teams[index];
      if (sameIds(command.personIds, current.personIds)) return { projection: base };
      collection = 'teams'; rows = update(state.teams, index, { ...current, personIds: command.personIds }); break;
    }
    case 'work.participants.replace':
    case 'work.funding.set':
    case 'work.status.set': {
      const index = position(state.work, command.workId, 'command.workId');
      const current = state.work[index];
      const field = WORK_CHANGE_FIELDS.get(command.type);
      const value = command[field];
      if (field === 'personIds' ? sameIds(value, current.personIds) : value === current[field]) return { projection: base };
      collection = 'work'; rows = update(state.work, index, { ...current, [field]: value }); break;
    }
    case 'person.role.replace': {
      const index = position(state.people, command.personId, 'command.personId');
      if (JSON.stringify(state.people[index].role) === JSON.stringify(command.role)) return { projection: base };
      collection = 'people'; rows = update(state.people, index, { ...state.people[index], role: command.role }); break;
    }
    case 'person.lifecycle.set':
    case 'team.lifecycle.set':
    case 'work.lifecycle.set': {
      const kind = command.type.split('.')[0];
      const field = `${kind}Id`;
      collection = kind === 'person' ? 'people' : kind === 'team' ? 'teams' : 'work';
      const index = position(state[collection], command[field], `command.${field}`);
      const current = state[collection][index];
      if (current.lifecycle === command.lifecycle) return { projection: base };
      rows = update(state[collection], index, { ...current, lifecycle: command.lifecycle }); break;
    }
    case 'contribution.create':
      collection = 'contributions'; rows = append(state.contributions, command.contribution, 'command.contribution.id'); break;
    case 'connection.create':
      collection = 'connections'; rows = append(state.connections, command.connection, 'command.connection.id'); break;
    case 'contribution.update':
    case 'connection.update': {
      const kind = command.type.split('.')[0];
      collection = `${kind}s`;
      const field = `${kind}Id`;
      const index = position(state[collection], command[field], `command.${field}`);
      const row = command[kind];
      if (row.id !== command[field]) throw new PlanError('target', `command.${field}`, 'Keep the replacement bound to its original record.');
      if (JSON.stringify(row) === JSON.stringify(state[collection][index])) return { projection: base };
      rows = update(state[collection], index, row); break;
    }
    case 'connection.status.set': {
      const index = position(state.connections, command.connectionId, 'command.connectionId');
      const current = state.connections[index];
      if (current.status === command.status) return { projection: base };
      collection = 'connections'; rows = update(state.connections, index, { ...current, status: command.status }); break;
    }
    case 'capability.update': {
      collection = command.kind === 'ability' ? 'abilities' : 'practices';
      const index = position(state[collection], command.instanceId, 'command.instanceId');
      if (command.instance.id !== command.instanceId) throw new PlanError('target', 'command.instanceId', 'Keep the replacement bound to its original ability or practice.');
      const current = state[collection][index];
      if (command.instance.definitionId !== current.definitionId || command.instance.definitionVersion !== current.definitionVersion) {
        throw new PlanError('capability-definition-change', 'command.instance.definitionId', 'Install the other definition as a new instance so recorded observations keep their original subject.');
      }
      if (JSON.stringify(command.instance) === JSON.stringify(state[collection][index])) return { projection: base };
      rows = update(state[collection], index, command.instance); break;
    }
    case 'capability.lifecycle.set': {
      collection = command.kind === 'ability' ? 'abilities' : 'practices';
      const index = position(state[collection], command.instanceId, 'command.instanceId');
      const current = state[collection][index];
      if (current.lifecycle === command.lifecycle) return { projection: base };
      rows = update(state[collection], index, { ...current, lifecycle: command.lifecycle }); break;
    }
    case 'capability.evidence.record': {
      collection = 'capabilityEvidence';
      const existing = state[collection].find(row => row.id === command.evidence.id);
      if (existing) {
        if (JSON.stringify(existing) === JSON.stringify(command.evidence)) return { projection: base };
        throw new PlanError('identity-collision', 'command.evidence.id', 'Use a new observation identifier or retain the recorded observation.');
      }
      rows = append(state[collection], command.evidence, 'command.evidence.id'); break;
    }
    case 'capability.remove': {
      const next = removal(base, command.kind === 'ability' ? 'abilities' : 'practices', command.instanceId, 'instanceId');
      if (next.error) return next;
      ({ collection, rows } = next); break;
    }
    case 'collection.reorder':
      collection = command.collection;
      rows = reordered(state[collection], command.ids);
      if (rows.every((row, index) => row === state[collection][index])) return { projection: base };
      break;
    case 'person.remove':
    case 'team.remove':
    case 'work.remove':
    case 'contribution.remove':
    case 'connection.remove':
    case 'capability.evidence.remove': {
      const [targetCollection, targetField] = REMOVAL_TARGETS.get(command.type);
      const next = removal(base, targetCollection, command[targetField], targetField);
      if (next.error) return next;
      ({ collection, rows } = next);
      break;
    }
  }
  return { projection: preparePlan({ ...state, revision: state.revision + 1, [collection]: rows }) };
}
