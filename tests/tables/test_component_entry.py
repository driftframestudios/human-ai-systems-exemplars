"""Independent selection and failure fixtures for the Python table entry."""

from contextlib import redirect_stderr
import io
from pathlib import Path
import sys
import tempfile
import unittest

from tests.tables import run_components


# Literal fixture ownership, independent of the entry's COMPONENTS declaration.
FIXTURES = (
    ("parser", "prototype-labels/test_parser.py", "ParserCases", 1),
    ("hiring-table-media", "test_hiring_table_media.py", "HiringCases", 2),
    ("table-context", "test_table_context.py", "ProjectorCases", 3),
    ("visitor-labels", "visitor-labels/test_visitor_labels.py", "VisitorCases", 4),
)


def case_ids(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from case_ids(item)
        else:
            yield item.id()


class ComponentEntryTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.module_names = [Path(path).stem for _, path, _, _ in FIXTURES]
        self.previous_path = sys.path[:]
        self.previous_modules = {
            name: sys.modules[name] for name in self.module_names if name in sys.modules
        }
        for name in self.module_names:
            sys.modules.pop(name, None)
        self.addCleanup(self.restore_import_state)
        for _, path, class_name, count in FIXTURES:
            self.write_fixture(path, class_name, count)
        (self.root / "test_unselected.py").write_text(
            "raise RuntimeError('unselected module imported')\n", encoding="utf-8"
        )

    def restore_import_state(self):
        for name in self.module_names:
            sys.modules.pop(name, None)
        sys.modules.update(self.previous_modules)
        sys.path[:] = self.previous_path

    def write_fixture(self, relative_path, class_name, count, body="self.assertEqual(2 + 3, 5)"):
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        methods = "".join(
            f"    def test_case_{index}(self):\n        {body}\n"
            for index in range(count)
        )
        path.write_text(
            "import unittest\nfrom pathlib import Path\n"
            f"class {class_name}(unittest.TestCase):\n{methods}",
            encoding="utf-8",
        )

    def observe(self, component):
        output = io.StringIO()
        status = run_components.run(component, root=self.root, stream=output)
        return status, output.getvalue()

    def test_each_component_has_its_independently_named_module_and_cases(self):
        for component, path, class_name, count in FIXTURES:
            with self.subTest(component=component):
                selected = run_components.discover_components(component, self.root)
                self.assertEqual([(name, total) for name, total, _ in selected], [(component, count)])
                self.assertEqual(
                    list(case_ids(selected[0][2])),
                    [f"{Path(path).stem}.{class_name}.test_case_{index}" for index in range(count)],
                )

    def test_all_is_the_exact_union_once_and_excludes_unselected_modules(self):
        selected = run_components.discover_components("all", self.root)
        self.assertEqual(
            [(name, count) for name, count, _ in selected],
            [("parser", 1), ("hiring-table-media", 2), ("table-context", 3), ("visitor-labels", 4)],
        )
        actual = [identity for _, _, suite in selected for identity in case_ids(suite)]
        expected = [
            f"{Path(path).stem}.{class_name}.test_case_{index}"
            for _, path, class_name, count in FIXTURES
            for index in range(count)
        ]
        self.assertEqual(actual, expected)
        self.assertEqual(len(set(actual)), 10)

    def test_success_reports_the_literal_ten_case_population(self):
        status, output = self.observe("all")
        self.assertEqual(status, 0)
        self.assertIn("Ran 10 tests", output)
        for name, count in [("parser", 1), ("hiring-table-media", 2), ("table-context", 3), ("visitor-labels", 4)]:
            self.assertIn(f"{name}: {count} discovered test(s)", output)

    def test_missing_member_blocks_all_before_any_test_body_runs(self):
        marker = self.root / "executed.txt"
        self.write_fixture(
            "prototype-labels/test_parser.py", "ParserCases", 1,
            f"Path({str(marker)!r}).write_text('ran', encoding='utf-8')",
        )
        (self.root / "visitor-labels/test_visitor_labels.py").unlink()
        status, output = self.observe("all")
        self.assertEqual(status, 2)
        self.assertIn("visitor-labels: no tests discovered", output)
        self.assertFalse(marker.exists())
        self.assertNotIn("Ran ", output)

    def test_present_but_empty_module_is_not_a_pass(self):
        (self.root / "prototype-labels/test_parser.py").write_text("import unittest\n", encoding="utf-8")
        status, output = self.observe("parser")
        self.assertEqual(status, 2)
        self.assertIn("parser: no tests discovered", output)

    def test_missing_discovery_directory_has_component_context(self):
        (self.root / "prototype-labels/test_parser.py").unlink()
        (self.root / "prototype-labels").rmdir()
        status, output = self.observe("parser")
        self.assertEqual(status, 2)
        self.assertIn("parser: discovery failed", output)

    def test_assertion_failure_returns_native_failure(self):
        self.write_fixture("prototype-labels/test_parser.py", "ParserCases", 1, "self.fail('fixture assertion failure')")
        status, output = self.observe("parser")
        self.assertEqual(status, 1)
        self.assertIn("fixture assertion failure", output)
        self.assertIn("FAILED (failures=1)", output)

    def test_import_failure_cannot_masquerade_as_nonempty_success(self):
        (self.root / "prototype-labels/test_parser.py").write_text(
            "raise RuntimeError('fixture import failure')\n", encoding="utf-8"
        )
        status, output = self.observe("parser")
        self.assertEqual(status, 1)
        self.assertIn("fixture import failure", output)
        self.assertIn("FAILED (errors=1)", output)

    def test_earlier_success_does_not_mask_a_later_component_failure(self):
        self.write_fixture("test_hiring_table_media.py", "HiringCases", 2, "self.fail('later failure')")
        status, output = self.observe("all")
        self.assertEqual(status, 1)
        self.assertIn("Ran 10 tests", output)
        self.assertIn("FAILED (failures=2)", output)

    def test_missing_and_unknown_cli_selection_return_two(self):
        for arguments in ([], ["unregistered"]):
            with self.subTest(arguments=arguments):
                output = io.StringIO()
                with redirect_stderr(output), self.assertRaises(SystemExit) as caught:
                    run_components.main(arguments)
                self.assertEqual(caught.exception.code, 2)
                self.assertIn("error:", output.getvalue())

    def test_native_skip_remains_visible_rather_than_becoming_an_assertion_pass(self):
        (self.root / "prototype-labels/test_parser.py").write_text(
            "import unittest\nclass ParserCases(unittest.TestCase):\n"
            "    @unittest.skip('fixture skip')\n"
            "    def test_skipped(self):\n        self.fail('must not execute')\n",
            encoding="utf-8",
        )
        status, output = self.observe("parser")
        self.assertEqual(status, 0)
        self.assertIn("fixture skip", output)
        self.assertIn("OK (skipped=1)", output)


if __name__ == "__main__":
    unittest.main()
