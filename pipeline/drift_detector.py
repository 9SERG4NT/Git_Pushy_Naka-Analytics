import pandas as pd
import numpy as np
from scipy.stats import entropy
from pathlib import Path
import json
import config


class DriftDetector:
    def __init__(
        self,
        psi_threshold=config.DRIFT_THRESHOLD_PSI,
        kl_threshold=config.DRIFT_THRESHOLD_KL,
    ):
        self.psi_threshold = psi_threshold
        self.kl_threshold = kl_threshold
        self.baseline_distribution = None

    def compute_psi(self, baseline, current, bins=10):
        baseline = np.array(baseline)
        current = np.array(current)

        min_val = min(baseline.min(), current.min())
        max_val = max(baseline.max(), current.max())

        bin_edges = np.linspace(min_val, max_val, bins + 1)

        baseline_bins = np.digitize(baseline, bin_edges) - 1
        baseline_bins = np.clip(baseline_bins, 0, bins - 1)
        current_bins = np.digitize(current, bin_edges) - 1
        current_bins = np.clip(current_bins, 0, bins - 1)

        baseline_counts = np.bincount(baseline_bins, minlength=bins)
        current_counts = np.bincount(current_bins, minlength=bins)

        baseline_pct = baseline_counts / len(baseline)
        current_pct = current_counts / len(current)

        baseline_pct = np.where(baseline_pct == 0, 0.0001, baseline_pct)
        current_pct = np.where(current_pct == 0, 0.0001, current_pct)

        psi = np.sum((current_pct - baseline_pct) * np.log(current_pct / baseline_pct))

        return psi

    def compute_kl_divergence(self, baseline, current):
        baseline = np.array(baseline) / np.sum(baseline)
        current = np.array(current) / np.sum(current)

        baseline = np.where(baseline == 0, 0.0001, baseline)
        current = np.where(current == 0, 0.0001, current)

        kl = entropy(baseline, current)

        return kl

    def set_baseline(self, df):
        self.baseline_distribution = {
            "violation_counts": df["violation_type"].value_counts().to_dict(),
            "hour_distribution": df["hour"].value_counts().to_dict(),
            "weather_distribution": df["weather"].value_counts().to_dict(),
        }

    def detect_drift(self, current_df):
        if self.baseline_distribution is None:
            self.set_baseline(current_df)
            return {
                "drift_detected": False,
                "message": "Baseline set from current data",
            }

        current_violation_counts = current_df["violation_type"].value_counts()
        baseline_violation_counts = pd.Series(
            self.baseline_distribution["violation_counts"]
        )

        current_violation_counts = current_violation_counts.reindex(
            baseline_violation_counts.index, fill_value=0
        )
        baseline_violation_counts = baseline_violation_counts.reindex(
            current_violation_counts.index, fill_value=0
        )

        violation_kl = self.compute_kl_divergence(
            baseline_violation_counts.values, current_violation_counts.values
        )

        current_hour_counts = current_df["hour"].value_counts()
        baseline_hour_counts = pd.Series(
            self.baseline_distribution["hour_distribution"]
        )

        max_hour = max(
            current_hour_counts.index.max(), baseline_hour_counts.index.max()
        )
        all_hours = list(range(0, max(max_hour + 1, 24)))

        current_hour_counts = current_hour_counts.reindex(all_hours, fill_value=0)
        baseline_hour_counts = baseline_hour_counts.reindex(all_hours, fill_value=0)

        hour_psi = self.compute_psi(
            baseline_hour_counts.values, current_hour_counts.values
        )

        drift_detected = (
            violation_kl > self.kl_threshold or hour_psi > self.psi_threshold
        )

        return {
            "drift_detected": drift_detected,
            "violation_kl": float(violation_kl),
            "hour_psi": float(hour_psi),
            "violation_kl_threshold": self.kl_threshold,
            "hour_psi_threshold": self.psi_threshold,
            "message": "Drift detected" if drift_detected else "No significant drift",
        }


def main():
    from data.synthetic_generator import main as generate_data

    print("Generating baseline data...")
    baseline_df = generate_data()

    print("Initializing drift detector...")
    detector = DriftDetector()
    detector.set_baseline(baseline_df)
    print("Baseline set")

    print("\nGenerating new data for drift detection...")
    new_df = generate_data()

    print("Detecting drift...")
    result = detector.detect_drift(new_df)

    print("\n=== Drift Detection Results ===")
    print(f"Drift Detected: {result['drift_detected']}")
    print(f"Violation KL: {result['violation_kl']:.4f}")
    print(f"Hour PSI: {result['hour_psi']:.4f}")
    print(f"Message: {result['message']}")

    return result


if __name__ == "__main__":
    main()
