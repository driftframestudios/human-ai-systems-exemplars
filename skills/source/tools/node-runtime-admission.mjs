import { requireNode } from './check-node-runtime.mjs';

// The first dependency admits the runtime before downstream module evaluation.
// Node resolves and links the graph before evaluation; loader errors retain
// their own diagnostics when a dependency is absent or source is unparsable.
try {
  requireNode();
} catch (error) {
  console.error(`${error.code}: ${error.message}`);
  process.exit(1);
}
