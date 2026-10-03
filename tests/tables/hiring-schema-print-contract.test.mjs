import assert from "node:assert/strict";
import test from "node:test";
import { assertPrintedSchema } from "./hiring-schema-print-contract.mjs";

const expected = JSON.stringify({ $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Talent intake inspection state", description: 'Two  spaces, a "quote", \\ path and\nline',
  minimum: 10 }, null, 2);

const accepted = [
  ["source serialization", [expected]],
  ["JSON layout whitespace", [JSON.stringify(JSON.parse(expected))]],
  ["word-space wrap", [expected.replace("Talent intake", "Talent\nintake")]],
  ["token-internal wrap", [expected.replace("inspection", "inspec\r\ntion")]],
  ["wrap with preserved space", [expected.replace("Talent intake", "Talent \nintake")]],
  ["literal escape split", [expected.replace('\\"quote', '\\\n"quote')]],
  ["page continuation", [expected.slice(0, expected.indexOf("inspection")), expected.slice(expected.indexOf("inspection"))]],
  ["surrounding report", ["Report introduction\n", expected, "\nReport end"]],
];
for (const [name, pages] of accepted) {
  test(`printed schema accepts ${name}`, () => {
    const result = assertPrintedSchema(pages, expected);
    assert.deepEqual(result.schemaPages, name === "surrounding report" ? [2]
      : pages.map((_, index) => index + 1));
  });
}

const rejected = [
  ["lost meaningful spaces", expected.replace("Talent intake inspection state", "Talentintakeinspectionstate")],
  ["lost single word space", expected.replace("Talent intake", "Talentintake")],
  ["extra literal space", expected.replace("Talent intake", "Talent  intake")],
  ["collapsed repeated spaces", expected.replace("Two  spaces", "Two spaces")],
  ["wrap swallowing repeated spaces", expected.replace("Two  spaces", "Two\nspaces")],
  ["missing escaped quote", expected.replace('\\"quote', '"quote')],
  ["lost literal newline escape", expected.replace('and\\nline', 'and\nline')],
  ["changed numeric value", expected.replace('"minimum": 10', '"minimum": 1')],
  ["truncated closing boundary", expected.slice(0, -1)],
  ["intervening foreign content", expected.replace('"title"', 'Page footer\n"title"')],
  ["duplicate schema", expected + "\n" + expected],
];
for (const [name, printed] of rejected) {
  test(`printed schema detects ${name}`, () => assert.throws(() => assertPrintedSchema([printed], expected), assert.AssertionError));
}
test("printed schema requires extracted page strings and a source dialect anchor", () => {
  for (const pages of [[], "text", [null]]) assert.throws(() => assertPrintedSchema(pages, expected), assert.AssertionError);
  assert.throws(() => assertPrintedSchema([expected], '{"title":"other"}'), assert.AssertionError);
});
