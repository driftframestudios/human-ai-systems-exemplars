"""Select the four owned Python table components without changing their tests."""

import argparse
from pathlib import Path
import sys
import unittest


TABLE_ROOT = Path(__file__).resolve().parent
COMPONENTS = (
    ("parser", "prototype-labels", "test_parser.py"),
    ("hiring-table-media", ".", "test_hiring_table_media.py"),
    ("table-context", ".", "test_table_context.py"),
    ("visitor-labels", "visitor-labels", "test_visitor_labels.py"),
)


class DiscoveryError(RuntimeError):
    """The selected component could not supply a nonempty test population."""


def discover_components(component, root=TABLE_ROOT):
    selected = [item for item in COMPONENTS if component in (item[0], "all")]
    if not selected:
        raise DiscoveryError(f"unknown component: {component}")

    discovered = []
    for name, directory, pattern in selected:
        start = root / directory
        # Each start directory retains unittest's own top-level import boundary.
        loader = unittest.TestLoader()
        try:
            suite = loader.discover(str(start), pattern=pattern)
        except (ImportError, OSError) as error:
            raise DiscoveryError(f"{name}: discovery failed: {error}") from error
        count = suite.countTestCases()
        if count == 0:
            raise DiscoveryError(f"{name}: no tests discovered in {start / pattern}")
        discovered.append((name, count, suite))
    return discovered


def run(component, *, root=TABLE_ROOT, stream=None):
    output = sys.stderr if stream is None else stream
    try:
        components = discover_components(component, root)
    except DiscoveryError as error:
        print(f"table components: {error}", file=output)
        return 2

    for name, count, _ in components:
        print(f"{name}: {count} discovered test(s)", file=output)
    suite = unittest.TestSuite(part for _, _, part in components)
    result = unittest.TextTestRunner(stream=output, verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "component",
        choices=[name for name, _, _ in COMPONENTS] + ["all"],
        help="one component, or explicitly all four; no implicit selection",
    )
    return run(parser.parse_args(argv).component)


if __name__ == "__main__":
    raise SystemExit(main())
