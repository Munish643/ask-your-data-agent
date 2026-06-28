from uuid import UUID

from sqlalchemy import and_, exists, select
from sqlalchemy.orm import Session

from app.models.entities import DocumentACL

OWNER_ROLES = {"owner", "admin"}
READ_PERMISSION = "read"


def can_access_all_documents(role: str) -> bool:
    return role in OWNER_ROLES


def can_manage_documents(role: str) -> bool:
    return role in {"owner", "admin", "manager"}


def can_view_admin(role: str) -> bool:
    return role in {"owner", "admin"}


def user_can_read_document(
    db: Session,
    *,
    tenant_id: UUID,
    document_id: UUID,
    role: str,
) -> bool:
    if can_access_all_documents(role):
        return True

    stmt = select(
        exists().where(
            and_(
                DocumentACL.tenant_id == tenant_id,
                DocumentACL.document_id == document_id,
                DocumentACL.principal_type == "role",
                DocumentACL.principal_id == role,
                DocumentACL.permission == READ_PERMISSION,
            )
        )
    )
    return bool(db.scalar(stmt))
