import { decodeInvestment } from './investment-state.mjs';
import { summarizeWorkSessions, resolveWorkSession } from './work-sessions.mjs';
import { analyseInvestment } from './investment-financials.mjs';

function freezeReading(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeReading);
    Object.freeze(value);
  }
  return value;
}

// One mounted receiver retains one accepted reading. Undo/import can repeat a
// revision number; only the exact immutable projection authorizes reuse.
export function createInvestmentReader() {
  let context;
  return projection => {
    if (context?.projection === projection) return context;
    const model = freezeReading(projectInvestment(projection));
    const decks = new Map(model.investment.decks.map(record => [record.id, record]));
    const analyses = new Map();
    context = Object.freeze({ projection, model,
      record: id => decks.get(id),
      analysis(id) {
        const record = decks.get(id);
        if (!record) return undefined;
        if (!analyses.has(id)) analyses.set(id, freezeReading(analyseInvestment(record, model.pricing)));
        return analyses.get(id);
      },
    });
    return context;
  };
}

// Commands own mutable settings; price/people/period readings stay shared and
// immutable. Copy only the admitted deck settings consumed by replacement.
export function investmentCommandModel(context) {
  return { ...context.model, investment: { decks: decodeInvestment(context.projection.state.investmentSettings) } };
}

// The financial view receives accepted work and price lines from their owner.
// Its assumption records are owned copies, ready for one validated replacement.
export function projectInvestment(projection) {
  const { state, result } = projection;
  const cadence = state.scoreSettings.cadence;
  const ledger = new Map(result.ledger.map(row => [row.workId, row]));
  const rates = new Map(state.people.map(person => [person.id, person.rateCentsPerHour]));
  const sessions = state.work.map(work => {
    const lines = ledger.get(work.id)?.lines ?? [];
    const summary = summarizeWorkSessions(work), hours = summary.durationMinutes / 60;
    const fundingParts = Object.fromEntries([['funded', 'allocated'], ['extra', 'additional']].map(([name, field]) => {
      const matching = summary.people.filter(person => person[`${field}Minutes`] > 0);
      return [name, { effort: matching.reduce((sum, person) => sum + person[`${field}Minutes`], 0) / 60,
        cost: lines.reduce((sum, line) => sum + (work.sessionOverrides?.length ? line[`${field}Cents`] ?? 0 : work.funding === field ? line.cents ?? 0 : 0), 0) / 100,
        complete: matching.every(person => rates.get(person.personId) !== null) }];
    }));
    return { tape: { id: work.id, name: work.label, people: summary.personIds,
      occurrences: (cadence?.placements ?? []).filter(item => item.workId === work.id).map(item => ({ period: item.periodId })) },
      hours, effort: summary.participantMinutes / 60, fundingParts,
      people: lines.map(line => ({ personId: line.personId, hours: line.minutes / 60, cost: line.cents === null ? null : line.cents / 100 })),
      placements: (cadence?.placements ?? []).filter(item => item.workId === work.id).map(item => {
        const session = resolveWorkSession(work, item.occurrenceIndex);
        return { period: item.periodId, funding: session.funding === 'allocated' ? 'funded' : 'extra',
          cost: session.personIds.reduce((sum, personId) => sum + (rates.get(personId) ?? 0) * session.minutesPerOccurrence / 60, 0) / 100 };
      }),
      cost: lines.reduce((sum, line) => sum + (line.cents ?? 0), 0) / 100,
      complete: lines.every(line => line.cents !== null), funding: summary.funding === 'mixed' ? 'mixed' : summary.funding === 'allocated' ? 'funded' : 'extra' };
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
