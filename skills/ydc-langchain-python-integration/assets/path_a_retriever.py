import os

from langchain_youdotcom import YouRetriever

if not os.getenv("YDC_API_KEY"):
    raise ValueError("YDC_API_KEY environment variable is required")

retriever = YouRetriever(k=5, livecrawl="web")

docs = retriever.invoke("What are the three branches of the US government?")

for doc in docs:
    print(doc.metadata.get("title", ""))
    print(doc.page_content[:200])
    print(doc.metadata.get("url", ""))
    print("---")
