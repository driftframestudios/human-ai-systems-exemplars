import '../../tools/node-runtime-admission.mjs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'html-minifier';

// Source contracts inspect content and attributes, independently of Prettier's
// line wrapping and optional void-element slashes. Byte-identity checks keep
// reading raw files; this helper does not rewrite visitor artifacts.
export async function readSourceContract(path, encoding) {
  const source = await readFile(path, encoding);
  const filename = path instanceof URL ? fileURLToPath(path) : path;
  if (typeof source !== 'string' || extname(filename) !== '.html') return source;
  return normalizeHtmlSourceContract(source);
}

export function normalizeHtmlSourceContract(source) {
  return minify(source, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
  });
}
