import { CONTRACT } from './config.mjs';
import { createExamplePlan, preparePlan, PlanError } from './contract.mjs';

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

const CATALOGUE = new Map([
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
