import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanExchange, readFileBytes } from '../../collaboration/native-investment-studio/exchange.mjs';
import { createDraftCoordinator } from '../../collaboration/native-investment-studio/editing.mjs';
import { createStudio } from '../../collaboration/native-investment-studio/state.mjs';
import { createExamplePlan } from '../../collaboration/native-investment-studio/contract.mjs';
import { LIMITS } from '../../collaboration/native-investment-studio/config.mjs';

const VERSION = '1.0.0';
const encoder = new TextEncoder();
const planText = mutate => { const plan = createExamplePlan(); mutate?.(plan); return JSON.stringify(plan); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function editingFixture() {
  let intent = Symbol(), active = null, disposed = false, parks = 0;
  const parked = [];
  const port = { read: () => ({ draft: active ? { changed: active.changed, raw: active.raw } : null }) };
  return {
    read: () => ({ intent, active, disposed, parked }), work: port, person: port,
    open(changed = false) { active = { kind: 'work', changed, raw: '45' }; },
    edit() { intent = Symbol(); if (active) active.changed = true; },
    cancel() { active = null; intent = Symbol(); },
    park() { parks++; if (active?.changed) parked.push({ raw: active.raw }); active = null; return { ok: true }; },
    parked, get parks() { return parks; },
    dispose() { disposed = true; intent = Symbol(); },
  };
}
function fixture(reader) {
  const studio = createStudio(), editing = editingFixture();
  const exchange = createPlanExchange(studio, editing, reader ? { readFile: reader } : {});
  return { studio, editing, exchange };
}
function file(text = planText()) { return { size: encoder.encode(text).byteLength }; }
function expectHeld(result, code) { assert.equal(result.ok, false); assert.equal(result.error.code, code); }

test('text preview is inert, reports keyed changes, and explicit Apply publishes one accepted event', () => {
  const { studio, exchange } = fixture();
  const before = studio.read(), acceptance = studio.readAcceptance();
  studio.setBaseline(before);
  const baseline = studio.readBaseline();
  const input = planText(plan => {
    plan.people[0].rateCentsPerHour = 10100;
    plan.people.reverse();
    plan.purpose.changedAbility = 'Share the decision';
    plan.horizonWeeks = 8;
  });
  const prepared = exchange.previewText(input);
  assert.equal(prepared.ok, true);
  const preview = prepared.view.preview;
  assert.equal(preview.projection.result.plannedCommitmentCents, 120300);
  assert.deepEqual(preview.changes.people.changed, [{ id: 'product-one', fields: ['rateCentsPerHour'] }]);
  assert.deepEqual(preview.changes.people.added, []);
  assert.equal(preview.changes.people.orderChanged, true);
  assert.deepEqual(preview.changes.purpose, ['changedAbility']);
  assert.deepEqual(preview.changes.plan, ['horizonWeeks']);
  assert.equal(Object.isFrozen(preview.changes.people.changed[0].fields), true);
  assert.strictEqual(studio.read(), before);
  assert.strictEqual(studio.readAcceptance(), acceptance);
  assert.strictEqual(studio.readBaseline(), baseline);
  assert.equal(studio.readHistory().undoCount, 0);
  const applied = exchange.apply(preview.token);
  assert.equal(applied.ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 120300);
  assert.equal(studio.readAcceptance().sequence, 1);
  assert.equal(studio.readHistory().undoCount, 1);
  assert.strictEqual(studio.readBaseline(), baseline);
  assert.equal(exchange.read().preview, null);
  expectHeld(exchange.apply(preview.token), 'preview-token');
});

test('comparison names row additions, removals and changed relationship fields', () => {
  const { exchange } = fixture();
  const result = exchange.previewText(planText(plan => {
    plan.people.shift();
    plan.people.push({ id: 'new-person', label: 'New person', fundedMinutes: 0, rateCentsPerHour: null });
    plan.teams[0].personIds = plan.people.map(row => row.id);
    plan.work[0].personIds = plan.teams[0].personIds.slice();
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.view.preview.changes.people.added, ['new-person']);
  assert.deepEqual(result.view.preview.changes.people.removed, ['product-one']);
  assert.deepEqual(result.view.preview.changes.teams.changed, [{ id: 'delivery', fields: ['personIds'] }]);
  assert.deepEqual(result.view.preview.changes.work.changed, [{ id: 'review', fields: ['personIds'] }]);
  assert.equal(result.view.preview.projection.result.knownCommitmentCents, 90000);
  assert.equal(result.view.preview.projection.result.plannedCommitmentCents, null);
});

test('legacy preview carries truthful source version while accepted export remains current', () => {
  const { studio, exchange } = fixture();
  const legacy = createExamplePlan();
  delete legacy.purpose;
  legacy.schemaVersion = '0.1.0';
  const result = exchange.previewText(JSON.stringify(legacy));
  assert.equal(result.ok, true);
  assert.equal(result.view.preview.sourceSchemaVersion, '0.1.0');
  assert.equal(result.view.preview.projection.state.schemaVersion, '0.2.0');
  assert.equal(exchange.apply(result.view.preview.token).ok, true);
  assert.equal(JSON.parse(studio.exportText()).schemaVersion, '0.2.0');
});

test('preset preview uses the same explicit acceptance boundary', () => {
  const { studio, exchange } = fixture();
  const before = studio.read();
  const result = exchange.previewPreset('funded-working-sessions', VERSION);
  assert.equal(result.ok, true);
  assert.strictEqual(studio.read(), before);
  assert.equal(result.view.preview.source.kind, 'preset');
  assert.equal(result.view.preview.preset.version, VERSION);
  assert.equal(exchange.apply(result.view.preview.token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
  assert.equal(studio.read().result.additionalKnownCents, 0);
});

test('an accepted capture preserves exact exported text independently of drafts, previews and later changes', () => {
  const { studio, editing, exchange } = fixture();
  const captured = exchange.captureExport();
  assert.equal(Object.isFrozen(captured), true);
  assert.equal(captured.text, studio.exportText());
  editing.open(true);
  exchange.previewText(planText(plan => { plan.work[0].minutesPerOccurrence = 45; }));
  const next = createExamplePlan(); next.work[0].minutesPerOccurrence = 60;
  studio.replace(next, studio.read());
  assert.equal(JSON.parse(captured.text).work[0].minutesPerOccurrence, 30);
  assert.equal(captured.acceptance.sequence, 0);
  assert.notEqual(exchange.captureExport().text, captured.text);
});

test('active changed drafts require deliberate settlement and a fresh preview', () => {
  const { studio, editing, exchange } = fixture();
  editing.open(true);
  const before = studio.read();
  const prepared = exchange.previewPreset('funded-working-sessions', VERSION);
  expectHeld(exchange.apply(prepared.view.preview.token), 'draft-open');
  assert.strictEqual(studio.read(), before);
  assert.equal(editing.parks, 0);
  editing.cancel();
  expectHeld(exchange.apply(prepared.view.preview.token), 'stale-preview');
  const repeated = exchange.previewPreset('funded-working-sessions', VERSION);
  assert.equal(exchange.apply(repeated.view.preview.token).ok, true);
});

test('a clean active lease retires before replacement while parked edits remain available', () => {
  const { studio, editing, exchange } = fixture();
  editing.open(true); editing.park();
  const retained = editing.parked[0];
  editing.open(false);
  const before = studio.readAcceptance();
  const prepared = exchange.previewPreset('funded-working-sessions', VERSION);
  assert.equal(exchange.apply(prepared.view.preview.token).ok, true);
  assert.equal(editing.read().active, null);
  assert.equal(editing.parks, 2);
  assert.strictEqual(editing.parked[0], retained);
  assert.equal(retained.raw, '45');
  assert.notEqual(studio.readAcceptance().token, before.token);
});

test('acceptance ABA and equal-payload import keep old previews stale', () => {
  for (const change of [studio => {
    const plan = createExamplePlan(); plan.horizonWeeks = 8;
    studio.replace(plan, studio.read()); studio.undo(studio.read());
  }, studio => studio.importText(studio.exportText(), studio.read())]) {
    const { studio, exchange } = fixture();
    const initial = studio.exportText();
    const prepared = exchange.previewPreset('funded-working-sessions', VERSION);
    change(studio);
    assert.equal(studio.exportText(), initial);
    expectHeld(exchange.apply(prepared.view.preview.token), 'stale-preview');
  }
});

test('raw-edit intent changes invalidate previews while navigation parking preserves the binding', () => {
  const { editing, exchange } = fixture();
  editing.open(false);
  const prepared = exchange.previewPreset('funded-working-sessions', VERSION);
  editing.park();
  assert.equal(exchange.read().status, 'preview');
  editing.edit();
  assert.equal(exchange.read().status, 'stale');
  expectHeld(exchange.apply(prepared.view.preview.token), 'stale-preview');
});

test('rejected JSON stays bounded and local while accepted history and baseline remain available', () => {
  const { studio, exchange } = fixture();
  const before = studio.read();
  studio.setBaseline(before);
  const baseline = studio.readBaseline();
  expectHeld(exchange.previewText('{"broken":'), 'json');
  assert.equal(exchange.read().rejectedText, '{"broken":');
  assert.strictEqual(studio.read(), before);
  assert.strictEqual(studio.readBaseline(), baseline);
  assert.equal(studio.readHistory().undoCount, 0);
  expectHeld(exchange.previewText('🙂'.repeat(LIMITS.bytes)), 'bytes');
  const retained = exchange.read().rejectedText;
  assert.ok(encoder.encode(retained).byteLength <= LIMITS.bytes);
  assert.equal(retained.includes('\uFFFD'), false);
  exchange.clear();
  assert.equal(exchange.read().rejectedText, null);
});

test('file B supersedes A and a late A success cannot replace B’s preview', async () => {
  const reads = [];
  const { exchange } = fixture((_file, options) => { const read = deferred(); reads.push({ ...read, signal: options.signal }); return read.promise; });
  const first = exchange.selectFile(file());
  const second = exchange.selectFile(file());
  assert.equal(reads[0].signal.aborted, true);
  reads[1].resolve(encoder.encode(planText(plan => { plan.work[0].minutesPerOccurrence = 45; })));
  assert.equal((await second).ok, true);
  const token = exchange.read().preview.token;
  assert.equal(exchange.read().preview.projection.result.plannedCommitmentCents, 180000);
  reads[0].resolve(encoder.encode(planText()));
  expectHeld(await first, 'superseded');
  assert.equal(exchange.read().preview.token, token);
});

test('a superseded late error preserves the latest error and its bounded correction text', async () => {
  const reads = [];
  const { exchange } = fixture(() => { const read = deferred(); reads.push(read); return read.promise; });
  const first = exchange.selectFile(file());
  const second = exchange.selectFile(file());
  reads[1].resolve(encoder.encode('{"new":'));
  expectHeld(await second, 'json');
  reads[0].reject(new Error('arbitrary provider detail'));
  expectHeld(await first, 'superseded');
  assert.equal(exchange.read().error.code, 'json');
  assert.equal(exchange.read().rejectedText, '{"new":');
});

test('every invalid new file selection retires the old read before admission', async () => {
  for (const size of [-1, NaN, Infinity, LIMITS.bytes + 1, '12']) {
    const pending = deferred(); let calls = 0, signal;
    const { exchange } = fixture((_file, options) => { calls++; signal = options.signal; return pending.promise; });
    const first = exchange.selectFile(file());
    expectHeld(await exchange.selectFile({ size }), 'bytes');
    assert.equal(calls, 1);
    assert.equal(signal.aborted, true);
    pending.resolve(encoder.encode(planText()));
    expectHeld(await first, 'superseded');
    assert.equal(exchange.read().error.code, 'bytes');
    assert.equal(exchange.read().preview, null);
  }
});

test('actual bytes and fatal UTF-8 decoding form a second file boundary', async () => {
  for (const [bytes, code] of [
    [new Uint8Array(LIMITS.bytes + 1), 'bytes'],
    [new Uint8Array([0xc3, 0x28]), 'utf8'],
    ['a decoded string supplied as bytes', 'file-read'],
  ]) {
    const { studio, exchange } = fixture(async () => bytes);
    const before = studio.read();
    expectHeld(await exchange.selectFile({ size: 1 }), code);
    assert.strictEqual(studio.read(), before);
    assert.equal(exchange.read().rejectedText, null);
  }
  const { exchange } = fixture(async () => encoder.encode(planText()).buffer);
  assert.equal((await exchange.selectFile(file())).ok, true);
});

test('new raw edits or accepted events invalidate delayed success and delayed error', async () => {
  for (const mutate of [({ editing }) => editing.edit(), ({ studio }) => studio.importText(studio.exportText(), studio.read())]) {
    for (const outcome of ['success', 'error']) {
      const pending = deferred();
      const context = fixture(() => pending.promise);
      const task = context.exchange.selectFile(file());
      mutate(context);
      const acceptance = context.studio.readAcceptance();
      if (outcome === 'success') pending.resolve(encoder.encode(planText()));
      else pending.reject(new Error('late provider detail'));
      expectHeld(await task, 'stale-preview');
      assert.equal(context.exchange.read().preview, null);
      assert.equal(context.exchange.read().rejectedText, null);
      assert.equal(context.exchange.read().status, 'stale');
      assert.strictEqual(context.studio.readAcceptance(), acceptance);
    }
  }
});

test('disposal aborts the pending reader and releases recovery state before late completion', async () => {
  const pending = deferred(); let signal;
  const { exchange, studio } = fixture((_file, options) => { signal = options.signal; return pending.promise; });
  const original = studio.read();
  const task = exchange.selectFile(file());
  exchange.dispose();
  assert.equal(signal.aborted, true);
  pending.reject(new Error('late error'));
  expectHeld(await task, 'disposed');
  assert.deepEqual(exchange.read(), { status: 'disposed', pending: false, preview: null, error: null, rejectedText: null });
  assert.strictEqual(studio.read(), original);
  expectHeld(exchange.previewText(planText()), 'disposed');
});

test('a reader that starts a newer request during acquisition retires its own result', async () => {
  let exchange, signal;
  const context = fixture((_file, options) => {
    signal = options.signal;
    exchange.previewPreset('funded-working-sessions', VERSION);
    return Promise.resolve(encoder.encode(planText()));
  });
  exchange = context.exchange;
  expectHeld(await exchange.selectFile(file()), 'superseded');
  assert.equal(signal.aborted, true);
  assert.equal(exchange.read().preview.preset.id, 'funded-working-sessions');
});

test('an abort listener can start a newer preview without an outer request overwriting it', async () => {
  const pending = deferred();
  let exchange;
  const context = fixture((_file, { signal }) => {
    signal.addEventListener('abort', () => exchange.previewPreset('funded-working-sessions', VERSION));
    return pending.promise;
  });
  exchange = context.exchange;
  const first = exchange.selectFile(file());
  expectHeld(exchange.previewText(planText()), 'superseded');
  assert.equal(exchange.read().preview.preset.id, 'funded-working-sessions');
  pending.resolve(encoder.encode(planText()));
  expectHeld(await first, 'superseded');
});

test('one Studio retains one exchange owner, with remount after disposal', () => {
  const { studio, editing, exchange } = fixture();
  assert.strictEqual(createPlanExchange(studio, editing), exchange);
  assert.throws(() => createPlanExchange(studio, editingFixture()), TypeError);
  exchange.dispose();
  assert.notStrictEqual(createPlanExchange(studio, editing), exchange);
});

class Reader extends EventTarget {
  constructor() { super(); this.handlers = new Set(); this.aborts = 0; this.reads = 0; this.result = null; }
  addEventListener(type, fn, options) { this.handlers.add(fn); super.addEventListener(type, fn, options); }
  removeEventListener(type, fn, options) { this.handlers.delete(fn); super.removeEventListener(type, fn, options); }
  readAsArrayBuffer() { this.reads++; }
  abort() { this.aborts++; this.dispatchEvent(new Event('abort')); }
  load(bytes) { this.result = bytes; this.dispatchEvent(new Event('load')); }
}

test('FileReader adapter removes handlers after success and aborts exactly once during cancellation', async () => {
  const controller = new AbortController(), reader = new Reader();
  const task = readFileBytes(file(), { signal: controller.signal, createReader: () => reader });
  const bytes = encoder.encode(planText()).buffer;
  reader.load(bytes);
  assert.strictEqual(await task, bytes);
  assert.equal(reader.handlers.size, 0);
  controller.abort();
  assert.equal(reader.aborts, 0);

  const cancelled = new AbortController(), second = new Reader();
  const rejected = readFileBytes(file(), { signal: cancelled.signal, createReader: () => second });
  cancelled.abort();
  await assert.rejects(rejected, error => error.code === 'aborted');
  assert.equal(second.aborts, 1);
  assert.equal(second.handlers.size, 0);
  second.load(bytes);
  assert.equal(second.handlers.size, 0);
});

test('FileReader adapter handles provider errors, pre-abort and an abort during reader creation', async () => {
  const reader = new Reader();
  const failed = readFileBytes(file(), { createReader: () => reader });
  reader.dispatchEvent(new Event('error'));
  await assert.rejects(failed, error => error.code === 'file-read');
  assert.equal(reader.handlers.size, 0);

  const pre = new AbortController(); pre.abort();
  let created = 0;
  await assert.rejects(readFileBytes(file(), { signal: pre.signal, createReader: () => { created++; return new Reader(); } }), error => error.code === 'aborted');
  assert.equal(created, 0);

  const during = new AbortController(), retired = new Reader();
  await assert.rejects(readFileBytes(file(), { signal: during.signal, createReader: () => { during.abort(); return retired; } }), error => error.code === 'aborted');
  assert.equal(retired.reads, 0);
  assert.equal(retired.aborts, 1);
  assert.equal(retired.handlers.size, 0);
});


test('actual work and person drafts survive replacement as stale raw records with their original targets', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio);
  const exchange = createPlanExchange(studio, editing);
  const work = editing.work.begin('review', studio.read()).view.draft;
  editing.work.setText(work.token, 'minutesPerSession', '45');
  editing.park();
  const person = editing.person.begin('product-one', studio.read()).view.draft;
  editing.person.setText(person.token, 'ratePerHour', '105');
  const preview = exchange.previewPreset('funded-working-sessions', VERSION).view.preview;
  expectHeld(exchange.apply(preview.token), 'draft-open');
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
  editing.park(); // Navigation preserves intent and retains the raw person edit.
  assert.equal(exchange.apply(preview.token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
  const saved = editing.read().parked;
  assert.deepEqual(saved.map(row => [row.kind, row.targetId, row.status]), [
    ['work', 'review', 'stale'], ['person', 'product-one', 'stale'],
  ]);
  assert.equal(saved[0].raw.minutesPerSession, '45');
  assert.equal(saved[1].raw.ratePerHour, '105');
  const reviewed = editing.work.review(saved[0].token, studio.read());
  assert.equal(reviewed.ok, true);
  assert.equal(editing.work.preview(reviewed.view.draft.token).ok, true);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
  assert.equal(studio.readAcceptance().sequence, 1);
});

test('actual changed and invalid person inputs block replacement, and clean person lease retires', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio);
  const exchange = createPlanExchange(studio, editing);
  const initial = studio.read();
  const draft = editing.person.begin('product-one', initial).view.draft;
  editing.person.setText(draft.token, 'ratePerHour', '-1');
  const first = exchange.previewText(initial.serialized).view.preview;
  expectHeld(exchange.apply(first.token), 'draft-open');
  assert.equal(editing.person.read().draft.raw.ratePerHour, '-1');
  editing.person.cancel(draft.token);
  expectHeld(exchange.apply(first.token), 'stale-preview');
  editing.person.begin('product-two', studio.read());
  const clean = exchange.previewText(initial.serialized).view.preview;
  assert.equal(exchange.apply(clean.token).ok, true);
  assert.equal(editing.read().active, null);
  assert.equal(editing.read().parked.length, 0);
  assert.equal(studio.readAcceptance().sequence, 1);
});

test('actual raw edits invalidate delayed file completion while changed acceptance remains untouched', async () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio), pending = deferred();
  const exchange = createPlanExchange(studio, editing, { readFile: () => pending.promise });
  const draft = editing.work.begin('review', studio.read()).view.draft;
  const task = exchange.selectFile(file());
  editing.work.setText(draft.token, 'minutesPerSession', '45');
  pending.resolve(encoder.encode(planText()));
  expectHeld(await task, 'stale-preview');
  assert.equal(editing.work.read().draft.raw.minutesPerSession, '45');
  assert.equal(studio.readAcceptance().sequence, 0);
  assert.equal(studio.readHistory().undoCount, 0);
});

test('actual purpose edits require settlement and retain all six raw fields through replacement', () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio);
  const exchange = createPlanExchange(studio, editing);
  const draft = editing.purpose.begin('purpose', studio.read()).view.draft;
  editing.purpose.setText(draft.token, 'changedAbility', '  Review the investment  ');
  editing.purpose.setText(draft.token, 'openConditions', 'Choose a review date');
  const preview = exchange.previewPreset('funded-working-sessions', VERSION).view.preview;
  expectHeld(exchange.apply(preview.token), 'draft-open');
  assert.equal(studio.read().state.purpose.changedAbility, null);
  editing.park();
  assert.equal(exchange.apply(preview.token).ok, true);
  const saved = editing.read().parked[0];
  assert.equal(saved.kind, 'purpose');
  assert.equal(saved.targetId, 'purpose');
  assert.equal(saved.status, 'stale');
  assert.equal(saved.raw.changedAbility, '  Review the investment  ');
  assert.equal(saved.raw.openConditions, 'Choose a review date');
  assert.equal(Object.keys(saved.raw).length, 6);
  assert.equal(studio.read().result.plannedCommitmentCents, 120000);
});

test('actual purpose raw edits invalidate an in-flight file without accepting its content', async () => {
  const studio = createStudio(), editing = createDraftCoordinator(studio), pending = deferred();
  const exchange = createPlanExchange(studio, editing, { readFile: () => pending.promise });
  const draft = editing.purpose.begin('purpose', studio.read()).view.draft;
  const task = exchange.selectFile(file());
  editing.purpose.setText(draft.token, 'accountableOwner', 'Delivery lead');
  pending.resolve(encoder.encode(planText()));
  expectHeld(await task, 'stale-preview');
  assert.equal(editing.purpose.read().draft.raw.accountableOwner, 'Delivery lead');
  assert.equal(studio.readAcceptance().sequence, 0);
  assert.equal(studio.read().state.purpose.accountableOwner, null);
});


test('reentrant abort during listener acquisition leaves zero handlers and one reader cancellation', async () => {
  for (const abortBeforeRegistration of [false, true]) {
    const controller = new AbortController();
    class AcquiringReader extends Reader {
      addEventListener(type, listener, options) {
        if (type === 'load' && abortBeforeRegistration) controller.abort();
        super.addEventListener(type, listener, options);
        if (type === 'load' && !abortBeforeRegistration) controller.abort();
      }
    }
    const reader = new AcquiringReader();
    await assert.rejects(readFileBytes(file(), { signal: controller.signal, createReader: () => reader }), error => error.code === 'aborted');
    assert.equal(reader.handlers.size, 0);
    assert.equal(reader.aborts, 1);
    assert.equal(reader.reads, 0);
  }
});
