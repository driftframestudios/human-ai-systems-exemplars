const SOURCE_REVIEW_DATE = '2026-10-20';

function frozenReceipt(id, version, target, scope) {
  return Object.freeze({
    id,
    version,
    target,
    scope,
    sourceReviewDate: SOURCE_REVIEW_DATE,
    evidenceStanding: 'executable bounded platform adapter',
  });
}

export const PLATFORM_ADAPTER_RECEIPTS = Object.freeze([
  frozenReceipt(
    'event-target-lifetime',
    '0.1.0',
    'DOM EventTarget and explicit disposer',
    'listener setup, replay, and idempotent release',
  ),
  frozenReceipt(
    'immutable-external-store',
    '0.1.0',
    'immutable snapshot with subscribe/getSnapshot',
    'coherent revision commit, observer isolation, and unsubscribe',
  ),
  frozenReceipt(
    'revision-cache',
    '0.1.0',
    'keyed record cache with explicit invalidation',
    'server-owned record commit with isolated observers beside browser-owned draft state',
  ),
  frozenReceipt(
    'deferred-delivery',
    '0.1.0',
    'Promise, AbortSignal, identity, revision, and owner generation',
    'deterministic cancellation and late-delivery eligibility',
  ),
]);

export class ObserverNotificationError extends AggregateError {
  constructor({ channel, operation, errors, commits }) {
    const failureCount = errors.length;
    const subscriberCount = commits.reduce((total, commit) => total + commit.subscriberCount, 0);
    const acceptedRevision = commits.at(-1)?.acceptedRevision ?? null;
    super(
      errors,
      `${channel} committed ${commits.length} accepted revision${commits.length === 1 ? '' : 's'} through ${acceptedRevision}; ${failureCount} of ${subscriberCount} observer notification${subscriberCount === 1 ? '' : 's'} reported an error.`,
    );
    this.name = 'ObserverNotificationError';
    this.code = 'OBSERVER_NOTIFICATION_FAILURE';
    this.receipt = Object.freeze({
      standing: 'accepted-with-observer-errors',
      channel,
      operation,
      key: commits.length === 1 ? commits[0].key : null,
      acceptedRevision,
      subscriberCount,
      notifiedCount: subscriberCount,
      failureCount,
      commits: Object.freeze(commits),
    });
  }
}

function createSerializedCommitQueue({ channel, operation, commit, observersFor }) {
  const queue = [];
  let draining = false;

  return function admit(accepted, key = null) {
    queue.push({ accepted, key });
    if (draining) return accepted;

    const errors = [];
    const commits = [];
    draining = true;
    try {
      while (queue.length > 0) {
        const entry = queue.shift();
        commit(entry);
        const observers = [...observersFor(entry.key)];
        let failureCount = 0;
        for (const observer of observers) {
          try {
            observer(entry.accepted);
          } catch (error) {
            failureCount += 1;
            errors.push(error);
          }
        }
        commits.push(Object.freeze({
          key: entry.key,
          acceptedRevision: entry.accepted.revision,
          subscriberCount: observers.length,
          notifiedCount: observers.length,
          failureCount,
        }));
      }
    } finally {
      draining = false;
    }

    if (errors.length > 0) throw new ObserverNotificationError({ channel, operation, errors, commits });
    return accepted;
  };
}

function freezeDataGraph(value, label, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} accepts plain records, arrays, and primitive values.`);
  }
  seen.add(value);
  for (const child of Object.values(value)) freezeDataGraph(child, label, seen);
  return Object.freeze(value);
}

function immutableDetachedData(value, label) {
  let detached;
  try {
    detached = structuredClone(value);
  } catch (error) {
    throw new TypeError(`${label} requires structured-cloneable data.`, { cause: error });
  }
  return freezeDataGraph(detached, label);
}

function requireIntegerRevision(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} require a record with an integer revision.`);
  }
  if (!Number.isInteger(value.revision)) throw new TypeError(`${label} require an integer revision.`);
  return value;
}

export function createEventTargetLifetimeAdapter({ onPulse = () => {} } = {}) {
  if (typeof onPulse !== 'function') throw new TypeError('Event-target pulse receiver must be a function.');
  const target = new EventTarget();
  const active = new Map();
  let sequence = 0;

  function mount(label = 'lifecycle owner') {
    const id = `event-owner-${++sequence}`;
    const handler = () => onPulse(Object.freeze({ id, label }));
    target.addEventListener('lifecycle-pulse', handler);
    active.set(id, handler);
    let released = false;
    return Object.freeze({
      id,
      release() {
        if (released) return false;
        released = true;
        target.removeEventListener('lifecycle-pulse', handler);
        active.delete(id);
        return true;
      },
    });
  }

  function pulse() {
    target.dispatchEvent(new Event('lifecycle-pulse'));
    return active.size;
  }

  return Object.freeze({
    receipt: PLATFORM_ADAPTER_RECEIPTS[0],
    mount,
    pulse,
    activeCount: () => active.size,
  });
}

export function createImmutableExternalStoreAdapter(initialSnapshot) {
  let snapshot = requireIntegerRevision(
    immutableDetachedData(initialSnapshot, 'Store snapshots'),
    'Store snapshots',
  );
  let admittedRevision = snapshot.revision;
  const subscribers = new Set();
  const commitQueue = createSerializedCommitQueue({
    channel: 'Immutable external store',
    operation: 'publish',
    commit: entry => { snapshot = entry.accepted; },
    observersFor: () => subscribers,
  });

  function getSnapshot() {
    return snapshot;
  }

  function publish(nextSnapshot) {
    const candidate = requireIntegerRevision(
      immutableDetachedData(nextSnapshot, 'Store snapshots'),
      'Store snapshots',
    );
    if (candidate.revision <= admittedRevision) {
      throw new RangeError(`Store snapshot revision must advance beyond admitted revision ${admittedRevision}.`);
    }
    admittedRevision = candidate.revision;
    return commitQueue(candidate);
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== 'function') throw new TypeError('Store subscriber must be a function.');
    subscribers.add(subscriber);
    let released = false;
    return () => {
      if (released) return false;
      released = true;
      subscribers.delete(subscriber);
      return true;
    };
  }

  return Object.freeze({
    receipt: PLATFORM_ADAPTER_RECEIPTS[1],
    getSnapshot,
    publish,
    subscribe,
    subscriberCount: () => subscribers.size,
  });
}

export function createRevisionCacheAdapter(initialEntries = {}) {
  const records = new Map(Object.entries(initialEntries).map(([key, value]) => [
    key,
    requireIntegerRevision(immutableDetachedData(value, 'Cache records'), 'Cache records'),
  ]));
  const admittedRevisions = new Map([...records].map(([key, value]) => [key, value.revision]));
  const subscribers = new Map();
  const commitQueue = createSerializedCommitQueue({
    channel: 'Revision cache',
    operation: 'invalidate',
    commit: entry => { records.set(entry.key, entry.accepted); },
    observersFor: key => subscribers.get(key) ?? [],
  });

  function get(key) {
    return records.get(key) ?? null;
  }

  function subscribe(key, subscriber) {
    if (typeof subscriber !== 'function') throw new TypeError('Cache subscriber must be a function.');
    const group = subscribers.get(key) ?? new Set();
    group.add(subscriber);
    subscribers.set(key, group);
    let released = false;
    return () => {
      if (released) return false;
      released = true;
      group.delete(subscriber);
      if (group.size === 0) subscribers.delete(key);
      return true;
    };
  }

  function invalidate(key, nextRecord) {
    const accepted = requireIntegerRevision(
      immutableDetachedData(nextRecord, 'Cache records'),
      'Cache records',
    );
    const admittedRevision = admittedRevisions.get(key);
    if (admittedRevision !== undefined && accepted.revision <= admittedRevision) {
      throw new RangeError(`Cache record ${String(key)} revision must advance beyond admitted revision ${admittedRevision}.`);
    }
    admittedRevisions.set(key, accepted.revision);
    return commitQueue(accepted, key);
  }

  return Object.freeze({
    receipt: PLATFORM_ADAPTER_RECEIPTS[2],
    get,
    invalidate,
    subscribe,
    subscriberCount: key => (subscribers.get(key) ?? new Set()).size,
  });
}

export function createDeferredDeliveryAdapter() {
  function prepare({ identity, revision, generation, signal }) {
    if (!(signal instanceof AbortSignal)) throw new TypeError('Deferred delivery requires an AbortSignal.');
    let resolve;
    let reject;
    const promise = new Promise((accept, decline) => {
      resolve = accept;
      reject = decline;
    });
    return Object.freeze({
      receipt: PLATFORM_ADAPTER_RECEIPTS[3],
      identity,
      revision,
      generation,
      signal,
      promise,
      resolve,
      reject,
    });
  }

  return Object.freeze({ receipt: PLATFORM_ADAPTER_RECEIPTS[3], prepare });
}

export function createBrowserExecutionReceipt(host = globalThis) {
  const navigatorValue = host.navigator ?? {};
  return Object.freeze({
    userAgent: String(navigatorValue.userAgent ?? 'runtime user agent supplied during browser execution'),
    platform: String(navigatorValue.userAgentData?.platform ?? navigatorValue.platform ?? 'runtime platform supplied during browser execution'),
    language: String(navigatorValue.language ?? 'runtime language supplied during browser execution'),
    contractVersion: 'lifecycle-contract@0.1.0',
    adapters: PLATFORM_ADAPTER_RECEIPTS.map(receipt => `${receipt.id}@${receipt.version}`).join(', '),
  });
}
