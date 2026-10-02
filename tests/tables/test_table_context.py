import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
from project_table_context import project, with_label


class TableContextContract(unittest.TestCase):
    def test_meaning_and_idempotence(self):
        for value in ["", "0", "unavailable", "invalid", "inapplicable", "qualified: 12 USD"]:
            with self.subTest(value=value):
                source = '<table><caption>Costs &amp; evidence</caption><thead><tr><th scope="col">Choice</th><th scope="col">Value (USD)</th></tr></thead><tbody><tr><th scope="row">Pilot</th><td>'+value+'</td></tr></tbody></table>'
                result, dispositions = project(source)
                self.assertIn('data-label="Costs &amp; evidence: Pilot"', result)
                self.assertIn('data-label="Value (USD)"', result)
                self.assertIn('>'+value+'</td>', result)
                self.assertEqual(project(result)[0], result)
                self.assertEqual(dispositions[0]["standing"], "projected")

    def test_complex_table_retains_owner_review(self):
        source = '<table><caption>Grouped</caption><tr><th scope="col" colspan="2">Range</th></tr><tr><td>0</td><td>1</td></tr></table>'
        result, dispositions = project(source)
        self.assertEqual(result, source)
        self.assertEqual(dispositions[0]["standing"], "owner-review")

    def test_selected_family_preserves_other_owners(self):
        source = '<table class="generated"><caption>Other</caption><tr><th scope="col">A</th></tr><tr><td>0</td></tr></table>'
        self.assertEqual(project(source, ["authored"]), (source, []))

    def test_record_shape_is_explicit(self):
        source = '<table><caption>Records</caption><tr><th scope="col">A</th></tr><tr><td>0</td><td>1</td></tr></table>'
        with self.assertRaisesRegex(ValueError, "Record cell count"):
            project(source)

    def test_attribute_boundaries_preserve_literal_content(self):
        title = 'title="keep data-label=\'x\' > literal"'
        for attribute in ['data-label="old"', "data-label = 'old'", 'DATA-LABEL = old',
                          'data-label\n=\t"old"', 'data-label', 'data-label="one" data-label="two"']:
            with self.subTest(attribute=attribute):
                result = with_label('<td ' + title + ' ' + attribute + '>', 'Value & units')
                self.assertIn(title, result)
                self.assertIn('data-label="Value &amp; units"', result)
                self.assertNotIn('old', result)
                self.assertEqual(with_label(result, 'Value & units'), result)
        for gap in [' ', '\t', '\n', '\f']:
            with self.subTest(boolean_gap=repr(gap)):
                self.assertEqual(with_label('<td data-label' + gap + 'title="keep">', 'Value'),
                                 '<td' + gap + 'title="keep" data-label="Value">')

    def test_offsets_follow_literal_newlines(self):
        table = '<table><caption>Costs</caption><tr><th scope="col">Value</th></tr><tr><td>0</td></tr></table>'
        projected = project(table)[0]
        for separator in ['\f', '\v', '\u0085', '\u2028', '\u2029', '\r', '\r\n']:
            with self.subTest(separator=repr(separator)):
                prefix = '<p>Before' + separator + 'after</p>\n'
                self.assertEqual(project(prefix + table)[0], prefix + projected)

    def test_unselected_nested_owner_remains_literal(self):
        other = '<table class="other"><tr><td><table><tr><td>0</td></tr></table></td></tr></table>'
        selected = '<table class="authored"><caption>Costs</caption><tr><th scope="col">Value</th></tr><tr><td>1</td></tr></table>'
        self.assertEqual(project(other + selected, ['authored'])[0], other + project(selected)[0])
        with self.assertRaisesRegex(ValueError, 'Nested tables'):
            project(other)


if __name__ == "__main__":
    unittest.main()
