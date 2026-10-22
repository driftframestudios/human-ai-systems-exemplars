import './node-runtime-admission.mjs';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const SOURCE_PATH = 'context-canvas-project-surface/data/visualization-fidelity/ai4i/ai4i2020.csv';
export const SUMMARY_PATH = 'context-canvas-project-surface/data/visualization-fidelity/ai4i/summary.v1.json';
export const SOURCE_SHA256 = 'dc6630cd9b1f0f853922fad78a1b6436570d3f1ec863f1dd5c4340ac56bc8a8e';
export const SOURCE_DOI = 'https://doi.org/10.24432/C5HS5C';
export const PRODUCT_TYPES = Object.freeze(['L', 'M', 'H']);
export const MODE_KEYS = Object.freeze(['TWF', 'HDF', 'PWF', 'OSF', 'RNF']);
const HEADER = 'UDI,Product ID,Type,Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min],Machine failure,TWF,HDF,PWF,OSF,RNF';
const MAX_RECORDS = 10_000;
const MAX_SOURCE_CHARACTERS = 1_000_000;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/u;

function numericField(value, { integer = false, positive = false } = {}) {
  if (integer && !/^(?:0|[1-9]\d*)$/u.test(value)) {
    throw new TypeError("Integer fields require an unsigned whole-number literal");
  }
  if (!DECIMAL.test(value)) throw new TypeError('Invalid numeric field in maintenance record.');
  const number = Number(value);
  if (!Number.isFinite(number) || number > Number.MAX_SAFE_INTEGER || (integer && !Number.isSafeInteger(number)) || (positive && number <= 0)) {
    throw new TypeError('Invalid numeric field in maintenance record.');
  }
  return number;
}

/** O(source length) time and O(records) space; admits the published unquoted CSV layout. */
export function parseMaintenanceCsv(text) {
  if (typeof text !== 'string' || text.length > MAX_SOURCE_CHARACTERS) throw new TypeError('Maintenance source must be bounded CSV text.');
  const lines = text.replace(/^\uFEFF/u, '').replace(/\r\n/gu, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.shift() !== HEADER || lines.length < 1 || lines.length > MAX_RECORDS) throw new TypeError('Invalid maintenance header or record count.');
  const identities = new Set();
  return lines.map(line => {
    const fields = line.split(',');
    if (fields.length !== 14 || !PRODUCT_TYPES.includes(fields[2]) || !/^[LMH]\d+$/u.test(fields[1]) || fields[1][0] !== fields[2]) {
      throw new TypeError('Invalid maintenance record shape or product type.');
    }
    const id = numericField(fields[0], { integer: true, positive: true });
    if (identities.has(id)) throw new TypeError('Duplicate maintenance record identity.');
    identities.add(id);
    const flags = fields.slice(8).map(value => {
      if (value !== '0' && value !== '1') throw new TypeError('Maintenance labels and flags must be zero or one.');
      return Number(value);
    });
    return Object.freeze({
      id, productId: fields[1], type: fields[2],
      airTemperatureK: numericField(fields[3], { positive: true }),
      processTemperatureK: numericField(fields[4], { positive: true }),
      rotationalSpeedRpm: numericField(fields[5], { integer: true, positive: true }),
      torqueNm: numericField(fields[6]),
      toolWearMinutes: numericField(fields[7], { integer: true }),
      machineFailure: flags[0],
      modeFlags: Object.freeze(Object.fromEntries(MODE_KEYS.map((key, i) => [key, flags[i + 1]]))),
    });
  });
}

function emptyPopulation(type) {
  return {
    type, records: 0, machineFailure: 0, anyModeFlag: 0, multipleModeFlags: 0,
    modeFlagTotal: 0, modes: Object.fromEntries(MODE_KEYS.map(key => [key, 0])),
    agreement: { neither: 0, modeOnly: 0, labelOnly: 0, both: 0 },
  };
}

function addRecord(population, record) {
  population.records += 1;
  population.machineFailure += record.machineFailure;
  let flagCount = 0;
  for (const key of MODE_KEYS) {
    population.modes[key] += record.modeFlags[key];
    flagCount += record.modeFlags[key];
  }
  population.modeFlagTotal += flagCount;
  population.anyModeFlag += Number(flagCount > 0);
  population.multipleModeFlags += Number(flagCount > 1);
  const cell = record.machineFailure ? (flagCount > 0 ? 'both' : 'labelOnly') : (flagCount > 0 ? 'modeOnly' : 'neither');
  population.agreement[cell] += 1;
}

/** O(records) time and auxiliary space for identity tracking; O(1) aggregate space; only newly allocated accumulators are mutated. */
export function summarizeMaintenance(records) {
  if (!Array.isArray(records) || records.length > MAX_RECORDS) throw new TypeError('Maintenance records must be a bounded array.');
  const populations = ['all', ...PRODUCT_TYPES].map(emptyPopulation);
  const byType = new Map(populations.map(population => [population.type, population]));
  const identities = new Set();
  for (const record of records) {
    if (record === null || typeof record !== "object" ||
        !["id", "type", "machineFailure", "modeFlags"].every(key => Object.hasOwn(record, key))) {
      throw new TypeError("Each record supplies its own id, type, machineFailure, and modeFlags fields");
    }
    if (!record || !Number.isSafeInteger(record.id) || record.id <= 0 || identities.has(record.id)
      || !PRODUCT_TYPES.includes(record.type) || ![0, 1].includes(record.machineFailure)
      || !record.modeFlags || MODE_KEYS.some(key => !Object.hasOwn(record.modeFlags, key) || ![0, 1].includes(record.modeFlags[key]))) {
      throw new TypeError('Invalid maintenance record for aggregation.');
    }
    identities.add(record.id);
    addRecord(populations[0], record);
    addRecord(byType.get(record.type), record);
  }
  return populations.map(population => ({
    ...population,
    availability: population.records ? 'available' : 'unavailable',
    machineFailurePer100: population.records ? 100 * population.machineFailure / population.records : null,
    anyModeFlagPer100: population.records ? 100 * population.anyModeFlag / population.records : null,
    disagreements: population.agreement.modeOnly + population.agreement.labelOnly,
  }));
}

/** Pure document construction retains source label meanings and exact unrounded rates. */
export function maintenanceDocument(records) {
  return {
    id: 'atlas-ai4i-maintenance-reference.v1', version: 1,
    population: 'Supplied records grouped by the source Type field',
    denominator: 'Records in the selected product type; each UDI contributes once',
    timeBasis: 'The released table supplies record identifiers rather than observation timestamps',
    measures: {
      machineFailure: 'Count of rows whose published Machine failure label is 1',
      anyModeFlag: 'Count of rows carrying at least one of TWF, HDF, PWF, OSF or RNF',
      modeFlagTotal: 'Sum of mode memberships; one record can contribute to several modes',
      multipleModeFlags: 'Count of rows carrying at least two mode flags',
      rate: '100 times the selected count divided by population records; empty population is unavailable',
    },
    populations: summarizeMaintenance(records),
  };
}

/** The byte digest pins the released input; parsing/aggregation alone admit focused fixtures. */
export async function buildMaintenanceData({ check = false } = {}) {
  const root = new URL('../', import.meta.url);
  const source = await readFile(new URL(SOURCE_PATH, root));
  if (createHash('sha256').update(source).digest('hex') !== SOURCE_SHA256) throw new Error('Maintenance source differs from the admitted release.');
  const document = {
    ...maintenanceDocument(parseMaintenanceCsv(source.toString('utf8'))),
    source: {
      doi: SOURCE_DOI,
      sha256: SOURCE_SHA256,
      standing: 'published-generated-records',
      license: 'CC-BY-4.0',
    },
    population: 'Released AI4I 2020 records, grouped by the source Type field',
  };
  const output = `${JSON.stringify(document, null, 2)}\n`;
  const destination = new URL(SUMMARY_PATH, root);
  if (check) {
    if (await readFile(destination, 'utf8') !== output) throw new Error('Maintenance summary differs from its source-owned derivation.');
  } else await writeFile(destination, output);
  return { records: document.populations[0].records, populations: document.populations.length, disagreements: document.populations[0].disagreements };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || !['--write', '--check'].includes(process.argv[2])) throw new Error('Use --write or --check.');
  console.log(JSON.stringify(await buildMaintenanceData({ check: process.argv[2] === '--check' })));
}
