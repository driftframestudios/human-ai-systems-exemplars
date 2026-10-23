import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

const DIRECTORY = new URL('../../visual-fidelity-contracts/probes/components-and-data/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('probe-catalog.v1.json', DIRECTORY), 'utf8'));
const schema = JSON.parse(await readFile(new URL('probe-catalog.schema.json', DIRECTORY), 'utf8'));

test('component and data-view probe catalog satisfies its closed public schema', () => {
  const validate = new Ajv2020({ strict: true }).compile(schema);
  assert.equal(validate(catalog), true, JSON.stringify(validate.errors));
  const ids = catalog.probes.map(probe => probe.id);
  assert.equal(new Set(ids).size, ids.length, 'probe identities remain unique');
  assert.match(catalog.claimBoundary, /Receiving environments supply/u);
});

test('every probe evidence route resolves to a source or focused check', async () => {
  for (const probe of catalog.probes) {
    for (const route of [...probe.sources, ...probe.tests]) {
      await assert.doesNotReject(access(new URL(route, DIRECTORY)), `${probe.id} route resolves: ${route}`);
    }
  }
});
