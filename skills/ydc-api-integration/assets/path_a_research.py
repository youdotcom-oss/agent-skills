import os

import requests

YDC_API_KEY = os.environ.get("YDC_API_KEY")
if not YDC_API_KEY:
    raise RuntimeError("YDC_API_KEY environment variable is required")


def research(query: str, effort: str = "standard") -> dict:
    resp = requests.post(
        "https://api.you.com/v1/research",
        headers={"X-API-Key": YDC_API_KEY, "Content-Type": "application/json"},
        json={"input": query, "research_effort": effort},
    )
    if not resp.ok:
        raise RuntimeError(f"Research API error {resp.status_code}: {resp.text}")
    return resp.json()


def main(query: str) -> str:
    data = research(query)
    return data["output"]["content"]


if __name__ == "__main__":
    print(main("Search the web for the three branches of the US government"))
