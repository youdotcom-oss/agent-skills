import os

import pytest


@pytest.mark.timeout(120)
def test_path_a_research():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    from path_a_research import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text


@pytest.mark.timeout(60)
def test_path_b_search_contents():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    from path_b_search_contents import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
