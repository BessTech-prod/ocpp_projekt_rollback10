# EV CSMS Deployment Runbook (AWS + HTTPS)

## Purpose
This runbook explains how to safely deploy code/config updates from your repository to an already running Docker Compose environment on AWS that serves an HTTPS website.

If you are operating the BessTech-prod flow and want a role-specific, step-by-step version plus a reusable checklist, use:
- `Manuals/BESSTECH_PROD_AWS_MULTISERVICE_UPDATE_GUIDE.md`
- `Manuals/RELEASE_CHECKLIST_TEMPLATE.md`

It is written for this project structure and supports both runtime modes found in this repo:

- `docker-compose.yml` (multi-service mode)
- `docker-compose.single.yml` (single-container mode)

---

## 1) Scope and assumptions

This runbook assumes:

- Your server already runs EV CSMS via Docker Compose.
- Your source of truth is your GitHub repository.
- You want a repeatable, low-risk update process with rollback.
- HTTPS termination is already configured (ALB, reverse proxy, or host-level nginx).

What this runbook does not change:

- DNS
- TLS certificates
- Security groups (unless you choose to update infra)

---

## 2) Pre-deployment checklist

- [ ] All local changes committed and pushed to GitHub
- [ ] Release tag created (recommended)
- [ ] SSH access to AWS host verified
- [ ] Enough disk space on host for image rebuilds
- [ ] Backup path available on host
- [ ] Maintenance window agreed (if production)

---

## 3) Release preparation (local machine)

From your local clone:

```bash
git status
git add .
git commit -m "Release: UI/API updates"
git push origin main
```

Recommended: tag each deployment:

```bash
git tag -a v2026.03.18-evcsms-ui-api -m "UI/API deployment"
git push origin v2026.03.18-evcsms-ui-api
```

---

## 4) Connect and identify active runtime mode (AWS host)

```bash
ssh -i /path/to/key.pem ec2-user@YOUR_SERVER_IP
cd /path/to/evcsms
```

Detect running services:

```bash
docker compose ps
```

Interpretation:

- If you see `ui-service`, `api-service`, `ocpp-ws-service`, `redis-service`: you are in **multi-service mode** (`docker-compose.yml`).
- If you see `evcsms-local`: you are in **single-container mode** (`docker-compose.single.yml`).

---

## 5) Backup before every deployment

Create a timestamp and backup directory:

```bash
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/backups/evcsms-$TS"
mkdir -p "$BACKUP_DIR"
```

Backup persistent state and deployment files:

```bash
cp -a data "$BACKUP_DIR/"
cp -a config "$BACKUP_DIR/"
cp -a docker-compose.yml docker-compose.single.yml run.sh "$BACKUP_DIR/"
[ -f .env ] && cp -a .env "$BACKUP_DIR/"
```

Capture running state:

```bash
docker compose ps > "$BACKUP_DIR/compose-ps.txt"
docker compose images > "$BACKUP_DIR/compose-images.txt"
```

---

## 6) Pull the release from GitHub

Fast-forward main:

```bash
git fetch --all --tags
git checkout main
git pull --ff-only origin main
```

Or deploy a specific tag:

```bash
git fetch --all --tags
git checkout v2026.03.18-evcsms-ui-api
```

---

## 7) Deploy procedure

## 7A) Multi-service mode (`docker-compose.yml`)

### Minimal-impact deployment (recommended)

If you changed only frontend/UI assets:

```bash
docker compose -f docker-compose.yml up -d --no-deps --build ui-service
```

If you changed API behavior too:

```bash
docker compose -f docker-compose.yml up -d --no-deps --build api-service
docker compose -f docker-compose.yml up -d --no-deps --build ui-service
```

If OCPP service code changed:

```bash
docker compose -f docker-compose.yml up -d --no-deps --build ocpp-ws-service
```

Full stack rebuild/recreate (heavier, but simple):

```bash
docker compose -f docker-compose.yml up -d --build
```

## 7B) Single-container mode (`docker-compose.single.yml`)

Use this when `evcsms-local` is your runtime:

```bash
docker compose -f docker-compose.single.yml down
docker compose -f docker-compose.single.yml up -d --build
```

Equivalent helper script:

```bash
./run.sh down-local
./run.sh up-local
```

---

## 8) Post-deployment verification

## 8A) Container and health checks

Multi-service:

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail=200 ui-service api-service ocpp-ws-service redis-service
```

Single-container:

```bash
docker compose -f docker-compose.single.yml ps
docker compose -f docker-compose.single.yml logs --tail=200 evcsms-local
```

Basic local checks on host:

```bash
curl -f http://localhost/
curl -f http://localhost:8000/health
```

## 8B) External HTTPS checks

```bash
curl -I https://YOUR_DOMAIN/
curl -I https://YOUR_DOMAIN/ui/portal/live_ops.html
```

Manual browser checks:

- Login page loads and authenticates
- `portal/live_ops` loads without API 404 errors
- Commands and filters work
- Dashboard pages render expected navbar/content styles

---

## 9) AWS HTTPS notes

Keep this in mind after deployments:

- If TLS is terminated at ALB/proxy, app container updates should not require cert changes.
- Verify forwarding rules still route `/api/*` and `/ui/*` correctly.
- If browser serves stale assets, force refresh (`Ctrl+F5`) or bump static file query version (for example `?v=2`).

---

## 10) Rollback procedure

## 10A) Roll back code to known-good release

```bash
git log --oneline -n 20
git checkout <KNOWN_GOOD_TAG_OR_COMMIT>
```

Redeploy with same compose mode used in production.

Multi-service example:

```bash
docker compose -f docker-compose.yml up -d --build
```

Single-container example:

```bash
docker compose -f docker-compose.single.yml down
docker compose -f docker-compose.single.yml up -d --build
```

## 10B) Roll back data/config if needed

```bash
cp -a "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/data" ./
cp -a "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/config" ./
[ -f "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/.env" ] && cp -a "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/.env" ./
```

Then redeploy containers.

---

## 11) Recommended release workflow (professional)

1. Work in feature branch
2. Merge to main after review
3. Tag release
4. Backup production state
5. Deploy by tag
6. Verify health and key user journeys
7. Record deployment notes

Suggested deployment notes template (`RELEASE_NOTES.md`):

- Release tag/commit
- Date/time deployed
- Operator
- Services rebuilt
- Verification results
- Rollback target

---

## 12) Troubleshooting quick map

- UI loads but data missing: check API logs and `/api/*` routing
- `live_ops` fetch errors: verify API route availability and service version parity
- Login loop/401: verify `APP_SECRET`, cookies, reverse-proxy headers
- OCPP not connecting: verify port `9000`, firewall/security-group, ws endpoint
- Data missing after restart: verify `data/` and `config/` mounts exist and are writable

---

## 13) Appendix: command snippets by mode

### Multi-service one-liners

```bash
# rebuild only UI
docker compose -f docker-compose.yml up -d --no-deps --build ui-service

# rebuild API + UI
docker compose -f docker-compose.yml up -d --no-deps --build api-service ui-service

# tail logs
docker compose -f docker-compose.yml logs -f --tail=200
```

### Single-container one-liners

```bash
# redeploy
docker compose -f docker-compose.single.yml down
docker compose -f docker-compose.single.yml up -d --build

# tail logs
docker compose -f docker-compose.single.yml logs -f --tail=200 evcsms-local
```

---

## 14) Final recommendation

Yes, uploading your updated configuration/code to GitHub helps significantly.

For production-like operations, always deploy from a tagged Git commit and keep a backup + rollback target documented before each rollout.

