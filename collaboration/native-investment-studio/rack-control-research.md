# Quiet controls and direct rack creation

## Receiving decision

The dev Studio should let a visitor load a plan and change its arrangement with
little explanation. The cassette artwork, period board, sequencer and selected
pads provide the hierarchy. This bounded spike supports #820 and #821: reduce
competing action treatments, preserve one meaningful operation per control, and
use empty rack space as a creation entry where its object is clear.

Read alongside [usable controls](usability-research.md) and
[removal and recovery](removal-recovery-research.md). The 8 November 2026 synthesis
supersedes their broad raised-action recommendation for ordinary local rack
controls. Their native semantics, stable membership positions and shared history
remain current.

## Evidence and transfer

| Source and class | What it establishes | Studio consequence and limit |
| --- | --- | --- |
| [GOV.UK Button](https://design-system.service.gov.uk/components/button/), official design-system guidance | Clear action labels and limited primary emphasis help people identify the next operation; strong warnings belong to serious, hard-to-reverse actions. | Reserve raised treatment for accepting a form or a major outside-rack workflow. Reversible Remove uses quiet rose treatment and a named object. This guidance informs hierarchy, not the Studio palette. |
| [Carbon Button guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/button/guidelines), official product guidance | Primary, tertiary and ghost variants have distinct emphasis and repeated local tasks can use lower prominence. | Local rack selection and manipulation use restrained borders and little shadow; Cancel stays ghost. Carbon's exact component taxonomy and page-level quotas are not transplanted into a multi-panel instrument. |
| [WAI Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/), accessibility practice | Buttons have action semantics, keyboard activation, accessible names and truthful pressed state; focus follows the resulting task. | Empty creation areas are named native buttons. Selection uses pressed state; opening an editor uses expanded state. Existing pads inspect work, while a new-item region creates it. Decorative empty space receives no container-wide click handler. |
| Human observations of the running Studio, local evidence | Repeated raised buttons and detached editing views make it harder to understand scope. The workbench's compact modules and direct pads were preferred. | Use the preserved cassette and duration specimens, attach the shelf to the board, load plans with editors closed, and keep team edits within their delivery board. This is a design direction with focused browser evidence, rather than a claim of population-level usability validation. |

## Synthesis

| Visitor goal | Treatment | Acceptance and recovery |
| --- | --- | --- |
| Load a plan or comparison | Preserved cassette/deck artwork; selected outline | Changes the visible scope. A plan opens with detail closed. |
| Inspect an existing record | Compact track key or pad; visible selected/open cue | Opens its local detail; Close returns to the same scope. |
| Add in a known period | Empty lane/track target, plus and concise label on hover/focus; visible on touch | Creates one useful record through the existing owner, then opens editing. Amp Undo recovers the accepted addition. |
| Add a different scope | Explicit New plan or Add sprint/quarter | Keeps the object clear when no single empty slot implies it. |
| Adjust membership or ordering | Native checkbox pad and compact movement controls | Team changes accept directly; one shared history supports recovery. |
| Accept an unfinished form | Raised Apply action | Accepts its canonical proposal; preserves existing validation and parked edits. |
| Cancel or close | Ghost control with a literal label | Cancel discards the proposal; Close retains the coordinator's saved work. |
| Remove a named object | Muted rose, explicit scope | Uses the existing dependency and recovery owner. |
| Undo accepted work | Stable native amp control | Acts on the latest accepted change, independently of cassette selection. |

## Challenge and observation

An empty intersection in a people/session matrix means participation, so creating
a new session there would be ambiguous. Keep those cells dedicated to inclusion
or inspection. A separate new-session row and the empty remainder of a period
lane have a clear receiving context. A named compact choice is preferable when
several object types could fit.

Desktop pointer hover and keyboard focus must expose the same creation target;
touch presents it directly. Check one accepted addition, local editing and amp
Undo; confirm an existing clip still opens its record. Ordinary phone and desktop
observations also cover text contrast, local table scrolling and fixed dial
lighting. These distinguish useful directness from invisible or accidental
creation. Additional research can resume if actual visitor behavior challenges
this mapping. Further source collection would presently add examples without
changing the implementation decision.
