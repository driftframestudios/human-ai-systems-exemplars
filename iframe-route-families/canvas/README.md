# Canvas iframe route family

`public-iframe-route-manifest-v1.json` declares the 16 non-Core documents that
Context Canvas visitor surfaces embed beneath
`https://iframes.vik.guru/v1/canvas/`. The `canvas` token describes the
receiving delivery family. Each listed HTML file remains semantic authority
for its own prototype or instrument.

The manifest keeps these concerns explicit:

- one exact public alias and reader job per source document;
- generated attribution and visitor-boundary decoration where the source does
  not already carry the governed stack;
- declared rewrites for onward primary-site navigation;
- generated separate-tab behavior for eligible iframe exits, including links
  created at runtime, while source links remain ordinary;
- exact route-local files for SVG, JSON, or other non-inline dependencies;
- the smallest observed sandbox and Permissions Policy capability set; and
- one activation standing that remains distinct from upload and live delivery.

Build Core and Canvas together from the repository root:

```sh
npm run build:iframe-routes
```

The Canvas upload root is
`.iframe-route-build/iframes.vik.guru/v1/canvas/`. The sibling Core package and
the deterministic aggregate receipt are generated in the same staged `v1`
replacement. Use `npm run check:iframe-routes` to verify a temporary clean
generation without retaining output, and `npm run test:iframe-routes` for the
focused package contracts. Use `npm run test:iframe-visual-media-browser` for
the complete Core-and-Canvas reduced-motion, print, forced-colors, computed
SVG, and zoomed fixed/sticky-focus reading.

The generated `index.html` files are projections. Preserve the repository
sources, retain ordinary adjacent full-view links on the primary visitor
surface, and regenerate the family when a source or route contract changes.
Generated iframe exits carry `_blank` with `noopener noreferrer`; fragments,
downloads, and page controls keep their local behavior. Only routes with an
observed exit receive the matching popup sandbox capabilities.

The About Studio chapter route is generated from the complete Studio source
and its presentation adapter. Run `npm run build:about-studio-chapters` after
changing either owner; the Canvas packager verifies exact derivation before
receiving it. The original Studio route continues to serve the complete view.
