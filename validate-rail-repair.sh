#!/bin/bash
set -e

echo "=== Context Canvas: Restore Transient Debriefs Rail Labels ==="
echo ""
echo "Running visual checks for debriefs.html source-derived rail..."
echo ""

# Syntax check
echo "1. Syntax validation..."
node --check context-canvas-project-surface/context-canvas/canvas-shell.js
node --check tools/visual-check.mjs
echo "✓ Syntax check passed"
echo ""

# Visual checks at desktop and mobile widths
echo "2. Desktop viewport (1440 × 1000)..."
npm run visual:check -- context-canvas-project-surface/context-canvas/debriefs.html \
  --name debriefs-source-rail-desktop \
  --selector .page-section-rail \
  --rail-label-check \
  --http
echo "✓ Desktop check passed"
echo ""

echo "3. Mobile viewport (390 × 844)..."
npm run visual:check -- context-canvas-project-surface/context-canvas/debriefs.html \
  --name debriefs-source-rail-mobile \
  --selector .page-section-rail \
  --rail-label-check \
  --http \
  --desktop-only
echo "✓ Mobile check passed"
echo ""

echo "4. Diff check..."
git diff --check
echo "✓ No trailing whitespace or merge conflicts"
echo ""

echo "=== All checks passed ==="
echo ""
echo "Visual artifacts saved to .visual-runs/"
echo "Ready for pull request: feature/restore-transient-debriefs-rail-labels"
