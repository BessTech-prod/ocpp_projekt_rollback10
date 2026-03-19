# EV CSMS Single-Container Localhost Guide

Use this mode when you want fast UI iteration without managing multiple containers.

## What This Mode Does

- Runs `nginx`, `api.py`, `ocpp_ws.py`, and `redis-server` in one container.
- Keeps the same API and OCPP behavior, but simplifies local development.
- Mounts project files so web/UI edits are visible immediately.

## Files Added

- `docker-compose.single.yml`
- `docker/Dockerfile.single`
- `docker/nginx.single.conf`
- `docker/supervisord.single.conf`
- `docker/entrypoint.single.sh`

## Start

```bash
cd /path/to/evcsms
./run.sh up-local
```

## Verify

```bash
curl -sS http://localhost/health
curl -sS http://localhost/docs | head -n 5
curl -sS http://localhost/login.html | head -n 5
```

## Logs

```bash
./run.sh logs-local
```

## Stop

```bash
./run.sh down-local
```

## Rebuild (when base image or Docker files change)

```bash
./run.sh build-local
./run.sh up-local
```

## Direct Debug Ports

- `http://localhost:8000` (API direct)
- `ws://localhost:9000/<ChargeBoxId>` (OCPP direct)

## Notes for UI Work

- `web/*` edits are mounted and reflected immediately.
- `api.py`, `ocpp_ws.py`, and `app/*` edits require container restart.

