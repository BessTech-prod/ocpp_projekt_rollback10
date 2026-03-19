# Quick Deployment Checklist - UI Changes to AWS

**TL;DR Version** — Follow these 5 steps to deploy UI changes in ~5 minutes:

---

## 1️⃣ BACKUP (1 minute)

```bash
# SSH into AWS
ssh -i /path/to/key.pem ec2-user@your-instance-ip

# Create backup
BACKUP_DIR="$HOME/backups/ocpp-prod-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /home/ec2-user/projects1/ocpp_prod "$BACKUP_DIR/"

echo "✅ Backup saved to: $BACKUP_DIR"
```

---

## 2️⃣ PULL CODE FROM GITHUB (1 minute)

```bash
cd /home/ec2-user/projects1/ocpp_prod

# Fetch latest
git fetch origin main

# Check what changed (should see only HTML, CSS, JS files)
git diff HEAD origin/main --stat | head -20

# Pull the changes
git pull origin main

# Verify
git log --oneline -1
```

---

## 3️⃣ REBUILD UI SERVICE (1-2 minutes)

```bash
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms

# Rebuild ONLY the UI service (other services keep running)
docker-compose up -d --no-deps --build ui-service

# Expected output:
# Successfully built [hash]
# Successfully tagged evcsms_ui-service:latest
# Creating ui-service ... done
```

---

## 4️⃣ VERIFY (1 minute)

```bash
# Check all containers
docker-compose ps

# Test HTTP
curl -I http://localhost/

# Expected: HTTP/1.1 200 OK

# Check logs for errors
docker-compose logs --tail=50 ui-service
```

---

## 5️⃣ TEST IN BROWSER (1 minute)

1. Open: `https://takoramacharge.se`
2. Log in with test account
3. Click **Användare** → Click **Redigera** button → Verify it works
4. Go to **Överblick** → Verify status cards show **Ledig, Laddar, Ur drift**
5. Check browser console (F12) for any 404 errors

---

## ✅ Done!

If everything looks good, you're done! The deployment is live.

**If something breaks:**
```bash
# Rollback in < 2 minutes
cd /home/ec2-user/projects1/ocpp_prod
git checkout <PREVIOUS-COMMIT-HASH>
cd ocpp_projekt_rollback6/evcsms
docker-compose up -d --no-deps --build ui-service
```

---

## 📖 Full Guide

For detailed troubleshooting, logs, and best practices, see:
`DEPLOYMENT_GUIDE_UI_CHANGES.md`

---

**Deployment Time:** ~5 minutes total  
**Downtime:** ~30 seconds (ui-service restart only)  
**Data Loss Risk:** ZERO  
**Rollback Time:** <2 minutes  

Good luck! 🚀

