import './node-runtime-admission.mjs';
import { isDirectExecution } from './check-node-runtime.mjs';

import { execFile } from 'node:child_process';
import { open, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const ADMISSION = 'tools/node-runtime-admission.mjs';
const BOOTSTRAPS = new Set(['tools/check-node-runtime.mjs', ADMISSION]);
// Tracked publication closures keep their originating source owner's runtime classification.
const FROZEN_PREFIXES = [
  'cloudflare/schemas-worker/public/',
  'deployment/cpanel/carrier/',
];
const HISTORICAL = new Set(['tests/suites/baseline-e1f00de.json']);
const WORKER = new Set([
  'cloudflare/r2-video-delivery/src/entrypoints.js',
  'cloudflare/r2-video-delivery/src/index.js',
  'cloudflare/schemas-worker/src/index.js',
]);
const BROWSER_SHARED = new Set([
  'collaboration/embedded-content-fit.js',
  'collaboration/about-investment-studio-chapters/chapters.js',
  'collaboration/investment-analysis/capsule.js',
  'collaboration/investment-analysis/core.js',
  'collaboration/investment-analysis/studio.js',
  'collaboration/native-investment-studio/config.mjs',
  'collaboration/native-investment-studio/contract.mjs',
  'collaboration/native-investment-studio/controller.mjs',
  'collaboration/native-investment-studio/display.mjs',
  'collaboration/native-investment-studio/draft.mjs',
  'collaboration/native-investment-studio/person-draft.mjs',
  'collaboration/native-investment-studio/state.mjs',
  'collaboration/native-investment-studio/team-controller.mjs',
  'context-canvas-project-surface/context-canvas/about-content-fit.js',
  'context-canvas-project-surface/context-canvas/about-heatmap.js',
  'context-canvas-project-surface/context-canvas/about-media.js',
  'context-canvas-project-surface/context-canvas/atlas-gallery-model.js',
  'context-canvas-project-surface/context-canvas/atlas-gallery-table.js',
  'context-canvas-project-surface/context-canvas/atlas-gallery.js',
  'context-canvas-project-surface/context-canvas/canvas-shell.js',
  'context-canvas-project-surface/context-canvas/debriefs-catalog.js',
  'context-canvas-project-surface/context-canvas/fmi-reading-rail.js',
  'context-canvas-project-surface/context-canvas/prototypes/core-architectures/chimeric-pack-v0.1/strategy-canvas-context-workbench-v0.2.js',
  'context-canvas-project-surface/context-canvas/prototypes/narrative-architectures/narrative-capsule-composer/strategy-canvas-v2-adapter.js',
  'context-canvas-project-surface/context-canvas/visitor-boundary-contract.js',
  'context-canvas-project-surface/context-canvas/who-to-believe-system-graph.js',
  'core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-canonical.js',
  'core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-core.js',
  'core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-validator.js',
  'core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-validator.template.js',
  'lims-eln-functional-nucleus/lims-eln-enterprise-implementation/src/lims_eln_implementation/workbench/static/workbench.js',
  'visual-fidelity-contracts/labs/component-lab/src/controller.js',
  'visual-fidelity-contracts/labs/component-lab/src/model.js',
  'visual-fidelity-contracts/labs/component-lab/src/render.js',
  'visual-fidelity-contracts/labs/component-lab/src/semantics.js',
  'visual-fidelity-contracts/labs/data-view-lab/src/controller.js',
  'visual-fidelity-contracts/labs/data-view-lab/src/model.js',
  'visual-fidelity-contracts/labs/data-view-lab/src/render.js',
  'visual-fidelity-contracts/labs/data-view-lab/src/semantics.js',
  'visual-fidelity-contracts/labs/lifecycle-lab/framework-adapters/react-19.2.0.mjs',
  'visual-fidelity-contracts/labs/lifecycle-lab/framework-contracts.js',
  'visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-lab.js',
  'visual-fidelity-contracts/labs/lifecycle-lab/lifecycle-model.js',
  'visual-fidelity-contracts/labs/lifecycle-lab/platform-adapters.js',
  'visual-fidelity-contracts/labs/lifecycle-lab/scenario-data.js',
  'visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-lab.js',
  'visual-fidelity-contracts/labs/service-boundary-lab/service-boundary-model.js',
]);

function isFrozenPublication(file) {
  return FROZEN_PREFIXES.some(prefix => file.startsWith(prefix));
}

function safePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Inventory inputs require canonical repository-relative paths.');
  }
  return value;
}

export function classifyJavaScript(file) {
  safePath(file);
  if (isFrozenPublication(file)) return 'frozen-publication';
  if (BOOTSTRAPS.has(file)) return 'bootstrap';
  if (WORKER.has(file)) return 'workerd';
  if (BROWSER_SHARED.has(file)) return 'browser-shared';
  if (file.endsWith('.mjs')) return 'node';
  if (/\.(?:js|cjs)$/.test(file)) return 'unclassified';
  return null;
}

export function admissionSpecifier(file) {
  const relative = path.posix.relative(path.posix.dirname(file), ADMISSION);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function openingStatement(source) {
  let remaining = source.replace(/^\uFEFF/, '').replace(/^#![^\n]*(?:\n|$)/, '');
  while (true) {
    remaining = remaining.trimStart();
    if (remaining.startsWith('//')) {
      const end = remaining.indexOf('\n');
      remaining = end < 0 ? '' : remaining.slice(end + 1);
    } else if (remaining.startsWith('/*')) {
      const end = remaining.indexOf('*/', 2);
      if (end < 0) return '';
      remaining = remaining.slice(end + 2);
    } else return remaining;
  }
}

export function hasFirstAdmission(source, file) {
  const match = /^import\s*(['"])([^'"\r\n]+)\1\s*;/.exec(openingStatement(source));
  return Boolean(match && match[2] === admissionSpecifier(file));
}

// This lexer recognizes literal command words and separators, not shell expansion,
// substitutions, redirection semantics, or arbitrary embedded programming languages.
function commandSegments(source) {
  const segments = [];
  let words = [], word = '', started = false, quote = null;
  const pushWord = () => { if (started) words.push(word); word = ''; started = false; };
  const pushSegment = () => { pushWord(); if (words.length) segments.push(words); words = []; };
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '\\' && quote !== "'") {
      if (source[i + 1] === '\n') { i += 1; continue; }
      started = true; word += source[++i] ?? ''; continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else word += char;
      started = true; continue;
    }
    if (char === '"' || char === "'") { quote = char; started = true; continue; }
    if (char === '\n' || char === ';' || char === '&' || char === '|') { pushSegment(); continue; }
    if (/\s/.test(char)) { pushWord(); continue; }
    started = true; word += char;
  }
  pushSegment();
  return segments;
}

const NODE_VALUE_OPTIONS = new Set([
  '--import', '--require', '-r', '--loader', '--experimental-loader', '--input-type',
  '--test-name-pattern', '--test-skip-pattern', '--test-reporter', '--test-reporter-destination',
  '--test-concurrency', '--test-shard', '--test-timeout', '--conditions', '-C',
  '--inspect-port', '--inspect-publish-uid', '--diagnostic-dir', '--env-file', '--env-file-if-exists',
]);
const NPM_VALUE_OPTIONS = new Set([
  '--prefix', '-C', '--cache', '--userconfig', '--globalconfig', '--registry',
  '--workspace', '-w', '--loglevel', '--user-agent', '--script-shell', '--location',
]);

function npmCommand(words, index) {
  for (let i = index + 1; i < words.length; i += 1) {
    const word = words[i];
    if (word === '--') return words[i + 1];
    if (!word.startsWith('-')) return word;
    if (NPM_VALUE_OPTIONS.has(word)) i += 1;
  }
  return null;
}

function nodeOptions(args) {
  const options = [];
  for (let i = 0; i < args.length; i += 1) {
    const word = args[i];
    if (isInlineFlag(word) || word === '--' || word === '-' || word.startsWith('<') || !word.startsWith('-')) break;
    options.push(word);
    if (NODE_VALUE_OPTIONS.has(word)) i += 1;
  }
  return options;
}

function isRequireOption(word) {
  return word === '--require' || word.startsWith('--require=') || word.startsWith('-r');
}

function admittedInline(words, index) {
  // Maintained inline, external, and preload routes use one canonical prefix.
  // CommonJS preloads execute before ESM imports regardless of option order.
  const first = words[index + 1];
  const candidate = first === '--import' ? words[index + 2] : first?.startsWith('--import=') ? first.slice(9) : null;
  if (!candidate || !/^(?:\.\.?\/)*(?:release-tools\/)?tools\/node-runtime-admission\.mjs$/.test(candidate)) return false;
  return !nodeOptions(words.slice(index + 1)).some(isRequireOption);
}

function isInlineFlag(word) {
  return ['--eval', '--print'].includes(word) || /^-[ep]/.test(word) || /^(?:--eval|--print)=/.test(word);
}

function nodeTargets(args) {
  const targets = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (isInlineFlag(arg) || arg === '-' || arg.startsWith('<')) break;
    if (NODE_VALUE_OPTIONS.has(arg)) { index += 1; continue; }
    if (arg.startsWith('-')) continue;
    if (/\.(?:mjs|cjs|js)$/.test(arg) && !/[$*?{}]/.test(arg)) targets.push(arg);
    if (!args.includes('--test')) break;
  }
  return targets;
}

export function inspectCommandText(source, resolveTarget = null) {
  const findings = new Set();
  for (const words of commandSegments(source)) {
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      const next = words[index + 1];
      if (word === 'npx' && next) findings.add('external-npx-route');
      if (word === 'npm' && npmCommand(words, index) === 'exec') findings.add('external-npm-exec-route');
      if (word !== 'node') continue;
      const args = words.slice(index + 1);
      const inline = (args.length === 0 && index === 0) || args.some(arg => isInlineFlag(arg) || arg === '-' || arg.startsWith('<') || arg === '--input-type' || arg.startsWith('--input-type='));
      const external = args.some(arg => /(?:^|\/)node_modules\//.test(arg));
      const preload = nodeOptions(args).some(arg => isRequireOption(arg) || arg === '--import' || arg.startsWith('--import='));
      const admitted = admittedInline(words, index);
      if ((inline || external) && !admitted) findings.add(inline ? 'inline-node-admission' : 'external-node-admission');
      if (preload && !admitted) findings.add('node-preload-admission');
      if (resolveTarget) for (const target of nodeTargets(args)) {
        const ownership = resolveTarget(target);
        if (ownership && ownership.role !== 'bootstrap' && !(ownership.role === 'node' && ownership.guarded)) findings.add('concrete-node-target-admission');
      }
    }
    // Package scripts have their own explicit-prefix contract. These carriers are
    // documentation and workflow routes; a raw .bin command owns a separate entry.
    if (words.some(word => /(?:^|\/)node_modules\/\.bin\//.test(word)) && !words.some((word, index) => word === 'node' && admittedInline(words, index))) findings.add('external-bin-route');
  }
  return [...findings];
}

function markdownCommands(source) {
  const result = [];
  let fence = null, block = [], start = 1;
  const lines = source.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) {
      if (!fence) { fence = marker[1][0]; start = index + 2; block = []; }
      else if (marker[1][0] === fence) { result.push({ text: block.join('\n'), line: start }); fence = null; }
      continue;
    }
    if (fence) block.push(line);
    else for (const match of line.matchAll(/`([^`]+)`/g)) result.push({ text: match[1], line: index + 1 });
  }
  if (fence) result.push({ text: block.join('\n'), line: start });
  return result;
}

function jsonCommands(value, out = []) {
  if (typeof value === 'string' && value !== 'node') out.push({ text: value, line: 1 });
  else if (Array.isArray(value)) {
    if (value.every(item => typeof item === 'string') && value.some(item => ['node', 'npx', 'npm'].includes(item))) out.push({ text: value.map(item => JSON.stringify(item)).join(' '), line: 1 });
    else for (const item of value) jsonCommands(item, out);
  } else if (value && typeof value === 'object') for (const item of Object.values(value)) jsonCommands(item, out);
  return out;
}

function carrierCommands(file, source) {
  if (isFrozenPublication(file) || HISTORICAL.has(file) || /(?:^|\/)(?:package(?:-lock)?|npm-shrinkwrap)\.json$/.test(file)) return [];
  if (/\.(?:md|markdown)$/.test(file)) return markdownCommands(source);
  if (file.endsWith('.json')) {
    try {
      const value = JSON.parse(source);
      if (file === 'tests/suites/catalog.json') for (const suite of value.suites ?? []) {
        if (suite.command?.appendMembers && Array.isArray(suite.command.argv)) suite.command.argv = [...suite.command.argv, ...(suite.members ?? [])];
      }
      return jsonCommands(value);
    } catch { return []; }
  }
  if (file.endsWith('.py')) {
    const result = [];
    // Literal argv lists are recognizable without importing Python or evaluating
    // dispatchers. Dynamic expressions retain their source owner's review.
    for (const match of source.matchAll(/\[\s*(['"])(?:node|npx|npm)\1(?:\s*,\s*(['"])(?:\\.|(?!\2).)*?\2)*\s*\]/g)) {
      const literals = [...match[0].matchAll(/(['"])((?:\\.|(?!\1).)*?)\1/g)].map(item => item[2]);
      result.push({ text: literals.map(item => JSON.stringify(item)).join(' '), line: source.slice(0, match.index).split('\n').length });
    }
    return result;
  }
  if (/\.(?:ya?ml|sh|bash)$/.test(file)) return source.split('\n').flatMap((line, index) => /^\s*#/.test(line) ? [] : [{ text: line.replace(/^\s*(?:-\s*)?run:\s*/, ''), line: index + 1 }]);
  return [];
}

export async function discoverTrackedRoutes(root = ROOT, additionalPaths = []) {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  const files = new Set(stdout.split('\0').filter(Boolean).map(safePath));
  for (const file of additionalPaths) {
    safePath(file);
    try { await readFile(path.join(root, file)); files.add(file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return [...files].sort();
}

async function nodeShebang(file) {
  const handle = await open(file, 'r');
  try {
    const buffer = Buffer.alloc(256);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return /^#![^\r\n]*\bnode(?:\s|$)/.test(buffer.subarray(0, bytesRead).toString('utf8').split('\n')[0]);
  } finally { await handle.close(); }
}

export async function inspectNodeRoutes({ root = ROOT, paths = null } = {}) {
  const files = paths ?? await discoverTrackedRoutes(root);
  const diagnostics = [], commands = [], roles = new Map(), guarded = new Set();
  const add = (code, file, line = 1) => diagnostics.push({ code, path: file, line });
  for (const file of files) {
    safePath(file);
    let role = classifyJavaScript(file);
    if (role === 'frozen-publication') { roles.set(file, role); continue; }
    if (!role && await nodeShebang(path.join(root, file))) role = 'unclassified-node-shebang';
    if (role) roles.set(file, role);
    if (role === 'unclassified' || role === 'unclassified-node-shebang') add('javascript-owner-required', file);
    const carrier = /\.(?:md|markdown|json|ya?ml|py|sh|bash)$/.test(file);
    if (role === 'node' || carrier) {
      const source = await readFile(path.join(root, file), 'utf8');
      if (role === 'node') {
        if (hasFirstAdmission(source, file)) guarded.add(file);
        else add('first-node-admission-required', file);
      }
      if (carrier) for (const command of carrierCommands(file, source)) commands.push({ ...command, file });
    }
  }
  // A concrete path resolves against known ownership, first at repository root,
  // then at the carrier's ancestors, then by one unambiguous tracked suffix.
  // Dynamic paths and ambiguous suffixes retain source review.
  const resolveTarget = (target, carrier) => {
    const normalized = path.posix.normalize(target);
    const candidates = [normalized];
    let directory = path.posix.dirname(carrier);
    while (directory !== '.') {
      candidates.push(path.posix.normalize(path.posix.join(directory, target)));
      directory = path.posix.dirname(directory);
    }
    let match = candidates.find(candidate => roles.has(candidate));
    if (!match && !normalized.startsWith('/') && !normalized.startsWith('../')) {
      const suffix = `/${normalized.replace(/^\.\//, '')}`;
      const matches = [...roles.keys()].filter(file => file.endsWith(suffix));
      if (matches.length === 1) [match] = matches;
    }
    return match ? { role: roles.get(match), guarded: guarded.has(match) } : null;
  };
  for (const command of commands) for (const code of inspectCommandText(command.text, target => resolveTarget(target, command.file))) add(code, command.file, command.line);
  const catalogPath = 'tests/suites/catalog.json';
  if (files.includes(catalogPath)) {
    const catalog = JSON.parse(await readFile(path.join(root, catalogPath), 'utf8'));
    for (const suite of catalog.suites ?? []) {
      const members = suite.members ?? [];
      for (const member of members.filter(member => /\.(?:mjs|cjs|js)$/.test(member))) {
        if (!roles.has(member) || ['unclassified', 'unclassified-node-shebang', 'frozen-publication'].includes(roles.get(member))) add('catalog-member-owner-required', member);
      }
      const command = suite.command;
      if (!command?.argv?.includes('node')) continue;
      const entries = command.argv.slice(command.argv.indexOf('node') + 1).filter(arg => /\.(?:mjs|cjs|js)$/.test(arg));
      const targets = [...entries.map(entry => path.posix.normalize(path.posix.join(command.cwd, entry))), ...(command.appendMembers ? members : [])];
      for (const member of targets) if (!guarded.has(member) && !BOOTSTRAPS.has(member)) add('catalog-node-admission-required', member);
    }
  }
  const counts = {};
  for (const role of roles.values()) counts[role] = (counts[role] ?? 0) + 1;
  return { ok: diagnostics.length === 0, files: files.length, counts, diagnostics, boundary: 'Tracked JavaScript ownership, first Node dependency, declared catalog routes, and recognized literal command forms; shell expansion and dynamic dispatch retain source review.' };
}

async function main() {
  const args = process.argv.slice(2), extra = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] !== '--include' || !args[i + 1]) throw new Error('Use --include repository-relative-file for an explicit new source.');
    extra.push(safePath(args[++i]));
  }
  const result = await inspectNodeRoutes({ paths: await discoverTrackedRoutes(ROOT, extra) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (isDirectExecution(import.meta.url)) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
