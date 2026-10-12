#!/usr/bin/env python3
"""Deterministic, offline selection from an explicit citation Atlas JSON file."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
import hashlib
import ipaddress
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, TextIO, Tuple
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
MAX_JSON_DEPTH = 256
MAX_JSON_NUMBER_CHARACTERS = 128
SUPPORTED_SCHEMA_VERSIONS = frozenset(("0.1.0",))

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
DNS_LABEL_PATTERN = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")
SNAPSHOT_DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")
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
    """JSON input falls outside one finite strict-decoder boundary."""

    def __init__(self, reason_code: str) -> None:
        super().__init__(reason_code)
        self.reason_code = reason_code


@dataclass(frozen=True)
class AtlasMetadata:
    """Admitted identity coordinate for one supported Atlas snapshot."""

    schema_version: str
    reference_revision: str
    snapshot_date: str


@dataclass(frozen=True)
class SourceReceipt:
    """Digest-bound receipt for the exact bytes admitted by one invocation."""

    source_bytes: int
    source_sha256: str


@dataclass(frozen=True)
class AtlasRecord:
    """Allowlisted immutable record admitted from inert Atlas source data."""

    key: str
    exact_notion_title: str
    family: str
    surface_class: str
    resource_role: str
    source_lifecycle: str
    kindlight_url: str
    public_title: str
    canonical_key: str
    canonical_url: str
    answers_contains: str
    link_when: str
    citation_boundary: str
    direct_visit_trigger: str
    route_state: str
    content_basis: str
    hint_basis: str
    source_updated: str
    checked: str
    public_observed_at: str
    receiving_use: str
    discovery_text_basis: str
    use_condition_basis: str
    parent_key: Optional[str]
    reader_jobs: Tuple[str, ...]
    public_aliases: Tuple[str, ...]
    headings: Tuple[str, ...]


def _write_json(value: Mapping[str, Any], *, stream: TextIO = sys.stdout) -> None:
    # ASCII JSON keeps the CLI portable across caller locales while preserving
    # every admitted Unicode scalar value through standard JSON escapes.
    stream.write(json.dumps(value, ensure_ascii=True, indent=2, sort_keys=True))
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
    return TOKEN_PATTERN.findall(_normalized(value))


def _unicode_scalar_text(
    value: str, field: str, details: Mapping[str, Any]
) -> str:
    try:
        value.encode("utf-8")
    except UnicodeEncodeError as error:
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            f"Atlas field '{field}' must contain well-formed Unicode text.",
            details,
        ) from error
    return value


def _string_list(value: Any, field: str, record_index: int) -> Tuple[str, ...]:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            f"Record field '{field}' must be an array of strings.",
            {"record_index": record_index, "field": field},
        )
    details = {"record_index": record_index, "field": field}
    return tuple(_unicode_scalar_text(item, field, details) for item in value)


def _required_string(record: Mapping[str, Any], field: str, record_index: int) -> str:
    value = record.get(field)
    if not isinstance(value, str) or not value.strip():
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            f"Record field '{field}' must be a non-empty string.",
            {"record_index": record_index, "field": field},
        )
    return _unicode_scalar_text(
        value, field, {"record_index": record_index, "field": field}
    )


def _optional_string(record: Mapping[str, Any], field: str, record_index: int) -> str:
    value = record.get(field, "")
    if not isinstance(value, str):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            f"Record field '{field}' must be a string when present.",
            {"record_index": record_index, "field": field},
        )
    return _unicode_scalar_text(
        value, field, {"record_index": record_index, "field": field}
    )


def _nullable_string(
    record: Mapping[str, Any], field: str, record_index: int
) -> Optional[str]:
    value = record.get(field)
    if value is not None and not isinstance(value, str):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            f"Record field '{field}' must be a string or null when present.",
            {"record_index": record_index, "field": field},
        )
    if value is None:
        return None
    return _unicode_scalar_text(
        value, field, {"record_index": record_index, "field": field}
    )


def _strict_object(pairs: Sequence[Tuple[str, Any]]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise StrictJsonFailure("duplicate_object_key")
        result[key] = value
    return result


def _reject_excessive_json_depth(source: str) -> None:
    """Apply one interpreter-independent nesting bound before JSON decoding."""

    depth = 0
    in_string = False
    escaped = False
    for character in source:
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue

        if character == '"':
            in_string = True
        elif character in "[{":
            depth += 1
            if depth > MAX_JSON_DEPTH:
                raise StrictJsonFailure("decoder_resource_limit")
        elif character in "]}" and depth > 0:
            depth -= 1


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
        or any(character.isspace() for character in value)
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

    serialized_host = parsed.netloc
    if serialized_host.startswith("[") and serialized_host.endswith("]"):
        serialized_host = serialized_host[1:-1]
    normalized_host = hostname.rstrip(".").casefold()
    if (
        normalized_host != serialized_host
        or "%" in normalized_host
        or any(
            normalized_host == suffix or normalized_host.endswith(f".{suffix}")
            for suffix in LOCAL_HOST_SUFFIXES
        )
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
        labels = normalized_host.split(".")
        try:
            ascii_host = normalized_host.encode("idna").decode("ascii")
        except UnicodeError as error:
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_public_route",
                f"Record field '{field}' must use a public host.",
                {"record_index": record_index, "field": field},
            ) from error
        if (
            "." not in normalized_host
            or ascii_host != normalized_host
            or len(normalized_host) > 253
            or any(not DNS_LABEL_PATTERN.fullmatch(label) for label in labels)
            or not any(character.isalpha() for character in labels[-1])
        ):
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_public_route",
                f"Record field '{field}' must use a public host.",
                {"record_index": record_index, "field": field},
            )
    else:
        if not address.is_global or address.is_multicast:
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_public_route",
                f"Record field '{field}' must use a public host.",
                {"record_index": record_index, "field": field},
            )
    return value


def _reject_json_constant(value: str) -> None:
    del value
    raise StrictJsonFailure("non_standard_json_constant")


def _bounded_json_integer(value: str) -> int:
    if len(value) > MAX_JSON_NUMBER_CHARACTERS:
        raise StrictJsonFailure("json_number_too_long")
    return int(value)


def _bounded_json_decimal(value: str) -> Decimal:
    if len(value) > MAX_JSON_NUMBER_CHARACTERS:
        raise StrictJsonFailure("json_number_too_long")
    return Decimal(value)


def _admit_metadata(raw_metadata: Mapping[str, Any]) -> AtlasMetadata:
    values: Dict[str, str] = {}
    for field in ("schema_version", "reference_revision", "snapshot_date"):
        value = raw_metadata.get(field)
        if not isinstance(value, str) or not value.strip():
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_atlas_contract",
                f"Atlas metadata field '{field}' must be a non-empty string.",
                {"field": field},
            )
        values[field] = _unicode_scalar_text(value, field, {"field": field})

    if values["schema_version"] not in SUPPORTED_SCHEMA_VERSIONS:
        raise LookupFailure(
            EXIT_CONTRACT,
            "unsupported_atlas_schema",
            "The Atlas schema version is outside this lookup's supported contract.",
            {"supported_schema_versions": sorted(SUPPORTED_SCHEMA_VERSIONS)},
        )
    snapshot_date = values["snapshot_date"]
    try:
        valid_snapshot_date = (
            SNAPSHOT_DATE_PATTERN.fullmatch(snapshot_date) is not None
            and date.fromisoformat(snapshot_date).isoformat() == snapshot_date
        )
    except ValueError:
        valid_snapshot_date = False
    if not valid_snapshot_date:
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            "Atlas metadata field 'snapshot_date' must use YYYY-MM-DD.",
            {"field": "snapshot_date"},
        )
    return AtlasMetadata(
        schema_version=values["schema_version"],
        reference_revision=values["reference_revision"],
        snapshot_date=snapshot_date,
    )


def _admit_record(raw_record: Mapping[str, Any], record_index: int) -> AtlasRecord:
    required = {
        field: _required_string(raw_record, field, record_index)
        for field in REQUIRED_STRING_FIELDS
    }
    optional = {
        field: _optional_string(raw_record, field, record_index)
        for field in STRING_FIELDS
        if field not in REQUIRED_STRING_FIELDS
    }
    reader_jobs = _string_list(raw_record.get("reader_jobs"), "reader_jobs", record_index)
    public_aliases = _string_list(
        raw_record.get("public_aliases"), "public_aliases", record_index
    )
    headings = _string_list(raw_record.get("headings"), "headings", record_index)
    kindlight_url = _public_https_url(
        required["kindlight_url"], "kindlight_url", record_index
    )
    canonical_url = _public_https_url(
        required["canonical_url"], "canonical_url", record_index
    )
    for alias_index, alias in enumerate(public_aliases):
        _public_https_url(alias, f"public_aliases[{alias_index}]", record_index)

    return AtlasRecord(
        key=required["key"],
        exact_notion_title=required["exact_notion_title"],
        family=required["family"],
        surface_class=required["surface_class"],
        resource_role=required["resource_role"],
        source_lifecycle=required["source_lifecycle"],
        kindlight_url=kindlight_url,
        public_title=required["public_title"],
        canonical_key=required["canonical_key"],
        canonical_url=canonical_url,
        answers_contains=optional["answers_contains"],
        link_when=optional["link_when"],
        citation_boundary=optional["citation_boundary"],
        direct_visit_trigger=optional["direct_visit_trigger"],
        route_state=required["route_state"],
        content_basis=optional["content_basis"],
        hint_basis=optional["hint_basis"],
        source_updated=optional["source_updated"],
        checked=optional["checked"],
        public_observed_at=optional["public_observed_at"],
        receiving_use=optional["receiving_use"],
        discovery_text_basis=optional["discovery_text_basis"],
        use_condition_basis=optional["use_condition_basis"],
        parent_key=_nullable_string(raw_record, "parent_key", record_index),
        reader_jobs=reader_jobs,
        public_aliases=public_aliases,
        headings=headings,
    )


def _load_atlas(
    path: Path,
) -> Tuple[AtlasMetadata, Tuple[AtlasRecord, ...], SourceReceipt]:
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
        _reject_excessive_json_depth(raw)
        atlas = json.loads(
            raw,
            object_pairs_hook=_strict_object,
            parse_constant=_reject_json_constant,
            parse_float=_bounded_json_decimal,
            parse_int=_bounded_json_integer,
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
            "The supplied Atlas is outside the strict JSON admission boundary.",
            {"reason": error.reason_code},
        ) from error
    except (RecursionError, ValueError) as error:
        raise LookupFailure(
            EXIT_JSON,
            "invalid_atlas_json",
            "The supplied Atlas exceeds the JSON decoder's supported structure.",
            {"reason": "decoder_resource_limit"},
        ) from error

    if not isinstance(atlas, dict):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            "The Atlas root must be an object.",
        )

    raw_metadata = atlas.get("metadata")
    raw_records = atlas.get("records")
    if not isinstance(raw_metadata, dict) or not isinstance(raw_records, list):
        raise LookupFailure(
            EXIT_CONTRACT,
            "invalid_atlas_contract",
            "The Atlas must contain a metadata object and a records array.",
        )

    metadata = _admit_metadata(raw_metadata)
    validated: List[AtlasRecord] = []
    key_indexes: Dict[str, int] = {}
    for index, raw_record in enumerate(raw_records):
        if not isinstance(raw_record, dict):
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_atlas_contract",
                "Every Atlas record must be an object.",
                {"record_index": index},
            )
        record = _admit_record(raw_record, index)
        if record.key in key_indexes:
            raise LookupFailure(
                EXIT_CONTRACT,
                "duplicate_record_key",
                "Atlas record keys must be unique.",
                {"record_index": index, "field": "key"},
            )
        key_indexes[record.key] = index
        validated.append(record)

    records_by_key = {record.key: record for record in validated}
    for index, record in enumerate(validated):
        canonical = records_by_key.get(record.canonical_key)
        if canonical is None:
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_canonical_relation",
                "Every canonical_key must resolve to an admitted Atlas record.",
                {"record_index": index, "field": "canonical_key"},
            )
        if canonical.canonical_key != canonical.key:
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_canonical_relation",
                "Every canonical target must identify itself as canonical.",
                {"record_index": index, "field": "canonical_key"},
            )
        if record.canonical_url != canonical.kindlight_url:
            raise LookupFailure(
                EXIT_CONTRACT,
                "invalid_canonical_relation",
                "Every canonical_url must equal its canonical record's public route.",
                {"record_index": index, "field": "canonical_url"},
            )

    source_receipt = SourceReceipt(
        source_bytes=len(raw_bytes),
        source_sha256=hashlib.sha256(raw_bytes).hexdigest(),
    )
    return metadata, tuple(validated), source_receipt


def _project(record: AtlasRecord) -> Dict[str, Any]:
    projected: Dict[str, Any] = {}
    for field in STRING_FIELDS:
        projected[field] = getattr(record, field)
    for field in NULLABLE_STRING_FIELDS:
        projected[field] = getattr(record, field)
    for field in LIST_FIELDS:
        projected[field] = list(getattr(record, field))
    return projected


def _atlas_coordinate(
    metadata: AtlasMetadata, source_receipt: SourceReceipt
) -> Dict[str, Any]:
    return {
        "reference_revision": metadata.reference_revision,
        "schema_version": metadata.schema_version,
        "snapshot_date": metadata.snapshot_date,
        "source_bytes": source_receipt.source_bytes,
        "source_sha256": source_receipt.source_sha256,
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


def _record_matches_filters(record: AtlasRecord, args: argparse.Namespace) -> bool:
    lifecycle = _effective_lifecycle(args)
    if lifecycle is not None and _normalized(record.source_lifecycle) != _normalized(lifecycle):
        return False
    if args.family and _normalized(record.family) != _normalized(args.family):
        return False
    if args.role and _normalized(record.resource_role) != _normalized(args.role):
        return False
    if args.job:
        jobs = {_normalized(job) for job in record.reader_jobs}
        if _normalized(args.job) not in jobs:
            return False
    if args.route_state and _normalized(record.route_state) != _normalized(args.route_state):
        return False
    if args.canonical_only and record.key != record.canonical_key:
        return False
    return True


def _filtered(records: Iterable[AtlasRecord], args: argparse.Namespace) -> List[AtlasRecord]:
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
    metadata: AtlasMetadata,
    source_receipt: SourceReceipt,
    records: Sequence[AtlasRecord],
    args: argparse.Namespace,
) -> Mapping[str, Any]:
    _validate_window(args)
    candidates = _filtered(records, args)
    candidates.sort(key=lambda record: (_normalized(record.exact_notion_title), record.key))
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
    metadata: AtlasMetadata,
    source_receipt: SourceReceipt,
    records: Sequence[AtlasRecord],
    args: argparse.Namespace,
) -> Mapping[str, Any]:
    candidates = _filtered(records, args)
    selector: Dict[str, str]
    if args.key is not None:
        selector = {"key": args.key}
        matches = [record for record in candidates if record.key == args.key]
    elif args.title is not None:
        selector = {"title": args.title}
        target = _normalized(args.title)
        matches = [
            record
            for record in candidates
            if target
            in {_normalized(record.exact_notion_title), _normalized(record.public_title)}
        ]
    else:
        selector = {"url": args.url}
        matches = [
            record
            for record in candidates
            if args.url
            in {record.kindlight_url, record.canonical_url, *record.public_aliases}
        ]

    matches.sort(key=lambda record: (record.key != record.canonical_key, record.key))
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
            {"keys": [record.key for record in matches], "selector": selector},
        )
    return {
        "atlas": _atlas_coordinate(metadata, source_receipt),
        "command": "get",
        "filters": _filter_description(args),
        "record": _project(matches[0]),
        "selector": selector,
    }


def _field_text(record: AtlasRecord, field: str) -> str:
    value = getattr(record, field)
    if isinstance(value, tuple):
        return " ".join(value)
    return value


def _contains_token_sequence(tokens: Sequence[str], terms: Sequence[str]) -> bool:
    if not terms or len(terms) > len(tokens):
        return False
    width = len(terms)
    expected = tuple(terms)
    return any(
        tuple(tokens[index : index + width]) == expected
        for index in range(len(tokens) - width + 1)
    )


def _score_record(
    record: AtlasRecord,
    query: str,
    terms: Sequence[str],
    query_tokens: Sequence[str],
    field_tokens: Mapping[str, Sequence[str]],
) -> Tuple[int, Dict[str, int]]:
    normalized_query = _normalized(query)
    score = 0
    components: Dict[str, int] = {}

    exact_values = {
        "exact_key": (_normalized(record.key), 100000),
        "exact_public_url": (_normalized(record.kindlight_url), 95000),
        "exact_canonical_url": (_normalized(record.canonical_url), 94000),
        "exact_source_title": (_normalized(record.exact_notion_title), 90000),
        "exact_public_title": (_normalized(record.public_title), 89000),
    }
    for label, (value, bonus) in exact_values.items():
        if normalized_query == value:
            components[label] = bonus
            score += bonus

    for field, weight in SEARCH_FIELD_WEIGHTS:
        tokens = field_tokens[field]
        token_set = set(tokens)
        field_score = sum(weight for term in terms if term in token_set)
        if _contains_token_sequence(tokens, query_tokens):
            field_score += weight * 4
        if field_score:
            components[field] = field_score
            score += field_score
    return score, components


def _search_records(
    metadata: AtlasMetadata,
    source_receipt: SourceReceipt,
    records: Sequence[AtlasRecord],
    args: argparse.Namespace,
) -> Mapping[str, Any]:
    _validate_window(args)
    query_tokens = _tokens(args.query)
    terms = list(dict.fromkeys(query_tokens))
    if not query_tokens:
        raise LookupFailure(
            EXIT_ARGUMENT,
            "empty_query",
            "The search query must contain at least one word or number.",
        )

    ranked: List[Tuple[int, bool, str, str, AtlasRecord, Mapping[str, int]]] = []
    for record in _filtered(records, args):
        tokens_by_field = {
            field: tuple(_tokens(_field_text(record, field)))
            for field, _weight in SEARCH_FIELD_WEIGHTS
        }
        searchable_tokens = {
            token
            for tokens in tokens_by_field.values()
            for token in tokens
        }
        term_hits = [term in searchable_tokens for term in terms]
        if args.match == "all" and not all(term_hits):
            continue
        if args.match == "any" and not any(term_hits):
            continue
        score, components = _score_record(
            record, args.query, terms, query_tokens, tokens_by_field
        )
        ranked.append(
            (
                score,
                record.key != record.canonical_key,
                _normalized(record.exact_notion_title),
                record.key,
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
