import '../../tools/node-runtime-admission.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasReturnDraft, isReturnRouteRetained, returnRoutePrefixLength, resolveScoreDestination } from '../../collaboration/native-investment-studio/navigation-policy.mjs';

const rows = (...ids) => Object.freeze(ids.map(id => Object.freeze({ id })));
const state = Object.freeze({ people: rows('reviewer'), teams: rows('receiving-team'), work: rows('review'), connections: rows('handoff') });
const emptyDrafts = Object.freeze({ active: null, parked: Object.freeze([]) });
const parked = (kind, targetId) => Object.freeze({ active: null, parked: Object.freeze([Object.freeze({ kind, targetId })]) });
const routeList = (...routes) => Object.freeze(routes.map(route => Object.freeze(route)));

test('held return routes follow the exact active or saved draft, including an unaccepted creation', () => {
  const route = Object.freeze({ kind: 'assembly', target: 'team.create:new-team', held: true });
  const descriptor = Object.freeze({ mode: 'create', collection: 'teams', id: 'new-team' });
  const active = Object.freeze({ active: Object.freeze({ kind: 'assembly', targetId: route.target }), parked: Object.freeze([]) });
  assert.equal(hasReturnDraft(route, active), true);
  assert.equal(isReturnRouteRetained(route, active, state, descriptor), true);
  assert.equal(isReturnRouteRetained(route, parked('assembly', route.target), state, descriptor), true);
  assert.equal(isReturnRouteRetained(route, parked('session', route.target), state, descriptor), false, 'another editor cannot retain this origin');
  assert.equal(isReturnRouteRetained(route, parked('assembly', 'team.create:other-team'), state, descriptor), false);
  assert.equal(isReturnRouteRetained(route, emptyDrafts, state, descriptor), false, 'discard releases a held creation even though its form is still valid');
});

test('unheld record routes require the accepted target while saved recovery and new forms retain their owners', () => {
  const route = Object.freeze({ kind: 'session', target: 'work.update:review', held: false });
  const descriptor = Object.freeze({ mode: 'update', collection: 'work', id: 'review' });
  const removed = Object.freeze({ ...state, work: rows() });
  assert.equal(isReturnRouteRetained(route, emptyDrafts, state, descriptor), true);
  assert.equal(isReturnRouteRetained(route, emptyDrafts, removed, descriptor), false);
  assert.equal(isReturnRouteRetained({ ...route, held: true }, parked('session', route.target), removed, descriptor), true, 'saved removed entries still have an explicit recovery owner');
  assert.equal(isReturnRouteRetained({ ...route, held: true }, emptyDrafts, state, descriptor), false, 'an accepted record does not replace a discarded held draft');
  assert.equal(isReturnRouteRetained({ kind: 'session', target: 'work.create:new-work', held: false }, emptyDrafts, removed,
    { mode: 'create', collection: 'work', id: 'new-work' }), true);
  assert.equal(isReturnRouteRetained({ kind: 'template', held: false }, emptyDrafts, removed), true, 'the template receiver owns its entries outside the coordinator');
});

test('People support returns require their actual person or team even when a related draft remains', () => {
  const personRoute = Object.freeze({ kind: 'peopleSupportView', target: 'person/reviewer', ownerKind: 'person', ownerId: 'reviewer', held: false });
  const teamRoute = Object.freeze({ ...personRoute, target: 'team/receiving-team', ownerKind: 'team', ownerId: 'receiving-team' });
  assert.equal(isReturnRouteRetained(personRoute, emptyDrafts, state), true);
  assert.equal(isReturnRouteRetained(teamRoute, emptyDrafts, state), true);
  assert.equal(isReturnRouteRetained(personRoute, parked('person', 'reviewer'), { ...state, people: rows() }), false);
  assert.equal(isReturnRouteRetained(teamRoute, emptyDrafts, { ...state, teams: rows(), people: rows('receiving-team') }), false, 'a matching ID in People is not the team owner');
});

test('restarting an origin retires the first occurrence and descendants without changing route objects', () => {
  const routes = routeList(
    { kind: 'session', target: 'work.create:first', creating: 'team', creationTarget: 'team.create:new-team' },
    { kind: 'assembly', target: 'team.create:new-team', creating: 'person', creationTarget: 'person.create:reviewer' },
    { kind: 'assembly', target: 'person.create:reviewer' },
    { kind: 'assembly', target: 'team.create:new-team' },
  );
  const prefix = returnRoutePrefixLength(routes, 'assembly', 'team.create:new-team');
  assert.equal(prefix, 1, 'first repeated origin wins over both a matching parent and later duplicate');
  const retained = routes.slice(0, prefix);
  assert.strictEqual(retained[0], routes[0]);
  assert.equal(routes.length, 4, 'the caller retains mutation ownership');
});

test('a new detour keeps the nearest matching parent and drops unrelated later routes', () => {
  const routes = routeList(
    { kind: 'session', target: 'work.create:first', creating: 'team', creationTarget: 'team.create:shared' },
    { kind: 'change', target: 'change' },
    { kind: 'connection', target: 'connection.update:handoff', creating: 'team', creationTarget: 'team.create:shared' },
    { kind: 'investmentView', target: 'investment' },
  );
  assert.equal(returnRoutePrefixLength(routes, 'assembly', 'team.create:shared'), 3);
  assert.equal(returnRoutePrefixLength(routes, 'assembly', 'team.create:unrelated'), 0);
  assert.equal(routes[3].kind, 'investmentView', 'selection leaves the existing stack untouched');
});

test('accepted creation ancestry matches both collection and ID, with explicit team-membership continuation', () => {
  const routes = routeList({ kind: 'connection', target: 'connection.update:handoff', creating: 'person',
    creationTarget: 'person.create:reviewer', createdId: 'reviewer', continuationTarget: 'team.update:receiving-team' });
  assert.equal(returnRoutePrefixLength(routes, 'assembly', 'person.remove:reviewer', { collection: 'people', id: 'reviewer' }), 1);
  assert.equal(returnRoutePrefixLength(routes, 'assembly', 'team.update:reviewer', { collection: 'teams', id: 'reviewer' }), 0);
  assert.equal(returnRoutePrefixLength(routes, 'assembly', 'team.update:receiving-team', { collection: 'teams', id: 'receiving-team' }), 1);
  const sessionRoutes = routeList({ kind: 'assurance', target: 'assurance', creating: 'session', createdId: 'review' });
  assert.equal(returnRoutePrefixLength(sessionRoutes, 'session', 'work.update:review', { collection: 'work', id: 'review' }), 1);
});

test('a supporting-session detour retains the People return while an unrelated chapter does not', () => {
  const routes = routeList({ kind: 'peopleSupportView', target: 'person/reviewer', ownerKind: 'person', ownerId: 'reviewer' });
  assert.equal(returnRoutePrefixLength(routes, 'assurance', 'assurance'), 1);
  assert.equal(returnRoutePrefixLength(routes, 'change', 'change'), 0);
});

test('Score resolves only its offered current record and chapter destinations into detached values', () => {
  const target = { kind: 'work', id: 'review' };
  const destination = resolveScoreDestination(target, state);
  assert.deepEqual(destination, { kind: 'work', id: 'review', chapter: 'coordination' });
  assert.equal(Object.isFrozen(destination), true);
  target.id = 'other';
  assert.equal(destination.id, 'review');
  assert.deepEqual(resolveScoreDestination({ kind: 'person', id: 'reviewer' }, state), { kind: 'person', id: 'reviewer', chapter: 'people' });
  assert.deepEqual(resolveScoreDestination({ kind: 'connection', id: 'handoff' }, state), { kind: 'connection', id: 'handoff', chapter: 'coordination' });
  for (const id of ['change', 'assurance', 'investment']) {
    assert.deepEqual(resolveScoreDestination({ kind: 'chapter', id }, state), { kind: 'chapter', id, chapter: id });
  }
});

test('unsupported Score destinations and removed or wrong-collection records have no receiving route', () => {
  assert.equal(resolveScoreDestination({ kind: 'gate', id: 'review' }, state), null, 'local gate inspection is not onward navigation');
  assert.equal(resolveScoreDestination({ kind: 'chapter', id: 'people' }, state), null, 'only the offered onward chapters are admitted');
  assert.equal(resolveScoreDestination({ kind: 'work', id: 'removed' }, state), null);
  assert.equal(resolveScoreDestination({ kind: 'person', id: 'review' }, state), null, 'a work ID does not identify a person');
  assert.equal(resolveScoreDestination({ kind: 'constructor', id: 'review' }, state), null);
  assert.equal(resolveScoreDestination(null, state), null);
  assert.equal(resolveScoreDestination({ kind: 'work' }, state), null);
});
