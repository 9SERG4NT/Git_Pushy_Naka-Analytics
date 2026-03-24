# NakaAnalytics Pseudocode

## Training Pipeline

```
PROCEDURE train_pipeline():
    PRINT "Starting training pipeline..."
    
    # Step 1: Generate synthetic data
    violations_df ← generate_synthetic_data(n_records=50000)
    
    # Step 2: Feature engineering
    features_df, encoders, feature_cols ← engineer_features(violations_df)
    
    # Step 3: Clustering
    clusterer ← SpatialClusterer()
    features_df ← clusterer.fit_dbscan(features_df)
    features_df ← clusterer.fit_kmeans(features_df)
    cluster_stats ← clusterer.get_cluster_info()
    SAVE clusterer TO "models/saved/clusterer.joblib"
    
    # Step 4: Train predictor
    feature_cols_with_cluster ← feature_cols + ["cluster_kmeans"]
    predictor ← ViolationPredictor()
    predictor.fit(features_df, target_col="violation_type", feature_cols=feature_cols_with_cluster)
    SAVE predictor TO "models/saved/predictor_model.json"
    
    # Step 5: Save metadata
    metadata ← {
        "trained_at": NOW(),
        "n_records": len(features_df),
        "n_features": len(feature_cols_with_cluster),
        "n_clusters": len(cluster_stats),
        "n_classes": len(predictor.classes_),
        "feature_importance": predictor.get_feature_importance()
    }
    SAVE metadata TO "models/saved/model_metadata.json"
    
    RETURN {"status": "success", "metadata": metadata}
```

## Inference Pipeline

```
PROCEDURE inference_pipeline(top_k=10, current_hour=NOW().hour):
    PRINT "Starting inference pipeline..."
    
    # Step 1: Load models
    predictor ← LOAD "models/saved/predictor_model.json"
    clusterer ← LOAD "models/saved/clusterer.joblib"
    
    # Step 2: Generate candidates
    candidates ← []
    FOR each cluster_id IN clusterer.cluster_centers:
        FOR each time_bucket IN TIME_BUCKETS:
            candidates.append({
                "cluster_id": cluster_id,
                "time_bucket": time_bucket,
                "latitude": clusterer.cluster_centers[cluster_id].lat,
                "longitude": clusterer.cluster_centers[cluster_id].lon
            })
    
    # Step 3: Score candidates
    scored_candidates ← []
    FOR each candidate IN candidates:
        proba ← predictor.predict_proba(candidate)
        expected_yield ← MAX(proba)
        
        scored_candidates.append({
            "rank": 0,
            "location": {"lat": candidate.latitude, "lon": candidate.longitude},
            "time_window": candidate.time_bucket,
            "naka_type": ARGMAX(proba),
            "expected_violation_yield": expected_yield,
            "confidence": expected_yield
        })
    
    # Step 4: Rank and return top-k
    scored_candidates ← SORT(scored_candidates BY expected_violation_yield DESCENDING)
    FOR i IN range(len(scored_candidates)):
        scored_candidates[i].rank ← i + 1
    
    RETURN scored_candidates[:top_k]
```

## Drift Detection

```
PROCEDURE detect_drift(current_df, baseline_df=NONE):
    IF baseline_df IS NONE:
        baseline_distribution ← {
            "violation_counts": current_df["violation_type"].value_counts(),
            "hour_distribution": current_df["hour"].value_counts()
        }
        RETURN {"drift_detected": FALSE, "message": "Baseline set"}
    
    # Compute KL divergence for violation distribution
    current_violations ← current_df["violation_type"].value_counts()
    baseline_violations ← baseline_df["violation_type"].value_counts()
    violation_kl ← KL_DIVERGENCE(baseline_violations, current_violations)
    
    # Compute PSI for hourly distribution
    current_hours ← current_df["hour"].value_counts()
    baseline_hours ← baseline_df["hour"].value_counts()
    hour_psi ← POPULATION_STABILITY_INDEX(baseline_hours, current_hours)
    
    drift_detected ← (violation_kl > 0.1) OR (hour_psi > 0.25)
    
    RETURN {
        "drift_detected": drift_detected,
        "violation_kl": violation_kl,
        "hour_psi": hour_psi,
        "message": "Drift detected" IF drift_detected ELSE "No drift"
    }
```

## Recommendation Engine

```
PROCEDURE get_recommendations(top_k=10, current_hour=NONE):
    # Load models
    predictor ← LOAD_MODEL("predictor")
    clusterer ← LOAD_MODEL("clusterer")
    
    # Generate candidate locations
    candidates ← generate_candidates(current_hour)
    
    # Score each candidate
    FOR candidate IN candidates:
        feature_vec ← build_feature_vector(candidate)
        proba ← predictor.predict_proba(feature_vec)
        
        candidate.expected_yield ← MAX(proba)
        candidate.naka_type ← CLASS_WITH_MAX(proba)
        candidate.confidence ← candidate.expected_yield
    
    # Sort by yield and return top-k
    SORT candidates BY expected_yield DESCENDING
    
    FOR i IN range(len(candidates)):
        candidates[i].rank ← i + 1
    
    RETURN candidates[:top_k]
```

## API Endpoints

```
# Get recommendations
GET /api/recommendations?top_k=10
    → recommender.get_recommendations(top_k=10)
    → RETURN {"status": "success", "recommendations": [...]}

# Ingest violation
POST /api/ingest
    BODY: ViolationEvent(timestamp, latitude, longitude, vehicle_class, violation_type, weather, day_of_week, is_holiday)
    → storage.insert_violation(event)
    → streaming.publish_violation(event)
    → RETURN {"status": "success"}

# Trigger retrain
POST /api/retrain
    → train_pipeline()
    → RETURN {"status": "success", "message": "Model retrained"}

# Get model status
GET /api/model/status
    → LOAD "models/saved/model_metadata.json"
    → RETURN {"status": "success", "model_status": "trained", "metadata": {...}}
```

## Scheduler

```
# APScheduler configuration
SCHEDULER.add_job(
    retrain_job,
    trigger=IntervalTrigger(hours=6),
    id="retrain_job"
)

SCHEDULER.add_job(
    check_drift_and_retrain,
    trigger=IntervalTrigger(hours=1),
    id="drift_check_job"
)

PROCEDURE retrain_job():
    result ← train_pipeline()
    LOG "Retraining completed: {result.status}"
    RETURN result

PROCEDURE check_drift_and_retrain():
    current_df ← get_latest_violations()
    drift_result ← detect_drift(current_df)
    
    IF drift_result.drift_detected:
        LOG "Drift detected, triggering retraining..."
        RETURN retrain_job()
    ELSE:
        LOG "No drift detected, skipping retraining"
        RETURN {"status": "no_retrain"}
```
