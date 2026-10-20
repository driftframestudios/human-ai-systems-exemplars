import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const read = (relativePath) => readFile(path.join(repositoryRoot, relativePath), "utf8");
const json = async (relativePath) => JSON.parse(await read(relativePath));

const linearChannel = (value) => {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [red, green, blue] = hex.slice(1).match(/../gu).map((part) => linearChannel(Number.parseInt(part, 16)));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
};

const contrastRatio = (foreground, background) => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

const families = [
  {
    name: "Industrial Ink",
    root: "visual-fidelity-contracts/contracts/industrial-ink",
    id: "vfc:industrial-ink"
  },
  {
    name: "Soft Color Blocking",
    root: "visual-fidelity-contracts/contracts/soft-color-blocking",
    id: "vfc:soft-color-blocking"
  }
];

for (const family of families) {
  test(`${family.name} declares tested contrast pairs and token alternate-media mappings`, async () => {
    const contract = await json(`${family.root}/contract.v1.json`);
    const tokens = await read(`${family.root}/tokens.css`);
    assert.equal(contract.id, family.id);
    assert.equal(contract.tokens.authority, "reference_mapping");
    assert.equal(contract.tokens.paletteClosed, true);
    assert.ok(contract.tokens.colorPairs.length >= 4);

    for (const pair of contract.tokens.colorPairs) {
      const measured = contrastRatio(pair.foreground, pair.background);
      assert.ok(measured >= 4.5, `${family.name}: ${pair.foreground} on ${pair.background} = ${measured}`);
      assert.ok(measured + 0.011 >= pair.minimumRatio,
        `${family.name}: declared ${pair.minimumRatio}, measured ${measured.toFixed(2)}`);
      assert.ok(tokens.toLowerCase().includes(pair.foreground.toLowerCase()));
      assert.ok(tokens.toLowerCase().includes(pair.background.toLowerCase()));
    }

    assert.match(tokens, /@media \(forced-colors: active\)/u);
    assert.match(tokens, /@media \(prefers-reduced-motion: reduce\)/u);
    assert.match(tokens, /@media print/u);
    assert.match(tokens, /min-block-size: var\(--[^)]+target\)/u);
  });

  test(`${family.name} specimen keeps semantic and scripting-disabled routes`, async () => {
    const specimen = await read(`${family.root}/specimen.html`);
    assert.match(specimen, /<meta name="viewport"/u);
    assert.match(specimen, /aria-live="polite"/u);
    assert.match(specimen, /<noscript>/u);
    assert.match(specimen, /@media \(forced-colors: active\)/u);
    assert.match(specimen, /@media print/u);
    assert.match(specimen, /textContent/u);
    assert.doesNotMatch(specimen, /\.innerHTML\s*=|document\.write\s*\(|\beval\s*\(/u);
  });
}

test("Industrial Ink specimen exposes sixteen distinct matrix states", async () => {
  const specimen = await read("visual-fidelity-contracts/contracts/industrial-ink/specimen.html");
  assert.match(specimen, /h1, h2, h3 \{ overflow-wrap: anywhere; \}/u);
  const cells = specimen.match(/data-matrix-cell/gmu) ?? [];
  const values = [...specimen.matchAll(/name="material-state" value="([^"]+)"/gmu)].map((match) => match[1]);
  assert.equal(cells.length, 16);
  assert.equal(values.length, 16);
  assert.equal(new Set(values).size, 16);
  for (const family of ["substrate", "binder", "finish", "assembly"]) {
    assert.equal(values.filter((value) => value.startsWith(`${family}-`)).length, 4, family);
  }
  for (const state of ["reference", "selected", "hold", "accepted"]) {
    assert.equal(values.filter((value) => value.endsWith(`-${state}`)).length, 4, state);
  }
});

test("Soft Color Blocking routes established examples to their current owners", async () => {
  const contract = await json("visual-fidelity-contracts/contracts/soft-color-blocking/contract.v1.json");
  const examples = new Map(contract.references.canonicalExamples.map((entry) => [entry.path, entry.standing]));
  assert.equal(examples.get("collaboration/context-tree-visual-variants/index.html"), "canonical");
  assert.equal(examples.get("collaboration/impact-map-visual-variants/index.html"), "canonical");
  assert.equal(examples.get("visual-fidelity-contracts/contracts/soft-color-blocking/specimen.html"), "adaptation");
});
