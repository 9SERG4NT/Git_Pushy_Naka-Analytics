import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
GENERATED_DATA_DIR = DATA_DIR / "generated"
EDA_OUTPUT_DIR = BASE_DIR / "eda" / "output"
MODELS_DIR = BASE_DIR / "models"
SAVED_MODELS_DIR = MODELS_DIR / "saved"
DB_DIR = BASE_DIR / "db"

GENERATED_DATA_DIR.mkdir(parents=True, exist_ok=True)
EDA_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
DB_DIR.mkdir(parents=True, exist_ok=True)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SQLITE_DB_PATH = DB_DIR / "naka_analytics.db"

SYNTHETIC_DATA_SIZE = 50000
RANDOM_SEED = 42

DBSCAN_EPS = 0.01
DBSCAN_MIN_SAMPLES = 10
KMEANS_N_CLUSTERS = 15

XGBOOST_PARAMS = {
    "max_depth": 6,
    "learning_rate": 0.1,
    "n_estimators": 100,
    "objective": "multi:softprob",
    "num_class": 7,
    "eval_metric": "mlogloss",
    "random_state": RANDOM_SEED,
    "verbosity": 0,
}

RETRAIN_INTERVAL_HOURS = 6
DRIFT_THRESHOLD_PSI = 0.25
DRIFT_THRESHOLD_KL = 0.1

GRID_LAT_SIZE = 0.001
GRID_LON_SIZE = 0.001

VIOLATION_TYPES = [
    "DUI",
    "No_Helmet",
    "Speeding",
    "Signal_Jump",
    "Overloading",
    "Wrong_Way",
    "No_Violation",
]

TIME_BUCKETS = {
    "rush_morning": (7, 10),
    "midday": (10, 17),
    "rush_evening": (17, 20),
    "late_night": (20, 24),
    "early_morning": (0, 7),
}

ZONE_TYPES = {
    "bar_zone": [(21.1400, 21.1480), (79.0600, 79.0750)],
    "college_zone": [(21.1250, 21.1350), (79.0500, 79.0650)],
    "highway": [(21.0900, 21.1800), (79.0300, 79.1200)],
    "intersection": [(21.1350, 21.1550), (79.0650, 79.0850)],
    "industrial": [(21.0950, 21.1150), (79.0300, 79.0550)],
    "urban": [(21.1200, 21.1650), (79.0550, 79.1000)],
}

NAGPUR_CENTER = (21.1458, 79.0882)
