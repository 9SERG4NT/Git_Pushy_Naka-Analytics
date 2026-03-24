import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
from datetime import datetime
import config

sns.set_style("darkgrid")
plt.rcParams["figure.figsize"] = (12, 6)


def load_data():
    data_path = config.GENERATED_DATA_DIR / "violations_synthetic.csv"
    df = pd.read_csv(data_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def temporal_analysis(df, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)

    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["month"] = df["timestamp"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6])

    hour_dow_matrix = pd.crosstab(df["hour"], df["day_of_week"])
    plt.figure(figsize=(14, 8))
    sns.heatmap(hour_dow_matrix, cmap="YlOrRd", annot=False, fmt="d")
    plt.title("Violations by Hour and Day of Week")
    plt.xlabel("Day of Week (0=Mon, 6=Sun)")
    plt.ylabel("Hour")
    plt.tight_layout()
    plt.savefig(output_dir / "hour_dow_heatmap.png", dpi=150)
    plt.close()

    plt.figure(figsize=(12, 6))
    df["hour"].hist(bins=24, edgecolor="black", alpha=0.7)
    plt.title("Violation Distribution by Hour")
    plt.xlabel("Hour of Day")
    plt.ylabel("Count")
    plt.xticks(range(0, 24))
    plt.tight_layout()
    plt.savefig(output_dir / "hour_distribution.png", dpi=150)
    plt.close()

    plt.figure(figsize=(12, 6))
    dow_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    df["day_of_week"].value_counts().sort_index().plot(
        kind="bar", color="steelblue", edgecolor="black"
    )
    plt.title("Violations by Day of Week")
    plt.xlabel("Day of Week")
    plt.ylabel("Count")
    plt.xticks(range(7), dow_labels, rotation=0)
    plt.tight_layout()
    plt.savefig(output_dir / "dow_distribution.png", dpi=150)
    plt.close()

    plt.figure(figsize=(10, 6))
    df.groupby("is_weekend").size().plot(
        kind="bar", color=["green", "orange"], edgecolor="black"
    )
    plt.title("Weekday vs Weekend Violations")
    plt.xlabel("Is Weekend")
    plt.ylabel("Count")
    plt.xticks([0, 1], ["Weekday", "Weekend"], rotation=0)
    plt.tight_layout()
    plt.savefig(output_dir / "weekend_distribution.png", dpi=150)
    plt.close()

    plt.figure(figsize=(10, 6))
    df["is_holiday"].value_counts().plot(
        kind="bar", color=["blue", "red"], edgecolor="black"
    )
    plt.title("Holiday vs Non-Holiday Violations")
    plt.xlabel("Is Holiday")
    plt.ylabel("Count")
    plt.xticks([0, 1], ["Non-Holiday", "Holiday"], rotation=0)
    plt.tight_layout()
    plt.savefig(output_dir / "holiday_distribution.png", dpi=150)
    plt.close()

    print(f"Temporal analysis charts saved to {output_dir}")


def spatial_analysis(df, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(12, 10))
    scatter = plt.scatter(
        df["longitude"],
        df["latitude"],
        c=df["violation_type"].astype("category").cat.codes,
        alpha=0.3,
        s=5,
        cmap="tab10",
    )
    plt.title("Spatial Distribution of Violations")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.colorbar(scatter, label="Violation Type")
    plt.tight_layout()
    plt.savefig(output_dir / "spatial_scatter.png", dpi=150)
    plt.close()

    fig = px.density_mapbox(
        df,
        lat="latitude",
        lon="longitude",
        radius=10,
        zoom=11,
        mapbox_style="carto-positron",
        title="Violation Density Map",
    )
    fig.write_html(output_dir / "spatial_density_mapbox.html")

    violation_by_zone = (
        df.groupby(["latitude", "longitude"]).size().reset_index(name="count")
    )
    plt.figure(figsize=(12, 10))
    plt.hexbin(df["longitude"], df["latitude"], gridsize=30, cmap="YlOrRd", mincnt=1)
    plt.colorbar(label="Violation Count")
    plt.title("Violation Density Hexbin")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(output_dir / "spatial_hexbin.png", dpi=150)
    plt.close()

    print(f"Spatial analysis charts saved to {output_dir}")


def correlation_analysis(df, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(14, 10))
    violation_hour = pd.crosstab(df["violation_type"], df["hour"])
    sns.heatmap(violation_hour, cmap="Blues", annot=False, fmt="d")
    plt.title("Violation Type by Hour")
    plt.xlabel("Hour")
    plt.ylabel("Violation Type")
    plt.tight_layout()
    plt.savefig(output_dir / "violation_by_hour.png", dpi=150)
    plt.close()

    plt.figure(figsize=(12, 8))
    violation_dow = pd.crosstab(df["violation_type"], df["day_of_week"])
    sns.heatmap(violation_dow, cmap="Greens", annot=False, fmt="d")
    plt.title("Violation Type by Day of Week")
    plt.xlabel("Day of Week")
    plt.ylabel("Violation Type")
    plt.tight_layout()
    plt.savefig(output_dir / "violation_by_dow.png", dpi=150)
    plt.close()

    plt.figure(figsize=(12, 6))
    violation_weather = pd.crosstab(df["violation_type"], df["weather"])
    violation_weather.plot(
        kind="bar", stacked=True, colormap="viridis", edgecolor="black"
    )
    plt.title("Violation Types by Weather Condition")
    plt.xlabel("Violation Type")
    plt.ylabel("Count")
    plt.legend(title="Weather")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(output_dir / "violation_by_weather.png", dpi=150)
    plt.close()

    plt.figure(figsize=(12, 6))
    df["violation_type"].value_counts().plot(
        kind="bar", color="coral", edgecolor="black"
    )
    plt.title("Overall Violation Type Distribution")
    plt.xlabel("Violation Type")
    plt.ylabel("Count")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(output_dir / "violation_type_distribution.png", dpi=150)
    plt.close()

    plt.figure(figsize=(12, 6))
    df["vehicle_class"].value_counts().plot(kind="bar", color="teal", edgecolor="black")
    plt.title("Violations by Vehicle Class")
    plt.xlabel("Vehicle Class")
    plt.ylabel("Count")
    plt.xticks(rotation=0)
    plt.tight_layout()
    plt.savefig(output_dir / "vehicle_class_distribution.png", dpi=150)
    plt.close()

    print(f"Correlation analysis charts saved to {output_dir}")


def get_summary_stats(df):
    summary = {
        "total_records": len(df),
        "date_range": {
            "start": str(df["timestamp"].min()),
            "end": str(df["timestamp"].max()),
        },
        "violation_counts": df["violation_type"].value_counts().to_dict(),
        "vehicle_class_counts": df["vehicle_class"].value_counts().to_dict(),
        "weather_counts": df["weather"].value_counts().to_dict(),
        "hourly_peak": int(df["hour"].mode()[0]),
        "dow_peak": int(df["day_of_week"].mode()[0]),
        "holiday_violations": int(df["is_holiday"].sum()),
        "weekend_violations": int(df["is_weekend"].sum()),
        "geo_bounds": {
            "lat_min": float(df["latitude"].min()),
            "lat_max": float(df["latitude"].max()),
            "lon_min": float(df["longitude"].min()),
            "lon_max": float(df["longitude"].max()),
        },
    }
    return summary


def main():
    print("Loading synthetic data...")
    df = load_data()

    print("Running temporal analysis...")
    temporal_analysis(df, config.EDA_OUTPUT_DIR)

    print("Running spatial analysis...")
    spatial_analysis(df, config.EDA_OUTPUT_DIR)

    print("Running correlation analysis...")
    correlation_analysis(df, config.EDA_OUTPUT_DIR)

    summary = get_summary_stats(df)
    print("\n=== EDA Summary ===")
    print(f"Total Records: {summary['total_records']}")
    print(
        f"Date Range: {summary['date_range']['start']} to {summary['date_range']['end']}"
    )
    print(f"Peak Hour: {summary['hourly_peak']}")
    print(f"Violation Types: {list(summary['violation_counts'].keys())}")

    return summary


if __name__ == "__main__":
    main()
