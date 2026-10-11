#!/usr/bin/env python3
"""Behavior tests for the citation-atlas-selection lookup helper."""

import json
import hashlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPOSITORY_ROOT / ".agents/skills/citation-atlas-selection/scripts/lookup.py"
FIXTURE = REPOSITORY_ROOT / "tests/skills/fixtures/citation-atlas.synthetic.json"


class CitationAtlasSelectionTests(unittest.TestCase):
    maxDiff = None

    def run_lookup(self, *arguments, atlas=FIXTURE):
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--atlas", str(atlas), *arguments],
            cwd=REPOSITORY_ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

    def assert_success(self, process):
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertEqual(process.stderr, "")
        return json.loads(process.stdout)

    def assert_error(self, process, returncode, code):
        self.assertEqual(process.returncode, returncode, process.stdout)
        self.assertEqual(process.stdout, "")
        payload = json.loads(process.stderr)
        self.assertEqual(payload["error"]["code"], code)
        return payload

    def test_list_defaults_to_current_and_uses_stable_order(self):
        payload = self.assert_success(self.run_lookup("list", "--limit", "10"))
        self.assertEqual(payload["matches"], 3)
        self.assertEqual(
            [record["key"] for record in payload["records"]],
            ["registry:aliases/alpha", "registry:methods/alpha", "registry:research/beta"],
        )
        self.assertEqual(payload["filters"]["lifecycle"], "Current")
        fixture_bytes = FIXTURE.read_bytes()
        self.assertEqual(payload["atlas"]["source_bytes"], len(fixture_bytes))
        self.assertEqual(
            payload["atlas"]["source_sha256"],
            hashlib.sha256(fixture_bytes).hexdigest(),
        )

    def test_include_archived_expands_the_inventory(self):
        payload = self.assert_success(
            self.run_lookup("list", "--include-archived", "--limit", "10")
        )
        self.assertEqual(payload["matches"], 4)
        self.assertIsNone(payload["filters"]["lifecycle"])

    def test_exact_key_returns_one_allowlisted_projection(self):
        payload = self.assert_success(
            self.run_lookup("get", "--key", "registry:methods/alpha")
        )
        self.assertEqual(payload["record"]["key"], "registry:methods/alpha")
        self.assertNotIn("untrusted_instruction", payload["record"])

    def test_archived_exact_key_requires_an_explicit_lifecycle(self):
        hidden = self.run_lookup("get", "--key", "registry:archive/alpha-history")
        self.assert_error(hidden, 6, "record_not_found")

        visible = self.assert_success(
            self.run_lookup(
                "get",
                "--key",
                "registry:archive/alpha-history",
                "--lifecycle",
                "Archived",
            )
        )
        self.assertEqual(visible["record"]["source_lifecycle"], "Archived")

    def test_duplicate_exact_title_reports_matching_keys(self):
        process = self.run_lookup("get", "--title", "Alpha Selection Method")
        payload = self.assert_error(process, 7, "ambiguous_exact_selector")
        self.assertEqual(
            payload["error"]["details"]["keys"],
            ["registry:methods/alpha", "registry:aliases/alpha"],
        )

    def test_exact_url_returns_one_record(self):
        payload = self.assert_success(
            self.run_lookup("get", "--url", "https://public.example.org/beta-boundary-research")
        )
        self.assertEqual(payload["record"]["key"], "registry:research/beta")
        self.assertIsNone(payload["record"]["parent_key"])

        alias = self.assert_success(
            self.run_lookup("get", "--url", "https://public.example.org/beta")
        )
        self.assertEqual(alias["record"]["key"], "registry:research/beta")

    def test_search_prefers_canonical_record_on_equal_title(self):
        payload = self.assert_success(self.run_lookup("search", "Alpha Selection Method"))
        self.assertEqual(payload["results"][0]["record"]["key"], "registry:methods/alpha")
        self.assertGreater(payload["results"][0]["score"], 0)
        self.assertIn("score_components", payload["results"][0])

    def test_search_defaults_to_all_terms_and_can_open_to_any(self):
        narrow = self.assert_success(self.run_lookup("search", "alpha evidence"))
        self.assertEqual(narrow["matches"], 0)

        broad = self.assert_success(
            self.run_lookup("search", "alpha evidence", "--match", "any", "--limit", "10")
        )
        self.assertEqual(broad["matches"], 3)

    def test_search_terms_match_complete_tokens(self):
        payload = self.assert_success(self.run_lookup("search", "ha"))
        self.assertEqual(payload["matches"], 0)

    def test_filters_compare_complete_values_case_insensitively(self):
        payload = self.assert_success(
            self.run_lookup(
                "search",
                "boundary",
                "--family",
                "research",
                "--role",
                "research synthesis",
                "--job",
                "read the evidence",
            )
        )
        self.assertEqual(payload["matches"], 1)
        self.assertEqual(payload["results"][0]["record"]["key"], "registry:research/beta")

    def test_unknown_fields_are_neither_searchable_nor_returned(self):
        payload = self.assert_success(self.run_lookup("search", "exactneedle"))
        self.assertEqual(payload["matches"], 0)

    def test_output_is_byte_deterministic(self):
        first = self.run_lookup("search", "selection", "--limit", "10")
        second = self.run_lookup("search", "selection", "--limit", "10")
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(first.stdout, second.stdout)

    def test_missing_file_has_distinct_error(self):
        missing_path = FIXTURE.with_name("missing.json")
        process = self.run_lookup("list", atlas=missing_path)
        self.assert_error(process, 3, "atlas_file_unavailable")
        self.assertNotIn(str(missing_path), process.stderr)

    def test_oversized_file_stops_before_parsing(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "oversized.json"
            with path.open("wb") as stream:
                stream.truncate(64 * 1024 * 1024 + 1)
            process = self.run_lookup("list", atlas=path)
        self.assert_error(process, 3, "atlas_file_too_large")

    def test_invalid_json_has_distinct_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid.json"
            path.write_text("{", encoding="utf-8")
            process = self.run_lookup("list", atlas=path)
        self.assert_error(process, 4, "invalid_atlas_json")
        self.assertNotIn(str(path), process.stderr)

    def test_invalid_utf8_has_distinct_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "invalid-encoding.json"
            path.write_bytes(b"\xff")
            process = self.run_lookup("list", atlas=path)
        self.assert_error(process, 4, "invalid_atlas_encoding")

    def test_duplicate_json_members_fail_before_record_selection(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate-member.json"
            path.write_text(
                '{"metadata":{"schema_version":"0.1.0","schema_version":"changed",'
                '"reference_revision":"r1","snapshot_date":"2030-01-02"},"records":[]}',
                encoding="utf-8",
            )
            process = self.run_lookup("list", atlas=path)
        self.assert_error(process, 4, "invalid_atlas_json")

    def test_non_standard_json_constants_fail_strict_parsing(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "constant.json"
            path.write_text(
                '{"metadata":{"schema_version":"0.1.0","reference_revision":"r1",'
                '"snapshot_date":"2030-01-02"},"records":[],"value":NaN}',
                encoding="utf-8",
            )
            process = self.run_lookup("list", atlas=path)
        self.assert_error(process, 4, "invalid_atlas_json")

    def test_duplicate_keys_fail_contract_validation(self):
        atlas = json.loads(FIXTURE.read_text(encoding="utf-8"))
        atlas["records"].append(dict(atlas["records"][0]))
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.json"
            path.write_text(json.dumps(atlas), encoding="utf-8")
            process = self.run_lookup("list", atlas=path)
        self.assert_error(process, 5, "duplicate_record_key")

    def test_private_or_local_locator_fails_before_projection(self):
        for field, route in (
            ("kindlight_url", "file:///Users/operator/private-corpus.json"),
            ("canonical_url", "https://127.0.0.1/private"),
            ("canonical_url", "https://127.1/private"),
            ("canonical_url", "https://0177.0.0.1/private"),
            ("canonical_url", "https://0x7f.0.0.1/private"),
        ):
            atlas = json.loads(FIXTURE.read_text(encoding="utf-8"))
            atlas["records"][0][field] = route
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "private-route.json"
                path.write_text(json.dumps(atlas), encoding="utf-8")
                process = self.run_lookup("list", atlas=path)
            self.assert_error(process, 5, "invalid_public_route")
            self.assertNotIn(route, process.stderr)

    def test_limit_and_offset_errors_remain_machine_readable(self):
        limit = self.run_lookup("list", "--limit", "0")
        self.assert_error(limit, 2, "invalid_limit")
        offset = self.run_lookup("search", "alpha", "--offset", "-1")
        self.assert_error(offset, 2, "invalid_offset")

    def test_explicit_atlas_argument_is_required(self):
        process = subprocess.run(
            [sys.executable, str(SCRIPT), "list"],
            cwd=REPOSITORY_ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        self.assert_error(process, 2, "invalid_arguments")


if __name__ == "__main__":
    unittest.main()
