import {
  MODEL_VERSION,
  admitServiceBoundaryCommand,
  createInitialState,
  createServiceBoundarySuccessorState,
  inspectableState,
  semanticRows,
  transition,
} from './service-boundary-model.js';

const DIMENSION_LABELS = Object.freeze({
  request: 'Request',
  authorization: 'Authorization',
  transaction: 'Transaction',
  receipt: 'Receipt',
  cache: 'Cache',
  aiCall: 'AI call',
  disclosure: 'Disclosure',
  decision: 'Decision',
});

const ACTIVE_SERVICE_BOUNDARY_LABS = new WeakMap();

const REPLACEMENT_RELEASE = Symbol('service-boundary-replacement-release');

const wait = (milliseconds, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, milliseconds);
  signal.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(new DOMException('Scenario superseded', 'AbortError'));
  }, { once: true });
});

function element(name, text) {
  const node = document.createElement(name);
  node.textContent = text;
  return node;
}

function fixtureFrom(root) {
  const node = root.querySelector('#service-boundary-fixture');
  if (!(node instanceof HTMLTemplateElement)) throw new TypeError('The lab fixture is unavailable.');
  const value = JSON.parse(node.content.textContent);
  if (value === null || typeof value !== 'object' || !value.accepted || !value.command) {
    throw new TypeError('The lab fixture requires accepted and command records.');
  }
  return Object.freeze({ accepted: value.accepted, command: value.command });
}

function scenarioSteps(name, command) {
  const authorize = { type: 'AUTHORIZE', outcome: 'allowed', command };
  const begin = { type: 'BEGIN', command };
  const checkpoint = { type: 'CHECKPOINT', id: 'checkpoint-review-0142' };
  const commit = { type: 'COMMIT', receiptId: 'receipt-review-0142' };

  const scenarios = {
    success: [authorize, begin, checkpoint, commit, { type: 'PUBLISH_OUTBOX' }, begin],
    resume: [authorize, begin, checkpoint, { type: 'INTERRUPT' }, { type: 'RESUME' }, commit, { type: 'PUBLISH_OUTBOX' }],
    rollback: [authorize, begin, checkpoint, {
      type: 'FAIL',
      issueId: 'ISSUE-TX-01',
      code: 'WRITE_CONFLICT',
      message: 'The durable write encountered a controlled conflict.',
      recovery: 'Refresh the accepted revision and begin a new candidate.',
    }],
    ai: [authorize, {
      type: 'START_AI_CALL',
      budget: 3,
      task: 'Summarize the accepted receipt for a reviewer',
      sourceAuthority: 'Accepted synthetic service receipt',
      tools: ['read accepted receipt', 'summarize bounded projection'],
      inputProjection: 'Accepted receipt fields and current revision',
      stoppingEvent: 'Budget reached or review claim assembled',
      receiver: 'Named review lead',
      publicationAuthority: 'Named publication steward',
      checkpointId: 'ai-checkpoint-review-0142',
    }, {
      type: 'AI_RESULT',
      used: 2,
      complete: false,
      claim: 'Revision 7 is assembled and ready for the named review step',
      evidence: 'Synthetic accepted-state fixture at revision 7',
      evidenceStanding: 'observed',
    }],
    late: [authorize, begin, checkpoint, commit, {
      type: 'APPLY_LATE_RESULT',
      sourceId: command.sourceId,
      baseRevision: command.baseRevision,
    }],
    held: [authorize, { type: 'AUTHORIZE', outcome: 'held', command }],
  };
  return scenarios[name] ?? null;
}

export function enhanceServiceBoundaryLab(root, fixture = fixtureFrom(root)) {
  if (!(root instanceof HTMLElement)) throw new TypeError('The lab root must be an element.');

  const nodes = {
    accepted: root.querySelector('[data-accepted-record]'),
    dimensions: root.querySelector('[data-dimension-grid]'),
    semantic: root.querySelector('[data-semantic-rows]'),
    timeline: root.querySelector('[data-timeline]'),
    machine: root.querySelector('[data-machine-reading]'),
    status: root.querySelector('[data-live-status]'),
    issue: root.querySelector('[data-issue]'),
    issueList: root.querySelector('[data-issue-list]'),
    disclosure: root.querySelector('[data-action="disclosure"]'),
    acceptDecision: root.querySelector('[data-action="accept-decision"]'),
    publishDecision: root.querySelector('[data-action="publish-decision"]'),
    expandedDisclosure: root.querySelector('[data-expanded-disclosure]'),
    disclosureSource: root.querySelector('[data-disclosure-source]'),
    disclosureTools: root.querySelector('[data-disclosure-tools]'),
    disclosureInput: root.querySelector('[data-disclosure-input]'),
    disclosureStop: root.querySelector('[data-disclosure-stop]'),
    disclosureReceiver: root.querySelector('[data-disclosure-receiver]'),
    disclosurePublication: root.querySelector('[data-disclosure-publication]'),
    disclosureEvidence: root.querySelector('[data-disclosure-evidence]'),
    disclosureClaim: root.querySelector('[data-disclosure-claim]'),
    disclosureSupport: root.querySelector('[data-disclosure-support]'),
    runtimeReceipt: document.querySelector('[data-runtime-receipt]'),
    staticReading: root.querySelector('[data-static-reading]'),
  };
  if (Object.values(nodes).some(node => !(node instanceof HTMLElement))) {
    throw new TypeError('The lab is missing a required rendering target.');
  }

  // Admit the replacement before releasing the current owner. A malformed
  // re-entry leaves the working controller in place instead of stranding the root.
  const baselineState = createInitialState(fixture.accepted);
  const admittedFixture = Object.freeze({
    accepted: baselineState.accepted,
    command: admitServiceBoundaryCommand(fixture.command),
  });
  const incumbent = ACTIVE_SERVICE_BOUNDARY_LABS.get(root);
  const initialState = incumbent
    ? createServiceBoundarySuccessorState(
      admittedFixture.accepted,
      admittedFixture.command,
      incumbent.getState(),
    )
    : baselineState;
  const controls = [...root.querySelectorAll('[data-enhance-control]')];
  const allButtons = [...root.querySelectorAll('button')];
  const presentationBeforeAdmission = {
    ariaBusy: root.getAttribute('aria-busy'),
    disclosureExpanded: nodes.disclosure.getAttribute('aria-expanded'),
    controlDisabled: new Map(allButtons.map(control => [control, control.disabled])),
    hidden: new Map([
      [nodes.issue, nodes.issue.hidden],
      [nodes.expandedDisclosure, nodes.expandedDisclosure.hidden],
      [nodes.staticReading, nodes.staticReading.hidden],
    ]),
    text: new Map([
      [nodes.machine, nodes.machine.textContent],
      [nodes.status, nodes.status.textContent],
      [nodes.disclosure, nodes.disclosure.textContent],
      [nodes.disclosureSource, nodes.disclosureSource.textContent],
      [nodes.disclosureTools, nodes.disclosureTools.textContent],
      [nodes.disclosureInput, nodes.disclosureInput.textContent],
      [nodes.disclosureStop, nodes.disclosureStop.textContent],
      [nodes.disclosureReceiver, nodes.disclosureReceiver.textContent],
      [nodes.disclosurePublication, nodes.disclosurePublication.textContent],
      [nodes.disclosureEvidence, nodes.disclosureEvidence.textContent],
      [nodes.disclosureClaim, nodes.disclosureClaim.textContent],
      [nodes.disclosureSupport, nodes.disclosureSupport.textContent],
      [nodes.runtimeReceipt, nodes.runtimeReceipt.textContent],
    ]),
    children: new Map([
      [nodes.accepted, [...nodes.accepted.childNodes]],
      [nodes.dimensions, [...nodes.dimensions.childNodes]],
      [nodes.semantic, [...nodes.semantic.childNodes]],
      [nodes.timeline, [...nodes.timeline.childNodes]],
      [nodes.issueList, [...nodes.issueList.childNodes]],
    ]),
  };

  let state = initialState;
  let activeRun = null;
  let runIdentity = 0;
  let destroyed = false;
  let api;
  const lifetime = new AbortController();

  const assertLive = () => {
    if (destroyed) throw new DOMException('The lab controller has released its ownership.', 'InvalidStateError');
  };

  const renderRecord = visible => {
    nodes.accepted.replaceChildren();
    const fields = [
      ['Record', visible.visibleProjection.id],
      ['Revision', String(visible.visibleProjection.revision)],
      ['Status', visible.visibleProjection.status],
      ['Next action', visible.visibleProjection.nextAction],
    ];
    if (visible.visibleProjection.owner) fields.splice(3, 0, ['Owner', visible.visibleProjection.owner]);
    for (const [label, value] of fields) {
      const group = document.createElement('div');
      group.append(element('dt', label), element('dd', value));
      nodes.accepted.append(group);
    }
  };

  const renderDimensions = visible => {
    nodes.dimensions.replaceChildren();
    for (const [name, value] of Object.entries(visible.dimensions)) {
      const card = document.createElement('article');
      card.className = 'dimension-card';
      card.dataset.state = value;
      card.append(element('h3', DIMENSION_LABELS[name]), element('p', value.replaceAll('_', ' ')));
      nodes.dimensions.append(card);
    }
  };

  const renderSemantic = visibleState => {
    nodes.semantic.replaceChildren();
    for (const row of semanticRows(visibleState)) {
      const tr = document.createElement('tr');
      const heading = element('th', row.dimension);
      heading.scope = 'row';
      const cells = [
        ['State', row.state.replaceAll('_', ' ')],
        ['Owner', row.owner],
        ['Release event', row.release],
      ].map(([label, value]) => {
        const cell = element('td', value);
        cell.dataset.label = label;
        return cell;
      });
      tr.append(heading, ...cells);
      nodes.semantic.append(tr);
    }
  };

  const renderTimeline = visible => {
    nodes.timeline.replaceChildren();
    for (const event of visible.events) {
      const item = document.createElement('li');
      const content = document.createElement('span');
      content.append(element('strong', event.type.replaceAll('_', ' ')), document.createTextNode(event.summary));
      item.append(content);
      nodes.timeline.append(item);
    }
    if (visible.events.length === 0) nodes.timeline.append(element('li', 'Choose a scenario to create a transition receipt.'));
  };

  const renderIssue = visible => {
    const activeIssues = Object.entries(visible.issues).filter(([, value]) => value !== null);
    nodes.issue.hidden = activeIssues.length === 0;
    nodes.issueList.replaceChildren(...activeIssues.map(([channel, value]) => {
      const route = document.createElement('article');
      route.className = 'issue__route';
      route.append(
        element('h3', `${channel.replaceAll('_', ' ')} · ${value.code.replaceAll('_', ' ')}`),
        element('p', value.message),
        element('p', value.recovery),
      );
      return route;
    }));
  };

  const render = (announcement, visibleState = state) => {
    // Derive one authorization-bounded projection for the whole paint. Mixing
    // raw state and projected state lets a later authorization inherit details
    // that belong to another request context.
    const visible = inspectableState(visibleState);
    renderRecord(visible);
    renderDimensions(visible);
    renderSemantic(visibleState);
    renderTimeline(visible);
    renderIssue(visible);
    nodes.machine.textContent = JSON.stringify(visible, null, 2);
    nodes.disclosure.setAttribute('aria-expanded', String(visible.dimensions.disclosure === 'expanded'));
    nodes.disclosure.textContent = visible.dimensions.disclosure === 'expanded' ? 'Use compact disclosure' : 'Expand disclosure';
    nodes.acceptDecision.toggleAttribute('disabled', visible.dimensions.decision !== 'human_held');
    nodes.publishDecision.toggleAttribute('disabled', visible.dimensions.decision !== 'accepted'
      || visible.ai.publicationStanding === 'approved');
    const allowed = visible.authorizationGrant !== null;
    const expanded = allowed && visible.dimensions.disclosure === 'expanded';
    nodes.expandedDisclosure.hidden = !expanded;
    const pending = allowed ? 'Available after a bounded call begins.' : 'Available with an allowed projection.';
    nodes.disclosureSource.textContent = allowed ? visible.ai.sourceAuthority ?? pending : pending;
    nodes.disclosureTools.textContent = allowed && visible.ai.tools.length > 0 ? visible.ai.tools.join(' · ') : pending;
    nodes.disclosureInput.textContent = allowed ? visible.ai.inputProjection ?? pending : pending;
    nodes.disclosureStop.textContent = allowed ? visible.ai.stoppingEvent ?? pending : pending;
    nodes.disclosureReceiver.textContent = allowed ? visible.ai.receiver ?? pending : pending;
    nodes.disclosurePublication.textContent = allowed ? visible.ai.publicationAuthority ?? pending : pending;
    nodes.disclosureClaim.textContent = allowed ? visible.ai.claim ?? pending : pending;
    nodes.disclosureSupport.textContent = allowed ? visible.ai.evidence ?? pending : pending;
    nodes.disclosureEvidence.textContent = allowed ? visible.ai.evidenceStanding : 'undetermined';
    if (announcement) nodes.status.textContent = announcement;
  };

  const cancelRun = (summary = 'A later command superseded the active scenario and released its owned resources.') => {
    const hadRun = activeRun !== null;
    activeRun?.abort();
    // Invalidate the pending async frame before another owner can acquire this
    // root. Its finally block then stays outside the replacement's busy state.
    if (hadRun) runIdentity += 1;
    activeRun = null;
    if (state.dimensions.transaction === 'active') state = transition(state, { type: 'INTERRUPT' });
    if (state.dimensions.aiCall === 'bounded_running') state = transition(state, { type: 'AI_CANCEL' });
    return hadRun ? summary : null;
  };

  const reset = (announcement = 'Accepted revision 7 is available.') => {
    assertLive();
    const supersession = cancelRun('Reset released the active scenario before restoring the accepted fixture.');
    state = createInitialState(admittedFixture.accepted);
    if (supersession) state = transition(state, { type: 'RECORD_SUPERSESSION', summary: supersession });
    render(announcement);
  };

  const runScenario = async name => {
    assertLive();
    const steps = scenarioSteps(name, admittedFixture.command);
    if (!steps) return;
    const supersession = cancelRun();
    const controller = new AbortController();
    const identity = ++runIdentity;
    activeRun = controller;
    state = createInitialState(admittedFixture.accepted);
    if (supersession) state = transition(state, { type: 'RECORD_SUPERSESSION', summary: supersession });
    root.setAttribute('aria-busy', 'true');
    render(`Running ${name} scenario.`);
    try {
      for (const event of steps) {
        await wait(90, controller.signal);
        if (identity !== runIdentity) return;
        state = transition(state, event);
        render(`${event.type.replaceAll('_', ' ')} completed. Accepted revision ${state.accepted.revision} remains visible.`);
      }
      nodes.status.textContent = `${name} scenario complete. ${state.issue?.recovery ?? `Accepted revision ${state.accepted.revision} is available.`}`;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (state.dimensions.transaction === 'active') {
        state = transition(state, {
          type: 'FAIL',
          issueId: 'ISSUE-CONTROLLER-01',
          code: 'SCENARIO_FAILURE',
          message: 'The scenario encountered a typed controller failure.',
          recovery: 'Inspect the accepted revision and begin another bounded scenario.',
        });
        render('The scenario released its candidate and preserved the accepted revision.');
      }
      nodes.status.textContent = `Accepted revision ${state.accepted.revision} remains available. Use Reset or choose another scenario. ${error instanceof Error ? error.message : 'The transition stopped before completion.'}`;
    } finally {
      if (identity === runIdentity) {
        activeRun = null;
        root.removeAttribute('aria-busy');
      }
    }
  };

  const onClick = event => {
    if (destroyed) return;
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!(button instanceof HTMLButtonElement) || !root.contains(button)) return;
    if (button.dataset.scenario) {
      void runScenario(button.dataset.scenario);
      return;
    }
    if (button.dataset.action === 'reset') {
      reset();
      return;
    }
    if (button.dataset.action === 'disclosure') {
      state = transition(state, { type: 'SET_DISCLOSURE', value: state.dimensions.disclosure === 'compact' ? 'expanded' : 'compact' });
      render(`Disclosure is ${state.dimensions.disclosure}.`);
      return;
    }
    if (button.dataset.action === 'accept-decision' && state.dimensions.decision === 'human_held') {
      state = transition(state, { type: 'ACCEPT_AI_DECISION', receiver: state.ai.receiver });
      render('The named human receiver accepted the generated claim with its evidence label.');
      return;
    }
    if (button.dataset.action === 'publish-decision' && state.dimensions.decision === 'accepted') {
      state = transition(state, { type: 'PUBLISH_AI_DECISION', authority: state.ai.publicationAuthority });
      render('The named publication authority approved the accepted claim.');
    }
  };

  const onPageHide = event => {
    if (!event.persisted && ACTIVE_SERVICE_BOUNDARY_LABS.get(root) === api) destroy();
  };

  function destroy(releaseMode) {
    if (destroyed) return inspectableState(state);
    const preservePresentation = releaseMode === REPLACEMENT_RELEASE;
    const released = cancelRun('Controller teardown released the active scenario and retained its checkpoint.');
    if (released && !preservePresentation) render('Controller teardown released the active scenario.');
    destroyed = true;
    lifetime.abort();
    if (!preservePresentation) {
      root.removeAttribute('aria-busy');
      for (const control of root.querySelectorAll('button')) control.disabled = true;
    }
    if (ACTIVE_SERVICE_BOUNDARY_LABS.get(root) === api) ACTIVE_SERVICE_BOUNDARY_LABS.delete(root);
    return inspectableState(state);
  }

  api = Object.freeze({
    getState: () => state,
    runScenario,
    reset,
    destroy,
  });

  try {
    // The candidate proves listener and projection admission while the current
    // owner remains available for recovery. Promotion happens only after every
    // operation that can reject the candidate has completed.
    root.addEventListener('click', onClick, { signal: lifetime.signal });
    window.addEventListener('pagehide', onPageHide, { signal: lifetime.signal });
    root.removeAttribute('aria-busy');
    for (const control of controls) control.disabled = false;
    nodes.staticReading.hidden = true;
    nodes.runtimeReceipt.textContent = `service-boundary-lab@1.2.0 · model ${MODEL_VERSION} · observed user agent ${navigator.userAgent}`;
    render(`Ready. Accepted revision ${state.accepted.revision} is available.`);

    incumbent?.destroy(REPLACEMENT_RELEASE);
    ACTIVE_SERVICE_BOUNDARY_LABS.set(root, api);
    return api;
  } catch (error) {
    destroyed = true;
    lifetime.abort();
    const recoveryFailures = [];
    try {
      for (const [target, children] of presentationBeforeAdmission.children) target.replaceChildren(...children);
      for (const [target, text] of presentationBeforeAdmission.text) target.textContent = text;
      for (const [target, hidden] of presentationBeforeAdmission.hidden) target.hidden = hidden;
      for (const [control, disabled] of presentationBeforeAdmission.controlDisabled) control.disabled = disabled;
      if (presentationBeforeAdmission.ariaBusy === null) root.removeAttribute('aria-busy');
      else root.setAttribute('aria-busy', presentationBeforeAdmission.ariaBusy);
      if (presentationBeforeAdmission.disclosureExpanded === null) nodes.disclosure.removeAttribute('aria-expanded');
      else nodes.disclosure.setAttribute('aria-expanded', presentationBeforeAdmission.disclosureExpanded);
    } catch (recoveryError) {
      recoveryFailures.push(recoveryError);
    }
    if (recoveryFailures.length > 0) {
      throw new AggregateError([error, ...recoveryFailures], 'Service-boundary successor admission paused with recovery failures.');
    }
    throw error;
  }
}

const root = document.querySelector('[data-service-boundary-lab]');
if (root instanceof HTMLElement) window.__serviceBoundaryLab = enhanceServiceBoundaryLab(root);
