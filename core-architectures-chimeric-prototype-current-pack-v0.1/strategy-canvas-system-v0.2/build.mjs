import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(sourceDirectory, '..', 'strategy-canvas-chimeric-prototype-v0.2.5.html');
const compatibilityPath = resolve(sourceDirectory, '..', 'strategy-canvas-chimeric-prototype-v0.1.1.html');
const validatorPath = resolve(sourceDirectory, 'strategy-canvas-validator.js');
const defaultExamplePath = resolve(sourceDirectory, '..', '..', 'prompt-capsules', '0.1.0', 'examples', 'strategy-canvas.md');
const [template, compatibility, css, schemaText, evidenceText, validatorTemplate, core, canonical, defaultExample] = await Promise.all([
  readFile(resolve(sourceDirectory, 'canonical.template.html'), 'utf8'),
  readFile(resolve(sourceDirectory, 'compatibility-v0.1.1.html'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas.css'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas.schema.json'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas-evidence.v0.1.json'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas-validator.template.js'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas-core.js'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas-canonical.js'), 'utf8'),
  readFile(defaultExamplePath, 'utf8')
]);

const schema = JSON.parse(schemaText);
const evidence = JSON.parse(evidenceText);
const validator = validatorTemplate.replace('/*__STRATEGY_CANVAS_SCHEMA__*/ null', () => JSON.stringify(schema));
const compatibilityOutput = compatibility.replaceAll(
  '../strategy-canvas-chimeric-prototype-v0.2.5.html',
  'strategy-canvas-chimeric-prototype-v0.2.5.html'
);
if (validator.includes('/*__STRATEGY_CANVAS_SCHEMA__*/')) {
  throw new Error('The Strategy Canvas validator contains an unresolved schema marker.');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const coreContext = { structuredClone };
runInNewContext(core, coreContext, { filename: 'strategy-canvas-core.js' });
const expectedDefaultExample = coreContext.StrategyCanvasCore.promptCapsule(
  coreContext.StrategyCanvasCore.defaultState
);
if (defaultExample !== expectedDefaultExample) {
  throw new Error('The checked Strategy Canvas default Prompt Capsule example differs from the plain renderer.');
}

const relatedLoops = coreContext.StrategyCanvasCore.promptCapsuleRelatedLoops;
if (!Array.isArray(relatedLoops) || relatedLoops.length === 0) {
  throw new Error('The Strategy Canvas core must declare related collaboration loops.');
}
const relatedLoopsControl = `
    <details class="sc-related-loops" data-sc-role="related-loops">
      <summary>Related loops</summary>
      <p class="sc-help">These public collaboration loops fit only when the receiving work meets the stated condition.</p>
      <ul>
${relatedLoops.map((loop) => `        <li data-related-loop-id="${escapeHtml(loop.id)}">
          <a data-related-loop-link href="${escapeHtml(loop.publicUrl)}">${escapeHtml(loop.name)}</a>
          <p><strong>Fit condition:</strong> ${escapeHtml(loop.fit)}</p>
        </li>`).join('\n')}
      </ul>
    </details>`;

const method = evidence.methodOrigin;
const representation = evidence.representations?.canonical;
const evidenceRoute = 'strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json';
if (!representation || representation.method !== 'strategyCanvas') {
  throw new Error('The evidence registry must define the canonical Strategy Canvas representation.');
}
const methodSourceNote = `
        <p>${escapeHtml(representation.sourceClaim)} Read the <span data-direct-source-route data-href="${escapeHtml(method.primarySource.url)}">authors’ method description</span> and the <span data-direct-source-route data-href="${escapeHtml(method.institutionalRecord.url)}">INSEAD book record</span>, then inspect the <a data-direct-source-route href="${evidenceRoute}" data-href="${evidenceRoute}">machine-readable evidence record</a>.</p>
        <p data-framed-source-handoff hidden>In this embedded view, the hosting page provides the source and evidence routes immediately after the frame.</p>
        <noscript><p>Source URLs: https://www.blueoceanstrategy.com/tools/strategy-canvas/ and https://www.insead.edu/faculty-research/publications/books/blue-ocean-strategy-expanded-edition-how-create-uncontested. In a sandboxed embedded view, use the source routes provided by the hosting page after the frame.</p></noscript>
        <p>${escapeHtml(representation.adaptationClaim)} ${escapeHtml(representation.boundaryClaim)}</p>`;

const output = template
  .replace('/*__STRATEGY_CANVAS_CSS__*/', () => css.trim())
  .replace('<!--__STRATEGY_CANVAS_RELATED_LOOPS__-->', () => relatedLoopsControl.trim())
  .replace('/*__STRATEGY_CANVAS_DEFAULT_PROMPT_CAPSULE__*/', () => escapeHtml(defaultExample))
  .replace('<!--__STRATEGY_CANVAS_EVIDENCE_NOTE__-->', () => methodSourceNote.trim())
  .replace('/*__STRATEGY_CANVAS_VALIDATOR__*/', () => validator.trim())
  .replace('/*__STRATEGY_CANVAS_CORE__*/', () => core.trim())
  .replace('/*__STRATEGY_CANVAS_CANONICAL__*/', () => canonical.trim());

if (output.includes('__STRATEGY_CANVAS_')) {
  throw new Error('The canonical template contains an unresolved build marker.');
}

const progressiveEnhancementMarkers = [
  'data-sc-role="static-baseline"',
  'data-sc-role="static-prompt"',
  'data-sc-role="related-loops"',
  "scEnhancementState = 'mounted'",
  "scEnhancementState = 'static'"
];
if (progressiveEnhancementMarkers.some((marker) => !output.includes(marker))) {
  throw new Error('The canonical distribution is missing its progressive-enhancement boundary.');
}

const outputBytes = Buffer.byteLength(output, 'utf8');
const outputSha256 = createHash('sha256').update(output).digest('hex');

if (process.argv.includes('--check')) {
  const [current, currentCompatibility, currentValidator] = await Promise.all([
    readFile(outputPath, 'utf8'),
    readFile(compatibilityPath, 'utf8'),
    readFile(validatorPath, 'utf8')
  ]);
  if (current !== output || currentCompatibility !== compatibilityOutput || currentValidator !== validator) {
    console.error('Generated Strategy Canvas distributions differ from their source files.');
    process.exitCode = 1;
  } else {
    console.log('Canonical Strategy Canvas distribution is current.');
    console.log(`Distribution receipt: ${outputBytes} bytes · sha256:${outputSha256}`);
  }
} else {
  await Promise.all([
    writeFile(outputPath, output, 'utf8'),
    writeFile(compatibilityPath, compatibilityOutput, 'utf8'),
    writeFile(validatorPath, validator, 'utf8')
  ]);
  console.log(`Generated ${outputPath} and compatibility route ${compatibilityPath}`);
  console.log(`Distribution receipt: ${outputBytes} bytes · sha256:${outputSha256}`);
}
