import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import { FRAMEWORK_CONTRACTS, FRAMEWORK_EVIDENCE_STANDING } from '../../visual-fidelity-contracts/labs/lifecycle-lab/framework-contracts.js';
import {
  createLifecycleController, createSvgIdentityPair, RUNTIME_RECEIPT,
} from '../../visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-model.js';
import {
  createDeferredDeliveryAdapter,
  createEventTargetLifetimeAdapter,
  createImmutableExternalStoreAdapter,
  createRevisionCacheAdapter,
  ObserverNotificationError,
  PLATFORM_ADAPTER_RECEIPTS,
} from '../../visual-fidelity-contracts/labs/lifecycle-lab/platform-adapters.js';
import { SCENARIOS } from '../../visual-fidelity-contracts/labs/lifecycle-lab/scenario-data.js';

function mounted(options = {}) {
  const controller = createLifecycleController(options);
  controller.attach();
  return controller;
}

test('the verified baseline owns live fixture resources and exposes their actual adapter counts', () => {
  const controller = mounted();
  const value = controller.snapshot();
  assert.deepEqual(value.resources, { listeners: 1, subscriptions: 1, requests: 0, infrastructure: 0 });
  assert.deepEqual(value.resourceReality, {
    eventTargetListeners: 1, storeSubscribers: 1, pendingRequests: 0, observedPulses: 0,
  });
  assert.deepEqual(value.accepted, { identity: 'entity-a', revision: 0, value: 'Reviewed baseline' });
  assert.equal(value.mounted, true);
  assert.ok(Object.isFrozen(value) && Object.isFrozen(value.accepted));
  controller.destroy();
});

test('setup-cleanup replay releases and reacquires live adapter resources', async () => {
  const controller = mounted();
  const value = await controller.run('strict-replay');
  assert.equal(value.result.passed, true);
  assert.deepEqual(value.resources, { listeners: 1, subscriptions: 1, requests: 0, infrastructure: 0 });
  assert.equal(value.resourceReality.eventTargetListeners, 1);
  assert.equal(value.resourceReality.storeSubscribers, 1);
  assert.equal(value.resourceReality.observedPulses, 1);
  assert.ok(value.events.some(event => event.action === 'cleanup'));
  assert.ok(value.events.some(event => event.action === 'mount'));
  controller.destroy();
});

test('the controlled replay fault exposes live retained resources and reset releases them', async () => {
  const controller = mounted();
  const fault = await controller.run('strict-replay', { injectFault: true });
  assert.equal(fault.result.passed, false);
  assert.deepEqual(fault.resources, { listeners: 2, subscriptions: 2, requests: 0, infrastructure: 0 });
  assert.equal(fault.resourceReality.eventTargetListeners, 2);
  assert.equal(fault.resourceReality.storeSubscribers, 2);
  const recovered = controller.reset();
  assert.equal(recovered.result.passed, true);
  assert.deepEqual(recovered.resources, { listeners: 1, subscriptions: 1, requests: 0, infrastructure: 0 });
  assert.equal(recovered.resourceReality.eventTargetListeners, 1);
  assert.equal(recovered.resourceReality.storeSubscribers, 1);
  controller.destroy();
});

test('deferred entity replacement aborts A, settles B, and removes every request record', async () => {
  const signals = [];
  const controller = mounted({ abortControllerFactory: () => {
    const value = new AbortController();
    signals.push(value.signal);
    return value;
  } });
  const value = await controller.run('entity-replacement');
  assert.equal(signals.length, 2);
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  assert.deepEqual(value.accepted, { identity: 'entity-b', revision: 2, value: 'Current entity B result' });
  assert.deepEqual(value.resources, { listeners: 1, subscriptions: 1, requests: 0, infrastructure: 0 });
  assert.equal(value.resourceReality.pendingRequests, 0);
  assert.ok(value.events.some(event => event.action === 'ignore late delivery'));
  controller.reset();
  assert.deepEqual(signals.map(signal => signal.aborted), [true, false], 'reset leaves a completed request settled');
  controller.destroy();
  assert.deepEqual(signals.map(signal => signal.aborted), [true, false], 'final teardown retains completed-request standing');
});

test('owner generation keeps an earlier asynchronous run from overwriting a newer observation', async () => {
  const controller = mounted();
  const earlier = controller.run('entity-replacement');
  const newer = controller.run('external-store');
  await Promise.all([earlier, newer]);
  const value = controller.snapshot();
  assert.equal(value.scenario, 'external-store');
  assert.equal(value.accepted.identity, 'external-store');
  assert.equal(value.result.passed, true);
  assert.equal(value.resourceReality.pendingRequests, 0);
  controller.destroy();
});

test('controlled stale delivery stays inside its originating owner generation', async () => {
  const controller = mounted();
  const earlier = controller.run('entity-replacement', { injectFault: true });
  const newer = controller.run('external-store');
  await Promise.all([earlier, newer]);
  const value = controller.snapshot();
  assert.equal(value.scenario, 'external-store');
  assert.deepEqual(value.accepted, { identity: 'external-store', revision: 2, value: 'Reviewed specimens: 5' });
  assert.equal(value.result.passed, true);
  assert.equal(value.phase, 'accepted');
  assert.equal(value.resourceReality.pendingRequests, 0);
  assert.equal(value.events.some(event => event.action === 'controlled fault'), false);
  controller.destroy();
});

test('final release freezes state before a deferred observation can continue', async () => {
  const controller = mounted();
  const pending = controller.run('entity-replacement', { injectFault: true });
  const released = controller.destroy();
  await pending;
  const settled = controller.snapshot();
  assert.deepEqual(settled, released);
  assert.equal(settled.phase, 'released');
  assert.equal(settled.destroyed, true);
  assert.deepEqual(settled.resources, { listeners: 0, subscriptions: 0, requests: 0, infrastructure: 0 });
  assert.equal(settled.events.some(event => event.action === 'controlled fault'), false);
});

test('the stale-delivery fault remains a deliberate and distinguishable publication fault', async () => {
  const controller = mounted();
  const value = await controller.run('entity-replacement', { injectFault: true });
  assert.equal(value.result.passed, false);
  assert.deepEqual(value.accepted, { identity: 'entity-a', revision: 1, value: 'Late entity A result' });
  assert.equal(value.phase, 'fault-visible');
  assert.ok(value.events.some(event => event.action === 'controlled fault'));
  controller.destroy();
});

for (const [scenario, expected, faultDetail] of [
  ['external-store', /snapshot revision 2/u, /two store revisions/u],
  ['cache-reconcile', /local draft/u, /replaced browser-owned work/u],
  ['svg-identities', /unique reference namespace/u, /share document identifiers/u],
  ['history-restore', /recorded selection/u, /different selection/u],
  ['hydration-version', /one contract version/u, /different contract versions/u],
]) {
  test(`${scenario} separates the accepted oracle from its controlled fault`, async () => {
    const controller = mounted();
    const accepted = await controller.run(scenario);
    assert.equal(accepted.result.passed, true);
    assert.match(`${accepted.result.heading} ${accepted.result.detail}`, expected);
    const fault = await controller.run(scenario, { injectFault: true });
    assert.equal(fault.result.passed, false);
    assert.match(`${fault.result.heading} ${fault.result.detail}`, faultDetail);
    controller.destroy();
  });
}

test('hydration reads the supplied server-authored contract instead of a local alias', async () => {
  const controller = mounted({ serverContractVersion: 'lifecycle-contract@0.0.8' });
  const value = await controller.run('hydration-version');
  assert.equal(value.result.passed, false);
  assert.match(value.result.detail, /server lifecycle-contract@0\.0\.8; client lifecycle-contract@0\.1\.0/iu);
  controller.destroy();
});

test('dialog focus stays pending until the measured close observation arrives', async () => {
  const controller = mounted();
  const pending = await controller.run('dialog-replacement');
  assert.equal(pending.result.passed, null);
  assert.equal(pending.phase, 'pending-observation');
  const accepted = controller.recordDialogFocus(true, pending.generation);
  assert.equal(accepted.result.passed, true);
  assert.match(accepted.result.heading, /returned to its invoker/u);
  const next = await controller.run('dialog-replacement', { injectFault: true });
  const fault = controller.recordDialogFocus(false, next.generation);
  assert.equal(fault.result.passed, false);
  assert.match(fault.result.heading, /different control/u);
  controller.destroy();
});

test('SVG instance identity stays unique until the controlled collision is selected', () => {
  const independent = createSvgIdentityPair(false).flatMap(ids => Object.values(ids));
  assert.equal(new Set(independent).size, independent.length);
  const shared = createSvgIdentityPair(true).flatMap(ids => Object.values(ids));
  assert.equal(new Set(shared).size, shared.length / 2);
});

test('bounded adapters execute setup, publication, invalidation, cancellation, and release', async () => {
  let pulses = 0;
  const events = createEventTargetLifetimeAdapter({ onPulse: () => { pulses += 1; } });
  const lease = events.mount('unit owner');
  events.pulse();
  assert.equal(pulses, 1);
  assert.equal(events.activeCount(), 1);
  assert.equal(lease.release(), true);
  assert.equal(lease.release(), false);
  assert.equal(events.activeCount(), 0);

  const store = createImmutableExternalStoreAdapter({ revision: 1, value: 'one' });
  let observed = store.getSnapshot();
  const unsubscribeStore = store.subscribe(value => { observed = value; });
  store.publish({ revision: 2, value: 'two' });
  assert.deepEqual(observed, { revision: 2, value: 'two' });
  assert.equal(unsubscribeStore(), true);
  assert.equal(store.subscriberCount(), 0);

  const cache = createRevisionCacheAdapter({ key: { revision: 1, value: 'one' } });
  let record = cache.get('key');
  const unsubscribeCache = cache.subscribe('key', value => { record = value; });
  cache.invalidate('key', { revision: 2, value: 'two' });
  assert.deepEqual(record, { revision: 2, value: 'two' });
  unsubscribeCache();
  assert.equal(cache.subscriberCount('key'), 0);

  const deferred = createDeferredDeliveryAdapter();
  const abort = new AbortController();
  const delivery = deferred.prepare({ identity: 'a', revision: 1, generation: 1, signal: abort.signal });
  abort.abort('replacement');
  delivery.resolve('late');
  assert.equal(await delivery.promise, 'late');
  assert.equal(delivery.signal.aborted, true);
});

test('store snapshots and cache records remain detached and recursively immutable across revisions', () => {
  const initialStoreInput = { revision: 1, nested: { label: 'initial', values: [1, 2] } };
  const store = createImmutableExternalStoreAdapter(initialStoreInput);
  initialStoreInput.nested.label = 'mutated input';
  initialStoreInput.nested.values.push(3);
  const initialSnapshot = store.getSnapshot();
  assert.equal(initialSnapshot.nested.label, 'initial');
  assert.deepEqual(initialSnapshot.nested.values, [1, 2]);
  assert.ok(Object.isFrozen(initialSnapshot));
  assert.ok(Object.isFrozen(initialSnapshot.nested));
  assert.ok(Object.isFrozen(initialSnapshot.nested.values));
  assert.throws(() => { initialSnapshot.nested.label = 'mutated receiver'; }, TypeError);

  const publishedInput = { revision: 2, nested: { label: 'published', values: [3, 4] } };
  const published = store.publish(publishedInput);
  publishedInput.nested.label = 'mutated publisher';
  publishedInput.nested.values.push(5);
  assert.equal(store.getSnapshot(), published, 'getSnapshot retains one stable object for the accepted revision');
  assert.deepEqual(published.nested, { label: 'published', values: [3, 4] });
  assert.throws(() => { published.nested.values.push(5); }, TypeError);

  const cyclic = { revision: 3, nested: { label: 'cyclic' } };
  cyclic.self = cyclic;
  const acceptedCycle = store.publish(cyclic);
  assert.equal(acceptedCycle.self, acceptedCycle);
  assert.ok(Object.isFrozen(acceptedCycle) && Object.isFrozen(acceptedCycle.nested));

  const initialCacheInput = { revision: 1, nested: { label: 'cached initial' } };
  const cache = createRevisionCacheAdapter({ key: initialCacheInput });
  initialCacheInput.nested.label = 'mutated cache input';
  assert.equal(cache.get('key').nested.label, 'cached initial');
  assert.ok(Object.isFrozen(cache.get('key').nested));

  const invalidatedInput = { revision: 2, nested: { label: 'cached revision' } };
  const invalidated = cache.invalidate('key', invalidatedInput);
  invalidatedInput.nested.label = 'mutated invalidation input';
  assert.equal(cache.get('key'), invalidated);
  assert.equal(invalidated.nested.label, 'cached revision');
  assert.throws(() => { invalidated.nested.label = 'mutated receiver'; }, TypeError);
  assert.throws(
    () => cache.invalidate('key', { revision: 3, nested: new Map([['mutable', true]]) }),
    /plain records, arrays, and primitive values/u,
  );
});

test('store publication commits one revision and gives every observer a notification opportunity', () => {
  const store = createImmutableExternalStoreAdapter({ revision: 1, value: 'one' });
  const observations = [];
  store.subscribe(snapshot => {
    observations.push(`first:${snapshot.revision}`);
    throw new Error('first store observer needs recovery');
  });
  store.subscribe(snapshot => { observations.push(`second:${snapshot.revision}`); });

  assert.throws(() => store.publish({ revision: 2, value: 'two' }), error => {
    assert.ok(error instanceof ObserverNotificationError);
    assert.ok(error instanceof AggregateError);
    assert.equal(error.code, 'OBSERVER_NOTIFICATION_FAILURE');
    assert.deepEqual(error.receipt, {
      standing: 'accepted-with-observer-errors',
      channel: 'Immutable external store',
      operation: 'publish',
      key: null,
      acceptedRevision: 2,
      subscriberCount: 2,
      notifiedCount: 2,
      failureCount: 1,
      commits: [{
        key: null,
        acceptedRevision: 2,
        subscriberCount: 2,
        notifiedCount: 2,
        failureCount: 1,
      }],
    });
    assert.equal(error.errors.length, 1);
    return true;
  });
  assert.deepEqual(observations, ['first:2', 'second:2']);
  assert.deepEqual(store.getSnapshot(), { revision: 2, value: 'two' });
});

test('cache invalidation commits one revision and gives every keyed observer a notification opportunity', () => {
  const cache = createRevisionCacheAdapter({ sample: { revision: 1, value: 'one' } });
  const observations = [];
  cache.subscribe('sample', record => {
    observations.push(`first:${record.revision}`);
    throw new Error('first cache observer needs recovery');
  });
  cache.subscribe('sample', record => { observations.push(`second:${record.revision}`); });

  assert.throws(() => cache.invalidate('sample', { revision: 2, value: 'two' }), error => {
    assert.ok(error instanceof ObserverNotificationError);
    assert.ok(error instanceof AggregateError);
    assert.equal(error.code, 'OBSERVER_NOTIFICATION_FAILURE');
    assert.deepEqual(error.receipt, {
      standing: 'accepted-with-observer-errors',
      channel: 'Revision cache',
      operation: 'invalidate',
      key: 'sample',
      acceptedRevision: 2,
      subscriberCount: 2,
      notifiedCount: 2,
      failureCount: 1,
      commits: [{
        key: 'sample',
        acceptedRevision: 2,
        subscriberCount: 2,
        notifiedCount: 2,
        failureCount: 1,
      }],
    });
    assert.equal(error.errors.length, 1);
    return true;
  });
  assert.deepEqual(observations, ['first:2', 'second:2']);
  assert.deepEqual(cache.get('sample'), { revision: 2, value: 'two' });
});

test('nested store publications serialize observer delivery and return each admitted immutable revision', () => {
  const store = createImmutableExternalStoreAdapter({ revision: 1, nested: { value: 'one' } });
  const observations = [];
  const thirdInput = { revision: 3, nested: { value: 'three' } };
  let thirdAccepted;
  store.subscribe(snapshot => {
    observations.push(`a:${snapshot.revision}`);
    if (snapshot.revision === 2) thirdAccepted = store.publish(thirdInput);
  });
  store.subscribe(snapshot => { observations.push(`b:${snapshot.revision}`); });

  const secondInput = { revision: 2, nested: { value: 'two' } };
  const secondAccepted = store.publish(secondInput);
  secondInput.nested.value = 'changed after admission';
  thirdInput.nested.value = 'changed after admission';

  assert.deepEqual(observations, ['a:2', 'b:2', 'a:3', 'b:3']);
  assert.equal(secondAccepted.revision, 2);
  assert.equal(thirdAccepted.revision, 3);
  assert.equal(store.getSnapshot(), thirdAccepted);
  assert.deepEqual(secondAccepted.nested, { value: 'two' });
  assert.deepEqual(thirdAccepted.nested, { value: 'three' });
  assert.ok(Object.isFrozen(secondAccepted.nested) && Object.isFrozen(thirdAccepted.nested));
  assert.throws(
    () => store.publish({ revision: 3, nested: { value: 'stale' } }),
    /must advance beyond admitted revision 3/u,
  );
});

test('nested cache invalidations serialize keyed observers and return each admitted immutable revision', () => {
  const cache = createRevisionCacheAdapter({ sample: { revision: 1, nested: { value: 'one' } } });
  const observations = [];
  const thirdInput = { revision: 3, nested: { value: 'three' } };
  let thirdAccepted;
  cache.subscribe('sample', record => {
    observations.push(`a:${record.revision}`);
    if (record.revision === 2) thirdAccepted = cache.invalidate('sample', thirdInput);
  });
  cache.subscribe('sample', record => { observations.push(`b:${record.revision}`); });

  const secondInput = { revision: 2, nested: { value: 'two' } };
  const secondAccepted = cache.invalidate('sample', secondInput);
  secondInput.nested.value = 'changed after admission';
  thirdInput.nested.value = 'changed after admission';

  assert.deepEqual(observations, ['a:2', 'b:2', 'a:3', 'b:3']);
  assert.equal(secondAccepted.revision, 2);
  assert.equal(thirdAccepted.revision, 3);
  assert.equal(cache.get('sample'), thirdAccepted);
  assert.deepEqual(secondAccepted.nested, { value: 'two' });
  assert.deepEqual(thirdAccepted.nested, { value: 'three' });
  assert.ok(Object.isFrozen(secondAccepted.nested) && Object.isFrozen(thirdAccepted.nested));
  assert.throws(
    () => cache.invalidate('sample', { revision: 2, nested: { value: 'stale' } }),
    /must advance beyond admitted revision 3/u,
  );
});

test('nested store publication drains every admitted commit before surfacing observer errors', () => {
  const store = createImmutableExternalStoreAdapter({ revision: 1, value: 'one' });
  const observations = [];
  let thirdAccepted;
  store.subscribe(snapshot => {
    observations.push(`a:${snapshot.revision}`);
    if (snapshot.revision === 2) {
      thirdAccepted = store.publish({ revision: 3, value: 'three' });
      throw new Error('revision two observer needs recovery');
    }
  });
  store.subscribe(snapshot => { observations.push(`b:${snapshot.revision}`); });

  assert.throws(() => store.publish({ revision: 2, value: 'two' }), error => {
    assert.ok(error instanceof ObserverNotificationError);
    assert.equal(error.receipt.acceptedRevision, 3);
    assert.equal(error.receipt.subscriberCount, 4);
    assert.equal(error.receipt.notifiedCount, 4);
    assert.equal(error.receipt.failureCount, 1);
    assert.deepEqual(error.receipt.commits.map(commit => ({
      revision: commit.acceptedRevision,
      failures: commit.failureCount,
    })), [
      { revision: 2, failures: 1 },
      { revision: 3, failures: 0 },
    ]);
    return true;
  });
  assert.deepEqual(observations, ['a:2', 'b:2', 'a:3', 'b:3']);
  assert.equal(thirdAccepted.revision, 3);
  assert.equal(store.getSnapshot(), thirdAccepted);
});

test('nested cache invalidation drains every admitted commit before surfacing observer errors', () => {
  const cache = createRevisionCacheAdapter({ sample: { revision: 1, value: 'one' } });
  const observations = [];
  let thirdAccepted;
  cache.subscribe('sample', record => {
    observations.push(`a:${record.revision}`);
    if (record.revision === 2) {
      thirdAccepted = cache.invalidate('sample', { revision: 3, value: 'three' });
      throw new Error('revision two cache observer needs recovery');
    }
  });
  cache.subscribe('sample', record => { observations.push(`b:${record.revision}`); });

  assert.throws(() => cache.invalidate('sample', { revision: 2, value: 'two' }), error => {
    assert.ok(error instanceof ObserverNotificationError);
    assert.equal(error.receipt.acceptedRevision, 3);
    assert.equal(error.receipt.subscriberCount, 4);
    assert.equal(error.receipt.notifiedCount, 4);
    assert.equal(error.receipt.failureCount, 1);
    assert.deepEqual(error.receipt.commits.map(commit => ({
      revision: commit.acceptedRevision,
      failures: commit.failureCount,
    })), [
      { revision: 2, failures: 1 },
      { revision: 3, failures: 0 },
    ]);
    return true;
  });
  assert.deepEqual(observations, ['a:2', 'b:2', 'a:3', 'b:3']);
  assert.equal(thirdAccepted.revision, 3);
  assert.equal(cache.get('sample'), thirdAccepted);
});

test('final teardown invokes the registered enhancement disposer once and releases every resource', async () => {
  const controller = mounted();
  let released = 0;
  controller.own('infrastructure', 'browser event group', () => { released += 1; });
  const first = controller.destroy();
  const second = controller.destroy();
  assert.deepEqual(first.resources, { listeners: 0, subscriptions: 0, requests: 0, infrastructure: 0 });
  assert.deepEqual(first.resourceReality, {
    eventTargetListeners: 0, storeSubscribers: 0, pendingRequests: 0, observedPulses: 0,
  });
  assert.deepEqual(second.resources, first.resources);
  assert.equal(second.destroyed, true);
  assert.equal(released, 1);
  await assert.rejects(controller.run('strict-replay'), /released its final ownership boundary/u);
});

test('baseline reset preserves enhancement ownership until final teardown', async () => {
  const controller = mounted();
  let released = 0;
  controller.own('infrastructure', 'browser event group', () => { released += 1; });
  await controller.run('strict-replay', { injectFault: true });

  const recovered = controller.reset();
  assert.deepEqual(recovered.resources, { listeners: 1, subscriptions: 1, requests: 0, infrastructure: 1 });
  assert.equal(released, 0);

  const final = controller.destroy();
  assert.deepEqual(final.resources, { listeners: 0, subscriptions: 0, requests: 0, infrastructure: 0 });
  assert.equal(released, 1);
});

test('final teardown attempts every disposer and keeps failed release ownership visible', () => {
  const controller = mounted();
  let laterDisposerCalls = 0;
  controller.own('infrastructure', 'failing release example', () => {
    throw new Error('controlled disposer failure');
  });
  controller.own('infrastructure', 'later release example', () => {
    laterDisposerCalls += 1;
  });

  assert.throws(() => controller.destroy(), error => {
    assert.ok(error instanceof AggregateError);
    assert.match(error.message, /owned-resource failure/u);
    return true;
  });
  const value = controller.snapshot();
  assert.equal(laterDisposerCalls, 1);
  assert.equal(value.resources.infrastructure, 1);
  assert.equal(value.phase, 'release-failed');
  assert.equal(value.result.passed, false);
  assert.equal(value.destroyed, false);
});

test('the receipt identifies executable adapter versions and keeps framework transfer bounded', () => {
  assert.equal(SCENARIOS.length, 8);
  assert.equal(new Set(SCENARIOS.map(value => value.fault)).size, 8);
  assert.equal(FRAMEWORK_CONTRACTS.length, 5);
  assert.equal(FRAMEWORK_EVIDENCE_STANDING.standing, 'mixed-runtime-evidence');
  assert.deepEqual(
    FRAMEWORK_CONTRACTS.filter(value => value.runtimeStanding === 'framework-runtime-observation').map(value => value.adapterId),
    ['react-strict-mode-effect-replay', 'react-use-sync-external-store']
  );
  assert.equal(PLATFORM_ADAPTER_RECEIPTS.length, 4);
  assert.ok(PLATFORM_ADAPTER_RECEIPTS.every(value => /^\d+\.\d+\.\d+$/u.test(value.version)));
  assert.equal(RUNTIME_RECEIPT.labVersion, 'lifecycle-contract@0.1.0');
  assert.match(RUNTIME_RECEIPT.adapterVersions, /deferred-delivery@0\.1\.0/u);
  assert.match(RUNTIME_RECEIPT.transfer, /exact browser, operating system, framework, package, and adapter versions/u);
});
