// Research observations wrap public model commands; the canonical source stays
// unchanged. No timing below attributes work to internal preparation phases.
export const POLICIES = Object.freeze(['direct', 'explicit', 'deferred', 'preview']);
export const BOUNDARY_TASKS = Object.freeze(['import', 'rate-replacement']);
const INPUTS = Object.freeze(['31', '45', '60']);
const RATE_FANOUT = Object.freeze({ example: 1, medium: 8, caps: 25, 'near-byte': 25 });
const encoder = new TextEncoder();

function requireCondition(condition, message) { if (!condition) throw new Error(message); }

export function stats(values) {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => !Number.isFinite(value) || value < 0)) {
    throw new TypeError('Summarize a nonempty array of finite nonnegative observations.');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return Object.freeze({ count: sorted.length, min: sorted[0], max: sorted.at(-1),
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95: sorted[Math.ceil(sorted.length * .95) - 1] });
}

export function instrumentStudio(owner, now = () => performance.now()) {
  const counters = {
    rawEdits: 0, steps: 0, begins: 0, queueRequests: 0, scheduledRequests: 0,
    cancelledRequests: 0, pendingRequests: 0, maxPendingRequests: 0,
    previewRequests: 0, previewPreparations: 0, cacheHits: 0, workUpdates: 0,
    imports: 0, replacements: 0, acceptedCommits: 0,
  };
  const produced = [];
  let modelMs = 0;
  const facade = { ...owner };
  for (const [method, counter] of [['previewWork', 'previewPreparations'], ['updateWork', 'workUpdates'], ['importText', 'imports'], ['replace', 'replacements']]) {
    facade[method] = (...args) => {
      counters[counter] += 1;
      const before = owner.read();
      const started = now();
      let result;
      try { result = owner[method](...args); }
      finally { modelMs += now() - started; }
      if (result.ok) {
        // Keep output references until the untimed observation. UTF-8 encoding
        // and semantic assertions stay outside the complete trace timer.
        produced.push(result.projection.serialized);
        if (method !== 'previewWork' && owner.read() !== before) counters.acceptedCommits += 1;
      }
      return result;
    };
  }
  return {
    studio: Object.freeze(facade), counters,
    snapshot: () => ({ ...counters,
      producedUtf8Bytes: produced.reduce((sum, text) => sum + encoder.encode(text).byteLength, 0), modelMs }),
  };
}

function trackAdapter(adapter, counters) {
  const facade = { ...adapter };
  for (const [method, counter] of [['begin', 'begins'], ['setText', 'rawEdits'], ['step', 'steps'], ['preview', 'previewRequests'], ['queueApply', 'queueRequests']]) {
    facade[method] = (...args) => {
      counters[counter] += 1;
      const before = counters.previewPreparations;
      const result = adapter[method](...args);
      if (method === 'preview' && result.ok && before === counters.previewPreparations) counters.cacheHits += 1;
      return result;
    };
  }
  return facade;
}

function scheduler(counters) {
  let callback = null;
  let nextId = 0;
  return {
    request(receive) {
      requireCondition(callback === null, 'The declared trace owns at most one deferred callback.');
      callback = receive;
      counters.scheduledRequests += 1;
      counters.pendingRequests += 1;
      counters.maxPendingRequests = Math.max(counters.maxPendingRequests, counters.pendingRequests);
      return ++nextId;
    },
    cancel() {
      counters.cancelledRequests += 1;
      if (callback !== null) counters.pendingRequests -= 1;
      callback = null;
    },
    flush() {
      const receive = callback;
      requireCondition(receive !== null, 'The deferred trace has one callback to flush.');
      callback = null;
      counters.pendingRequests -= 1;
      receive();
    },
  };
}

function verifyMoney(projection, expected) {
  requireCondition(projection.result.knownCommitmentCents === expected.cents, 'The trace must reach its independent monetary expectation.');
  const minutes = projection.result.capacity.reduce((sum, person) => sum + person.additionalMinutes, 0);
  requireCondition(minutes === expected.participantMinutes, 'The trace must reach its independent participant-effort expectation.');
}

export function createPolicyTask({ fixture, policy, createStudio, createWorkDraftAdapter, now }) {
  if (!POLICIES.includes(policy)) throw new TypeError('Choose a declared source policy.');
  const observed = instrumentStudio(createStudio(fixture.plan), now);
  const { studio, counters } = observed;
  const initial = studio.read();
  const row = initial.state.work.find(work => work.id === fixture.workId);
  requireCondition(row !== undefined, 'The fixture contains its named work row.');
  const deferred = scheduler(counters);
  const adapter = policy === 'direct' ? null : trackAdapter(createWorkDraftAdapter(studio, policy === 'deferred' ? deferred : null), counters);
  const outcomes = [];
  let executed = false;
  return {
    execute() {
      requireCondition(!executed, 'Each prepared trace executes once.');
      executed = true;
      if (policy === 'direct') {
        for (const raw of INPUTS) {
          counters.rawEdits += 1;
          outcomes.push(studio.updateWork(fixture.workId, { ...row, minutesPerOccurrence: Number(raw) }, studio.read()));
        }
        return;
      }
      const opened = adapter.begin(fixture.workId, studio.read());
      outcomes.push(opened);
      const token = opened.view.draft.token;
      if (policy === 'preview') outcomes.push(adapter.preview(token));
      for (const raw of INPUTS) {
        outcomes.push(adapter.setText(token, 'minutesPerOccurrence', raw));
        if (policy === 'preview') outcomes.push(adapter.preview(token));
        if (policy === 'deferred') outcomes.push(adapter.queueApply(token));
      }
      if (policy === 'deferred') deferred.flush();
      else outcomes.push(adapter.apply(token));
      if (policy === 'preview') {
        const reopened = adapter.begin(fixture.workId, studio.read());
        outcomes.push(reopened, adapter.preview(reopened.view.draft.token));
      }
    },
    verify() {
      requireCondition(executed, 'Execute the trace before interpreting its observation.');
      requireCondition(outcomes.every(result => result.ok), 'Every declared command completes successfully.');
      verifyMoney(studio.read(), fixture.expectedByMinutes[60]);
      requireCondition(studio.read().state.revision === (policy === 'direct' ? 3 : 1), 'Accepted revisions follow the declared commit policy.');
      requireCondition(studio.read() !== initial, 'The final result is a newly accepted projection.');
      requireCondition(counters.rawEdits === 3 && counters.steps === 0, 'The trace consumes three absolute values and zero additive steps.');
      requireCondition(counters.acceptedCommits === (policy === 'direct' ? 3 : 1), 'Commit counts follow the declared policy.');
      requireCondition(counters.previewRequests === (policy === 'preview' ? 5 : 0), 'Preview requests follow the declared policy.');
      requireCondition(counters.previewPreparations === (policy === 'preview' ? 5 : 0), 'Each declared changed/fresh preview prepares once.');
      requireCondition(counters.scheduledRequests === (policy === 'deferred' ? 1 : 0), 'Only the deferred policy acquires a scheduler resource.');
      requireCondition(counters.queueRequests === (policy === 'deferred' ? 3 : 0), 'Repeated deferred requests share one pending resource.');
      requireCondition(counters.pendingRequests === 0, 'The trace finishes with zero pending requests.');
      if (policy === 'preview') requireCondition(adapter.read().draft?.changed === false, 'The fresh post-Apply draft matches accepted values.');
      return studio.read();
    },
    snapshot: observed.snapshot,
    dispose() { if (adapter) adapter.dispose(); },
  };
}

export function createBoundaryTask({ fixture, task, createStudio, now }) {
  if (!BOUNDARY_TASKS.includes(task)) throw new TypeError('Choose a declared boundary task.');
  const observed = instrumentStudio(createStudio(fixture.plan), now);
  const { studio } = observed;
  const before = studio.read();
  const text = before.serialized;
  let candidate = null;
  let expected = fixture.expectedByMinutes[30];
  if (task === 'rate-replacement') {
    const person = fixture.plan.people[0];
    const references = fixture.plan.work.filter(work => work.personIds.includes(person.id)).length;
    requireCondition(references === RATE_FANOUT[fixture.id], 'The rate task retains its independently declared fan-out.');
    // Each of these references carries six half-hour sessions. A $1/hour raise
    // therefore adds exactly $3 (300 cents) per reference, with integral cents.
    expected = { cents: expected.cents + RATE_FANOUT[fixture.id] * 300, participantMinutes: expected.participantMinutes };
    candidate = { ...fixture.plan, people: fixture.plan.people.map((row, index) => index === 0 ? { ...row, rateCentsPerHour: 10100 } : row) };
  }
  let outcome;
  return {
    execute() {
      requireCondition(outcome === undefined, 'Each prepared boundary task executes once.');
      outcome = task === 'import' ? studio.importText(text, before) : studio.replace(candidate, before);
    },
    verify() {
      requireCondition(outcome?.ok === true, 'The boundary task completes successfully.');
      verifyMoney(studio.read(), expected);
      requireCondition(studio.read() !== before, 'The boundary creates a distinct accepted identity.');
      requireCondition(studio.read().state.revision === 0, 'Whole-plan replacement retains its supplied numeric revision.');
      requireCondition(observed.counters.acceptedCommits === 1, 'The boundary accepts one replacement.');
      return studio.read();
    },
    snapshot: observed.snapshot,
    dispose() {},
  };
}
