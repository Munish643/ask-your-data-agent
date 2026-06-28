from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Ask-Your-Data Agent"
    app_env: str = "development"
    api_prefix: str = "/api"
    database_url: str = "postgresql+psycopg://app:app@localhost:5432/askdata"
    database_ssl_mode: str | None = None
    database_ssl_root_cert: str | None = None
    database_pool_size: int = 5
    database_max_overflow: int = 10
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000"
    storage_dir: Path = Path("storage")
    ingestion_mode: str = "worker"
    max_upload_mb: int = 25
    allowed_upload_extensions: str = ".txt,.md,.pdf,.docx"

    gemini_api_key: str | None = Field(default=None, repr=False)
    gemini_generation_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    gemini_embedding_dimension: int = 768
    gemini_max_output_tokens: int = 500
    llm_timeout_seconds: int = 30
    llm_stream_timeout_seconds: int = 60
    embedding_batch_size: int = 20
    retrieval_limit: int = 4
    retrieval_source_content_chars: int = 1400
    retrieval_min_score: float = 0.2
    fallback_keyword_overlap_min: int = 1
    auth_token_secret: str = "dev-change-me-session-secret"
    auth_token_ttl_seconds: int = 86400

    dev_tenant_id: str = "00000000-0000-0000-0000-000000000001"
    dev_user_id: str = "00000000-0000-0000-0000-000000000001"
    dev_user_email: str = "admin@example.com"
    dev_user_role: str = "admin"

    @property
    def cors_origin_list(self) -> list[str]:
        origins: list[str] = []
        for raw_origin in self.cors_origins.split(","):
            origin = raw_origin.strip()
            if not origin:
                continue
            if origin == "*" or "://" in origin:
                origins.append(origin)
            else:
                origins.append(f"https://{origin}")
        return origins

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgresql+psycopg://"):
            return self.database_url
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        return self.database_url

    @property
    def allowed_extensions(self) -> set[str]:
        return {ext.strip().lower() for ext in self.allowed_upload_extensions.split(",") if ext.strip()}

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
