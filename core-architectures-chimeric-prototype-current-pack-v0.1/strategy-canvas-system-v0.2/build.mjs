import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(sourceDirectory, '..', 'strategy-canvas-chimeric-prototype-v0.2.1.html');
const compatibilityPath = resolve(sourceDirectory, '..', 'strategy-canvas-chimeric-prototype-v0.1.1.html');
const validatorPath = resolve(sourceDirectory, 'strategy-canvas-validator.js');
const [template, compatibility, css, schemaText, validatorTemplate, core, canonical] = await Promise.all([
  readFile(resolve(sourceDirectory, 'canonical.template.html'), 'utf8'),
  readFile(resolve(sourceDirectory, 'compatibility-v0.1.1.html'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas.css'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas.schema.json'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas-validator.template.js'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas-core.js'), 'utf8'),
  readFile(resolve(sourceDirectory, 'strategy-canvas-canonical.js'), 'utf8')
]);

const schema = JSON.parse(schemaText);
const validator = validatorTemplate.replace('/*__STRATEGY_CANVAS_SCHEMA__*/ null', () => JSON.stringify(schema));
const compatibilityOutput = compatibility.replaceAll(
  '../strategy-canvas-chimeric-prototype-v0.2.1.html',
  'strategy-canvas-chimeric-prototype-v0.2.1.html'
);
if (validator.includes('/*__STRATEGY_CANVAS_SCHEMA__*/')) {
  throw new Error('The Strategy Canvas validator contains an unresolved schema marker.');
}

const output = template
  .replace('/*__STRATEGY_CANVAS_CSS__*/', () => css.trim())
  .replace('/*__STRATEGY_CANVAS_VALIDATOR__*/', () => validator.trim())
  .replace('/*__STRATEGY_CANVAS_CORE__*/', () => core.trim())
  .replace('/*__STRATEGY_CANVAS_CANONICAL__*/', () => canonical.trim());

if (output.includes('/*__STRATEGY_CANVAS_')) {
  throw new Error('The canonical template contains an unresolved build marker.');
}

const progressiveEnhancementMarkers = [
  'data-sc-role="static-baseline"',
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
