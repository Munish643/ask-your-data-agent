# AWS Deployment Notes

## Frontend

Host the Next.js frontend on Vercel for the fastest path, or build a static/container deployment behind S3 + CloudFront if your organization standardizes on AWS-only delivery. Configure `NEXT_PUBLIC_API_BASE_URL` to point at the public API origin.

## Backend API

Package the FastAPI backend as a container image in ECR and run it on ECS Fargate behind an Application Load Balancer. Use `/health` for target group health checks. Run Alembic migrations as a one-off ECS task during deployment before shifting traffic.

## Workers

Run Celery workers as a separate ECS Fargate service. In production, move from Redis-as-broker to SQS or another managed queue so ingestion can scale independently of API traffic. Scale worker count from queue depth, job latency, and CPU utilization.

## Database

Use Amazon RDS for PostgreSQL with the pgvector extension enabled. Keep the vector dimension aligned with `GEMINI_EMBEDDING_DIMENSION`. If the embedding model or dimension changes, create a controlled re-index job for all documents before using the new vector index.

## Queue And Cache

Use SQS for production ingestion jobs. Use ElastiCache Redis for caching, rate limiting, transient session coordination, and optional Celery result storage if Celery remains the worker framework.

## Storage

Replace local development storage with S3 through the storage service abstraction. Store uploaded raw files in private buckets with tenant-aware prefixes, server-side encryption, lifecycle policies, and object-level audit logging.

## Secrets

Store `GEMINI_API_KEY`, database credentials, Redis credentials, S3 bucket names, and OIDC/JWT settings in AWS Secrets Manager or SSM Parameter Store. Inject secrets into ECS tasks at runtime. Never bake secrets into images or frontend bundles.

## Monitoring

Use CloudWatch logs and metrics for ECS services, ALB, RDS, and queue depth. Add Sentry for application exceptions, OpenTelemetry for traces, and Langfuse or a similar product for LLM observability when production traffic starts.

## Security

Put the API behind HTTPS only, use least-privilege IAM task roles, enable private subnets for ECS/RDS/Redis, restrict RDS ingress to service security groups, and add WAF rules if the API is internet-facing. Add real OIDC/JWT auth before production use.
