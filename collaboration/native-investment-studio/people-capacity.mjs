// These readouts reuse the accepted ledger. Paused work retains its planned
// effort and funding; repeated contribution links select a session only once.
export function summarizeWorkCapacity(projection, workIds = projection.state.work.map(row => row.id)) {
  const selected = new Set(workIds);
  let personMinutes = 0, knownCents = 0, completeMoney = true, workCount = 0, sessionCount = 0;
  const work = new Map(projection.state.work.map(row => [row.id, row]));
  for (const row of projection.result.ledger) {
    if (!selected.has(row.workId)) continue;
    workCount += 1;
    sessionCount += work.get(row.workId).occurrences;
    for (const line of row.lines) {
      personMinutes += line.minutes;
      if (line.cents === null) completeMoney = false;
      else knownCents += line.cents;
    }
  }
  // The complete plan settles cents once per person/funding pool. A scoped
  // reading uses its ledger lines; the interface displays whole dollars.
  if (workCount === projection.state.work.length) {
    knownCents = projection.result.allocatedKnownCents + projection.result.additionalKnownCents;
  }
  return Object.freeze({ personMinutes, knownCents, completeMoney, workCount, sessionCount });
}

export function readPersonSessionSpread(projection, personId) {
  const person = projection.state.people.find(row => row.id === personId);
  if (!person) return null;
  const selected = projection.state.work.filter(row => row.personIds.includes(personId));
  const pinned = selected.filter(row => row.personIds.length === 1);
  return Object.freeze({ personId, selectedPlans: selected.length, totalPlans: projection.state.work.length,
    pinnedPlans: pinned.length, sessionCount: selected.reduce((sum, row) => sum + row.occurrences, 0),
    personMinutes: selected.reduce((sum, row) => sum + row.minutesPerOccurrence * row.occurrences, 0),
    fundedMinutes: person.fundedMinutes });
}

// A spread choice selects complete work rows in their visible order. A session's
// sole participant stays assigned, preserving the existing usable-plan rule.
export function planPersonSessionSpread(projection, personId, count) {
  const current = readPersonSessionSpread(projection, personId);
  if (!current || !Number.isSafeInteger(count)) return null;
  const work = projection.state.work;
  const selected = new Set(work.filter(row => row.personIds.length === 1 && row.personIds[0] === personId).map(row => row.id));
  const target = Math.max(selected.size, Math.min(work.length, count));
  for (const row of work) {
    if (selected.size >= target) break;
    selected.add(row.id);
  }
  return Object.freeze({ command: Object.freeze({ type: 'person.participation.replace', personId,
    workIds: Object.freeze(work.filter(row => selected.has(row.id)).map(row => row.id)) }), pinnedPlans: current.pinnedPlans });
}
