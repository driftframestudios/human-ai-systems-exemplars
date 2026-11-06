import { LIMITS } from './config.mjs';
import { money } from './display.mjs';

let sequence = 0;
const DETENT_DEGREES = 30;
const amountText = cents => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

// Whole-dollar detents keep the entered cent offset. At a boundary, take only
// the complete steps that fit; an unknown rate remains unknown.
export function shiftRateCents(cents, dollars, steps) {
  if (cents === null) return null;
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > LIMITS.rateCentsPerHour
    || ![5, 10].includes(dollars) || !Number.isSafeInteger(steps)) throw new TypeError('Supply an admitted rate and whole five- or ten-dollar steps.');
  const increment = dollars * 100;
  const bounded = Math.max(-Math.floor(cents / increment), Math.min(Math.floor((LIMITS.rateCentsPerHour - cents) / increment), steps));
  return cents + bounded * increment;
}

// These spring-centred native controls express a relative adjustment, not an
// absolute price range. The receiving editor owns parsing, drafts and Apply.
export function mountRateControls({ host, precision, label = 'Hourly rate', read, write }) {
  const document = host.ownerDocument, window = document.defaultView, instance = `native-rate-${++sequence}`;
  const element = document.createElement('div'); element.className = 'native-rate-controls';
  const dials = document.createElement('div'); dials.className = 'native-rate__dials';
  element.append(dials); host.append(element);
  let disposed = false;
  const mounted = [10, 5].map(dollars => {
    const size = dollars === 10 ? 'coarse' : 'fine', part = document.createElement('div'); part.className = 'native-rate__part';
    const caption = document.createElement('label'); caption.className = 'native-rate__label'; caption.textContent = `$${dollars} steps`;
    const dial = document.createElement('div'); dial.className = `native-knob native-rate__dial native-rate__dial--${size}`; dial.dataset.rateDial = size;
    const ticks = document.createElement('div'), face = document.createElement('div'), pointer = document.createElement('span');
    ticks.className = 'native-knob__ticks'; face.className = 'native-knob__face'; pointer.className = 'native-knob__pointer';
    ticks.setAttribute('aria-hidden', 'true'); face.setAttribute('aria-hidden', 'true'); face.append(pointer);
    const knob = document.createElement('input');
    Object.assign(knob, { type: 'range', min: '-1', max: '1', step: '1', value: '0', id: `${instance}-${size}` });
    knob.dataset.rateStep = String(dollars); knob.setAttribute('aria-label', `${label}, ${dollars}-dollar steps`);
    knob.setAttribute('aria-controls', precision.id);
    caption.htmlFor = knob.id;
    dial.append(ticks, face, knob); part.append(caption, dial); dials.append(part);
    const forcedColors = window.matchMedia('(forced-colors: active)'), cleanup = [];
    let gesture = null, angle = 0;
    const listen = (target, type, handler) => { target.addEventListener(type, handler); cleanup.push(() => target.removeEventListener(type, handler)); };
    function current() {
      if (disposed) return null;
      const view = read();
      return view?.enabled && view.token && typeof view.raw === 'string'
        && Number.isSafeInteger(view.cents) && view.cents >= 0 && view.cents <= LIMITS.rateCentsPerHour ? view : null;
    }
    function paintAngle() { dial.style.setProperty('--native-knob-angle', `${angle % 360}deg`); }
    function release(restore = false) {
      const captured = gesture; if (!captured) return;
      gesture = null; delete dial.dataset.dragging; knob.value = '0';
      if (knob.hasPointerCapture(captured.pointerId)) knob.releasePointerCapture(captured.pointerId);
      const view = current();
      if (restore && view?.token === captured.token && view.raw === captured.lastRaw) {
        angle = captured.initialAngle; paintAngle();
        if (view.raw !== captured.raw) write(captured.token, captured.raw);
      }
    }
    function refresh() {
      const view = current();
      if (gesture && (!view || view.token !== gesture.token || view.raw !== gesture.lastRaw)) release();
      knob.disabled = !view; dial.dataset.valueState = view ? 'available' : 'unavailable';
      knob.min = view && shiftRateCents(view.cents, dollars, -1) !== view.cents ? '-1' : '0';
      knob.max = view && shiftRateCents(view.cents, dollars, 1) !== view.cents ? '1' : '0'; knob.value = '0';
      knob.setAttribute('aria-valuetext', view ? `${money(view.cents)} per hour` : 'Enter a valid hourly rate.');
      paintAngle();
    }
    function shift(steps, token = current()?.token) {
      const view = current(); if (!view || view.token !== token) { release(); return; }
      const next = shiftRateCents(view.cents, dollars, steps);
      knob.value = '0';
      if (next === view.cents) return;
      const value = amountText(next);
      if (gesture) gesture.lastRaw = value;
      else { angle += ((next - view.cents) / (dollars * 100)) * DETENT_DEGREES; paintAngle(); }
      write(token, value);
    }
    function pointerAngle(event) {
      const box = knob.getBoundingClientRect(), x = event.clientX - box.left - box.width / 2, y = event.clientY - box.top - box.height / 2;
      return Math.hypot(x, y) < 4 ? null : Math.atan2(y, x) * 180 / Math.PI;
    }
    function turn(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const view = current(); if (!view || view.token !== gesture.token || view.raw !== gesture.lastRaw) { release(); return; }
      const nextAngle = pointerAngle(event); if (nextAngle === null) return;
      const delta = ((nextAngle - gesture.lastAngle + 540) % 360) - 180;
      gesture.lastAngle = nextAngle; gesture.travel += delta; angle += delta;
      if (Math.abs(delta) >= 2 || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 4) gesture.moved = true;
      paintAngle();
      const steps = Math.trunc(gesture.travel / DETENT_DEGREES);
      if (steps) { gesture.travel -= steps * DETENT_DEGREES; shift(steps, gesture.token); }
    }
    listen(knob, 'input', () => { const steps = Number(knob.value); if (steps) shift(steps); });
    listen(knob, 'pointerdown', event => {
      if (forcedColors.matches || gesture || !event.isPrimary || event.button !== 0) return;
      const view = current(); if (!view) return;
      event.preventDefault(); knob.focus({ preventScroll: true });
      const afterFocus = current(); if (!afterFocus || afterFocus.token !== view.token || afterFocus.raw !== view.raw) return;
      const startAngle = pointerAngle(event); if (startAngle === null) return;
      knob.setPointerCapture(event.pointerId);
      const captured = current();
      if (!captured || captured.token !== view.token || captured.raw !== view.raw) {
        if (knob.hasPointerCapture(event.pointerId)) knob.releasePointerCapture(event.pointerId);
        return;
      }
      gesture = { pointerId: event.pointerId, token: view.token, raw: view.raw, lastRaw: view.raw, initialAngle: angle,
        lastAngle: startAngle, travel: 0, moved: false, x: event.clientX, y: event.clientY };
      dial.dataset.dragging = 'true';
    });
    listen(knob, 'pointermove', turn);
    listen(knob, 'pointerup', event => {
      if (gesture?.pointerId !== event.pointerId) return;
      turn(event); if (!gesture) return;
      if (!gesture.moved) {
        const box = knob.getBoundingClientRect(), offset = event.clientX - box.left - box.width / 2;
        if (Math.abs(offset) >= 4) shift(offset > 0 ? 1 : -1, gesture.token);
      }
      release(); refresh();
    });
    for (const type of ['pointercancel', 'lostpointercapture']) listen(knob, type, event => { if (gesture?.pointerId === event.pointerId) release(true); });
    listen(knob, 'keydown', event => { if (gesture && event.key === 'Escape') { event.preventDefault(); release(true); } else if (gesture) release(); });
    listen(window, 'blur', () => release(true)); listen(forcedColors, 'change', () => { release(true); refresh(); });
    refresh();
    return { refresh, release, dispose() { release(); cleanup.splice(0).forEach(remove => remove()); knob.disabled = true; } };
  });
  function refresh() {
    if (disposed) return;
    mounted.forEach(dial => dial.refresh());
  }
  refresh();
  return Object.freeze({ refresh, release(restore = false) { mounted.forEach(dial => dial.release(restore)); },
    dispose() { if (disposed) return; disposed = true; mounted.forEach(dial => dial.dispose()); element.remove(); }, element, precision });
}
