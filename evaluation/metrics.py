import numpy as np
from typing import List, Dict, Any
from sklearn.metrics import precision_score, recall_score, f1_score


def precision_at_k(
    predictions: List[Dict], ground_truth: List[Dict], k: int = 10
) -> float:
    if not predictions or not ground_truth:
        return 0.0

    top_k_preds = predictions[:k]

    pred_violations = set([p.get("naka_type") for p in top_k_preds])
    true_violations = set([g.get("violation_type") for g in ground_truth])

    relevant = len(pred_violations.intersection(true_violations))

    return relevant / min(k, len(pred_violations)) if pred_violations else 0.0


def recall_at_k(
    predictions: List[Dict], ground_truth: List[Dict], k: int = 10
) -> float:
    if not predictions or not ground_truth:
        return 0.0

    top_k_preds = predictions[:k]

    pred_violations = set([p.get("naka_type") for p in top_k_preds])
    true_violations = set([g.get("violation_type") for g in ground_truth])

    relevant = len(pred_violations.intersection(true_violations))

    return relevant / len(true_violations) if true_violations else 0.0


def compute_uplift(
    predicted_recommendations: List[Dict], baseline_yield: float
) -> float:
    if not predicted_recommendations:
        return 0.0

    avg_yield = np.mean(
        [r.get("expected_violation_yield", 0) for r in predicted_recommendations]
    )

    if baseline_yield == 0:
        return 0.0

    uplift = (avg_yield - baseline_yield) / baseline_yield

    return uplift


def compute_hit_rate(
    recommendations: List[Dict], actual_violations: List[Dict], radius_km: float = 0.5
) -> float:
    if not recommendations or not actual_violations:
        return 0.0

    hits = 0

    for rec in recommendations:
        rec_lat = rec.get("location", {}).get("lat")
        rec_lon = rec.get("location", {}).get("lon")

        if rec_lat is None or rec_lon is None:
            continue

        for actual in actual_violations:
            act_lat = actual.get("latitude")
            act_lon = actual.get("longitude")

            if act_lat is None or act_lon is None:
                continue

            distance = haversine_distance(rec_lat, rec_lon, act_lat, act_lon)

            if distance <= radius_km:
                hits += 1
                break

    return hits / len(recommendations) if recommendations else 0.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0

    lat1_rad = np.radians(lat1)
    lon1_rad = np.radians(lon1)
    lat2_rad = np.radians(lat2)
    lon2_rad = np.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2) ** 2
    )
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    return R * c


def evaluate_recommendations(
    predictions: List[Dict], ground_truth: List[Dict], baseline_yield: float = 0.5
) -> Dict[str, float]:
    metrics = {}

    for k in [5, 10, 20]:
        metrics[f"precision_at_{k}"] = precision_at_k(predictions, ground_truth, k)
        metrics[f"recall_at_{k}"] = recall_at_k(predictions, ground_truth, k)

    metrics["uplift"] = compute_uplift(predictions, baseline_yield)
    metrics["hit_rate"] = compute_hit_rate(predictions, ground_truth)

    return metrics


def main():
    test_predictions = [
        {
            "naka_type": "DUI",
            "location": {"lat": 18.52, "lon": 73.86},
            "expected_violation_yield": 0.9,
        },
        {
            "naka_type": "Speeding",
            "location": {"lat": 18.53, "lon": 73.85},
            "expected_violation_yield": 0.85,
        },
        {
            "naka_type": "No_Helmet",
            "location": {"lat": 18.51, "lon": 73.84},
            "expected_violation_yield": 0.8,
        },
    ]

    test_ground_truth = [
        {"violation_type": "DUI", "latitude": 18.5201, "longitude": 73.8601},
        {"violation_type": "Speeding", "latitude": 18.5301, "longitude": 73.8501},
    ]

    metrics = evaluate_recommendations(test_predictions, test_ground_truth)

    print("=== Recommendation Metrics ===")
    for metric, value in metrics.items():
        print(f"{metric}: {value:.4f}")

    return metrics


if __name__ == "__main__":
    main()
