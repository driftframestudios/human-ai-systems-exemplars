import { describeAssemblyTarget, describeConnectionTarget } from './command-draft.mjs';

const OWNERS = Object.freeze({
  team: Object.freeze({ kind: 'assembly', form: 'team.create', target: 'assemblyId', describe: describeAssemblyTarget }),
  connection: Object.freeze({ kind: 'connection', form: 'connection.create', target: 'connectionId', describe: describeConnectionTarget }),
});
const failure = (code, message) => ({ ok: false, accepted: false, error: { code, path: 'rack', message } });

function startingValues(state, kind, context) {
  if (kind === 'team') return { ok: true, raw: { label: 'New team', personIds: [] } };
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
    receiverPersonId: receiver.personIds[0] ?? '', sharedObject: 'Share the next step',
    responseExpectation: '', workIds: [], status: 'active' } };
}

// Direct rack additions use the same ID allocation, saved edits and acceptance
// history as the full forms. Callers open the accepted record after this receipt.
export function createRackRecord(studio, editing, kind, context = {}) {
  if (!Object.hasOwn(OWNERS, kind)) return failure('target', 'Choose a team or handoff to add.');
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
