import assert from "node:assert/strict";

const layoutSpace = character => character === " " || character === "\t" || character === "\r" || character === "\n";

/** Compare this schema's printed serialization, preserving all string content.
 * Outside strings, JSON layout whitespace is free. Inside strings, extracted
 * line/page breaks may split a token or stand for one source-owned word space.
 * Literal spaces, escapes, punctuation and order retain their source meaning.
 * A single schema anchor bounds the comparison within the surrounding report.
 * Cost: O(report text + serialized schema), with O(report text) joined storage.
 */
export function assertPrintedSchema(pageTexts, expected) {
  assert(Array.isArray(pageTexts) && pageTexts.length > 0 && pageTexts.every(text => typeof text === "string"),
    "PDF pages supply extracted text");
  const schema = JSON.parse(expected);
  assert(schema && typeof schema === "object" && !Array.isArray(schema)
    && Object.keys(schema)[0] === "$schema", "source schema starts with its dialect declaration");
  const target = JSON.stringify(schema), text = pageTexts.join("\n"), anchor = '"$schema"';
  const anchorStart = text.indexOf(anchor);
  assert(anchorStart >= 0 && text.indexOf(anchor, anchorStart + anchor.length) < 0,
    "printed report carries one schema dialect anchor");
  let start = anchorStart - 1;
  while (start >= 0 && layoutSpace(text[start])) start--;
  assert.equal(text[start], "{", "printed schema begins with its object boundary");
  let cursor = start, quoted = false, escaped = false;
  for (let index = 0; index < target.length; index++) {
    const wanted = target[index];
    if (!quoted) {
      while (layoutSpace(text[cursor])) cursor++;
    } else {
      let wrapped = false;
      while (text[cursor] === "\n" || text[cursor] === "\r") { cursor++; wrapped = true; }
      // A wrap can represent one word space; ordinary same-line spaces stay exact.
      if (wrapped && !escaped && wanted === " " && text[cursor] !== " "
          && target[index + 1] !== " " && text[cursor] === target[index + 1]) continue;
    }
    assert.equal(text[cursor], wanted, `printed schema preserves source character ${index}`);
    cursor++;
    if (escaped) escaped = false;
    else if (quoted && wanted === "\\") escaped = true;
    else if (wanted === '"') quoted = !quoted;
  }
  let offset = 0;
  const schemaPages = [];
  for (let index = 0; index < pageTexts.length; index++) {
    const end = offset + pageTexts[index].length;
    if (end > start && offset < cursor) schemaPages.push(index + 1);
    offset = end + 1;
  }
  return { schemaPages };
}
