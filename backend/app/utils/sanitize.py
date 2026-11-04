"""Allowlist-based sanitization for user/tool rich text."""

from typing import cast

import bleach

ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "h1",
    "h2",
    "h3",
    "h4",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "a",
]
ALLOWED_ATTRIBUTES = {"a": ["href", "title"], "th": ["align"], "td": ["align"]}


def sanitize_html(value: str) -> str:
    cleaned = bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=["https", "mailto"],
        strip=True,
    )
    return cast(
        str,
        bleach.linkify(
            cleaned, callbacks=[bleach.callbacks.nofollow, bleach.callbacks.target_blank]
        ),
    )


def plain_text(value: str) -> str:
    return cast(str, bleach.clean(value, tags=[], attributes={}, protocols=[], strip=True))
