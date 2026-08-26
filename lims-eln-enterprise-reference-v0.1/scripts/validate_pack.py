#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import unittest
from datetime import UTC, datetime
from importlib.metadata import version as distribution_version
from pathlib import Path, PurePosixPath
from typing import Any

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import SchemaError


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
TESTS = ROOT / "tests"

INCLUDED_SUFFIXES = {
    ".conf",
    ".json",
    ".md",
    ".py",
    ".sh",
    ".sql",
    ".toml",
    ".yaml",
    ".yml",
}
EXCLUDED_DIRECTORIES = {
    "__pycache__",
    ".eggs",
    ".venv",
    ".hypothesis",
    ".mypy_cache",
    ".nox",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    "build",
    "dist",
    "htmlcov",
    "receipts",
}
EXCLUDED_DIRECTORY_SUFFIXES = (".egg-info",)
COLONS = ":" * 2
SEMICOLONS = ";" * 2
PROHIBITED_TOKENS = (
    f"{COLONS}the_author{COLONS}",
    f"{COLONS}provenance.honest",
    f"{COLONS}folding",
    f"{COLONS}fragments",
    f"{SEMICOLONS}shrug",
    f"{SEMICOLONS}on.this_side",
)
HOUSE_PATTERNS = (
    re.compile(r"(^|\s)::[A-Za-z][A-Za-z0-9_.-]*(?:::)?", re.MULTILINE),
    re.compile(r"(^|\s);;[A-Za-z][A-Za-z0-9_.-]*", re.MULTILINE),
)
REQUIRED_MANIFEST_FIELDS = {
    "sampleId",
    "title",
    "temporalClass",
    "evidenceClass",
    "executionClass",
    "executionScope",
    "qualificationStage",
    "codePaths",
    "testPaths",
    "trustBoundaries",
    "failureModes",
    "receipts",
    "affectedPopulations",
    "regulatoryScope",
}
EXECUTION_CLASSES = {
    "illustrative_compilable",
    "tested_excerpt",
    "verified_running",
}
QUALIFICATION_STAGES = {
    "executable_offline",
    "tenant_open",
    "sandbox_open",
    "migration_rehearsal_open",
    "production_open",
}
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
MIGRATION_VERSION_PATTERN = re.compile(r"^V([0-9]{3})$")
DATABASE_PROVENANCE = ROOT / "database" / "release-provenance.json"
DATA_PRIMITIVE_LEDGER = ROOT / "database" / "data-primitive-ledger.json"
FLYWAY_IMAGE_COORDINATE = (
    "flyway/flyway:13.0.0-alpine@sha256:"
    "f3c8433401abf859ef9022584c8e6111684363ec490f737e749e9a4705ea32d0"
)


def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    """Build one JSON object while preserving the one-key/one-meaning contract."""
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ValueError(f"duplicate JSON key {key!r}")
        value[key] = item
    return value


def reject_nonfinite_constant(value: str) -> None:
    """Keep JSON numeric values inside the finite interoperable domain."""
    raise ValueError(f"non-finite JSON number {value!r}")


def load_json(path: Path) -> Any:
    """Read strict JSON with duplicate-key and non-finite-number rejection."""
    return json.loads(
        path.read_text(encoding="utf-8"),
        object_pairs_hook=reject_duplicate_keys,
        parse_constant=reject_nonfinite_constant,
    )


def safe_repository_path(value: object) -> Path | None:
    """Resolve one normalized repository-relative path inside the pack."""
    if not isinstance(value, str) or not value:
        return None
    pure = PurePosixPath(value)
    if pure.is_absolute() or ".." in pure.parts or value != pure.as_posix():
        return None
    candidate = ROOT.joinpath(*pure.parts)
    try:
        resolved = candidate.resolve(strict=True)
    except (FileNotFoundError, RuntimeError):
        return None
    root_resolved = ROOT.resolve()
    if resolved != root_resolved and root_resolved not in resolved.parents:
        return None
    cursor = ROOT
    for part in pure.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            return None
    return resolved


def excluded_from_source_scope(relative: Path) -> bool:
    """Identify directories outside the stable authored source surface."""
    return any(
        part in EXCLUDED_DIRECTORIES
        or part.endswith(EXCLUDED_DIRECTORY_SUFFIXES)
        for part in relative.parts[:-1]
    )


def published_files(root: Path = ROOT) -> list[Path]:
    """Return the deterministic authored source set for one pack root."""
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in INCLUDED_SUFFIXES:
            continue
        relative = path.relative_to(root)
        if excluded_from_source_scope(relative):
            continue
        files.append(path)
    return sorted(files, key=lambda path: path.relative_to(root).as_posix())


def scan_house_syntax(files: list[Path]) -> list[str]:
    failures: list[str] = []
    for path in files:
        content = path.read_text(encoding="utf-8")
        relative = path.relative_to(ROOT).as_posix()
        for token in PROHIBITED_TOKENS:
            if token in content:
                failures.append(f"{relative} contains prohibited token {token}")
        for pattern in HOUSE_PATTERNS:
            match = pattern.search(content)
            if match:
                failures.append(
                    f"{relative} contains house tag {match.group(0).strip()}"
                )
    return failures


def validate_json_files(files: list[Path]) -> list[str]:
    failures: list[str] = []
    for path in files:
        if path.suffix != ".json":
            continue
        try:
            load_json(path)
        except (json.JSONDecodeError, ValueError) as exc:
            failures.append(
                f"{path.relative_to(ROOT)} has invalid JSON: {exc}"
            )
    return failures


def validate_manifests() -> tuple[list[str], int]:
    failures: list[str] = []
    manifests = sorted(ROOT.glob("samples/*/manifest.json"))
    seen: set[str] = set()
    for path in manifests:
        data = load_json(path)
        relative = path.relative_to(ROOT)
        missing = sorted(REQUIRED_MANIFEST_FIELDS - data.keys())
        if missing:
            failures.append(f"{relative} misses {','.join(missing)}")
        sample_id = data.get("sampleId", "")
        if not re.fullmatch(r"FMI-LIMS-S\d{2}", sample_id):
            failures.append(f"{relative} has invalid sampleId {sample_id}")
        if sample_id in seen:
            failures.append(f"{relative} duplicates sampleId {sample_id}")
        seen.add(sample_id)
        if data.get("executionClass") not in EXECUTION_CLASSES:
            failures.append(f"{relative} has invalid executionClass")
        if data.get("qualificationStage") not in QUALIFICATION_STAGES:
            failures.append(f"{relative} has invalid qualificationStage")
        if (
            data.get("regulatoryScope")
            != "determination_owned_by_quality_and_regulatory"
        ):
            failures.append(f"{relative} has invalid regulatoryScope")
        for field in ("codePaths", "testPaths", "receipts"):
            for referenced in data.get(field, []):
                if field == "receipts":
                    continue
                if safe_repository_path(referenced) is None:
                    failures.append(
                        f"{relative} references an unavailable repository path "
                        f"{referenced}"
                    )
    root_manifest = load_json(ROOT / "manifest.json")
    if root_manifest.get("sampleCount") != len(manifests):
        failures.append(
            "manifest.json sampleCount differs from registered manifests"
        )
    return failures, len(manifests)


def file_sha256(path: Path) -> str:
    """Return the byte-level SHA-256 for one immutable migration artifact."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_digest_file(
    record: object,
    coordinate: str,
    failures: list[str],
) -> str | None:
    """Validate one path-and-digest record and return its repository path."""
    if not isinstance(record, dict):
        failures.append(f"{coordinate} should be an object")
        return None
    path_value = record.get("path")
    digest_value = record.get("sha256")
    resolved = safe_repository_path(path_value)
    if resolved is None:
        failures.append(f"{coordinate}.path is outside the published pack")
        return None
    if not isinstance(digest_value, str) or not SHA256_PATTERN.fullmatch(
        digest_value
    ):
        failures.append(f"{coordinate}.sha256 has an invalid digest shape")
    elif file_sha256(resolved) != digest_value:
        failures.append(f"{coordinate}.sha256 differs from {path_value}")
    return str(path_value)


def validate_flyway_release() -> tuple[list[str], int]:
    """Validate Flyway policy, immutable SQL provenance, and migration shape."""
    failures: list[str] = []
    provenance = load_json(DATABASE_PROVENANCE)
    if not isinstance(provenance, dict):
        return ["database release provenance should be an object"], 0

    expected_root = {
        "provenanceSchemaVersion",
        "releaseId",
        "migrationEngine",
        "databaseEngine",
        "baselinePolicy",
        "artifacts",
        "historyPolicy",
    }
    if set(provenance) != expected_root:
        failures.append("database release provenance root fields differ")

    engine = provenance.get("migrationEngine")
    if not isinstance(engine, dict):
        failures.append("migration engine coordinate should be an object")
        engine = {}
    if engine.get("name") != "Flyway Community" or engine.get(
        "version"
    ) != "13.0.0":
        failures.append("Flyway Community version differs from 13.0.0")
    if engine.get("image") != "flyway/flyway:13.0.0-alpine" or engine.get(
        "imageDigest"
    ) != (
        "sha256:f3c8433401abf859ef9022584c8e6111684363ec490f737e749e9a4705ea32d0"
    ):
        failures.append("Flyway image coordinate is mutable or differs")

    expected_configs = [
        "database/flyway/flyway.conf",
        "database/flyway/canonical.conf",
        "database/flyway/legacy-upgrade.conf",
        "database/flyway/callbacks/afterConnect__bounded_owner_delegation.sql",
        "database/flyway/legacy-callbacks/afterConnect__legacy_repeatable_read.sql",
    ]
    if engine.get("configuration") != expected_configs:
        failures.append("Flyway configuration inventory differs")
    config_text = "\n".join(
        (ROOT / path).read_text(encoding="utf-8")
        for path in expected_configs
    )
    for required_setting in (
        "flyway.baselineOnMigrate=false",
        "flyway.cleanDisabled=true",
        "flyway.validateOnMigrate=true",
        "flyway.outOfOrder=false",
        "flyway.validateMigrationNaming=true",
        "flyway.mixed=false",
        "flyway.group=false",
        "flyway.placeholderReplacement=false",
        "flyway.table=flyway_schema_history",
        "flyway.table=flyway_legacy_upgrade_history",
        "filesystem:/workspace/database/flyway/callbacks",
        "filesystem:/workspace/database/flyway/legacy-callbacks",
    ):
        if required_setting not in config_text:
            failures.append(f"Flyway configuration misses {required_setting}")
    if re.search(
        r"(?im)^\s*flyway\.(?:url|user|password)\s*=", config_text
    ):
        failures.append("Flyway configuration carries a runtime credential field")
    if "flyway.initSql" in config_text:
        failures.append("Flyway 13 configuration retains the removed initSql field")

    baseline_policy = provenance.get("baselinePolicy")
    if not isinstance(baseline_policy, dict) or baseline_policy.get(
        "baselineOnMigrate"
    ) is not False or baseline_policy.get("legacyBaselineVersion") != "0":
        failures.append("explicit legacy baseline policy differs")
    if not isinstance(baseline_policy, dict) or not SHA256_PATTERN.fullmatch(
        str(baseline_policy.get("catalogAttestationSha256", ""))
    ):
        failures.append("legacy catalog attestation fingerprint differs")

    artifacts = provenance.get("artifacts")
    if not isinstance(artifacts, list):
        return failures + ["release artifacts should be an array"], 0
    registered: list[str] = []
    for index, record in enumerate(artifacts):
        path_value = validate_digest_file(
            record, f"artifacts[{index}]", failures
        )
        if path_value is not None:
            registered.append(path_value)
        if not isinstance(record, dict) or set(record) != {
            "path",
            "sha256",
            "role",
        }:
            failures.append(f"artifacts[{index}] fields differ")
    if len(registered) != len(set(registered)):
        failures.append("release artifact paths should be unique")

    canonical_paths = sorted(
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / "database" / "migrations").glob("V*.sql")
    )
    expected_canonical = [
        f"database/migrations/V{version:03d}__{description}.sql"
        for version, description in (
            (1, "foundation"),
            (2, "laboratory_domain"),
            (3, "integration_evidence_and_migration"),
            (4, "security_and_write_boundaries"),
            (5, "operational_indexes_and_catalog"),
            (6, "semantic_integrity_and_runtime_boundaries"),
            (7, "security_definer_resolution_boundary"),
            (8, "bounded_migration_row_security"),
        )
    ]
    if canonical_paths != expected_canonical:
        failures.append("canonical Flyway migration sequence differs")

    upgrade_paths = sorted(
        path.relative_to(ROOT).as_posix()
        for path in (
            ROOT / "database" / "upgrades" / "v0_1_to_v0_2"
        ).glob("V*.sql")
    )
    expected_upgrade = [
        f"database/upgrades/v0_1_to_v0_2/V{version:03d}__{description}.sql"
        for version, description in (
            (1, "expand"),
            (2, "backfill"),
            (3, "validate"),
            (4, "cutover"),
            (5, "security_resolution_head_attestation"),
            (6, "contract"),
        )
    ]
    if upgrade_paths != expected_upgrade:
        failures.append("legacy Flyway migration sequence differs")
    for path in canonical_paths + upgrade_paths:
        if path not in registered:
            failures.append(f"Flyway migration lacks release provenance: {path}")

    retired_paths = (
        ROOT / "scripts" / "run_manifest_migrations.py",
        ROOT / "database" / "migration-manifest.json",
        ROOT / "schema" / "database-migration-manifest.schema.json",
    )
    if any(path.exists() for path in retired_paths):
        failures.append("retired custom migration machinery remains published")

    canonical_sql = "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted((ROOT / "database" / "migrations").glob("V*.sql"))
    )
    for required_sql in (
        "timestamptz",
        "control.finite_instant",
        "is_canonical_rfc3339_instant",
        "numeric(38, 12)",
        "control.sha256_digest",
        "jsonb",
        "boolean not null",
        "force row level security",
        "for update skip locked",
        "preserve_append_only_record",
        "schema_semantic_catalog",
        "schema_fingerprint",
        "migration_evidence_fingerprint",
    ):
        if required_sql not in canonical_sql.lower():
            failures.append(f"canonical SQL misses {required_sql!r}")
    for pattern in (
        re.compile(r"\b[a-z_]*(?:_at|_time|_timestamp)(?:_utc)?\s+text\b", re.I),
        re.compile(r"\bsynthetic_data\s+integer\b", re.I),
        re.compile(r"\b(?:payload|limitations|receipt)_json\s+text\b", re.I),
    ):
        if pattern.search(canonical_sql):
            failures.append(
                f"canonical SQL contains superseded primitive {pattern.pattern!r}"
            )

    rehearsal = (ROOT / "scripts" / "run_database_rehearsal.sh").read_text(
        encoding="utf-8"
    )
    for required_rehearsal in (
        FLYWAY_IMAGE_COORDINATE,
        "baseline -baselineVersion=0",
        "migrate -target=4 -group=true",
        "validate",
        "verify_runtime_contracts",
        "control.schema_semantic_catalog",
    ):
        if required_rehearsal not in rehearsal:
            failures.append(
                f"database rehearsal misses {required_rehearsal!r}"
            )
    return failures, len(canonical_paths)


def validate_data_primitive_ledger() -> tuple[list[str], int]:
    """Validate stable finding identity, shape, and critical/high dispositions."""
    failures: list[str] = []
    ledger = load_json(DATA_PRIMITIVE_LEDGER)
    findings = ledger.get("findings", []) if isinstance(ledger, dict) else []
    if not isinstance(findings, list) or len(findings) < 30:
        return ["data primitive ledger should carry at least 30 findings"], 0
    identifiers: list[str] = []
    for index, finding in enumerate(findings):
        if not isinstance(finding, dict):
            failures.append(f"findings[{index}] should be an object")
            continue
        required = {
            "id",
            "severity",
            "coordinate",
            "currentPrimitive",
            "materialEffect",
            "desiredState",
            "disposition",
            "verification",
        }
        if set(finding) != required:
            failures.append(f"findings[{index}] fields differ")
        identifier = str(finding.get("id", ""))
        identifiers.append(identifier)
        if finding.get("severity") not in {"critical", "high", "medium"}:
            failures.append(f"{identifier or index} severity differs")
        if finding.get("severity") in {"critical", "high"} and not finding.get(
            "disposition"
        ):
            failures.append(f"{identifier or index} requires a disposition")
        verification = finding.get("verification")
        if not isinstance(verification, list) or not verification:
            failures.append(f"{identifier or index} requires verification")
    expected = [f"DB-{number:03d}" for number in range(1, len(findings) + 1)]
    if identifiers != expected:
        failures.append("data primitive finding identifiers should be contiguous")
    return failures, len(findings)


def local_receipt_id(generated_at: datetime) -> str:
    """Bind a local receipt identity to its UTC generation instant."""
    return (
        "lims-eln-reference-v0.3-local-"
        f"{generated_at.astimezone(UTC).strftime('%Y%m%dT%H%M%SZ')}"
    )


def validate_checked_execution_receipt(
    files: list[Path] | None = None,
) -> list[str]:
    """Validate the checked receipt against the current published source."""
    failures: list[str] = []
    scoped_files = published_files() if files is None else files
    schema = load_json(ROOT / "schema" / "execution-receipt.schema.json")
    receipt = load_json(ROOT / "receipts" / "validation-report.json")
    if not isinstance(schema, dict) or not isinstance(receipt, dict):
        return ["execution receipt and schema should be objects"]
    expected_fields = set(schema.get("required", []))
    schema_fields = set(schema.get("properties", {}))
    if set(receipt) != expected_fields or expected_fields != schema_fields:
        failures.append("checked execution receipt root fields differ from schema")
    digest = receipt.get("sourceDigest")
    if not isinstance(digest, str) or not SHA256_PATTERN.fullmatch(digest):
        failures.append("checked execution receipt source digest format differs")
    elif digest != source_digest(scoped_files):
        failures.append(
            "checked execution receipt source digest differs from published source"
        )
    source_scope = receipt.get("sourceScope")
    if not isinstance(source_scope, dict):
        failures.append("checked execution receipt source scope differs")
    elif source_scope.get("files") != len(scoped_files):
        failures.append(
            "checked execution receipt file count differs from published source"
        )
    generated_at = receipt.get("generatedAt")
    parsed_generated_at: datetime | None = None
    try:
        if not isinstance(generated_at, str):
            raise ValueError("date-time should be a string")
        parsed_generated_at = datetime.fromisoformat(
            generated_at.replace("Z", "+00:00")
        )
        if parsed_generated_at.tzinfo is None:
            raise ValueError("date-time should carry a UTC offset")
    except ValueError:
        failures.append("checked execution receipt generatedAt differs")
    if (
        parsed_generated_at is not None
        and receipt.get("receiptId") != local_receipt_id(parsed_generated_at)
    ):
        failures.append("checked execution receipt identity differs from generatedAt")
    result = receipt.get("result")
    if not isinstance(result, dict) or set(result) != {
        "testsRun",
        "failures",
        "errors",
        "successful",
    }:
        failures.append("checked execution receipt result fields differ")
    elif (
        result.get("successful") is not True
        or result.get("failures") != 0
        or result.get("errors") != 0
    ):
        failures.append("checked execution receipt should represent a passing run")
    migrations = receipt.get("databaseMigrations")
    if not isinstance(migrations, dict) or migrations.get("validated") != 8:
        failures.append("checked execution receipt migration result differs")
    ledger = receipt.get("dataPrimitiveLedger")
    if not isinstance(ledger, dict) or ledger.get("validated") != 53:
        failures.append("checked execution receipt ledger result differs")
    schemas = receipt.get("schemaContracts")
    if not isinstance(schemas, dict) or schemas.get("validated") != 4:
        failures.append("checked execution receipt schema result differs")
    if receipt.get("failures") != []:
        failures.append("checked execution receipt retains validation findings")
    return failures


def validate_schema_instance(
    schema_path: Path,
    instance: object,
    coordinate: str,
) -> list[str]:
    """Validate one instance with Draft 2020-12 and format assertions."""
    schema = load_json(schema_path)
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError as exc:
        return [f"{schema_path.relative_to(ROOT)} has an invalid schema: {exc.message}"]
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    failures: list[str] = []
    for error in sorted(validator.iter_errors(instance), key=lambda item: list(item.path)):
        path = ".".join(str(part) for part in error.absolute_path)
        suffix = f".{path}" if path else ""
        failures.append(f"{coordinate}{suffix}: {error.message}")
    return failures


def validate_schema_contracts() -> tuple[list[str], int]:
    """Execute every published instance schema against its governed artifacts."""
    failures: list[str] = []
    schema_count = 0

    sample_schema = ROOT / "schema" / "sample-manifest.schema.json"
    for path in sorted(ROOT.glob("samples/*/manifest.json")):
        failures.extend(
            validate_schema_instance(
                sample_schema,
                load_json(path),
                path.relative_to(ROOT).as_posix(),
            )
        )
    schema_count += 1

    governed_json = (
        (
            ROOT / "schema" / "execution-receipt.schema.json",
            ROOT / "receipts" / "validation-report.json",
        ),
        (
            ROOT / "schema" / "data-primitive-ledger.schema.json",
            DATA_PRIMITIVE_LEDGER,
        ),
    )
    for schema_path, instance_path in governed_json:
        failures.extend(
            validate_schema_instance(
                schema_path,
                load_json(instance_path),
                instance_path.relative_to(ROOT).as_posix(),
            )
        )
        schema_count += 1

    machine_node = yaml.safe_load(
        (ROOT / "machine-node.yaml").read_text(encoding="utf-8")
    )
    failures.extend(
        validate_schema_instance(
            ROOT / "schema" / "machine-node.schema.json",
            machine_node,
            "machine-node.yaml",
        )
    )
    schema_count += 1
    return failures, schema_count


def run_tests() -> tuple[unittest.TestResult, str]:
    sys.path.insert(0, str(SRC))
    suite = unittest.defaultTestLoader.discover(str(TESTS))
    output = io.StringIO()
    result = unittest.TextTestRunner(
        stream=output,
        verbosity=2,
    ).run(suite)
    return result, output.getvalue()


def source_digest(files: list[Path], root: Path = ROOT) -> str:
    digest = hashlib.sha256()
    for path in files:
        relative = path.relative_to(root).as_posix().encode()
        digest.update(relative)
        digest.update(b"\0")
        digest.update(hashlib.sha256(path.read_bytes()).digest())
        digest.update(b"\0")
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print only the structured validation report.",
    )
    args = parser.parse_args()

    files = published_files()
    failures = scan_house_syntax(files)
    failures.extend(validate_json_files(files))
    manifest_failures, manifest_count = validate_manifests()
    failures.extend(manifest_failures)
    database_failures, migration_count = validate_flyway_release()
    failures.extend(database_failures)
    ledger_failures, finding_count = validate_data_primitive_ledger()
    failures.extend(ledger_failures)
    failures.extend(validate_checked_execution_receipt(files))
    schema_failures, schema_count = validate_schema_contracts()
    failures.extend(schema_failures)

    result, test_output = run_tests()
    successful = result.wasSuccessful()
    if not successful:
        failures.append("offline unit and contract suite failed")

    generated_at = datetime.now(UTC).replace(microsecond=0)
    report = {
        "receiptId": local_receipt_id(generated_at),
        "generatedAt": generated_at.isoformat(),
        "sourceDigest": source_digest(files),
        "sourceScope": {
            "algorithm": "sha256",
            "files": len(files),
            "rule": (
                "Sorted relative path plus SHA-256 of published CONF, JSON, "
                "Markdown, Python, shell, SQL, TOML, and YAML files. The stable authored "
                "source surface places receipts, local caches, and generated "
                "packaging trees outside its boundary."
            ),
        },
        "runtime": {
            "python": sys.version.split()[0],
            "dependencies": {
                "jsonschema": distribution_version("jsonschema"),
                "PyYAML": distribution_version("PyYAML"),
            },
        },
        "executionClass": "verified_running",
        "executionScope": "local_offline_synthetic",
        "result": {
            "testsRun": result.testsRun,
            "failures": len(result.failures),
            "errors": len(result.errors),
            "successful": successful and not failures,
        },
        "sampleManifests": {
            "validated": manifest_count if not manifest_failures else 0,
            "expected": 9,
        },
        "databaseMigrations": {
            "validated": migration_count if not database_failures else 0,
            "expected": 8,
            "supportedBaselines": ["empty", "v0.1"],
            "executionScope": "static_offline",
        },
        "dataPrimitiveLedger": {
            "validated": finding_count if not ledger_failures else 0,
            "expected": 53,
        },
        "schemaContracts": {
            "validated": schema_count if not schema_failures else 0,
            "expected": 4,
            "draft": "2020-12",
            "formatAssertions": True,
        },
        "houseSyntax": {
            "successful": not scan_house_syntax(files),
        },
        "limitations": [
            "Configured Sapio, Benchling, and LabKey tenants remain external qualification receipts.",
            "Vendor adapters use synthetic gateway doubles and retain vendor-shaped compatibility boundaries.",
            "This local report records static migration verification; a separately authorized hosted PostgreSQL proof can add executed migration and security evidence.",
            "Organizational migration, restore, security, and production acceptance remain accountable adoption receipts.",
            "Engineering tests contribute validation evidence; accountable Quality and Regulatory decisions establish the applicable compliance posture.",
        ],
        "failures": failures,
    }

    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(test_output, end="")
        print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["result"]["successful"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
