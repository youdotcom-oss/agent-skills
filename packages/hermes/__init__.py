"""You.com Hermes Agent plugin."""

from __future__ import annotations

from pathlib import Path
from typing import Any

PLUGIN_DIR = Path(__file__).parent
SKILLS_DIR = PLUGIN_DIR / "skills"


def register(ctx: Any) -> None:
    if not SKILLS_DIR.exists():
        return

    for child in sorted(SKILLS_DIR.iterdir()):
        skill = child / "SKILL.md"
        if child.is_dir() and skill.exists():
            ctx.register_skill(child.name, skill)
