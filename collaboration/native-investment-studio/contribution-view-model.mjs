import { CONTRIBUTION_CATEGORIES } from './roles.mjs';
import { summarizeWorkSessions } from './work-sessions.mjs';

const MODELS = new WeakMap(), EMPTY = Object.freeze([]);
const LABELS = new Map(CONTRIBUTION_CATEGORIES.map(row => [row.id, row.label]));
const named = row => `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}`;

// Reads an admitted immutable projection. Shared work establishes an association
// with a connection; it does not establish completed review or a human decision.
// The accepted accounting owner retains all effort, capacity and price values.
export function createContributionViewModel(projection) {
  if (MODELS.has(projection)) return MODELS.get(projection);
  const { state } = projection;
  const people = new Map(state.people.map(row => [row.id, Object.freeze({ id: row.id, label: row.label,
    name: named(row), lifecycle: row.lifecycle })]));
  const work = new Map(state.work.map(row => [row.id, Object.freeze({ id: row.id, label: row.label,
    name: named(row), lifecycle: row.lifecycle, status: summarizeWorkSessions(row).status })]));
  const byWork = new Map(), byConnection = new Map();
  state.connections.forEach(row => {
    byConnection.set(row.id, []);
    for (const workId of row.workIds) {
      if (!byWork.has(workId)) byWork.set(workId, []);
      byWork.get(workId).push(row.id);
    }
  });
  const unattached = [];
  const contributions = Object.freeze(state.contributions.map(row => {
    const receiver = people.get(row.receiverPersonId) ?? null, decisionOwner = people.get(row.decisionOwnerPersonId) ?? null;
    const supportingWork = Object.freeze(row.workIds.map(id => work.get(id))), gaps = [];
    const gap = (code, field, message, extra = {}) => gaps.push(Object.freeze({ code, field, message, ...extra }));
    for (const [person, field, role] of [[receiver, 'receiverPersonId', 'review receiver'], [decisionOwner, 'decisionOwnerPersonId', 'decision owner']]) {
      if (!person) gap('unassigned-human', field, `Choose a human ${role}.`);
      else if (person.lifecycle === 'retired') gap('retired-human', field, `The named ${role} is retired.`, { personId: person.id });
    }
    if (row.reviewBoundary === null) gap('review-boundary-unspecified', 'reviewBoundary', 'Describe what the human receiver checks.');
    if (row.decisionBoundary === null) gap('decision-boundary-unspecified', 'decisionBoundary', 'Describe what the human decision owner decides.');
    if (!supportingWork.length) gap('supporting-work-unspecified', 'workIds', 'Choose the work that carries this contribution.');
    for (const item of supportingWork) {
      if (item.lifecycle === 'retired') gap('retired-supporting-work', 'workIds', 'A linked working session is retired.', { workId: item.id });
      if (item.status === 'paused') gap('paused-supporting-work', 'workIds', 'A linked working session is paused.', { workId: item.id });
      if (item.status === 'mixed') gap('paused-supporting-work', 'workIds', 'Some linked sessions are paused.', { workId: item.id });
    }
    const contribution = Object.freeze({ id: row.id, categoryId: row.categoryId, label: LABELS.get(row.categoryId),
      receiver, decisionOwner, reviewBoundary: row.reviewBoundary, decisionBoundary: row.decisionBoundary,
      work: supportingWork, gaps: Object.freeze(gaps) });
    const links = new Map();
    // Visit only shared-work incidence pairs. Multiple shared sessions retain
    // one contribution/connection relation with the exact ordered intersection.
    for (const workId of row.workIds) for (const connectionId of byWork.get(workId) ?? EMPTY) {
      if (!links.has(connectionId)) links.set(connectionId, []);
      links.get(connectionId).push(workId);
    }
    if (!links.size) unattached.push(contribution);
    for (const [connectionId, sharedWorkIds] of links) {
      byConnection.get(connectionId).push(Object.freeze({ contributionId: row.id, connectionId, sharedWorkIds: Object.freeze(sharedWorkIds) }));
    }
    return contribution;
  }));
  for (const rows of byConnection.values()) Object.freeze(rows);
  const index = new Map(contributions.map(row => [row.id, row]));
  const model = Object.freeze({ contributions, unattached: Object.freeze(unattached),
    contribution: id => index.get(id) ?? null, forConnection: id => byConnection.get(id) ?? EMPTY });
  MODELS.set(projection, model); return model;
}
