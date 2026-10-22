import './node-runtime-admission.mjs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = /^[a-z][a-z0-9.-]{0,95}$/;
const BUNDLES = new Set(['source-unit', 'family-integration', 'focused-browser', 'visual-media', 'carrier', 'live', 'research']);
const KINDS = new Set(['node-test', 'node-script', 'python-unittest', 'python-project', 'research-script']);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export class CatalogError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CatalogError';
    this.code = code;
  }
}

function requireValue(condition, code, message) {
  if (!condition) throw new CatalogError(code, message);
}

function record(value, context) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value)), 'record', context + ' requires a plain record.');
  return value;
}

function field(value, key, context) {
  requireValue(Object.hasOwn(value, key), 'field', context + ' requires its own ' + key + ' field.');
  return value[key];
}

function text(value, context) {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= 2048
    && !/[\x00-\x1f\x7f]/.test(value), 'text', context + ' requires nonempty single-line text.');
  return value;
}

function identifier(value, context) {
  requireValue(typeof value === 'string' && ID.test(value), 'id', context + ' requires a lowercase catalog ID.');
  return value;
}

function relativePath(value, context, allowRoot = false) {
  text(value, context);
  if (allowRoot && value === '.') return value;
  requireValue(!value.startsWith('-') && !/^[\/]/.test(value) && !/[\\:*?\[\]#]/.test(value)
    && value.split('/').every(part => part.length > 0 && part !== '.' && part !== '..'),
  'path', context + ' requires a literal repository-relative path.');
  return value;
}

function array(value, context, allowEmpty = false) {
  requireValue(Array.isArray(value) && (allowEmpty || value.length > 0), 'array', context + ' requires ' + (allowEmpty ? 'an array.' : 'a nonempty array.'));
  for (let index = 0; index < value.length; index += 1) requireValue(Object.hasOwn(value, index), 'array', context + ' requires an owned element at every index.');
  return value;
}

function unique(values, context) {
  requireValue(new Set(values).size === values.length, 'duplicate', context + ' contains repeated identities.');
  return values;
}

function strings(value, context, allowEmpty = false) {
  return unique(array(value, context, allowEmpty).map((item, index) => text(item, context + '[' + index + ']')), context);
}

function paths(value, context) {
  return unique(array(value, context).map(item => relativePath(item, context)), context);
}

/** O(P + S + M + B + E) admission and owned projection; maps have expected O(1) access.
 * P profiles, S suites, M member paths, B bundles, E bundle edges, plus admitted text bytes.
 * Path admission is lexical. It supplies neither filesystem nor symlink containment.
 */
export function admitCatalog(input) {
  record(input, 'catalog');
  requireValue(field(input, 'schemaVersion', 'catalog') === 1, 'version', 'Choose catalog schemaVersion 1.');
  const sourceRevision = text(field(input, 'sourceRevision', 'catalog'), 'sourceRevision');
  const profiles = new Map();
  for (const raw of array(field(input, 'profiles', 'catalog'), 'profiles')) {
    record(raw, 'profile');
    const id = identifier(field(raw, 'id', 'profile'), 'profile.id');
    requireValue(!profiles.has(id), 'duplicate', 'Repeated profile: ' + id);
    profiles.set(id, {
      id,
      runtime: text(field(raw, 'runtime', id), id + '.runtime'),
      prerequisites: strings(field(raw, 'prerequisites', id), id + '.prerequisites', true),
      effects: strings(field(raw, 'effects', id), id + '.effects', true),
      artifacts: strings(field(raw, 'artifacts', id), id + '.artifacts', true),
      timeout: text(field(raw, 'timeout', id), id + '.timeout'),
    });
  }
  const suites = [];
  const suiteIds = new Set();
  for (const raw of array(field(input, 'suites', 'catalog'), 'suites')) {
    record(raw, 'suite');
    const id = identifier(field(raw, 'id', 'suite'), 'suite.id');
    requireValue(!suiteIds.has(id), 'duplicate', 'Repeated suite: ' + id);
    suiteIds.add(id);
    const profileId = identifier(field(raw, 'profile', id), id + '.profile');
    requireValue(profiles.has(profileId), 'unknown-profile', id + ' names an unknown profile: ' + profileId);
    const kind = field(raw, 'kind', id);
    requireValue(KINDS.has(kind), 'kind', id + ' requires a declared runner kind.');
    const members = paths(field(raw, 'members', id), id + '.members');
    const rawCommand = field(raw, 'command', id);
    let command = null;
    let hold = Object.hasOwn(raw, 'hold') ? text(raw.hold, id + '.hold') : null;
    if (rawCommand === null) {
      hold = text(field(raw, 'hold', id), id + '.hold');
    } else {
      record(rawCommand, id + '.command');
      const appendMembers = field(rawCommand, 'appendMembers', id + '.command');
      requireValue(typeof appendMembers === 'boolean', 'command', id + '.command.appendMembers requires a boolean.');
      command = {
        cwd: relativePath(field(rawCommand, 'cwd', id + '.command'), id + '.cwd', true),
        argv: array(field(rawCommand, 'argv', id + '.command'), id + '.argv').map((arg, index) => text(arg, id + '.argv[' + index + ']')),
        appendMembers,
      };
      requireValue(!appendMembers || command.cwd === '.', 'command', id + ' appends repository paths only from the repository root.');
    }
    suites.push({
      id, kind, profile: profileId,
      family: identifier(field(raw, 'family', id), id + '.family'),
      owner: relativePath(field(raw, 'owner', id), id + '.owner'),
      members, command, hold,
      scope: text(field(raw, 'scope', id), id + '.scope'),
      aliases: strings(field(raw, 'aliases', id), id + '.aliases', true),
    });
  }
  const bundles = [];
  const bundleIds = new Set();
  for (const raw of array(field(input, 'bundles', 'catalog'), 'bundles')) {
    record(raw, 'bundle');
    const id = identifier(field(raw, 'id', 'bundle'), 'bundle.id');
    requireValue(BUNDLES.has(id), 'bundle-kind', 'Choose a declared bundle kind: ' + id);
    requireValue(!bundleIds.has(id), 'duplicate', 'Repeated bundle: ' + id);
    bundleIds.add(id);
    const members = unique(array(field(raw, 'suites', id), id + '.suites').map(value => identifier(value, id + '.suites')), id + '.suites');
    for (const member of members) requireValue(suiteIds.has(member), 'unknown-suite', id + ' names an unknown suite: ' + member);
    bundles.push({id, description: text(field(raw, 'description', id), id + '.description'), suites: members});
  }
  return {sourceRevision, profiles, suites, bundles};
}

function selectors(input, name) {
  return unique(array(input, name, true).map(value => identifier(value, name)), name);
}

/** O(P + S + M + B + E + output bytes). Canonical catalog order is stable across selector order.
 * Selection is metadata-only: no test imports, subprocesses, servers, network or builds.
 */
export function createPlan(input, {bundles = [], suites = []} = {}) {
  const catalog = admitCatalog(input);
  const chosenBundles = selectors(bundles, 'selected bundles');
  const chosenSuites = selectors(suites, 'selected suites');
  requireValue(chosenBundles.length + chosenSuites.length > 0, 'empty-selection', 'Choose --bundle or --suite; use --list to discover IDs.');
  const bundleIds = new Set(catalog.bundles.map(item => item.id));
  const suiteIds = new Set(catalog.suites.map(item => item.id));
  for (const id of chosenBundles) requireValue(bundleIds.has(id), 'unknown-bundle', 'Choose a listed bundle; received ' + id);
  for (const id of chosenSuites) requireValue(suiteIds.has(id), 'unknown-suite', 'Choose a listed suite; received ' + id);
  const requested = new Set(chosenBundles);
  const explicit = new Set(chosenSuites);
  const reasons = new Map();
  for (const bundle of catalog.bundles) {
    if (!requested.has(bundle.id)) continue;
    for (const id of bundle.suites) {
      if (!reasons.has(id)) reasons.set(id, []);
      reasons.get(id).push('bundle:' + bundle.id);
    }
  }
  const selected = [];
  for (const suite of catalog.suites) {
    if (!reasons.has(suite.id) && !explicit.has(suite.id)) continue;
    const why = [...(reasons.get(suite.id) ?? [])];
    if (explicit.has(suite.id)) why.push('suite:' + suite.id);
    const profile = catalog.profiles.get(suite.profile);
    selected.push({
      ...suite, ...profile, id: suite.id, profile: profile.id, reasons: why,
      prerequisites: [...profile.prerequisites], effects: [...profile.effects], artifacts: [...profile.artifacts],
      command: suite.command ? {cwd: suite.command.cwd, argv: [...suite.command.argv, ...(suite.command.appendMembers ? suite.members : [])]} : null,
      routeStatus: suite.hold ? 'held' : 'declared',
      memberUnit: 'source file; runtime test cases remain runner-owned',
    });
  }
  requireValue(selected.length > 0, 'empty-selection', 'The selection requires at least one declared suite.');
  return {
    mode: 'plan-only', execution: 'Commands remain undispatched.',
    sourceRevision: catalog.sourceRevision,
    selectedBundles: catalog.bundles.filter(item => requested.has(item.id)).map(item => item.id),
    suites: selected,
    summary: {
      suites: selected.length,
      distinctMemberFiles: new Set(selected.flatMap(item => item.members)).size,
      heldRoutes: selected.filter(item => item.routeStatus === 'held').length,
      executedTestCases: 0,
    },
    dependencyBoundary: 'Entry files and source owners are mapped. Exact dependency closure, scenario IDs and checkpoint identity remain with the receiving harness.',
  };
}

/** Trace explicit npm-run edges. Shell source stays visible metadata and is never parsed/evaluated.
 * O(V + E + script bytes) time and O(V + E) space for the reachable declared graph.
 */
export function traceAliases(scripts, roots, edges = {}) {
  record(scripts, 'package scripts');
  record(edges, 'declared npm-run edges');
  const visiting = new Set();
  const visited = new Set();
  const entries = [];
  for (const root of strings(roots, 'alias roots', true)) {
    const stack = [{name: root, finish: false}];
    while (stack.length) {
      const item = stack.pop();
      if (item.finish) {
        visiting.delete(item.name);
        visited.add(item.name);
        entries.push({name: item.name, script: item.script, invokes: item.invokes});
        continue;
      }
      requireValue(Object.hasOwn(scripts, item.name), 'unknown-alias', 'Package scripts must declare alias ' + item.name);
      requireValue(!visiting.has(item.name), 'alias-cycle', 'Resolve the npm-run cycle at ' + item.name);
      if (visited.has(item.name)) continue;
      const script = text(scripts[item.name], 'script ' + item.name);
      const invokes = Object.hasOwn(edges, item.name) ? strings(edges[item.name], 'edges for ' + item.name, true) : [];
      visiting.add(item.name);
      stack.push({name: item.name, finish: true, script, invokes});
      for (let index = invokes.length - 1; index >= 0; index -= 1) stack.push({name: invokes[index], finish: false});
    }
  }
  return entries;
}

export function parseArgs(args) {
  const options = {bundles: [], suites: [], list: false, json: false};
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--bundle' || arg === '--suite') {
      const value = args[++index];
      identifier(value, arg);
      options[arg === '--bundle' ? 'bundles' : 'suites'].push(value);
    } else {
      requireValue(arg === '--list' || arg === '--json', 'option', 'Choose --list, --bundle ID, --suite ID or --json.');
      requireValue(!seen.has(arg), 'duplicate', 'Provide ' + arg + ' once.');
      seen.add(arg);
      options[arg === '--list' ? 'list' : 'json'] = true;
    }
  }
  requireValue(!options.list || options.bundles.length + options.suites.length === 0, 'option', 'Use --list separately from selection.');
  return options;
}

export async function main(args, {root = ROOT, write = value => process.stdout.write(value)} = {}) {
  const options = parseArgs(args);
  const raw = await readFile(resolve(root, 'tests/suites/catalog.json'), 'utf8');
  requireValue(raw.length <= 2_000_000, 'size', 'Keep the authored catalog within its two-million-character admission budget.');
  const input = JSON.parse(raw);
  let result;
  if (options.list) {
    const catalog = admitCatalog(input);
    result = {
      mode: 'plan-only', sourceRevision: catalog.sourceRevision,
      bundles: catalog.bundles,
      suites: catalog.suites.map(suite => ({id: suite.id, family: suite.family, kind: suite.kind, members: suite.members.length, routeStatus: suite.hold ? 'held' : 'declared', hold: suite.hold})),
    };
  } else {
    result = createPlan(input, options);
    const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    result.rootCompatibility = traceAliases(pkg.scripts, [...new Set(result.suites.flatMap(suite => suite.aliases))], input.inventory?.npmRunEdges ?? {});
    result.compatibilityBoundary = 'Aliases are related existing commands, rather than promises of equivalent membership. The catalog records exact direct/composite selection separately.';
  }
  if (options.json) write(JSON.stringify(result, null, 2) + '\n');
  else if (options.list) write('PLAN ONLY | ' + result.sourceRevision + '\nBundles: ' + result.bundles.map(item => item.id).join(', ') + '\n' + result.suites.map(item => item.id + ' | ' + item.kind + ' | ' + item.members + ' files | ' + item.routeStatus + (item.hold ? ': ' + item.hold : '')).join('\n') + '\n');
  else {
    const lines = ['PLAN ONLY | commands remain undispatched | ' + result.sourceRevision];
    for (const suite of result.suites) {
      lines.push('', suite.id + ' | ' + suite.routeStatus, 'Owner: ' + suite.owner, 'Runtime: ' + suite.runtime,
        'Members: ' + suite.members.join(', '), 'Scope: ' + suite.scope,
        'Command: ' + (suite.command ? JSON.stringify(suite.command) : suite.hold),
        'Prerequisites: ' + suite.prerequisites.join('; '), 'Execution effects: ' + suite.effects.join('; '),
        'Artifacts: ' + suite.artifacts.join('; '), 'Timeout: ' + suite.timeout);
      if (suite.hold) lines.push('Hold: ' + suite.hold);
    }
    lines.push('', result.dependencyBoundary);
    write(lines.join('\n') + '\n');
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write((error instanceof CatalogError ? error.code : 'catalog-read') + ': ' + error.message + '\n');
    process.exitCode = 1;
  });
}
