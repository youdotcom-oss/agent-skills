import asyncio
import os


def test_path_a_hosted():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    assert os.environ.get("OPENAI_API_KEY"), "OPENAI_API_KEY is required"
    from path_a_hosted import main

    result = asyncio.run(main("Search the web for the three branches of the US government"))
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
