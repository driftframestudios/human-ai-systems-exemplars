import '../tools/node-runtime-admission.mjs';
import { parse } from 'acorn';

// Select executable source by syntax so the VM harness runs the same owner
// after an IDE formats it or the carrier compacts it.
export function readPrototypeScript(html) {
  const nodes = [];
  for (const [, attributes, source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu)) {
    const type = attributes.match(/\btype\s*=\s*["']([^"']*)["']/iu)?.[1];
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) continue;
    const tree = parse(source, { ecmaVersion: 'latest', sourceType: type === 'module' ? 'module' : 'script' });
    function visit(node) {
      if (!node?.type) return;
      nodes.push({ node, source });
      for (const child of Object.values(node)) {
        if (Array.isArray(child)) child.forEach(visit);
        else if (child?.type) visit(child);
      }
    }
    visit(tree);
  }
  function select(predicate, project = node => node) {
    const match = nodes.find(({ node }) => predicate(node));
    if (!match) throw new Error('Prototype script owner is missing: ' + predicate);
    const selected = project(match.node);
    return match.source.slice(selected.start, selected.end);
  }
  const propertyValue = (object, key) => object.properties.find(property =>
    (property.key?.name ?? property.key?.value) === key)?.value?.value;
  return {
    select,
    hasSkillCoordinate: (path, sha256) => nodes.some(({ node }) => node.type === 'ObjectExpression' &&
      propertyValue(node, 'path') === path && propertyValue(node, 'sha256') === sha256),
    definition: name => select(node => node.type === 'FunctionDeclaration' && node.id.name === name),
    initializer: name => select(node => node.type === 'VariableDeclarator' && node.id.name === name, node => node.init),
  };
}
