import hashlib
import html
import re
from html.parser import HTMLParser
from urllib.parse import parse_qs, quote_plus, unquote, urlparse
from urllib.request import Request, urlopen

from app.core.config import settings
from app.services.gemini_service import RetrievedSource


class _DuckDuckGoResultParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: list[dict[str, str]] = []
        self._active: dict[str, str] | None = None
        self._field: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key: value or "" for key, value in attrs}
        classes = set(attr_map.get("class", "").split())

        if tag == "a" and "result__a" in classes:
            href = attr_map.get("href", "")
            self._active = {"title": "", "url": _clean_duckduckgo_url(href), "snippet": ""}
            self._field = "title"
            return

        if self._active is not None and tag in {"a", "div"} and ("result__snippet" in classes or "result__body" in classes):
            self._field = "snippet"

    def handle_data(self, data: str) -> None:
        if self._active is None or self._field is None:
            return

        clean_data = " ".join(html.unescape(data).split())
        if not clean_data:
            return
        existing = self._active.get(self._field, "")
        self._active[self._field] = f"{existing} {clean_data}".strip()

    def handle_endtag(self, tag: str) -> None:
        if self._active is None:
            return

        if tag == "a" and self._field == "title":
            self._field = None
            return

        if tag == "div" and self._active.get("title") and self._active.get("url"):
            self.results.append(self._active)
            self._active = None
            self._field = None


class WebSearchService:
    def search(self, query: str, *, limit: int | None = None) -> list[RetrievedSource]:
        if not settings.web_search_enabled:
            return []

        effective_limit = max(1, min(limit or settings.web_search_limit, 8))
        html_results = self._search_duckduckgo_html(query=query, limit=effective_limit)
        if html_results:
            return html_results
        return self._search_duckduckgo_instant_answer(query=query, limit=effective_limit)

    def _search_duckduckgo_html(self, *, query: str, limit: int) -> list[RetrievedSource]:
        url = f"https://duckduckgo.com/html/?q={quote_plus(query)}"
        request = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 AskYourDataBot/1.0",
                "Accept": "text/html,application/xhtml+xml",
            },
        )
        try:
            with urlopen(request, timeout=settings.web_search_timeout_seconds) as response:
                body = response.read(900_000).decode("utf-8", errors="replace")
        except Exception:
            return []

        parser = _DuckDuckGoResultParser()
        parser.feed(body)
        sources: list[RetrievedSource] = []
        seen_urls: set[str] = set()
        for raw in parser.results:
            source = _result_to_source(raw, score=max(0.35, 0.92 - len(sources) * 0.08))
            if not source or source.source_uri in seen_urls:
                continue
            seen_urls.add(source.source_uri or "")
            sources.append(source)
            if len(sources) >= limit:
                break
        return sources

    def _search_duckduckgo_instant_answer(self, *, query: str, limit: int) -> list[RetrievedSource]:
        url = f"https://api.duckduckgo.com/?q={quote_plus(query)}&format=json&no_html=1&skip_disambig=1"
        request = Request(url, headers={"User-Agent": "Mozilla/5.0 AskYourDataBot/1.0"})
        try:
            with urlopen(request, timeout=settings.web_search_timeout_seconds) as response:
                import json

                payload = json.loads(response.read(500_000).decode("utf-8", errors="replace"))
        except Exception:
            return []

        candidates: list[dict[str, str]] = []
        if payload.get("AbstractText"):
            candidates.append(
                {
                    "title": str(payload.get("Heading") or query),
                    "url": str(payload.get("AbstractURL") or ""),
                    "snippet": str(payload.get("AbstractText") or ""),
                }
            )

        for topic in payload.get("RelatedTopics") or []:
            if isinstance(topic, dict) and topic.get("Text"):
                candidates.append({"title": str(topic.get("Text")).split(" - ", 1)[0], "url": str(topic.get("FirstURL") or ""), "snippet": str(topic.get("Text") or "")})
            elif isinstance(topic, dict):
                for nested in topic.get("Topics") or []:
                    if isinstance(nested, dict) and nested.get("Text"):
                        candidates.append(
                            {
                                "title": str(nested.get("Text")).split(" - ", 1)[0],
                                "url": str(nested.get("FirstURL") or ""),
                                "snippet": str(nested.get("Text") or ""),
                            }
                        )

        sources: list[RetrievedSource] = []
        for raw in candidates:
            source = _result_to_source(raw, score=max(0.35, 0.86 - len(sources) * 0.08))
            if source:
                sources.append(source)
            if len(sources) >= limit:
                break
        return sources


def _result_to_source(raw: dict[str, str], *, score: float) -> RetrievedSource | None:
    title = _clean_text(raw.get("title") or "")
    url = raw.get("url") or ""
    snippet = _clean_text(raw.get("snippet") or "")
    if not title or not url:
        return None

    content = f"{title}\nURL: {url}\n{snippet}".strip()
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    return RetrievedSource(
        document_id=f"web-{digest}",
        title=title[:180],
        source_uri=url,
        score=round(score, 4),
        snippet=(snippet or url)[:420],
        content=content[:1800],
        source_type="web",
    )


def _clean_duckduckgo_url(url: str) -> str:
    if not url:
        return ""
    parsed = urlparse(html.unescape(url))
    if parsed.path == "/l/":
        decoded = parse_qs(parsed.query).get("uddg", [""])[0]
        return unquote(decoded)
    return html.unescape(url)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()
