import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parent.parent))

import config

from data.synthetic_generator import main as generate_data
from features.feature_engineering import engineer_features
from models.clustering import SpatialClusterer
from models.predictor import ViolationPredictor


def train_pipeline():
    print("=" * 60)
    print("NAKA ANALYTICS TRAINING PIPELINE")
    print("=" * 60)

    print("\n[1/5] Generating training data...")
    df = generate_data()
    print(f"Generated {len(df)} records")

    print("\n[2/5] Engineering features...")
    df, encoders, feature_cols = engineer_features(df)
    print(f"Feature columns: {feature_cols}")

    print("\n[3/5] Training clustering model...")
    clusterer = SpatialClusterer()
    df = clusterer.fit_dbscan(df)
    df = clusterer.fit_kmeans(df)

    cluster_stats = clusterer.get_cluster_info("cluster_kmeans")
    print(f"KMeans clusters: {len(cluster_stats)}")

    clusterer_path = config.SAVED_MODELS_DIR / "clusterer.joblib"
    clusterer.save(clusterer_path)
    print(f"Saved clusterer to {clusterer_path}")

    print("\n[4/5] Training prediction model...")
    feature_cols_with_cluster = feature_cols + ["cluster_kmeans"]

    predictor = ViolationPredictor()
    predictor.fit(df, feature_cols=feature_cols_with_cluster)

    importance = predictor.get_feature_importance()
    print("\nTop 5 Feature Importance:")
    sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    for feat, imp in sorted_importance[:5]:
        print(f"  {feat}: {imp:.4f}")

    model_path = config.SAVED_MODELS_DIR / "predictor_model.json"
    encoders_path = config.SAVED_MODELS_DIR / "predictor_encoders.joblib"
    predictor.save(model_path, encoders_path)
    print(f"\nSaved predictor to {model_path}")

    print("\n[5/5] Saving metadata...")
    metadata = {
        "trained_at": datetime.now().isoformat(),
        "n_records": len(df),
        "n_features": len(feature_cols_with_cluster),
        "n_clusters": len(cluster_stats),
        "n_classes": len(predictor.classes_),
        "classes": [str(c) for c in predictor.classes_],
        "feature_importance": importance,
    }

    import json

    metadata_path = config.SAVED_MODELS_DIR / "model_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)

    return {"status": "success", "metadata": metadata}


if __name__ == "__main__":
    result = train_pipeline()
    print("\nFinal Result:")
    print(result)
