import { describeAssemblyTarget, describeConnectionTarget, describeSessionTarget } from './command-draft.mjs';

import { nextCreatedLabel } from './creation-label.mjs';
import { prepareSessionCreation } from './session-creation.mjs';

const OWNERS = Object.freeze({
  session: Object.freeze({ kind: 'session', form: 'work.create', target: 'sessionId', describe: describeSessionTarget }),
  person: Object.freeze({ kind: 'assembly', form: 'person.create', target: 'assemblyId', describe: describeAssemblyTarget }),
  team: Object.freeze({ kind: 'assembly', form: 'team.create', target: 'assemblyId', describe: describeAssemblyTarget }),
  connection: Object.freeze({ kind: 'connection', form: 'connection.create', target: 'connectionId', describe: describeConnectionTarget }),
});
const failure = (code, message) => ({ ok: false, accepted: false, error: { code, path: 'rack', message } });

function startingValues(state, kind, context) {
  if (kind === 'session') {
    const prepared = prepareSessionCreation(state, context);
    return prepared.ok ? prepared : failure('reference', 'Add a person and team to start this session.');
  }
  if (kind === 'person') return { ok: true, raw: { label: nextCreatedLabel(state.people, 'person'), ratePerHour: '100', fundedHours: '4', fundedMinutes: '0' } };
  if (kind === 'team') return { ok: true, raw: { label: nextCreatedLabel(state.teams, 'team'), personIds: [] } };
  const teams = state.teams.filter(team => team.lifecycle !== 'retired');
  const byId = new Map(teams.map(team => [team.id, team]));
  for (const field of ['senderTeamId', 'receiverTeamId']) {
    if (context[field] != null && !byId.has(context[field]))
      return failure('reference', 'Choose a team in the current arrangement.');
  }
  const sender = context.senderTeamId ? byId.get(context.senderTeamId) : teams[0];
  const receiver = context.receiverTeamId ? byId.get(context.receiverTeamId) : teams.find(team => team.id !== sender?.id);
  if (!sender || !receiver) return failure('reference', 'Add another team before creating a handoff.');
  if (sender.id === receiver.id) return failure('reference', 'Choose another receiving team for this handoff.');
  return { ok: true, raw: { senderTeamId: sender.id, receiverTeamId: receiver.id,
    receiverPersonId: receiver.personIds[0] ?? '', sharedObject: nextCreatedLabel(state.connections, 'handoff', 'sharedObject'),
    responseExpectation: 'Confirm what is ready and name the next step.', workIds: [], status: 'active' } };
}

// Direct rack additions use the same ID allocation, saved edits and acceptance
// history as the full forms. Callers render the accepted record; selecting it opens its editor.
export function createRackRecord(studio, editing, kind, context = {}) {
  if (!Object.hasOwn(OWNERS, kind)) return failure('target', 'Choose a person, team, session or handoff to add.');
  const owner = OWNERS[kind];
  const base = studio.read(), prepared = startingValues(base.state, kind, context);
  if (!prepared.ok) return prepared;
  const editor = editing[owner.kind];
  let result = editor.create(owner.form, base);
  if (!result.ok) return { ...result, accepted: false };
  const draft = result.view.draft, token = draft.token;
  const id = owner.describe(draft[owner.target]).id;
  const owns = () => studio.read() === base && editing.read().active?.kind === owner.kind
    && editing.read().active?.token === token;
  const superseded = () => failure('superseded', 'Continue with the current edit.');
  for (const [field, value] of Object.entries(prepared.raw)) {
    if (!owns()) return superseded();
    result = editor[Array.isArray(value) ? 'setIds' : 'setText'](token, field, value);
    if (!result.ok) return { ...result, accepted: false };
  }
  if (!owns()) return superseded();
  result = editor.apply(token);
  if (!result.ok) return { ...result, accepted: false };
  return { ok: true, accepted: true, id, projection: result.projection };
}
