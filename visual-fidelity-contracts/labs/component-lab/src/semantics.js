/** Semantic projection shared by the visible component lab and machine-readable twin. */

const STATUS_COPY = Object.freeze({
  idle: 'Ready',
  pending: 'Loading candidate revision',
  succeeded: 'Candidate revision accepted',
  failed: 'Candidate revision needs attention',
  current: 'Current data',
  partial: 'Partial data',
  stale: 'Prior accepted data',
  absent: 'Data awaiting a first accepted revision',
});

export function componentSemanticTwin(state) {
  const selected = state.fixture.catalog.find((item) => item.sku === state.selection.sku);
  if (!selected) throw new TypeError('Accepted state must retain a selected catalog item.');
  const quantity = Number(state.draft.quantity);
  const totalCents = Number.isInteger(quantity) && quantity > 0 ? quantity * selected.unitPriceCents : null;
  return Object.freeze({
    identity: state.fixture.componentLabId,
    revision: state.fixture.revision,
    lineage: { ...state.fixture.lineage },
    status: {
      request: state.request.standing,
      requestLabel: STATUS_COPY[state.request.standing],
      data: state.data.standing,
      dataLabel: STATUS_COPY[state.data.standing],
      authorization: state.authorization.standing,
      validation: state.validation.standing,
      receipt: state.receipt.standing,
      ownership: state.ownership.standing,
      disclosure: state.disclosure.standing,
      payment: state.commerce.paymentStanding,
      order: state.commerce.orderStanding,
    },
    ownership: {
      ownerId: state.ownership.ownerId,
      generation: state.ownership.generation,
    },
    selected: { ...selected },
    draft: { ...state.draft },
    totalCents,
    issues: state.validation.issues.map((issue) => ({ ...issue })),
    receipt: { ...state.receipt },
    commerce: {
      priceCents: state.commerce.priceCents,
      stock: state.commerce.stock,
      paymentStanding: state.commerce.paymentStanding,
      orderStanding: state.commerce.orderStanding,
      intent: state.commerce.intent ? { ...state.commerce.intent } : null,
    },
  });
}

export function componentStatusMessage(state) {
  const twin = componentSemanticTwin(state);
  if (state.request.standing === 'pending' || state.request.standing === 'failed') {
    return `${state.request.message} The accepted ${twin.status.dataLabel.toLowerCase()} remains available.`;
  }
  if (twin.issues.length) return twin.issues.map((issue) => issue.message).join(' ');
  if (state.receipt.message) return state.receipt.message;
  if (state.authorization.standing === 'unknown') {
    return 'Choose an authorization outcome before submitting. The editable draft remains ready.';
  }
  if (state.authorization.standing === 'held') {
    return 'Authorization is held for review. Keep editing the draft or continue after the named reviewer allows this action.';
  }
  if (state.authorization.standing === 'denied') {
    return 'Authorization is denied for this role. Keep the draft and request the authorized route for this action.';
  }
  if (!['current', 'partial'].includes(state.data.standing)) {
    return `Refresh accepted data before submitting. The editable draft remains available with ${twin.status.dataLabel.toLowerCase()}.`;
  }
  return `${twin.status.requestLabel}. ${twin.status.dataLabel}.`;
}

export function formatCurrency(cents) {
  if (!Number.isInteger(cents)) return 'Pending valid quantity';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
