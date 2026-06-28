from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import AuditLog, UsageLog


def write_audit_log(
    db: Session,
    *,
    tenant_id: UUID,
    user_id: UUID | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    log = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        audit_metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)
    return log


def write_usage_log(
    db: Session,
    *,
    tenant_id: UUID,
    user_id: UUID,
    event_type: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    latency_ms: int = 0,
    metadata: dict[str, Any] | None = None,
) -> UsageLog:
    log = UsageLog(
        tenant_id=tenant_id,
        user_id=user_id,
        event_type=event_type,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_estimate=Decimal("0"),
        latency_ms=latency_ms,
        usage_metadata=metadata or {"cost_logging": "placeholder"},
    )
    db.add(log)
    return log
