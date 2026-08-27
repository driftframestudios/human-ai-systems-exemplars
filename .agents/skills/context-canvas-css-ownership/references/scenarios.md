# Context Canvas CSS ownership scenarios

This reference loads only for the named Debriefs branches.

## Rule: The three-movement Debrief uses neutral semantic ownership

Content identity remains in route names, page titles, metadata, reference material, visible prose, and source records. The CSS tranche uses neutral structural language.

### Scenario: Source-specific page scope migrates

Given the three-movement Debrief page carries a source-specific body class, hero class, custom properties, and CSS comment<br>
And the same composition belongs to the Debrief family<br>
When the Debrief CSS tranche establishes ownership<br>
Then the body uses a neutral scope such as `.three-movement-debrief-page`<br>
And the hero uses the page scope with shared `.debrief-hero`<br>
And matching values use existing Debrief tokens<br>
And the previous source-specific word is absent from CSS filenames, selectors, custom properties, and comments<br>
And no compatibility alias remains

### Scenario: Mixed rules separate by reusable role

Given the current region includes reading-route, source-basis, working-posture, contract-transition, and route-composition rules<br>
When ownership is extracted<br>
Then reusable rules move to component sources<br>
And three-movement composition moves to a neutral Debrief route or contract source<br>
And each shared selector rename changes all known consumers in one coherent component move

## Rule: The Reading types badges retain equal natural height

The current defect comes from a global list-item end margin combined with flex cross-axis stretch. The known-answer repair belongs to the Debrief card component.

### Scenario: Badge-height probe accompanies Debriefs extraction

Given `debriefs.html` uses `ul.debrief-card__types.clean-list[aria-label="Reading types"]` as a wrapping flex container<br>
And the global list-item rule adds an end margin except on the last item<br>
When the Debrief card component receives its CSS owner<br>
Then `.debrief-card__types > li` receives a component-owned `margin-block-end: 0` rule<br>
And the corrected state remains in source after the comparison<br>
And local initial-state images of `debriefs.html` at the three standing viewports show uniform natural badge height<br>
And the collection wraps between badges as available width changes while current labels remain on one line
