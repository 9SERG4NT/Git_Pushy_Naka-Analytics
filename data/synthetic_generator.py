import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import config

np.random.seed(config.RANDOM_SEED)

VIOLATION_ZONE_PATTERNS = {
    "DUI": {
        "zone": "bar_zone",
        "hour_range": (22, 2),
        "days": [5, 6],
        "weather": ["Clear", "Cloudy", "Rainy"],
    },
    "No_Helmet": {
        "zone": "college_zone",
        "hour_range": (7, 10),
        "days": [0, 1, 2, 3, 4],
        "weather": ["Clear"],
    },
    "Speeding": {
        "zone": "highway",
        "hour_range": (23, 4),
        "days": list(range(7)),
        "weather": ["Clear", "Fog"],
    },
    "Signal_Jump": {
        "zone": "intersection",
        "hour_range": (8, 10),
        "days": list(range(7)),
        "weather": ["Clear", "Cloudy", "Rainy"],
    },
    "Signal_Jump_even": {
        "zone": "intersection",
        "hour_range": (17, 19),
        "days": list(range(7)),
        "weather": ["Clear", "Cloudy", "Rainy"],
    },
    "Overloading": {
        "zone": "industrial",
        "hour_range": (6, 12),
        "days": list(range(7)),
        "weather": ["Clear", "Cloudy"],
    },
    "Wrong_Way": {
        "zone": "urban",
        "hour_range": (0, 24),
        "days": list(range(7)),
        "weather": ["Rainy", "Fog"],
    },
}

NAGPUR_ZONE_COORDS = {
    "bar_zone": {"lat_range": (21.1400, 21.1480), "lon_range": (79.0600, 79.0750)},
    "college_zone": {"lat_range": (21.1250, 21.1350), "lon_range": (79.0500, 79.0650)},
    "highway": {"lat_range": (21.0900, 21.1800), "lon_range": (79.0300, 79.1200)},
    "intersection": {"lat_range": (21.1350, 21.1550), "lon_range": (79.0650, 79.0850)},
    "industrial": {"lat_range": (21.0950, 21.1150), "lon_range": (79.0300, 79.0550)},
    "urban": {"lat_range": (21.1200, 21.1650), "lon_range": (79.0550, 79.1000)},
}

ZONE_COORDINATES = NAGPUR_ZONE_COORDS

VEHICLE_CLASSES = ["2W", "3W", "4W", "LCV", "HCV"]
WEATHER_TYPES = ["Clear", "Cloudy", "Rainy", "Fog"]

HOLIDAYS = [
    "2024-01-01",
    "2024-01-26",
    "2024-03-08",
    "2024-04-11",
    "2024-04-14",
    "2024-05-01",
    "2024-08-15",
    "2024-10-02",
    "2024-10-31",
    "2024-12-25",
    "2025-01-01",
    "2025-01-26",
]


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


def is_holiday(date):
    return date.strftime("%Y-%m-%d") in HOLIDAYS


def generate_single_violation(violation_type, pattern, base_date):
    zone = pattern["zone"]
    coords = ZONE_COORDINATES[zone]

    lat = np.random.uniform(*coords["lat_range"])
    lon = np.random.uniform(*coords["lon_range"])

    hour_range = pattern["hour_range"]
    if hour_range[0] > hour_range[1]:
        hour = np.random.choice(
            list(range(hour_range[0], 24)) + list(range(0, hour_range[1]))
        )
    else:
        hour = np.random.randint(hour_range[0], hour_range[1])

    minute = np.random.randint(0, 60)
    timestamp = base_date.replace(hour=hour, minute=minute)

    day_of_week = timestamp.weekday()
    if pattern["days"] and day_of_week not in pattern["days"]:
        day_of_week = np.random.choice(pattern["days"])
        timestamp = timestamp.replace(day=1)
        timestamp = timestamp + timedelta(days=int(day_of_week - timestamp.weekday()))

    weather = np.random.choice(pattern["weather"])
    vehicle_class = np.random.choice(VEHICLE_CLASSES)

    return {
        "timestamp": timestamp,
        "latitude": lat,
        "longitude": lon,
        "vehicle_class": vehicle_class,
        "violation_type": violation_type,
        "weather": weather,
        "day_of_week": timestamp.weekday(),
        "is_holiday": is_holiday(timestamp),
        "hour": hour,
        "time_bucket": get_time_bucket(hour),
    }


def generate_synthetic_data(n_records=config.SYNTHETIC_DATA_SIZE):
    violation_types = list(VIOLATION_ZONE_PATTERNS.keys())
    base_date = datetime(2024, 1, 1)

    records = []
    distribution = {
        "DUI": 0.10,
        "No_Helmet": 0.15,
        "Speeding": 0.20,
        "Signal_Jump": 0.12,
        "Signal_Jump_even": 0.08,
        "Overloading": 0.15,
        "Wrong_Way": 0.10,
        "No_Violation": 0.10,
    }

    violation_weights = [distribution[vt] for vt in violation_types + ["No_Violation"]]

    for _ in range(n_records):
        if np.random.random() < 0.10:
            violation = "No_Violation"
            lat = np.random.uniform(21.09, 21.18)
            lon = np.random.uniform(79.03, 79.12)
            hour = np.random.randint(0, 24)
            minute = np.random.randint(0, 60)
            timestamp = base_date + timedelta(
                days=int(np.random.randint(0, 365)),
                hours=int(hour),
                minutes=int(minute),
            )

            records.append(
                {
                    "timestamp": timestamp,
                    "latitude": lat,
                    "longitude": lon,
                    "vehicle_class": np.random.choice(VEHICLE_CLASSES),
                    "violation_type": violation,
                    "weather": np.random.choice(WEATHER_TYPES),
                    "day_of_week": timestamp.weekday(),
                    "is_holiday": is_holiday(timestamp),
                    "hour": hour,
                    "time_bucket": get_time_bucket(hour),
                }
            )
        else:
            p_weights = np.array(violation_weights[: len(violation_types)])
            p_weights = p_weights / p_weights.sum()
            violation = np.random.choice(violation_types, p=p_weights)
            pattern = VIOLATION_ZONE_PATTERNS[violation]

            days_offset = int(np.random.randint(0, 365))
            base = datetime(2024, 1, 1) + timedelta(days=days_offset)

            record = generate_single_violation(violation, pattern, base)
            records.append(record)

    df = pd.DataFrame(records)
    df = df.sort_values("timestamp").reset_index(drop=True)
    df["timestamp"] = df["timestamp"].astype(str)

    return df


def main():
    print(
        f"Generating {config.SYNTHETIC_DATA_SIZE} synthetic violation records for Nagpur city..."
    )
    df = generate_synthetic_data()

    output_path = config.GENERATED_DATA_DIR / "violations_synthetic.csv"
    df.to_csv(output_path, index=False)

    print(f"Generated {len(df)} records for Nagpur")
    print(f"Violation distribution:\n{df['violation_type'].value_counts()}")
    print(f"\nData saved to: {output_path}")

    lat_min, lat_max = df["latitude"].min(), df["latitude"].max()
    lon_min, lon_max = df["longitude"].min(), df["longitude"].max()
    print(f"\nNagpur City Bounds:")
    print(f"  Latitude: {lat_min:.4f}° to {lat_max:.4f}°")
    print(f"  Longitude: {lon_min:.4f}° to {lon_max:.4f}°")

    return df


if __name__ == "__main__":
    main()
