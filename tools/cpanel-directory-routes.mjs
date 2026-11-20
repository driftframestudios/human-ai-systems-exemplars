import './node-runtime-admission.mjs';
import { posix } from 'node:path';

// The manifest owns file destinations. Both the compatibility document and
// its directory index can use the same root-relative asset and page links.
export function createDirectoryRoutes(manifest, baseUrl) {
  const base = new URL(baseUrl);
  const destinations = new Map();
  const entries = new Map();
  const occupied = new Set(manifest.files.map(file => file.projected_path.toLowerCase()));
  for (const file of manifest.files) {
    const path = file.projected_path;
    let publicPath = '/' + path;
    if (file.media_type === 'text/html' && path !== '404.html') {
      if (posix.basename(path) === 'index.html') publicPath = publicPath.slice(0, -10);
      else {
        publicPath = publicPath.slice(0, -5) + '/';
        const index = publicPath.slice(1) + 'index.html';
        if (occupied.has(index.toLowerCase()) || occupied.has(publicPath.slice(1,-1).toLowerCase())) {
          throw new Error('Directory index collides with a manifest destination: ' + index);
        }
        occupied.add(index.toLowerCase());
        entries.set(path, index);
      }
    }
    destinations.set('/' + path, publicPath);
  }
  function resolve(value, consumer, knownOnly = false) {
    if (!value || /^[#?]|^\/\/|^[a-z][a-z\d+.-]*:/iu.test(value) && !value.startsWith(base.href)) return value;
    const url = new URL(value, new URL(consumer, base));
    const destination = destinations.get(url.pathname);
    if (knownOnly && destination === undefined) return value;
    return (value.startsWith(base.href) ? base.origin : '') +
      (destination ?? url.pathname) + url.search + url.hash;
  }
  return { entries, resolve };
}
