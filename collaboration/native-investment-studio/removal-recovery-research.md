# Removal and recovery in Studio racks

**Decision — 7 November 2026:** establish a recognizable, scoped Remove control
with nearby recovery in Coordination, then carry the reviewed pattern to other
chapters after human approval. This is a planning recommendation for
[#773](https://github.com/driftframestudios/human-ai-systems-exemplars/issues/773),
not a change to the current interface. The [consolidation plan](../../planning/context-canvas/studio-coordination-rack-consolidation.md)
owns the receiving sequence; the [README](README.md) describes current behavior.

## Question and evidence boundary

Which removal pattern lets a busy visitor explore the showcase confidently,
understand the affected object and recover within the rack?

The spike compares established design-system guidance with current source.
External guidance supplies practiced interaction principles and accessibility
conditions. The rose skin, local recovery strip and Coordination-first rollout
are local design proposals. A focused rendered example and human review will
establish their fit; these sources do not constitute a usability study of the
Studio. Stop research when further examples cease to change the next decision.

## Options and synthesis

| Option | Useful portion | Tradeoff in this showcase | Recommendation |
| --- | --- | --- | --- |
| Confirm every removal | Makes an unexpected consequence explicit | Interrupts ordinary experimentation, including readily recoverable actions | Reserve a compact consequence choice for meaningful linked effects or actual irreversibility |
| Immediate removal and timed toast Undo | Gives quick feedback near the action | A fleeting control can be missed; a stale label can target the wrong history change | Borrow the short result message, retain a durable recovery route |
| Immediate removal and rack-local Undo | Keeps the result and recovery beside the work | Needs precise accepted-change ownership and useful focus recovery | Preferred for clearly scoped reversible record removal |
| Change a draft, then Apply/Cancel | Groups related edits and preserves a clear proposal boundary | Adds a step when the operation is simply removing one accepted record | Preserve for existing membership, relationship and cadence/stage/handoff drafts |
| Archive, pause or retire | Keeps an object available when temporary exclusion is the intended operation | A different lifecycle can obscure a requested deletion and add controls | Offer only when that lifecycle is the actual visitor intent |

Use the best-fitting parts together: explicit object/scope, ordinary direct
recovery, compact consequence review where needed, and existing draft ownership.
One generic removal skin can support these semantics without making every
operation use the same acceptance flow.

## Evidence that changes the design

| Source and evidence class | Local consequence | Transfer boundary |
| --- | --- | --- |
| [Apple Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) — official platform guidance distinguishes common undoable actions from uncommon irreversible ones. | Routine recoverable removal can proceed with Undo; a consequential irreversible operation earns confirmation. | Native-platform alert conventions inform the decision, not the web component's exact geometry. |
| [Apple Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo) — official guidance emphasizes predictable labels and visible results. | Name the removal being undone and make its restored row/pad visible. | The Studio uses its existing bounded history; this proposal does not promise unlimited undo. |
| [GOV.UK Button](https://design-system.service.gov.uk/components/button/) — official service-design guidance reserves warning buttons for serious consequences and requires clear action wording beyond color. | Use quiet rose removal for ordinary actions; reserve stronger emphasis for a consequence confirmation. | The rose palette is Studio art direction, not a tested GOV.UK prescription. |
| [Carbon Remove](https://carbondesignsystem.com/community/patterns/remove-pattern/) — maintained community pattern distinguishes impact and reversibility. | Separate removing a relationship from deleting the whole record; use confirmation according to consequence. | This is practiced design guidance, not experimental evidence for the Studio's visitors. |
| [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) — informative explanation of WCAG 2.2 SC 4.1.3. | Expose a short removal/restoration result through a polite status region; keep Undo a separate named button and preserve meaningful focus. | This covers status semantics; keyboard focus, layout and comprehension need their own observation. |

## What the existing source establishes

The accepted plan has one snapshot history in [state.mjs](state.mjs), configured
for 20 entries in [config.mjs](config.mjs). [investment-controller.mjs](investment-controller.mjs)
currently provides visible Undo/Redo, parking edits through the coordinator
before traversing history. Undo restores accepted data; saved drafts keep their
separate review/discard path in [editing.mjs](editing.mjs).
`readHistory()` exposes undo/redo counts and the limit, while its entries contain
snapshots rather than action descriptions. Exact action labels therefore need
owned metadata; a control should use a truthful generic latest-change label
until that metadata is available.

[commands.mjs](commands.mjs) checks record references before removal. Removing a
session prunes its cadence placements, while other live references can block
record removal. Current record-removal editors name the object, present
consequences, focus Cancel and accept through their existing owner. The shared
`native-control--remove` role already supplies a rose treatment. Its generic
name is suitable for consolidation; shared styling can move to the instrument
owner while chapter event/state ownership remains explicit.

| Existing operation | Meaning to preserve |
| --- | --- |
| Deselect a participant or team member | Change that membership draft; retain the person's identity and independently owned relationships |
| Clear occurrence placement | Keep the work and occurrence, return its placement to Choose a period |
| Reduce Working sessions | Reduce repetition and prune placements beyond the new count; arbitrary occurrence deletion needs its own operation |
| Remove session | Remove the whole work record and all its occurrences, subject to reference integrity |
| Remove arrangement grouping | Preserve teams, work and connections while detaching the grouping identity |
| Remove stage, handoff, decision or delay | Change the cadence/stage/handoff draft through Apply/Cancel and its existing relationship checks |

## Recommended control and recovery

Use `native-control--remove` as an ordinary-height secondary action with a
low-emphasis rose outline or tint, readable text and explicit object/scope.
Place it in the selected object's action strip, separated from Add/Apply and
the main selectable pad. A small removal glyph may support the label; circular
minus buttons continue to mean numeric decrement. Cancel keeps its shadow-free
ghost treatment. Close hides the receiver. A plus begins creation.

For a clearly scoped accepted-record removal supported by current commands,
accept once and replace the removed selection with a concise rack-local result,
such as **Session removed**, plus a named **Undo removal** action. Keep this
recovery strip while that removal remains the latest accepted operation. Its
message has no timer as the sole recovery route; global history remains usable
within its existing bounds.

Bind local Undo to the removal's exact accepted history identity. If another
change is accepted, retire the removal-specific shortcut or replace it with an
accurately named history route. A stale button must never undo the newer change
under the old removal label. Reuse the global history and edit-parking owners;
a second local history stack would create conflicting recovery meanings.

### Global amp recovery

Add a compact **Undo (n)** native amp action when accepted history becomes
available. The number means recoverable accepted changes, rather than unfinished
Saved edits or individual dial movements before Apply. Activation undoes the
latest accepted change directly. A short visible/focus-accessible target cue
identifies the operation, using owned action metadata or **Latest plan change**
when only snapshot history is available. The cue stays concise; a history
ledger is unnecessary.

Keep the control in a stable amp position after its first appearance; at zero,
show its unavailable state with an accurate name. Redo can appear in the same
compact group when a recoverable undone change exists. Both amp and Investment
controls call one shared history action, park unfinished drafts consistently,
and refresh the same counts. A local removal shortcut remains specific to its
removal, while global Undo always describes the current latest change.

After removal, move keyboard focus to a surviving neighboring rack control or
its Add entry. Undo makes the restored record visible and returns focus to its
row/pad in the preserved scope. Use the existing motion preference and keyed
movement; stationary operation remains complete. Routine status updates leave
focus with the task controls rather than pulling it into a notification.

### Consequences that change the recommendation

A session may occupy several periods or support several relationships. Its
label and selected-object action strip must make whole-session removal clear.
If a short label cannot make the affected scope evident, reveal a compact
adjacent consequence choice before acceptance. For currently referenced records,
keep the plan intact and offer the relevant local receiver. A later one-step
unlink/reassign/retire route needs an explicit atomic transaction; bypassing the
current reference checks in the view would create invalid relationships.

Pending drafts retain the coordinator's recovery path. Draft participation and
cadence/stage/handoff edits continue through Apply/Cancel; accepted-plan Undo
becomes available after acceptance. Direct Team arrangement selection keeps
its separate immediate-acceptance route in #766. An irreversible operation would
use an explicit final confirmation with stronger warning emphasis and a ghost
Cancel. The showcase has no need to introduce irreversible operations for this
pattern demonstration.

## Narrow delivery and approval

First consolidate the existing rose skin and scoped labels under #765. Then
#773 prototypes one recoverable Coordination session-removal path, including
its nearby result and Undo. #757/#768 receive the action strip in adjacent
editors; #770/#758 align creation recovery; #772 retains editorial alternatives.
Human review of that Coordination example releases adaptations to other
chapters through the same shared role and their current operation owners.

Fitting proof: one removed session restores its placements and accepted amount
on Undo; a later accepted edit prevents stale removal-Undo; one referenced
record stays intact with an actionable explanation; keyboard focus stays in
scope. Compare ordinary phone/laptop and reduced-motion presentation. The
existing history tests retain model authority. Broader arithmetic suites and
performance refinement remain separate.
