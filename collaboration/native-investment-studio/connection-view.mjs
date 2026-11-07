import { projectCoordinationArrangements } from './coordination-arrangements.mjs';
import { createContributionViewModel } from './contribution-view-model.mjs';
import { createTeamLanes } from './arrangement-surfaces.mjs';

// About owns the .native-connections route styles. This receiver reads an
// accepted projection; the parent owns edits, publication and monetary values.
const MODELS = new WeakMap();
const INSTANCES = new WeakMap();
const EMPTY = Object.freeze([]);
const SVG = 'http://www.w3.org/2000/svg';
export const CONNECTION_PAGE_SIZE = 8;
export const CONNECTION_GEOMETRY = Object.freeze({ width: 880, rowHeight: 64, top: 68,
  minimumHeight: 204, nodeWidth: 228, nodeHeight: 52, senderX: 20, receiverX: 632 });

const named = row => `${row.label}${row.lifecycle === 'retired' ? ' · retired' : ''}`;
function observationLabel(observation) {
  if (observation.code === 'unassigned-human') return 'Receiver unassigned';
  if (observation.code === 'retired-human') return 'Receiver retired';
  if (observation.code === 'retired-team') return observation.field === 'senderTeamId' ? 'Sending team retired' : 'Receiving team retired';
  if (observation.code === 'retired-supporting-work') return 'Retired supporting session';
  return null;
}

// The exact immutable projection is the cache identity. An imported plan can
// share a numeric revision while carrying a different accepted state.
export function createConnectionViewModel(projection) {
  if (MODELS.has(projection)) return MODELS.get(projection);
  const state = projection.state;
  const people = new Map(state.people.map(row => [row.id, row]));
  const work = new Map(state.work.map(row => [row.id, row]));
  const teams = Object.freeze(state.teams.map(row => Object.freeze({ id: row.id, label: row.label,
    lifecycle: row.lifecycle, name: named(row) })));
  const teamIndex = new Map(teams.map(row => [row.id, row]));
  const outgoing = new Map(teams.map(row => [row.id, []]));
  const incoming = new Map(teams.map(row => [row.id, []]));
  const observations = new Map(state.connections.map(row => [row.id, []]));
  for (const observation of projection.observations) {
    if (observation.collection !== 'connections') continue;
    const label = observationLabel(observation);
    if (label) observations.get(observation.id).push(label);
  }
  const positions = new Map();
  const connections = Object.freeze(state.connections.map((row, position) => {
    const sender = teamIndex.get(row.senderTeamId), receiver = teamIndex.get(row.receiverTeamId);
    const human = row.receiverPersonId === null ? null : people.get(row.receiverPersonId);
    const standing = Object.freeze([...new Set([row.status === 'paused' ? 'Paused' : 'Active', ...observations.get(row.id)])]);
    const supportingWork = Object.freeze(row.workIds.map(id => {
      const item = work.get(id);
      return Object.freeze({ id, label: item.label, lifecycle: item.lifecycle, name: named(item) });
    }));
    const result = Object.freeze({ id: row.id, senderTeamId: sender.id, receiverTeamId: receiver.id,
      senderName: sender.name, receiverName: receiver.name, receiverPersonId: row.receiverPersonId,
      receiverPersonName: human ? named(human) : 'Unassigned', sharedObject: row.sharedObject,
      responseExpectation: row.responseExpectation, status: row.status, standing,
      supportingWork, workIds: Object.freeze([...row.workIds]), label: `${sender.name} → ${receiver.name}`,
      stateText: standing.join(' · ') });
    outgoing.get(sender.id).push(row.id); incoming.get(receiver.id).push(row.id); positions.set(row.id, position);
    return result;
  }));
  for (const map of [outgoing, incoming]) for (const values of map.values()) Object.freeze(values);
  const connectionIndex = new Map(connections.map(row => [row.id, row]));
  const model = Object.freeze({ teams, connections,
    team: id => teamIndex.get(id) ?? null,
    connection: id => connectionIndex.get(id) ?? null,
    position: id => positions.get(id) ?? -1,
    outgoing: id => outgoing.get(id) ?? EMPTY,
    incoming: id => incoming.get(id) ?? EMPTY });
  MODELS.set(projection, model);
  return model;
}

// Paging changes the available list/cables; selection remains with its record.
// This owner stores presentation state only, independently for each mount.
export function createConnectionViewState(projection) {
  let model = createConnectionViewModel(projection), selectedId = model.connections[0]?.id ?? null, page = 0;
  let pageRows = Object.freeze(model.connections.slice(0, CONNECTION_PAGE_SIZE));
  let current;
  function snapshot(rebuildPage = false) {
    if (rebuildPage) pageRows = Object.freeze(model.connections.slice(page * CONNECTION_PAGE_SIZE, (page + 1) * CONNECTION_PAGE_SIZE));
    current = Object.freeze({ model, selectedId, selected: model.connection(selectedId), page,
      pageCount: Math.max(1, Math.ceil(model.connections.length / CONNECTION_PAGE_SIZE)),
      connections: pageRows, selectedOnPage: selectedId !== null && Math.floor(model.position(selectedId) / CONNECTION_PAGE_SIZE) === page });
  }
  snapshot();
  return Object.freeze({ read: () => current,
    refresh(nextProjection) {
      const next = createConnectionViewModel(nextProjection);
      if (next === model) return false;
      model = next;
      if (!model.connection(selectedId)) selectedId = model.connections[0]?.id ?? null;
      page = Math.min(page, Math.max(0, Math.ceil(model.connections.length / CONNECTION_PAGE_SIZE) - 1));
      snapshot(true); return true;
    },
    select(id) {
      const position = model.position(id);
      if (position < 0) return false;
      const nextPage = Math.floor(position / CONNECTION_PAGE_SIZE);
      if (selectedId !== id || page !== nextPage) {
        const rebuild = page !== nextPage;
        selectedId = id; page = nextPage; snapshot(rebuild);
      }
      return true;
    },
    showPage(next) {
      if (!Number.isSafeInteger(next) || next < 0 || next >= current.pageCount) return false;
      if (page !== next) { page = next; snapshot(true); }
      return true;
    } });
}

// Sender and receiver racks have explicit roles. A team appearing in both
// racks keeps one canonical identity; its position encodes role, not capacity.
export function connectionPageGeometry(view) {
  const sourceEdges = new Map(), targetEdges = new Map();
  for (const edge of view.connections) {
    if (!sourceEdges.has(edge.senderTeamId)) sourceEdges.set(edge.senderTeamId, []);
    if (!targetEdges.has(edge.receiverTeamId)) targetEdges.set(edge.receiverTeamId, []);
    sourceEdges.get(edge.senderTeamId).push(edge.id); targetEdges.get(edge.receiverTeamId).push(edge.id);
  }
  const { senderX, receiverX, nodeWidth, nodeHeight, rowHeight, top, width, minimumHeight } = CONNECTION_GEOMETRY;
  const rack = (edges, role, x) => {
    let y = top;
    return Object.freeze(view.model.teams.filter(team => edges.has(team.id)).map(team => {
      const height = Math.max(nodeHeight, edges.get(team.id).length * 24);
      const node = Object.freeze({ teamId: team.id, label: team.label, name: team.name, lifecycle: team.lifecycle,
        role, x, y, width: nodeWidth, height });
      y += height + rowHeight - nodeHeight; return node;
    }));
  };
  const sending = rack(sourceEdges, 'sender', senderX), receiving = rack(targetEdges, 'receiver', receiverX);
  const sourceNodes = new Map(sending.map(node => [node.teamId, node])), targetNodes = new Map(receiving.map(node => [node.teamId, node]));
  const ports = (nodes, edges) => {
    const result = new Map();
    for (const node of nodes.values()) {
      const ids = edges.get(node.teamId);
      ids.forEach((id, index) => result.set(id, node.y + node.height / 2 + (index - (ids.length - 1) / 2) * 24));
    }
    return result;
  };
  const sourcePorts = ports(sourceNodes, sourceEdges), targetPorts = ports(targetNodes, targetEdges);
  const edges = Object.freeze(view.connections.map(edge => {
    const start = sourceNodes.get(edge.senderTeamId), end = targetNodes.get(edge.receiverTeamId);
    const x1 = start.x + start.width, x2 = end.x;
    const y1 = sourcePorts.get(edge.id), y2 = targetPorts.get(edge.id);
    return Object.freeze({ id: edge.id, path: `M ${x1} ${y1} C ${x1 + 136} ${y1}, ${x2 - 136} ${y2}, ${x2} ${y2}`,
      arrow: `${x2},${y2} ${x2 - 10},${y2 - 5} ${x2 - 10},${y2 + 5}`,
      status: edge.status, label: `${edge.label}. ${edge.sharedObject}. ${edge.stateText}.` });
  }));
  const bottom = nodes => nodes.length ? nodes.at(-1).y + nodes.at(-1).height + 16 : top;
  return Object.freeze({ width, height: Math.max(minimumHeight, bottom(sending), bottom(receiving)),
    sending, receiving, edges });
}

function labelLines(value) {
  const characters = [...value];
  if (characters.length <= 26) return [value];
  return [characters.slice(0, 26).join(''), `${characters.slice(26, 51).join('')}${characters.length > 51 ? '…' : ''}`];
}

const ARRANGEMENT_POSITIONS = Object.freeze({
  pod: { pod: [240, 200], partner: [720, 200] },
  guild: { practice: [480, 110], delivery: [480, 340] },
  'project-team': { sponsor: [150, 100], project: [480, 240], operations: [810, 380] },
  'shared-service': { requester: [190, 225], service: [690, 225] },
  'stream-aligned': { stream: [480, 235], enablement: [170, 105], operations: [790, 365] },
  matrix: { delivery: [480, 330], practice: [200, 110], sponsor: [760, 110] },
  'tiger-team': { response: [480, 210], specialists: [160, 210], owner: [800, 360] },
});

// Template slots explain placement. Every cable still reads the current
// connection's endpoints, including a team added through an ordinary edit.
export function arrangementGeometry(arrangement, plan) {
  const positions = ARRANGEMENT_POSITIONS[arrangement.templateId], nodes = [], byId = new Map();
  for (const row of arrangement.teams) {
    const [x, y] = positions[row.slotId];
    const node = { id: row.team.id, slotId: row.slotId, label: row.team.label, role: row.slotLabel, x, y };
    nodes.push(node); byId.set(node.id, node);
  }
  const actualIds = [...new Set(arrangement.connections.flatMap(row => [row.connection.senderTeamId, row.connection.receiverTeamId]))];
  for (const id of actualIds) if (!byId.has(id)) {
    const index = nodes.length - arrangement.teams.length, team = plan.teams.find(row => row.id === id);
    const node = { id, slotId: null, label: team?.label ?? id, role: 'Other connected team', x: 180 + (index % 3) * 300, y: 540 + Math.floor(index / 3) * 130 };
    nodes.push(node); byId.set(id, node);
  }
  const lanes = new Map();
  for (const row of arrangement.connections) {
    const key = JSON.stringify([row.connection.senderTeamId, row.connection.receiverTeamId].sort());
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key).push(row.connection.id);
  }
  const edges = arrangement.connections.map(row => {
    const from = byId.get(row.connection.senderTeamId), to = byId.get(row.connection.receiverTeamId);
    const siblings = lanes.get(JSON.stringify([from.id, to.id].sort())), laneIndex = siblings.indexOf(row.connection.id);
    const lane = (laneIndex - (siblings.length - 1) / 2) * 24;
    const vertical = Math.abs(to.y - from.y) > Math.abs(to.x - from.x), bend = 65;
    let path, end, tangent;
    if (from === to) {
      const spread = 50 + laneIndex * 24, rise = 145 + laneIndex * 28;
      path = `M ${from.x - spread} ${from.y - 36} C ${from.x - 150 - laneIndex * 24} ${from.y - rise}, ${from.x + 150 + laneIndex * 24} ${from.y - rise}, ${from.x + spread} ${from.y - 36}`;
      end = [from.x + spread, from.y - 36]; tangent = [-.6, .8];
    } else if (vertical) {
      const sign = Math.sign(to.y - from.y), x = from.x + lane, endX = to.x + lane;
      const lateral = (Math.sign(lane) || 1) * bend;
      path = `M ${x} ${from.y + sign * 36} C ${x + lateral} ${from.y + sign * 110}, ${endX + lateral} ${to.y - sign * 110}, ${endX} ${to.y - sign * 36}`;
      end = [endX, to.y - sign * 36]; tangent = [0, sign];
    } else {
      const sign = Math.sign(to.x - from.x), y = from.y + lane, endY = to.y + lane;
      path = `M ${from.x + sign * 110} ${y} C ${from.x + sign * (110 + bend)} ${y}, ${to.x - sign * (110 + bend)} ${endY}, ${to.x - sign * 110} ${endY}`;
      end = [to.x - sign * 110, endY]; tangent = [sign, 0];
    }
    const [x, y] = end, [dx, dy] = tangent;
    return { ...row, path, arrow: `${x},${y} ${x - dx * 12 + dy * 5},${y - dy * 12 - dx * 5} ${x - dx * 12 - dy * 5},${y - dy * 12 + dx * 5}` };
  });
  return { width: 960, height: Math.max(460, ...nodes.map(row => row.y + 80)), nodes, edges };
}

export function createArrangementTeamLanes(document, { arrangement, plan, reading = 'accepted', onNavigate = () => {} }) {
  const slots = new Map(arrangement.teams.map(row => [row.team.id, row.slotId]));
  return createTeamLanes(document, { plan, teams: arrangement.teams.map(row => row.team), proposed: reading === 'proposed',
    onAdd: reading === 'accepted' ? target => onNavigate({ kind: `create-${target.kind}` }) : null,
    onNavigate(target) {
      onNavigate(reading === 'proposed' ? { kind: 'template-team', id: slots.get(target.id) } : target);
    } });
}

export function createArrangementReading(document, { arrangement, plan, reading = 'accepted', onNavigate = () => {}, includeTeamLanes = true, includeConnections = true }) {
  const node = (tag, text, className) => { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item; };
  const svgNode = (tag, attributes = {}, text = '') => { const item = document.createElementNS(SVG, tag); for (const [key, value] of Object.entries(attributes)) item.setAttribute(key, String(value)); item.textContent = text; return item; };
  const section = node('section', undefined, 'native-arrangement');
  Object.assign(section.dataset, { arrangementId: arrangement.id, arrangementTemplate: arrangement.templateId, arrangementReading: reading, arrangementAdapted: String(arrangement.adapted) });
  const standing = { accepted: 'Current arrangement', proposed: 'Proposed structure', example: 'Example arrangement' }[reading];
  const heading = node('h4', `${standing} · ${arrangement.label}`, 'native-arrangement__identity');
  const status = node('p', reading === 'proposed' ? 'Proposed teams and handoffs · Apply to keep.'
    : reading === 'example' ? 'Choose an arrangement to use it.' : arrangement.adapted ? 'Adapted arrangement. The cables show the current connection endpoints; the original slot roles remain labeled.' : 'The current connections follow this arrangement’s roles.', 'native-arrangement__status');
  const viewport = node('div', undefined, 'native-arrangement__viewport'); viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', `${arrangement.label} topology; scroll to inspect the complete structure`);
  const geometry = arrangementGeometry(arrangement, plan), svg = svgNode('svg', { class: 'native-arrangement__diagram', viewBox: `0 0 ${geometry.width} ${geometry.height}`, width: geometry.width, height: geometry.height, role: 'group', 'aria-label': `${standing} · ${arrangement.label} structure` });
  svg.append(svgNode('title', {}, `${arrangement.label}: ${arrangement.purpose}`), svgNode('desc', {}, 'The named teams and current directed connections are available as buttons in the reading below. Dashed cables are paused.'));
  const boundary = (x, y, width, height, label) => {
    const group = svgNode('g', { class: 'native-arrangement__boundary', 'data-arrangement-boundary': label });
    group.append(svgNode('rect', { x, y, width, height, rx: 20 }), svgNode('text', { x: x + 18, y: y + 27 }, label)); svg.append(group);
  };
  if (arrangement.templateId === 'pod') boundary(55, 70, 850, 280, 'Shared work and feedback');
  else if (arrangement.templateId === 'guild') { boundary(270, 35, 420, 135, 'Practice guidance'); boundary(190, 260, 580, 150, 'Delivery and learning'); }
  else if (arrangement.templateId === 'project-team') { boundary(20, 30, 260, 145, 'Direction'); boundary(350, 170, 260, 145, 'Project delivery'); boundary(680, 310, 260, 145, 'Receiving the work'); }
  else if (arrangement.templateId === 'shared-service') boundary(525, 65, 370, 330, 'Service responsibility');
  else if (arrangement.templateId === 'stream-aligned') boundary(330, 135, 300, 190, 'Customer outcome');
  else if (arrangement.templateId === 'matrix') boundary(45, 45, 865, 390, 'Shared assignment');
  else boundary(330, 110, 300, 190, 'Focused response');
  for (const edge of geometry.edges) {
    const row = edge.connection, group = svgNode('g', { class: 'native-arrangement__edge', 'data-arrangement-connection': row.id, 'data-sender-team': row.senderTeamId, 'data-receiver-team': row.receiverTeamId, 'data-status': row.status, 'data-adapted': String(edge.adapted) });
    group.setAttribute('role', 'button'); group.setAttribute('tabindex', '-1'); group.setAttribute('aria-label', `${edge.slotLabel}: ${row.sharedObject || 'Shared object to choose'}`);
    group.setAttribute('data-arrangement-target-kind', reading !== 'accepted' ? 'template-connection' : 'connection'); group.setAttribute('data-arrangement-target-id', reading !== 'accepted' ? edge.slotId : row.id);
    group.append(svgNode('title', {}, `${edge.slotLabel}: ${row.sharedObject}`),
      svgNode('path', { d: edge.path, fill: 'none', class: 'native-arrangement__hit', 'aria-hidden': 'true' }),
      svgNode('path', { d: edge.path, fill: 'none', class: 'native-arrangement__cable' }), svgNode('polygon', { points: edge.arrow })); svg.append(group);
  }
  for (const team of geometry.nodes) {
    const group = svgNode('g', { class: 'native-arrangement__team', 'data-arrangement-team': team.id, 'data-arrangement-slot': team.slotId ?? 'external' });
    group.setAttribute('role', 'button'); group.setAttribute('tabindex', '-1'); group.setAttribute('aria-label', `${team.role}: ${team.label}`);
    group.setAttribute('data-arrangement-target-kind', reading !== 'accepted' ? 'template-team' : 'team'); group.setAttribute('data-arrangement-target-id', reading !== 'accepted' ? team.slotId : team.id);
    group.append(svgNode('title', {}, `${team.role}: ${team.label}`), svgNode('rect', { x: team.x - 110, y: team.y - 36, width: 220, height: 72, rx: 7 }),
      svgNode('text', { x: team.x, y: team.y - 13, 'text-anchor': 'middle', class: 'native-arrangement__role' }, team.role));
    const text = svgNode('text', { x: team.x, y: team.y + 9, 'text-anchor': 'middle' });
    labelLines(team.label).forEach((line, index) => text.append(svgNode('tspan', { x: team.x, dy: index ? 17 : 0 }, line))); group.append(text); svg.append(group);
  }
  viewport.append(svg);
  const connections = node('div', undefined, 'studio-arrangement-connections');
  const route = (label, kind, id) => { const control = node('button', label, 'native-control--navigate'); control.type = 'button'; Object.assign(control.dataset, { arrangementTargetKind: kind, arrangementTargetId: id }); return control; };
  for (const row of arrangement.connections) {
    const edge = row.connection, from = geometry.nodes.find(team => team.id === edge.senderTeamId), to = geometry.nodes.find(team => team.id === edge.receiverTeamId);
    const control = route(row.slotLabel, reading !== 'accepted' ? 'template-connection' : 'connection', reading !== 'accepted' ? row.slotId : edge.id);
    control.title = `${from.label} → ${to.label}: ${edge.sharedObject || 'Shared work'}${edge.status === 'paused' ? ' · Paused' : ''}`;
    connections.append(control);
  }
  section.append(heading, status);
  if (includeTeamLanes) section.append(createArrangementTeamLanes(document, { arrangement, plan, reading, onNavigate }));
  section.append(viewport);
  if (includeConnections) section.append(connections);
  section.addEventListener('click', event => { const control = event.target.closest('[data-arrangement-target-kind]'); if (control && section.contains(control)) onNavigate({ kind: control.dataset.arrangementTargetKind, id: control.dataset.arrangementTargetId }); });
  svg.addEventListener('keydown', event => { const control = event.target.closest('[data-arrangement-target-kind]'); if (control && ['Enter', ' '].includes(event.key)) { event.preventDefault(); onNavigate({ kind: control.dataset.arrangementTargetKind, id: control.dataset.arrangementTargetId }); } });
  return section;
}

// The created subtree is the receiver's sole DOM ownership. About supplies its
// static reading and styles; teardown leaves neighboring content untouched.
export function mountConnectionView(root, { projection, onSelect = () => {}, onNavigate = () => {}, onDetachArrangement = () => {} }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, state = createConnectionViewState(projection);
  let disposed = false, generation = 0, controls = new Map(), cableControls = new Map(), rendered = null;
  let acceptedProjection = projection, selectedArrangement = null, knownArrangements = new Set();
  const element = (tag, className, text = '') => {
    const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
  };
  const svgElement = (tag, attributes = {}, text = '') => {
    const node = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    node.textContent = text; return node;
  };
  const button = (text, action) => {
    const node = element('button', 'native-connections__button', text); node.type = 'button';
    node.dataset.connectionAction = action;
    if (action === 'select') node.className += ' native-control--navigate';
    return node;
  };
  const host = element('div', 'native-connections');
  const arrangementHost = element('section', 'native-arrangement__accepted');
  const arrangementLabel = element('label', 'native-arrangement__choices', 'Read an accepted arrangement');
  const arrangementChoice = document.createElement('select'); arrangementChoice.dataset.arrangementChoice = ''; arrangementLabel.append(arrangementChoice);
  const arrangementBody = element('div', 'native-arrangement__body');
  const detach = button('Use these connections without the template', 'detach-arrangement');
  arrangementHost.append(arrangementLabel, arrangementBody, detach);
  const heading = element('p', 'native-connections__count');
  const viewport = element('div', 'native-connections__viewport');
  viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', 'Coordination diagram; scroll horizontally to follow a connection'); viewport.tabIndex = 0;
  const diagram = svgElement('svg', { class: 'native-connections__diagram', role: 'group', 'aria-label': 'Directed team connections',
    'font-family': 'system-ui, sans-serif', 'font-size': 14 });
  viewport.append(diagram);
  const empty = element('p', 'native-connections__empty');
  const list = element('ol', 'native-connections__list'); list.setAttribute('aria-label', 'Connections');
  const navigation = element('nav', 'native-connections__pages'); navigation.setAttribute('aria-label', 'Connection pages');
  const previous = button('Previous connections', 'previous'), next = button('Next connections', 'next');
  const pageLabel = element('span', 'native-connections__page-label'); pageLabel.setAttribute('aria-live', 'polite');
  navigation.append(previous, pageLabel, next);
  const detail = element('details', 'native-connections__detail');
  detail.append(element('summary', '', 'Selected connection and supporting work'));
  const detailTitle = element('p', 'native-connections__detail-title');
  const detailObject = element('p', 'native-connections__object');
  const detailStanding = element('p', 'native-connections__standing');
  const detailReceiver = element('p', 'native-connections__receiver');
  const detailWork = element('details', 'native-connections__work');
  const workSummary = element('summary', 'native-connections__work-summary');
  const workList = element('ul', 'native-connections__work-list'); detailWork.append(workSummary, workList);
  const noWork = element('p', 'native-connections__no-work', 'Supporting sessions: none selected');
  const detailResponse = element('p', 'native-connections__response');
  const contributions = element('section', 'native-connections__contributions'); contributions.dataset.connectionContributions = '';
  const returnSelected = button('Return to selected connection', 'return');
  detail.append(detailTitle, detailObject, detailStanding, detailReceiver, detailWork, noWork, detailResponse, contributions, returnSelected);
  const accepted = element('details', 'studio-accepted-connections');
  accepted.append(element('summary', '', 'Current connections and owners'), arrangementHost, heading, viewport, empty, list, navigation, detail);
  host.append(accepted);

  function renderArrangements(view) {
    const reading = projectCoordinationArrangements(acceptedProjection.state), ids = new Set(reading.arrangements.map(row => row.id));
    const added = reading.arrangements.filter(row => !knownArrangements.has(row.id));
    if (added.length) selectedArrangement = added.at(-1).id;
    else if (selectedArrangement !== 'all' && !ids.has(selectedArrangement)) selectedArrangement = reading.arrangements[0]?.id ?? 'all';
    knownArrangements = ids;
    const options = reading.arrangements.map(row => { const option = document.createElement('option'); option.value = row.id; option.textContent = `${row.label}${row.adapted ? ' · adapted' : ''} · ${row.teams.map(binding => binding.team.label).join(' / ')}`; return option; });
    const all = document.createElement('option'); all.value = 'all'; all.textContent = reading.arrangements.length ? 'All current connections' : 'Custom connections'; options.push(all);
    arrangementChoice.replaceChildren(...options); arrangementChoice.value = selectedArrangement;
    arrangementLabel.hidden = reading.arrangements.length === 0;
    const selected = reading.arrangements.find(row => row.id === selectedArrangement);
    detach.hidden = !selected; detach.dataset.arrangementId = selected?.id ?? '';
    if (selected) arrangementBody.replaceChildren(createArrangementReading(document, { arrangement: selected, plan: acceptedProjection.state,
      onNavigate(target) { if (disposed) return; if (target.kind === 'connection') select(target.id, { notify: true }); else onNavigate(target); } }));
    else arrangementBody.replaceChildren(element('h4', 'native-arrangement__identity', reading.arrangements.length ? 'All current connections' : 'Custom connections'),
      createTeamLanes(document, { plan: acceptedProjection.state, onNavigate,
        onAdd: target => onNavigate({ kind: `create-${target.kind}` }) }));
    viewport.hidden = Boolean(selected) || view.model.connections.length === 0;
  }

  function mark(id, selected) {
    for (const control of [controls.get(id), cableControls.get(id)]) {
      if (!control) continue;
      control.dataset.selected = String(selected);
      control.setAttribute('aria-current', String(selected));
    }
  }
  function drawNode(node) {
    const group = svgElement('g', { class: 'native-connections__team', 'data-team-id': node.teamId, 'data-team-role': node.role,
      'data-lifecycle': node.lifecycle });
    group.append(svgElement('title', {}, `${node.role === 'sender' ? 'Sending' : 'Receiving'} team: ${node.name}`),
      svgElement('rect', { x: node.x, y: node.y, width: node.width, height: node.height, rx: 4,
        fill: 'var(--native-paper, #fff7df)', stroke: 'currentColor' }));
    const text = svgElement('text', { x: node.x + 10, y: node.y + 20, fill: 'currentColor' });
    labelLines(node.name).forEach((line, index) => text.append(svgElement('tspan', { x: node.x + 10, dy: index ? 18 : 0 }, line)));
    group.append(text); return group;
  }
  function rebuild(view) {
    const geometry = connectionPageGeometry(view);
    controls = new Map(); cableControls = new Map();
    diagram.setAttribute('viewBox', `0 0 ${geometry.width} ${geometry.height}`);
    diagram.setAttribute('width', String(geometry.width)); diagram.setAttribute('height', String(geometry.height));
    diagram.replaceChildren(svgElement('title', {}, 'Teams send shared work to receiving teams'),
      svgElement('desc', {}, 'Each cable has a matching connection button below. Arrows point to receiving teams. Dashed cables are paused.'),
      svgElement('text', { x: 20, y: 32, fill: 'currentColor' }, 'Sending teams'),
      svgElement('text', { x: 632, y: 32, fill: 'currentColor' }, 'Receiving teams'));
    for (const edge of geometry.edges) {
      const group = svgElement('g', { class: 'native-connections__cable', role: 'button', tabindex: '-1',
        'data-connection-select': edge.id, 'data-status': edge.status, 'data-selected': 'false', 'aria-current': 'false', 'aria-label': edge.label });
      group.append(svgElement('title', {}, edge.label), svgElement('path', { d: edge.path, fill: 'none', stroke: 'currentColor',
        'stroke-width': 3, 'stroke-dasharray': edge.status === 'paused' ? '8 5' : 'none', 'pointer-events': 'none' }),
      svgElement('polygon', { points: edge.arrow, fill: 'currentColor', 'pointer-events': 'none' }),
      svgElement('path', { d: edge.path, fill: 'none', stroke: 'transparent', 'stroke-width': 18, 'pointer-events': 'stroke' }));
      diagram.append(group); cableControls.set(edge.id, group);
    }
    diagram.append(...geometry.sending.map(drawNode), ...geometry.receiving.map(drawNode));
    list.start = view.page * CONNECTION_PAGE_SIZE + 1;
    const items = view.connections.map(row => {
      const item = element('li', 'native-connections__item'), control = button('', 'select');
      control.dataset.connectionSelect = row.id; control.dataset.selected = 'false'; control.setAttribute('aria-current', 'false');
      control.append(element('span', 'native-connections__endpoints', row.label),
        element('span', 'native-connections__shared-object', row.sharedObject),
        element('span', 'native-connections__state', row.stateText));
      control.setAttribute('aria-label', `${row.label}. ${row.sharedObject}. ${row.stateText}.`);
      item.append(control); controls.set(row.id, control); return item;
    });
    list.replaceChildren(...items);
    const count = view.model.connections.length;
    heading.textContent = count ? `${count} ${count === 1 ? 'connection' : 'connections'} across ${view.model.teams.length} teams` : 'Team connections';
    const teamCount = view.model.teams.length;
    if (teamCount === 0) empty.textContent = 'Add teams, then connect the work they share.';
    else if (teamCount === 1) empty.textContent = 'Add another team in People, then connect the work they share.';
    else empty.textContent = `${teamCount} teams are ready. Add a connection to show how work moves between teams.`;
    empty.hidden = count > 0; viewport.hidden = count === 0; list.hidden = count === 0;
    navigation.hidden = view.pageCount === 1;
    previous.disabled = view.page === 0; next.disabled = view.page + 1 === view.pageCount;
    pageLabel.textContent = `Page ${view.page + 1} of ${view.pageCount}`;
  }
  function selection(view) {
    if (rendered?.selectedId !== view.selectedId) mark(rendered?.selectedId, false);
    mark(view.selectedId, true);
    detail.hidden = view.selected === null;
    if (!view.selected) return;
    const row = view.selected;
    detailTitle.textContent = row.label;
    detailObject.textContent = row.sharedObject;
    detailStanding.textContent = row.stateText;
    detailReceiver.textContent = `Receiver: ${row.receiverPersonName}`;
    workSummary.textContent = `Supporting sessions: ${row.supportingWork.length}`;
    workList.replaceChildren(...row.supportingWork.map(work => element('li', 'native-connections__work-item', work.name)));
    detailWork.hidden = row.supportingWork.length === 0;
    noWork.hidden = row.supportingWork.length !== 0;
    detailResponse.textContent = row.responseExpectation ?? '';
    detailResponse.hidden = row.responseExpectation === null;
    const contributionModel = createContributionViewModel(acceptedProjection), links = contributionModel.forConnection(row.id);
    contributions.replaceChildren(); contributions.hidden = links.length === 0;
    if (links.length) contributions.append(element('h5', '', 'Assistance and human review'));
    const route = (label, kind, id) => { const control = button(label, 'navigate'); control.className += ' native-control--navigate'; Object.assign(control.dataset, { connectionTargetKind: kind, connectionTargetId: id }); return control; };
    for (const link of links) {
      const contribution = contributionModel.contribution(link.contributionId), card = element('article', 'native-connections__contribution');
      card.dataset.contributionId = contribution.id;
      card.append(route(`Inspect ${contribution.label}`, 'contribution', contribution.id),
        element('p', '', 'This contribution and connection share the sessions listed below. The association describes planned support; the human review remains explicit.'));
      for (const [title, human, boundary] of [['Human review', contribution.receiver, contribution.reviewBoundary], ['Decision', contribution.decisionOwner, contribution.decisionBoundary]]) {
        const group = element('div', 'native-connections__human'); group.append(element('strong', '', title));
        group.append(human ? route(human.name, 'person', human.id) : element('p', '', 'Choose the accountable person'));
        group.append(element('p', '', boundary || (title === 'Human review' ? 'Describe what the receiver should review.' : 'Describe the decision this person will make.'))); card.append(group);
      }
      for (const id of link.sharedWorkIds) card.append(route(`Inspect ${acceptedProjection.state.work.find(work => work.id === id).label}`, 'work', id));
      for (const gap of contribution.gaps) card.append(element('p', 'native-connections__attention', gap.message));
      contributions.append(card);
    }
    returnSelected.hidden = view.selectedOnPage;
  }
  function paint() {
    const view = state.read();
    if (view === rendered) return;
    if (view.model !== rendered?.model || view.page !== rendered?.page) { rebuild(view); renderArrangements(view); }
    selection(view); rendered = view;
  }
  function select(id, { notify = false } = {}) {
    if (disposed || !state.select(id)) return false;
    const group = projectCoordinationArrangements(acceptedProjection.state).arrangements.find(row => row.connections.some(edge => edge.connection.id === id));
    selectedArrangement = group?.id ?? 'all';
    generation += 1; paint();
    if (!disposed) renderArrangements(state.read());
    // The external editor may dispose, replace or reselect this receiver.
    // Completion deliberately performs no DOM work after handing it control.
    if (notify) { accepted.open = true; detail.open = true; onSelect(id); }
    return true;
  }
  function showPage(page) {
    if (disposed || !state.showPage(page)) return false;
    generation += 1; paint(); return true;
  }
  function click(event) {
    const control = event.target.closest('[data-connection-select], [data-connection-action]');
    if (!control || !host.contains(control) || control.disabled || disposed) return;
    if (control.dataset.connectionSelect) { select(control.dataset.connectionSelect, { notify: true }); return; }
    const action = control.dataset.connectionAction, view = state.read();
    if (action === 'detach-arrangement') { onDetachArrangement(control.dataset.arrangementId); return; }
    if (action === 'navigate') { onNavigate({ kind: control.dataset.connectionTargetKind, id: control.dataset.connectionTargetId }); return; }
    if (action === 'previous') showPage(view.page - 1);
    else if (action === 'next') showPage(view.page + 1);
    else if (action === 'return' && view.selectedId !== null) {
      select(view.selectedId);
      if (!disposed) controls.get(view.selectedId)?.focus({ preventScroll: true });
    }
  }
  function keydown(event) {
    const control = event.target.closest('g[data-connection-select]');
    if (!control || !diagram.contains(control) || !['Enter', ' '].includes(event.key) || disposed) return;
    event.preventDefault(); select(control.dataset.connectionSelect, { notify: true });
  }
  function refresh(nextProjection) {
    if (disposed || !state.refresh(nextProjection)) return false;
    acceptedProjection = nextProjection;
    const epoch = ++generation, focused = host.contains(document.activeElement) ? document.activeElement?.dataset.connectionSelect : null;
    paint();
    if (!disposed && generation === epoch && focused) (controls.get(focused) ?? controls.get(state.read().selectedId))?.focus({ preventScroll: true });
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1;
    host.removeEventListener('click', click); diagram.removeEventListener('keydown', keydown);
    arrangementChoice.removeEventListener('change', chooseArrangement);
    host.remove(); controls.clear(); cableControls.clear(); INSTANCES.delete(root);
  }
  function chooseArrangement() { if (disposed) return; selectedArrangement = arrangementChoice.value; renderArrangements(state.read()); }
  function selectArrangement(id) { if (disposed || !projectCoordinationArrangements(acceptedProjection.state).arrangements.some(row => row.id === id)) return false; selectedArrangement = id; accepted.open = true; renderArrangements(state.read()); arrangementChoice.focus(); return true; }
  const receiver = Object.freeze({ read: state.read, refresh, select, selectArrangement, showPage, dispose });
  try {
    paint(); host.addEventListener('click', click); diagram.addEventListener('keydown', keydown); arrangementChoice.addEventListener('change', chooseArrangement);
    root.append(host); INSTANCES.set(root, receiver); return receiver;
  } catch (error) { dispose(); throw error; }
}
