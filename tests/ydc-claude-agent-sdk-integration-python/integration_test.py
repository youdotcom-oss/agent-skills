"""
YDC Claude Agent SDK Integration Tests

Tests the ydc-claude-agent-sdk-integration skill by validating generated Python code.
Each test path corresponds to a prompt scenario documented in PROMPTS.md.

Environment variables loaded from .env at project root.
"""

import os
from pathlib import Path

import pytest

# Test configuration
GENERATED_DIR = Path(__file__).parent / "generated"


class TestPathA:
    """Path A: Basic HTTP MCP Integration"""

    @pytest.fixture
    def generated_file(self) -> Path:
        return GENERATED_DIR / "path_a_basic.py"

    def test_file_exists(self, generated_file: Path):
        """Verify generated code exists"""
        assert generated_file.exists(), f"Expected file not found: {generated_file}"

    def test_has_required_imports(self, generated_file: Path):
        """Verify required imports are present"""
        assert generated_file.exists()
        code = generated_file.read_text()

        assert "from claude_agent_sdk import" in code
        assert "query" in code
        assert "ClaudeAgentOptions" in code
        assert "import asyncio" in code

    def test_validates_environment_variables(self, generated_file: Path):
        """Verify environment variable validation"""
        assert generated_file.exists()
        code = generated_file.read_text()

        assert 'os.getenv("YDC_API_KEY")' in code or "YDC_API_KEY" in code
        assert 'os.getenv("ANTHROPIC_API_KEY")' in code or "ANTHROPIC_API_KEY" in code

    def test_configures_http_mcp_server(self, generated_file: Path):
        """Verify HTTP MCP server configuration"""
        assert generated_file.exists()
        code = generated_file.read_text()

        assert "mcp_servers" in code
        assert "https://api.you.com/mcp" in code
        assert "Authorization" in code
        assert "Bearer" in code

    def test_includes_allowed_tools(self, generated_file: Path):
        """Verify allowed_tools configuration"""
        assert generated_file.exists()
        code = generated_file.read_text()

        assert "allowed_tools" in code
        assert "mcp__ydc__you_search" in code

    @pytest.mark.asyncio
    async def test_runtime_execution(self, generated_file: Path):
        """Test runtime execution with actual HTTP MCP server"""
        # Validate environment
        ydc_key = os.getenv("YDC_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        assert ydc_key, "YDC_API_KEY not found in environment"
        assert anthropic_key, "ANTHROPIC_API_KEY not found in environment"

        # Dynamic import
        import importlib.util

        spec = importlib.util.spec_from_file_location("path_a", generated_file)
        assert spec and spec.loader, "Failed to load module spec"

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        assert hasattr(module, "main"), "Generated module must export main() function"

        # Execute main function with a web search query
        result = await module.main('What are the latest developments in artificial intelligence?')

        assert result is not None, "Expected non-None result from main()"
        assert isinstance(result, str), "Expected string result from search"
        assert len(result) > 0, "Expected non-empty search result"
        assert any(word in result.lower() for word in ['ai', 'artificial', 'intelligence', 'model', 'development', 'research']), \
            "Expected search result to contain AI-related content"


class TestPathB:
    """Path B: Allowed Tools Configuration"""

    @pytest.fixture
    def generated_file(self) -> Path:
        return GENERATED_DIR / "path_b_tools.py"

    def test_file_exists(self, generated_file: Path):
        """Verify generated code exists"""
        assert generated_file.exists(), f"Expected file not found: {generated_file}"

    def test_configures_specific_tools(self, generated_file: Path):
        """Verify specific tools configuration"""
        assert generated_file.exists()
        code = generated_file.read_text()

        assert "allowed_tools" in code
        assert "mcp__ydc__you_search" in code
        # Should only include search, not contents
        lines_with_tools = [
            line for line in code.split("\n") if "allowed_tools" in line or "mcp__ydc" in line
        ]
        tools_section = "\n".join(lines_with_tools)
        assert "mcp__ydc__you_search" in tools_section
        assert "mcp__ydc__you_contents" not in tools_section, \
            "you_contents should not be in allowed_tools for search-only path"

    @pytest.mark.asyncio
    async def test_runtime_with_limited_tools(self, generated_file: Path):
        """Test runtime execution with limited tool set"""
        ydc_key = os.getenv("YDC_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        assert ydc_key, "YDC_API_KEY not found in environment"
        assert anthropic_key, "ANTHROPIC_API_KEY not found in environment"

        import importlib.util

        spec = importlib.util.spec_from_file_location("path_b", generated_file)
        assert spec and spec.loader

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        result = await module.main('What are the latest developments in artificial intelligence?')

        assert result is not None
        assert isinstance(result, str), "Expected string result from search"
        assert len(result) > 0, "Expected non-empty search result"
        assert any(word in result.lower() for word in ['ai', 'artificial', 'intelligence', 'model', 'development', 'research']), \
            "Expected search result to contain AI-related content"


class TestPathC:
    """Path C: Custom API Key Handling"""

    @pytest.fixture
    def generated_file(self) -> Path:
        return GENERATED_DIR / "path_c_custom_keys.py"

    def test_file_exists(self, generated_file: Path):
        """Verify generated code exists"""
        assert generated_file.exists(), f"Expected file not found: {generated_file}"

    def test_uses_custom_environment_variables(self, generated_file: Path):
        """Verify custom environment variable names"""
        assert generated_file.exists()
        code = generated_file.read_text()

        assert "CUSTOM_YDC_KEY" in code
        assert "CUSTOM_ANTHROPIC_KEY" in code

    @pytest.mark.asyncio
    async def test_runtime_with_custom_keys(self, generated_file: Path):
        """Test runtime execution with custom API keys"""
        # Set custom env vars from standard ones
        os.environ["CUSTOM_YDC_KEY"] = os.getenv("YDC_API_KEY", "")
        os.environ["CUSTOM_ANTHROPIC_KEY"] = os.getenv("ANTHROPIC_API_KEY", "")

        assert os.environ["CUSTOM_YDC_KEY"], "CUSTOM_YDC_KEY not set"
        assert os.environ["CUSTOM_ANTHROPIC_KEY"], "CUSTOM_ANTHROPIC_KEY not set"

        try:
            import importlib.util

            spec = importlib.util.spec_from_file_location("path_c", generated_file)
            assert spec and spec.loader

            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            result = await module.main('What are the latest developments in artificial intelligence?')

            assert result is not None
            assert isinstance(result, str), "Expected string result from search"
            assert len(result) > 0, "Expected non-empty search result"
            assert any(word in result.lower() for word in ['ai', 'artificial', 'intelligence', 'model', 'development', 'research']), \
                "Expected search result to contain AI-related content"
        finally:
            # Cleanup
            del os.environ["CUSTOM_YDC_KEY"]
            del os.environ["CUSTOM_ANTHROPIC_KEY"]


class TestPathD:
    """Path D: Model Selection"""

    @pytest.fixture
    def generated_file(self) -> Path:
        return GENERATED_DIR / "path_d_haiku.py"

    def test_file_exists(self, generated_file: Path):
        """Verify generated code exists"""
        assert generated_file.exists(), f"Expected file not found: {generated_file}"

    def test_uses_haiku_model(self, generated_file: Path):
        """Verify Haiku model configuration"""
        assert generated_file.exists()
        code = generated_file.read_text()

        assert "model=" in code or "model =" in code
        assert "haiku" in code.lower()

    @pytest.mark.asyncio
    async def test_runtime_with_haiku_model(self, generated_file: Path):
        """Test runtime execution with Haiku model"""
        ydc_key = os.getenv("YDC_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        assert ydc_key, "YDC_API_KEY not found in environment"
        assert anthropic_key, "ANTHROPIC_API_KEY not found in environment"

        import importlib.util

        spec = importlib.util.spec_from_file_location("path_d", generated_file)
        assert spec and spec.loader

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        result = await module.main('What are the latest developments in artificial intelligence?')

        assert result is not None
        assert isinstance(result, str), "Expected string result from search"
        assert len(result) > 0, "Expected non-empty search result"
        assert any(word in result.lower() for word in ['ai', 'artificial', 'intelligence', 'model', 'development', 'research']), \
            "Expected search result to contain AI-related content"
