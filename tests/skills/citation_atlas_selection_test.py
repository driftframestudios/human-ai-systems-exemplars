#!/usr/bin/env python3
"""Behavior tests for the citation-atlas-selection lookup helper."""

import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any, Dict, Mapping


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPOSITORY_ROOT / ".agents/skills/citation-atlas-selection/scripts/lookup.py"
FIXTURE = REPOSITORY_ROOT / "tests/skills/fixtures/citation-atlas.synthetic.json"
RUN_TIMEOUT_SECONDS = 10


class CitationAtlasSelectionTests(unittest.TestCase):
    maxDiff = None

    def run_lookup(
        self, *arguments: str, atlas: Path = FIXTURE
    ) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--atlas", str(atlas), *arguments],
            cwd=REPOSITORY_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_SECONDS,
        )

    def run_atlas_payload(
        self, atlas: Mapping[str, Any], *arguments: str
    ) -> subprocess.CompletedProcess:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "atlas.json"
            path.write_text(json.dumps(atlas), encoding="utf-8")
            return self.run_lookup(*arguments, atlas=path)

    def fixture_payload(self) -> Dict[str, Any]:
        return json.loads(FIXTURE.read_text(encoding="utf-8"))

    def assert_success(self, process: subprocess.CompletedProcess) -> Mapping[str, Any]:
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertEqual(process.stderr, "")
        return json.loads(process.stdout)

    def assert_error(
        self, process: subprocess.CompletedProcess, returncode: int, code: str
    ) -> Mapping[str, Any]:
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

    def test_search_normalizes_before_finding_unicode_token_boundaries(self):
        atlas = self.fixture_payload()
        atlas["records"][2]["answers_contains"] = "Café research practices."
        payload = self.assert_success(
            self.run_atlas_payload(atlas, "search", "cafe\u0301")
        )
        self.assertEqual(payload["matches"], 1)
        self.assertEqual(payload["results"][0]["record"]["key"], "registry:research/beta")

    def test_phrase_bonus_requires_a_contiguous_complete_token_sequence(self):
        atlas = self.fixture_payload()
        atlas["records"][0]["answers_contains"] = "An alphabetical inventory."
        payload = self.assert_success(
            self.run_atlas_payload(atlas, "search", "alpha", "--limit", "10")
        )
        result = next(
            item
            for item in payload["results"]
            if item["record"]["key"] == "registry:methods/alpha"
        )
        self.assertNotIn("answers_contains", result["score_components"])
        self.assertNotIn("kindlight_url", result["score_components"])

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
                '{"metadata":{"schema_version":"0.1.0",'
                '"reference_revision":"r1","snapshot_date":"2030-01-02"},'
                '"private_operator_token":"first","private_operator_token":"second",'
                '"records":[]}',
                encoding="utf-8",
            )
            process = self.run_lookup("list", atlas=path)
        payload = self.assert_error(process, 4, "invalid_atlas_json")
        self.assertEqual(payload["error"]["details"]["reason"], "duplicate_object_key")
        self.assertNotIn("private_operator_token", process.stderr)

    def test_deep_json_returns_a_sanitized_decoder_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "private-deep-atlas.json"
            path.write_text("[" * 2000 + "0" + "]" * 2000, encoding="utf-8")
            process = self.run_lookup("list", atlas=path)
        payload = self.assert_error(process, 4, "invalid_atlas_json")
        self.assertEqual(payload["error"]["details"]["reason"], "decoder_resource_limit")
        self.assertNotIn(str(path), process.stderr)
        self.assertNotIn(str(SCRIPT), process.stderr)

        atlas = self.fixture_payload()
        atlas["ignored_brackets"] = "[" * 300
        self.assert_success(self.run_atlas_payload(atlas, "list"))

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

    def test_oversized_numeric_lexeme_stops_at_the_json_boundary(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "private-number-atlas.json"
            path.write_text(
                '{"metadata":{"schema_version":"0.1.0",'
                '"reference_revision":"r1","snapshot_date":"2030-01-02"},'
                '"private_numeric_value":' + "7" * 4096 + ',"records":[]}',
                encoding="utf-8",
            )
            process = self.run_lookup("list", atlas=path)
        payload = self.assert_error(process, 4, "invalid_atlas_json")
        self.assertEqual(payload["error"]["details"]["reason"], "json_number_too_long")
        self.assertNotIn(str(path), process.stderr)

    def test_duplicate_keys_fail_contract_validation(self):
        atlas = self.fixture_payload()
        atlas["records"].append(dict(atlas["records"][0]))
        process = self.run_atlas_payload(atlas, "list")
        self.assert_error(process, 5, "duplicate_record_key")

    def test_supported_schema_and_snapshot_date_are_explicit(self):
        for field, value, code in (
            ("schema_version", "9.0.0", "unsupported_atlas_schema"),
            ("snapshot_date", "2030-02-30", "invalid_atlas_contract"),
        ):
            with self.subTest(field=field, value=value):
                atlas = self.fixture_payload()
                atlas["metadata"][field] = value
                process = self.run_atlas_payload(atlas, "list")
                self.assert_error(process, 5, code)

    def test_record_field_shapes_fail_with_finite_contract_errors(self):
        cases = (
            ("required string", "key", ""),
            ("optional string", "answers_contains", ["unexpected"]),
            ("nullable string", "parent_key", 7),
            ("string list", "reader_jobs", "Use"),
        )
        for name, field, value in cases:
            with self.subTest(name=name):
                atlas = self.fixture_payload()
                atlas["records"][0][field] = value
                process = self.run_atlas_payload(atlas, "list")
                payload = self.assert_error(process, 5, "invalid_atlas_contract")
                self.assertEqual(payload["error"]["details"]["field"], field)

    def test_unpaired_unicode_surrogates_fail_with_finite_contract_errors(self):
        cases = (
            ("metadata", "reference_revision"),
            ("record string", "public_title"),
            ("record list", "headings"),
        )
        for name, field in cases:
            with self.subTest(name=name):
                atlas = self.fixture_payload()
                if name == "metadata":
                    atlas["metadata"][field] = "private-\ud800-value"
                elif name == "record list":
                    atlas["records"][0][field] = ["private-\ud800-value"]
                else:
                    atlas["records"][0][field] = "private-\ud800-value"
                process = self.run_atlas_payload(atlas, "list")
                payload = self.assert_error(process, 5, "invalid_atlas_contract")
                self.assertEqual(payload["error"]["details"]["field"], field)
                self.assertNotIn("private-", process.stderr)
                self.assertNotIn(str(SCRIPT), process.stderr)

    def test_canonical_relations_resolve_to_self_identified_public_routes(self):
        cases = []

        missing = self.fixture_payload()
        missing["records"][1]["canonical_key"] = "registry:missing"
        cases.append(("missing target", missing))

        indirect = self.fixture_payload()
        indirect["records"][2]["canonical_key"] = "registry:methods/alpha"
        indirect["records"][2]["canonical_url"] = indirect["records"][0]["kindlight_url"]
        indirect["records"][3]["canonical_key"] = "registry:research/beta"
        indirect["records"][3]["canonical_url"] = indirect["records"][2]["kindlight_url"]
        cases.append(("non-self target", indirect))

        mismatched = self.fixture_payload()
        mismatched["records"][0]["canonical_url"] = "https://public.example.org/other"
        cases.append(("route mismatch", mismatched))

        for name, atlas in cases:
            with self.subTest(name=name):
                process = self.run_atlas_payload(atlas, "list")
                self.assert_error(process, 5, "invalid_canonical_relation")

    def test_private_or_local_locator_fails_before_projection(self):
        for field, route in (
            ("kindlight_url", "file:///Users/operator/private-corpus.json"),
            ("canonical_url", "https://127.0.0.1/private"),
            ("canonical_url", "https://127.1/private"),
            ("canonical_url", "https://0177.0.0.1/private"),
            ("canonical_url", "https://0x7f.0.0.1/private"),
            ("canonical_url", "https://224.0.0.1/private"),
            ("canonical_url", "https://[ff0e::1]/private"),
            ("canonical_url", "https://[2001:4860::8888%25eth0]/private"),
            ("canonical_url", "https://exa_mple.com/private"),
            ("canonical_url", "https://foo%2eexample.com/private"),
            ("canonical_url", "https://EXAMPLE.com/private"),
        ):
            with self.subTest(field=field, route=route):
                atlas = self.fixture_payload()
                atlas["records"][0][field] = route
                process = self.run_atlas_payload(atlas, "list")
                self.assert_error(process, 5, "invalid_public_route")
                self.assertNotIn(route, process.stderr)

    def test_normalized_global_dns_and_ip_aliases_are_admitted(self):
        atlas = self.fixture_payload()
        atlas["records"][2]["public_aliases"].extend(
            (
                "https://public.example.org/beta-two",
                "https://8.8.8.8/beta",
                "https://[2606:4700:4700::1111]/beta",
                "https://xn--bcher-kva.example.org/beta",
            )
        )
        payload = self.assert_success(self.run_atlas_payload(atlas, "list"))
        self.assertEqual(payload["matches"], 3)

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
            timeout=RUN_TIMEOUT_SECONDS,
        )
        self.assert_error(process, 2, "invalid_arguments")


if __name__ == "__main__":
    unittest.main()
