# Middleware and backend-for-frontend probes

These probes connect an interface state to the projection, cache, retry, and
receipt rules that can produce it. Use the smallest question that changes an
implementation decision.

Public continuation: [Client Middleware, BFFs & Service Contracts](https://kindlight.systems/visual-fidelity-contracts/visual-fidelity-practitioner-probes-layered-judgment-evidence/visual-fidelity-probes-client-middleware-bffs-service-contracts).

## Projection and policy

**Question:** Which role, tenant, policy revision, and representation define
the returned fields?

**Why it matters:** A visually coherent panel can still carry fields intended
for another receiving role.

**Mechanism:** The backend-for-frontend (BFF) admits a task-specific request,
evaluates policy, and projects an authorized response data-transfer object
(DTO). Cache identity includes every dimension
that can change the projection.

**Observable evidence:** Two roles request the same source revision. Their
allowlisted fields and cache identities differ exactly as the policy fixture
declares.

**Instruction yield:** Define the projection schema and scoped cache key before
the component binds fields.

Keep projection internals out of visitor-visible diagnostics. A held or denied
projection may retain an opaque transition standing while actor, tenant,
idempotency, receipt, and generated-content fields remain with their authorized
owners. Admit public-safe issue text before it enters logs.

## Idempotent command and receipt

**Question:** What durable identity lets a retry return the original effect?

**Why it matters:** A transport retry can otherwise create a second mutation.

**Mechanism:** The command binds an idempotency key to its immutable admitted
request meaning and stores the durable receipt. A compact fingerprint supports
tracing; replay eligibility compares the closed request fields. A reused key
with changed meaning becomes a typed conflict.

**Observable evidence:** Replaying the accepted command yields the first
receipt and accepted revision; a changed ID or semantic field yields
`IDEMPOTENCY_CONFLICT`.

**Instruction yield:** Make the receipt the replay response and keep the
idempotency window explicit.

Settle a pending or failed outbox handoff before another durable effect replaces
the active handoff identity. Replays may return the accepted receipt while
preserving the delivery issue that still needs recovery.

Keep delivery, request, bounded-caller, and late-result eligibility issues in
independent channels. A retry clears the channel it settles while the remaining
recovery routes stay available. A compact interface may select one primary
issue from that record; its machine-readable companion carries the complete
active set.

## Partial response and retry

**Question:** Which partial fields remain eligible after timeout or policy
change?

**Why it matters:** A partial result can appear complete when the interface
collapses failure shapes.

**Mechanism:** Typed issues identify the failed stage, retained accepted state,
and one recovery route. Eligibility remains bound to source identity and
revision.

**Observable evidence:** A controlled timeout releases the candidate
connection, keeps the accepted record visible, and labels the retry boundary.

**Instruction yield:** Render accepted values and candidate issues as separate
states, then retry from the current accepted revision.
