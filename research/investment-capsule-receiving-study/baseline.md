# Prompt Capsule: Initiative Costing Calculator investment comparison

- Contract: prompt-capsule/0.1.0
- Capsule: initiative-costing-calculator/investment-comparison
- Source: initiative-costing-calculator\@0.3.0
- State: investment-analysis/0.2.0 | revision 0.3.0
- Fingerprint: fnv1a32-utf8:4c1652b2
- Analysis fingerprint: fnv1a32:57705d19
- View: plain

## Purpose and target

Prepare the next investment decision from the accepted comparison. Receiving owner: Name the accountable decision owner.

## Relevant context and inputs

- Scenario: Illustrative pilot versus status quo (scenario/investment-pilot.v0.1)
- Method: model/activity-based.v0.1
- Evidence standing: illustrative
- Currency / period: USD / year
- Cash-flow convention: Incremental to status quo; end-period; t=0 upfront

## Working state

### Internal investment

#### Inputs and assumptions

- Internal investment reference (internalInvestment): 100000 [USD] | known

The internal amount is an entered reference. Live staffing controls remain in the calculator; a staffing snapshot enters this account through Use current staffing reference.

### Customer implementation

#### Inputs and assumptions

- List price per orderable unit (listPrice): 1000 [USD/unit] | known
- Discount fraction (0-1) (discount): 0.1 [ratio] | known
- Rebate per unit (rebate): 25 [USD/unit] | known
- Variable cost per unit (variableCost): 200 [USD/unit] | known
- Service cost per unit (serviceCost): 100 [USD/unit] | known
- Orderable unit and package boundary (pricingUnit): One synthetic service unit; implementation separate [text] | known
- Buyer / user / payer (buyer): Sponsor / operating team / customer organization [text] | known
- Price evidence class (priceClass): Illustrative scenario [text] | known
- Customer implementation cost (implementationCost): 10000 [USD] | known
- Implementation lag (periods) (implementationLag): 1 [year] | known

#### Calculated results

- calculation/discountAmount: 100 USD/unit | Evidence: illustrative
- calculation/netPrice: 875 USD/unit | Evidence: illustrative
- calculation/unitContribution: 575 USD/unit | Evidence: illustrative

### Commercial cohort

#### Inputs and assumptions

- Customer segment (segment): Synthetic implementation partners [text] | known
- Opening cohort and measurement window (cohort): 100 synthetic customers; one year [text] | known
- Cohort tenure (periods) (tenure): 1 [year] | known
- Implementation standing (implementationState): Illustrative ramp; one-period lag [text] | known
- Opening customers (openingCustomers): 100 [customer] | known
- New customers (newCustomers): 20 [customer] | known
- Opening-cohort customers lost (churnCustomers): 10 [customer] | known
- Reactivated customers outside opening cohort (reactivatedCustomers): 5 [customer] | known
- Opening-cohort recurring revenue (openingRevenue): 100000 [USD/year] | known
- Revenue lost from opening cohort (churnRevenue): 10000 [USD/year] | known
- Opening-cohort contraction (contraction): 5000 [USD/year] | known
- Opening-cohort expansion (expansion): 20000 [USD/year] | known
- New-customer recurring revenue (newRevenue): 20000 [USD/year] | known
- Reactivation revenue outside opening cohort (reactivationRevenue): 5000 [USD/year] | known
- Acquisition spend for new customers (acquisitionSpend): 10000 [USD] | known
- New-customer contribution margin (0-1) (contributionMargin): 0.7 [ratio] | known

#### Calculated results

- calculation/closingCustomers: 115 customer | Evidence: illustrative
- calculation/logoRetention: 0.9 ratio | Evidence: illustrative
- calculation/grr: 0.85 ratio | Evidence: illustrative
- calculation/nrr: 1.05 ratio | Evidence: illustrative
- calculation/closingRevenue: 130,000 USD/year | Evidence: illustrative
- calculation/cac: 500 USD/customer | Evidence: illustrative
- calculation/acquisitionRevenueRatio: 0.5 year | Evidence: illustrative
- calculation/cacPayback: 0.7143 year | Evidence: illustrative

#### Lifecycle occurrences

- acquire: acquisition | Period: 0 | Predecessors: Entry | Evidence: illustrative
- onboard: onboarding | Period: 1 | Predecessors: acquire | Evidence: illustrative
- activate: activation | Period: 1 | Predecessors: onboard | Evidence: illustrative
- renew: renewal | Period: 2 | Predecessors: activate | Evidence: illustrative
- churn: churn | Period: 2 | Predecessors: activate | Evidence: illustrative
- reactivate: reactivation | Period: 3 | Predecessors: churn | Evidence: illustrative

### Service and operational value

#### Inputs and assumptions

- Implementation capacity (adopted people per period) (capacity): 40 [person/year] | known
- Eligible population (eligiblePopulation): 100 [person] | known
- Adoption fraction (0-1) (adoption): 0.3 [ratio] | known
- Baseline resource cost per person per period (baselineCost): 500 [USD/person/year] | known
- Candidate resource cost per person per period (candidateCost): 650 [USD/person/year] | known
- Budget perspective (perspective): Illustrative provider budget [text] | known
- Population and context (population): Synthetic population; local eligibility remains to be specified [text] | known
- Intervention (intervention): Bounded workflow pilot [text] | known
- Comparator (comparator): Current workflow [text] | known
- Accountable service / operating reviewer (reviewer): unavailable [text] | unavailable
- Evidence semantic key or public source (evidenceSource): unavailable [text] | unavailable
- Evidence as-of date (asOf): unavailable [date] | unavailable
- Outcome transformation review (economicReview): pending [text] | known
- Reviewed incremental outcome per adopted person (incrementalOutcome): unavailable [outcome/person] | unavailable
- Outcome unit (explicit measure) (outcomeUnit): unavailable [text] | unavailable

#### Calculated results

- calculation/adoptedPopulation: 30 person | Evidence: illustrative
- calculation/budgetImpact: 4,500 USD/year | Evidence: illustrative
- calculation/capacityGap: 0 person/year | Evidence: illustrative
- calculation/costPerOutcome: unavailable USD/outcome | Reason: Reviewed incremental outcome per adopted person is needed. | Evidence: illustrative
- calculation/consequence/Safety: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Quality: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Timeliness: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Patient experience: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Equity: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Efficiency: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Burden: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Governance: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable
- calculation/consequence/Budget capacity: unavailable unit unspecified | Reason: Supply a unit and appropriately reviewed evidence, or identify an illustrative scenario. | Evidence: unavailable

#### Consequence evidence

- Safety: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Quality: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Timeliness: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Patient experience: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Equity: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Efficiency: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Burden: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Governance: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified
- Budget capacity: baseline unavailable, candidate unavailable [unit unspecified] | unavailable | Source: Unspecified

### Capital allocation

#### Inputs and assumptions

- Effective discount rate per period (discountRate): 0.1 [ratio] | known
- Cash-flow convention (cashConvention): Incremental to status quo; end-period; t=0 upfront [text] | known
- Tax and working-capital treatment (taxWorkingCapital): Synthetic after-tax flows; working-capital changes included once [text] | known
- Outcome tree is mutually exclusive and exhaustive (exhaustive): false [boolean] | known

#### Calculated results

- calculation/expectedNpv: unavailable USD | Reason: Confirm a mutually exclusive, collectively exhaustive outcome tree. | Evidence: illustrative

#### Alternatives and supplied outcomes

- Status quo (status-quo) | illustrative | Flows from t=0: \[0,0,0\]
- NPV: 0 USD
- IRR per year: inapplicable ratio | Reason: IRR requires at least one cash-flow sign change.
- Payback: inapplicable year | Reason: Payback requires an initial cash outlay.
- Proceed (proceed) | illustrative | Flows from t=0: \[-120000,70000,75000\]
- NPV: 5,619.8347 USD
- IRR per year: 0.1343 ratio
- Payback: 1.6667 year | Reason: Undiscounted; linear recovery within the crossing period.
- Pilot (pilot) | illustrative | Flows from t=0: \[-100000,60000,60000\]
- NPV: 4,132.2314 USD
- IRR per year: 0.1307 ratio
- Payback: 1.6667 year | Reason: Undiscounted; linear recovery within the crossing period.
- Defer (defer) | illustrative | Flows from t=0: \[0,-90000,80000\]
- NPV: -15,702.4793 USD
- IRR per year: inapplicable ratio | Reason: IRR is restricted to an initial investment followed by nonnegative flows.
- Payback: inapplicable year | Reason: Payback requires an initial cash outlay.
- Scale (scale) | illustrative | Flows from t=0: \[-180000,100000,120000\]
- NPV: 10,082.6446 USD
- IRR per year: 0.1402 ratio
- Payback: 1.6667 year | Reason: Undiscounted; linear recovery within the crossing period.
- Redirect (redirect) | illustrative | Flows from t=0: \[-40000,20000,30000\]
- NPV: 2,975.2066 USD
- IRR per year: 0.1514 ratio
- Payback: 1.6667 year | Reason: Undiscounted; linear recovery within the crossing period.
- Stop (stop) | illustrative | Flows from t=0: \[-5000,0,0\]
- NPV: -5,000 USD
- IRR per year: inapplicable ratio | Reason: IRR requires at least one cash-flow sign change.
- Payback: unreached year | Reason: Cumulative cash flow remains below zero throughout the supplied horizon.
- Outcome constrained | Probability: 0.3 | Flows from t=0: \[-100000,30000,30000\]
- Outcome planned | Probability: 0.5 | Flows from t=0: \[-100000,60000,60000\]
- Outcome expanded | Probability: 0.2 | Flows from t=0: \[-100000,90000,90000\]

#### Discount sensitivity

- status-quo | Rate: 0.08 | NPV: 0 USD
- status-quo | Rate: 0.1 | NPV: 0 USD
- status-quo | Rate: 0.12000000000000001 | NPV: 0 USD
- proceed | Rate: 0.08 | NPV: 9,115.2263 USD
- proceed | Rate: 0.1 | NPV: 5,619.8347 USD
- proceed | Rate: 0.12000000000000001 | NPV: 2,289.5408 USD
- pilot | Rate: 0.08 | NPV: 6,995.8848 USD
- pilot | Rate: 0.1 | NPV: 4,132.2314 USD
- pilot | Rate: 0.12000000000000001 | NPV: 1,403.0612 USD
- defer | Rate: 0.08 | NPV: -14,746.2277 USD
- defer | Rate: 0.1 | NPV: -15,702.4793 USD
- defer | Rate: 0.12000000000000001 | NPV: -16,581.6327 USD
- scale | Rate: 0.08 | NPV: 15,473.251 USD
- scale | Rate: 0.1 | NPV: 10,082.6446 USD
- scale | Rate: 0.12000000000000001 | NPV: 4,948.9796 USD
- redirect | Rate: 0.08 | NPV: 4,238.6831 USD
- redirect | Rate: 0.1 | NPV: 2,975.2066 USD
- redirect | Rate: 0.12000000000000001 | NPV: 1,772.9592 USD
- stop | Rate: 0.08 | NPV: -5,000 USD
- stop | Rate: 0.1 | NPV: -5,000 USD
- stop | Rate: 0.12000000000000001 | NPV: -5,000 USD

#### Receiving decision

- Owner: Name the accountable decision owner
- Gate: held-open
- Next option: pilot
- Trigger: Review pilot feasibility, evidence, and capacity
- Next evidence: Observed workflow and reviewed resource requirements
- Revisit: Unspecified

### Accepted analysis JSON

This is the directly importable accepted state. Derived results above use formula version 0.1.0. JSON retains exact values, IDs, absence states, and declared extensions.

```json
{
  "alternatives": [
    {
      "flows": [
        0,
        0,
        0
      ],
      "id": "status-quo",
      "label": "Status quo",
      "standing": "illustrative"
    },
    {
      "flows": [
        -120000,
        70000,
        75000
      ],
      "id": "proceed",
      "label": "Proceed",
      "standing": "illustrative"
    },
    {
      "flows": [
        -100000,
        60000,
        60000
      ],
      "id": "pilot",
      "label": "Pilot",
      "standing": "illustrative"
    },
    {
      "flows": [
        0,
        -90000,
        80000
      ],
      "id": "defer",
      "label": "Defer",
      "standing": "illustrative"
    },
    {
      "flows": [
        -180000,
        100000,
        120000
      ],
      "id": "scale",
      "label": "Scale",
      "standing": "illustrative"
    },
    {
      "flows": [
        -40000,
        20000,
        30000
      ],
      "id": "redirect",
      "label": "Redirect",
      "standing": "illustrative"
    },
    {
      "flows": [
        -5000,
        0,
        0
      ],
      "id": "stop",
      "label": "Stop",
      "standing": "illustrative"
    }
  ],
  "events": [
    {
      "id": "acquire",
      "kind": "acquisition",
      "period": 0,
      "predecessors": [],
      "standing": "illustrative"
    },
    {
      "id": "onboard",
      "kind": "onboarding",
      "period": 1,
      "predecessors": [
        "acquire"
      ],
      "standing": "illustrative"
    },
    {
      "id": "activate",
      "kind": "activation",
      "period": 1,
      "predecessors": [
        "onboard"
      ],
      "standing": "illustrative"
    },
    {
      "id": "renew",
      "kind": "renewal",
      "period": 2,
      "predecessors": [
        "activate"
      ],
      "standing": "illustrative"
    },
    {
      "id": "churn",
      "kind": "churn",
      "period": 2,
      "predecessors": [
        "activate"
      ],
      "standing": "illustrative"
    },
    {
      "id": "reactivate",
      "kind": "reactivation",
      "period": 3,
      "predecessors": [
        "churn"
      ],
      "standing": "illustrative"
    }
  ],
  "extensions": {},
  "inputs": {
    "acquisitionSpend": 10000,
    "adoption": 0.3,
    "asOf": "",
    "baselineCost": 500,
    "buyer": "Sponsor / operating team / customer organization",
    "candidateCost": 650,
    "capacity": 40,
    "cashConvention": "Incremental to status quo; end-period; t=0 upfront",
    "churnCustomers": 10,
    "churnRevenue": 10000,
    "cohort": "100 synthetic customers; one year",
    "comparator": "Current workflow",
    "contraction": 5000,
    "contributionMargin": 0.7,
    "currency": "USD",
    "discount": 0.1,
    "discountRate": 0.1,
    "economicReview": "pending",
    "eligiblePopulation": 100,
    "evidenceSource": "",
    "exhaustive": false,
    "expansion": 20000,
    "gate": "open",
    "implementationCost": 10000,
    "implementationLag": 1,
    "implementationState": "Illustrative ramp; one-period lag",
    "incrementalOutcome": null,
    "internalInvestment": 100000,
    "intervention": "Bounded workflow pilot",
    "label": "Illustrative pilot versus status quo",
    "listPrice": 1000,
    "newCustomers": 20,
    "newRevenue": 20000,
    "nextEvidence": "Observed workflow and reviewed resource requirements",
    "openingCustomers": 100,
    "openingRevenue": 100000,
    "option": "pilot",
    "outcomeUnit": "",
    "owner": "",
    "period": "year",
    "perspective": "Illustrative provider budget",
    "population": "Synthetic population; local eligibility remains to be specified",
    "priceClass": "Illustrative scenario",
    "pricingUnit": "One synthetic service unit; implementation separate",
    "reactivatedCustomers": 5,
    "reactivationRevenue": 5000,
    "rebate": 25,
    "reviewer": "",
    "revisit": "",
    "segment": "Synthetic implementation partners",
    "serviceCost": 100,
    "taxWorkingCapital": "Synthetic after-tax flows; working-capital changes included once",
    "tenure": 1,
    "trigger": "Review pilot feasibility, evidence, and capacity",
    "variableCost": 200
  },
  "method": "model/activity-based.v0.1",
  "origin": "illustrative",
  "outcomes": [
    {
      "flows": [
        -100000,
        30000,
        30000
      ],
      "id": "constrained",
      "probability": 0.3
    },
    {
      "flows": [
        -100000,
        60000,
        60000
      ],
      "id": "planned",
      "probability": 0.5
    },
    {
      "flows": [
        -100000,
        90000,
        90000
      ],
      "id": "expanded",
      "probability": 0.2
    }
  ],
  "scenarioId": "scenario/investment-pilot.v0.1",
  "schemaVersion": "0.2.0",
  "serviceOutcomes": [
    {
      "baseline": null,
      "candidate": null,
      "name": "Safety",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Quality",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Timeliness",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Patient experience",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Equity",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Efficiency",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Burden",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Governance",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    },
    {
      "baseline": null,
      "candidate": null,
      "name": "Budget capacity",
      "source": "",
      "standing": "unavailable",
      "unit": ""
    }
  ]
}
```

## Boundaries and human-held decisions

Cash flows, pricing, service budget impacts, and staffing references keep their separate ledger meanings until an explicit transformation joins them. Named people authorize assumptions and decisions; evidence of a workflow or product establishes that context, while causal benefit and local applicability require their own observations.

## Requested return

Return findings by domain, identify the evidence each material claim needs, compare supported alternatives using the supplied results, and propose the smallest next decision for the named owner. Preserve units, denominators, periods, explicit zeros, and held-open conditions.

## Related loops

- [Re-enter, make one bounded change, and return it clearly](https://schemas.radiantnull.com/collaboration/#repository-reentry) | Use when the receiving costing decision resumes across sources and accepted revisions.
- [Let real use shape a skill](https://schemas.radiantnull.com/collaboration/#skill-from-receiving-use) | Use when a receiving decision reveals a reusable collaboration move.

## Evidence and recovery

This packet carries the accepted analysis revision identified above. Pending editor drafts remain with their controls. Import the JSON through the existing analysis importer to restore this comparison. Retain the source when an import needs revision. The capsule fingerprint compares the shared Markdown-encoded fields; analysis identity compares the accepted JSON. Exact JSON and source review carry integrity-sensitive exchange.
