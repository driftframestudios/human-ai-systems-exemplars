# Table reading contracts

These operations protect local table meaning and reading geometry. Authored
HTML and the owning generators remain the semantic authority.

## Python component entry

From the repository root, select one existing component or explicitly select
`all` through the standard-library [component entry](run_components.py):

- `parser`: [semantic table parser fixtures](prototype-labels/test_parser.py).
- `hiring-table-media`: [hiring table/media source fixtures](test_hiring_table_media.py).
- `table-context`: [source-preserving projector fixtures](test_table_context.py).
- `visitor-labels`: [visitor-label inventory fixtures](visitor-labels/test_visitor_labels.py).
- `all`: those four components, once each, in the order above.

```sh
PYTHONDONTWRITEBYTECODE=1 uv run --isolated --no-project --python 3.12 --managed-python -- python -m tests.tables.run_components table-context
PYTHONDONTWRITEBYTECODE=1 uv run --isolated --no-project --python 3.12 --managed-python -- python -m tests.tables.run_components all
```

The entry uses exact existing unittest discovery patterns and reports each
selected component's discovered case count. Every selected component must be
nonempty before any test body runs. Selection does import the selected modules;
it is execution preparation, not a metadata-only planner. Missing or unknown
selection, an unavailable discovery directory, or an empty component returns
exit status `2`. Native assertion failures and discovered import errors return
`1`. Native unittest success returns `0`; skipped cases remain explicitly
reported and do not establish that their assertions executed.

The entry's independent fixtures cover exact module/case identities, an
unselected import trap, per-component empty discovery, failure propagation and
native skip reporting:

```sh
PYTHONDONTWRITEBYTECODE=1 uv run --isolated --no-project --python 3.12 --managed-python -- python -m unittest discover -s tests/tables -p test_component_entry.py -v
```

These entry fixtures are separate from `all`, which preserves the four existing
components. Their original direct unittest commands remain compatible. A single
focused module remains a complete route when it answers the question; this
entry adds explicit selection, not new domain expectations. Browser geometry,
the optional parser comparison below, and independently governed nested Python
projects retain their existing owners and admission routes.

## Existing browser and source routes

```sh
PYTHONDONTWRITEBYTECODE=1 uv run --isolated --no-project --python 3.12 --managed-python -- python -m unittest discover -s tests/tables -p test_table_context.py -v
node tools/table-reading-contract.mjs --mode fixtures
node tools/table-reading-contract.mjs --mode focused --family conditioning
node tools/table-reading-contract.mjs --mode closure --family all
node --test tests/tables/*.test.mjs
node tools/core-planning-instrument-contract.mjs --artifact sharedSurface --resume
node tests/tables/conditioning.browser.mjs --resume
```

`project_table_context.py` derives supplemental labels for selected simple,
captioned tables from authored native headers. `--check` compares the projection;
complex tables retain an explicit source-owner review disposition. The Python
fixtures preserve blank, zero and the named status values.

The browser observer checks tokens in every cell, including the rightmost
column. Its positive and negative fixtures establish readable local scrolling,
ordinary-word and numeric fragmentation, separate identifier review, detached
record values, and initial hidden-state accounting. Geometry remains a triage
signal, with source-owner interpretation for identifiers and complex content.
Text inside `pre` and `code` remains identifier/literal review, including prose
prompts; the word-fragment verdict covers ordinary table text outside those
literal carriers. This exclusion keeps exact prompt/code formatting with its
source owner. The verdict also includes keyboard reach, clipped controls,
unobserved table states, page overflow and runtime errors. Declared table counts
and an authored document heading protect each family from empty observations.
Shared Surface's scriptless case observes its authored Prompt Capsule; its two
runtime tables remain explicitly outside that static view.
The existing planning-instrument contract accepts one `--artifact` and optional
`--resume`; its full inventory remains the default. Completed material-behavior
journeys are checkpointed after their source-bound assertions finish.

`focused` covers the named first repair families and actual parent/packaged-child
composition. `closure` adds scriptless, print, forced-color and enlarged-text
cases. `discovery` retains review candidates without making them a failing gate.
`--family` accepts `conditioning`, `shared`, `investment`, or `all`.

Each completed case is appended to ignored `.visual-runs/` evidence. Use a fresh
`--output .visual-runs/<campaign>` for a new campaign; `--resume` continues that
directory. Atomically published checkpoints reuse completed cases while the
case parameters, harness, runtime identity and requested source/package bytes
agree. Changed inputs and incomplete cases run again. `--case <exact-id>` selects
one observation. Attempt summaries retain reuse, new cases and browser launches
separately; a fully reusable campaign launches zero browsers. Temporary writes
remain separate from accepted checkpoints. Parent checks
fulfill public iframe requests with current local package bytes and keep the
declared sandbox. External resources receive local empty responses, so font
fallback and local composition remain explicit evidence boundaries. Hosted
delivery, assistive-technology use and unexercised interactions retain separate
receivers.

Return to the [repository check guide](../README.md) for existing stateful,
packaging and delivery contracts.

The versioned [source-bound campaign stages](PIPELINE.md) describe exact planning,
complete-generation publication, dependency invalidation and interrupted-run
recovery. `--plan` prints the requested cases while browser execution remains idle.

The [Python source-preservation contract](python-source-preservation.md) owns the
projector's admitted HTML shape, bounded allocation, exact-byte edit and atomic
publication behavior, together with its focused isolated-Python command.

## Optional parser reference comparison

`parser_reference_comparison.py` compares the current source-preserving projector
with extraction-only lxml and html5lib references on bounded local fixtures.
Run it when a parser adoption decision needs this evidence; it stays separate
from routine browser or source acceptance.

```sh
PYTHONDONTWRITEBYTECODE=1 UV_PYTHON_DOWNLOADS=never \
uv run --no-cache --no-build --isolated --no-project \
  --python 3.12 --managed-python \
  --with lxml==6.1.3 --with html5lib==1.1 \
  --with six==1.17.0 --with webencodings==0.5.1 \
  -- python -m tests.tables.parser_reference_comparison
```

The #328 comparison retains the standard-library projector. Eight fixtures
matched literal semantic expectations across all three parsers before and after
projection; 197 outside-edit byte intervals, 189 edits and idempotence checks
established the current patch route's preservation boundary. Both references
recovered one omitted-end-tag fixture that the current route explicitly returns
to its source owner. That tolerance is a different capability from preserving
authored serialization.

The comparison separates extraction timing, Python-traced peak allocation and
process RSS high-water measurements. The current parser also performs lexical
admission and digest work; these observations leave equivalent end-to-end
projection throughput unspecified. Reference serialization remains outside this
experiment. The fixture and worker budgets bound the local operation, and pinned
reference packages live in isolated uv execution rather than prototype runtime
dependencies. The receiving PR carries the source coordinate and normalized
measurement result.
