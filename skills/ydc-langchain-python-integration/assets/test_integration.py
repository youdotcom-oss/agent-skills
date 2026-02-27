import os


def test_path_a_retriever():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    from path_a_retriever import docs

    assert len(docs) > 0
    text = "\n".join(doc.page_content for doc in docs).lower()
    assert "legislative" in text or "congress" in text
    assert "executive" in text or "president" in text
    assert "judicial" in text or "court" in text
    for doc in docs:
        assert doc.metadata.get("url")


def test_path_b_agent():
    assert os.environ.get("YDC_API_KEY"), "YDC_API_KEY is required"
    assert os.environ.get("OPENAI_API_KEY"), "OPENAI_API_KEY is required"
    from path_b_agent import final_message

    text = final_message.lower()
    assert "legislative" in text
    assert "executive" in text
    assert "judicial" in text
