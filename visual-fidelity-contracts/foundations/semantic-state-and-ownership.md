# Semantic state and ownership

An interface becomes dependable when each visible state has one meaning, one
source owner, and one recovery route. Visual treatment projects that state.
Named domain owners establish authorization, scientific validity, and durable
transaction status.

## State layers

| Layer | Owns | Interface projection |
| --- | --- | --- |
| Accepted state | The named domain or application owner | Accepted revision, timestamp, values, and receipt reference |
| Draft state | The current editing context | Changed fields, validation, dirty state, and restore action |
| Request state | The caller or transport boundary | Pending, succeeded, failed, cancelled, and request identity |
| Service state | The receiving service | Availability, bounded error, retry posture, and service owner |
| Authorization state | The policy and identity owner | Permitted action, blocked action, approver, and escalation route |
| Evidence state | The named evidence source | Observed, synthetic, reconstructed, proposed, stale, or open standing |
| Presentation state | The component or route | Focus, selection, expansion, order, local overflow, and announcement |

The same person or system may carry several roles. The contract names the roles
separately so a later handoff can preserve the distinction.

## Accepted work stays stable

Loading, validation, service failure, and recovery preserve the last accepted
state. Draft values remain visibly distinct. A retry keeps its request identity;
a restore action names the accepted revision it returns. This separation makes
interrupt, resume, and comparison behavior inspectable.

The shared [`lab-state.schema.json`](../schemas/lab-state.schema.json) models:

- accepted values and their fingerprint;
- draft values and dirty state;
- one bounded request and status;
- messages with source identity;
- available recovery actions and the current next action; and
- decision, data, and service authority.

## Visible state vocabulary

`idle`, `available`, `hover`, `focus`, `selected`, `disabled`, `loading`,
`empty`, `partial`, `stale`, `invalid`, `error`, `recovering`, `recovered`,
`accepted`, and `held` form the shared vocabulary. A contract uses the states
that change its behavior and explains each state with written text, geometry,
and an action or boundary.

Color reinforces a state. Labels, native semantics, order, border treatment,
and status text preserve its meaning when color or motion changes.

## Error and recovery route

An error message names:

1. the operation and object affected;
2. the accepted state still available;
3. the responsible layer or owner;
4. the fitting retry, restore, edit, reopen, or contact action; and
5. the observation that will establish recovery.

The component keeps focus near the affected control or moves it to the recovery
message when that transition best supports the next action. A polite live region
announces one concise status change. Repeated visual text stays out of the live
announcement.

## Review probe

1. **Question:** Which layer can produce the observed stale or failed state?
2. **Mechanism:** Trace component state, request identity, accepted revision,
   service response, authorization source, and evidence owner.
3. **Observable evidence:** A controlled failure preserves accepted work,
   identifies its owner, exposes one valid recovery route, and announces the
   resulting state once.
4. **Instruction yield:** Place the repair with the layer that owns the state
   while the component projects its bounded status and recovery.

## Re-entry

A changed state meaning, request lifecycle, authority source, recovery action,
or assistive-technology observation reopens this foundation.
