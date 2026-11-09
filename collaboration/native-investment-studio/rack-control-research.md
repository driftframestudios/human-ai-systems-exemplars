# Direct controls and local rack navigation

## Receiving decision

A visitor should recognize where a rack control will act, see the result beside
that control, and return to the same working area. The cassette artwork, period
board, sequencer and selected pads provide the hierarchy. The current dev
synthesis keeps creation inside its lane, distinguishes accepted relationship
changes from proposals, and gives every editor a visible owner and selected
record. Abilities also lets a visitor rename a shared person or team without
leaving the support task. Change and Quality use compact attached receivers for
the detail behind their primary instruments.

Read alongside [usable controls](usability-research.md) and
[removal and recovery](removal-recovery-research.md). This synthesis preserves
native semantics, stable membership positions and shared history. It supersedes
#820/#821's automatic editor opening after an addition and Shared sessions'
former routing into the full session form above it. `main` remains the approved
comparison anchor until a human authorizes promotion.

## Evidence and transfer

| Source and class | What it establishes | Studio consequence and limit |
| --- | --- | --- |
| [WAI Breadcrumb Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/), accessibility practice | A hierarchy identifies a current location and its parents. | Show the owning rack before the selected record. In-page return controls remain native buttons; their action changes local scope rather than following a fabricated page URL. The pattern supplies hierarchy semantics, while the Studio owns this local adaptation. |
| [GOV.UK Back link](https://design-system.service.gov.uk/components/back-link/), official design-system guidance | A return should restore prior state; an explicit destination helps when the route is complex. | An owner control returns to the originating board, phase or shared-session view with focus restored. One owner path supplies the route; Close offers the same local dismissal. The page-level placement prescription belongs to GOV.UK journeys, not an embedded rack. |
| [WAI Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), accessibility practice | A small set of related views can share one surface with selected state, associated panels and keyboard navigation. | Shared sessions uses People and Handoffs views. Both operate on the same accepted work; selection changes what the matrix relates. Immediate local rendering supports arrow-key selection. |
| [WAI Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/), accessibility practice | Buttons carry an action, accessible name, keyboard activation and truthful state. | Native creation targets name the added object. Track keys identify the selected/open record. Checkbox cells change participation or support links; empty cells in that matrix retain the same relationship meaning. |
| [GOV.UK Button](https://design-system.service.gov.uk/components/button/), official design-system guidance | Clear action labels and limited primary emphasis make the next operation easier to identify. | Raised Apply accepts a prepared form. Direct team and membership edits show Saved. Quiet rose Remove and amp Undo keep recovery visible. This guidance informs hierarchy, not the Studio palette. |
| [Carbon Button guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines), official product guidance | Repeated local tasks can use lower-emphasis controls. | Local selection and movement keep restrained borders and shadows; Cancel stays ghost. The design system's exact page quotas do not transfer to a multi-panel rack. |
| [Atlassian inline edit](https://atlassian.design/patterns/inline-edit/), official design-system guidance | Reading and editing can occupy the same page, with aligned read and edit views. | A name beside an Abilities identity gets a small Rename action and one local field. The Studio uses native controls and its canonical record owner; the component implementation stays with Atlassian. |
| [WAI Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), accessibility practice | Enter/Space activation and expanded state identify the visibility of related content. | Local name and detail controls report their actual receiver state. A native input provides text editing; visible Save and Cancel define acceptance and recovery. |
| Human observations of the running Studio and preserved workbench, local evidence | Detached editors, repeated creation controls and unclear saving made scope difficult to follow. Compact modules and direct pads were preferred. | Preserve the art, duration module and separate delivery/shared-session working areas. This establishes a collaboration direction; focused browser checks establish the resulting behavior, rather than population-level usability. |

## Compared routes

A full shared-session inspector would reuse every field but repeat the Plan
overview editor. An Events list would provide another chronological reading
already supplied by the period board. The selected route gives Shared sessions
a smaller distinct job: relate people and handoffs to the work. It adapts the
workbench's People × sessions matrix while retaining the Showcase's accepted
commands, draft coordinator and amp recovery.

| Visitor goal | Local treatment | Acceptance and return |
| --- | --- | --- |
| Load or inspect a plan | Preserved cassette and selected track key | The selected period stays visible; Close returns to its initiating control. |
| Add in a known lane | Named plus target inside the lane; hover/focus cue and visible touch affordance | A useful accepted record appears there with editing closed. Amp Undo recovers the addition. |
| Choose people for a session | Native checkbox pads in Shared sessions · People | Each change accepts directly. The current contract requires one participant; the final selected pad explains that another person must be added before it can be cleared. |
| Adjust a shared session's host or participant order | Compact selected-row module beside the matrix | Changes accept directly and show Saved. Closing restores the row key. Duration and cadence remain in Plan overview. |
| Connect shared work to a handoff | Checkbox pads in Shared sessions · Handoffs | Each support-link change accepts directly; amp Undo reverses it. |
| Edit a handoff | Select its matrix heading or delivery card | The canonical handoff form appears inside the originating module. Apply accepts the draft; owner return and Close preserve its entries and restore the origin. |
| Edit a team | Delivery lane's team key | Name, membership and order update directly with visible saving state. The delivery board and Shared sessions keep separate visibility roles. |
| Rename a shared identity from Abilities | Compact Rename beside the referenced person or team | Save accepts only the canonical name. The support proposal retains its entries and relationships; amp Undo recovers the name. |
| Edit a prepared form | Current record and owner at left; Apply and Close at right | The top Apply delegates to the canonical submitter, sharing validation and focus behavior. |
| Undo accepted work | Stable native amp control | Recovers the latest accepted change independently of cassette or matrix selection. |

Delivery-lane placement for a newly added team or handoff belongs to the current
receiver view. It survives local refresh and Undo/redo. A freshly mounted receiver derives imported
phase placement from existing relationships; this change introduces no
new exported lifecycle field.

### Renaming a referenced person or team

| Candidate | Fit for this task |
| --- | --- |
| Travel to People | Provides the complete record controls, but requires a chapter return for a single name. Keep this route for broader person/team work. |
| Borrow the full record editor | Reuses established fields, but introduces rate, availability or membership operations and a competing draft owner. Keep it for editing those relationships together. |
| Edit the name beside its identity | Preserves the current support context and gives one explicit accepted operation. This is the selected route for #856. |

The local field edits a label attached to a stable shared ID. It visibly names
the entity, accepts a meaningful nonblank name through Save or Enter, and lets
Cancel or Escape leave the accepted value intact. Save updates that identity
through the canonical person/team command. The capability proposal keeps its
raw fields and selected IDs, then resumes against the updated accepted state.
An unchanged name leaves accepted history intact. A short scope cue identifies
the name as shared across the plan. Local focus returns to the Rename action.

This small operation deliberately keeps acceptance explicit: the shared name
changes when the visitor saves it, while the surrounding support assignment
changes when its proposal is applied. The design precedents establish an
interaction shape; a focused browser journey establishes label propagation,
draft preservation, keyboard recovery and Undo in this Studio.

## Source and observation

[Rack controls](rack-controls.mjs) owns the shared header and submit mirror.
[Shared sessions](shared-session-rack.mjs) owns its two views, relationship pads
and selected-row controls. [Team planning](connection-template-controller.mjs)
accepts their commands, while [the integration controller](controller.mjs) lends
the existing handoff editor to its local slot. [Delivery board](delivery-board.mjs)
owns the phase projection and lane creation entries.

The fitting proof is a direct membership change and Undo, a visible last-person
boundary, a handoff link change and local Apply/Close, and an addition that stays
in its originating delivery lane. Ordinary phone and desktop observations cover
local scrolling, readable labels and independent rack visibility. The receiving
PR records the checks run. Reopen the decision if visitor use reveals confusing
scope, lost entries or a return that changes the working context.
