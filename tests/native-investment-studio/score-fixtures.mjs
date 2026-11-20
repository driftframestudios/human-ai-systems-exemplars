import '../../tools/node-runtime-admission.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { emptyRole } from '../../collaboration/native-investment-studio/roles.mjs';

export function ordinaryWork(id, label, personIds, minutesPerOccurrence, occurrences, funding, timing, status = 'planned') {
  return { id, label, teamId: 'pilot', personIds, minutesPerOccurrence, occurrences, funding,
    status, timing, lifecycle: 'active' };
}
export function literalScoreFixture() {
  const fixture = {
    plan: {
      ...createExamplePlan(),
      abilities: [], practices: [], capabilityEvidence: [], contributions: [],
      people: [
        { id: 'researcher', label: 'Researcher', fundedMinutes: 120, rateCentsPerHour: 6000, lifecycle: 'active', role: emptyRole(),
          availability: [{ startMinute: 0, endMinute: 120 }, { startMinute: 180, endMinute: 210 }] },
        { id: 'engineer', label: 'Engineer', fundedMinutes: 60, rateCentsPerHour: 9000, lifecycle: 'active', role: emptyRole(), availability: null },
      ],
      teams: [{ id: 'pilot', label: 'Pilot team', personIds: ['researcher', 'engineer'], lifecycle: 'active' },
        { id: 'review-team', label: 'Review team', personIds: ['researcher'], lifecycle: 'active' }],
      work: [
        ordinaryWork('prepare', 'Prepare the request walkthrough', ['researcher'], 60, 1, 'allocated', { startMinute: 0, repeatEveryMinutes: null }),
        ordinaryWork('walkthrough', 'Walk through a request', ['researcher', 'engineer'], 45, 2, 'additional', { startMinute: 60, repeatEveryMinutes: 120 }),
        ordinaryWork('review', 'Review the handoff evidence', ['researcher'], 30, 1, 'additional', { startMinute: 90, repeatEveryMinutes: null }),
        ordinaryWork('follow-up', 'Clarify the next change', ['engineer'], 20, 1, 'allocated', null),
        ordinaryWork('paused', 'Paused support session', ['researcher'], 40, 1, 'additional', { startMinute: 100, repeatEveryMinutes: null }, 'paused'),
        ordinaryWork('milestone', 'Ready for the pilot decision', ['engineer'], 0, 1, 'allocated', { startMinute: 225, repeatEveryMinutes: null }),
      ],
      connections: [{ id: 'review-route', senderTeamId: 'pilot', receiverTeamId: 'review-team', receiverPersonId: 'researcher',
        sharedObject: 'Pilot observations', responseExpectation: 'Return a reviewed recommendation', workIds: ['prepare', 'walkthrough'], status: 'active' }],
    },
    settings: {
      version: '1.0.0',
      window: { label: 'Elapsed minutes from pilot start', startMinute: 0, endMinute: 240 },
      dependencies: [
        { id: 'prepare-first', fromWorkId: 'prepare', toWorkId: 'walkthrough', lagMinutes: 0, connectionId: 'review-route' },
        { id: 'review-after-all-walkthroughs', fromWorkId: 'walkthrough', toWorkId: 'review', lagMinutes: 15, connectionId: null },
      ],
      waits: [{ id: 'response-wait', label: 'Wait for the receiving response', startMinute: 120, endMinute: 180,
        reason: 'The receiving team is preparing its response.', receiverPersonId: 'engineer' }],
      stages: [
        { id: 'preparation', label: 'Prepare the pilot', workIds: ['prepare'] },
        { id: 'pilot', label: 'Try and review the handoff', workIds: ['walkthrough', 'review', 'milestone'] },
      ],
      gates: [{ id: 'pilot-decision', label: 'Pilot decision', afterStageId: 'pilot', reviewerPersonId: 'researcher',
        question: 'Does the walkthrough support a wider pilot?', evidence: 'Illustrative prompt: review the observed handoff and its recovery.', modeledDecision: 'open' }],
      proposals: [
        { id: 'next-follow-up', bank: 'next', gateId: 'pilot-decision', work: ordinaryWork('new-follow-up', 'Review the pilot findings', ['researcher', 'engineer'], 30, 1, 'additional', null) },
        { id: 'option-expansion', bank: 'options', gateId: null, work: ordinaryWork('new-expansion', 'Prepare a wider trial', ['engineer'], 60, 1, 'additional', null) },
      ],
    },
  };
  fixture.plan.scoreSettings = fixture.settings;
  return fixture.plan;
}

// Independent expected readings: the capacity example includes a shared-person clash,
// explicit and unknown availability, a paused paid session, and work awaiting placement.
export const EXPECTED_LITERAL_READING = Object.freeze({
  researcher: { scheduledEffortMinutes: 180, unscheduledEffortMinutes: 0, occupiedMinutes: 165, overlapMinutes: 15, peakConcurrent: 2,
    availableMinutes: 150, outsideAvailabilityMinutes: 15 },
  engineer: { scheduledEffortMinutes: 90, unscheduledEffortMinutes: 20, occupiedMinutes: 90, overlapMinutes: 0, peakConcurrent: 1,
    availableMinutes: null, outsideAvailabilityMinutes: null },
  span: { startMinute: 0, endMinute: 225, elapsedMinutes: 225 },
  acceptedCommitmentCents: 50500,
});
