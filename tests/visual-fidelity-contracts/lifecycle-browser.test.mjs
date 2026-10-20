import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { arch, platform, release, version as operatingSystemVersion } from 'node:os';
import { after, before, test } from 'node:test';
import { chromium, expect, firefox, webkit } from '@playwright/test';

import {
  assertBidirectionalSelectContract,
  assertCustomSelectPresentation,
  assertForcedColorsSelectPresentation,
  assertLabelsLeadControls,
  assertTelemetry,
  inspectLabelControlLayout,
  inspectSelectPresentation,
  monitor,
  startStaticServer,
} from '../../tools/core-architecture-browser-helper.mjs';

const ROUTE = '/visual-fidelity-contracts/labs/lifecycle-lab/';
const require = createRequire(import.meta.url);
const PLAYWRIGHT_VERSION = require('@playwright/test/package.json').version;
const browsers = new Map();
let server;

before(async () => {
  server = await startStaticServer();
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    browsers.set(name, await engine.launch({ headless: true }));
  }
});

after(async () => {
  try { await Promise.all([...browsers.values()].map(browser => browser.close())); }
  finally { await server?.close(); }
});

async function openLab(t, engine, { width = 1280, javaScriptEnabled = true, reducedMotion = 'reduce' } = {}) {
  const context = await browsers.get(engine).newContext({
    viewport: { width, height: 1000 }, javaScriptEnabled, reducedMotion,
  });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);
  await page.goto(server.origin + ROUTE, { waitUntil: 'load' });
  if (javaScriptEnabled) await expect(page.locator('[data-lifecycle-lab]')).toHaveAttribute('data-js-state', 'enhanced');
  return { page, telemetry };
}

async function runScenario(page, scenario, injectFault = false) {
  const form = page.locator('[data-controls]');
  await form.locator('[name="scenario"]').selectOption(scenario);
  const fault = form.locator('[name="injectFault"]');
  if (injectFault !== await fault.isChecked()) await fault.setChecked(injectFault);
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('[data-status]')).toContainText(injectFault ? 'controlled fault observed' : 'expected behavior observed');
}

function assertSandboxBoundaryTelemetry(telemetry) {
  const sandboxRefusal = `Blocked script execution in '${server.origin}${ROUTE}sandbox-specimen.html' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.`;
  const policyEvidence = telemetry.consoleErrors.filter(message => message === sandboxRefusal);
  assert.ok(policyEvidence.length <= 1, `The browser reported one bounded sandbox refusal at most: ${JSON.stringify(policyEvidence)}`);
  assertTelemetry({
    ...telemetry,
    consoleErrors: telemetry.consoleErrors.filter(message => message !== sandboxRefusal),
  });
}

for (const engine of ['chromium', 'firefox', 'webkit']) {
  test(`${engine}: cancellation, reset, focus return, and history restoration remain observable`, async t => {
    const { page, telemetry } = await openLab(t, engine);
    await assertBidirectionalSelectContract(
      page,
      ['#lifecycle-scenario'],
      `${engine} lifecycle lab select and label`,
    );
    await runScenario(page, 'entity-replacement');
    await expect(page.locator('[data-accepted-identity]')).toHaveText('entity-b');
    await expect(page.locator('[data-accepted-revision]')).toHaveText('2');
    await expect(page.locator('[data-resource-requests]')).toHaveText('0');

    await runScenario(page, 'entity-replacement', true);
    await expect(page.locator('[data-accepted-identity]')).toHaveText('entity-a');
    await expect(page.locator('[data-oracle-card]')).toHaveAttribute('data-outcome', 'fault');
    await page.locator('[data-reset]').click();
    await expect(page.locator('[data-resource-listeners]')).toHaveText('1');
    await expect(page.locator('[data-resource-subscriptions]')).toHaveText('1');
    await expect(page.locator('[data-resource-infrastructure]')).toHaveText('1');
    await expect(page.locator('[data-accepted-identity]')).toHaveText('entity-a');

    await runScenario(page, 'hydration-version');
    await expect(page.locator('[data-oracle-card]')).toHaveAttribute('data-outcome', 'passed');
    await expect(page.locator('[data-accepted-value]')).toContainText('server lifecycle-contract@0.1.0; client lifecycle-contract@0.1.0');

    const opener = page.locator('[data-open-dialog]');
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-replacement-dialog]')).toBeVisible();
    await expect(page.locator('[data-oracle-card]')).toHaveAttribute('data-outcome', 'pending');
    await expect(page.locator('[data-status]')).toContainText('observation pending');
    await expect(page.locator('[data-replacement-dialog] button')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    await expect(page.locator('[data-result-heading]')).toContainText('returned to its invoker');

    await runScenario(page, 'entity-replacement');
    await runScenario(page, 'external-store');
    await page.goBack();
    await expect(page.locator('[name="scenario"]')).toHaveValue('entity-replacement');
    await expect(page.locator('[name="scenario"]')).toBeFocused();
    await expect(page.locator('[data-accepted-identity]')).toHaveText('entity-b');
    assertTelemetry(telemetry);
  });

  test(`${engine}: inline SVG identities and sandboxed reading retain their boundaries`, async t => {
    const { page, telemetry } = await openLab(t, engine);
    await runScenario(page, 'svg-identities');
    const observation = await page.locator('[data-svg-pair]').evaluate(root => {
      const svgs = [...root.querySelectorAll('svg')];
      const ids = [...root.querySelectorAll('[id]')].map(node => node.id);
      const references = svgs.flatMap(svg => [...svg.querySelectorAll('[fill^="url"], [clip-path^="url"]')].map(node => {
        const value = node.getAttribute('fill')?.startsWith('url') ? node.getAttribute('fill') : node.getAttribute('clip-path');
        const id = value.slice(5, -1);
        return { id, local: Boolean(svg.querySelector(`[id="${id}"]`)) };
      }));
      return {
        svgCount: svgs.length,
        ids,
        references,
        viewBoxes: svgs.map(svg => svg.getAttribute('viewBox')),
        labelledBy: svgs.map(svg => svg.getAttribute('aria-labelledby').split(' ').every(id => Boolean(svg.querySelector(`[id="${id}"]`)))),
        transforms: svgs.map(svg => svg.querySelector('[data-transform-owner]')?.getAttribute('transform')),
        paintOrder: svgs.map(svg => [...svg.querySelectorAll('[data-paint-layer]')].map(node => node.getAttribute('data-paint-layer'))),
      };
    });
    assert.equal(observation.svgCount, 2);
    assert.equal(new Set(observation.ids).size, observation.ids.length);
    assert.ok(observation.references.every(reference => reference.local));
    assert.deepEqual(observation.viewBoxes, ['0 0 240 150', '0 0 240 150']);
    assert.ok(observation.labelledBy.every(Boolean));
    assert.ok(observation.transforms.every(value => value === 'translate(4 3) scale(.98)'));
    assert.ok(observation.paintOrder.every(value => value.join(',') === '1-field,2-marker,3-route'));
    await expect(page.getByRole('img', { name: 'Alpha lifecycle state' })).toHaveCount(1);
    await expect(page.getByRole('img', { name: 'Beta lifecycle state' })).toHaveCount(1);
    const alpha = page.locator('[data-svg-instance="alpha"]');
    const beta = page.locator('[data-svg-instance="beta"]');
    await alpha.focus();
    await page.keyboard.press('Tab');
    await expect(beta).toBeFocused();
    const frame = page.frameLocator('iframe[title="Sandboxed lifecycle reading specimen"]');
    await expect(frame.locator('strong')).toHaveText('Embedded reading boundary.');
    assert.equal(await page.locator('iframe').getAttribute('sandbox'), '');
    assertSandboxBoundaryTelemetry(telemetry);
  });

  test(`${engine}: script-independent reading remains complete at a narrow viewport`, async t => {
    const { page, telemetry } = await openLab(t, engine, { width: 320, javaScriptEnabled: false });
    await expect(page.locator('[data-controls]')).toBeHidden();
    await expect(page.locator('[data-evidence-field]')).toBeHidden();
    await expect(page.locator('[data-static-reading] details')).toHaveCount(8);
    await expect(page.locator('.framework-reading table')).toBeVisible();
    await expect(page.locator('.receipt')).toContainText('lifecycle-contract@0.1.0');
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(width.scroll <= width.client + 1, `script-independent page owns local overflow (${JSON.stringify(width)})`);
    assertTelemetry(telemetry);
  });

  test(`${engine}: exact browser receipt and enhancement teardown/re-entry stay inspectable`, async t => {
    const { page, telemetry } = await openLab(t, engine);
    const runtime = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      platform: navigator.userAgentData?.platform ?? navigator.platform,
      language: navigator.language,
    }));
    await expect(page.locator('[data-runtime-user-agent]')).toHaveText(runtime.userAgent);
    await expect(page.locator('[data-runtime-platform]')).toHaveText(runtime.platform);
    await expect(page.locator('[data-runtime-language]')).toHaveText(runtime.language);
    await expect(page.locator('[data-runtime-adapters]')).toContainText('deferred-delivery@0.1.0');
    const engineVersion = browsers.get(engine).version();
    assert.ok(engineVersion, `${engine} exposes its exact engine version to the automation receipt`);
    t.diagnostic(JSON.stringify({
      playwright: PLAYWRIGHT_VERSION,
      engine,
      engineVersion,
      operatingSystem: `${platform()} ${release()} ${operatingSystemVersion()}`,
      architecture: arch(),
      node: process.version,
    }));

    await page.locator('[data-open-dialog]').click();
    await expect(page.locator('[data-replacement-dialog]')).toBeVisible();
    const released = await page.evaluate(() => window.__lifecycleLab.destroy());
    assert.deepEqual(released.resources, { listeners: 0, subscriptions: 0, requests: 0, infrastructure: 0 });
    assert.deepEqual(released.resourceReality, {
      eventTargetListeners: 0, storeSubscribers: 0, pendingRequests: 0, observedPulses: 0,
    });
    await expect(page.locator('[data-controls]')).toBeHidden();
    await expect(page.locator('[data-replacement-dialog]')).toBeHidden();
    await expect(page.locator('[data-replacement-dialog]')).not.toHaveAttribute('open', '');
    const stillReleased = await page.evaluate(() => {
      history.pushState({ lifecycleScenario: 'external-store' }, '', '#after-release');
      dispatchEvent(new PopStateEvent('popstate', { state: { lifecycleScenario: 'external-store' } }));
      return window.__lifecycleLab.controller.snapshot().phase;
    });
    assert.equal(stillReleased, 'released');

    await page.evaluate(async () => {
      const module = await import('/visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-lab.js');
      window.__lifecycleLab = module.enhanceLifecycleLab(document.querySelector('[data-lifecycle-lab]'));
    });
    await expect(page.locator('[data-controls]')).toBeVisible();
    await expect(page.locator('[data-resource-infrastructure]')).toHaveText('1');
    const before = await page.evaluate(() => history.length);
    await runScenario(page, 'external-store', true);
    const after = await page.evaluate(() => history.length);
    assert.equal(after, before + 1, 'one replacement owner handles one submitted observation');
    await page.locator('[data-release-reentry]').click();
    await expect(page.locator('[data-controls]')).toBeVisible();
    await expect(page.locator('[data-resource-infrastructure]')).toHaveText('1');
    await expect(page.locator('[data-status]')).toContainText('Release completed and a fresh lifecycle owner entered');
    const reentry = await page.evaluate(() => ({
      selectedScenario: document.querySelector('[name="scenario"]').value,
      faultSelected: document.querySelector('[name="injectFault"]').checked,
      faultLabel: document.querySelector('[data-fault-label]').textContent,
      locationHash: location.hash,
      historyScenario: history.state?.lifecycleScenario,
      historyFault: history.state?.injectFault,
      snapshot: window.__lifecycleLab.controller.snapshot(),
      heading: document.querySelector('[data-result-heading]').textContent,
      outcome: document.querySelector('[data-oracle-card]').dataset.outcome,
    }));
    assert.equal(reentry.selectedScenario, 'strict-replay');
    assert.equal(reentry.faultSelected, false);
    assert.equal(reentry.faultLabel, 'Retain the first setup resources');
    assert.equal(reentry.locationHash, '#scenario=strict-replay');
    assert.equal(reentry.historyScenario, 'strict-replay');
    assert.equal(reentry.historyFault, false);
    assert.equal(reentry.snapshot.scenario, 'strict-replay');
    assert.equal(reentry.snapshot.fault, null);
    assert.equal(reentry.snapshot.phase, 'mounted');
    assert.equal(reentry.heading, 'Ready for a lifecycle observation');
    assert.equal(reentry.outcome, 'pending');
    assertTelemetry(telemetry);
  });
}

test('Chromium: incomplete lifecycle successor preserves the responsive incumbent owner', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(async () => {
    const incumbent = window.__lifecycleLab;
    const before = incumbent.controller.snapshot();
    const heading = document.querySelector('[data-result-heading]');
    const parent = heading.parentNode;
    const next = heading.nextSibling;
    heading.remove();
    let message = '';
    try {
      const { enhanceLifecycleLab } = await import('/visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-lab.js');
      enhanceLifecycleLab(document.querySelector('[data-lifecycle-lab]'));
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    } finally {
      parent.insertBefore(heading, next);
    }
    return { message, beforeDestroyed: before.destroyed, after: incumbent.controller.snapshot() };
  });
  assert.match(observation.message, /\[data-result-heading\]/u);
  assert.equal(observation.beforeDestroyed, false);
  assert.equal(observation.after.destroyed, false);
  assert.equal(observation.after.phase, 'mounted');
  await runScenario(page, 'external-store');
  await expect(page.locator('[data-accepted-identity]')).toHaveText('external-store');
  await expect(page.locator('[data-oracle-card]')).toHaveAttribute('data-outcome', 'passed');
  assertTelemetry(telemetry);
});

test('Chromium: failed history admission releases the candidate and preserves the responsive incumbent', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  await runScenario(page, 'external-store');
  const observation = await page.evaluate(async () => {
    const incumbent = window.__lifecycleLab;
    const before = incumbent.controller.snapshot();
    const beforeUrl = location.href;
    const beforeHistoryState = structuredClone(history.state);
    const replaceState = history.replaceState.bind(history);
    let message = '';
    history.replaceState = () => { throw new Error('injected history admission failure'); };
    try {
      const { enhanceLifecycleLab } = await import('/visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-lab.js');
      enhanceLifecycleLab(document.querySelector('[data-lifecycle-lab]'));
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    } finally {
      history.replaceState = replaceState;
    }
    return {
      message,
      before,
      after: incumbent.controller.snapshot(),
      selectedScenario: document.querySelector('[name="scenario"]').value,
      faultSelected: document.querySelector('[name="injectFault"]').checked,
      url: location.href,
      historyState: history.state,
      jsState: document.querySelector('[data-lifecycle-lab]').dataset.jsState,
    };
  });
  assert.match(observation.message, /injected history admission failure/u);
  assert.equal(observation.before.destroyed, false);
  assert.equal(observation.after.destroyed, false);
  assert.equal(observation.after.phase, observation.before.phase);
  assert.deepEqual(observation.after.resources, observation.before.resources);
  assert.equal(observation.selectedScenario, 'external-store');
  assert.equal(observation.faultSelected, false);
  assert.equal(observation.url, server.origin + ROUTE + '#scenario=external-store');
  assert.equal(observation.historyState.lifecycleScenario, 'external-store');
  assert.equal(observation.jsState, 'enhanced');
  await runScenario(page, 'cache-reconcile');
  await expect(page.locator('[data-accepted-identity]')).toHaveText('server-cache');
  assertTelemetry(telemetry);
});

test('Chromium: incumbent retirement failure retains the admitted successor and visible recovery evidence', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const setup = await page.evaluate(() => {
    const incumbent = window.__lifecycleLab;
    window.__retiringLifecycleOwner = incumbent;
    incumbent.controller.own('infrastructure', 'injected retained predecessor resource', () => {
      throw new Error('Injected predecessor disposer failure.');
    });
    return { historyLength: history.length, ownerId: incumbent.ownerId };
  });
  await page.locator('[data-release-reentry]').click();
  const observation = await page.evaluate(() => {
    const incumbent = window.__retiringLifecycleOwner;
    const replacement = window.__lifecycleLab;
    return {
      incumbent: incumbent.controller.snapshot(),
      replacement: replacement.controller.snapshot(),
      retirement: replacement.retirementReceipt(),
      jsState: document.querySelector('[data-lifecycle-lab]').dataset.jsState,
      retirementStanding: document.querySelector('[data-lifecycle-lab]').dataset.retirementStanding,
    };
  });
  assert.equal(observation.incumbent.phase, 'release-failed');
  assert.equal(observation.incumbent.resources.infrastructure, 1);
  assert.equal(observation.replacement.destroyed, false);
  assert.equal(observation.replacement.phase, 'mounted');
  assert.equal(observation.jsState, 'enhanced');
  assert.equal(observation.retirementStanding, 'recovery-required');
  assert.equal(observation.retirement.standing, 'recovery-required');
  assert.equal(observation.retirement.currentOwner.standing, 'active');
  assert.equal(observation.retirement.failures.at(-1).ownerId, setup.ownerId);
  assert.equal(observation.retirement.failures.at(-1).resources.infrastructure, 1);
  assert.match(observation.retirement.failures.at(-1).message, /owned-resource failure/u);
  assert.equal(observation.retirement.recoveryRoute.action, 'retryRetirement');
  assert.equal(observation.retirement.recoveryRoute.ownerId, observation.retirement.currentOwner.id);
  await expect(page.locator('[data-retirement-recovery]')).toBeVisible();
  await expect(page.locator('[data-retirement-recovery]')).toContainText('retained 1 resource for recovery');
  await expect(page.locator('[data-status]')).toContainText('owns the current controls');
  await expect(page.locator('[data-status]')).not.toContainText('Release completed');

  await page.locator('[name="scenario"]').selectOption('external-store');
  await page.locator('[data-controls] button[type="submit"]').click();
  await expect(page.locator('[data-accepted-identity]')).toHaveText('external-store');
  await expect(page.locator('[data-oracle-card]')).toHaveAttribute('data-outcome', 'passed');
  assert.equal(await page.evaluate(() => history.length), setup.historyLength + 1,
    'one current owner records one in-page history entry');
  assert.equal(new URL(page.url()).pathname, ROUTE);
  await expect(page.locator('[data-retirement-recovery]')).toBeVisible();

  const terminal = await page.evaluate(() => {
    const api = window.__lifecycleLab;
    const snapshot = api.destroy();
    return { snapshot, receipt: api.retirementReceipt() };
  });
  assert.equal(terminal.snapshot.destroyed, true);
  assert.equal(terminal.receipt.currentOwner.standing, 'released');
  assert.equal(terminal.receipt.standing, 'recovery-required');
  assert.equal(terminal.receipt.recoveryRoute.action, 'retryRetirement');
  await expect(page.locator('[data-controls]')).toBeHidden();
  await expect(page.locator('[data-retirement-recovery]')).toBeVisible();
  await expect(page.locator('[data-retirement-recovery]')).toContainText('is released');
  await expect(page.locator('[data-retirement-recovery]')).not.toContainText('is active');
  assertTelemetry(telemetry);
});

test('Chromium: successful retirement retry replaces only its own recovery status with settled evidence', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const setup = await page.evaluate(() => {
    const incumbent = window.__lifecycleLab;
    window.__retiringLifecycleOwner = incumbent;
    window.__retirementDisposalAttempts = 0;
    incumbent.controller.own('infrastructure', 'fail-once predecessor resource', () => {
      window.__retirementDisposalAttempts += 1;
      if (window.__retirementDisposalAttempts === 1) {
        throw new Error('Injected fail-once predecessor disposer failure.');
      }
    });
    return { ownerId: incumbent.ownerId };
  });

  await page.locator('[data-release-reentry]').click();
  await expect(page.locator('[data-retirement-recovery]')).toBeVisible();
  await expect(page.locator('[data-status]')).toContainText('Call retryRetirement()');

  const recovered = await page.evaluate(() => {
    const replacement = window.__lifecycleLab;
    const receipt = replacement.retryRetirement();
    return {
      receipt,
      attempts: window.__retirementDisposalAttempts,
      predecessor: window.__retiringLifecycleOwner.controller.snapshot(),
      standing: document.querySelector('[data-lifecycle-lab]').dataset.retirementStanding ?? null,
      status: document.querySelector('[data-status]').textContent,
      noticeHidden: document.querySelector('[data-retirement-recovery]').hidden,
    };
  });

  assert.equal(recovered.attempts, 2);
  assert.equal(recovered.predecessor.destroyed, true);
  assert.equal(recovered.receipt.standing, 'settled');
  assert.equal(recovered.receipt.currentOwner.standing, 'active');
  assert.equal(recovered.receipt.failures.length, 0);
  assert.equal(recovered.receipt.recoveryRoute, null);
  assert.equal(recovered.standing, null);
  assert.equal(recovered.noticeHidden, true);
  assert.match(recovered.status, /Prior-owner cleanup settled/u);
  assert.match(recovered.status, new RegExp(`${recovered.receipt.currentOwner.id} continues as the active owner\\.`));
  assert.doesNotMatch(recovered.status, /retryRetirement|retained \d+ resources? for recovery/u);
  assert.notEqual(recovered.receipt.currentOwner.id, setup.ownerId);
  assertTelemetry(telemetry);
});

test('Chromium: successful retirement retry preserves a newer interaction status', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  await page.evaluate(() => {
    let attempts = 0;
    window.__lifecycleLab.controller.own('infrastructure', 'fail-once predecessor resource', () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Injected fail-once predecessor disposer failure.');
    });
  });

  await page.locator('[data-release-reentry]').click();
  await expect(page.locator('[data-status]')).toContainText('Call retryRetirement()');
  await page.locator('[name="scenario"]').selectOption('external-store');
  const interactionStatus = await page.locator('[data-status]').textContent();
  assert.match(interactionStatus, /Coherent external-store snapshot selected/u);

  const recovered = await page.evaluate(() => {
    const receipt = window.__lifecycleLab.retryRetirement();
    return {
      receipt,
      status: document.querySelector('[data-status]').textContent,
      noticeHidden: document.querySelector('[data-retirement-recovery]').hidden,
    };
  });

  assert.equal(recovered.receipt.standing, 'settled');
  assert.equal(recovered.receipt.failures.length, 0);
  assert.equal(recovered.noticeHidden, true);
  assert.equal(recovered.status, interactionStatus);
  assert.doesNotMatch(recovered.status, /cleanup settled|retryRetirement|retained \d+ resources? for recovery/u);
  assertTelemetry(telemetry);
});

test('Chromium: retirement recovery stays with the active successor across repeated re-entry', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const owner1 = await page.evaluate(() => {
    const incumbent = window.__lifecycleLab;
    window.__retirementDisposalAttempts = 0;
    incumbent.controller.own('infrastructure', 'fail-once predecessor resource', () => {
      window.__retirementDisposalAttempts += 1;
      if (window.__retirementDisposalAttempts === 1) {
        throw new Error('Injected fail-once predecessor disposer failure.');
      }
    });
    return incumbent.ownerId;
  });

  await page.locator('[data-release-reentry]').click();
  const owner2 = await page.evaluate(() => {
    window.__staleLifecycleOwner = window.__lifecycleLab;
    return window.__staleLifecycleOwner.ownerId;
  });
  await expect(page.locator('[data-retirement-recovery]')).toBeVisible();
  await page.locator('[data-release-reentry]').click();

  const staleAttempt = await page.evaluate(() => {
    const active = window.__lifecycleLab;
    const staleResult = window.__staleLifecycleOwner.retryRetirement();
    return {
      activeOwnerId: active.ownerId,
      activeReceipt: active.retirementReceipt(),
      attempts: window.__retirementDisposalAttempts,
      noticeHidden: document.querySelector('[data-retirement-recovery]').hidden,
      staleResult,
      status: document.querySelector('[data-status]').textContent,
    };
  });

  assert.notEqual(staleAttempt.activeOwnerId, owner1);
  assert.notEqual(staleAttempt.activeOwnerId, owner2);
  assert.equal(staleAttempt.staleResult.standing, 'inactive');
  assert.equal(staleAttempt.staleResult.activeOwnerId, staleAttempt.activeOwnerId);
  assert.equal(staleAttempt.staleResult.recoveryRoute, null);
  assert.equal(staleAttempt.attempts, 1);
  assert.equal(staleAttempt.activeReceipt.standing, 'recovery-required');
  assert.equal(staleAttempt.activeReceipt.failures.length, 1);
  assert.equal(staleAttempt.activeReceipt.failures[0].ownerId, owner1);
  assert.equal(staleAttempt.noticeHidden, false);
  assert.match(staleAttempt.status, /Call retryRetirement\(\)/u);

  const recovered = await page.evaluate(() => {
    const active = window.__lifecycleLab;
    const receipt = active.retryRetirement();
    return {
      attempts: window.__retirementDisposalAttempts,
      noticeHidden: document.querySelector('[data-retirement-recovery]').hidden,
      receipt,
      status: document.querySelector('[data-status]').textContent,
    };
  });

  assert.equal(recovered.attempts, 2);
  assert.equal(recovered.receipt.standing, 'settled');
  assert.equal(recovered.receipt.failures.length, 0);
  assert.equal(recovered.noticeHidden, true);
  assert.match(recovered.status, /Prior-owner cleanup settled/u);
  assert.doesNotMatch(recovered.status, /retryRetirement|retained \d+ resources? for recovery/u);
  assertTelemetry(telemetry);
});

test('Chromium: same-root re-entry keeps a released async owner outside DOM and history', async t => {
  const { page, telemetry } = await openLab(t, 'chromium');
  const observation = await page.evaluate(async () => {
    const incumbent = window.__lifecycleLab;
    const { enhanceLifecycleLab } = await import('/visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-lab.js');
    const scenario = document.querySelector('[name="scenario"]');
    scenario.value = 'entity-replacement';
    const historyLength = history.length;
    const pending = incumbent.runSelected();
    const replacement = enhanceLifecycleLab(document.querySelector('[data-lifecycle-lab]'));
    window.__lifecycleLab = replacement;
    await pending;
    await Promise.resolve();
    return {
      incumbent: incumbent.controller.snapshot(),
      replacement: replacement.controller.snapshot(),
      historyLengthBefore: historyLength,
      historyLengthAfter: history.length,
      historyScenario: history.state?.lifecycleScenario,
      locationHash: location.hash,
      selectedScenario: scenario.value,
      acceptedIdentity: document.querySelector('[data-accepted-identity]').textContent,
      heading: document.querySelector('[data-result-heading]').textContent,
      phase: document.querySelector('[data-lifecycle-lab]').dataset.lifecyclePhase,
    };
  });
  assert.equal(observation.incumbent.destroyed, true);
  assert.equal(observation.replacement.destroyed, false);
  assert.equal(observation.replacement.phase, 'mounted');
  assert.equal(observation.historyLengthAfter, observation.historyLengthBefore);
  assert.equal(observation.historyScenario, 'strict-replay');
  assert.equal(observation.locationHash, '#scenario=strict-replay');
  assert.equal(observation.selectedScenario, 'strict-replay');
  assert.equal(observation.acceptedIdentity, 'entity-a');
  assert.equal(observation.heading, 'Ready for a lifecycle observation');
  assert.equal(observation.phase, 'mounted');
  await runScenario(page, 'external-store');
  await expect(page.locator('[data-accepted-identity]')).toHaveText('external-store');
  assertTelemetry(telemetry);
});

test('Chromium: a server and client contract mismatch retains the static reading before resource acquisition', async t => {
  const context = await browsers.get('chromium').newContext({ viewport: { width: 1280, height: 1000 } });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const telemetry = monitor(page);
  await page.route(server.origin + ROUTE, async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      'data-lifecycle-contract="lifecycle-contract@0.1.0"',
      'data-lifecycle-contract="lifecycle-contract@0.0.9"',
    );
    await route.fulfill({ response, body });
  });
  await page.goto(server.origin + ROUTE, { waitUntil: 'load' });
  await expect(page.locator('[data-lifecycle-lab]')).toHaveAttribute('data-js-state', 'initialization-paused');
  await expect(page.locator('[data-initialization-error]')).toBeVisible();
  await expect(page.locator('[data-initialization-error]')).toContainText(
    'server lifecycle-contract@0.0.9; client lifecycle-contract@0.1.0',
  );
  await expect(page.locator('[data-controls]')).toBeHidden();
  await expect(page.locator('[data-evidence-field]')).toBeHidden();
  await expect(page.locator('[data-behavior-stage]')).toBeHidden();
  await expect(page.locator('[data-static-reading]')).toBeVisible();
  assert.equal(await page.evaluate(() => typeof window.__lifecycleLab), 'undefined');

  await page.evaluate(async () => {
    document.documentElement.dataset.lifecycleContract = 'lifecycle-contract@0.1.0';
    const { enhanceLifecycleLab } = await import('/visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-lab.js');
    window.__lifecycleLab = enhanceLifecycleLab(document.querySelector('[data-lifecycle-lab]'));
  });
  await expect(page.locator('[data-controls]')).toBeVisible();
  await expect(page.locator('[data-resource-listeners]')).toHaveText('1');
  await expect(page.locator('[data-resource-subscriptions]')).toHaveText('1');
  await expect(page.locator('[data-resource-infrastructure]')).toHaveText('1');
  assertTelemetry(telemetry);
});

test('Chromium: CSP and sandbox policies enforce the declared standalone and embedded boundaries', async t => {
  const { page } = await openLab(t, 'chromium');
  assert.equal(await page.locator('iframe').evaluate(node => node.contentDocument === null), true,
    'the sandboxed document carries an opaque origin from the parent document perspective');
  const parentRan = await page.evaluate(async () => {
    const script = document.createElement('script');
    script.textContent = 'document.documentElement.dataset.inlineProbe = "ran"';
    document.head.append(script);
    await new Promise(resolve => setTimeout(resolve, 0));
    return document.documentElement.dataset.inlineProbe ?? 'blocked';
  });
  assert.equal(parentRan, 'blocked');

  const standalone = await page.context().newPage();
  await standalone.goto(server.origin + '/visual-fidelity-contracts/labs/lifecycle-lab/sandbox-specimen.html', { waitUntil: 'load' });
  const standaloneRan = await standalone.evaluate(async () => {
    const script = document.createElement('script');
    script.textContent = 'document.documentElement.dataset.inlineProbe = "ran"';
    document.head.append(script);
    await new Promise(resolve => setTimeout(resolve, 0));
    return document.documentElement.dataset.inlineProbe ?? 'blocked';
  });
  assert.equal(standaloneRan, 'blocked');
  await standalone.close();
});

test('Chromium: enlarged text, alternate media, and the controlled SVG collision remain distinguishable', async t => {
  const { page, telemetry } = await openLab(t, 'chromium', { width: 320, reducedMotion: 'no-preference' });
  assertCustomSelectPresentation(
    await inspectSelectPresentation(page, ['#lifecycle-scenario']),
    'lifecycle lab ordinary colors',
  );
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assertLabelsLeadControls(
    await inspectLabelControlLayout(page, ['#lifecycle-scenario']),
    'lifecycle lab at 320px and 200% text',
  );
  const geometry = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    tableScroll: document.querySelector('.table-region').scrollWidth > document.querySelector('.table-region').clientWidth,
  }));
  assert.ok(geometry.scroll <= geometry.client + 1, `enlarged page owns local overflow (${JSON.stringify(geometry)})`);
  assert.equal(geometry.tableScroll, true);

  await runScenario(page, 'svg-identities', true);
  const ids = await page.locator('[data-svg-pair] [id]').evaluateAll(nodes => nodes.map(node => node.id));
  assert.ok(new Set(ids).size < ids.length, 'controlled fault creates a detectable document-ID collision');
  await expect(page.locator('[data-oracle-card]')).toHaveAttribute('data-outcome', 'fault');

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(page.locator('[data-controls]')).toBeVisible();
  assertForcedColorsSelectPresentation(
    await inspectSelectPresentation(page, ['#lifecycle-scenario']),
    'lifecycle lab forced colors',
  );
  const transition = await page.locator('[data-controls] button').first().evaluate(node => getComputedStyle(node).transitionDuration);
  assert.equal(transition, '0s');
  await page.emulateMedia({ media: 'print', forcedColors: 'none', reducedMotion: 'reduce' });
  await expect(page.locator('[data-controls]')).toBeHidden();
  await expect(page.locator('[data-static-reading]')).toBeVisible();
  assert.equal(await page.locator('[data-static-reading] details').nth(1).locator('p').first().evaluate(node => node.checkVisibility()), true,
    'print reveals the reading inside a screen-collapsed disclosure');
  await expect(page.locator('.receipt')).toBeVisible();
  assertTelemetry(telemetry);
});
