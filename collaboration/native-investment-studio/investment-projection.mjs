import { decodeInvestment } from './investment-state.mjs';

// The financial view receives accepted work and price lines from their owner.
// Its assumption records are owned copies, ready for one validated replacement.
export function projectInvestment(projection) {
  const { state, result } = projection;
  const cadence = state.scoreSettings.cadence;
  const ledger = new Map(result.ledger.map(row => [row.workId, row]));
  const sessions = state.work.map(work => {
    const lines = ledger.get(work.id)?.lines ?? [];
    const hours = work.minutesPerOccurrence * work.occurrences / 60;
    return { tape: { id: work.id, name: work.label, people: work.personIds,
      occurrences: (cadence?.placements ?? []).filter(item => item.workId === work.id).map(item => ({ period: item.periodId })) },
      hours, effort: hours * work.personIds.length,
      cost: lines.reduce((sum, line) => sum + (line.cents ?? 0), 0) / 100,
      complete: lines.every(line => line.cents !== null), funding: work.funding === 'allocated' ? 'funded' : 'extra' };
  });
  const decks = decodeInvestment(state.investmentSettings);
  return {
    people: state.people.map(person => ({ id: person.id, name: person.label, rate: person.rateCentsPerHour === null ? null : person.rateCentsPerHour / 100 })),
    periods: cadence?.periods ?? [],
    investment: { decks },
    pricing: { sessions, total: result.knownCommitmentCents / 100, complete: result.plannedCommitmentCents !== null,
      funded: result.fundedKnownCents / 100, additional: result.additionalKnownCents / 100,
      effort: sessions.reduce((sum, item) => sum + item.effort, 0) },
  };
}
