import './node-runtime-admission.mjs';
/** AI4I gallery derivation. Existing maintenance source ownership stays in atlas-maintenance-data.mjs. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { maintenanceDocument, parseMaintenanceCsv, SOURCE_PATH, SOURCE_SHA256, SOURCE_DOI } from './atlas-maintenance-data.mjs';
import {
  createGalleryScales, DEFAULT_GALLERY_STATE, GALLERY_POPULATIONS, GALLERY_VIEWS,
  SPEED_EDGES, TORQUE_EDGES, renderGallerySvg,
} from '../context-canvas-project-surface/context-canvas/atlas-gallery-model.js';

export { DEFAULT_GALLERY_STATE, GALLERY_POPULATIONS, GALLERY_VIEWS, SPEED_EDGES, TORQUE_EDGES,
  getGalleryRows, renderGallerySvg, validateGalleryDocument, validateGalleryState,
} from '../context-canvas-project-surface/context-canvas/atlas-gallery-model.js';

export const GALLERY_JSON_PATH = 'context-canvas-project-surface/data/visualization-fidelity/ai4i/gallery.v1.json';
export const GALLERY_SVG_PATHS = Object.freeze(Object.fromEntries(GALLERY_VIEWS.map(view => [view,
  `context-canvas-project-surface/img/plot/atlas_ai4i_${view}.svg`])));
const ROOT = new URL('../', import.meta.url);

function emptyHeatmap() {
  return {
    cells: Array.from({ length: 100 }, (_, index) => {
      const speedIndex = index % 10;
      const torqueIndex = Math.floor(index / 10);
      return {
        speedIndex, torqueIndex,
        speedLower: SPEED_EDGES[speedIndex], speedUpper: SPEED_EDGES[speedIndex + 1],
        torqueLower: TORQUE_EDGES[torqueIndex], torqueUpper: TORQUE_EDGES[torqueIndex + 1],
        records: 0, failures: 0, ratePer100: null, availability: 'unavailable',
      };
    }),
    outOfRange: {
      records: 0, failures: 0, ratePer100: null, availability: 'unavailable',
      speedBelow: 0, speedAbove: 0, torqueBelow: 0, torqueAbove: 0,
    },
  };
}

function finalizeCount(target) {
  target.ratePer100 = target.records ? 100 * target.failures / target.records : null;
  target.availability = target.records ? 'available' : 'unavailable';
}

/**
 * Pure O(N + 4 * 100) time, O(N) owner identity tracking plus O(4 * 100) output.
 * N <= 10,000. Only newly allocated accumulators mutate; summaries reuse the
 * existing owner's identity, label, union, and reconciliation rules. Source
 * digests deliberately stay outside this fixture-admitting function.
 */
export function galleryDocument(records) {
  const summary = maintenanceDocument(records);
  const heatmaps = Object.fromEntries(GALLERY_POPULATIONS.map(type => [type, emptyHeatmap()]));
  for (const record of records) {
    for (const key of ['rotationalSpeedRpm', 'torqueNm']) {
      if (!Object.hasOwn(record, key) || !Number.isFinite(record[key])) {
        throw new TypeError(`Gallery records require their own finite ${key} field.`);
      }
    }
    const speed = record.rotationalSpeedRpm;
    const torque = record.torqueNm;
    const outside = speed < 1000 || speed > 3000 || torque < 0 || torque > 100;
    const index = outside ? -1 : Math.min(9, Math.floor(torque / 10)) * 10 + Math.min(9, Math.floor((speed - 1000) / 200));
    for (const type of ['all', record.type]) {
      const target = outside ? heatmaps[type].outOfRange : heatmaps[type].cells[index];
      target.records += 1;
      target.failures += record.machineFailure;
      if (outside) {
        target.speedBelow += Number(speed < 1000);
        target.speedAbove += Number(speed > 3000);
        target.torqueBelow += Number(torque < 0);
        target.torqueAbove += Number(torque > 100);
      }
    }
  }
  for (const type of GALLERY_POPULATIONS) {
    heatmaps[type].cells.forEach(finalizeCount);
    finalizeCount(heatmaps[type].outOfRange);
  }
  return {
    ...summary,
    id: 'atlas-ai4i-gallery.v1',
    bins: {
      speedEdges: [...SPEED_EDGES], torqueEdges: [...TORQUE_EDGES],
      speedUnit: 'rpm', torqueUnit: 'Nm',
      interval: 'Lower edge included, upper edge excluded; the final upper edge is included',
      cellOrder: 'torqueIndex * 10 + speedIndex; both indexes ascend from zero',
      outOfRangeRule: 'Out-of-range records remain in population summaries; reason counts may overlap',
    },
    scales: createGalleryScales(summary.populations),
    heatmaps,
  };
}

/** Only this verified-file path attaches released-data provenance. No caller-supplied digest is accepted. */
export async function readVerifiedGalleryDocument() {
  const bytes = await readFile(new URL(SOURCE_PATH, ROOT));
  if (createHash('sha256').update(bytes).digest('hex') !== SOURCE_SHA256) throw new Error('Gallery source differs from the admitted AI4I release.');
  return {
    ...galleryDocument(parseMaintenanceCsv(bytes.toString('utf8'))),
    population: 'Released AI4I 2020 records, grouped by the source Type field',
    source: {
      title: 'AI4I 2020 Predictive Maintenance Dataset',
      doi: SOURCE_DOI, sha256: SOURCE_SHA256, license: 'CC-BY-4.0', sourceType: 'published-generated-records',
    },
  };
}

/** O(CSV bytes + N + bounded cells + output bytes); writes only the five declared gallery artifacts. */
export async function buildAtlasGallery({ check = false } = {}) {
  const document = await readVerifiedGalleryDocument();
  const outputs = [[GALLERY_JSON_PATH, `${JSON.stringify(document, null, 2)}\n`],
    ...GALLERY_VIEWS.map(view => [GALLERY_SVG_PATHS[view], renderGallerySvg(document,
      { ...DEFAULT_GALLERY_STATE, view }, `atlas-ai4i-${view}`)])];
  for (const [path, content] of outputs) {
    const target = new URL(path, ROOT);
    if (check) {
      if (await readFile(target, 'utf8') !== content) throw new Error(`Regenerate the gallery artifact: ${path}`);
    } else await writeFile(target, content);
  }
  return { records: document.populations[0].records, populations: 4, cellsPerPopulation: 100, outputs: outputs.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3 || !['--write', '--check'].includes(process.argv[2])) throw new Error('Use --write or --check.');
  console.log(JSON.stringify(await buildAtlasGallery({ check: process.argv[2] === '--check' })));
}
