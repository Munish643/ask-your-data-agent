# Ask-Your-Data Agent

Production-grade MVP for a B2B SaaS enterprise knowledge assistant. Companies can upload documents, index them into PostgreSQL + pgvector, and ask source-backed questions through a dark-mode Next.js app with FastAPI, Celery workers, Redis, audit logs, usage logs, and a Gemini-first LLM/embedding provider.

## Architecture

```text
Next.js frontend :3000
        |
        | REST + POST streaming SSE
        v
FastAPI backend :8000
        |
        | metadata, ACLs, chat, audit, usage, vector search
        v
PostgreSQL + pgvector
        ^
        | document ingestion jobs
        |
Celery worker <---- Redis broker
        |
        | local dev storage now, S3-compatible abstraction later
        v
Uploaded files
```

## What Is Included

- Tenant, user, role, document, chunk, ACL, chat, connector, sync job, audit, and usage models.
- Development mock auth seeded as `admin@example.com` with admin role in the demo tenant.
- Upload support for `.txt`, `.md`, `.pdf`, and `.docx`.
- Text extraction, chunking, Gemini embeddings, deterministic local fallback embeddings, pgvector retrieval, and permission filtering.
- POST-based SSE chat stream with status, source, answer_delta, done, and error events.
- Gemini generation by default, with mock streaming mode when `GEMINI_API_KEY` is not set.
- Admin dashboard, knowledge base, connectors placeholder, audit logs, and usage logs.

## Run Locally

From this folder:

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health
- Backend docs: http://localhost:8000/docs

The app runs without a Gemini key. In that mode, embeddings are deterministic hash vectors and answers are mock streamed from retrieved chunks.

## Deploy

For AWS Free Tier, use the single-EC2 Docker Compose guide:

```text
infra/aws-free-tier-deployment.md
```

For automatic redeploys from GitHub to EC2 after every push:

```text
infra/github-actions-ec2-deploy.md
```

The fastest non-AWS hosted MVP path is Render using the included `render.yaml`:

```text
infra/render-deployment.md
```

That Blueprint deploys the Next.js frontend, FastAPI backend, and managed PostgreSQL with pgvector. It uses `INGESTION_MODE=inline` for the hosted MVP so uploaded files are indexed on the API service's persistent disk. Move storage to S3-compatible object storage before re-enabling a separate worker in production.

## Environment Variables

Backend variables live in `backend/.env.example`:

```text
DATABASE_URL=postgresql+psycopg://app:app@postgres:5432/askdata
DATABASE_SSL_MODE=
DATABASE_SSL_ROOT_CERT=
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
REDIS_URL=redis://redis:6379/0
STORAGE_DIR=storage
INGESTION_MODE=worker
GEMINI_API_KEY=
GEMINI_GENERATION_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSION=768
GEMINI_MAX_OUTPUT_TOKENS=500
LLM_TIMEOUT_SECONDS=30
LLM_STREAM_TIMEOUT_SECONDS=60
EMBEDDING_BATCH_SIZE=20
RETRIEVAL_LIMIT=4
RETRIEVAL_SOURCE_CONTENT_CHARS=1400
RETRIEVAL_MIN_SCORE=0.2
FALLBACK_KEYWORD_OVERLAP_MIN=1
```

Frontend variables live in `frontend/.env.example`:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## PostgreSQL Connections And SSL

Local Docker Compose uses the internal service hostname:

```text
DATABASE_URL=postgresql+psycopg://app:app@postgres:5432/askdata
```

From Windows tools like pgAdmin or DBeaver, connect to:

```text
Host: localhost
Port: 5432
Database: askdata
User: app
Password: app
```

For a hosted PostgreSQL database, use its real host, port, database, user, and password:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL_MODE=require
```

If your provider requires certificate verification, mount the CA certificate into the backend and worker containers and set:

```text
DATABASE_SSL_MODE=verify-full
DATABASE_SSL_ROOT_CERT=/app/certs/ca.pem
```

You can also put SSL directly in the URL if your provider gives it that way:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Use `sslmode=disable` or leave `DATABASE_SSL_MODE` empty for the local Docker Postgres service. Use `require` for most managed databases. Use `verify-full` when you have the provider CA certificate and want hostname verification.

When changing to a remote PostgreSQL database in Docker Compose, update `DATABASE_URL` for both `backend` and `worker`; they both need the same database.

## Multi-User Access

The schema already supports tenant-scoped users, roles, document ACLs, per-user chat sessions, audit logs, and usage logs. The current MVP still uses development mock auth from `backend/app/core/security.py`, so every request runs as the seeded demo admin unless that auth layer is replaced.

For real multi-user access in production, connect an identity provider such as Auth0, Clerk, Microsoft Entra ID, Google Workspace OIDC, or your own JWT issuer. The replacement auth dependency should validate the token, resolve or create the tenant/user row, and return `CurrentUser` with the correct `tenant_id`, `user_id`, `email`, and `role`.

## Using Gemini

Set `GEMINI_API_KEY` for the backend and worker. Generation and embedding models are separate because answer quality, latency, cost, vector dimensions, and retrieval behavior are independent concerns. `GEMINI_GENERATION_MODEL` controls answer generation, while `GEMINI_EMBEDDING_MODEL` and `GEMINI_EMBEDDING_DIMENSION` control vectors stored in pgvector.

If you change the embedding model or dimension, re-index documents from the Knowledge Base screen or run a controlled backend job. Do not mix embeddings from different models in the same vector index.

When `GEMINI_API_KEY` is empty, the app uses deterministic local fallback embeddings so Docker can run without external services. That mode is useful for smoke tests, but it is not true semantic search. The backend filters weak matches with `RETRIEVAL_MIN_SCORE` and requires keyword overlap with `FALLBACK_KEYWORD_OVERLAP_MIN` so unrelated questions return "I could not find enough information..." instead of random document text.

After adding a Gemini key or changing the embedding model, re-index uploaded documents so stored vectors are regenerated with the real embedding provider.

## Upload And Ask

1. Open `http://localhost:3000/knowledge-base`.
2. Upload a TXT, MD, PDF, or DOCX document.
3. Wait for status to move from `uploaded` or `processing` to `indexed`.
4. Open `http://localhost:3000/chat`.
5. Ask a question. The client consumes SSE events and shows retrieval status, source cards, streamed answer text, and completion latency.

## Streaming Flow

`POST /api/chat/stream` validates the query, resolves the demo user and tenant, creates a session if needed, saves the user message, emits status events, embeds the query, searches pgvector with tenant and ACL filters, emits source events, calls Gemini streaming generation, emits answer deltas, saves the assistant message, writes audit and usage logs, and emits done.

For lower latency, keep `RETRIEVAL_LIMIT`, `RETRIEVAL_SOURCE_CONTENT_CHARS`, and `GEMINI_MAX_OUTPUT_TOKENS` modest. The chat stream reports per-step timing for embedding, pgvector search, Gemini generation, and persistence so you can see where time is being spent.

## Ingestion Flow

Upload creates document metadata, default role ACLs, a sync job, and a local file. The Celery worker extracts text, chunks content, embeds chunks with Gemini or local fallback mode, stores vectors in PostgreSQL, and marks the document indexed. Extraction failures mark the document and job failed with a clear error.

## Adding Google Drive Later

The connector model and API are present. To add Google Drive, implement OAuth/OIDC setup, encrypted connector config storage, source sync jobs, incremental change tokens, file ACL mapping into `DocumentACL`, and ingestion jobs that reuse the current extraction/chunking/embedding services.

## AWS Production Path

See `infra/aws-deployment-notes.md` for ECS Fargate, ALB, ECR, RDS PostgreSQL + pgvector, SQS, ElastiCache Redis, S3, Secrets Manager, CloudWatch, Sentry, OpenTelemetry, and optional Langfuse notes.

## Known Limitations

- Authentication is a development mock user, ready to replace with JWT/OIDC.
- Connectors are placeholders in the MVP UI.
- Local storage should be replaced with S3 before production.
- Rate limiting is structured as a security requirement but not enforced yet.
- Mock embeddings are deterministic for local testing, not semantically meaningful.
