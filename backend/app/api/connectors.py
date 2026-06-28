from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.entities import Connector
from app.schemas.common import ConnectorRead
from app.services.audit_service import write_audit_log
from app.services.connector_service import ConnectorService

router = APIRouter(prefix="/connectors", tags=["connectors"])
connector_service = ConnectorService()


@router.get("", response_model=list[ConnectorRead])
def list_connectors(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return connector_service.list_connectors(db, tenant_id=current_user.tenant_id)


@router.post("/{provider}/start", response_model=ConnectorRead)
def start_connector(provider: str, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    connector = db.scalar(select(Connector).where(Connector.tenant_id == current_user.tenant_id, Connector.provider == provider))
    if not connector:
        connector = Connector(
            tenant_id=current_user.tenant_id,
            provider=provider,
            status="coming_soon",
            connected_by=current_user.user_id,
            config={"mode": "placeholder"},
        )
        db.add(connector)
    write_audit_log(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="connector.start",
        resource_type="connector",
        resource_id=provider,
        metadata={"status": "coming_soon"},
    )
    db.commit()
    db.refresh(connector)
    return connector


@router.get("/{provider}/callback")
def connector_callback(provider: str):
    return {"provider": provider, "status": "coming_soon"}
