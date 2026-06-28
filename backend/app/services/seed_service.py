from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import Connector, Tenant, User


CONNECTOR_PROVIDERS = ["google_drive", "slack", "notion", "sharepoint", "website"]


def ensure_connector_seed(db: Session, *, tenant_id: UUID, connected_by: UUID | None = None) -> None:
    for provider in CONNECTOR_PROVIDERS:
        exists = db.scalar(
            select(Connector).where(Connector.tenant_id == tenant_id, Connector.provider == provider)
        )
        if not exists:
            db.add(
                Connector(
                    tenant_id=tenant_id,
                    provider=provider,
                    status="coming_soon",
                    connected_by=connected_by,
                    config={"label": provider.replace("_", " ").title(), "mode": "placeholder"},
                )
            )


def ensure_demo_seed(db: Session) -> None:
    tenant_id = UUID(settings.dev_tenant_id)
    user_id = UUID(settings.dev_user_id)

    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        tenant = Tenant(id=tenant_id, name="Demo Workspace", slug="demo", plan="starter", status="active")
        db.add(tenant)

    user = db.get(User, user_id)
    if not user:
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=settings.dev_user_email,
            name="Demo Admin",
            role=settings.dev_user_role,
            status="active",
        )
        db.add(user)

    db.flush()
    ensure_connector_seed(db, tenant_id=tenant_id, connected_by=user_id)

    db.commit()
