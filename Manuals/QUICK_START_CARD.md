# 🚀 EV CSMS - AWS Deployment Quick-Start Card
## 5-Minute Overview & Phase Timeline

---

## ⚡ 30-Second Summary

**What:** Deploy a microservices-based EV charging station management system  
**Where:** AWS EC2 running Amazon Linux 2  
**How:** Docker containers orchestrated with docker-compose  
**When:** 45-60 minutes from SSH connection to running system  
**Why:** OCPP 1.6J compliant, scalable, production-ready  

---

## 🎯 Complete Timeline

```
START → SSH Connect
  ↓ (2 min)
System Update & Dependencies
  ↓ (3 min)
Install Docker
  ↓ (5 min)
Configure Firewall
  ↓ (3 min)
Clone Repository & Setup .env
  ↓ (5 min)
Build Docker Images
  ↓ (10-15 min)
Deploy Services
  ↓ (2 min)
Verify & Test
  ↓ (5 min)
Ready for Use!

TOTAL: 45-60 minutes
```

---

## 🔑 Key Information

### Your AWS Details (Fill In)
```
EC2 Public IP:           ___________________
Security Group Name:     ev-csms-sg
SSH Key File:            ev-csms-key.pem
Default Region:          ___________________
Instance Type:           t3.medium (or larger)
```

### Your Project Details (Fill In)
```
Project Directory:       ~/projects1/ocpp_projekt_rollback6/
Service Directory:       ~/projects1/ocpp_projekt_rollback6/evcsms/
GitHub Username:         ___________________
GitHub Repo:             ocpp_projekt_rollback6
Admin Email:             ___________________
```

### Your Credentials (SAVE SECURELY!)
```
REDIS_PASSWORD:          ___________________
APP_SECRET:              ___________________
Admin Bootstrap Email:    admin@yourdomain.com
Admin Bootstrap Password: ___________________

⚠️  Store in: ~/credentials-backup.txt
⚠️  Backup to: Secure location
⚠️  Change after first login!
```

---

## 📍 4 Critical Services

```
┌─────────────────────────────────────────────────┐
│ SERVICE     │ PORT │ PURPOSE                     │
├─────────────────────────────────────────────────┤
│ UI Service  │  80  │ Web Dashboard               │
│ API Service │ 8000 │ REST API & Business Logic   │
│ OCPP WS     │ 9000 │ Charge Point Communication  │
│ Redis       │ 6379 │ Session & State Management  │
└─────────────────────────────────────────────────┘
```

---

## 🔓 Access After Deployment

```
Web Dashboard:
  http://<your-ec2-ip>/
  Login: admin@takorama.se / sliceorama

API Docs:
  http://<your-ec2-ip>:8000/docs
  
Charge Points Connect:
  ws://<your-ec2-ip>:9000/
```

---

## ✅ Phase Checklist (45-60 min total)

### Phase 1: Connection (2 min)
```bash
ssh -i ev-csms-key.pem ec2-user@<your-ip>
```
- [ ] Connected successfully
- [ ] Can view files with `ls`

### Phase 2: System Setup (5 min)
```bash
sudo yum update -y
sudo yum install -y curl wget git htop net-tools unzip nano
```
- [ ] No errors
- [ ] All tools installed

### Phase 3: Docker Install (5 min)
```bash
sudo amazon-linux-extras install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
docker --version
```
- [ ] Docker running
- [ ] Version shows (20+)

### Phase 4: Firewall (3 min)
```bash
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```
- [ ] All ports added
- [ ] Firewall running

### Phase 5: Repository & Config (5 min)
```bash
mkdir -p ~/projects1
cd ~/projects1

# ✏️ CHANGE THIS: Set your GitHub username here
GITHUB_USER="YOUR_USERNAME"

git clone git@github.com:${GITHUB_USER}/ocpp_projekt_rollback6.git
cd ocpp_projekt_rollback6/evcsms

# ✅ AUTO-GENERATED: REDIS_PASSWORD and APP_SECRET are created automatically
# ✏️ CHANGE THESE: Set your own email and admin password below
REDIS_PW=$(openssl rand -base64 24)
APP_SEC=$(openssl rand -base64 32)

cat > .env << EOF
REDIS_PASSWORD=${REDIS_PW}
APP_SECRET=${APP_SEC}
ADMIN_BOOTSTRAP_EMAIL=admin@yourdomain.com
ADMIN_BOOTSTRAP_PASSWORD=ChangeMe123!
TZ=Europe/Stockholm
EOF

# Save the generated passwords so you have them
echo "REDIS_PASSWORD=${REDIS_PW}" > ~/credentials-backup.txt
echo "APP_SECRET=${APP_SEC}" >> ~/credentials-backup.txt
chmod 600 ~/credentials-backup.txt

# Verify .env was created correctly
cat .env
```
- [ ] Repository cloned (YOUR_USERNAME replaced ✏️)
- [ ] .env file created
- [ ] REDIS_PASSWORD & APP_SECRET auto-generated ✅
- [ ] Passwords saved to ~/credentials-backup.txt
- [ ] ADMIN_BOOTSTRAP_EMAIL set to YOUR email ✏️
- [ ] ADMIN_BOOTSTRAP_PASSWORD set (change after first login!) ✏️

### Phase 6: Docker Build (10-15 min)
```bash
docker compose build --no-cache
```
- [ ] All 4 images built
- [ ] No build errors
- [ ] Completed successfully

### Phase 7: Deploy (2 min)
```bash
docker compose up -d
docker compose ps
```
- [ ] All 4 services "Up"
- [ ] All showing "healthy"

### Phase 8: Verify (5 min)
```bash
curl http://localhost/
curl http://localhost:8000/docs
ss -tuln | grep -E "80|8000|9000"
docker compose logs --tail 20
```
- [ ] UI returns HTML
- [ ] API returns docs
- [ ] All ports listening
- [ ] No critical errors

---

## ⚠️ Critical Security

### Before Deployment
- [ ] AWS Security Group has 4 ports (22, 80, 8000, 9000)
- [ ] SSH key permissions: 600
- [ ] Key location secure

### During Deployment
- [ ] Generate secure passwords with `openssl`
- [ ] Save credentials to backup
- [ ] Set `.env` permissions to 600: `chmod 600 .env`

### After Deployment
- [ ] Change default admin password
- [ ] Setup backup script
- [ ] Enable firewall monitoring
- [ ] Test backup/restore

---

## 🔧 Essential Commands You'll Need

```bash
# Check services
docker ps
docker compose ps

# View logs
docker compose logs -f
docker logs api-service

# Restart services
docker compose restart

# Stop (preserves data)
docker compose down

# Start
docker compose up -d

# Backup
tar -czf ~/backups/backup_$(date +%s).tar.gz \
  ~/projects1/ocpp_projekt_rollback6/evcsms/{config,data,.env}
```

---

## 🚨 Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| **Services won't start** | `docker compose build --no-cache && docker compose up -d` |
| **Can't access dashboard** | `sudo firewall-cmd --list-all` (check ports) |
| **Port already in use** | `ss -tuln \| grep PORT` (find PID) `kill -9 PID` |
| **Out of disk space** | `docker system prune -f` |
| **Redis connection fails** | `docker exec redis-service redis-cli ping` |

---

## 📚 Full Documentation Files

When you need detailed information, see:

```
COMMISSIONING_GUIDE_AWS_AL2.md
├─ Complete 14-phase deployment guide
└─ 400+ lines with detailed explanations

DEPLOYMENT_CHECKLIST_PROJECTS1.md
├─ Structured checklist format
└─ 300+ lines with verification steps

ARCHITECTURE_REFERENCE.md
├─ Technical architecture deep-dive
└─ 350+ lines of technical details

DOCUMENTATION_INDEX.md
├─ Guide to all documentation
└─ How to find what you need

ocpp_projekt_rollback6/manual1.md
├─ Complete technical manual
└─ 2,295 lines comprehensive reference

ocpp_projekt_rollback6/AMAZON_LINUX_QUICK_REFERENCE.md
├─ Quick copy-paste commands
└─ 429 lines of ready-to-use commands
```

---

## 🎯 Success Indicators

**Your deployment succeeded when:**

✅ `docker compose ps` shows all 4 services "Up (x min) (healthy)"  
✅ Web dashboard loads: http://<your-ip>/  
✅ Can login with admin credentials  
✅ API docs accessible: http://<your-ip>:8000/docs  
✅ WebSocket port listening: ss shows 0.0.0.0:9000  
✅ No critical errors: `docker compose logs` looks clean  
✅ Firewall active: `sudo firewall-cmd --state` shows "running"  
✅ Backup script created: `ls -la ~/backup-csms.sh`  

---

## 📞 Quick Reference

### Directories
```
Project:      ~/projects1/ocpp_projekt_rollback6/
Services:     ~/projects1/ocpp_projekt_rollback6/evcsms/
Config:       ~/projects1/ocpp_projekt_rollback6/evcsms/config/
Data:         ~/projects1/ocpp_projekt_rollback6/evcsms/data/
Backups:      ~/backups/
```

### Important Files
```
.env                      (Configuration - SECURE!)
docker-compose.yml        (Service definition)
credentials-backup.txt    (Password backup)
backup-csms.sh            (Backup script)
```

### URLs
```
Dashboard:    http://<your-ip>/
API Docs:     http://<your-ip>:8000/docs
WebSocket:    ws://<your-ip>:9000/
```

---

## 🎓 When Something Breaks

1. **Read the logs:** `docker compose logs --tail 50`
2. **Check ports:** `ss -tuln | grep -E "80|8000|9000"`
3. **Check firewall:** `sudo firewall-cmd --list-all`
4. **Check containers:** `docker compose ps`
5. **Rebuild:** `docker compose build --no-cache`
6. **Restart:** `docker compose down && docker compose up -d`
7. **See COMMISSIONING_GUIDE_AWS_AL2.md Phase 14** for detailed troubleshooting

---

## 📋 Quick Notes (Add Your Own)

```
AWS Public IP:    _________________________________
SSH Connection:   ssh -i key.pem ec2-user@<ip>
Date Deployed:    _________________________________
Admin Changed:    [ ] Yes  [ ] No
Backup Tested:    [ ] Yes  [ ] No
Notes:            _________________________________
                  _________________________________
                  _________________________________
```

---

## ✨ You're All Set!

This quick-start card has everything to guide you through deployment. For detailed information, refer to the full documentation files.

**Start with:** COMMISSIONING_GUIDE_AWS_AL2.md  
**Keep handy:** AMAZON_LINUX_QUICK_REFERENCE.md  
**Troubleshoot with:** ARCHITECTURE_REFERENCE.md  

---

**Status:** ✅ Ready to Deploy  
**Estimated Time:** 45-60 minutes  
**Complexity:** Intermediate  
**Support:** See DOCUMENTATION_INDEX.md  

🚀 **Begin deployment now!**

---

**Last Updated:** March 17, 2026  
**Version:** 1.0  
**Platform:** AWS EC2 Amazon Linux 2

