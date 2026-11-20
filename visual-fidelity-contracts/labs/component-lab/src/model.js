/**
 * Accepted-state owner for the component lab.
 *
 * Candidate fixtures and asynchronous results cross one admission boundary.
 * A rejected or late candidate returns the prior state object, keeping partial
 * candidate data outside the visible model.
 */

export const REQUEST_STANDINGS = Object.freeze(['idle', 'pending', 'succeeded', 'failed']);
export const DATA_STANDINGS = Object.freeze(['absent', 'partial', 'current', 'stale']);
export const AUTHORIZATION_STANDINGS = Object.freeze(['unknown', 'allowed', 'held', 'denied']);
export const VALIDATION_STANDINGS = Object.freeze(['untouched', 'valid', 'issue', 'server-reconciled']);
export const RECEIPT_STANDINGS = Object.freeze(['absent', 'provisional', 'accepted', 'rejected']);
export const DISCLOSURE_STANDINGS = Object.freeze(['compact', 'expanded']);
export const OWNERSHIP_STANDINGS = Object.freeze(['active', 'released']);

const FIXTURE_KEYS = Object.freeze(['schemaVersion', 'componentLabId', 'revision', 'lineage', 'catalog']);
const LINEAGE_KEYS = Object.freeze(['source', 'parentRevision']);
const ITEM_KEYS = Object.freeze(['sku', 'label', 'unitPriceCents', 'stock']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

// JSON Schema maxLength counts Unicode code points. Use the same unit at the
// runtime boundary so astral-script characters and emoji keep one contract.
const codePointLength = value => Array.from(value).length;

function plainRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be a record.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must use a plain record.`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const keys = Object.keys(plainRecord(value, label)).sort();
  const required = [...expected].sort();
  if (keys.length !== required.length || keys.some((key, index) => key !== required[index])) {
    throw new TypeError(`${label} must contain exactly: ${required.join(', ')}.`);
  }
}

function ownString(value, key, label, { nullable = false } = {}) {
  if (!Object.hasOwn(value, key)) throw new TypeError(`${label}.${key} must be owned by the record.`);
  if (nullable && value[key] === null) return null;
  if (typeof value[key] !== 'string' || value[key].trim() === '') {
    throw new TypeError(`${label}.${key} must be a non-empty string.`);
  }
  return value[key];
}

function contractString(value, key, label, { nullable = false, maximum = 120, pattern = null } = {}) {
  const supplied = ownString(value, key, label, { nullable });
  if (supplied === null) return null;
  if (codePointLength(supplied) > maximum || (pattern && !pattern.test(supplied))) {
    throw new TypeError(`${label}.${key} must match its public string contract.`);
  }
  return supplied;
}

function boundedInteger(value, key, label, minimum, maximum) {
  if (!Object.hasOwn(value, key) || !Number.isInteger(value[key]) || value[key] < minimum || value[key] > maximum) {
    throw new TypeError(`${label}.${key} must be an integer from ${minimum} through ${maximum}.`);
  }
  return value[key];
}

function freezeTree(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

function copyLineage(lineage) {
  exactKeys(lineage, LINEAGE_KEYS, 'lineage');
  return {
    source: contractString(lineage, 'source', 'lineage'),
    parentRevision: contractString(lineage, 'parentRevision', 'lineage', { nullable: true, maximum: 64, pattern: /^[a-z0-9][a-z0-9._-]*$/u }),
  };
}

function copyCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length === 0 || catalog.length > 24) {
    throw new TypeError('catalog must contain from 1 through 24 items.');
  }
  const seen = new Set();
  return catalog.map((supplied, index) => {
    const label = `catalog[${index}]`;
    exactKeys(supplied, ITEM_KEYS, label);
    const sku = ownString(supplied, 'sku', label);
    if (!/^[a-z0-9][a-z0-9-]{2,31}$/u.test(sku) || seen.has(sku)) {
      throw new TypeError(`${label}.sku must be unique lowercase kebab case.`);
    }
    seen.add(sku);
    return {
      sku,
      label: contractString(supplied, 'label', label),
      unitPriceCents: boundedInteger(supplied, 'unitPriceCents', label, 1, 1_000_000),
      stock: boundedInteger(supplied, 'stock', label, 0, 100_000),
    };
  });
}

/** Admit and detach a fixture before it can become accepted component state. */
export function admitComponentFixture(supplied) {
  exactKeys(supplied, FIXTURE_KEYS, 'component fixture');
  if (supplied.schemaVersion !== 1) throw new TypeError('component fixture.schemaVersion must equal 1.');
  const fixture = {
    schemaVersion: 1,
    componentLabId: contractString(supplied, 'componentLabId', 'component fixture', { maximum: 64, pattern: /^[a-z][a-z0-9-]{1,63}$/u }),
    revision: contractString(supplied, 'revision', 'component fixture', { maximum: 64, pattern: /^[a-z0-9][a-z0-9._-]*$/u }),
    lineage: copyLineage(supplied.lineage),
    catalog: copyCatalog(supplied.catalog),
  };
  return freezeTree(fixture);
}

export function validateDraft(draft, selectedItem) {
  const issues = [];
  if (!draft.email.trim()) {
    issues.push({ id: 'email.required', controlId: 'component-email', message: 'Enter the email address that should receive the receipt.' });
  } else if (!EMAIL_PATTERN.test(draft.email)) {
    issues.push({ id: 'email.format', controlId: 'component-email', message: 'Enter an email address with a name and domain.' });
  }
  const quantity = Number(draft.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    issues.push({ id: 'quantity.range', controlId: 'component-quantity', message: 'Choose at least one item.' });
  } else if (selectedItem && quantity > selectedItem.stock) {
    issues.push({ id: 'quantity.stock', controlId: 'component-quantity', message: `Choose ${selectedItem.stock} or fewer items for this catalog revision.` });
  }
  return freezeTree(issues);
}

function selectedItem(state, sku = state.selection.sku) {
  return state.fixture.catalog.find((item) => item.sku === sku) ?? null;
}

function nextValidation(draft, item, standing = null) {
  const issues = validateDraft(draft, item);
  return {
    standing: standing ?? (issues.length ? 'issue' : 'valid'),
    issues,
  };
}

/** Construct the first accepted state from one admitted fixture. */
export function createComponentState(suppliedFixture, ownerId = 'component-lab-controller') {
  if (typeof ownerId !== 'string' || ownerId.trim() === '') throw new TypeError('ownerId must be a non-empty string.');
  const fixture = admitComponentFixture(suppliedFixture);
  const sku = fixture.catalog[0].sku;
  return freezeTree({
    fixture,
    request: { standing: 'idle', requestId: null, ownerGeneration: null, message: 'Ready.' },
    data: { standing: 'current' },
    authorization: { standing: 'unknown' },
    validation: { standing: 'untouched', issues: [] },
    receipt: { standing: 'absent', receiptId: null, message: null },
    disclosure: { standing: 'compact' },
    ownership: { standing: 'active', ownerId, generation: 1 },
    selection: { sku },
    draft: { email: '', quantity: '1' },
    commerce: {
      intent: null,
      priceCents: fixture.catalog[0].unitPriceCents,
      stock: fixture.catalog[0].stock,
      paymentStanding: 'unstarted',
      orderStanding: 'unstarted',
    },
  });
}

/**
 * Create a fresh controller state while carrying forward compatible local work.
 *
 * Selection, draft values, authorization, and disclosure describe the person's
 * current interaction with this root. Requests, receipts, and reconciliation
 * remain with the retiring controller and restart from their safe initial state.
 */
export function createComponentSuccessorState(suppliedFixture, incumbentState, ownerId = 'component-lab-controller') {
  let state = createComponentState(suppliedFixture, ownerId);
  plainRecord(incumbentState, 'incumbent component state');
  const incumbentFixture = admitComponentFixture(incumbentState.fixture);
  if (state.fixture.componentLabId !== incumbentFixture.componentLabId) {
    throw new TypeError('A same-root successor must retain the incumbent componentLabId.');
  }
  if (state.fixture.revision === incumbentFixture.revision) {
    if (JSON.stringify(state.fixture) !== JSON.stringify(incumbentFixture)) {
      throw new TypeError('A same-root successor at the current revision must retain identical fixture content.');
    }
  } else if (state.fixture.lineage.parentRevision !== incumbentFixture.revision) {
    throw new TypeError('A changed same-root successor must name the incumbent revision as parentRevision.');
  }

  const incumbentSelection = plainRecord(incumbentState.selection, 'incumbent component state.selection');
  const sku = ownString(incumbentSelection, 'sku', 'incumbent component state.selection');
  if (state.fixture.catalog.some(item => item.sku === sku)) {
    state = reduceComponentState(state, { type: 'selection.changed', sku }).state;
  }

  const incumbentDraft = plainRecord(incumbentState.draft, 'incumbent component state.draft');
  for (const field of ['email', 'quantity']) {
    if (!Object.hasOwn(incumbentDraft, field) || typeof incumbentDraft[field] !== 'string') {
      throw new TypeError(`incumbent component state.draft.${field} must be a string.`);
    }
  }
  const incumbentValidation = plainRecord(incumbentState.validation, 'incumbent component state.validation');
  const revalidateUnchangedDraft = incumbentValidation.standing !== 'untouched';
  for (const field of ['email', 'quantity']) {
    if (incumbentDraft[field] !== state.draft[field] || (field === 'email' && revalidateUnchangedDraft)) {
      state = reduceComponentState(state, { type: 'draft.changed', field, value: incumbentDraft[field] }).state;
    }
  }

  const incumbentAuthorization = plainRecord(incumbentState.authorization, 'incumbent component state.authorization');
  const authorization = requireStanding(
    incumbentAuthorization.standing,
    AUTHORIZATION_STANDINGS,
    'incumbent authorization standing',
  );
  if (authorization !== state.authorization.standing) {
    state = reduceComponentState(state, { type: 'authorization.changed', standing: authorization }).state;
  }

  const incumbentDisclosure = plainRecord(incumbentState.disclosure, 'incumbent component state.disclosure');
  const disclosure = requireStanding(
    incumbentDisclosure.standing,
    DISCLOSURE_STANDINGS,
    'incumbent disclosure standing',
  );
  if (disclosure !== state.disclosure.standing) {
    state = reduceComponentState(state, { type: 'disclosure.changed', standing: disclosure }).state;
  }
  return state;
}

function accepted(state, patch) {
  return freezeTree({ ...state, ...patch });
}

function result(state, applied, reason) {
  return freezeTree({ state, applied, reason });
}

function requireStanding(value, allowed, label) {
  if (!allowed.includes(value)) throw new TypeError(`${label} must be one of: ${allowed.join(', ')}.`);
  return value;
}

function requireEventId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function requireOwnerGeneration(state, value) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError('ownerGeneration must be a positive integer.');
  if (state.ownership.standing !== 'active') return result(state, false, 'owner-released');
  if (value !== state.ownership.generation) return result(state, false, 'stale-owner');
  return null;
}

function emptyReceipt() {
  return { standing: 'absent', receiptId: null, message: null };
}

function resetCommerce(state, item = selectedItem(state)) {
  return {
    receipt: emptyReceipt(),
    commerce: {
      intent: null,
      priceCents: item?.unitPriceCents ?? 0,
      stock: item?.stock ?? 0,
      paymentStanding: 'unstarted',
      orderStanding: 'unstarted',
    },
  };
}

function intentEnvelope(state, intentId) {
  const item = selectedItem(state);
  const quantity = Number(state.draft.quantity);
  return freezeTree({
    intentId,
    ownerGeneration: state.ownership.generation,
    fixtureId: state.fixture.componentLabId,
    fixtureRevision: state.fixture.revision,
    authorizationStanding: state.authorization.standing,
    sku: item.sku,
    email: state.draft.email,
    quantity,
    unitPriceCents: item.unitPriceCents,
    totalCents: quantity * item.unitPriceCents,
  });
}

function withSelection(state, sku) {
  const item = selectedItem(state, sku);
  if (!item) return result(state, false, 'unknown-selection');
  const validation = state.validation.standing === 'untouched'
    ? state.validation
    : nextValidation(state.draft, item);
  const context = sku === state.selection.sku ? {} : resetCommerce(state, item);
  return result(accepted(state, {
    selection: { sku },
    validation,
    ...context,
    commerce: context.commerce ?? { ...state.commerce, priceCents: item.unitPriceCents, stock: item.stock },
  }), true, 'selection-accepted');
}

/**
 * Apply one explicit event. Invalid events throw; ineligible late results and
 * rejected candidates return the exact prior state with a reason.
 */
export function reduceComponentState(state, event) {
  plainRecord(state, 'component state');
  plainRecord(event, 'component event');
  const type = ownString(event, 'type', 'component event');

  if (state.ownership.standing === 'released' && type !== 'owner.released') {
    return result(state, false, 'owner-released');
  }

  if (type === 'selection.changed') return withSelection(state, requireEventId(event.sku, 'sku'));

  if (type === 'draft.changed') {
    if (!['email', 'quantity'].includes(event.field) || typeof event.value !== 'string') {
      throw new TypeError('draft.changed requires an email or quantity string field.');
    }
    const draft = { ...state.draft, [event.field]: event.value };
    return result(accepted(state, {
      draft,
      validation: nextValidation(draft, selectedItem(state)),
      ...resetCommerce(state),
    }), true, 'draft-accepted');
  }

  if (type === 'authorization.changed') {
    const standing = requireStanding(event.standing, AUTHORIZATION_STANDINGS, 'authorization standing');
    const context = standing === state.authorization.standing ? {} : resetCommerce(state);
    return result(accepted(state, { authorization: { standing }, ...context }), true, 'authorization-accepted');
  }

  if (type === 'disclosure.changed') {
    const standing = requireStanding(event.standing, DISCLOSURE_STANDINGS, 'disclosure standing');
    return result(accepted(state, { disclosure: { standing } }), true, 'disclosure-accepted');
  }

  if (type === 'request.started') {
    const requestId = requireEventId(event.requestId, 'requestId');
    const ineligibleOwner = requireOwnerGeneration(state, event.ownerGeneration);
    if (ineligibleOwner) return ineligibleOwner;
    return result(accepted(state, {
      request: { standing: 'pending', requestId, ownerGeneration: event.ownerGeneration, message: 'Loading a candidate revision.' },
    }), true, 'request-started');
  }

  if (type === 'request.failed') {
    const requestId = requireEventId(event.requestId, 'requestId');
    const ineligibleOwner = requireOwnerGeneration(state, event.ownerGeneration);
    if (ineligibleOwner) return ineligibleOwner;
    if (state.request.standing !== 'pending' || state.request.requestId !== requestId || state.request.ownerGeneration !== event.ownerGeneration) {
      return result(state, false, 'stale-request');
    }
    const message = typeof event.message === 'string' && event.message.trim() ? event.message : 'Loading the candidate revision failed. Retry when the source is ready.';
    return result(accepted(state, {
      request: { standing: 'failed', requestId, ownerGeneration: event.ownerGeneration, message },
    }), true, 'request-failure-recorded');
  }

  if (type === 'request.succeeded') {
    const requestId = requireEventId(event.requestId, 'requestId');
    const ineligibleOwner = requireOwnerGeneration(state, event.ownerGeneration);
    if (ineligibleOwner) return ineligibleOwner;
    if (state.request.standing !== 'pending' || state.request.requestId !== requestId || state.request.ownerGeneration !== event.ownerGeneration) {
      return result(state, false, 'stale-request');
    }
    let fixture;
    try {
      fixture = admitComponentFixture(event.fixture);
    } catch (error) {
      return result(state, false, `candidate-rejected: ${error.message}`);
    }
    if (fixture.componentLabId !== state.fixture.componentLabId) return result(state, false, 'candidate-rejected: componentLabId must retain the accepted identity.');
    if (fixture.revision === state.fixture.revision) {
      if (JSON.stringify(fixture) !== JSON.stringify(state.fixture)) return result(state, false, 'candidate-rejected: a current revision must retain identical content.');
      return result(accepted(state, {
        request: { standing: 'succeeded', requestId, ownerGeneration: event.ownerGeneration, message: `Revision ${fixture.revision} is already current.` },
      }), true, 'candidate-already-current');
    }
    if (fixture.lineage.parentRevision !== state.fixture.revision) return result(state, false, 'candidate-rejected: parentRevision must equal the accepted revision.');
    const sku = fixture.catalog.some((item) => item.sku === state.selection.sku)
      ? state.selection.sku
      : fixture.catalog[0].sku;
    const item = fixture.catalog.find((candidate) => candidate.sku === sku);
    return result(accepted(state, {
      fixture,
      request: { standing: 'succeeded', requestId, ownerGeneration: event.ownerGeneration, message: `Accepted revision ${fixture.revision}.` },
      data: { standing: 'current' },
      selection: { sku },
      validation: state.validation.standing === 'untouched' ? state.validation : nextValidation(state.draft, item),
      ...resetCommerce(state, item),
    }), true, 'candidate-accepted');
  }

  if (type === 'intent.submitted') {
    const intentId = requireEventId(event.intentId, 'intentId');
    const ineligibleOwner = requireOwnerGeneration(state, event.ownerGeneration);
    if (ineligibleOwner) return ineligibleOwner;
    const validation = nextValidation(state.draft, selectedItem(state));
    if (validation.issues.length) return result(accepted(state, { validation }), false, 'validation-issue');
    if (state.authorization.standing !== 'allowed') return result(state, false, 'authorization-required');
    if (!['current', 'partial'].includes(state.data.standing)) return result(state, false, 'current-data-required');
    return result(accepted(state, {
      validation,
      receipt: { standing: 'provisional', receiptId: intentId, message: 'Intent recorded locally; authority reconciliation is pending.' },
      commerce: { ...state.commerce, intent: intentEnvelope(state, intentId), paymentStanding: 'pending', orderStanding: 'pending' },
    }), true, 'intent-provisional');
  }

  if (type === 'intent.reconciled') {
    const intentId = requireEventId(event.intentId, 'intentId');
    const ineligibleOwner = requireOwnerGeneration(state, event.ownerGeneration);
    if (ineligibleOwner) return ineligibleOwner;
    if (state.commerce.intent?.intentId !== intentId
      || state.commerce.intent?.ownerGeneration !== event.ownerGeneration
      || state.receipt.standing !== 'provisional') {
      return result(state, false, 'stale-intent');
    }
    const acceptedByAuthority = event.outcome === 'accepted';
    if (!acceptedByAuthority && event.outcome !== 'rejected') throw new TypeError('intent outcome must be accepted or rejected.');
    const receiptId = requireEventId(event.receiptId, 'receiptId');
    return result(accepted(state, {
      validation: { standing: 'server-reconciled', issues: state.validation.issues },
      receipt: {
        standing: acceptedByAuthority ? 'accepted' : 'rejected',
        receiptId,
        message: acceptedByAuthority ? 'Authority accepted the order.' : 'Authority rejected the order and preserved the draft.',
      },
      commerce: {
        ...state.commerce,
        paymentStanding: acceptedByAuthority ? 'accepted' : 'released',
        orderStanding: acceptedByAuthority ? 'accepted' : 'rejected',
      },
    }), true, 'intent-reconciled');
  }

  if (type === 'owner.replaced') {
    const ownerId = requireEventId(event.ownerId, 'ownerId');
    if (state.ownership.standing === 'released') return result(state, false, 'owner-released');
    if (ownerId === state.ownership.ownerId) return result(state, false, 'owner-unchanged');
    const next = {
      ownership: { standing: 'active', ownerId, generation: state.ownership.generation + 1 },
      request: { standing: 'idle', requestId: null, ownerGeneration: null, message: 'Replacement owner is ready.' },
    };
    if (state.receipt.standing === 'provisional') Object.assign(next, resetCommerce(state));
    return result(accepted(state, next), true, 'owner-replaced');
  }

  if (type === 'owner.released') {
    if (state.ownership.standing === 'released') return result(state, false, 'owner-already-released');
    const next = {
      ownership: { ...state.ownership, standing: 'released' },
      request: { standing: 'idle', requestId: null, ownerGeneration: null, message: 'Controller resources released.' },
    };
    if (state.receipt.standing === 'provisional') Object.assign(next, resetCommerce(state));
    return result(accepted(state, next), true, 'owner-released');
  }

  throw new TypeError(`Unsupported component event: ${type}.`);
}

/** Return a detached, JSON-safe snapshot for receipts and tests. */
export function exportComponentState(state) {
  return JSON.parse(JSON.stringify(state));
}
