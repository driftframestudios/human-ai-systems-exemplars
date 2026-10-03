# Protective verification windows: study v0.1

## Current continuation: 2026-10-03

The [current-wave feasibility disposition](epochs/current-wave-feasibility.md)
records nine prospective campaign forecasts, their independently reviewed or
censored terminal dispositions, and the limits of the resulting evidence. The
first accepted family handoff has triggered #320's feasibility review. The
readiness and accounting procedure is retained; effectiveness and calibration
remain indeterminate. This continuation targets `research` from
`res/330-paired-table-replay`, based on merged PR #327 at
`eb195762d206f65299cbcc91ed13c2fa1dbcb786`.

The [paired replay](paired-replay-02/README.md) remains unmeasured and separately
gated. The [shadow protocol](shadow-campaign-protocol.md) retains its reviewed
definition; the dated disposition supplies its subsequent operational history.
The sections below preserve the initial study protocol and its original entry
coordinates rather than replacing them with the latest application revision.

## Purpose and standing

Help a collaboration distinguish a passing check from a coherent handoff, and
reopen the evidence affected by a later finding. The primary outcome is protective:
less premature closure, useful coverage and timely discovery. Fewer invocations
alone can indicate delayed discovery or reduced coverage, so counts stay secondary.

Issue #320 owns this study; #314 and #319 own the table audit and browser contract.
This `res/table-verification-threshold` branch starts at `research` revision
`282205c9b8a4c3f25671a61e7892dbfec3d0fe44`. Accepted application input is pinned to
`main` revision `ce820cc7141e6fc51f208c74cf038b4fd3e4cf1e` in a separate checkout.
The branches retain their different jobs. This research PR targets `research`;
application changes target `main`. Bulk history reconciliation remains a separate
reviewed topology decision. The source inventory began at `7f6fa73e86756687fe07296f210dbaf7e9762d06`.

This is a prospective feasibility protocol for subsequent repair batches. The
initial audit and its harness failures are baseline observations, collected before
this protocol settled. They are excluded from effectiveness inference. Models and
skill instructions are candidates; the current wave establishes their mechanics.

## Protective procedure

1. **Discovery (D):** identify the agreed scope, authored owners, receiving projections,
   material states, fixtures and concrete uncertainties. Run observations that can
   change the next decision.
2. **Repair (R):** consolidate one coherent affected set. Resolve findings and keep
   known unrelated work with its owner.
3. **Verification (V):** form a closure candidate after owner/fixture mapping and
   review. Run the affected-family gate on that candidate. A failure or new finding
   names the evidence reopened and returns the episode to D or R.
4. **Handoff (H):** record the accepted scope, revision, evidence and remaining limits.
   H ends this recorded episode. A later finding creates a linked follow-up episode;
   the recorded handoff remains a historical observation rather than a permanence claim.

Mandatory state-integrity, accessibility, security and publication checks retain
their authority. The last relevant behavior change requires fitting final evidence.
A focused check may happen repeatedly when each run resolves a named uncertainty.
A repeated full campaign needs a changed dependency, coverage question or gate.

## Prospective records

For each decision opportunity, record episode and family, source revision, current
state, scope/coverage signature, coherent change batch, newly changed dependencies,
known findings, named uncertainty, chosen or deferred check, prediction before the
choice, rationale, and the resulting transition. Check records carry campaign ID,
mode, browser launches, scheduled/completed page-state cases, harness/application
outcome, unique consequential findings, elapsed duration and evidence invalidated.

Exposure is time actually at risk for the modeled transition in the named state;
pauses and other states are separate. Missing timestamps remain missing. Follow-up
findings link to the earlier handoff. Record time before and after the first closure
candidate so delaying that candidate cannot masquerade as improvement.

The observation unit is a family/batch or an explicitly defined exposure interval,
not a cell, screenshot or rerun. Preserve within-family dependence and regime
changes. Selection into a check biases yield estimates; skipped cases have unknown
outcomes. An unchanged repeated test is not a new independent opportunity.

## Probability models

### Binary yield and invalidation, kept separate

For a fixed event and comparable opportunity, theta ~ Beta(a,b) and Y|theta ~
Binomial(n,theta) give theta|Y ~ Beta(a+Y,b+n-Y). Check yield means at least one
previously unknown finding changes repair or acceptance. Invalidation means later
work changes the coverage claim. Fit separate models for these different events.

The probability of at least one event in k exchangeable future opportunities is
`1 - B(A, B+k) / B(A, B)`. Exchangeability is an assumption to inspect, not a result
of counting. Begin with Beta(1,1), with Beta(1,3) and Beta(3,1) sensitivity scenarios.
These are elicited assumptions rather than measured skill-effectiveness probabilities.

### Event time and its probability density

For transition events N over T eligible exposure minutes, use a constant-rate
Poisson likelihood within a named regime and a Gamma(a, rate=b) prior:

`A = a + N; B = b + T; lambda | N,T ~ Gamma(A, rate=B)`.

For h further eligible exposure minutes, the predictive waiting-time distribution is:

`P(W <= h) = 1 - (B / (B+h))^A`

`f_W(h) = A * B^A / (B+h)^(A+1)`.

This density has units of inverse minutes. Leaving the at-risk state changes
calendar-time interpretation. Competing exits require a process hitting-probability
calculation. Probability of reopening and expected number of reruns are different
quantities. Compare beta invalidation and event-time invalidation on the same event;
under fixed exposure e and known constant rate, `p_e = 1 - exp(-lambda*e)`.

### Master equation and Kolmogorov equations

For mutually exclusive D,R,V,H states and a row probability vector pi:

`d pi(t) / dt = pi(t) Q`, with nonnegative off-diagonal rates and `Q * 1 = 0`.

Permitted edges are D->R, D->V, R->D, R->V, V->D, V->R and V->H. H closes the
recorded episode. Constant Q assumes memoryless dwell times within that regime.
Inventory completion and accumulated discoveries may violate this assumption;
transition/duration observations come before fitting a forecast.

For a finite homogeneous chain that reaches H with probability one, the transient
backward equation is `Q_T * tau = -1`. A nonsingular Q_T gives expected handoff time.
With uncertain rates, average tau(Q) over their posterior rather than inserting
mean rates. Expectations can diverge: a single Gamma(A, rate=B) exit has
`E[1/lambda] = B/(A-1)` only for A>1. Numerical examples here fix rates and are
illustrations, not posterior forecasts or probabilities that actual work is ready.

### Diffusion comparison

A Fokker-Planck candidate would describe a defensible continuous state x through
`partial_t p = -partial_x(mu*p) + 0.5*partial_xx(sigma^2*p)` with suitable boundaries.
It requires a meaningful measured coordinate, Markov justification, separation of
measurement noise, identified drift/diffusion and enough observations. Present data
supports the discrete process description; diffusion fitting remains deferred.

## Comparison policy and outcomes

Before the first counted repair batch, freeze a baseline of one full affected-family
campaign after each coherent behavior-change batch plus mandatory gates, deduplicated
when the batch and gate coincide. A campaign is one logical invocation; restarts,
launches, cases and durations remain separately counted. Define batch boundaries by
owner/dependency changes before seeing outcomes.

`modeled full campaigns avoided = baseline campaigns - observed full campaigns`.
A negative result is valid. Baseline counts are counterfactual, not observed causal
savings. Compare coverage, late findings, premature closure, reopened evidence and
elapsed effort alongside counts. Do not infer saved human time from wall-clock runs.
This first wave has no completed prospective repair episode and no savings estimate.

Review feasibility after three coherent repair batches or the first table-family
handoff, whichever occurs first. Retain, revise, defer or reject the candidate based
on protection and usable evidence. Broader effectiveness needs additional episodes
and a defensible comparison design.

## Reproducible calculations

Run `node --test research/table-verification-threshold/model.test.mjs` and
`node research/table-verification-threshold/scenarios.mjs`. The pure Node model uses
bounded calculations and analytical fixtures; existing tooling suffices for setup.
Positive shapes/rates and resulting posterior parameters use the explicit range
`[1e-100, 1e6]`; nonnegative horizons, exposures and aggregate transition rates are
bounded by `1e6`. The backward solver rejects pivots below `1e-12` and estimated
infinity-norm condition numbers above `1e10`. These are numerical operating limits,
separate from the mathematical domain. Positive event counts require positive
eligible exposure; missing or rounded-to-zero exposure receives observation repair.
Python/isolated packages can support later estimation when actual data warrants them.

The prior probability that yield exceeds 20% is 80% under Beta(1,1), 51.2% under
Beta(1,3), and 99.2% under Beta(3,1). This spread illustrates assumption sensitivity.
A Gamma(1, rate=60 minutes) prior gives a 1/7 chance of an event within ten eligible
minutes. Neither statement estimates the actual table collaboration's quality.

## Primary method references

- [Stan beta-binomial distribution](https://mc-stan.org/docs/2_28/functions-reference/beta-binomial-distribution.html).
- [Stan posterior predictive sampling](https://mc-stan.org/docs/2_38/stan-users-guide/posterior-prediction.html).

The process equations above are explicitly derived scenario models; independent
review checked their assumptions and the distinction between prior and posterior
parameters. See `publication-outline.md` for the eventual Context Canvas receiver.

## Python reference and parameterized checks

`reference_check.py` is a standard-library exact-rational reference for integer
beta tails, Gamma waiting probability/density, and the fixed-rate backward
scenario. Its comparison requires the complete four-state handoff result.
`test_reference_check.py` exercises complete, truncated, extended, and changed
results through named unit tests and parameterized subcases.

Run from the repository root using an isolated managed Python environment:

```sh
uv run --isolated --no-project --python 3.12 --managed-python -- python research/table-verification-threshold/reference_check.py
uv run --isolated --no-project --python 3.12 --managed-python -- python -m unittest discover -s research/table-verification-threshold -p test_reference_check.py -v
```

The JavaScript suite uses named configuration tables for numerical boundaries,
rate/time scenarios, tiny positive probabilities, and sparse or inherited array
positions. Each failed configuration identifies its parameters. Exact reference
agreement, supported numerical behavior, and empirical study outcomes retain
separate evidence roles.

`observations.v0.1.json` preserves categorized browser attempts and leaves effect
estimates unset. `prototype-trial/prototype-suite-consideration.csv` records 42
declared manifest entries representing 41 distinct source paths; the shared
Threadkeeping Ledger entry appears in both Canvas and Narrative collections.


## Focused epoch-record checks

The active first repair epoch lives on `res/table-repair-epoch-01` in PR #327,
targeting `research`. Its version-2 record separates the immutable entry from
the current summary and preserves one append-only event ledger. Run only its
record and synthetic eligibility fixtures with:

```sh
node --test research/table-verification-threshold/epochs/table-repair-01.test.mjs
```

This focused check covers historical/annotation preservation, event references,
Wave 1/2 count reconciliation, fixture and stub separation, supplied diagnostic
measurements, and eligible-window arithmetic. The epoch now records the parent's
passing application/browser return; handoff exposure remains zero pending receiving
acceptance. Closure/resume diagnostics retain descriptive standing, with paired
replay (#330) and shadow prediction (#331) separately gated. The probability-model
and Python-reference suites retain their existing commands.

## Current-wave shadow campaign adapter

[Prospective campaign observer](shadow-campaign-protocol.md) supplies the bounded
research-only CLI, two-campaign input template and review gate for the current
Core/visitor and Shared/Studio application closures. It reuses `model.mjs` and the
existing epoch ledger; application checks retain authority and paired replay 02
retains its separate frozen, held state.
