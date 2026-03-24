import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import config


def cyclical_encode(value, max_value):
    sin_val = np.sin(2 * np.pi * value / max_value)
    cos_val = np.cos(2 * np.pi * value / max_value)
    return sin_val, cos_val


def add_cyclical_features(df):
    df["hour_sin"], df["hour_cos"] = cyclical_encode(df["hour"], 24)
    df["dow_sin"], df["dow_cos"] = cyclical_encode(df["day_of_week"], 7)
    return df


def add_time_bucket(df):
    def get_time_bucket(hour):
        if 7 <= hour < 10:
            return "rush_morning"
        elif 10 <= hour < 17:
            return "midday"
        elif 17 <= hour < 20:
            return "rush_evening"
        elif 20 <= hour < 24:
            return "late_night"
        else:
            return "early_morning"

    df["time_bucket"] = df["hour"].apply(get_time_bucket)
    return df


def add_grid_features(df):
    df["lat_grid"] = (df["latitude"] // config.GRID_LAT_SIZE).astype(int)
    df["lon_grid"] = (df["longitude"] // config.GRID_LON_SIZE).astype(int)
    df["grid_cell"] = df["lat_grid"].astype(str) + "_" + df["lon_grid"].astype(str)
    return df


def add_binary_features(df):
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    return df


def encode_categorical(df, encoders=None):
    if encoders is None:
        encoders = {}

    categorical_cols = ["weather", "vehicle_class", "time_bucket", "violation_type"]

    for col in categorical_cols:
        if col not in df.columns:
            continue
        if col not in encoders:
            encoders[col] = LabelEncoder()
            df[col + "_encoded"] = encoders[col].fit_transform(df[col].astype(str))
        else:
            df[col + "_encoded"] = encoders[col].transform(df[col].astype(str))

    return df, encoders


def engineer_features(df, encoders=None):
    df = df.copy()

    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["hour"] = df["timestamp"].dt.hour
        df["day_of_week"] = df["timestamp"].dt.dayofweek
    elif "hour" not in df.columns:
        df["hour"] = 12
    elif "day_of_week" not in df.columns:
        df["day_of_week"] = 0

    df = add_cyclical_features(df)
    df = add_time_bucket(df)
    df = add_grid_features(df)
    df = add_binary_features(df)
    df, encoders = encode_categorical(df, encoders)

    feature_cols = [
        "hour_sin",
        "hour_cos",
        "dow_sin",
        "dow_cos",
        "is_weekend",
        "is_holiday",
        "lat_grid",
        "lon_grid",
        "weather_encoded",
        "vehicle_class_encoded",
        "time_bucket_encoded",
    ]

    return df, encoders, feature_cols


def get_feature_names():
    return [
        "hour_sin",
        "hour_cos",
        "dow_sin",
        "dow_cos",
        "is_weekend",
        "is_holiday",
        "lat_grid",
        "lon_grid",
        "weather_encoded",
        "vehicle_class_encoded",
        "time_bucket_encoded",
    ]


def main():
    from data.synthetic_generator import main as generate_data

    print("Generating synthetic data...")
    df = generate_data()

    print("Engineering features...")
    df, encoders, feature_cols = engineer_features(df)

    print(f"Feature columns: {feature_cols}")
    print(f"Shape: {df.shape}")
    print(df[feature_cols].head())

    return df, encoders, feature_cols


if __name__ == "__main__":
    main()
