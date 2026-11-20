import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { compactSource, prettySource } from '../../tools/cpanel-format.mjs';
import { createDirectoryRoutes, mapImageCandidates, projectScriptUrls } from '../../tools/cpanel-directory-routes.mjs';

test('directory indexes accept both page spellings and preserve page state and payload filenames', () => {
  const files = ['index.html', 'showcase.html', 'images/card.svg'].map(projected_path => ({
    projected_path, media_type: projected_path.endsWith('.html') ? 'text/html' : 'image/svg+xml',
  }));
  const routes = createDirectoryRoutes({ files }, 'https://portfolio.example/');
  assert.deepEqual(routes.entries.get('showcase.html'), ['showcase/index.html']);
  const resolve = value => routes.resolve(value, 'index.html', true);
  assert.equal(resolve('showcase.html?mode=case#work'), '/showcase/?mode=case#work');
  assert.equal(resolve('https://external.example/showcase.html'), 'https://external.example/showcase.html');
  assert.equal(mapImageCandidates('data:image/svg+xml,ABC 1x, images/card.svg 2x', resolve),
    'data:image/svg+xml,ABC 1x, /images/card.svg 2x');
  const source = 'const seed = { file: "showcase.html" }; link.href = "showcase.html";';
  assert.equal(projectScriptUrls(source, resolve), 'const seed = { file: "showcase.html" }; link.href = "/showcase/";');
  assert.throws(() => createDirectoryRoutes({ files: [...files, {
    projected_path: 'Showcase/index.html', media_type: 'text/html',
  }] }, 'https://portfolio.example/'), /collides/);
});

test('compacting preserves verbatim HTML, meaningful SVG text, metadata, and JSON number spellings', async () => {
  const graphic = '<svg><g><text xml:space="preserve">  A  </text><text><tspan>B</tspan><tspan>C</tspan></text></g><metadata><rdf:RDF><dc:title>  Rights  </dc:title></rdf:RDF></metadata></svg>';
  const verbatim = '<pre>  Copy this\n</pre><textarea>  Edit this\n</textarea>';
  const source = '<div title="short">' + graphic + verbatim + '<script>const sample = "<pre>example</pre>";</script></div>';
  const compact = await compactSource('page.html', source);
  assert.ok((await prettySource('page.html', compact)).includes(graphic));
  assert.ok(compact.includes(graphic));
  assert.ok(compact.includes(verbatim));
  assert.ok(compact.includes('title="short"'));
  assert.equal(await compactSource('page.html', compact), compact);
  assert.equal(await compactSource('figure.svg', await prettySource('figure.svg', graphic)), graphic);
  assert.equal(await compactSource('data.json', '{ "value": 9007199254740993, "label": "a   b" }'), '{"value":9007199254740993,"label":"a   b"}');
});
