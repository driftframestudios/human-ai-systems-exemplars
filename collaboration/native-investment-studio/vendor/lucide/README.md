# Native Studio icon source

The native chapter controls use a finite Lucide subset. Local geometry is
owned by `../../icons.mjs`; its factory creates decorative SVGs while visible
control labels supply their meaning. The primary artifact must deliver that
module, including its retained ISC notice. This directory retains the complete
upstream licence and pin for subsequent source review.

- Upstream: [Lucide](https://github.com/lucide-icons/lucide).
- Release: [1.63.0](https://github.com/lucide-icons/lucide/releases/tag/1.63.0).
- Commit: `2ca268e74888d3506b3319fb8f94aaaaf70ceca9`.
- Licence: [LICENCE.txt](LICENCE.txt), copied from upstream `LICENSE` at the pin.

| Local job | Upstream file |
| --- | --- |
| Coordination chapter | [icons/network.svg](https://github.com/lucide-icons/lucide/blob/2ca268e74888d3506b3319fb8f94aaaaf70ceca9/icons/network.svg) |
| People chapter | [icons/users.svg](https://github.com/lucide-icons/lucide/blob/2ca268e74888d3506b3319fb8f94aaaaf70ceca9/icons/users.svg) |

Both selected files use the ISC notice. The complete upstream licence also
records Feather-derived MIT notices for other icons. When adding geometry,
inspect that inventory and carry every applicable notice into the delivered
module or asset. Preserve the SVG viewBox, shape coordinates, stroke geometry,
and fixed currentColor treatment; the receiving CSS owns size and colour.

The module performs no network request and installs no listeners. It creates
one SVG with a bounded number of shapes per call. A chapter shell should add
its icons once during construction and retain them across selection and edits.
The package's existing primary-manifest and module-closure owners carry
runtime delivery; this source receipt introduces no new packaging system.
