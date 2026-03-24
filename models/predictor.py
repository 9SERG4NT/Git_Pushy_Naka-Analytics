import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
from pathlib import Path
import config


class ViolationPredictor:
    def __init__(self):
        self.model = None
        self.encoders = {}
        self.feature_names = []
        self.classes_ = []

    def fit(self, df, target_col="violation_type", feature_cols=None):
        if feature_cols is None:
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
                "cluster_kmeans",
            ]

        self.feature_names = feature_cols

        if target_col not in df.columns:
            raise ValueError(f"Target column {target_col} not found")

        from sklearn.preprocessing import LabelEncoder

        self.encoders["target"] = LabelEncoder()
        y = self.encoders["target"].fit_transform(df[target_col])
        self.classes_ = self.encoders["target"].classes_

        missing_cols = [c for c in feature_cols if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing columns: {missing_cols}")

        X = df[feature_cols].values

        params = config.XGBOOST_PARAMS.copy()
        params["num_class"] = len(self.classes_)

        self.model = XGBClassifier(**params)

        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=config.RANDOM_SEED, stratify=y
        )

        print("Training XGBoost model...")
        self.model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

        y_pred = self.model.predict(X_val)
        accuracy = accuracy_score(y_val, y_pred)
        print(f"Validation Accuracy: {accuracy:.4f}")

        return self

    def predict_proba(self, X):
        if self.model is None:
            raise ValueError("Model not trained")
        return self.model.predict_proba(X)

    def predict(self, X):
        if self.model is None:
            raise ValueError("Model not trained")
        return self.model.predict(X)

    def get_feature_importance(self):
        if self.model is None:
            return None
        importance = [float(x) for x in self.model.feature_importances_]
        return dict(zip(self.feature_names, importance))

    def save(self, model_path, encoders_path):
        joblib.dump(self.model, model_path)
        joblib.dump(self.encoders, encoders_path)

    @classmethod
    def load(cls, model_path, encoders_path):
        instance = cls()
        instance.model = joblib.load(model_path)
        instance.encoders = joblib.load(encoders_path)
        instance.classes_ = instance.encoders["target"].classes_
        return instance


def main():
    from data.synthetic_generator import main as generate_data
    from features.feature_engineering import engineer_features
    from models.clustering import SpatialClusterer

    print("Generating synthetic data...")
    df = generate_data()

    print("Engineering features...")
    df, encoders, feature_cols = engineer_features(df)

    print("Fitting clustering...")
    clusterer = SpatialClusterer()
    df = clusterer.fit_kmeans(df)

    feature_cols.append("cluster_kmeans")

    print("Training predictor...")
    predictor = ViolationPredictor()
    predictor.fit(df, feature_cols=feature_cols)

    importance = predictor.get_feature_importance()
    print("\nFeature Importance:")
    for feat, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {feat}: {imp:.4f}")

    model_path = config.SAVED_MODELS_DIR / "predictor_model.json"
    encoders_path = config.SAVED_MODELS_DIR / "predictor_encoders.joblib"
    predictor.save(model_path, encoders_path)
    print(f"\nModel saved to: {model_path}")

    return predictor


if __name__ == "__main__":
    main()
