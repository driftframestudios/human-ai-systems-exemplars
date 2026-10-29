import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { createWorkDraftAdapter } from '../../collaboration/native-investment-studio/draft.mjs';

function scheduler() {
  let next = 0;
  const active = new Map();
  const callbacks = new Map();
  const cancelled = [];
  return {
    request(callback) {
      const handle = ++next;
      active.set(handle, callback);
      callbacks.set(handle, callback);
      return handle;
    },
    cancel(handle) { active.delete(handle); cancelled.push(handle); },
    run(handle = next) { active.delete(handle); return callbacks.get(handle)(); },
    count: () => active.size,
    latest: () => next,
    cancelled,
  };
}

function start(studio = createStudio(), clock = null) {
  const adapter = createWorkDraftAdapter(studio, clock);
  const opened = adapter.begin('review', studio.read());
  assert.equal(opened.ok, true);
  return { studio, adapter, token: opened.view.draft.token };
}

function retained(studio, expected) {
  assert.strictEqual(studio.read(), expected);
  assert.strictEqual(studio.capture(), expected);
  assert.equal(studio.exportText(), expected.serialized);
}

test('late controls receive their error while a newer draft retains its diagnostic', () => {
  const { studio, adapter, token: oldToken } = start();
  const accepted = studio.read();
  assert.equal(adapter.cancel(oldToken).ok, true);
  const current = adapter.begin('review', accepted).view.draft.token;
  adapter.setText(current, 'minutesPerOccurrence', '');
  const invalid = adapter.apply(current);
  assert.equal(invalid.error.code, 'empty');
  const late = adapter.setText(oldToken, 'minutesPerOccurrence', '60');
  assert.equal(late.error.code, 'draft-token');
  assert.strictEqual(late.view.error, invalid.error);
  assert.strictEqual(late.view.draft.token, current);
  assert.equal(late.view.draft.raw.minutesPerOccurrence, '');
  retained(studio, accepted);
});

test('reentrant scheduler cleanup preserves a newer editor diagnostic across old command completion', () => {
  for (const operation of ['cancel', 'apply', 'inline']) {
    for (const throws of [false, true]) {
      const studio = createStudio();
      const accepted = studio.read();
      let adapter;
      let oldToken;
      let freshToken;
      let freshError;
      const clock = {
        request(callback) { if (operation === 'inline') callback(); return 1; },
        cancel() {
          adapter.cancel(oldToken);
          freshToken = adapter.begin('review', studio.read()).view.draft.token;
          adapter.setText(freshToken, 'minutesPerOccurrence', '');
          freshError = adapter.apply(freshToken).error;
          if (throws) throw new Error('scheduler release failed');
        },
      };
      adapter = createWorkDraftAdapter(studio, clock);
      oldToken = adapter.begin('review', accepted).view.draft.token;
      adapter.setText(oldToken, 'minutesPerOccurrence', '60');
      const queued = adapter.queueApply(oldToken);
      const finished = operation === 'inline' ? queued : adapter[operation](oldToken);
      assert.equal(freshError.code, 'empty');
      assert.strictEqual(finished.view.draft.token, freshToken);
      assert.strictEqual(finished.view.error, freshError, `${operation}, throws=${throws}`);
      assert.strictEqual(adapter.read().error, freshError);
      assert.equal(adapter.read().draft.raw.minutesPerOccurrence, '');
      retained(studio, accepted);
    }
  }
});

test('a bounded work draft retains raw fields separately and commits one coherent row', () => {
  const studio = createStudio();
  const accepted = studio.capture();
  const adapter = createWorkDraftAdapter(studio);
  const idle = adapter.read();
  assert.equal(idle.status, 'idle');
  assert.equal(idle.draft, null);
  assert.equal(idle.pending, false);
  const opened = adapter.begin('review', accepted);
  const token = opened.view.draft.token;
  assert.strictEqual(opened.view.draft.baseProjection, accepted);
  assert.deepEqual(opened.view.draft.raw, { minutesPerOccurrence: '30', occurrences: '6' });
  for (const value of [idle, opened.view, opened.view.draft, opened.view.draft.raw, token]) assert.ok(Object.isFrozen(value));
  const first = adapter.setText(token, 'minutesPerOccurrence', '45');
  assert.equal(first.ok, true);
  assert.equal(adapter.setText(token, 'occurrences', '8').ok, true);
  assert.deepEqual(first.view.draft.raw, { minutesPerOccurrence: '45', occurrences: '6' });
  assert.throws(() => { first.view.draft.raw.occurrences = '1'; }, TypeError);
  retained(studio, accepted);
  assert.equal(adapter.validate(token).ok, true);
  retained(studio, accepted);
  const applied = adapter.apply(token);
  assert.equal(applied.ok, true);
  assert.equal(applied.view.status, 'idle');
  assert.equal(applied.view.draft, null);
  assert.equal(studio.read().state.revision, 1);
  // Four participants × eight 45-minute sessions × $100/hour = $2,400.
  assert.equal(studio.read().result.plannedCommitmentCents, 240000);
  assert.equal(accepted.result.plannedCommitmentCents, 120000);
});

test('incomplete and invalid numeric text stays editable while accepted values remain available', () => {
  const { studio, adapter, token } = start();
  const accepted = studio.read();
  for (const [raw, code] of [
    ['', 'empty'], ['-', 'incomplete'], ['1e', 'incomplete'], ['-1', 'range'],
    ['1.5', 'integer-text'], ['3e1', 'integer-text'], [' 30 ', 'integer-text'], ['1441', 'range'],
  ]) {
    const edited = adapter.setText(token, 'minutesPerOccurrence', raw);
    assert.equal(edited.ok, true, raw);
    assert.equal(edited.view.draft.raw.minutesPerOccurrence, raw);
    const validated = adapter.validate(token);
    assert.equal(validated.ok, false, raw);
    assert.equal(validated.error.code, code, raw);
    assert.equal(adapter.apply(token).ok, false, raw);
    assert.equal(adapter.read().draft.raw.minutesPerOccurrence, raw);
    retained(studio, accepted);
  }
  assert.equal(adapter.setText(token, 'minutesPerOccurrence', '0045').ok, true);
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 45);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
});

test('an explicit zero is a valid quantity while an empty field remains a draft', () => {
  const { studio, adapter, token } = start();
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '');
  assert.equal(adapter.apply(token).error.code, 'empty');
  retained(studio, accepted);
  adapter.setText(token, 'minutesPerOccurrence', '0');
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 0);
  assert.equal(studio.read().result.plannedCommitmentCents, 0);
});

test('field and text limits preserve the existing draft and accepted plan', () => {
  const { studio, adapter, token } = start();
  const accepted = studio.read();
  const original = adapter.read().draft.raw;
  for (const [field, value] of [
    ['rateCentsPerHour', '1'], ['__proto__', '1'], ['occurrences', '1'.repeat(33)],
    ['occurrences', 8], ['occurrences', null],
  ]) {
    assert.equal(adapter.setText(token, field, value).ok, false);
    assert.deepEqual(adapter.read().draft.raw, original);
    retained(studio, accepted);
  }
});

test('step commands compose and preserve invalid or boundary drafts for correction', () => {
  const { studio, adapter, token } = start();
  const accepted = studio.read();
  assert.equal(adapter.step(token, 'occurrences', 1).ok, true);
  assert.equal(adapter.step(token, 'occurrences', 1).ok, true);
  assert.equal(adapter.read().draft.raw.occurrences, '8');
  assert.equal(adapter.step(token, 'occurrences', 0).ok, false);
  assert.equal(adapter.read().draft.raw.occurrences, '8');
  adapter.setText(token, 'minutesPerOccurrence', '');
  assert.equal(adapter.step(token, 'minutesPerOccurrence', 1).ok, false);
  assert.equal(adapter.read().draft.raw.minutesPerOccurrence, '');
  adapter.setText(token, 'minutesPerOccurrence', '0');
  assert.equal(adapter.step(token, 'minutesPerOccurrence', -1).ok, false);
  assert.equal(adapter.read().draft.raw.minutesPerOccurrence, '0');
  adapter.setText(token, 'minutesPerOccurrence', '1440');
  assert.equal(adapter.step(token, 'minutesPerOccurrence', 1).ok, false);
  assert.equal(adapter.read().draft.raw.minutesPerOccurrence, '1440');
  adapter.setText(token, 'minutesPerOccurrence', '30');
  retained(studio, accepted);
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 160000);
});

test('opening a second target retains the first draft and applies to its original work', () => {
  const plan = createExamplePlan();
  plan.work.push({ ...plan.work[0], id: 'preparation', label: 'Preparation', minutesPerOccurrence: 15, occurrences: 1 });
  const { studio, adapter, token } = start(createStudio(plan));
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const held = adapter.begin('preparation', studio.read());
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'draft-open');
  assert.equal(held.view.draft.workId, 'review');
  assert.strictEqual(held.view.draft.token, token);
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 45);
  assert.equal(studio.read().state.work[1].minutesPerOccurrence, 15);
  assert.equal(studio.read().result.plannedCommitmentCents, 190000);
  assert.equal(adapter.begin('preparation', studio.read()).ok, true);
});

test('begin requires the exact accepted projection of its own Studio', () => {
  const studio = createStudio();
  const foreign = createStudio().read();
  const adapter = createWorkDraftAdapter(studio);
  for (const expected of [foreign, structuredClone(studio.read()), undefined]) {
    const held = adapter.begin('review', expected);
    assert.equal(held.ok, false);
    assert.equal(held.error.code, 'stale-edit');
    assert.equal(adapter.read().draft, null);
  }
  assert.equal(adapter.begin('missing', studio.read()).ok, false);
  assert.equal(adapter.read().draft, null);
});

test('equal-number imported revisions make a draft stale and recovery requires a fresh session', () => {
  const { studio, adapter, token } = start();
  const before = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const imported = studio.importText(before.serialized, before);
  assert.equal(imported.ok, true);
  assert.equal(imported.projection.state.revision, before.state.revision);
  assert.notStrictEqual(imported.projection, before);
  const held = adapter.apply(token);
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'stale-edit');
  assert.equal(held.view.status, 'stale');
  assert.equal(held.view.draft.raw.minutesPerOccurrence, '45');
  retained(studio, imported.projection);
  assert.equal(adapter.cancel(token).ok, true);
  const fresh = adapter.begin('review', studio.read());
  const nextToken = fresh.view.draft.token;
  assert.notStrictEqual(nextToken, token);
  assert.equal(adapter.setText(token, 'minutesPerOccurrence', '1').error.code, 'draft-token');
  assert.equal(adapter.setText({}, 'minutesPerOccurrence', '1').error.code, 'draft-token');
  adapter.setText(nextToken, 'minutesPerOccurrence', '60');
  assert.equal(adapter.apply(nextToken).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 240000);
});

test('removing the target leaves the original draft available beside the replacement plan', () => {
  const { studio, adapter, token } = start();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const replacement = createExamplePlan();
  replacement.work = []; replacement.practices = [];
  const accepted = studio.replace(replacement, studio.read()).projection;
  const held = adapter.apply(token);
  assert.equal(held.error.code, 'stale-edit');
  assert.equal(held.view.draft.workId, 'review');
  assert.equal(held.view.draft.raw.minutesPerOccurrence, '45');
  retained(studio, accepted);
  adapter.cancel(token);
  assert.equal(adapter.begin('review', accepted).ok, false);
  assert.equal(adapter.read().draft, null);
});

test('one queued callback commits the latest values across both numeric fields', () => {
  const clock = scheduler();
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  assert.equal(adapter.queueApply(token).ok, true);
  for (const duration of ['50', '55', '60']) {
    adapter.setText(token, 'minutesPerOccurrence', duration);
    assert.equal(adapter.queueApply(token).ok, true);
    assert.equal(clock.count(), 1);
  }
  adapter.setText(token, 'occurrences', '8');
  assert.equal(adapter.read().pending, true);
  retained(studio, accepted);
  clock.run();
  assert.equal(clock.count(), 0);
  assert.equal(adapter.read().pending, false);
  assert.equal(studio.read().state.revision, 1);
  assert.equal(studio.read().result.plannedCommitmentCents, 320000);
});

test('queued increment commands retain every intended step', () => {
  const clock = scheduler();
  const { studio, adapter, token } = start(createStudio(), clock);
  adapter.step(token, 'occurrences', 1);
  adapter.queueApply(token);
  adapter.step(token, 'occurrences', 1);
  adapter.queueApply(token);
  assert.equal(clock.count(), 1);
  clock.run();
  assert.equal(studio.read().state.work[0].occurrences, 8);
  assert.equal(studio.read().result.plannedCommitmentCents, 160000);
  assert.equal(studio.read().state.revision, 1);
});

test('explicit Apply flushes the final value and makes a cancelled callback inert', () => {
  const clock = scheduler();
  const { studio, adapter, token } = start(createStudio(), clock);
  adapter.setText(token, 'minutesPerOccurrence', '45');
  adapter.queueApply(token);
  const queued = clock.latest();
  adapter.setText(token, 'minutesPerOccurrence', '60');
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(clock.count(), 0);
  assert.deepEqual(clock.cancelled, [queued]);
  const committed = studio.read();
  assert.equal(committed.result.plannedCommitmentCents, 240000);
  const next = adapter.begin('review', committed).view.draft.token;
  adapter.setText(next, 'minutesPerOccurrence', '15');
  clock.run(queued);
  retained(studio, committed);
  assert.equal(adapter.read().draft.raw.minutesPerOccurrence, '15');
});

test('cancel invalidates queued work before a fresh draft begins', () => {
  const clock = scheduler();
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  adapter.queueApply(token);
  const old = clock.latest();
  assert.equal(adapter.cancel(token).ok, true);
  assert.equal(clock.count(), 0);
  const fresh = adapter.begin('review', accepted).view.draft.token;
  adapter.setText(fresh, 'minutesPerOccurrence', '60');
  adapter.queueApply(fresh);
  const current = clock.latest();
  clock.run(old);
  retained(studio, accepted);
  assert.equal(adapter.read().pending, true);
  assert.equal(clock.count(), 1);
  clock.run(current);
  assert.equal(studio.read().result.plannedCommitmentCents, 240000);
});

test('queued work preserves an intervening import and its stale draft', () => {
  const clock = scheduler();
  const { studio, adapter, token } = start(createStudio(), clock);
  const before = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  adapter.queueApply(token);
  const imported = createExamplePlan();
  imported.work[0].occurrences = 12;
  const accepted = studio.importText(JSON.stringify(imported), before).projection;
  clock.run();
  retained(studio, accepted);
  const view = adapter.read();
  assert.equal(view.status, 'stale');
  assert.equal(view.error.code, 'stale-edit');
  assert.equal(view.draft.raw.minutesPerOccurrence, '45');
  assert.equal(view.pending, false);
});

test('queued validation retains invalid text for a later corrected Apply', () => {
  const clock = scheduler();
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '');
  assert.equal(adapter.queueApply(token).ok, true);
  clock.run();
  retained(studio, accepted);
  assert.equal(adapter.read().draft.raw.minutesPerOccurrence, '');
  assert.equal(adapter.read().error.code, 'empty');
  assert.equal(adapter.read().pending, false);
  adapter.setText(token, 'minutesPerOccurrence', '45');
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
});

test('disposal is idempotent and late callbacks retain accepted state', () => {
  const clock = scheduler();
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  adapter.queueApply(token);
  const queued = clock.latest();
  assert.equal(adapter.dispose().ok, true);
  assert.equal(adapter.dispose().ok, true);
  assert.equal(clock.count(), 0);
  assert.deepEqual(clock.cancelled, [queued]);
  clock.run(queued);
  retained(studio, accepted);
  assert.equal(adapter.read().status, 'disposed');
  assert.equal(adapter.read().draft, null);
  for (const command of [
    () => adapter.begin('review', accepted), () => adapter.setText(token, 'occurrences', '8'),
    () => adapter.step(token, 'occurrences', 1), () => adapter.validate(token),
    () => adapter.apply(token), () => adapter.queueApply(token), () => adapter.cancel(token),
  ]) assert.equal(command().error.code, 'disposed');
});

test('an adapter without a scheduler retains its draft for explicit Apply', () => {
  const { studio, adapter, token } = start();
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const held = adapter.queueApply(token);
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'scheduler-unavailable');
  assert.equal(held.view.pending, false);
  retained(studio, accepted);
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
});

test('an inline scheduler callback is held until a valid deferred receiver is available', () => {
  const cancelled = [];
  let callback;
  const clock = {
    request(next) { callback = next; next(); return 0; },
    cancel(handle) { cancelled.push(handle); },
  };
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const held = adapter.queueApply(token);
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'scheduler');
  assert.equal(held.view.pending, false);
  assert.equal(held.view.draft.raw.minutesPerOccurrence, '45');
  assert.deepEqual(cancelled, [0]);
  callback();
  retained(studio, accepted);
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
});

test('a scheduler request failure leaves its captured callback inert and preserves recovery', () => {
  let callback;
  const clock = {
    request(next) { callback = next; throw new Error('Scheduler unavailable'); },
    cancel() { assert.fail('A failed acquisition returned no owned handle.'); },
  };
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const held = adapter.queueApply(token);
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'scheduler');
  assert.equal(held.view.pending, false);
  callback();
  retained(studio, accepted);
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
});

test('failed cancellation invalidates the callback and leaves an explicit Apply recovery route', () => {
  let callback;
  let cancellations = 0;
  const clock = {
    request(next) { callback = next; return 0; },
    cancel() { cancellations += 1; callback(); throw new Error('Cleanup incomplete'); },
  };
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  adapter.queueApply(token);
  const held = adapter.apply(token);
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'cleanup');
  assert.equal(held.view.pending, false);
  assert.equal(held.view.draft.raw.minutesPerOccurrence, '45');
  callback();
  retained(studio, accepted);
  assert.equal(adapter.apply(token).ok, true);
  assert.equal(cancellations, 1);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
});

test('disposal preserves its cleanup diagnostic and invalidates callbacks before host cleanup', () => {
  let callback;
  let cancellations = 0;
  const clock = {
    request(next) { callback = next; return 0; },
    cancel() { cancellations += 1; callback(); throw new Error('Cleanup incomplete'); },
  };
  const { studio, adapter, token } = start(createStudio(), clock);
  const accepted = studio.read();
  adapter.setText(token, 'minutesPerOccurrence', '45');
  adapter.queueApply(token);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = adapter.dispose();
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'cleanup');
    assert.equal(result.view.status, 'disposed');
    assert.equal(result.view.draft, null);
  }
  assert.equal(cancellations, 1);
  callback();
  retained(studio, accepted);
});

test('reentrant disposal during request releases the eventual handle and preserves accepted state', () => {
  let adapter;
  let callback;
  const cancelled = [];
  const clock = {
    request(next) { callback = next; adapter.dispose(); return 0; },
    cancel(handle) { cancelled.push(handle); },
  };
  const studio = createStudio();
  const accepted = studio.read();
  adapter = createWorkDraftAdapter(studio, clock);
  const token = adapter.begin('review', accepted).view.draft.token;
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const held = adapter.queueApply(token);
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'cancelled');
  assert.equal(held.view.status, 'disposed');
  assert.equal(held.view.pending, false);
  assert.deepEqual(cancelled, [0]);
  callback();
  retained(studio, accepted);
});

test('reentrant cancellation during request preserves the fresh draft and releases the old handle', () => {
  let adapter;
  let token;
  let callback;
  let freshToken;
  const cancelled = [];
  const studio = createStudio();
  const accepted = studio.read();
  const clock = {
    request(next) {
      callback = next;
      assert.equal(adapter.cancel(token).ok, true);
      freshToken = adapter.begin('review', accepted).view.draft.token;
      adapter.setText(freshToken, 'minutesPerOccurrence', '60');
      return 0;
    },
    cancel(handle) { cancelled.push(handle); },
  };
  adapter = createWorkDraftAdapter(studio, clock);
  token = adapter.begin('review', accepted).view.draft.token;
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const held = adapter.queueApply(token);
  assert.equal(held.ok, false);
  assert.equal(held.error.code, 'cancelled');
  assert.strictEqual(held.view.draft.token, freshToken);
  assert.equal(held.view.draft.raw.minutesPerOccurrence, '60');
  assert.deepEqual(cancelled, [0]);
  callback();
  retained(studio, accepted);
  assert.equal(adapter.apply(freshToken).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 240000);
});

test('a coalesced commit crosses the accepted boundary exactly once', () => {
  const studio = createStudio();
  let commits = 0;
  const receiver = {
    read: studio.read,
    updateWork(...args) { commits += 1; return studio.updateWork(...args); },
  };
  const clock = scheduler();
  const adapter = createWorkDraftAdapter(receiver, clock);
  const token = adapter.begin('review', studio.read()).view.draft.token;
  for (const raw of ['31', '32', '45']) {
    adapter.setText(token, 'minutesPerOccurrence', raw);
    adapter.queueApply(token);
  }
  assert.equal(commits, 0);
  assert.equal(clock.count(), 1);
  clock.run();
  assert.equal(commits, 1);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
  clock.run();
  assert.equal(commits, 1);
});

test('cleanup settles its original draft before that draft can acquire another request', () => {
  for (const throws of [false, true]) {
    const studio = createStudio();
    const initial = studio.read();
    const clock = scheduler();
    const release = clock.cancel;
    let adapter;
    let token;
    let nestedQueue;
    let nestedApply;
    let firstRelease = true;
    clock.cancel = handle => {
      release(handle);
      if (!firstRelease) return;
      firstRelease = false;
      nestedQueue = adapter.queueApply(token);
      nestedApply = adapter.apply(token);
      if (throws) throw new Error('Host cleanup needs attention');
    };
    adapter = createWorkDraftAdapter(studio, clock);
    token = adapter.begin('review', initial).view.draft.token;
    adapter.setText(token, 'minutesPerOccurrence', '45');
    adapter.queueApply(token);
    const oldHandle = clock.latest();
    const applied = adapter.apply(token);
    assert.equal(nestedQueue.error?.code, 'settling');
    assert.equal(nestedApply.error?.code, 'settling');
    assert.equal(clock.count(), 0);
    assert.equal(adapter.read().pending, false);
    if (throws) {
      assert.equal(applied.error.code, 'cleanup');
      retained(studio, initial);
      assert.equal(adapter.apply(token).ok, true);
    } else assert.equal(applied.ok, true);
    assert.equal(studio.read().state.revision, 1);
    assert.equal(studio.read().result.plannedCommitmentCents, 180000);
    token = adapter.begin('review', studio.read()).view.draft.token;
    adapter.setText(token, 'minutesPerOccurrence', '60');
    assert.equal(adapter.queueApply(token).ok, true);
    const newHandle = clock.latest();
    assert.notEqual(newHandle, oldHandle);
    clock.run(oldHandle);
    assert.equal(adapter.read().pending, true);
    clock.run(newHandle);
    assert.equal(studio.read().result.plannedCommitmentCents, 240000);
    assert.equal(studio.read().state.revision, 2);
    assert.equal(adapter.read().pending, false);
  }
});

test('cleanup of an older request preserves a replacement draft and its pending request', () => {
  const studio = createStudio();
  const before = studio.read();
  const clock = scheduler();
  const release = clock.cancel;
  let adapter;
  let oldToken;
  let freshToken;
  clock.cancel = handle => {
    release(handle);
    adapter.cancel(oldToken);
    freshToken = adapter.begin('review', before).view.draft.token;
    adapter.setText(freshToken, 'minutesPerOccurrence', '60');
    assert.equal(adapter.queueApply(freshToken).ok, true);
  };
  adapter = createWorkDraftAdapter(studio, clock);
  oldToken = adapter.begin('review', before).view.draft.token;
  adapter.setText(oldToken, 'minutesPerOccurrence', '45');
  adapter.queueApply(oldToken);
  const oldHandle = clock.latest();
  const applied = adapter.apply(oldToken);
  assert.equal(applied.error.code, 'draft-token');
  assert.strictEqual(adapter.read().draft.token, freshToken);
  assert.equal(adapter.read().pending, true);
  assert.equal(clock.count(), 1);
  const freshHandle = clock.latest();
  clock.run(oldHandle);
  retained(studio, before);
  assert.equal(adapter.read().pending, true);
  clock.run(freshHandle);
  assert.equal(studio.read().result.plannedCommitmentCents, 240000);
  assert.equal(studio.read().state.revision, 1);
});

test('inline-scheduler cleanup also settles its draft before a new queue request', () => {
  const studio = createStudio();
  const before = studio.read();
  let adapter;
  let token;
  let firstRelease = true;
  let requests = 0;
  let nested;
  const clock = {
    request(callback) { requests += 1; callback(); return requests; },
    cancel() {
      if (firstRelease) { firstRelease = false; nested = adapter.queueApply(token); }
    },
  };
  adapter = createWorkDraftAdapter(studio, clock);
  token = adapter.begin('review', before).view.draft.token;
  const result = adapter.queueApply(token);
  assert.equal(result.error.code, 'scheduler');
  assert.equal(nested.error?.code, 'settling');
  assert.equal(requests, 1);
  assert.equal(adapter.read().pending, false);
  retained(studio, before);
});

test('a disposed view reports eventual handle cleanup failure as soon as acquisition returns', () => {
  const studio = createStudio();
  const before = studio.read();
  let adapter;
  let callback;
  let releases = 0;
  const clock = {
    request(next) { callback = next; adapter.dispose(); return 0; },
    cancel() { releases += 1; throw new Error('Host resource still needs release'); },
  };
  adapter = createWorkDraftAdapter(studio, clock);
  const token = adapter.begin('review', before).view.draft.token;
  const result = adapter.queueApply(token);
  assert.equal(result.error.code, 'cleanup');
  assert.strictEqual(result.view.error, result.error);
  assert.strictEqual(adapter.read().error, result.error);
  assert.equal(adapter.read().status, 'disposed');
  callback();
  retained(studio, before);
  assert.strictEqual(adapter.dispose().error, result.error);
  assert.equal(releases, 1);
});

function startDuration(studio = createStudio(), clock = null) {
  const adapter = createWorkDraftAdapter(studio, clock, { durationFormat: 'hours-minutes' });
  const opened = adapter.begin('review', studio.read());
  assert.equal(opened.ok, true);
  return { studio, adapter, token: opened.view.draft.token };
}

test('hours and minutes share one raw draft and price one canonical session duration', () => {
  const { studio, adapter, token } = startDuration();
  const before = studio.read();
  assert.deepEqual(adapter.read().draft.raw, { hoursPerSession: '0', minutesPerSession: '30', occurrences: '6' });
  assert.equal(adapter.read().draft.changed, false);
  assert.equal(adapter.setText(token, 'hoursPerSession', '1').ok, true);
  assert.equal(adapter.read().draft.changed, true);
  const preview = adapter.preview(token);
  assert.equal(preview.ok, true);
  assert.equal(preview.projection.state.work[0].minutesPerOccurrence, 90);
  assert.equal(preview.projection.result.knownCommitmentCents, 360000);
  retained(studio, before);
  const applied = adapter.apply(token);
  assert.equal(applied.ok, true);
  assert.equal(applied.view.projection.result.knownCommitmentCents, 360000);
  assert.equal(applied.view.projection.state.work[0].minutesPerOccurrence, 90);
  assert.equal(applied.view.projection.state.revision, 1);
  assert.equal(applied.view.draft, null);
  const fresh = adapter.begin('review', studio.read()).view.draft;
  assert.notStrictEqual(fresh.token, token);
  assert.deepEqual(fresh.raw, { hoursPerSession: '1', minutesPerSession: '30', occurrences: '6' });
  assert.equal(fresh.changed, false);
  assert.equal(adapter.setText(token, 'hoursPerSession', '2').error.code, 'draft-token');
});

test('duration parts preserve incomplete input, combined limits, and a distinct zero', () => {
  const { studio, adapter, token } = startDuration();
  const before = studio.read();
  for (const [raw, code] of [['', 'empty'], ['-', 'incomplete'], ['1e', 'incomplete'], ['-1', 'range'], ['1.5', 'integer-text'], ['25', 'range']]) {
    adapter.setText(token, 'hoursPerSession', raw);
    assert.equal(adapter.preview(token).error.code, code);
    assert.equal(adapter.apply(token).error.code, code);
    assert.equal(adapter.read().draft.raw.hoursPerSession, raw);
    assert.equal(adapter.read().draft.changed, true);
    retained(studio, before);
  }
  adapter.setText(token, 'hoursPerSession', '24');
  adapter.setText(token, 'minutesPerSession', '1');
  assert.equal(adapter.preview(token).error.path, 'draft.minutesPerSession');
  assert.equal(adapter.apply(token).error.code, 'range');
  adapter.setText(token, 'minutesPerSession', '60');
  assert.equal(adapter.preview(token).error.code, 'range');
  adapter.setText(token, 'minutesPerSession', '0');
  assert.equal(adapter.preview(token).projection.state.work[0].minutesPerOccurrence, 1440);
  assert.equal(adapter.apply(token).ok, true);
  const zeroToken = adapter.begin('review', studio.read()).view.draft.token;
  adapter.setText(zeroToken, 'hoursPerSession', '0');
  assert.equal(adapter.preview(zeroToken).projection.result.knownCommitmentCents, 0);
  assert.equal(adapter.apply(zeroToken).ok, true);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 0);
  assert.equal(studio.read().result.knownCommitmentCents, 0);
  assert.throws(() => createWorkDraftAdapter(studio, null, { durationFormat: 'sprints' }), TypeError);
  assert.throws(() => createWorkDraftAdapter(studio, null, { durationFormat: '__proto__' }), TypeError);
});

test('duration steps carry minutes across hours and retain invalid or boundary text', () => {
  const { studio, adapter, token } = startDuration();
  const before = studio.read();
  adapter.setText(token, 'minutesPerSession', '59');
  adapter.step(token, 'minutesPerSession', 1);
  assert.deepEqual(adapter.read().draft.raw, { hoursPerSession: '1', minutesPerSession: '0', occurrences: '6' });
  adapter.step(token, 'minutesPerSession', -1);
  assert.deepEqual(adapter.read().draft.raw, { hoursPerSession: '0', minutesPerSession: '59', occurrences: '6' });
  adapter.step(token, 'hoursPerSession', 1);
  assert.deepEqual(adapter.read().draft.raw, { hoursPerSession: '1', minutesPerSession: '59', occurrences: '6' });
  adapter.setText(token, 'hoursPerSession', '');
  assert.equal(adapter.step(token, 'minutesPerSession', 1).error.code, 'empty');
  assert.equal(adapter.read().draft.raw.hoursPerSession, '');
  adapter.setText(token, 'hoursPerSession', '24');
  adapter.setText(token, 'minutesPerSession', '0');
  assert.equal(adapter.step(token, 'minutesPerSession', 1).error.code, 'range');
  assert.deepEqual(adapter.read().draft.raw, { hoursPerSession: '24', minutesPerSession: '0', occurrences: '6' });
  adapter.setText(token, 'hoursPerSession', '0');
  assert.equal(adapter.step(token, 'hoursPerSession', -1).error.code, 'range');
  assert.equal(adapter.setText(token, 'minutesPerSession', '0'.repeat(33)).error.code, 'text');
  assert.equal(adapter.read().draft.raw.minutesPerSession, '0');
  retained(studio, before);
});

test('unchanged canonical quantities remain clean while invalid text remains a changed draft', () => {
  for (const durationFormat of ['minutes', 'hours-minutes']) {
    const studio = createStudio();
    const adapter = createWorkDraftAdapter(studio, null, { durationFormat });
    const token = adapter.begin('review', studio.read()).view.draft.token;
    const field = durationFormat === 'minutes' ? 'minutesPerOccurrence' : 'minutesPerSession';
    adapter.setText(token, field, '030');
    adapter.setText(token, 'occurrences', '006');
    assert.equal(adapter.read().draft.changed, false);
    adapter.setText(token, field, '');
    assert.equal(adapter.read().draft.changed, true);
  }
});

test('preview caches one unchanged draft and preserves accepted identity through edits and stale recovery', () => {
  const studio = createStudio();
  const before = studio.read();
  let preparations = 0;
  const receiver = { ...studio, previewWork(...args) { preparations += 1; return studio.previewWork(...args); } };
  const { adapter, token } = startDuration(receiver);
  const first = adapter.preview(token);
  assert.equal(first.ok, true);
  assert.strictEqual(adapter.preview(token).projection, first.projection);
  adapter.setText(token, 'hoursPerSession', '0');
  assert.strictEqual(adapter.preview(token).projection, first.projection);
  assert.equal(preparations, 1);
  adapter.setText(token, 'hoursPerSession', '1');
  const next = adapter.preview(token);
  assert.equal(next.projection.result.knownCommitmentCents, 360000);
  assert.equal(preparations, 2);
  retained(studio, before);
  adapter.setText(token, 'minutesPerSession', '');
  assert.equal(adapter.preview(token).error.code, 'empty');
  assert.equal(preparations, 2);
  adapter.setText(token, 'minutesPerSession', '30');
  assert.equal(adapter.preview(token).ok, true);
  assert.equal(preparations, 3);
  studio.importText(studio.exportText(), before);
  const imported = studio.read();
  assert.equal(adapter.preview(token).error.code, 'stale-edit');
  assert.equal(preparations, 3);
  assert.equal(adapter.read().draft.raw.hoursPerSession, '1');
  adapter.cancel(token);
  const current = adapter.begin('review', imported).view.draft.token;
  assert.equal(adapter.preview(token).error.code, 'draft-token');
  assert.equal(adapter.preview(current).projection.result.knownCommitmentCents, 120000);
  retained(studio, imported);
  adapter.dispose();
  assert.equal(adapter.preview(current).error.code, 'disposed');
});

test('preview retains a newer raw edit or session created during cooperative host evaluation', () => {
  for (const change of ['raw', 'session']) {
    const studio = createStudio();
    const before = studio.read();
    let adapter;
    let token;
    let currentToken;
    let first = true;
    const receiver = { ...studio, previewWork(...args) {
      const result = studio.previewWork(...args);
      if (first) {
        first = false;
        if (change === 'session') {
          adapter.cancel(token);
          currentToken = adapter.begin('review', studio.read()).view.draft.token;
        } else currentToken = token;
        adapter.setText(currentToken, 'hoursPerSession', '2');
      }
      return result;
    } };
    adapter = createWorkDraftAdapter(receiver, null, { durationFormat: 'hours-minutes' });
    token = adapter.begin('review', before).view.draft.token;
    const result = adapter.preview(token);
    assert.equal(result.error.code, change === 'raw' ? 'draft-changed' : 'draft-token');
    assert.equal(adapter.read().draft.raw.hoursPerSession, '2');
    assert.equal(adapter.preview(currentToken).projection.result.knownCommitmentCents, 600000);
    retained(studio, before);
  }
});

test('successful work Apply releases scheduled work and retains newer raw text written during publication', () => {
  const studio = createStudio(), clock = scheduler();
  let adapter, token;
  adapter = createWorkDraftAdapter({ ...studio, updateWork(...args) {
    const result = studio.updateWork(...args);
    adapter.setText(token, 'minutesPerOccurrence', '60');
    return result;
  } }, clock);
  token = adapter.begin('review', studio.read()).view.draft.token;
  adapter.setText(token, 'minutesPerOccurrence', '45');
  assert.equal(adapter.queueApply(token).ok, true);
  const result = adapter.apply(token);
  assert.equal(result.ok, true);
  assert.equal(clock.count(), 0);
  assert.equal(result.view.pending, false);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 45);
  assert.equal(studio.read().result.plannedCommitmentCents, 180000);
  assert.equal(result.view.status, 'stale');
  assert.strictEqual(result.view.draft.token, token);
  assert.equal(result.view.draft.raw.minutesPerOccurrence, '60');
  assert.equal(adapter.apply(token).error.code, 'stale-edit');
  assert.equal(adapter.cancel(token).ok, true);
});

test('successful work Apply preserves a replacement editor and its diagnostic', () => {
  const studio = createStudio();
  let adapter, token, replacement;
  adapter = createWorkDraftAdapter({ ...studio, updateWork(...args) {
    const result = studio.updateWork(...args);
    adapter.cancel(token);
    replacement = adapter.begin('review', studio.read()).view.draft.token;
    adapter.setText(replacement, 'minutesPerOccurrence', '60');
    assert.equal(adapter.setText(replacement, 'minutesPerOccurrence', '9'.repeat(33)).error.code, 'text');
    return result;
  } });
  token = adapter.begin('review', studio.read()).view.draft.token;
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const result = adapter.apply(token);
  assert.equal(result.ok, true);
  assert.equal(studio.read().state.work[0].minutesPerOccurrence, 45);
  assert.strictEqual(result.view.draft.token, replacement);
  assert.equal(result.view.draft.raw.minutesPerOccurrence, '60');
  assert.equal(result.view.error.code, 'text');
});

test('failed work publication returns its error while a newer editor retains its own diagnostic', () => {
  const studio = createStudio();
  let adapter, token, replacement;
  adapter = createWorkDraftAdapter({ ...studio, updateWork(id, candidate, expected) {
    const result = studio.updateWork(id, { ...candidate, extra: true }, expected);
    adapter.cancel(token);
    replacement = adapter.begin('review', studio.read()).view.draft.token;
    assert.equal(adapter.setText(replacement, 'minutesPerOccurrence', '9'.repeat(33)).error.code, 'text');
    return result;
  } });
  token = adapter.begin('review', studio.read()).view.draft.token;
  adapter.setText(token, 'minutesPerOccurrence', '45');
  const before = studio.read();
  const result = adapter.apply(token);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'fields');
  assert.strictEqual(result.view.draft.token, replacement);
  assert.equal(result.view.error.code, 'text');
  retained(studio, before);
});
