# Browser lifecycle probes

These probes turn browser behavior into reviewable questions. Each probe names the trigger, expected observation, controlled fault, and receipt fields that let another team repeat the check.

## VF-B1 · Native authority and focus continuity

**Question:** Which browser primitive already owns selection, disclosure, dialog modality, form submission, focus order, URL state, or history restoration?

**Exercise:** Use the native element first. Record the invoking control, open or update the primitive, close or restore it, and inspect the active element and serialized state.

**Expected observation:** Keyboard order follows document order. Dialog focus returns to its invoker. History restores the selection represented by the recorded entry.

**Controlled fault:** Move focus to an unrelated control or restore a different selection.

**Receipt:** browser and operating system; primitive; initial focus and state; trigger; expected and observed destination; recovery owner.

## VF-B2 · Cascade, containment, and alternate media

**Question:** Which cascade layer, containing block, stacking context, scroll container, or container query owns the final layout?

**Exercise:** Inspect the winning declaration and containing block at the smallest supported width and at enlarged text. Repeat in print, forced-colors, reduced-motion, and supported color schemes.

**Expected observation:** Content remains readable at 320 pixels and 200% root text. Horizontal scrolling belongs to the labelled table region. Print expands reading content. Forced colors preserve boundaries and focus.

**Controlled fault:** Move overflow ownership to the page root or place a component declaration in an earlier cascade layer.

**Receipt:** viewport; text scale; media features; winning rule and layer; containing block; scroll owner; visible consequence.

## VF-B3 · SVG document identity and paint order

**Question:** Which SVG instance owns each `id`, direct reference, accessible label, transform, clip path, and painted layer?

**Exercise:** Insert two copies in one document. Enumerate IDs and references, resolve each `url(#…)`, compare keyboard and document order, and inspect label relationships.

**Expected observation:** Every ID is unique. Each gradient and clip-path reference resolves inside its own instance. Accessible labels resolve locally. Coordinate transforms, clip ownership, authored paint order, and keyboard order remain intentional.

**Controlled fault:** Reuse the same identifier prefix across both instances.

**Receipt:** SVG source version; instance keys; viewBox; transform; ID/reference inventory; accessible names; clip owner; paint and keyboard order; collision result.

## VF-B4 · JavaScript replacement, cancellation, and release

**Question:** Which identity and revision may update the accepted view, and which owner releases listeners, subscriptions, requests, object URLs, timers, observers, and workers?

**Exercise:** Start a request for entity A, replace it with entity B, resolve B, then deliver A late. Replay setup and cleanup. Trigger final teardown twice.

**Expected observation:** Entity B remains accepted. The A request carries an aborted signal. Settled request records leave the owner map. Replay leaves one active live listener and subscription. Repeated final teardown leaves every resource count at zero.

**Controlled fault:** Admit A after B or retain the first setup resources.

**Receipt:** identity, revision, and owner generation; cancellation signal; owner/release pair; live adapter and ledger counts before and after; late-result decision; accepted state; re-entry path.

## VF-B5 · CSP and sandbox enforcement

**Question:** Which document policy and iframe capability set govern standalone and embedded execution?

**Exercise:** Load the specimen through its standalone route and inside its opaque-origin sandbox. Exercise one bounded inline-script probe, inspect parent access to the embedded document, and record the carrier policy separately from the document policy.

**Expected observation:** The declared document policy blocks the inline probe. The sandbox gives the embedded document an opaque origin. Static reading remains available in both contexts.

**Controlled fault:** Add a capability token or policy source that grants the tested execution path.

**Receipt:** standalone route; embedded route; sandbox tokens; document CSP; response-header CSP; attempted capability; browser and engine version; observed result.

## Related executable reference

The [browser and framework lifecycle lab](../../labs/lifecycle-lab/) exercises these four probe families with native HTML, CSS, SVG, and ECMAScript modules. The lab’s script-independent reading preserves the questions when enhancement is unavailable.
