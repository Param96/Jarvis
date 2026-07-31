import asyncio
import websockets
import json
import logging
import os
import psutil
from sandbox import execute_safe_command

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JarvisTunnelClient")

DEVICE_ID = os.getenv("JARVIS_DEVICE_ID", "local-dev-machine-001")
AUTH_TOKEN = os.getenv("JARVIS_AUTH_TOKEN", "placeholder-jwt")
RELAY_WS_URL = f"ws://localhost:8001/ws/agent/{DEVICE_ID}?token={AUTH_TOKEN}"


async def stream_telemetry(ws):
    """Continuously stream local hardware metrics up the tunnel."""
    try:
        while True:
            cpu = psutil.cpu_percent(interval=None)
            ram = psutil.virtual_memory().percent
            payload = {
                "event": "telemetry",
                "device_id": DEVICE_ID,
                "metrics": {
                    "cpu": cpu,
                    "ram": ram,
                },
            }
            await ws.send(json.dumps(payload))
            await asyncio.sleep(2)  # Stream every 2 seconds
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Telemetry stream error: {e}")


async def connect_to_relay():
    retry_delay = 2
    while True:
        try:
            logger.info(f"Connecting to Cloud Relay at {RELAY_WS_URL}...")
            async with websockets.connect(RELAY_WS_URL) as ws:
                logger.info("Connected to Relay! Awaiting commands...")
                retry_delay = 2

                await ws.send(
                    json.dumps(
                        {
                            "event": "device_ready",
                            "device_id": DEVICE_ID,
                            "status": "online",
                        }
                    )
                )

                # Start background telemetry task
                telemetry_task = asyncio.create_task(stream_telemetry(ws))

                try:
                    async for message in ws:
                        payload = json.loads(message)
                        # We ignore regular acks for logging cleanliness now
                        if payload.get("event") == "ack":
                            continue

                        logger.info(f"Received Command payload: {payload}")

                        action = payload.get("action")
                        if action == "execute_shell":
                            command_args = payload.get("args", [])
                            result = execute_safe_command(command_args)
                            await ws.send(
                                json.dumps(
                                    {
                                        "event": "command_result",
                                        "request_id": payload.get("request_id"),
                                        "result": result,
                                    }
                                )
                            )
                finally:
                    telemetry_task.cancel()

        except Exception as e:
            logger.error(f"Connection lost: {e}")
            logger.info(f"Retrying in {retry_delay} seconds...")
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60)


if __name__ == "__main__":
    try:
        asyncio.run(connect_to_relay())
    except KeyboardInterrupt:
        logger.info("Shutting down Jarvis Tunnel Client.")
