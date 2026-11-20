import '../../tools/node-runtime-admission.mjs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'html-minifier';
import { minify as printJavaScript } from 'terser';

// Source contracts inspect content and attributes, independently of Prettier's
// line wrapping and optional void-element slashes. Byte-identity checks keep
// reading raw files; this helper does not rewrite visitor artifacts.
export async function readSourceContract(path, encoding) {
  const source = await readFile(path, encoding);
  const filename = path instanceof URL ? fileURLToPath(path) : path;
  if (typeof source !== 'string') return source;
  if (extname(filename) === '.js') {
    const result = await printJavaScript(source, {
      compress: false, mangle: false,
      format: { beautify: true, comments: 'all', quote_style: 3, keep_quoted_props: true },
    });
    return result.code;
  }
  if (extname(filename) !== '.html') return source;
  return normalizeHtmlSourceContract(source);
}

export function normalizeHtmlSourceContract(source) {
  return minify(source, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
  });
}
