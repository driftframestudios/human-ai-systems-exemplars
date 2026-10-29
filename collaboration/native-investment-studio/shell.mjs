const INSTANCES = new WeakMap();
const CHAPTER_KEYS = new Set(['coordination', 'people', 'work', 'change', 'horizon', 'investment']);
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MOTION = Object.freeze({ duration: 160, easing: 'ease-out' });
const HISTORY_KEY = '__contextCanvasNativeStudio';

function snapshot(element, names) {
  return { element, attributes: names.map(name => [name, element.getAttribute(name)]) };
}

function restore({ element, attributes }) {
  for (const [name, value] of attributes) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
}

// This owner changes presentation only. Mounted editors retain their own model,
// raw drafts, listeners and disclosure state across chapter selection.
export function mountChapterShell(root) {
  if (INSTANCES.has(root)) return INSTANCES.get(root);
  const document = root?.ownerDocument;
  const window = document?.defaultView;
  if (!window) throw new TypeError('Supply a native Studio root with a document.');
  const lists = [...root.querySelectorAll('[data-native-chapter-list]')];
  const panels = [...root.querySelectorAll('[data-native-chapter-panel]')];
  if (lists.length !== 1) throw new TypeError('Supply one native Studio chapter list.');
  const list = lists[0];
  const buttons = [...list.querySelectorAll('[data-native-chapter]')];
  if (!buttons.length || buttons.length > CHAPTER_KEYS.size || panels.length !== buttons.length
    || !(list.getAttribute('aria-label')?.trim() || list.getAttribute('aria-labelledby')?.trim())) {
    throw new TypeError('Supply labelled chapter controls and their complete panels.');
  }

  const panelByKey = new Map();
  for (const panel of panels) {
    const key = panel.getAttribute('data-native-chapter-panel');
    if (!CHAPTER_KEYS.has(key) || panelByKey.has(key) || panel.id !== `native-studio-${key}`
      || document.getElementById(panel.id) !== panel || panel.contains(list) || list.contains(panel)
      || panel.parentElement?.closest('[data-native-chapter-panel]')) {
      throw new TypeError('Supply unique, source-owned native Studio chapter panels.');
    }
    panelByKey.set(key, panel);
  }
  const chapters = new Map();
  const ids = new Set(panels.map(panel => panel.id));
  for (const button of buttons) {
    const key = button.getAttribute('data-native-chapter');
    const panel = panelByKey.get(key);
    if (!panel || chapters.has(key) || button.localName !== 'button' || button.disabled
      || !button.id || ids.has(button.id) || document.getElementById(button.id) !== button
      || button.getAttribute('aria-controls') !== panel.id
      || !(button.textContent?.trim() || button.getAttribute('aria-label')?.trim()
        || button.getAttribute('aria-labelledby')?.trim())) {
      throw new TypeError('Supply one named native button for each Studio chapter.');
    }
    ids.add(button.id);
    chapters.set(key, { key, button, panel, index: chapters.size });
  }

  // Admission finishes before the first attribute or listener changes. Disposal
  // restores these authored attributes without replacing any editor descendants.
  const originals = [
    snapshot(root, ['data-native-chapters-ready']),
    snapshot(list, ['role', 'hidden']),
    ...buttons.map(button => snapshot(button, ['type', 'role', 'aria-selected', 'tabindex'])),
    ...panels.map(panel => snapshot(panel, ['role', 'aria-labelledby', 'tabindex', 'hidden'])),
  ];
  const order = Object.freeze([...chapters.keys()]);
  const fallbackPanel = panels.find(panel => !panel.hidden);
  const cleanup = [];
  const reducedMotion = window.matchMedia?.(MOTION_QUERY);
  let active = chapters.get(order[0]);
  let focused = active;
  let animation = null;
  let disposed = false;
  let selectionGeneration = 0;

  function listen(target, type, callback) {
    target.addEventListener(type, callback);
    cleanup.push(() => target.removeEventListener(type, callback));
  }

  function cancelMotion() {
    const previous = animation;
    animation = null;
    try { previous?.cancel(); }
    catch { /* Semantic state and listener cleanup retain their own completion. */ }
  }

  function animatePanel(panel, generation) {
    if (disposed || reducedMotion?.matches || document.visibilityState === 'hidden' || typeof panel.animate !== 'function') return;
    // An unavailable animation leaves the selected semantic state complete.
    try {
      const current = panel.animate([
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ], MOTION);
      const release = () => { if (animation === current) animation = null; };
      current.finished.then(release, release);
      if (disposed || generation !== selectionGeneration) {
        current.cancel();
        return;
      }
      animation = current;
    } catch { /* The selected reading remains complete when motion is unavailable. */ }
  }

  function revealTab(chapter) {
    const frame = list.getBoundingClientRect();
    const target = chapter.button.getBoundingClientRect();
    // Reveal only the tab strip's horizontal area; About retains vertical scroll.
    if (target.width > frame.width || target.left < frame.left) list.scrollLeft += target.left - frame.left;
    else if (target.right > frame.right) list.scrollLeft += target.right - frame.right;
  }

  function focusTab(chapter) {
    if (disposed) return false;
    focused.button.tabIndex = -1;
    focused = chapter;
    focused.button.tabIndex = 0;
    focused.button.focus({ preventScroll: true });
    if (disposed || focused !== chapter) return false;
    revealTab(chapter);
    return true;
  }

  function entryChapter() {
    const saved = window.history.state?.[HISTORY_KEY];
    return saved?.version === 1 ? chapters.get(saved.chapter) : null;
  }

  function stateWithChapter(chapter) {
    const state = window.history.state;
    // About currently has record-shaped history state. A foreign scalar or
    // array retains its own representation and the shell uses fragment recovery.
    if (state !== null && (typeof state !== 'object' || Array.isArray(state))) return state;
    return { ...state, [HISTORY_KEY]: { version: 1, chapter: chapter.key } };
  }

  function rememberEntry() {
    if (disposed) return;
    try { window.history.replaceState(stateWithChapter(active), '', window.location.href); }
    catch { /* Fragment recovery remains available when entry writes are unavailable. */ }
  }

  function writeFragment(chapter) {
    const hash = `#${chapter.panel.id}`;
    if (window.location.hash === hash) return;
    try { window.history.pushState(stateWithChapter(chapter), '', hash); }
    catch { /* Chapter selection also works when history writes are unavailable. */ }
  }

  function choose(key, { history = false, focus = false, motion = false } = {}) {
    const next = chapters.get(key);
    if (disposed || !next) return false;
    const generation = ++selectionGeneration;
    if (history) writeFragment(next);
    if (disposed || generation !== selectionGeneration) return false;
    if (active === next) {
      if (focus) focusTab(next);
      return !disposed && generation === selectionGeneration;
    }
    cancelMotion();
    if (disposed || generation !== selectionGeneration) return false;
    const moveFocus = focus || active.panel.contains(document.activeElement);
    if (moveFocus) focusTab(next);
    else focused.button.tabIndex = -1;
    if (disposed || generation !== selectionGeneration) return false;
    active.button.setAttribute('aria-selected', 'false');
    active.button.tabIndex = -1;
    active.panel.hidden = true;
    next.button.setAttribute('aria-selected', 'true');
    next.button.tabIndex = 0;
    next.panel.hidden = false;
    active = next;
    if (!moveFocus) focused = next;
    if (motion) animatePanel(next.panel, generation);
    return !disposed && generation === selectionGeneration;
  }

  function fragmentDestination() {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); }
    catch { return null; }
    const target = id ? document.getElementById(id) : null;
    if (!target || !root.contains(target)) return null;
    const panel = target.closest('[data-native-chapter-panel]');
    const chapter = chapters.get(panel?.getAttribute('data-native-chapter-panel'));
    return chapter?.panel === panel ? { chapter, target } : null;
  }

  function reconcileFragment({ restoreEntry = false, focusReading = false } = {}) {
    if (disposed) return;
    const destination = fragmentDestination();
    if (!destination) {
      const saved = restoreEntry ? entryChapter() : null;
      if (saved && choose(saved.key) && focusReading && document.activeElement === document.body) {
        saved.panel.focus({ preventScroll: true });
      }
      rememberEntry();
      return;
    }
    const { chapter, target } = destination;
    const revealed = active !== chapter;
    if (!choose(chapter.key)) return;
    // Native fragment scrolling may already have attempted the hidden panel.
    // Preserve descendant URLs such as #native-team-title, then reveal their
    // original destination after its chapter joins the document flow.
    if (revealed) {
      target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
    }
    if (!disposed && focusReading && document.activeElement === document.body) {
      chapter.panel.focus({ preventScroll: true });
    }
    rememberEntry();
  }

  function eventChapter(event) {
    const button = event.target.closest?.('button[data-native-chapter]');
    const chapter = chapters.get(button?.getAttribute('data-native-chapter'));
    return chapter?.button === button ? chapter : null;
  }

  function click(event) {
    if (event.defaultPrevented) return;
    const chapter = eventChapter(event);
    if (chapter) choose(chapter.key, { history: true, focus: true, motion: true });
  }

  function keydown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const chapter = eventChapter(event);
    if (!chapter) return;
    let index;
    switch (event.key) {
      case 'ArrowLeft': index = (chapter.index + order.length - 1) % order.length; break;
      case 'ArrowRight': index = (chapter.index + 1) % order.length; break;
      case 'Home': index = 0; break;
      case 'End': index = order.length - 1; break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(chapter.key, { history: true, focus: true, motion: true });
        return;
      default: return;
    }
    event.preventDefault();
    focusTab(chapters.get(order[index]));
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    selectionGeneration += 1;
    cancelMotion();
    for (const release of cleanup) release();
    cleanup.length = 0;
    // The authored fallback may conceal its inactive controls. Move focus into
    // the restored reading before returning their original hidden attribute.
    if (list.contains(document.activeElement) && originals[1].attributes.some(([name, value]) => name === 'hidden' && value !== null)) {
      if (fallbackPanel) {
        fallbackPanel.hidden = false;
        fallbackPanel.focus({ preventScroll: true });
      }
    }
    for (const original of originals) restore(original);
    INSTANCES.delete(root);
  }

  const receiver = Object.freeze({
    read: () => Object.freeze({ activeChapter: active.key, chapters: order, disposed }),
    select: key => choose(key, { history: true, focus: true, motion: true }),
    dispose,
  });

  try {
    list.setAttribute('role', 'tablist');
    for (const chapter of chapters.values()) {
      chapter.button.type = 'button';
      chapter.button.setAttribute('role', 'tab');
      chapter.button.setAttribute('aria-selected', String(chapter === active));
      chapter.button.tabIndex = chapter === active ? 0 : -1;
      chapter.panel.setAttribute('role', 'tabpanel');
      chapter.panel.setAttribute('aria-labelledby', chapter.button.id);
      chapter.panel.tabIndex = 0;
      chapter.panel.hidden = chapter !== active;
    }
    listen(list, 'click', click);
    listen(list, 'keydown', keydown);
    listen(list, 'focusout', event => {
      if (!list.contains(event.relatedTarget)) {
        focused.button.tabIndex = -1;
        active.button.tabIndex = 0;
        focused = active;
      }
    });
    listen(window, 'hashchange', () => reconcileFragment({ focusReading: true }));
    listen(window, 'popstate', () => reconcileFragment({ restoreEntry: true, focusReading: true }));
    listen(window, 'pageshow', () => reconcileFragment({ restoreEntry: true }));
    listen(window, 'resize', () => revealTab(list.contains(document.activeElement) ? focused : active));
    listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
    listen(document, 'visibilitychange', () => { if (document.visibilityState === 'hidden') cancelMotion(); });
    if (reducedMotion?.addEventListener) listen(reducedMotion, 'change', () => { if (reducedMotion.matches) cancelMotion(); });
    list.hidden = false;
    reconcileFragment({ restoreEntry: true });
    root.setAttribute('data-native-chapters-ready', 'true');
    INSTANCES.set(root, receiver);
    return receiver;
  } catch (error) {
    dispose();
    throw error;
  }
}
