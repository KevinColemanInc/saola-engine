from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup, Tag

DEFAULT_URL = (
    "https://xaydungchinhsach.chinhphu.vn/"
    "toan-van-nghi-quyet-so-5-2025-nq-cp-ve-trien-khai-thi-diem-thi-truong-"
    "tai-san-ma-hoa-tai-viet-nam-119250909184045221.htm"
)

ARTICLE_RE = re.compile(r"^Điều\s+(\d+)\.\s*(.*)$", re.IGNORECASE)
CHAPTER_RE = re.compile(r"^Chương\s+([IVXLCDM]+|\d+)\b", re.IGNORECASE)
DATE_RE = re.compile(r"ngày\s+(\d{1,2})/(\d{1,2})/(\d{4})", re.IGNORECASE)


class FetchError(RuntimeError):
    pass


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _content_root(soup: BeautifulSoup) -> Tag:
    selectors = (
        ".detail-content",
        ".detail__content",
        ".article-content",
        ".content-detail",
        "article",
        "main",
    )
    for selector in selectors:
        node = soup.select_one(selector)
        if isinstance(node, Tag) and "Điều 1" in node.get_text(" ", strip=True):
            return node
    return soup.body or soup


def _effective_datetime(text: str) -> str:
    match = DATE_RE.search(text)
    if not match:
        raise FetchError("Could not determine the regulation effective date")
    day, month, year = map(int, match.groups())
    vietnam_time = timezone(timedelta(hours=7))
    return datetime(year, month, day, tzinfo=vietnam_time).isoformat()


def parse_regulation(html: str, source_url: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    root = _content_root(soup)
    page_title = _clean((soup.find("h1") or soup.title).get_text(" ", strip=True))
    all_text = _clean(root.get_text(" ", strip=True))
    chapters: list[dict[str, Any]] = []
    articles: list[dict[str, Any]] = []
    current_chapter: dict[str, Any] | None = None
    current_article: dict[str, Any] | None = None
    preamble: list[str] = []

    for node in root.find_all(["h2", "h3", "h4", "p", "li"]):
        text = _clean(node.get_text(" ", strip=True))
        if not text or text in {"Chia sẻ", "Gọi tổng đài", "Đóng"}:
            continue

        chapter_match = CHAPTER_RE.match(text)
        if chapter_match:
            current_chapter = {
                "number": chapter_match.group(1),
                "title": text,
            }
            chapters.append(current_chapter)
            current_article = None
            continue

        article_match = ARTICLE_RE.match(text)
        if article_match:
            article_number = int(article_match.group(1))
            # The page includes appendix templates whose own articles restart at 1.
            # Keep the resolution body separate from those form definitions.
            if articles and article_number <= articles[-1]["number"]:
                break
            current_article = {
                "number": article_number,
                "title": article_match.group(2).strip(),
                "chapter": current_chapter["number"] if current_chapter else None,
                "paragraphs": [],
            }
            articles.append(current_article)
            continue

        if (
            current_chapter
            and not current_article
            and node.name in {"h2", "h3", "h4"}
            and text.upper() == text
        ):
            current_chapter["title"] = text
            continue

        if current_article:
            current_article["paragraphs"].append(text)
        elif len(text) > 20:
            preamble.append(text)

    if not articles:
        raise FetchError("Could not find any numbered articles in the page")

    body_parts = [*preamble]
    chapters_by_number = {chapter["number"]: chapter for chapter in chapters}
    last_chapter: str | None = None
    for article in articles:
        chapter_number = article["chapter"]
        if chapter_number and chapter_number != last_chapter:
            body_parts.append(chapters_by_number[chapter_number]["title"])
            last_chapter = chapter_number
        body_parts.append(f"Điều {article['number']}. {article['title']}")
        body_parts.extend(article["paragraphs"])

    return {
        "url": source_url,
        "title": page_title,
        "sourceDomain": "xaydungchinhsach.chinhphu.vn",
        "publishedAt": _effective_datetime(all_text),
        "author": "Chính phủ Việt Nam",
        "summary": preamble[0] if preamble else "",
        "bodyText": "\n\n".join(body_parts),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


async def fetch_regulation(url: str = DEFAULT_URL) -> dict[str, Any]:
    headers = {
        "User-Agent": "RegulatoryIngest/1.0 (+internal compliance data service)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "vi,en;q=0.8",
    }
    try:
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=httpx.Timeout(30.0), headers=headers
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise FetchError(f"Unable to fetch {url}: {exc}") from exc
    return parse_regulation(response.text, str(response.url))
