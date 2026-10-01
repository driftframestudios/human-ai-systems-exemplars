#!/usr/bin/env node
/* Inline delivery projection. Edit the three shared source owners, then run this file. */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const INVESTMENT_HOSTS = Object.freeze([
  "collaboration/initiative-costing-calculator/index.html",
  "collaboration/cross-functional-investment-model-studio/index.html"
]);
export const INLINE_OWNERS = Object.freeze([
  Object.freeze({ key: "styles", tag: "style", path: "collaboration/investment-analysis/studio.css" }),
  Object.freeze({ key: "core", tag: "script", path: "collaboration/investment-analysis/core.js" }),
  Object.freeze({ key: "ui", tag: "script", path: "collaboration/investment-analysis/studio.js" })
]);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

export async function readInvestmentSources(root = repositoryRoot) {
  const sources = {};
  for (const owner of INLINE_OWNERS) sources[owner.path] = await readFile(path.join(root, owner.path), "utf8");
  return sources;
}

export function projectInvestmentHtml(html, sources) {
  let projected = html;
  let previousEnd = -1;
  for (const owner of INLINE_OWNERS) {
    const start = "<!-- investment-analysis:" + owner.key + ":start -->";
    const end = "<!-- investment-analysis:" + owner.key + ":end -->";
    if (projected.split(start).length !== 2 || projected.split(end).length !== 2) {
      throw new Error("Supply exactly one ordered marker pair for " + owner.key + ".");
    }
    const from = projected.indexOf(start);
    const to = projected.indexOf(end);
    if (from < previousEnd || to < from) throw new Error("Keep inline owners in styles, core, UI order.");
    const headEnd = projected.indexOf("</head>");
    const bodyEnd = projected.lastIndexOf("</body>");
    if (headEnd < 0 || bodyEnd < headEnd || (owner.key === "ui" ? from < headEnd || to > bodyEnd : to > headEnd)) {
      throw new Error("Place styles and core in the head, and UI after the host script in the body.");
    }
    if (owner.key === "ui" && /<script\b/i.test(projected.slice(to + end.length, bodyEnd))) {
      throw new Error("Place the UI projection after every host script.");
    }
    const source = sources[owner.path];
    if (typeof source !== "string" || new RegExp("</" + owner.tag, "i").test(source)) {
      throw new Error("Supply inline-safe source text for " + owner.path + ".");
    }
    const block = [
      start,
      "<!-- Generated from " + owner.path + "; regenerate: node tools/project-investment-analysis.mjs -->",
      "<" + owner.tag + ' data-investment-analysis-source="' + owner.path + '">',
      source.trimEnd(),
      "</" + owner.tag + ">",
      end
    ].join("\n");
    projected = projected.slice(0, from) + block + projected.slice(to + end.length);
    previousEnd = from + block.length;
  }
  return projected;
}

export function assertInvestmentProjection(html, sources) {
  if (projectInvestmentHtml(html, sources) !== html) {
    throw new Error("Refresh the investment inline projection: node tools/project-investment-analysis.mjs");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--check") || args.length > 1) throw new Error("Use this command with an optional --check.");
  const check = args.includes("--check");
  const sources = await readInvestmentSources();
  for (const host of INVESTMENT_HOSTS) {
    const file = path.join(repositoryRoot, host);
    const html = await readFile(file, "utf8");
    if (check) assertInvestmentProjection(html, sources);
    else await writeFile(file, projectInvestmentHtml(html, sources));
  }
  console.log("Investment inline projections " + (check ? "match" : "updated from") + " their three source owners across two hosts.");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
