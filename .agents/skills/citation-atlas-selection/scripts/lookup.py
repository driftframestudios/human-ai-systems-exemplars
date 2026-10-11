#!/usr/bin/env python3
"""Deterministic, offline selection from an explicit citation Atlas JSON file."""

from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple
from urllib.parse import urlsplit


EXIT_ARGUMENT = 2
EXIT_FILE = 3
EXIT_JSON = 4
EXIT_CONTRACT = 5
EXIT_NOT_FOUND = 6
EXIT_AMBIGUOUS = 7

CURRENT_LIFECYCLE = "Current"
MAX_LIMIT = 1000
MAX_ATLAS_BYTES = 64 * 1024 * 1024

STRING_FIELDS = (
    "key",
    "exact_notion_title",
    "family",
    "surface_class",
    "resource_role",
    "source_lifecycle",
    "kindlight_url",
    "public_title",
    "canonical_key",
    "canonical_url",
    "answers_contains",
    "link_when",
    "citation_boundary",
    "direct_visit_trigger",
    "route_state",
    "content_basis",
    "hint_basis",
    "source_updated",
    "checked",
    "public_observed_at",
    "receiving_use",
    "discovery_text_basis",
    "use_condition_basis",
)

NULLABLE_STRING_FIELDS = (
    "parent_key",
)

LIST_FIELDS = (
    "reader_jobs",
    "public_aliases",
    "headings",
)

REQUIRED_STRING_FIELDS = (
    "key",
    "exact_notion_title",
    "family",
    "surface_class",
    "resource_role",
    "source_lifecycle",
    "kindlight_url",
    "public_title",
    "canonical_key",
    "canonical_url",
    "route_state",
)

SEARCH_FIELD_WEIGHTS = (
    ("exact_notion_title", 14),
    ("public_title", 13),
    ("key", 12),
    ("kindlight_url", 11),
    ("canonical_url", 10),
    ("public_aliases", 9),
    ("family", 8),
    ("resource_role", 8),
    ("reader_jobs", 8),
    ("headings", 6),
    ("answers_contains", 4),
    ("link_when", 4),
    ("citation_boundary", 3),
    ("direct_visit_trigger", 3),
    ("receiving_use", 2),
)

TOKEN_PATTERN = re.compile(r"[^\W_]+(?:[’'\-][^\W_]+)*", re.UNICODE)
CONTROL_PATTERN = re.compile(r"[\x00-\x1f\x7f]")
LEGACY_IPV4_COMPONENT_PATTERN = re.compile(r"(?:0[xX][0-9a-fA-F]+|[0-9]+)")
LOCAL_HOST_SUFFIXES = (
    "localhost",
    "local",
    "internal",
    "home.arpa",
    "invalid",
    "test",
)


class LookupFailure(Exception):
    """Expected command failure with a stable machine-readable exit code."""

    def __init__(
        self,
        exit_code: int,
        error_code: str,
        message: str,
        details: Optional[Mapping[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.exit_code = exit_code
        self.error_code = error_code
        self.message = message
        self.details = dict(details or {})


class JsonArgumentParser(argparse.ArgumentParser):
    """argparse surface that keeps errors machine-readable."""

    def error(self, message: str) -> None:
        _write_error("invalid_arguments", message)
        raise SystemExit(EXIT_ARGUMENT)


class StrictJsonFailure(ValueError):
    """JSON input contains a duplicate key or non-standard constant."""


def _write_json(value: Mapping[str, Any], *, stream: Any = sys.stdout) -> None:
    stream.write(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True))
    stream.write("\n")


def _write_error(
    code: str,
    message: str,
    details: Optional[Mapping[str, Any]] = None,
) -> None:
    payload: Dict[str, Any] = {"error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = dict(details)
    _write_json(payload, stream=sys.stderr)


def _normalized(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _tokens(value: str) -> List[str]:
    return [_normalized(token) for token in TOKEN_PATTERN.findall(value)]


def _string_list(value: Any, field: str, record_index: int) -> List[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            f"Record field '{field}' must be an array of strings.",
            {"record_index": record_index, "field": field},
        )
    return list(value)


def _strict_object(pairs: Sequence[Tuple[str, Any]]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise StrictJsonFailure(f"duplicate object key: {key}")
        result[key] = value
    return result


def _public_https_url(value: str, field: str, record_index: int) -> str:
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as error:
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_public_route",
            f"Record field '{field}' must use a normalized public HTTPS route.",
            {"record_index": record_index, "field": field},
        ) from error

    hostname = parsed.hostname
    if (
        value.strip() != value
        or CONTROL_PATTERN.search(value)
        or "\\" in value
        or "{" in value
        or "}" in value
        or parsed.scheme != "https"
        or hostname is None
        or parsed.username is not None
        or parsed.password is not None
        or port is not None
        or parsed.query
        or parsed.fragment
    ):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_public_route",
            f"Record field '{field}' must use a normalized public HTTPS route.",
            {"record_index": record_index, "field": field},
        )

    normalized_host = hostname.rstrip(".").casefold()
    if normalized_host != hostname.casefold() or any(
        normalized_host == suffix or normalized_host.endswith(f".{suffix}")
        for suffix in LOCAL_HOST_SUFFIXES
    ):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_public_route",
            f"Record field '{field}' must use a public host.",
            {"record_index": record_index, "field": field},
        )
    try:
        address = ipaddress.ip_address(normalized_host)
    except ValueError:
        # Browsers and resolvers may interpret one-to-four numeric hostname
        # components as legacy IPv4, including shortened, octal, and hex forms.
        # Treat the complete numeric shape as an address instead of DNS so a
        # public-looking Atlas route cannot resolve to loopback or local space.
        host_components = normalized_host.split(".")
        if 1 <= len(host_components) <= 4 and all(
            LEGACY_IPV4_COMPONENT_PATTERN.fullmatch(component)
            for component in host_components
        ):
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_public_route",
                f"Record field '{field}' must use a public host.",
                {"record_index": record_index, "field": field},
            )
        if "." not in normalized_host:
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_public_route",
                f"Record field '{field}' must use a public host.",
                {"record_index": record_index, "field": field},
            )
    else:
        if not address.is_global:
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_public_route",
                f"Record field '{field}' must use a public host.",
                {"record_index": record_index, "field": field},
            )
    return value


def _reject_json_constant(value: str) -> None:
    raise StrictJsonFailure(f"non-standard JSON constant: {value}")


def _load_atlas(
    path: Path,
) -> Tuple[Mapping[str, Any], List[Mapping[str, Any]], Mapping[str, Any]]:
    try:
        with path.open("rb") as stream:
            raw_bytes = stream.read(MAX_ATLAS_BYTES + 1)
    except (FileNotFoundError, PermissionError, OSError) as error:
        raise LookupFailure(
            EXIT_FILE,
            "atlas_file_unavailable",
            "The supplied Atlas file could not be read.",
            {"reason": type(error).__name__},
        ) from error

    if len(raw_bytes) > MAX_ATLAS_BYTES:
        raise LookupFailure(
            EXIT_FILE,
            "atlas_file_too_large",
            "The supplied Atlas exceeds the local lookup size boundary.",
            {"bytes": len(raw_bytes), "maximum_bytes": MAX_ATLAS_BYTES},
        )

    try:
        raw = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as error:
        raise LookupFailure(
            EXIT_JSON,
            "invalid_atlas_encoding",
            "The supplied Atlas must use UTF-8 encoding.",
            {"start": error.start},
        ) from error

    try:
        atlas = json.loads(
            raw,
            object_pairs_hook=_strict_object,
            parse_constant=_reject_json_constant,
        )
    except json.JSONDecodeError as error:
        raise LookupFailure(
            EXIT_JSON,
            "invalid_atlas_json",
            "The supplied Atlas file is not valid JSON.",
            {"line": error.lineno, "column": error.colno},
        ) from error
    except StrictJsonFailure as error:
        raise LookupFailure(
            EXIT_JSON,
            "invalid_atlas_json",
            "The supplied Atlas must use strict JSON with unique object keys.",
            {"reason": str(error)},
        ) from error

    if not isinstance(atlas, dict):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            "The Atlas root must be an object.",
        )

    metadata = atlas.get("metadata")
    records = atlas.get("records")
    if not isinstance(metadata, dict) or not isinstance(records, list):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            "The Atlas must contain a metadata object and a records array.",
        )

    for field in ("schema_version", "reference_revision", "snapshot_date"):
        if not isinstance(metadata.get(field), str):
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_atlas_contract",
                f"Atlas metadata field '{field}' must be a string.",
                {"field": field},
            )

    validated: List[Mapping[str, Any]] = []
    keys = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_atlas_contract",
                "Every Atlas record must be an object.",
                {"record_index": index},
            )
        for field in REQUIRED_STRING_FIELDS:
            if not isinstance(record.get(field), str) or not record[field].strip():
                raise LookupFailure(
                    EXIT_CONTRACT,
                    "invalid_atlas_contract",
                    f"Record field '{field}' must be a non-empty string.",
                    {"record_index": index, "field": field},
                )
        for field in STRING_FIELDS:
            if field in record and not isinstance(record[field], str):
                raise LookupFailure(
                    EXIT_CONTRACT,
                    "invalid_atlas_contract",
                    f"Record field '{field}' must be a string when present.",
                    {"record_index": index, "field": field},
                )
        for field in NULLABLE_STRING_FIELDS:
            if field in record and record[field] is not None and not isinstance(record[field], str):
                raise LookupFailure(
                    EXIT_CONTRACT,
                    "invalid_atlas_contract",
                    f"Record field '{field}' must be a string or null when present.",
                    {"record_index": index, "field": field},
                )
        for field in LIST_FIELDS:
            _string_list(record.get(field), field, index)
        _public_https_url(record["kindlight_url"], "kindlight_url", index)
        _public_https_url(record["canonical_url"], "canonical_url", index)
        for alias_index, alias in enumerate(record["public_aliases"]):
            _public_https_url(alias, f"public_aliases[{alias_index}]", index)
        key = record["key"]
        if key in keys:
            raise LookupFailure(
                EXIT_CONTRACT,
                "duplicate_record_key",
                "Atlas record keys must be unique.",
                {"record_index": index, "key": key},
            )
        keys.add(key)
        validated.append(record)

    source_receipt = {
        "source_bytes": len(raw_bytes),
        "source_sha256": hashlib.sha256(raw_bytes).hexdigest(),
    }
    return metadata, validated, source_receipt


def _project(record: Mapping[str, Any]) -> Dict[str, Any]:
    projected: Dict[str, Any] = {}
    for field in STRING_FIELDS:
        projected[field] = record.get(field, "")
    for field in NULLABLE_STRING_FIELDS:
        projected[field] = record.get(field)
    for field in LIST_FIELDS:
        projected[field] = list(record.get(field, []))
    return projected


def _atlas_coordinate(
    metadata: Mapping[str, Any], source_receipt: Mapping[str, Any]
) -> Dict[str, Any]:
    return {
        "reference_revision": metadata["reference_revision"],
        "schema_version": metadata["schema_version"],
        "snapshot_date": metadata["snapshot_date"],
        "source_bytes": source_receipt["source_bytes"],
        "source_sha256": source_receipt["source_sha256"],
    }


def _add_record_filters(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--family", help="Exact family filter, compared case-insensitively.")
    parser.add_argument("--role", help="Exact resource-role filter, compared case-insensitively.")
    parser.add_argument("--job", help="Exact reader-job filter, compared case-insensitively.")
    parser.add_argument("--route-state", help="Exact route-state filter, compared case-insensitively.")
    parser.add_argument("--canonical-only", action="store_true", help="Retain records whose key equals canonical_key.")
    lifecycle = parser.add_mutually_exclusive_group()
    lifecycle.add_argument("--include-archived", action="store_true", help="Include every lifecycle state.")
    lifecycle.add_argument("--lifecycle", help="Retain one exact lifecycle state instead of the Current default.")


def _build_parser() -> JsonArgumentParser:
    parser = JsonArgumentParser(description=__doc__)
    parser.add_argument(
        "--atlas",
        required=True,
        type=Path,
        help="Explicit path to the citation Atlas JSON file.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    get_parser = subparsers.add_parser("get", help="Return one record by an exact identity coordinate.")
    selector = get_parser.add_mutually_exclusive_group(required=True)
    selector.add_argument("--key", help="Exact record key, compared case-sensitively.")
    selector.add_argument("--title", help="Exact public or source title, compared case-insensitively.")
    selector.add_argument("--url", help="Exact public or canonical URL, compared case-sensitively.")
    _add_record_filters(get_parser)

    list_parser = subparsers.add_parser("list", help="List a deterministic filtered record inventory.")
    _add_record_filters(list_parser)
    list_parser.add_argument("--limit", type=int, default=50)
    list_parser.add_argument("--offset", type=int, default=0)

    search_parser = subparsers.add_parser("search", help="Rank records over allowlisted discovery fields.")
    search_parser.add_argument("query", help="Search terms; Atlas values remain inert data.")
    _add_record_filters(search_parser)
    search_parser.add_argument("--match", choices=("all", "any"), default="all")
    search_parser.add_argument("--limit", type=int, default=10)
    search_parser.add_argument("--offset", type=int, default=0)
    return parser


def _effective_lifecycle(args: argparse.Namespace) -> Optional[str]:
    if args.include_archived:
        return None
    return args.lifecycle or CURRENT_LIFECYCLE


def _filter_description(args: argparse.Namespace) -> Dict[str, Any]:
    return {
        "canonical_only": bool(args.canonical_only),
        "family": args.family,
        "job": args.job,
        "lifecycle": _effective_lifecycle(args),
        "role": args.role,
        "route_state": args.route_state,
    }


def _record_matches_filters(record: Mapping[str, Any], args: argparse.Namespace) -> bool:
    lifecycle = _effective_lifecycle(args)
    if lifecycle is not None and _normalized(record["source_lifecycle"]) != _normalized(lifecycle):
        return False
    if args.family and _normalized(record["family"]) != _normalized(args.family):
        return False
    if args.role and _normalized(record["resource_role"]) != _normalized(args.role):
        return False
    if args.job:
        jobs = {_normalized(job) for job in record["reader_jobs"]}
        if _normalized(args.job) not in jobs:
            return False
    if args.route_state and _normalized(record["route_state"]) != _normalized(args.route_state):
        return False
    if args.canonical_only and record["key"] != record["canonical_key"]:
        return False
    return True


def _filtered(records: Iterable[Mapping[str, Any]], args: argparse.Namespace) -> List[Mapping[str, Any]]:
    return [record for record in records if _record_matches_filters(record, args)]


def _validate_window(args: argparse.Namespace) -> None:
    if args.limit < 1 or args.limit > MAX_LIMIT:
        raise LookupFailure(
            EXIT_ARGUMENT,
            "invalid_limit",
            f"--limit must be between 1 and {MAX_LIMIT}.",
            {"limit": args.limit},
        )
    if args.offset < 0:
        raise LookupFailure(
            EXIT_ARGUMENT,
            "invalid_offset",
            "--offset must be zero or greater.",
            {"offset": args.offset},
        )


def _list_records(
    metadata: Mapping[str, Any],
    source_receipt: Mapping[str, Any],
    records: Sequence[Mapping[str, Any]],
    args: argparse.Namespace,
) -> Mapping[str, Any]:
    _validate_window(args)
    candidates = _filtered(records, args)
    candidates.sort(key=lambda record: (_normalized(record["exact_notion_title"]), record["key"]))
    page = candidates[args.offset : args.offset + args.limit]
    return {
        "atlas": _atlas_coordinate(metadata, source_receipt),
        "command": "list",
        "filters": _filter_description(args),
        "matches": len(candidates),
        "offset": args.offset,
        "records": [_project(record) for record in page],
        "returned": len(page),
    }


def _get_record(
    metadata: Mapping[str, Any],
    source_receipt: Mapping[str, Any],
    records: Sequence[Mapping[str, Any]],
    args: argparse.Namespace,
) -> Mapping[str, Any]:
    candidates = _filtered(records, args)
    selector: Dict[str, str]
    if args.key is not None:
        selector = {"key": args.key}
        matches = [record for record in candidates if record["key"] == args.key]
    elif args.title is not None:
        selector = {"title": args.title}
        target = _normalized(args.title)
        matches = [
            record
            for record in candidates
            if target in {_normalized(record["exact_notion_title"]), _normalized(record["public_title"])}
        ]
    else:
        selector = {"url": args.url}
        matches = [
            record
            for record in candidates
            if args.url
            in {record["kindlight_url"], record["canonical_url"], *record["public_aliases"]}
        ]

    matches.sort(key=lambda record: (record["key"] != record["canonical_key"], record["key"]))
    if not matches:
        raise LookupFailure(
            EXIT_NOT_FOUND,
            "record_not_found",
            "No record matches the exact selector and active filters.",
            {"filters": _filter_description(args), "selector": selector},
        )
    if len(matches) > 1:
        raise LookupFailure(
            EXIT_AMBIGUOUS,
            "ambiguous_exact_selector",
            "The exact selector matches more than one record; repeat with one exact key.",
            {"keys": [record["key"] for record in matches], "selector": selector},
        )
    return {
        "atlas": _atlas_coordinate(metadata, source_receipt),
        "command": "get",
        "filters": _filter_description(args),
        "record": _project(matches[0]),
        "selector": selector,
    }


def _field_text(record: Mapping[str, Any], field: str) -> str:
    value = record.get(field, "")
    if isinstance(value, list):
        return " ".join(value)
    return value if isinstance(value, str) else ""


def _score_record(record: Mapping[str, Any], query: str, terms: Sequence[str]) -> Tuple[int, Dict[str, int]]:
    normalized_query = _normalized(query)
    score = 0
    components: Dict[str, int] = {}

    exact_values = {
        "exact_key": (_normalized(record["key"]), 100000),
        "exact_public_url": (_normalized(record["kindlight_url"]), 95000),
        "exact_canonical_url": (_normalized(record["canonical_url"]), 94000),
        "exact_source_title": (_normalized(record["exact_notion_title"]), 90000),
        "exact_public_title": (_normalized(record["public_title"]), 89000),
    }
    for label, (value, bonus) in exact_values.items():
        if normalized_query == value:
            components[label] = bonus
            score += bonus

    for field, weight in SEARCH_FIELD_WEIGHTS:
        field_text = _field_text(record, field)
        value = _normalized(field_text)
        field_tokens = set(_tokens(field_text))
        field_score = sum(weight for term in terms if term in field_tokens)
        if normalized_query and normalized_query in value:
            field_score += weight * 4
        if field_score:
            components[field] = field_score
            score += field_score
    return score, components


def _search_records(
    metadata: Mapping[str, Any],
    source_receipt: Mapping[str, Any],
    records: Sequence[Mapping[str, Any]],
    args: argparse.Namespace,
) -> Mapping[str, Any]:
    _validate_window(args)
    terms = list(dict.fromkeys(_tokens(args.query)))
    if not terms:
        raise LookupFailure(
            EXIT_ARGUMENT,
            "empty_query",
            "The search query must contain at least one word or number.",
        )

    ranked: List[Tuple[int, bool, str, str, Mapping[str, Any], Mapping[str, int]]] = []
    for record in _filtered(records, args):
        searchable_tokens = {
            token
            for field, _weight in SEARCH_FIELD_WEIGHTS
            for token in _tokens(_field_text(record, field))
        }
        term_hits = [term in searchable_tokens for term in terms]
        if args.match == "all" and not all(term_hits):
            continue
        if args.match == "any" and not any(term_hits):
            continue
        score, components = _score_record(record, args.query, terms)
        ranked.append(
            (
                score,
                record["key"] != record["canonical_key"],
                _normalized(record["exact_notion_title"]),
                record["key"],
                record,
                components,
            )
        )

    ranked.sort(key=lambda item: (-item[0], item[1], item[2], item[3]))
    page = ranked[args.offset : args.offset + args.limit]
    results = []
    for score, _is_alias, _title, _key, record, components in page:
        results.append(
            {
                "record": _project(record),
                "score": score,
                "score_components": dict(sorted(components.items())),
            }
        )
    return {
        "atlas": _atlas_coordinate(metadata, source_receipt),
        "command": "search",
        "filters": _filter_description(args),
        "match": args.match,
        "matches": len(ranked),
        "offset": args.offset,
        "query": args.query,
        "results": results,
        "returned": len(results),
        "terms": terms,
    }


def run(argv: Optional[Sequence[str]] = None) -> Mapping[str, Any]:
    parser = _build_parser()
    args = parser.parse_args(argv)
    metadata, records, source_receipt = _load_atlas(args.atlas)
    if args.command == "get":
        return _get_record(metadata, source_receipt, records, args)
    if args.command == "list":
        return _list_records(metadata, source_receipt, records, args)
    return _search_records(metadata, source_receipt, records, args)


def main(argv: Optional[Sequence[str]] = None) -> int:
    try:
        result = run(argv)
    except LookupFailure as error:
        _write_error(error.error_code, error.message, error.details)
        return error.exit_code
    _write_json(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
