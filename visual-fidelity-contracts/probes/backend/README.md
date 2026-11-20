# Back-end runtime and transaction probes

These probes make resource lifetime and transaction eligibility visible at the
interface boundary. They describe framework-neutral ownership first, then bind
examples to reviewed framework versions.

Public continuation: [Back-End Runtime, Transactions & Framework Boundaries](https://kindlight.systems/visual-fidelity-contracts/visual-fidelity-practitioner-probes-layered-judgment-evidence/visual-fidelity-probes-back-end-runtime-transactions-framework-boundaries).

## Transaction span

**Question:** Which reads and writes must commit together, and which external
work can complete after the transaction releases its connection?

**Why it matters:** A broad transaction holds scarce resources and can join a
remote timeout to a database rollback.

**Mechanism:** One application operation opens the transaction, performs its
atomic persistence work, records an outbox event, commits or rolls back, and
returns the session or connection. External delivery consumes the committed
outbox record.

**Observable evidence:** Controlled commit and rollback both return the
connection. Commit creates one accepted receipt and a pending outbox record;
rollback preserves the prior accepted revision.

**Instruction yield:** Draw the transaction boundary around the atomic database
work and give external I/O its own recoverable handoff.

The executable lab also drives the outbox through pending, failed, retried, and
published states. Every delivery attempt retains the committed receipt and the
same outbox identity.

## Framework lifetime receipt

| Adapter guidance | Documentation target | Ownership statement | Required receiving observation |
| --- | --- | --- | --- |
| SQLAlchemy | [2.0 documentation series, Session basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html), reviewed 2026-10-20 | One `Session` per thread and one `AsyncSession` per task; the application releases each through its context boundary | Record the installed patch version, concurrent-task instance identities, exit path, and connection return in the receiving adapter |
| Django | [5.2 documentation series, async support](https://docs.djangoproject.com/en/5.2/topics/async/), reviewed 2026-10-20 | A synchronous transaction function owns atomic database work when called from an async flow | Record the installed patch version and show commit or rollback before control returns to unrelated async I/O |

These rows identify documentation targets for a future receiving adapter. This
browser lab executes a framework-neutral model. A receiving adapter establishes
SQLAlchemy or Django behavior. Its receipt becomes complete when it names
the installed package patch version, runtime, observation date, test oracle,
and owner that can reproduce the result.

## Pagination under change

**Question:** Which stable sort key and continuation identity preserve traversal
when records arrive between requests?

**Why it matters:** Offset-only pagination can repeat or skip records under
concurrent writes.

**Mechanism:** A cursor carries the declared sort tuple and snapshot revision.
The next request derives its boundary from that cursor and rejects a competing
snapshot value.

**Observable evidence:** A controlled insert between pages preserves every
eligible record exactly once under the named continuation rule.

**Instruction yield:** Bind the cursor schema to the sort contract and include
the compatibility window in mixed-version migrations.

The local model supplies a snapshot revision, stable sort tuple, and bounded
cursor. Its v1 and v2 adapters normalize only their declared fields, attach the
source version, and route another schema version through a typed admission
issue.
