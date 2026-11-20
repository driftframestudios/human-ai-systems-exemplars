import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { format } from 'prettier';
import { readSourceContract } from './read-source-contract.mjs';

test('source observations survive HTML formatting and retain changed content and raw non-HTML bytes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'formatted-source-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const html = '<meta name="author" content="A person"><a href="route.html#detail" aria-label="Read the complete account">Read the account</a>';
  const compact = join(directory, 'compact.html');
  const formatted = join(directory, 'formatted.html');
  const changed = join(directory, 'changed.html');
  const binary = join(directory, 'image.webp');
  await writeFile(compact, html);
  await writeFile(formatted, await format(html, { parser: 'html', printWidth: 35 }));
  await writeFile(changed, html.replace('route.html#detail', 'wrong.html'));
  await writeFile(binary, Buffer.from([0, 255, 128, 10]));
  assert.equal(await readSourceContract(formatted, 'utf8'), await readSourceContract(compact, 'utf8'));
  assert.notEqual(await readSourceContract(changed, 'utf8'), await readSourceContract(compact, 'utf8'));
  assert.deepEqual(await readSourceContract(binary), Buffer.from([0, 255, 128, 10]));
});
