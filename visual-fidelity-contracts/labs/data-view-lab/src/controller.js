import { createDataViewState, reduceDataViewState } from './model.js';
import { renderDataViewLab } from './render.js';

const FIXTURES = Object.freeze({
  current: new URL('../fixtures/valid/current.json', import.meta.url),
  partial: new URL('../fixtures/valid/partial.json', import.meta.url),
  absent: new URL('../fixtures/valid/absent.json', import.meta.url),
  invalid: new URL('../fixtures/invalid/value-standing-mismatch.json', import.meta.url),
});
const ACTIVE_DATA_VIEW_LABS = new WeakMap();
const REPLACEMENT_RELEASE = Symbol('data-view-lab-replacement-release');

async function readFixture(url, signal) {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Fixture request returned HTTP ${response.status}.`);
  return response.json();
}

export function enhanceDataViewLab(root, initialFixture, browser = globalThis) {
  if (!root?.querySelector || !root?.cloneNode || !browser?.AbortController) throw new TypeError('A lab root and browser APIs are required.');
  // Admit both the supplied contract and the complete receiving markup on a
  // detached root. A rejected successor leaves the current owner operational.
  const admittedState = createDataViewState(initialFixture);
  renderDataViewLab(root.cloneNode(true), admittedState);
  const incumbent = ACTIVE_DATA_VIEW_LABS.get(root);
  const initialMarkup = incumbent ? null : root.cloneNode(true);
  let state = admittedState;
  let requestSequence = 0;
  let requestController = null;
  let listenerOwner = null;
  let api;
  const present = () => renderDataViewLab(root, state);
  const apply = (event) => {
    const result = reduceDataViewState(state, event);
    state = result.state;
    present();
    return result;
  };
  const inactiveOwner = () => ({
    state,
    applied: false,
    reason: state.ownership.standing === 'released' ? 'owner-released' : 'owner-superseded',
  });
  const ownsRoot = () => state.ownership.standing === 'active'
    && api !== undefined
    && ACTIVE_DATA_VIEW_LABS.get(root) === api;

  async function load(kind) {
    if (!ownsRoot()) return inactiveOwner();
    const url = FIXTURES[kind];
    if (!url) throw new TypeError(`Unknown fixture kind: ${kind}.`);
    requestController?.abort();
    const activeController = new browser.AbortController();
    requestController = activeController;
    const requestId = `data-request-${++requestSequence}`;
    const ownerGeneration = state.ownership.generation;
    const started = apply({ type: 'request.started', requestId, ownerGeneration });
    if (!started.applied) return started;
    try {
      const fixture = await readFixture(url, activeController.signal);
      // A response body can settle after AbortController cancellation. The
      // retired enhancer must not project its released state over a new owner.
      if (!ownsRoot()) return inactiveOwner();
      const admitted = apply({ type: 'request.succeeded', requestId, ownerGeneration, fixture });
      if (!admitted.applied && admitted.reason.startsWith('candidate-rejected:')) {
        return apply({
          type: 'request.failed', requestId, ownerGeneration,
          message: admitted.reason.replace('candidate-rejected: ', 'Candidate revision rejected: '),
        });
      }
      return admitted;
    } catch (error) {
      if (error?.name === 'AbortError') return { state, applied: false, reason: 'request-aborted' };
      if (!ownsRoot()) return inactiveOwner();
      return apply({
        type: 'request.failed', requestId, ownerGeneration,
        message: error instanceof Error ? error.message : 'Fixture request failed.',
      });
    } finally {
      if (requestController === activeController) requestController = null;
    }
  }

  function bindListeners() {
    const candidateListenerOwner = new browser.AbortController();
    const options = { signal: candidateListenerOwner.signal };
    try {
      root.addEventListener('change', (event) => {
        if (!ownsRoot()) return;
        if (event.target?.matches?.('[data-data-view]')) apply({ type: 'view.changed', decisionNeed: event.target.value });
        if (event.target?.matches?.('[data-data-authorization]')) apply({ type: 'authorization.changed', standing: event.target.value });
      }, options);

      root.addEventListener('click', (event) => {
        if (!ownsRoot()) return;
        const actionNode = event.target?.closest?.('[data-data-action]');
        const action = actionNode?.dataset.dataAction;
        if (action === 'load') void load(actionNode.dataset.fixture);
        if (action === 'previous') apply({ type: 'page.changed', page: state.view.page - 1 });
        if (action === 'next') apply({ type: 'page.changed', page: state.view.page + 1 });
      }, options);

      root.querySelector('[data-data-disclosure]')?.addEventListener('toggle', (event) => {
        if (!ownsRoot()) return;
        const standing = event.currentTarget.open ? 'expanded' : 'compact';
        if (state.disclosure.standing !== standing) apply({ type: 'disclosure.changed', standing });
      }, options);
    } catch (error) {
      candidateListenerOwner.abort();
      throw error;
    }
    return candidateListenerOwner;
  }

  api = Object.freeze({
    load,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    replaceOwner(ownerId) {
      if (state.ownership.standing === 'released') return { state, applied: false, reason: 'owner-released' };
      const result = reduceDataViewState(state, { type: 'owner.replaced', ownerId });
      if (!result.applied) return result;

      // Prove the successor listener set before changing the accepted owner.
      // A partially acquired candidate cleans up through its own abort signal.
      const candidateListenerOwner = bindListeners();
      const incumbentState = state;
      try {
        state = result.state;
        present();
      } catch (error) {
        state = incumbentState;
        candidateListenerOwner.abort();
        try {
          present();
        } catch (recoveryError) {
          throw new AggregateError([error, recoveryError], 'Data-view owner replacement paused with recovery failures.');
        }
        throw error;
      }

      const incumbentListenerOwner = listenerOwner;
      listenerOwner = candidateListenerOwner;
      incumbentListenerOwner?.abort();
      requestController?.abort();
      requestController = null;
      return result;
    },
    destroy(releaseMode) {
      if (state.ownership.standing === 'released') return JSON.parse(JSON.stringify(state));
      const preservePresentation = releaseMode === REPLACEMENT_RELEASE;
      requestController?.abort();
      requestController = null;
      listenerOwner?.abort();
      listenerOwner = null;
      if (preservePresentation) state = reduceDataViewState(state, { type: 'owner.released' }).state;
      else apply({ type: 'owner.released' });
      if (ACTIVE_DATA_VIEW_LABS.get(root) === api) ACTIVE_DATA_VIEW_LABS.delete(root);
      return JSON.parse(JSON.stringify(state));
    },
  });

  try {
    // The successor proves resource and live projection admission while the
    // incumbent remains the recovery owner. Promotion follows a complete paint.
    listenerOwner = bindListeners();
    present();
  } catch (error) {
    listenerOwner?.abort();
    listenerOwner = null;
    const recoveryFailures = [];
    try {
      if (incumbent) renderDataViewLab(root, incumbent.snapshot());
      else if (initialMarkup) {
        for (const attribute of [...root.attributes]) root.removeAttribute(attribute.name);
        for (const attribute of [...initialMarkup.attributes]) root.setAttribute(attribute.name, attribute.value);
        root.replaceChildren(...initialMarkup.childNodes);
      }
    } catch (recoveryError) {
      recoveryFailures.push(recoveryError);
    }
    if (recoveryFailures.length > 0) {
      throw new AggregateError([error, ...recoveryFailures], 'Data-view successor admission paused with recovery failures.');
    }
    throw error;
  }

  let retirementError = null;
  try {
    incumbent?.destroy(REPLACEMENT_RELEASE);
  } catch (error) {
    retirementError = error;
  }
  ACTIVE_DATA_VIEW_LABS.set(root, api);
  if (retirementError) {
    root.querySelector('[data-data-live]').textContent = `The replacement is active. Previous owner cleanup paused: ${retirementError instanceof Error ? retirementError.message : 'unexpected cleanup response'}.`;
  }
  return api;
}

async function start() {
  const root = document.querySelector('[data-data-view-lab]');
  if (!root) return;
  const startupOwner = new AbortController();
  const handlePageHide = event => {
    if (event.persisted) return;
    startupOwner.abort();
    ACTIVE_DATA_VIEW_LABS.get(root)?.destroy();
    globalThis.removeEventListener?.('pagehide', handlePageHide);
  };
  // A BFCache transition retains the document and this page-level release
  // owner. The later terminal pagehide still releases whichever lab is active.
  globalThis.addEventListener?.('pagehide', handlePageHide);
  try {
    const fixture = await readFixture(FIXTURES.current, startupOwner.signal);
    if (startupOwner.signal.aborted) return;
    globalThis.__dataViewLab = enhanceDataViewLab(root, fixture);
  } catch (error) {
    if (startupOwner.signal.aborted || error?.name === 'AbortError') return;
    root.querySelector('[data-data-live]').textContent = `The accepted fixture is unavailable. Open the single-file reading artifact, then retry this interactive route. ${error instanceof Error ? error.message : ''}`;
  }
}

if (typeof document !== 'undefined') start();
