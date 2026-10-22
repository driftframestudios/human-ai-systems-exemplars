import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const NODE_FLOOR = '22.23.4';
export const NODE_RANGE = '>=22.23.4 <23';

// The policy admits stable Node 22 coordinates. Version input stays bounded and
// numeric comparison keeps 22.23.10 above 22.23.4 independently of text ordering.
export function supportsNode(version) {
  if (typeof version !== 'string' || version.length > 64) return false;
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(version);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return [major, minor, patch].every(Number.isSafeInteger)
    && major === 22 && (minor > 23 || (minor === 23 && patch >= 4));
}

export function requireNode(version = process.version) {
  if (supportsNode(version)) return;
  const error = new Error(`Detected Node ${version}. Use Node ${NODE_RANGE}; activate the ${NODE_FLOOR} coordinate in .node-version, then rerun this command. See NODE-RUNTIME.md.`);
  error.code = 'ERR_NODE_RUNTIME';
  throw error;
}

export function runtimeReceipt() {
  requireNode();
  return {
    owner: 'repository-selected-node',
    supported: NODE_RANGE,
    selected: NODE_FLOOR,
    node: process.version,
    components: Object.fromEntries(['v8', 'openssl', 'uv', 'zlib', 'brotli', 'ares', 'modules']
      .map(name => [name, process.versions[name] ?? null])),
    platform: process.platform,
    architecture: process.arch,
  };
}

function isEntrypoint() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
    throw error;
  }
}

if (isEntrypoint()) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--quiet')) {
      throw new Error('Use node tools/check-node-runtime.mjs [--quiet].');
    }
    const receipt = runtimeReceipt();
    if (args.length === 0) console.log(JSON.stringify(receipt, null, 2));
  } catch (error) {
    console.error(`${error.code ?? 'ERR_NODE_RUNTIME_USAGE'}: ${error.message}`);
    process.exitCode = 1;
  }
}
