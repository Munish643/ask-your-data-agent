# GitHub Actions EC2 Auto Deploy

Use this when you want every push to `main` to update the AWS EC2 deployment automatically.

## One-Time EC2 Setup

SSH into the instance and make sure the app can run manually first:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
exit
```

SSH back in, clone the repo if it is not already cloned, and keep the production `.env` on the server:

```bash
git clone https://github.com/Munish643/ask-your-data-agent.git
cd ask-your-data-agent
nano .env
docker compose up --build -d
```

The `.env` file stays only on EC2 and is ignored by Git.

## GitHub Secrets

In GitHub, open:

```text
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

Create these secrets:

```text
EC2_HOST=13.220.102.226
EC2_USER=ubuntu
EC2_SSH_KEY=<full contents of askdata.pem>
```

`EC2_SSH_KEY` must include the full private key text, including:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Never commit the `.pem` file to Git.

## Deploying

After the secrets are set, every push to `main` runs:

```bash
git fetch origin main
git reset --hard origin/main
docker compose up --build -d
```

You can also deploy manually from GitHub:

```text
Actions -> Deploy to EC2 -> Run workflow
```
