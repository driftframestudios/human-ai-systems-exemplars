import { componentSemanticTwin, componentStatusMessage, formatCurrency } from './semantics.js';

function element(document, tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) node.setAttribute(name, value);
  return node;
}

function replaceChildren(target, ...children) {
  target.replaceChildren(...children);
}

function renderCatalog(root, state) {
  const document = root.ownerDocument;
  const target = root.querySelector('[data-component-catalog]');
  const activeSku = document.activeElement?.name === 'catalog-item' ? document.activeElement.value : null;
  const existingInputs = [...target.querySelectorAll('input[name="catalog-item"]')];
  const canUpdateInPlace = existingInputs.length === state.fixture.catalog.length
    && existingInputs.every((input, index) => input.value === state.fixture.catalog[index].sku);
  if (canUpdateInPlace) {
    existingInputs.forEach((input, index) => {
      const item = state.fixture.catalog[index];
      const label = input.closest('label');
      input.checked = item.sku === state.selection.sku;
      label.querySelector('span').textContent = item.label;
      label.querySelector('small').textContent = `${formatCurrency(item.unitPriceCents)} · ${item.stock} available`;
    });
    return;
  }
  const fieldset = element(document, 'fieldset', { className: 'component-catalog' });
  fieldset.append(element(document, 'legend', { text: 'Choose one catalog item' }));
  for (const item of state.fixture.catalog) {
    const label = element(document, 'label', { className: 'component-catalog__item' });
    const input = element(document, 'input', {
      attributes: { type: 'radio', name: 'catalog-item', value: item.sku },
    });
    input.checked = item.sku === state.selection.sku;
    label.append(input, element(document, 'span', { text: item.label }), element(document, 'small', {
      text: `${formatCurrency(item.unitPriceCents)} · ${item.stock} available`,
    }));
    fieldset.append(label);
  }
  replaceChildren(target, fieldset);
  if (activeSku !== null) {
    const inputs = [...target.querySelectorAll('input[name="catalog-item"]')];
    const destination = inputs.find(input => input.value === activeSku) ?? inputs.find(input => input.checked);
    const restoreFocus = () => destination?.isConnected && destination.focus({ preventScroll: true });
    if (document.defaultView?.requestAnimationFrame) document.defaultView.requestAnimationFrame(() => document.defaultView.requestAnimationFrame(restoreFocus));
    else restoreFocus();
  }
}

function renderIssues(root, twin) {
  const document = root.ownerDocument;
  const target = root.querySelector('[data-component-issues]');
  const fragment = document.createDocumentFragment();
  for (const issue of twin.issues) {
    const issueNodeId = `component-issue-${issue.id.replaceAll('.', '-')}`;
    const item = element(document, 'li', { text: issue.message, attributes: { id: issueNodeId, 'data-issue-id': issue.id } });
    fragment.append(item);
  }
  replaceChildren(target, fragment);
  target.hidden = twin.issues.length === 0;
  for (const controlId of ['component-email', 'component-quantity']) {
    const control = root.querySelector(`#${controlId}`);
    const issueIds = twin.issues
      .filter(issue => issue.controlId === controlId)
      .map(issue => `component-issue-${issue.id.replaceAll('.', '-')}`);
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
    if (issueIds.length) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', issueIds.join(' '));
    }
  }
}

function renderReceipt(root, twin) {
  const target = root.querySelector('[data-component-receipt]');
  target.hidden = twin.status.receipt === 'absent';
  target.dataset.standing = twin.status.receipt;
  root.querySelector('[data-component-receipt-standing]').textContent = twin.status.receipt;
  root.querySelector('[data-component-receipt-message]').textContent = twin.receipt.message ?? 'A receipt appears after intent submission.';
  root.querySelector('[data-component-receipt-id]').textContent = twin.receipt.receiptId ?? 'Awaiting authority receipt';
  const intent = twin.commerce.intent;
  root.querySelector('[data-component-receipt-context]').textContent = intent
    ? `${intent.quantity} × ${intent.sku} · ${formatCurrency(intent.totalCents)} · revision ${intent.fixtureRevision}`
    : 'A submitted intent will name its item, quantity, total, and accepted revision.';
}

export function renderComponentLab(root, state) {
  const twin = componentSemanticTwin(state);
  renderCatalog(root, state);
  root.querySelector('[data-component-revision]').textContent = twin.revision;
  root.querySelector('[data-component-lineage]').textContent = `${twin.lineage.source} · parent ${twin.lineage.parentRevision ?? 'first admitted revision'}`;
  root.querySelector('[data-component-request]').textContent = twin.status.requestLabel;
  root.querySelector('[data-component-data]').textContent = twin.status.dataLabel;
  root.querySelector('#component-email').value = state.draft.email;
  root.querySelector('#component-quantity').value = state.draft.quantity;
  root.querySelector('#component-authorization').value = twin.status.authorization;
  root.querySelector('[data-component-total]').textContent = formatCurrency(twin.totalCents);
  root.querySelector('[data-component-owner]').textContent = `${twin.ownership.ownerId} · generation ${twin.ownership.generation}`;
  root.querySelector('[data-component-payment]').textContent = twin.status.payment;
  root.querySelector('[data-component-order]').textContent = twin.status.order;
  root.querySelector('[data-component-disclosure-standing]').textContent = twin.status.disclosure;
  root.querySelector('[data-component-live]').textContent = componentStatusMessage(state);
  root.querySelector('[data-component-machine-twin]').textContent = JSON.stringify(twin, null, 2);
  root.querySelector('[data-component-disclosure]').open = state.disclosure.standing === 'expanded';
  const released = state.ownership.standing === 'released';
  root.querySelectorAll('[data-component-action], input, select, [data-component-submit]')
    .forEach(control => { control.disabled = released; });
  root.querySelector('[data-component-submit]').disabled = released || state.request.standing === 'pending';
  root.dataset.componentJsState = released ? 'released' : 'enhanced';
  root.dataset.ownerGeneration = String(twin.ownership.generation);
  root.dataset.ownerStanding = twin.status.ownership;
  renderIssues(root, twin);
  renderReceipt(root, twin);
}
