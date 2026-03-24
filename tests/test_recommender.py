import pytest
import sys
from pathlib import Path
import numpy as np
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from engine.recommender import NakaRecommender
import config


def test_recommender_creation():
    recommender = NakaRecommender()
    assert recommender is not None, "Should create recommender"
    assert recommender.predictor is None, "Predictor should not be loaded yet"
    assert recommender.clusterer is None, "Clusterer should not be loaded yet"


def test_generate_candidates():
    recommender = NakaRecommender()

    candidates = recommender.generate_candidates(current_hour=12, date=datetime.now())

    assert len(candidates) > 0, "Should generate candidates"

    for candidate in candidates:
        assert "cluster_id" in candidate, "Should have cluster_id"
        assert "time_bucket" in candidate, "Should have time_bucket"
        assert "latitude" in candidate, "Should have latitude"
        assert "longitude" in candidate, "Should have longitude"


def test_predict_violation_probability():
    recommender = NakaRecommender()

    candidate = {
        "cluster_id": 0,
        "time_bucket": "midday",
        "hour_start": 10,
        "hour_end": 17,
        "latitude": 18.52,
        "longitude": 73.85,
    }

    proba = recommender.predict_violation_probability(candidate)

    assert len(proba) > 0, "Should return probabilities"
    assert abs(sum(proba) - 1.0) < 0.01, "Probabilities should sum to 1"
    assert all(0 <= p <= 1 for p in proba), "All probabilities should be in [0, 1]"


def test_score_candidates():
    recommender = NakaRecommender()

    candidates = [
        {
            "cluster_id": 0,
            "time_bucket": "midday",
            "hour_start": 10,
            "hour_end": 17,
            "latitude": 18.52,
            "longitude": 73.85,
        },
        {
            "cluster_id": 1,
            "time_bucket": "rush_morning",
            "hour_start": 7,
            "hour_end": 10,
            "latitude": 18.51,
            "longitude": 73.84,
        },
    ]

    scored = recommender.score_candidates(candidates)

    assert len(scored) == 2, "Should return scored candidates"

    for item in scored:
        assert "rank" in item, "Should have rank"
        assert "naka_type" in item, "Should have naka_type"
        assert "expected_violation_yield" in item, (
            "Should have expected_violation_yield"
        )
        assert "confidence" in item, "Should have confidence"
        assert "location" in item, "Should have location"


def test_recommendation_ranking():
    recommender = NakaRecommender()

    candidates = [
        {
            "cluster_id": i,
            "time_bucket": "midday",
            "hour_start": 10,
            "hour_end": 17,
            "latitude": 18.52 + i * 0.01,
            "longitude": 73.85 + i * 0.01,
        }
        for i in range(10)
    ]

    scored = recommender.score_candidates(candidates)

    for i in range(len(scored) - 1):
        assert (
            scored[i]["expected_violation_yield"]
            >= scored[i + 1]["expected_violation_yield"]
        ), "Should be ranked by yield"


def test_get_recommendations():
    recommender = NakaRecommender()

    recommendations = recommender.get_recommendations(top_k=5)

    assert len(recommendations) <= 5, "Should return at most 5 recommendations"

    for rec in recommendations:
        assert "rank" in rec, "Should have rank"
        assert "naka_type" in rec, "Should have naka_type"
        assert "location" in rec, "Should have location"
        assert "time_window" in rec, "Should have time_window"
        assert "expected_violation_yield" in rec, "Should have expected_violation_yield"
        assert "confidence" in rec, "Should have confidence"


def test_recommendation_output_format():
    recommender = NakaRecommender()

    recommendations = recommender.get_recommendations(top_k=3)

    for rec in recommendations:
        assert isinstance(rec["rank"], int), "Rank should be integer"
        assert isinstance(rec["location"], dict), "Location should be dict"
        assert "lat" in rec["location"], "Location should have lat"
        assert "lon" in rec["location"], "Location should have lon"
        assert isinstance(rec["naka_type"], str), "Naka type should be string"
        assert isinstance(rec["time_window"], str), "Time window should be string"
        assert 0 <= rec["expected_violation_yield"] <= 1, "Yield should be in [0, 1]"
        assert 0 <= rec["confidence"] <= 1, "Confidence should be in [0, 1]"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
