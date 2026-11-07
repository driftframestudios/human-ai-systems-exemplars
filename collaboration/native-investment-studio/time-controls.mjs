import { LIMITS, CONTRACT } from './config.mjs';
import { WORK_DRAFT_TEXT_LIMIT } from './draft.mjs';

export const TIME_FIELDS = Object.freeze(['hoursPerSession', 'minutesPerSession', 'occurrences']);
const labels = Object.freeze({ hoursPerSession: 'Hours', minutesPerSession: 'Minutes', occurrences: 'Working sessions' });

// Dynamic proposals use the same semantic controls as the static Session form.
// The host retains its field names, draft port, validation and Apply action.
export function createTimeControls(document, { idPrefix, fieldPrefix = '', decorateField, decorateStep }) {
  const node = (tag, text, className) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; };
  const element = node('div', undefined, 'native-time-controls');
  const overview = node('div', undefined, 'native-coordination__duration-group native-time__overview'); overview.setAttribute('role', 'group'); overview.setAttribute('aria-labelledby', `${idPrefix}-duration-label`);
  const title = node('p', 'Time per person, per session', 'native-coordination__control-title'); title.id = `${idPrefix}-duration-label`;
  const display = node('output', undefined, 'native-coordination__duration-display'); display.setAttribute('aria-label', 'Draft time per person in one working session'); display.setAttribute('aria-live', 'off');
  const outputs = {};
  for (const name of ['hours', 'minutes']) { const part = node('span'), value = node('strong', '00'); part.append(value, node('span', name)); display.append(part); outputs[name] = value; }
  display.setAttribute('for', `${idPrefix}-hoursPerSession ${idPrefix}-minutesPerSession`);
  overview.append(title, display);
  const quantities = node('div', undefined, 'native-coordination__controls native-time__quantities'), feedback = node('div', undefined, 'native-coordination__feedback native-time__feedback'); feedback.setAttribute('role', 'group'); feedback.setAttribute('aria-label', 'Quantity feedback');
  const controls = new Map(), dials = {};
  for (const name of TIME_FIELDS) {
    const key = fieldPrefix + name, group = node('div', undefined, `native-coordination__control native-coordination__control--${name === 'hoursPerSession' ? 'hours' : name === 'minutesPerSession' ? 'minutes' : 'count'}`);
    const label = node('label', labels[name]), input = node('input'), stepper = node('div', undefined, 'native-coordination__stepper');
    Object.assign(input, { id: `${idPrefix}-${name}`, name: key, type: 'text', inputMode: 'numeric', autocomplete: 'off', spellcheck: false, maxLength: WORK_DRAFT_TEXT_LIMIT }); label.htmlFor = input.id; decorateField(input, key);
    const error = node('p', '', 'native-coordination__error'); error.id = input.id + '-error'; feedback.append(error);
    const range = node('p', `0–${(name === 'hoursPerSession' ? LIMITS.minutesPerOccurrence / CONTRACT.minutesPerHour : name === 'minutesPerSession' ? 59 : LIMITS.occurrences).toLocaleString('en-US')} ${name === 'hoursPerSession' ? 'hours' : name === 'minutesPerSession' ? 'minutes' : 'sessions'}`, 'native-coordination__hint'); range.id = input.id + '-range';
    input.setAttribute('aria-describedby', `${title.id} ${range.id} ${error.id}`);
    for (const direction of [-1, 1]) {
      const step = node('button', direction < 0 ? '−' : '+'); step.type = 'button'; decorateStep(step, key, direction);
      step.setAttribute('aria-label', `${direction < 0 ? 'Decrease' : 'Increase'} ${name === 'occurrences' ? 'working sessions by one' : `session duration by one ${name === 'hoursPerSession' ? 'hour' : 'minute'}`}`);
      stepper.append(step); if (direction === -1) stepper.append(input);
    }
    group.append(label);
    if (name !== 'occurrences') {
      const unit = name === 'hoursPerSession' ? 'hours' : 'minutes'; group.classList.add('native-time__part');
      const adjustment = node('div', undefined, 'native-time__adjustment');
      const dial = node('div', undefined, `native-knob native-knob--${unit}`); dial.dataset[unit === 'hours' ? 'nativeHoursDial' : 'nativeMinutesDial'] = ''; dial.hidden = true;
      const ticks = node('div', undefined, 'native-knob__ticks'), face = node('div', undefined, 'native-knob__face'); ticks.setAttribute('aria-hidden', 'true'); face.setAttribute('aria-hidden', 'true'); face.append(node('span', undefined, 'native-knob__pointer'));
      const knob = node('input'); Object.assign(knob, { type: 'range', min: '0', max: unit === 'hours' ? '24' : '59', step: '1', value: '0', id: `${idPrefix}-${unit === 'hours' ? 'hours-' : ''}dial` });
      knob.dataset[unit === 'hours' ? 'nativeHoursKnob' : 'nativeMinutesKnob'] = '';
      knob.setAttribute('aria-label', `${labels[name]} dial`); knob.setAttribute('aria-describedby', error.id);
      const note = node('p', '', 'native-coordination__hint'); note.hidden = true;
      note.dataset[unit === 'hours' ? 'nativeHoursKnobNote' : 'nativeKnobNote'] = ''; feedback.append(note);
      dial.append(ticks, face, knob); adjustment.append(dial, stepper); group.append(adjustment);
      dials[unit] = { dial, knob, note };
    } else group.append(stepper);
    group.append(range); quantities.append(group); controls.set(key, { input, error, group, key });
  }
  const context = node('p', '', 'native-coordination__hint'); context.id = `${idPrefix}-context`; quantities.lastElementChild.append(context);
  controls.get(fieldPrefix + 'occurrences').input.setAttribute('aria-describedby', `${context.id} ${idPrefix}-occurrences-range ${idPrefix}-occurrences-error`);
  element.append(overview, quantities, feedback);
  return Object.freeze({ element, controls, dials, ...dials.minutes, outputs, context });
}

export function renderTimeReadout({ outputs, context }, raw, { errors = [], composing = false, fieldPrefix = '', horizonWeeks } = {}) {
  for (const [name, field] of [['hours', 'hoursPerSession'], ['minutes', 'minutesPerSession']]) {
    const value = raw[fieldPrefix + field];
    outputs[name].textContent = composing || !/^[0-9]+$/.test(value ?? '') || errors.some(error => error.path === `draft.${fieldPrefix}${field}`) ? '—' : String(Number(value)).padStart(2, '0');
  }
  if (context) context.textContent = `Across this ${horizonWeeks}-week plan.`;
}

// The native range owns keyboard and assistive-technology semantics. This owner
// adds rotary pointer input while every publication checks the host's current lease.
function mountTimeDial({ unit, dial, knob, note, read, write }) {
  if (!dial || !knob) return Object.freeze({ refresh() {}, release() {}, dispose() {} });
  const scale = unit === 'hours' ? LIMITS.minutesPerOccurrence / CONTRACT.minutesPerHour : CONTRACT.minutesPerHour - 1;
  const window = knob.ownerDocument.defaultView, forcedColors = window.matchMedia('(forced-colors: active)'), cleanup = [];
  let gesture = null, disposed = false;
  const listen = (element, name, handler) => { element.addEventListener(name, handler); cleanup.push(() => element.removeEventListener(name, handler)); };
  function maximum(view) {
    const other = unit === 'hours' ? view?.minutes : view?.hours;
    const otherLimit = unit === 'hours' ? CONTRACT.minutesPerHour - 1 : LIMITS.minutesPerOccurrence / CONTRACT.minutesPerHour;
    if (!/^[0-9]+$/.test(other ?? '') || Number(other) > otherLimit) return null;
    return unit === 'hours' ? Math.floor((LIMITS.minutesPerOccurrence - Number(other)) / CONTRACT.minutesPerHour)
      : Math.min(scale, LIMITS.minutesPerOccurrence - Number(other) * CONTRACT.minutesPerHour);
  }
  function current() { const view = read(); return !disposed && view?.enabled && !knob.disabled ? view : null; }
  function set(value, token = current()?.token) {
    const view = current(); if (!view || view.token !== token) return;
    const max = maximum(view); if (max === null) return;
    const next = Number(value) > max ? String(max) : String(value);
    if (view.raw !== next) write(token, next);
  }
  function release(restore = false) {
    const captured = gesture; if (!captured) return; gesture = null; delete dial.dataset.dragging;
    if (knob.hasPointerCapture(captured.pointerId)) knob.releasePointerCapture(captured.pointerId);
    if (restore) set(captured.raw, captured.token);
  }
  function refresh() {
    if (disposed) return;
    const view = read(); if (disposed) return;
    const max = maximum(view), valid = max !== null && !view?.composing && /^[0-9]+$/.test(view?.raw ?? '') && Number(view.raw) <= max && !view.error;
    const enabled = valid && Boolean(view.enabled);
    if (gesture && (!enabled || gesture.token !== view.token)) release();
    knob.max = String(max ?? scale); knob.disabled = !enabled; dial.dataset.valueState = valid ? 'ready' : 'unavailable';
    if (valid) { knob.value = String(Number(view.raw)); knob.setAttribute('aria-valuetext', `${Number(view.raw)} ${unit} per session`); dial.style.setProperty('--native-knob-angle', `${-135 + Number(view.raw) * 270 / scale}deg`); }
    else knob.setAttribute('aria-valuetext', 'Enter valid hours and minutes.');
    if (note) {
      note.hidden = valid || Boolean(view?.composing);
      note.textContent = max === null ? 'Enter valid hours and minutes.'
        : unit === 'minutes' && max === 0 ? 'Use 0 minutes with 24 hours.' : `Enter 0–${max} ${unit}.`;
    }
  }
  function pointerAngle(event) {
    const box = knob.getBoundingClientRect(), x = event.clientX - box.left - box.width / 2, y = event.clientY - box.top - box.height / 2;
    if (Math.hypot(x, y) < 4) return null;
    const angle = Math.atan2(y, x) * 180 / Math.PI + 90; return angle > 180 ? angle - 360 : angle;
  }
  function turn(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (current()?.token !== gesture.token) { release(); return; }
    const angle = pointerAngle(event); if (angle === null) return;
    const delta = ((angle - gesture.lastAngle + 540) % 360) - 180;
    gesture.angle = Math.min(135, Math.max(-135, gesture.angle + delta)); gesture.lastAngle = angle;
    set(Math.round((gesture.angle + 135) * scale / 270), gesture.token);
  }
  listen(knob, 'input', () => set(knob.value));
  listen(knob, 'pointerdown', event => {
    if (forcedColors.matches) return;
    const view = current(); if (!view || gesture || !event.isPrimary || event.button !== 0) return;
    event.preventDefault(); knob.focus({ preventScroll: true });
    if (current()?.token !== view.token) return;
    const angle = pointerAngle(event) ?? -135 + Number(view.raw) * 270 / scale;
    knob.setPointerCapture(event.pointerId); gesture = { pointerId: event.pointerId, token: view.token, raw: view.raw, lastAngle: angle, angle: Math.min(135, Math.max(-135, angle)) };
    dial.dataset.dragging = 'true'; set(Math.round((gesture.angle + 135) * scale / 270), view.token);
  });
  listen(knob, 'pointermove', turn);
  listen(knob, 'pointerup', event => { if (gesture?.pointerId === event.pointerId) { turn(event); release(); } });
  // Focus/capture transfer settles the visible duration. Explicit cancellation
  // retains its separate route back to the amount where the turn began.
  listen(knob, 'lostpointercapture', event => { if (gesture?.pointerId === event.pointerId) release(); });
  listen(knob, 'pointercancel', event => { if (gesture?.pointerId === event.pointerId) release(true); });
  listen(knob, 'blur', () => release());
  listen(knob, 'keydown', event => { if (event.key === 'Escape' && gesture) { event.preventDefault(); release(true); } else if (gesture) release(); });
  listen(window, 'blur', () => release()); listen(forcedColors, 'change', () => release(true));
  dial.hidden = false; refresh();
  return Object.freeze({ refresh, release, dispose() { if (disposed) return; release(); disposed = true; cleanup.splice(0).forEach(release => release()); knob.disabled = true; dial.hidden = true; if (note) note.hidden = true; } });
}


// Both unit controls share one host lease. A dial writes only its own duration
// part; the complementary part determines its maximum and keeps its exact text.
export function mountDurationDials({ dials, read, write }) {
  const mounted = ['hours', 'minutes'].map(unit => mountTimeDial({ unit, ...dials[unit], read() {
    const view = read();
    return { ...view, raw: view?.[unit], error: view?.errors?.[unit] };
  }, write(token, value) { write(token, unit === 'hours' ? 'hoursPerSession' : 'minutesPerSession', value); } }));
  return Object.freeze({ refresh() { mounted.forEach(dial => dial.refresh()); }, release(restore = false) { mounted.forEach(dial => dial.release(restore)); },
    dispose() { mounted.forEach(dial => dial.dispose()); } });
}
