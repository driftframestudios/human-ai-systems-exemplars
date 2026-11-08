const VERSION = '1.0.0';
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const catalogue = (id, label, description, teams, connections, examples = {}) => freeze({ id, version: VERSION, label, description,
  teams: teams.map(([id, label]) => ({ id, label })),
  connections: connections.map(([id, label, senderSlotId, receiverSlotId]) => ({ id, label, senderSlotId, receiverSlotId, ...examples[id] })),
});
const CATALOGUE = new Map([
  catalogue('pod', 'Pod', 'Connect a delivery group and a partner around a shared object and feedback.',
    [['pod', 'Delivery group'], ['partner', 'Partner group']],
    [['handoff', 'Share the work', 'pod', 'partner'], ['feedback', 'Return feedback', 'partner', 'pod']]),
  catalogue('guild', 'Guild', 'Connect a practice group and a delivery group around guidance and learning.',
    [['practice', 'Practice group'], ['delivery', 'Delivery group']],
    [['guidance', 'Share guidance', 'practice', 'delivery'], ['learning', 'Return learning', 'delivery', 'practice']]),
  catalogue('project-team', 'Project team', 'Connect direction, delivery and the group receiving the work.',
    [['sponsor', 'Sponsoring group'], ['project', 'Project group'], ['operations', 'Receiving group']],
    [['direction', 'Agree direction', 'sponsor', 'project'], ['handover', 'Hand over the work', 'project', 'operations'], ['feedback', 'Return feedback', 'operations', 'project']]),
  catalogue('shared-service', 'Shared service', 'Connect a requesting group and a service through requests and responses.',
    [['requester', 'Requesting group'], ['service', 'Service group']],
    [['request', 'Send a request', 'requester', 'service'], ['response', 'Return a response', 'service', 'requester']]),
  catalogue('stream-aligned', 'Stream-aligned', 'Keep a team responsible for a customer outcome, with specialist support and operational feedback.',
    [['stream', 'Customer outcome team'], ['enablement', 'Enabling team'], ['operations', 'Operations partner']],
    [['enable', 'Resolve a delivery obstacle', 'enablement', 'stream'], ['deliver', 'Release a usable change', 'stream', 'operations'], ['learn', 'Return customer feedback', 'operations', 'stream']],
    { enable: { sharedObject: 'A tested way through the delivery obstacle', responseExpectation: 'The outcome team can continue independently.', sessionLabel: 'Resolve the delivery obstacle' },
      deliver: { sharedObject: 'A usable change and recovery instructions', responseExpectation: 'Operations confirms readiness to receive the change.' },
      learn: { sharedObject: 'Observed customer outcomes', responseExpectation: 'Choose the next improvement together.' } }),
  catalogue('matrix', 'Matrix', 'Bring delivery priorities and specialist practice together around a shared assignment.',
    [['delivery', 'Delivery team'], ['practice', 'Specialist practice'], ['sponsor', 'Priority owners']],
    [['expertise', 'Agree specialist support', 'practice', 'delivery'], ['priority', 'Agree the priority', 'sponsor', 'delivery'], ['review', 'Review the result', 'delivery', 'sponsor']],
    { expertise: { sharedObject: 'Named specialist support and available time', responseExpectation: 'Agree who contributes and which work takes priority.', sessionLabel: 'Agree shared assignments' },
      priority: { sharedObject: 'The next delivery commitment', responseExpectation: 'Resolve competing priorities before work begins.' },
      review: { sharedObject: 'A result ready for a decision', responseExpectation: 'Confirm whether to continue or change direction.' } }),
  catalogue('tiger-team', 'Tiger Team', 'Assemble a temporary response team, resolve a focused problem and hand ownership back.',
    [['response', 'Focused response team'], ['specialists', 'Specialist support'], ['owner', 'Receiving owner']],
    [['diagnose', 'Bring the evidence', 'specialists', 'response'], ['resolve', 'Test the response', 'response', 'specialists'], ['return', 'Return ownership', 'response', 'owner']],
    { diagnose: { sharedObject: 'Evidence of the problem and affected work', responseExpectation: 'Agree a focused response and a stopping condition.', sessionLabel: 'Diagnose and agree on a response' },
      resolve: { sharedObject: 'A tested response and remaining limitations', responseExpectation: 'Check the response with the relevant specialists.' },
      return: { sharedObject: 'Recovery instructions and an accountable owner', responseExpectation: 'The receiving owner accepts ongoing responsibility.' } }),
].map(row => [row.id, row]));
const LIST = Object.freeze([...CATALOGUE.values()]);

export function listCoordinationTemplates() { return LIST; }

export function getCoordinationTemplate(id, version = VERSION) {
  const template = CATALOGUE.get(id);
  return template?.version === version ? template : null;
}

// The admitted plan owns actual membership and edges. Template slots retain
// the authored grouping even after a visitor changes an endpoint.
export function projectCoordinationArrangements(plan) {
  const teams = new Map(plan.teams.map(row => [row.id, row]));
  const connections = new Map(plan.connections.map(row => [row.id, row]));
  const grouped = new Set();
  const arrangements = plan.arrangements.map(row => {
    const template = getCoordinationTemplate(row.templateId, row.templateVersion);
    const teamBindings = new Map(row.teamBindings.map(binding => [binding.slotId, binding.teamId]));
    const connectionBindings = new Map(row.connectionBindings.map(binding => [binding.slotId, binding.connectionId]));
    const edges = template.connections.map(slot => {
      const connectionId = connectionBindings.get(slot.id), connection = connections.get(connectionId);
      grouped.add(connectionId);
      const expectedSenderTeamId = teamBindings.get(slot.senderSlotId), expectedReceiverTeamId = teamBindings.get(slot.receiverSlotId);
      return { slotId: slot.id, slotLabel: slot.label, expectedSenderTeamId, expectedReceiverTeamId,
        connection: structuredClone(connection),
        adapted: connection.senderTeamId !== expectedSenderTeamId || connection.receiverTeamId !== expectedReceiverTeamId };
    });
    return { id: row.id, templateId: template.id, templateVersion: template.version, label: template.label,
      purpose: template.description, adapted: edges.some(edge => edge.adapted),
      teams: template.teams.map(slot => ({ slotId: slot.id, slotLabel: slot.label, team: structuredClone(teams.get(teamBindings.get(slot.id))) })),
      connections: edges };
  });
  return freeze({ arrangements, customConnectionIds: plan.connections.filter(row => !grouped.has(row.id)).map(row => row.id) });
}

export function describeArrangementReference(plan, reference) {
  if (reference?.collection !== 'arrangements') return null;
  const arrangement = plan.arrangements.find(row => row.id === reference.id);
  if (!arrangement) return null;
  const template = getCoordinationTemplate(arrangement.templateId, arrangement.templateVersion);
  return Object.freeze({ id: arrangement.id, label: `${template.label} arrangement` });
}

// Investment compares structural identity and actual directions independently
// of monetary totals. Labels come from each side of the comparison.
export function describeArrangementChanges(before, after) {
  const describe = plan => {
    const teams = new Map(plan.teams.map(row => [row.id, row.label]));
    return new Map(projectCoordinationArrangements(plan).arrangements.map(row => {
      const groups = row.teams.map(binding => `${binding.slotLabel}: ${binding.team.label}`).join('; ');
      const edges = row.connections.map(binding => `${binding.slotLabel}: ${teams.get(binding.connection.senderTeamId)} → ${teams.get(binding.connection.receiverTeamId)}`).join('; ');
      const identity = JSON.stringify([row.templateId, row.templateVersion,
        row.teams.map(binding => [binding.slotId, binding.team.id, binding.team.label]),
        row.connections.map(binding => [binding.slotId, binding.connection.id, binding.connection.senderTeamId, binding.connection.receiverTeamId,
          teams.get(binding.connection.senderTeamId), teams.get(binding.connection.receiverTeamId)])]);
      return [row.id, { identity, label: row.label, groups,
        detail: `${groups}. ${edges}.${row.adapted ? ' Connections are adapted from this template.' : ''}` }];
    }));
  };
  const prior = describe(before), next = describe(after), descriptions = [];
  for (const [id, row] of next) {
    if (row.identity === prior.get(id)?.identity) continue;
    descriptions.push(`${row.label} arrangement ${prior.has(id) ? 'changed' : 'added'}: ${row.detail}`);
  }
  for (const [id, row] of prior) if (!next.has(id)) descriptions.push(`${row.label} template grouping removed: ${row.groups}.`);
  const priorIds = [...prior.keys()], nextIds = [...next.keys()];
  if (priorIds.length === nextIds.length && priorIds.every(id => next.has(id)) && priorIds.some((id, index) => id !== nextIds[index]))
    descriptions.push(`Arrangement order changed: ${[...next.values()].map(row => `${row.label} (${row.groups})`).join(' → ')}.`);
  return Object.freeze(descriptions);
}
