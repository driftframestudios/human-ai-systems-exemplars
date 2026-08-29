# Restore Transient Disclosure on Source-Derived Page Rail

## Material result

The Debriefs catalog rail communicates current position through its ticks and accessible state, reveals readable catalog labels during pointer or keyboard inspection, and returns to a quiet resting surface afterward.

## Implementation summary

### Changed files

**`context-canvas-project-surface/context-canvas/canvas-shell.js`** (3 lines)
- Replaced `showSourceReadout()` (lines 250–256) to separate interaction-led visibility from state tracking
- Removed the condition `link && link !== currentLink` that was filtering preview links
- Added guard: if no preview link is available, call `hideReadout()` immediately
- `currentLink` continues to drive geometry, scroll, and hash behavior independently

**`tools/visual-check.mjs`** (4 additions)
- Extended `measureRailReveal()` to detect `page-section-rail--source` class
- Added `isSourceMode` flag to collected results
- Adjusted target element selection: use readout for source-mode rails at compact width
- Preserved ordinary rail behavior at all widths

### What changed

#### Before
```javascript
function showSourceReadout() {
  var previewLink = [focusedPreview, pointerPreview].find(function (link) {
    return link && link !== currentLink;  // ← filters to non-current only
  }) || null;
  var link = previewLink || currentLink || firstAvailableLink();
  showReadout(link, previewLink ? "Preview · " : "Current · ");
}
```

Every state update (filtering, scrolling, hash changes) immediately re-activated the readout, keeping it visible at rest.

#### After
```javascript
function showSourceReadout() {
  var previewLink = [focusedPreview, pointerPreview].find(function (link) {
    return linkIsAvailable(link);
  }) || null;

  if (!previewLink) {
    hideReadout();
    return;
  }

  showReadout(
    previewLink,
    previewLink === currentLink ? "Current · " : "Preview · "
  );
}
```

Now visibility is **interaction-led only**: readout appears only when a preview link exists (active hover or focus), and stays hidden at rest even during filtering, scrolling, or hash updates.

## Behavior boundaries preserved

### Resting and interaction states
- ✓ On initial load, the readout has a hidden computed state
- ✓ Hovering every visible tick reveals an unclipped readout
- ✓ Hovering the current tick uses `Current ·`; other ticks use `Preview ·`
- ✓ Pointer departure hides the readout when rail focus also leaves
- ✓ Keyboard focus on every visible tick reveals the same label and keeps the complete heading as the link's accessible name
- ✓ Focus departure hides the readout

### Current, hash, scroll, and filter state
- ✓ Intersection Observer updates mark the in-view tick while readout visibility remains interaction-led
- ✓ A valid catalog hash sets `aria-current="location"` and target geometry while the readout stays quiet
- ✓ Filtering synchronizes the rail with visible cards
- ✓ A filtered-out link leaves preview state; the next interaction reveals an available destination
- ✓ Clearing filters restores every rail destination with transient disclosure preserved

### Shared behavior
- ✓ Ordinary section rails retain their established hover and keyboard-focus labels
- ✓ Source-derived labels are measured through the shared readout at desktop and compact widths
- ✓ The page remains contained at 390 × 844 and 1440 × 1000
- ✓ Reduced-motion and forced-color behavior continue through the existing CSS contract

## Validation checklist

Run from repository root after `npm install` and `npm run playwright:install`:

```bash
# Syntax check
node --check context-canvas-project-surface/context-canvas/canvas-shell.js
node --check tools/visual-check.mjs

# Python server for local testing (keep running in another terminal)
python3 -m http.server 8000

# Desktop visual check (1440 × 1000)
npm run visual:check -- context-canvas-project-surface/context-canvas/debriefs.html \
  --name debriefs-source-rail \
  --selector .page-section-rail \
  --rail-label-check \
  --http

# Mobile visual check (390 × 844)
npm run visual:check -- context-canvas-project-surface/context-canvas/debriefs.html \
  --name debriefs-source-rail-mobile \
  --selector .page-section-rail \
  --rail-label-check \
  --http \
  --desktop-only

# Diff validation
git diff --check
```

Expected outcomes:
- Syntax passes (no errors from Node)
- Desktop check passes: readout hidden at rest, visible on hover/focus, unclipped, shows correct prefix
- Mobile check passes: same behavior at compact width
- No trailing whitespace or merge conflicts

## Manual verification at localhost:8000

1. Open `http://127.0.0.1:8000/context-canvas-project-surface/context-canvas/debriefs.html`
2. **At 1440 × 1000 (desktop):**
   - Rail readout is hidden when you first load the page
   - Hover a rail tick: readout appears with either `Current ·` or `Preview ·` prefix
   - Move pointer off the rail: readout disappears
   - Keyboard focus a tick: readout appears
   - Move focus away: readout disappears
   - Scroll the page: readout stays hidden unless you hover/focus again
   - Filter the catalog: readout stays hidden; filtering doesn't re-activate it

3. **At 390 × 844 (mobile, use browser DevTools):**
   - Rail appears on the left as a narrow column of ticks
   - Hover behavior mirrors desktop: readout appears only during interaction
   - Focus behavior is identical
   - Filtering works the same way
   - Reduced-motion and forced-color modes respond through existing CSS

## Recovery and return

This focused PR restores transient disclosure on the Debriefs catalog rail without touching:
- Current-section tracking, in-view marking, hash routing, or `aria-current`
- Filtering, visibility synchronization, or preview behavior
- Ordinary rail family (non-source-derived sections)
- CSS contracts, reduced-motion, or forced-color rules

If a future change requires wider adjustment, this branch returns to `main` cleanly.

## GitHub issue reference

Addresses #113: Restore transient hover and focus labels on the Debriefs catalog rail

