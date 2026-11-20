import {
  createDeferredDeliveryAdapter,
  createEventTargetLifetimeAdapter,
  createImmutableExternalStoreAdapter,
  createRevisionCacheAdapter,
  PLATFORM_ADAPTER_RECEIPTS,
} from './platform-adapters.js';
import { getScenario } from './scenario-data.js';

const CONTRACT_VERSION = 'lifecycle-contract@0.1.0';
const INITIAL_ACCEPTED = Object.freeze({ identity: 'entity-a', revision: 0, value: 'Reviewed baseline' });
const RESOURCE_TYPES = Object.freeze(['listeners', 'subscriptions', 'requests', 'infrastructure']);

export const RUNTIME_RECEIPT = Object.freeze({
  question: 'Which browser and framework lifecycle boundaries keep accepted state coherent through replay, replacement, and recovery?',
  decision: 'Use browser-owned semantics as the executable reference and require a named runtime receipt from each framework adapter.',
  labVersion: CONTRACT_VERSION,
  sourceDate: '2026-10-20',
  runtime: 'ECMAScript modules and browser platform APIs',
  adapterVersions: PLATFORM_ADAPTER_RECEIPTS.map(receipt => `${receipt.id}@${receipt.version}`).join(', '),
  receiverMatrix: 'The browser run records its user agent and platform; automation records its exact Playwright and engine versions.',
  frameworkStanding: 'Executable bounded platform adapters; named framework runtime receipt required for framework transfer',
  initialState: 'entity-a revision 0 with one live event-target listener and one live store subscription after mount',
  ownerAndRelease: 'The controller owns fixture resources; the enhancement owner registers its browser listener group for final release.',
  faultBoundary: 'Each scenario injects one named fault at its ownership or accepted-state update boundary.',
  oracle: 'Accepted state, live resource counters, focus, history, SVG references, and the event log remain inspectable.',
  evidenceStanding: 'Deterministic local mechanism evidence from executable bounded adapters',
  transfer: 'A consuming runtime records its exact browser, operating system, framework, package, and adapter versions.',
  preservedWorkAndReentry: 'Each scenario names the work it carries forward and the event that begins the next valid owner.',
});

function clone(value) {
  return structuredClone(value);
}

function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
}

function svgIds(instance, shared = false) {
  const prefix = shared ? 'lifecycle-shared' : `lifecycle-${instance}`;
  return Object.freeze({
    title: `${prefix}-title`,
    description: `${prefix}-description`,
    gradient: `${prefix}-gradient`,
    clip: `${prefix}-clip`,
  });
}

export function createSvgIdentityPair(shared = false) {
  return Object.freeze([svgIds('alpha', shared), svgIds('beta', shared)]);
}

export function createLifecycleController({
  onChange = () => {},
  abortControllerFactory = () => new AbortController(),
  serverContractVersion = CONTRACT_VERSION,
  clientContractVersion = CONTRACT_VERSION,
  adapterFactories = {},
} = {}) {
  if (typeof onChange !== 'function' || typeof abortControllerFactory !== 'function') {
    throw new TypeError('Lifecycle controller collaborators must be functions.');
  }

  let resourceSequence = 0;
  let eventSequence = 0;
  let requestSequence = 0;
  let ownerGeneration = 0;
  let destroyed = false;
  let session = null;
  let currentRequest = null;
  let pulseObservations = 0;
  const requests = new Map();
  const resources = new Map();
  const eventAdapter = (adapterFactories.eventTarget ?? createEventTargetLifetimeAdapter)({
    onPulse: () => { pulseObservations += 1; },
  });
  const lifecycleStore = (adapterFactories.externalStore ?? createImmutableExternalStoreAdapter)({
    revision: 0,
    label: 'Verified baseline',
  });
  const deferredAdapter = (adapterFactories.deferredDelivery ?? createDeferredDeliveryAdapter)();
  let state = baselineState();

  function baselineState() {
    return {
      scenario: 'strict-replay',
      fault: null,
      phase: 'ready',
      generation: ownerGeneration,
      accepted: clone(INITIAL_ACCEPTED),
      candidate: null,
      result: {
        passed: null,
        heading: 'Ready for a lifecycle observation',
        detail: 'Choose a scenario, then run the accepted path or its named controlled fault.',
        decision: 'The static reading remains available alongside the interactive evidence.',
      },
      events: [],
      svg: createSvgIdentityPair(false),
    };
  }

  function assertLive() {
    if (destroyed) throw new Error('This lifecycle controller has released its final ownership boundary.');
  }

  function emit() {
    onChange(snapshot());
  }

  function log(action, detail) {
    state.events.push({ sequence: ++eventSequence, action, detail });
  }

  function acquire(type, label, disposer = () => {}) {
    if (!RESOURCE_TYPES.includes(type)) throw new TypeError(`Unknown lifecycle resource type: ${String(type)}`);
    if (typeof disposer !== 'function') throw new TypeError('Lifecycle resource disposer must be a function.');
    const id = `${type}-${++resourceSequence}`;
    resources.set(id, { id, type, label, disposer });
    log('acquire', `${type}: ${label}`);
    return id;
  }

  function release(id) {
    const resource = resources.get(id);
    if (!resource) return false;
    try {
      resource.disposer();
    } catch (error) {
      log('release failed', `${resource.type}: ${resource.label}`);
      throw new Error(`Release failed for ${resource.type} resource ${resource.label}.`, { cause: error });
    }
    resources.delete(id);
    log('release', `${resource.type}: ${resource.label}`);
    return true;
  }

  function releaseType(type) {
    const failures = [];
    for (const resource of [...resources.values()]) {
      if (resource.type !== type) continue;
      try {
        release(resource.id);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, `Release completed with ${failures.length} ${type} resource failure${failures.length === 1 ? '' : 's'}.`);
    }
  }

  function releaseOwnedResources(reason, { includeInfrastructure = true } = {}) {
    for (const request of requests.values()) {
      if (!request.controller.signal.aborted) request.controller.abort(reason);
    }
    const failures = [];
    for (const type of RESOURCE_TYPES) {
      if (!includeInfrastructure && type === 'infrastructure') continue;
      try {
        releaseType(type);
      } catch (error) {
        failures.push(...(error instanceof AggregateError ? error.errors : [error]));
      }
    }
    for (const request of [...requests.values()]) {
      if (!resources.has(request.resource)) {
        request.settled = true;
        requests.delete(request.id);
      }
    }
    currentRequest = currentRequest && requests.has(currentRequest.id) ? currentRequest : null;
    if (failures.length > 0) {
      throw new AggregateError(failures, `Lifecycle release completed with ${failures.length} owned-resource failure${failures.length === 1 ? '' : 's'}.`);
    }
  }

  function counts() {
    const value = Object.fromEntries(RESOURCE_TYPES.map(type => [type, 0]));
    for (const resource of resources.values()) value[resource.type] += 1;
    return value;
  }

  function resourceReality() {
    return {
      eventTargetListeners: eventAdapter.activeCount(),
      storeSubscribers: lifecycleStore.subscriberCount(),
      pendingRequests: requests.size,
      observedPulses: pulseObservations,
    };
  }

  function own(type, label, disposer) {
    assertLive();
    const id = acquire(type, label, disposer);
    emit();
    return Object.freeze({ id, release: () => release(id) });
  }

  function attach() {
    assertLive();
    if (session) return snapshot();
    const listenerLease = eventAdapter.mount('replay fixture listener');
    const unsubscribe = lifecycleStore.subscribe(() => {});
    session = {
      listener: acquire('listeners', 'event-target replay fixture', listenerLease.release),
      subscription: acquire('subscriptions', 'immutable-store snapshot fixture', unsubscribe),
    };
    state.phase = 'mounted';
    log('mount', 'The lab acquired one live event-target listener and one live store subscription.');
    emit();
    return snapshot();
  }

  function releaseSession({ preserveForFault = false } = {}) {
    if (!session) return;
    const owned = session;
    session = null;
    if (preserveForFault) {
      log('controlled fault', 'The first setup retained its live listener and subscription.');
      return;
    }
    const failures = [];
    for (const id of [owned.listener, owned.subscription]) {
      try {
        release(id);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Lifecycle session release completed with owned-resource failures.');
    }
    log('cleanup', 'The setup released its live listener and subscription.');
  }

  function beginRequest(identity, revision, generation) {
    if (currentRequest) abortRequest(currentRequest.id, 'a newer request owns delivery eligibility');
    const controller = abortControllerFactory();
    const delivery = deferredAdapter.prepare({ identity, revision, generation, signal: controller.signal });
    const request = {
      id: `request-${++requestSequence}`,
      identity,
      revision,
      generation,
      controller,
      delivery,
      resource: null,
      settled: false,
      delivered: false,
    };
    request.resource = acquire('requests', `${identity} revision ${revision} generation ${generation}`, () => {
      if (!request.settled && !request.controller.signal.aborted) {
        request.controller.abort('the request owner released its pending operation');
      }
    });
    requests.set(request.id, request);
    currentRequest = request;
    state.candidate = { identity, revision, generation };
    log('request', `${request.id} began for ${identity} revision ${revision} in generation ${generation}.`);
    return request;
  }

  function abortRequest(id, reason) {
    const request = requests.get(id);
    if (!request || request.settled) return false;
    request.controller.abort(reason);
    request.settled = true;
    release(request.resource);
    requests.delete(id);
    if (currentRequest === request) currentRequest = null;
    log('cancel', `${request.id} released because ${reason}.`);
    return true;
  }

  function deliverRequest(request, value, acceptStale) {
    request.delivered = true;
    request.settled = true;
    release(request.resource);
    requests.delete(request.id);
    if (currentRequest === request) currentRequest = null;
    const currentGeneration = !destroyed && request.generation === ownerGeneration;
    const eligible = currentGeneration
      && request.generation === state.candidate?.generation
      && request.identity === state.candidate?.identity
      && request.revision === state.candidate?.revision
      && !request.controller.signal.aborted;
    // The controlled stale-delivery fault bypasses identity and cancellation
    // checks inside its own observation. Final release and a newer observation
    // always retire the earlier generation before it can change shared state.
    if (eligible || (acceptStale && currentGeneration)) {
      state.accepted = { identity: request.identity, revision: request.revision, value };
      log(eligible ? 'accept update' : 'controlled fault', `${request.id} changed accepted state to ${request.identity} revision ${request.revision}.`);
      return eligible;
    }
    log('ignore late delivery', `${request.id} stayed outside accepted state.`);
    return false;
  }

  function cancelPendingRequests(reason) {
    for (const request of [...requests.values()]) abortRequest(request.id, reason);
  }

  function prepareRun(id, injectFault) {
    assertLive();
    const scenario = getScenario(id);
    cancelPendingRequests('a newer observation generation began');
    currentRequest = null;
    ownerGeneration += 1;
    state = baselineState();
    state.scenario = scenario.id;
    state.fault = injectFault ? scenario.fault : null;
    state.phase = 'observing';
    state.generation = ownerGeneration;
    state.events = [];
    log('observe', scenario.question);
    return { scenario, generation: ownerGeneration };
  }

  function setResult(passed, heading, detail, decision) {
    state.phase = passed ? 'accepted' : 'fault-visible';
    state.result = { passed, heading, detail, decision };
    log(passed ? 'oracle passed' : 'oracle exposed fault', detail);
  }

  function setPending(heading, detail, decision) {
    state.phase = 'pending-observation';
    state.result = { passed: null, heading, detail, decision };
    log('oracle pending', detail);
  }

  function runStrictReplay(fault) {
    releaseSession({ preserveForFault: fault });
    attach();
    const activeListeners = eventAdapter.pulse();
    const activeSubscriptions = lifecycleStore.subscriberCount();
    const passed = activeListeners === 1 && activeSubscriptions === 1;
    setResult(passed,
      passed ? 'Replay retained one active setup' : 'Replay exposed retained setup resources',
      `${activeListeners} live listener${activeListeners === 1 ? '' : 's'} and ${activeSubscriptions} live subscription${activeSubscriptions === 1 ? '' : 's'} responded after replay.`,
      passed ? 'Setup and cleanup form a repeatable pair.' : 'The release path needs to own every resource acquired by setup.');
  }

  async function runReplacement(fault, generation) {
    state.accepted = clone(INITIAL_ACCEPTED);
    const first = beginRequest('entity-a', 1, generation);
    const second = beginRequest('entity-b', 2, generation);
    second.delivery.resolve('Current entity B result');
    const currentValue = await second.delivery.promise;
    if (destroyed || generation !== ownerGeneration) return;
    deliverRequest(second, currentValue, false);
    first.delivery.resolve('Late entity A result');
    const lateValue = await first.delivery.promise;
    if (destroyed || generation !== ownerGeneration) return;
    deliverRequest(first, lateValue, fault);
    if (destroyed || generation !== ownerGeneration) return;
    const passed = state.accepted.identity === 'entity-b' && state.accepted.revision === 2;
    setResult(passed,
      passed ? 'Current identity kept accepted-view update eligibility' : 'Late delivery changed accepted identity',
      `${state.accepted.identity} revision ${state.accepted.revision} is accepted.`,
      passed ? 'Identity, revision, owner generation, and cancellation agree before the accepted-view update.' : 'Accepted-view update eligibility needs the current identity, revision, and owner generation alongside cancellation.');
  }

  function runExternalStore(fault) {
    const store = createImmutableExternalStoreAdapter({ revision: 1, label: 'Ready specimens', count: 4 });
    const initial = store.getSnapshot();
    let published = initial;
    const unsubscribe = store.subscribe(snapshotValue => { published = snapshotValue; });
    const resource = acquire('subscriptions', 'scenario external-store subscriber', unsubscribe);
    store.publish({ revision: 2, label: 'Reviewed specimens', count: 5 });
    const observed = fault
      ? { revision: `${initial.revision}/${published.revision}`, label: initial.label, count: published.count }
      : published;
    release(resource);
    const passed = Number.isInteger(observed.revision) && store.subscriberCount() === 0;
    state.accepted = { identity: 'external-store', revision: observed.revision, value: `${observed.label}: ${observed.count}` };
    setResult(passed,
      passed ? 'One store revision supplied every related value' : 'The reading combined two store revisions',
      `${observed.label}: ${observed.count}; snapshot revision ${observed.revision}; ${store.subscriberCount()} scenario subscribers remain.`,
      passed ? 'Subscribers compare immutable snapshots by stable revision and release after the snapshot notification.' : 'The adapter needs one immutable snapshot per notification.');
  }

  function runCacheReconcile(fault) {
    const cache = createRevisionCacheAdapter({ cohort: { revision: 1, value: 'Four ready specimens' } });
    let localDraft = 'Keep named reviewer authority';
    let serverRecord = cache.get('cohort');
    const unsubscribe = cache.subscribe('cohort', record => { serverRecord = record; });
    const resource = acquire('subscriptions', 'scenario cache subscriber', unsubscribe);
    cache.invalidate('cohort', { revision: 2, value: 'Five reviewed specimens' });
    if (fault) localDraft = serverRecord.value;
    release(resource);
    const passed = localDraft === 'Keep named reviewer authority' && cache.subscriberCount('cohort') === 0;
    state.accepted = { identity: 'server-cache', revision: serverRecord.revision, value: `${serverRecord.value}; draft: ${localDraft}` };
    setResult(passed,
      passed ? 'Fresh server data preserved the local draft' : 'Server revalidation replaced browser-owned work',
      `Server revision ${serverRecord.revision}; local draft “${localDraft}”; ${cache.subscriberCount('cohort')} scenario subscribers remain.`,
      passed ? 'Server records and draft input keep separate owners.' : 'Reconciliation needs an explicit boundary between server state and local input.');
  }

  function runDialog() {
    setPending(
      'Dialog focus observation is ready',
      'Close the dialog to measure the focus destination.',
      'The close event records success or the controlled fault from the measured active element.');
  }

  function recordDialogFocus(restored, generation = state.generation) {
    assertLive();
    if (generation !== ownerGeneration || state.scenario !== 'dialog-replacement') return snapshot();
    const passed = Boolean(restored);
    setResult(passed,
      passed ? 'Dialog focus returned to its invoker' : 'Dialog focus arrived at a different control',
      passed ? 'The opening button regained focus after close.' : 'The focus owner after close differs from the opening button.',
      passed ? 'The dialog and its invoker preserve one navigation thread.' : 'The close path needs an explicit focus-return owner.');
    emit();
    return snapshot();
  }

  function runSvg(fault) {
    state.svg = createSvgIdentityPair(fault);
    const all = state.svg.flatMap(ids => Object.values(ids));
    const passed = new Set(all).size === all.length;
    setResult(passed,
      passed ? 'Each SVG owns a unique reference namespace' : 'The two SVG instances share document identifiers',
      `${new Set(all).size} unique identifiers serve ${all.length} authored identifiers.`,
      passed ? 'Direct references resolve within each instance.' : 'Instance-scoped prefixes need to reach every identifier and reference.');
  }

  function runHistory(fault) {
    const recorded = 'entity-replacement';
    const restored = fault ? 'strict-replay' : recorded;
    const passed = restored === recorded;
    state.accepted = { identity: 'history-entry', revision: 1, value: `Recorded ${recorded}; restored ${restored}` };
    setResult(passed,
      passed ? 'History restored the recorded selection' : 'History restored a different selection',
      `Recorded “${recorded}”; restored “${restored}”.`,
      passed ? 'URL, history state, and selected control agree.' : 'History restoration needs one canonical serialized selection.');
  }

  function runHydration(fault) {
    const clientVersion = fault ? 'lifecycle-contract@0.0.9' : clientContractVersion;
    const passed = serverContractVersion === clientVersion;
    state.accepted = { identity: 'runtime-contract', revision: 1, value: `server ${serverContractVersion}; client ${clientVersion}` };
    setResult(passed,
      passed ? 'Server markup and client behavior declared one contract version' : 'Server markup and client behavior declared different contract versions',
      `Server ${serverContractVersion}; client ${clientVersion}.`,
      passed ? 'Enhancement can continue under the named contract.' : 'The client needs a compatible named contract before it takes ownership.');
  }

  async function run(id, { injectFault = false } = {}) {
    const { scenario, generation } = prepareRun(id, Boolean(injectFault));
    switch (scenario.id) {
      case 'strict-replay': runStrictReplay(Boolean(injectFault)); break;
      case 'entity-replacement': await runReplacement(Boolean(injectFault), generation); break;
      case 'external-store': runExternalStore(Boolean(injectFault)); break;
      case 'cache-reconcile': runCacheReconcile(Boolean(injectFault)); break;
      case 'dialog-replacement': runDialog(); break;
      case 'svg-identities': runSvg(Boolean(injectFault)); break;
      case 'history-restore': runHistory(Boolean(injectFault)); break;
      case 'hydration-version': runHydration(Boolean(injectFault)); break;
      default: throw new TypeError(`Unsupported lifecycle scenario: ${scenario.id}`);
    }
    if (generation === ownerGeneration) emit();
    return snapshot();
  }

  function reset() {
    assertLive();
    session = null;
    try {
      releaseOwnedResources('the lab returned to its verified baseline', { includeInfrastructure: false });
    } catch (error) {
      state.phase = 'release-failed';
      state.result = {
        passed: false,
        heading: 'Baseline restoration exposed a release failure',
        detail: `${resources.size} owned resource${resources.size === 1 ? '' : 's'} remain visible for recovery.`,
        decision: 'Repair the named disposer, then restore the verified baseline again.',
      };
      emit();
      throw error;
    }
    ownerGeneration += 1;
    state = baselineState();
    state.generation = ownerGeneration;
    log('reset', 'The verified baseline released prior scenario resources.');
    attach();
    state.result = {
      passed: true,
      heading: 'Verified baseline restored',
      detail: 'One live fixture listener and one live fixture subscription are active; accepted state is entity-a revision 0.',
      decision: 'A fresh scenario can begin from a known state.',
    };
    emit();
    return snapshot();
  }

  function snapshot() {
    const value = clone(state);
    value.resources = counts();
    value.resourceReality = resourceReality();
    value.mounted = Boolean(session);
    value.destroyed = destroyed;
    return freezeTree(value);
  }

  function destroy() {
    if (destroyed) return snapshot();
    session = null;
    // Invalidate asynchronous continuations before any disposer runs. A late
    // delivery therefore cannot append events or rewrite the released state,
    // including when one disposer reports a recovery-visible failure.
    ownerGeneration += 1;
    state.generation = ownerGeneration;
    try {
      releaseOwnedResources('the lifecycle owner released the lab');
    } catch (error) {
      state.phase = 'release-failed';
      state.candidate = null;
      state.result = {
        passed: false,
        heading: 'Lifecycle release exposed an owned-resource failure',
        detail: `${resources.size} owned resource${resources.size === 1 ? '' : 's'} remain visible for recovery.`,
        decision: 'Repair the named disposer, then run release again.',
      };
      emit();
      throw error;
    }
    state.phase = 'released';
    state.candidate = null;
    state.result = {
      passed: true,
      heading: 'Lifecycle ownership released',
      detail: 'Fixture and enhancement resource counters are zero.',
      decision: 'The released controller leaves the reading available as static HTML.',
    };
    destroyed = true;
    emit();
    return snapshot();
  }

  return Object.freeze({ attach, destroy, own, recordDialogFocus, reset, run, snapshot });
}
