# Prompt Capsule Markdown contract

- Identity: `prompt-capsule/0.1.0`
- Version: `0.1.0`
- Format: GitHub Flavored Markdown
- Semantic authority: the named source artifact and its state contract
- Projection role: readable collaboration handoff
- Reference implementation: [Strategy Canvas v0.2.5](../../core-architectures-chimeric-prototype-current-pack-v0.1/strategy-canvas-system-v0.2/README.md)

## Desired receiving state

A person or a bounded generative-system process can read one Markdown document and identify what
the work is for, which source and state it represents, what context matters,
which decisions remain human-held, what return is requested, what evidence
supports the request, and how to recover when a necessary condition remains
open.

The capsule travels as a projection: a derived view of the named state. Editing
or receiving it does not replace the state authority named in its identity
block.

## Minimum form

A conforming capsule contains one level-one title and this compact identity
block:

```markdown
# Prompt Capsule: <readable name>

- Contract: `prompt-capsule/0.1.0`
- Capsule: `<stable capsule ID>`
- Source: `<source artifact ID>@<source version>`
- State: `<state contract or format>` · revision `<source revision>`
- Fingerprint: `<named algorithm>:<content fingerprint>`
- View: `plain` or `skill-assisted`
```

It then contains these sections in order:

1. `## Purpose and target`
2. `## Relevant context and inputs`
3. `## Working state`
4. `## Boundaries and human-held decisions`
5. `## Requested return`
6. `## Evidence and recovery`

Each section carries decision-useful content. An open value is stated as an
open condition with a receiver or clarifying question; empty ceremonial
headings add no useful context.

## Views

The `plain` view is complete on its own. It is the default reading, copy, and
download view and needs no repository-specific helper.

The `skill-assisted` view contains the same source state and core sections,
then adds `## Skill assistance`. Each assistance entry names:

- a public-ready repository path;
- an immutable source revision;
- a short statement of how the skill may shape the requested return.

Skill assistance supplies method context. It preserves the source artifact’s
state, authority, scope, and human-held decisions.

## Optional related loops

A capsule may include `## Related loops` between `## Requested return` and
`## Evidence and recovery`. Each entry names a stable loop ID, a readable
name, a public route, and the condition that makes the loop useful for this
artifact. The loop remains owned by its named source; the capsule points to it
rather than restating its procedure.

Related loops appear in both views because they belong to the artifact handoff,
not to skill assistance. An artifact with no fitting loop leaves this section
out. A generic or ceremonial link does not make a loop related.

## Fingerprint and agreement

Both views use the same fingerprint for the same represented source state. The
fingerprint input contains only the fields intentionally carried by both views,
encoded as their Markdown text and serialized with recursively ordered object
keys. Transient interface state, unshared extensions, the view label,
skill-assistance entries, and related-loop references stay outside the
fingerprint input. Changing materially represented state changes the
fingerprint.

The fingerprint is a comparison key for distinguishing working states that may
share a source ID and revision. Its named algorithm defines how to recompute it.
Integrity-sensitive exchange uses the source artifact’s stronger digest or
exact serialized snapshot when its owner provides one.

For an interactive artifact, the visible Markdown, copied Markdown, downloaded
Markdown, and programmatic Markdown reading agree byte for byte for the active
view. A state export and re-import preserve the fields represented in the
capsule, and a rejected import leaves the accepted state and capsule available.

## Text safety and accessibility

Source-authored text is encoded as literal Markdown text so headings, explicit
links, extended autolinks, mentions, strikethrough, or raw HTML from state
cannot take over the capsule structure or acquire active behavior. Links added
by the artifact owner for skills and related loops remain intentional. Stable
IDs stay visible beside readable labels.

A rendered view selector uses native form controls with a visible group label.
Switching views keeps keyboard focus in place and announces the selected view.
The plain default remains readable and manually copyable when JavaScript is
unavailable.

## Versioning

Patch releases may clarify prose and examples while preserving every required
field and section. A change to required identity fields, section meaning, view
semantics, fingerprint rules, or authority boundaries creates a new contract
version. Historical contracts and checked examples remain addressable at their
versioned paths.
