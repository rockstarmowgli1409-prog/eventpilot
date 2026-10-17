from datetime import date

import pytest

from evals.scoring import (
    ListScore,
    label_similarity,
    match_money,
    match_string,
    score_actions,
    score_costs,
    score_deadlines,
    score_list_of_strings,
)


def test_strings_compare_case_insensitively_after_trim():
    assert match_string("  Harbour Tents ", "harbour tents")
    assert not match_string("Harbour Tents", "Harbour Tent Co")


def test_null_expected_requires_null_prediction():
    assert match_string(None, None)
    assert not match_string(None, "Something")
    assert not match_string("Something", None)


def test_money_within_one_cad():
    assert match_money(850, 850.5)
    assert match_money(850, 849)
    assert not match_money(850, 852)
    assert not match_money(850, None)


def test_label_similarity_is_fuzzy():
    assert label_similarity("send deposit", "deposit payment") > 0.3
    assert label_similarity("tent and staff", "10x10 tent rental with two staff") >= 0.3
    assert label_similarity("deposit", "insurance certificate") < 0.3


def test_list_score_math():
    s = ListScore(tp=2, fp=1, fn=2)
    assert s.precision == pytest.approx(2 / 3)
    assert s.recall == pytest.approx(0.5)
    assert s.f1 == pytest.approx(2 * (2 / 3) * 0.5 / ((2 / 3) + 0.5))


def test_empty_expected_and_empty_predicted_is_perfect():
    s = ListScore(tp=0, fp=0, fn=0)
    assert s.f1 == 1.0


def test_costs_match_on_amount_and_label():
    expected = [{"label": "tent and staff", "amount_cad": 850}]
    good = [{"label": "tent rental and two staff", "amount_cad": 850}]
    wrong_amount = [{"label": "tent and staff", "amount_cad": 900}]
    assert score_costs(expected, good).f1 == 1.0
    assert score_costs(expected, wrong_amount).f1 == 0.0


def test_costs_extra_prediction_lowers_precision():
    expected = [{"label": "tent", "amount_cad": 850}]
    predicted = [{"label": "tent", "amount_cad": 850}, {"label": "tent", "amount_cad": 99}]
    s = score_costs(expected, predicted)
    assert (s.tp, s.fp, s.fn) == (1, 1, 0)


def test_each_prediction_matches_at_most_one_expected():
    expected = [{"label": "tent", "amount_cad": 100}, {"label": "tent", "amount_cad": 100}]
    predicted = [{"label": "tent", "amount_cad": 100}]
    s = score_costs(expected, predicted)
    assert (s.tp, s.fp, s.fn) == (1, 0, 1)


def test_deadlines_need_exact_dates():
    expected = [{"label": "deposit", "due": "2026-10-23"}]
    assert score_deadlines(expected, [{"label": "deposit due", "due": date(2026, 10, 23)}]).f1 == 1
    assert score_deadlines(expected, [{"label": "deposit", "due": date(2026, 10, 24)}]).f1 == 0


def test_actions_match_on_task_and_owner():
    expected = [{"task": "send deposit", "owner": "us"}]
    assert score_actions(expected, [{"task": "Send the deposit", "owner": "us"}]).f1 == 1
    assert score_actions(expected, [{"task": "Send the deposit", "owner": "vendor"}]).f1 == 0


def test_requirements_fuzzy_match():
    s = score_list_of_strings(["power access"], ["Access to power outlets"])
    assert s.f1 == 1.0
