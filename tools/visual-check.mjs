#!/usr/bin/env node

import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_TARGET = "context-canvas-project-surface/context-canvas/conditioning-field.html";
const DEFAULT_SELECTOR = ".ladder-table";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];
const WIDE_VIEWPORT = { name: "wide", width: 2560, height: 1440 };

function usage() {
  return [
    "Usage:",
    "  npm run visual:conditioning-field",
    "  npm run visual:check -- path/to/page.html --selector .main-surface",
    "",
    "Options:",
    "  --name <label>       Artifact run label",
    "  --selector <css>     Element that must render visibly",
    "  --readable-control-selector <css>",
    "                       Input/select/textarea selector whose value text must fit visibly",
    "  --http               Serve the repository over loopback HTTP for iframe integration",
    "  --iframe-selector <css>",
    "                       Iframe that must load a substantive document",
    "  --iframe-content-selector <css>",
    "                       Visible element required inside the iframe (default: body)",
    "  --rail-label-check   Hover page-section-rail ticks and require unclipped slugs/readouts",
    "  --open-details       Open the nearest <details> around the selector before measuring",
    "  --keep-details-closed",
    "                       Do not auto-open a <details> wrapper",
    "  --desktop-only       Skip the mobile viewport",
    "  --wide               Add a 2560 × 1440 wide-viewport check",
    "  --help               Show this message"
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    target: DEFAULT_TARGET,
    name: null,
    selector: DEFAULT_SELECTOR,
    readableControlSelectors: [],
    http: false,
    iframeSelector: null,
    iframeContentSelector: "body",
    railLabelCheck: false,
    openDetails: true,
    desktopOnly: false,
    wide: false
  };

  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--name") {
      options.name = argv[++index];
    } else if (arg === "--selector") {
      options.selector = argv[++index];
    } else if (arg === "--readable-control-selector") {
      options.readableControlSelectors.push(argv[++index]);
    } else if (arg === "--http") {
      options.http = true;
    } else if (arg === "--iframe-selector") {
      options.iframeSelector = argv[++index];
    } else if (arg === "--iframe-content-selector") {
      options.iframeContentSelector = argv[++index];
    } else if (arg === "--rail-label-check") {
      options.railLabelCheck = true;
    } else if (arg === "--open-details") {
      options.openDetails = true;
    } else if (arg === "--keep-details-closed") {
      options.openDetails = false;
    } else if (arg === "--desktop-only") {
      options.desktopOnly = true;
    } else if (arg === "--wide") {
      options.wide = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals[0]) options.target = positionals[0];
  if (!options.name) options.name = basename(options.target).replace(/\.[^.]+$/, "") || "visual-check";
  if (!options.selector) throw new Error("--selector requires a CSS selector");
  return options;
}

async function measureRailReveal(page) {
  const links = page.locator(".page-section-rail__link");
  const count = await links.count();
  const results = [];

  for (let index = 0; index < count; index += 1) {
    await links.nth(index).hover();
    await page.waitForTimeout(180);
    results.push(await page.evaluate((linkIndex) => {
      function rectObject(rect) {
        return {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
      }

      function intersection(a, b) {
        const left = Math.max(a.left, b.left);
        const right = Math.min(a.right, b.right);
        const top = Math.max(a.top, b.top);
        const bottom = Math.min(a.bottom, b.bottom);
        return {
          left,
          right,
          top,
          bottom,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top)
        };
      }

      function clippedRect(element) {
        let visible = rectObject(element.getBoundingClientRect());
        visible = intersection(visible, {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
          width: window.innerWidth,
          height: window.innerHeight
        });

        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = window.getComputedStyle(ancestor);
          const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
          if (/(hidden|clip|auto|scroll)/.test(overflow)) {
            visible = intersection(visible, rectObject(ancestor.getBoundingClientRect()));
          }
        }
        return visible;
      }

      const link = document.querySelectorAll(".page-section-rail__link")[linkIndex];
      const rail = document.querySelector(".page-section-rail");
      const isSourceMode = rail?.classList.contains("page-section-rail--source");
      const label = link?.querySelector(".page-section-rail__label");
      const readout = document.querySelector(".page-section-rail__readout");
      const compact = window.matchMedia("(max-width: 56rem)").matches;
      
      // In source mode at compact width, use readout; otherwise use per-link label
      const target = isSourceMode && compact ? readout : label;
      const targetStyle = target ? window.getComputedStyle(target) : null;
      const targetRect = target ? target.getBoundingClientRect() : null;
      const targetClippedRect = target ? clippedRect(target) : null;
      const linkRect = link ? link.getBoundingClientRect() : null;
      const targetText = target?.textContent?.trim() || "";
      const targetVisible = Boolean(target && targetRect.width > 0 && targetRect.height > 0 && targetStyle.display !== "none" && targetStyle.visibility !== "hidden" && Number(targetStyle.opacity) > 0);
      const clippedRatio = targetRect && targetRect.width ? targetClippedRect.width / targetRect.width : 0;

      return {
        index: linkIndex,
        compact,
        isSourceMode,
        targetKind: isSourceMode && compact ? "readout" : (compact ? "label" : "readout"),
        slug: link?.dataset.sectionSlug || link?.getAttribute("aria-label") || "",
        targetText,
        railExists: Boolean(rail),
        linkVisible: Boolean(linkRect && linkRect.width > 0 && linkRect.height > 0),
        targetVisible,
        targetDisplay: targetStyle?.display || "",
        targetVisibility: targetStyle?.visibility || "",
        targetOpacity: targetStyle ? Number(targetStyle.opacity) : 0,
        targetRect: targetRect ? rectObject(targetRect) : null,
        targetClippedRect,
        clippedRatio
      };
    }, index));
  }

  return { count, results };
}

function measureReadableControls(selectors) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((control) => {
    const rect = control.getBoundingClientRect();
    const style = window.getComputedStyle(control);
    const value = control instanceof HTMLSelectElement
      ? control.options[control.selectedIndex]?.textContent?.trim() ?? control.value
      : control.value || control.placeholder || control.textContent.trim();
    const font = [
      style.fontStyle,
      style.fontVariant,
      style.fontWeight,
      style.fontSize,
      style.fontFamily
    ].join(" ");
    context.font = font;
    const textWidth = Math.ceil(context.measureText(value).width);
    const innerWidth = control.clientWidth - parseFloat(style.paddingLeft || "0") - parseFloat(style.paddingRight || "0");
    const multiline = control instanceof HTMLTextAreaElement;
    return {
      selector,
      tagName: control.tagName.toLowerCase(),
      type: control.getAttribute("type") || null,
      value,
      ariaLabel: control.getAttribute("aria-label") || "",
      width: rect.width,
      clientWidth: control.clientWidth,
      scrollWidth: control.scrollWidth,
      innerWidth,
      textWidth,
      multiline,
      horizontalOverflow: control.scrollWidth > control.clientWidth + 2,
      visibleCharacters: value.length ? Math.max(0, Math.floor(value.length * Math.max(innerWidth, 0) / Math.max(textWidth, 1))) : 0,
      gridColumn: style.gridColumn,
      visible: rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden"
    };
  }));
}

function safeSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "visual-check";
}

function targetToUrl(target) {
  if (/^(https?:|file:)/i.test(target)) return target;
  return pathToFileURL(resolve(target)).href;
}

async function startStaticServer(rootDirectory) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8"
  };
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const absolutePath = resolve(rootDirectory, `.${pathname}`);
      const repositoryPath = relative(rootDirectory, absolutePath);
      if (repositoryPath.startsWith("..") || repositoryPath === "") {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(absolutePath);
      response.writeHead(200, {
        "Content-Type": types[extname(absolutePath).toLowerCase()] || "application/octet-stream",
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
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
  };
}

function analyzeSelector(selector) {
  const element = document.querySelector(selector);
  if (!element) return { exists: false };

  const details = element.closest("details");
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const visible = rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  const result = {
    exists: true,
    visible,
    tagName: element.tagName.toLowerCase(),
    width: rect.width,
    height: rect.height,
    inDetails: Boolean(details),
    detailsOpen: details ? details.open : null,
    firstTwoColumns: [],
    overflowingDescendants: []
  };

  if (element.tagName.toLowerCase() !== "table") return result;

  const rows = Array.from(element.tBodies[0]?.rows ?? []);
  const sampleRows = rows.length ? rows : Array.from(element.tHead?.rows ?? []);
  for (const row of sampleRows) {
    for (const cell of Array.from(row.cells)) {
      for (const descendant of cell.querySelectorAll("pre, code, p, span")) {
        const descendantStyle = window.getComputedStyle(descendant);
        const descendantRect = descendant.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        const acceptsLocalScroll = /(auto|scroll)/.test(descendantStyle.overflowX);
        const escapesCell = descendantRect.left < cellRect.left - 2 || descendantRect.right > cellRect.right + 2;
        const clipsTextWithoutScroll = descendant.scrollWidth > descendant.clientWidth + 2 && !acceptsLocalScroll;
        if (
          descendantRect.width > 0 &&
          descendantRect.height > 0 &&
          (escapesCell || clipsTextWithoutScroll)
        ) {
          result.overflowingDescendants.push({
            rowIndex: row.rowIndex,
            cellIndex: cell.cellIndex + 1,
            tagName: descendant.tagName.toLowerCase(),
            text: descendant.textContent.trim().slice(0, 120),
            clientWidth: descendant.clientWidth,
            scrollWidth: descendant.scrollWidth,
            overflowX: descendantStyle.overflowX,
            reason: escapesCell ? "box escapes its table cell" : "text overflows without a local scroll route"
          });
        }
      }
    }
    for (const columnIndex of [0, 1]) {
      const cell = row.cells[columnIndex];
      if (!cell) continue;
      const range = document.createRange();
      range.selectNodeContents(cell);
      const textRects = Array.from(range.getClientRects()).filter((lineRect) => lineRect.width > 0 && lineRect.height > 0);
      range.detach();
      const cellRect = cell.getBoundingClientRect();
      result.firstTwoColumns.push({
        rowIndex: row.rowIndex,
        columnIndex: columnIndex + 1,
        text: cell.textContent.trim(),
        width: cellRect.width,
        clientWidth: cell.clientWidth,
        scrollWidth: cell.scrollWidth,
        lineCount: textRects.length,
        whiteSpace: window.getComputedStyle(cell).whiteSpace
      });
    }
  }

  return result;
}

async function runViewport(browser, options, viewport, runDir, url) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.addStyleTag({ content: ".skip, .skip-link { display: none !important; }" });

  if (options.openDetails) {
    await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      const details = element?.closest("details");
      if (details) details.open = true;
    }, options.selector);
  }

  await page.locator(options.selector).first().scrollIntoViewIfNeeded().catch(() => {});

  let iframeMetrics = null;
  if (options.iframeSelector) {
    try {
      const iframe = page.locator(options.iframeSelector).first();
      await iframe.scrollIntoViewIfNeeded();
      const frame = page.frameLocator(options.iframeSelector).first();
      const content = frame.locator(options.iframeContentSelector).first();
      await content.waitFor({ state: "visible", timeout: 8000 });
      iframeMetrics = await content.evaluate((element) => ({
        loaded: true,
        title: element.ownerDocument.title,
        bodyTextLength: element.ownerDocument.body.innerText.trim().length,
        rootClientWidth: element.ownerDocument.documentElement.clientWidth,
        rootScrollWidth: element.ownerDocument.documentElement.scrollWidth,
        selectorText: element.textContent.trim().slice(0, 160)
      }));
    } catch (error) {
      iframeMetrics = { loaded: false, error: error.message };
    }
  }
  const pageScreenshot = resolve(runDir, `${safeSegment(options.name)}-${viewport.name}-page.png`);
  await page.screenshot({ path: pageScreenshot, fullPage: true });

  let elementScreenshot = null;
  try {
    elementScreenshot = resolve(runDir, `${safeSegment(options.name)}-${viewport.name}-selector.png`);
    await page.locator(options.selector).first().screenshot({ path: elementScreenshot });
  } catch (error) {
    elementScreenshot = { error: error.message };
  }

  const pageMetrics = await page.evaluate(() => ({
    title: document.title,
    readyState: document.readyState,
    bodyTextLength: document.body.innerText.trim().length,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  const selectorMetrics = await page.evaluate(analyzeSelector, options.selector);
  const readableControls = await page.evaluate(measureReadableControls, options.readableControlSelectors);
  const railReveal = options.railLabelCheck ? await measureRailReveal(page) : null;
  let railHoverScreenshot = null;
  if (options.railLabelCheck && railReveal?.count) {
    railHoverScreenshot = resolve(runDir, `${safeSegment(options.name)}-${viewport.name}-rail-hover.png`);
    await page.screenshot({ path: railHoverScreenshot });
  }

  await context.close();
  return {
    viewport,
    pageScreenshot,
    elementScreenshot,
    pageMetrics,
    selectorMetrics,
    readableControls,
    iframeMetrics,
    railReveal,
    railHoverScreenshot,
    consoleErrors,
    pageErrors
  };
}

function collectFailures(result) {
  const failures = [];
  const { selectorMetrics, pageMetrics } = result;

  if (pageMetrics.bodyTextLength < 20) failures.push("Body text is unexpectedly sparse.");
  if (result.consoleErrors.length) failures.push(`Console errors: ${result.consoleErrors.join(" | ")}`);
  if (result.pageErrors.length) failures.push(`Page errors: ${result.pageErrors.join(" | ")}`);
  if (!selectorMetrics.exists) failures.push("Selector was not found.");
  if (selectorMetrics.exists && !selectorMetrics.visible) failures.push("Selector exists but is not visibly rendered.");

  for (const cell of selectorMetrics.firstTwoColumns ?? []) {
    const minimumWidth = cell.columnIndex === 1 ? 88 : 168;
    if (cell.width < minimumWidth) {
      failures.push(`Column ${cell.columnIndex} cell "${cell.text}" is collapsed to ${cell.width.toFixed(1)}px.`);
    }
    if (cell.lineCount > 1) {
      failures.push(`Column ${cell.columnIndex} cell "${cell.text}" wraps across ${cell.lineCount} lines.`);
    }
    if (cell.scrollWidth > cell.clientWidth + 2) {
      failures.push(`Column ${cell.columnIndex} cell "${cell.text}" is clipped horizontally.`);
    }
  }

  for (const descendant of selectorMetrics.overflowingDescendants ?? []) {
    failures.push(`Table row ${descendant.rowIndex}, column ${descendant.cellIndex} contains a ${descendant.tagName} whose ${descendant.reason}: "${descendant.text}".`);
  }

  if (result.iframeMetrics) {
    if (!result.iframeMetrics.loaded) failures.push(`Iframe integration did not load: ${result.iframeMetrics.error}`);
    if (result.iframeMetrics.loaded && result.iframeMetrics.bodyTextLength < 20) failures.push("Iframe document is unexpectedly sparse.");
    if (result.iframeMetrics.loaded && result.iframeMetrics.rootScrollWidth > result.iframeMetrics.rootClientWidth + 2) failures.push("Iframe document has page-level horizontal overflow.");
  }

  for (const control of result.readableControls ?? []) {
    if (!control.visible) {
      failures.push(`Readable control "${control.ariaLabel || control.value}" is not visibly rendered.`);
      continue;
    }
    if (control.innerWidth < 80) {
      failures.push(`Readable control "${control.ariaLabel || control.value}" collapsed to ${control.innerWidth.toFixed(1)}px of inner width.`);
    }
    if (control.multiline && control.horizontalOverflow) {
      failures.push(`Readable textarea "${control.ariaLabel || control.value}" clips horizontally.`);
    } else if (!control.multiline && control.value && control.textWidth > control.innerWidth + 2) {
      failures.push(`Readable control "${control.value}" clips value text: ${control.textWidth}px text in ${control.innerWidth.toFixed(1)}px.`);
    }
    if (!control.multiline && control.value.length > 1 && control.visibleCharacters <= 1) {
      failures.push(`Readable control "${control.value}" exposes about ${control.visibleCharacters} character.`);
    }
  }

  if (result.railReveal) {
    if (!result.railReveal.count) failures.push("Rail label check requested, but no page-section-rail links were found.");
    for (const reveal of result.railReveal.results) {
      const label = reveal.slug || `rail link ${reveal.index + 1}`;
      if (!reveal.railExists) failures.push("Rail label check requested, but the page-section-rail was not found.");
      if (!reveal.linkVisible) failures.push(`Rail tick "${label}" is not visibly rendered.`);
      if (!reveal.targetText) failures.push(`Rail tick "${label}" has no way-finding slug text.`);
      if (!reveal.targetVisible) {
        failures.push(`Rail tick "${label}" does not reveal a visible ${reveal.targetKind} on hover.`);
      }
      if (reveal.targetRect && reveal.targetRect.width > 0 && reveal.clippedRatio < 0.92) {
        failures.push(`Rail ${reveal.targetKind} "${label}" is clipped on hover: ${(reveal.clippedRatio * 100).toFixed(0)}% visible.`);
      }
    }
  }

  return failures;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const viewports = options.desktopOnly ? VIEWPORTS.slice(0, 1) : VIEWPORTS.slice();
  if (options.wide) viewports.push(WIDE_VIEWPORT);
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = resolve(".visual-runs", `${runId}-${safeSegment(options.name)}`);
  let staticServer = null;
  let browser = null;
  let url = "";
  const results = [];
  const failures = [];
  try {
    if (options.http) staticServer = await startStaticServer(process.cwd());
    url = staticServer
      ? new URL(options.target.replace(/^\/+/, ""), `${staticServer.origin}/`).href
      : targetToUrl(options.target);
    await mkdir(runDir, { recursive: true });
    browser = await chromium.launch();
    for (const viewport of viewports) {
      const result = await runViewport(browser, options, viewport, runDir, url);
      results.push(result);
      failures.push(...collectFailures(result).map((failure) => `${viewport.name}: ${failure}`));
    }
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      if (staticServer) await staticServer.close();
    }
  }

  const summary = {
    target: options.target,
    url,
    selector: options.selector,
    readableControlSelectors: options.readableControlSelectors,
    http: options.http,
    iframeSelector: options.iframeSelector,
    iframeContentSelector: options.iframeContentSelector,
    railLabelCheck: options.railLabelCheck,
    openDetails: options.openDetails,
    wide: options.wide,
    runDir,
    results,
    failures
  };
  await writeFile(resolve(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  if (failures.length) {
    console.error(`Visual check failed. Artifacts: ${runDir}`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Visual check passed. Artifacts: ${runDir}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
