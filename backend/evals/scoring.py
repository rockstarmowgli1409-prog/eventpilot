"""Field matching rules for the eval harness.

strings: case-insensitive after trimming. dates: exact. money: within 1 CAD.
lists: precision/recall/F1 with greedy one-to-one fuzzy label matching.
"""

import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from difflib import SequenceMatcher
from typing import Any

LABEL_THRESHOLD = 0.3
MONEY_TOLERANCE_CAD = 1.0
_STOPWORDS = {"the", "a", "an", "and", "of", "to", "for", "with", "by", "our", "your", "in", "on"}


@dataclass
class ListScore:
    tp: int
    fp: int
    fn: int

    @property
    def precision(self) -> float:
        return self.tp / (self.tp + self.fp) if self.tp + self.fp else 1.0

    @property
    def recall(self) -> float:
        return self.tp / (self.tp + self.fn) if self.tp + self.fn else 1.0

    @property
    def f1(self) -> float:
        p, r = self.precision, self.recall
        return 2 * p * r / (p + r) if p + r else 0.0


def _norm(text: str) -> str:
    return text.strip().lower()


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9$]+", text.lower())
    return {w[:4] for w in words if w not in _STOPWORDS}


def label_similarity(a: str, b: str) -> float:
    """Max of token overlap (on 4-char stems) and character-level similarity."""
    ta, tb = _tokens(a), _tokens(b)
    overlap = len(ta & tb) / min(len(ta), len(tb)) if ta and tb else 0.0
    return max(overlap, SequenceMatcher(None, _norm(a), _norm(b)).ratio())


def match_string(expected: str | None, predicted: str | None) -> bool:
    if expected is None or predicted is None:
        return expected is None and predicted is None
    return _norm(expected) == _norm(predicted)


def match_date(expected: str | date | None, predicted: str | date | None) -> bool:
    def as_iso(v: str | date | None) -> str | None:
        return v.isoformat() if isinstance(v, date) else v

    return as_iso(expected) == as_iso(predicted)


def match_money(expected: float | None, predicted: float | None) -> bool:
    if expected is None or predicted is None:
        return expected is None and predicted is None
    return abs(expected - predicted) <= MONEY_TOLERANCE_CAD


def _score_list(
    expected: list[Any], predicted: list[Any], is_match: Callable[[Any, Any], bool]
) -> ListScore:
    unmatched = list(predicted)
    tp = 0
    for exp in expected:
        hit = next((p for p in unmatched if is_match(exp, p)), None)
        if hit is not None:
            unmatched.remove(hit)
            tp += 1
    return ListScore(tp=tp, fp=len(unmatched), fn=len(expected) - tp)


def _get(item: Any, key: str) -> Any:
    return item.get(key) if isinstance(item, dict) else getattr(item, key)


def score_costs(expected: list[Any], predicted: list[Any]) -> ListScore:
    return _score_list(
        expected,
        predicted,
        lambda e, p: (
            match_money(_get(e, "amount_cad"), _get(p, "amount_cad"))
            and label_similarity(_get(e, "label"), _get(p, "label")) >= LABEL_THRESHOLD
        ),
    )


def score_deadlines(expected: list[Any], predicted: list[Any]) -> ListScore:
    return _score_list(
        expected,
        predicted,
        lambda e, p: (
            match_date(_get(e, "due"), _get(p, "due"))
            and label_similarity(_get(e, "label"), _get(p, "label")) >= LABEL_THRESHOLD
        ),
    )


def score_actions(expected: list[Any], predicted: list[Any]) -> ListScore:
    def is_match(e: Any, p: Any) -> bool:
        owner_ok = _get(e, "owner") is None or match_string(_get(e, "owner"), _get(p, "owner"))
        return owner_ok and label_similarity(_get(e, "task"), _get(p, "task")) >= LABEL_THRESHOLD

    return _score_list(expected, predicted, is_match)


def score_list_of_strings(expected: list[str], predicted: list[str]) -> ListScore:
    return _score_list(expected, predicted, lambda e, p: label_similarity(e, p) >= LABEL_THRESHOLD)
