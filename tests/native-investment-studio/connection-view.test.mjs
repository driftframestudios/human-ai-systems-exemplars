import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { CONNECTION_PAGE_SIZE, CONNECTION_GEOMETRY, createConnectionViewModel,
  createConnectionViewState, connectionPageGeometry, mountConnectionView } from '../../collaboration/native-investment-studio/connection-view.mjs';

function plan(count = 2) {
  const result = createExamplePlan();
  result.teams.push({ id: 'receiving', label: 'Operations', personIds: ['product-one'], lifecycle: 'active' });
  result.connections = Array.from({ length: count }, (_, index) => ({ id: `connection-${index}`,
    senderTeamId: index % 2 ? 'receiving' : 'delivery', receiverTeamId: index % 2 ? 'delivery' : 'receiving',
    receiverPersonId: 'product-one', sharedObject: `Shared object ${index}`, responseExpectation: null,
    workIds: ['review'], status: index % 2 ? 'paused' : 'active' }));
  return result;
}
const projection = count => createStudio(plan(count)).read();

test('one accepted model preserves exact directed endpoints, human/work references and source-owned standing', () => {
  const source = plan(); source.teams[1].lifecycle = 'retired';
  source.people[0].lifecycle = 'retired'; source.work[0].lifecycle = 'retired';
  source.connections[1].receiverPersonId = null;
  const accepted = createStudio(source).read(), model = createConnectionViewModel(accepted);
  assert.deepEqual(model.teams.map(row => [row.id, row.label, row.lifecycle]), [
    ['delivery', 'Product and Engineering', 'active'], ['receiving', 'Operations', 'retired'],
  ]);
  assert.deepEqual(model.connections.map(row => [row.id, row.senderTeamId, row.receiverTeamId, row.status]), [
    ['connection-0', 'delivery', 'receiving', 'active'], ['connection-1', 'receiving', 'delivery', 'paused'],
  ]);
  assert.equal(model.connection('connection-0').receiverPersonName, `${source.people[0].label} · retired`);
  assert.deepEqual(model.connection('connection-0').standing, ['Active', 'Receiver retired', 'Receiving team retired', 'Retired supporting session']);
  assert.deepEqual(model.connection('connection-1').standing, ['Paused', 'Receiver unassigned', 'Sending team retired', 'Retired supporting session']);
  assert.equal(model.connection('connection-1').receiverPersonName, 'Unassigned');
  assert.deepEqual(model.connection('connection-0').workIds, ['review']);
  assert.equal(model.connection('connection-0').supportingWork[0].name, `${source.work[0].label} · retired`);
  assert.equal(accepted.result.plannedCommitmentCents, 120000);
});

test('private indexes expose frozen ordered adjacency and immutable value records', () => {
  const accepted = projection(4), model = createConnectionViewModel(accepted);
  assert.deepEqual(model.outgoing('delivery'), ['connection-0', 'connection-2']);
  assert.deepEqual(model.incoming('delivery'), ['connection-1', 'connection-3']);
  assert.deepEqual(model.outgoing('absent'), []); assert.equal(model.connection('absent'), null);
  assert.equal(model.team('receiving').name, 'Operations'); assert.equal(model.position('connection-3'), 3);
  assert.equal(model.position('__proto__'), -1);
  assert.throws(() => model.outgoing('delivery').push('another'), TypeError);
  assert.throws(() => { model.connections[0].workIds[0] = 'another'; }, TypeError);
  assert.throws(() => { model.teams[0].label = 'Changed'; }, TypeError);
  assert.ok(Object.isFrozen(model)); assert.ok(Object.isFrozen(model.connections[0].supportingWork[0]));
  assert.equal(Object.values(model).some(value => value instanceof Map), false);
});

test('cache identity follows the accepted projection rather than the numeric revision', () => {
  const original = projection(), sameRevision = plan(); sameRevision.teams[1].label = 'Renamed operations';
  const replacement = createStudio(sameRevision).read();
  assert.equal(original.state.revision, replacement.state.revision);
  const first = createConnectionViewModel(original);
  assert.strictEqual(createConnectionViewModel(original), first);
  const second = createConnectionViewModel(replacement); assert.notStrictEqual(second, first);
  assert.equal(second.connection('connection-0').receiverName, 'Renamed operations');
  assert.equal(first.connection('connection-0').receiverName, 'Operations');
});

test('visual derivation reads no monetary value and preserves zero/empty reference meanings', () => {
  const source = plan(1); source.connections[0].workIds = []; source.connections[0].receiverPersonId = null;
  const accepted = createStudio(source).read(); let amountReads = 0;
  const withGuard = { state: accepted.state, observations: accepted.observations,
    get result() { amountReads++; throw new Error('Accounting belongs to the accepted owner'); } };
  const model = createConnectionViewModel(withGuard);
  assert.equal(amountReads, 0); assert.deepEqual(model.connections[0].supportingWork, []);
  assert.equal(model.connections[0].responseExpectation, null); assert.equal(model.connections[0].receiverPersonName, 'Unassigned');
});

test('selection belongs to each receiver while immutable models are shared', () => {
  const accepted = projection(10), left = createConnectionViewState(accepted), right = createConnectionViewState(accepted);
  assert.strictEqual(left.read().model, right.read().model);
  assert.equal(left.select('connection-9'), true);
  assert.equal(left.read().page, 1); assert.equal(left.read().selectedId, 'connection-9');
  assert.equal(right.read().page, 0); assert.equal(right.read().selectedId, 'connection-0');
  assert.deepEqual(left.read().connections.map(row => row.id), ['connection-8', 'connection-9']);
  assert.equal(left.showPage(0), true); assert.equal(left.read().selectedId, 'connection-9');
  assert.equal(left.read().selectedOnPage, false);
  assert.equal(left.select(left.read().selectedId), true); assert.equal(left.read().page, 1);
  assert.equal(left.read().selectedOnPage, true);
});

test('same-page selection retains its list identity and invalid choices preserve the whole view', () => {
  const state = createConnectionViewState(projection(9)), initial = state.read();
  state.select('connection-7'); assert.strictEqual(state.read().connections, initial.connections);
  const selected = state.read(); state.select('connection-7'); assert.strictEqual(state.read(), selected);
  for (const id of [null, undefined, 'missing', '__proto__', {}, 1]) assert.equal(state.select(id), false);
  for (const page of [-1, 2, 0.5, '1', NaN, Infinity, null]) assert.equal(state.showPage(page), false);
  assert.strictEqual(state.read(), selected); assert.ok(Object.isFrozen(selected));
});

test('accepted refresh preserves surviving selection, clamps pages and recovers after removal', () => {
  const accepted = projection(10), view = createConnectionViewState(accepted);
  view.select('connection-9'); const before = view.read();
  assert.equal(view.refresh(accepted), false); assert.strictEqual(view.read(), before);
  const renamed = plan(10); renamed.connections[9].sharedObject = 'Updated object';
  view.refresh(createStudio(renamed).read()); assert.equal(view.read().selectedId, 'connection-9');
  assert.equal(view.read().selected.sharedObject, 'Updated object');
  view.refresh(projection(1)); assert.equal(view.read().selectedId, 'connection-0'); assert.equal(view.read().page, 0);
  view.refresh(projection(0)); assert.equal(view.read().selectedId, null); assert.deepEqual(view.read().connections, []);
  assert.equal(view.read().pageCount, 1); assert.equal(view.read().model.teams.length, 2);
});

test('two explicit racks preserve canonical team order and each directed cable identity', () => {
  const view = createConnectionViewState(projection(4)).read(), geometry = connectionPageGeometry(view);
  assert.deepEqual(geometry.sending.map(row => [row.teamId, row.role]), [['delivery', 'sender'], ['receiving', 'sender']]);
  assert.deepEqual(geometry.receiving.map(row => [row.teamId, row.role]), [['delivery', 'receiver'], ['receiving', 'receiver']]);
  assert.deepEqual(geometry.edges.map(row => row.id), view.connections.map(row => row.id));
  assert.equal(geometry.edges[0].status, 'active'); assert.equal(geometry.edges[1].status, 'paused');
  assert.match(geometry.edges[0].label, /Product and Engineering → Operations/u);
  assert.match(geometry.edges[0].path, /^M 248 /u); assert.match(geometry.edges[0].arrow, /^632,/u);
  assert.equal(geometry.width, 880); assert.ok(geometry.height <= 584);
  assert.equal(geometry.sending[0].x, 20); assert.equal(geometry.receiving[0].x, 632);
  assert.ok(Object.isFrozen(geometry.edges[0]));
});

test('eight parallel connections receive separate ports and paths', () => {
  const source = plan(8); source.connections.forEach(row => { row.senderTeamId = 'delivery'; row.receiverTeamId = 'receiving'; });
  const geometry = connectionPageGeometry(createConnectionViewState(createStudio(source).read()).read());
  assert.equal(new Set(geometry.edges.map(edge => edge.path)).size, 8);
  assert.equal(new Set(geometry.edges.map(edge => edge.arrow)).size, 8);
  assert.equal(geometry.sending.length, 1); assert.equal(geometry.receiving.length, 1);
  assert.equal(geometry.sending[0].height, 192); assert.equal(geometry.receiving[0].height, 192);
  const ports = geometry.edges.map(edge => Number(edge.path.split(' ')[2]));
  assert.ok(ports.slice(1).every((y, index) => y - ports[index] === 24), '18-unit pointer strokes have separate 24-unit lanes');
  assert.ok(geometry.height <= 584);
});

test('maximum admitted relationships remain reachable in bounded pages and at most sixteen role nodes', () => {
  const source = plan(0);
  while (source.teams.length < 32) source.teams.push({ id: `team-${source.teams.length}`, label: `Team ${source.teams.length}`, personIds: [], lifecycle: 'active' });
  source.connections = Array.from({ length: 256 }, (_, index) => ({ id: `connection-${index}`,
    senderTeamId: source.teams[index % 32].id, receiverTeamId: source.teams[(index + 8) % 32].id,
    receiverPersonId: null, sharedObject: `Shared object ${index}`, responseExpectation: null, workIds: [], status: 'active' }));
  const view = createConnectionViewState(createStudio(source).read()), visited = [];
  assert.equal(view.read().pageCount, 32); assert.equal(view.read().model.teams.length, 32);
  for (let page = 0; page < 32; page++) {
    view.showPage(page); const current = view.read(), geometry = connectionPageGeometry(current);
    assert.equal(current.connections.length, CONNECTION_PAGE_SIZE);
    assert.ok(geometry.sending.length <= 8 && geometry.receiving.length <= 8);
    assert.equal(geometry.width, 880); assert.ok(geometry.height <= 584);
    assert.equal(geometry.edges.length, 8); visited.push(...geometry.edges.map(edge => edge.id));
  }
  assert.deepEqual(visited, source.connections.map(row => row.id));
  assert.equal(view.read().selectedId, 'connection-0'); assert.equal(view.read().selectedOnPage, false);
});

// This small DOM model observes owned nodes, attributes, transitions and
// callback retirement. Actual SVG hit geometry, focus and scrolling belong to
// the subsequent browser receiver on About.
class Element {
  attributes = new Map(); children = []; listeners = new Map(); parentElement = null;
  hidden = false; disabled = false; _text = '';
  constructor(document, tag, namespace = null) {
    this.ownerDocument = document; this.localName = tag; this.namespaceURI = namespace;
    this.dataset = new Proxy({}, {
      get: (_, key) => this.getAttribute(`data-${String(key).replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)}`) ?? undefined,
      set: (_, key, value) => { this.setAttribute(`data-${String(key).replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)}`, value); return true; },
    });
  }
  get className() { return this.getAttribute('class') ?? ''; }
  set className(value) { this.setAttribute('class', value); }
  set textContent(value) { this._text = String(value); this.replaceChildren(); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); this.ownerDocument.writes.push(this); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const child of this.children) child.parentElement = null; this.children = []; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
  contains(element) { for (let current = element; current; current = current.parentElement) if (current === this) return true; return false; }
  matches(selector) {
    return selector.split(',').some(part => {
      const match = /^(\w+)?\[([^=\]]+)(?:="([^"]*)")?\]$/u.exec(part.trim());
      return Boolean(match && (!match[1] || this.localName === match[1]) && this.attributes.has(match[2])
        && (match[3] === undefined || this.getAttribute(match[2]) === match[3]));
    });
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  send(type, props = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props };
    const path = []; for (let node = this; node; node = node.parentElement) path.push(node);
    for (const node of path) for (const callback of [...node.listeners.get(type) ?? []]) callback(event);
    return event;
  }
  focus(options) { this.ownerDocument.activeElement = this; this.focusOptions = options; this.ownerDocument.onFocus?.(this); this.onFocus?.(); }
}
function dom() {
  const document = { writes: [], activeElement: null,
    createElement: tag => new Element(document, tag), createElementNS: (namespace, tag) => new Element(document, tag, namespace) };
  return document.createElement('section');
}
const all = root => [root, ...root.children.flatMap(all)];
const byClass = (root, className) => all(root).find(node => node.className === className);
const selected = (root, id, tag = 'button') => all(root).find(node => node.localName === tag && node.dataset.connectionSelect === id);
const action = (root, name) => all(root).find(node => node.dataset.connectionAction === name);

test('one mounted diagram and native list share selection while updates retain unaffected nodes', () => {
  const root = dom(), source = projection(4), calls = [];
  const receiver = mountConnectionView(root, { projection: source, onSelect: id => calls.push(id) });
  assert.strictEqual(mountConnectionView(root, { projection: source }), receiver);
  assert.equal(all(root).filter(node => node.localName === 'svg').length, 1);
  const buttons = Array.from({ length: 4 }, (_, index) => selected(root, `connection-${index}`));
  const cables = Array.from({ length: 4 }, (_, index) => selected(root, `connection-${index}`, 'g'));
  const list = byClass(root, 'native-connections__list'), items = [...list.children];
  root.ownerDocument.writes.length = 0;
  buttons[2].send('click');
  assert.deepEqual(calls, ['connection-2']); assert.equal(receiver.read().selectedId, 'connection-2');
  assert.equal(buttons[0].getAttribute('aria-current'), 'false'); assert.equal(buttons[2].getAttribute('aria-current'), 'true');
  assert.equal(cables[2].dataset.selected, 'true'); assert.equal(cables[0].dataset.selected, 'false');
  assert.deepEqual(list.children, items); assert.strictEqual(selected(root, 'connection-1'), buttons[1]);
  assert.equal(root.ownerDocument.writes.includes(buttons[1]), false); assert.equal(root.ownerDocument.writes.includes(cables[1]), false);
  cables[1].children.at(-1).send('click'); assert.deepEqual(calls, ['connection-2', 'connection-1']);
  assert.equal(receiver.read().selectedId, 'connection-1');
  receiver.select('connection-3'); assert.equal(calls.length, 2); assert.equal(receiver.read().selectedId, 'connection-3');
  const pausedPath = cables[1].children.find(node => node.localName === 'path');
  assert.equal(pausedPath.getAttribute('stroke-dasharray'), '8 5');
  assert.equal(cables[1].getAttribute('tabindex'), '-1'); assert.equal(cables[1].getAttribute('role'), 'button');
});

test('paging retains the selection and its exact detail until a visitor chooses another record', () => {
  const root = dom(), calls = [], receiver = mountConnectionView(root, { projection: projection(10), onSelect: id => calls.push(id) });
  receiver.select('connection-2'); action(root, 'next').send('click');
  assert.equal(receiver.read().page, 1); assert.equal(receiver.read().selectedId, 'connection-2');
  assert.equal(byClass(root, 'native-connections__object').textContent, 'Shared object 2');
  assert.equal(action(root, 'return').hidden, false); assert.deepEqual(calls, []);
  action(root, 'return').send('click'); assert.equal(receiver.read().page, 0);
  assert.strictEqual(root.ownerDocument.activeElement, selected(root, 'connection-2'));
  assert.equal(action(root, 'return').hidden, true); assert.deepEqual(calls, []);
});

test('the receiver uses text nodes for literal labels and keeps complete supporting work behind a disclosure', () => {
  const source = plan(1); source.teams[1].label = '<img onerror="alert(1)">'; source.connections[0].sharedObject = '<script>data</script>';
  const root = dom(); mountConnectionView(root, { projection: createStudio(source).read() });
  assert.equal(all(root).some(node => node.localName === 'img' || node.localName === 'script'), false);
  assert.equal(byClass(root, 'native-connections__object').textContent, '<script>data</script>');
  assert.match(byClass(root, 'native-connections__detail-title').textContent, /<img onerror=/u);
  assert.equal(byClass(root, 'native-connections__work').localName, 'details');
  assert.equal(byClass(root, 'native-connections__work-summary').textContent, 'Supporting sessions: 1');
  assert.equal(byClass(root, 'native-connections__work-list').children[0].textContent, source.work[0].label);
});

test('empty state retains team context and complete removal returns to it', () => {
  const root = dom(), receiver = mountConnectionView(root, { projection: projection(0) });
  assert.match(byClass(root, 'native-connections__empty').textContent, /^2 teams are ready/u);
  assert.equal(byClass(root, 'native-connections__viewport').hidden, true);
  receiver.refresh(projection(1)); assert.equal(byClass(root, 'native-connections__empty').hidden, true);
  receiver.refresh(projection(0)); assert.equal(byClass(root, 'native-connections__detail').hidden, true);
  receiver.refresh(createStudio(createExamplePlan()).read());
  assert.equal(byClass(root, 'native-connections__empty').textContent, 'Add another team in People, then connect the work they share.');
  const empty = createExamplePlan(); empty.people = []; empty.teams = []; empty.work = []; empty.practices = [];
  receiver.refresh(createStudio(empty).read()); assert.equal(byClass(root, 'native-connections__empty').textContent, 'Add teams, then connect the work they share.');
});

test('a selected callback can replace or dispose the receiver without an old completion overwriting it', () => {
  const root = dom(), baseline = root.ownerDocument.createElement('p'); baseline.textContent = 'Static owner'; root.append(baseline);
  let receiver, successor, calls = 0;
  receiver = mountConnectionView(root, { projection: projection(3), onSelect() {
    calls++; receiver.dispose(); successor = mountConnectionView(root, { projection: projection(2) }); successor.select('connection-1');
  } });
  selected(root, 'connection-2').send('click');
  assert.equal(calls, 1); assert.equal(successor.read().selectedId, 'connection-1');
  assert.equal(byClass(root, 'native-connections__object').textContent, 'Shared object 1');
  assert.equal(receiver.select('connection-0', { notify: true }), false); assert.equal(receiver.showPage(0), false);
  receiver.dispose(); assert.equal(root.children.length, 2); successor.dispose();
  assert.deepEqual(root.children, [baseline]);
});

test('accepted refresh restores only owned list focus and safely permits retirement during that focus', () => {
  const root = dom(), receiver = mountConnectionView(root, { projection: projection(3) });
  selected(root, 'connection-1').focus();
  receiver.refresh(projection(3)); assert.strictEqual(root.ownerDocument.activeElement, selected(root, 'connection-1'));
  const outside = root.ownerDocument.createElement('button'); outside.focus();
  receiver.refresh(projection(3)); assert.strictEqual(root.ownerDocument.activeElement, outside);
  selected(root, 'connection-1').focus(); root.ownerDocument.onFocus = () => receiver.dispose();
  receiver.refresh(projection(3)); assert.equal(root.children.length, 0);
  root.ownerDocument.onFocus = null;
  const replacement = mountConnectionView(root, { projection: projection(1) });
  assert.notStrictEqual(replacement, receiver); assert.equal(replacement.read().selectedId, 'connection-0');
  replacement.dispose(); assert.equal(root.children.length, 0);
});
