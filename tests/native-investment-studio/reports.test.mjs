import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { captureStudioReport } from '../../collaboration/native-investment-studio/reports.mjs';
import { createShowcasePlan, createQuarterShowcasePlan, preparePreset } from '../../collaboration/native-investment-studio/presets.mjs';
import { preparePlan, parsePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';

test('report and brief capture the same accepted snapshot while later edits retain their own revision', () => {
  const studio = createStudio(createShowcasePlan()), original = studio.read();
  const report = captureStudioReport(original, original);
  const changed = structuredClone(original.state); changed.work[0].minutesPerOccurrence = 45;
  assert.equal(studio.replace(changed, original).ok, true);
  assert.equal(report.json, original.serialized);
  assert.equal(parsePlan(report.json).result.plannedCommitmentCents, 398000);
  assert.ok(report.capsule.endsWith(`${report.json}\n`));
  assert.match(report.html, /\$3,980\.00/);
  assert.doesNotMatch(report.html, /\$4,350\.00/);
  const next = captureStudioReport(studio.read(), original);
  assert.match(next.capsule, /Difference in known investment: \$370\.00/);
  assert.match(next.html, /<caption>Work line attribution · USD<\/caption>/);
  assert.match(next.html, /<th scope="row">Pilot decision review<\/th>/);
});

test('report renders authored markup as text and preserves it exactly in the portable JSON', () => {
  const plan = createShowcasePlan();
  plan.purpose.changedAbility = '<script>alert("example")</script> & review';
  plan.people[0].label = '<img src=x onerror=alert(1)>';
  plan.people[0].rateCentsPerHour = null;
  const report = captureStudioReport(preparePlan(plan));
  assert.doesNotMatch(report.html, /<script|<img|onerror="/i);
  assert.match(report.html, /&lt;script&gt;alert\(&quot;example&quot;\)&lt;\/script&gt; &amp; review/);
  assert.match(report.html, /known; rates remain to be supplied/);
  assert.equal(parsePlan(report.json).state.purpose.changedAbility, plan.purpose.changedAbility);
});

test('period reports preserve named placement and authored session order in both readable companions', () => {
  for (const [plan, placement] of [[createShowcasePlan(), 'Sprint 1 · Week 1'], [createQuarterShowcasePlan(), 'Quarter 1 · Month 1']]) {
    const projection = preparePlan(plan), report = captureStudioReport(projection);
    const agenda = report.html.match(/<caption>Sessions within the plan<\/caption>[\s\S]*?<\/table>/)?.[0];
    const brief = report.capsule.split('ACCEPTED PLAN JSON')[0];
    assert.ok(agenda, 'The printable report exposes an individual-session agenda.');
    assert.ok(agenda.includes(placement));
    assert.ok(brief.includes(placement));
    assert.match(brief, /Availability remains unknown where a value has yet to be supplied\./);
    assert.doesNotMatch(agenda, /after plan start/);
    assert.equal(report.json, projection.serialized);
    if (plan.scoreSettings.cadence.basis === 'sprint') {
      // Rehearsal session 2 precedes review session 1 within the same week.
      const rehearsal = '<th scope="row">Operations rehearsal</th><td>2</td><td>Sprint 4 · Week 1</td>';
      const review = '<th scope="row">Pilot decision review</th><td>1</td><td>Sprint 4 · Week 1</td>';
      assert.ok(agenda.indexOf(rehearsal) >= 0 && agenda.indexOf(rehearsal) < agenda.indexOf(review));
      const rehearsalLine = brief.indexOf('- Operations rehearsal, session 2');
      assert.ok(rehearsalLine >= 0 && rehearsalLine < brief.indexOf('- Pilot decision review, session 1'));
    }
  }
});

test('readable recovery observations preserve the reviewer, observed revision and event standing', () => {
  const plan = createShowcasePlan();
  plan.assuranceSettings.rehearsals = [{ id: 'recovery-response', definitionId: 'recovery-failure', definitionVersion: '1.0.0',
    context: 'Review the recovery instructions', assumptions: 'The operator can access the saved request.',
    response: 'Clarify the instruction and repeat the interrupted task.', reviewerPersonId: 'noor', observedPlanRevision: 0,
    observation: 'The operator recovered the saved request.', workIds: ['rehearsal'], connectionIds: ['readiness'], personIds: ['noor', 'sam'] }];
  plan.assuranceSettings.recoveryEvents = [{ id: 'interrupted-task', label: 'Interrupted task', included: false, lifecycle: 'retired',
    eventCount: 1, aggregateMinutesPerEvent: 60, receiverPersonId: 'noor', reviewBoundary: 'Review recovery.', workIds: [] }];
  let report = captureStudioReport(preparePlan(plan));
  assert.match(report.html, /Quality reviewer<\/td><td>The operator recovered the saved request\.<\/td><td>0<\/td>/);
  assert.match(report.html, /Available · retired/);
  assert.match(report.html, /tabindex="0" role="region" aria-label="Work line attribution · USD"/);
  plan.assuranceSettings.rehearsals[0].observation = null;
  report = captureStudioReport(preparePlan(plan));
  assert.match(report.html, /Awaiting an observation<\/td><td>To be observed/);
});

test('six authored families round-trip with explicit native assumptions and independently priced work', () => {
  // Rates: Product120, Research100, Engineering140/120, Quality110, Operations90.
  // Discovery: six one-hour reserves680 + allocated research440/pairing390 +
  // one review-hour370 + 45-minute Quality/Operations walkthrough150 = 2,030.
  const expected = new Map([
    ['discovery-alignment', 203000], ['data-platform-migration', 413250], ['regulated-workflow', 387000],
    ['ai-assisted-product', 346500], ['enterprise-integration', 439000], ['operational-modernization', 335500],
  ]);
  for (const [id, cents] of expected) {
    const { projection } = preparePreset(id, '1.0.0');
    assert.equal(projection.result.plannedCommitmentCents, cents, id);
    assert.deepEqual(projection.result.obligations, [], id);
    assert.match(projection.state.purpose.openConditions, /native rehearsal slice/);
    const report = captureStudioReport(projection);
    assert.equal(parsePlan(report.json).serialized, projection.serialized, id);
    assert.match(report.html, /<h2>Change, quality and human review<\/h2>/);
    assert.equal(preparePreset(id, '1.0.0').projection.serialized, projection.serialized);
  }
});
