import pytest
import sys
from pathlib import Path
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from data.synthetic_generator import generate_synthetic_data
from features.feature_engineering import (
    engineer_features,
    add_cyclical_features,
    add_time_bucket,
    add_grid_features,
    add_binary_features,
)
import config


def test_engineer_features_basic():
    df = generate_synthetic_data(n_records=100)

    df, encoders, feature_cols = engineer_features(df)

    assert "hour_sin" in df.columns, "Should have hour_sin column"
    assert "hour_cos" in df.columns, "Should have hour_cos column"
    assert "dow_sin" in df.columns, "Should have dow_sin column"
    assert "dow_cos" in df.columns, "Should have dow_cos column"
    assert "time_bucket" in df.columns, "Should have time_bucket column"
    assert "lat_grid" in df.columns, "Should have lat_grid column"
    assert "lon_grid" in df.columns, "Should have lon_grid column"
    assert "is_weekend" in df.columns, "Should have is_weekend column"


def test_cyclical_encoding_range():
    df = generate_synthetic_data(n_records=100)

    df = add_cyclical_features(df)

    assert df["hour_sin"].between(-1, 1).all(), "hour_sin should be in [-1, 1]"
    assert df["hour_cos"].between(-1, 1).all(), "hour_cos should be in [-1, 1]"
    assert df["dow_sin"].between(-1, 1).all(), "dow_sin should be in [-1, 1]"
    assert df["dow_cos"].between(-1, 1).all(), "dow_cos should be in [-1, 1]"


def test_time_bucket_values():
    df = generate_synthetic_data(n_records=100)

    df = add_time_bucket(df)

    valid_buckets = [
        "rush_morning",
        "midday",
        "rush_evening",
        "late_night",
        "early_morning",
    ]

    for bucket in df["time_bucket"].unique():
        assert bucket in valid_buckets, f"Invalid time bucket: {bucket}"


def test_grid_features():
    df = generate_synthetic_data(n_records=100)

    df = add_grid_features(df)

    assert df["lat_grid"].dtype in [np.int32, np.int64], "lat_grid should be integer"
    assert df["lon_grid"].dtype in [np.int32, np.int64], "lon_grid should be integer"


def test_binary_features():
    df = generate_synthetic_data(n_records=100)

    df = add_binary_features(df)

    assert df["is_weekend"].isin([0, 1]).all(), "is_weekend should be 0 or 1"


def test_feature_output_shape():
    df = generate_synthetic_data(n_records=100)

    df, encoders, feature_cols = engineer_features(df)

    assert len(feature_cols) > 0, "Should have feature columns"

    for col in feature_cols:
        assert col in df.columns, f"Column {col} should be in dataframe"


def test_encoders_consistency():
    df = generate_synthetic_data(n_records=100)

    df1, encoders1, _ = engineer_features(df)
    df2, encoders2, _ = engineer_features(df, encoders=encoders1)

    assert set(encoders1.keys()) == set(encoders2.keys()), "Encoder keys should match"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
