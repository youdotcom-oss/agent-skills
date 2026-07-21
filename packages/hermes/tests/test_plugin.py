from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("hermes_youdotcom", PACKAGE_ROOT / "__init__.py")
if spec is None or spec.loader is None:
    msg = "Unable to load hermes_youdotcom module"
    raise ImportError(msg)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

register = module.register


class PluginContext:
    def __init__(self) -> None:
        self.skills: list[tuple[str, Path]] = []

    def register_skill(self, name: str, path: Path) -> None:
        self.skills.append((name, path))


class HermesYoudotcomPluginTest(unittest.TestCase):
    def test_registers_packaged_skills(self) -> None:
        ctx = PluginContext()

        register(ctx)

        expected_skills = {
            child.name
            for child in (PACKAGE_ROOT / "skills").iterdir()
            if child.is_dir() and (child / "SKILL.md").exists()
        }
        skills = dict(ctx.skills)
        self.assertEqual(set(skills), expected_skills)
        for path in skills.values():
            self.assertTrue(path.is_file())


if __name__ == "__main__":
    unittest.main()
