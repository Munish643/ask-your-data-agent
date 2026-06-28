import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


class StorageService:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or settings.storage_dir

    def save_upload(self, tenant_id: str, upload: UploadFile, content: bytes, safe_name: str) -> str:
        tenant_dir = self.root / tenant_id / "uploads"
        tenant_dir.mkdir(parents=True, exist_ok=True)
        storage_name = f"{uuid.uuid4()}-{safe_name}"
        path = tenant_dir / storage_name
        path.write_bytes(content)
        return str(path)

    def delete(self, storage_path: str) -> None:
        path = Path(storage_path)
        if path.exists() and path.is_file():
            path.unlink()

    def reset_dev_storage(self) -> None:
        if self.root.exists():
            shutil.rmtree(self.root)
