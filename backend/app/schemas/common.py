from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TenantRead(APIModel):
    id: UUID
    name: str
    slug: str
    plan: str
    status: str
    created_at: datetime
    updated_at: datetime


class UserRead(APIModel):
    id: UUID
    tenant_id: UUID
    email: str
    name: str
    role: str
    status: str
    created_at: datetime
    updated_at: datetime


class DocumentRead(APIModel):
    id: UUID
    tenant_id: UUID
    title: str
    source_type: str
    source_uri: str | None
    file_name: str
    mime_type: str | None
    status: str
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime
    indexed_at: datetime | None


class ChatMessageRead(APIModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    sources: list[dict[str, Any]]
    latency_ms: int | None
    token_count: int | None
    created_at: datetime


class ChatSessionRead(APIModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ChatSessionDetail(ChatSessionRead):
    messages: list[ChatMessageRead]


class ConnectorRead(APIModel):
    id: UUID | None = None
    tenant_id: UUID | None = None
    provider: str
    status: str
    connected_by: UUID | None = None
    last_sync_at: datetime | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AuditLogRead(APIModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID | None
    action: str
    resource_type: str
    resource_id: str | None
    audit_metadata: dict[str, Any]
    ip_address: str | None
    user_agent: str | None
    created_at: datetime


class UsageLogRead(APIModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    event_type: str
    input_tokens: int
    output_tokens: int
    cost_estimate: float
    latency_ms: int
    usage_metadata: dict[str, Any]
    created_at: datetime
