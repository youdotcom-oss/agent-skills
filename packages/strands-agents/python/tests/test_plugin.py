"""Tests for YouDotComPlugin."""

import asyncio

import pytest
from strands import Agent
from strands.hooks import BeforeInvocationEvent

import strands_you.plugin as plugin_mod
from strands_you import YouDotComPlugin

#: The server set comes from the shipped mcp.json mirror, which the release
#: sync owns. Expectations are derived from it so a sync that adds or removes
#: a server never breaks these tests — the auth policy, not the topology, is
#: what they pin down.
ALL_SERVERS = set(plugin_mod._load_mcp_config())
KEYED_SERVERS = set(plugin_mod._API_KEY_SERVERS)
KEYLESS_SERVERS = ALL_SERVERS - KEYED_SERVERS


class _InertProvider:
    """Stands in for a real MCPClient so tests never touch the network."""

    async def load_tools(self, **kwargs):
        return []

    def add_consumer(self, registry_id):
        pass


def test_plugin_exposes_stable_name():
    """The plugin exposes its stable name."""
    plugin = YouDotComPlugin()
    assert plugin.name == "youdotcom"


def test_without_api_key_only_keyless_servers_are_enabled(monkeypatch: pytest.MonkeyPatch):
    """Without YDC_API_KEY, keyed servers are skipped and keyless ones remain."""
    monkeypatch.delenv("YDC_API_KEY", raising=False)
    plugin = YouDotComPlugin()
    assert set(plugin.servers) == KEYLESS_SERVERS


def test_with_api_key_all_servers_are_enabled(monkeypatch: pytest.MonkeyPatch):
    """With YDC_API_KEY (env or explicit), every shipped server is enabled."""
    monkeypatch.setenv("YDC_API_KEY", "test-key")
    from_env = YouDotComPlugin()
    explicit = YouDotComPlugin(api_key="explicit-key")
    assert set(from_env.servers) == ALL_SERVERS
    assert set(explicit.servers) == ALL_SERVERS


class _FakeAgent:
    """Captures tool providers the way the plugin registry would register them."""

    def __init__(self) -> None:
        self.providers: list[object] = []

        class _Registry:
            def __init__(self, outer: "_FakeAgent") -> None:
                self._outer = outer

            def process_tools(self, tools: list[object]) -> list[str]:
                self._outer.providers.extend(tools)
                return []

        self.tool_registry = _Registry(self)


def test_init_agent_registers_one_client_per_enabled_server(monkeypatch: pytest.MonkeyPatch):
    """init_agent hands one MCP client per enabled server to the tool registry,
    with a Bearer header on keyed servers and no header on keyless ones."""
    client_calls: list[dict] = []

    def fake_mcp_client(_factory=None, *, url=None, headers=None, **_kwargs):
        client_calls.append({"url": url, "headers": headers})
        return object()

    monkeypatch.setattr(plugin_mod, "MCPClient", fake_mcp_client)

    plugin = YouDotComPlugin(api_key="test-key")
    fake_agent = _FakeAgent()
    plugin.init_agent(fake_agent)  # type: ignore[arg-type]

    assert len(fake_agent.providers) == len(ALL_SERVERS)
    by_url = {call["url"]: call["headers"] for call in client_calls}
    assert len(client_calls) == len(ALL_SERVERS)
    for name, server in plugin.servers.items():
        if name in KEYED_SERVERS:
            assert by_url[server["url"]] == {"Authorization": "Bearer test-key"}
        else:
            assert by_url[server["url"]] is None


def test_attached_agent_discovers_bundled_skills_and_skills_tool(monkeypatch: pytest.MonkeyPatch):
    """An agent with the plugin gains the skills tool and sees the bundled skills."""
    monkeypatch.setattr(plugin_mod, "MCPClient", lambda *args, **kwargs: _InertProvider())

    agent = Agent(plugins=[YouDotComPlugin()])

    assert "skills" in agent.tool_registry.get_all_tools_config()
    attached = agent._plugin_registry._plugins["youdotcom"]
    # Skill discovery is lazy: the same load runs at each invocation via the
    # BeforeInvocationEvent hook. Exercise that exact path here.
    asyncio.run(attached._on_before_invocation(BeforeInvocationEvent(agent=agent)))
    names = {skill.name for skill in attached.get_available_skills(agent)}
    assert names == {"you-web", "you-research", "you-discover", "you-finance"}


def test_without_key_agent_system_prompt_notes_skipped_servers(monkeypatch: pytest.MonkeyPatch):
    """Without a key the agent's system prompt says which servers are unavailable."""
    monkeypatch.delenv("YDC_API_KEY", raising=False)
    monkeypatch.setattr(plugin_mod, "MCPClient", lambda *args, **kwargs: _InertProvider())

    agent = Agent(plugins=[YouDotComPlugin()])
    attached = agent._plugin_registry._plugins["youdotcom"]
    # The registry runs every callback registered for the event; replicate that
    # ordering here: the inherited skills hook, then the capability-note hook.
    asyncio.run(attached._on_before_invocation(BeforeInvocationEvent(agent=agent)))
    asyncio.run(attached._on_before_invocation_note(BeforeInvocationEvent(agent=agent)))

    assert "YDC_API_KEY" in agent.system_prompt
    for name in KEYED_SERVERS:  # servers the agent can NOT call
        assert name in agent.system_prompt


def test_with_key_agent_system_prompt_has_no_capability_note(monkeypatch: pytest.MonkeyPatch):
    """With a key present, no capability note is injected."""
    monkeypatch.setenv("YDC_API_KEY", "test-key")
    monkeypatch.setattr(plugin_mod, "MCPClient", lambda *args, **kwargs: _InertProvider())

    agent = Agent(plugins=[YouDotComPlugin()])
    attached = agent._plugin_registry._plugins["youdotcom"]
    asyncio.run(attached._on_before_invocation(BeforeInvocationEvent(agent=agent)))
    asyncio.run(attached._on_before_invocation_note(BeforeInvocationEvent(agent=agent)))

    assert "YDC_API_KEY" not in agent.system_prompt
