from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, create_or_update_session_user, get_current_user, issue_session_token

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthSessionRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    name: str | None = None
    workspace: str = Field(default="Demo Workspace", min_length=1, max_length=120)
    provider: str = Field(default="password", pattern="^(password|sso)$")


class AuthSessionResponse(BaseModel):
    token: str
    tenant_id: str
    user_id: str
    email: str
    name: str
    role: str
    workspace: str
    auth_mode: str


@router.post("/session", response_model=AuthSessionResponse)
def create_session(payload: AuthSessionRequest, db: Session = Depends(get_db)):
    user = create_or_update_session_user(
        db,
        email=str(payload.email),
        name=payload.name,
        workspace=payload.workspace,
        provider=payload.provider,
    )
    token = issue_session_token(tenant_id=user.tenant_id, user_id=user.id, provider=payload.provider)
    return {
        "token": token,
        "tenant_id": str(user.tenant_id),
        "user_id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "workspace": payload.workspace,
        "auth_mode": payload.provider,
    }


@router.get("/me")
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "tenant_id": str(current_user.tenant_id),
        "user_id": str(current_user.user_id),
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "auth_mode": current_user.auth_mode,
    }
