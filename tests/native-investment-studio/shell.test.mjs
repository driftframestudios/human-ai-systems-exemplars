import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { mountChapterShell } from '../../collaboration/native-investment-studio/shell.mjs';
import { createStudioIcon, STUDIO_ICON_NAMES } from '../../collaboration/native-investment-studio/icons.mjs';

// This fixture observes attribute/state ownership and resource lifecycles. Native
// keyboard dispatch, paint, scrolling and accessibility retain browser checks.
class Events {
  handlers = new Map();
  addEventListener(type, fn) {
    if (this.failType === type) throw new Error('Listener installation failed');
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.handlers.get(type)?.delete(fn); }
  send(type, properties = {}) {
    const event = { target: this, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...properties };
    for (const handler of this.handlers.get(type) ?? []) handler(event);
    return event;
  }
  listenerCount() { return [...this.handlers.values()].reduce((sum, set) => sum + set.size, 0); }
}

class Element extends Events {
  attributes = new Map();
  children = [];
  textContent = '';
  scrollLeft = 0;
  constructor(document, localName, attributes = {}) {
    super(); this.ownerDocument = document; this.localName = localName;
    for (const [name, value] of Object.entries(attributes)) this.setAttribute(name, value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  get id() { return this.getAttribute('id') ?? ''; }
  get hidden() { return this.attributes.has('hidden'); }
  set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
  get tabIndex() { return Number(this.getAttribute('tabindex') ?? -1); }
  set tabIndex(value) { this.setAttribute('tabindex', value); }
  set type(value) { this.setAttribute('type', value); }
  append(...nodes) { for (const node of nodes) { this.children.push(node); node.parentElement = this; } }
  contains(node) { for (let current = node; current; current = current.parentElement) if (current === this) return true; return false; }
  matches(selector) {
    const match = /^(button)?\[([^\]]+)\]$/u.exec(selector);
    return Boolean(match && (!match[1] || this.localName === match[1]) && this.attributes.has(match[2]));
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  focus(options) {
    for (let node = this; node; node = node.parentElement) if (node.hidden) return;
    this.ownerDocument.activeElement = this; this.focusOptions = options;
  }
  scrollIntoView(options) { (this.scrollRequests ??= []).push(options); }
  getBoundingClientRect() { return this.box ?? { left: 0, right: 300 }; }
}

function fixture(hash = '') {
  const window = new Events();
  const document = new Events();
  const media = new Events();
  media.matches = false;
  const url = new URL(`https://example.test/about${hash}`);
  window.location = url;
  window.history = { state: { anotherOwner: true }, writes: [],
    pushState(state, title, hash) { this.state = state; this.writes.push({ state, title, hash }); url.hash = hash; },
    replaceState(state, title, href) { this.state = state; url.href = href; } };
  window.matchMedia = () => media;
  document.defaultView = window;
  document.visibilityState = 'visible';
  document.activeElement = null;
  document.createElementNS = (namespace, tag) => { const node = new Element(document, tag); node.namespaceURI = namespace; return node; };
  const element = (tag, attributes) => new Element(document, tag, attributes);
  const root = element('div');
  const list = element('div', { 'data-native-chapter-list': '', 'aria-label': 'Studio chapters', hidden: '', role: 'group' });
  const records = new Map();
  const animations = [];
  for (const key of ['coordination', 'people']) {
    const button = element('button', { id: `native-studio-tab-${key}`, 'data-native-chapter': key,
      'aria-controls': `native-studio-${key}`, type: 'button' });
    button.textContent = key === 'people' ? 'People' : 'Coordination';
    button.box = key === 'people' ? { left: 240, right: 360 } : { left: 0, right: 180 };
    const panel = element('section', { id: `native-studio-${key}`, 'data-native-chapter-panel': key });
    panel.animate = () => {
      let resolve, reject;
      const finished = new Promise((a, b) => { resolve = a; reject = b; });
      const animation = { finished, resolve, cancelled: false, cancel() { this.cancelled = true; reject(new Error('Cancelled')); } };
      animations.push(animation); return animation;
    };
    const input = element('input'); input.value = '0045';
    panel.append(input); list.append(button); records.set(key, { button, panel, input });
  }
  root.append(list, ...[...records.values()].map(record => record.panel));
  document.getElementById = id => {
    const visit = node => node.id === id ? node : node.children.map(visit).find(Boolean);
    return visit(root) ?? null;
  };
  return { root, list, records, document, window, media, animations, element };
}

const attributes = node => [...node.attributes.entries()].sort(([a], [b]) => a.localeCompare(b));

test('About authors two working chapter panels and retains the existing deep-link destinations', async () => {
  const about = await readFile(new URL('../../context-canvas-project-surface/context-canvas/index.html', import.meta.url), 'utf8');
  const controls = [...about.matchAll(/<button\b[^>]*\bdata-native-chapter="([^"]+)"[^>]*>/gu)];
  const panels = [...about.matchAll(/<section\b[^>]*\bdata-native-chapter-panel="([^"]+)"[^>]*>/gu)];
  assert.deepEqual(controls.map(match => match[1]), ['coordination', 'people']);
  assert.deepEqual(panels.map(match => match[1]), ['coordination', 'people']);
  for (const key of ['coordination', 'people']) {
    assert.ok(controls.find(match => match[1] === key)[0].includes(`aria-controls="native-studio-${key}"`));
    const panel = panels.find(match => match[1] === key)[0];
    assert.ok(panel.includes(`id="native-studio-${key}"`));
    assert.doesNotMatch(panel, /\bhidden\b/u, 'the authored fallback keeps every working chapter readable');
  }
  assert.match(about, /<div\b[^>]*data-native-chapter-list[^>]*aria-label="Studio chapters"[^>]*hidden/u);
  for (const id of ['native-coordination-title', 'native-team-title', 'native-session-title']) {
    assert.equal(about.split(`id="${id}"`).length - 1, 1, `${id} has one stable destination`);
  }
  assert.equal(about.split('Enterprise work is a cross-functional investment. Plan the people, work, disruption, and learning your initiative needs.').length - 1, 1);
});

test('admission retains the complete authored reading when a control/panel relationship is invalid', () => {
  for (const change of [
    f => f.records.get('people').button.setAttribute('aria-controls', 'foreign-panel'),
    f => f.records.get('people').panel.setAttribute('data-native-chapter-panel', 'future-placeholder'),
    f => f.records.get('people').button.setAttribute('data-native-chapter', 'coordination'),
    f => { f.records.get('people').button.textContent = ''; },
    f => f.list.removeAttribute('aria-label'),
  ]) {
    const f = fixture(); change(f);
    const before = attributes(f.list);
    assert.throws(() => mountChapterShell(f.root), TypeError);
    assert.deepEqual(attributes(f.list), before);
    assert.ok([...f.records.values()].every(({ panel }) => !panel.hidden && panel.getAttribute('role') === null));
    assert.equal(f.list.listenerCount() + f.window.listenerCount() + f.document.listenerCount(), 0);
  }
});

test('selection changes exactly the visible chapter while the same mounted draft nodes survive', () => {
  const f = fixture();
  const shell = mountChapterShell(f.root);
  assert.strictEqual(mountChapterShell(f.root), shell);
  assert.deepEqual(shell.read(), { activeChapter: 'coordination', chapters: ['coordination', 'people'], disposed: false });
  const session = f.records.get('coordination');
  session.input.value = '-';
  const icon = createStudioIcon(f.document, 'people');
  f.records.get('people').button.append(icon);
  f.list.send('click', { target: icon.children[0] });
  assert.equal(session.panel.hidden, true);
  assert.equal(f.records.get('people').panel.hidden, false);
  assert.equal(f.records.get('people').button.getAttribute('aria-selected'), 'true');
  assert.strictEqual(f.document.activeElement, f.records.get('people').button);
  assert.equal(f.list.scrollLeft, 60, 'tab reveal writes only the local horizontal scroll coordinate');
  assert.equal(shell.select('__proto__'), false);
  assert.equal(shell.read().activeChapter, 'people');
  shell.select('coordination');
  assert.strictEqual(session.panel.children[0], session.input);
  assert.equal(session.input.value, '-');
  assert.equal(f.window.history.writes.length, 2);
  assert.equal(f.window.history.writes[0].state.anotherOwner, true);
  assert.deepEqual(f.window.history.writes[0].state.__contextCanvasNativeStudio, { version: 1, chapter: 'people' });
  shell.dispose();
});

test('manual tab focus leaves selection unchanged until Enter or Space and preserves vertical arrow behavior', () => {
  const f = fixture(); const shell = mountChapterShell(f.root);
  const first = f.records.get('coordination').button, second = f.records.get('people').button;
  first.focus();
  const arrow = f.list.send('keydown', { target: first, key: 'ArrowRight' });
  assert.equal(arrow.defaultPrevented, true);
  assert.strictEqual(f.document.activeElement, second);
  assert.equal(shell.read().activeChapter, 'coordination');
  assert.equal(f.window.history.writes.length, 0);
  assert.equal(f.list.send('keydown', { target: second, key: 'ArrowDown' }).defaultPrevented, false);
  f.list.send('keydown', { target: second, key: 'Enter' });
  assert.equal(shell.read().activeChapter, 'people');
  f.list.send('keydown', { target: second, key: 'Home' });
  assert.strictEqual(f.document.activeElement, first);
  assert.equal(shell.read().activeChapter, 'people');
  f.list.send('focusout', { target: first, relatedTarget: f.records.get('people').input });
  assert.equal(first.tabIndex, -1); assert.equal(second.tabIndex, 0);
  f.list.send('keydown', { target: second, key: 'ArrowLeft' });
  f.list.send('keydown', { target: first, key: ' ' });
  assert.equal(shell.read().activeChapter, 'coordination');
  shell.dispose();
});

test('owned history reveals its chapter and foreign or malformed fragments preserve the current reading', () => {
  const f = fixture('#native-studio-people'); const shell = mountChapterShell(f.root);
  assert.equal(shell.read().activeChapter, 'people');
  assert.equal(f.window.history.writes.length, 0);
  assert.equal(f.document.activeElement, null, 'initial history reconciliation leaves visitor focus alone');
  f.records.get('people').input.focus();
  f.window.location.hash = '#native-studio-coordination'; f.window.send('popstate');
  assert.equal(shell.read().activeChapter, 'coordination');
  assert.strictEqual(f.document.activeElement, f.records.get('coordination').button, 'history never hides the focused editor');
  for (const hash of ['#about-career', '#native-studio-unknown', '#native-studio-%E0%A4%A']) {
    f.window.location.hash = hash; f.window.send('hashchange');
    assert.equal(shell.read().activeChapter, 'coordination');
  }
  f.window.history.pushState = () => { throw new Error('History held'); };
  assert.equal(shell.select('people'), true);
  assert.equal(shell.read().activeChapter, 'people');
  shell.dispose();
});

test('existing descendant fragments reveal their owned chapter and retain their exact destination', () => {
  const f = fixture('#native-team-title');
  const teamTitle = f.element('h3', { id: 'native-team-title' });
  const sessionTitle = f.element('h3', { id: 'native-session-title' });
  f.records.get('people').panel.append(teamTitle);
  f.records.get('coordination').panel.append(sessionTitle);
  const outside = f.element('h2', { id: 'outside-chapter-title' });
  f.root.append(outside);
  const shell = mountChapterShell(f.root);
  assert.equal(shell.read().activeChapter, 'people');
  assert.equal(f.records.get('people').panel.hidden, false);
  assert.equal(f.window.location.hash, '#native-team-title');
  assert.equal(f.window.history.writes.length, 0, 'recovery preserves the existing deep-link history entry');
  assert.equal(teamTitle.scrollRequests.length, 1, 'a formerly hidden destination receives its scroll after its panel becomes visible');
  assert.equal(f.document.activeElement, null, 'initial deep-link recovery leaves focus with the browser');
  f.records.get('people').input.value = '10001';
  f.records.get('people').input.focus();
  f.window.location.hash = '#native-session-title';
  f.window.send('popstate');
  f.window.send('hashchange');
  assert.equal(shell.read().activeChapter, 'coordination');
  assert.equal(sessionTitle.scrollRequests.length, 1, 'paired history notifications settle the same chapter once');
  assert.equal(f.records.get('people').input.value, '10001');
  assert.strictEqual(f.document.activeElement, f.records.get('coordination').button);
  f.window.location.hash = '#outside-chapter-title'; f.window.send('hashchange');
  assert.equal(shell.read().activeChapter, 'coordination');
  assert.equal(outside.scrollRequests, undefined, 'fragment recovery stays inside admitted chapter panels');
  shell.dispose();
});

test('history restores the chapter of an initially empty URL while preserving another owner’s state', () => {
  const f = fixture();
  const foreign = { position: 7 };
  f.window.history.state = { anotherOwner: foreign };
  const shell = mountChapterShell(f.root);
  const initial = f.window.history.state;
  assert.equal(f.window.location.hash, '');
  assert.strictEqual(initial.anotherOwner, foreign);
  shell.select('people');
  const selected = f.window.history.state;
  f.document.body = f.element('body'); f.document.activeElement = f.document.body;
  f.window.location.hash = ''; f.window.history.state = initial; f.window.send('popstate');
  assert.equal(shell.read().activeChapter, 'coordination');
  assert.strictEqual(f.document.activeElement, f.records.get('coordination').panel, 'entry recovery returns browser-reset focus to the restored reading');
  assert.strictEqual(f.window.history.state.anotherOwner, foreign);
  f.window.location.hash = '#native-studio-people'; f.window.history.state = selected; f.window.send('popstate');
  assert.equal(shell.read().activeChapter, 'people');
  assert.strictEqual(f.window.history.state.anotherOwner, foreign);
  shell.dispose();
});

test('a newly revealed external panel fragment receives its scroll while tab selection stays scroll-neutral', () => {
  const f = fixture(); const shell = mountChapterShell(f.root);
  const people = f.records.get('people').panel;
  shell.select('people');
  assert.equal(people.scrollRequests, undefined);
  shell.select('coordination');
  f.window.location.hash = '#native-studio-people'; f.window.send('hashchange');
  assert.equal(shell.read().activeChapter, 'people');
  assert.equal(people.scrollRequests.length, 1);
  assert.deepEqual(people.scrollRequests[0], { block: 'start', inline: 'nearest', behavior: 'instant' });
  shell.dispose();
});

test('synchronous focus disposal preserves the authored fallback and acquires no animation', () => {
  const f = fixture(); const shell = mountChapterShell(f.root);
  const target = f.records.get('people').button;
  const focus = target.focus.bind(target);
  target.focus = options => { focus(options); shell.dispose(); };
  assert.equal(shell.select('people'), false);
  assert.equal(shell.read().disposed, true);
  assert.ok([...f.records.values()].every(({ panel }) => !panel.hidden));
  assert.equal(f.list.hidden, true);
  assert.equal(f.animations.length, 0);
  assert.equal(f.list.listenerCount() + f.window.listenerCount() + f.document.listenerCount(), 0);
});

test('reentrant disposal during animation acquisition cancels and settles the retired handle', async () => {
  const f = fixture(); const shell = mountChapterShell(f.root);
  const target = f.records.get('people').panel;
  const animate = target.animate;
  target.animate = (...args) => { const handle = animate(...args); shell.dispose(); return handle; };
  assert.equal(shell.select('people'), false);
  assert.equal(shell.read().disposed, true);
  assert.ok([...f.records.values()].every(({ panel }) => !panel.hidden));
  assert.equal(f.animations.length, 1);
  assert.equal(f.animations[0].cancelled, true);
  await Promise.resolve();
});

test('rapid transitions cancel the previous animation and reduced motion releases the current resource', async () => {
  const f = fixture(); const shell = mountChapterShell(f.root);
  shell.select('people');
  const first = f.animations[0];
  shell.select('coordination');
  assert.equal(first.cancelled, true);
  const second = f.animations[1];
  await Promise.resolve();
  f.media.matches = true; f.media.send('change');
  assert.equal(second.cancelled, true, 'the rejected earlier animation retains no ownership of the newer one');
  shell.select('people');
  assert.equal(f.animations.length, 2);
  assert.equal(shell.read().activeChapter, 'people');
  f.media.matches = false;
  shell.select('coordination');
  f.document.visibilityState = 'hidden'; f.document.send('visibilitychange');
  assert.equal(f.animations[2].cancelled, true);
  shell.dispose();
});

test('disposal restores authored attributes, releases listeners, and allows a fresh mount', () => {
  const f = fixture();
  const nodes = [f.root, f.list, ...[...f.records.values()].flatMap(({ button, panel }) => [button, panel])];
  const originals = nodes.map(attributes);
  const shell = mountChapterShell(f.root);
  shell.select('people');
  f.records.get('people').input.value = '10001';
  f.window.send('pagehide', { persisted: true });
  assert.equal(shell.read().disposed, false);
  shell.dispose(); shell.dispose();
  assert.equal(shell.select('coordination'), false);
  assert.equal(shell.read().disposed, true);
  assert.deepEqual(nodes.map(attributes), originals);
  assert.strictEqual(f.document.activeElement, f.records.get('coordination').panel,
    'disposal reveals the authored fallback before restoring focus out of its hidden tab controls');
  assert.equal(f.records.get('people').input.value, '10001');
  assert.equal(f.list.listenerCount() + f.window.listenerCount() + f.document.listenerCount() + f.media.listenerCount(), 0);
  const fresh = mountChapterShell(f.root);
  assert.notStrictEqual(fresh, shell);
  assert.equal(fresh.read().activeChapter, 'people', 'a new owner reconciles the retained fragment');
  fresh.dispose();
});

test('partial listener installation restores authored state and leaves the root mountable', () => {
  const f = fixture(); const before = attributes(f.list);
  f.window.failType = 'popstate';
  assert.throws(() => mountChapterShell(f.root), /Listener installation failed/u);
  assert.deepEqual(attributes(f.list), before);
  assert.ok([...f.records.values()].every(({ panel }) => !panel.hidden));
  assert.equal(f.list.listenerCount() + f.window.listenerCount(), 0);
  f.window.failType = null;
  mountChapterShell(f.root).dispose();
});

test('finite icon construction owns each SVG and retains exact local geometry and accessible control naming', async () => {
  const f = fixture();
  assert.deepEqual(STUDIO_ICON_NAMES, ['coordination', 'people']);
  assert.ok(Object.isFrozen(STUDIO_ICON_NAMES));
  const first = createStudioIcon(f.document, 'people');
  const second = createStudioIcon(f.document, 'people');
  assert.equal(first.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(first.getAttribute('viewBox'), '0 0 24 24');
  assert.equal(first.getAttribute('aria-hidden'), 'true');
  assert.equal(first.getAttribute('focusable'), 'false');
  assert.deepEqual(first.children.map(child => child.localName), ['path', 'path', 'path', 'circle']);
  assert.equal(first.children[3].getAttribute('r'), '4');
  first.children[3].setAttribute('r', '1');
  assert.equal(second.children[3].getAttribute('r'), '4', 'returned SVG mutation stays local to its caller');
  for (const key of ['constructor', '__proto__', '<script>', {}, null]) assert.throws(() => createStudioIcon(f.document, key), RangeError);
  const source = await readFile(new URL('../../collaboration/native-investment-studio/icons.mjs', import.meta.url), 'utf8');
  const licence = await readFile(new URL('../../collaboration/native-investment-studio/vendor/lucide/LICENCE.txt', import.meta.url), 'utf8');
  assert.match(source, /2ca268e74888d3506b3319fb8f94aaaaf70ceca9/u);
  assert.match(source, /Copyright \(c\) 2026 Lucide Icons and Contributors/u);
  assert.match(licence, /The MIT License \(MIT\) \(for the icons listed above\)/u);
});
