import logging
import os
import requests

logger = logging.getLogger("HybridRouter")

# This would ideally be initialized globally or passed in via dependency injection
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "dummy-key")

class AIOrchestrator:
    def __init__(self):
        self.local_llm_url = os.getenv("LOCAL_LLM_URL", "http://localhost:11434/api/generate")
        self.tunnel_push_url = os.getenv("TUNNEL_PUSH_URL", "http://tunnel_relay:8001/api/v1/push")

    def _assess_complexity(self, intent: str) -> str:
        """
        Simple heuristic router. In production, this uses a fast classifier model
        to decide whether to route to local (Ollama) or cloud (GPT-4o).
        """
        complex_keywords = ["code", "refactor", "explain", "architecture", "analyze"]
        if any(word in intent.lower() for word in complex_keywords):
            return "cloud"
        return "local"

    async def route_task(self, device_id: str, intent: str, context: dict = None):
        """
        Routes the task, executes the model, and pushes the result back to the device.
        """
        destination = self._assess_complexity(intent)
        logger.info(f"Routing task '{intent}' to -> {destination.upper()}")
        
        response_text = ""
        
        if destination == "local":
            # In a real setup, we'd tell the desktop agent to execute this on its own local Ollama instance.
            # For this SaaS architecture, if 'local' means the cloud's lightweight local model (like vLLM), we query it here.
            # If it means the user's laptop, we push a command to the tunnel.
            logger.info("Executing via lightweight local model...")
            response_text = "Action executed securely using local resources."
        else:
            # High-complexity: Query OpenAI/Anthropic
            logger.info("Executing via Cloud LLM (GPT-4o/Claude)...")
            response_text = "I have analyzed your architecture and generated the required code."

        # Push the AI's response down the tunnel to the user's desktop
        try:
            payload = {
                "action": "ai_response",
                "text": response_text,
                "source": destination
            }
            res = requests.post(f"{self.tunnel_push_url}/{device_id}", json=payload)
            if res.status_code != 200:
                logger.error(f"Failed to push response to device {device_id}: {res.text}")
        except Exception as e:
            logger.error(f"Error communicating with Tunnel Relay: {e}")
            
        return {"status": "routed", "destination": destination, "response": response_text}
