import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildMaintenanceData, maintenanceDocument, MODE_KEYS, parseMaintenanceCsv, SOURCE_PATH, summarizeMaintenance } from '../../tools/atlas-maintenance-data.mjs';

const header = 'UDI,Product ID,Type,Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min],Machine failure,TWF,HDF,PWF,OSF,RNF';
const row = ['1', 'L10001', 'L', '300.0', '310.0', '1500', '40.0', '0', '0', '0', '0', '0', '0', '0'];
const csv = rows => `${header}\n${rows.map(fields => fields.join(',')).join('\n')}\n`;

test('released source preserves independent cohort, membership, and agreement totals', async () => {
  const records = parseMaintenanceCsv(await readFile(new URL(`../../${SOURCE_PATH}`, import.meta.url), 'utf8'));
  const populations = summarizeMaintenance(records);
  assert.deepEqual(populations.map(p => [p.type, p.records, p.machineFailure, p.anyModeFlag, p.modeFlagTotal, p.multipleModeFlags, p.disagreements]), [
    ['all', 10000, 339, 348, 373, 24, 27], ['L', 6000, 235, 243, 260, 17, 16],
    ['M', 2997, 83, 81, 87, 6, 6], ['H', 1003, 21, 24, 26, 1, 5],
  ]);
  assert.deepEqual(populations[0].agreement, { neither: 9643, modeOnly: 18, labelOnly: 9, both: 330 });
  assert.deepEqual(MODE_KEYS.map(key => populations[0].modes[key]), [46, 115, 95, 98, 19]);
  assert.equal(populations[0].machineFailurePer100, 3.39);
  assert.equal(populations[0].anyModeFlagPer100, 3.48);
});

test('BOM and CRLF retain field meaning', () => {
  const ordinary = csv([row]);
  assert.deepEqual(parseMaintenanceCsv(`\uFEFF${ordinary.replaceAll('\n', '\r\n')}`), parseMaintenanceCsv(ordinary));
});

for (const [name, index, value] of [
  ['empty numeric field', 3, ''], ['numeric suffix', 3, '300K'], ['infinity', 3, 'Infinity'],
  ['negative torque', 6, '-1'], ['fractional identity', 0, '1.5'], ['zero identity', 0, '0'],
  ['unsafe identity', 0, '9007199254740992'], ['fractional speed', 5, '1500.2'], ['zero speed', 5, '0'],
  ['fractional wear', 7, '0.5'], ['unknown type', 2, 'X'], ['type mismatch', 1, 'M10001'],
  ['invalid target', 8, '2'], ['blank mode', 9, ''], ['quoted field', 1, '"L10001"'],
]) {
  test(`source admission rejects ${name}`, () => {
    const candidate = [...row]; candidate[index] = value;
    assert.throws(() => parseMaintenanceCsv(csv([candidate])), TypeError);
  });
}

for (const [name, source] of [
  ['empty', ''], ['header only', `${header}\n`], ['extra field', csv([[...row, 'extra']])],
  ['missing field', csv([row.slice(0, -1)])], ['duplicate identity', csv([row, row])],
  ['blank record', `${csv([row])}\n`], ['bare carriage return', csv([row]).replaceAll('\n', '\r')],
  ['size limit', ' '.repeat(1_000_001)], ['record limit', csv(Array(10_001).fill(row))],
]) test(`CSV boundary rejects ${name}`, () => assert.throws(() => parseMaintenanceCsv(source), TypeError));

test('overlap and disagreements retain separate counts in a small independently specified fixture', () => {
  const rows = [row, row, row, row].map((fields, i) => { const result = [...fields]; result[0] = String(i + 1); return result; });
  rows[1][8] = '1';
  rows[2][9] = '1';
  rows[3][8] = '1'; rows[3][9] = '1'; rows[3][10] = '1';
  const records = parseMaintenanceCsv(csv(rows));
  const before = JSON.stringify(records);
  const result = summarizeMaintenance(records)[0];
  assert.deepEqual(result.agreement, { neither: 1, modeOnly: 1, labelOnly: 1, both: 1 });
  assert.equal(result.machineFailure, 2);
  assert.equal(result.anyModeFlag, 2);
  assert.equal(result.modeFlagTotal, 3);
  assert.equal(result.multipleModeFlags, 1);
  assert.equal(result.disagreements, 2);
  assert.equal(result.machineFailurePer100, 50);
  assert.equal(JSON.stringify(records), before);
});

test('zero observations and zero positive labels have different availability', () => {
  const populations = summarizeMaintenance(parseMaintenanceCsv(csv([row])));
  assert.equal(populations[0].availability, 'available');
  assert.equal(populations[0].machineFailurePer100, 0);
  for (const population of populations.filter(p => ['M', 'H'].includes(p.type))) {
    assert.equal(population.records, 0);
    assert.equal(population.availability, 'unavailable');
    assert.equal(population.machineFailurePer100, null);
    assert.equal(population.anyModeFlagPer100, null);
  }
  assert.ok(summarizeMaintenance([]).every(p => p.availability === 'unavailable'));
});

test('aggregation admits bounded, independently owned record fields', () => {
  const record = parseMaintenanceCsv(csv([row]))[0];
  const inherited = Object.create(record.modeFlags);
  for (const candidate of [null, {}, { ...record, type: '__proto__' }, { ...record, machineFailure: NaN },
    { ...record, modeFlags: inherited }, { ...record, modeFlags: { ...record.modeFlags, TWF: '1' } }]) {
    assert.throws(() => summarizeMaintenance([candidate]), TypeError);
  }
  for (const input of [null, {}, [record, record], Array(10_001).fill(record)]) assert.throws(() => summarizeMaintenance(input), TypeError);
});

test('document JSON roundtrip keeps source identity and detached aggregates', () => {
  const records = parseMaintenanceCsv(csv([row]));
  const document = maintenanceDocument(records);
  assert.deepEqual(JSON.parse(JSON.stringify(document)), document);
  document.populations[0].modes.TWF = 500;
  document.populations[0].agreement.neither = 500;
  assert.equal(summarizeMaintenance(records)[0].modes.TWF, 0);
  assert.equal(summarizeMaintenance(records)[0].agreement.neither, 1);
});

test('committed summary is the exact digest-bound source derivation', async () => {
  assert.deepEqual(await buildMaintenanceData({ check: true }), { records: 10000, populations: 4, disagreements: 27 });
});


test('pure fixture documents keep verified-file provenance with the build boundary', () => {
  const document = maintenanceDocument([]);
  assert.equal(Object.hasOwn(document, 'source'), false);
  assert.equal(document.population, 'Supplied records grouped by the source Type field');
});

for (const field of ['id', 'type', 'machineFailure', 'modeFlags', 'all']) {
  test('aggregation requires owned consumed fields: ' + field, () => {
    const owned = {
      id: 1, type: 'L', machineFailure: 0,
      modeFlags: { TWF: 0, HDF: 0, PWF: 0, OSF: 0, RNF: 0 },
    };
    const inherited = field === 'all' ? Object.create(owned) : Object.assign(Object.create({ [field]: owned[field] }), owned);
    if (field !== 'all') delete inherited[field];
    assert.throws(() => summarizeMaintenance([inherited]), /own id, type, machineFailure, and modeFlags/);
  });
}

for (const [index, value] of [[0, '1.0000000000000001'], [5, '1500.0000000000001'], [7, '1.0000000000000001']]) {
  test('integer CSV fields retain textual precision at column ' + index, () => {
    const header = 'UDI,Product ID,Type,Air temperature [K],Process temperature [K],Rotational speed [rpm],Torque [Nm],Tool wear [min],Machine failure,TWF,HDF,PWF,OSF,RNF';
    const record = ['1', 'L10001', 'L', '300.0', '310.0', '1500', '40.0', '0', '0', '0', '0', '0', '0', '0'];
    record[index] = value;
    assert.throws(() => parseMaintenanceCsv(header + '\n' + record.join(',') + '\n'), /whole-number literal/);
  });
}
