# Strategy Canvas — independent elicitation and aggregation payload

```yaml
research_payload:
  id: "prototype-exemplars.strategy-canvas-independent-elicitation.v0.1"
  question: "How can a group form an inspectable shared reading while reducing early anchoring and preserving materially different views?"
  completion_condition: "A participant can submit a sealed reading; reveal communicates all accepted readings, missingness, center, spread, and amendment history."
```

## Collaboration contract

The facilitator establishes:

- decision and horizon;
- method posture;
- participant aliases or role groups;
- dimensions and shared anchors;
- which series each round collects;
- whether abstention and amendment are available;
- reveal condition;
- aggregation display;
- review authority and next evidence check.

Each participant receives the same definitions and anchors. Existing ballots and group summaries remain concealed during independent elicitation. A shared-device privacy interstitial supports turn-taking.

The human round completes first. AI proposals and prior generated material remain outside the ballot surface while participants form their readings. After reveal, the facilitator may open an attributed AI shadow round; it reads only the reviewed fields selected by the consent/scope record and never contributes observations to the group aggregate.

The [machine-readable evidence registry](../../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/strategy-canvas-evidence.v0.1.json) connects this route to `independent-before-reveal` and `anchoring-boundary`. The first travels with its published counterpoint, and both retain the task and inference limits that keep elicitation choices revisable.

## Round lifecycle

| State | Participant experience | Facilitator action | Durable state |
| --- | --- | --- | --- |
| setup | reads activity contract and anchors | selects series and reveal rule | round draft |
| collecting | enters one private ballot | monitors completion count | local draft + submitted ballots |
| sealed | sees submission receipt | passes device or closes collection | immutable submission revision |
| revealed | sees distribution and summaries | opens discussion | reveal event and derived aggregate |
| discussing | adds rationale, dissent, evidence, scenario | opens amendment or decision route | notes and scenario revisions |
| reviewed | sees accepted state and next review | names reviewer/owner/date | reviewed decision receipt |
| optional AI shadow | inspects an attributed proposal beside the human reading | selects consented scope and imports returned proposal | prompt receipt + proposal channel |

## Shared-device privacy curtain

After submission:

1. Clear editable participant fields from the visible surface.
2. Announce that the ballot is recorded under the chosen alias.
3. Show completion count without score values.
4. Offer “Pass the device” and “Facilitator controls.”
5. Require a deliberate action before the next ballot opens.

Session memory remains local by default. Exports disclose whether aliases and ballots are included. A facilitator can create an aggregate-only report.

## Aggregate vocabulary

For each dimension and series:

- `n submitted`;
- `n eligible`;
- missing or abstained count;
- mean;
- median;
- minimum and maximum;
- optional quartiles/IQR for adequate group size;
- complete deidentified reading set when the session policy allows it;
- a written spread phrase generated from a declared rule.

The main chart may lead with median or mean according to the activity contract. The alternate center and full readings remain in the inspector/report. The UI describes the aggregate as a group reading rather than an objective score.

### Small-group posture

For 3–8 readings, individual marks carry more information than a smooth distribution. Show every accepted reading, center, and range. Role labels stay suppressed when they would make identity readily recoverable.

### Medium-group posture

For 9–30 readings, show a compact dot stack or vertical beeswarm, median, mean, and range/IQR. The selected dimension reveals exact deidentified values.

### Large-group posture

For more than 30 readings, show density or binned distribution with center and intervals. Preserve access to counts and the underlying export according to policy.

## Amendments

An amendment creates a new ballot revision linked to the original. The report can show:

- original reading;
- amended reading;
- reason category;
- whether new evidence, anchor clarification, discussion, or correction informed the change;
- aggregate before and after amendment.

The system avoids an indistinguishable overwrite. The facilitator may choose whether participants see discussion before amendment.

## Role and expertise

Equal ballot weight is the default. Participant role enriches interpretation without silently increasing numerical influence.

If a collaboration adopts calibrated expert weights:

- the method and basis are declared before scoring;
- the unweighted result stays visible;
- the weighted result receives its own series identity;
- the report names the calibration procedure;
- role and identity privacy are reviewed.

## Divergence as an invitation

Spread can indicate anchor ambiguity, different evidence, different local conditions, different time horizons, or genuine value disagreement. The interface uses language such as:

- “Readings are closely grouped under the shared anchors.”
- “Readings span several anchor bands; inspect evidence and definitions.”
- “Two distinct clusters are visible; retain both readings while the receiving conditions are clarified.”

The visual directs attention toward context and evidence. It avoids turning divergence into participant rank or blame.

## Falsifiers

- A live mean appears before all independent ballots are submitted.
- Participant 2 can recover participant 1’s values during shared-device entry.
- The chart shows an average without `n`, missingness, and spread.
- A post-reveal drag changes submitted observations.
- A revised ballot erases its prior revision.
- Role metadata enables unintended identity inference in a small group.

## Coverage ledger

| Requirement | State/event | Interface | Test fixture |
| --- | --- | --- | --- |
| independent turn | `ROUND_OPENED`, local draft | private ballot mode | earlier readings concealed |
| submission | `BALLOT_SUBMITTED` | receipt/privacy curtain | draft cleared |
| reveal | `ROUND_REVEALED` | group distribution | count + missingness + spread |
| abstention | observation status | “open / insufficient basis” | excluded from center, counted visibly |
| amendment | `BALLOT_AMENDED` | revision explanation | original preserved |
| proposal | scenario events | ghost curve | ballots unchanged |
| reviewed decision | `SNAPSHOT_REVIEWED` | decision receipt | reviewer and date present |

## Completion gate

- A six-person shared-device fixture completes without score leakage.
- Reveal summaries match independently computed expected values.
- Missing, abstained, and amended observations retain distinct counts.
- Every aggregate can be traced to accepted ballot revisions.
- A scenario change leaves ballots and aggregates byte-for-byte stable.
- An AI shadow-round fixture leaves ballots and aggregate selector output byte-for-byte stable.
- Aggregate-only and full-evidence reports honor the selected privacy posture.
- The complete sealed human round works with network access unavailable.
