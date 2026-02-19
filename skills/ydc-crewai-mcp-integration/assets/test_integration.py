import os


def test_path_a_basic_dsl():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    from path_a_basic_dsl import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text


def test_path_b_tool_filter():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    from path_b_tool_filter import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
