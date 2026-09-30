import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const canvasRoot = resolve(
  import.meta.dirname,
  "../../context-canvas-project-surface/context-canvas",
);

const cometSurfaces = [
  {
    url: "https://cometspectrum.ai/",
    name: "Comet Spectrum schema signals and semantic contexts",
  },
  {
    url: "https://cometspectrum.io/",
    name: "Comet Spectrum LIMS/ELN comparative evidence",
  },
  {
    url: "https://cometspectrum.org/",
    name: "Comet Spectrum LIMS/ELN program specification",
  },
];

async function canvasFile(path) {
  return readFile(resolve(canvasRoot, path), "utf8");
}

function jsonLd(source) {
  return [...source.matchAll(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gu,
  )].map((match) => JSON.parse(match[1]));
}

function findNamedItemList(value, name) {
  if (!value || typeof value !== "object") return null;
  if (value["@type"] === "ItemList" && value.name === name) return value;
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findNamedItemList(item, name);
        if (found) return found;
      }
    } else {
      const found = findNamedItemList(child, name);
      if (found) return found;
    }
  }
  return null;
}

test("the public topology keeps the three Comet Spectrum surfaces distinct", async () => {
  const surfaces = [
    ["index.html", "Public collaboration system"],
    ["ai-systems.html", "Public system topology"],
  ];

  for (const [route, listName] of surfaces) {
    const source = await canvasFile(route);
    const itemList = jsonLd(source)
      .map((entry) => findNamedItemList(entry, listName))
      .find(Boolean);
    assert.ok(itemList, `${route} carries ${listName}`);
    assert.equal(itemList.numberOfItems, itemList.itemListElement.length, route);
    assert.equal(new Set(itemList.itemListElement.map((item) => item.url)).size, itemList.numberOfItems, route);

    for (const expected of cometSurfaces) {
      const item = itemList.itemListElement.find((candidate) => candidate.url === expected.url);
      assert.equal(item?.name, expected.name, `${route} names the distinct job at ${expected.url}`);
      assert.match(source, new RegExp(`href="${expected.url}"`, "u"), `${route} links ${expected.url}`);
    }
  }

  const limsDebrief = await canvasFile("fmi-lims-eln-replatforming.html");
  for (const expected of cometSurfaces) {
    assert.match(
      limsDebrief,
      new RegExp(`href="${expected.url.replaceAll(".", "\\.")}"`, "u"),
      `the LIMS/ELN Debrief links ${expected.url}`,
    );
  }
});
