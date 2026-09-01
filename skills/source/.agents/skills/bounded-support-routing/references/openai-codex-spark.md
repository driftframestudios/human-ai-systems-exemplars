# OpenAI Codex Spark conditional reference

## Load condition

Load this reference when a bounded support packet selects or considers OpenAI Codex Spark as its receiving collaborator. The portable skill owns the finite packet, action modes, routes, and return. This reference supplies only the platform details that can change independently.

## Current official ground

Official OpenAI documentation currently presents Codex Spark as a fast path for focused coding iteration:

- [Make granular UI changes](https://learn.chatgpt.com/use-cases/make-granular-ui-changes) describes small, focused UI adjustments in an existing application, with one change and one verification loop at a time.
- [Models](https://learn.chatgpt.com/docs/models) currently lists 5.3 Codex Spark as a text-only research-preview model optimized for near-instant, real-time coding iteration and available to ChatGPT Pro users. The page also carries supported surfaces and model-selection guidance.

These details were reviewed on 2026-08-28. Model names, access, surfaces, and recommended uses remain platform-owned facts. Refresh both pages before a materially similar packet relies on a current specification; keep changed facts in this reference so the generic skill remains portable.

## Packet translation for Spark

Spark benefits from a concrete receiving surface and a compact return. Add the following detail when it changes execution:

- identify the repository or worktree, starting branch, and starting revision through public-safe references;
- name the public-safe repository-relative files, component, or question receiving attention;
- write the requested result as one observable state;
- select `observation_only`, `repair_authorized`, `implementation_authorized`, or `recovery_authorized` before listing commands or tools;
- state whether browser observation, file edits, commits, pushes, pull requests, or external actions are granted;
- name the Issue, comment, or other surface that receives the handback;
- state the required post-action response, return format, and stopping event;
- when browser evidence is required, name the authorized browser lane, repository-defined check, public revision, and returned evidence class; and
- make each sequence gate explicit: a stop observation suspends the steps that follow it even when those actions were initially granted.

### Required return

Every Spark packet states the post-action response directly: after performing the named work, post one new `pass`, `friction`, or `blocker` receipt to the named handback surface. The receipt identifies the observed revision, actions actually performed, evidence and outcomes, remaining strain, and smallest available follow-on. An acknowledgement or restatement of the packet is preparation; the lifecycle remains `bounded support: awaiting return` until the post-action receipt arrives.

For a structured return, the packet can supply this compact shape:

```markdown
**Result:** pass | friction | blocker
**Revision observed:** <public branch or revision>
**Observation lane:** local | CI <public workflow/job> | authorized browser worker <public-safe label>
**Checks and evidence:** <repository action or sanitized shape → normalized outcome>
**Remaining strain:** none | <bounded public-safe finding and reproduction shape>
**Smallest follow-on:** none | <bounded proposal>
```

An `observation_only` packet still completes through this receipt. A blocker receipt names the repository-defined action or sanitized command shape, normalized failure class and termination, preserved known-good coordinate, and an executable recovery lane.

### Browser observation lane

The official granular-UI use case includes browser verification. For this repository, a named GitHub-hosted CI job is the standing browser lane. Another browser-capable worker enters only when the packet names it, pins the observed revision, and the human explicitly authorizes that receiver. The packet identifies whether Spark may dispatch the lane or reads an already-produced result, and names the repository check, public-safe target or viewport description, reviewed result or controlled artifact, and handback surface. Browser-launch capability describes the selected worker; filesystem, network, repository mutation, publication, and external-action authority remain limited to the packet's granted operations.

For current Core or Narrative prototype work, the existing [Core and Narrative prototype units](../../../../.github/workflows/prototype-unit-tests.yml) workflow is the standing CI lane. A dispatch packet pins the revision, selects `core`, `narrative`, or `all`, sets `confirm_run=true` and `include_browser=true`, and names the workflow run or controlled artifact that supplies the return. Dispatch is an external action and appears in the grant; an `observation_only` packet reads the resulting run unless dispatch is explicitly authorized.

Local Spark sessions can carry repository reading and other available checks. When a packet has established local browser-launch capability, the same focused browser check can run there. A browser-launch constraint with a named next receiver returns `friction` and that receiver; absence of an authorized executable lane returns `blocker`. When another observation is sufficient, return that evidence instead.

When browser launch itself returns `friction` or `blocker`, the public receipt names the observation lane and OS image; Node, Playwright, and browser channel or build; repository-defined script or sanitized command shape; normalized exit or signal and a bounded failure class; the shortest reviewed error excerpt needed to distinguish the failure; a public-safe candidate reference and public revision; and whether that revision passed in another separately authorized lane.

The public handback omits raw standard output and error streams, credentials, tokens, cookies, authorization or header values, environment values, URL user information, query strings or fragments, private network coordinates, browser-profile directories, and user-specific paths. Raw logs, traces, HAR files, screenshots, DOM snapshots, storage state, and source bundles remain in a separately authorized access-controlled receiver with a stated retention period. Review excerpts for control characters and Markdown delimiters before posting. When one diagnostic rerun is granted, the same focused repository command can run once with `DEBUG=pw:browser`; its public receipt retains the same sanitization boundary. The receipt stops at the named handback, and a lane switch or external dispatch begins only through its own grant.

### `observation_only`

Spark reads, inspects, compares, and returns the expected observation. Repository state remains at the named starting point. A repair opportunity becomes a smallest repair proposal with the exact surface and suggested observation, ready for a follow-on `repair_authorized` packet.

### `repair_authorized`

Spark changes the named surfaces through the granted actions, observes the requested result, and returns at the stated stop condition. Commit, push, pull-request, publication, and deployment actions appear individually when granted; platform or repository labels retain a navigation role while the enumerated actions remain the complete grant. A pre-action stop condition gates those delivery actions rather than merely informing them.

### `implementation_authorized`

Spark creates the named material result within the focal surface, uses only the listed delivery actions, and returns the fitting observation. A product choice, cross-surface refactor, or new external receiver returns for renewed solution routing when it extends beyond the packet.

### `recovery_authorized`

Spark exercises the named recovery action from the stated known-good coordinate, observes the regained state, and returns any remaining strain. Repair and new implementation remain available as successor packets when the recovery result calls for them.

## Issue #12 practitioner observation

A repository-local `#12` support packet requested read-only preflight observations. The packet completed successfully and surfaced a material mismatch, then the collaboration crossed into repair and delivery. This practitioner observation establishes that the original packet left the action transition too easy to infer. Its transfer limit is one repository-local case; general Spark behavior remains an open question.

The receiving improvement is an explicit action mode. `observation_only` now returns the finding and a prepared repair route while repository state remains at the known-good point. `repair_authorized` begins through a fresh grant that names the available edit and delivery actions. The distinction preserves fast support while giving the natural handback a visible edge.

## Issue #196 practitioner observation

A later `repair_authorized` packet supplied an exact base revision, one-file boundary, focused commands, and a sequence for correcting a retained Strategy Canvas receipt. The initial artifact observation matched the packet's stated stop condition: receiver-specific schema locators made the retained artifact 48 bytes longer than its successor counterpart. Spark reported that evidence and the resulting focused-test failure, while also completing the manifest edit and pull-request delivery actions that followed the gate.

This observation's transfer limit is one practitioner case; general Spark behavior remains an open question. The packet needs stop-condition precedence expressed as an execution gate. Once a stop condition forms, the remaining sequence pauses and the named Issue or handback surface receives a concise pass, friction, or blocker result. When the evidence disproves the requested-result premise, a `repair_authorized` or `implementation_authorized` packet returns to Solution before a revised grant begins. A branch or pull request can preserve useful evidence while the named handback still receives the return.

## Issue #73 practitioner observation

A repository-local `observation_only` packet initially received a summary of its working disposition rather than the requested comparison. An explicit post-action comment contract then produced a blocker receipt: the local Spark sandbox could read the repository, while Playwright Chromium exited at launch with a macOS bootstrap permission error. Running the same three contract checks through a browser-capable worker produced a complete `pass` receipt for all four receivers.

This observation's transfer limit is one repository collaboration wave; it does not establish a universal difference among Spark, other Codex models, or every sandbox. The receiving improvement is Spark-specific: state that a fresh post-action receipt is required, and route browser-dependent checks to a named CI or host browser worker at packet formation. The worker's wider launch capability leaves repository mutation, network use, publication, and external writes governed by the packet's explicit grants.

## Refresh and return

Recheck the official pages when a model name, availability claim, supported surface, or recommended workflow matters to the packet. Update this conditional reference when those facts change. The portable contract remains stable unless natural use changes the finite support job itself. Each completed Spark packet returns its pass, friction, or blocker result to the named surface before a successor packet begins.
