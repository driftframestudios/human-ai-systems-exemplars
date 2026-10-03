import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const canvas = "context-canvas-project-surface/context-canvas/";
const shared = "shared-surface-priority-map-chimeric-prototype-v0.1.4.html";
const owners = [
  "collaboration/cross-functional-investment-model-studio/index.html",
  "collaboration/initiative-costing-calculator/index.html",
  "collaboration/lims-eln-program-constellation/index.html",
  `${canvas}index.html`, `${canvas}conditioning-field.html`,
  `core-architectures-chimeric-prototype-current-pack-v0.1/${shared}`,
  `${canvas}prototypes/core-architectures/chimeric-pack-v0.1/${shared}`,
];
const decorative = /[\u2190-\u21ff\u2022\u2013\u2014]|\s\u00b7\s/u;
const entities = { rarr: "\u2192", larr: "\u2190", harr: "\u2194", middot: "\u00b7", bull: "\u2022", ndash: "\u2013", mdash: "\u2014" };

function decodedSymbols(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|rarr|larr|harr|middot|bull|ndash|mdash);/giu, (whole, entity) => {
    if (!entity.startsWith("#")) return entities[entity.toLowerCase()];
    const hex = entity[1].toLowerCase() === "x";
    const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

test("authored table label owners use plain-word supplemental descriptors", async () => {
  for (const owner of owners) {
    const source = await fs.readFile(new URL(`../../${owner}`, import.meta.url), "utf8");
    const labels = [...source.matchAll(/\bdata-label\s*=\s*(["'])(.*?)\1/gu)];
    assert(labels.length, `Declared label owner has labels: ${owner}`);
    for (const [, , value] of labels) assert(!decorative.test(decodedSymbols(value)), `${owner}: ${value}`);
    if (owner === owners[0]) {
      assert(source.includes('<th scope="col" data-label="Inputs to outputs">Inputs \u2192 outputs</th>'));
      assert.equal(source.match(/data-label="Inputs to outputs"/gu)?.length, 9);
    }
  }
});

test("label checks recognize encoded symbols while preserving language and escaping", () => {
  for (const value of ["Inputs \u2192 outputs", "Inputs &rarr; outputs", "Inputs &#8594; outputs", "Inputs &#x2192; outputs", "Topic &middot; identity", "Topic &mdash; detail"]) {
    assert(decorative.test(decodedSymbols(value)), value);
  }
  for (const value of ["Inputs to outputs", "Costs &amp; evidence", "P\u00edlot: 12 USD", "Value - qualified", "Torque (N\u00b7m)", "Torque (N&middot;m)"]) {
    assert(!decorative.test(decodedSymbols(value)), value);
  }
});
