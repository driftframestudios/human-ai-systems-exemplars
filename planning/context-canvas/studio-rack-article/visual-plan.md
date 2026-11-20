# Visual plan for the Studio Rack collaboration Article

The visual system lets another hybrid team inspect a consequential choice,
follow its source and imagine a fitted change to its own workflow. Each view
answers a distinct question and remains revisable during conversational ideation.
The [receiving plan](README.md) owns the future Article cue, paired five-beat
structure, prominent lined-paper/triangular art direction and journaling method.

## Page, screen and section treatment

Use the actual
[Prompt-Side Practice page](../../../context-canvas-project-surface/context-canvas/prompt-side-conditions-practice.html)
and its [route CSS](../../../context-canvas-project-surface/context-canvas/prompt-side-conditions-practice.css)
as the visual authority. Preserve the ruled-paper reading surface, margin rules
and offset triangular/diagonal fields as major composition features. Alternate
these with broad paper, sky and mint sections to give the eye variation and a
clear receiving area. Keep the underlying treatments visible around instruments
and between sections, rather than reducing the reference to isolated cards.

Written Solution and Implementation headings distinguish the phases. Beat
headings open their reading regions before columns or companions. Figure fields
can be wide while adjacent prose retains a comfortable measure. The ruled and
triangular geometry remains quiet beneath labels and data-bearing marks. The
intended eye-guiding role receives visual review; the design reference alone
does not establish a measured attention effect.

Conversational figures use their host's accessible theme while exploring data and
relationships. Their later Article receivers adopt the selected page treatment;
chat figures are not final art-direction proofs or an Article draft.

## Candidate view family

| View and reader question | Basis and interaction | Likely beat and useful boundary |
| --- | --- | --- |
| Material treemap: what makes up this version? | Select `main` or `dev`; area represents snapshot file bytes, grouped by authored source, tests, research/contracts, generated and mixed hosts, vendor records and shared About. Select a role to recover exact values. | Implementation Outcomes. Bytes describe stored material; generated copies remain separately visible. |
| Change map: where did recorded edits concentrate? | Use text additions/deletions by unique full-history commit and path, with initial import and generated projections separately selectable. | Implementation Intervention/Outcomes. Changed lines and snapshot bytes have separate units; squash promotions can repeat patch content. |
| Branch movement: how did a study reach a receiver? | Select a PR event to inspect its actual head/base, merge standing and source. Distinguish topic delivery, reference promotion, integration and open research. | Both Intervention beats and Implementation Outcomes. Event order can use uniform spacing when explicitly labelled; time axes preserve actual spacing. PR references are not inferred dependencies. |
| Nightingale rose: what concerns occupied the selected records? | Use mutually exclusive bug-tagged/other Issues in a declared corpus and time window; equal-angle sector areas, rather than radii, encode counts. A month is a creation cohort with current labels. | Implementation Outcomes. Partial periods, current labels and the denominator remain visible. Overlapping label memberships use independent facets. |
| Studio system graph: how do the chapters cooperate? | Select chapters, accepted state, draft/recovery, calculations or export; trace typed relationships with a complete semantic companion. | Implementation Debrief/Intervention. The Who to Believe pattern informs interaction; its case-specific validator is not a generic Studio graph owner. |
| Repository and re-entry map: how does a later collaborator find and use the work? | Expand selected folders and choose a file to reveal its authority, JavaScript collaborators, planning/journal relationships and next reading route. | Implementation Debrief/Repeatability. A selected ownership map is distinct from a complete filesystem inventory or an execution trace. |
| Paired before/after: what did the design correction change? | Compare preserved dial-lighting, cassette, contextual-return or participation states. Attach the decision and affected behavior. | Solution Intervention, revisited in Implementation Intervention. Comparable states and source revisions accompany each capture. |
| Two-phase episode navigation: what can this team adapt? | Revisit one source-supported episode through Solution and Implementation, then open its source and continuation. | The complete reading. Editorial selection and conceptual relations remain explicit. |
| Episode scatterplot: how many recorded questions and commits does an episode connect? | Each selected episode has distinct addressed Issues on the horizontal axis and distinct commit SHAs from its selected PRs on the vertical axis. Select an episode to recover its scope and source records. | Both Intervention beats. This is a curated relationship view; PR commit membership includes the packaging and promotion of earlier work. |
| Issue-to-PR map: which change addresses which question? | Follow reviewed, typed relationships between Issues and PRs within an episode. Distinguish addressing work, context, successor work and explicitly separate scope. | Implementation Intervention/Repeatability. A reference becomes a counted addressing relation only after reading its source. Partial delivery retains that standing. |
| Work distributions: how does the recorded change vary? | Switch between commits per merged PR and files changed per merged PR; inspect the full population and a declared detail selection with the showcase promotion separately identified. | Implementation Outcomes. Boxes summarize delivery records; individual observations and source identity preserve the route into a concrete episode. |

The first chat exploration includes a material treemap, PR movement view,
creation-period rose and interactive repository/re-entry map. Later selection
can retain, combine or retire a view according to the reader question. A range
of exploratory forms does not require every chart to appear in the Article.

## Expanded exploration: episodes, relationships and distributions

The human-confirmed route is **episode scatterplot → selected Issue-to-PR map →
optional distribution view**. The overview opens a question about method; the map
shows the recorded relationship; a distribution supplies context for variation.
Each view remains useful on its own in chat. A future Article can coordinate
selection across the three after the human drafting cue.

The [episode extract](data/episodes.2026-11-09.json) preserves a bounded, editorially
selected set of source-reviewed relationships and the complete commit membership
of its selected PRs. It supplements the earlier frozen extract. The earlier
unclassified body-reference edges keep their original standing.

### Episode counting and relationship meaning

- Count distinct Issues with a reviewed addressing relationship to the episode's
  selected PRs. Keep context, successors, deferred work and reference-only edges
  available in the map while excluding them from this addressing count.
- Count the union of commit SHAs returned for the selected PRs. Name this measure
  **PR commit objects**, with an explicit alternative for **nonmerge PR commit
  objects**. The showcase promotion contains 127 member objects: 71 nonmerge and
  56 merge records. The compact-rack receiving PR #815 contains three member
  objects: two nonmerge and one merge record. A squash merge's receiving commit and an earlier branch
  commit have different identities and jobs; receiving-branch commit counts need
  their own explicit selection.
- Preserve shared Issues and commit membership across episodes. Per-episode
  values can overlap; a collection total deduplicates the union again. A PR that
  advances part of an Issue retains its partial-delivery explanation.
- An episode is an editorial grouping, not an independent statistical sample.
  Keep actual coordinates when episodes coincide. A native selector and grouped
  point inspection recover every episode without inventing quantitative spacing.
- Keep the showcase promotion identifiable in both the full view and any focused
  detail view. The latter declares its excluded point and retains the promotion's
  exact value and public source beside the selection.

The relation map uses written relationship names with visual distinctions. Its
public links open the corresponding Issue or PR; new-tab behavior is indicated.
The selected episode supplies a complete text route through the relationships,
including the reason a contextual reference stays outside a count. Missing or
unreviewed linkage remains unresolved rather than becoming a zero-work finding.

### Distribution contract

The first box plots use the earlier snapshot's **107 merged milestone-23 PRs**.
Each PR supplies one observation for either commits or files changed; a measure
switch updates the title, unit, values and interpretation together. The full
population retains the 127-commit, 184-file showcase promotion #707. The readable
opening view uses **files changed per PR for the other 106 PRs**, with the
promotion's exact values and public source separately visible. The full 107-PR
population remains selectable. A compatible saved selection takes precedence
over the opening default.

Use linearly interpolated quartiles at `(n - 1) × p`. A box spans the first to
third quartile, with a median line. Tukey whiskers end at the most extreme observed
values within 1.5 interquartile ranges of the box; outside observations stay
inspectable. Show the admitted population and `n`. A point beyond a whisker invites
source reading; its position alone supplies no error or performance judgment.

Counts and changed-file breadth describe recorded delivery. Their different
units remain separate from working hours, contribution shares or a combined
effort score. Sparse or zero-width boxes retain exact values and individual
observation access. Potential later measures include scoped paths or textual
changes per commit, and consistently extracted decision or review events per
episode. Elapsed Issue lifetime receives a calendar-time label and a separate
standing for ongoing work.

### Readable default and saved selections

The human accepted the repaired conversational box plot on 9 November 2026.
Its receiving requirements are:

- Give the box, median, whiskers and outside observations enough plotting space
  to inspect at narrow and desktop widths. Keep the current population, axis
  rescaling and separately displayed promotion visible. Display the median and
  middle-half range as readable values beside the plot.
- Preserve the chosen measure, population and source PR when the host returns a
  saved-selection update. Restore compatible choices from either the direct
  state object or its `modelContent` envelope; a valid full-population choice
  remains a full-population choice.
- Version the saved-selection contract. The repaired exploration uses version 2.
  For an older saved selection, retain a valid measure and source PR while
  adopting the readable detail default. During interaction, unrelated, malformed
  or older-version echoes retain the active choices.
- Keep restoration separate from saving. Save meaningful user changes; apply a
  returned selection without resaving it. Update the plotted configuration,
  native controls, units, population, summary values and source link together.
- Make both measures work in both populations. Exercise commits/files ×
  detail/full with a host-style saved-state envelope returned immediately after
  selection, then inspect the settled chart marks as well as the control values.

The accepted repair corrected a state reader that treated an enveloped return as
an unrelated state and reset both selectors. A focused Chromium observation
established all four measure/population combinations, immediate envelope echoes,
source-PR selection and containment at 320 and 736 pixels. Independent checks
reconciled the raw populations, quartiles, versioned restoration and unrelated
echo handling. The observation covers the conversational specimen; the future
Article retains its own rendered interaction and composition acceptance.

Before reusing these views in the Article, reconcile selected Issue/PR relations,
paginate commit membership to completion, check shared-SHA arithmetic, and inspect
coincident-point access and the full/detail population changes. Then apply the
already selected lined-paper, margin-rule and triangular page treatment to the
receiving composition. The chat views supply exploratory evidence for this visual
plan; Article prose and publication continue on their existing human cues.

## Data, labels and companions

Use the [dated extract](data/README.md) as an immutable starting snapshot.
Source identity, observation date, record unit, inclusion rule, denominator and
transformation accompany each displayed value. Preserve these distinctions:

- Full-history commit records versus unique patch content or work acts.
- Current file bytes versus changed lines, network payload or working time.
- Unique Issues, PRs and overlapping label memberships.
- Current labels and milestone assignments versus dated transition events.
- Recorded zero, missing data, incomplete periods and the open future endpoint.
- A body reference, an accepted Git parent edge and an editorial relation.

Native semantic tables or relationship lists preserve the essential reading.
Selected values and keyboard access remain available independently of hover.
Selection updates headings, marks, values and companion text together. Motion
supports state changes and respects reduced-motion preferences; charts keep
their meaning in print, forced colors and scriptless reading where applicable.

## Existing production routes

- [Data visualization foundations](../../../.agents/skills/data-visualization-foundations/SKILL.md),
  [conversation visualization](../../../.agents/skills/conversation-data-visualization/SKILL.md)
  and [web visualization](../../../.agents/skills/web-data-visualization/SKILL.md)
  separate source meaning, exploration and receiving-page production.
- [Semantic table design](../../../.agents/skills/semantic-table-design/SKILL.md)
  supplies recoverable values and relationships.
- [uv-backed execution](../../../.agents/skills/uv-backed-python-execution/SKILL.md)
  and the conversation skill's isolated-Python route support fitted Python work.
- [Media publication](../../media-publication/README.md) owns responsive raster
  and WebP derivatives, accessible video, R2/Wrangler delivery and versioned
  publication. Human-supplied videos enter that existing route when selected.
- [Impact Map movie sources](../../../collaboration/impact-map-visual-variants/movie/render_style_cycle_movie.py)
  preserve headless-browser, image, audio and movie composition precedents.
- [Context Canvas runtime contract](../../../context-canvas-project-surface/context-canvas/README.md#runtime-contract)
  identifies the Who to Believe graph pattern and the reproducible About sequence.

## Proportionate observation and re-entry

Before a figure enters the Article, reconcile its derived values with a small
independent source sample and inspect its actual marks, selection and companion.
Check the affected phone/desktop composition, keyboard route, readable labels,
reduced motion, forced colors and print as appropriate to that figure. Observe
the selected page/section treatments together with the figure: ruled lines and
triangular fields should remain legible without competing with information.

The future Article's data update is a deliberate receiving event. Preserve this
snapshot, select the human-approved final source revision, refresh the named
populations and document changed scope before comparing versions. Keep public
extracts locator-safe and route any exact private lineage to its existing owner.
