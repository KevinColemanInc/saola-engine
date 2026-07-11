#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from regulatory_ingest.fetcher import DEFAULT_URL, fetch_regulation


async def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch a regulation as JSON")
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--output", default="data/regulation.json")
    args = parser.parse_args()

    result = await fetch_regulation(args.url)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"saved {result['title']} to {output}"
    )


if __name__ == "__main__":
    asyncio.run(main())
