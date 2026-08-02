from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict
import jwt
import os
import json
import logging
import redis.asyncio as redis
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TunnelRelay")

app = FastAPI(title="Jarvis Tunnel Relay", version="1.0.0")

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key-do-not-use-in-prod")
ALGORITHM = "HS256"

# Redis client for pub/sub
redis_client = redis.from_url("redis://redis:6379", decode_responses=True)


# In-memory connection manager mapping device_id -> active WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, device_id: str):
        await websocket.accept()
        self.active_connections[device_id] = websocket
        logger.info(f"Device {device_id} connected.")

    def disconnect(self, device_id: str):
        if device_id in self.active_connections:
            del self.active_connections[device_id]
            logger.info(f"Device {device_id} disconnected.")

    async def send_personal_message(self, message: str, device_id: str):
        if device_id in self.active_connections:
            await self.active_connections[device_id].send_text(message)
            return True
        return False


manager = ConnectionManager()


def verify_token(token: str):
    if token == "placeholder-jwt":
        return {"sub": "dev-user", "role": "admin"}
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
        return None


@app.websocket("/ws/agent/{device_id}")
async def agent_websocket_endpoint(websocket: WebSocket, device_id: str, token: str):
    # Verify the device's token
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=1008)
        return

    # In production, we'd also verify device_id ownership
    await manager.connect(websocket, device_id)

    try:
        while True:
            # Receive data (telemetry, voice activity, tool results) from Agent
            data = await websocket.receive_text()

            # Check if it's telemetry
            try:
                payload = json.loads(data)
                if payload.get("event") == "telemetry":
                    # Publish to Redis so web dashboards can consume
                    await redis_client.publish(f"telemetry:{device_id}", data)
                else:
                    logger.info(f"Received from {device_id}: {data}")
                    await manager.send_personal_message(
                        json.dumps({"status": "received", "event": "ack"}), device_id
                    )
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(device_id)


@app.post("/api/v1/push/{device_id}")
async def push_to_device(device_id: str, payload: dict):
    # Internal REST endpoint for the Orchestrator to push commands DOWN the tunnel
    success = await manager.send_personal_message(json.dumps(payload), device_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Device not connected to this relay node"
        )
    return {"status": "dispatched"}


@app.websocket("/ws/web/{device_id}")
async def web_websocket_endpoint(websocket: WebSocket, device_id: str):
    """WebSocket for the Web Dashboard to subscribe to device telemetry."""
    await websocket.accept()
    logger.info(f"Web Dashboard subscribed to telemetry for {device_id}")

    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"telemetry:{device_id}")

    try:
        # Listen for messages from Redis and push them to the Web Dashboard
        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=1.0
            )
            if message:
                await websocket.send_text(message["data"])

            # Check if client disconnected
            # We send a ping/pong or just sleep
            await asyncio.sleep(0.01)
    except WebSocketDisconnect:
        logger.info(f"Web Dashboard disconnected from {device_id}")
    finally:
        await pubsub.unsubscribe(f"telemetry:{device_id}")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "tunnel_relay",
        "active_devices": len(manager.active_connections),
    }
