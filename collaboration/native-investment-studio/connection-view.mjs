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

// The created subtree is the receiver's sole DOM ownership. About supplies its
// static reading and styles; teardown leaves neighboring content untouched.
export function mountConnectionView(root, { projection, onSelect = () => {} }) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root.ownerDocument, state = createConnectionViewState(projection);
  let disposed = false, generation = 0, controls = new Map(), cableControls = new Map(), rendered = null;
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
    node.dataset.connectionAction = action; return node;
  };
  const host = element('div', 'native-connections');
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
  const detail = element('div', 'native-connections__detail');
  const detailTitle = element('p', 'native-connections__detail-title');
  const detailObject = element('p', 'native-connections__object');
  const detailStanding = element('p', 'native-connections__standing');
  const detailReceiver = element('p', 'native-connections__receiver');
  const detailWork = element('details', 'native-connections__work');
  const workSummary = element('summary', 'native-connections__work-summary');
  const workList = element('ul', 'native-connections__work-list'); detailWork.append(workSummary, workList);
  const noWork = element('p', 'native-connections__no-work', 'Supporting sessions: none selected');
  const detailResponse = element('p', 'native-connections__response');
  const returnSelected = button('Return to selected connection', 'return');
  detail.append(detailTitle, detailObject, detailStanding, detailReceiver, detailWork, noWork, detailResponse, returnSelected);
  host.append(heading, viewport, empty, list, navigation, detail);

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
    returnSelected.hidden = view.selectedOnPage;
  }
  function paint() {
    const view = state.read();
    if (view === rendered) return;
    if (view.model !== rendered?.model || view.page !== rendered?.page) rebuild(view);
    selection(view); rendered = view;
  }
  function select(id, { notify = false } = {}) {
    if (disposed || !state.select(id)) return false;
    generation += 1; paint();
    // The external editor may dispose, replace or reselect this receiver.
    // Completion deliberately performs no DOM work after handing it control.
    if (notify) onSelect(id);
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
    const epoch = ++generation, focused = host.contains(document.activeElement) ? document.activeElement?.dataset.connectionSelect : null;
    paint();
    if (!disposed && generation === epoch && focused) (controls.get(focused) ?? controls.get(state.read().selectedId))?.focus({ preventScroll: true });
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true; generation += 1;
    host.removeEventListener('click', click); diagram.removeEventListener('keydown', keydown);
    host.remove(); controls.clear(); cableControls.clear(); INSTANCES.delete(root);
  }
  const receiver = Object.freeze({ read: state.read, refresh, select, showPage, dispose });
  try {
    paint(); host.addEventListener('click', click); diagram.addEventListener('keydown', keydown);
    root.append(host); INSTANCES.set(root, receiver); return receiver;
  } catch (error) { dispose(); throw error; }
}
