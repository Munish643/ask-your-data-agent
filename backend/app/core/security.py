from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import Tenant, User
from app.services.seed_service import ensure_demo_seed


@dataclass(frozen=True)
class CurrentUser:
    tenant_id: UUID
    user_id: UUID
    email: str
    role: str
    name: str


def get_current_user(db: Session = Depends(get_db)) -> CurrentUser:
    ensure_demo_seed(db)
    user = db.get(User, UUID(settings.dev_user_id))
    tenant = db.get(Tenant, UUID(settings.dev_tenant_id))
    if not user or not tenant:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Development user is not available")
    return CurrentUser(
        tenant_id=user.tenant_id,
        user_id=user.id,
        email=user.email,
        role=user.role,
        name=user.name,
    )
