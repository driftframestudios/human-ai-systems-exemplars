#!/usr/bin/env bash
# Keep each npm suite and its browser/server lifetime on one runner.
set -euo pipefail
case "${1:?}" in
  reading|production|selected) ;;
  *) echo "Choose reading, production, or selected." >&2; exit 2 ;;
esac
if [[ "$1" != production ]]; then
  npm run test:about-media-browser
  npm run test:debrief-catalog-preview-browser
  npm run test:debrief-reading-layout-browser
  npm run test:debrief-reference-figures-browser
  npm run test:debrief-caption-colors-browser
  npm run test:ai-systems-reading-layout-browser
  npm run test:site-navigation-browser
  npm run test:debrief-link-cues-browser
  npm run test:context-canvas-image-delivery-browser
  npm run test:who-to-believe-system-graph-browser
fi
if [[ "$1" != reading ]]; then
  npm run test:prod-css-projection-browser
  npm run test:prototype-control-labels
  npm run test:core-browser
  npm run test:canvas-iframe-routes
  npm run test:iframe-ancestry-browser
  npm run test:narrative-browser
  npm run test:prototype-exchanges
fi
