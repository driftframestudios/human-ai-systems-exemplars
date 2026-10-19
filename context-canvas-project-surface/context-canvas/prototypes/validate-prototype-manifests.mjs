#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const libraryDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(libraryDirectory, '../../..');
const rootManifestPath = resolve(libraryDirectory, 'manifest.json');
const failures = [];

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`${filePath}: ${error.message}`);
    return null;
  }
}

function requirePath(label, filePath) {
  if (!existsSync(filePath)) failures.push(`${label} is missing: ${filePath}`);
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

const rootManifest = readJson(rootManifestPath);
if (!rootManifest) process.exitCode = 1;

for (const collection of rootManifest?.collections ?? []) {
  const localManifestPath = resolve(libraryDirectory, collection.localManifest);
  requirePath(`${collection.id} local manifest`, localManifestPath);
  if (!existsSync(localManifestPath)) continue;

  const localManifest = readJson(localManifestPath);
  if (!localManifest) continue;
  const manifestDirectory = dirname(localManifestPath);
  const localDirectory = resolve(repositoryRoot, localManifest.localPath);
  const sourceDirectory = resolve(manifestDirectory, localManifest.sourcePath);
  const entryPath = resolve(localDirectory, localManifest.entryFile);
  const sourceManifestPath = resolve(localDirectory, localManifest.sourceManifest);

  requirePath(`${localManifest.id} localPath`, localDirectory);
  requirePath(`${localManifest.id} sourcePath`, sourceDirectory);
  requirePath(`${localManifest.id} entryFile`, entryPath);
  requirePath(`${localManifest.id} sourceManifest`, sourceManifestPath);

  const allowedPostures = new Set([
    'internal-reference-only',
    'repository-local-experimental-projection',
    'visitor-linked-through-receiving-pages'
  ]);
  if (!allowedPostures.has(localManifest.publicationPosture)) {
    failures.push(`${localManifest.id} has an unsupported publicationPosture`);
  }

  const expectedContract = {
    sourcePath: 'manifest-directory',
    localPath: 'repository-root',
    entryFile: 'localPath',
    sourceManifest: 'localPath',
    usedByPages: 'manifest-directory'
  };
  for (const [field, value] of Object.entries(expectedContract)) {
    if (localManifest.pathContract?.[field] !== value) {
      failures.push(`${localManifest.id} pathContract.${field} must be ${value}`);
    }
  }

  if (existsSync(entryPath)) {
    const actualHash = sha256(entryPath);
    if (localManifest.integrity?.algorithm !== 'sha256' || localManifest.integrity?.entryFile !== actualHash) {
      failures.push(`${localManifest.id} entryFile integrity does not match ${actualHash}`);
    }
  }

  for (const usedByPage of localManifest.usedByPages ?? []) {
    requirePath(`${localManifest.id} usedByPages`, resolve(manifestDirectory, usedByPage));
  }

  if (localManifest.archive?.path) {
    requirePath(`${localManifest.id} archive`, resolve(localDirectory, localManifest.archive.path));
  }
}

if (failures.length) {
  console.error(`Prototype manifest validation failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Prototype manifest validation passed for ${rootManifest.collections.length} collections.`);
}
