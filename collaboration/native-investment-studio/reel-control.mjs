// A presentation control: callers own preset selection and accepted plan state.
export function createReel(document, { label, choices, value, onSelect, variant = 'teal', secondary = false }) {
  const options = new Map(choices.map((choice, index) => [choice.id, { ...choice, index }]));
  if (!options.size || options.size !== choices.length || typeof onSelect !== 'function') throw new TypeError('Supply distinct reel choices and a selection receiver.');
  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const element = node('fieldset', undefined, 'native-reel');
  element.dataset.reelVariant = variant; element.dataset.reelSecondary = String(secondary);
  const wheel = node('div', undefined, 'native-reel__wheel');
  const rotor = node('div', undefined, 'native-reel__rotor'); rotor.setAttribute('aria-hidden', 'true');
  const hub = node('button', '↻', 'native-reel__hub'); hub.type = 'button'; hub.setAttribute('aria-label', `Next ${label.toLowerCase()}`);
  const reading = node('output', '', 'native-reel__reading'); reading.setAttribute('aria-live', 'off');
  const buttons = new Map(); let selected = options.has(value) ? value : choices[0].id, angle = 0, variation = 0, disposed = false;
  for (const choice of choices) {
    const control = node('button', choice.label, 'native-reel__choice'); control.type = 'button'; control.dataset.reelChoice = choice.id;
    const radians = options.get(choice.id).index * Math.PI * 2 / choices.length - Math.PI / 2;
    control.style.setProperty('--reel-x', `${50 + 35 * Math.cos(radians)}%`);
    control.style.setProperty('--reel-y', `${50 + 36 * Math.sin(radians)}%`);
    buttons.set(choice.id, control); wheel.append(control);
  }
  wheel.prepend(rotor, hub); element.append(node('legend', label), wheel, reading);
  function select(id) {
    if (disposed || !options.has(id)) return false;
    const previous = options.get(selected).index, next = options.get(id).index;
    let distance = next - previous;
    if (distance > choices.length / 2) distance -= choices.length;
    if (distance < -choices.length / 2) distance += choices.length;
    angle += distance * 360 / choices.length; selected = id;
    element.dataset.reelValue = id; rotor.style.setProperty('--reel-angle', `${angle + variation}deg`);
    for (const [key, control] of buttons) control.setAttribute('aria-pressed', String(key === id));
    reading.textContent = options.get(id).label;
    return true;
  }
  function choose(id) { if (!disposed && select(id)) onSelect(id); }
  function step(direction) { choose(choices[(options.get(selected).index + direction + choices.length) % choices.length].id); }
  function click(event) {
    const choice = event.target.closest('[data-reel-choice]');
    if (choice && wheel.contains(choice)) choose(choice.dataset.reelChoice);
    else if (hub.contains(event.target)) step(1);
  }
  function keydown(event) {
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!direction) return;
    event.preventDefault(); step(direction); buttons.get(selected)?.focus({ preventScroll: true });
  }
  wheel.addEventListener('click', click); wheel.addEventListener('keydown', keydown); select(selected);
  return Object.freeze({ element, select, vary(amount) {
    if (disposed || !Number.isFinite(amount)) return false;
    variation = Math.max(0, Math.min(1, amount)) * 30;
    rotor.style.setProperty('--reel-angle', `${angle + variation}deg`);
    return true;
  }, dispose() {
    if (disposed) return; disposed = true;
    wheel.removeEventListener('click', click); wheel.removeEventListener('keydown', keydown); element.remove();
  } });
}

// Alternating names restart the CSS arrival without timers or layout reads.
export function revealReelResult(element) {
  element.dataset.reelArrival = element.dataset.reelArrival === 'odd' ? 'even' : 'odd';
}

// Animate the same keyed pad from its earlier lane to its new reading.
export function animateRackChange(container, render, { selector = '[data-studio-pad]', key = 'studioPad' } = {}) {
  const before = new Map([...container.querySelectorAll(selector)].map(pad => [pad.dataset[key], pad.getBoundingClientRect()]));
  render();
  const root = container.closest('[data-native-coordination]'), window = container.ownerDocument.defaultView;
  if (!root || root.dataset.nativeMotion === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const pad of container.querySelectorAll(selector)) {
    const old = before.get(pad.dataset[key]), next = pad.getBoundingClientRect();
    if (!old?.width || !next.width || Math.abs(old.x - next.x) + Math.abs(old.y - next.y) < 2 || !pad.animate) continue;
    pad.animate([
      { transform: `translate(${old.x - next.x}px, ${old.y - next.y}px) scale(.94)`, opacity: .55 },
      { transform: 'none', opacity: 1, boxShadow: 'inset 0 0 0 .2rem var(--native-signal)', offset: .8 },
      { transform: 'none', opacity: 1, boxShadow: 'inset 0 0 0 0 transparent' },
    ], { duration: root.dataset.nativeMotion === 'lower' ? 640 : 320, easing: 'cubic-bezier(.22,.7,.25,1)' });
  }
}
