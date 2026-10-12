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
  const target = JSON.stringify(schema), text = pageTexts.join("\n");
  // The fixed dialect token admits the same extracted breaks as the comparison.
  const anchors = text.matchAll(/"[\r\n]*\$[\r\n]*s[\r\n]*c[\r\n]*h[\r\n]*e[\r\n]*m[\r\n]*a[\r\n]*"/g);
  const firstAnchor = anchors.next().value;
  assert(firstAnchor && anchors.next().done,
    "printed report carries one schema dialect anchor");
  let start = firstAnchor.index - 1;
  while (start >= 0 && layoutSpace(text[start])) start--;
  assert.equal(text[start], "{", "printed schema begins with its object boundary");
  let cursor = start, quoted = false, escaped = false;
  for (let index = 0; index < target.length; index++) {
    const wanted = target[index];
    if (!quoted) {
      while (layoutSpace(text[cursor])) cursor++;
    } else if (!escaped && wanted === " ") {
      let sourceEnd = index;
      while (target[sourceEnd] === " ") sourceEnd++;
      let literalSpaces = 0, wraps = 0, withinBreak = false;
      while (text[cursor] === " " || text[cursor] === "\r" || text[cursor] === "\n") {
        if (text[cursor] === " ") { literalSpaces++; withinBreak = false; }
        else { if (!withinBreak) wraps++; withinBreak = true; }
        cursor++;
      }
      // Each contiguous break group represents zero or one source space. This
      // treats CRLF and a page separator beside a line ending as one boundary.
      const sourceSpaces = sourceEnd - index;
      assert(literalSpaces <= sourceSpaces && sourceSpaces <= literalSpaces + wraps,
        `printed schema preserves source space count at character ${index}`);
      index = sourceEnd - 1;
      continue;
    } else {
      while (text[cursor] === "\n" || text[cursor] === "\r") cursor++;
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
