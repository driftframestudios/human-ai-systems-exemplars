import { money, duration } from './display.mjs';
import { formatScoreTime } from './score-time.mjs';
import { getCapabilityDefinition } from './capabilities.mjs';
import { listQualityConcepts } from './assurance-models.mjs';
import { projectCadence } from './cadence.mjs';
import { describeScoreChanges } from './score-reference.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const supplied = value => value || 'To be supplied';
const amount = result => `${money(result.knownCommitmentCents)}${result.plannedCommitmentCents === null ? ' known; rates remain to be supplied' : ''}`;
const funding = value => value === 'allocated' ? 'Within funded time' : 'Extra investment';
const table = (caption, columns, rows) => `<div class="table-scroll" tabindex="0" role="region" aria-label="${escape(caption)}"><table><caption>${escape(caption)}</caption><thead><tr>${columns.map(label => `<th scope="col">${escape(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value, index) => index === 0 ? `<th scope="row">${escape(value)}</th>` : `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const section = (title, body) => `<section><h2>${escape(title)}</h2>${body}</section>`;
const paragraphs = entries => entries.map(([label, value]) => `<p><strong>${escape(label)}</strong><br>${escape(supplied(value))}</p>`).join('');
const horizonLabel = state => state.scoreSettings.cadence
  ? `${state.scoreSettings.cadence.periods.length} ${state.scoreSettings.cadence.basis === 'sprint' ? 'sprints' : 'business quarters'} · ${state.horizonWeeks}-week staffing assumption`
  : `${state.horizonWeeks} weeks`;

function cadenceCompanion(state, people, work) {
  const cadence = projectCadence(state);
  if (!cadence) return null;
  const periods = new Map(cadence.periods.map(period => [period.id, period.label]));
  const order = new Map(cadence.periods.map((period, index) => [period.id, index]));
  const stages = new Map(cadence.stages.map(stage => [stage.id, stage.label]));
  const part = cadence.basis === 'sprint' ? 'Week' : 'Month';
  const periodName = id => periods.get(id) ?? 'Choose a period';
  const place = row => row.periodId === null ? 'Choose a period' : `${periodName(row.periodId)} · ${part} ${row.subdivision}`;
  const endpoint = target => (target.kind === 'stage' ? stages : work).get(target.id) ?? 'Work to choose';
  const handoffs = new Map(cadence.handoffs.map(row => [row.id, `${endpoint(row.from)} → ${endpoint(row.to)}`]));
  const anchor = target => target.kind === 'handoff' ? handoffs.get(target.id) : endpoint(target);
  const placementByWork = new Map();
  const occurrences = [...cadence.occurrences].sort((a, b) => (order.get(a.periodId) ?? order.size) - (order.get(b.periodId) ?? order.size)
    || (a.subdivision ?? 4) - (b.subdivision ?? 4));
  for (const row of occurrences) {
    if (!placementByWork.has(row.workId)) placementByWork.set(row.workId, new Set());
    placementByWork.get(row.workId).add(place(row));
  }
  const agenda = occurrences.map(row => [row.label, row.occurrenceIndex + 1, place(row),
    row.personIds.map(id => people.get(id)).join(', ') || 'Choose people', duration(row.durationMinutes), funding(row.funding), `${row.status} · ${row.lifecycle}`]);
  const handoffRows = cadence.handoffs.map(row => [handoffs.get(row.id),
    `${periodName(row.fromPeriodId)} → ${periodName(row.toPeriodId)}`,
    ({ 'in-order': 'In planned order', 'review-order': 'Review the order', 'choose-period': 'Choose periods', paused: 'Paused' })[row.status]]);
  const delayRows = cadence.delays.map(row => [row.label, anchor(row.anchor), periodName(row.fromPeriodId), periodName(row.toPeriodId),
    supplied(row.reason), people.get(row.receiverPersonId) ?? 'Choose a receiving person']);
  const availabilityRows = cadence.availability.map(row => [people.get(row.personId), periodName(row.periodId),
    row.availableMinutes === null ? 'Unknown' : duration(row.availableMinutes), duration(row.plannedMinutes)]);
  const decisions = new Map(cadence.decisions.map(row => [row.id, [anchor(row.anchor), place(row)]]));
  const context = cadence.basis === 'sprint' ? 'Two-week sprint arrangement' : 'Business-quarter arrangement';
  const body = `<p>${escape(context)}. Period placement groups the work; each session retains its people, duration and funding.</p>`
    + table('Sessions within the plan', ['Working session', 'Session number', 'Placement', 'People', 'Time per person', 'Funding', 'State'], agenda)
    + table('Stages and their planned periods', ['Stage', 'Periods', 'Supporting sessions'], cadence.stages.map(row => [row.label,
      row.periodIds.map(periodName).join(', ') || 'Choose supporting sessions', row.workIds.map(id => work.get(id)).join(', ')]))
    + (handoffRows.length ? table('Handoffs between work', ['Handoff', 'Periods', 'Sequence'], handoffRows) : '')
    + (delayRows.length ? table('Delays and receiving people', ['Delay', 'Affected work', 'Originally planned', 'Proposed period', 'Reason', 'Receiving person'], delayRows) : '')
    + (availabilityRows.length ? table('Stated period availability', ['Person', 'Period', 'Available time', 'Planned participation'], availabilityRows) : '')
    + '<p>Availability is unknown for periods without a stated value. Funded time remains the staffing assumption.</p>';
  const brief = ['Plan arrangement:', context, ...agenda.map(row => `- ${row[0]}, session ${row[1]} · ${row[2]} · ${row[4]} per person.`),
    ...(handoffRows.length ? ['Handoffs:', ...handoffRows.map(row => `- ${row.join(' · ')}`)] : []),
    ...(delayRows.length ? ['Delays:', ...delayRows.map(row => `- ${row.join(' · ')}`)] : []),
    ...(availabilityRows.length ? ['Stated availability:', ...availabilityRows.map(row => `- ${row[0]} · ${row[1]} · ${row[2]} available; ${row[3]} planned.`)] : []),
    'Availability remains unknown where a value has yet to be supplied.'];
  return { body, brief, decisions, placementByWork };
}

// Both leave-behinds are derived synchronously from one immutable accepted
// projection. Editor drafts have no input here; the embedded JSON is the same
// admitted envelope used by the native plan download and import receiver.
export function captureStudioReport(projection, baseline = null) {
  const { state, result } = projection;
  const people = new Map(state.people.map(person => [person.id, person.label]));
  const teams = new Map(state.teams.map(team => [team.id, team.label]));
  const work = new Map(state.work.map(row => [row.id, row.label]));
  const cadence = cadenceCompanion(state, people, work);
  const named = (ids, labels) => ids.map(id => labels.get(id) ?? id).join(', ') || 'To be supplied';
  const purpose = [['What the work should change', state.purpose.changedAbility], ['Who is affected', state.purpose.affectedPopulation],
    ['How people will tell', state.purpose.observationSignal], ['Who decides', state.purpose.accountableOwner],
    ['Review boundary', state.purpose.reviewBoundary], ['Open conditions', state.purpose.openConditions]];
  const decisionRows = state.scoreSettings.gates.map(gate => [gate.label, people.get(gate.reviewerPersonId) ?? 'Reviewer to be chosen',
    supplied(gate.question), supplied(gate.evidence), gate.modeledDecision, ...(cadence?.decisions.get(gate.id) ?? [])]);
  const workRows = state.work.map(row => [row.label, named(row.personIds, people), `${duration(row.minutesPerOccurrence)} × ${row.occurrences}`,
    funding(row.funding), `${row.status} · ${row.lifecycle}`, cadence ? [...(cadence.placementByWork.get(row.id) ?? ['Choose a period'])].join('; ')
      : row.timing ? `${formatScoreTime(row.timing.startMinute)} after plan start${row.timing.repeatEveryMinutes === null ? '' : `; ${formatScoreTime(row.timing.repeatEveryMinutes)} between starts`}` : 'Timing to be supplied']);
  const ledgerRows = result.ledger.flatMap(entry => entry.lines.map(line => [work.get(entry.workId), people.get(line.personId),
    funding(entry.funding), duration(line.minutes), money(line.cents)]));
  const qualityNames = new Map(listQualityConcepts().map(row => [row.id, row.label]));
  const comparison = baseline ? paragraphs([
    ['Baseline', `${baseline.state.planId} · revision ${baseline.state.revision} · ${horizonLabel(baseline.state)} · ${amount(baseline.result)}`],
    ['Accepted plan', `${state.planId} · revision ${state.revision} · ${horizonLabel(state)} · ${amount(result)}`],
    ['Difference in known investment', money(result.knownCommitmentCents - baseline.result.knownCommitmentCents)],
  ]) + (cadence ? paragraphs(describeScoreChanges(baseline.state, state).map(description => ['Arrangement change', description])) : '')
    : '<p>Capture a baseline in Investment to include a comparison.</p>';
  const body = section('Purpose and decision', paragraphs(purpose))
    + section('Investment', paragraphs([
      ['Accepted investment', amount(result)], ['Funded staffing', money(result.fundedKnownCents)],
      ['Extra work', money(result.additionalKnownCents)], ['Work included in staffing', money(result.allocatedKnownCents)],
    ]) + '<p>Accepted investment combines funded staffing and extra work. Work within funded time is already included in staffing.</p>' + comparison)
    + section('People and teams', table('People, rates and funded time', ['Person', 'Rate per hour · USD', 'Funded time', 'Teams', 'State'], state.people.map(person => [person.label,
      money(person.rateCentsPerHour), duration(person.fundedMinutes), named(state.teams.filter(team => team.personIds.includes(person.id)).map(team => team.id), teams), person.lifecycle])))
    + section('Working sessions', table('Time per person and planned funding', ['Session', 'People', 'Time per person', 'Funding', 'State', cadence ? 'Placement' : 'Timing'], workRows)
      + table('Work line attribution · USD', ['Session', 'Person', 'Funding', 'Effort', 'Line amount'], ledgerRows)
      + `<p>Per-person funding pools own settled totals. Line-rounding adjustment: funded work ${escape(money(result.lineRoundingAdjustments.allocatedCents))}; extra work ${escape(money(result.lineRoundingAdjustments.additionalCents))}.</p>`)
    + section('Coordination', (cadence?.body ?? '') + table('Team connections', ['From', 'To', 'Shared work', 'Expected response', 'Supporting sessions', 'State'], state.connections.map(row => [teams.get(row.senderTeamId), teams.get(row.receiverTeamId), row.sharedObject, row.responseExpectation, named(row.workIds, work), row.status]))
      + table('Modeled decisions', ['Decision', 'Reviewer', 'Question', 'Evidence', 'Modeled state', ...(cadence ? ['Review anchor', 'Planned period'] : [])], decisionRows))
    + section('Abilities and team practices', table('Support for the intended work', ['Ability or practice', 'Use in this plan', 'Responsible people', 'Decision owner', 'Supporting sessions'],
      [['ability', state.abilities], ['practice', state.practices]].flatMap(([kind, rows]) => rows.map(row => [getCapabilityDefinition(kind, row.definitionId, row.definitionVersion).action, row.context, named(row.responsiblePersonIds, people), people.get(row.decisionOwnerPersonId) ?? 'To be chosen', named([...new Set(row.supportBindings.flatMap(binding => binding.workIds))], work)]))))
    + section('Change, quality and human review', paragraphs([
      ['Change framework', state.changeSettings.activeFramework.frameworkId], ['Viewpoint', state.changeSettings.lens.lensId],
      ['Quality attention', `${state.assuranceSettings.quality.sigmaHalfSteps / 2} sigma reference`],
      ['Quality assumptions', 'Reference estimates guide exploration. Accepted people and sessions supply the investment above.'],
    ]) + table('Quality intentions and planned support', ['Quality concept', 'Included', 'Sessions'], state.assuranceSettings.quality.concepts.map(row => [qualityNames.get(row.conceptId), row.included ? 'Included' : 'Available', named(row.workIds, work)]))
      + table('AI contribution review', ['Function', 'Human reviewer', 'Decision owner', 'Review boundary', 'Decision boundary'], state.contributions.map(row => [row.categoryId, people.get(row.receiverPersonId), people.get(row.decisionOwnerPersonId), row.reviewBoundary, row.decisionBoundary])))
    + section('Recovery, learning and observations', table('Recovery events and planned response', ['Event', 'State', 'Assumed effort', 'Receiving person', 'Review boundary', 'Supporting sessions'], state.assuranceSettings.recoveryEvents.map(row => [row.label, `${row.included ? 'Included' : 'Available'} · ${row.lifecycle}`, `${duration(row.aggregateMinutesPerEvent)} aggregate × ${row.eventCount}`, people.get(row.receiverPersonId), row.reviewBoundary, named(row.workIds, work)]))
      + table('Learning actions', ['Question context', 'Decision owner', 'Review boundary', 'Supporting sessions'], state.assuranceSettings.learningActions.map(row => [row.context, people.get(row.decisionOwnerPersonId), row.reviewBoundary, named(row.workIds, work)]))
      + table('Rehearsals and their observations', ['Context', 'Assumptions', 'Planned response', 'Reviewer', 'Recorded observation', 'Observed revision', 'Supporting sessions'], state.assuranceSettings.rehearsals.map(row => [row.context, row.assumptions, row.response, people.get(row.reviewerPersonId) ?? 'To be chosen', row.observation ?? 'Awaiting an observation', row.observation === null ? 'To be observed' : row.observedPlanRevision, named(row.workIds, work)]))
      + table('Ability and practice observations', ['Observation', 'Context', 'Recorder', 'Review boundary', 'Observed revision'], state.capabilityEvidence.map(row => [row.observation, row.context, people.get(row.recorderPersonId), row.reviewBoundary, row.observedPlanRevision])))
    + section('Exact plan', '<p>This JSON contains every accepted field, including timing, recovery, learning, framework mappings and observations. Save the JSON text as a file to load it through the Studio’s plan importer.</p>'
      + `<details><summary>Read the accepted plan JSON</summary><pre>${escape(projection.serialized)}</pre></details>`);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="author" content="Vikrant Varun Kudesia"><title>Investment Studio — ${escape(state.planId)}</title><link rel="license" href="https://www.apache.org/licenses/LICENSE-2.0"><style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f7f1d8;color:#203453;font:16px/1.55 system-ui,sans-serif}main{max-width:78rem;margin:auto;padding:clamp(1rem,4vw,3rem)}header{background:#1d2825;color:#f7f1d8;padding:1.5rem;border-top:.4rem solid #54d5c3}header p{font-family:monospace;color:#7ce5d4}h1,h2{line-height:1.2}h2{padding-bottom:.5rem;border-bottom:2px solid #007f73}section{margin-block:2rem}.table-scroll{overflow-x:auto;margin-block:1rem}table{border-collapse:collapse;width:100%;min-width:36rem;background:#fffdf2}caption{text-align:left;font-weight:700;padding:.6rem 0}th,td{border:1px solid #889b94;padding:.6rem;text-align:left;vertical-align:top}thead{background:#203b35;color:#fffdf2}tbody th{font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fffdf2;padding:1rem}summary{cursor:pointer;font-weight:700}footer{border-top:1px solid;padding-top:1rem;font-size:.85rem}@media print{body{background:white;font-size:10pt}main{padding:0}header{background:white;color:#203453}header p{color:#203453}.table-scroll{overflow:visible}table{min-width:0}tr{break-inside:avoid}details{display:none}}
    </style></head><body><main><header><p>INVESTMENT STUDIO · ACCEPTED PLAN</p><h1>${escape(state.purpose.changedAbility || state.planId)}</h1><p>${escape(state.planId)} · revision ${state.revision} · ${horizonLabel(state)} · ${escape(amount(result))}</p></header>${body}<footer>© 2003–2026 Vikrant Varun Kudesia · Driftframe Studios, Limited Liability Company · Licensed under the Apache License, Version 2.0 (Apache-2.0).</footer></main></body></html>`;
  const capsule = [`INVESTMENT STUDIO — COLLABORATION BRIEF`, `Accepted plan: ${state.planId} · revision ${state.revision} · ${horizonLabel(state)}.`,
    `Schema ${state.schemaVersion}; model ${state.modelVersion}; currency ${state.currency}.`, '',
    ...purpose.map(([label, value]) => `${label}: ${supplied(value)}`), '',
    `Accepted investment: ${amount(result)}. Staffing ${money(result.fundedKnownCents)}; extra work ${money(result.additionalKnownCents)}.`,
    `Work included in staffing: ${money(result.allocatedKnownCents)}.`,
    ...(baseline ? [`Baseline ${baseline.state.planId}, revision ${baseline.state.revision}: ${amount(baseline.result)}. Difference in known investment: ${money(result.knownCommitmentCents - baseline.result.knownCommitmentCents)}.`] : []),
    '', 'Planned work:', ...workRows.map(row => `- ${row.join(' · ')}`), ...(cadence ? ['', ...cadence.brief] : []), '', 'Modeled decisions:', ...decisionRows.map(row => `- ${row.join(' · ')}`),
    '', 'Review invitation: inspect the stated assumptions, identify the next useful observation, and keep the named people responsible for decisions.',
    'This brief contains accepted authored context. The exact JSON below preserves all plan fields for further review and import.', '', 'ACCEPTED PLAN JSON', projection.serialized, ''].join('\n');
  return Object.freeze({ planId: state.planId, revision: state.revision, json: projection.serialized, html, capsule });
}
