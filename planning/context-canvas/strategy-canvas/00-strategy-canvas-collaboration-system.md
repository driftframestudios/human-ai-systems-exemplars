# Strategy Canvas — collaboration-system decision frame

```yaml
research_payload:
  id: "prototype-exemplars.strategy-canvas-collaboration-system.v0.2"
  as_of: "2026-08-21"
  status: "implementation contract in progress"
  semantic_contract: "strategy-canvas/2.0"
  expressions:
    canonical: "plain extensible worksheet"
    context_canvas: "collaborative facilitation workbench"
  implementation_posture: "semantic HTML and accessible SVG first; layered CSS and dependency-free JavaScript as progressive enhancement"
  authority_posture: "participants define the comparison; derived values retain their derivation; reviewed human decisions remain explicit"
```

## §0 — How to use this payload

1. Resolve the method posture and shared vocabulary before adding interactions.
2. Keep the canonical worksheet and Context Canvas workbench on one semantic model while allowing different experiential emphases.
3. Treat state identity as a collaboration promise: a ballot remains a ballot, an aggregate remains derived, and a scenario remains reversible.
4. Use the six bounded payloads as implementation contracts. Record new evidence or changed decisions in the relevant coverage ledger.
5. Use GitHub Issues for bounded implementation tasks. Keep comparative hypotheses, long-horizon architecture, and completion gates in this directory.
6. Close the shared completion gate only when machine, semantic, visual, interaction, and human-review receipts agree.

## §A — Receiving decision

Build a Strategy Canvas family that supports individual sensemaking, group elicitation, large-screen facilitation, reversible scenario formation, hybrid human–AI handoffs, and durable reviewed reports while retaining a legible no-script artifact.

The family supports two declared method postures:

1. **Market-strategy comparison** — factors on which an offering or field competes, relative offering levels, and one or more comparable profiles.
2. **Collaboration tuning** — current state, good-enough threshold, desired state, participant readings, shared evidence, and receiving architecture routes.

The selected posture changes labels, helper text, sample data, and prompt output. It preserves the underlying distinction between dimension, scale, series, observation, proposal, and decision.

## §B — Stable design proposition

### Canonical expression

The canonical artifact teaches its own operating implications:

- why dimension names and anchor descriptions matter;
- what each series represents;
- how consequence weight differs from offering level;
- how a point move changes the structured artifact;
- when ERRC becomes useful;
- how import, export, reset, scenario, and review actions affect state;
- which equivalents carry the same operation without drag.

Its visual form adapts the supplied reference image: quiet paper, centered editorial title, compact legend, broad plot, qualitative scale language, restrained action bands, and generous circular handles. Public CSS tokens and low-specificity selectors make downstream theming ordinary.

### Context Canvas expression

The Context workbench prioritizes the collaboration happening now:

- orient the decision and horizon;
- define factors and shared anchors;
- collect private readings;
- reveal center and spread;
- inspect evidence and divergent readings;
- move a reversible proposal while the group result stays visible;
- attach notes and open questions;
- mark good enough;
- assemble a reviewed handoff.

Its copy describes actions, state, consequences, and return routes. Repository history, production lineage, and implementation commentary stay in planning and threadkeeping.

## §C — State model

| Object | Meaning | Editing authority | Visual standing |
| --- | --- | --- | --- |
| `Dimension` | A named comparison factor with local definition and anchors | setup editor or reviewed import | labelled x-axis column |
| `SeriesDefinition` | Current, threshold, desired, competitor, aggregate, proposal, or reviewed series | session contract | legend item and path style |
| `Observation` | One participant reading of one dimension in one round | participant until submission | concealed ballot or distribution mark |
| `Aggregate` | Mechanically derived reading from accepted observations | calculation only | group point, center, and spread |
| `Scenario` | Reversible working curve | facilitator or authorized participant | ghost/halo curve beside aggregate |
| `ReviewedDecision` | Explicitly accepted value or disposition | named reviewer | reviewed marker and decision receipt |
| `Note` | Typed context attached to a semantic object | participant, facilitator, or attributed AI | note pip and inspector record |
| `EvidenceReference` | Basis, source, observation, or counter-signal | named contributor/reviewer | evidence standing beside dimension |
| `Round` | Collection and reveal boundary | facilitator/session policy | phase and state indicator |
| `Revision` | Recoverable snapshot and event boundary | system record plus reviewer | revision receipt |

### Three-channel collaboration contract

The artifact keeps three contribution channels structurally distinct:

1. **Human ballot channel** — sealed participant observations with submission, reveal, amendment, and privacy standing.
2. **System-derived channel** — counts, missingness, means, medians, spread, and other reproducible selectors calculated from accepted human observations.
3. **AI-proposal channel** — attributed factor, anchor, interpretation, scenario, or route proposals that enter only through explicit human adoption.

An optional **AIShadowRound** interaction becomes available after the human reveal. It assembles a portable prompt from the reviewed and consented scope and presents attributed proposal values beside the group reading. In v0.2, one `aiCollaboration` record carries preparation time, posture, reviewed revision, consent scope, local network policy, proposal values, and proposal note. Participant ballots remain the aggregate input set. A future attributed-response receipt may add model, tool, and return-time metadata through a versioned extension.

Each AI packet carries an explicit consent/scope record naming which reviewed fields may travel, which fields stay local, the intended receiver, and the permitted transformation. The local prototype completes its full human round without a network request.

### Session states

`setup → collecting → sealed → revealed → discussing → reviewed`

The state machine supports returning to setup or opening a new round. A return creates a new revision or round while the earlier receipt remains recoverable.

## §D — Product flow

1. **Orient** — decision object, method posture, horizon, participants, and receiving decision.
2. **Define** — dimension names, definitions, anchors, evidence basis, and abstention conditions.
3. **Read privately** — participant submits a concealed ballot without seeing current group results.
4. **Reveal** — show count, missingness, center, spread, and material disagreement.
5. **Shape** — create a reversible scenario beside the group reading.
6. **Act** — apply ERRC after the shape is visible; identify thresholds and receiving routes.
7. **Review** — name decisions, dissent, evidence needs, owner, and review date.
8. **Carry forward** — issue a human-readable report and machine-readable collaboration packet.

## §E — Design hypotheses and selected synthesis

| Hypothesis | Material strength | Main condition to test | Selected contribution |
| --- | --- | --- | --- |
| Reference worksheet | Immediate diagram hierarchy and generous controls | Can it remain plain and fully instructive? | canonical shell and legend grammar |
| Cobalt workshop field | Strong Context Canvas identity and instrument posture | Can dense collaboration state remain calm? | primary workbench field |
| Dimension wall | Large handles and room-distance comprehension | Can 10–12 dimensions remain navigable? | presentation mode |
| Constellation of voices | Makes distribution and dissent visible | Can spread stay legible without implying rank? | reveal layer |
| Baseline/scenario twin | Protects aggregate integrity during exploration | Can participants recover the accepted baseline immediately? | discussion mode |
| Wizard and handoff studio | Makes setup and outputs inspectable | Can advanced options stay secondary? | optional setup and drawers |

**Selected synthesis:** a canonical reference worksheet and a Context Cobalt facilitation field share one schema, reducer vocabulary, aggregate engine, semantic table, and export contract. The workbench adds turn-taking, voice distributions, notes, scenarios, and reviewed leave-behinds as explicit progressive layers.

## §F — Negation-aware language contract

Copy leads with the usable state and places the material boundary beside it.

| Less useful shorthand | Stable replacement |
| --- | --- |
| “Do not edit the group average.” | “Move a working proposal; the submitted group reading stays visible and recoverable.” |
| “This is not a ranking.” | “This is a relative offering or collaboration profile. Dimension order supports comparison; it carries no overall rank.” |
| “AI cannot decide.” | “AI contributions enter as attributed proposals; the named reviewer accepts, revises, or routes them.” |
| “No evidence.” | “Evidence standing is open; attach the observation or retain the value as provisional.” |
| “Drag is not required.” | “Drag, tap-to-position, step buttons, and labelled inputs change the same value.” |

Material prohibitions remain direct when privacy, authorization, safety, or destructive state change depends on them.

## §G — Coverage ledger

| Concern | Canonical | Context workbench | Structured artifact | Evidence/test |
| --- | --- | --- | --- | --- |
| method posture | visible instructions | setup choice | `methodPosture` | fixture for both postures |
| dimension definition | labelled matrix | setup drawer | `dimensions[]` | label/anchor contract |
| consequence weight | documented separate field | optional attention lens | `importance` | curve position unchanged |
| sealed elicitation | documented handoff | turn-taking mode | `rounds`, `ballots` | conceal/reveal contract |
| aggregate and spread | semantic example | reveal layer | derived selector output | deterministic fixture |
| scenario integrity | instructions | draggable twin | `scenarios[]` | aggregate immutability test |
| notes/evidence | compact ledger | inspector/drawer | `notes`, `evidence` | literal-text test |
| accessibility | native controls/table | equivalent workbench routes | labels and IDs | keyboard/touch/AT matrix |
| room ergonomics | presentation instructions | presentation mode | view state only | 1080p/1440p/4K receipts |
| AI collaboration | prompt posture explanation | handoff drawer | projection packet | attribution/boundary checks |
| reviewed output | print specimen | report builder | revision/receipt | report parity check |
| migrations | import disclosure | import receipt | schema dialect/version | v0.1/Narrative fixtures |

## §H — Completion gates

### Gate 1 — method

- Method posture and scale anchors are visible.
- Offering level, consequence weight, ballot, aggregate, scenario, and reviewed value remain distinct.
- ERRC follows a visible baseline or shape.

### Gate 2 — collaboration

- Independent readings can be collected before reveal.
- Count, missingness, center, spread, and dissent remain inspectable.
- Aggregate values are mechanically derived and recoverable.
- Scenario moves create proposals and preserve the group reading.

### Gate 3 — interaction

- Oversized handles work at desk and room distance.
- Drag, tap, buttons, and native inputs converge on one semantic action.
- Focus, touch scrolling, undo, cancel, and return-to-group behaviors are explicit.

### Gate 4 — artifact integrity

- HTML table, SVG, JSON, JSON-LD, print, and report agree.
- Imports return a dialect and migration receipt.
- Reviewed revisions retain source and decision standing.

### Gate 5 — hybrid collaboration

- AI output posture and allowed transformation are explicit.
- Human-authored readings remain distinguishable from AI proposals.
- Human ballots, system-derived aggregates, and AI-attributed proposals remain separate channels.
- An AI shadow round begins only after human reveal and remains outside aggregate calculations.
- Consent/scope selects the reviewed fields that enter a portable AI packet.
- Cross-platform packets carry enough state for re-entry without hidden conversation history.

## §I — Open conditions

1. Which 5-point and 11-point scales merit first-class presets, and which anchors must remain locally authored?
2. Which dispersion summaries best fit groups of 3–8, 9–30, and more than 30 participants?
3. Should a reviewed value preserve a direct link to the round and scenario that informed it?
4. What privacy interval or suppression rule applies to very small role groups?
5. Which backend boundary would support authenticated cross-device rounds while preserving static deployment as the complete base experience?
6. Which dimension packs carry enough validated anchors to become recommended rather than exploratory?
