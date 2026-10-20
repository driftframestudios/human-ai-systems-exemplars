from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Mapping, Protocol


class WebhookRejected(RuntimeError):
    pass


class SignatureVerifier(Protocol):
    def verify(
        self,
        *,
        raw_body: bytes,
        headers: Mapping[str, str],
    ) -> bool: ...


@dataclass(frozen=True, slots=True)
class BenchlingInboxRecord:
    event_id: str
    tenant_id: str
    raw_sha256: str
    event_type: str
    resource_id: str
    status: str


@dataclass(frozen=True, slots=True)
class BenchlingJob:
    job_id: str
    tenant_id: str
    resource_id: str
    action: str


class BenchlingWebhookIngress:
    """Verifies exact bytes, then commits inbox state and pending work."""

    def __init__(self, verifier: SignatureVerifier) -> None:
        self._verifier = verifier
        self.inbox: dict[tuple[str, str], BenchlingInboxRecord] = {}
        self.jobs: dict[str, BenchlingJob] = {}

    def accept(
        self,
        *,
        tenant_id: str,
        raw_body: bytes,
        headers: Mapping[str, str],
    ) -> tuple[BenchlingInboxRecord, BenchlingJob]:
        if not self._verifier.verify(raw_body=raw_body, headers=headers):
            raise WebhookRejected("Benchling webhook signature is invalid")
        try:
            event = json.loads(raw_body)
            event_id = str(event["id"])
            event_type = str(event["type"])
            resource_id = str(event["resourceId"])
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            raise WebhookRejected("Benchling event envelope is invalid") from exc

        digest = hashlib.sha256(raw_body).hexdigest()
        key = (tenant_id, event_id)
        prior = self.inbox.get(key)
        if prior is not None:
            if prior.raw_sha256 != digest:
                raise WebhookRejected(
                    "Benchling event ID was reused with changed bytes"
                )
            return prior, self.jobs[f"benchling:{tenant_id}:{event_id}"]

        record = BenchlingInboxRecord(
            event_id=event_id,
            tenant_id=tenant_id,
            raw_sha256=digest,
            event_type=event_type,
            resource_id=resource_id,
            status="accepted",
        )
        job = BenchlingJob(
            job_id=f"benchling:{tenant_id}:{event_id}",
            tenant_id=tenant_id,
            resource_id=resource_id,
            action="fetch_current_resource_and_reconcile",
        )
        self.inbox[key] = record
        self.jobs[job.job_id] = job
        return record, job

