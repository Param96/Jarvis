import asyncio
import logging
import threading
from client import connect_to_relay
# Import the legacy listener logic (refactored to be a module rather than a standalone script)
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../desktop-agent-legacy-python'))
try:
    from listener import listen_for_wake_word
except ImportError:
    # Dummy implementation if legacy isn't properly ported yet
    def listen_for_wake_word():
        pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JarvisDesktopAgent")

async def main():
    logger.info("Initializing Jarvis Desktop Agent Core...")
    
    # 1. Start the Wake Word / Voice Listener in a background thread
    # so it doesn't block the async event loop
    listener_thread = threading.Thread(target=listen_for_wake_word, daemon=True)
    listener_thread.start()
    logger.info("Voice listener thread started.")

    # 2. Connect to the Cloud Tunnel Relay
    # This task runs forever, maintaining the secure connection
    await connect_to_relay()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Jarvis Agent shutting down.")
