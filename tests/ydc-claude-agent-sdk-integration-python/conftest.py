"""
Pytest configuration for YDC Claude Agent SDK integration tests
Loads environment variables from project root .env file
"""

import os
from pathlib import Path


def pytest_configure(config):
    """
    Load environment variables from .env file at project root before running tests

    Also unsets CLAUDECODE environment variable to allow Claude Agent SDK
    to run inside Claude Code without triggering nested session protection
    """
    # Find project root (.env is at /Users/edward/Workspace/agent-skills/.env)
    test_dir = Path(__file__).parent
    project_root = test_dir.parent.parent

    env_file = project_root / ".env"

    if env_file.exists():
        # Simple .env parser (key=value format)
        with env_file.open() as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key] = value

    # Unset CLAUDECODE to allow Claude Agent SDK to run inside Claude Code
    # This bypasses the nested session protection for testing purposes
    if "CLAUDECODE" in os.environ:
        del os.environ["CLAUDECODE"]
