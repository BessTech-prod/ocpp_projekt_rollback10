# AWS EC2 Deployment - Quick Checklist
## Projects1 Directory Structure

---

## 📋 Pre-Deployment Checklist

### AWS Setup
- [ ] EC2 instance created (Amazon Linux 2)
- [ ] Instance type: t3.medium or larger
- [ ] Instance state: **running**
- [ ] Storage: 30 GB minimum allocated
- [ ] Public IPv4 address assigned
- [ ] Security group created with name: **ev-csms-sg**

### Security Group Configuration
- [ ] Port 22/TCP (SSH) - enabled
- [ ] Port 80/TCP (HTTP) - enabled  
- [ ] Port 8000/TCP (API) - enabled
- [ ] Port 9000/TCP (WebSocket) - enabled
- [ ] Source: appropriate (0.0.0.0/0 for public or specific IP)

### SSH Key Setup
- [ ] SSH key pair downloaded (.pem file)
- [ ] Key permissions set to 600: `chmod 600 key.pem`
- [ ] Key stored securely on local machine
- [ ] Key backup created in secure location

### GitHub Setup
- [ ] GitHub account accessible
- [ ] SSH key pair generated (if using SSH cloning)
- [ ] Public key added to GitHub (Settings → SSH Keys)
- [ ] SSH connection tested: `ssh -T git@github.com`
- [ ] Repository access confirmed

### Local Machine Preparation
- [ ] SSH client available (OpenSSH or PuTTY)
- [ ] Terminal/Command line access ready
- [ ] Internet connectivity stable

---

## 🚀 Deployment Sequence

### Phase 1: Initial Connection & System Setup (5 minutes)

**On Local Machine:**
```bash
# Connect to EC2 instance
ssh -i /path/to/ev-csms-key.pem ec2-user@<your-public-ip>
```

**On EC2 Instance (after SSH login):**
```bash
# Update system
sudo yum update -y

# Install essentials
sudo yum install -y curl wget git htop net-tools unzip nano gcc make
```

**Verification:**
- [ ] Connected to EC2 successfully
- [ ] No errors during system update
- [ ] Essential tools installed

---

### Phase 2: Docker Installation (5 minutes)

**On EC2 Instance:**

```bash
# Install Docker
sudo amazon-linux-extras install -y docker

# Verify
docker --version
```

**Enable Docker:**
```bash
# Start service
sudo systemctl start docker

# Enable on boot
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

**Verification:**
- [ ] Docker installed (version 20+)
- [ ] Docker daemon running
- [ ] Docker group access works without sudo
- [ ] Docker compose available

---

### Phase 3: Firewall Configuration (3 minutes)

**On EC2 Instance:**

```bash
# Start firewall
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Add ports
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp

# Reload
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

**Verification:**
- [ ] Firewall running
- [ ] All 4 ports listed in output
- [ ] Rules marked as permanent

---

### Phase 4: Repository Clone & Setup (5 minutes)

**On EC2 Instance:**

```bash
# Create project directory
mkdir -p ~/projects1
cd ~/projects1

# Clone repository (SSH method)
git clone git@github.com:YOUR_USERNAME/ocpp_projekt_rollback6.git

# Navigate to service
cd ocpp_projekt_rollback6/evcsms

# Verify structure
ls -la
```

**Expected output:**
```
Dockerfile
docker-compose.yml
requirements.txt
app/
config/
data/
web/
docker/
...
```

**Verification:**
- [ ] Repository cloned successfully
- [ ] Project structure intact
- [ ] All subdirectories present

---

### Phase 5: Environment Configuration (3 minutes)

**On EC2 Instance (in ~/projects1/ocpp_projekt_rollback6/evcsms):**

```bash
# Generate secure passwords
APP_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Create .env file
cat > .env << EOF
REDIS_PASSWORD=${REDIS_PASSWORD}
APP_SECRET=${APP_SECRET}
ADMIN_BOOTSTRAP_EMAIL=admin@yourdomain.com
ADMIN_BOOTSTRAP_PASSWORD=ChangeMe123!
TZ=Europe/Stockholm
EOF

# Verify
cat .env

# Backup credentials
echo "APP_SECRET=${APP_SECRET}" > ~/credentials-backup.txt
echo "REDIS_PASSWORD=${REDIS_PASSWORD}" >> ~/credentials-backup.txt
chmod 600 ~/credentials-backup.txt
```

**Verification:**
- [ ] .env file created
- [ ] All 5 variables populated
- [ ] Credentials saved as backup
- [ ] File permissions correct (600)

---

### Phase 6: Docker Image Build (10-15 minutes)

**On EC2 Instance (in ~/projects1/ocpp_projekt_rollback6/evcsms):**

```bash
# Build images
docker compose build --no-cache

# Watch for successful completion of each service:
# Building redis-service...
# Building ocpp-ws-service...
# Building api-service...
# Building ui-service...
```

**Verification:**
- [ ] Build completes without errors
- [ ] All 4 images built successfully
- [ ] No Docker build errors in output

---

### Phase 7: Service Deployment (2 minutes)

**On EC2 Instance:**

```bash
# Start all services
docker compose up -d

# Check services
docker compose ps

# Expected output (all should show "Up"):
# NAME                 STATUS
# redis-service        Up X minutes (healthy)
# ocpp-ws-service      Up X minutes (healthy)
# api-service          Up X minutes (healthy)
# ui-service           Up X minutes (healthy)
```

**Verification:**
- [ ] All 4 containers in "Up" state
- [ ] All containers show "healthy"
- [ ] No error messages

---

### Phase 8: Service Verification (5 minutes)

**On EC2 Instance:**

```bash
# Check port listening
ss -tuln | grep -E "80|8000|9000|6379"

# Test services locally
curl -s http://localhost/ | head -10
curl -s http://localhost:8000/docs | head -10

# Check logs
docker compose logs --tail 30
```

**From Local Machine:**

```bash
# Replace <your-ip> with EC2 public IP

# Test UI
curl http://<your-ip>/

# Test API
curl http://<your-ip>:8000/docs
```

**Verification:**
- [ ] All 4 ports listening
- [ ] Port 80 returns HTML content
- [ ] Port 8000 returns API documentation
- [ ] No critical errors in logs
- [ ] External access works from local machine

---

## 🌐 Access Points After Deployment

### Web Dashboard
```
URL: http://<your-ec2-public-ip>/
Login Email: admin@takorama.se (or configured in .env)
Login Password: sliceorama (or configured in .env)
```

### API Documentation
```
URL: http://<your-ec2-public-ip>:8000/docs
Method: Interactive Swagger UI
Access: Requires login credentials
```

### WebSocket Endpoint (Charge Points)
```
URL: ws://<your-ec2-public-ip>:9000/
Protocol: OCPP 1.6J
Connection Type: WebSocket
```

### Redis Server (Internal)
```
Host: localhost (from within containers)
Port: 6379
Password: From .env REDIS_PASSWORD
Access: Internal only (not exposed externally)
```

---

## 📂 Directory Structure After Deployment

```
/home/ec2-user/
├── projects1/
│   └── ocpp_projekt_rollback6/
│       ├── evcsms/
│       │   ├── .env                    (Environment variables - SECURE!)
│       │   ├── docker-compose.yml      (Service orchestration)
│       │   ├── Dockerfile              (Docker image)
│       │   ├── requirements.txt         (Python dependencies)
│       │   ├── api.py                  (API service)
│       │   ├── ocpp_ws.py              (WebSocket service)
│       │   ├── run.sh                  (Helper script)
│       │   ├── app/
│       │   │   ├── __init__.py
│       │   │   ├── main.py
│       │   │   └── auth_store.py
│       │   ├── config/
│       │   │   ├── auth_tags.json
│       │   │   ├── cps.json
│       │   │   ├── orgs.json
│       │   │   └── users.json
│       │   ├── data/
│       │   │   └── transactions.json   (Persistent data)
│       │   ├── web/
│       │   │   ├── *.html
│       │   │   └── assets/
│       │   └── docker/
│       │       ├── Dockerfile.api
│       │       ├── Dockerfile.ocpp_ws
│       │       └── Dockerfile.ui
│       └── [documentation files]
│
├── backups/                             (Backup directory - create manual)
│   └── ev-csms-backup_*.tar.gz
│
├── credentials-backup.txt              (Passwords - SECURE!)
├── backup-csms.sh                      (Backup script - create manual)
└── .ssh/
    └── id_ed25519                      (SSH key for GitHub - generated during setup)
```

---

## ⚠️ Critical Security Notes

### Passwords & Secrets
- [ ] Change `ADMIN_BOOTSTRAP_PASSWORD` immediately after first login
- [ ] Store `.env` file securely (contains `REDIS_PASSWORD` and `APP_SECRET`)
- [ ] Never commit `.env` to Git
- [ ] Backup credentials in secure location
- [ ] Rotate passwords every 90 days

### Access Control
- [ ] Restrict SSH access to known IPs (not 0.0.0.0/0 in production)
- [ ] Use SSH key-based authentication only (never password SSH)
- [ ] Disable root login
- [ ] Keep system packages updated: `sudo yum update -y`
- [ ] Monitor firewall logs: `sudo journalctl -u firewalld`

### Data Protection
- [ ] Enable automated backups (cron job)
- [ ] Test backup/restore monthly
- [ ] Store backups on separate storage (S3, EBS, or off-instance)
- [ ] Never run `docker compose down -v` (removes persistent data!)
- [ ] Use `docker compose down` to safely stop services

### Network Security
- [ ] Use HTTPS/TLS in production (setup SSL certificates)
- [ ] Implement API authentication/authorization
- [ ] Use VPC endpoints if applicable
- [ ] Monitor WebSocket connections for unauthorized access
- [ ] Implement rate limiting on API endpoints

---

## 🔧 Essential Commands Reference

### Service Management
```bash
cd ~/projects1/ocpp_projekt_rollback6/evcsms

# Start services
docker compose up -d

# Stop services (preserves data)
docker compose down

# Restart services
docker compose restart

# View logs
docker compose logs -f
```

### Monitoring
```bash
# Show running containers
docker ps

# Container resource usage
docker stats --no-stream

# System resources
df -h        # Disk usage
free -h      # Memory usage
top -b -n 1  # CPU usage
```

### Backup & Restore
```bash
# Create manual backup
tar -czf ~/backups/backup_$(date +%s).tar.gz \
  ~/projects1/ocpp_projekt_rollback6/evcsms/config \
  ~/projects1/ocpp_projekt_rollback6/evcsms/data \
  ~/projects1/ocpp_projekt_rollback6/evcsms/.env

# List backups
ls -lh ~/backups/

# Restore from backup
tar -xzf ~/backups/backup_TIMESTAMP.tar.gz
```

### Troubleshooting
```bash
# Check service logs
docker logs api-service
docker logs ocpp-ws-service
docker logs redis-service
docker logs ui-service

# Execute command in container
docker exec -it api-service bash

# Check Docker info
docker info

# Test connectivity
curl http://localhost:8000/docs
```

---

## 📊 Post-Deployment Tasks

### Immediate (within 1 hour)
- [ ] Test all 4 services are accessible
- [ ] Change default admin password
- [ ] Verify data persistence by accessing files in config/ and data/
- [ ] Test login functionality with new password
- [ ] Create first backup manually

### Short-term (first day)
- [ ] Configure charge point devices to connect to WebSocket
- [ ] Test transaction recording
- [ ] Review API endpoints using Swagger UI
- [ ] Test user creation and authentication
- [ ] Monitor logs for any issues

### Medium-term (first week)
- [ ] Setup automated backup schedule (cron job)
- [ ] Test backup/restore process
- [ ] Configure SSL/TLS certificate (if production)
- [ ] Setup monitoring and alerting
- [ ] Document any custom configurations
- [ ] Test system under load

### Long-term (ongoing)
- [ ] Monthly system updates: `sudo yum update -y`
- [ ] Quarterly password rotation
- [ ] Regular backup verification
- [ ] Log review and archival
- [ ] Capacity planning and scaling
- [ ] Disaster recovery drills

---

## 🆘 Quick Troubleshooting

### Services won't start
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Can't connect to services
```bash
# Check firewall
sudo firewall-cmd --list-all

# Check ports listening
ss -tuln | grep -E "80|8000|9000"

# Restart firewall
sudo systemctl restart firewalld
```

### Out of disk space
```bash
df -h
docker system prune -f
sudo yum clean all
```

### Permission errors
```bash
# Ensure docker group membership
groups $USER
# If docker not listed, logout and login again

# Ensure file permissions
ls -la ~/.env
chmod 600 ~/.env
```

### Redis connection fails
```bash
# Test Redis
docker exec redis-service redis-cli ping

# Check Redis logs
docker logs redis-service

# Verify Redis password in .env
cat .env | grep REDIS_PASSWORD
```

---

## 📞 Getting Help

### Documentation References
- **Full Manual:** Read `manual1.md` in project root
- **Quick Commands:** See `AMAZON_LINUX_QUICK_REFERENCE.md`
- **What Changed:** Review `MANUAL_UPDATE_CHANGELOG.md`
- **Architecture:** Check `evcsms/README.md`

### Key Files
```
/home/hugo/PycharmProjects/ocpp_prod-main/
├── COMMISSIONING_GUIDE_AWS_AL2.md         ← Full step-by-step guide
├── DEPLOYMENT_CHECKLIST_PROJECTS1.md      ← This file
├── ocpp_projekt_rollback6/
│   ├── manual1.md
│   ├── AMAZON_LINUX_QUICK_REFERENCE.md
│   ├── UPDATE_SUMMARY.md
│   └── evcsms/README.md
```

---

**Status:** ✅ Ready for Deployment  
**Document Version:** 1.0  
**Last Updated:** March 17, 2026  
**Target Platform:** AWS EC2 Amazon Linux 2  
**Deployment Location:** ~/projects1/ocpp_projekt_rollback6/evcsms/

