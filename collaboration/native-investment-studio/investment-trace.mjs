// Native staffing and per-person funding pools retain accounting authority.
// This comparison attributes the difference to source records, not input causes.
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}

function snapshot(projection) {
  const { state, result } = projection;
  const staffing = new Map(result.staffing.map(row => [row.personId, row.cents]));
  const capacity = new Map(result.capacity.map(row => [row.personId, row]));
  const workById = new Map(state.work.map(row => [row.id, row]));
  const byPerson = new Map(state.people.map(row => [row.id, []]));
  for (const entry of result.ledger) {
    const work = workById.get(entry.workId);
    for (const line of entry.lines) byPerson.get(line.personId).push({ workId: work.id, label: work.label,
      funding: entry.funding, status: work.status, lifecycle: work.lifecycle,
      minutesPerOccurrence: work.minutesPerOccurrence, occurrences: work.occurrences,
      minutes: line.minutes, cents: line.cents });
  }
  const people = state.people.map(person => {
    const usage = capacity.get(person.id), fundedCents = staffing.get(person.id);
    const knownCents = (fundedCents ?? 0) + (usage.additionalCents ?? 0);
    const complete = [fundedCents, usage.allocatedCents, usage.additionalCents].every(value => value !== null);
    return { key: JSON.stringify([state.planId, person.id]), personId: person.id, label: person.label, lifecycle: person.lifecycle,
      rateCentsPerHour: person.rateCentsPerHour, knownCents, totalCents: complete ? knownCents : null,
      funded: { minutes: person.fundedMinutes, cents: fundedCents },
      additional: { minutes: usage.additionalMinutes, cents: usage.additionalCents },
      allocated: { minutes: usage.allocatedMinutes, cents: usage.allocatedCents },
      remainingFundedMinutes: usage.remainingMinutes, work: byPerson.get(person.id) };
  });
  return { planId: state.planId, revision: state.revision, horizonWeeks: state.horizonWeeks, currency: result.currency,
    knownCents: result.knownCommitmentCents, totalCents: result.plannedCommitmentCents,
    fundedKnownCents: result.fundedKnownCents, additionalKnownCents: result.additionalKnownCents,
    allocatedKnownCents: result.allocatedKnownCents, lineRoundingAdjustments: { ...result.lineRoundingAdjustments }, people };
}

const difference = (a, b) => ({ knownCents: (b?.knownCents ?? 0) - (a?.knownCents ?? 0),
  totalCents: a?.totalCents === null || b?.totalCents === null ? null : (b?.totalCents ?? 0) - (a?.totalCents ?? 0) });

export function projectInvestmentTrace(acceptedProjection, baselineProjection = null) {
  const accepted = snapshot(acceptedProjection), baseline = baselineProjection === null ? null : snapshot(baselineProjection);
  const current = new Map(accepted.people.map(row => [row.key, row]));
  const previous = new Map(baseline?.people.map(row => [row.key, row]) ?? []);
  const keys = [...new Set([...current.keys(), ...previous.keys()])];
  return freeze({ accepted, baseline, difference: baseline === null ? null : difference(baseline, accepted),
    rows: keys.map(key => {
      const a = previous.get(key) ?? null, b = current.get(key) ?? null, record = b ?? a;
      return { key, personId: record.personId, label: record.label, baseline: a, accepted: b,
        difference: baseline === null ? null : difference(a, b),
        source: b === null ? null : { kind: 'person', id: b.personId } };
    }),
    workSources: acceptedProjection.state.work.map(row => ({ kind: 'work', id: row.id, label: row.label })) });
}
