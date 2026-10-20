import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

import {
  artifactAuthor,
  artifactLicense,
  publishingCompany
} from '../../tools/attribution-contract.mjs';
import { runStagedArtifactTransaction } from '../../tools/build-visual-fidelity-pattern-library.mjs';

const ROOT = new URL('../../visual-fidelity-contracts/examples/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.v1.json', ROOT), 'utf8'));
const gallery = await readFile(new URL('index.html', ROOT), 'utf8');
const galleryStyles = await readFile(new URL('styles.css', ROOT), 'utf8');
const definitions = JSON.parse(await readFile(new URL('source/example-definitions.v1.json', ROOT), 'utf8'));
const visualFidelityCatalog = JSON.parse(
  await readFile(new URL('../../visual-fidelity-contracts/catalog.v1.json', import.meta.url), 'utf8')
);

test('a rejected candidate preserves every accepted generated artifact byte', async t => {
  const workspace = await mkdtemp(join(tmpdir(), 'vfc-pattern-transaction-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const acceptedRoot = join(workspace, 'accepted-examples');
  const generatedPaths = [
    'images/family/example-1600.webp',
    'figures/example.v1.json',
    'index.html',
    'catalog.v1.json'
  ];
  const acceptedBytes = new Map();
  for (const [index, path] of generatedPaths.entries()) {
    const bytes = Buffer.from(`accepted-${index}\n`);
    const destination = join(acceptedRoot, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
    acceptedBytes.set(path, bytes);
  }

  await assert.rejects(
    runStagedArtifactTransaction({
      acceptedRoot,
      prepareCandidate: async candidateRoot => {
        for (const [index, path] of generatedPaths.entries()) {
          const destination = join(candidateRoot, path);
          await mkdir(dirname(destination), { recursive: true });
          const bytes = path === 'catalog.v1.json'
            ? `${JSON.stringify({ pinned1600Sha256: 'accepted', candidate1600Sha256: 'candidate' })}\n`
            : `candidate-${index}\n`;
          await writeFile(destination, bytes);
        }
        return { generatedPaths };
      },
      validateCandidate: async (_candidate, candidateRoot) => {
        const candidateCatalog = JSON.parse(await readFile(join(candidateRoot, 'catalog.v1.json'), 'utf8'));
        assert.equal(
          candidateCatalog.candidate1600Sha256,
          candidateCatalog.pinned1600Sha256,
          'The pinned 1600-pixel checksum rejected the candidate catalog.'
        );
      }
    }),
    /pinned 1600-pixel checksum/u
  );

  for (const path of generatedPaths) {
    assert.deepEqual(await readFile(join(acceptedRoot, path)), acceptedBytes.get(path));
  }
  assert.deepEqual(await readdir(workspace), ['accepted-examples']);
});

test('a mid-publication fault restores replaced bytes and removes introduced files', async t => {
  const workspace = await mkdtemp(join(tmpdir(), 'vfc-pattern-promotion-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const acceptedRoot = join(workspace, 'accepted-examples');
  const generatedPaths = [
    'images/family/existing.webp',
    'images/family/introduced.webp',
    'catalog.v1.json'
  ];
  const acceptedGeneratedPaths = [
    'images/family/existing.webp',
    'images/retired/obsolete.webp',
    'catalog.v1.json'
  ];
  const acceptedImage = Buffer.from('accepted-image\n');
  const acceptedObsoleteImage = Buffer.from('accepted-obsolete-image\n');
  const acceptedCatalog = Buffer.from('{"standing":"accepted"}\n');
  await mkdir(join(acceptedRoot, 'images', 'family'), { recursive: true });
  await mkdir(join(acceptedRoot, 'images', 'retired'), { recursive: true });
  await writeFile(join(acceptedRoot, generatedPaths[0]), acceptedImage);
  await writeFile(join(acceptedRoot, acceptedGeneratedPaths[1]), acceptedObsoleteImage);
  await writeFile(join(acceptedRoot, generatedPaths[2]), acceptedCatalog);

  await assert.rejects(
    runStagedArtifactTransaction({
      acceptedRoot,
      acceptedGeneratedPaths,
      prepareCandidate: async candidateRoot => {
        for (const [index, path] of generatedPaths.entries()) {
          const destination = join(candidateRoot, path);
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination, `candidate-${index}\n`);
        }
        return { generatedPaths };
      },
      validateCandidate: async () => {},
      publishArtifact: async ({ candidatePath, acceptedPath, path }) => {
        if (path === 'catalog.v1.json') throw new Error('Injected catalog publication fault.');
        await rename(candidatePath, acceptedPath);
      }
    }),
    /accepted artifact family was restored/iu
  );

  assert.deepEqual(await readFile(join(acceptedRoot, generatedPaths[0])), acceptedImage);
  await assert.rejects(readFile(join(acceptedRoot, generatedPaths[1])), { code: 'ENOENT' });
  assert.deepEqual(await readFile(join(acceptedRoot, acceptedGeneratedPaths[1])), acceptedObsoleteImage);
  assert.deepEqual(await readFile(join(acceptedRoot, generatedPaths[2])), acceptedCatalog);
  assert.deepEqual(await readdir(workspace), ['accepted-examples']);
});

test('a successful publication retires artifacts absent from the accepted catalog family', async t => {
  const workspace = await mkdtemp(join(tmpdir(), 'vfc-pattern-retirement-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const acceptedRoot = join(workspace, 'accepted-examples');
  const generatedPaths = [
    'images/current/example.webp',
    'figures/current.v1.json',
    'catalog.v1.json'
  ];
  const acceptedGeneratedPaths = [
    'images/retired/old-example.webp',
    'figures/old-example.v1.json',
    'catalog.v1.json'
  ];
  for (const [index, path] of acceptedGeneratedPaths.entries()) {
    const destination = join(acceptedRoot, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `accepted-${index}\n`);
  }

  await runStagedArtifactTransaction({
    acceptedRoot,
    acceptedGeneratedPaths,
    prepareCandidate: async candidateRoot => {
      for (const [index, path] of generatedPaths.entries()) {
        const destination = join(candidateRoot, path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, `candidate-${index}\n`);
      }
      return { generatedPaths };
    },
    validateCandidate: async () => {}
  });

  assert.deepEqual(await readFile(join(acceptedRoot, generatedPaths[0])), Buffer.from('candidate-0\n'));
  assert.deepEqual(await readFile(join(acceptedRoot, generatedPaths[1])), Buffer.from('candidate-1\n'));
  assert.deepEqual(await readFile(join(acceptedRoot, generatedPaths[2])), Buffer.from('candidate-2\n'));
  await assert.rejects(readFile(join(acceptedRoot, acceptedGeneratedPaths[0])), { code: 'ENOENT' });
  await assert.rejects(readFile(join(acceptedRoot, acceptedGeneratedPaths[1])), { code: 'ENOENT' });
  assert.deepEqual(await readdir(workspace), ['accepted-examples']);
});

test('pattern catalog closes four source, contract, companion, test, and image families', async () => {
  assert.equal(catalog.examples.length, 4);
  assert.deepEqual(catalog.examples.map(example => example.category), [
    'industrial-ink',
    'soft-color-blocking',
    'component-and-recovery',
    'data-view-and-evidence'
  ]);
  for (const example of catalog.examples) {
    for (const relativePath of [example.source.path, example.contract.path, ...example.tests]) {
      await stat(new URL(`../../${relativePath}`, ROOT));
    }
    const companion = JSON.parse(await readFile(new URL(example.semanticCompanion.path, ROOT), 'utf8'));
    assert.equal(companion.exampleId, example.id);
    assert.equal(companion.relationships.length, example.semanticCompanion.relationships.length);
    assert.deepEqual(companion.source, example.source);
    assert.deepEqual(companion.contract, example.contract);
    assert.equal(companion.publicContinuation, example.publicContinuation);
    assert.deepEqual(companion.rights, example.rights);
    assert.deepEqual(companion.publicationReceipt, example.publicationReceipt);
    assert.deepEqual(companion.tests, example.tests);
    assert.equal(example.rights.license, 'Apache-2.0');
    assert.equal(example.rights.copyrightHoldersSource, 'AUTHORS');
    assert.deepEqual(example.rights.copyrightHolders, [artifactAuthor, publishingCompany]);
    assert.equal(example.rights.publisher, publishingCompany);
    assert.equal(example.publicationReceipt.publicationAuthority.standing, 'held');
    assert.match(example.publicContinuation, /^https:\/\/kindlight\.systems\//u);
    assert.match(example.contract.publicRoute, /^https:\/\/kindlight\.systems\//u);
    assert.equal(example.responsiveImage.derivatives.length, 3);

    const closure = createHash('sha256');
    const declaredFiles = [...example.source.files].sort((left, right) => left.localeCompare(right, 'en'));
    for (const relativePath of declaredFiles) {
      const bytes = await readFile(new URL(`../../${relativePath}`, ROOT));
      closure.update(relativePath);
      closure.update('\0');
      closure.update(bytes);
      closure.update('\0');
    }
    assert.deepEqual(example.publicationReceipt.sourceClosure.files, declaredFiles);
    assert.equal(example.publicationReceipt.sourceClosure.sha256, closure.digest('hex'));
  }
});

test('each pattern evidence route remains owned by the main Visual Fidelity catalog', () => {
  for (const example of definitions.examples) {
    const sourceDirectory = dirname(example.source.path);
    const owner = visualFidelityCatalog.resources.find(resource => dirname(resource.sourcePath) === sourceDirectory)
      ?? visualFidelityCatalog.contracts.find(contract => contract.id === example.contract.id);
    assert.ok(owner, `${example.id} resolves a contract or executable-lab owner.`);
    assert.ok(example.tests.some(path => path.includes('browser')),
      `${example.id} names a browser owner for its rendered behavior.`);
    for (const testPath of example.tests) {
      assert.ok(owner.tests.includes(testPath), `${owner.id} declares ${testPath}.`);
    }
  }
});

test('responsive derivatives carry exact dimensions, checksums, and stripped descriptive metadata', async () => {
  for (const example of catalog.examples) {
    let previousWidth = 0;
    for (const derivative of example.responsiveImage.derivatives) {
      const url = new URL(derivative.path, ROOT);
      const bytes = await readFile(url);
      const metadata = await sharp(bytes).metadata();
      const digest = createHash('sha256').update(bytes).digest('hex');
      assert.equal(metadata.format, 'webp');
      assert.equal(metadata.width, derivative.width);
      assert.equal(metadata.height, derivative.height);
      assert.equal(bytes.length, derivative.bytes);
      assert.equal(digest, derivative.sha256);
      assert.ok(derivative.width > previousWidth);
      assert.equal(Boolean(metadata.exif), false);
      assert.equal(Boolean(metadata.xmp), false);
      assert.equal(Boolean(metadata.iptc), false);
      previousWidth = derivative.width;
    }
  }
});

test('gallery markup carries intrinsic dimensions, responsive candidates, captions, and semantic companions', () => {
  assert.doesNotMatch(gallery, /[\t ]+$/gmu, 'Generated gallery lines end with content or a newline.');
  assert.equal((gallery.match(/<figure\b/gu) ?? []).length, 4);
  assert.equal((gallery.match(/srcset=/gu) ?? []).length, 4);
  assert.equal((gallery.match(/sizes=/gu) ?? []).length, 4);
  assert.equal((gallery.match(/loading="lazy"/gu) ?? []).length, 4);
  assert.equal((gallery.match(/<figcaption\b/gu) ?? []).length, 4);
  assert.equal((gallery.match(/<details class="pattern__companion">/gu) ?? []).length, 4);
  for (const example of catalog.examples) {
    assert.match(gallery, new RegExp(`id="${example.slug}"`, 'u'));
    assert.match(gallery, new RegExp(`width="${example.responsiveImage.intrinsicWidth}"`, 'u'));
    assert.match(gallery, new RegExp(`height="${example.responsiveImage.intrinsicHeight}"`, 'u'));
    assert.match(gallery, new RegExp(example.alt.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'));
  }
});

test('gallery CSS resolves each custom-property reference through a local declaration or explicit fallback', () => {
  const declarations = new Set(
    [...galleryStyles.matchAll(/(--[a-z0-9-]+)\s*:/giu)].map(match => match[1])
  );
  const references = [...galleryStyles.matchAll(/var\(\s*(--[a-z0-9-]+)(\s*,[^)]*)?\)/giu)];

  assert.ok(references.length > 0, 'The gallery declares custom-property consumers.');
  for (const [, name, fallback] of references) {
    assert.ok(
      declarations.has(name) || Boolean(fallback),
      `${name} resolves through a gallery declaration or an explicit fallback.`
    );
  }
});

test('public pattern records stay locator-safe and carry desired-state language', async () => {
  const files = [
    await readFile(new URL('README.md', ROOT), 'utf8'),
    gallery,
    JSON.stringify(catalog)
  ].join('\n');
  assert.doesNotMatch(files, /notion\.so|notion\.site|\/Users\/|\.codex|prototype-exemplars/iu);
  assert.match(files, /accepted state/iu);
  assert.match(files, /semantic companion/iu);
  assert.match(files, /receiving application owns/iu);
});

test('gallery declares exact attribution and public continuation routes', () => {
  assert.match(gallery, new RegExp(`<meta name="author" content="${artifactAuthor}">`, 'u'));
  assert.ok(gallery.includes(`<link rel="license" href="${artifactLicense}">`));
  assert.ok(gallery.includes(`© 2003–2026 ${artifactAuthor} · ${publishingCompany}`));
  for (const example of catalog.examples) assert.ok(gallery.includes(example.publicContinuation));
});
