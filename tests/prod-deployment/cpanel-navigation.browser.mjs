import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { chromium, expect } from '@playwright/test';
import { browserLaunchOptions, startStaticServer } from '../../tools/core-architecture-browser-helper.mjs';

const catalog = '/showcase/';
const catalogCanonical = 'https://vik.guru/showcase/';
const cases = ['/multilingual-clinical-vocabulary-practice/', '/recoverable-enterprise-forms/'];

test('printed links, Showcase previews and the About Studio work from the built cPanel root', async t => {
  const root = path.resolve(process.argv[2] ?? '.prod-projection-build/primary-public');
  await access(path.join(root, 'index.html')).catch(cause => {
    throw new Error('Build the production projection first, or pass its primary-public directory.', { cause });
  });
  const server = await startStaticServer(root);
  const browser = await chromium.launch(browserLaunchOptions()).catch(async error => {
    await server.close();
    throw error;
  });
  t.after(async () => {
    try { await browser.close(); } finally { await server.close(); }
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route(/^https:\/\//, route => route.abort());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === server.origin && response.status() >= 400) {
      errors.push(`${response.status()} ${url.pathname}`);
    }
  });

  const entry = await page.goto(server.origin + '/showcase?ref=cv#main-content', { waitUntil: 'domcontentloaded' });
  assert.equal(entry.status(), 200);
  assert.equal(page.url(), server.origin + catalog + '?ref=cv#main-content');
  await expect(page.locator(':target')).toHaveAttribute('id', 'main-content');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', catalogCanonical);

  for (const legacy of ['/debriefs', '/debriefs/', '/debriefs.html']) {
    const response = await page.request.get(server.origin + legacy + '?ref=cv');
    assert.equal(response.status(), 200, legacy);
    assert.equal(new URL(response.url()).search, '?ref=cv', legacy);
    const canonical = await page.evaluate(html => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      return document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    }, await response.text());
    assert.equal(canonical, catalogCanonical, legacy);
  }

  const preview = page.locator('[data-debrief-preview]');
  for (const destination of cases) {
    const linkSelector = `a[href="${destination}"]`;
    const card = page.locator('.debrief-catalog__card').filter({ has: page.locator(linkSelector) });
    await card.locator(linkSelector).first().focus();
    const image = preview.locator('[data-preview-image]');
    await expect(preview.locator('[data-preview-image-link]')).toHaveAttribute('href', destination);
    await expect(preview.locator('[data-preview-link]')).toHaveAttribute('href', destination);
    const source = await card.getAttribute('data-catalog-preview-src');
    assert.ok(source, destination);
    await expect(image).toHaveAttribute('src', source);
    await image.evaluate(element => element.decode());
    assert.ok(await image.evaluate(element => element.naturalWidth > 0), destination);
  }

  await preview.locator('[data-preview-image-link]').click();
  await expect(page).toHaveURL(server.origin + cases.at(-1));
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Case Studies & Articles', exact: true })).toHaveAttribute('href', catalog);
  await footer.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(server.origin + '/');
  await expect(page.locator('[data-native-coordination]')).toHaveAttribute('data-native-ready', 'true');
  await expect(
    page.locator('.about-route-grid a').filter({ hasText: 'Reusable agent skills · Driftframe Studios' }),
  ).toHaveAttribute('href', 'https://schemas.radiantnull.com/skills/');
  await expect(
    page.locator('footer').getByRole('link', { name: "View the author's professional profile", exact: true }),
  ).toHaveAttribute('href', 'https://github.com/driftframestudios');
  assert.deepEqual(errors, []);
});
