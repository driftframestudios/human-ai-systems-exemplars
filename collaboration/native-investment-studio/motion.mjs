const INSTANCES = new WeakMap();
let sequence = 0;
const SCROLLS = new WeakMap();

// Nearby inspectors stay put. Longer moves are cancelable by the visitor.
export function revealStudioDestination(element, { block = 'start' } = {}) {
  const document = element?.ownerDocument, window = document?.defaultView;
  if (!window || !element.isConnected || !element.getClientRects().length) return;
  SCROLLS.get(window)?.();
  const box = element.getBoundingClientRect(), inset = 76;
  if (box.top >= inset && box.top < window.innerHeight - 120) return;
  const root = element.closest('[data-native-coordination]'), mode = root?.dataset.nativeMotion;
  const start = window.scrollY, offset = block === 'center' ? Math.max(inset, (window.innerHeight - Math.min(box.height, 400)) / 2) : inset;
  const end = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, start + box.top - offset));
  if (mode === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { window.scrollTo({ top: end, behavior: 'instant' }); return; }
  let frame = 0, began = null;
  const duration = mode === 'lower' ? 900 : 450;
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  const stop = () => { window.cancelAnimationFrame(frame); events.forEach(type => window.removeEventListener(type, stop)); if (SCROLLS.get(window) === stop) SCROLLS.delete(window); };
  const tick = now => {
    began ??= now;
    const t = Math.min(1, (now - began) / duration);
    // A soft settle without overshooting the reading or taking over free scroll.
    const ease = 1 - Math.pow(1 - t, 4);
    window.scrollTo({ top: start + (end - start) * ease, behavior: 'instant' });
    if (t < 1) frame = window.requestAnimationFrame(tick); else stop();
  };
  events.forEach(type => window.addEventListener(type, stop, { passive: true }));
  SCROLLS.set(window, stop); frame = window.requestAnimationFrame(tick);
}

// Presentation belongs to this mounted Studio. Plan imports, edits and history
// keep their separate ownership, and system reduction constrains full motion.
export function mountStudioMotion(root) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root?.ownerDocument, window = document?.defaultView;
  if (!window) throw new TypeError('Supply a Studio root with a document.');
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const original = root.getAttribute('data-native-motion');
  const listeners = new Set(), cleanup = [], controls = [];
  const slot = root.querySelectorAll('[data-native-motion-controls]')[0];
  let requested = 'full', disposed = false, generation = 0, group = null;
  const disclosures = new Map();
  let indication = null, cue = null, indicationGeneration = 0;
  let snapshot;

  function cancelIndication() {
    indicationGeneration += 1;
    const previous = indication; indication = null;
    try { previous?.cancel(); } catch { /* The selected inspector remains readable. */ }
  }
  function restoreCue() {
    if (!cue) return;
    if (cue.original === null) cue.element.removeAttribute('data-native-arrival'); else cue.element.setAttribute('data-native-arrival', cue.original);
    cue = null;
  }
  function indicate(element, { kind = 'inspection' } = {}) {
    if (disposed || kind !== 'inspection' || !root.contains(element)) return false;
    cancelIndication();
    if (cue?.element !== element) { restoreCue(); cue = { element, original: element.getAttribute('data-native-arrival') }; }
    element.setAttribute('data-native-arrival', 'inspection');
    if (snapshot.effective === 'off' || snapshot.systemReduced || document.visibilityState === 'hidden' || typeof element.animate !== 'function') return true;
    const epoch = generation, effect = indicationGeneration;
    try {
      const current = element.animate([
        { boxShadow: 'inset 0 0 0 .3rem var(--native-signal)' },
        { boxShadow: 'inset 0 0 0 0 transparent' },
      ], { duration: snapshot.effective === 'lower' ? 360 : 180, easing: 'ease-out' });
      const release = () => { if (indication === current) indication = null; };
      current.finished.then(release, release);
      if (disposed || generation !== epoch || indicationGeneration !== effect) { current.cancel(); return false; }
      indication = current;
    } catch { /* The static destination cue supplies the complete reading. */ }
    return true;
  }

  function update() {
    const epoch = ++generation;
    snapshot = Object.freeze({ requested, effective: disposed || requested === 'off' ? 'off' : media?.matches ? 'lower' : requested,
      systemReduced: Boolean(media?.matches), disposed });
    root.setAttribute('data-native-motion', snapshot.effective);
    cancelIndication();
    SCROLLS.get(window)?.();
    for (const settle of disclosures.values()) settle();
    for (const animation of root.getAnimations?.({ subtree: true }) ?? []) animation.cancel();
    for (const input of controls) input.checked = input.value === requested;
    for (const listener of [...listeners]) {
      if (epoch !== generation) break;
      if (listeners.has(listener)) listener(snapshot);
    }
  }
  function set(value) {
    if (!['off', 'lower', 'full'].includes(value)) throw new TypeError('Choose off, lower or full Studio motion.');
    if (disposed || value === requested) return false;
    requested = value; update(); return true;
  }
  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('Supply a motion listener.');
    if (disposed) return () => {};
    listeners.add(listener); return () => listeners.delete(listener);
  }
  function listen(target, event, handler) {
    target.addEventListener(event, handler); cleanup.push(() => target.removeEventListener(event, handler));
  }
  function dispose() {
    if (disposed) return;
    disposed = true; update(); listeners.clear();
    cleanup.splice(0).forEach(release => release()); restoreCue(); group?.remove();
    if (original === null) root.removeAttribute('data-native-motion'); else root.setAttribute('data-native-motion', original);
    INSTANCES.delete(root);
  }
  const owner = Object.freeze({ read: () => snapshot, set, subscribe, indicate, dispose });
  try {
    if (slot) {
      const name = `native-studio-motion-${++sequence}`;
      group = document.createElement('div'); group.className = 'native-motion'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', 'Animation settings');
      const choices = document.createElement('div'); choices.className = 'native-motion__choices';
      for (const [value, text] of [['off', 'Off'], ['lower', 'Half-speed'], ['full', 'Full-speed']]) {
        const label = document.createElement('label'), input = document.createElement('input'), words = document.createElement('span');
        input.type = 'radio'; input.name = name; input.value = value; input.setAttribute('data-native-motion-choice', value);
        words.textContent = text; label.append(input, words); choices.append(label); controls.push(input);
        listen(input, 'change', () => { if (input.checked) set(value); });
      }
      group.append(choices); slot.append(group);
    }
    listen(root, 'click', event => {
      const summary = event.target.closest('summary'), details = summary?.parentElement;
      if (event.defaultPrevented || details?.tagName !== 'DETAILS' || !root.contains(details)
        || snapshot.effective === 'off' || snapshot.systemReduced || typeof details.animate !== 'function') return;
      event.preventDefault();
      const prior = disclosures.get(details), opening = prior ? !prior.opening : !details.open;
      const height = details.getBoundingClientRect().height; prior?.();
      details.open = true;
      const target = opening ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
      const overflow = details.style.overflow; details.style.overflow = 'hidden';
      const effect = details.animate([{ height: `${height}px` }, { height: `${target}px` }], { duration: snapshot.effective === 'lower' ? 480 : 240, easing: 'cubic-bezier(.22,.7,.25,1)' });
      const settle = () => { if (disclosures.get(details) !== settle) return; disclosures.delete(details); details.open = opening; details.style.overflow = overflow; effect.cancel(); };
      settle.opening = opening; disclosures.set(details, settle); effect.finished.then(settle, settle);
    });
    listen(root, 'click', event => {
      const control = event.target.closest('.native-control--navigate');
      if (!control || !root.contains(control)) return;
      root.querySelectorAll('[data-native-destination-active]').forEach(item => item.removeAttribute('data-native-destination-active'));
      control.setAttribute('data-native-destination-active', 'true');
    });
    if (media?.addEventListener) listen(media, 'change', update);
    listen(document, 'visibilitychange', () => { if (document.visibilityState === 'hidden') cancelIndication(); });
    update(); INSTANCES.set(root, owner); return owner;
  } catch (error) { dispose(); throw error; }
}
