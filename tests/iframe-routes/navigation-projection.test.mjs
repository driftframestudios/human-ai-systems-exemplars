import assert from "node:assert/strict";
import test from "node:test";

import {
  navigationObservation,
  observeIframeExitLinks,
  projectIframeExitLinks,
} from "../../tools/iframe-route-package-engine.mjs";

test("static iframe exits gain secure separate-tab behavior without changing local actions", () => {
  const source = `<!doctype html>
<html><body>
  <a href="https://example.test/reading" target="_self" rel="author NoOpener">Read more</a>
  <a href="#inside">Inside</a>
  <a href="&#35;encoded-inside">Encoded inside</a>
  <a href="artifact.json" download>Download</a>
  <a href="javascript:void(0)">Script action</a>
  <!-- <a href="https://comment.example/">Comment example</a> -->
  <style>.example::after { content: '<a href="https://style.example/">'; }</style>
</body></html>`;

  const projection = projectIframeExitLinks(source);

  assert.equal(projection.exit_links, 1);
  assert.equal(projection.rewritten_links, 1);
  assert.equal(projection.dynamic_exit_templates, 0);
  assert.equal(projection.runtime_adapter, false);
  assert.match(
    projection.html,
    /<a href="https:\/\/example\.test\/reading" target="_blank" rel="author NoOpener noreferrer">Read more<\/a>/u,
  );
  assert.match(projection.html, /<a href="#inside">Inside<\/a>/u);
  assert.match(projection.html, /<a href="&#35;encoded-inside">Encoded inside<\/a>/u);
  assert.match(projection.html, /<a href="artifact\.json" download>Download<\/a>/u);
  assert.match(projection.html, /<a href="javascript:void\(0\)">Script action<\/a>/u);
  assert.match(projection.html, /https:\/\/comment\.example\//u);
  assert.match(projection.html, /https:\/\/style\.example\//u);
  assert.deepEqual(observeIframeExitLinks(projection.html), {
    exit_links: 1,
    new_tab_exit_links: 1,
    secure_new_tab_exit_links: 1,
  });
});

test("runtime-created iframe exits receive their projected navigation when added", () => {
  const source = `<!doctype html>
<html><body>
  <div id="results"></div>
  <script>results.innerHTML = '<a href="https://example.test/result">Result</a>';</script>
</body></html>`;

  const projection = projectIframeExitLinks(source);

  assert.equal(projection.exit_links, 0);
  assert.equal(projection.rewritten_links, 0);
  assert.equal(projection.dynamic_exit_templates, 1);
  assert.equal(projection.runtime_adapter, true);
  assert.match(
    projection.html,
    /results\.innerHTML = '<a href="https:\/\/example\.test\/result">Result<\/a>';/u,
    "the canonical script text remains unchanged",
  );
  assert.equal(
    (projection.html.match(/data-iframe-exit-projection/gu) ?? []).length,
    1,
  );
  assert.match(projection.html, /new MutationObserver/u);
  assert.match(projection.html, /document\.querySelectorAll\("a\[href\]"\)\.forEach\(projectExit\);/u);
  assert.match(projection.html, /anchor\.target = "_blank";/u);
  assert.match(projection.html, /anchor\.relList\.add\("noopener", "noreferrer"\);/u);
});

test("navigation receipts keep downloads out of route-exit resolution", () => {
  const observation = navigationObservation(
    `<!doctype html><body>
      <a href="artifact.json" download>Download</a>
      <script>const example = '<a href="unpackaged.html">Example</a>';</script>
    </body>`,
    "instrument",
    new Set(),
    "/v1/core/",
    { scanMarkupContextsOnly: true },
  );

  assert.deepEqual(observation, {
    packaged_links: 0,
    fragment_links: 0,
    external_links: 0,
    exit_links: 0,
    new_tab_exit_links: 0,
    secure_new_tab_exit_links: 0,
    unresolved_local_links: [],
  });
});
