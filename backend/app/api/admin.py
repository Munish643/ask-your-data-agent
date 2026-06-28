from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import can_view_admin
from app.core.security import CurrentUser, get_current_user
from app.models.entities import AuditLog, ChatMessage, ChatSession, Document, UsageLog, User
from app.schemas.common import AuditLogRead, UsageLogRead
from app.services.audit_service import write_audit_log

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: CurrentUser) -> None:
    if not can_view_admin(current_user.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


@router.get("/audit-logs", response_model=list[AuditLogRead])
def get_audit_logs(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    write_audit_log(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="admin.view_audit_logs",
        resource_type="audit_log",
    )
    db.commit()
    return list(
        db.scalars(
            select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id).order_by(AuditLog.created_at.desc()).limit(100)
        )
    )


@router.get("/usage-logs", response_model=list[UsageLogRead])
def get_usage_logs(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    write_audit_log(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        action="admin.view_usage_logs",
        resource_type="usage_log",
    )
    db.commit()
    return list(
        db.scalars(
            select(UsageLog).where(UsageLog.tenant_id == current_user.tenant_id).order_by(UsageLog.created_at.desc()).limit(100)
        )
    )


@router.get("/stats")
def get_stats(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_admin(current_user)
    total_documents = db.scalar(select(func.count()).select_from(Document).where(Document.tenant_id == current_user.tenant_id)) or 0
    indexed_documents = db.scalar(
        select(func.count()).select_from(Document).where(Document.tenant_id == current_user.tenant_id, Document.status == "indexed")
    ) or 0
    total_questions = db.scalar(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.tenant_id == current_user.tenant_id, ChatMessage.role == "user")
    ) or 0
    avg_latency = db.scalar(
        select(func.avg(ChatMessage.latency_ms)).where(ChatMessage.tenant_id == current_user.tenant_id, ChatMessage.role == "assistant")
    ) or 0
    users = list(db.scalars(select(User).where(User.tenant_id == current_user.tenant_id).order_by(User.created_at.desc()).limit(20)))
    recent_documents = list(
        db.scalars(select(Document).where(Document.tenant_id == current_user.tenant_id).order_by(Document.created_at.desc()).limit(8))
    )
    recent_sessions = list(
        db.scalars(
            select(ChatSession).where(ChatSession.tenant_id == current_user.tenant_id).order_by(ChatSession.updated_at.desc()).limit(8)
        )
    )
    return {
        "total_documents": total_documents,
        "indexed_documents": indexed_documents,
        "total_questions": total_questions,
        "average_latency_ms": round(float(avg_latency), 2),
        "users": [
            {"id": str(user.id), "email": user.email, "name": user.name, "role": user.role, "status": user.status}
            for user in users
        ],
        "recent_documents": [
            {
                "id": str(document.id),
                "title": document.title,
                "status": document.status,
                "file_name": document.file_name,
                "created_at": document.created_at.isoformat(),
            }
            for document in recent_documents
        ],
        "recent_sessions": [
            {"id": str(session.id), "title": session.title, "updated_at": session.updated_at.isoformat()}
            for session in recent_sessions
        ],
    }
