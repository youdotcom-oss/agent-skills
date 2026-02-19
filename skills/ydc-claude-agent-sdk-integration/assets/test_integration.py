import os


def test_path_a_basic():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    assert os.environ.get("ANTHROPIC_API_KEY"), "ANTHROPIC_API_KEY is required"
    import asyncio

    from path_a_basic import main

    result = asyncio.run(main("Search the web for the three branches of the US government"))
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
