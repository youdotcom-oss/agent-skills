"""
Test OpenAI Agents SDK integration with You.com MCP
Validates Hosted MCP and Streamable HTTP integration patterns
"""

import os
from pathlib import Path

import pytest


class TestPathAHosted:
    """Test Hosted MCP configuration with HostedMCPTool"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_a_hosted.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_has_required_imports(self):
        """Verify code imports required modules"""
        code = self.GENERATED_FILE.read_text()

        assert "from agents import Agent" in code, "Missing Agent import"
        assert "from agents import Runner" in code or "from agents import" in code, (
            "Missing Runner import"
        )
        assert "from agents.mcp import HostedMCPTool" in code, "Missing HostedMCPTool import"
        assert "import asyncio" in code, "Missing asyncio import"
        assert "import os" in code, "Missing os import"

    def test_validates_environment_variables(self):
        """Verify code validates both YDC_API_KEY and OPENAI_API_KEY"""
        code = self.GENERATED_FILE.read_text()

        assert "YDC_API_KEY" in code, "Missing YDC_API_KEY reference"
        assert "OPENAI_API_KEY" in code, "Missing OPENAI_API_KEY reference"
        assert "os.getenv" in code or "os.environ" in code, "Missing environment variable access"

    def test_configures_hosted_mcp(self):
        """Verify Hosted MCP configuration"""
        code = self.GENERATED_FILE.read_text()

        assert "https://api.you.com/mcp" in code, "Missing MCP server URL"
        assert "HostedMCPTool(" in code, "Missing HostedMCPTool instantiation"
        assert "Authorization" in code, "Missing Authorization header"
        assert "Bearer" in code, "Missing Bearer token"
        assert "server_label" in code or "server_url" in code, "Missing MCP server configuration"

    def test_uses_tools_parameter(self):
        """Verify agent uses tools parameter for Hosted MCP"""
        code = self.GENERATED_FILE.read_text()

        assert "tools=" in code, "Missing tools parameter"
        assert "Agent(" in code, "Missing Agent instantiation"

    @pytest.mark.skipif(
        not (os.getenv("YDC_API_KEY") and os.getenv("OPENAI_API_KEY")),
        reason="API keys not set - skip runtime test",
    )
    def test_runtime_initializes_agent(self):
        """Runtime: Initialize agent with Hosted MCP"""
        import importlib.util

        spec = importlib.util.spec_from_file_location("path_a_module", self.GENERATED_FILE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        assert hasattr(module, "main"), "Missing main() function"

        # Note: Full execution requires async context
        # Just verify imports work without errors


class TestPathBStreamable:
    """Test Streamable HTTP configuration with MCPServerStreamableHttp"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_b_streamable.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_imports_streamable_http(self):
        """Verify code imports MCPServerStreamableHttp"""
        code = self.GENERATED_FILE.read_text()

        assert "from agents.mcp import MCPServerStreamableHttp" in code, (
            "Missing MCPServerStreamableHttp import"
        )

    def test_configures_streamable_http(self):
        """Verify Streamable HTTP server configuration"""
        code = self.GENERATED_FILE.read_text()

        assert "MCPServerStreamableHttp(" in code, "Missing MCPServerStreamableHttp instantiation"
        assert "https://api.you.com/mcp" in code, "Missing MCP server URL"
        assert "params=" in code or "url=" in code, "Missing server params"
        assert "Authorization" in code, "Missing Authorization header"

    def test_uses_async_context_manager(self):
        """Verify code uses async context manager"""
        code = self.GENERATED_FILE.read_text()

        assert "async with MCPServerStreamableHttp" in code, "Missing async context manager"
        assert "as server:" in code, "Missing context manager variable"

    def test_uses_mcp_servers_parameter(self):
        """Verify agent uses mcp_servers parameter"""
        code = self.GENERATED_FILE.read_text()

        assert "mcp_servers=" in code, "Missing mcp_servers parameter"
        assert "Agent(" in code, "Missing Agent instantiation"

    @pytest.mark.skipif(
        not (os.getenv("YDC_API_KEY") and os.getenv("OPENAI_API_KEY")),
        reason="API keys not set - skip runtime test",
    )
    def test_runtime_imports_work(self):
        """Runtime: Verify imports work correctly"""
        import importlib.util

        spec = importlib.util.spec_from_file_location("path_b_module", self.GENERATED_FILE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        assert hasattr(module, "main"), "Missing main() function"


class TestPathCCustomKeys:
    """Test Hosted MCP with custom environment variables"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_c_custom_keys.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_uses_custom_environment_variables(self):
        """Verify code uses custom environment variable names"""
        code = self.GENERATED_FILE.read_text()

        assert "CUSTOM_YDC_KEY" in code, "Missing CUSTOM_YDC_KEY reference"
        assert "CUSTOM_OPENAI_KEY" in code, "Missing CUSTOM_OPENAI_KEY reference"
        assert "os.getenv" in code or "os.environ" in code, "Missing environment variable access"

    def test_does_not_use_standard_env_vars(self):
        """Verify code doesn't use standard environment variable names"""
        code = self.GENERATED_FILE.read_text()

        # Should use custom keys
        assert "CUSTOM_YDC_KEY" in code, "Should use custom YDC key"
        assert "CUSTOM_OPENAI_KEY" in code, "Should use custom OpenAI key"

        # Check that standard names aren't used in getenv calls
        lines = [
            line
            for line in code.split("\n")
            if "getenv" in line and not line.strip().startswith("#")
        ]
        for line in lines:
            if "getenv" in line:
                assert 'YDC_API_KEY"' not in line or "CUSTOM" in line, (
                    f"Should not use YDC_API_KEY in getenv: {line}"
                )
                assert 'OPENAI_API_KEY"' not in line or "CUSTOM" in line, (
                    f"Should not use OPENAI_API_KEY in getenv: {line}"
                )

    def test_validates_custom_keys(self):
        """Verify code validates custom environment variables"""
        code = self.GENERATED_FILE.read_text()

        assert "CUSTOM_YDC_KEY" in code, "Missing custom YDC key reference"
        assert "CUSTOM_OPENAI_KEY" in code, "Missing custom OpenAI key reference"
        # Should have validation logic
        assert any(keyword in code for keyword in ["if not", "raise", "ValueError"]), (
            "Missing validation logic"
        )

    @pytest.mark.skipif(
        not os.getenv("YDC_API_KEY"), reason="YDC_API_KEY not set - skip runtime test"
    )
    def test_runtime_uses_custom_keys(self):
        """Runtime: Verify custom keys are used"""
        import importlib.util

        # Set custom env vars
        os.environ["CUSTOM_YDC_KEY"] = os.getenv("YDC_API_KEY")
        os.environ["CUSTOM_OPENAI_KEY"] = os.getenv("OPENAI_API_KEY", "test-key")

        try:
            spec = importlib.util.spec_from_file_location("path_c_module", self.GENERATED_FILE)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            assert hasattr(module, "main"), "Missing main() function"
        finally:
            # Cleanup
            if "CUSTOM_YDC_KEY" in os.environ:
                del os.environ["CUSTOM_YDC_KEY"]
            if "CUSTOM_OPENAI_KEY" in os.environ:
                del os.environ["CUSTOM_OPENAI_KEY"]


class TestPathDStreamableConfig:
    """Test Streamable HTTP with advanced configuration options"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_d_streamable_config.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_includes_configuration_options(self):
        """Verify advanced configuration options are present"""
        code = self.GENERATED_FILE.read_text()

        assert "cache_tools_list" in code, "Missing cache_tools_list configuration"
        assert "max_retry_attempts" in code, "Missing max_retry_attempts configuration"

    def test_includes_timeout_configuration(self):
        """Verify timeout configuration is present"""
        code = self.GENERATED_FILE.read_text()

        assert "timeout" in code, "Missing timeout configuration"

    def test_uses_streamable_http(self):
        """Verify uses MCPServerStreamableHttp"""
        code = self.GENERATED_FILE.read_text()

        assert "MCPServerStreamableHttp(" in code, "Missing MCPServerStreamableHttp instantiation"
        assert "async with" in code, "Missing async context manager"

    @pytest.mark.skipif(
        not (os.getenv("YDC_API_KEY") and os.getenv("OPENAI_API_KEY")),
        reason="API keys not set - skip runtime test",
    )
    def test_runtime_imports_work(self):
        """Runtime: Verify imports work correctly"""
        import importlib.util

        spec = importlib.util.spec_from_file_location("path_d_module", self.GENERATED_FILE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        assert hasattr(module, "main"), "Missing main() function"
