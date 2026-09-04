import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  artifactAuthor,
  artifactAttribution,
  artifactLicense,
} from "./attribution-contract.mjs";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const coreProjections = [
  {
    label: "Core source",
    root: "core-architectures-chimeric-prototype-current-pack-v0.1"
  },
  {
    label: "Context projection",
    root: "context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1"
  }
];

export async function startStaticServer(contentRoot = repositoryRoot) {
  const root = resolve(contentRoot);
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8"
  };
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const absolutePath = resolve(root, `.${pathname}`);
      const repositoryPath = relative(root, absolutePath);
      if (repositoryPath.startsWith("..") || repositoryPath === "") {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(absolutePath);
      response.writeHead(200, {
        "Content-Type": contentTypes[extname(absolutePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      response.end(body);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500).end("Unavailable");
    }
  });
  await new Promise((resolveListening, rejectListening) => {
    server.once("error", rejectListening);
    server.listen(0, "127.0.0.1", resolveListening);
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close(error => error ? rejectClose(error) : resolveClose());
    })
  };
}

export function monitor(page) {
  const telemetry = { consoleErrors: [], pageErrors: [], requestFailures: [], responseErrors: [] };
  page.on("console", message => {
    if (message.type() === "error") telemetry.consoleErrors.push(message.text());
  });
  page.on("pageerror", error => telemetry.pageErrors.push(error.message));
  page.on("requestfailed", request => telemetry.requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "request failed"}`));
  page.on("response", response => {
    if (response.status() >= 400) telemetry.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return telemetry;
}

export function assertTelemetry(telemetry) {
  const observations = [
    ...telemetry.consoleErrors.map(value => `console: ${value}`),
    ...telemetry.pageErrors.map(value => `page: ${value}`),
    ...telemetry.requestFailures.map(value => `request: ${value}`),
    ...telemetry.responseErrors.map(value => `response: ${value}`)
  ];
  assert.deepEqual(observations, [], observations.join(" | "));
}

async function assertArtifactAttribution(page, route) {
  const receipt = await page.evaluate(() => {
    const footer = document.querySelector("footer.artifact-attribution");
    const style = footer ? getComputedStyle(footer) : null;
    return {
      authorValues: [...document.querySelectorAll('meta[name="author"]')].map(element => element.content),
      licenseTargets: [...document.querySelectorAll('link[rel="license"]')].map(element => element.href),
      footerCount: document.querySelectorAll("footer.artifact-attribution").length,
      noticeCount: document.querySelectorAll("footer.artifact-attribution .artifact-attribution__notice").length,
      noticeText: footer?.querySelector(".artifact-attribution__notice")?.textContent.trim() || "",
      position: style?.position || "",
      visible: Boolean(footer && style?.display !== "none" && style?.visibility !== "hidden" && footer.getBoundingClientRect().height > 0),
      clientWidth: footer?.clientWidth || 0,
      scrollWidth: footer?.scrollWidth || 0
    };
  });

  assert.deepEqual(receipt.authorValues, [artifactAuthor], `${route} author metadata`);
  assert.deepEqual(receipt.licenseTargets, [artifactLicense], `${route} license relation`);
  assert.equal(receipt.footerCount, 1, `${route} attribution footer count`);
  assert.equal(receipt.noticeCount, 1, `${route} attribution notice count`);
  assert.equal(receipt.noticeText, artifactAttribution, `${route} attribution notice`);
  assert.equal(receipt.position, "static", `${route} attribution stays in document flow`);
  assert.equal(receipt.visible, true, `${route} attribution is visible`);
  assert.ok(receipt.scrollWidth <= receipt.clientWidth + 1, `${route} attribution contains its content`);
}

export async function openFresh(browser, origin, route, { captureClipboard = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (captureClipboard) {
    await context.addInitScript(() => {
      globalThis.__coreClipboard = "";
      Object.defineProperty(Navigator.prototype, "clipboard", {
        configurable: true,
        get: () => ({
          writeText: async text => {
            globalThis.__coreClipboard = String(text);
          }
        })
      });
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const telemetry = monitor(page);
  await page.goto(`${origin}/${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await assertArtifactAttribution(page, route);
  return { context, page, telemetry };
}

export async function textJson(page, selector) {
  const content = await page.locator(selector).textContent();
  assert.ok(content?.trim(), `${selector} should expose JSON`);
  return JSON.parse(content);
}

export async function valueJson(page, selector) {
  const content = await page.locator(selector).inputValue();
  assert.ok(content?.trim(), `${selector} should expose JSON`);
  return JSON.parse(content);
}

export async function copiedJson(page, clickSelector) {
  await page.evaluate(() => {
    globalThis.__coreClipboard = "";
  });
  await page.locator(clickSelector).click();
  await page.waitForFunction(() => Boolean(globalThis.__coreClipboard));
  return JSON.parse(await page.evaluate(() => globalThis.__coreClipboard));
}
