# AWS Free Tier Deployment Guide

This is the lowest-cost AWS path for the current MVP. It runs the full app on one EC2 instance with Docker Compose:

- Next.js frontend container.
- FastAPI backend container.
- Celery worker container.
- PostgreSQL + pgvector container.
- Redis container.
- Docker volumes for database and uploaded files.

This avoids paid-by-default pieces like an Application Load Balancer, NAT Gateway, ElastiCache, and multi-service ECS. It is good for demos and learning, not for real customer data.

## Free Tier Shape

AWS Free Tier changed in 2025. Current AWS pages describe up to $200 in credits over 6 months for new customers on the Free plan, and RDS free options for db.t3.micro/db.t4g.micro PostgreSQL. Even so, the safest MVP path is one EC2 instance first, because every managed service adds another place to accidentally spend.

Avoid these at the start:

- Application Load Balancer.
- NAT Gateway.
- ElastiCache.
- WAF.
- Multi-AZ RDS.
- ECS/Fargate services.
- Route 53 hosted zone unless you are ready for small recurring charges.

## 1. Create A Budget First

Before launching anything:

1. Open AWS Billing.
2. Create a monthly budget alert, for example `$5`.
3. Add your email for alerts.
4. Check Free Tier usage daily while testing.

## 2. Launch One EC2 Instance

Use Ubuntu on a free-tier-eligible micro instance available in your account/region.

Recommended security group inbound rules:

```text
22    SSH    your IP only
3000  TCP    your IP only for testing, or 0.0.0.0/0 for public demo
8000  TCP    your IP only for testing, or 0.0.0.0/0 for public API demo
```

Do not open these to the internet:

```text
5432  PostgreSQL
6379  Redis
```

Use an 8-20 GB EBS volume for the first test. Keep uploads small.

## 3. Install Docker On EC2

SSH into the EC2 instance and install Docker + Compose:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and SSH back in so the Docker group applies.

## 4. Upload Or Clone The Project

Clone your GitHub repo:

```bash
git clone YOUR_REPO_URL ask-your-data-agent
cd ask-your-data-agent
```

If you do not have GitHub set up yet, zip the project locally and upload it with `scp`.

## 5. Create The Root `.env`

Create a root `.env` file next to `docker-compose.yml`:

```bash
nano .env
```

Paste this, replacing the public IP and Gemini key:

```text
APP_ENV=production
NEXT_PUBLIC_API_BASE_URL=http://YOUR_EC2_PUBLIC_IP:8000
CORS_ORIGINS=http://YOUR_EC2_PUBLIC_IP:3000
GEMINI_API_KEY=your-real-gemini-key
```

Do not commit this file.

## 6. Start The App

```bash
docker compose up --build -d
```

Check logs:

```bash
docker compose logs -f backend
docker compose logs -f worker
```

Open:

```text
Frontend: http://YOUR_EC2_PUBLIC_IP:3000
Backend health: http://YOUR_EC2_PUBLIC_IP:8000/health
```

## 7. Keep Costs Down

- Stop the EC2 instance when not testing.
- Do not allocate an Elastic IP unless you understand the cost rules.
- Do not create a NAT Gateway.
- Do not expose Postgres or Redis publicly.
- Delete unattached EBS volumes and old snapshots.
- Keep CloudWatch logs short while testing.

## Upgrade Path

When you are ready to move beyond free-tier testing:

1. Move uploaded files to S3.
2. Move PostgreSQL to RDS PostgreSQL with pgvector.
3. Move Redis to ElastiCache or SQS-backed ingestion.
4. Move containers to ECS Fargate behind an Application Load Balancer.
5. Store secrets in AWS Secrets Manager.
6. Add real JWT/OIDC auth before real users.
