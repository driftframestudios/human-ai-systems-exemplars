import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { assertTelemetry, monitor, startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const ROUTE = '/visual-fidelity-contracts/labs/service-boundary-lab/index.html';
const output = new URL('../../.visual-runs/visual-fidelity-service-boundary/', import.meta.url);
const engines = { chromium, firefox, webkit };
let server;

before(async () => {
  await mkdir(output, { recursive: true });
  server = await startStaticServer();
});
after(async () => server?.close());

async function openLab(t, engineName, options = {}) {
  const browser = await engines[engineName].launch({ headless: true });
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1120, height: 900 },
    javaScriptEnabled: options.javaScriptEnabled ?? true,
    reducedMotion: 'reduce',
  });
  t.after(async () => { await context.close(); await browser.close(); });
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  const telemetry = monitor(page);
  await page.goto(server.origin + ROUTE, { waitUntil: 'load' });
  return { page, telemetry, lab: page.locator('[data-service-boundary-lab]') };
}

test('static 320 CSS-pixel reading retains the model and local table access', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium', {
    viewport: { width: 320, height: 900 },
    javaScriptEnabled: false,
  });
  await expect(lab.locator('.static-reading')).toContainText('accepted record is revision 7');
  assert.equal(await lab.locator('[data-enhance-control]').evaluateAll(nodes => nodes.every(node => node.disabled)), true);
  await expect(lab.locator('table caption')).toContainText('Current state');
  const tableRegion = lab.locator('.table-scroll');
  await tableRegion.focus();
  await expect(tableRegion).toBeFocused();
  const containment = await page.evaluate(() => ({
    page: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
    outside: [...document.querySelectorAll('body *:not(.table-scroll):not(.table-scroll *)')].flatMap(node => {
      const rect = node.getBoundingClientRect();
      return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1
        ? [{ tag: node.tagName, className: node.className, left: rect.left, right: rect.right, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }]
        : [];
    }).slice(0, 12),
  }));
  assert.equal(containment.page[1] <= containment.page[0] + 1, true, JSON.stringify(containment));
  await lab.screenshot({ path: new URL('static-320.png', output).pathname, fullPage: false });
  assertTelemetry(telemetry);
});

for (const engineName of Object.keys(engines)) {
  test(`${engineName} commits once, replays the receipt, and keeps semantic parity`, async t => {
    const { page, telemetry, lab } = await openLab(t, engineName);
    const trigger = lab.locator('[data-scenario="success"]');
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(lab.locator('[data-live-status]')).toContainText('success scenario complete');
    await expect(lab.locator('[data-accepted-record]')).toContainText('Revision');
    await expect(lab.locator('[data-accepted-record]')).toContainText('8');
    await expect(lab.locator('[data-timeline]')).toContainText('REPLAY');
    await expect(lab.locator('[data-static-reading]')).toBeHidden();
    await expect(page.locator('[data-runtime-receipt]')).toContainText('service-boundary-lab@1.2.0');
    await expect(page.locator('[data-runtime-receipt]')).toContainText('model 1.2.0');
    await expect(page.locator('[data-runtime-receipt]')).toContainText(/Chrome|Firefox|Safari/u);
    await expect(lab.locator('[data-semantic-rows] tr')).toHaveCount(8);
    const machine = JSON.parse(await lab.locator('[data-machine-reading]').textContent());
    const tableStates = await lab.locator('[data-semantic-rows] tr td:first-of-type').allTextContents();
    assert.equal(machine.visibleProjection.revision, 8);
    assert.equal(Object.keys(machine.receipts).length, 1);
    assert.deepEqual(tableStates, Object.values(machine.dimensions).map(value => value.replaceAll('_', ' ')));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true);

    const handoff = await page.evaluate(async () => {
      const { enhanceServiceBoundaryLab } = await import('/visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js');
      const root = document.querySelector('[data-service-boundary-lab]');
      const incumbent = window.__serviceBoundaryLab;
      const before = incumbent.getState();
      const successor = enhanceServiceBoundaryLab(root);
      window.__serviceBoundaryPrevious = incumbent;
      window.__serviceBoundaryLab = successor;
      const after = successor.getState();
      return {
        before: {
          accepted: before.accepted,
          receipts: before.receipts,
          outbox: before.outbox,
          events: before.events,
          eventSequence: before.eventSequence,
        },
        after: {
          accepted: after.accepted,
          receipts: after.receipts,
          outbox: after.outbox,
          events: after.events,
          eventSequence: after.eventSequence,
        },
      };
    });
    assert.equal(handoff.after.accepted.revision, 8);
    assert.deepEqual(handoff.after, handoff.before, 'same-root admission retains durable work exactly');
    await expect(lab.locator('[data-live-status]')).toContainText('Ready. Accepted revision 8 is available.');
    await expect(lab.locator('[data-timeline]')).toContainText('COMMIT');
    await expect(lab.locator('[data-timeline]')).toContainText('REPLAY');

    await lab.locator('[data-action="disclosure"]').click();
    await expect(lab.locator('[data-live-status]')).toContainText('Disclosure is expanded.');
    await expect(lab.locator('[data-timeline]')).toContainText('SET DISCLOSURE');
    const ownerEvidence = await page.evaluate(() => ({
      previousSequence: window.__serviceBoundaryPrevious.getState().eventSequence,
      successorSequence: window.__serviceBoundaryLab.getState().eventSequence,
      successorDisclosure: window.__serviceBoundaryLab.getState().dimensions.disclosure,
    }));
    assert.deepEqual(ownerEvidence, {
      previousSequence: 6,
      successorSequence: 7,
      successorDisclosure: 'expanded',
    });
    assertTelemetry(telemetry);
  });
}

test('interruption, partial generation, and human acceptance remain independently inspectable', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium', { viewport: { width: 768, height: 900 } });
  await lab.locator('[data-scenario="resume"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('resume scenario complete');
  await expect(lab.locator('[data-timeline]')).toContainText('INTERRUPT');
  await expect(lab.locator('[data-timeline]')).toContainText('RESUME');

  await lab.locator('[data-scenario="ai"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('ai scenario complete');
  const accept = lab.locator('[data-action="accept-decision"]');
  await expect(accept).toBeEnabled();
  await expect(lab.locator('[data-semantic-rows]')).toContainText('human held');
  await accept.click();
  await expect(accept).toBeDisabled();
  await expect(lab.locator('[data-semantic-rows]')).toContainText('accepted');
  await expect(lab.locator('[data-semantic-rows]')).toContainText('partial');
  const publish = lab.locator('[data-action="publish-decision"]');
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(publish).toBeDisabled();

  await lab.locator('[data-action="disclosure"]').click();
  await expect(lab.locator('[data-action="disclosure"]')).toHaveAttribute('aria-expanded', 'true');
  await expect(lab.locator('[data-expanded-disclosure]')).toBeVisible();
  await expect(lab.locator('[data-expanded-disclosure]')).toContainText('Named review lead');
  await expect(lab.locator('[data-expanded-disclosure]')).toContainText('Named publication steward');
  await expect(lab.locator('[data-expanded-disclosure]')).toContainText('observed');
  await expect(lab.locator('[data-expanded-disclosure]')).toContainText('Revision 7 is assembled');
  await expect(lab.locator('[data-expanded-disclosure]')).toContainText('Synthetic accepted-state fixture');
  await expect(lab.locator('[data-accepted-record]')).toContainText('Revision');
  assertTelemetry(telemetry);
});

test('controller teardown releases active ownership and leaves controls inert', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium');
  await page.evaluate(() => new Promise((resolve, reject) => {
    const machine = document.querySelector('[data-machine-reading]');
    const trigger = document.querySelector('[data-scenario="resume"]');
    if (!(machine instanceof HTMLElement) || !(trigger instanceof HTMLButtonElement)) {
      reject(new Error('The teardown fixture is incomplete.'));
      return;
    }
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error('The scenario did not enter an active transaction.'));
    }, 2000);
    const inspect = () => {
      const projection = JSON.parse(machine.textContent);
      if (projection.dimensions.transaction !== 'active') return;
      window.clearTimeout(timeout);
      observer.disconnect();
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
      resolve();
    };
    const observer = new MutationObserver(inspect);
    observer.observe(machine, { childList: true, characterData: true, subtree: true });
    trigger.click();
    inspect();
  }));
  const machine = JSON.parse(await lab.locator('[data-machine-reading]').textContent());
  assert.equal(machine.connection.released, true);
  assert.equal(machine.dimensions.transaction, 'rolled_back');
  assert.equal(await lab.locator('button').evaluateAll(nodes => nodes.every(node => node.disabled)), true);
  assertTelemetry(telemetry);
});

test('controller teardown supports a clean re-entry with one active listener owner', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  assert.equal(await lab.locator('button').evaluateAll(nodes => nodes.every(node => node.disabled)), true);
  await page.evaluate(async () => {
    const { enhanceServiceBoundaryLab } = await import('/visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js');
    const root = document.querySelector('[data-service-boundary-lab]');
    window.reenteredServiceLab = enhanceServiceBoundaryLab(root);
  });
  const trigger = lab.locator('[data-scenario="success"]');
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(lab.locator('[data-live-status]')).toContainText('success scenario complete');
  const machine = JSON.parse(await lab.locator('[data-machine-reading]').textContent());
  assert.equal(machine.accepted, undefined);
  assert.equal(machine.visibleProjection.revision, 8);
  await page.evaluate(() => window.reenteredServiceLab.destroy());
  assertTelemetry(telemetry);
});

test('malformed re-entry leaves the admitted controller current and live', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium');
  const result = await page.evaluate(async () => {
    const { enhanceServiceBoundaryLab } = await import('/visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js');
    const root = document.querySelector('[data-service-boundary-lab]');
    const incumbent = window.__serviceBoundaryLab;
    let failure = null;
    try {
      enhanceServiceBoundaryLab(root, {
        accepted: incumbent.getState().accepted,
        command: {},
      });
    } catch (error) {
      failure = { name: error.name, code: error.code, message: error.message };
    }
    await incumbent.runScenario('success');
    return {
      failure,
      acceptedRevision: incumbent.getState().accepted.revision,
      eventSequence: incumbent.getState().eventSequence,
      samePublicOwner: window.__serviceBoundaryLab === incumbent,
    };
  });
  assert.deepEqual(result.failure, {
    name: 'LabStateError',
    code: 'INVALID_COMMAND_SHAPE',
    message: 'Command requires exactly id, task, actor, role, tenant, policyScope, policyRevision, representation, sourceId, baseRevision, idempotencyKey, proposedStatus.',
  });
  assert.equal(result.acceptedRevision, 8);
  assert.equal(result.eventSequence, 6);
  assert.equal(result.samePublicOwner, true);
  await expect(lab.locator('[data-live-status]')).toContainText('success scenario complete');
  assertTelemetry(telemetry);
});

test('unrelated same-root meaning stays outside the durable owner', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium');
  await lab.locator('[data-scenario="success"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('success scenario complete');

  const result = await page.evaluate(async () => {
    const { enhanceServiceBoundaryLab } = await import('/visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js');
    const root = document.querySelector('[data-service-boundary-lab]');
    const fixtureNode = root.querySelector('#service-boundary-fixture');
    const fixture = JSON.parse(fixtureNode.content.textContent);
    const incumbent = window.__serviceBoundaryLab;
    fixture.accepted.id = 'unrelated-case-0142';
    fixture.accepted.sourceId = 'unrelated-case-0142';
    fixture.command.sourceId = 'unrelated-case-0142';
    let failure = null;
    try {
      enhanceServiceBoundaryLab(root, fixture);
    } catch (error) {
      failure = { name: error.name, code: error.code, message: error.message };
    }
    const retained = incumbent.getState();
    return {
      failure,
      accepted: retained.accepted,
      receiptSourceId: Object.values(retained.receipts)[0]?.requestMeaning.sourceId,
      eventSequence: retained.eventSequence,
      samePublicOwner: window.__serviceBoundaryLab === incumbent,
    };
  });
  assert.deepEqual(result.failure, {
    name: 'LabStateError',
    code: 'SUCCESSOR_SERVICE_IDENTITY',
    message: 'A same-root successor must retain the admitted service identity, source, and owner.',
  });
  assert.equal(result.accepted.id, 'synthetic-case-0142');
  assert.equal(result.accepted.revision, 8);
  assert.equal(result.receiptSourceId, 'synthetic-case-0142');
  assert.equal(result.eventSequence, 6);
  assert.equal(result.samePublicOwner, true);
  await expect(lab.locator('[data-accepted-record]')).toContainText('8');

  await lab.locator('[data-action="disclosure"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('Disclosure is expanded.');
  const afterInteraction = await page.evaluate(() => ({
    eventSequence: window.__serviceBoundaryLab.getState().eventSequence,
    disclosure: window.__serviceBoundaryLab.getState().dimensions.disclosure,
  }));
  assert.deepEqual(afterInteraction, { eventSequence: 7, disclosure: 'expanded' });
  assertTelemetry(telemetry);
});

test('listener and projection admission failures preserve the incumbent browser owner', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium');

  const listenerFailure = await page.evaluate(async () => {
    const { enhanceServiceBoundaryLab } = await import('/visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js');
    const root = document.querySelector('[data-service-boundary-lab]');
    const incumbent = window.__serviceBoundaryLab;
    const nativeAddEventListener = root.addEventListener;
    let message = '';
    root.addEventListener = function addEventListenerWithInjectedFailure(type, listener, options) {
      if (type === 'click') throw new Error('injected listener admission failure');
      return nativeAddEventListener.call(this, type, listener, options);
    };
    try {
      enhanceServiceBoundaryLab(root);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    } finally {
      root.addEventListener = nativeAddEventListener;
    }
    return {
      message,
      sequence: incumbent.getState().eventSequence,
      controlsEnabled: [...root.querySelectorAll('[data-enhance-control]')].every(control => !control.disabled),
    };
  });
  assert.equal(listenerFailure.message, 'injected listener admission failure');
  assert.equal(listenerFailure.sequence, 0);
  assert.equal(listenerFailure.controlsEnabled, true);

  await lab.locator('[data-scenario="success"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('success scenario complete');
  assert.equal(await page.evaluate(() => window.__serviceBoundaryLab.getState().accepted.revision), 8);

  const projectionFailure = await page.evaluate(async () => {
    const { enhanceServiceBoundaryLab } = await import('/visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js');
    const root = document.querySelector('[data-service-boundary-lab]');
    const incumbent = window.__serviceBoundaryLab;
    const record = root.querySelector('[data-accepted-record]');
    const nativeReplaceChildren = record.replaceChildren;
    let message = '';
    record.replaceChildren = function replaceChildrenWithInjectedFailure(...children) {
      record.replaceChildren = nativeReplaceChildren;
      throw new Error('injected projection admission failure');
    };
    try {
      enhanceServiceBoundaryLab(root);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    } finally {
      record.replaceChildren = nativeReplaceChildren;
    }
    return {
      message,
      revision: incumbent.getState().accepted.revision,
      sequence: incumbent.getState().eventSequence,
      controlsEnabled: [...root.querySelectorAll('[data-enhance-control]')].every(control => !control.disabled),
    };
  });
  assert.equal(projectionFailure.message, 'injected projection admission failure');
  assert.equal(projectionFailure.revision, 8);
  assert.equal(projectionFailure.sequence, 6);
  assert.equal(projectionFailure.controlsEnabled, true);
  await expect(lab.locator('[data-accepted-record]')).toContainText('8');

  await lab.locator('[data-scenario="resume"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('resume scenario complete');
  const completed = await page.evaluate(() => ({
    revision: window.__serviceBoundaryLab.getState().accepted.revision,
    sequence: window.__serviceBoundaryLab.getState().eventSequence,
  }));
  assert.deepEqual(completed, { revision: 8, sequence: 7 });

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  assert.equal(await lab.locator('button').evaluateAll(nodes => nodes.every(node => node.disabled)), true);
  assertTelemetry(telemetry);
});

test('same-root re-enhancement keeps one owner and final release leaves the lab inert', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium');
  const ownership = await page.evaluate(async () => {
    const { enhanceServiceBoundaryLab } = await import('/visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js');
    const root = document.querySelector('[data-service-boundary-lab]');
    const first = enhanceServiceBoundaryLab(root);
    const pending = first.runScenario('resume');
    await new Promise((resolve, reject) => {
      const deadline = performance.now() + 2000;
      const inspect = () => {
        if (first.getState().dimensions.transaction === 'active') {
          resolve();
          return;
        }
        if (performance.now() >= deadline) {
          reject(new Error('The first controller did not acquire transaction ownership.'));
          return;
        }
        requestAnimationFrame(inspect);
      };
      inspect();
    });
    const second = enhanceServiceBoundaryLab(root);
    await pending;
    const firstSnapshot = first.destroy();
    window.__serviceBoundaryReentry = { first, second };
    return {
      firstReleased: firstSnapshot.connection.released,
      firstRevision: first.getState().eventSequence,
      firstTransaction: firstSnapshot.dimensions.transaction,
      secondRevision: second.getState().eventSequence,
    };
  });
  assert.equal(ownership.firstReleased, true);
  assert.equal(ownership.firstRevision, 3);
  assert.equal(ownership.firstTransaction, 'rolled_back');
  assert.equal(ownership.secondRevision, 3);

  await lab.locator('[data-scenario="success"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('success scenario complete');
  const afterAction = await page.evaluate(() => ({
    first: window.__serviceBoundaryReentry.first.getState(),
    second: window.__serviceBoundaryReentry.second.getState(),
  }));
  assert.equal(afterAction.first.eventSequence, 3, 'the replaced owner stays outside later actions');
  assert.equal(afterAction.second.accepted.revision, 8);
  assert.equal(afterAction.second.eventSequence, 6, 'one action produces one scenario transition sequence');

  await page.evaluate(() => {
    const second = window.__serviceBoundaryReentry.second;
    void second.runScenario('resume');
  });
  await page.waitForFunction(() => window.__serviceBoundaryReentry.second.getState().dimensions.transaction === 'active');
  const released = await page.evaluate(() => {
    const second = window.__serviceBoundaryReentry.second;
    const snapshot = second.destroy();
    document.querySelector('[data-scenario="rollback"]')?.click();
    return snapshot;
  });
  assert.equal(released.dimensions.request, 'cancelled');
  assert.equal(released.dimensions.transaction, 'rolled_back');
  assert.equal(released.dimensions.receipt, 'rejected');
  assert.equal(released.connection.released, true);
  assert.equal(released.issues.request.code, 'INTERRUPTED_BEFORE_CHECKPOINT');
  await expect(lab.locator('[data-semantic-rows]')).toContainText('rolled back');
  assert.equal(await lab.locator('button').evaluateAll(nodes => nodes.every(node => node.disabled)), true);

  await page.waitForTimeout(350);
  const final = await page.evaluate(() => window.__serviceBoundaryReentry.second.getState());
  assert.equal(final.eventSequence, released.eventSequence, 'released timers and listeners leave later work inert');
  assert.equal(final.connection.released, true);
  assertTelemetry(telemetry);
});

test('policy hold masks internal projection and generated-call fields', async t => {
  const { telemetry, lab } = await openLab(t, 'chromium');
  await lab.locator('[data-scenario="ai"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('ai scenario complete');
  await lab.locator('[data-action="disclosure"]').click();
  await expect(lab.locator('[data-expanded-disclosure]')).toBeVisible();
  await lab.locator('[data-scenario="held"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('held scenario complete');
  await expect(lab.locator('[data-expanded-disclosure]')).toBeHidden();
  const machine = JSON.parse(await lab.locator('[data-machine-reading]').textContent());
  assert.equal(machine.dimensions.authorization, 'held');
  assert.equal(machine.ai.sourceAuthority, undefined);
  assert.equal(machine.receipts && Object.keys(machine.receipts).length, 0);
  assert.equal(machine.events.every(event => event.summary === 'A transition receipt remains available to its authorized owner.'), true);
  await expect(lab.locator('[data-timeline]')).toContainText('available to its authorized owner');
  await expect(lab.locator('[data-timeline]')).not.toContainText('ai-checkpoint-review-0142');
  assertTelemetry(telemetry);
});

test('sandbox specimen loads its receipt through a unique-origin frame', async t => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  t.after(async () => { await context.close(); await browser.close(); });
  const page = await context.newPage();
  const telemetry = monitor(page);
  await page.goto(server.origin + '/visual-fidelity-contracts/labs/service-boundary-lab/sandbox-specimen.html');
  const frame = page.locator('iframe[title="Unique-origin synthetic service receipt"]');
  await expect(frame).toHaveAttribute('sandbox', '');
  await expect(page.frameLocator('iframe').locator('body')).toContainText('Bounded synthetic receipt');
  const isolated = await page.evaluate(() => {
    const specimen = document.querySelector('iframe');
    try {
      void specimen.contentWindow.location.href;
      return false;
    } catch (error) {
      return error instanceof DOMException && error.name === 'SecurityError';
    }
  });
  assert.equal(isolated, true);
  assertTelemetry(telemetry);
});

test('standalone documents declare bounded CSP and a scriptless child frame', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  for (const directive of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
    assert.equal(policy.includes(directive), true, `Missing CSP directive: ${directive}`);
  }
  const childResponse = await page.request.get(server.origin + '/visual-fidelity-contracts/labs/service-boundary-lab/sandbox-child.html');
  assert.equal(childResponse.ok(), true);
  assert.doesNotMatch(await childResponse.text(), /<script\b/iu);
  assertTelemetry(telemetry);
});

test('text resize, forced colors, print, and controlled recovery retain useful content', async t => {
  const { page, telemetry, lab } = await openLab(t, 'chromium', { viewport: { width: 390, height: 900 } });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(lab.locator('[data-scenario="rollback"]')).toBeVisible();
  await lab.locator('[data-scenario="rollback"]').click();
  await expect(lab.locator('[data-live-status]')).toContainText('rollback scenario complete');
  await expect(lab.locator('[data-issue]')).toContainText('Refresh the accepted revision');
  const resizedContainment = await page.evaluate(() => ({
    page: [document.documentElement.clientWidth, document.documentElement.scrollWidth],
    owners: ['.hero', '.lab', '.semantic-field', '.table-scroll', '.skip-link'].map(selector => {
      const node = document.querySelector(selector);
      const rect = node.getBoundingClientRect();
      return { selector, left: rect.left, right: rect.right, width: rect.width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflow: getComputedStyle(node).overflow };
    }),
    scrollOwners: [...document.querySelectorAll('.lab *')].flatMap(node => node.scrollWidth > node.clientWidth + 1
      ? [{ tag: node.tagName, className: node.className, text: node.textContent.trim().slice(0, 48), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }]
      : []).slice(0, 20),
    outside: [...document.querySelectorAll('body *:not(.table-scroll):not(.table-scroll *)')].flatMap(node => {
      const rect = node.getBoundingClientRect();
      return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1
        ? [{ tag: node.tagName, className: node.className, left: rect.left, right: rect.right, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }]
        : [];
    }).slice(0, 12),
  }));
  assert.equal(resizedContainment.page[1] <= resizedContainment.page[0] + 1, true, JSON.stringify(resizedContainment));

  await page.emulateMedia({ forcedColors: 'active' });
  await expect(lab.locator('[data-issue]')).toBeVisible();
  await expect(lab.locator('[data-semantic-rows]')).toContainText('rolled back');
  await lab.screenshot({ path: new URL('rollback-resized-forced-colors.png', output).pathname, fullPage: false });

  await page.emulateMedia({ media: 'print', forcedColors: 'none' });
  await expect(lab.locator('.controls')).toBeHidden();
  await expect(lab.locator('[data-accepted-record]')).toContainText('7');
  await expect(lab.locator('[data-semantic-rows]')).toContainText('rolled back');
  assertTelemetry(telemetry);
});
