import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDownloadOwner } from '../../collaboration/native-investment-studio/browser-download.mjs';

function receiver() {
  const created = [], revoked = [], dispatched = [], attached = new Set(), events = [];
  const control = { failAt: null, failure: new Error('controlled browser effect failure'), onClick: null };
  const fail = stage => { if (control.failAt === stage) throw control.failure; };
  const document = {
    defaultView: { Blob, URL: {
      createObjectURL(blob) {
        fail('allocation');
        const url = `blob:fixture-${created.length + 1}`;
        created.push({ url, blob }); events.push(`acquire:${url}`); return url;
      },
      revokeObjectURL(url) { revoked.push(url); events.push(`release:${url}`); },
    } },
    createElement(tag) {
      assert.equal(tag, 'a'); fail('element');
      return {
        click() {
          assert.equal(attached.has(this), true);
          assert.equal(this.hidden, true);
          fail('dispatch');
          dispatched.push({ href: this.href, filename: this.download });
          events.push(`dispatch:${this.href}`); control.onClick?.();
        },
        remove() { attached.delete(this); },
      };
    },
  };
  const host = { ownerDocument: document, append(link) { attached.add(link); fail('attachment'); } };
  return { host, created, revoked, dispatched, attached, events, control };
}

const first = { text: 'accepted snapshot', type: 'text/plain;charset=utf-8', filename: 'accepted.txt' };
const next = { text: '<main>Accepted report</main>', type: 'text/html;charset=utf-8', filename: 'report.html' };

test('successful downloads preserve exact payloads and release the preceding URL after replacement', async () => {
  const fixture = receiver(), owner = createDownloadOwner(fixture.host);
  assert.equal(owner.request(first), true);
  assert.deepEqual(fixture.revoked, []);
  assert.equal(fixture.attached.size, 0);
  assert.equal(owner.request(next), true);
  assert.deepEqual(fixture.dispatched, [
    { href: 'blob:fixture-1', filename: 'accepted.txt' },
    { href: 'blob:fixture-2', filename: 'report.html' },
  ]);
  assert.deepEqual(await Promise.all(fixture.created.map(async ({ blob }) => [blob.type, await blob.text()])), [
    ['text/plain;charset=utf-8', 'accepted snapshot'], ['text/html;charset=utf-8', '<main>Accepted report</main>'],
  ]);
  assert.deepEqual(fixture.revoked, ['blob:fixture-1']);
  assert.ok(fixture.events.indexOf('release:blob:fixture-1') > fixture.events.indexOf('dispatch:blob:fixture-2'));
  owner.dispose(); owner.dispose();
  assert.deepEqual(fixture.revoked, ['blob:fixture-1', 'blob:fixture-2']);
  assert.equal(owner.request(first), false);
  assert.equal(fixture.created.length, 2);
  assert.equal(fixture.attached.size, 0);
});

for (const stage of ['allocation', 'element', 'attachment', 'dispatch']) {
  test(`${stage} failure releases its attempt and retains the preceding download`, () => {
    const fixture = receiver(), owner = createDownloadOwner(fixture.host);
    owner.request(first); fixture.control.failAt = stage;
    assert.throws(() => owner.request(next), error => error === fixture.control.failure);
    assert.deepEqual(fixture.dispatched, [{ href: 'blob:fixture-1', filename: 'accepted.txt' }]);
    assert.equal(fixture.attached.size, 0);
    assert.deepEqual(fixture.revoked, stage === 'allocation' ? [] : ['blob:fixture-2']);
    fixture.control.failAt = null;
    assert.equal(owner.request(next), true, 'a failed attempt leaves the receiver available for another request');
    assert.ok(fixture.revoked.includes('blob:fixture-1'));
    owner.dispose();
    assert.deepEqual([...fixture.revoked].sort(), fixture.created.map(row => row.url).sort());
  });
}

test('disposal during dispatch closes both owned lifetimes and prevents a nested request', () => {
  const fixture = receiver(), owner = createDownloadOwner(fixture.host);
  owner.request(first);
  fixture.control.onClick = () => {
    assert.equal(owner.request(first), false, 'the active attempt owns dispatch');
    owner.dispose();
  };
  assert.equal(owner.request(next), false);
  assert.equal(fixture.attached.size, 0);
  assert.deepEqual(fixture.revoked, ['blob:fixture-1', 'blob:fixture-2']);
  owner.dispose();
  assert.equal(owner.request(first), false);
  assert.equal(fixture.created.length, 2);
  assert.equal(fixture.revoked.length, 2);
});
