# EV CSMS AWS Deployment - Professional Commissioning Guide
## Amazon Linux 2 Edition

**Prepared for:** AWS EC2 Deployment  
**Target OS:** Amazon Linux 2 (AL2)  
**Date:** March 17, 2026  
**Deployment Approach:** SSH Git Clone → Docker Containerization

---

## 📋 Executive Summary

This guide walks you through deploying the **EV CSMS (Electric Vehicle Charge Station Management System)** on an AWS EC2 instance running Amazon Linux 2. The deployment consists of 4 containerized microservices orchestrated via Docker Compose.

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│         AWS EC2 Amazon Linux 2 Instance             │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │   UI     │  │   API    │  │ OCPP WS  │          │
│  │ Port 80  │  │Port 8000 │  │Port 9000 │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       └──────────────┼──────────────┘                │
│                      │                               │
│              ┌───────▼────────┐                      │
│              │    Redis       │                      │
│              │   Port 6379    │                      │
│              └────────────────┘                      │
└─────────────────────────────────────────────────────┘
```

### Services Overview

| Service | Port | Purpose | Technology |
|---------|------|---------|-----------|
| **UI Service** | 80 | Web Dashboard | HTML/CSS/JavaScript |
| **API Service** | 8000 | REST API & Business Logic | FastAPI (Python) |
| **OCPP Service** | 9000 | Charge Point Communication | WebSocket (Python) |
| **Redis** | 6379 | Session & State Management | Redis 7 Alpine |

---

## 📌 Prerequisites

### Before You Start

✅ **You have:**
- AWS EC2 instance (Amazon Linux 2) already running
- SSH key pair (.pem file) with proper permissions (chmod 600)
- SSH access to the instance
- GitHub account with SSH key pair configured (for git clone via SSH)
- Network access to ports: 22 (SSH), 80 (HTTP), 8000 (API), 9000 (WebSocket)

✅ **Instance Requirements:**
- **AMI:** Amazon Linux 2
- **Instance Type:** t3.medium minimum (t3.large recommended for production)
- **vCPU:** 2 cores
- **Memory:** 4 GB minimum (8 GB recommended)
- **Storage:** 30 GB minimum (100 GB recommended)
- **Disk Type:** gp3 SSD

✅ **Security Group Rules:**
```
Port 22   (TCP) - SSH access
Port 80   (TCP) - HTTP (UI)
Port 8000 (TCP) - HTTP (API)
Port 9000 (TCP) - WebSocket (OCPP)
```

---

## 🚀 Phase 1: AWS EC2 & Security Configuration

### Step 1.1: Verify AWS Security Group Settings

**Before attempting SSH, confirm your Security Group allows SSH access:**

1. Navigate to AWS EC2 Console → Security Groups
2. Select your security group (e.g., `ev-csms-sg`)
3. Verify **Inbound Rules:**
   - SSH (Port 22) from your IP or 0.0.0.0/0
   - HTTP (Port 80) from 0.0.0.0/0
   - Custom TCP (Port 8000) from 0.0.0.0/0
   - Custom TCP (Port 9000) from 0.0.0.0/0

### Step 1.2: Verify SSH Key Permissions

On your **local machine** (where your .pem file is stored):

```bash
# Check permissions on your SSH key
ls -l ~/path/to/ev-csms-key.pem

# Should display: -rw------- (600 permissions)
# If not, set correct permissions:
chmod 600 ~/path/to/ev-csms-key.pem
```

⚠️ **Critical:** AWS will reject SSH connections if key permissions are not exactly 600.

### Step 1.3: Note Your Instance Public IP

From AWS Console:
- EC2 Dashboard → Instances
- Select your instance
- **Public IPv4 address:** This is what you'll use to connect

Example: `54.123.45.67`

---

## 🔐 Phase 2: SSH Access & Initial Server Configuration

### Step 2.1: Connect via SSH (Do NOT Execute SSH Commands)

You will establish SSH connection using:
```
ssh -i /path/to/ev-csms-key.pem ec2-user@<your-public-ip>
```

**Replace:**
- `/path/to/ev-csms-key.pem` - Your SSH key path
- `<your-public-ip>` - Your EC2 instance public IP

Once connected, you'll be logged in as `ec2-user` user.

### Step 2.2: Initial System Update (After SSH Login)

Once logged in via SSH, execute these commands on the EC2 instance:

```bash
# Update system packages
sudo yum update -y

# Install essential tools
sudo yum install -y curl wget git htop net-tools unzip nano gcc make
```

**Expected Output:**
- System packages updated
- Essential tools installed
- No errors should appear

---

## 🐳 Phase 3: Docker Installation

### Step 3.1: Install Docker

**On the EC2 instance, execute:**

```bash
# Install Docker from Amazon Linux Extras (recommended method for AL2)
sudo amazon-linux-extras install -y docker

# Verify installation
docker --version
# Expected output: Docker version 20.x.x (or higher)
```

### Step 3.2: Enable Docker Service

```bash
# Start Docker daemon
sudo systemctl start docker

# Enable Docker to start on system boot
sudo systemctl enable docker

# Verify Docker is running
sudo systemctl status docker
# Should show: active (running)
```

### Step 3.3: Configure Docker Group Permissions

```bash
# Add ec2-user to docker group (allows running docker without sudo)
sudo usermod -aG docker $USER

# Apply group changes (reload shell)
newgrp docker

# Verify docker access without sudo
docker ps
# Should list containers (empty list is fine)
```

### Step 3.4: Verify Docker Compose

```bash
# Check Docker Compose version
docker compose version
# Expected output: Docker Compose version 2.x.x (or higher)
```

---

## 🔥 Phase 4: Firewall Configuration

### Step 4.1: Start Firewall Service

```bash
# Start firewalld
sudo systemctl start firewalld

# Enable firewalld to start on boot
sudo systemctl enable firewalld

# Verify status
sudo firewall-cmd --state
# Should output: running
```

### Step 4.2: Configure Firewall Rules

Add permanent rules for all required ports:

```bash
# SSH (port 22)
sudo firewall-cmd --permanent --add-port=22/tcp

# HTTP (port 80)
sudo firewall-cmd --permanent --add-port=80/tcp

# API (port 8000)
sudo firewall-cmd --permanent --add-port=8000/tcp

# WebSocket/OCPP (port 9000)
sudo firewall-cmd --permanent --add-port=9000/tcp

# Reload firewall to apply all changes
sudo firewall-cmd --reload

# Verify all rules were added
sudo firewall-cmd --list-all
# Should show all ports in "ports:" section
```

---

## 📁 Phase 5: Repository Setup & Configuration

### Step 5.1: Create Project Directory Structure

```bash
# Create parent projects directory
mkdir -p ~/projects1

# Navigate to it
cd ~/projects1

# Verify directory created
pwd
# Should output: /home/ec2-user/projects1
```

### Step 5.2: Clone GitHub Repository via SSH

**Important:** This assumes you have GitHub SSH keys configured on the instance.

```bash
# Clone your repository (replace with your actual repo URL)
git clone git@github.com:YOUR_USERNAME/ocpp_projekt_rollback6.git

# Navigate into project
cd ocpp_projekt_rollback6/evcsms

# Verify structure
ls -la
# Should show: Dockerfile, docker-compose.yml, requirements.txt, app/, config/, data/, web/
```

**If you haven't set up SSH keys on the EC2 instance yet:**

```bash
# Generate SSH key pair (one-time setup)
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter for all prompts to accept defaults

# Display public key (copy this to GitHub)
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
# Then retry the git clone command above
```

### Step 5.3: Create Environment Configuration File

```bash
# Navigate to project directory (if not already there)
cd ~/projects1/ocpp_projekt_rollback6/evcsms

# Generate secure passwords
APP_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)

# Create .env file with secure values
cat > .env << EOF
# Redis Configuration
REDIS_PASSWORD=${REDIS_PASSWORD}

# Application Secrets
APP_SECRET=${APP_SECRET}

# Admin Bootstrap (first login)
ADMIN_BOOTSTRAP_EMAIL=admin@yourdomain.com
ADMIN_BOOTSTRAP_PASSWORD=ChangeMe123!

# Timezone
TZ=Europe/Stockholm
EOF

# Verify .env was created
cat .env

# ⚠️ Important: Store these passwords securely!
# Save the APP_SECRET and REDIS_PASSWORD to a secure location
echo "APP_SECRET: ${APP_SECRET}" >> ~/env-backup.txt
echo "REDIS_PASSWORD: ${REDIS_PASSWORD}" >> ~/env-backup.txt
```

**Important Environment Variables:**
- `REDIS_PASSWORD` - Secure password for Redis (regenerate with: `openssl rand -base64 24`)
- `APP_SECRET` - Secret key for application (regenerate with: `openssl rand -base64 32`)
- `ADMIN_BOOTSTRAP_EMAIL` - First admin account email
- `ADMIN_BOOTSTRAP_PASSWORD` - First admin account password (change after first login!)
- `TZ` - Timezone setting

---

## 🏗️ Phase 6: Docker Image Building

### Step 6.1: Build Docker Images

```bash
# Ensure you're in the correct directory
cd ~/projects1/ocpp_projekt_rollback6/evcsms

# Build all Docker images (without cache for clean build)
docker compose build --no-cache

# This will:
# - Build ui-service image
# - Build api-service image  
# - Build ocpp-ws-service image
# - Pull redis:7-alpine image

# Expected time: 5-10 minutes (depends on internet speed)
```

**Monitoring Build Progress:**
- Watch for successful completion of each service
- No errors should appear
- Final output should show all services built successfully

### Step 6.2: Verify Built Images

```bash
# List all Docker images
docker images

# Should show:
# - ocpp_ui-service
# - ocpp_api-service
# - ocpp_ocpp-ws-service
# - redis:7-alpine
```

---

## ▶️ Phase 7: Service Deployment

### Step 7.1: Start All Services

```bash
# Ensure you're in the project directory
cd ~/projects1/ocpp_projekt_rollback6/evcsms

# Start all containerized services in background
docker compose up -d

# Expected output: Creating redis-service ... done, etc.
```

### Step 7.2: Monitor Service Startup

```bash
# Check if all containers are running
docker ps

# Should show 4 containers:
# - redis-service
# - ocpp-ws-service
# - api-service
# - ui-service

# All should have status: Up (x minutes)
```

### Step 7.3: View Service Logs

```bash
# View recent logs from all services
docker compose logs --tail 50

# Follow logs in real-time (Ctrl+C to exit)
docker compose logs -f

# Check specific service logs
docker logs api-service --tail 20
docker logs ocpp-ws-service --tail 20
docker logs redis-service --tail 20
```

---

## ✅ Phase 8: Post-Deployment Verification

### Step 8.1: Port Accessibility Check

```bash
# Verify ports are listening
ss -tuln | grep -E "80|8000|9000|6379"

# Should show all 4 ports in LISTEN state:
# - 0.0.0.0:80 (UI)
# - 0.0.0.0:8000 (API)
# - 0.0.0.0:9000 (OCPP)
# - 0.0.0.0:6379 (Redis)
```

### Step 8.2: Service Health Checks

```bash
# Test UI Service (Port 80)
curl -s http://localhost/ | head -20
# Should return HTML content

# Test API Service (Port 8000)
curl -s http://localhost:8000/docs | head -20
# Should return API documentation

# Test Redis connectivity
docker exec redis-service redis-cli ping
# Should output: PONG
```

### Step 8.3: Container Health Status

```bash
# Check container health status
docker compose ps

# Verify all containers show "healthy" status:
# STATUS should include: Up (x minutes) (healthy)
```

### Step 8.4: Access from External Machine

From your **local machine** (not SSH session), test access to your services:

```bash
# Replace <your-public-ip> with actual EC2 public IP

# Test UI Dashboard
curl http://<your-public-ip>/
# Should return HTML content

# Test API
curl http://<your-public-ip>:8000/docs
# Should return API documentation

# Or open in browser:
# UI:   http://<your-public-ip>/
# API:  http://<your-public-ip>:8000/docs
# OCPP: ws://<your-public-ip>:9000 (WebSocket - browser console)
```

---

## 🌐 Phase 9: Access Your Deployment

### Web Dashboard Access

**URL:** `http://<your-ec2-public-ip>/`

**Default Credentials:**
- **Email:** admin@takorama.se (configured in docker-compose.yml)
- **Password:** sliceorama

⚠️ **Change default credentials immediately after first login!**

### API Documentation

**URL:** `http://<your-ec2-public-ip>:8000/docs`

Interactive Swagger UI documentation for all REST API endpoints.

### WebSocket Endpoint (for Charge Points)

**URL:** `ws://<your-ec2-public-ip>:9000/`

Charge point devices connect to this endpoint using OCPP 1.6J protocol.

---

## 📊 Phase 10: Configuration & Data Management

### Step 10.1: Review Configuration Files

```bash
# Navigate to config directory
cd ~/projects1/ocpp_projekt_rollback6/evcsms/config

# Configuration files:
ls -la
# - auth_tags.json      : RFID/authentication tags
# - cps.json            : Charge point definitions
# - orgs.json           : Organization definitions
# - users.json          : User accounts
```

### Step 10.2: View Data Directory

```bash
# Navigate to data directory
cd ~/projects1/ocpp_projekt_rollback6/evcsms/data

# Data storage:
ls -la
# - transactions.json   : Charging transaction history
```

### Step 10.3: Persistent Data

All data in the following directories is persistent:
- `/home/ec2-user/projects1/ocpp_projekt_rollback6/evcsms/config/`
- `/home/ec2-user/projects1/ocpp_projekt_rollback6/evcsms/data/`

These are mounted as volumes in docker-compose.yml.

---

## 🔧 Phase 11: Common Operations

### Starting Services

```bash
cd ~/projects1/ocpp_projekt_rollback6/evcsms
docker compose up -d
```

### Stopping Services (Preserves Data)

```bash
docker compose down
# All containers stop but volumes are preserved
```

### Restarting Services

```bash
docker compose restart
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker logs api-service -f
docker logs ocpp-ws-service -f
docker logs redis-service -f
docker logs ui-service -f
```

### Checking Service Status

```bash
docker compose ps
# Shows all services and their status
```

---

## 🔍 Phase 12: Monitoring & Maintenance

### System Resource Monitoring

```bash
# Monitor container resource usage
docker stats --no-stream

# Check system disk usage
df -h

# Check system memory
free -h

# Check system CPU usage
top -b -n 1 | head -20
```

### Regular Maintenance Tasks

**Daily:**
- Check logs for errors: `docker compose logs --tail 100`
- Verify all services running: `docker compose ps`

**Weekly:**
- Review resource usage: `docker stats`
- Check disk space: `df -h`
- Backup critical data (see Phase 13)

**Monthly:**
- Review transactions.json for growth
- Update system packages: `sudo yum update -y`
- Test backup/restore procedures

---

## 💾 Phase 13: Backup & Recovery

### Step 13.1: Create Backup Script

```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
cat > ~/backup-csms.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR=~/projects1/ocpp_projekt_rollback6/evcsms

# Create backup
echo "Backing up EV CSMS data..."
tar -czf $BACKUP_DIR/ev-csms-backup_$TIMESTAMP.tar.gz \
  $PROJECT_DIR/config/ \
  $PROJECT_DIR/data/ \
  $PROJECT_DIR/.env

echo "Backup completed: $BACKUP_DIR/ev-csms-backup_$TIMESTAMP.tar.gz"

# Keep only last 7 backups
find $BACKUP_DIR -name "ev-csms-backup_*.tar.gz" -mtime +7 -delete
EOF

# Make script executable
chmod +x ~/backup-csms.sh
```

### Step 13.2: Perform Manual Backup

```bash
# Run backup script
~/backup-csms.sh

# Verify backup was created
ls -lh ~/backups/

# Should show: ev-csms-backup_YYYYMMDD_HHMMSS.tar.gz
```

### Step 13.3: Setup Automated Backups

```bash
# Edit crontab
crontab -e

# Add this line to run daily backup at 2 AM:
0 2 * * * ~/backup-csms.sh

# Save and exit (instructions will show at bottom of editor)
```

### Step 13.4: Restore from Backup

```bash
# Stop services first
cd ~/projects1/ocpp_projekt_rollback6/evcsms
docker compose down

# Restore backup
cd ~/
tar -xzf ~/backups/ev-csms-backup_YYYYMMDD_HHMMSS.tar.gz

# Restart services
cd ~/projects1/ocpp_projekt_rollback6/evcsms
docker compose up -d

# Verify services restarted
docker compose ps
```

---

## 🐛 Phase 14: Troubleshooting

### Issue: Services Won't Start

```bash
# Check logs
docker compose logs

# If specific service fails:
docker logs api-service

# Common fixes:
# 1. Rebuild images
docker compose build --no-cache

# 2. Restart Docker daemon
sudo systemctl restart docker

# 3. Remove and restart
docker compose down
docker compose up -d
```

### Issue: Can't Access Web Dashboard

```bash
# Check if UI service is running
docker ps | grep ui-service

# Check firewall
sudo firewall-cmd --list-all

# Test port locally
ss -tuln | grep 80

# Restart UI service
docker restart ui-service

# Check logs
docker logs ui-service
```

### Issue: Port Already in Use

```bash
# Check which service is using the port (example: port 8000)
ss -tuln | grep 8000

# If another process is using it:
sudo lsof -i :8000
# Kill the process: kill -9 <PID>

# Or change docker-compose.yml port mapping:
# From: "8000:8000"
# To: "8001:8000"
```

### Issue: Out of Disk Space

```bash
# Check disk usage
df -h

# Find large directories
du -sh /home/ec2-user/* | sort -h

# Clean Docker data (backup first!)
docker system prune -f

# Clear yum cache
sudo yum clean all
```

### Issue: Redis Connection Failed

```bash
# Check Redis service
docker logs redis-service

# Test Redis connection
docker exec redis-service redis-cli ping
# Should output: PONG

# Verify Redis password in .env matches docker-compose.yml
cat .env | grep REDIS_PASSWORD
```

### Issue: Database Data Lost

```bash
# Ensure data volumes are mounted correctly
docker inspect ocpp-api-service | grep -A 5 "Mounts"

# List Docker volumes
docker volume ls

# Data should be stored in:
# ~/projects1/ocpp_projekt_rollback6/evcsms/config/
# ~/projects1/ocpp_projekt_rollback6/evcsms/data/

# Never use: docker compose down -v (removes volumes!)
# Always use: docker compose down (preserves volumes)
```

---

## 📋 Complete System Checklist

### Pre-Deployment Verification
- [ ] EC2 instance is running and accessible via SSH
- [ ] Security group allows traffic on ports: 22, 80, 8000, 9000
- [ ] SSH key permissions are set to 600
- [ ] GitHub SSH keys configured on instance
- [ ] Project directory created: ~/projects1/

### Deployment Verification
- [ ] Docker installed and running
- [ ] Docker daemon enabled on system boot
- [ ] Firewall configured and enabled
- [ ] Repository cloned to ~/projects1/ocpp_projekt_rollback6/
- [ ] .env file created with secure passwords
- [ ] Docker images built successfully
- [ ] All 4 services running: docker compose ps shows healthy

### Post-Deployment Verification
- [ ] UI Service accessible: http://<ip>/
- [ ] API Service accessible: http://<ip>:8000/docs
- [ ] Can login with default credentials
- [ ] Firewall rules applied correctly
- [ ] All ports listening: ss -tuln
- [ ] No critical errors in logs: docker compose logs
- [ ] Backup script created and tested
- [ ] Monitoring setup completed

---

## 📞 Support & Reference

### Key Documentation Files
- **Quick Reference:** `AMAZON_LINUX_QUICK_REFERENCE.md` (5 min read)
- **Complete Manual:** `manual1.md` (Comprehensive - 2,295 lines)
- **Architecture:** `/evcsms/README.md`
- **Configuration:** `/evcsms/docker-compose.yml`

### Important Paths on EC2
```
SSH Key Location:        ~/.ssh/ev-csms-key.pem
Project Root:            ~/projects1/ocpp_projekt_rollback6/
Service Directory:       ~/projects1/ocpp_projekt_rollback6/evcsms/
Configuration:           ~/projects1/ocpp_projekt_rollback6/evcsms/.env
Docker Compose File:     ~/projects1/ocpp_projekt_rollback6/evcsms/docker-compose.yml
Config Files:            ~/projects1/ocpp_projekt_rollback6/evcsms/config/
Data Directory:          ~/projects1/ocpp_projekt_rollback6/evcsms/data/
Backup Directory:        ~/backups/
System Logs:             /var/log/
Docker Logs:             /var/lib/docker/containers/
```

### External Resources
- **Amazon Linux 2 Documentation:** https://docs.aws.amazon.com/amazon-linux-2/
- **Docker Documentation:** https://docs.docker.com/
- **AWS EC2 Documentation:** https://docs.aws.amazon.com/ec2/
- **firewalld Documentation:** https://firewalld.org/
- **FastAPI Documentation:** https://fastapi.tiangolo.com/

---

## 📝 Summary

**Total Estimated Deployment Time:** 45-60 minutes

This includes:
- System updates and Docker installation: ~5 minutes
- Firewall configuration: ~2 minutes
- Repository cloning and setup: ~5 minutes
- Docker image building: ~10-15 minutes
- Service deployment and verification: ~10 minutes
- Final testing and configuration: ~10 minutes

**After deployment completes:**
1. Bookmark the Web Dashboard URL
2. Change default admin credentials
3. Configure charge points to connect to WebSocket endpoint
4. Setup automated backups
5. Monitor logs regularly

---

**Status:** ✅ Ready for Production Deployment  
**Document Version:** 1.0  
**Last Updated:** March 17, 2026

