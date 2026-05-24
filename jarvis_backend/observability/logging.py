"""Structured logging setup."""

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configure concise structured console logging."""

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        stream=sys.stdout,
        force=True,
    )
