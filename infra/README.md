# Infrastructure

This folder captures production deployment notes for Ask-Your-Data Agent. The MVP runs locally on Docker Compose, while the production target is split into frontend hosting, API services, worker services, managed PostgreSQL with pgvector, Redis, object storage, queueing, secrets, and observability.

For AWS Free Tier, start with `aws-free-tier-deployment.md`.

For the fastest non-AWS hosted MVP, start with `render-deployment.md`.

Use `aws-deployment-notes.md` when preparing a larger AWS rollout.
