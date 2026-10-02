"""Parameterized contracts for exact-reference output cardinality and agreement."""
import contextlib
import io
import json
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import reference_check


class ReferenceOutputContract(unittest.TestCase):
    def run_reference(self, handoff):
        observed = {
            "priorProbabilityYieldExceedsTwentyPercent": {
                "uniform": .8, "lowYield": .512, "highYield": .992,
            },
            "gammaPrior": {
                "probabilityWithinTenEligibleMinutes": 1 / 7,
                "waitingDensityAtTenPerMinute": 60 / 4900,
            },
            "transitionScenario": {"expectedHandoffMinutesByState": handoff},
        }
        completed = SimpleNamespace(stdout=json.dumps(observed))
        output = io.StringIO()
        with patch("reference_check.subprocess.run", return_value=completed):
            with contextlib.redirect_stdout(output):
                reference_check.main()
        return json.loads(output.getvalue())

    def test_complete_output_compares_all_nine_values(self):
        result = self.run_reference([21.25, 11.25, 6.25, 0])
        self.assertEqual(result["result"], "pass")
        self.assertEqual(result["exact_reference_comparisons"], 9)

    def test_state_count_requires_exactly_four(self):
        for handoff in [[], [21.25], [21.25, 11.25, 6.25], [21.25, 11.25, 6.25, 0, 0]]:
            with self.subTest(state_count=len(handoff)):
                with self.assertRaises(ValueError) as error:
                    self.run_reference(handoff)
                self.assertEqual(
                    str(error.exception),
                    "transitionScenario.expectedHandoffMinutesByState requires exactly "
                    f"4 state values in D/R/V/H order; received {len(handoff)}.",
                )

    def test_state_sequence_requires_a_list(self):
        for handoff, type_name in [(None, "NoneType"), ({}, "dict"), ("", "str"), (4, "int")]:
            with self.subTest(input_type=type_name):
                with self.assertRaises(ValueError) as error:
                    self.run_reference(handoff)
                self.assertEqual(
                    str(error.exception),
                    "transitionScenario.expectedHandoffMinutesByState requires a list "
                    f"in D/R/V/H order; received {type_name}.",
                )

    def test_changed_state_requires_mathematical_agreement(self):
        with self.assertRaises(AssertionError):
            self.run_reference([21.25, 12.25, 6.25, 0])


if __name__ == "__main__":
    unittest.main()
