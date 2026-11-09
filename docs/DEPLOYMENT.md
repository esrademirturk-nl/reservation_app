# Deployment

How Waypad runs outside a laptop. The web app is already live on GitHub Pages; this guide covers the API.

## What gets deployed

| Part | Where | How |
|---|---|---|
| Web app (`apps/web`) | GitHub Pages | `.github/workflows/deploy-web.yml` on every push to `main` |
| API image (`apps/api`) | GitHub Container Registry: `ghcr.io/esrademirturk-nl/waypad-api` | `.github/workflows/api-image.yml` builds and smoke-tests the image on every pull request and pushes `latest` + the commit SHA from `main` |
| API container | Azure Container Apps (suggested) | steps below |
| Database | Azure Database for PostgreSQL – Flexible Server | steps below |
| Queue | Redis (optional at first) | without `REDIS_URL` imports are read inside the request |

## The container

The image starts with `docker/entrypoint.sh`:

1. applies pending SQL migrations (`RUN_MIGRATIONS=false` to skip),
2. loads the demo account if `SEED_DEMO=true` (demo environments only — it resets that account),
3. starts the API on `PORT` (3000) as a non-root user.

It has a Docker `HEALTHCHECK` on `/api/v1/health`. Uploaded files are written to `/data/storage`; mount a volume there (see "Files" below).

Try the whole stack locally:

```bash
docker compose --profile full up --build
# API on http://localhost:3000/api/v1/health, demo login esra@demo.waypad.app / waypad-demo1
```

## Environment variables

Required in production:

| Name | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://waypad:…@waypad-db.postgres.database.azure.com:5432/waypad?sslmode=require` | |
| `JWT_SECRET` | output of `openssl rand -base64 48` | keep it secret; changing it signs everyone out |
| `CORS_ORIGINS` | `https://esrademirturk-nl.github.io` | the web app's origin |

Optional: `REDIS_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `INBOUND_SECRET`, `FORWARD_DOMAIN`, `UPLOAD_MAX_MB`, `IMPORT_WORKER`, `SEED_DEMO`. All are described in [apps/api/README.md](../apps/api/README.md#environment-variables). The app refuses to start if a value is missing or invalid and says which one.

## Azure, step by step

Uses the Azure CLI (`az login` first). Names are examples; prices and SKUs change, so check the Azure pricing pages (student credits cover a small setup like this).

```bash
RG=waypad
LOC=westeurope

az group create -n $RG -l $LOC

# 1. PostgreSQL (smallest burstable tier is enough for a demo)
az postgres flexible-server create -g $RG -n waypad-db -l $LOC \
  --tier Burstable --sku-name Standard_B1ms --version 16 \
  --admin-user waypad --admin-password '<strong password>' \
  --public-access 0.0.0.0          # allows Azure services, not the whole internet
az postgres flexible-server db create -g $RG -s waypad-db -d waypad

# 2. Container Apps environment
az extension add --name containerapp --upgrade
az containerapp env create -g $RG -n waypad-env -l $LOC

# 3. The API (secrets are stored by Azure, the app reads them as env vars)
az containerapp create -g $RG -n waypad-api --environment waypad-env \
  --image ghcr.io/esrademirturk-nl/waypad-api:latest \
  --target-port 3000 --ingress external \
  --min-replicas 0 --max-replicas 2 \
  --secrets db-url='postgresql://waypad:<password>@waypad-db.postgres.database.azure.com:5432/waypad?sslmode=require' \
            jwt-secret='<openssl rand -base64 48>' \
  --env-vars DATABASE_URL=secretref:db-url JWT_SECRET=secretref:jwt-secret \
             CORS_ORIGINS=https://esrademirturk-nl.github.io SEED_DEMO=true

az containerapp show -g $RG -n waypad-api --query properties.configuration.ingress.fqdn -o tsv
# → https://<that address>/api/v1/health
```

If the GitHub package is private, either make it public (GitHub → Packages → waypad-api → Settings) or add `--registry-server ghcr.io --registry-username <github user> --registry-password <token with read:packages>`.

**Updating:** every merge to `main` publishes a new `latest` image. Roll it out with
`az containerapp update -g $RG -n waypad-api --image ghcr.io/esrademirturk-nl/waypad-api:<sha>` (pinning the SHA makes rollbacks easy).

**Scale to zero:** `--min-replicas 0` keeps costs near zero for a portfolio demo; the first request after a pause takes a few seconds.

### Adding the AI reader and email import

```bash
az containerapp secret set -g $RG -n waypad-api \
  --secrets anthropic-key='<key>' inbound-secret='<openssl rand -hex 24>'
az containerapp update -g $RG -n waypad-api \
  --set-env-vars ANTHROPIC_API_KEY=secretref:anthropic-key INBOUND_SECRET=secretref:inbound-secret
```

Forwarded emails need an inbound-mail service (SendGrid Inbound Parse, Postmark, Mailgun…) for the `in.waypad.app` domain. A small adapter turns the provider's payload into `{ to, from, subject, text, html, attachments[] }`, signs the raw JSON with `INBOUND_SECRET` (HMAC-SHA256, header `X-Waypad-Signature: sha256=<hex>`) and posts it to `/api/v1/inbound/email`.

### Adding Redis (background queue)

Until there is real traffic, the API reads imports inside the request. When uploads get slow or the AI service is busy, add Redis (a managed Redis, or a `redis:7-alpine` container app with internal ingress) and set `REDIS_URL`. To scale reading separately, run a second container app from the same image with `IMPORT_WORKER=true` and set `IMPORT_WORKER=false` on the API.

### Files

Container disks are temporary. For a demo, mount an Azure Files share at `/data/storage` (Container Apps → Volumes). The proper next step is an Azure Blob version of the `Storage` class in `apps/api/src/storage/storage.ts` (three methods: `put`, `get`, `delete`).

## Checklist before sharing the link

- [ ] `GET /api/v1/health` answers `{"status":"ok"}`
- [ ] Demo login works; then set `SEED_DEMO=false` so restarts keep data
- [ ] `CORS_ORIGINS` contains only the web app's origin
- [ ] Secrets are Azure secrets, not plain env vars; nothing secret in the repository
- [ ] Database firewall allows Azure services only
- [ ] Budget alert set in the Azure subscription

## Other hosts

The image runs anywhere that runs containers. Render, Railway and Fly.io all have a managed PostgreSQL and a free or cheap tier: point them at the GHCR image (or at `apps/api/Dockerfile`) and set the same environment variables.
