from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


class TenantBoundaryViolation(RuntimeError):
    pass


SENSITIVE_KEYS = frozenset(
    {
        "access_token",
        "api_key",
        "authorization",
        "date_of_birth",
        "mrn",
        "patient_id",
        "secret",
    }
)


@dataclass(frozen=True, slots=True)
class RequestContext:
    tenant_id: str
    actor_id: str
    correlation_id: str
    roles: frozenset[str]

    def require_any_role(self, *roles: str) -> None:
        if not self.roles.intersection(roles):
            raise PermissionError("request context lacks an allowed role")


def require_same_tenant(context: RequestContext, resource_tenant_id: str) -> None:
    if context.tenant_id != resource_tenant_id:
        raise TenantBoundaryViolation("resource belongs to another tenant")


def redact(
    payload: Mapping[str, object],
    *,
    allowlist: frozenset[str],
) -> dict[str, object]:
    safe: dict[str, object] = {}
    for key, value in payload.items():
        normalized = key.lower()
        if normalized in SENSITIVE_KEYS:
            safe[key] = "[REDACTED]"
        elif key in allowlist:
            safe[key] = value
    return safe

