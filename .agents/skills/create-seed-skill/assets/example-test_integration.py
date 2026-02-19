import os


def test_path_a_basic():
    assert os.environ.get("MY_API_KEY"), "MY_API_KEY is required"
    from path_a_basic import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text


def test_path_b_extended():
    assert os.environ.get("MY_API_KEY"), "MY_API_KEY is required"
    from path_b_extended import main

    result = main("Search the web for the three branches of the US government")
    text = result.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
