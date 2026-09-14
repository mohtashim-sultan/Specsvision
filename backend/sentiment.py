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


# Feature categories mapped to sets of positive lexicon terms
LEXICON_FEATURE_MAP: dict[str, set[str]] = {
    "comfortable": {"comfortable", "lightweight", "flattering", "nice", "perfect"},
    "lightweight": {"lightweight"},
    "durable": {"durable", "sturdy", "quality", "worth"},
    "stylish": {"stylish", "beautiful", "flattering", "sharp", "crisp", "awesome"},
    "quality": {"quality", "excellent", "perfect", "durable", "sturdy", "worth", "best"},
}


def extract_positive_keywords(text: str | None) -> list[str]:
    """Extract non-negated positive lexicon words mentioned in review text."""
    if not text:
        return []
    words = _WORD_RE.findall(text.lower())
    found: list[str] = []
    for i, word in enumerate(words):
        if word in _POSITIVE:
            # Check if immediately preceded by a negation word
            if i > 0 and words[i - 1] in _NEGATIONS:
                continue
            if word not in found:
                found.append(word)
    return found


def compute_lexicon_metrics(reviews: list) -> dict | None:
    """Calculate sentiment ratio, top praise keywords, and recommendation score from reviews."""
    if not reviews:
        return None

    total = len(reviews)
    positive_count = 0
    rating_sum = 0
    keyword_freq: dict[str, int] = {}

    for r in reviews:
        rating = getattr(r, "rating", 5)
        sentiment = getattr(r, "sentiment", None) or classify(rating, getattr(r, "title", None), getattr(r, "body", None))
        rating_sum += rating
        if sentiment == "positive":
            positive_count += 1

        full_text = f"{getattr(r, 'title', '') or ''} {getattr(r, 'body', '') or ''}"
        keywords = extract_positive_keywords(full_text)
        for kw in keywords:
            keyword_freq[kw] = keyword_freq.get(kw, 0) + 1

    positive_percentage = int(round((positive_count / total) * 100))
    avg_rating = rating_sum / total

    # Sort keywords by frequency
    sorted_keywords = sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)
    top_keywords = [kw for kw, _ in sorted_keywords[:4]]

    # Bayesian-damped sentiment recommendation score out of 5.0
    # Prior assumption: 3.5 rating with 70% positive sentiment on 2 phantom reviews
    prior_weight = 2
    blended_rating = (rating_sum + 3.5 * prior_weight) / (total + prior_weight)
    sentiment_factor = (positive_percentage / 100.0)
    sentiment_score = round(blended_rating * (0.6 + 0.4 * sentiment_factor), 2)

    return {
        "positive_percentage": positive_percentage,
        "top_keywords": top_keywords,
        "sentiment_score": min(5.0, max(1.0, sentiment_score)),
    }

