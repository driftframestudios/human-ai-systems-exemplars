import { FRAMEWORK_CONTRACTS, FRAMEWORK_EVIDENCE_STANDING } from './framework-contracts.js';
import { createLifecycleController, RUNTIME_RECEIPT } from './lifecycle-model.js';
import { createBrowserExecutionReceipt, PLATFORM_ADAPTER_RECEIPTS } from './platform-adapters.js';
import { getScenario, SCENARIOS } from './scenario-data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ACTIVE_LABS = new WeakMap();
const RETAINED_RETIREMENTS = new WeakMap();
let lifecycleOwnerSequence = 0;

function required(root, selector) {
  const node = root.querySelector(selector);
  if (node) return node;
  throw new Error(`Lifecycle lab requires ${selector}.`);
}

function svgElement(name, attributes = {}, text = '') {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text) node.textContent = text;
  return node;
}

function renderSvgSpecimen(ids, label, color) {
  const svg = svgElement('svg', {
    viewBox: '0 0 240 150', role: 'img', 'aria-labelledby': `${ids.title} ${ids.description}`,
    'data-svg-instance': label.toLowerCase(), tabindex: '0', focusable: 'true',
  });
  const title = svgElement('title', { id: ids.title }, `${label} lifecycle state`);
  const description = svgElement('desc', { id: ids.description }, `${label} uses its own gradient and clip-path references.`);
  const defs = svgElement('defs');
  const gradient = svgElement('linearGradient', { id: ids.gradient, x1: '0', y1: '0', x2: '1', y2: '1' });
  gradient.append(svgElement('stop', { offset: '0', 'stop-color': color }), svgElement('stop', { offset: '1', 'stop-color': '#f7ff64' }));
  const clip = svgElement('clipPath', { id: ids.clip });
  clip.append(svgElement('rect', { x: '16', y: '18', width: '208', height: '102', rx: '18' }));
  defs.append(gradient, clip);
  const field = svgElement('g', {
    'clip-path': `url(#${ids.clip})`, transform: 'translate(4 3) scale(.98)',
    'data-transform-owner': label.toLowerCase(),
  });
  field.append(
    svgElement('rect', { x: '16', y: '18', width: '208', height: '102', fill: `url(#${ids.gradient})`, 'data-paint-layer': '1-field' }),
    svgElement('circle', { cx: '184', cy: '50', r: '38', fill: '#0b1f4d', opacity: '.9', 'data-paint-layer': '2-marker' }),
    svgElement('path', { d: 'M38 94 L92 48 L132 84 L188 42', fill: 'none', stroke: '#0b1f4d', 'stroke-width': '7', 'stroke-linecap': 'square', 'data-paint-layer': '3-route' }),
  );
  svg.append(title, description, defs, field, svgElement('text', { x: '22', y: '140' }, `${label} · ${ids.gradient}`));
  return svg;
}

function baselineUrl(host, scenario) {
  const url = new URL(host.location.href);
  url.hash = `scenario=${encodeURIComponent(scenario)}`;
  return url;
}

function normalizeEntryState(host, scenarioSelect, faultInput) {
  const initialScenario = SCENARIOS[0].id;
  scenarioSelect.value = initialScenario;
  faultInput.checked = false;
  const current = host.history.state && typeof host.history.state === 'object' ? host.history.state : {};
  host.history.replaceState(
    { ...current, lifecycleScenario: initialScenario, injectFault: false },
    '',
    baselineUrl(host, initialScenario),
  );
}

export function enhanceLifecycleLab(root, host = window) {
  if (!(root instanceof Element)) throw new TypeError('Lifecycle lab enhancement requires a root element.');
  const incumbent = ACTIVE_LABS.get(root);
  const ownerId = `lifecycle-owner-${++lifecycleOwnerSequence}`;
  const retirementLedger = incumbent
    ? (RETAINED_RETIREMENTS.get(incumbent) ?? { records: [] })
    : { records: [] };
  const retainedRetirements = retirementLedger.records;
  const executionReceipt = createBrowserExecutionReceipt(host);
  const serverContractVersion = root.ownerDocument.documentElement.dataset.lifecycleContract;
  if (serverContractVersion !== executionReceipt.contractVersion) {
    const message = `Lifecycle lab contract mismatch: server ${serverContractVersion ?? 'unspecified'}; client ${executionReceipt.contractVersion}.`;
    const notice = root.querySelector('[data-initialization-error]');
    if (notice) {
      notice.hidden = false;
      notice.textContent = `${message} The static lifecycle reading remains available while a compatible client contract is selected.`;
    }
    throw new Error(message);
  }
  const controls = required(root, '[data-controls]');
  const retirementNotice = required(root, '[data-retirement-recovery]');
  const scenarioSelect = required(root, '[name="scenario"]');
  const faultInput = required(root, '[name="injectFault"]');
  const faultLabel = required(root, '[data-fault-label]');
  const resetButton = required(root, '[data-reset]');
  const releaseButton = required(root, '[data-release-reentry]');
  const evidenceField = required(root, '[data-evidence-field]');
  const behaviorStage = required(root, '[data-behavior-stage]');
  const dialog = required(root, '[data-replacement-dialog]');
  const dialogButton = required(root, '[data-open-dialog]');
  const svgPair = required(root, '[data-svg-pair]');
  const lifetime = new AbortController();
  let dialogInvoker = null;
  let controller;
  let api;
  let successorPromoted = false;
  let projectedRetirementStatus = null;

  const fields = {
    identity: required(root, '[data-accepted-identity]'),
    revision: required(root, '[data-accepted-revision]'),
    value: required(root, '[data-accepted-value]'),
    listeners: required(root, '[data-resource-listeners]'),
    subscriptions: required(root, '[data-resource-subscriptions]'),
    requests: required(root, '[data-resource-requests]'),
    infrastructure: required(root, '[data-resource-infrastructure]'),
    heading: required(root, '[data-result-heading]'),
    detail: required(root, '[data-result-detail]'),
    decision: required(root, '[data-result-decision]'),
    status: required(root, '[data-status]'),
    oracle: required(root, '[data-oracle-card]'),
    events: required(root, '[data-event-log]'),
    runtimeUserAgent: required(root, '[data-runtime-user-agent]'),
    runtimePlatform: required(root, '[data-runtime-platform]'),
    runtimeLanguage: required(root, '[data-runtime-language]'),
    runtimeAdapters: required(root, '[data-runtime-adapters]'),
  };

  function renderSvg(pair) {
    svgPair.replaceChildren(
      renderSvgSpecimen(pair[0], 'Alpha', '#6ee7d3'),
      renderSvgSpecimen(pair[1], 'Beta', '#ff6b72'),
    );
  }

  function render(snapshot, announce = true) {
    fields.identity.textContent = snapshot.accepted.identity;
    fields.revision.textContent = String(snapshot.accepted.revision);
    fields.value.textContent = snapshot.accepted.value;
    fields.listeners.textContent = String(snapshot.resources.listeners);
    fields.subscriptions.textContent = String(snapshot.resources.subscriptions);
    fields.requests.textContent = String(snapshot.resources.requests);
    fields.infrastructure.textContent = String(snapshot.resources.infrastructure);
    fields.heading.textContent = snapshot.result.heading;
    fields.detail.textContent = snapshot.result.detail;
    fields.decision.textContent = snapshot.result.decision;
    const outcome = snapshot.result.passed === true ? 'passed' : snapshot.result.passed === false ? 'fault' : 'pending';
    fields.oracle.dataset.outcome = outcome;
    root.dataset.lifecyclePhase = snapshot.phase;
    const scenario = getScenario(snapshot.scenario);
    if (announce) {
      const observation = outcome === 'passed'
        ? 'expected behavior observed'
        : outcome === 'fault' ? 'controlled fault observed' : 'observation pending';
      fields.status.textContent = `${scenario.label}: ${observation}.`;
    }
    fields.events.replaceChildren(...snapshot.events.map(event => {
      const item = document.createElement('li');
      const action = document.createElement('strong');
      action.textContent = `${event.sequence}. ${event.action}: `;
      item.append(action, event.detail);
      return item;
    }));
    renderSvg(snapshot.svg);
  }

  function updateFaultLabel() {
    faultLabel.textContent = getScenario(scenarioSelect.value).faultLabel;
  }

  function historyUrl(scenario) {
    return baselineUrl(host, scenario);
  }

  async function runSelected({ recordHistory = true, announce = true } = {}) {
    const scenario = scenarioSelect.value;
    const snapshot = await controller.run(scenario, { injectFault: faultInput.checked });
    // A released owner may still finish an earlier promise. Only the current
    // owner can project that result or append browser history.
    if (!ownsProjection()) return snapshot;
    render(snapshot, announce);
    if (recordHistory) host.history.pushState({ lifecycleScenario: scenario, injectFault: faultInput.checked }, '', historyUrl(scenario));
    return snapshot;
  }

  // Build and attach the successor behind a buffered projection. The incumbent
  // remains operational throughout contract, markup, and resource admission.
  let admittedSnapshot = null;
  controller = createLifecycleController({
    onChange: snapshot => {
      admittedSnapshot = snapshot;
      if (ownsProjection()) render(snapshot, false);
    },
    serverContractVersion,
    clientContractVersion: executionReceipt.contractVersion,
  });

  function ownsProjection() {
    return successorPromoted && ACTIVE_LABS.get(root) === api;
  }

  async function openDialog(invoker) {
    scenarioSelect.value = 'dialog-replacement';
    updateFaultLabel();
    const snapshot = await runSelected();
    if (!ownsProjection()) return snapshot;
    dialogInvoker = invoker;
    dialog.dataset.fault = snapshot.fault ?? 'none';
    dialog.dataset.generation = String(snapshot.generation);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return snapshot;
  }

  function reportInteractionError(error) {
    if (!ownsProjection()) return;
    fields.status.textContent = `Interactive observation paused: ${error instanceof Error ? error.message : 'unexpected runtime response'}. Restore the verified baseline to continue.`;
    root.dataset.lifecyclePhase = 'interaction-paused';
  }

  function ownerStanding() {
    const snapshot = controller.snapshot();
    if (snapshot.destroyed) return 'released';
    if (ownsProjection()) return 'active';
    if (snapshot.phase === 'release-failed') return 'release-failed';
    return 'inactive';
  }

  function retirementReceipt() {
    const failures = Object.freeze(retainedRetirements.map(record => record.failure));
    const standing = failures.length > 0 ? 'recovery-required' : 'settled';
    return Object.freeze({
      standing,
      summary: standing === 'settled'
        ? 'Predecessor cleanup settled before this owner entered.'
        : 'The accepted owner retains prior-owner cleanup evidence and a callable recovery route.',
      currentOwner: Object.freeze({ id: ownerId, standing: ownerStanding() }),
      failures,
      recoveryRoute: standing === 'recovery-required'
        ? Object.freeze({
          ownerId,
          action: 'retryRetirement',
          instruction: 'Call retryRetirement() on this lifecycle API after repairing the named prior-owner disposer.',
        })
        : null,
    });
  }

  function exposeRetirementReceipt() {
    const receipt = retirementReceipt();
    if (receipt.standing === 'settled') {
      retirementNotice.hidden = true;
      delete root.dataset.retirementStanding;
      if (projectedRetirementStatus !== null && fields.status.textContent === projectedRetirementStatus) {
        const ownerState = receipt.currentOwner.standing === 'active'
          ? `${receipt.currentOwner.id} continues as the active owner.`
          : `${receipt.currentOwner.id} remains ${receipt.currentOwner.standing}.`;
        fields.status.textContent = `Prior-owner cleanup settled. ${ownerState}`;
      }
      projectedRetirementStatus = null;
      return;
    }
    const retainedCount = receipt.failures.reduce((total, failure) => total
      + Object.values(failure.resources).reduce((count, value) => count + value, 0), 0);
    const ownerState = receipt.currentOwner.standing === 'active'
      ? `${receipt.currentOwner.id} is active and owns the current controls.`
      : `${receipt.currentOwner.id} is ${receipt.currentOwner.standing}.`;
    const summary = `${ownerState} Prior-owner cleanup retained ${retainedCount} resource${retainedCount === 1 ? '' : 's'} for recovery. ${receipt.failures.map(failure => `${failure.ownerId}: ${failure.message}`).join(' ')} ${receipt.recoveryRoute.instruction}`;
    retirementNotice.hidden = false;
    retirementNotice.textContent = summary;
    root.dataset.retirementStanding = receipt.standing;
    fields.status.textContent = summary;
    projectedRetirementStatus = summary;
  }

  function recordRetirementFailure(failedOwner, error, snapshot) {
    const failure = Object.freeze({
      ownerId: failedOwner.ownerId,
      message: error instanceof Error ? error.message : 'Prior-owner cleanup reported an unexpected response.',
      resources: Object.freeze({ ...snapshot.resources }),
      resourceReality: Object.freeze({ ...snapshot.resourceReality }),
      phase: snapshot.phase,
    });
    const existing = retainedRetirements.find(record => record.api === failedOwner);
    if (existing) existing.failure = failure;
    else retainedRetirements.push({ api: failedOwner, failure });
  }

  function retryRetirement() {
    if (!ownsProjection()) {
      const receipt = retirementReceipt();
      return Object.freeze({
        ...receipt,
        standing: 'inactive',
        summary: `${ownerId} is inactive. Retirement recovery remains with the active successor.`,
        recoveryRoute: null,
        activeOwnerId: ACTIVE_LABS.get(root)?.ownerId ?? null,
      });
    }
    for (const record of [...retainedRetirements]) {
      try {
        record.api.destroy({ preservePresentation: true });
        retainedRetirements.splice(retainedRetirements.indexOf(record), 1);
      } catch (error) {
        recordRetirementFailure(record.api, error, record.api.controller.snapshot());
      }
    }
    exposeRetirementReceipt();
    return retirementReceipt();
  }

  function bindInteractions() {
    controls.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        if (scenarioSelect.value === 'dialog-replacement') {
          await openDialog(event.submitter ?? required(controls, 'button[type="submit"]'));
        }
        else await runSelected();
      } catch (error) {
        reportInteractionError(error);
      }
    }, { signal: lifetime.signal });

    scenarioSelect.addEventListener('change', () => {
      faultInput.checked = false;
      updateFaultLabel();
      fields.status.textContent = `${getScenario(scenarioSelect.value).label} selected. Run the observation when ready.`;
    }, { signal: lifetime.signal });

    resetButton.addEventListener('click', () => {
      faultInput.checked = false;
      scenarioSelect.value = SCENARIOS[0].id;
      updateFaultLabel();
      render(controller.reset());
      host.history.pushState({ lifecycleScenario: scenarioSelect.value, injectFault: false }, '', historyUrl(scenarioSelect.value));
    }, { signal: lifetime.signal });

    dialogButton.addEventListener('click', async () => {
      try {
        await openDialog(dialogButton);
      } catch (error) {
        reportInteractionError(error);
      }
    }, { signal: lifetime.signal });

    dialog.addEventListener('close', () => {
      if (!ownsProjection()) return;
      if (dialog.dataset.fault === 'stranded-focus') resetButton.focus();
      else dialogInvoker?.focus();
      const restored = host.document.activeElement === dialogInvoker;
      render(controller.recordDialogFocus(restored, Number(dialog.dataset.generation)));
    }, { signal: lifetime.signal });

    host.addEventListener('popstate', async event => {
      const selected = event.state?.lifecycleScenario;
      if (!SCENARIOS.some(scenario => scenario.id === selected)) return;
      scenarioSelect.value = selected;
      faultInput.checked = Boolean(event.state.injectFault);
      updateFaultLabel();
      try {
        await runSelected({ recordHistory: false });
        if (!ownsProjection()) return;
        scenarioSelect.focus();
      } catch (error) {
        reportInteractionError(error);
      }
    }, { signal: lifetime.signal });

    host.addEventListener('pagehide', event => {
      if (!event.persisted) destroy();
    }, { signal: lifetime.signal });

    releaseButton.addEventListener('click', () => {
      try {
        const replacement = enhanceLifecycleLab(root, host);
        if (host === window) host.__lifecycleLab = replacement;
        if (replacement.retirementReceipt().standing === 'settled') {
          required(root, '[data-status]').textContent = 'Release completed and a fresh lifecycle owner entered from the verified baseline.';
        }
      } catch (error) {
        reportInteractionError(error);
      }
    }, { signal: lifetime.signal });
  }

  function destroy({ preservePresentation = false } = {}) {
    const projectedBeforeRelease = successorPromoted;
    successorPromoted = false;
    try {
      if (dialog.open) dialog.close('lifecycle-release');
      const snapshot = controller.destroy();
      if (!preservePresentation) {
        render(snapshot, false);
        root.dataset.jsState = 'released';
        controls.hidden = true;
        evidenceField.hidden = true;
        behaviorStage.hidden = true;
      }
      if (ACTIVE_LABS.get(root) === api) ACTIVE_LABS.delete(root);
      if (!preservePresentation) exposeRetirementReceipt();
      return snapshot;
    } catch (error) {
      successorPromoted = projectedBeforeRelease;
      throw error;
    }
  }

  api = Object.freeze({ controller, destroy, ownerId, retirementReceipt, retryRetirement, runSelected });
  RETAINED_RETIREMENTS.set(api, retirementLedger);

  const entryBeforePromotion = {
    scenario: scenarioSelect.value,
    injectFault: faultInput.checked,
    historyState: host.history.state,
    href: host.location.href,
  };
  const presentationBeforePromotion = {
    controlsHidden: controls.hidden,
    evidenceHidden: evidenceField.hidden,
    behaviorHidden: behaviorStage.hidden,
    jsState: root.dataset.jsState,
    lifecyclePhase: root.dataset.lifecyclePhase,
    status: fields.status.textContent,
  };
  let entryNormalized = false;

  try {
    controller.attach();

    // A fresh enhancement begins from one declared baseline. The candidate
    // proves browser-state admission while the incumbent still owns recovery.
    normalizeEntryState(host, scenarioSelect, faultInput);
    entryNormalized = true;
    fields.runtimeUserAgent.textContent = executionReceipt.userAgent;
    fields.runtimePlatform.textContent = executionReceipt.platform;
    fields.runtimeLanguage.textContent = executionReceipt.language;
    fields.runtimeAdapters.textContent = executionReceipt.adapters;
    updateFaultLabel();
    bindInteractions();
    controller.own('infrastructure', 'form, dialog, history, and page lifecycle listener group', () => lifetime.abort());
    render(admittedSnapshot ?? controller.snapshot(), false);
    controls.hidden = false;
    evidenceField.hidden = false;
    behaviorStage.hidden = false;
    root.dataset.jsState = 'enhanced';
    const notice = root.querySelector('[data-initialization-error]');
    if (notice) notice.hidden = true;

    successorPromoted = true;
    ACTIVE_LABS.set(root, api);

    // Release the incumbent only after the successor has admitted its complete
    // browser projection. A disposer failure leaves that accepted successor in
    // control and carries the retained prior resource into visible evidence.
    try {
      incumbent?.destroy({ preservePresentation: true });
    } catch (retirementError) {
      recordRetirementFailure(incumbent, retirementError, incumbent.controller.snapshot());
    }
    exposeRetirementReceipt();
    return api;
  } catch (error) {
    successorPromoted = false;
    const recoveryFailures = [];
    try {
      lifetime.abort();
      controller.destroy();
    } catch (releaseError) {
      recoveryFailures.push(releaseError);
    }

    scenarioSelect.value = entryBeforePromotion.scenario;
    faultInput.checked = entryBeforePromotion.injectFault;
    if (entryNormalized) {
      try {
        host.history.replaceState(entryBeforePromotion.historyState, '', entryBeforePromotion.href);
      } catch (historyError) {
        recoveryFailures.push(historyError);
      }
    }

    try {
      if (incumbent && !incumbent.controller.snapshot().destroyed) {
        render(incumbent.controller.snapshot(), false);
      }
      updateFaultLabel();
      fields.status.textContent = presentationBeforePromotion.status;
      controls.hidden = presentationBeforePromotion.controlsHidden;
      evidenceField.hidden = presentationBeforePromotion.evidenceHidden;
      behaviorStage.hidden = presentationBeforePromotion.behaviorHidden;
      if (presentationBeforePromotion.jsState === undefined) delete root.dataset.jsState;
      else root.dataset.jsState = presentationBeforePromotion.jsState;
      if (presentationBeforePromotion.lifecyclePhase === undefined) delete root.dataset.lifecyclePhase;
      else root.dataset.lifecyclePhase = presentationBeforePromotion.lifecyclePhase;
    } catch (presentationError) {
      recoveryFailures.push(presentationError);
    }

    if (recoveryFailures.length > 0) {
      throw new AggregateError([error, ...recoveryFailures], 'Lifecycle successor promotion paused with recovery failures.');
    }
    throw error;
  }
}

export const LIFECYCLE_LAB_RECEIPT = Object.freeze({
  runtime: RUNTIME_RECEIPT,
  frameworks: FRAMEWORK_CONTRACTS,
  frameworkEvidence: FRAMEWORK_EVIDENCE_STANDING,
  platformAdapters: PLATFORM_ADAPTER_RECEIPTS,
});

const root = document.querySelector('[data-lifecycle-lab]');
if (root) {
  try {
    window.__lifecycleLab = enhanceLifecycleLab(root);
  } catch (error) {
    root.dataset.jsState = 'initialization-paused';
    const notice = root.querySelector('[data-initialization-error]');
    if (notice) {
      notice.hidden = false;
      notice.textContent = `Interactive setup paused: ${error instanceof Error ? error.message : 'unexpected setup response'}. The static lifecycle reading remains available.`;
    }
    window.dispatchEvent(new CustomEvent('lifecycle-lab-error', { detail: { stage: 'initialization' } }));
  }
}
