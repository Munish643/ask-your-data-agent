from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Connector
from app.services.seed_service import CONNECTOR_PROVIDERS


class ConnectorService:
    def list_connectors(self, db: Session, *, tenant_id: UUID) -> list[Connector]:
        connectors = list(
            db.scalars(select(Connector).where(Connector.tenant_id == tenant_id).order_by(Connector.provider))
        )
        existing = {connector.provider for connector in connectors}
        for provider in CONNECTOR_PROVIDERS:
            if provider not in existing:
                connectors.append(
                    Connector(
                        tenant_id=tenant_id,
                        provider=provider,
                        status="coming_soon",
                        config={"label": provider.replace("_", " ").title(), "mode": "placeholder"},
                    )
                )
        return connectors
