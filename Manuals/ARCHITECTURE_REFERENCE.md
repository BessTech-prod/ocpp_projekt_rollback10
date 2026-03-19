# AWS Deployment Architecture & Technical Reference
## EV CSMS (Electric Vehicle Charge Station Management System)

---

## 📐 System Architecture Overview

### Microservices Architecture

The EV CSMS has been designed as a distributed microservices system running on Docker containers within Amazon Linux 2 EC2 instances:

```
┌──────────────────────────────────────────────────────────────┐
│                    AWS EC2 Instance                          │
│          (Amazon Linux 2 - t3.medium or larger)              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┬────────────────┬────────────────┐        │
│  │                │                │                │        │
│  │  UI SERVICE    │  API SERVICE   │  OCPP SERVICE  │        │
│  │  (Port 80)     │  (Port 8000)   │  (Port 9000)   │        │
│  │                │                │                │        │
│  │  HTML/CSS/JS   │  FastAPI       │  WebSocket     │        │
│  │  Static Files  │  REST API      │  OCPP 1.6J     │        │
│  │  Web Dashboard │  Business      │  Charge Point  │        │
│  │                │  Logic         │  Communication │        │
│  │                │                │                │        │
│  └────────────┬───┴───────────┬────┴────────────┬──┘        │
│               │               │                │             │
│               └───────────────┼────────────────┘             │
│                               │                              │
│                    ┌──────────▼──────────┐                   │
│                    │  REDIS SERVICE      │                   │
│                    │  (Port 6379)        │                   │
│                    │                     │                   │
│                    │  Session Store      │                   │
│                    │  State Management   │                   │
│                    │  Real-time Data     │                   │
│                    │  Cache              │                   │
│                    └─────────────────────┘                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │             PERSISTENT DATA VOLUMES                    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  /evcsms/config/      /evcsms/data/                   │ │
│  │  ├─ auth_tags.json    ├─ transactions.json            │ │
│  │  ├─ cps.json          └─ [charge records]             │ │
│  │  ├─ orgs.json                                          │ │
│  │  └─ users.json                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
         ▲                                         ▲
         │ HTTP/HTTPS                             │ WebSocket
         │ (80, 8000)                             │ (9000)
         │                                        │
    ┌────┴─────────────────┐          ┌──────────┴─────────┐
    │                      │          │                    │
    │  Web Browsers        │          │  Physical Charge   │
    │  Admin Dashboard     │          │  Point Devices     │
    │  End Users           │          │  (Hardware)        │
    │                      │          │                    │
    └──────────────────────┘          └────────────────────┘
```

### Service Interaction Flow

```
┌─────────────────────┐
│   User/Browser      │
│   or Charge Point   │
└──────────┬──────────┘
           │
           │ HTTP/WS Request
           ▼
    ┌──────────────────────────────────┐
    │  Firewall / Security Group       │
    │  (Ports 80, 8000, 9000 allowed) │
    └──────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
  ┌─────────┐   ┌───────────────┐
  │UI (80)  │   │API (8000)     │
  │or WS    │   │or WS (9000)   │
  │(9000)   │   │                │
  └────┬────┘   └────┬──────────┘
       │             │
       └─────┬───────┘
             │
             ▼
       ┌──────────────┐
       │ Redis        │
       │ (6379)       │
       │              │
       │ Caching &    │
       │ Session Mgmt │
       └──────────────┘
```

---

## 🐳 Docker Containerization

### Container Specifications

#### 1. UI Service Container

```yaml
Service Name:         ui-service
Base Image:           ubuntu:22.04 (custom Dockerfile)
Port:                 80 (HTTP)
Environment:          None (static files only)
Mount Points:
  - ./web:/usr/share/nginx/html (Read-only)
Healthcheck:          HTTP GET / (curl)
Restart Policy:       always
Resources:
  - Memory Limit:     512 MB
  - CPU Limit:        0.5 cores
```

**Responsibilities:**
- Serve HTML/CSS/JavaScript web interface
- Dashboard for charge point management
- User interface for admin/operators
- Static asset serving

#### 2. API Service Container

```yaml
Service Name:         api-service
Base Image:           python:3.11-slim
Port:                 8000 (HTTP)
Environment Variables:
  - REDIS_URL: redis://:${REDIS_PASSWORD}@redis-service:6379/0
  - API_PORT: 8000
  - APP_SECRET: ${APP_SECRET}
Mount Points:
  - ./app:/app
  - ./config:/app/config
  - ./data:/app/data
Depends On:           redis-service
Healthcheck:          HTTP GET /health
Restart Policy:       always
Resources:
  - Memory Limit:     1 GB
  - CPU Limit:        1 core
```

**Responsibilities:**
- REST API endpoints (CRUD operations)
- User authentication & authorization
- Business logic processing
- Data management & persistence
- Logging & monitoring

#### 3. OCPP WebSocket Service Container

```yaml
Service Name:         ocpp-ws-service
Base Image:           python:3.11-slim
Port:                 9000 (WebSocket)
Environment Variables:
  - REDIS_URL: redis://:${REDIS_PASSWORD}@redis-service:6379/0
  - OCPP_PORT: 9000
Mount Points:
  - ./app:/app
  - ./config:/app/config
  - ./data:/app/data
Depends On:           redis-service
Healthcheck:          TCP socket connection on 9000
Restart Policy:       always
Resources:
  - Memory Limit:     1 GB
  - CPU Limit:        1 core
```

**Responsibilities:**
- OCPP 1.6J WebSocket protocol handling
- Charge point device communication
- Real-time status updates
- Transaction management
- Heartbeat & connection monitoring

#### 4. Redis Service Container

```yaml
Service Name:         redis-service
Base Image:           redis:7-alpine
Port:                 6379 (TCP)
Environment Variables:
  - REDIS_PASSWORD: ${REDIS_PASSWORD}
Command:              redis-server --requirepass ${REDIS_PASSWORD}
Mount Points:         None (stateless cache)
Healthcheck:          redis-cli PING
Restart Policy:       always
Resources:
  - Memory Limit:     512 MB
  - CPU Limit:        0.5 cores
```

**Responsibilities:**
- Session storage
- Real-time state management
- Inter-service communication
- Caching layer
- Performance optimization

---

## 🔌 Port & Network Configuration

### Port Mapping

| Container Port | Host Port | Protocol | Service | Purpose |
|---|---|---|---|---|
| 80/tcp | 80 | HTTP | UI | Web Dashboard |
| 8000/tcp | 8000 | HTTP | API | REST API & Docs |
| 9000/tcp | 9000 | TCP | OCPP WS | Charge Point WebSocket |
| 6379/tcp | 6379 | TCP | Redis | Session/Cache (Internal) |

### Security Group Configuration (AWS)

**Inbound Rules:**

| Protocol | Port | Source | Description |
|---|---|---|---|
| TCP | 22 | 0.0.0.0/0 or Specific IP | SSH Management |
| TCP | 80 | 0.0.0.0/0 | HTTP Web Dashboard |
| TCP | 8000 | 0.0.0.0/0 | API Documentation |
| TCP | 9000 | 0.0.0.0/0 | OCPP WebSocket |

**Outbound Rules:**
- All traffic allowed (default)

**Internal Docker Network:**
- All containers communicate on internal Docker bridge network
- Service names (redis-service, api-service, etc.) resolve via Docker DNS
- Redis access: `redis://:password@redis-service:6379/0`
- Direct port exposure not required for inter-container communication

---

## 📊 Data Management & Persistence

### Persistent Data Architecture

```
Docker Container Volumes
    ↓
Mounted from Host Filesystem
    ↓
/home/ec2-user/projects1/ocpp_projekt_rollback6/evcsms/
    ├── config/           (Configuration - JSON files)
    │   ├── auth_tags.json    (RFID/NFC tags database)
    │   ├── cps.json          (Charge point definitions)
    │   ├── orgs.json         (Organization hierarchy)
    │   └── users.json        (User accounts)
    │
    └── data/             (Runtime data - JSON files)
        └── transactions.json  (Charging transaction history)
```

### Data Files Reference

#### auth_tags.json
```json
{
  "tags": [
    {
      "tag_id": "RFID_TAG_001",
      "user_id": "USER_001",
      "enabled": true
    }
  ]
}
```
**Purpose:** Maps RFID/NFC tags to users for authentication

#### cps.json
```json
{
  "charge_points": [
    {
      "cp_id": "CP_001",
      "name": "Charging Point 1",
      "location": "Building A",
      "org_id": "ORG_001",
      "status": "available",
      "connector_type": "Type2"
    }
  ]
}
```
**Purpose:** Defines all charge point devices in the system

#### orgs.json
```json
{
  "organizations": [
    {
      "org_id": "ORG_001",
      "name": "Organization Name",
      "admin_id": "USER_001"
    }
  ]
}
```
**Purpose:** Organization structure and hierarchy

#### users.json
```json
{
  "users": [
    {
      "user_id": "USER_001",
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    }
  ]
}
```
**Purpose:** User accounts and credentials

#### transactions.json
```json
{
  "transactions": [
    {
      "tx_id": "TX_001",
      "cp_id": "CP_001",
      "user_id": "USER_001",
      "start_time": "2026-03-17T10:00:00Z",
      "end_time": "2026-03-17T11:30:00Z",
      "energy_delivered": 15.5,
      "cost": 45.75
    }
  ]
}
```
**Purpose:** Complete charging transaction history

### Volume Mounting in docker-compose.yml

```yaml
volumes:
  - ./config:/app/config          # Configuration bind mount
  - ./data:/app/data              # Data bind mount
  - /home/ec2-user/.ssh:/root/.ssh (if needed for deployments)
```

**Persistence Strategy:**
- **Bind Mount** (recommended): Direct filesystem mount
- Data survives container restarts
- Data survives service updates
- Backup by copying host filesystem

---

## 🔐 Environment Configuration

### .env File Variables

```bash
# Redis Password (auto-generated, 24 characters)
REDIS_PASSWORD=<securely-generated-32-character-string>

# Application Secret (auto-generated, 32 characters)
APP_SECRET=<securely-generated-base64-string>

# Admin Account Bootstrap
ADMIN_BOOTSTRAP_EMAIL=admin@yourdomain.com
ADMIN_BOOTSTRAP_PASSWORD=ChangeMe123!

# System Timezone
TZ=Europe/Stockholm
```

### Security Considerations

1. **Password Generation:**
   ```bash
   # Generate 24-character password for Redis
   openssl rand -base64 24
   
   # Generate 32-character secret for app
   openssl rand -base64 32
   ```

2. **Environment File Protection:**
   ```bash
   # Restrict file permissions
   chmod 600 .env
   
   # Never commit to Git
   # Add to .gitignore: .env
   ```

3. **Credential Rotation:**
   - Change `ADMIN_BOOTSTRAP_PASSWORD` on first login
   - Rotate `REDIS_PASSWORD` quarterly
   - Rotate `APP_SECRET` on major updates

---

## 🚀 Deployment Lifecycle

### Initialization Phase

1. **Instance Startup**
   - EC2 instance boots with Amazon Linux 2
   - Docker daemon starts automatically (enabled)
   - Firewall activates with configured rules

2. **Service Startup** (docker compose up -d)
   ```
   Redis Service starts    → listening on 6379
   API Service starts      → connects to Redis
   OCPP WS Service starts  → connects to Redis
   UI Service starts       → serves on port 80
   ```

3. **Health Checks**
   - Redis: `redis-cli PING`
   - API: `curl http://localhost:8000/health`
   - OCPP: TCP connection to 9000
   - UI: `curl http://localhost/`

### Running State

- All 4 containers running and healthy
- Firewall actively filtering traffic
- Persistent data mounted and accessible
- Inter-container communication via Docker bridge
- External connections on ports 80, 8000, 9000

### Shutdown Phase (docker compose down)

1. Services gracefully shutdown (30-second timeout)
2. Containers stopped and removed
3. Volumes (persistent data) preserved
4. Network bridge cleaned up
5. Data intact for next startup

---

## 📈 Performance Tuning Parameters

### Resource Limits (docker-compose.yml)

```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: "0.5"
    reservations:
      memory: 256M
      cpus: "0.25"
```

### Monitoring Metrics

```bash
# Real-time resource usage
docker stats --no-stream

# Container-specific monitoring
docker stats ui-service api-service ocpp-ws-service redis-service

# System resource overview
df -h      # Disk usage
free -h    # Memory usage
top -b     # CPU usage
```

### Optimization Guidelines

- **Memory:** 4 GB minimum (8 GB recommended for production)
- **CPU:** 2 cores minimum (4 cores recommended)
- **Disk:** 30 GB minimum (100 GB recommended)
- **Network:** Gigabit Ethernet recommended for charge point connectivity

---

## 🔄 Inter-Service Communication

### Redis Connection Pool

```
Service → Redis Client Library → Connection Pool → Redis Server
                                       ↓
                            Max Connections: 50
                            Timeout: 5 seconds
                            Retry: 3 attempts
```

### API → OCPP Communication

```
API Service                    OCPP Service
    ↓                              ↓
 [Shared Redis Store]
    ↓
    Service 1 writes state
    Service 2 reads state
    Real-time synchronization
```

### Data Flow Example: Charge Transaction

```
1. Charge Point (physical device)
   └─→ WebSocket Connection to 9000
       └─→ OCPP Message (OCPP WS Service)
           └─→ Parse & Validate Message
               └─→ Write to Redis
                   └─→ Update transactions.json
                       └─→ API Service reads from Redis
                           └─→ Dashboard displays update
                               └─→ User sees real-time status
```

---

## 📋 Amazon Linux 2 Specific Details

### Key Differences vs. Ubuntu

| Aspect | Ubuntu | Amazon Linux 2 |
|--------|--------|---|
| **Default User** | ubuntu | ec2-user |
| **Package Mgr** | apt-get | yum/dnf |
| **Init System** | systemd | systemd |
| **Firewall** | UFW (optional) | firewalld (standard) |
| **Home Directory** | /home/ubuntu | /home/ec2-user |
| **Docker Install** | Official repo | Amazon Linux Extras |

### AL2-Specific Commands

```bash
# Check AL2 version
cat /etc/os-release

# View available extras
amazon-linux-extras list

# Install package from extras
sudo amazon-linux-extras install -y docker

# Service management (systemd)
sudo systemctl start service-name
sudo systemctl enable service-name
sudo systemctl status service-name

# View system logs
sudo journalctl -xe
sudo journalctl -u docker -f
```

---

## 🔗 API Endpoints Overview

### Base URL
```
http://<ec2-public-ip>:8000
```

### Health Check
```
GET /health
Response: 200 OK
```

### API Documentation
```
GET /docs (Swagger UI)
GET /redoc (ReDoc UI)
```

### Authentication
```
POST /auth/login
Body: { "email": "user@example.com", "password": "..." }
Response: { "token": "jwt-token", "expires_in": 3600 }
```

### Common Endpoints

```
# Charge Points
GET    /api/charge-points
POST   /api/charge-points
GET    /api/charge-points/{id}
PUT    /api/charge-points/{id}
DELETE /api/charge-points/{id}

# Transactions
GET    /api/transactions
GET    /api/transactions/{id}
POST   /api/transactions

# Users
GET    /api/users
POST   /api/users
GET    /api/users/{id}
PUT    /api/users/{id}

# Organizations
GET    /api/organizations
POST   /api/organizations
```

---

## 🔧 Troubleshooting Reference

### Common Issues & Solutions

| Issue | Diagnosis Command | Solution |
|---|---|---|
| Service won't start | `docker logs api-service` | Rebuild: `docker compose build --no-cache` |
| Port already in use | `ss -tuln \| grep PORT` | Kill process: `kill -9 PID` |
| Redis connection failed | `docker exec redis-service redis-cli ping` | Check password in .env |
| Out of disk space | `df -h` | Clean: `docker system prune -f` |
| Firewall blocks traffic | `sudo firewall-cmd --list-all` | Add rule: `sudo firewall-cmd --permanent --add-port=PORT/tcp` |

---

## 📚 Documentation Cross-Reference

| Document | Purpose | Length |
|---|---|---|
| **COMMISSIONING_GUIDE_AWS_AL2.md** | Step-by-step deployment | 400+ lines |
| **DEPLOYMENT_CHECKLIST_PROJECTS1.md** | Verification checklist | 300+ lines |
| **manual1.md** | Complete technical manual | 2,295 lines |
| **AMAZON_LINUX_QUICK_REFERENCE.md** | Quick command reference | 429 lines |
| **evcsms/README.md** | Service architecture | 243 lines |

---

## 🎯 Success Criteria

Your deployment is **successful** when:

✅ All 4 services running: `docker compose ps`  
✅ Web dashboard accessible: `http://<ip>/`  
✅ API docs available: `http://<ip>:8000/docs`  
✅ Can login with credentials  
✅ Can view charge points  
✅ WebSocket connection from charge point succeeds  
✅ Firewall rules all active  
✅ System resources within limits  
✅ Automated backups configured  
✅ No critical errors in logs  

---

**Status:** ✅ Complete Architecture Documentation  
**Version:** 1.0  
**Last Updated:** March 17, 2026  
**Target Platform:** AWS EC2 Amazon Linux 2  
**Deployment Framework:** Docker Compose 3.x

