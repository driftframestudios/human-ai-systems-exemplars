import assert from 'node:assert/strict';
import { templateFixture, templateRequest } from './fixtures.mjs';
export { stats } from '../native-studio-edit-cost/core.mjs';
export const SOURCE_TRACES = Object.freeze(['prepare', 'connection', 'template']);
// Timers bracket complete named public operations. Internal calculation,
// admission and serialization remain one source-owned operation.
export function createSourceTrace({ fixture, trace, source, now = () => performance.now() }) {
  assert.ok(SOURCE_TRACES.includes(trace));
  const input = trace === 'template' ? templateFixture(fixture) : fixture;
  const studio = source.createStudio(input.plan), base = studio.read();
  const measurements = [], outcomes = [], produced = [];
  const calls = { preview: 0, apply: 0, replace: 0, undo: 0, transitions: 0 };
  const facade = { ...studio };
  for (const [name, counter] of [['previewCommand', 'preview'], ['applyCommand', 'apply'], ['replace', 'replace'], ['undo', 'undo']]) {
    facade[name] = (...args) => {
      calls[counter]++; const before = studio.read(), result = studio[name](...args);
      if (result.ok && result.projection) produced.push(result.projection.serialized);
      if (studio.read() !== before) calls.transitions++;
      return result;
    };
  }
  const editing = trace === 'connection' ? source.createDraftCoordinator(facade) : null;
  const target = trace === 'connection' ? source.makeConnectionTarget('connection.update', input.targetId) : null;
  const request = trace === 'template' ? templateRequest(input, true) : null;
  let executed = false, preview = null, rawToken = null, accepted = null;
  const phase = (name, operation) => {
    const start = now(); let result;
    try { result = operation(); return result; }
    finally { measurements.push({ phase: name, processingMs: now() - start }); }
  };
  return {
    execute() {
      assert.equal(executed, false); executed = true;
      if (trace === 'prepare') {
        preview = phase('prepare', () => source.preparePlan(input.plan)); produced.push(preview.serialized); return;
      }
      if (trace === 'template') {
        preview = phase('template-prepare', () => source.prepareCoordinationTemplate(base, request));
        produced.push(preview.projection.serialized);
        outcomes.push(phase('template-apply', () => source.applyCoordinationTemplate(facade, preview)));
      } else {
        const open = phase('open', () => editing.connection.begin(target, base));
        outcomes.push(open); rawToken = open.view.draft.token;
        outcomes.push(phase('raw', () => editing.connection.setText(rawToken, 'responseExpectation', 'Measured next step')));
        outcomes.push(phase('preview', () => editing.connection.preview(rawToken)));
        outcomes.push(phase('cached-preview', () => editing.connection.preview(rawToken)));
        assert.strictEqual(studio.read(), base);
        outcomes.push(phase('apply', () => editing.connection.apply(rawToken)));
      }
      accepted = studio.read();
      outcomes.push(phase('undo', () => facade.undo(studio.read())));
    },
    verify() {
      assert.equal(executed, true);
      assert.ok(outcomes.every(result => result.ok), JSON.stringify(outcomes.find(result => !result.ok)?.error));
      assert.equal(studio.read().result.knownCommitmentCents, input.expected.commitmentCents);
      assert.equal(studio.read().result.allocatedKnownCents, input.expected.allocatedCents);
      assert.deepEqual({ ...studio.read().state, revision: base.state.revision }, base.state);
      if (trace === 'prepare') {
        assert.equal(preview.result.knownCommitmentCents, input.expected.commitmentCents);
        assert.equal(preview.result.allocatedKnownCents, input.expected.allocatedCents);
        assert.deepEqual(preview.state, input.plan);
      }
      else {
        assert.notStrictEqual(studio.read(), base);
        assert.equal(accepted.result.knownCommitmentCents, trace === 'template' ? input.expected.recoveryCents : input.expected.commitmentCents);
        assert.equal(accepted.result.allocatedKnownCents, input.expected.allocatedCents);
        assert.equal(calls.transitions, 2); assert.equal(calls.undo, 1);
        if (trace === 'template') {
          assert.equal(preview.projection.result.knownCommitmentCents, input.expected.recoveryCents); assert.equal(calls.replace, 1);
          const recoveryId = 'measured-arrangement-recovery-handoff';
          const expected = { ...base.state, revision: base.state.revision + 1,
            work: [...base.state.work, { id: recoveryId, ...request.connections[0].recoveryWork }],
            connections: [...base.state.connections, ...request.connections.map((row, index) => ({
              id: `measured-arrangement-connection-${row.slotId}`,
              senderTeamId: base.state.teams[index].id, receiverTeamId: base.state.teams[1 - index].id,
              receiverPersonId: base.state.people[0].id, sharedObject: 'Review the shared decision', responseExpectation: null,
              workIds: [base.state.work[0].id, ...(index === 0 ? [recoveryId] : [])], status: 'active' }))] };
          assert.deepEqual(accepted.state, expected);
        } else {
          assert.equal(calls.preview, 1); assert.equal(calls.apply, 1); assert.equal(editing.read().active, null);
          assert.deepEqual(accepted.state, { ...base.state, revision: base.state.revision + 1,
            connections: base.state.connections.map(row => row.id === input.targetId ? { ...row, responseExpectation: 'Measured next step' } : row) });
        }
      }
      return { fixture: input.id, phases: measurements.map(row => ({ ...row })), calls: { ...calls },
        producedUtf8Bytes: produced.reduce((total, text) => total + new TextEncoder().encode(text).byteLength, 0) };
    },
    dispose() { editing?.dispose(); },
  };
}
