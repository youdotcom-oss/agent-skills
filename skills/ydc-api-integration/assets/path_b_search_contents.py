import os

import requests

YDC_API_KEY = os.environ.get("YDC_API_KEY")
if not YDC_API_KEY:
    raise RuntimeError("YDC_API_KEY environment variable is required")

HEADERS = {"X-API-Key": YDC_API_KEY}


def search(query: str) -> dict:
    resp = requests.get(
        "https://ydc-index.io/v1/search",
        params={"query": query},
        headers=HEADERS,
    )
    resp.raise_for_status()
    return resp.json()


def get_contents(urls: list[str]) -> list[dict]:
    resp = requests.post(
        "https://ydc-index.io/v1/contents",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={"urls": urls, "formats": ["markdown"]},
    )
    resp.raise_for_status()
    return resp.json()


def main(query: str) -> str:
    data = search(query)
    results = data.get("results", {})
    web_urls = [r["url"] for r in results.get("web", [])]
    news_urls = [r["url"] for r in results.get("news", [])]
    urls = (web_urls + news_urls)[:3]
    if not urls:
        return "No results found"
    contents = get_contents(urls)
    return "\n\n---\n\n".join(
        f"# {c['title']}\n{c.get('markdown') or 'No content'}" for c in contents
    )


if __name__ == "__main__":
    print(main("Search the web for the three branches of the US government"))
