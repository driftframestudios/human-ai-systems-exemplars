# Strategy Canvas — method, scales, and adaptation payload

```yaml
research_payload:
  id: "prototype-exemplars.strategy-canvas-method-scale-adaptation.v0.1"
  question: "How can one artifact support source-method comparison and collaboration tuning while keeping their claims distinct?"
  completion_condition: "Every plotted value has a declared construct, scale, anchor set, source standing, and decision use."
```

## Decision frame

The horizontal axis contains authored comparison dimensions. The vertical axis contains a declared relative scale. A profile curve connects readings to make a value configuration visible. The curve is a comparative instrument; it becomes decision evidence only through its definitions, anchors, observations, and review agreement.

### Method posture A — market strategy

- Factors represent conditions on which an offering or field competes or invests.
- Values represent relative offering levels available to buyers or participants.
- Several profiles may represent the focal offering, comparators, or a proposed value curve.
- ERRC asks what to eliminate, reduce, raise, or create after the current shape is visible.

### Method posture B — collaboration tuning

- Dimensions represent material properties of a system, service, decision, or collaboration.
- Current describes a bounded present reading.
- Good enough describes the threshold for the next responsible phase.
- Desired describes a longer-horizon direction.
- Participant observations and their spread remain visible before a reviewed decision is recorded.

The interface names the posture. Exports preserve it. Prompt capsules repeat it.

## Construct ledger

| Field | Question answered | Scale | Source standing | Plot treatment |
| --- | --- | --- | --- | --- |
| offering/current level | “How much of this factor is presently offered or observed?” | anchored ordinal or interval-like working scale | observation, evidence, or provisional judgment | profile coordinate |
| good-enough threshold | “What level supports the next responsible phase?” | same anchored scale | negotiated threshold | distinct marker/path |
| desired level | “Which longer-horizon state is being proposed?” | same anchored scale | proposal or reviewed direction | outlined profile |
| consequence weight | “How consequential is this dimension for the named decision?” | separate declared scale | participant/reviewer judgment | attention ledger, never implicit coordinate multiplication |
| confidence | “How strongly does the submitted evidence support this reading?” | verbal or percentage with a named target | claim-specific judgment | inspector/distribution metadata |
| action | “Which ERRC disposition follows from the visible shape?” | categorical | participant or reviewed decision | action band/category count |

## Scale contract

Each dimension carries:

- `scaleMinimum` and `scaleMaximum`;
- low, middle, and high anchor descriptions;
- optional intermediate anchors;
- a local definition;
- the evidence needed for a present-state reading;
- an abstention condition;
- a note explaining what movement changes in the receiving decision.

A generic `0–10` scale can support editing and demonstration. A reviewed exercise supplies local anchors before aggregation. The UI presents the anchor text wherever a participant scores.

### Five-point posture

Useful for room facilitation and source-method fidelity:

1. absent or minimal relative offering;
2. limited;
3. established middle condition;
4. strong;
5. highest relative offering in the declared comparison.

### Eleven-point posture

Useful when a team already has shared operational anchors and needs a finer working resolution. The extra digits express available choices; they do not by themselves create greater measurement precision.

## Dimension ordering

Initial order follows authored or facilitated sequence. That order is part of the artifact because the curve’s shape depends on it.

Optional lenses may temporarily reorder dimensions by:

- ERRC action;
- consequence weight;
- evidence readiness;
- largest spread;
- receiving route;
- domain grouping.

The original order remains one action away, and exports distinguish authored order from current view order.

## ERRC boundary

ERRC becomes an action lens after participants can see the present curve or current evidence. A Context extension may add `preserve` or `discover` when the collaboration needs them. Such categories carry an explicit adaptation label and remain distinct from the canonical Four Actions.

## Instruction implications for the canonical worksheet

Every instruction explains its state consequence:

- **Rename a dimension** — updates the visible label, semantic table, structured export, and report while preserving its stable ID.
- **Move current** — changes the current profile for that dimension and records a reversible event.
- **Set good enough** — adds the next-phase threshold; it does not replace desired.
- **Set consequence weight** — changes attention and report emphasis; it does not move the profile point.
- **Choose ERRC** — classifies the visible factor for action; it preserves the value readings.
- **Reset a point** — returns that point to its source value or group aggregate, depending on mode.
- **Reset the worksheet** — requests confirmation and restores the declared fixture rather than an empty, ambiguous state.

## Evidence and source ledger

| Source type | Contribution | Boundary |
| --- | --- | --- |
| official Strategy Canvas guidance | factors, offering levels, value curves, shared baseline | source method does not define this repository’s group-voting extension |
| official ERRC guidance | current canvas precedes action formulation | action categories remain categorical judgments |
| repository Strategy Canvas card | current, good-enough, desired, participant spread, receiving routes | authored collaboration adaptation |
| Practitioner Judgment Probes | claim-specific judgment, independent elicitation, confidence, review | informs facilitation rather than conferring measurement validity |
| supplied reference image | hierarchy, legend, action bands, qualitative axes, generous markers | visual and interaction grammar, not a data source |

The [machine-readable evidence registry](../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json) binds the source ledger to implementation entries `graphical-position`, `anchoring-boundary`, and `four-actions-origin`. Each entry states what the source changes here and which adjacent claim it leaves open.

## Falsifiers

- Participants interpret consequence weight as a plotted offering score.
- Two participants use materially different scale meanings while the system presents their average as shared.
- ERRC color determines the dimension order before a baseline can be understood.
- A copied competitor value appears as measured evidence without source standing.
- Changing a display lens silently changes artifact order.

## Coverage ledger

| Requirement | Semantic field | Visible explanation | Verification |
| --- | --- | --- | --- |
| method posture | `methodPosture` | title/setup/legend | two fixture imports |
| dimension definition | `dimensions[].definition` | row header/inspector | missing-definition review state |
| anchors | `dimensions[].scale.anchors` | participant scoring surface | screen-reader label/description |
| consequence weight | `dimensions[].importance` | separate attention field | curve coordinate unchanged |
| series identity | `series[].kind` | shape + text legend | forced-colors receipt |
| ERRC action | `dimensions[].action` or review decision | post-shape lens | authored-order recovery |

## Completion gate

- Both method postures have complete example fixtures.
- Every example dimension has definition and anchor text.
- Score and importance changes have visibly different consequences.
- A text/table equivalent explains every plotted series.
- ERRC is available after the current shape appears.
- Reports and prompt capsules name the chosen posture and scale.
