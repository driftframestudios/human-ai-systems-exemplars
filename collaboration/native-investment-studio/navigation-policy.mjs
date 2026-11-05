const SCORE_RECORDS = Object.freeze({
  work: Object.freeze({ collection: 'work', chapter: 'coordination' }),
  person: Object.freeze({ collection: 'people', chapter: 'people' }),
  connection: Object.freeze({ collection: 'connections', chapter: 'coordination' }),
});
const SCORE_CHAPTERS = new Set(['change', 'assurance', 'investment']);

export function hasReturnDraft(route, drafts) {
  if (drafts.active?.kind === route.kind && drafts.active.targetId === route.target) return true;
  return drafts.parked.some(record => record.kind === route.kind && record.targetId === route.target);
}

export function isReturnRouteRetained(route, drafts, state, descriptor = null) {
  if (route.kind === 'peopleSupportView') {
    const owners = state[route.ownerKind === 'person' ? 'people' : 'teams'];
    if (!owners.some(row => row.id === route.ownerId)) return false;
  }
  // Held entries survive through their draft identity, including a new record
  // that has not been accepted or an older record that needs explicit recovery.
  if (route.held) return hasReturnDraft(route, drafts);
  if (!descriptor || descriptor.mode === 'create') return true;
  return state[descriptor.collection].some(row => row.id === descriptor.id);
}

function isReturnParent(route, kind, target, descriptor) {
  if (route.kind === 'peopleSupportView' && kind === 'assurance' && target === 'assurance') return true;
  if (kind === 'assembly' && route.continuationTarget === target) return true;
  const destinationKind = route.creating === 'session' ? 'session' : 'assembly';
  if (destinationKind !== kind) return false;
  if (route.creationTarget === target) return true;
  if (!route.createdId || descriptor?.id !== route.createdId) return false;
  const collection = route.creating === 'person' ? 'people' : route.creating === 'team' ? 'teams' : 'work';
  return descriptor.collection === collection;
}

// The caller keeps the same ordered array and route objects. A repeated origin
// retires itself and its descendants; otherwise the nearest parent survives.
export function returnRoutePrefixLength(routes, kind, target, descriptor = null) {
  const repeated = routes.findIndex(route => route.kind === kind && route.target === target);
  if (repeated >= 0) return repeated;
  return routes.findLastIndex(route => isReturnParent(route, kind, target, descriptor)) + 1;
}

export function resolveScoreDestination(target, state) {
  if (!target || typeof target.id !== 'string') return null;
  const { kind, id } = target;
  if (kind === 'chapter') return SCORE_CHAPTERS.has(id) ? Object.freeze({ kind, id, chapter: id }) : null;
  if (!Object.hasOwn(SCORE_RECORDS, kind)) return null;
  const { collection, chapter } = SCORE_RECORDS[kind];
  if (!state[collection].some(row => row.id === id)) return null;
  return Object.freeze({ kind, id, chapter });
}
