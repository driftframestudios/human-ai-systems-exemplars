from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class TraceLink:
    requirement_id: str
    risk_id: str
    control_id: str
    test_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class VerificationResult:
    test_id: str
    outcome: str
    duration_ms: int


@dataclass(frozen=True, slots=True)
class ExecutionReceipt:
    receipt_id: str
    source_revision: str
    generated_at: datetime
    execution_class: str
    execution_scope: str
    python_version: str
    dependency_locks: tuple[str, ...]
    trace_links: tuple[TraceLink, ...]
    test_results: tuple[VerificationResult, ...]
    synthetic_data: bool
    limitations: tuple[str, ...]

    def __post_init__(self) -> None:
        if self.generated_at.tzinfo is None:
            raise ValueError("generated_at must carry an explicit timezone")
        if self.execution_class not in {
            "illustrative_compilable",
            "tested_excerpt",
            "verified_running",
            "sandbox_qualified",
            "production_qualified",
        }:
            raise ValueError("unknown execution class")

    def canonical_json(self) -> str:
        return json.dumps(
            asdict(self),
            default=lambda value: value.isoformat()
            if isinstance(value, datetime)
            else value,
            sort_keys=True,
            separators=(",", ":"),
        )

    def sha256(self) -> str:
        return hashlib.sha256(self.canonical_json().encode()).hexdigest()

