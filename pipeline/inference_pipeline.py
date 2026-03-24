import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import json
import config

from engine.recommender import NakaRecommender


def inference_pipeline(top_k=10, current_hour=None, date=None):
    print("=" * 60)
    print("NAKA ANALYTICS INFERENCE PIPELINE")
    print("=" * 60)

    print("\n[1/3] Loading models...")
    recommender = NakaRecommender()
    recommender.load_models()
    print("Models loaded successfully")

    print("\n[2/3] Generating recommendations...")
    recommendations = recommender.get_recommendations(
        top_k=top_k, current_hour=current_hour, date=date
    )
    print(f"Generated {len(recommendations)} recommendations")

    print("\n[3/3] Saving output...")
    output_path = config.BASE_DIR / "recommendations_output.json"
    with open(output_path, "w") as f:
        json.dump(recommendations, f, indent=2)
    print(f"Saved to {output_path}")

    print("\n=== Top Recommendations ===")
    for rec in recommendations[:5]:
        print(
            f"  {rec['rank']}. {rec['naka_type']} @ ({rec['location']['lat']:.4f}, {rec['location']['lon']:.4f})"
        )
        print(
            f"     Time: {rec['time_window']}, Yield: {rec['expected_violation_yield']}"
        )

    print("\n" + "=" * 60)
    print("INFERENCE COMPLETE")
    print("=" * 60)

    return recommendations


if __name__ == "__main__":
    recommendations = inference_pipeline(top_k=10)
