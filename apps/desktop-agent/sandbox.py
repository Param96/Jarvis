import subprocess
import logging

logger = logging.getLogger("JarvisSandbox")

# Highly restricted list of allowed commands for the initial v1 agent
ALLOWED_COMMANDS = [
    "echo",
    "ls",
    "pwd",
    "whoami",
    "date",
    "uptime"
]

def execute_safe_command(command_args: list[str]) -> dict:
    """
    Executes a shell command safely.
    Rejects any command not explicitly whitelisted.
    """
    if not command_args:
        return {"error": "Empty command"}
        
    base_cmd = command_args[0]
    if base_cmd not in ALLOWED_COMMANDS:
        logger.warning(f"BLOCKED: Attempted to run unauthorized command: {base_cmd}")
        return {"error": f"Command '{base_cmd}' is not allowed in sandbox mode."}

    try:
        logger.info(f"Executing: {' '.join(command_args)}")
        result = subprocess.run(
            command_args,
            capture_output=True,
            text=True,
            timeout=10 # Prevent hanging commands
        )
        
        return {
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command execution timed out."}
    except Exception as e:
        return {"error": f"Execution failed: {str(e)}"}
