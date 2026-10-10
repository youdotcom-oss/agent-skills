"""You.com plugin for Strands Agents.

Bundles the You.com MCP servers (from the shipped ``mcp.json``) and the You.com
Agent Skills (from the bundled ``skills/`` directory) into a single plugin:

    ```python
    from strands import Agent
    from strands_agents_youdotcom import YouDotComPlugin

    agent = Agent(plugins=[YouDotComPlugin()])
    ```

Servers that require an API key are enabled only when ``YDC_API_KEY`` (or the
explicit ``api_key`` argument) is available; keyless servers are always enabled.
"""

import json
import logging
import os
import warnings
from importlib import resources
from typing import Any

from strands.hooks import BeforeInvocationEvent
from strands.plugins import hook
from strands.tools.mcp import MCPClient
from strands.vended_plugins.skills import AgentSkills

logger = logging.getLogger(__name__)

#: Servers that authenticate with ``YDC_API_KEY``. Any server in the shipped
#: ``mcp.json`` not listed here is treated as keyless. Keying this policy by
#: server name keeps the shipped ``mcp.json`` the single source of truth for
#: server topology (urls) while auth policy stays a consumer-side concern.
_API_KEY_SERVERS = frozenset({"you", "you-finance", "you-research"})

_API_KEY_ENV_VAR = "YDC_API_KEY"

_CAPABILITY_NOTE_MARKER = "unavailable You.com MCP servers"


def _load_mcp_config() -> dict[str, dict[str, Any]]:
    """Load the shipped ``mcp.json`` and return its server entries by name."""
    mcp_config: Any = json.loads(
        resources.files("strands_agents_youdotcom").joinpath("mcp.json").read_text(encoding="utf-8")
    )
    servers: dict[str, dict[str, Any]] = mcp_config.get("mcpServers", {})
    return servers


class YouDotComPlugin(AgentSkills):
    """Strands plugin bundling You.com MCP servers and Agent Skills.

    Subclasses the SDK's ``AgentSkills`` plugin so the bundled skills are
    discovered and activated by the agent, and registers one MCP client per
    enabled server when attached to an agent.

    Args:
        api_key: You.com API key. Defaults to the ``YDC_API_KEY`` environment
            variable. When absent, servers that require a key are skipped with
            a warning and only keyless servers are enabled.
    """

    name = "youdotcom"

    def __init__(self, api_key: str | None = None) -> None:
        """Initialize the plugin from the shipped ``mcp.json``."""
        self._api_key = api_key if api_key is not None else os.environ.get(_API_KEY_ENV_VAR)
        self._all_servers = _load_mcp_config()
        self._servers = {name: server for name, server in self._all_servers.items() if self._server_enabled(name)}
        self._skipped_servers = sorted(set(self._all_servers) - set(self._servers))
        super().__init__(skills=[str(resources.files("strands_agents_youdotcom").joinpath("skills"))])

    def _server_enabled(self, name: str) -> bool:
        """Return True when the named server is usable with the current auth."""
        if name not in _API_KEY_SERVERS:
            return True
        if self._api_key:
            return True
        warnings.warn(
            f"Server {name!r} requires an API key; set YDC_API_KEY to enable it. Enabled keyless servers only.",
            stacklevel=2,
        )
        return False

    @property
    def servers(self) -> dict[str, dict[str, Any]]:
        """Enabled MCP server configs by name, as shipped in ``mcp.json``."""
        return dict(self._servers)

    def init_agent(self, agent: Any) -> None:  # type: ignore[override]  # registry supports sync init
        """Register one MCP client per enabled server with the agent.

        Args:
            agent: The agent instance the plugin is attached to.
        """
        for name, server in self._servers.items():
            headers = {"Authorization": f"Bearer {self._api_key}"} if name in _API_KEY_SERVERS else None
            client = MCPClient(url=server["url"], headers=headers)
            agent.tool_registry.process_tools([client])
            logger.debug("server=<%s> | registered MCP client", name)

    @hook  # type: ignore[call-overload]  # same as the SDK's own plugin template
    async def _on_before_invocation_note(self, event: BeforeInvocationEvent) -> None:
        """Tell the agent which servers are unavailable when no API key is set.

        Without this, an agent running keyless discovers its own capability
        boundary only by failing tool calls. Runs on every invocation; the note
        is appended once (idempotent via a stable marker).
        """
        if self._api_key or not self._skipped_servers:
            return
        note = (
            f"The following You.com MCP servers are {_CAPABILITY_NOTE_MARKER} "
            f"because no API key is configured: {', '.join(self._skipped_servers)}. "
            f"Set {_API_KEY_ENV_VAR} to enable them."
        )
        if hasattr(event.agent, "system_prompt") and _CAPABILITY_NOTE_MARKER not in (event.agent.system_prompt or ""):
            event.agent.system_prompt = (event.agent.system_prompt or "") + "\n\n" + note
