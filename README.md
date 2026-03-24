# 🚓 NakaAnalytics
### End-to-End Predictive Deployment System for Traffic Police Optimization

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0%2B-FF6600?logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io/)
[![Scikit-learn](https://img.shields.io/badge/Scikit--learn-1.3%2B-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Redis](https://img.shields.io/badge/Redis-5.0%2B-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*An intelligent ML-powered system that recommends optimal naka (police checkpoint) placements to maximize traffic violation detection — in real time.*

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the System](#running-the-system)
- [Usage](#-usage)
  - [Training the Model](#training-the-model)
  - [API Endpoints](#api-endpoints)
  - [Real-Time Dashboard](#real-time-dashboard)
- [Configuration](#-configuration)
- [ML Pipeline](#-ml-pipeline)
- [Violation Types](#-violation-types)
- [Testing](#-testing)
- [Contributing](#-contributing)

---

## 🌟 Overview

**NakaAnalytics** is an end-to-end machine learning system built to help traffic police departments make smarter, data-driven decisions about where and when to deploy naka checkpoints. By analyzing historical violation patterns, geographic hotspots, time-of-day trends, and weather conditions, the system produces real-time recommendations that maximize the probability of detecting violations.

The system is currently calibrated for **Nagpur, Maharashtra, India**, with zone-specific violation patterns (e.g., DUI near bar zones, helmet violations near colleges), but the architecture is fully generalizable to any city.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **ML-Powered Predictions** | XGBoost classifier trained on 50,000+ synthetic violation records across 7 violation categories |
| 📍 **Spatial Clustering** | DBSCAN hotspot discovery + KMeans grid-based zone clustering for intelligent deployment zones |
| 🔄 **Auto-Retraining** | APScheduler triggers automated retraining every 6 hours with concept drift detection |
| 📡 **Real-Time Dashboard** | Live violation feed, interactive Leaflet map, heatmap, and Chart.js analytics via WebSocket |
| 🌊 **Drift Detection** | PSI (Population Stability Index) and KL Divergence monitoring to catch model decay early |
| 🚀 **REST + WebSocket API** | FastAPI backend serving recommendations, model status, and streaming violation events |
| 🎨 **Premium UI** | Dark mode glassmorphism dashboard with cluster-density-based naka redeployment visualization |
| 📊 **EDA Suite** | Full exploratory data analysis with Matplotlib, Seaborn, and Plotly visualizations |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     NakaAnalytics System                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────┐  │
│  │   Dashboard     │   │   FastAPI       │   │ Scheduler │  │
│  │  (Leaflet/WS)   │◄─►│   REST API      │◄─►│(6h Retrain│  │
│  └────────┬────────┘   └────────┬────────┘   └───────────┘  │
│           │                     │                            │
│      ┌────▼──────────────────────▼────┐                      │
│      │           Engine Layer         │                      │
│      │  Recommender │ Drift Detector  │                      │
│      │  Predictor   │ Eval Metrics    │                      │
│      └────┬──────────────────────┬────┘                      │
│           │                      │                           │
│      ┌────▼──────────────────────▼────┐                      │
│      │          Pipeline Layer        │                      │
│      │  Feature Eng. │ Train │ Infer  │                      │
│      └────┬──────────────────────┬────┘                      │
│           │                      │                           │
│      ┌────▼──────────────────────▼────┐                      │
│      │            Data Layer          │                      │
│      │  Synthetic Generator │ SQLite  │                      │
│      │  Redis Pub/Sub       │ Cache   │                      │
│      └────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

**Training Flow:**
```
Synthetic Data → Feature Engineering → Clustering (DBSCAN + KMeans) → XGBoost Training → Save Models
```

**Inference Flow:**
```
API Request → Load Models → Generate Zone Candidates → Predict Probabilities → Rank & Recommend
```

**Real-Time Flow:**
```
Violation Event → API Ingest → SQLite Storage → Redis Pub/Sub → WebSocket → Dashboard
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API Framework** | FastAPI | REST endpoints + WebSocket server |
| **ML Models** | XGBoost, Scikit-learn | Violation probability classification |
| **Clustering** | DBSCAN, KMeans, HDBSCAN | Hotspot discovery & zone segmentation |
| **Storage** | SQLite | Violations, recommendations, metadata |
| **Message Queue** | Redis | Pub/Sub streaming for real-time events |
| **Scheduling** | APScheduler | Automated retraining + drift checks |
| **Dashboard** | Leaflet.js, Chart.js | Interactive maps & analytics charts |
| **Visualization** | Matplotlib, Seaborn, Plotly | EDA and reporting |
| **Serialization** | Joblib, Pydantic | Model persistence & data validation |

---

## 📁 Project Structure

```
NakaAnalytics/
├── main.py                  # FastAPI app entrypoint
├── config.py                # Global configuration & hyperparameters
├── requirements.txt         # Python dependencies
│
├── api/
│   ├── routes.py            # REST API route definitions
│   ├── websocket.py         # WebSocket endpoint (real-time feed)
│   └── streaming.py         # Redis streaming integration
│
├── data/
│   ├── synthetic_generator.py  # Generates 50K+ realistic violation records
│   └── generated/              # Auto-generated CSV datasets
│
├── features/
│   └── feature_engineering.py  # Cyclical encoding, grid cells, time buckets
│
├── models/
│   ├── predictor.py         # ViolationPredictor (XGBoost wrapper)
│   ├── clustering.py        # SpatialClusterer (DBSCAN + KMeans)
│   └── saved/               # Serialized models (.json, .joblib)
│
├── pipeline/
│   ├── train_pipeline.py    # End-to-end training orchestration
│   ├── inference_pipeline.py # Load models & run predictions
│   └── drift_detector.py    # PSI + KL divergence drift monitoring
│
├── engine/
│   └── recommender.py       # Ranks & assigns naka deployment recommendations
│
├── scheduler/
│   └── retrain_scheduler.py # APScheduler job with drift-triggered retraining
│
├── evaluation/
│   └── metrics.py           # Precision@K, Recall@K, Uplift, Hit Rate
│
├── eda/
│   ├── eda_analysis.py      # Exploratory data analysis scripts
│   └── output/              # Generated charts and reports
│
├── db/
│   └── naka_analytics.db    # SQLite database (auto-created)
│
├── dashboard/
│   ├── index.html           # Dashboard UI
│   ├── app.js               # WebSocket client + Leaflet + Chart.js logic
│   └── style.css            # Glassmorphism dark-mode styling
│
├── tests/
│   └── ...                  # Pytest test suite
│
└── docs/
    └── architecture.md      # Detailed architecture documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Redis** (for real-time streaming)
  - Windows: [Download Redis for Windows](https://github.com/tporadowski/redis/releases)
  - Or use Docker: `docker run -d -p 6379:6379 redis`
- `pip` or a virtual environment manager (e.g., `venv`, `conda`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/NakaAnalytics.git
   cd NakaAnalytics
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv .venv

   # Windows
   .venv\Scripts\activate

   # macOS / Linux
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start Redis** (in a separate terminal or as a service):
   ```bash
   redis-server
   ```

### Running the System

#### Step 1 — Train the ML Models

Run the full training pipeline to generate synthetic data, fit clustering, and train XGBoost:

```bash
python pipeline/train_pipeline.py
```

Expected output:
```
============================================================
NAKA ANALYTICS TRAINING PIPELINE
============================================================
[1/5] Generating training data...
[2/5] Engineering features...
[3/5] Training clustering model...
[4/5] Training prediction model...
[5/5] Saving metadata...
TRAINING COMPLETE
```

#### Step 2 — Start the API Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Step 3 — Access the Dashboard

Open your browser and navigate to:

```
http://localhost:8000/dashboard
```

API documentation (Swagger UI):
```
http://localhost:8000/docs
```

---

## 📡 Usage

### Training the Model

```bash
# Full training pipeline
python pipeline/train_pipeline.py

# Train only the predictor model
python models/predictor.py

# Run inference on saved models
python pipeline/inference_pipeline.py
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info and version |
| `GET` | `/health` | Health check |
| `GET` | `/recommendations` | Get top naka deployment recommendations |
| `GET` | `/model/status` | Model version, training time, and accuracy |
| `GET` | `/clusters` | Active hotspot clusters and coordinates |
| `POST` | `/violations/ingest` | Ingest a new violation event |
| `GET` | `/violations/recent` | Fetch recent violation events |
| `WS` | `/ws` | WebSocket stream for live dashboard updates |

> Full interactive API docs available at **`/docs`** (Swagger UI) or **`/redoc`** (ReDoc).

### Real-Time Dashboard

The dashboard provides:

- 🗺️ **Interactive Leaflet Map** — Live naka positions with cluster-density redeployment logic
- 🔥 **Heatmap Overlay** — Dynamic violation density across Nagpur zones
- 📋 **Live Violation Feed** — Real-time stream of detected violations with confidence scores
- 📊 **Analytics Charts** — Violation type distribution, time-of-day trends, top deployment zones
- 🚔 **Top Deployments Panel** — Ranked recommendations updated in real-time

---

## ⚙️ Configuration

All system parameters are centralized in `config.py`:

```python
# Data
SYNTHETIC_DATA_SIZE = 50_000    # Training records to generate
RANDOM_SEED         = 42

# Clustering
DBSCAN_EPS          = 0.01      # DBSCAN neighborhood radius
DBSCAN_MIN_SAMPLES  = 10        # Minimum cluster size
KMEANS_N_CLUSTERS   = 15        # Number of KMeans zones

# XGBoost
XGBOOST_PARAMS = {
    "max_depth":     6,
    "learning_rate": 0.1,
    "n_estimators":  100,
    "objective":     "multi:softprob",
}

# Retraining & Drift
RETRAIN_INTERVAL_HOURS = 6      # Hours between scheduled retrains
DRIFT_THRESHOLD_PSI    = 0.25   # PSI threshold triggering retrain
DRIFT_THRESHOLD_KL     = 0.10   # KL divergence threshold

# Grid Resolution
GRID_LAT_SIZE = 0.001           # ~111 meters per lat unit
GRID_LON_SIZE = 0.001

# Redis
REDIS_URL = "redis://localhost:6379/0"
```

---

## 🧠 ML Pipeline

### Feature Engineering

| Feature | Description |
|---------|-------------|
| `hour_sin`, `hour_cos` | Cyclical hour-of-day encoding |
| `dow_sin`, `dow_cos` | Cyclical day-of-week encoding |
| `is_weekend` | Binary weekend flag |
| `is_holiday` | Binary holiday flag |
| `lat_grid`, `lon_grid` | Discretized GPS grid cells |
| `weather_encoded` | Label-encoded weather condition |
| `vehicle_class_encoded` | Label-encoded vehicle type |
| `time_bucket_encoded` | Time period bucket (rush_morning, midday, etc.) |
| `cluster_kmeans` | Assigned spatial cluster ID |

### Model: ViolationPredictor (XGBoost)

- **Task**: Multi-class classification across 7 violation types
- **Input**: 12 engineered features per location-time combination
- **Output**: Probability distribution over violation types
- **Evaluation**: 80/20 stratified train-val split

### Drift Detection

The `DriftDetector` monitors PSI and KL divergence between reference and current feature distributions. When thresholds are exceeded, retraining is triggered automatically without manual intervention.

---

## 🚦 Violation Types

The system classifies and predicts the following violation types, each with domain-specific zone affinity:

| Violation | Primary Zone | Peak Hours |
|-----------|-------------|-----------|
| `DUI` | Bar zones | Late night (20:00–00:00) |
| `No_Helmet` | College zones | Rush hour (7:00–10:00) |
| `Speeding` | Highways | Early morning (0:00–7:00) |
| `Signal_Jump` | Intersections | Rush hours |
| `Overloading` | Industrial zones | Morning |
| `Wrong_Way` | Urban areas | Evening |
| `No_Violation` | All zones | — |

---

## 🧪 Testing

Run the full test suite with:

```bash
pytest tests/ -v
```

Run a specific test file:

```bash
pytest tests/test_predictor.py -v
```

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- **Nagpur Traffic Police** — Domain inspiration for realistic zone and violation pattern modeling
- **XGBoost Team** — High-performance gradient boosting implementation
- **FastAPI** — Modern, fast Python web framework
- **Leaflet.js** — Lightweight, mobile-friendly interactive maps

---

<div align="center">
  <sub>Built with ❤️ for smarter, data-driven traffic law enforcement.</sub>
</div>
