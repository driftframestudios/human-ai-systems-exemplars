import { preparePlan, preparePerson as preparePersonRecord, parsePlan, createExamplePlan, PlanError } from './contract.mjs';

// One accepted owner per instance. Captures remain immutable after later commits.
export function createStudio(initial = createExamplePlan()) {
  let accepted = preparePlan(initial);
  let workPositions = positions(accepted.state.work);
  let peoplePositions = positions(accepted.state.people);

  function positions(work) { return new Map(work.map((row, index) => [row.id, index])); }

  function attempt(expected, operation, accept = true) {
    try {
      // An exact immutable projection binds both target revision and model instance.
      if (expected !== accepted) throw new PlanError('stale-edit', 'edit', 'Read the current plan before applying this edit.');
      const next = operation();
      // Direct-JavaScript reflection can run a reentrant caller callback.
      if (expected !== accepted) throw new PlanError('stale-edit', 'edit', 'Read the newer accepted plan before applying this edit.');
      if (accept) {
        accepted = next.projection;
        if (next.workPositions) workPositions = next.workPositions;
        if (next.peoplePositions) peoplePositions = next.peoplePositions;
      }
      return Object.freeze({ ok: true, projection: next.projection });
    } catch (error) {
      if (!(error instanceof PlanError)) throw error;
      return Object.freeze({ ok: false, error: Object.freeze({ code: error.code, path: error.path, message: error.message }), projection: accepted });
    }
  }

  function replacement(projection) {
    return { projection, workPositions: positions(projection.state.work), peoplePositions: positions(projection.state.people) };
  }

  function preparePerson(personId, candidate) {
    const base = accepted;
    const position = peoplePositions.get(personId);
    if (position === undefined) throw new PlanError('reference', 'edit.personId', 'Choose an existing person.');
    const id = candidate && typeof candidate === 'object' ? Object.getOwnPropertyDescriptor(candidate, 'id') : null;
    if (!id || !Object.hasOwn(id, 'value') || id.value !== personId) {
      throw new PlanError('target', 'edit.personId', 'Keep the replacement bound to its original person identity.');
    }
    const person = preparePersonRecord(candidate, `plan.people[${position}]`);
    const current = base.state.people[position];
    if (person.id === current.id && person.label === current.label
        && person.fundedMinutes === current.fundedMinutes && person.rateCentsPerHour === current.rateCentsPerHour) {
      return { projection: base };
    }
    const people = base.state.people.slice();
    people[position] = person;
    return { projection: preparePlan({ ...base.state, revision: base.state.revision + 1, people }) };
  }

  function prepareWork(workId, candidate) {
    const position = workPositions.get(workId);
    if (position === undefined) throw new PlanError('reference', 'edit.workId', 'Choose an existing work record.');
    const id = candidate && typeof candidate === 'object' ? Object.getOwnPropertyDescriptor(candidate, 'id') : null;
    if (!id || !Object.hasOwn(id, 'value') || id.value !== workId) {
      throw new PlanError('target', 'edit.workId', 'Keep the replacement bound to its original work identity.');
    }
    const work = accepted.state.work.slice();
    work[position] = candidate;
    return { projection: preparePlan({ ...accepted.state, revision: accepted.state.revision + 1, work }) };
  }

  return Object.freeze({
    read: () => accepted,
    capture: () => accepted,
    exportText: () => accepted.serialized,
    replace: (candidate, expected) => attempt(expected, () => replacement(preparePlan(candidate))),
    importText: (text, expected) => attempt(expected, () => replacement(parsePlan(text))),
    updateWork: (workId, candidate, expected) => attempt(expected, () => prepareWork(workId, candidate)),
    previewWork: (workId, candidate, expected) => attempt(expected, () => prepareWork(workId, candidate), false),
    updatePerson: (personId, candidate, expected) => attempt(expected, () => preparePerson(personId, candidate)),
    previewPerson: (personId, candidate, expected) => attempt(expected, () => preparePerson(personId, candidate), false),
  });
}
