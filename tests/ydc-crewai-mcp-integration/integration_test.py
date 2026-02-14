"""
Test crewAI integration with You.com MCP
Validates DSL and MCPServerAdapter integration patterns
"""

import os
from pathlib import Path

import pytest


class TestPathABasicDSL:
    """Test basic DSL configuration with MCPServerHTTP"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_a_basic_dsl.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_has_required_imports(self):
        """Verify code imports required modules"""
        code = self.GENERATED_FILE.read_text()

        assert "from crewai import Agent" in code, "Missing Agent import"
        assert "from crewai.mcp import MCPServerHTTP" in code, "Missing MCPServerHTTP import"
        assert "import os" in code, "Missing os import"

    def test_validates_environment_variables(self):
        """Verify code validates YDC_API_KEY"""
        code = self.GENERATED_FILE.read_text()

        assert "YDC_API_KEY" in code, "Missing YDC_API_KEY reference"
        assert "os.getenv" in code or "os.environ" in code, "Missing environment variable access"

    def test_configures_http_mcp_server(self):
        """Verify HTTP MCP server configuration"""
        code = self.GENERATED_FILE.read_text()

        assert "https://api.you.com/mcp" in code, "Missing MCP server URL"
        assert "MCPServerHTTP(" in code, "Missing MCPServerHTTP instantiation"
        assert "Authorization" in code, "Missing Authorization header"
        assert "Bearer" in code, "Missing Bearer token"

    def test_uses_mcps_field(self):
        """Verify agent uses mcps field for DSL configuration"""
        code = self.GENERATED_FILE.read_text()

        assert "mcps=" in code, "Missing mcps parameter"
        assert "Agent(" in code, "Missing Agent instantiation"

    @pytest.mark.skipif(
        not os.getenv("YDC_API_KEY"), reason="YDC_API_KEY not set - skip runtime test"
    )
    def test_runtime_initializes_agent(self):
        """Runtime: Initialize agent with MCP server"""
        import importlib.util

        spec = importlib.util.spec_from_file_location("path_a_module", self.GENERATED_FILE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        assert hasattr(module, "main"), "Missing main() function"

        # Execute main - should initialize agent without errors
        result = module.main()
        assert result == 0, "main() should return 0 on success"


class TestPathBToolFilter:
    """Test DSL configuration with tool filtering"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_b_tool_filter.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_imports_tool_filter(self):
        """Verify code imports tool filter utilities"""
        code = self.GENERATED_FILE.read_text()

        assert "from crewai.mcp.filters import create_static_tool_filter" in code, (
            "Missing tool filter import"
        )

    def test_configures_tool_filter(self):
        """Verify tool_filter is configured"""
        code = self.GENERATED_FILE.read_text()

        assert "tool_filter=" in code, "Missing tool_filter parameter"
        assert "create_static_tool_filter(" in code, "Missing create_static_tool_filter call"
        assert "allowed_tool_names=" in code, "Missing allowed_tool_names parameter"

    def test_includes_you_search_only(self):
        """Verify only you-search tool is allowed"""
        code = self.GENERATED_FILE.read_text()

        assert "you-search" in code, "Missing you-search tool"

    def test_excludes_you_contents(self):
        """Verify you-contents is not in allowed_tool_names list"""
        code = self.GENERATED_FILE.read_text()

        # Should mention you-search but not in the allowed_tool_names context
        # This is tricky - we need to verify you-contents isn't in the allowed list
        # A simple check: if tool filtering is used correctly, you-contents shouldn't
        # appear in the allowed_tool_names list
        lines = code.split("\n")
        in_allowed_tools = False
        for line in lines:
            if "allowed_tool_names" in line:
                in_allowed_tools = True
            if in_allowed_tools and "]" in line:
                # Check this section doesn't contain you-contents
                section_start = code.index("allowed_tool_names")
                section_end = code.index("]", section_start) + 1
                section = code[section_start:section_end]
                assert "you-contents" not in section, "you-contents should not be in allowed_tool_names"
                break

    @pytest.mark.skipif(
        not os.getenv("YDC_API_KEY"), reason="YDC_API_KEY not set - skip runtime test"
    )
    def test_runtime_initializes_agent_with_filter(self):
        """Runtime: Initialize agent with tool filter"""
        import importlib.util

        spec = importlib.util.spec_from_file_location("path_b_module", self.GENERATED_FILE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        result = module.main()
        assert result == 0, "main() should return 0 on success"


class TestPathCCustomKey:
    """Test DSL configuration with custom API key"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_c_custom_key.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_uses_custom_environment_variable(self):
        """Verify code uses CUSTOM_YDC_KEY"""
        code = self.GENERATED_FILE.read_text()

        assert "CUSTOM_YDC_KEY" in code, "Missing CUSTOM_YDC_KEY reference"
        assert "os.getenv" in code or "os.environ" in code, "Missing environment variable access"

    def test_does_not_use_standard_env_var(self):
        """Verify code doesn't use YDC_API_KEY directly"""
        code = self.GENERATED_FILE.read_text()

        # Should use CUSTOM_YDC_KEY, not YDC_API_KEY
        assert "CUSTOM_YDC_KEY" in code, "Should use custom key"
        # It's OK if YDC_API_KEY appears in comments/docstrings, but not in getenv
        lines = [line for line in code.split("\n") if "getenv" in line and not line.strip().startswith("#")]
        for line in lines:
            if "getenv" in line:
                assert "YDC_API_KEY" not in line, f"Should not use YDC_API_KEY in getenv: {line}"

    def test_validates_custom_key(self):
        """Verify code validates custom environment variable"""
        code = self.GENERATED_FILE.read_text()

        assert "CUSTOM_YDC_KEY" in code, "Missing custom key reference"
        # Should have validation logic
        assert any(keyword in code for keyword in ["if not", "raise", "ValueError"]), (
            "Missing validation logic"
        )

    @pytest.mark.skipif(
        not os.getenv("YDC_API_KEY"), reason="YDC_API_KEY not set - skip runtime test"
    )
    def test_runtime_uses_custom_key(self):
        """Runtime: Initialize agent with custom API key"""
        import importlib.util

        # Set custom env var
        os.environ["CUSTOM_YDC_KEY"] = os.getenv("YDC_API_KEY")

        try:
            spec = importlib.util.spec_from_file_location("path_c_module", self.GENERATED_FILE)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            result = module.main()
            assert result == 0, "main() should return 0 on success"
        finally:
            # Cleanup
            if "CUSTOM_YDC_KEY" in os.environ:
                del os.environ["CUSTOM_YDC_KEY"]


class TestPathDAdapter:
    """Test MCPServerAdapter integration"""

    GENERATED_FILE = Path(__file__).parent / "generated" / "path_d_adapter.py"

    def test_generated_code_exists(self):
        """Verify generated code file exists"""
        assert self.GENERATED_FILE.exists(), f"Generated file not found: {self.GENERATED_FILE}"

    def test_imports_mcp_adapter(self):
        """Verify code imports MCPServerAdapter"""
        code = self.GENERATED_FILE.read_text()

        assert "from crewai_tools import MCPServerAdapter" in code, (
            "Missing MCPServerAdapter import"
        )

    def test_configures_server_params(self):
        """Verify server_params dictionary is configured"""
        code = self.GENERATED_FILE.read_text()

        assert "server_params" in code, "Missing server_params variable"
        assert "https://api.you.com/mcp" in code, "Missing MCP server URL"
        assert "transport" in code, "Missing transport configuration"
        assert "streamable-http" in code or '"http"' in code, "Missing transport value"
        assert "Authorization" in code, "Missing Authorization header"

    def test_uses_context_manager(self):
        """Verify code uses context manager pattern"""
        code = self.GENERATED_FILE.read_text()

        assert "with MCPServerAdapter" in code, "Missing context manager usage"
        assert "as tools:" in code or "as mcp_tools:" in code, "Missing tools variable"

    def test_passes_tools_to_agent(self):
        """Verify tools are passed to agent explicitly"""
        code = self.GENERATED_FILE.read_text()

        assert "tools=" in code, "Missing tools parameter"
        assert "Agent(" in code, "Missing Agent instantiation"

    @pytest.mark.skipif(
        not os.getenv("YDC_API_KEY"), reason="YDC_API_KEY not set - skip runtime test"
    )
    def test_runtime_uses_adapter(self):
        """Runtime: Initialize agent with MCPServerAdapter"""
        import importlib.util

        spec = importlib.util.spec_from_file_location("path_d_module", self.GENERATED_FILE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        result = module.main()
        assert result == 0, "main() should return 0 on success"
