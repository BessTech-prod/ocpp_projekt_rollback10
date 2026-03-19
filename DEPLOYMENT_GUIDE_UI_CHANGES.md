# Deployment Guide: UI Changes to AWS Multi-Docker Solution

**Last Updated:** 2026-03-19  
**Author:** GitHub Copilot Assistant  
**Version:** 1.0  
**Status:** Production Ready

---

## 📋 Quick Overview

This guide walks you through deploying recent **frontend UI changes** (HTML, CSS, JavaScript) to your running multi-Docker environment on AWS **without breaking** the API, OCPP WebSocket, or Redis services.

### What Changed in This Update?
- ✅ Renamed "Dashboard" to "Överblick" throughout the UI
- ✅ Renamed card labels from English to Swedish (Ledig, Laddar, Ur drift)
- ✅ Added "Redigera" (Edit) buttons to user management pages
- ✅ Added edit functionality to charger assignment (cps.html)
- ✅ Improved navbar brand text display
- ✅ Removed unwanted status badges from legend
- ✅ Reordered status cards
- ✅ Fixed dashboard headings to show organization name

### Why Only Rebuild `ui-service`?
Your changes are **frontend only** (HTML, CSS, JavaScript files). The Python API (`api.py`, `ocpp_ws.py`) and configuration files are untouched, so:
- ✅ No need to rebuild `api-service` or `ocpp-ws-service`
- ✅ Redis data and persistent volumes stay intact
- ✅ Deployment takes **<2 minutes** instead of 10+
- ✅ Minimal downtime (ui-service only, other services keep running)

---

## 🔒 Pre-Deployment: Backup & Safety

### Step 1: SSH into Your AWS Instance

```bash
ssh -i /path/to/your-key.pem ec2-user@your-aws-instance-ip
```

If you don't have the key, contact your AWS administrator.

### Step 2: Navigate to Your Project Directory

```bash
cd /home/ec2-user/projects1/ocpp_prod
```

Expected structure:
```
/home/ec2-user/projects1/ocpp_prod/
├── .git/
├── .gitignore
├── ReadMe.txt
├── Manuals/
├── ocpp_projekt_rollback6/
│   └── evcsms/
│       ├── docker-compose.yml
│       ├── api.py
│       ├── ocpp_ws.py
│       ├── web/          ← Frontend files (HTML, CSS, JS)
│       └── config/       ← User/org configs
└── ocpp_projekt_rollback10/  ← (May exist, ignore for now)
```

### Step 3: Create a Timestamped Backup

Create a safety backup **before** pulling any changes:

```bash
# Set a timestamp for the backup
BACKUP_TIME=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/backups/ocpp-prod-$BACKUP_TIME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup the entire project
cp -r /home/ec2-user/projects1/ocpp_prod "$BACKUP_DIR/ocpp_prod"

# Backup docker-compose state (for reference)
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
docker-compose ps > "$BACKUP_DIR/docker-compose-state-before.txt"
docker inspect ui-service > "$BACKUP_DIR/ui-service-inspect.json"

echo "✅ Backup created at: $BACKUP_DIR"
```

**Save this path!** If anything breaks, you can restore from here in seconds.

### Step 4: Document Current State

Run these commands to record your baseline:

```bash
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms

# Log the current git commit
git log --oneline -1 > /tmp/git-before.txt

# Log running containers
docker-compose ps > /tmp/containers-before.txt

# Log recent logs (for debugging if needed)
docker-compose logs --tail=100 ui-service > /tmp/ui-logs-before.txt

echo "✅ Baseline documented in /tmp/"
```

---

## 📥 Step 1: Pull Latest Changes from GitHub

### 1A. Fetch the Latest Code from GitHub

```bash
cd /home/ec2-user/projects1/ocpp_prod

# Fetch all updates from GitHub (doesn't modify local files yet)
git fetch origin main

# Check what's different
git log --oneline -1
git diff HEAD origin/main --stat | head -20
```

This shows you which files changed. You should see **frontend files** (HTML, CSS, JS), **NOT** Python files.

### 1B: Resolve Any Local Conflicts (if applicable)

If you modified files locally on AWS that also changed in GitHub, you may have conflicts:

```bash
# Check status
git status

# If conflicts exist, resolve them:
# Option 1: Use remote version (recommended for frontend)
git checkout --theirs .

# Option 2: Use local version (only if you made intentional changes)
git checkout --ours .

# Then mark as resolved
git add .
git commit -m "Merge latest from GitHub"
```

### 1C: Pull and Reset to Latest Commit

```bash
# Pull the latest
git pull origin main

# Verify you're on the latest commit
git log --oneline -1
```

You should see a commit message matching the GitHub history.

---

## 🔨 Step 2: Rebuild the UI Service

### 2A: Navigate to the Application Directory

```bash
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
```

### 2B: Verify the Docker Compose File Exists

```bash
ls -la docker-compose.yml
```

You should see output like:
```
-rw-r--r-- 1 ec2-user ec2-user 2150 Mar 19 10:20 docker-compose.yml
```

### 2C: Rebuild Only the UI Service

```bash
# Stop and rebuild ui-service ONLY
# The --no-deps flag ensures we don't touch other services
docker-compose up -d --no-deps --build ui-service

# Expected output:
# Building ui-service
# Step 1/4 : FROM nginx:alpine
# ...
# Successfully built a1b2c3d4
# Successfully tagged evcsms_ui-service:latest
# Creating ui-service ... done
```

**This step takes ~30-60 seconds.** The API and OCPP-WS services keep running—**no downtime for those services.**

### 2D: Verify the Build Succeeded

```bash
docker-compose ps
```

Expected output (ui-service should show "Up"):
```
NAME            STATUS           PORTS
ui-service      Up 5 seconds     0.0.0.0:80->80/tcp
api-service     Up 7 hours       0.0.0.0:8000->8000/tcp
ocpp-ws-service Up 7 hours       0.0.0.0:9000->9000/tcp
redis-service   Up 16 hours      0.0.0.0:6379->6379/tcp
```

If `ui-service` shows "Restarting" or "Exit", go to **Troubleshooting** below.

---

## ✅ Step 3: Verify the Deployment

### 3A: Check Container Logs for Errors

```bash
# View the last 50 lines of logs
docker-compose logs --tail=50 ui-service

# Expected (no errors):
# 2026-03-19 10:25:00 [info] 123#123: ... started
# /docker-entrypoint.sh: Configuration complete; ready for start up
# 2026-03-19T10:25:00.000000Z 1#1 notice: ...
```

If you see **errors** (e.g., "failed to load config"), scroll to **Troubleshooting**.

### 3B: Test HTTP Connectivity

```bash
# Test localhost (from the EC2 instance)
curl -I http://localhost/

# Expected response:
# HTTP/1.1 200 OK
# Server: nginx
```

If you get **Connection refused** or **404**, nginx didn't start properly → see **Troubleshooting**.

### 3C: Test HTTPS from Your Browser

Open your browser and navigate to:
```
https://takoramacharge.se
```

(Or your actual domain name.)

**Verify:**
- ✅ Login page loads
- ✅ No "Connection Refused" or "ERR_ADDRESS_UNREACHABLE" errors
- ✅ CSS is styling the page (not plain HTML)
- ✅ JavaScript console shows no 404 errors for `.js` files

**To check the console:**
- Press `F12` (or `Cmd+Option+I` on Mac)
- Click **Console** tab
- Look for red errors like `Failed to load resource: /assets/nav.js (404)`

### 3D: Test Login Functionality

1. Open **Developer Tools** (`F12`)
2. Click **Network** tab
3. Attempt to log in with a test account:
   - **Email:** `admin@takorama.se`
   - **Password:** `sliceorama` (or your test password)
4. Watch the network requests:
   - Should see `POST /api/auth/login` return `200` or `401`
   - Then redirect to dashboard (`/ui/portal/index.html` or similar)

### 3E: Test the New Features

**Test the Edit Buttons:**
1. Log in as `org_admin` or `portal_admin`
2. Go to **Användare** (Users)
3. Click the blue **Redigera** (Edit) button on any user
4. Form should populate with user data
5. Change the organization in the dropdown
6. Click **Uppdatera** (Update)
7. Toast message should say "uppdaterad" (updated)

**Test the Charger Edit Feature (Portal):**
1. Go to **Laddare** (Chargers)
2. Click the blue **Redigera** button next to any charger
3. Form should populate
4. Change the organization dropdown
5. Click **Uppdatera**
6. Toast should confirm

**Test the New Swedish Labels:**
- Go to **Överblick** (any dashboard)
- Verify status cards show: **Ledig**, **Laddar**, **Ur drift** (not old names)
- Verify legend at bottom matches

---

## 📊 Step 4: Monitor & Validate Post-Deployment

### 4A: Check API Health (Ensure Other Services Still Work)

```bash
# Test API service
curl -I http://localhost:8000/health

# Expected:
# HTTP/1.1 200 OK
```

If **API is unhealthy**, it's unrelated to your frontend changes. Check `docker-compose logs api-service` to debug.

### 4B: Check Redis Connection

```bash
# Test redis
docker-compose exec redis-service redis-cli ping

# Expected response:
# PONG
```

### 4C: Full Health Check Script

Run this to verify everything is healthy:

```bash
#!/bin/bash
echo "🔍 Checking Docker services..."
docker-compose ps

echo ""
echo "🌐 Testing HTTP..."
curl -I http://localhost/ 2>&1 | head -3

echo ""
echo "🔌 Testing API..."
curl -I http://localhost:8000/health 2>&1 | head -3

echo ""
echo "📡 Testing OCPP-WS..."
curl -I http://localhost:9000/health 2>&1 | head -3

echo ""
echo "✅ All services checked"
```

Save this as `health-check.sh`, make it executable, and run:

```bash
chmod +x health-check.sh
./health-check.sh
```

---

## 🔄 Step 5: Optional - Update AWS Load Balancer (If Using ALB)

If you're using an AWS **Application Load Balancer** (ALB) or **Network Load Balancer** (NLB):

1. **Go to AWS Console** → **EC2** → **Load Balancers**
2. Find your load balancer (usually named something like `takorama-alb`)
3. Verify **Target Group** health:
   - Targets should show **Healthy** (green)
   - Targets should include your EC2 instance
4. Test HTTPS endpoint from your browser again

If targets show **Unhealthy**, check:
```bash
docker-compose logs nginx-proxy | tail -50
```

---

## 📝 Step 6: Document the Deployment

Create a deployment record for your team:

```bash
cat << 'EOF' > /tmp/deployment-record.txt
=== UI DEPLOYMENT RECORD ===
Date: $(date)
Deployed By: <your-name>
Commit: $(git log --oneline -1)
Services Rebuilt: ui-service only
Backup Location: $BACKUP_DIR
Time to Deploy: ~2 minutes
Verification Status: PASSED ✅

Changes Deployed:
- Renamed Dashboard → Överblick
- Added edit buttons to user and charger pages
- Renamed status cards to Swedish (Ledig, Laddar, Ur drift)
- Updated legend badges
- Fixed navbar display

Rollback Command (if needed):
  git checkout <PREVIOUS-COMMIT-HASH>
  docker-compose up -d --no-deps --build ui-service

Next Steps:
- Monitor application for 24 hours
- Check error logs daily
- Gather user feedback
EOF

cat /tmp/deployment-record.txt
```

---

## 🆘 Troubleshooting

### Issue: `ui-service` shows "Restarting" or "Exited"

**Symptom:** `docker-compose ps` shows ui-service in red.

**Solution:**
```bash
# Check the logs
docker-compose logs ui-service --tail=100

# Look for errors like:
# - "COPY failed: file not found"
# - "permission denied"
# - "invalid syntax"

# If it's a Docker build error, rebuild with output:
docker-compose up -d --no-deps --build ui-service --no-cache

# If still broken, restore from backup:
cp -r $BACKUP_DIR/ocpp_prod/* /home/ec2-user/projects1/ocpp_prod/
docker-compose down
docker-compose up -d
```

### Issue: Browser Shows "ERR_ADDRESS_UNREACHABLE"

**Symptom:** Can't reach `https://takoramacharge.se` from browser, but `curl http://localhost/` works.

**Possible Causes:**
1. **AWS Security Group:** Port 443 (HTTPS) not open
   - Go to AWS Console → EC2 → Security Groups
   - Check inbound rules allow **HTTPS (443)** from **0.0.0.0/0** or your IP
   
2. **nginx-proxy container crashed:**
   ```bash
   docker-compose logs nginx-proxy --tail=50
   # Check for errors about SSL certificates or port 80/443 conflicts
   ```

3. **DNS not updated:**
   - Run `nslookup takoramacharge.se` on your local machine
   - Should return your AWS instance's IP address
   - If not, wait 24 hours for DNS propagation, or update your DNS provider

### Issue: CSS/JavaScript Assets Return 404

**Symptom:** Browser console shows `Failed to load resource: /assets/nav.js (404)`

**Solution:**
```bash
# Verify files were copied into the Docker image
docker-compose exec ui-service ls -la /usr/share/nginx/html/assets/ | head

# Expected: should list all .js and .css files

# If files missing, Dockerfile.ui didn't copy them
# Check: cat docker-compose.yml | grep -A 10 "ui-service"

# If COPY line looks wrong, edit docker/Dockerfile.ui:
cat docker/Dockerfile.ui | grep COPY

# Should show: COPY web /usr/share/nginx/html
# If it says something else, that's the problem
```

### Issue: Login Fails with "401 Unauthorized"

**Symptom:** Enter correct credentials but get "Unauthorized" error or blank screen.

**Root Cause:** Usually **NOT** a UI issue—it's the API.

**Debug:**
```bash
# Check API logs
docker-compose logs api-service --tail=100 | grep -i error

# Check if users.json exists
docker-compose exec api-service ls -la /data/config/users.json

# If file missing:
docker-compose exec api-service python -c "from pathlib import Path; Path('/data/config/users.json').write_text('{}')"

# Restart API
docker-compose restart api-service
```

### Issue: After Deploy, Old CSS/JS Still Shows

**Symptom:** Changes deployed but browser shows old styles/behavior.

**Solution:**
1. **Hard refresh in browser:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache:**
   - Chrome: DevTools → Application → Storage → Clear Site Data
3. **Check version in console:**
   ```bash
   curl http://localhost/assets/style.css | head -1
   # Should show timestamp or version of the new file
   ```

---

## 🔙 Rollback (If Something Goes Wrong)

If the deployment breaks your application, **rollback in < 2 minutes:**

### Option 1: Revert to Previous Git Commit

```bash
cd /home/ec2-user/projects1/ocpp_prod

# List recent commits
git log --oneline -5

# Checkout the previous working commit
git checkout <PREVIOUS-COMMIT-HASH>

# Rebuild ui-service
cd ocpp_projekt_rollback6/evcsms
docker-compose up -d --no-deps --build ui-service

# Verify
docker-compose ps
```

### Option 2: Restore from Backup

```bash
# Stop services
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
docker-compose down

# Restore files from backup
rm -rf /home/ec2-user/projects1/ocpp_prod
cp -r $BACKUP_DIR/ocpp_prod /home/ec2-user/projects1/

# Restart
cd /home/ec2-user/projects1/ocpp_prod/ocpp_projekt_rollback6/evcsms
docker-compose up -d

# Verify
docker-compose ps
```

Both options take **< 2 minutes**. Users won't lose data—only API/OCPP services are temporarily down during rollback.

---

## 📋 Deployment Checklist

Use this checklist before, during, and after deployment:

```
PRE-DEPLOYMENT
☐ SSH into AWS instance
☐ Navigate to /home/ec2-user/projects1/ocpp_prod
☐ Create timestamped backup
☐ Document current state (git, docker-compose ps)

CODE SYNC
☐ git fetch origin main
☐ Review changes (git diff --stat)
☐ Resolve any conflicts
☐ git pull origin main

REBUILD
☐ cd ocpp_projekt_rollback6/evcsms
☐ docker-compose up -d --no-deps --build ui-service
☐ Monitor rebuild progress (should complete in <1 min)

VERIFICATION
☐ docker-compose ps (ui-service should be "Up")
☐ curl -I http://localhost/ (should return 200 OK)
☐ curl -I http://localhost:8000/health (API still healthy)
☐ Test HTTPS in browser (takoramacharge.se loads)
☐ Test login with test account
☐ Test new edit buttons (users & chargers)
☐ Test new Swedish labels (status cards)
☐ Check console for 404 errors (F12)

POST-DEPLOYMENT
☐ Document deployment record
☐ Notify team of changes
☐ Monitor logs for 1 hour
☐ Ask users for feedback
☐ Archive backup (keep for 7+ days)
```

---

## 💡 Tips & Best Practices

1. **Deploy Outside Business Hours:** If possible, deploy in the evening or weekend to minimize user impact.

2. **Monitor Logs:** After deployment, keep a terminal open watching logs:
   ```bash
   docker-compose logs -f ui-service
   ```
   Press `Ctrl+C` to exit.

3. **Version Your Deployments:** Tag each deploy in Git:
   ```bash
   git tag -a v1.0-ui-update-2026-03-19 -m "Add edit buttons, Swedish labels"
   git push origin v1.0-ui-update-2026-03-19
   ```

4. **Keep Backups:** Don't delete backups immediately. Keep them for at least 7 days in case you need to debug historical issues.

5. **Document Everything:** Your future self will thank you. Record what changed, when, why, and how to rollback.

6. **Test in Staging First:** If possible, test these changes on a non-production server before deploying to production.

---

## 📞 Getting Help

If you get stuck:

1. **Check logs:** `docker-compose logs <service-name> --tail=100`
2. **Verify file permissions:** `ls -la web/` and `ls -la config/`
3. **Check network:** `curl -I http://localhost/` and `curl -I http://localhost:8000/health`
4. **Review this guide:** Use Ctrl+F to search for your symptom
5. **Restore from backup:** If all else fails, you have a backup ready to go

---

## 📄 Summary

You've successfully deployed frontend UI changes to your AWS multi-Docker environment! 

**What was rebuilt:** `ui-service` only  
**What stayed running:** `api-service`, `ocpp-ws-service`, `redis-service` (zero downtime for backend)  
**Time to deploy:** ~2 minutes  
**Downtime:** ~30 seconds (while nginx restarts)  
**Data loss risk:** ZERO (all persistent volumes preserved)  

Congratulations! 🎉

---

**Last Updated:** 2026-03-19  
**Next Review Date:** 2026-03-26  
**Contact:** Your DevOps/Admin Team

