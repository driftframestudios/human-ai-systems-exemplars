import './node-runtime-admission.mjs';
import { parsers } from 'prettier/plugins/html';

// Offsets refer to the original text, so inserting a projection can preserve
// every authored byte, including HTML strings in the page's JavaScript.
export function readDocumentSpans(source) {
  const document = parsers.html.parse(source, {});
  const html = document.children.find(node => node.name === 'html');
  function closingOffset(name) {
    const elements = html?.children.filter(node => node.name === name) ?? [];
    if (elements.length !== 1 || !elements[0].endSourceSpan) throw new Error('Document requires one closing ' + name + ' tag.');
    return elements[0].endSourceSpan.start.offset;
  }

  function outerMarkup() {
    const chunks = [];
    let offset = 0;
    function visit(node) {
      if ((node.name === 'script' || node.name === 'style') && node.endSourceSpan) {
        chunks.push(source.slice(offset, node.startSourceSpan.end.offset));
        offset = node.endSourceSpan.start.offset;
      } else {
        node.children?.forEach(visit);
      }
    }
    visit(document);
    chunks.push(source.slice(offset));
    return chunks.join('');
  }
  return { closingOffset, outerMarkup };
}
