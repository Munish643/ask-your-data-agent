from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.entities import Tenant
from app.schemas.common import TenantRead

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("/current", response_model=TenantRead)
def get_current_tenant(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> Tenant:
    return db.get(Tenant, current_user.tenant_id)
