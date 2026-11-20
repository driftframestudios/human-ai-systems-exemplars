import './node-runtime-admission.mjs';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDirectExecution } from './check-node-runtime.mjs';
import { createProductionCarrierPlan, createProductionProjectionPlan } from './build-prod-projection.mjs';
import { createDeterministicZip, inspectCarrierZip } from './package-prod-carrier-transfer.mjs';

async function main() {
  const projection = await createProductionProjectionPlan();
  const plan = createProductionCarrierPlan(projection);
  const root = 'portfolio-' + plan.manifest.source_sha;
  const files = new Map();
  for (const [name, bytes] of plan.outputFiles) files.set(root + '/' + name, bytes);
  const archive = createDeterministicZip(Array.from(files, ([name, bytes]) => ({
    path: name, bytes, mode: 0o100644,
  })));
  const directory = path.join('.cpanel-transfer', 'local');
  await mkdir(directory, { recursive: true });
  const temporary = await mkdtemp(path.join(directory, '.build-'));
  try {
    const staged = path.join(temporary, 'portfolio.zip');
    await writeFile(staged, archive);
    const result = inspectCarrierZip(await readFile(staged), { expectedFiles: files, rootDirectory: root });
    const destination = path.join(directory, root + '-' + result.archiveSha256.slice(0, 12) + '.zip');
    await rename(staged, destination);
    console.log('Verified ' + result.entries + ' files in ' + destination);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (isDirectExecution(import.meta.url)) await main();
