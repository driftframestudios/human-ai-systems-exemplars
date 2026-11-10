// Financial rack controls: the receiving chapter owns amounts, choices and Undo.
import { createReel } from './reel-control.mjs';
// These controls receive dollar amounts; the accepted ledger's cents formatter
// retains its separate contract in display.mjs.
const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const money = value => MONEY.format(value);
const TURN_STEP = 30;
let sequence = 0;

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function button(text, label, action, key, className) {
  const element = node('button', text, className); element.type = 'button';
  element.setAttribute('aria-label', label); element.dataset.focusKey = key;
  element.addEventListener('click', action); return element;
}

export function createMoneyControl({ id, label, read, write, min = 0, max = 1000000, step = 1, increments = [100, 5], readout = 'inline' }) {
  if (increments.length !== 2 || increments.some(value => !Number.isFinite(value) || value <= 0)) throw new TypeError('Money controls need two positive dial increments.');
  if (!['inline', 'stacked'].includes(readout)) throw new TypeError('Choose an inline or stacked money readout.');
  const instance = `${id}-${++sequence}`, element = node('section', undefined, 'study-money');
  element.dataset.readout = readout;
  // Reserve the configured range once so changing an amount keeps the heading and controls in place.
  element.style.setProperty('--study-money-readout-chars', Math.max(money(min).length, money(max).length));
  const window = element.ownerDocument.defaultView, lifetime = new window.AbortController();
  const forcedColors = window.matchMedia('(forced-colors: active)');
  const title = node('span', label), output = node('output', '', 'study-money__readout');
  title.id = `${instance}-label`; element.setAttribute('aria-labelledby', title.id);
  const head = node('header', undefined, 'study-money__head'); head.append(title, output);
  const body = node('div', undefined, 'study-money__body'), dials = node('div', undefined, 'study-money__dials');
  const precision = node('div', undefined, 'study-money__precision'), exactLabel = node('label', 'Exact amount · USD');
  const input = node('input'); input.id = `${instance}-exact`; input.type = 'number'; input.min = String(min); input.max = String(max); input.step = String(step);
  input.inputMode = 'decimal'; input.dataset.focusKey = `${id}-exact`; exactLabel.htmlFor = input.id; output.htmlFor = input.id;
  const steps = node('div', undefined, 'study-money__steps');
  let editKey, disposed = false;
  const newKey = () => Symbol(`${instance}-gesture`);
  const current = () => Number(read());
  const clamp = value => Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
  function commit(value, key) {
    if (disposed || !Number.isFinite(value)) return;
    const next = clamp(value);
    if (next !== current()) write(next, key);
    update();
  }
  const decrement = button('−', `Decrease ${label} by ${money(step)}`, () => commit(current() - step, newKey()), `${id}-less`);
  const increment = button('+', `Increase ${label} by ${money(step)}`, () => commit(current() + step, newKey()), `${id}-more`);
  steps.append(decrement, increment); precision.append(exactLabel, input, steps); body.append(dials, precision); element.append(head, body);
  input.addEventListener('focus', () => { editKey = newKey(); });
  input.addEventListener('input', () => {
    if (input.value === '') return;
    const value = Number(input.value);
    if (Number.isFinite(value) && value >= min && value <= max) commit(value, editKey);
  });
  input.addEventListener('blur', () => { input.value = String(current()); });

  const mounted = increments.map((dollars, index) => {
    const kind = index === 0 ? 'coarse' : 'fine', part = node('div', undefined, `study-money__part study-money__part--${kind}`);
    const caption = node('label', `$${dollars.toLocaleString('en-US')} steps`), dial = node('div', undefined, 'study-money__dial');
    const face = node('span', undefined, 'study-money__face'), pointer = node('span', undefined, 'study-money__pointer');
    face.setAttribute('aria-hidden', 'true'); face.append(pointer);
    const knob = node('input'); Object.assign(knob, { type: 'range', min: '-1', max: '1', step: '1', value: '0', id: `${instance}-${kind}` });
    knob.dataset.focusKey = `${id}-${kind}`; knob.setAttribute('aria-label', `${label}, ${dollars}-dollar steps`); knob.setAttribute('aria-controls', input.id); caption.htmlFor = knob.id;
    dial.append(face, knob); part.append(caption, dial); dials.append(part);
    let gesture = null, angle = 0, keyboardKey;
    const paint = () => { dial.style.setProperty('--study-money-angle', `${angle % 360}deg`); };
    function release(restore = false) {
      const captured = gesture; if (!captured) return;
      gesture = null; delete dial.dataset.dragging; knob.value = '0';
      if (knob.hasPointerCapture(captured.pointerId)) knob.releasePointerCapture(captured.pointerId);
      if (restore && current() === captured.lastValue) {
        angle = captured.initialAngle; paint(); commit(captured.initialValue, captured.key);
      }
    }
    function refresh(value) {
      if (gesture && gesture.lastValue !== value) release();
      knob.min = value > min ? '-1' : '0'; knob.max = value < max ? '1' : '0'; knob.value = '0';
      knob.setAttribute('aria-valuetext', `${money(value)}; ${dollars}-dollar steps`); paint();
    }
    function shift(count, key = keyboardKey || newKey(), advancePointer = !gesture) {
      const value = current(), next = clamp(value + dollars * count);
      knob.value = '0';
      if (gesture) gesture.lastValue = next;
      if (advancePointer) { angle += (next - value) / dollars * TURN_STEP; paint(); }
      commit(next, key);
    }
    function pointerAngle(event, center) {
      const x = event.clientX - center.x, y = event.clientY - center.y;
      return Math.hypot(x, y) < 4 ? null : Math.atan2(y, x) * 180 / Math.PI;
    }
    function turn(event) {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (current() !== gesture.lastValue) { release(); return; }
      const position = pointerAngle(event, gesture.center); if (position === null) return;
      const delta = ((position - gesture.lastAngle + 540) % 360) - 180;
      gesture.lastAngle = position; gesture.travel += delta; angle += delta;
      if (Math.abs(delta) >= 2 || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 4) gesture.moved = true;
      paint(); const count = Math.trunc(gesture.travel / TURN_STEP);
      if (count) { gesture.travel -= count * TURN_STEP; shift(count, gesture.key); }
    }
    knob.addEventListener('input', () => { const count = Number(knob.value); if (count) shift(count); });
    knob.addEventListener('keydown', event => {
      if (event.key === 'Escape' && gesture) { event.preventDefault(); release(true); }
      else if (!event.repeat) { release(); keyboardKey = newKey(); }
    });
    knob.addEventListener('keyup', () => { keyboardKey = undefined; });
    knob.addEventListener('pointerdown', event => {
      if (disposed || forcedColors.matches || gesture || !event.isPrimary || event.button !== 0) return;
      event.preventDefault(); releaseAll(); knob.focus({ preventScroll: true });
      const box = knob.getBoundingClientRect(), center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      const position = pointerAngle(event, center); if (position === null) return;
      const value = current(); knob.setPointerCapture(event.pointerId);
      gesture = { pointerId: event.pointerId, initialValue: value, lastValue: value, initialAngle: angle, lastAngle: position, travel: 0,
        center, moved: false, x: event.clientX, y: event.clientY, key: newKey() };
      dial.dataset.dragging = 'true';
    });
    knob.addEventListener('pointermove', turn);
    knob.addEventListener('pointerup', event => {
      if (gesture?.pointerId !== event.pointerId) return;
      turn(event); if (!gesture) return;
      if (!gesture.moved) {
        const offset = event.clientX - gesture.center.x;
        if (Math.abs(offset) >= 4) shift(offset > 0 ? 1 : -1, gesture.key, true);
      }
      release(); refresh(current());
    });
    knob.addEventListener('pointercancel', event => { if (gesture?.pointerId === event.pointerId) release(true); });
    knob.addEventListener('lostpointercapture', event => { if (gesture?.pointerId === event.pointerId) release(); });
    knob.addEventListener('blur', () => { keyboardKey = undefined; release(); });
    return { release, refresh };
  });
  function releaseAll() { for (const dial of mounted) dial.release(); }
  function update(value = current()) {
    if (disposed) return;
    output.value = money(value);
    if (document.activeElement !== input) input.value = String(value);
    decrement.disabled = value <= min; increment.disabled = value >= max;
    for (const dial of mounted) dial.refresh(value);
  }
  window.addEventListener('blur', releaseAll, { signal: lifetime.signal });
  forcedColors.addEventListener('change', () => { releaseAll(); update(); }, { signal: lifetime.signal });
  update();
  return { element, update, release: releaseAll, dispose() { releaseAll(); disposed = true; lifetime.abort(); element.remove(); } };
}

// The shared Showcase reel owns artwork, stepping, motion and disposal. This
// receiver preserves the financial controller's read/write and focus vocabulary.
export function createChoiceReel({ id, label, options, read, write, secondary = false, variant }) {
  const reel = createReel(document, { label, choices: options, value: read(),
    variant: variant || (secondary ? 'cobalt' : 'teal'), secondary,
    onSelect(value) { if (value !== read()) write(value); reel.select(read()); } });
  for (const control of reel.element.querySelectorAll('[data-reel-choice]')) {
    control.dataset.focusKey = `${id}-${control.dataset.reelChoice}`;
    control.setAttribute('aria-label', `${label}: ${control.textContent}`);
  }
  reel.element.querySelector('.native-reel__hub').dataset.focusKey = `${id}-reel`;
  return { element: reel.element, update(value = read()) { reel.select(value); }, dispose: reel.dispose };
}
