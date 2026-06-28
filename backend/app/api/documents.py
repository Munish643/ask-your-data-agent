from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.schemas.common import DocumentRead
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])
document_service = DocumentService()


@router.post("/upload", response_model=DocumentRead)
async def upload_document(
    file: UploadFile,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await document_service.upload_document(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        upload=file,
    )


@router.post("/upload-batch", response_model=list[DocumentRead])
async def upload_documents(
    files: list[UploadFile] = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one file")

    uploaded_documents = []
    for file in files:
        uploaded_documents.append(
            await document_service.upload_document(
                db,
                tenant_id=current_user.tenant_id,
                user_id=current_user.user_id,
                upload=file,
            )
        )
    return uploaded_documents


@router.get("", response_model=list[DocumentRead])
def list_documents(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return document_service.list_documents(db, tenant_id=current_user.tenant_id)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return document_service.get_document(db, tenant_id=current_user.tenant_id, document_id=document_id)


@router.delete("/{document_id}")
def delete_document(
    document_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document_service.delete_document(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        document_id=document_id,
    )
    return {"status": "deleted"}


@router.post("/{document_id}/reindex", response_model=DocumentRead)
def reindex_document(
    document_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return document_service.reindex_document(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user_id,
        document_id=document_id,
    )
