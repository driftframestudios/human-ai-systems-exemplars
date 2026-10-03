"""Boundary and semantic-text regressions for the local table observer."""

import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch


def load_observer():
    spec = importlib.util.spec_from_file_location(
        "prototype_table_observer", Path(__file__).with_name("parse-tables.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


observer = load_observer()
VALID = '<table data-label="Topic"><tbody><tr><th scope="row">Record</th><td>0</td></tr></tbody></table>'


class TableObserverContract(unittest.TestCase):
    def test_input_has_an_explicit_list_of_strings_shape(self):
        for value in (None, True, 0, "", "<table></table>", {}, {"page": "HTML"}, ("HTML",)):
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError, "must be a list of HTML strings"):
                    observer.parse_sources(value)
        for value in ([0], [None], [VALID, {}], [[VALID]]):
            with self.subTest(value=value):
                with self.assertRaisesRegex(ValueError, r"source input item \d+ must be an HTML string"):
                    observer.parse_sources(value)
        self.assertEqual(observer.parse_sources([]), [])
        self.assertEqual(observer.parse_sources([""]), [{"tables": [], "scripts": []}])

    def test_nested_tables_have_an_explicit_unsupported_grammar_result(self):
        for inner in ("<table></table>", "<table><tr><td>Inner</td></tr></table>"):
            source = f"<table><tr><td>Before{inner}After</td><td>Tail</td></tr></table>"
            with self.subTest(inner=inner):
                with self.assertRaisesRegex(ValueError, "source input item 0: nested tables"):
                    observer.parse_sources([source])

    def test_incomplete_or_mismatched_structure_has_a_domain_error(self):
        for source in (
            "<table><tr><td>Open",
            "<table><tr><td>One<td>Two</td></tr></table>",
            "<table><tr><td>One</td><tr><td>Two</td></tr></table>",
            "<table><td>Missing row</td></table>",
            "<table><tr><th>Header</td></tr></table>",
            "<table><tr><td>Open cell</tr></table>",
            "<table><tr><td>Open row</td></table>",
            "<script>const open = true;",
            "<table><thead></table>",
            "<table><thead><tbody></tbody></thead></table>",
            "<table><tr><td><thead></thead></td></tr></table>",
            "<table><thead></tbody></table>",
            "<table></tbody></table>",
            "<table><thead><tr><td>Open cell</thead></td></tr></table>",
        ):
            with self.subTest(source=source):
                with self.assertRaisesRegex(ValueError, "source input item 0:"):
                    observer.parse_sources([source])

    def test_explicit_sections_keep_their_exact_record_roles(self):
        sections = ("thead", "tbody", "tbody", "tfoot")
        source = "<table>" + "".join(
            f"<{section}><tr><td>{section}</td></tr></{section}>" for section in sections
        ) + "</table>"
        rows = observer.parse_sources([source])[0]["tables"][0]["rows"]
        self.assertEqual([row["section"] for row in rows], list(sections))
        self.assertEqual([row["cells"][0]["text"] for row in rows], list(sections))

    def test_semantic_text_and_native_associations_remain_distinct(self):
        for boundary in ("<br>", "<br/>", "<br />", "<BR>"):
            source = ('<table data-label="A &amp; B"><thead><tr><th scope="col">Heading</th></tr></thead>'
                      '<tbody><tr data-label="Record"><td headers="heading">'
                      f'anti<em>body</em>{boundary}N\u00b7m &amp; \u03bcg/L'
                      '</td></tr></tbody></table>')
            with self.subTest(boundary=boundary):
                table = observer.parse_sources([source])[0]["tables"][0]
                self.assertEqual(table["attrs"]["data-label"], "A & B")
                self.assertEqual(table["rows"][0]["section"], "thead")
                self.assertEqual(table["rows"][0]["cells"][0]["attrs"]["scope"], "col")
                cell = table["rows"][1]["cells"][0]
                self.assertEqual(cell["text"], "antibody N\u00b7m & \u03bcg/L")
                self.assertEqual(cell["attrs"]["headers"], "heading")

    def test_script_content_and_adjacent_tables_preserve_output_shape(self):
        script = 'const literal = "<table> & <td>";'
        result = observer.parse_sources([VALID + f"<script>{script}</script>" + VALID])[0]
        self.assertEqual(len(result["tables"]), 2)
        self.assertEqual(result["tables"][0]["rows"][0]["cells"][1]["text"], "0")
        self.assertEqual(result["scripts"], [{"attrs": {}, "text": script}])
        result["tables"][0]["attrs"]["data-label"] = "Changed"
        self.assertEqual(result["tables"][1]["attrs"]["data-label"], "Topic")
        self.assertEqual(observer.parse_sources([VALID])[0]["tables"][0]["attrs"]["data-label"], "Topic")

    def test_fragmented_text_uses_append_then_join(self):
        for opening, closing, owner in (
            ("<table><tr><td>", "</td></tr></table>", "cell"),
            ("<script>", "</script>", "script"),
        ):
            with self.subTest(owner=owner):
                parser = observer.Tables()
                parser.feed(opening)
                for _ in range(10000):
                    parser.handle_data("x")
                chunks = getattr(parser, owner)["text"]
                self.assertIsInstance(chunks, list)
                self.assertEqual(len(chunks), 10000)
                self.assertEqual("".join(chunks), "x" * 10000)
                parser.feed(closing)
                parser.close()

    def test_cli_publishes_only_complete_results(self):
        for payload, message in (
            ('{"page":"HTML"}', "must be a list"),
            ('[', "Table observation input:"),
            (json.dumps([VALID, "<table><table></table></table>"]), "source input item 1: nested tables"),
        ):
            with self.subTest(message=message):
                output, errors = io.StringIO(), io.StringIO()
                self.assertEqual(observer.main(io.StringIO(payload), output, errors), 2)
                self.assertEqual(output.getvalue(), "")
                self.assertIn(message, errors.getvalue())
        output, errors = io.StringIO(), io.StringIO()
        self.assertEqual(observer.main(io.StringIO(json.dumps([VALID])), output, errors), 0)
        self.assertEqual(json.loads(output.getvalue()), observer.parse_sources([VALID]))
        self.assertEqual(errors.getvalue(), "")

    def test_import_keeps_streams_owned_by_the_caller(self):
        class Unreadable:
            def read(self, *args):
                raise AssertionError("Import keeps stdin untouched")

        output, errors = io.StringIO(), io.StringIO()
        with patch("sys.stdin", Unreadable()), contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            module = load_observer()
        self.assertTrue(callable(module.parse_sources))
        self.assertEqual(output.getvalue(), "")
        self.assertEqual(errors.getvalue(), "")


if __name__ == "__main__":
    unittest.main()
