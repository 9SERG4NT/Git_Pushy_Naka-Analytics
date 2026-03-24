import pytest
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from data.synthetic_generator import generate_synthetic_data
from features.feature_engineering import engineer_features
from models.clustering import SpatialClusterer
from models.predictor import ViolationPredictor
import config


def test_clusterer_creation():
    clusterer = SpatialClusterer()
    assert clusterer is not None, "Should create clusterer"
    assert clusterer.dbscan is None, "DBSCAN should not be fitted yet"
    assert clusterer.kmeans is None, "KMeans should not be fitted yet"


def test_kmeans_clustering():
    df = generate_synthetic_data(n_records=500)
    df, _, feature_cols = engineer_features(df)

    clusterer = SpatialClusterer()
    df = clusterer.fit_kmeans(df, n_clusters=5)

    assert "cluster_kmeans" in df.columns, "Should have cluster_kmeans column"
    assert df["cluster_kmeans"].nunique() <= 5, "Should have at most 5 clusters"
    assert clusterer.cluster_centers_ is not None, "Should have cluster centers"


def test_predictor_creation():
    predictor = ViolationPredictor()
    assert predictor is not None, "Should create predictor"
    assert predictor.model is None, "Model should not be fitted yet"


def test_predictor_training():
    df = generate_synthetic_data(n_records=500)
    df, _, feature_cols = engineer_features(df)

    clusterer = SpatialClusterer()
    df = clusterer.fit_kmeans(df, n_clusters=5)

    feature_cols_with_cluster = feature_cols + ["cluster_kmeans"]

    predictor = ViolationPredictor()
    predictor.fit(df, feature_cols=feature_cols_with_cluster)

    assert predictor.model is not None, "Model should be fitted"
    assert len(predictor.classes_) > 0, "Should have classes"


def test_predictor_prediction():
    df = generate_synthetic_data(n_records=500)
    df, _, feature_cols = engineer_features(df)

    clusterer = SpatialClusterer()
    df = clusterer.fit_kmeans(df, n_clusters=5)

    feature_cols_with_cluster = feature_cols + ["cluster_kmeans"]

    predictor = ViolationPredictor()
    predictor.fit(df, feature_cols=feature_cols_with_cluster)

    X = df[feature_cols_with_cluster].values[:10]
    predictions = predictor.predict(X)
    probas = predictor.predict_proba(X)

    assert predictions.shape[0] == 10, "Should predict for 10 samples"
    assert probas.shape == (10, len(predictor.classes_)), "Proba shape should match"


def test_feature_importance():
    df = generate_synthetic_data(n_records=500)
    df, _, feature_cols = engineer_features(df)

    clusterer = SpatialClusterer()
    df = clusterer.fit_kmeans(df, n_clusters=5)

    feature_cols_with_cluster = feature_cols + ["cluster_kmeans"]

    predictor = ViolationPredictor()
    predictor.fit(df, feature_cols=feature_cols_with_cluster)

    importance = predictor.get_feature_importance()

    assert importance is not None, "Should return feature importance"
    assert len(importance) > 0, "Should have features"


def test_cluster_stats():
    df = generate_synthetic_data(n_records=500)
    df, _, feature_cols = engineer_features(df)

    clusterer = SpatialClusterer()
    df = clusterer.fit_kmeans(df, n_clusters=5)

    stats = clusterer.get_cluster_info("cluster_kmeans")

    assert isinstance(stats, dict), "Should return dict of stats"
    for cluster_id, stat in stats.items():
        assert "count" in stat, "Should have count"
        assert "dominant_violation" in stat, "Should have dominant_violation"
        assert "center_lat" in stat, "Should have center_lat"
        assert "center_lon" in stat, "Should have center_lon"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
