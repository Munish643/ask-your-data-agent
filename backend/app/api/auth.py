from fastapi import APIRouter, Depends

from app.core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "tenant_id": str(current_user.tenant_id),
        "user_id": str(current_user.user_id),
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "auth_mode": "development_mock",
    }
