# Strategy Canvas — AI collaboration and portable handoffs payload

```yaml
research_payload:
  id: "prototype-exemplars.strategy-canvas-ai-handoffs.v0.1"
  question: "How can AI collaborators extend the canvas while preserving source, proposal, decision, and human-authority boundaries across platforms?"
  completion_condition: "Every generated packet declares posture, inputs, allowed transformations, preserved state, open fields, receiver, and return conditions."
```

## Collaboration postures

| Posture | AI contribution | Preserved state | Return artifact |
| --- | --- | --- | --- |
| diagram only | render reviewed data | values, labels, order, provenance | SVG/HTML/table |
| facilitation brief | draft activity prompts and timing | independent elicitation and reveal policy | facilitator guide |
| surface pack | compose cards, worksheets, or workshop aids | semantic IDs and reviewed copy | accessible surface set |
| factor/anchor review | flag collisions, gaps, and ambiguous anchors | human-authored dimensions and authority | attributed proposal list |
| research payload | formulate source questions for disputed dimensions | current readings and uncertainty | evidence plan/coverage ledger |
| loop-bearing handoff | propose next receiving architecture and revision check | decision receipt and open conditions | route packet |
| cross-platform packet | compress sufficient context for another AI | source standing and revision identity | JSON + concise prompt |
| recovery route | identify smallest useful return point | last reviewed state | recovery instruction |

## Three channels and the shadow round

The Strategy Canvas names contribution standing before content:

- `humanBallot` records a submitted human observation;
- `systemAggregate` records or projects a reproducible calculation from accepted human ballots;
- `aiProposal` records attributed generated material with adoption state.

The optional AIShadowRound interaction follows human reveal. It assembles a prompt packet locally, lets the facilitator carry that packet to an authorized AI collaborator, and receives pasted proposal values into the attributed `aiCollaboration.proposals` map. The prototype makes zero network requests. Generated readings remain beside the group distribution as a comparison surface; mean, median, spread, quorum, and completion counts continue to derive from eligible human ballots.

In the v0.2 artifact, the shadow-round interaction serializes as one `extensions.contextCanvas.aiCollaboration` record: preparation time, posture, dimension-keyed proposal values, proposal note and standing, local network policy, consent scope, and reviewed revision. `AIShadowRound` remains the interaction/entity concept; this implementation carries no `shadowRounds[]` collection.

### Consent and scope

Before packet assembly, the facilitator reviews a consent/scope surface containing:

- permitted reviewed revision;
- included dimensions, anchors, aggregate summaries, decisions, notes, and evidence references;
- excluded participant aliases, ballots, private notes, and source locators;
- intended AI platform or receiver;
- allowed transformation and output posture;
- retention or paste-back expectation;
- named reviewer approving the packet.

The packet receipt lists included and held-local fields in affirmative terms. A change in scope creates a new packet revision.

## Prompt capsule contract

Each capsule states:

- task and desired state;
- method posture;
- decision object and horizon;
- selected dimensions, definitions, anchors, and order;
- requested series and their standing;
- participant and privacy posture;
- evidence references and open evidence fields;
- reviewed decisions and reversible scenarios;
- allowed transformations;
- protected state;
- output format;
- named human or institutional receiver;
- required uncertainty and proposal labels;
- next evidence check and recovery route.

### Example stable instruction

> Review the selected dimensions for definition collisions and missing scale anchors. Return an attributed proposal list. Preserve participant ballots, derived group readings, authored dimension order, evidence standing, and the reviewed decision. Mark each proposed change as open until the named facilitator adopts it.

## Proposal standing

AI-proposed dimensions, anchors, actions, notes, and routes receive:

- stable proposal ID;
- model/tool and date;
- prompt capsule reference;
- source references supplied;
- proposal rationale;
- uncertainty/open conditions;
- adoption state;
- adopting reviewer and revision when accepted.

Generated text remains outside participant aggregates. An adopted proposal becomes human-reviewed state through a recorded event.

## Cross-platform packet

The portable packet contains:

1. schema identity and artifact revision;
2. human-readable orientation;
3. compact structured canvas state;
4. preserved-state list;
5. open fields and questions;
6. requested posture/output;
7. proposal/authority contract;
8. receiving route and paste-back instructions;
9. redaction and privacy disclosure;
10. checksum or stable revision identifier when available.
11. consent/scope record and packet reviewer.

The packet carries enough state to resume without relying on hidden chat memory. Platform-specific IDs remain optional metadata rather than the artifact identity.

## Receiving routes

- **First Responsible Version Matrix** — establish the smallest responsible threshold from selected dimensions.
- **HEART Chart** — attach outcome signals and measures to consequential factors.
- **Service-design Blueprint** — trace frontstage/backstage systems behind a factor.
- **Practitioner Judgment Probes** — clarify a disputed reading, causal path, or evidence claim.
- **Specification by Example** — turn an accepted state into concrete behavior examples.
- **Unit-test-first design** — encode machine-verifiable behavior at a software boundary.
- **Recovery Routing Atlas** — respond to strain, ambiguity, or failure geometry.
- **Deep Research Payload** — collect primary evidence and falsifiers for open dimensions.

## Social and organizational context

The packet can carry named roles, represented groups, and register requirements when they change the work. It distinguishes:

- participant alias;
- organizational role;
- represented population;
- prompt persona or working voice;
- authority to score;
- authority to review;
- authority to publish.

These fields support coordination. They avoid turning identity cues into silent numerical weight.

## Falsifiers

- An AI suggestion appears in a human ballot series.
- A platform summary drops scale anchors or method posture.
- A receiving AI treats the aggregate as a reviewed decision.
- A generated report implies evidence that remains provisional.
- The packet carries sensitive participant identifiers beyond the declared need.
- A prompt requests broad “improvement” while omitting the receiving decision and preservation contract.
- An AI shadow response contributes to participant counts or group aggregates.
- A packet includes fields outside its reviewed consent/scope record.

## Coverage ledger

| Posture | Prompt template | Fixture | Adoption/return receipt | Status |
| --- | --- | --- | --- | --- |
| diagram only | required | canonical example | parity receipt | implementation target |
| facilitation brief | required | six-person round | human review | implementation target |
| factor/anchor review | required | ambiguous-anchor example | proposal adoption | implementation target |
| research payload | required | disputed dimension | coverage ledger | implementation target |
| loop-bearing handoff | required | threshold route | receiving artifact link | implementation target |
| cross-platform packet | required | compact/redacted forms | paste-back reconciliation | implementation target |
| recovery route | required | invalid/import strain | restored revision | implementation target |

## Completion gate

- Every posture has an explicit preservation and authority contract.
- Human, AI-proposed, mechanically derived, and reviewed values remain distinguishable in UI and export.
- The three contribution channels use distinct entities and cannot be merged by aggregation selectors.
- The shadow round is available only after human reveal and works through local copy/export and paste/import.
- Packet assembly includes only consented reviewed state and issues an inspectable scope receipt.
- Compact packets restore the same dimensions, anchors, order, and reviewed state.
- Paste-back reconciliation reports added, changed, preserved, and unresolved fields.
- Redacted export removes participant identifiers while preserving aggregate traceability.
- At least two distinct AI platforms can consume and return the packet without relying on hidden prior context.
