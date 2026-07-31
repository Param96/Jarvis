import logging
import os
import requests

logger = logging.getLogger("HybridRouter")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "dummy-key")


class AIOrchestrator:
    def __init__(self):
        self.local_llm_url = os.getenv(
            "LOCAL_LLM_URL", "http://host.docker.internal:11434/api/generate"
        )
        self.tunnel_push_url = os.getenv(
            "TUNNEL_PUSH_URL", "http://tunnel_relay:8001/api/v1/push"
        )

    def _assess_complexity(self, intent: str) -> str:
        """
        Smart 4-Tier Router
        """
        intent_lower = intent.lower()

        # Tier 4: Cloud
        cloud_keywords = ["architecture", "system design", "internet", "search"]
        if any(word in intent_lower for word in cloud_keywords):
            return "GPT-4o"

        # Tier 3: Heavy Logic
        heavy_keywords = ["analyze", "summarize", "explain", "why"]
        if any(word in intent_lower for word in heavy_keywords):
            return "qwen2.5:7b"

        # Tier 2: Coding
        coding_keywords = ["code", "refactor", "script", "terminal", "hack"]
        if any(word in intent_lower for word in coding_keywords):
            return "qwen2.5-coder:3b"

        # Tier 1: Chat/Fallback
        return "llama3.2:latest"

    async def route_task(
        self,
        device_id: str,
        intent: str,
        context: dict = None,
        model_override: str = None,
    ):
        if model_override and model_override != "Auto":
            target_model = model_override
        else:
            target_model = self._assess_complexity(intent)

        logger.info(f"Routing task '{intent}' to -> {target_model}")

        response_text = ""

        if target_model == "GPT-4o" or target_model.startswith("OpenRouter"):
            logger.info("Executing via Cloud LLM (OpenRouter)...")
            openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
            try:
                res = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_key}",
                    },
                    json={
                        "model": "openrouter/free",
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are Jarvis, an advanced AI assistant. Reply concisely in 1-2 short sentences.",
                            },
                            {"role": "user", "content": intent},
                        ],
                    },
                    timeout=30,
                )
                if res.status_code == 200:
                    response_text = res.json()["choices"][0]["message"]["content"]
                    target_model = "OpenRouter (Free Auto)"
                else:
                    logger.error(f"OpenRouter error: {res.status_code} {res.text}")
                    response_text = (
                        "My cloud connection to OpenRouter encountered an error."
                    )
            except Exception as e:
                logger.error(f"Failed to connect to OpenRouter: {e}")
                response_text = "I cannot reach the cloud reasoning engine right now."
        else:
            logger.info(f"Executing via lightweight local model ({target_model})...")
            try:
                res = requests.post(
                    self.local_llm_url,
                    json={
                        "model": target_model,
                        "prompt": f"You are Jarvis, a concise AI assistant. Reply in 1-2 short sentences. User says: {intent}",
                        "stream": False,
                    },
                    timeout=30,
                )

                if res.status_code == 200:
                    response_text = res.json().get("response", "Action executed.")
                else:
                    logger.error(f"Ollama error: {res.status_code} {res.text}")
                    response_text = f"My local model ({target_model}) is offline. Ensure Ollama is running."
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to connect to Ollama: {e}")
                response_text = "I cannot reach my local reasoning engine. Please ensure Ollama is running."

        # Push the AI's response down the tunnel to the user's desktop
        try:
            payload = {
                "action": "ai_response",
                "text": response_text,
                "source": target_model,
            }
            res = requests.post(f"{self.tunnel_push_url}/{device_id}", json=payload)
            if res.status_code != 200:
                logger.error(
                    f"Failed to push response to device {device_id}: {res.text}"
                )
        except Exception as e:
            logger.error(f"Error communicating with Tunnel Relay: {e}")

        return {
            "status": "routed",
            "destination": target_model,
            "response": response_text,
        }
