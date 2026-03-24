import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path
import config


class SpatialClusterer:
    def __init__(self):
        self.dbscan = None
        self.kmeans = None
        self.scaler = StandardScaler()
        self.cluster_centers_ = None
        self.cluster_stats_ = {}

    def fit_dbscan(
        self, df, eps=config.DBSCAN_EPS, min_samples=config.DBSCAN_MIN_SAMPLES
    ):
        coords = df[["latitude", "longitude"]].values
        coords_scaled = self.scaler.fit_transform(coords)

        self.dbscan = DBSCAN(eps=eps, min_samples=min_samples, metric="euclidean")
        df["cluster_dbscan"] = self.dbscan.fit_predict(coords_scaled)

        self._compute_cluster_stats(df, "cluster_dbscan")

        return df

    def fit_kmeans(self, df, n_clusters=config.KMEANS_N_CLUSTERS):
        coords = df[["latitude", "longitude"]].values

        self.kmeans = KMeans(
            n_clusters=n_clusters, random_state=config.RANDOM_SEED, n_init=10
        )
        df["cluster_kmeans"] = self.kmeans.fit_predict(coords)

        self.cluster_centers_ = self.kmeans.cluster_centers_

        self._compute_cluster_stats(df, "cluster_kmeans")

        return df

    def _compute_cluster_stats(self, df, cluster_col):
        self.cluster_stats_ = {}

        for cluster_id in df[cluster_col].unique():
            if cluster_id == -1:
                continue

            cluster_df = df[df[cluster_col] == cluster_id]

            violation_counts = cluster_df["violation_type"].value_counts()
            dominant_violation = (
                violation_counts.index[0] if len(violation_counts) > 0 else "Unknown"
            )

            self.cluster_stats_[cluster_id] = {
                "count": len(cluster_df),
                "dominant_violation": dominant_violation,
                "center_lat": cluster_df["latitude"].mean(),
                "center_lon": cluster_df["longitude"].mean(),
                "violation_distribution": violation_counts.to_dict(),
                "hour_distribution": cluster_df["hour"].value_counts().to_dict(),
                "vehicle_distribution": cluster_df["vehicle_class"]
                .value_counts()
                .to_dict(),
            }

    def get_cluster_info(self, cluster_col="cluster_kmeans"):
        return self.cluster_stats_

    def save(self, path):
        joblib.dump(self, path)

    @classmethod
    def load(cls, path):
        return joblib.load(path)


def main():
    from data.synthetic_generator import main as generate_data
    from features.feature_engineering import engineer_features

    print("Generating synthetic data...")
    df = generate_data()

    print("Engineering features...")
    df, encoders, feature_cols = engineer_features(df)

    print("Fitting DBSCAN clustering...")
    clusterer = SpatialClusterer()
    df = clusterer.fit_dbscan(df)
    print(f"DBSCAN clusters: {df['cluster_dbscan'].nunique()}")

    print("Fitting KMeans clustering...")
    df = clusterer.fit_kmeans(df)
    print(f"KMeans clusters: {df['cluster_kmeans'].nunique()}")

    print("\nCluster Statistics:")
    for cluster_id, stats in list(clusterer.cluster_stats_.items())[:5]:
        print(
            f"  Cluster {cluster_id}: {stats['count']} violations, dominant: {stats['dominant_violation']}"
        )

    model_path = config.SAVED_MODELS_DIR / "clusterer.joblib"
    clusterer.save(model_path)
    print(f"\nClusterer saved to: {model_path}")

    return df, clusterer


if __name__ == "__main__":
    main()
