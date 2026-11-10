import { createCadence, CADENCE_SUBDIVISIONS } from './cadence.mjs';
import { prepareSessionCreation } from './session-creation.mjs';

const session = (label, minutes, occurrences = 1) => Object.freeze({ label, minutes, occurrences });
const starter = (id, label, outcome, sessions) => Object.freeze({ id, label, outcome, sessions: Object.freeze(sessions) });

export const COORDINATION_STARTERS = Object.freeze([
  starter('plan', 'Plan', 'Agree what the work should achieve.', [
    session('Frame the outcome', 30), session('Agree on priorities', 45, 2), session('Review scope', 30),
  ]),
  starter('design', 'Design', 'Turn what people need into a useful approach.', [
    session('Explore needs', 60, 2), session('Compare approaches', 45, 2), session('Review the design', 30),
  ]),
  starter('test', 'Test', 'Find what works and what needs attention.', [
    session('Plan the checks', 30), session('Exercise the workflow', 60, 3), session('Review findings', 45),
  ]),
  starter('build', 'Build', 'Create, connect and rehearse the working pieces.', [
    session('Prepare the work', 30), session('Pair on implementation', 60, 4), session('Integrate changes', 45, 2),
  ]),
  starter('deploy', 'Deploy', 'Help the receiving team put the work into use.', [
    session('Check readiness', 30), session('Rehearse rollout', 45, 2), session('Review operation', 30, 2),
  ]),
]);

const BY_ID = new Map(COORDINATION_STARTERS.map(item => [item.id, item]));
const failure = (code, path, message, fallback = false) => ({ ok: false, error: { code, path, message }, ...(fallback ? { fallback } : {}) });

// The caller supplies admitted state and publishes this detached candidate once.
// Starter selection never changes an existing plan library or its other owners.
export function prepareStarterPlan(state, id) {
  const recipe = BY_ID.get(id);
  if (!recipe) return failure('reference', 'starter', 'Choose a working pattern.');
  if (state.work.length) return failure('occupied', 'plan.work', 'Keep the current plans, or clear the library before loading a working pattern.');
  const prepared = prepareSessionCreation(state);
  if (!prepared.ok) return prepared.fallback
    ? failure('prerequisite', 'plan.people', 'Create a plan to choose its people and team first.', true) : prepared;
  const plan = structuredClone(state);
  const cadence = plan.scoreSettings.cadence ?? createCadence();
  const subdivisions = CADENCE_SUBDIVISIONS[cadence.basis];
  const cells = cadence.periods.length * subdivisions;
  const placements = [];
  plan.work = recipe.sessions.map((item, index) => {
    const workId = `starter-${recipe.id}-${index + 1}`;
    const start = Math.floor(index * cells / recipe.sessions.length);
    for (let occurrenceIndex = 0; occurrenceIndex < item.occurrences; occurrenceIndex++) {
      const cell = Math.min(cells - 1, start + occurrenceIndex);
      placements.push({ workId, occurrenceIndex, periodId: cadence.periods[Math.floor(cell / subdivisions)].id,
        subdivision: cell % subdivisions + 1 });
    }
    return { id: workId, label: item.label, teamId: prepared.raw.teamId, personIds: [...prepared.raw.personIds],
      minutesPerOccurrence: item.minutes, occurrences: item.occurrences, funding: prepared.raw.funding,
      status: prepared.raw.status, timing: null, lifecycle: 'active' };
  });
  plan.scoreSettings.cadence = { ...cadence, placements };
  plan.revision += 1;
  return { ok: true, plan };
}
