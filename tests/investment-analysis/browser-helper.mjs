import '../../tools/node-runtime-admission.mjs';
import {startStaticServer, monitor, assertTelemetry} from '../../tools/core-architecture-browser-helper.mjs';

function throwFailures(failures) {
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'Investment browser session and cleanup failures.', {cause: failures[0]});
}

/** Compose Core mechanics for sequential, awaited investment browser cases.
 * The caller owns assertions, context options, navigation, and artifact bytes.
 * Each acquired owner receives one cleanup attempt, including partial setup.
 * This adapter does not own runner cancellation or process termination.
 */
export async function withInvestmentBrowser(chromium, run, {serve = startStaticServer} = {}) {
  let server, browser, result;
  let accepting = false;
  const contexts = new Set();
  const failures = [];

  async function openPage(options = {}) {
    if (!accepting) throw new Error('Investment browser session is no longer accepting pages.');
    const context = await browser.newContext(options);
    let telemetry, closing;
    const owned = {page: null, close};
    contexts.add(owned);

    function close() {
      if (closing) return closing;
      contexts.delete(owned);
      closing = (async () => {
        const closeFailures = [];
        // Observe the completed case before teardown can cancel its requests.
        if (telemetry) {
          try { assertTelemetry(telemetry); } catch (error) { closeFailures.push(error); }
        }
        try { await context.close(); } catch (error) { closeFailures.push(error); }
        throwFailures(closeFailures);
      })();
      return closing;
    }

    owned.page = await context.newPage();
    telemetry = monitor(owned.page);
    owned.page.setDefaultTimeout(5000);
    return owned;
  }

  try {
    server = await serve();
    browser = await chromium.launch({headless: true});
    accepting = true;
    result = await run({origin: server.origin, openPage});
  } catch (error) {
    failures.push(error);
  } finally {
    accepting = false;
    for (const owned of [...contexts].reverse()) {
      try { await owned.close(); } catch (error) { failures.push(error); }
    }
    if (browser) {
      try { await browser.close(); } catch (error) { failures.push(error); }
    }
    if (server) {
      try { await server.close(); } catch (error) { failures.push(error); }
    }
  }
  throwFailures(failures);
  return result;
}
