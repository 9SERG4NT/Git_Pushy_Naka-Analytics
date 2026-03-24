import pytest
import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from data.synthetic_generator import (
    generate_synthetic_data,
    VIOLATION_ZONE_PATTERNS,
    ZONE_COORDINATES,
)
import config


def test_generate_synthetic_data():
    df = generate_synthetic_data(n_records=1000)

    assert len(df) == 1000, "Should generate requested number of records"

    assert "timestamp" in df.columns, "Should have timestamp column"
    assert "latitude" in df.columns, "Should have latitude column"
    assert "longitude" in df.columns, "Should have longitude column"
    assert "vehicle_class" in df.columns, "Should have vehicle_class column"
    assert "violation_type" in df.columns, "Should have violation_type column"
    assert "weather" in df.columns, "Should have weather column"
    assert "day_of_week" in df.columns, "Should have day_of_week column"
    assert "is_holiday" in df.columns, "Should have is_holiday column"


def test_violation_types_present():
    df = generate_synthetic_data(n_records=1000)

    unique_violations = df["violation_type"].unique()

    assert len(unique_violations) > 1, "Should have multiple violation types"

    expected_types = [
        "DUI",
        "No_Helmet",
        "Speeding",
        "Signal_Jump",
        "Overloading",
        "Wrong_Way",
        "No_Violation",
    ]
    for vtype in expected_types:
        if vtype != "No_Violation":
            assert vtype in VIOLATION_ZONE_PATTERNS, f"{vtype} should be in patterns"


def test_geo_bounds():
    df = generate_synthetic_data(n_records=1000)

    lat_min, lat_max = df["latitude"].min(), df["latitude"].max()
    lon_min, lon_max = df["longitude"].min(), df["longitude"].max()

    assert 18.4 < lat_min < 18.6, f"Latitude {lat_min} out of expected range"
    assert 18.4 < lat_max < 18.6, f"Latitude {lat_max} out of expected range"
    assert 73.7 < lon_min < 73.9, f"Longitude {lon_min} out of expected range"
    assert 73.7 < lon_max < 73.9, f"Longitude {lon_max} out of expected range"


def test_time_bucket():
    df = generate_synthetic_data(n_records=1000)

    assert "time_bucket" in df.columns, "Should have time_bucket column"

    valid_buckets = [
        "rush_morning",
        "midday",
        "rush_evening",
        "late_night",
        "early_morning",
    ]
    for bucket in df["time_bucket"].unique():
        assert bucket in valid_buckets, f"Invalid time bucket: {bucket}"


def test_vehicle_classes():
    df = generate_synthetic_data(n_records=1000)

    valid_classes = ["2W", "3W", "4W", "LCV", "HCV"]
    for vc in df["vehicle_class"].unique():
        assert vc in valid_classes, f"Invalid vehicle class: {vc}"


def test_weather_types():
    df = generate_synthetic_data(n_records=1000)

    valid_weather = ["Clear", "Cloudy", "Rainy", "Fog"]
    for w in df["weather"].unique():
        assert w in valid_weather, f"Invalid weather: {w}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
