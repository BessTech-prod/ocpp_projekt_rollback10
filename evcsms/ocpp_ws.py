# =====================================================================
# ocpp_ws.py — OCPP 1.6J WebSocket Service
# =====================================================================

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

import websockets
from ocpp.routing import on
from ocpp.v16 import ChargePoint as CP
from ocpp.v16.enums import Action, AuthorizationStatus, RegistrationStatus
from ocpp.v16 import call_result, call

from app.auth_store import AuthStore
from app.redis_config import build_redis_client

# =====================================================================
# LOGGNING
# =====================================================================
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ocpp-ws")

# =====================================================================
# KONFIGURATION
# =====================================================================
OCPP_PORT = int(os.getenv("OCPP_PORT", "9000"))

# File paths
BASE = Path("/data")
AUTH_FILE = BASE / "config" / "auth_tags.json"
USERS_FILE = BASE / "config" / "users.json"
ORGS_FILE = BASE / "config" / "orgs.json"
CPS_FILE = BASE / "config" / "cps.json"
TRANSACTIONS_FILE = BASE / "transactions.json"

# =====================================================================
# REDIS CLIENT
# =====================================================================
redis_client = build_redis_client()
connected_clients: Dict[str, "CentralSystemCP"] = {}


def result_key(command_id: str) -> str:
    return f"ocpp:command_result:{command_id}"


def set_command_result(command_id: str, payload: dict):
    redis_client.setex(result_key(command_id), 600, json.dumps(payload, ensure_ascii=False))


def build_ocpp_call(command: str, payload: dict):
    command = (command or "").strip().lower()
    payload = payload or {}

    if command == "reset":
        reset_type = str(payload.get("type", "Hard"))
        return call.Reset(type=reset_type)

    if command == "change_availability":
        availability_type = str(payload.get("type", "Operative"))
        connector_id = int(payload.get("connector_id", 0))
        return call.ChangeAvailability(connector_id=connector_id, type=availability_type)

    if command == "trigger_message":
        requested_message = str(payload.get("requested_message", "StatusNotification"))
        connector = payload.get("connector_id")
        if connector is None:
            return call.TriggerMessage(requested_message=requested_message)
        return call.TriggerMessage(requested_message=requested_message, connector_id=int(connector))

    raise ValueError(f"Unsupported command: {command}")


async def command_worker():
    logger.info("OCPP command worker started")
    while True:
        try:
            popped = await asyncio.to_thread(redis_client.blpop, "ocpp:commands", 1)
            if not popped:
                continue

            _, raw_message = popped
            message = json.loads(raw_message.decode())

            command_id = message.get("command_id") or "unknown"
            cp_id = message.get("cp_id")
            command = message.get("command")
            payload = message.get("payload") or {}

            cp = connected_clients.get(cp_id)
            if not cp:
                set_command_result(
                    command_id,
                    {
                        "command_id": command_id,
                        "cp_id": cp_id,
                        "command": command,
                        "status": "failed",
                        "error": "Charge point is not connected",
                        "updated_at": iso_now(),
                    },
                )
                continue

            try:
                request = build_ocpp_call(command, payload)
                response = await cp.call(request)
                set_command_result(
                    command_id,
                    {
                        "command_id": command_id,
                        "cp_id": cp_id,
                        "command": command,
                        "status": "success",
                        "response": response,
                        "updated_at": iso_now(),
                    },
                )
            except Exception as exc:
                set_command_result(
                    command_id,
                    {
                        "command_id": command_id,
                        "cp_id": cp_id,
                        "command": command,
                        "status": "failed",
                        "error": str(exc),
                        "updated_at": iso_now(),
                    },
                )
        except Exception as exc:
            logger.exception("Command worker loop failed: %s", exc)
            await asyncio.sleep(1)


async def wait_for_redis(retries: int = 15, delay_seconds: float = 2.0):
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            redis_client.ping()
            logger.info("Redis connection ready")
            return
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Redis not ready yet (attempt %d/%d): %s",
                attempt,
                retries,
                exc,
            )
            await asyncio.sleep(delay_seconds)

    raise RuntimeError(f"Redis was not ready after {retries} attempts") from last_error

# =====================================================================
# HJÄLPFUNKTIONER
# =====================================================================
def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

def ensure_default_org():
    """Se till att org 'default' alltid finns."""
    orgs = load_json(ORGS_FILE, {})
    if "default" not in orgs:
        orgs["default"] = {"name": "Default"}
        ORGS_FILE.write_text(json.dumps(orgs, indent=2, ensure_ascii=False), encoding="utf-8")

def org_for_cp(cp_id: str) -> str:
    """Returnera CP-org (om saknas → 'default')."""
    cps = load_json(CPS_FILE, {})
    return cps.get(cp_id, "default")

def is_tag_allowed_on_cp(tag: str, cp_id: str) -> bool:
    """
    Policy:
    - Taggen måste vara whitelistaD
    - CP måste tillhöra samma org som användarens org
    - Om PORTAL_TAGS_GLOBAL=true → portal_admin alltid accepterad
    """
    users = load_json(USERS_FILE, {})
    u = users.get(tag)
    if not u:
        return False

    tag_role = (u.get("role") or "user").lower()
    tag_org = u.get("org_id")
    cp_org = org_for_cp(cp_id)

    # Portal-admin override
    portal_global = os.getenv("PORTAL_TAGS_GLOBAL", "false").lower() in ("1", "true", "yes")
    if portal_global and tag_role in ("portal_admin", "admin"):
        return True

    return tag_org == cp_org

# =====================================================================
# OCPP CENTRAL SYSTEM (WS)
# =====================================================================
class CentralSystemCP(CP):
    def __init__(self, cp_id, websocket):
        super().__init__(cp_id, websocket)
        self.redis = redis_client

    @on(Action.boot_notification)
    async def on_boot_notification(self, charge_point_vendor, charge_point_model, **kwargs):
        logger.info("[%s] BootNotification", self.id)
        return call_result.BootNotification(
            current_time=iso_now(),
            interval=30,
            status=RegistrationStatus.accepted
        )

    @on(Action.heartbeat)
    async def on_heartbeat(self):
        logger.info("[%s] Heartbeat", self.id)
        return call_result.Heartbeat(current_time=iso_now())

    @on(Action.status_notification)
    async def on_status_notification(self, connector_id, status, error_code, **kwargs):
        connector_id = int(connector_id)
        status_key = f"connector_status:{self.id}:{connector_id}"
        status_data = {
            "status": status,
            "error": error_code,
            "timestamp": iso_now(),
        }
        self.redis.set(status_key, json.dumps(status_data))
        return call_result.StatusNotification()

    @on(Action.authorize)
    async def on_authorize(self, id_tag, **kwargs):
        auth_store = AuthStore(AUTH_FILE)
        allowed = auth_store.contains(id_tag)
        ok = is_tag_allowed_on_cp(id_tag, self.id) if allowed else False
        status = AuthorizationStatus.accepted if ok else AuthorizationStatus.blocked
        logger.info("[%s] Authorize id_tag=%s -> %s", self.id, id_tag, status.value)
        return call_result.Authorize(id_tag_info={"status": status})

    @on(Action.start_transaction)
    async def on_start_transaction(self, connector_id, id_tag, meter_start, timestamp, **kwargs):
        # Get next transaction ID from Redis
        tx_id = self.redis.incr("next_tx_id")

        auth_store = AuthStore(AUTH_FILE)
        allowed = auth_store.contains(id_tag)
        ok = is_tag_allowed_on_cp(id_tag, self.id) if allowed else False
        status = AuthorizationStatus.accepted if ok else AuthorizationStatus.blocked

        entry = {
            "transaction_id": tx_id,
            "charge_point": self.id,
            "connectorId": int(connector_id),
            "id_tag": id_tag,
            "start_time": timestamp,
            "meter_start": meter_start,
            "stop_time": None,
            "meter_stop": None
        }

        # Store in Redis for active transactions
        tx_key = f"open_tx:{tx_id}"
        self.redis.set(tx_key, json.dumps(entry))

        # Also append to persistent storage
        try:
            txs = load_json(TRANSACTIONS_FILE, [])
            txs.append(entry)
            TRANSACTIONS_FILE.write_text(json.dumps(txs, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.error("Failed to save transaction: %s", e)

        return call_result.StartTransaction(
            transaction_id=tx_id,
            id_tag_info={"status": status}
        )

    @on(Action.stop_transaction)
    async def on_stop_transaction(self, transaction_id, meter_stop, timestamp, **kwargs):
        tx_id = int(transaction_id)
        tx_key = f"open_tx:{tx_id}"

        # Get transaction from Redis
        tx_data = self.redis.get(tx_key)
        if tx_data:
            entry = json.loads(tx_data)
            entry["stop_time"] = timestamp
            entry["meter_stop"] = meter_stop

            # Remove from active transactions
            self.redis.delete(tx_key)

            # Update persistent storage
            try:
                txs = load_json(TRANSACTIONS_FILE, [])
                for tx in txs:
                    if tx.get("transaction_id") == tx_id:
                        tx.update(entry)
                        break
                else:
                    txs.append(entry)
                TRANSACTIONS_FILE.write_text(json.dumps(txs, indent=2, ensure_ascii=False), encoding="utf-8")
            except Exception as e:
                logger.error("Failed to update transaction: %s", e)

        return call_result.StopTransaction()


async def on_connect(websocket, path):
    cp_id = path.strip("/")
    logger.info("CP connected: %s", cp_id)

    # Auto-map to default org if not mapped
    ensure_default_org()
    cps = load_json(CPS_FILE, {})
    if cp_id not in cps:
        cps[cp_id] = "default"
        CPS_FILE.write_text(json.dumps(cps, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info("CP '%s' automapped to org 'default'", cp_id)

    # Track connected CP in Redis
    redis_client.sadd("connected_cps", cp_id)

    cp = CentralSystemCP(cp_id, websocket)
    connected_clients[cp_id] = cp
    try:
        await cp.start()
    finally:
        redis_client.srem("connected_cps", cp_id)
        connected_clients.pop(cp_id, None)
        logger.info("CP disconnected: %s", cp_id)


async def main():
    await wait_for_redis()
    ensure_default_org()
    logger.info("Starting OCPP WebSocket server on port %d", OCPP_PORT)
    server = await websockets.serve(
        on_connect,
        host="0.0.0.0",
        port=OCPP_PORT,
        subprotocols=["ocpp1.6"],
        ping_interval=20,
        ping_timeout=20,
    )
    asyncio.create_task(command_worker())
    logger.info("OCPP WebSocket server ready at ws://0.0.0.0:%d/<ChargeBoxId>", OCPP_PORT)
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())
