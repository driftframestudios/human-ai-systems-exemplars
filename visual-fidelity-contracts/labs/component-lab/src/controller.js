import { createComponentState, createComponentSuccessorState, reduceComponentState } from './model.js';
import { renderComponentLab } from './render.js';

const DEFAULT_FIXTURE = new URL('../fixtures/valid/catalog.json', import.meta.url);
const INVALID_FIXTURE = new URL('../fixtures/invalid/missing-lineage.json', import.meta.url);
const ACTIVE_COMPONENT_LABS = new WeakMap();
const REPLACEMENT_RELEASE = Symbol('component-lab-replacement-release');

async function readFixture(url, signal) {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Fixture request returned HTTP ${response.status}.`);
  return response.json();
}

export function enhanceComponentLab(root, initialFixture, browser = globalThis) {
  if (!root?.querySelector || !root?.cloneNode || !browser?.AbortController) throw new TypeError('A lab root and browser APIs are required.');
  const incumbent = ACTIVE_COMPONENT_LABS.get(root);
  // Admit both the supplied contract and the complete receiving markup on a
  // detached root. A successful successor carries compatible local work; a
  // rejected successor leaves the current owner operational.
  const admittedState = incumbent
    ? createComponentSuccessorState(initialFixture, incumbent.snapshot())
    : createComponentState(initialFixture);
  renderComponentLab(root.cloneNode(true), admittedState);
  const dialog = root.querySelector('[data-component-dialog]');
  if (!dialog?.showModal || !dialog?.close) throw new TypeError('The component lab requires one operable dialog.');
  const initialMarkup = incumbent ? null : root.cloneNode(true);
  let state = admittedState;
  let requestSequence = 0;
  let intentSequence = 0;
  let reconcileTimer = null;
  let requestController = null;
  let listenerOwner = null;
  let api;
  let dialogInvoker = null;

  const present = () => renderComponentLab(root, state);
  const apply = (event) => {
    const outcome = reduceComponentState(state, event);
    state = outcome.state;
    present();
    return outcome;
  };

  const inactive = reason => ({ state, applied: false, reason });
  const ownsRoot = () => state.ownership.standing === 'active'
    && api !== undefined
    && ACTIVE_COMPONENT_LABS.get(root) === api;
  const inactiveOwner = () => inactive(state.ownership.standing === 'released' ? 'owner-released' : 'owner-superseded');

  async function load(kind = 'current') {
    if (!ownsRoot()) return inactiveOwner();
    const url = kind === 'current' ? DEFAULT_FIXTURE : kind === 'invalid' ? INVALID_FIXTURE : null;
    if (!url) throw new TypeError(`Unknown component fixture kind: ${kind}.`);
    requestController?.abort();
    const activeRequest = new browser.AbortController();
    requestController = activeRequest;
    const requestId = `component-request-${++requestSequence}`;
    const ownerGeneration = state.ownership.generation;
    const started = apply({ type: 'request.started', requestId, ownerGeneration });
    if (!started.applied) return started;
    try {
      const fixture = await readFixture(url, activeRequest.signal);
      // Abort is not a complete settlement gate once response/body work has
      // crossed its cancellation boundary. Re-check the exact root owner before
      // a retired controller can project anything into a replacement's DOM.
      if (!ownsRoot()) return inactiveOwner();
      const admitted = apply({ type: 'request.succeeded', requestId, ownerGeneration, fixture });
      if (!admitted.applied && admitted.reason.startsWith('candidate-rejected:')) {
        return apply({ type: 'request.failed', requestId, ownerGeneration, message: admitted.reason.replace('candidate-rejected: ', 'Candidate revision rejected: ') });
      }
      return admitted;
    } catch (error) {
      if (error?.name === 'AbortError') return { state, applied: false, reason: 'request-aborted' };
      if (!ownsRoot()) return inactiveOwner();
      return apply({ type: 'request.failed', requestId, ownerGeneration, message: error instanceof Error ? error.message : 'Fixture request failed.' });
    } finally {
      if (requestController === activeRequest) requestController = null;
    }
  }

  function submit() {
    if (state.ownership.standing === 'released') return inactive('owner-released');
    const intentId = `intent-${state.fixture.revision}-${++intentSequence}`;
    const ownerGeneration = state.ownership.generation;
    const provisional = apply({ type: 'intent.submitted', intentId, ownerGeneration });
    if (!provisional.applied) {
      const recoveryControl = provisional.reason === 'authorization-required'
        ? root.querySelector('#component-authorization')
        : provisional.reason === 'current-data-required'
          ? root.querySelector('[data-component-action="reload"]')
          : null;
      recoveryControl?.focus({ preventScroll: true });
      return provisional;
    }
    if (reconcileTimer !== null) browser.clearTimeout(reconcileTimer);
    reconcileTimer = browser.setTimeout(() => {
      reconcileTimer = null;
      if (!ownsRoot()) return;
      apply({ type: 'intent.reconciled', intentId, ownerGeneration, outcome: 'accepted', receiptId: `receipt-${intentId}` });
    }, 450);
    return provisional;
  }

  const handleChange = (event) => {
    if (!ownsRoot()) return;
    const target = event.target;
    if (target?.name === 'catalog-item') apply({ type: 'selection.changed', sku: target.value });
    if (target?.id === 'component-authorization') apply({ type: 'authorization.changed', standing: target.value });
  };

  const handleDisclosure = (event) => {
    if (!ownsRoot()) return;
    apply({ type: 'disclosure.changed', standing: event.target.open ? 'expanded' : 'compact' });
  };

  const handleInput = (event) => {
    if (!ownsRoot()) return;
    const field = event.target?.dataset?.componentDraft;
    if (field) apply({ type: 'draft.changed', field, value: event.target.value });
  };

  const handleSubmit = (event) => {
    if (!ownsRoot()) return;
    if (!event.target?.matches?.('[data-component-form]')) return;
    event.preventDefault();
    submit();
  };

  const handleClick = (event) => {
    if (!ownsRoot()) return;
    const action = event.target?.closest?.('[data-component-action]')?.dataset.componentAction;
    if (action === 'reload') load('current');
    if (action === 'load-invalid') load('invalid');
    if (action === 'open-dialog') {
      dialogInvoker = event.target.closest('[data-component-action]');
      dialog.showModal();
      dialog.querySelector('select, input, button')?.focus();
    }
    if (action === 'close-dialog') dialog.close();
  };

  const returnDialogFocus = () => {
    if (!ownsRoot()) return;
    const fallback = root.querySelector('[data-component-action="open-dialog"], input, select, button');
    const destination = dialogInvoker?.isConnected ? dialogInvoker : fallback;
    destination?.focus({ preventScroll: true });
  };

  function bindListeners() {
    const candidateListenerOwner = new browser.AbortController();
    const options = { signal: candidateListenerOwner.signal };
    try {
      // Fresh wrappers keep candidate registrations distinct from the active
      // set. EventTarget otherwise de-duplicates the same callback identity,
      // leaving the apparent candidate owned by the incumbent abort signal.
      root.addEventListener('change', event => handleChange(event), options);
      root.addEventListener('input', event => handleInput(event), options);
      root.addEventListener('submit', event => handleSubmit(event), options);
      root.addEventListener('click', event => handleClick(event), options);
      root.querySelector('[data-component-disclosure]')?.addEventListener('toggle', event => handleDisclosure(event), options);
      dialog?.addEventListener('close', () => returnDialogFocus(), options);
    } catch (error) {
      candidateListenerOwner.abort();
      throw error;
    }
    return candidateListenerOwner;
  }

  api = Object.freeze({
    load,
    submit,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    replaceOwner(ownerId) {
      if (state.ownership.standing === 'released') return inactive('owner-released');
      if (typeof ownerId !== 'string' || ownerId.trim() === '') throw new TypeError('ownerId must be a non-empty string.');
      if (ownerId === state.ownership.ownerId) return inactive('owner-unchanged');
      const replaced = reduceComponentState(state, { type: 'owner.replaced', ownerId });
      if (!replaced.applied) return replaced;

      // Acquire the complete successor listener set while the incumbent still
      // owns state, async work, and recovery. Admission failure releases only
      // the candidate resources and leaves the working owner untouched.
      const candidateListenerOwner = bindListeners();
      const incumbentState = state;
      try {
        state = replaced.state;
        present();
      } catch (error) {
        state = incumbentState;
        candidateListenerOwner.abort();
        try {
          present();
        } catch (recoveryError) {
          throw new AggregateError([error, recoveryError], 'Component owner replacement paused with recovery failures.');
        }
        throw error;
      }

      const incumbentListenerOwner = listenerOwner;
      listenerOwner = candidateListenerOwner;
      incumbentListenerOwner?.abort();
      requestController?.abort();
      requestController = null;
      if (reconcileTimer !== null) browser.clearTimeout(reconcileTimer);
      reconcileTimer = null;
      if (dialog?.open) dialog.close();
      return replaced;
    },
    destroy(releaseMode) {
      if (state.ownership.standing === 'released') return JSON.parse(JSON.stringify(state));
      const preservePresentation = releaseMode === REPLACEMENT_RELEASE;
      requestController?.abort();
      requestController = null;
      if (reconcileTimer !== null) browser.clearTimeout(reconcileTimer);
      reconcileTimer = null;
      if (dialog?.open) dialog.close();
      listenerOwner?.abort();
      listenerOwner = null;
      if (preservePresentation) state = reduceComponentState(state, { type: 'owner.released' }).state;
      else apply({ type: 'owner.released' });
      if (ACTIVE_COMPONENT_LABS.get(root) === api) ACTIVE_COMPONENT_LABS.delete(root);
      return JSON.parse(JSON.stringify(state));
    },
  });

  try {
    // Candidate resources and the live projection enter while the incumbent
    // still owns recovery. A failed listener or render admission therefore
    // rolls back without retiring the working controller.
    listenerOwner = bindListeners();
    present();
  } catch (error) {
    listenerOwner?.abort();
    listenerOwner = null;
    const recoveryFailures = [];
    try {
      if (incumbent) renderComponentLab(root, incumbent.snapshot());
      else if (initialMarkup) {
        for (const attribute of [...root.attributes]) root.removeAttribute(attribute.name);
        for (const attribute of [...initialMarkup.attributes]) root.setAttribute(attribute.name, attribute.value);
        root.replaceChildren(...initialMarkup.childNodes);
      }
    } catch (recoveryError) {
      recoveryFailures.push(recoveryError);
    }
    if (recoveryFailures.length > 0) {
      throw new AggregateError([error, ...recoveryFailures], 'Component successor admission paused with recovery failures.');
    }
    throw error;
  }

  let retirementError = null;
  try {
    incumbent?.destroy(REPLACEMENT_RELEASE);
  } catch (error) {
    retirementError = error;
  }
  ACTIVE_COMPONENT_LABS.set(root, api);
  if (retirementError) {
    root.querySelector('[data-component-live]').textContent = `The replacement is active. Previous owner cleanup paused: ${retirementError instanceof Error ? retirementError.message : 'unexpected cleanup response'}.`;
  }
  return api;
}

async function start() {
  const root = document.querySelector('[data-component-lab]');
  if (!root) return;
  const startupOwner = new AbortController();
  const handlePageHide = event => {
    if (event.persisted) return;
    startupOwner.abort();
    ACTIVE_COMPONENT_LABS.get(root)?.destroy();
    globalThis.removeEventListener?.('pagehide', handlePageHide);
  };
  // A BFCache transition retains the document and this page-level release
  // owner. The later terminal pagehide still releases whichever lab is active.
  globalThis.addEventListener?.('pagehide', handlePageHide);
  try {
    const fixture = await readFixture(DEFAULT_FIXTURE, startupOwner.signal);
    if (startupOwner.signal.aborted) return;
    globalThis.__componentLab = enhanceComponentLab(root, fixture);
  } catch (error) {
    if (startupOwner.signal.aborted || error?.name === 'AbortError') return;
    const status = root.querySelector('[data-component-live]');
    status.textContent = `The accepted fixture is unavailable. Open the standalone reading artifact, then retry this interactive route. ${error instanceof Error ? error.message : ''}`;
  }
}

if (typeof document !== 'undefined') start();
