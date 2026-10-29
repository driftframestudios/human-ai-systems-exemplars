import { preparePlan, preparePerson as preparePersonRecord, prepareWork as prepareWorkRecord, preparePurpose as preparePurposeRecord, parsePlan, createExamplePlan, PlanError } from './contract.mjs';
import { HISTORY, PURPOSE_FIELDS } from './config.mjs';
import { prepareAssembly } from './commands.mjs';

function historyLimit(options) {
  const prototype = options && typeof options === 'object' ? Object.getPrototypeOf(options) : undefined;
  if (!options || typeof options !== 'object' || Array.isArray(options)
      || (prototype !== Object.prototype && prototype !== null)) {
    throw new PlanError('options', 'studio', 'Supply a record with an optional historyLimit.');
  }
  const keys = Reflect.ownKeys(options);
  if (keys.some(key => key !== 'historyLimit')) {
    throw new PlanError('options', 'studio', 'Supply only the historyLimit option.');
  }
  if (!keys.length) return HISTORY.defaultEntries;
  const descriptor = Object.getOwnPropertyDescriptor(options, 'historyLimit');
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new PlanError('options', 'studio.historyLimit', 'Supply a whole-number history limit.');
  }
  const limit = descriptor.value;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > HISTORY.maxEntries) {
    throw new PlanError('options', 'studio.historyLimit', `Choose a history limit from 0 through ${HISTORY.maxEntries}.`);
  }
  return limit === 0 ? 0 : limit;
}

function positions(rows) { return new Map(rows.map((row, index) => [row.id, index])); }
function restoredEnvelope(projection) {
  // Nested state/result and serialized bytes are already owned and immutable.
  // Only the accepted envelope needs fresh identity to retire earlier edits.
  return Object.freeze({ state: projection.state, result: projection.result, serialized: projection.serialized });
}

// One accepted owner per instance. Captures remain immutable after later commits.
export function createStudio(initial = createExamplePlan(), options = {}) {
  const limit = historyLimit(options);
  const instance = Symbol('native-studio-instance');
  let accepted = preparePlan(initial);
  let acceptance = Object.freeze({ instance, token: Symbol('native-studio-acceptance'), sequence: 0 });
  let workPositions = positions(accepted.state.work);
  let peoplePositions = positions(accepted.state.people);
  let undo = [];
  let redo = [];
  let baseline = null;

  function retained(stack, projection) {
    if (limit === 0) return [];
    return [...stack.slice(Math.max(0, stack.length - limit + 1)), projection];
  }

  function publish(next, mode) {
    if (acceptance.sequence === Number.MAX_SAFE_INTEGER) {
      throw new PlanError('acceptance-limit', 'studio.acceptance', 'Start a new Studio instance to continue accepting changes.');
    }
    const nextAcceptance = Object.freeze({ instance, token: Symbol('native-studio-acceptance'), sequence: acceptance.sequence + 1 });
    const nextUndo = mode === 'undo' ? undo.slice(0, -1) : retained(undo, accepted);
    const nextRedo = mode === 'undo' ? retained(redo, accepted) : mode === 'redo' ? redo.slice(0, -1) : [];
    // Publication follows the final freshness check; these owned values invoke
    // no caller code between history, indexes, projection and chronology writes.
    undo = nextUndo;
    redo = nextRedo;
    workPositions = next.workPositions ?? workPositions;
    peoplePositions = next.peoplePositions ?? peoplePositions;
    accepted = next.projection;
    acceptance = nextAcceptance;
  }

  function attempt(expected, operation, mode = 'edit') {
    try {
      if (expected !== accepted) throw new PlanError('stale-edit', 'edit', 'Read the current plan before applying this edit.');
      const next = operation();
      // Direct-JavaScript reflection can run a reentrant caller callback.
      if (expected !== accepted) throw new PlanError('stale-edit', 'edit', 'Read the newer accepted plan before applying this edit.');
      if (next.error) return Object.freeze({ ok: false, error: next.error, projection: accepted });
      if (mode === 'baseline') {
        baseline = Object.freeze({ projection: accepted, acceptance, token: Symbol('native-studio-baseline') });
      } else if (mode !== 'preview' && next.projection !== accepted) {
        publish(next, mode);
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

  function assembly(command) {
    const base = accepted;
    const next = prepareAssembly(base, command);
    return next.projection === base ? next : replacement(next.projection);
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
    if (person.id !== personId) throw new PlanError('target', 'edit.personId', 'Keep the admitted person bound to its original identity.');
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
    const base = accepted;
    const position = workPositions.get(workId);
    if (position === undefined) throw new PlanError('reference', 'edit.workId', 'Choose an existing work record.');
    const id = candidate && typeof candidate === 'object' ? Object.getOwnPropertyDescriptor(candidate, 'id') : null;
    if (!id || !Object.hasOwn(id, 'value') || id.value !== workId) {
      throw new PlanError('target', 'edit.workId', 'Keep the replacement bound to its original work identity.');
    }
    const row = prepareWorkRecord(candidate, `plan.work[${position}]`);
    if (row.id !== workId) throw new PlanError('target', 'edit.workId', 'Keep the admitted work bound to its original identity.');
    const current = base.state.work[position];
    if (row.id === current.id && row.label === current.label && row.teamId === current.teamId
        && row.minutesPerOccurrence === current.minutesPerOccurrence && row.occurrences === current.occurrences
        && row.funding === current.funding && row.status === current.status && row.timing === current.timing
        && row.personIds.length === current.personIds.length && row.personIds.every((id, index) => id === current.personIds[index])) {
      return { projection: base };
    }
    const work = base.state.work.slice();
    work[position] = row;
    return { projection: preparePlan({ ...base.state, revision: base.state.revision + 1, work }) };
  }

  function traversal(stack, direction) {
    if (!stack.length) throw new PlanError('history-empty', `studio.${direction}`, `The current plan has no ${direction} entry.`);
    return replacement(restoredEnvelope(stack[stack.length - 1]));
  }

  function preparePurpose(candidate) {
    const base = accepted;
    const purpose = preparePurposeRecord(candidate, 'plan.purpose');
    if (PURPOSE_FIELDS.every(field => purpose[field] === base.state.purpose[field])) return { projection: base };
    return { projection: preparePlan({ ...base.state, revision: base.state.revision + 1, purpose }) };
  }

  return Object.freeze({
    read: () => accepted,
    capture: () => accepted,
    readAcceptance: () => acceptance,
    readHistory: () => Object.freeze({ undoCount: undo.length, redoCount: redo.length, limit }),
    readBaseline: () => baseline,
    exportText: () => accepted.serialized,
    replace: (candidate, expected) => attempt(expected, () => replacement(preparePlan(candidate))),
    importText: (text, expected) => attempt(expected, () => replacement(parsePlan(text))),
    applyCommand: (command, expected) => attempt(expected, () => assembly(command)),
    previewCommand: (command, expected) => attempt(expected, () => assembly(command), 'preview'),
    updateWork: (workId, candidate, expected) => attempt(expected, () => prepareWork(workId, candidate)),
    previewWork: (workId, candidate, expected) => attempt(expected, () => prepareWork(workId, candidate), 'preview'),
    updatePerson: (personId, candidate, expected) => attempt(expected, () => preparePerson(personId, candidate)),
    previewPerson: (personId, candidate, expected) => attempt(expected, () => preparePerson(personId, candidate), 'preview'),
    updatePurpose: (candidate, expected) => attempt(expected, () => preparePurpose(candidate)),
    previewPurpose: (candidate, expected) => attempt(expected, () => preparePurpose(candidate), 'preview'),
    undo: expected => attempt(expected, () => traversal(undo, 'undo'), 'undo'),
    redo: expected => attempt(expected, () => traversal(redo, 'redo'), 'redo'),
    setBaseline: expected => attempt(expected, () => ({ projection: accepted }), 'baseline'),
    restoreBaseline: expected => attempt(expected, () => {
      if (!baseline) throw new PlanError('baseline-empty', 'studio.baseline', 'Capture a baseline before restoring it.');
      return replacement(restoredEnvelope(baseline.projection));
    }),
  });
}
