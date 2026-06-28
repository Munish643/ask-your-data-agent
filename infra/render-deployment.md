# Render Deployment Guide

This is the fastest hosted MVP path for Ask-Your-Data Agent.

The included `render.yaml` creates:

- `askdata-api`: FastAPI backend container.
- `askdata-web`: Next.js frontend container.
- `askdata-db`: managed PostgreSQL 16 database with private networking.
- A persistent `/app/storage` disk attached to the API service.

The backend runs with `INGESTION_MODE=inline` on Render. That means uploads are indexed inside the API service instead of a separate Celery worker. This avoids shared-disk problems on managed platforms. Move uploads to S3 or another object store before re-enabling a separate worker in production.

## 1. Prepare Secrets

Create or rotate this before deployment:

```text
GEMINI_API_KEY=your-real-gemini-key
```

Do not commit keys to `.env.example`, `render.yaml`, or Git.

## 2. Push To GitHub

Render Blueprints deploy from a Git repository. Push this project folder to GitHub first.

## 3. Create The Render Blueprint

In Render:

1. Open the Render Dashboard.
2. Choose **New > Blueprint**.
3. Connect the GitHub repository.
4. Render will detect `render.yaml`.
5. Enter `GEMINI_API_KEY` when prompted.
6. Apply the Blueprint.

The API runs Alembic migrations on startup:

```bash
alembic upgrade head
```

The initial migration enables pgvector with:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Render Postgres supports `pgvector` on PostgreSQL 13+. The Blueprint pins PostgreSQL 16.

## 4. Check Health

After deployment, open the API health endpoint:

```text
https://askdata-api.onrender.com/health
```

The exact hostname will be shown in Render.

## 5. Open The App

Open the frontend service URL:

```text
https://askdata-web.onrender.com
```

The frontend receives the API hostname from Render at runtime through `/runtime-config.js`, so rebuilding is not required just to change the API host.

## 6. Upload And Test

1. Open `/signup` or `/login`.
2. Go to `/knowledge-base`.
3. Upload a small `.txt`, `.md`, `.pdf`, or `.docx` file.
4. Wait for the status to become `indexed`.
5. Ask a source-backed question in `/chat`.

## Important Production Notes

- Authentication is still demo/mock auth. Do not use this for real customer data until JWT/OIDC auth is connected.
- Local disk storage is acceptable for a hosted MVP, but S3-compatible object storage is the right production path.
- Inline ingestion is simple but upload requests can take longer for large documents. Use a worker again after moving files to shared object storage.
- Keep `RETRIEVAL_LIMIT`, `RETRIEVAL_SOURCE_CONTENT_CHARS`, and `GEMINI_MAX_OUTPUT_TOKENS` modest for lower chat latency.
- If you use an external database instead of Render Postgres, set `DATABASE_SSL_MODE=require`.
