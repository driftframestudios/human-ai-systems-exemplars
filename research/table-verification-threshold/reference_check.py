"""Exact rational reference fixtures for the bounded JavaScript scenario model.

Standard-library implementation. This checks arithmetic, not study effectiveness.
The beta tail requires integer shapes; the Gamma waiting formula here uses an
integer shape. The fixed-state backward equation uses exact rational elimination.
"""
from fractions import Fraction
from math import comb, isclose
from pathlib import Path
import json
import subprocess


def beta_upper_tail(a, b, x):
    if type(a) is not int or type(b) is not int or min(a, b) < 1 or a + b > 1000:
        raise ValueError("positive integer shapes with total at most 1000 required")
    x = Fraction(x)
    if not 0 <= x <= 1:
        raise ValueError("x must be a probability")
    n = a + b - 1
    return sum((Fraction(comb(n, j)) * x**j * (1 - x)**(n-j) for j in range(a)), Fraction(0))


def waiting_probability(shape, rate, horizon):
    if type(shape) is not int or not 1 <= shape <= 1000:
        raise ValueError("integer shape from 1 through 1000 required")
    rate, horizon = Fraction(rate), Fraction(horizon)
    if rate <= 0 or horizon < 0:
        raise ValueError("positive rate and nonnegative eligible horizon required")
    return 1 - (rate / (rate + horizon))**shape


def waiting_density(shape, rate, horizon):
    waiting_probability(shape, rate, horizon)
    rate, horizon = Fraction(rate), Fraction(horizon)
    return shape * rate**shape / (rate + horizon)**(shape + 1)


def solve_exact(matrix, rhs):
    """O(n^3) rational operations, restricted to the three transient states."""
    if len(matrix) != 3 or len(rhs) != 3 or any(len(row) != 3 for row in matrix):
        raise ValueError("three-state transient system required")
    work = [[Fraction(value) for value in row] + [Fraction(rhs[i])] for i, row in enumerate(matrix)]
    for col in range(3):
        pivot = next((r for r in range(col, 3) if work[r][col]), None)
        if pivot is None:
            raise ValueError("singular transient system")
        work[col], work[pivot] = work[pivot], work[col]
        scale = work[col][col]
        work[col] = [value / scale for value in work[col]]
        for row in range(3):
            if row != col:
                factor = work[row][col]
                work[row] = [value - factor * work[col][j] for j, value in enumerate(work[row])]
    return [row[-1] for row in work]


def main():
    result = subprocess.run(["node", str(Path(__file__).with_name("scenarios.mjs"))], check=True, capture_output=True, text=True)
    observed = json.loads(result.stdout)
    comparisons = []
    for a, b, key in [(1, 1, "uniform"), (1, 3, "lowYield"), (3, 1, "highYield")]:
        comparisons.append((observed["priorProbabilityYieldExceedsTwentyPercent"][key], beta_upper_tail(a, b, Fraction(1, 5))))
    comparisons.append((observed["gammaPrior"]["probabilityWithinTenEligibleMinutes"], waiting_probability(1, 60, 10)))
    comparisons.append((observed["gammaPrior"]["waitingDensityAtTenPerMinute"], waiting_density(1, 60, 10)))
    # Q_T for the explicitly illustrative D->R, R->V, V->R/H scenario.
    q = [[Fraction(-1,10), Fraction(1,10), 0], [0, Fraction(-1,5), Fraction(1,5)], [0, Fraction(1,20), Fraction(-1,4)]]
    expected = solve_exact(q, [-1, -1, -1]) + [Fraction(0)]
    comparisons.extend(zip(observed["transitionScenario"]["expectedHandoffMinutesByState"], expected))
    for actual, exact in comparisons:
        if not isclose(actual, float(exact), rel_tol=1e-12, abs_tol=1e-12):
            raise AssertionError(f"scenario differs from exact reference: {actual} versus {exact}")
    print(json.dumps({"result": "pass", "exact_reference_comparisons": len(comparisons), "coverage": "integer beta tails, Gamma waiting probability/density, fixed-rate backward equation", "boundary": "forward numerical integration and empirical study effectiveness retain separate observations"}))


if __name__ == "__main__":
    main()
