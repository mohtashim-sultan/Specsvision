"""Lightweight, dependency-free sentiment classifier for product reviews.

Combines the star rating with a small lexicon scan of the review text. This is intentionally
simple (no ML runtime); swap in a model later behind the same `classify()` signature.
"""
from __future__ import annotations

import re

_POSITIVE = {
    "great", "love", "loved", "excellent", "perfect", "amazing", "comfortable", "stylish",
    "good", "best", "happy", "recommend", "quality", "beautiful", "fantastic", "awesome",
    "nice", "durable", "sturdy", "lightweight", "flattering", "sharp", "crisp", "worth",
}
_NEGATIVE = {
    "bad", "poor", "broke", "broken", "cheap", "uncomfortable", "disappointed", "terrible",
    "hate", "worst", "flimsy", "defective", "return", "refund", "scratched", "blurry",
    "loose", "tight", "crooked", "waste", "awful", "regret", "useless", "overpriced",
}
_NEGATIONS = {"not", "no", "never", "isn't", "wasn't", "don't", "didn't", "doesn't", "can't"}

_WORD_RE = re.compile(r"[a-z']+")

Sentiment = str  # "positive" | "neutral" | "negative"


def _text_score(text: str | None) -> int:
    if not text:
        return 0
    words = _WORD_RE.findall(text.lower())
    score = 0
    for i, word in enumerate(words):
        weight = 0
        if word in _POSITIVE:
            weight = 1
        elif word in _NEGATIVE:
            weight = -1
        if weight and i > 0 and words[i - 1] in _NEGATIONS:
            weight = -weight  # "not comfortable" flips positive -> negative
        score += weight
    return score


def classify(rating: int, title: str | None = None, body: str | None = None) -> Sentiment:
    """Return 'positive' | 'neutral' | 'negative'.

    The rating anchors the result; the text can nudge it (e.g. a 3-star review whose text is
    clearly negative becomes 'negative').
    """
    combined = (rating - 3) + _text_score(f"{title or ''} {body or ''}")
    if combined > 0:
        return "positive"
    if combined < 0:
        return "negative"
    return "neutral"
