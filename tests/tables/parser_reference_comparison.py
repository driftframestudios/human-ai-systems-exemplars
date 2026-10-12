"""Opt-in, local-only #328 extraction comparison; no publication or serialization.

From the repository root (no editable install or production dependency change):
  PYTHONDONTWRITEBYTECODE=1 UV_PYTHON_DOWNLOADS=never uv run --no-cache --no-build \
    --isolated --no-project --python 3.12 --managed-python \
    --with lxml==6.1.3 --with html5lib==1.1 --with six==1.17.0 \
    --with webencodings==0.5.1 -- python -m tests.tables.parser_reference_comparison

Capability question: do recovered HTML trees supply a missing authored-source
patch capability, or only a separate malformed-HTML extraction capability?
Only built-in synthetic strings enter parsers. No file/URL input is accepted.
HTML entities are decoded; XML/DTD processing and DOM serialization are absent.
lxml additionally disables network access and huge-tree mode. The process/RSS
measure includes native allocations; tracemalloc measures Python allocations
only. Neither is a live-memory delta. Timing excludes tracing/import/startup.

Nine fresh measurement workers, one warm-up and three untraced samples each;
four seconds per worker and twenty seconds for the entire measurement phase.
Limits and unequal admission work prohibit a general parser-speed conclusion.
The existing projector/publication suite remains separate evidence.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, replace
import gc
from hashlib import sha256
from html import escape
from importlib import metadata
import json
from pathlib import Path
import platform
import resource
import statistics
import subprocess
import sys
import time
import tracemalloc

from tools import project_table_context as projector


LIMITS = projector.Limits(
    source_chars=65_536, source_bytes=131_072, tag_chars=2_048,
    tokens=8_192, depth=16, label_chars=512,
)
BACKENDS = ("stdlib", "lxml", "html5lib")
SIZES = (8, 64, 256)


def cell(tag, scope, text, colspan="1", rowspan="1", abbreviation=""):
    return [tag, scope, colspan, rowspan, text, abbreviation]


def row(cells):
    return {"identity": [norm(item[5]) or item[4] for item in cells if item[0] == "th" and item[1] == "row"], "cells": cells}


def norm(value):
    return " ".join(value.split())


@dataclass(frozen=True)
class Fixture:
    name: str
    source: str
    expected: list
    standing: str = "projected"
    row_label: str | None = None


def fixtures():
    values = ["", " \t ", "0", "unavailable", "invalid", "inapplicable", "12 (estimated)", "anti<em>body</em>"]
    meanings = ["", "", "0", "unavailable", "invalid", "inapplicable", "12 (estimated)", "antibody"]
    body, records = [], []
    for index, (value, meaning) in enumerate(zip(values, meanings, strict=True)):
        identity = f'Ren\u00e9e "A&B" {index}'
        body.append(
            '<tr><td>2026-01-01</td><th scope="row">' + escape(identity)
            + '</th><td title=\'literal data-label="keep"\' hidden>' + value + '</td></tr>'
        )
        records.append(row([cell("td", "", "2026-01-01"), cell("th", "row", identity), cell("td", "", meaning)]))
    source = "\n".join([
        '<!DOCTYPE html><html><head><title>Local fixture</title></head><body>',
        '<!-- <table>comment-only</table> -->',
        '<script>const marker = "<table>script-only</table>";</script>',
        '<table class="focus"><caption>Costs &amp; evidence<br>reading</caption>',
        '<thead><tr><th scope="col">Date</th><th scope="col">Na<em>me</em><br>identifier</th><th scope="col">Value</th></tr></thead>',
        '<tbody>', *body, '</tbody></table></body></html>',
    ])
    expected = [{"caption": "Costs & evidence reading", "rows": [
        row([cell("th", "col", label) for label in ("Date", "Name identifier", "Value")]), *records,
    ]}]
    yield Fixture("unicode-lf", source, expected)
    yield Fixture("unicode-crlf", source.replace("\n", "\r\n"), expected)
    yield Fixture("unicode-cr", source.replace("\n", "\r"), expected)
    lines = source.split("\n")
    mixed = "\ufeff" + "".join(line + ("\n", "\r\n", "\r")[index % 3] for index, line in enumerate(lines))
    yield Fixture("unicode-bom-mixed", mixed, expected)
    opaque = '<table class="other"><tr><td><table><tr><td>opaque</td></tr></table></td></tr></table>'
    yield Fixture("unselected-nested-owner", source.replace("<body>", "<body>" + opaque), expected)
    compound = (
        '<table class="focus"><caption>Compound</caption><thead><tr>'
        '<th scope="col">Date</th><th scope="col">First</th><th scope="col">Last</th><th scope="col">Value</th>'
        '</tr></thead><tbody><tr><td>2026-01-01</td><th scope="row">Ren\u00e9e</th>'
        '<th scope="row">Ng</th><td>0</td></tr></tbody></table>'
    )
    yield Fixture("compound-offset-identity", compound, [{"caption": "Compound", "rows": [
        row([cell("th", "col", name) for name in ("Date", "First", "Last", "Value")]),
        row([cell("td", "", "2026-01-01"), cell("th", "row", "Ren\u00e9e"), cell("th", "row", "Ng"), cell("td", "", "0")]),
    ]}])
    abbreviated = ('<table class="focus"><caption>Native abbreviation</caption><thead><tr>'
                   '<th scope="col">Name</th><th scope="col">Value</th></tr></thead><tbody><tr>'
                   '<th scope="row" abbr="Human &amp; reader">Person <code>person.role</code></th>'
                   '<td>0</td></tr></tbody></table>')
    yield Fixture("native-abbr-with-visible-field-path", abbreviated, [{"caption": "Native abbreviation", "rows": [
        row([cell("th", "col", "Name"), cell("th", "col", "Value")]),
        row([cell("th", "row", "Person person.role", abbreviation="Human & reader"), cell("td", "", "0")]),
    ]}], row_label="Native abbreviation: Human & reader")
    span = ('<table class="focus"><caption>Span</caption><thead><tr><th scope="col">Name</th>'
            '<th scope="col">Value</th></tr></thead><tbody><tr><td colspan="2">Group</td></tr></tbody></table>')
    yield Fixture("span-owner-review", span, [{"caption": "Span", "rows": [
        row([cell("th", "col", "Name"), cell("th", "col", "Value")]), row([cell("td", "", "Group", "2")]),
    ]}], "owner-review")


def admit(source):
    if len(source) > LIMITS.source_chars or len(source.encode("utf-8")) > LIMITS.source_bytes:
        raise ValueError("experiment source budget")
    if "<!ENTITY" in source.upper() or " SYSTEM " in source.upper() or " PUBLIC " in source.upper():
        raise ValueError("experiment accepts ordinary HTML entities, not external declarations")


def stdlib_snapshot(source):
    parsed = projector.parse_source(source, ("focus",), limits=LIMITS)
    return [{"caption": norm("".join(table.caption)), "rows": [
        row([cell(item.tag, (item.attribute("scope") or "").lower(), norm("".join(item.text)),
                  item.attribute("colspan", "1"), item.attribute("rowspan", "1"), item.attribute("abbr") or "") for item in record.cells])
        for record in table.rows
    ]} for table in parsed.tables]


def dom_text(node):
    # Explicit br boundaries, inline word continuity, and comment exclusion are
    # the comparison's declared extraction semantics, not DOM serialization.
    if not isinstance(node.tag, str):
        return
    if node.text:
        yield node.text
    for child in node:
        if child.tag == "br":
            yield " "
        elif child.tag != "table":
            yield from dom_text(child)
        if child.tail:
            yield child.tail


def dom_snapshot(root):
    result = []

    def rows(node):
        for child in node:
            if child.tag == "table":
                continue
            if child.tag == "tr":
                yield row([cell(item.tag, (item.get("scope") or "").lower(), norm("".join(dom_text(item))),
                                item.get("colspan", "1"), item.get("rowspan", "1"), item.get("abbr", ""))
                           for item in child if item.tag in ("td", "th")])
            else:
                yield from rows(child)

    def visit(node):
        if node.tag == "table":
            if "focus" in (node.get("class") or "").split():
                captions = [item for item in node if item.tag == "caption"]
                result.append({"caption": norm("".join(dom_text(captions[0]))) if captions else "", "rows": list(rows(node))})
            return  # Class ownership is outer-table scoped, including skipped subtrees.
        for child in node:
            visit(child)

    visit(root)
    return result


def extractor(backend):
    if backend == "stdlib":
        parse = stdlib_snapshot
    elif backend == "lxml":
        from lxml import etree

        def parse(source):
            parser = etree.HTMLParser(no_network=True, recover=True, huge_tree=False)
            return dom_snapshot(etree.fromstring(source, parser))
    elif backend == "html5lib":
        import html5lib

        def parse(source):
            parser = html5lib.HTMLParser(tree=html5lib.getTreeBuilder("etree"), namespaceHTMLElements=False)
            return dom_snapshot(parser.parse(source))
    else:
        raise ValueError("unknown backend")

    def bounded(source):
        admit(source)
        return parse(source)

    return bounded


def preserve(source, plan, output):
    """Independent byte cursor oracle, not the production apply/scan helper."""
    old, new = source.encode("utf-8"), output.encode("utf-8")
    char_cursor = byte_cursor = output_cursor = intervals = 0
    for edit in plan.edits:
        assert char_cursor <= edit.start < edit.end
        unchanged_size = len(source[char_cursor:edit.start].encode("utf-8"))
        assert old[byte_cursor:byte_cursor + unchanged_size] == new[output_cursor:output_cursor + unchanged_size]
        byte_cursor += unchanged_size
        output_cursor += unchanged_size
        original, replacement = edit.expected.encode("utf-8"), edit.replacement.encode("utf-8")
        assert old[byte_cursor:byte_cursor + len(original)] == original
        assert new[output_cursor:output_cursor + len(replacement)] == replacement
        byte_cursor += len(original)
        output_cursor += len(replacement)
        char_cursor = edit.end
        intervals += 1
    assert old[byte_cursor:] == new[output_cursor:]
    sentinel = 'title=\'literal data-label="keep"\' hidden'
    assert output.count(sentinel) == source.count(sentinel)
    return intervals + 1


def check_semantics_and_preservation():
    parsers = {name: extractor(name) for name in BACKENDS}
    results = []
    for fixture in fixtures():
        assert fixture.expected and fixture.expected[0]["rows"]
        for parse in parsers.values():
            assert parse(fixture.source) == fixture.expected, fixture.name
        plan = projector.prepare_plan(fixture.source, ("focus",), limits=LIMITS)
        assert [item.standing for item in plan.dispositions] == [fixture.standing]
        output = projector.apply_plan(fixture.source, plan)
        intervals = preserve(fixture.source, plan, output)
        for parse in parsers.values():
            assert parse(output) == fixture.expected, fixture.name + " after patch"
        if fixture.row_label is not None:
            observed = [record.element.attribute("data-label")
                        for table in projector.parse_source(output, ("focus",), limits=LIMITS).tables
                        for record in table.rows if any(item.tag == "td" for item in record.cells)]
            assert observed == [fixture.row_label]
        again = projector.prepare_plan(output, ("focus",), limits=LIMITS)
        assert not again.edits and projector.apply_plan(output, again) == output
        results.append({"fixture": fixture.name, "all_three_semantic_oracles": True,
                        "standing": fixture.standing, "owned_edits": len(plan.edits),
                        "outside_edit_byte_intervals": intervals, "idempotent": True})
    recovery = ('<table class="focus"><caption>Recovery</caption><tr><th scope="col">Name'
                '<th scope="col">Value<tr><th scope="row">A<td>0</table>')
    expected = [{"caption": "Recovery", "rows": [row([cell("th", "col", "Name"), cell("th", "col", "Value")]),
                                                    row([cell("th", "row", "A"), cell("td", "", "0")])]}]
    try:
        parsers["stdlib"](recovery)
    except projector.ProjectionError as error:
        assert error.code == projector.Failure.MALFORMED
        disposition = str(error.code)
    else:
        raise AssertionError("strict source grammar unexpectedly recovered omitted closing tags")
    for backend in ("lxml", "html5lib"):
        assert parsers[backend](recovery) == expected
    return results, {"omitted_end_tags": {"stdlib": disposition, "lxml": "matches_literal_recovery_oracle", "html5lib": "matches_literal_recovery_oracle"}}


def check_budgets():
    source = next(fixtures()).source
    changes = {
        "source_characters": {"source_chars": len(source) - 1},
        "source_bytes": {"source_bytes": len(source.encode("utf-8")) - 1},
        "markup_tag": {"tag_chars": 8}, "tokens": {"tokens": 1}, "depth": {"depth": 2},
        "semantic_label": {"label_chars": 8}, "aggregate_output": {"source_chars": len(source)},
    }
    outcomes = {}
    for name, values in changes.items():
        try:
            projector.prepare_plan(source, ("focus",), limits=replace(LIMITS, **values))
        except projector.ProjectionError as error:
            assert error.code == projector.Failure.LIMIT, name
            outcomes[name] = str(error.code)
        else:
            raise AssertionError(name + " did not reject")
    exact = replace(LIMITS, source_chars=len(source), source_bytes=len(source.encode("utf-8")))
    assert projector.parse_source(source, ("focus",), limits=exact).tables
    outcomes["exact_input_extraction"] = "accepted"
    output = projector.apply_plan(source, projector.prepare_plan(source, ("focus",), limits=LIMITS))
    exact = replace(LIMITS, source_chars=len(output), source_bytes=len(output.encode("utf-8")))
    assert projector.apply_plan(source, projector.prepare_plan(source, ("focus",), limits=exact)) == output
    outcomes["exact_projected_output"] = "accepted"
    return outcomes


def measurement_fixture(count):
    body, records = [], []
    for index in range(count):
        body.append(f'<tr><th scope="row">Row {index}</th><td>0</td><td>unavailable</td><td>Ren\u00e9e &amp; evidence</td></tr>')
        records.append(row([cell("th", "row", f"Row {index}"), cell("td", "", "0"),
                            cell("td", "", "unavailable"), cell("td", "", "Ren\u00e9e & evidence")]))
    headings = ("ID", "Measure", "Status", "Notes")
    source = ('<table class="focus"><caption>Measurement</caption><thead><tr>'
              + ''.join('<th scope="col">' + name + '</th>' for name in headings)
              + '</tr></thead><tbody>' + ''.join(body) + '</tbody></table>')
    expected = [{"caption": "Measurement", "rows": [row([cell("th", "col", name) for name in headings]), *records]}]
    return source, expected


def projector_digest():
    return sha256(Path(projector.__file__).read_bytes()).hexdigest()


def worker(backend, count):
    pinned_digest = projector_digest()
    parse = extractor(backend)  # Imports are outside timing/tracemalloc.
    source, expected = measurement_fixture(count)
    assert parse(source) == expected  # One warm-up, separately from timed samples.
    samples = []
    for _ in range(3):
        gc.collect()
        start = time.perf_counter_ns()
        result = parse(source)
        samples.append((time.perf_counter_ns() - start) / 1_000_000)
        assert result == expected
        del result
    gc.collect()
    tracemalloc.start()
    result = parse(source)
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    assert result == expected
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    if sys.platform != "darwin":
        rss *= 1024  # Supported platforms: macOS bytes; Linux KiB.
    assert projector_digest() == pinned_digest, "projector changed during worker"
    return {"backend": backend, "projector_sha256": pinned_digest, "body_rows": count, "cells": 4 * (count + 1),
            "source_characters": len(source), "source_utf8_bytes": len(source.encode("utf-8")),
            "elapsed_ms_samples": samples, "elapsed_ms_median": statistics.median(samples),
            "python_tracemalloc_peak_bytes": peak, "process_peak_rss_bytes": rss}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker", choices=BACKENDS)
    parser.add_argument("--rows", type=int, choices=SIZES)
    args = parser.parse_args()
    if sys.flags.optimize:
        parser.error("assertion oracles require ordinary, non-optimized Python")
    if sys.platform not in ("darwin", "linux"):
        parser.error("RSS units are declared only for macOS and Linux")
    if args.worker:
        if args.rows is None:
            parser.error("worker requires rows")
        print(json.dumps(worker(args.worker, args.rows)))
        return
    if args.rows is not None:
        parser.error("rows is a worker-only parameter")
    pinned_digest = projector_digest()
    parity, recovery = check_semantics_and_preservation()
    budgets = check_budgets()
    measurements = []
    deadline = time.monotonic() + 20
    for count in SIZES:
        for backend in BACKENDS:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("comparison measurement budget exhausted")
            completed = subprocess.run(
                [sys.executable, "-m", "tests.tables.parser_reference_comparison", "--worker", backend, "--rows", str(count)],
                check=True, capture_output=True, text=True, timeout=min(4, remaining),
            )
            measurement = json.loads(completed.stdout)
            assert measurement["projector_sha256"] == pinned_digest, "worker used another projector revision"
            measurements.append(measurement)
    assert projector_digest() == pinned_digest, "projector changed during comparison"
    from lxml import etree
    print(json.dumps({
        "question": "strict authored-source patching versus tolerant extraction-only recovery",
        "versions": {"python": platform.python_version(), "implementation": platform.python_implementation(),
                     "system": platform.system(), "machine": platform.machine(),
                     **{name: metadata.version(name) for name in ("lxml", "html5lib", "six", "webencodings")},
                     "libxml2_runtime": list(etree.LIBXML_VERSION)},
        "projector_sha256": pinned_digest,
        "fixture_limits": vars(LIMITS), "semantic_parity_and_current_patch_preservation": parity,
        "recovery_capability": recovery, "current_projector_budgets": budgets,
        "reference_serialization": "not performed; no source-preservation claim",
        "timing_contract": "parse plus common semantic extraction, one warm-up, median of three untraced samples; imports/startup excluded; stdlib includes its additional admission/digest work",
        "memory_contract": "separate one-call Python tracemalloc peak and fresh-process lifetime RSS high-water including imports, warm-up, native allocations, and tracing; not incremental live memory",
        "measurements": measurements,
        "decision": "retain source-preserving projector; reference recovery is a separate extraction capability, not a patch-route replacement",
    }, indent=2))


if __name__ == "__main__":
    main()
