import '../../tools/node-runtime-admission.mjs';
import { before, after } from 'node:test';

function throwFailures(failures) {
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(failures, 'Browser fixture setup or cleanup failed.', { cause: failures[0] });
  }
}

/** Own one suite's awaited acquisitions through teardown.
 * Setup awaits own(resourcePromise) for each server/browser with a close method.
 * Teardown joins in-flight setup, including Node's zero-match root-hook path.
 * Cases retain their context, telemetry, and assertion ownership.
 */
export function createBrowserFixture(setup) {
  const resources = [];
  let starting, closing, releasing;

  async function own(acquisition) {
    const resource = await acquisition;
    resources.push(resource);
    return resource;
  }

  function release() {
    return releasing ??= Promise.resolve().then(async () => {
      const failures = [];
      for (const resource of resources.reverse()) {
        try { await resource.close(); } catch (error) { failures.push(error); }
      }
      return failures;
    });
  }

  function start() {
    if (starting) return starting;
    if (closing) return Promise.reject(new Error('Browser fixture has already closed.'));
    starting = Promise.resolve().then(async () => {
      try { await setup(own); }
      catch (error) { throwFailures([error, ...await release()]); }
    });
    return starting;
  }

  function close() {
    return closing ??= Promise.resolve().then(async () => {
      // A failed start already released its acquisitions and owns its diagnostic.
      if (starting) await starting;
      throwFailures(await release());
    });
  }

  return { start, close };
}

export function registerBrowserFixture(setup) {
  const fixture = createBrowserFixture(setup);
  before(() => fixture.start());
  after(() => fixture.close());
}
