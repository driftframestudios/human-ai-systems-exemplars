import './node-runtime-admission.mjs';
import { parse } from 'acorn';
import { parsers } from 'prettier/plugins/html';

function decodeJsonLiteral(node, depth = 0) {
  if (depth > 128) throw new Error('Prototype state exceeds the supported literal depth.');
  if (node.type === 'Literal') {
    if (node.regex || node.bigint !== undefined ||
      !['string', 'number', 'boolean', 'object'].includes(typeof node.value) ||
      (typeof node.value === 'number' && !Number.isFinite(node.value))) {
      throw new Error('Prototype state requires a JSON-compatible literal.');
    }
    return node.value;
  }
  if (node.type === 'UnaryExpression' && node.operator === '-' &&
    node.argument.type === 'Literal' && typeof node.argument.value === 'number' &&
    Number.isFinite(node.argument.value)) {
    return -node.argument.value;
  }
  if (node.type === 'ArrayExpression') {
    if (node.elements.some(element => element === null || element.type === 'SpreadElement')) {
      throw new Error('Prototype state arrays require explicit literal entries.');
    }
    return node.elements.map(element => decodeJsonLiteral(element, depth + 1));
  }
  if (node.type === 'ObjectExpression') {
    const value = {};
    for (const property of node.properties) {
      if (property.type !== 'Property' || property.kind !== 'init' || property.method ||
        property.computed || property.shorthand) {
        throw new Error('Prototype state objects require explicit literal properties.');
      }
      const key = property.key.type === 'Identifier'
        ? property.key.name
        : property.key.type === 'Literal' && ['string', 'number'].includes(typeof property.key.value)
          ? String(property.key.value)
          : null;
      if (key === null) throw new Error('Prototype state property names require literal keys.');
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        throw new Error(`Prototype state carries the duplicate property ${JSON.stringify(key)}.`);
      }
      Object.defineProperty(value, key, {
        configurable: true,
        enumerable: true,
        value: decodeJsonLiteral(property.value, depth + 1),
        writable: true,
      });
    }
    return value;
  }
  throw new Error(`Prototype state uses the executable ${node.type} expression.`);
}

// Select executable source by syntax so production checks and test harnesses
// inspect the same owner after an IDE formats it or a carrier compacts it.
export function readPrototypeScript(html) {
  const nodes = [];
  const document = parsers.html.parse(html, {});
  function collect(node, inert = false) {
    const held = inert || node.name === 'template';
    if (node.name === 'script' && !held && node.endSourceSpan) {
      const type = node.attrs.find(attribute => attribute.name === 'type')?.value?.toLowerCase();
      if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) return;
      const source = html.slice(node.startSourceSpan.end.offset, node.endSourceSpan.start.offset);
      const tree = parse(source, { ecmaVersion: 'latest', sourceType: type === 'module' ? 'module' : 'script' });
      visit(tree, source);
      return;
    }
    node.children?.forEach(child => collect(child, held));
  }
  function visit(node, source) {
    if (!node?.type) return;
    nodes.push({ node, source });
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(value => visit(value, source));
      else if (child?.type) visit(child, source);
    }
  }
  collect(document);
  function matches(predicate) {
    return nodes.filter(({ node }) => predicate(node));
  }
  function select(predicate, project = node => node) {
    const match = matches(predicate)[0];
    if (!match) throw new Error('Prototype script owner is missing: ' + predicate);
    const selected = project(match.node);
    return match.source.slice(selected.start, selected.end);
  }
  function selectOne(predicate, label) {
    const selected = matches(predicate);
    if (selected.length !== 1) {
      throw new Error(`Prototype script requires one ${label}; received ${selected.length}.`);
    }
    return selected[0].node;
  }
  const propertyValue = (object, key) => object.properties.find(property =>
    (property.key?.name ?? property.key?.value) === key)?.value?.value;
  return {
    select,
    hasSkillCoordinate: (path, sha256) => nodes.some(({ node }) => node.type === 'ObjectExpression' &&
      propertyValue(node, 'path') === path && propertyValue(node, 'sha256') === sha256),
    definition: name => select(node => node.type === 'FunctionDeclaration' && node.id.name === name),
    initializer: name => select(node => node.type === 'VariableDeclarator' && node.id.name === name, node => node.init),
    initializerValue: name => decodeJsonLiteral(selectOne(
      node => node.type === 'VariableDeclarator' && node.id.name === name,
      `${name} initializer`,
    ).init),
  };
}
