import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

import { startStaticServer } from './core-architecture-browser-helper.mjs';
import {
  artifactAttribution,
  artifactAuthor,
  artifactLicense,
  publishingCompany
} from './attribution-contract.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const examplesRoot = join(repositoryRoot, 'visual-fidelity-contracts', 'examples');
const definitionsPath = join(examplesRoot, 'source', 'example-definitions.v1.json');
const visualFidelityCatalogPath = join(repositoryRoot, 'visual-fidelity-contracts', 'catalog.v1.json');
const widths = Object.freeze([640, 1280, 1600]);
const mode = process.argv.includes('--check') ? 'check' : 'capture';
const privateLocatorPattern = /notion\.so|notion\.site|\/Users\/|\.codex|prototype-exemplars/iu;
const secretShapedPatterns = Object.freeze([
  /\b(?:api[ _-]?key|password|secret|token)\s*:\s*\S+/iu,
  /\b(?:github_pat|ghp|gho|ghu|ghs|ghr|sk)_[\p{L}\p{N}_-]{8,}\b/iu,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u
]);
const evidenceOwnerByExampleId = Object.freeze({
  'vfp:industrial-ink:service-boundary': 'vfc-resource:service-boundary-lab',
  'vfp:soft-color-blocking:workflow': 'vfc:soft-color-blocking',
  'vfp:component:accepted-recovery': 'vfc-resource:component-lab',
  'vfp:data-view:value-standing': 'vfc-resource:data-view-lab'
});
const browserEvidenceByExampleId = Object.freeze({
  'vfp:industrial-ink:service-boundary': 'tests/visual-fidelity-contracts/service-boundary.browser.mjs',
  'vfp:soft-color-blocking:workflow': 'tests/visual-fidelity-contracts/contract-art-directions.browser.mjs',
  'vfp:component:accepted-recovery': 'tests/visual-fidelity-contracts/component.browser.mjs',
  'vfp:data-view:value-standing': 'tests/visual-fidelity-contracts/data-view-browser.test.mjs'
});

function resolveInsideRepository(path) {
  return resolveInside(repositoryRoot, path);
}

function resolveInside(root, path) {
  const candidate = resolve(root, path);
  const relation = relative(root, candidate);
  assert.ok(relation && !relation.startsWith(`..${sep}`) && relation !== '..', `Path leaves the repository: ${path}`);
  return candidate;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sourceHref(path) {
  return `../${path.replace(/^visual-fidelity-contracts\//u, '')}`;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function validateDefinitions(definitions) {
  assert.equal(definitions.schemaVersion, '1.0.0');
  assert.equal(definitions.examples.length, 4, 'The first shelf carries four representative families.');
  assert.deepEqual(definitions.examples.map(example => example.ordinal), [1, 2, 3, 4]);
  assert.equal(new Set(definitions.examples.map(example => example.id)).size, definitions.examples.length);
  const categories = definitions.examples.map(example => example.category);
  assert.deepEqual(categories, [
    'industrial-ink',
    'soft-color-blocking',
    'component-and-recovery',
    'data-view-and-evidence'
  ]);
  for (const example of definitions.examples) {
    for (const key of ['id', 'slug', 'title', 'description', 'alt', 'caption']) {
      assert.ok(example[key], `${example.id} supplies ${key}.`);
    }
    assert.match(example.contract.publicRoute, /^https:\/\/kindlight\.systems\//u);
    assert.match(example.publicContinuation, /^https:\/\/kindlight\.systems\//u);
    const rights = example.rights ?? definitions.rights;
    assert.equal(rights.license, 'Apache-2.0');
    assert.equal(rights.copyrightHoldersSource, 'AUTHORS');
    assert.deepEqual(rights.copyrightHolders, [artifactAuthor, publishingCompany]);
    assert.equal(rights.publisher, publishingCompany);
    assert.ok(rights.standing, `${example.id} supplies rights standing.`);
    assert.ok(example.source.files.length >= 2, `${example.id} declares its materially meaningful source set.`);
    assert.ok(example.source.files.includes(example.source.path), `${example.id} includes its entry point in the source set.`);
    assert.ok(
      example.tests.includes(browserEvidenceByExampleId[example.id]),
      `${example.id} declares the browser check that owns its rendered behavior.`
    );
    assert.match(example.pixelInspection.derivativeSha256, /^[0-9a-f]{64}$/u);
    assert.ok(example.semanticCompanion.summary);
    assert.ok(example.semanticCompanion.relationships.length >= 4);
  }
  const publicText = JSON.stringify(definitions);
  assert.doesNotMatch(publicText, /notion\.so|notion\.site|\/Users\/|\.codex|prototype-exemplars/iu);
}

async function validateEvidenceParity(definitions) {
  const contractCatalog = await loadJson(visualFidelityCatalogPath);
  const owners = new Map(
    [...contractCatalog.contracts, ...contractCatalog.resources].map(owner => [owner.id, owner])
  );
  for (const example of definitions.examples) {
    const ownerId = evidenceOwnerByExampleId[example.id];
    const owner = owners.get(ownerId);
    assert.ok(owner, `${example.id} resolves evidence owner ${ownerId} in the Visual Fidelity catalog.`);
    for (const testPath of example.tests) {
      assert.ok(
        owner.tests.includes(testPath),
        `${example.id} evidence ${testPath} is also declared by ${ownerId}.`
      );
    }
  }
}

async function prepareState(page, example) {
  if (example.source.state === 'success') {
    await page.locator('[data-scenario="success"]').click();
    await page.locator('[data-live-status]').getByText(/success scenario complete/iu).waitFor();
    return;
  }
  if (example.source.state === 'review') {
    await page.locator('input[name="workflow-state"][value="review"]').check();
    return;
  }
  if (example.source.state === 'accepted-receipt') {
    await page.locator('[data-component-data]').getByText(/current data/iu).waitFor();
    await page.locator('#component-email').fill('reader@example.invalid');
    await page.locator('#component-authorization').selectOption('allowed');
    await page.locator('[data-component-form]').evaluate(form => form.requestSubmit());
    await page.locator('[data-component-receipt][data-standing="accepted"]').waitFor();
    return;
  }
  if (example.source.state === 'partial') {
    await page.locator('[data-data-revision]').getByText(/cohort-r1/iu).waitFor();
    await page.locator('[data-data-action="load"][data-fixture="partial"]').click();
    await page.locator('[data-data-standing]').getByText(/partial/iu).waitFor();
    return;
  }
  throw new Error(`Unsupported capture state: ${example.source.state}`);
}

async function captureSources(definitions, candidateRoot) {
  let server;
  let browser;
  let primaryError;
  const temporaryRoot = join(candidateRoot, '.capture');
  try {
    server = await startStaticServer(repositoryRoot);
    browser = await chromium.launch();
    await rm(temporaryRoot, { recursive: true, force: true });
    await mkdir(temporaryRoot, { recursive: true });
    for (const example of definitions.examples) {
      let page;
      try {
        page = await browser.newPage({
          viewport: { width: 1600, height: 1200 },
          deviceScaleFactor: 2,
          reducedMotion: 'reduce',
          colorScheme: 'light'
        });
        const errors = [];
        page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
        page.on('console', message => {
          if (message.type() === 'error') errors.push(`console: ${message.text()}`);
        });
        const url = new URL(`/${example.source.path}`, server.origin);
        await page.goto(url.href, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await prepareState(page, example);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const locator = page.locator(example.source.selector);
        await locator.waitFor({ state: 'visible' });
        const pngPath = join(temporaryRoot, `${example.slug}.png`);
        await locator.screenshot({ path: pngPath, animations: 'disabled' });
        assert.deepEqual(errors, [], `${example.id} loads without browser errors.`);

        const imageDirectory = join(candidateRoot, 'images', example.category);
        await mkdir(imageDirectory, { recursive: true });
        for (const width of widths) {
          const output = join(imageDirectory, `${example.slug}-${width}.webp`);
          await sharp(pngPath)
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 88, effort: 6, smartSubsample: true })
            .toFile(output);
        }
      } finally {
        await page?.close();
      }
    }
  } catch (error) {
    primaryError = error;
  } finally {
    const cleanup = [
      browser?.close(),
      server?.close(),
      rm(temporaryRoot, { recursive: true, force: true })
    ].filter(Boolean);
    const results = await Promise.allSettled(cleanup);
    const cleanupErrors = results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);
    if (primaryError || cleanupErrors.length) {
      throw new AggregateError(
        [primaryError, ...cleanupErrors].filter(Boolean),
        'Pattern capture or cleanup failed.'
      );
    }
  }
}

async function inspectSourceClosure(example) {
  const files = [...example.source.files].sort((a, b) => a.localeCompare(b, 'en'));
  const digest = createHash('sha256');
  for (const file of files) {
    const bytes = await readFile(resolveInsideRepository(file));
    digest.update(file);
    digest.update('\0');
    digest.update(bytes);
    digest.update('\0');
  }
  return { algorithm: 'sha256', files, sha256: digest.digest('hex') };
}

async function inspectPublicLocators(definitions) {
  const paths = new Set([definitionsPath, ...definitions.examples.flatMap(example => example.source.files.map(resolveInsideRepository))]);
  for (const path of paths) {
    const source = await readFile(path, 'utf8');
    assert.doesNotMatch(source, privateLocatorPattern, path);
    for (const pattern of secretShapedPatterns) assert.doesNotMatch(source, pattern, path);
  }
}

async function inspectPublicationArtifacts(catalog, artifactRoot = examplesRoot) {
  const paths = [
    definitionsPath,
    join(artifactRoot, 'catalog.v1.json'),
    join(artifactRoot, 'index.html')
  ];
  for (const example of catalog.examples) {
    paths.push(...example.source.files.map(resolveInsideRepository));
    paths.push(resolveInside(artifactRoot, example.semanticCompanion.path));
  }
  for (const path of new Set(paths)) {
    const source = await readFile(path, 'utf8');
    assert.doesNotMatch(source, privateLocatorPattern, path);
    for (const pattern of secretShapedPatterns) assert.doesNotMatch(source, pattern, path);
  }
}

async function inspectDerivative(example, width, artifactRoot = examplesRoot) {
  const relativePath = `images/${example.category}/${example.slug}-${width}.webp`;
  const absolutePath = resolveInside(artifactRoot, relativePath);
  const bytes = await readFile(absolutePath);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok(metadata.width && metadata.height);
  const file = await stat(absolutePath);
  return {
    path: relativePath,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    bytes: file.size,
    sha256: sha256(bytes),
    metadata: {
      exif: Boolean(metadata.exif),
      xmp: Boolean(metadata.xmp),
      iptc: Boolean(metadata.iptc),
      orientation: metadata.orientation ?? null,
      colorProfile: metadata.icc ? 'embedded' : 'sRGB encoder default'
    }
  };
}

async function formCatalog(definitions, artifactRoot = examplesRoot) {
  const examples = [];
  for (const example of definitions.examples) {
    const sourcePath = resolveInsideRepository(example.source.path);
    const contractPath = resolveInsideRepository(example.contract.path);
    await access(sourcePath);
    await access(contractPath);
    for (const test of example.tests) await access(resolveInsideRepository(test));
    const sourceClosure = await inspectSourceClosure(example);
    const derivatives = [];
    for (const width of widths) derivatives.push(await inspectDerivative(example, width, artifactRoot));
    for (const derivative of derivatives) {
      assert.equal(derivative.metadata.exif, false, `${derivative.path} carries EXIF metadata.`);
      assert.equal(derivative.metadata.xmp, false, `${derivative.path} carries XMP metadata.`);
      assert.equal(derivative.metadata.iptc, false, `${derivative.path} carries IPTC metadata.`);
      assert.equal(derivative.metadata.orientation, null, `${derivative.path} carries an orientation tag.`);
    }
    assert.equal(
      derivatives.at(-1).sha256,
      example.pixelInspection.derivativeSha256,
      `${example.id} 1600-pixel bytes changed; inspect the new image and update its review receipt.`
    );
    const companionPath = `figures/${example.slug}.v1.json`;
    const { pixelInspection, ...publicExample } = example;
    examples.push({
      ...publicExample,
      rights: example.rights ?? definitions.rights,
      publicationReceipt: {
        sourceAuthority: 'Declared repository source set',
        publicationAuthority: {
          standing: 'held',
          receiver: `${artifactAuthor} — named human publication receiver`,
          activationEvent: 'Explicit human approval of the publication receiver'
        },
        method: 'Playwright Chromium element capture → Sharp WebP derivative',
        reviewedOn: definitions.reviewedOn,
        sourceClosure,
        metadataInspection: {
          standing: 'passed',
          derivativeCount: derivatives.length,
          fields: ['EXIF absent', 'XMP absent', 'IPTC absent', 'orientation absent']
        },
        locatorInspection: {
          standing: 'passed',
          scope: 'Declared source files, definitions, catalog, semantic companions, and gallery'
        },
        secretInspection: {
          standing: 'passed',
          method: 'Bounded secret-shaped lexical admission scan',
          scope: 'Declared source files, definitions, catalog, semantic companions, and gallery'
        },
        pixelInspection: {
          standing: 'reviewed',
          ...pixelInspection
        }
      },
      responsiveImage: {
        intrinsicWidth: derivatives.at(-1).width,
        intrinsicHeight: derivatives.at(-1).height,
        sizes: '(min-width: 72rem) 42rem, (min-width: 48rem) 82vw, 94vw',
        derivatives
      },
      semanticCompanion: {
        ...example.semanticCompanion,
        path: companionPath
      }
    });
  }
  return {
    $schema: 'https://schemas.vik.guru/visual-fidelity-contracts/1.0.0/example-catalog.schema.json',
    schemaVersion: definitions.schemaVersion,
    libraryId: definitions.libraryId,
    reviewedOn: definitions.reviewedOn,
    publicCollection: definitions.publicCollection,
    generation: {
      command: 'npm run build:visual-fidelity-pattern-library',
      check: 'npm run check:visual-fidelity-pattern-library',
      widths
    },
    examples
  };
}

function formCompanion(example) {
  return {
    schemaVersion: '1.0.0',
    exampleId: example.id,
    title: example.title,
    description: example.description,
    alt: example.alt,
    caption: example.caption,
    summary: example.semanticCompanion.summary,
    relationships: example.semanticCompanion.relationships.map(([relationship, reading]) => ({ relationship, reading })),
    source: example.source,
    contract: example.contract,
    publicContinuation: example.publicContinuation,
    rights: example.rights,
    publicationReceipt: example.publicationReceipt,
    tests: example.tests
  };
}

function renderRelationships(example) {
  return example.semanticCompanion.relationships.map(([relationship, reading]) => `
                <tr>
                  <th scope="row">${escapeHtml(relationship)}</th>
                  <td>${escapeHtml(reading)}</td>
                </tr>`).join('');
}

function renderExample(example) {
  const derivatives = example.responsiveImage.derivatives;
  const largest = derivatives.at(-1);
  const srcset = derivatives.map(item => `./${item.path} ${item.width}w`).join(', ');
  return `      <article class="pattern" id="${escapeHtml(example.slug)}">
        <header class="pattern__header">
          <p class="pattern__ordinal">0${example.ordinal} · ${escapeHtml(example.category.replaceAll('-', ' '))}</p>
          <h2>${escapeHtml(example.title)}</h2>
          <p>${escapeHtml(example.description)}</p>
        </header>
        <figure class="pattern__figure" aria-describedby="${escapeHtml(example.slug)}-caption">
          <a href="./${escapeHtml(largest.path)}" aria-label="Open the full-size ${escapeHtml(example.title)} image">
            <img
              src="./${escapeHtml(derivatives[0].path)}"
              srcset="${escapeHtml(srcset)}"
              sizes="${escapeHtml(example.responsiveImage.sizes)}"
              width="${largest.width}"
              height="${largest.height}"
              loading="lazy"
              decoding="async"
              alt="${escapeHtml(example.alt)}">
          </a>
          <figcaption id="${escapeHtml(example.slug)}-caption">${escapeHtml(example.caption)}</figcaption>
        </figure>
        <div class="pattern__routes" aria-label="${escapeHtml(example.title)} routes">
          <a href="${escapeHtml(sourceHref(example.source.path))}">Run or inspect the source</a>
          <a href="${escapeHtml(sourceHref(example.contract.path))}">Read the repository contract</a>
          <a href="${escapeHtml(example.publicContinuation)}">Open the public continuation</a>
        </div>
        <details class="pattern__companion">
          <summary>Read the semantic companion</summary>
          <p>${escapeHtml(example.semanticCompanion.summary)}</p>
          <div class="table-region" tabindex="0" role="region" aria-label="${escapeHtml(example.title)} relationships; scroll horizontally when needed">
            <table>
              <caption>${escapeHtml(example.title)} relationship map</caption>
              <tbody>${renderRelationships(example)}
              </tbody>
            </table>
          </div>
          <p><a href="./${escapeHtml(example.semanticCompanion.path)}">Open the machine-readable companion</a></p>
        </details>
      </article>`;
}

function renderGallery(catalog) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Four visual fidelity examples that connect visible states to written meaning, runnable source, recovery behavior, and responsive images.">
  <meta name="author" content="${escapeHtml(artifactAuthor)}">
  <title>Visual Fidelity Pattern Library</title>
  <link rel="license" href="${escapeHtml(artifactLicense)}">
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <a class="skip-link" href="#patterns">Skip to the pattern examples</a>
  <header class="hero">
    <p class="eyebrow">Visual Fidelity Contracts · working examples</p>
    <h1>Compare four ways to make state, decisions, and recovery visible</h1>
    <p class="hero__lead">Each example shows a useful working state, explains what changes for the person using it, and links to the code and tests that carry its behavior.</p>
    <nav aria-label="Pattern families">
      <ul>
        ${catalog.examples.map(example => `<li><a href="#${escapeHtml(example.slug)}">${escapeHtml(example.title)}</a></li>`).join('\n        ')}
      </ul>
    </nav>
  </header>
  <main id="patterns" class="patterns">
${catalog.examples.map(renderExample).join('\n')}
    <section class="evidence-boundary" aria-labelledby="evidence-title">
      <p class="eyebrow">Evidence and authority</p>
      <h2 id="evidence-title">The image orients; the source carries the behavior</h2>
      <p>These figures are documentation derivatives of synthetic repository examples. Focused source and browser checks establish the behavior named by each example. A receiving application owns its operational data, authorization, scientific validity, transactions, and release decisions.</p>
      <p><a href="./catalog.v1.json">Inspect the image catalog</a> or continue to the public <a href="${escapeHtml(catalog.publicCollection)}">Visual Fidelity Contracts collection</a>.</p>
    </section>
  </main>
  <footer class="artifact-attribution"><p>${escapeHtml(artifactAttribution)}</p></footer>
</body>
</html>
`;
}

async function writeArtifacts(catalog, artifactRoot = examplesRoot) {
  await mkdir(join(artifactRoot, 'figures'), { recursive: true });
  for (const example of catalog.examples) {
    const companion = formCompanion(example);
    await writeFile(resolveInside(artifactRoot, example.semanticCompanion.path), `${JSON.stringify(companion, null, 2)}\n`);
  }
  await writeFile(join(artifactRoot, 'catalog.v1.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  await writeFile(join(artifactRoot, 'index.html'), renderGallery(catalog));
}

function generatedArtifactPaths(catalog) {
  return [
    ...catalog.examples.flatMap(example => example.responsiveImage.derivatives.map(derivative => derivative.path)),
    ...catalog.examples.map(example => example.semanticCompanion.path),
    'index.html',
    // The catalog is the activation record, so it advances after every file it names.
    'catalog.v1.json'
  ];
}

async function listGeneratedNamespaceFiles(artifactRoot) {
  const paths = [];
  async function visit(relativeDirectory) {
    const directory = resolveInside(artifactRoot, relativeDirectory);
    if (!await exists(directory)) return;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        await visit(relativePath);
      } else {
        assert.equal(entry.isFile(), true, `Generated namespace contains an unsupported entry: ${relativePath}`);
        paths.push(relativePath);
      }
    }
  }
  await visit('images');
  await visit('figures');
  return paths.sort((left, right) => left.localeCompare(right, 'en'));
}

async function promoteGeneratedArtifacts({
  acceptedRoot,
  candidateRoot,
  generatedPaths,
  acceptedGeneratedPaths = [],
  publishArtifact = ({ candidatePath, acceptedPath }) => rename(candidatePath, acceptedPath)
}) {
  const paths = [...new Set(generatedPaths)];
  const priorPaths = [...new Set(acceptedGeneratedPaths)];
  assert.equal(paths.length, generatedPaths.length, 'Generated artifact paths remain unique.');
  assert.equal(priorPaths.length, acceptedGeneratedPaths.length, 'Accepted generated artifact paths remain unique.');
  assert.equal(typeof publishArtifact, 'function');
  for (const path of paths) await access(resolveInside(candidateRoot, path));

  const currentPathSet = new Set(paths);
  const obsoletePaths = priorPaths.filter(path => !currentPathSet.has(path));
  for (const path of obsoletePaths) await access(resolveInside(acceptedRoot, path));

  const activationPath = 'catalog.v1.json';
  assert.ok(currentPathSet.has(activationPath), 'The generated family includes its catalog activation record.');
  const contentPaths = paths.filter(path => path !== activationPath);

  const rollbackRoot = await mkdtemp(join(dirname(acceptedRoot), '.vfc-pattern-rollback-'));
  const mutations = [];
  let preserveRollback = false;
  try {
    for (const [index, path] of contentPaths.entries()) {
      const candidatePath = resolveInside(candidateRoot, path);
      const acceptedPath = resolveInside(acceptedRoot, path);
      const backupPath = resolveInside(rollbackRoot, path);
      const hadAcceptedArtifact = await exists(acceptedPath);
      await mkdir(dirname(acceptedPath), { recursive: true });
      if (hadAcceptedArtifact) {
        await mkdir(dirname(backupPath), { recursive: true });
        await copyFile(acceptedPath, backupPath);
      }
      // Register intent before mutation so a hook that writes and then fails remains recoverable.
      mutations.push({ kind: 'published', acceptedPath, backupPath, hadAcceptedArtifact });
      await publishArtifact({ candidatePath, acceptedPath, index, path });
    }
    for (const path of obsoletePaths) {
      const acceptedPath = resolveInside(acceptedRoot, path);
      const backupPath = resolveInside(rollbackRoot, path);
      await mkdir(dirname(backupPath), { recursive: true });
      await copyFile(acceptedPath, backupPath);
      mutations.push({ kind: 'retired', acceptedPath, backupPath, hadAcceptedArtifact: true });
      await rm(acceptedPath);
    }

    const candidatePath = resolveInside(candidateRoot, activationPath);
    const acceptedPath = resolveInside(acceptedRoot, activationPath);
    const backupPath = resolveInside(rollbackRoot, activationPath);
    const hadAcceptedArtifact = await exists(acceptedPath);
    if (hadAcceptedArtifact) {
      await mkdir(dirname(backupPath), { recursive: true });
      await copyFile(acceptedPath, backupPath);
    }
    mutations.push({ kind: 'published', acceptedPath, backupPath, hadAcceptedArtifact });
    await publishArtifact({
      candidatePath,
      acceptedPath,
      index: contentPaths.length + obsoletePaths.length,
      path: activationPath
    });
  } catch (error) {
    const rollbackErrors = [];
    for (const artifact of mutations.reverse()) {
      try {
        if (artifact.kind === 'retired' || artifact.hadAcceptedArtifact) {
          await mkdir(dirname(artifact.acceptedPath), { recursive: true });
          await rename(artifact.backupPath, artifact.acceptedPath);
        } else {
          await rm(artifact.acceptedPath, { force: true });
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    preserveRollback = rollbackErrors.length > 0;
    throw new AggregateError(
      [error, ...rollbackErrors],
      preserveRollback
        ? `Pattern-library publication and automatic restoration both need attention; recovery copies remain at ${rollbackRoot}.`
        : 'Pattern-library publication failed; the accepted artifact family was restored.'
    );
  } finally {
    if (!preserveRollback) await rm(rollbackRoot, { recursive: true, force: true });
  }
}

export async function runStagedArtifactTransaction({
  acceptedRoot,
  prepareCandidate,
  validateCandidate,
  acceptedGeneratedPaths,
  publishArtifact
}) {
  assert.equal(typeof prepareCandidate, 'function');
  assert.equal(typeof validateCandidate, 'function');
  await mkdir(dirname(acceptedRoot), { recursive: true });
  const candidateRoot = await mkdtemp(join(dirname(acceptedRoot), '.vfc-pattern-candidate-'));
  try {
    const candidate = await prepareCandidate(candidateRoot);
    assert.ok(candidate && Array.isArray(candidate.generatedPaths));
    await validateCandidate(candidate, candidateRoot);
    await promoteGeneratedArtifacts({
      acceptedRoot,
      candidateRoot,
      generatedPaths: candidate.generatedPaths,
      acceptedGeneratedPaths,
      publishArtifact
    });
    return candidate;
  } finally {
    await rm(candidateRoot, { recursive: true, force: true });
  }
}

async function checkArtifacts(definitions, expectedCatalog, artifactRoot = examplesRoot) {
  const actualCatalog = await loadJson(join(artifactRoot, 'catalog.v1.json'));
  assert.deepEqual(actualCatalog, expectedCatalog, 'Catalog metadata matches the admitted derivative bytes.');
  const gallery = await readFile(join(artifactRoot, 'index.html'), 'utf8');
  assert.equal(
    gallery,
    renderGallery(actualCatalog),
    'Gallery markup and prose match the admitted catalog exactly.'
  );
  assert.doesNotMatch(gallery, /notion\.so|notion\.site|\/Users\/|\.codex|prototype-exemplars/iu);
  assert.equal((gallery.match(/<figure\b/gu) ?? []).length, definitions.examples.length);
  assert.equal((gallery.match(/srcset=/gu) ?? []).length, definitions.examples.length);
  assert.equal((gallery.match(/<details class="pattern__companion">/gu) ?? []).length, definitions.examples.length);
  assert.match(gallery, new RegExp(`<meta name="author" content="${escapeHtml(artifactAuthor)}">`, 'u'));
  assert.match(gallery, new RegExp(`<link rel="license" href="${escapeHtml(artifactLicense)}">`, 'u'));
  assert.ok(gallery.includes(escapeHtml(artifactAttribution)));
  for (const example of actualCatalog.examples) {
    assert.match(gallery, new RegExp(`id="${example.slug}"`, 'u'));
    assert.match(gallery, new RegExp(`width="${example.responsiveImage.intrinsicWidth}"`, 'u'));
    assert.match(gallery, new RegExp(`height="${example.responsiveImage.intrinsicHeight}"`, 'u'));
    const companionPath = resolveInside(artifactRoot, example.semanticCompanion.path);
    const companion = await loadJson(companionPath);
    assert.deepEqual(companion, formCompanion(example), `${example.id} semantic companion matches its catalog record.`);
    for (const derivative of example.responsiveImage.derivatives) {
      assert.equal(derivative.metadata.exif, false);
      assert.equal(derivative.metadata.xmp, false);
      assert.equal(derivative.metadata.iptc, false);
      assert.equal(derivative.metadata.orientation, null);
    }
  }
  const expectedNamespacePaths = generatedArtifactPaths(actualCatalog)
    .filter(path => path.startsWith('images/') || path.startsWith('figures/'))
    .sort((left, right) => left.localeCompare(right, 'en'));
  assert.deepEqual(
    await listGeneratedNamespaceFiles(artifactRoot),
    expectedNamespacePaths,
    'Generated image and companion namespaces match the accepted catalog exactly.'
  );
  if (artifactRoot === examplesRoot) assert.equal(await exists(join(examplesRoot, 'README.md')), true);
}

async function main() {
  const definitions = await loadJson(definitionsPath);
  for (const example of definitions.examples) example.rights ??= definitions.rights;
  validateDefinitions(definitions);
  await validateEvidenceParity(definitions);
  await inspectPublicLocators(definitions);

  if (mode === 'capture') {
    const acceptedCatalogPath = join(examplesRoot, 'catalog.v1.json');
    const acceptedGeneratedPaths = await exists(acceptedCatalogPath)
      ? generatedArtifactPaths(await loadJson(acceptedCatalogPath))
      : [];
    const { catalog } = await runStagedArtifactTransaction({
      acceptedRoot: examplesRoot,
      acceptedGeneratedPaths,
      prepareCandidate: async candidateRoot => {
        await captureSources(definitions, candidateRoot);
        const candidateCatalog = await formCatalog(definitions, candidateRoot);
        await writeArtifacts(candidateCatalog, candidateRoot);
        return {
          catalog: candidateCatalog,
          generatedPaths: generatedArtifactPaths(candidateCatalog)
        };
      },
      validateCandidate: async (candidate, candidateRoot) => {
        await checkArtifacts(definitions, candidate.catalog, candidateRoot);
        await inspectPublicationArtifacts(candidate.catalog, candidateRoot);
      }
    });
    console.log(`Visual Fidelity pattern library built: ${catalog.examples.length} examples; ${catalog.examples.length * widths.length} derivatives.`);
    return;
  }

  const catalog = await formCatalog(definitions);
  await checkArtifacts(definitions, catalog);
  await inspectPublicationArtifacts(catalog);
  console.log(`Visual Fidelity pattern library check: PASS (${catalog.examples.length} examples; ${catalog.examples.length * widths.length} derivatives).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
