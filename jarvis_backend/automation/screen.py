"""Screen capture hooks for multimodal understanding."""

import asyncio
import shutil
from pathlib import Path


class ScreenCaptureService:
    """Capture screenshots for future multimodal model analysis."""

    async def capture(self, output_path: Path) -> Path:
        """Capture the current screen to `output_path` when the host supports it."""

        output_path.parent.mkdir(parents=True, exist_ok=True)
        if shutil.which("screencapture"):
            proc = await asyncio.create_subprocess_exec(
                "screencapture",
                "-x",
                str(output_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(stderr.decode(errors="replace").strip())
            return output_path
        raise RuntimeError("No supported screenshot backend found.")
