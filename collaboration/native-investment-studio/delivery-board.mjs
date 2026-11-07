import { duration } from './display.mjs';

const PHASES = Object.freeze([
  ['planning', 'Planning', 'Agree the work and who needs it.'],
  ['design', 'Design', 'Shape the approach with the people involved.'],
  ['implementation', 'Implementation', 'Build the working change.'],
  ['testing', 'Testing', 'Review the result and rehearse recovery.'],
  ['deployment', 'Deployment', 'Hand over a change people can use.'],
  ['maintenance', 'Maintenance', 'Learn from use and keep the work supported.'],
].map(([id, label, purpose]) => Object.freeze({ id, label, purpose })));

// These authored placements illustrate a delivery pattern, rather than change
// the plan's periods, stages, ownership or completion state.
const LAYOUTS = Object.freeze({
  pod: { teams: ['pod', 'partner', 'pod', 'partner', 'pod', 'partner'], connections: { handoff: 'deployment', feedback: 'maintenance' } },
  guild: { teams: ['practice', 'practice', 'delivery', 'practice', 'delivery', 'practice'], connections: { guidance: 'design', learning: 'maintenance' } },
  'project-team': { teams: ['sponsor', 'project', 'project', 'project', 'operations', 'operations'], connections: { direction: 'planning', handover: 'deployment', feedback: 'maintenance' } },
  'shared-service': { teams: ['requester', 'service', 'service', 'requester', 'service', 'service'], connections: { request: 'planning', response: 'deployment' } },
  'stream-aligned': { teams: ['stream', 'enablement', 'stream', 'stream', 'operations', 'stream'], connections: { enable: 'design', deliver: 'deployment', learn: 'maintenance' } },
  matrix: { teams: ['sponsor', 'practice', 'delivery', 'practice', 'delivery', 'sponsor'], connections: { priority: 'planning', expertise: 'design', review: 'testing' } },
  'tiger-team': { teams: ['response', 'specialists', 'response', 'specialists', 'owner', 'owner'], connections: { diagnose: 'planning', resolve: 'testing', return: 'deployment' } },
});
const STAGE_PHASES = Object.freeze({ understand: 'planning', build: 'implementation', review: 'testing' });

export function projectDeliveryBoard({ arrangement, plan }) {
  const phases = PHASES.map(phase => ({ ...phase, teams: [], connections: [], sessions: [] }));
  const byPhase = new Map(phases.map(phase => [phase.id, phase]));
  const teams = new Map(arrangement.teams.map(row => [row.slotId, row]));
  const layout = LAYOUTS[arrangement.templateId];
  const includedTeams = new Set(), linkedPhases = new Map(), stageLabels = new Map(), stagePhases = new Map();
  for (const [index, slot] of (layout?.teams ?? []).entries()) {
    const team = teams.get(slot);
    if (team) { phases[index].teams.push(team); includedTeams.add(slot); }
  }
  for (const team of arrangement.teams) if (!includedTeams.has(team.slotId)) phases[0].teams.push(team);
  for (const row of arrangement.connections) {
    const phase = byPhase.get(layout?.connections[row.slotId]) ?? phases[0];
    phase.connections.push(row);
    for (const id of row.connection.workIds) if (!linkedPhases.has(id)) linkedPhases.set(id, phase.id);
  }
  for (const stage of plan.scoreSettings.stages) for (const id of stage.workIds) {
    if (!stageLabels.has(id)) stageLabels.set(id, []);
    stageLabels.get(id).push(stage.label);
    if (STAGE_PHASES[stage.id] && !stagePhases.has(id)) stagePhases.set(id, STAGE_PHASES[stage.id]);
  }
  for (const work of plan.work) {
    const phaseId = stagePhases.get(work.id) ?? linkedPhases.get(work.id) ?? 'planning';
    byPhase.get(phaseId).sessions.push({ work, stageLabels: stageLabels.get(work.id) ?? [] });
  }
  return phases;
}

// The receiver owns proposed records and edit routes. This view owns only its
// phase focus and the return to the full delivery reading.
export function createDeliveryBoard(document, { arrangement, plan, acceptedSessionIds,
  onNavigate, onSession, viewState = { phaseId: null, overviewScroll: 0, returnPhase: null } }) {
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (label, className, action) => {
    const control = node('button', label, className); control.type = 'button';
    control.addEventListener('click', action); return control;
  };
  const phases = projectDeliveryBoard({ arrangement, plan });
  const people = new Map(plan.people.map(person => [person.id, person]));
  const teamNames = new Map(plan.teams.map(team => [team.id, team.label]));
  const root = node('section', undefined, 'studio-delivery'); root.dataset.deliveryTemplate = arrangement.templateId;
  const scope = node('header', undefined, 'studio-delivery__scope');
  const current = node('h5', 'Delivery overview'); current.dataset.deliveryCurrent = '';
  const back = button('← Delivery overview', 'studio-delivery__return', () => selectPhase(null)); back.dataset.deliveryOverview = '';
  const context = node('p', `${arrangement.label} · illustrative delivery phases`, 'studio-delivery__context');
  scope.append(back, current, context);
  const board = node('div', undefined, 'studio-delivery__board'); board.tabIndex = 0;
  board.setAttribute('role', 'region'); board.setAttribute('aria-label', 'Delivery phases; scroll across the board');
  root.append(scope, board);
  let selectedPhase = viewState.phaseId;
  const columns = new Map(), phaseKeys = new Map();
  function selectPhase(id, { focus = true } = {}) {
    if (id !== null && !columns.has(id)) return;
    if (selectedPhase === null && id !== null) {
      viewState.overviewScroll = board.scrollLeft; viewState.returnPhase = id;
    }
    selectedPhase = id; board.dataset.deliveryScope = id ?? 'overview';
    viewState.phaseId = id;
    current.textContent = id === null ? 'Delivery overview' : phases.find(phase => phase.id === id).label;
    back.hidden = id === null;
    for (const [key, column] of columns) {
      column.hidden = id !== null && key !== id;
      phaseKeys.get(key).setAttribute('aria-label', id === key ? `Return from ${column.dataset.deliveryLabel} to delivery overview` : `Open ${column.dataset.deliveryLabel} phase`);
    }
    board.scrollLeft = id === null ? viewState.overviewScroll : 0;
    if (focus) {
      board.dataset.deliveryArrival = id === null ? 'overview' : 'phase';
      const target = id === null ? phaseKeys.get(viewState.returnPhase) : back;
      if (id === null && target) {
        // A resized rack can need a different return offset. Reveal its key
        // inside this scroller while leaving the page's vertical position alone.
        const bounds = board.getBoundingClientRect(), key = target.getBoundingClientRect();
        if (key.left < bounds.left) board.scrollLeft += key.left - bounds.left;
        else if (key.right > bounds.right) board.scrollLeft += key.right - bounds.right;
        viewState.overviewScroll = board.scrollLeft;
      }
      target?.focus({ preventScroll: true });
    }
  }
  function collection(label, className) {
    const group = node('div', undefined, className); group.append(node('h6', label)); return group;
  }
  for (const phase of phases) {
    const lane = node('section', undefined, 'studio-delivery__phase');
    lane.dataset.deliveryPhase = phase.id; lane.dataset.deliveryLabel = phase.label;
    const title = node('h5');
    const key = button(phase.label, 'studio-delivery__phase-key native-control--navigate', () => selectPhase(selectedPhase === phase.id ? null : phase.id));
    key.dataset.deliveryOpen = phase.id; title.append(key);
    lane.append(title, node('p', phase.purpose, 'studio-delivery__purpose'));
    const content = node('div', undefined, 'studio-delivery__content');
    if (phase.teams.length) {
      const group = collection('People', 'studio-delivery__group studio-delivery__teams');
      for (const binding of phase.teams) {
        const card = node('article', undefined, 'studio-delivery__team'); card.dataset.deliveryTeam = binding.slotId;
        const inspect = () => onNavigate({ kind: 'template-team', id: binding.slotId });
        const team = button(binding.team.label, 'studio-delivery__team-key native-control--navigate', inspect);
        if (binding.slotLabel !== binding.team.label) team.append(node('small', binding.slotLabel));
        const members = node('ul', undefined, 'studio-delivery__people');
        for (const id of binding.team.personIds) {
          const person = people.get(id); if (!person) continue;
          const item = node('li'), control = button(person.label, 'studio-delivery__person native-control--navigate', inspect);
          control.dataset.deliveryPerson = id; control.setAttribute('aria-label', `${person.label}. Edit people in ${binding.team.label}.`);
          item.append(control); members.append(item);
        }
        if (!members.children.length) {
          const item = node('li'); item.append(button('Choose people', 'studio-delivery__person native-control--navigate', inspect)); members.append(item);
        }
        card.append(team, members); group.append(card);
      }
      content.append(group);
    }
    if (phase.sessions.length) {
      const group = collection('Shared work', 'studio-delivery__group studio-delivery__sessions');
      for (const { work, stageLabels } of phase.sessions) {
        const control = button('', 'studio-delivery__session native-control--navigate', () => onSession(work.id));
        control.dataset.deliverySession = work.id;
        if (acceptedSessionIds.has(work.id)) control.dataset.studioSessionId = work.id;
        control.dataset.funding = work.funding;
        control.append(node('strong', work.label), node('small', `${duration(work.minutesPerOccurrence)} each · ${work.occurrences} sessions`));
        if (stageLabels.length) control.append(node('small', stageLabels.join(' · '), 'studio-delivery__stage'));
        else control.append(node('small', 'Supporting work', 'studio-delivery__stage'));
        control.setAttribute('aria-label', `${work.label}. ${acceptedSessionIds.has(work.id) ? 'Open session settings.' : 'Open proposed session settings.'}`);
        group.append(control);
      }
      content.append(group);
    }
    if (phase.connections.length) {
      const group = collection('Handoffs', 'studio-delivery__group studio-delivery__handoffs');
      for (const binding of phase.connections) {
        const edge = binding.connection;
        const control = button('', 'studio-delivery__handoff native-control--navigate', () => onNavigate({ kind: 'template-connection', id: binding.slotId }));
        control.dataset.deliveryConnection = binding.slotId; control.dataset.status = edge.status;
        control.append(node('strong', binding.slotLabel), node('small', `${teamNames.get(edge.senderTeamId)} → ${teamNames.get(edge.receiverTeamId)}`),
          node('small', edge.sharedObject || 'Choose shared work', 'studio-delivery__object'));
        control.title = edge.sharedObject || 'Choose shared work';
        if (edge.status === 'paused') control.append(node('small', 'Paused'));
        group.append(control);
      }
      content.append(group);
    }
    lane.append(content); board.append(lane); columns.set(phase.id, lane); phaseKeys.set(phase.id, key);
  }
  selectPhase(columns.has(viewState.phaseId) ? viewState.phaseId : null, { focus: false });
  return root;
}
