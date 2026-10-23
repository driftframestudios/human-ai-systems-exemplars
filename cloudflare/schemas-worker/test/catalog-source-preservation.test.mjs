import '../../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import test from "node:test";
import { compareCatalogSource } from "./catalog-source-preservation.mjs";

// Exact observed program with synthetic request metadata. This fixture is data;
// the tests compare bytes and never execute the added script.
const EDGE_FIXTURE = "<script>(function(){function c(){var b=a.contentDocument||(a.contentWindow&&a.contentWindow.document);if(b){var d=b.createElement('script');d.innerHTML=\"window.__CF$cv$params={r:'0000000000000000',t:'MTAwMDAwMDAwMA=='};var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);\";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();</script>";
const AUTHORED = Buffer.from(`<!doctype html>
<html>
<head>
<style>body { color: navy; }</style>
<script src="/catalog.js"></script>
<script type="application/ld+json">{"name":"Schema registry","version":1}</script>
</head>
<body>
<h1>Stable schema routes</h1>
<a href="/schema.json">Download schema</a>
<p>Preserve this  spacing and the literal word Cloudflare.</p>
</body>
</html>
`);
const addAt = (source, addition = EDGE_FIXTURE, boundary = source.indexOf(Buffer.from("</body>"))) => Buffer.concat([
  source.subarray(0, boundary), Buffer.from(addition), source.subarray(boundary),
]);
const acceptedAddition = {
  classification: "observed-edge-addition", exactByteParity: false,
  authoredBytesPreserved: true, addedBytes: 938,
};

test("exact source bytes retain their distinct parity result", () => {
  assert.deepEqual(compareCatalogSource(AUTHORED, Buffer.from(AUTHORED)), {
    classification: "exact-byte-parity", exactByteParity: true,
    authoredBytesPreserved: true, addedBytes: 0,
  });
});

test("the observed addition preserves every authored byte at its exact boundary", () => {
  assert.deepEqual(compareCatalogSource(AUTHORED, addAt(AUTHORED)), acceptedAddition);
});

test("only the two constrained metadata values can vary", () => {
  const varied = EDGE_FIXTURE.replace("r:'0000000000000000'", "r:'abcdef0123456789'")
    .replace("t:'MTAwMDAwMDAwMA=='", "t:'MTk5OTk5OTk5OQ=='");
  assert.deepEqual(compareCatalogSource(AUTHORED, addAt(AUTHORED, varied)), acceptedAddition);
});

for (const [name, from, to] of [
  ["text", "Stable schema routes", "Different schema routes"],
  ["link", 'href="/schema.json"', 'href="/other.json"'],
  ["style", "color: navy", "color: red"],
  ["script", 'src="/catalog.js"', 'src="/other.js"'],
  ["data", '"version":1', '"version":2'],
  ["space", "this  spacing", "this spacing"],
  ["line ending", "<body>\n", "<body>\r\n"],
  ["authored node", "<h1>Stable schema routes</h1>", ""],
]) {
  test(`authored ${name} changes remain unexplained even beside the observed addition`, () => {
    const changed = Buffer.from(AUTHORED.toString("utf8").replace(from, to));
    assert.notDeepEqual(changed, AUTHORED, "counterexample changes the source");
    assert.equal(compareCatalogSource(AUTHORED, addAt(changed)).classification, "unexplained-difference");
  });
}

for (const [name, addition] of [
  ["Cloudflare-name impostor", "<script>/* Cloudflare */ arbitraryCode();</script>"],
  ["same route in another program", "<script>load('/cdn-cgi/challenge-platform/scripts/jsd/main.js');</script>"],
  ["changed executable byte", EDGE_FIXTURE.replace("createElement('iframe')", "createElement('script')")],
  ["extra executable statement", EDGE_FIXTURE.replace("})();</script>", "})();arbitraryCode();</script>")],
  ["script attribute", EDGE_FIXTURE.replace("<script>", '<script nonce="added">')],
  ["duplicate script", EDGE_FIXTURE + EDGE_FIXTURE],
  ["added whitespace", EDGE_FIXTURE + "\n"],
  ["request quote escape", EDGE_FIXTURE.replace("0000000000000000", "x';arbitraryCode();//")],
  ["uppercase request value", EDGE_FIXTURE.replace("0000000000000000", "ABCDEF0123456789")],
  ["short request value", EDGE_FIXTURE.replace("0000000000000000", "000000000000000")],
  ["extra metadata key", EDGE_FIXTURE.replace("{r:", "{extra:'value',r:")],
  ["nondecimal timestamp", EDGE_FIXTURE.replace("MTAwMDAwMDAwMA==", "YWFhYWFhYWFhYQ==")],
  ["noncanonical timestamp encoding", EDGE_FIXTURE.replace("MTAwMDAwMDAwMA==", "MTAwMDAwMDAwMB==")],
  ["short timestamp", EDGE_FIXTURE.replace("MTAwMDAwMDAwMA==", "MTAwMDAwMDAw")],
]) {
  test(`the boundary records but rejects ${name}`, () => {
    assert.notEqual(addition, EDGE_FIXTURE, "counterexample changes the addition");
    const result = compareCatalogSource(AUTHORED, addAt(AUTHORED, addition));
    assert.equal(result.classification, "unclassified-boundary-addition");
    assert.equal(result.authoredBytesPreserved, true);
    assert.equal(result.exactByteParity, false);
  });
}

for (const [name, boundary] of [
  ["document start", 0],
  ["head end", AUTHORED.indexOf(Buffer.from("</head>"))],
  ["after body end", AUTHORED.indexOf(Buffer.from("</body>")) + 7],
  ["document end", AUTHORED.length],
]) {
  test(`the observed script at ${name} stays outside the accepted boundary`, () => {
    assert.equal(compareCatalogSource(AUTHORED, addAt(AUTHORED, EDGE_FIXTURE, boundary)).classification, "unexplained-difference");
  });
}

test("an ambiguous authored closing marker receives a source review", () => {
  const ambiguous = Buffer.from(AUTHORED.toString("utf8").replace("<body>", "<body><!-- </body> -->"));
  const result = compareCatalogSource(ambiguous, addAt(ambiguous, EDGE_FIXTURE, ambiguous.lastIndexOf(Buffer.from("</body>"))));
  assert.equal(result.classification, "unexplained-difference");
});

test("the byte contract rejects altered non-ASCII and malformed encoded bytes", () => {
  const nonAscii = Buffer.from(AUTHORED.toString("utf8").replace("Schema registry", "Schema r\u00e9gistry"));
  const received = addAt(nonAscii);
  const offset = received.indexOf(Buffer.from("\u00e9"));
  received[offset] = 0xff;
  assert.equal(compareCatalogSource(nonAscii, received).classification, "unexplained-difference");
});

test("the comparison retains ownership of both caller buffers", () => {
  const received = addAt(AUTHORED);
  const beforeSource = Buffer.from(AUTHORED);
  const beforeResponse = Buffer.from(received);
  compareCatalogSource(AUTHORED, received);
  assert.deepEqual(AUTHORED, beforeSource);
  assert.deepEqual(received, beforeResponse);
});

for (const [name, source, received] of [
  ["source string", "html", Buffer.from("html")],
  ["response string", Buffer.from("html"), "html"],
  ["missing source", null, AUTHORED],
]) {
  test(`the explicit byte-buffer contract rejects ${name}`, () => {
    assert.throws(() => compareCatalogSource(source, received), { name: "TypeError", message: "Catalog comparison requires authored and received byte buffers" });
  });
}
