import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit, expect } from '@playwright/test';

const ENGINES = Object.freeze({ chromium, firefox, webkit });
const ABOUT_ROUTE = '/context-canvas-project-surface/context-canvas/index.html';
const PANEL = '[data-native-coordination]';
const MODULE_ROOT = '/collaboration/native-investment-studio/';

function validateSettings(settings, fixtures) {
  assert.deepEqual(settings.engines, Object.keys(ENGINES));
  assert.equal(settings.runs, 5);
  assert.equal(settings.warmupPairs, 20);
  assert.equal(settings.measuredPairs, 50);
  assert.equal(settings.noOpSamples, 100);
  assert.equal(settings.profiles.length, 2);
  for (const profile of settings.profiles) {
    assert.match(profile.id, /^[a-z]+$/u);
    assert.ok(Number.isSafeInteger(profile.width) && profile.width >= 320 && profile.width <= 1920);
    assert.ok(Number.isSafeInteger(profile.height) && profile.height >= 600 && profile.height <= 1200);
  }
  assert.deepEqual(fixtures.map(fixture => fixture.id), ['example', 'medium', 'caps', 'near-byte']);
  for (const fixture of fixtures) {
    for (const minutes of [30, 45]) assert.ok(Number.isSafeInteger(fixture.expectedByMinutes[minutes].cents));
  }
}

async function fixtureMarkup(sourceRoot) {
  const about = await readFile(resolve(sourceRoot, ABOUT_ROUTE.slice(1)), 'utf8');
  const objectSource = 'data="../img/plot/about_prompt_conditions_cartography.svg"';
  const closed = about.match(/<details class="about-prompt-static">([\s\S]*?)<\/details>/u)?.[1];
  assert.ok(closed?.includes(objectSource));
  assert.equal(about.split(objectSource).length, 2);
  // Match the accepted native-panel regression fixture: the separate closed
  // diagram keeps its fallback link while its object navigation remains at rest.
  return about.replace(objectSource, 'data-fixture-object-source="../img/plot/about_prompt_conditions_cartography.svg"');
}

async function openReceiver(browser, profile, fixture, environment) {
  const { server, markup, monitor } = environment;
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const telemetry = monitor(page);
  const requests = new Set();
  page.on('request', request => requests.add(request));
  page.on('requestfinished', request => requests.delete(request));
  page.on('requestfailed', request => requests.delete(request));
  await page.route('**/*', request => {
    const url = new URL(request.request().url());
    if (url.origin === server.origin && url.pathname === ABOUT_ROUTE) {
      return request.fulfill({ status: 200, contentType: 'text/html', body: markup });
    }
    return url.origin === server.origin ? request.continue()
      : request.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Separate instrument owner</title>' });
  });
  try {
    await page.goto(server.origin + ABOUT_ROUTE, { waitUntil: 'load' });
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => {
      image.loading = 'eager';
      return image.decode();
    })));
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(PANEL)).toHaveAttribute('data-native-ready', 'true');
    await expect.poll(() => requests.size).toBe(0);
    await page.evaluate(async ({ plan, workId, moduleRoot }) => {
      const { mountCoordinationPanel } = await import(`${moduleRoot}controller.mjs`);
      const { createStudio } = await import(`${moduleRoot}state.mjs`);
      const root = document.querySelector('[data-native-coordination]');
      mountCoordinationPanel(root).dispose();
      const form = root.querySelector('form');
      const settings = root.querySelector('[data-native-configure]');
      const trackedTargets = new Set([root, form, settings, window]);
      const ownedListeners = [];
      const originalAdd = EventTarget.prototype.addEventListener;
      const originalRemove = EventTarget.prototype.removeEventListener;
      function withListenerAccounting(operation) {
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if (trackedTargets.has(this)) ownedListeners.push({ target: this, type, listener, capture: Boolean(typeof options === 'boolean' ? options : options?.capture) });
          return originalAdd.call(this, type, listener, options);
        };
        EventTarget.prototype.removeEventListener = function(type, listener, options) {
          const capture = Boolean(typeof options === 'boolean' ? options : options?.capture);
          const index = ownedListeners.findIndex(item => item.target === this && item.type === type && item.listener === listener && item.capture === capture);
          if (index >= 0) ownedListeners.splice(index, 1);
          return originalRemove.call(this, type, listener, options);
        };
        try { return operation(); }
        finally {
          EventTarget.prototype.addEventListener = originalAdd;
          EventTarget.prototype.removeEventListener = originalRemove;
        }
      }
      const studio = createStudio(plan);
      const counts = { previewPreparations: 0, acceptedPreparations: 0, acceptedCommits: 0 };
      let current = null;
      let lastPreview = null;
      let action = null;
      const pendingFrames = new Set();
      const records = [];
      const textEncoder = new TextEncoder();
      const adapter = Object.freeze({
        ...studio,
        previewWork(...args) {
          const start = performance.now();
          const result = studio.previewWork(...args);
          const elapsed = performance.now() - start;
          counts.previewPreparations += 1;
          if (result.ok) lastPreview = result.projection;
          if (current) {
            current.modelMs += elapsed;
            if (result.ok) current.serialized.push(result.projection.serialized);
          }
          return result;
        },
        updateWork(...args) {
          const before = studio.read();
          const start = performance.now();
          const result = studio.updateWork(...args);
          const elapsed = performance.now() - start;
          counts.acceptedPreparations += 1;
          if (studio.read() !== before) counts.acceptedCommits += 1;
          if (current) {
            current.modelMs += elapsed;
            if (result.ok) current.serialized.push(result.projection.serialized);
          }
          return result;
        },
      });
      const receiver = withListenerAccounting(() => mountCoordinationPanel(root, { studio: adapter, workId }));
      const listenersAfterMount = ownedListeners.length;
      const acceptedAtProbe = studio.read();
      const previewBeforeProbe = counts.previewPreparations;
      for (let index = 0; index < 10; index += 1) receiver.refresh();
      const cacheProbe = {
        unchangedRefreshes: 10,
        previewPreparations: counts.previewPreparations - previewBeforeProbe,
        acceptedIdentityRetained: studio.read() === acceptedAtProbe,
      };
      const observer = new MutationObserver(() => {});
      observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
      function capture(event) {
        if (!action) return;
        const actionType = event.type === 'submit' ? 'apply' : 'input';
        if (actionType !== action.kind) return;
        if (actionType === 'input' && event.target.name !== 'minutesPerSession') return;
        if (event.type === 'submit' && event.target !== form) return;
        if (current || action.events.length >= 16) throw new Error('The bounded event observation received an unexpected sequence.');
        observer.takeRecords();
        current = {
          type: event.type, trusted: event.isTrusted, before: { ...counts },
          modelMs: 0, serialized: [], start: performance.now(),
        };
      }
      function bubble(event) {
        if (!current || current.type !== event.type) return;
        const end = performance.now();
        const sample = current;
        current = null;
        sample.handlerMs = end - sample.start;
        sample.rawReceiverRemainderMs = sample.handlerMs - sample.modelMs;
        sample.residualClamped = sample.rawReceiverRemainderMs < 0;
        sample.receiverRemainderMs = Math.max(0, sample.rawReceiverRemainderMs);
        sample.domMutationRecords = observer.takeRecords().length;
        for (const key of Object.keys(counts)) sample[key] = counts[key] - sample.before[key];
        delete sample.before;
        action.events.push(sample);
        action.frames.push(new Promise(resolve => {
          const frame = requestAnimationFrame(() => {
            sample.nextFrameOpportunityMs = performance.now() - sample.start;
            pendingFrames.delete(frame);
            delete sample.start;
            resolve();
          });
          pendingFrames.add(frame);
        }));
      }
      const eventTypes = ['input', 'compositionstart', 'compositionend', 'submit'];
      for (const type of eventTypes) {
        root.addEventListener(type, capture, true);
        root.addEventListener(type, bubble);
      }
      const noOpMs = [];
      const calibration = document.createElement('span');
      for (let index = 0; index < 100; index += 1) {
        const event = new Event('native-study-noop');
        const start = performance.now();
        calibration.dispatchEvent(event);
        noOpMs.push(performance.now() - start);
      }
      const clockStepsMs = [];
      let previous = performance.now();
      for (let index = 0; index < 1000; index += 1) {
        const now = performance.now();
        if (now > previous) clockStepsMs.push(now - previous);
        previous = now;
      }
      const initialDomElements = root.querySelectorAll('*').length;
      window.__nativeStudy = {
        calibration: { noOpMs, clockStepsMs, listenersAfterMount, cacheProbe, initialDomElements },
        beginObservation(kind) {
          if (action || current || pendingFrames.size) throw new Error('Settle the previous action before arming another.');
          action = { kind, events: [], frames: [], acceptedBefore: studio.read() };
          observer.takeRecords();
        },
        async take(expectedKind) {
          if (!action || action.kind !== expectedKind || !action.events.length) throw new Error(`No ${expectedKind} event reached the controller.`);
          const completed = action;
          await Promise.all(completed.frames);
          const events = completed.events;
          // All event and rendering-opportunity clocks have settled before encoding.
          for (const event of events) {
            event.producedUtf8Bytes = event.serialized.reduce((total, serialized) => total + textEncoder.encode(serialized).byteLength, 0);
            delete event.serialized;
          }
          const sum = key => events.reduce((total, event) => total + event[key], 0);
          const sample = {
            kind: expectedKind, trusted: events.every(event => event.trusted),
            handlerMs: sum('handlerMs'), modelMs: sum('modelMs'),
            rawReceiverRemainderMs: sum('rawReceiverRemainderMs'),
            receiverRemainderMs: sum('receiverRemainderMs'), residualClamped: events.some(event => event.residualClamped),
            nextFrameOpportunityMs: Math.max(...events.map(event => event.nextFrameOpportunityMs)),
            previewPreparations: sum('previewPreparations'), acceptedPreparations: sum('acceptedPreparations'),
            acceptedCommits: sum('acceptedCommits'), producedUtf8Bytes: sum('producedUtf8Bytes'),
            domMutationRecords: sum('domMutationRecords'), eventCounts: {}, events,
            acceptedIdentityRetained: studio.read() === completed.acceptedBefore,
            acceptedCents: studio.read().result.knownCommitmentCents,
            previewCents: lastPreview?.result.knownCommitmentCents ?? null,
          };
          for (const event of events) sample.eventCounts[event.type] = (sample.eventCounts[event.type] ?? 0) + 1;
          action = null;
          records.push(sample);
          return sample;
        },
        read() {
          return { cents: studio.read().result.knownCommitmentCents, revision: studio.read().state.revision,
            domElements: root.querySelectorAll('*').length, listeners: ownedListeners.length,
            pendingFrames: pendingFrames.size,
            totalText: root.querySelector('[data-native-total]').textContent,
            previewText: root.querySelector('[data-native-preview-total]').textContent };
        },
        records,
        dispose() {
          action = null;
          for (const frame of pendingFrames) cancelAnimationFrame(frame);
          pendingFrames.clear();
          observer.disconnect();
          for (const type of eventTypes) {
            root.removeEventListener(type, capture, true);
            root.removeEventListener(type, bubble);
          }
          withListenerAccounting(() => receiver.dispose());
          return { listeners: ownedListeners.length, pendingFrames: pendingFrames.size,
            acceptedCents: studio.read().result.knownCommitmentCents };
        },
      };
    }, { plan: fixture.plan, workId: fixture.workId, moduleRoot: MODULE_ROOT });
    return { context, page, telemetry, settle: () => expect.poll(() => requests.size).toBe(0) };
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function closeReceiver(receiver, assertTelemetry) {
  try {
    await receiver.settle();
    const cleanup = await receiver.page.evaluate(() => window.__nativeStudy.dispose());
    assert.deepEqual({ listeners: cleanup.listeners, pendingFrames: cleanup.pendingFrames }, { listeners: 0, pendingFrames: 0 });
    assertTelemetry(receiver.telemetry);
    return cleanup;
  } finally { await receiver.context.close(); }
}

async function performPair(page, minutes, expectedCents, { observe = false, pointerApply = false } = {}) {
  const input = page.locator(`${PANEL} [name="minutesPerSession"]`);
  if (observe) await page.evaluate(() => window.__nativeStudy.beginObservation('input'));
  await input.fill(String(minutes));
  const entered = observe ? await page.evaluate(() => window.__nativeStudy.take('input')) : null;
  if (entered) {
    assert.equal(entered.trusted, true);
    assert.equal(entered.acceptedIdentityRetained, true);
    assert.equal(entered.previewCents, expectedCents);
    assert.equal(entered.previewPreparations, 1);
    assert.equal(entered.acceptedCommits, 0);
  }
  if (observe) await page.evaluate(() => window.__nativeStudy.beginObservation('apply'));
  if (pointerApply) await page.locator(`${PANEL} [data-action="apply"]`).click();
  else await input.press('Enter');
  const applied = observe ? await page.evaluate(() => window.__nativeStudy.take('apply')) : null;
  if (applied) {
    assert.equal(applied.trusted, true);
    assert.equal(applied.acceptedCents, expectedCents);
    assert.equal(applied.acceptedCommits, 1);
    assert.equal(applied.acceptedPreparations, 1);
    assert.equal(applied.previewPreparations, 1);
  }
  const state = await page.evaluate(() => window.__nativeStudy.read());
  assert.equal(state.cents, expectedCents);
  await expect(page.locator(`${PANEL} [data-action="apply"]`)).toBeFocused();
  return { entered, applied, state };
}

async function smoke(browser, engine, profile, fixture, environment) {
  const receiver = await openReceiver(browser, profile, fixture, environment);
  const { page } = receiver;
  let result;
  try {
    const pair = await performPair(page, 45, fixture.expectedByMinutes[45].cents, { observe: true, pointerApply: true });
    // The separate Cancel task uses the same accepted owner and stays outside timing.
    const input = page.locator(`${PANEL} [name="minutesPerSession"]`);
    await input.fill('-1');
    await page.locator(`${PANEL} [data-action="cancel"]`).click();
    await expect(page.locator(`${PANEL} [data-native-configure] > summary`)).toBeFocused();
    await page.locator(`${PANEL} [data-native-configure] > summary`).click();
    await input.scrollIntoViewIfNeeded();
    const box = await input.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 260);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 20);
    assert.equal((await page.evaluate(() => window.__nativeStudy.read())).cents, fixture.expectedByMinutes[45].cents);
    result = { engine, profile: profile.id, trustedInput: pair.entered.trusted, trustedSubmit: pair.applied.trusted,
      pointerApply: true, cancelFocus: true, documentScroll: true, expectedCents: fixture.expectedByMinutes[45].cents };
  } finally { await closeReceiver(receiver, environment.assertTelemetry); }
  return result;
}

/** Sequential local observation; the caller freezes and reviews protocol/source first. */
export async function runBrowserStudy({ sourceRoot, outputDirectory, protocol, fixtures, mode = 'measure', onProgress = () => {} }) {
  assert.ok(['measure', 'smoke-only'].includes(mode));
  const settings = protocol.browser;
  validateSettings(settings, fixtures);
  await mkdir(outputDirectory, { recursive: true });
  const helper = await import(pathToFileURL(resolve(sourceRoot, 'tools/core-architecture-browser-helper.mjs')).href);
  const markup = await fixtureMarkup(sourceRoot);
  const server = await helper.startStaticServer(sourceRoot);
  const environment = { server, markup, monitor: helper.monitor, assertTelemetry: helper.assertTelemetry };
  const versions = {};
  const smokeResults = [];
  const runs = [];
  try {
    for (const engine of settings.engines) {
      let browser;
      try { browser = await ENGINES[engine].launch({ headless: true }); }
      catch (error) {
        await writeFile(resolve(outputDirectory, `launch-${engine}.json`), JSON.stringify({ engine, standing: 'incomplete', phase: 'launch', failure: { name: error.name, message: error.message } }, null, 2) + '\n', { flag: 'wx' });
        throw error;
      }
      versions[engine] = browser.version();
      try {
        for (const profile of settings.profiles) {
          let smokeRecord = { engine, profile: profile.id, standing: 'incomplete', phase: 'setup-or-behavior' };
          try {
            smokeRecord = { ...await smoke(browser, engine, profile, fixtures[0], environment), standing: 'complete' };
            smokeResults.push(smokeRecord);
          } catch (error) { smokeRecord.failure = { name: error.name, message: error.message }; throw error; }
          finally { await writeFile(resolve(outputDirectory, `smoke-${engine}-${profile.id}.json`), JSON.stringify(smokeRecord, null, 2) + '\n', { flag: 'wx' }); }
          if (mode === 'smoke-only') { onProgress({ engine, profile: profile.id, smoke: 'complete' }); continue; }
          for (const fixture of fixtures) {
            for (let run = 1; run <= settings.runs; run += 1) {
              const id = `${engine}-${profile.id}-${fixture.id}-${run}`;
              let receiver;
              const record = { id, engine, browserVersion: versions[engine], profile, fixture: fixture.id, run,
                sourceRevision: protocol.sourceCommit, standing: 'incomplete', inputPolicy: 'trusted-fill-and-enter', eventAggregation: 'sum-of-owned-event-spans',
                renderOpportunityAggregation: 'maximum-event-delay-within-action',
                reducedMotion: 'reduce', locale: 'en-US', timezone: 'UTC', deviceScaleFactor: 1,
                warmupPairs: settings.warmupPairs, measuredPairs: settings.measuredPairs, samples: [] };
              await writeFile(resolve(outputDirectory, `${id}.start.json`), JSON.stringify({ id, engine, profile: profile.id, fixture: fixture.id, run, standing: 'started', sourceRevision: protocol.sourceCommit }, null, 2) + '\n', { flag: 'wx' });
              try {
                receiver = await openReceiver(browser, profile, fixture, environment);
                const { page } = receiver;
                record.calibration = await page.evaluate(() => window.__nativeStudy.calibration);
                assert.equal(record.calibration.listenersAfterMount, 8);
                assert.deepEqual(record.calibration.cacheProbe, { unchangedRefreshes: 10, previewPreparations: 0, acceptedIdentityRetained: true });
                for (let iteration = 0; iteration < settings.warmupPairs; iteration += 1) {
                  const minutes = iteration % 2 === 0 ? 45 : 30;
                  await performPair(page, minutes, fixture.expectedByMinutes[minutes].cents);
                }
                record.afterWarmup = await page.evaluate(() => window.__nativeStudy.read());
                for (let iteration = 0; iteration < settings.measuredPairs; iteration += 1) {
                  const minutes = iteration % 2 === 0 ? 45 : 30;
                  const pair = await performPair(page, minutes, fixture.expectedByMinutes[minutes].cents, { observe: true });
                  record.samples.push({ ...pair.entered, iteration }, { ...pair.applied, iteration });
                }
                record.afterMeasurement = await page.evaluate(() => window.__nativeStudy.read());
                assert.equal(record.afterMeasurement.domElements, record.afterWarmup.domElements);
                assert.equal(record.afterMeasurement.listeners, 8);
                assert.equal(record.afterMeasurement.pendingFrames, 0);
                assert.equal(record.samples.length, settings.measuredPairs * 2);
                record.standing = 'complete';
              } catch (error) {
                record.failure = { name: error.name, message: error.message };
                throw error;
              } finally {
                try { if (receiver) record.cleanup = await closeReceiver(receiver, helper.assertTelemetry); }
                catch (error) { record.standing = 'incomplete'; record.cleanupFailure = { name: error.name, message: error.message }; throw error; }
                finally { await writeFile(resolve(outputDirectory, `${id}.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); }
              }
              runs.push(record);
              onProgress({ engine, profile: profile.id, fixture: fixture.id, run, completedRuns: runs.length });
            }
          }
        }
      } finally { await browser.close(); }
    }
  } finally { await server.close(); }
  return { versions, smoke: smokeResults, runs };
}
