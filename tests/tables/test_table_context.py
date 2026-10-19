"""Run from the repository root with python -m unittest discovery."""
from dataclasses import FrozenInstanceError, replace
from html import escape
import io
import itertools
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stdout

from tools import project_table_context as projection
from tools.project_table_context import (
    DEFAULT_LIMITS, Edit, Failure, ProjectionError, apply_plan, parse_source,
    prepare_plan, project, with_label,
)


def table(value="0", *, topic="Costs &amp; evidence", identity="Pilot", attributes=""):
    return (
        '<table' + attributes + '><caption>' + topic + '</caption><thead><tr>'
        '<th scope="col">Choice</th><th scope="col">Value (USD)</th>'
        '</tr></thead><tbody><tr><th scope="row">' + identity + '</th><td>'
        + value + '</td></tr></tbody></table>'
    )


def generated_sources():
    """Finite grammar: 4 text atoms x 3 gaps x 4 attributes x 2 prefixes."""
    for atom, gap, attribute, prefix in itertools.product(
        ("", "0", "unavailable", "caf\u00e9 \U0001f9ea &amp; evidence"),
        (" ", "\n", "\r\n"),
        ("", ' title="keep data-label=\'x\' > literal"', " data-label", ' DATA-LABEL="a" data-label=b'),
        ("", "\ufeff<p>\u03bb\r\noutside</p>\r"),
    ):
        source = table(escape(atom), identity=escape(atom))
        source = source.replace("<td>", "<td" + attribute + gap + ">")
        yield prefix + source + "\r\n<!-- after -->"


class TransformationContract(unittest.TestCase):
    def test_native_semantics_and_labels_match_known_example(self):
        source = table()
        expected = (
            '<table><caption>Costs &amp; evidence</caption><thead><tr>'
            '<th scope="col" data-label="Choice">Choice</th>'
            '<th scope="col" data-label="Value (USD)">Value (USD)</th>'
            '</tr></thead><tbody><tr data-label="Costs &amp; evidence: Pilot">'
            '<th scope="row" data-label="Choice">Pilot</th>'
            '<td data-label="Value (USD)">0</td></tr></tbody></table>'
        )
        result, dispositions = project(source)
        self.assertEqual(result, expected)
        self.assertEqual(dispositions, [{"topic": "Costs & evidence", "standing": "projected"}])

    def test_native_row_headers_define_identity_at_any_column(self):
        for scope in ("row", "ROW"):
            for identity in ("Decision", "0", ""):
                with self.subTest(scope=scope, identity=identity):
                    source = (
                        '<table><caption>Ledger</caption><thead><tr>'
                        '<th scope="col">Date</th><th scope="col">Decision</th>'
                        '</tr></thead><tbody><tr><td>2026-10-03</td>'
                        '<th scope="' + scope + '">' + identity + '</th>'
                        '</tr></tbody></table>'
                    )
                    output, _ = projection.project(source)
                    self.assertIn('<tr data-label="Ledger:' + (" " + identity if identity else "") + '">', output)
                    self.assertIn('<td data-label="Date">2026-10-03</td>', output)
                    self.assertEqual(projection.project(output)[0], output)

    def test_header_alternative_keeps_field_paths_in_visible_content(self):
        for alternative in ("Principal design", "Research & review", "0"):
            with self.subTest(alternative=alternative):
                source = table(identity='Principal design<br><code>resume.experience[0]</code>')
                source = source.replace('<th scope="row">', '<th scope="row" abbr="' + escape(alternative, quote=True) + '">')
                output, _ = project(source)
                self.assertIn('data-label="Costs &amp; evidence: ' + escape(alternative, quote=True) + '"', output)
                self.assertIn('<code>resume.experience[0]</code>', output)
                self.assertEqual(project(output)[0], output)

    def test_empty_header_alternative_preserves_existing_identity(self):
        for alternative in ("", " \t\n "):
            with self.subTest(alternative=alternative):
                source = table().replace('<th scope="row">', '<th scope="row" abbr="' + alternative + '">')
                output, _ = project(source)
                self.assertIn('data-label="Costs &amp; evidence: Pilot"', output)

    def test_hiring_static_labels_keep_source_paths_as_values(self):
        from pathlib import Path
        source = (Path(__file__).resolve().parents[2] / 'collaboration/hiring-surfaces-talent-agent-intake/index.html').read_text(encoding='utf-8')
        for identity in ("Principal design", "Principal engineering", "Design leadership"):
            self.assertIn('<tr data-label="Representative relationship from each inspection scenario: ' + identity + '">', source)
        self.assertIn('<code>resume.experience[0]</code>', source)
        self.assertIn('<code>caseStudy.portfolio.investment</code>', source)
        self.assertEqual(project(source)[0], source)

    def test_multiple_native_row_headers_form_the_row_identity(self):
        source = (
            '<table><caption>Ledger</caption><thead><tr>'
            '<th scope="col">Value</th><th scope="col">Region</th><th scope="col">Choice</th>'
            '</tr></thead><tbody><tr><td>0</td><th scope="row">East</th>'
            '<th scope="row">Pilot</th></tr></tbody></table>'
        )
        output, _ = projection.project(source)
        self.assertIn('<tr data-label="Ledger: East: Pilot">', output)

    def test_explicit_line_breaks_separate_label_words_and_preserve_source(self):
        for br in ('<br>', '<br/>', '<br />', '<BR class="break">'):
            with self.subTest(br=br):
                source = table(topic="Costs" + br + "evidence", identity="Pilot" + br + "identifier")
                source = source.replace('Value (USD)', 'Value' + br + '(USD)')
                output, _ = projection.project(source)
                self.assertIn('<tr data-label="Costs evidence: Pilot identifier">', output)
                self.assertIn('data-label="Value (USD)"', output)
                self.assertIn('Pilot' + br + 'identifier</th>', output)
                self.assertIn('<caption>Costs' + br + 'evidence</caption>', output)
                self.assertEqual(projection.project(output)[0], output)

    def test_inline_markup_retains_word_continuity(self):
        output, _ = projection.project(table(identity="anti<em>body</em>"))
        self.assertIn('data-label="Costs &amp; evidence: antibody"', output)
        self.assertIn('anti<em>body</em></th>', output)

    def test_blank_zero_and_statuses_retain_distinct_source_values(self):
        for value in ("", "0", "unavailable", "invalid", "inapplicable", "qualified: 12 USD"):
            with self.subTest(value=value):
                result, _ = project(table(value))
                self.assertIn(">" + value + "</td>", result)
                self.assertIn('data-label="Value (USD)"', result)

    def test_complex_table_retains_owner_review(self):
        source = '<table><caption>Grouped</caption><tr><th scope="col" colspan="2">Range</th></tr><tr><td>0</td><td>1</td></tr></table>'
        result, dispositions = project(source)
        self.assertEqual(result, source)
        self.assertEqual(dispositions[0]["standing"], "owner-review")

    def test_incomplete_semantic_contracts_retain_owner_review(self):
        for source in (
            table().replace("<caption>Costs &amp; evidence</caption>", ""),
            table().replace(' scope="col"', ""),
            table().replace(">Choice</th>", "> </th>"),
            table().replace('scope="col">Choice', 'scope="col" rowspan>Choice'),
            table().replace("<thead>", "<thead><tr><th scope=\"col\">Extra</th></tr>"),
        ):
            with self.subTest(source=source):
                self.assertEqual(project(source)[0], source)
                self.assertEqual(project(source)[1][0]["standing"], "owner-review")

    def test_selected_family_preserves_other_owners(self):
        source = table(attributes=' class="generated"')
        self.assertEqual(project(source, ["authored"]), (source, []))
        source = table(attributes=" class")
        self.assertEqual(project(source, ["authored"]), (source, []))

    def test_unselected_nested_owner_remains_literal(self):
        other = '<table class="other"><tr><td><table class="authored"><tr><td>0</td></tr></table></td></tr></table>'
        selected = table(attributes=' class="authored"')
        self.assertEqual(project(other + selected, ["authored"])[0], other + project(selected)[0])

    def test_unselected_native_duplicates_keep_owner_boundary(self):
        selected = table(attributes=' class="authored"')
        for attributes, nested in itertools.product(
            (
                'class="other" id="one" ID="two"',
                'class="other" title title="two"',
                'class="other" CLASS="generated"',
                'class="other" class',
            ),
            ("0", table(attributes=' class="authored"')),
        ):
            with self.subTest(attributes=attributes, nested=nested):
                other = '<table ' + attributes + '><tr><td>' + nested + '</td></tr></table>'
                self.assertEqual(
                    project(other + selected, ["authored"]),
                    (other + project(selected)[0], project(selected)[1]),
                )

    def test_requested_family_in_any_duplicate_class_is_ambiguous(self):
        for attributes in (
            'class="other" class="authored"',
            'class="authored" class="other"',
            'class class="authored"',
            'class="auth&#111;red" CLASS="other"',
        ):
            with self.subTest(attributes=attributes):
                with self.assertRaises(ProjectionError) as caught:
                    project(table(attributes=" " + attributes), ["authored"])
                self.assertEqual(caught.exception.code, Failure.MALFORMED)

    def test_complete_header_only_body_row_keeps_prior_label_policy(self):
        source = table().replace("<td>0</td>", "<th>0</th>")
        result, _ = project(source)
        self.assertIn('<tbody><tr><th scope="row">Pilot</th><th>0</th></tr></tbody>', result)
        self.assertIn('data-label="Value (USD)"', result)

    def test_semantic_normalization_keeps_authored_native_text(self):
        source = table(topic="  Costs\r\n &amp;\t evidence ", identity=" P\u00edlot\n<em> A </em>")
        result, _ = project(source)
        self.assertIn('data-label="Costs &amp; evidence: P\u00edlot A"', result)
        self.assertIn("<caption>  Costs\r\n &amp;\t evidence </caption>", result)
        self.assertIn(" P\u00edlot\n<em> A </em></th>", result)

    def test_quote_contained_attribute_text_and_owned_duplicates(self):
        title = 'title="keep data-label=\'x\' > literal"'
        for attribute in (
            'data-label="old"', "data-label = 'old'", "DATA-LABEL = old",
            'data-label\n=\t"old"', "data-label", 'data-label="one" data-label="two"',
        ):
            with self.subTest(attribute=attribute):
                result = with_label("<td " + title + " " + attribute + ">", "Value & units")
                self.assertIn(title, result)
                self.assertIn('data-label="Value &amp; units"', result)
                self.assertNotIn("old", result)

    def test_minimized_boolean_attribute_separator_regression(self):
        for gap in (" ", "\t", "\n", "\f"):
            self.assertEqual(
                with_label('<td data-label' + gap + 'title="keep">', "Value"),
                '<td' + gap + 'title="keep" data-label="Value">',
            )

    def test_comments_and_raw_text_keep_literal_table_strings(self):
        for prefix in (
            '<!-- <table><td>literal</td></table> -->',
            '<script>const x = "<table>"; if (a < b) x;</script>',
            '<style>.x::before { content: "<table>"; }</style>',
            '<textarea><table>literal</table></textarea>',
            '<title>&lt;table&gt; <table></title>',
        ):
            with self.subTest(prefix=prefix):
                self.assertEqual(project(prefix + table())[0], prefix + project(table())[0])

    def test_compatibility_dicts_are_detached(self):
        source = table()
        _, first = project(source)
        first[0]["standing"] = "modified"
        self.assertEqual(project(source)[1][0]["standing"], "projected")

    def test_internal_records_are_deeply_immutable(self):
        parsed = parse_source(table())
        self.assertIsInstance(parsed.tables, tuple)
        self.assertIsInstance(parsed.tables[0].rows[0].cells, tuple)
        self.assertIsInstance(parsed.tables[0].element.attributes, tuple)
        with self.assertRaises(FrozenInstanceError):
            parsed.tables[0].element.start = 99


class IdempotenceContract(unittest.TestCase):
    def test_second_projection_is_identical(self):
        result = project(table())[0]
        self.assertEqual(project(result)[0], result)
        self.assertEqual(prepare_plan(result).edits, ())

    def test_minimized_trailing_whitespace_regression(self):
        for gap in (" ", "\t", "\r\n"):
            first = with_label("<td" + gap + ">", "Value")
            self.assertEqual(with_label(first, "Value"), first)

    def test_bounded_generated_grammar_is_idempotent(self):
        for source in generated_sources():
            with self.subTest(source=source):
                result, dispositions = project(source)
                self.assertEqual(project(result), (result, dispositions))


class PreservationContract(unittest.TestCase):
    def assert_outside_edit_bytes(self, source):
        plan = prepare_plan(source)
        result = apply_plan(source, plan)
        source_cursor = result_cursor = 0
        for edit in plan.edits:
            untouched = source[source_cursor:edit.start]
            self.assertEqual(
                result[result_cursor:result_cursor + len(untouched)].encode("utf-8"),
                untouched.encode("utf-8"),
            )
            result_cursor += len(untouched)
            self.assertEqual(result[result_cursor:result_cursor + len(edit.replacement)], edit.replacement)
            result_cursor += len(edit.replacement)
            source_cursor = edit.end
        self.assertEqual(result[result_cursor:].encode("utf-8"), source[source_cursor:].encode("utf-8"))

    def test_unicode_bom_and_mixed_newline_offsets(self):
        for separator in ("\f", "\v", "\u0085", "\u2028", "\u2029", "\r", "\r\n", "\n"):
            with self.subTest(separator=repr(separator)):
                prefix = "\ufeff<p>\u03bb\U0001f9ea before" + separator + "after</p>\n"
                source = prefix + table("\u00e9\U0001f9ea") + "\r\n"
                self.assertEqual(project(source)[0], prefix + project(table("\u00e9\U0001f9ea"))[0] + "\r\n")
                self.assert_outside_edit_bytes(source)

    def test_bounded_generated_grammar_preserves_every_unowned_interval(self):
        for source in generated_sources():
            with self.subTest(source=source):
                self.assert_outside_edit_bytes(source)

    def test_native_attributes_keep_their_spelling_quotes_and_entities(self):
        raw = "<TH  scope='col' title=\"x &amp; y\" aria-describedby='native' data-label=old>"
        self.assertEqual(
            with_label(raw, "A & B"),
            "<TH  scope='col' title=\"x &amp; y\" aria-describedby='native' data-label=\"A &amp; B\">",
        )


class PlainLabelContract(unittest.TestCase):
    def test_raw_and_entity_symbols_preserve_authored_source(self):
        for arrow, middle, dash in itertools.product(
            ("\u2192", "&rarr;", "&#8594;", "&#x2192;"),
            ("\u00b7", "&middot;", "&#183;", "&#xB7;"),
            ("\u2014", "&mdash;", "&#8212;", "&#x2014;"),
        ):
            with self.subTest(arrow=arrow, middle=middle, dash=dash):
                topic = "Table 02 " + middle + " costs " + dash + " evidence"
                identity = "3 quarters " + middle + " connected complexity"
                header = "Inputs " + arrow + " outputs"
                source = table(topic=topic, identity=identity).replace(
                    ">Choice</th>", ">" + header + "</th>",
                )
                expected = source.replace(
                    '<th scope="col">' + header,
                    '<th scope="col" data-label="Inputs to outputs">' + header,
                ).replace(
                    '<th scope="col">Value (USD)',
                    '<th scope="col" data-label="Value (USD)">Value (USD)',
                ).replace(
                    '<tbody><tr>',
                    '<tbody><tr data-label="Table 02: costs - evidence: '
                    '3 quarters: connected complexity">',
                ).replace(
                    '<th scope="row">', '<th scope="row" data-label="Inputs to outputs">',
                ).replace('<td>', '<td data-label="Value (USD)">')
                result, dispositions = project(source)
                self.assertEqual(result, expected)
                self.assertEqual(dispositions, [{
                    "topic": "Table 02 \u00b7 costs \u2014 evidence", "standing": "projected",
                }])
                self.assertEqual(project(result), (result, dispositions))

    def test_plain_label_spacing_and_idempotence(self):
        for value, expected in (
            ("Inputs\u2192outputs", "Inputs to outputs"),
            ("  Inputs\t\u2192\r\noutputs  ", "Inputs to outputs"),
            ("Table 02 \u00b7 costs \u2014 evidence", "Table 02: costs - evidence"),
            ("3 quarters\u00b7connected complexity", "3 quarters\u00b7connected complexity"),
            ("\u2192\u2192", "to to"),
            ("\u00b7\u2192\u00b7", "\u00b7 to \u00b7"),
            (" \u00b7 ", ":"),
            ("\t\r\n", ""),
        ):
            with self.subTest(value=value):
                result = with_label("<td>", value)
                self.assertEqual(result, '<td data-label="' + expected + '">')
                self.assertEqual(with_label(result, value), result)
                self.assertEqual(with_label(result, expected), result)

    def test_unicode_names_technical_text_and_html_escaping_remain(self):
        value = 'Ren\u00e9e \u2192 Zo\u00eb \u00b7 \u6771\u4eac \u03b2 \u00b12 m\u00b2 e\u0301 \u2190 & "x" < 2 > 0 \'s'
        expected = 'Ren\u00e9e to Zo\u00eb: \u6771\u4eac \u03b2 \u00b12 m\u00b2 e\u0301 \u2190 & "x" < 2 > 0 \'s'
        self.assertEqual(
            with_label('<td title="authored &amp; retained">', value),
            '<td title="authored &amp; retained" data-label="' + escape(expected, quote=True) + '">',
        )
        authored = escape(value, quote=True)
        result, _ = project(table(topic=authored, identity="P\u00edlot"))
        self.assertIn("<caption>" + authored + "</caption>", result)
        self.assertIn('data-label="' + escape(expected + ": P\u00edlot", quote=True) + '"', result)

    def test_fragment_boundaries_keep_the_same_normalization(self):
        value = "  A\u2192B \u00b7 C\u2014D\t "
        expected = "A to B: C-D"
        for split in range(len(value) + 1):
            with self.subTest(split=split):
                self.assertEqual(projection._label_text((value[:split], value[split:])), expected)
        self.assertEqual(projection._label_text(tuple(value)), expected)

    def test_compound_units_retain_literal_middle_dots(self):
        for unit in ("N\u00b7m", "Pa\u00b7s", "mg\u00b7h/L"):
            with self.subTest(unit=unit):
                value = "Measure (" + unit + ")"
                self.assertEqual(with_label("<td>", value), '<td data-label="' + value + '">')
                for split in range(len(value) + 1):
                    self.assertEqual(projection._label_text((value[:split], value[split:])), value)
                self.assertEqual(projection._label_text(tuple(value)), value)
        for middle in ("\u00b7", "&middot;", "&#183;", "&#xB7;"):
            with self.subTest(middle=middle):
                header = "Torque (N" + middle + "m)"
                source = table().replace(">Choice</th>", ">" + header + "</th>")
                result, _ = project(source)
                self.assertIn('data-label="Torque (N\u00b7m)"', result)
                self.assertIn(">" + header + "</th>", result)
                self.assertEqual(project(result)[0], result)

    def test_arrow_spacing_and_separator_composition_across_fragments(self):
        for value, expected in (
            ("A\u2192\u00b7 B", "A to: B"),
            ("A \u00b7\u2192B", "A: to B"),
            ("A\u2192\u00b7\u2192B", "A to: to B"),
            (" \u00b7\u2192N\u00b7m", ": to N\u00b7m"),
            ("N\u00b7m\u2192\u00b7 Pa\u00b7s", "N\u00b7m to: Pa\u00b7s"),
            ("A\u2192\u00b7\u00b7 B", "A to \u00b7\u00b7 B"),
        ):
            with self.subTest(value=value):
                for split in range(len(value) + 1):
                    self.assertEqual(projection._label_text((value[:split], value[split:])), expected)
                self.assertEqual(projection._label_text(tuple(value)), expected)
                result = with_label("<td>", value)
                self.assertEqual(result, '<td data-label="' + expected + '">')
                self.assertEqual(with_label(result, expected), result)

    def test_bounded_symbol_compositions_reach_a_normalization_fixed_point(self):
        alphabet = ("A", " ", "\t", "\u2192", "\u00b7", "\u2014")
        for length in range(6):
            for parts in itertools.product(alphabet, repeat=length):
                with self.subTest(parts=parts):
                    result = projection._label_text(parts)
                    self.assertEqual(projection._label_text((result,)), result)
                    self.assertLessEqual(len(result), 4 * length)

    def test_normalization_visits_each_character_once_with_finite_expansion(self):
        class MeasuredText(str):
            visits = 0
            traversals = 0

            def __iter__(self):
                self.traversals += 1
                for char in super().__iter__():
                    self.visits += 1
                    yield char

            def __getitem__(self, key):
                if isinstance(key, slice):
                    raise AssertionError("Normalizer copied an input substring")
                return super().__getitem__(key)

        for count in (32, 128, 512):
            with self.subTest(count=count):
                value = MeasuredText("A\u2192B \u00b7 C\u2014D\t" * count)
                result = projection._label_text((value,))
                self.assertEqual(value.traversals, 1)
                self.assertEqual(value.visits, len(value))
                self.assertEqual(result, " ".join(["A to B: C-D"] * count))
                self.assertLessEqual(len(result), 4 * len(value))

    def test_expanded_label_length_precedes_materialization(self):
        value, expected = "A\u2192B", "A to B"
        limits = replace(DEFAULT_LIMITS, label_chars=len(expected) - 1)
        with patch.object(projection, "_label_text", side_effect=AssertionError("early label allocation")):
            with self.assertRaises(ProjectionError) as caught:
                with_label("<td>", value, limits=limits)
        self.assertEqual(caught.exception.code, Failure.LIMIT)
        self.assertEqual(
            with_label("<td>", value, limits=replace(limits, label_chars=len(expected))),
            '<td data-label="A to B">',
        )

    def test_normalized_and_escaped_tag_budget_precedes_materialization(self):
        value = 'A\u2192B & "Ren\u00e9e"'
        expected = '<td data-label="A to B &amp; &quot;Ren\u00e9e&quot;">'
        limits = replace(DEFAULT_LIMITS, tag_chars=len(expected) - 1)
        with patch.object(projection, "_label_text", side_effect=AssertionError("early label allocation")):
            with patch.object(projection, "escape", side_effect=AssertionError("early escaping")):
                with self.assertRaises(ProjectionError) as caught:
                    with_label("<td>", value, limits=limits)
        self.assertEqual(caught.exception.code, Failure.LIMIT)
        self.assertEqual(
            with_label("<td>", value, limits=replace(limits, tag_chars=len(expected))), expected,
        )

    def test_normalized_aggregate_budgets_precede_label_construction(self):
        source = table(topic="A\u2192B", identity="R \u00b7 S")
        expected = project(table(topic="A to B", identity="R: S"))[0].replace(
            "<caption>A to B</caption>", "<caption>A\u2192B</caption>",
        ).replace(
            '>R: S</th>', '>R \u00b7 S</th>',
        )
        for field, size, source_size in (
            ("source_chars", len(expected), len(source)),
            ("source_bytes", len(expected.encode("utf-8")), len(source.encode("utf-8"))),
        ):
            with self.subTest(field=field):
                self.assertGreater(size - 1, source_size)
                limits = replace(DEFAULT_LIMITS, **{field: size - 1})
                with patch.object(projection, "_label_text", side_effect=AssertionError("early expanded label")):
                    with patch.object(projection, "Label", side_effect=AssertionError("early label record")):
                        with self.assertRaises(ProjectionError) as caught:
                            prepare_plan(source, limits=limits)
                self.assertEqual(caught.exception.code, Failure.LIMIT)
                exact = replace(limits, **{field: size})
                result = apply_plan(source, prepare_plan(source, limits=exact))
                self.assertEqual(result, expected)
                self.assertEqual(apply_plan(result, prepare_plan(result, limits=exact)), result)

    def test_normalized_projection_preserves_every_unowned_interval(self):
        source = '\ufeff<p>\u2192 outside\r\n</p>' + table(
            topic='Table 02 &middot; costs &mdash; evidence',
            identity='Ren\u00e9e \u2192 Zo\u00eb',
        ) + '<!-- \u00b7 \u2014 unchanged -->\r'
        PreservationContract().assert_outside_edit_bytes(source)


class AdmissionContract(unittest.TestCase):
    def assert_rejected(self, source, failure, **kwargs):
        with self.assertRaises(ProjectionError) as caught:
            prepare_plan(source, **kwargs)
        self.assertEqual(caught.exception.code, failure)

    def test_record_shape_is_explicit_and_compatible_with_value_error(self):
        source = table().replace("<td>0</td>", "")
        with self.assertRaisesRegex(ValueError, "Record cell count"):
            project(source)

    def test_removed_record_cells_are_all_shape_checked(self):
        for value, removal in itertools.product(
            ("", "0", "unavailable", "\u03bb\U0001f9ea"),
            ("value", "identity", "both"),
        ):
            source = table(value)
            if removal in ("value", "both"):
                source = source.replace("<td>" + value + "</td>", "")
            if removal in ("identity", "both"):
                source = source.replace('<th scope="row">Pilot</th>', "")
            with self.subTest(value=value, removal=removal):
                self.assert_rejected(source, Failure.SHAPE)

    def test_selected_nested_table_has_typed_outcome(self):
        self.assert_rejected(table("<table></table>"), Failure.NESTED)

    def test_self_closing_raw_text_cannot_expose_table_looking_content(self):
        for tag, attributes, closing in itertools.product(
            ("script", "SCRIPT", "style", "textarea", "title"),
            ("", ' data-note="> quoted"', " disabled"),
            (False, True),
        ):
            raw = "<" + tag + attributes + "/>" + "const example = '" + table() + "';"
            if closing:
                raw += "</" + tag + ">"
            with self.subTest(tag=tag, attributes=attributes, closing=closing):
                self.assert_rejected(raw + table(attributes=' class="authored"'), Failure.MALFORMED)

    def test_minimized_malformed_structures(self):
        for source in (
            table()[:-8],
            table().replace("</td>", ""),
            table().replace("</td>", "</th>"),
            table().replace("<tbody><tr>", "<tbody><td>"),
            table().replace("<tr><th scope=\"row\">", "<tr/><th scope=\"row\">"),
            table().replace("<tbody>", "<tbody>unexpected"),
            table().replace("<caption>", "<caption><em>").replace("</caption>", "</caption></em>"),
            table().replace("<td>", "<td title='unfinished>"),
            table().replace("<td>", "<td data-x=>"),
            table().replace("<td>", '<td title="a"title="b">'),
            table() + "<!-- unfinished",
            table() + "<table",
            '<table class="other"><tr><td>0</td></tr>',
        ):
            with self.subTest(source=source):
                self.assert_rejected(source, Failure.MALFORMED)

    def test_duplicate_native_attributes_are_explicit(self):
        for attributes in (
            'scope="col" SCOPE="row"',
            'scope="col" colspan="1" colspan="2"',
            'scope="col" title title="other"',
        ):
            self.assert_rejected(table().replace('scope="col"', attributes, 1), Failure.MALFORMED)

    def test_invalid_utf8_scalar_and_nul_are_explicit(self):
        self.assert_rejected(table("\ud800"), Failure.ENCODING)
        self.assert_rejected(table("\0"), Failure.MALFORMED)

    def test_source_tag_token_depth_and_label_budgets(self):
        for limits in (
            replace(DEFAULT_LIMITS, source_chars=10),
            replace(DEFAULT_LIMITS, source_bytes=10),
            replace(DEFAULT_LIMITS, tag_chars=12),
            replace(DEFAULT_LIMITS, tokens=2),
            replace(DEFAULT_LIMITS, depth=2),
            replace(DEFAULT_LIMITS, label_chars=2),
        ):
            with self.subTest(limits=limits):
                self.assert_rejected(table(), Failure.LIMIT, limits=limits)
        long_tag = '<p title="' + "x" * 100 + '"></p>' + table()
        self.assert_rejected(long_tag, Failure.LIMIT, limits=replace(DEFAULT_LIMITS, tag_chars=40))

    def test_output_expansion_is_bounded_before_application(self):
        source = table()
        plan = replace(prepare_plan(source), limits=replace(DEFAULT_LIMITS, source_chars=len(source) + 5))
        with self.assertRaises(ProjectionError) as caught:
            apply_plan(source, plan)
        self.assertEqual(caught.exception.code, Failure.LIMIT)

    def test_caption_budget_precedes_label_materialization(self):
        for caption, dimension in itertools.product(
            ("C" * 256, "&amp;\u03bb\U0001f9ea" * 64),
            ("source_chars", "source_bytes"),
        ):
            row = '<tr><th scope="row">Pilot</th><td>0</td></tr>'
            source = table(topic=caption).replace(row, row * 32)
            size = len(source) if dimension == "source_chars" else len(source.encode("utf-8"))
            limits = replace(DEFAULT_LIMITS, **{dimension: size + 32})
            validated = projection.validate_tables(parse_source(source, limits=limits))
            with self.subTest(dimension=dimension, caption=caption):
                with patch.object(projection, "Label", side_effect=AssertionError("label allocation before admission")) as allocate:
                    with self.assertRaises(ProjectionError) as caught:
                        projection.derive_labels(validated)
                self.assertEqual(caught.exception.code, Failure.LIMIT)
                allocate.assert_not_called()

    def test_replacement_budget_precedes_tag_materialization(self):
        source = table()
        validated = projection.validate_tables(parse_source(source))
        labels = projection.derive_labels(validated)
        for dimension in ("source_chars", "source_bytes"):
            size = len(source) if dimension == "source_chars" else len(source.encode("utf-8"))
            limited = replace(
                validated,
                parsed=replace(validated.parsed, limits=replace(DEFAULT_LIMITS, **{dimension: size + 5})),
            )
            with self.subTest(dimension=dimension):
                with patch.object(projection, "with_label", side_effect=AssertionError("replacement allocation before admission")) as allocate:
                    with self.assertRaises(ProjectionError) as caught:
                        projection.plan_edits(limited, labels)
                self.assertEqual(caught.exception.code, Failure.LIMIT)
                allocate.assert_not_called()

    def test_escape_expansion_budget_precedes_escaping(self):
        for value in ("&" * 10, '"' * 10, "'" * 10, "<>" * 10):
            with self.subTest(value=value):
                with patch.object(projection, "escape", side_effect=AssertionError("escaping before admission")) as allocate:
                    with self.assertRaises(ProjectionError) as caught:
                        with_label("<td>", value, limits=replace(DEFAULT_LIMITS, tag_chars=40))
                self.assertEqual(caught.exception.code, Failure.LIMIT)
                allocate.assert_not_called()

    def test_admitted_exact_output_budgets_preserve_generated_source(self):
        for source in generated_sources():
            expected, dispositions = project(source)
            limits = replace(
                DEFAULT_LIMITS,
                source_chars=max(len(source), len(expected)),
                source_bytes=max(len(source.encode("utf-8")), len(expected.encode("utf-8"))),
            )
            with self.subTest(source=source):
                plan = prepare_plan(source, limits=limits)
                self.assertEqual(apply_plan(source, plan).encode("utf-8"), expected.encode("utf-8"))
                self.assertEqual([item.as_dict() for item in plan.dispositions], dispositions)
                self.assertEqual(apply_plan(expected, prepare_plan(expected, limits=limits)), expected)

    def test_attribute_scanner_bounds_copied_characters(self):
        class MeasuredSource(str):
            def __new__(cls, value):
                instance = super().__new__(cls, value)
                instance.copied_characters = 0
                return instance

            def __getitem__(self, index):
                if isinstance(index, slice):
                    self.copied_characters += len(range(*index.indices(len(self))))
                return super().__getitem__(index)

        for count, suffix in itertools.product((32, 128, 512), (">", "/>")):
            raw = MeasuredSource("<td" + "".join(' a' + str(index) + '="x"' for index in range(count)) + suffix)
            with self.subTest(count=count, suffix=suffix):
                parsed = projection.scan_start_tag(raw)
                self.assertEqual(len(parsed.attributes), count)
                self.assertEqual(parsed.self_closing, suffix == "/>")
                self.assertLessEqual(raw.copied_characters, len(raw))

    def test_source_digest_detects_same_length_drift(self):
        source = table()
        plan = prepare_plan(source)
        with self.assertRaises(ProjectionError) as caught:
            apply_plan(source.replace("Pilot", "Other"), plan)
        self.assertEqual(caught.exception.code, Failure.DRIFT)

    def test_expected_spans_overlap_order_and_bounds_are_guarded(self):
        source = table()
        plan = prepare_plan(source)
        first = plan.edits[0]
        variants = (
            (replace(first, expected="<wrong>"),),
            (first, first),
            tuple(reversed(plan.edits)),
            (replace(first, start=-1),),
            (replace(first, end=len(source) + 1),),
            (Edit(first.start, first.start, "", "insert"),),
        )
        for edits in variants:
            with self.subTest(edits=edits):
                with self.assertRaises(ProjectionError) as caught:
                    apply_plan(source, replace(plan, edits=edits))
                self.assertEqual(caught.exception.code, Failure.EDIT)

    def test_raw_text_and_comment_bodies_use_source_budget(self):
        source = "<script>" + "x" * 100 + " < y" + "</script>" + table()
        self.assertEqual(
            project(source)[0],
            "<script>" + "x" * 100 + " < y" + "</script>" + project(table())[0],
        )

    def test_bad_limit_configuration_stays_visible(self):
        with self.assertRaises(ValueError):
            replace(DEFAULT_LIMITS, tokens=True)


class PublicationContract(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.path = self.root / "asset.html"
        self.original = ("\ufeff<p>\u03bb\r\n</p>" + table("\u00e9\U0001f9ea") + "\r\n").encode("utf-8")
        self.path.write_bytes(self.original)

    def test_atomic_publication_preserves_mode_bom_newlines_and_result(self):
        self.path.chmod(0o640)
        outcome = projection.process_asset(self.root, "asset.html")
        self.assertEqual(outcome.standing, "updated")
        self.assertEqual(stat.S_IMODE(self.path.stat().st_mode), 0o640)
        self.assertEqual(self.path.read_bytes(), project(self.original.decode("utf-8"))[0].encode("utf-8"))
        self.assertEqual(list(self.root.glob(".table-context-*.tmp")), [])
        self.assertEqual(projection.process_asset(self.root, "asset.html").standing, "unchanged")

    def test_check_has_no_publication(self):
        with patch.object(projection.os, "replace") as publication:
            outcome = projection.process_asset(self.root, "asset.html", check=True)
        self.assertEqual(outcome.standing, "needs-projection")
        publication.assert_not_called()
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_entire_asset_is_validated_before_any_publication(self):
        malformed = table().replace("<td>0</td>", "<td>0</td><td>extra</td>")
        source = (table() + malformed).encode("utf-8")
        self.path.write_bytes(source)
        with patch.object(projection.os, "replace") as publication:
            outcome = projection.process_asset(self.root, "asset.html")
        self.assertEqual(outcome.failure, Failure.SHAPE)
        publication.assert_not_called()
        self.assertEqual(self.path.read_bytes(), source)

    def test_later_nested_or_malformed_table_preserves_the_full_asset(self):
        for suffix in (table("<table></table>"), table()[:-8]):
            source = (table() + suffix).encode("utf-8")
            self.path.write_bytes(source)
            outcome = projection.process_asset(self.root, "asset.html")
            self.assertEqual(outcome.standing, "error")
            self.assertEqual(self.path.read_bytes(), source)

    def test_self_closing_raw_text_rejects_before_publication(self):
        for tag in ("script", "style", "textarea", "title"):
            source = (table() + "<" + tag + "/>'" + table() + "'</" + tag + ">").encode("utf-8")
            self.path.write_bytes(source)
            with self.subTest(tag=tag):
                with patch.object(projection.os, "replace") as publication:
                    outcome = projection.process_asset(self.root, "asset.html")
                self.assertEqual(outcome.failure, Failure.MALFORMED)
                publication.assert_not_called()
                self.assertEqual(self.path.read_bytes(), source)

    def test_incomplete_header_only_row_prevents_full_asset_publication(self):
        source = (table() + table().replace("<td>0</td>", "")).encode("utf-8")
        self.path.write_bytes(source)
        with patch.object(projection.os, "replace") as publication:
            outcome = projection.process_asset(self.root, "asset.html")
        self.assertEqual(outcome.failure, Failure.SHAPE)
        publication.assert_not_called()
        self.assertEqual(self.path.read_bytes(), source)

    def test_changed_source_guard_preserves_new_revision_and_cleans_temporary(self):
        actual_fsync = projection.os.fsync
        changed = self.original.replace(b"Pilot", b"Other")

        def mutate_source(descriptor):
            actual_fsync(descriptor)
            self.path.write_bytes(changed)

        with patch.object(projection.os, "fsync", side_effect=mutate_source):
            outcome = projection.process_asset(self.root, "asset.html")
        self.assertEqual(outcome.failure, Failure.DRIFT)
        self.assertEqual(self.path.read_bytes(), changed)
        self.assertEqual(list(self.root.glob(".table-context-*.tmp")), [])

    def test_same_bytes_new_file_identity_reopens_publication(self):
        actual_fsync = projection.os.fsync

        def replace_source(descriptor):
            actual_fsync(descriptor)
            other = self.root / "new.html"
            other.write_bytes(self.original)
            other.replace(self.path)

        with patch.object(projection.os, "fsync", side_effect=replace_source):
            outcome = projection.process_asset(self.root, "asset.html")
        self.assertEqual(outcome.failure, Failure.DRIFT)
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_interruption_before_replace_preserves_original_and_cleans_temporary(self):
        for boundary in ("fsync", "replace"):
            with self.subTest(boundary=boundary):
                with patch.object(projection.os, boundary, side_effect=KeyboardInterrupt):
                    with self.assertRaises(KeyboardInterrupt):
                        projection.process_asset(self.root, "asset.html")
                self.assertEqual(self.path.read_bytes(), self.original)
                self.assertEqual(list(self.root.glob(".table-context-*.tmp")), [])

    def test_disk_write_failure_is_recoverable_with_original_retained(self):
        with patch.object(projection.os, "fsync", side_effect=OSError(projection.errno.ENOSPC, "disk")):
            outcome = projection.process_asset(self.root, "asset.html")
        self.assertEqual(outcome.failure, Failure.IO)
        self.assertEqual(self.path.read_bytes(), self.original)
        self.assertEqual(list(self.root.glob(".table-context-*.tmp")), [])

    def test_containment_and_symlink_policy(self):
        (self.root / "link.html").symlink_to(self.path)
        (self.root / "sub").mkdir()
        (self.root / "directory-link").symlink_to(self.root / "sub", target_is_directory=True)
        for value in ("../asset.html", "/outside/asset.html", "link.html", "directory-link/asset.html", "asset.txt"):
            with self.subTest(value=value):
                self.assertFalse(projection.process_asset(self.root, value).ok)
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_hardlinks_directories_and_fifo_are_rejected(self):
        os.link(self.path, self.root / "hard.html")
        self.assertEqual(projection.process_asset(self.root, "hard.html").failure, Failure.PATH)
        (self.root / "directory.html").mkdir()
        self.assertFalse(projection.process_asset(self.root, "directory.html").ok)
        os.mkfifo(self.root / "fifo.html")
        self.assertEqual(projection.process_asset(self.root, "fifo.html").failure, Failure.PATH)

    def test_file_size_and_encoding_are_asset_outcomes(self):
        outcome = projection.process_asset(self.root, "asset.html", limits=replace(DEFAULT_LIMITS, source_bytes=8))
        self.assertEqual(outcome.failure, Failure.LIMIT)
        self.path.write_bytes(b"\xff")
        self.assertEqual(projection.process_asset(self.root, "asset.html").failure, Failure.ENCODING)

    def test_cli_keeps_independent_progress_and_aggregate_failure(self):
        bad = self.root / "bad.html"
        bad.write_text(table()[:-8], encoding="utf-8")
        stream = io.StringIO()
        with redirect_stdout(stream):
            status = projection.main(["bad.html", "asset.html", "missing.html"], root=self.root)
        records = [json.loads(line) for line in stream.getvalue().splitlines()]
        self.assertEqual(status, 1)
        self.assertEqual([item["standing"] for item in records], ["error", "updated", "error"])
        self.assertEqual(self.path.read_bytes(), project(self.original.decode("utf-8"))[0].encode("utf-8"))

    def test_cli_check_reports_all_assets_and_returns_nonzero(self):
        stream = io.StringIO()
        with redirect_stdout(stream):
            status = projection.main(["--check", "asset.html", "../private.html"], root=self.root)
        records = [json.loads(line) for line in stream.getvalue().splitlines()]
        self.assertEqual(status, 1)
        self.assertEqual(records[0]["standing"], "needs-projection")
        self.assertNotIn("path", records[1])
        self.assertNotIn("private", stream.getvalue())
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_cli_success_returns_zero(self):
        stream = io.StringIO()
        with redirect_stdout(stream):
            status = projection.main(["asset.html"], root=self.root)
        self.assertEqual(status, 0)

    def test_implementation_errors_and_interruptions_stay_visible(self):
        for error in (RuntimeError("implementation"), TypeError("implementation"), OSError(projection.errno.EBADF, "descriptor")):
            with self.subTest(error=error):
                with patch.object(projection, "prepare_plan", side_effect=error):
                    with self.assertRaises(type(error)):
                        projection.process_asset(self.root, "asset.html")


if __name__ == "__main__":
    unittest.main()
