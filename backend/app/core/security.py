import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
import re
import time
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import Tenant, User
from app.services.seed_service import ensure_connector_seed, ensure_demo_seed


@dataclass(frozen=True)
class CurrentUser:
    tenant_id: UUID
    user_id: UUID
    email: str
    role: str
    name: str
    auth_mode: str = "development_mock"


ROLE_ALLOWLIST = {"owner", "admin", "manager", "member", "viewer"}
WORKSPACE_SLUG_PATTERN = re.compile(r"[^a-z0-9]+")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> CurrentUser:
    ensure_demo_seed(db)
    token_user = _current_user_from_bearer_token(request, db)
    if token_user:
        return token_user

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
        auth_mode="development_mock",
    )


def create_or_update_session_user(
    db: Session,
    *,
    email: str,
    name: str | None,
    workspace: str | None,
    provider: str,
) -> User:
    ensure_demo_seed(db)
    clean_email = _normalize_email(email)
    clean_role = settings.dev_user_role if settings.dev_user_role in ROLE_ALLOWLIST else "admin"
    tenant = _get_or_create_tenant(db, workspace_name=workspace or "Demo Workspace")

    user = db.scalar(select(User).where(User.tenant_id == tenant.id, User.email == clean_email))
    if not user:
        user = User(
            tenant_id=tenant.id,
            email=clean_email,
            name=(name or _name_from_email(clean_email)).strip(),
            role=clean_role,
            status="active",
        )
        db.add(user)
        db.flush()
    else:
        user.name = (name or user.name or _name_from_email(clean_email)).strip()
        user.role = clean_role
        user.status = "active"

    ensure_connector_seed(db, tenant_id=tenant.id, connected_by=user.id)
    db.commit()
    db.refresh(user)
    return user


def issue_session_token(*, tenant_id: UUID, user_id: UUID, provider: str) -> str:
    payload = {
        "tenant_id": str(tenant_id),
        "user_id": str(user_id),
        "provider": provider,
        "exp": int(time.time()) + settings.auth_token_ttl_seconds,
    }
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_part = _base64url_encode(payload_json)
    signature = _sign(payload_part.encode("ascii"))
    return f"{payload_part}.{signature}"


def _current_user_from_bearer_token(request: Request, db: Session) -> CurrentUser | None:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None

    payload = _verify_session_token(token.strip())
    user = db.get(User, UUID(str(payload["user_id"])))
    tenant = db.get(Tenant, UUID(str(payload["tenant_id"])))
    if not user or not tenant or user.tenant_id != tenant.id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session user is not available")

    return CurrentUser(
        tenant_id=user.tenant_id,
        user_id=user.id,
        email=user.email,
        role=user.role,
        name=user.name,
        auth_mode=str(payload.get("provider") or "session"),
    )


def _verify_session_token(token: str) -> dict[str, object]:
    payload_part, separator, signature = token.partition(".")
    if not separator or not payload_part or not signature:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token")

    expected_signature = _sign(payload_part.encode("ascii"))
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token")

    try:
        payload = json.loads(_base64url_decode(payload_part))
    except Exception as exc:  # noqa: BLE001 - malformed tokens vary by decoder.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token") from exc

    expires_at = int(payload.get("exp") or 0)
    if expires_at < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    if "tenant_id" not in payload or "user_id" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token")
    return payload


def _get_or_create_tenant(db: Session, *, workspace_name: str) -> Tenant:
    clean_name = workspace_name.strip() or "Demo Workspace"
    slug = _workspace_slug(clean_name)
    if slug in {"demo", "demo-workspace"}:
        tenant = db.get(Tenant, UUID(settings.dev_tenant_id))
        if tenant:
            return tenant

    tenant = db.scalar(select(Tenant).where(Tenant.slug == slug))
    if tenant:
        return tenant

    tenant = Tenant(name=clean_name, slug=slug, plan="starter", status="active")
    db.add(tenant)
    db.flush()
    return tenant


def _workspace_slug(value: str) -> str:
    slug = WORKSPACE_SLUG_PATTERN.sub("-", value.strip().lower()).strip("-")
    return slug or "demo"


def _normalize_email(email: str) -> str:
    clean_email = email.strip().lower()
    if "@" not in clean_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address")
    return clean_email


def _name_from_email(email: str) -> str:
    local_part = email.split("@", 1)[0]
    parts = [part for part in re.split(r"[._-]+", local_part) if part]
    return " ".join(part.capitalize() for part in parts) or "Workspace User"


def _sign(value: bytes) -> str:
    digest = hmac.new(settings.auth_token_secret.encode("utf-8"), value, hashlib.sha256).digest()
    return _base64url_encode(digest)


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")
