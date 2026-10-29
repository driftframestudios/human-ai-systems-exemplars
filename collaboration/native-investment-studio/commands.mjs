import { PlanError, prepareAssemblyCommand, preparePlan } from './contract.mjs';

const WORK_CHANGE_FIELDS = new Map([
  ['work.participants.replace', 'personIds'], ['work.funding.set', 'funding'], ['work.status.set', 'status'],
]);
const REMOVAL_TARGETS = new Map([
  ['person.remove', ['people', 'personId']], ['team.remove', ['teams', 'teamId']], ['work.remove', ['work', 'workId']],
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
    include(state.practices, 'practices', 'teamId', row => row.teamId === id);
  } else {
    include(state.practices, 'practices', 'workIds', row => row.workIds.includes(id));
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
    case 'person.create':
      collection = 'people'; rows = append(state.people, command.person, 'command.person.id'); break;
    case 'team.create':
      collection = 'teams'; rows = append(state.teams, command.team, 'command.team.id'); break;
    case 'work.create':
      collection = 'work'; rows = append(state.work, command.work, 'command.work.id'); break;
    case 'team.update': {
      const index = position(state.teams, command.teamId, 'command.teamId');
      const current = state.teams[index];
      const team = command.team;
      if (team.id !== command.teamId) throw new PlanError('target', 'command.teamId', 'Keep the team replacement bound to its original identity.');
      if (team.label === current.label && sameIds(team.personIds, current.personIds)) return { projection: base };
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
    case 'collection.reorder':
      collection = command.collection;
      rows = reordered(state[collection], command.ids);
      if (rows.every((row, index) => row === state[collection][index])) return { projection: base };
      break;
    case 'person.remove':
    case 'team.remove':
    case 'work.remove': {
      const [targetCollection, targetField] = REMOVAL_TARGETS.get(command.type);
      const next = removal(base, targetCollection, command[targetField], targetField);
      if (next.error) return next;
      ({ collection, rows } = next);
      break;
    }
  }
  return { projection: preparePlan({ ...state, revision: state.revision + 1, [collection]: rows }) };
}
