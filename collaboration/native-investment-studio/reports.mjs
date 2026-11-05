import { money, duration } from './display.mjs';
import { formatScoreTime } from './score-time.mjs';
import { getCapabilityDefinition } from './capabilities.mjs';
import { listQualityConcepts } from './assurance-models.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const supplied = value => value || 'To be supplied';
const amount = result => `${money(result.knownCommitmentCents)}${result.plannedCommitmentCents === null ? ' known; rates remain to be supplied' : ''}`;
const funding = value => value === 'allocated' ? 'Within funded time' : 'Extra investment';
const table = (caption, columns, rows) => `<div class="table-scroll" tabindex="0" role="region" aria-label="${escape(caption)}"><table><caption>${escape(caption)}</caption><thead><tr>${columns.map(label => `<th scope="col">${escape(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value, index) => index === 0 ? `<th scope="row">${escape(value)}</th>` : `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const section = (title, body) => `<section><h2>${escape(title)}</h2>${body}</section>`;
const paragraphs = entries => entries.map(([label, value]) => `<p><strong>${escape(label)}</strong><br>${escape(supplied(value))}</p>`).join('');

// Both leave-behinds are derived synchronously from one immutable accepted
// projection. Editor drafts have no input here; the embedded JSON is the same
// admitted envelope used by the native plan download and import receiver.
export function captureStudioReport(projection, baseline = null) {
  const { state, result } = projection;
  const people = new Map(state.people.map(person => [person.id, person.label]));
  const teams = new Map(state.teams.map(team => [team.id, team.label]));
  const work = new Map(state.work.map(row => [row.id, row.label]));
  const named = (ids, labels) => ids.map(id => labels.get(id) ?? id).join(', ') || 'To be supplied';
  const purpose = [['What the work should change', state.purpose.changedAbility], ['Who is affected', state.purpose.affectedPopulation],
    ['How people will tell', state.purpose.observationSignal], ['Who decides', state.purpose.accountableOwner],
    ['Review boundary', state.purpose.reviewBoundary], ['Open conditions', state.purpose.openConditions]];
  const decisionRows = state.scoreSettings.gates.map(gate => [gate.label, people.get(gate.reviewerPersonId) ?? 'Reviewer to be chosen',
    supplied(gate.question), supplied(gate.evidence), gate.modeledDecision]);
  const workRows = state.work.map(row => [row.label, named(row.personIds, people), `${duration(row.minutesPerOccurrence)} × ${row.occurrences}`,
    funding(row.funding), `${row.status} · ${row.lifecycle}`, row.timing ? `${formatScoreTime(row.timing.startMinute)} after plan start${row.timing.repeatEveryMinutes === null ? '' : `; ${formatScoreTime(row.timing.repeatEveryMinutes)} between starts`}` : 'Timing to be supplied']);
  const ledgerRows = result.ledger.flatMap(entry => entry.lines.map(line => [work.get(entry.workId), people.get(line.personId),
    funding(entry.funding), duration(line.minutes), money(line.cents)]));
  const qualityNames = new Map(listQualityConcepts().map(row => [row.id, row.label]));
  const comparison = baseline ? paragraphs([
    ['Baseline', `${baseline.state.planId} · revision ${baseline.state.revision} · ${baseline.state.horizonWeeks} weeks · ${amount(baseline.result)}`],
    ['Accepted plan', `${state.planId} · revision ${state.revision} · ${state.horizonWeeks} weeks · ${amount(result)}`],
    ['Difference in known investment', money(result.knownCommitmentCents - baseline.result.knownCommitmentCents)],
  ]) : '<p>Capture a baseline in Investment to include a comparison.</p>';
  const body = section('Purpose and decision', paragraphs(purpose))
    + section('Investment', paragraphs([
      ['Accepted investment', amount(result)], ['Funded staffing', money(result.fundedKnownCents)],
      ['Extra work', money(result.additionalKnownCents)], ['Work included in staffing', money(result.allocatedKnownCents)],
    ]) + '<p>Accepted investment combines funded staffing and extra work. Work within funded time is already included in staffing.</p>' + comparison)
    + section('People and teams', table('People, rates and funded time', ['Person', 'Rate per hour · USD', 'Funded time', 'Teams', 'State'], state.people.map(person => [person.label,
      money(person.rateCentsPerHour), duration(person.fundedMinutes), named(state.teams.filter(team => team.personIds.includes(person.id)).map(team => team.id), teams), person.lifecycle])))
    + section('Working sessions', table('Time per person and planned funding', ['Session', 'People', 'Time per person', 'Funding', 'State', 'Timing'], workRows)
      + table('Work line attribution · USD', ['Session', 'Person', 'Funding', 'Effort', 'Line amount'], ledgerRows)
      + `<p>Per-person funding pools own settled totals. Line-rounding adjustment: funded work ${escape(money(result.lineRoundingAdjustments.allocatedCents))}; extra work ${escape(money(result.lineRoundingAdjustments.additionalCents))}.</p>`)
    + section('Coordination', table('Team connections', ['From', 'To', 'Shared work', 'Expected response', 'Supporting sessions', 'State'], state.connections.map(row => [teams.get(row.senderTeamId), teams.get(row.receiverTeamId), row.sharedObject, row.responseExpectation, named(row.workIds, work), row.status]))
      + table('Modeled decisions', ['Decision', 'Reviewer', 'Question', 'Evidence', 'Modeled state'], decisionRows))
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
    </style></head><body><main><header><p>INVESTMENT STUDIO · ACCEPTED PLAN</p><h1>${escape(state.purpose.changedAbility || state.planId)}</h1><p>${escape(state.planId)} · revision ${state.revision} · ${state.horizonWeeks} weeks · ${escape(amount(result))}</p></header>${body}<footer>© 2003–2026 Vikrant Varun Kudesia · Driftframe Studios, Limited Liability Company · Licensed under the Apache License, Version 2.0 (Apache-2.0).</footer></main></body></html>`;
  const capsule = [`INVESTMENT STUDIO — COLLABORATION BRIEF`, `Accepted plan: ${state.planId} · revision ${state.revision} · ${state.horizonWeeks} weeks.`,
    `Schema ${state.schemaVersion}; model ${state.modelVersion}; currency ${state.currency}.`, '',
    ...purpose.map(([label, value]) => `${label}: ${supplied(value)}`), '',
    `Accepted investment: ${amount(result)}. Staffing ${money(result.fundedKnownCents)}; extra work ${money(result.additionalKnownCents)}.`,
    `Work included in staffing: ${money(result.allocatedKnownCents)}.`,
    ...(baseline ? [`Baseline ${baseline.state.planId}, revision ${baseline.state.revision}: ${amount(baseline.result)}. Difference in known investment: ${money(result.knownCommitmentCents - baseline.result.knownCommitmentCents)}.`] : []),
    '', 'Planned work:', ...workRows.map(row => `- ${row.join(' · ')}`), '', 'Modeled decisions:', ...decisionRows.map(row => `- ${row.join(' · ')}`),
    '', 'Review invitation: inspect the stated assumptions, identify the next useful observation, and keep the named people responsible for decisions.',
    'This brief contains accepted authored context. The exact JSON below preserves all plan fields for further review and import.', '', 'ACCEPTED PLAN JSON', projection.serialized, ''].join('\n');
  return Object.freeze({ planId: state.planId, revision: state.revision, json: projection.serialized, html, capsule });
}
