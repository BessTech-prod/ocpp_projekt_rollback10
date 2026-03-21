# Operator Runbook: Patch Deploy (GitHub -> AWS)

Use this runbook for routine patch deployment to production.

## Scope
- Local code source: `ocpp_projekt_rollback1.1`
- GitHub target: `BessTech-prod/ocpp_projekt_rollback10`
- AWS active runtime: `/home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms`
- Compose CLI: `docker-compose`

---

## 1) Preflight (Go/No-Go)

### 1.1 Confirm local remote is correct
```bash
git remote -v
```
Expected:
- `origin git@github.com:BessTech-prod/ocpp_projekt_rollback10.git (fetch)`
- `origin git@github.com:BessTech-prod/ocpp_projekt_rollback10.git (push)`

If not:
```bash
git remote set-url origin git@github.com:BessTech-prod/ocpp_projekt_rollback10.git
```

### 1.2 Confirm GitHub SSH auth
```bash
ssh -T git@github.com
```
Expected: `Hi BessTech-prod! You've successfully authenticated...`

### 1.3 Confirm AWS target host reachable
```bash
ssh -i /path/to/key.pem ec2-user@<aws-host>
```

---

## 2) Local Release Step (Push Patch)

```bash
cd /home/hugo/PycharmProjects/ocpp_prod-main/ocpp_projekt_rollback1.1
git status
git add .
git commit -m "Patch: <short summary>"
git push origin main
```

Optional release tag:
```bash
git tag -a v1.1.x -m "Patch v1.1.x"
git push origin v1.1.x
```

---

## 3) AWS Backup (Mandatory)

```bash
ssh -i /path/to/key.pem ec2-user@<aws-host>
cd /home/ec2-user/projects1/ocpp_prod

BACKUP_DIR="$HOME/backups/ocpp-prod-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /home/ec2-user/projects1/ocpp_prod "$BACKUP_DIR/ocpp_prod"

echo "Backup complete: $BACKUP_DIR"
```

Record this backup path in your deployment notes.

---

## 4) Pull Latest on AWS

```bash
cd /home/ec2-user/projects1/ocpp_prod
git fetch origin main
git pull --ff-only origin main
git log --oneline -1
```

---

## 5) Sync to Active Runtime Folder (Critical)

Active `ui-service` build context is under `rollback6`. Sync pulled files into that runtime path before rebuilding.

### 5.1 UI patches (HTML/CSS/JS)
```bash
rsync -av --delete /home/ec2-user/projects1/ocpp_prod/evcsms/web/ /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms/web/
rsync -av /home/ec2-user/projects1/ocpp_prod/evcsms/docker/ /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms/docker/
```

### 5.2 Backend patches (only if changed)
```bash
rsync -av /home/ec2-user/projects1/ocpp_prod/evcsms/api.py /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms/
rsync -av /home/ec2-user/projects1/ocpp_prod/evcsms/ocpp_ws.py /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms/
rsync -av /home/ec2-user/projects1/ocpp_prod/evcsms/app/ /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms/app/
```

---

## 6) Rebuild/Restart Only Affected Services

```bash
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
```

### 6.1 UI-only patch
```bash
docker-compose build --no-cache ui-service
docker-compose up -d --no-deps --force-recreate ui-service
```

### 6.2 API patch
```bash
docker-compose up -d --no-deps --build api-service
```

### 6.3 OCPP WS patch
```bash
docker-compose up -d --no-deps --build ocpp-ws-service
```

---

## 7) Verification (Production Gate)

### 7.1 Container health
```bash
docker-compose ps
```

### 7.2 Logs
```bash
docker-compose logs --tail=50 ui-service
docker-compose logs --tail=50 api-service
docker-compose logs --tail=50 ocpp-ws-service
```

### 7.3 Endpoint checks
```bash
curl -I http://localhost/
curl -k -I -L https://localhost/
curl -I https://takoramacharge.se/
```

### 7.4 Content checks (example)
```bash
curl -s http://localhost/portal/index.html | grep -n "Ledig"
curl -s http://localhost/portal/index.html | grep -n "Ur drift"
```

### 7.5 Browser smoke tests
- Log in successfully.
- Verify updated labels/text are visible.
- Verify new features (e.g., `Redigera` flow) work.
- Verify no critical 404/500 in browser DevTools.

---

## 8) Go/No-Go Criteria

### Go (declare success) when all true:
- `docker-compose ps` shows services up.
- No critical errors in recent logs.
- Endpoint checks respond correctly.
- Browser smoke test passes.

### No-Go (rollback) when any true:
- UI/API service not stable.
- Patch behavior missing after rebuild.
- Login or critical flows broken.

---

## 9) Rollback Procedure

### 9.1 Quick rollback via Git commit
```bash
cd /home/ec2-user/projects1/ocpp_prod
git log --oneline -5
git checkout <previous_commit>

cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
docker-compose build --no-cache ui-service
docker-compose up -d --no-deps --force-recreate ui-service
```

### 9.2 Full restore from backup
```bash
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
docker-compose down
rm -rf /home/ec2-user/projects1/ocpp_prod
cp -r "$BACKUP_DIR/ocpp_prod" /home/ec2-user/projects1/ocpp_prod
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
docker-compose up -d
```

---

## 10) Operator Deployment Record (Fill Each Release)

- Date/Time:
- Operator:
- Git commit deployed:
- Backup path:
- Services rebuilt:
- Verification status (PASS/FAIL):
- Rollback needed (Y/N):
- Notes:

---

## Known Notes for This Environment
- `301 Moved Permanently` from `http://localhost` is expected due to HTTPS redirect.
- `orphan containers (nginx-proxy)` warning is informational unless you changed compose services.
- If UI changes do not appear, verify you synced into `ocpp_projekt_rollback6/evcsms` before rebuild.

