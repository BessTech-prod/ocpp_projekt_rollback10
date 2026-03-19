# Release Checklist Template (EV CSMS on AWS)

Use this checklist for every production or production-like deployment.

---

## A) Release metadata
- [ ] Release name/tag:
- [ ] Target environment:
- [ ] Planned window:
- [ ] Operator:
- [ ] Rollback owner:

---

## B) Change scope
- [ ] Link to PR/commit(s):
- [ ] Services impacted:
  - [ ] `ui-service`
  - [ ] `api-service`
  - [ ] `ocpp-ws-service`
  - [ ] `redis-service` (rare)
- [ ] Config/secret changes required:
- [ ] Data migration required:

---

## C) Pre-deployment checks
- [ ] Code reviewed and merged
- [ ] Tag created and pushed
- [ ] Server access verified (SSH)
- [ ] Disk space checked
- [ ] Backup path exists
- [ ] Runbook link shared with operator

---

## D) Backup checklist (AWS host)
- [ ] Backup folder created with timestamp
- [ ] `data/` backed up
- [ ] `config/` backed up
- [ ] `.env` backed up (if present)
- [ ] `docker-compose.yml` backed up
- [ ] Current `docker compose ps` captured
- [ ] Current `docker compose images` captured

---

## E) Deployment execution
- [ ] `git fetch --all --tags`
- [ ] Checkout target (`main` or release tag)
- [ ] `git pull --ff-only` (if deploying branch)
- [ ] Rebuild only impacted service(s)
- [ ] Compose completed without errors

---

## F) Verification checks
- [ ] `docker compose ps` healthy
- [ ] `ui-service` logs checked
- [ ] `api-service` logs checked
- [ ] `ocpp-ws-service` logs checked
- [ ] `curl http://localhost/` passes
- [ ] `curl http://localhost:8000/health` passes
- [ ] External HTTPS check passes
- [ ] Browser smoke test passes (login, dashboard, key page)

---

## G) Rollback readiness
- [ ] Known-good rollback tag identified
- [ ] Rollback commands prepared
- [ ] Operator confirms rollback test path

---

## H) Post-deployment record
- [ ] Deployment end time:
- [ ] Final status:
- [ ] Issues observed:
- [ ] Follow-up tasks:
- [ ] Release notes updated:

