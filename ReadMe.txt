Current deployable runtime is the multi-service stack under `evcsms/`.

Use these files as the source of truth:
- `evcsms/README.md`
- `evcsms/docker-compose.yml`
- `Manuals/BESSTECH_PROD_AWS_MULTISERVICE_UPDATE_GUIDE.md`
- `Manuals/DEPLOYMENT_RUNBOOK_AWS_HTTPS.md`

Quick start:

```bash
cd evcsms
./run.sh build
./run.sh up
curl -f http://localhost:8000/health
```

Legacy localhost notes have been removed from this file to keep the repository deployment-focused.
