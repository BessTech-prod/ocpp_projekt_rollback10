# BessTech-prod AWS Update Guide (Multi-Service Docker)

## Purpose
This guide is a safe, repeatable update process for your already running EV CSMS deployment on AWS when using `evcsms/docker-compose.yml` (multi-service mode).

It is designed to avoid breaking services by:
- deploying from Git (not manual file copy),
- rebuilding only impacted services,
- backing up `data/`, `config/`, and `.env` before each rollout,
- keeping a clear rollback target.

---

## 1) Confirm this guide matches your runtime
Run this on AWS host in the project directory:

```bash
docker compose -f docker-compose.yml ps
```

This guide applies when you see these containers:
- `ui-service`
- `api-service`
- `ocpp-ws-service`
- `redis-service`

If you see `evcsms-local`, you are in single-container mode and should use `docker-compose.single.yml` flow instead.

---

## 2) Files to upload to GitHub vs files to keep server-local

## Upload to GitHub (normal code release)
Commit and push project source and deployment definitions:
- `evcsms/web/**`
- `evcsms/api.py`
- `evcsms/ocpp_ws.py`
- `evcsms/app/**`
- `evcsms/docker-compose.yml`
- `evcsms/docker/**`
- `evcsms/requirements.txt`
- `evcsms/run.sh` (only if intentionally changed)
- `Manuals/**` (documentation)

## Keep server-local (do not overwrite blindly)
Treat these as runtime state/secrets:
- `evcsms/.env` (secrets)
- `evcsms/data/**` (runtime data)
- `evcsms/config/**` (active config, if production-specific)

Note: `evcsms/config/**` exists in repository and is also mounted in runtime. If production values differ from repo defaults, always back it up and verify after pull.

---

## 3) Pre-deployment checklist (local machine)
- [ ] Local changes reviewed and tested
- [ ] Commit created
- [ ] Pushed to GitHub under account `BessTech-prod`
- [ ] Release tag created (recommended)
- [ ] Planned maintenance window if production

Local commands:

```bash
cd /home/hugo/PycharmProjects/ocpp_prod-main/ocpp_projekt_rollback1.1
git status
git add evcsms/ Manuals/
git commit -m "Release: describe change"
git push origin main
```

Recommended tag per deployment:

```bash
git tag -a v2026.03.19-besstech-prod-update -m "BessTech-prod AWS deployment"
git push origin v2026.03.19-besstech-prod-update
```

---

## 4) AWS deployment steps (safe path)

### Step 1: Connect and enter repo

```bash
ssh -i /path/to/key.pem ec2-user@YOUR_AWS_IP
cd /path/to/evcsms
```

### Step 2: Backup before any pull

```bash
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/backups/evcsms-$TS"
mkdir -p "$BACKUP_DIR"

cp -a data "$BACKUP_DIR/"
cp -a config "$BACKUP_DIR/"
cp -a docker-compose.yml "$BACKUP_DIR/"
[ -f .env ] && cp -a .env "$BACKUP_DIR/"

# capture runtime state

docker compose -f docker-compose.yml ps > "$BACKUP_DIR/compose-ps.txt"
docker compose -f docker-compose.yml images > "$BACKUP_DIR/compose-images.txt"
```

### Step 3: Pull from GitHub (fast-forward only)
Deploy from `main`:

```bash
git fetch --all --tags
git checkout main
git pull --ff-only origin main
```

Or deploy by tag (preferred for production):

```bash
git fetch --all --tags
git checkout v2026.03.19-besstech-prod-update
```

### Step 4: Rebuild only impacted services
Use this mapping:
- UI-only changes (`evcsms/web/**`, `evcsms/docker/Dockerfile.ui`) -> rebuild `ui-service`
- API changes (`evcsms/api.py`, `evcsms/app/**`, `evcsms/requirements.txt`, `evcsms/docker/Dockerfile.api`) -> rebuild `api-service`
- OCPP changes (`evcsms/ocpp_ws.py`, `evcsms/app/**`, `evcsms/requirements.txt`, `evcsms/docker/Dockerfile.ocpp_ws`) -> rebuild `ocpp-ws-service`
- Compose changes (`evcsms/docker-compose.yml`) -> run full `up -d` with compose file

UI-only example:

```bash
docker compose -f docker-compose.yml up -d --no-deps --build ui-service
```

API + UI example:

```bash
docker compose -f docker-compose.yml up -d --no-deps --build api-service
docker compose -f docker-compose.yml up -d --no-deps --build ui-service
```

API + OCPP + UI (when `app/**` or `requirements.txt` changed):

```bash
docker compose -f docker-compose.yml up -d --no-deps --build api-service

docker compose -f docker-compose.yml up -d --no-deps --build ocpp-ws-service

docker compose -f docker-compose.yml up -d --no-deps --build ui-service
```

Full refresh (heavier):

```bash
docker compose -f docker-compose.yml up -d --build
```

---

## 5) Verification after deployment

### Container checks

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail=200 ui-service
docker compose -f docker-compose.yml logs --tail=200 api-service
docker compose -f docker-compose.yml logs --tail=200 ocpp-ws-service
```

### Host-level endpoint checks

```bash
curl -f http://localhost/
curl -f http://localhost:8000/health
```

### Public endpoint checks

```bash
curl -I https://YOUR_DOMAIN/
curl -I https://YOUR_DOMAIN/ui/login.html
```

### Browser checks
- Login works
- Dashboard opens by role
- Live ops page loads without API 404/401 regressions
- Recent UI changes are visible (hard refresh if needed)

---

## 6) File-specific guidance for the recent UI changes
Recent changes were in:
- `evcsms/web/my.html`
- `evcsms/web/org/my.html`
- `evcsms/web/user/my.html`
- `evcsms/web/org/index.html`
- `evcsms/web/assets/org_my.js`
- `evcsms/web/assets/user_my.js`

For this release, rebuild only `ui-service`:

```bash
docker compose -f docker-compose.yml up -d --no-deps --build ui-service
```

No API/OCPP/Redis rebuild is required for these files.

---

## 7) Rollback procedure

### Roll back code to known-good tag/commit

```bash
git log --oneline -n 20
git checkout <KNOWN_GOOD_TAG_OR_COMMIT>
```

Then rebuild impacted service(s), for example UI:

```bash
docker compose -f docker-compose.yml up -d --no-deps --build ui-service
```

If unsure, rebuild full stack:

```bash
docker compose -f docker-compose.yml up -d --build
```

### Optional rollback of runtime files

```bash
cp -a "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/data" ./
cp -a "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/config" ./
[ -f "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/.env" ] && cp -a "$HOME/backups/evcsms-YYYYMMDD-HHMMSS/.env" ./
```

---

## 8) Do-not-break rules (recommended standard)
1. Always backup before `git pull`.
2. Use `git pull --ff-only` on server.
3. Deploy by tag for production releases.
4. Rebuild only needed services first.
5. Keep `.env` out of Git and do not replace it unintentionally.
6. Keep deployment notes (who/when/what/verification/rollback target).

---

## 9) Example deployment note template
Create a `RELEASE_NOTES.md` entry per rollout:

- Release tag/commit:
- Date/time:
- Operator:
- Services rebuilt:
- Verification results:
- Rollback target:
- Known follow-ups:

