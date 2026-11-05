import { CONTRACT } from './config.mjs';
import { createExamplePlan, preparePlan, PlanError } from './contract.mjs';
import { emptyRole } from './roles.mjs';

const PRESET_VERSION = '1.0.0';
function workingSessions() {
  const plan = createExamplePlan();
  plan.planId = 'shared-working-sessions';
  plan.purpose.changedAbility = 'Plan shared working sessions.';
  plan.purpose.affectedPopulation = 'Product and Engineering';
  return plan;
}
function fundedSessions() {
  const plan = workingSessions();
  plan.planId = 'funded-working-sessions';
  for (const person of plan.people) person.fundedMinutes = 180;
  plan.work[0].funding = 'allocated';
  return plan;
}

// The showcase uses ordinary plan records. Editors, pricing and exchange share
// the same owners as visitor-created plans; each entrance receives a fresh plan.
export function createShowcasePlan() {
  const plan = createExamplePlan();
  plan.planId = 'service-request-pilot';
  plan.horizonWeeks = 4;
  plan.purpose = {
    changedAbility: 'Operations staff can route a service request, see who owns it, and recover a missed handoff.',
    affectedPopulation: 'A synthetic Product, Engineering, and Quality / Operations pilot.',
    observationSignal: 'Walk through a routine request and a missed handoff with the people who will operate the pilot.',
    accountableOwner: 'Maya decides pilot scope and readiness after the human reviews.',
    reviewBoundary: 'Leo checks source evidence; Ari checks behavior; Noor reviews exception handling; Sam checks the operating instructions.',
    openConditions: 'Rates and funded time are illustrative. Timing remains unscheduled. Readiness depends on the observed walkthrough.',
  };
  plan.people = [
    ['maya', 'Maya', 'product-program', 12000, 240, 'decision-owner', 'approves'],
    ['leo', 'Leo', 'design-research', 10000, 240, 'individual-contributor', 'recommends'],
    ['ari', 'Ari', 'engineering', 14000, 360, 'player-coach', 'recommends'],
    ['jules', 'Jules', 'engineering', 12000, 360, 'individual-contributor', 'operates'],
    ['noor', 'Noor', 'quality-regulatory', 11000, 120, 'domain-reviewer', 'recommends'],
    ['sam', 'Sam', 'ops-support', 9000, 120, 'domain-reviewer', 'operates'],
  ].map(([id, label, functionId, rateCentsPerHour, fundedMinutes, postureId, decisionId]) => ({
    id, label, rateCentsPerHour, fundedMinutes,
    role: { ...emptyRole(), functionId, postureId, decisionId }, lifecycle: 'active',
  }));
  plan.teams = [
    ['product', 'Product and Research', ['maya', 'leo']],
    ['engineering', 'Engineering', ['ari', 'jules', 'maya', 'noor']],
    ['operations', 'Quality and Operations', ['noor', 'sam']],
  ].map(([id, label, personIds]) => ({ id, label, personIds, lifecycle: 'active' }));
  plan.work = [
    ['review', 'Pilot decision review', 'engineering', ['maya', 'ari', 'noor'], 30, 4, 'additional'],
    ['research', 'Research synthesis', 'product', ['maya', 'leo'], 60, 2, 'allocated'],
    ['pairing', 'Prototype pairing', 'engineering', ['ari', 'jules'], 60, 4, 'allocated'],
    ['rehearsal', 'Operations rehearsal', 'operations', ['noor', 'sam'], 60, 2, 'additional'],
  ].map(([id, label, teamId, personIds, minutesPerOccurrence, occurrences, funding]) => ({
    id, label, teamId, personIds, minutesPerOccurrence, occurrences, funding,
    status: 'planned', timing: null, lifecycle: 'active',
  }));
  plan.practices = [
    { id: 'shared-expectations', practiceId: 'expectation', teamId: 'engineering', workIds: ['review'] },
    { id: 'readiness-evidence', practiceId: 'assurance', teamId: 'operations', workIds: ['review', 'rehearsal'] },
  ];
  plan.contributions = [{
    id: 'evidence-draft', categoryId: 'cross-source-synthesis', receiverPersonId: 'leo', decisionOwnerPersonId: 'maya',
    workIds: ['research', 'review'],
    reviewBoundary: 'Leo checks each draft claim against the interview notes. Noor checks exception-handling claims in the review.',
    decisionBoundary: 'Maya chooses the pilot scope after the evidence and review conditions are recorded.',
  }];
  plan.connections = [
    ['scope', 'product', 'engineering', 'ari', 'Pilot scope and tested user journeys',
      'Confirm an implementable slice and flag evidence gaps', ['research', 'pairing']],
    ['readiness', 'engineering', 'operations', 'noor', 'Prototype, acceptance evidence and exception log',
      'Return a readiness recommendation with review conditions', ['review', 'rehearsal']],
    ['decision', 'operations', 'product', 'maya', 'Readiness findings and rollout conditions',
      'Record go, adjust, or hold with the necessary funded review time', ['review', 'rehearsal']],
  ].map(([id, senderTeamId, receiverTeamId, receiverPersonId, sharedObject, responseExpectation, workIds]) => ({
    id, senderTeamId, receiverTeamId, receiverPersonId, sharedObject, responseExpectation, workIds, status: 'active',
  }));
  return plan;
}

const CATALOGUE = new Map([
  ['service-request-pilot', 'Service request pilot', 'Three teams prepare a pilot, review its evidence, and plan the funded time together.', createShowcasePlan],
  ['shared-working-sessions', 'Shared working sessions', 'Four people meet for half an hour, six times.', workingSessions],
  ['funded-working-sessions', 'Sessions within funded time', 'The same sessions use three funded hours per person.', fundedSessions],
].map(([id, label, description, create]) => [id, Object.freeze({
  metadata: Object.freeze({ id, version: PRESET_VERSION, label, description,
    schemaVersion: CONTRACT.schemaVersion, modelVersion: CONTRACT.modelVersion }), create,
})]));
const LIST = Object.freeze([...CATALOGUE.values()].map(entry => entry.metadata));

export function listPresets() { return LIST; }

// Each request creates and admits its own native plan. Catalogue records carry
// identity and labels; accepted state continues to belong to createStudio.
export function preparePreset(id, version) {
  const entry = typeof id === 'string' ? CATALOGUE.get(id) : null;
  if (!entry) throw new PlanError('preset', 'preset.id', 'Choose a listed Studio example.');
  if (version !== entry.metadata.version) {
    throw new PlanError('preset-version', 'preset.version', 'Use the listed version of this example.');
  }
  return Object.freeze({ projection: preparePlan(entry.create()),
    sourceSchemaVersion: CONTRACT.schemaVersion, preset: entry.metadata });
}
