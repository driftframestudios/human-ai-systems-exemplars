import { CADENCE_SUBDIVISIONS } from './cadence.mjs';
import { nextCreatedLabel } from './creation-label.mjs';

const DEFAULT_VALUES = Object.freeze({ hoursPerSession: '0',
  minutesPerSession: '30', occurrences: '1', funding: 'additional', status: 'planned' });
const failure = (path, message) => Object.freeze({ ok: false,
  error: Object.freeze({ code: 'reference', path, message }) });
const available = row => row.lifecycle !== 'retired';

// The accepted owner supplies an admitted plan. This helper chooses editable
// starting values; the existing session adapter allocates and publishes the ID.
export function prepareSessionCreation(state, { periodId, subdivision = 1, teamId, personId } = {}) {
  const cadence = state.scoreSettings.cadence;
  const placed = periodId !== undefined && periodId !== null;
  if (placed && !cadence?.periods.some(period => period.id === periodId))
    return failure('context.periodId', 'Choose a period in the current plan.');
  if (placed && (!Number.isSafeInteger(subdivision) || subdivision < 1 || subdivision > CADENCE_SUBDIVISIONS[cadence.basis]))
    return failure('context.subdivision', 'Choose a week or month within the selected period.');

  const people = new Map(state.people.map(person => [person.id, person]));
  const explicitPerson = personId === undefined || personId === null ? null : people.get(personId);
  const explicitTeam = teamId === undefined || teamId === null ? null : state.teams.find(team => team.id === teamId);
  if (personId != null && !explicitPerson) return failure('context.personId', 'Choose a person in the current plan.');
  if (teamId != null && !explicitTeam) return failure('context.teamId', 'Choose a team in the current plan.');
  const currentPeople = state.people.filter(available), currentTeams = state.teams.filter(available);
  const participants = team => team.personIds.filter(id => people.has(id) && available(people.get(id)));
  const team = explicitTeam
    ?? (explicitPerson && currentTeams.find(row => row.personIds.includes(explicitPerson.id)))
    ?? currentTeams.find(row => participants(row).length)
    ?? currentTeams[0];
  if (!team || !explicitPerson && currentPeople.length === 0) return Object.freeze({ ok: false, fallback: true });
  const personIds = explicitPerson ? [explicitPerson.id] : participants(team);
  if (!personIds.length) personIds.push(currentPeople[0].id);
  const placements = placed ? [{ occurrenceIndex: 0, periodId, subdivision }] : [];
  return Object.freeze({ ok: true, raw: Object.freeze({ ...DEFAULT_VALUES, label: nextCreatedLabel(state.work, 'session'), teamId: team.id,
    personIds: Object.freeze(personIds), cadencePlacements: JSON.stringify(placements) }) });
}
