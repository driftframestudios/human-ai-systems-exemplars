import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export async function startStaticServer() {
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
      const absolutePath = resolve(repositoryRoot, `.${pathname}`);
      const repositoryPath = relative(repositoryRoot, absolutePath);
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
