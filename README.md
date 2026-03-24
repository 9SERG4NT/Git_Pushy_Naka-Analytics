# 🚓 NakaAnalytics — OPS_COMMAND
### AI-Powered Tactical Deployment System for Traffic Police Optimization

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0%2B-FF6600?logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io/)
[![React Native](https://img.shields.io/badge/React_Native-Expo_55-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*A full-stack, ML-powered platform connecting a real-time 3D Command Dashboard with a Tactical Mobile App for field officers — enabling predictive, data-driven naka (checkpoint) deployments.*

**[📹 Watch the Demo Video →](https://drive.google.com/drive/folders/1i3i1kGgx0fd53cQh_dY74aPyzOvAlGV9?usp=sharing)**

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Demo](#-demo)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Backend Setup](#1-backend-setup)
  - [Mobile App Setup](#2-mobile-app-setup)
- [Platform Components](#-platform-components)
  - [Web Dashboard (Command Center)](#web-dashboard--command-center)
  - [Mobile App (Field Terminal)](#mobile-app--field-terminal)
  - [API Endpoints](#api-endpoints)
- [ML Pipeline](#-ml-pipeline)
- [Real-Time Sync Architecture](#-real-time-sync-architecture)
- [Configuration](#-configuration)
- [Violation Types](#-violation-types)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

## 🌟 Overview

**NakaAnalytics (OPS_COMMAND)** is an end-to-end ML-powered tactical deployment system designed for traffic police departments. Instead of relying on gut instinct or static rotations, the platform uses **spatial clustering** and **predictive modeling** to identify violation hotspots and recommend optimal checkpoint placements in real time.

The platform comprises three synchronized layers:

| Layer | Purpose | Used By |
|-------|---------|---------|
| **FastAPI Backend** | AI engine, database, REST + WebSocket API | Both |
| **Web Dashboard** | 3D command visualization, live monitoring | Superadmin / Control Room |
| **React Native Mobile App** | Field deployment, GPS tracking, live map | Individual Officers |

Currently calibrated for **Nagpur, Maharashtra, India**, but the architecture is fully generalizable to any city.

---

## 📹 Demo

**🎥 [Click here to watch the full platform demo](https://drive.google.com/drive/folders/1i3i1kGgx0fd53cQh_dY74aPyzOvAlGV9?usp=sharing)**

The demo showcases:
- Real-time violation simulation on the 3D web dashboard
- Officer login and checkpoint deployment via the mobile app
- Bi-directional sync between web and mobile platforms
- ML-driven hotspot predictions and recommendations
- Heatmap, live feed, and analytics panels

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **ML-Powered Predictions** | XGBoost classifier trained on 50,000+ synthetic violation records across 7 categories |
| 📍 **Spatial Clustering** | DBSCAN hotspot discovery + KMeans grid-based zone clustering for intelligent deployment |
| 🌐 **Real-Time 3D Dashboard** | Interactive Leaflet map with heatmap, live feed, and Chart.js analytics via WebSocket |
| 📱 **Tactical Mobile App** | React Native (Expo) field terminal with officer auth, live map, alerts, and GPS deploy |
| 🔄 **Live Sync** | Web dashboard and mobile app sync in real-time via REST polling + WebSocket |
| 🔥 **Violation Heatmaps** | Dynamic density visualization updated every 8 seconds |
| 🛡️ **Officer Authentication** | Badge ID + password login with session persistence via AsyncStorage |
| 📊 **Analytics Suite** | Violation type distribution, time trends, top deployment rankings, officer stats |
| 🌊 **Drift Detection** | PSI + KL Divergence monitoring to catch model decay and trigger retraining |
| 🎨 **OPS_COMMAND UI** | High-contrast tech-noir aesthetic with dark surfaces, orange primary, yellow accents |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     NakaAnalytics — OPS_COMMAND                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐        ┌─────────────────┐                  │
│  │  📱 Mobile App  │        │  🖥️ Web Dashboard │                 │
│  │  (React Native) │        │  (Leaflet + 3D)  │                 │
│  │  Expo SDK 55    │        │  WebSocket Client │                │
│  └────────┬────────┘        └────────┬─────────┘                 │
│           │ REST Poll (8s)           │ WebSocket (Live)           │
│           │                          │                            │
│      ┌────▼──────────────────────────▼────┐                      │
│      │         FastAPI Backend            │                      │
│      │  /api/sync/state  │  /ws           │                      │
│      │  /api/naka/update │  /api/auth     │                      │
│      └────────────┬───────────────────────┘                      │
│                   │                                              │
│      ┌────────────▼───────────────────────┐                      │
│      │        AI / ML Engine              │                      │
│      │  XGBoost Predictor │ K-Means       │                      │
│      │  DBSCAN Clusterer  │ Recommender   │                      │
│      └────────────┬───────────────────────┘                      │
│                   │                                              │
│      ┌────────────▼───────────────────────┐                      │
│      │         Data Layer                 │                      │
│      │  SQLite DB    │ Synthetic Generator │                     │
│      │  Feature Eng. │ Drift Detector      │                     │
│      └────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flows

**Training Flow:**
```
Synthetic Data → Feature Engineering → DBSCAN + KMeans Clustering → XGBoost Training → Saved Models
```

**Real-Time Sync Loop:**
```
Violation Event → SQLite Storage → /api/sync/state → Web Dashboard (WebSocket)
                                                    → Mobile App (REST Poll every 8s)
```

**Officer Deployment Flow:**
```
Officer GPS → Mobile "DEPLOY" → POST /api/naka/update → SQLite → WebSocket → Dashboard shows 🚔
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python 3.10+** | Core programming language |
| **FastAPI** | Async REST API + WebSocket server |
| **SQLite** | Lightweight database for violations, officers, nakas |
| **Uvicorn** | ASGI server for production deployment |

### Machine Learning
| Technology | Purpose |
|-----------|---------|
| **XGBoost** | Multi-class violation probability classifier |
| **Scikit-learn** | K-Means clustering, preprocessing, evaluation |
| **DBSCAN** | Density-based hotspot discovery |
| **Joblib** | Model serialization and persistence |

### Web Dashboard
| Technology | Purpose |
|-----------|---------|
| **Vanilla JavaScript** | Lightweight, 60 FPS map rendering |
| **Leaflet.js** | Interactive map with dark CartoDB tiles |
| **Leaflet.heat** | Dynamic violation heatmap overlay |
| **Chart.js** | Analytics charts and trend visualizations |

### Mobile App
| Technology | Purpose |
|-----------|---------|
| **React Native** | Cross-platform mobile framework |
| **Expo SDK 55** | Managed workflow, camera, GPS, OTA updates |
| **React Navigation v7** | Tab-based navigation with custom dark theme |
| **react-native-webview** | Leaflet map embedded in native app |
| **AsyncStorage** | Offline session persistence |
| **expo-location** | GPS coordinates for checkpoint deployment |

---

## 📁 Project Structure

```
NakaAnalytics/
├── main.py                     # FastAPI app entrypoint
├── config.py                   # Global configuration & hyperparameters
├── requirements.txt            # Python dependencies
│
├── api/
│   ├── routes.py               # 16+ REST API endpoints
│   ├── websocket.py            # WebSocket endpoint for live dashboard
│   └── streaming.py            # Event streaming integration
│
├── data/
│   ├── synthetic_generator.py  # Generates 50K+ realistic violation records
│   └── generated/              # Auto-generated CSV datasets
│
├── features/
│   └── feature_engineering.py  # Cyclical encoding, grid cells, time buckets
│
├── models/
│   ├── predictor.py            # ViolationPredictor (XGBoost wrapper)
│   ├── clustering.py           # SpatialClusterer (DBSCAN + KMeans)
│   └── saved/                  # Serialized models (.json, .joblib)
│
├── pipeline/
│   ├── train_pipeline.py       # End-to-end training orchestration
│   ├── inference_pipeline.py   # Load models & run predictions
│   └── drift_detector.py       # PSI + KL divergence drift monitoring
│
├── engine/
│   └── recommender.py          # Ranks & assigns naka recommendations
│
├── evaluation/
│   └── metrics.py              # Precision@K, Recall@K, Hit Rate
│
├── db/
│   ├── storage.py              # SQLite ORM for officers, nakas, violations
│   └── naka_analytics.db       # SQLite database (auto-created)
│
├── dashboard/
│   ├── index.html              # 3D Command Dashboard UI
│   ├── app.js                  # WebSocket + Leaflet + Chart.js logic
│   └── style.css               # OPS_COMMAND dark-mode styling
│
└── NakaMobile/                 # React Native Mobile App
    ├── App.js                  # Navigation + theme entry point
    ├── app.json                # Expo configuration
    ├── package.json            # Node.js dependencies
    └── src/
        ├── constants/
        │   └── theme.js        # OPS_COMMAND design system + API_BASE_URL
        ├── context/
        │   └── AuthContext.js   # Authentication state management
        ├── services/
        │   └── api.js          # REST API communication layer
        └── screens/
            ├── LoginScreen.js  # Officer badge + password login
            ├── MapScreen.js    # Deployment overview (hero card + checkpoints)
            ├── AlertsScreen.js # Priority-coded incident alerts
            ├── LiveMapScreen.js# Full-screen Leaflet map + live feed
            └── StatsScreen.js  # Officer analytics & performance
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/9SERG4NT/Git_Pushy_Naka-Analytics.git
cd Git_Pushy_Naka-Analytics

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install Python dependencies
pip install -r requirements.txt

# Train the ML models
python pipeline/train_pipeline.py

# Start the backend server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Once running, access:
- **Dashboard:** http://localhost:8000/dashboard
- **API Docs:** http://localhost:8000/docs (Swagger UI)
- **Health Check:** http://localhost:8000/health

### 2. Mobile App Setup

```bash
cd NakaMobile

# Install Node.js dependencies
npm install

# Update API_BASE_URL in src/constants/theme.js
# Replace the IP with your machine's WiFi IP address:
#   API_BASE_URL = 'http://<YOUR_WIFI_IP>:8000'
# Find your IP: ipconfig (Windows) or ifconfig (macOS/Linux)

# Start Expo development server
npx expo start --clear
```

Scan the QR code with **Expo Go** on your phone (make sure both devices are on the same WiFi network).

**Default Login Credentials:**
- Badge ID: `NP001`
- Password: `naka123`

---

## 🖥️ Platform Components

### Web Dashboard — Command Center

The web dashboard is the superadmin's real-time command center, accessible at `/dashboard`.

| Panel | Function |
|-------|----------|
| 🗺️ **Interactive Map** | Dark-tiled Leaflet map with violation markers and naka shields |
| 🔥 **Heatmap Overlay** | Dynamic violation density visualization |
| 📋 **Live Feed** | Real-time stream of detected violations with confidence scores |
| 📊 **Analytics** | Violation type distribution, time trends via Chart.js |
| 🚔 **Top Deployments** | ML-ranked recommendations updated continuously |
| 🌡️ **Model Insights** | Training accuracy, drift status, feature importance |

### Mobile App — Field Terminal

The mobile app is built for individual officers deployed in the field.

| Screen | Purpose |
|--------|---------|
| 🔐 **Login** | Badge ID + password authentication with session persistence |
| 📍 **Deploy** | Hero card for #1 recommended deployment, officer checkpoint chips |
| 🔔 **Alerts** | Priority-coded alerts (HIGH/MED/LOW) with left accent bars |
| 🗺️ **Live Map** | Full-screen Leaflet map with auto-polling (8s), heatmap, and live incident feed |
| 📊 **Stats** | Officer profile, bento stats grid, performance charts |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/recommendations` | ML-generated deployment recommendations |
| `GET` | `/api/sync/state` | **Master sync** — violations, nakas, officers, activity |
| `GET` | `/api/simulate/violations` | Generate simulated real-time violations |
| `GET` | `/api/naka/active` | List all active checkpoints |
| `POST` | `/api/naka/update` | Deploy/update a checkpoint (from mobile) |
| `POST` | `/api/auth/login` | Officer authentication |
| `POST` | `/api/auth/register` | Officer registration |
| `GET` | `/api/officers/active` | Active officer list |
| `GET` | `/api/officers/activity` | Officer activity log |
| `GET` | `/api/model/status` | Model version and accuracy |
| `GET` | `/api/model/details` | Detailed model performance metrics |
| `GET` | `/api/clusters` | Active spatial clusters |
| `GET` | `/api/eda/summary` | EDA summary statistics |
| `GET` | `/api/eda/full` | Full exploratory data analysis |
| `POST` | `/api/ingest` | Ingest a new violation event |
| `POST` | `/api/retrain` | Trigger model retraining |
| `WS` | `/ws` | WebSocket for live dashboard updates |

> Full interactive docs at **`/docs`** (Swagger) or **`/redoc`** (ReDoc).

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

### XGBoost ViolationPredictor

- **Task:** Multi-class classification across 7 violation types
- **Input:** 12 engineered features per location-time combination
- **Output:** Probability distribution over violation types
- **Evaluation:** 80/20 stratified train-val split

### Spatial Clustering

1. **DBSCAN** discovers dense violation clusters without specifying K
2. **K-Means** refines these into grid-based deployment zones
3. The **NakaRecommender** merges spatial clusters with temporal predictions to rank deployment candidates by `expected_violation_yield`

### Drift Detection

The `DriftDetector` monitors PSI (Population Stability Index) and KL Divergence between reference and current feature distributions. When thresholds are exceeded, retraining is triggered automatically.

---

## 🔄 Real-Time Sync Architecture

The platform uses a **dual-channel sync** strategy to keep the web dashboard and mobile app perfectly synchronized:

```
                    ┌─────────────────────┐
                    │    SQLite Database   │
                    │  violations, nakas,  │
                    │  officers, activity  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   FastAPI Backend    │
                    │   /api/sync/state    │
                    └───┬─────────────┬───┘
                        │             │
           WebSocket    │             │  REST Poll (8s)
           (instant)    │             │
                        │             │
              ┌─────────▼───┐   ┌─────▼──────────┐
              │ Web Dashboard│   │  Mobile App     │
              │ (Superadmin) │   │  (Field Officer) │
              └─────────────┘   └────────────────┘
```

- **Web Dashboard:** Subscribes to WebSocket `/ws` for instant push updates
- **Mobile App:** WebView auto-polls `/api/sync/state` every 8 seconds via `fetch()`
- **Officer Deploy:** `POST /api/naka/update` → instantly visible on both platforms

---

## ⚙️ Configuration

### Backend (`config.py`)

```python
SYNTHETIC_DATA_SIZE = 50_000    # Training records
RANDOM_SEED         = 42

# Clustering
DBSCAN_EPS          = 0.01      # Neighborhood radius
DBSCAN_MIN_SAMPLES  = 10
KMEANS_N_CLUSTERS   = 15

# XGBoost
XGBOOST_PARAMS = {
    "max_depth": 6, "learning_rate": 0.1,
    "n_estimators": 100, "objective": "multi:softprob"
}

# Drift Detection
DRIFT_THRESHOLD_PSI = 0.25
DRIFT_THRESHOLD_KL  = 0.10
```

### Mobile App (`src/constants/theme.js`)

```javascript
// OPS_COMMAND Design System
export const COLORS = {
  primary: '#ff9159',           // Tactical orange
  secondary: '#fdd400',         // Signal yellow
  surface: '#0c0e11',           // Deep dark background
  error: '#ff7351',             // Alert red
  // ... full palette
};

// ⚠️ Update this to your machine's WiFi IP
export const API_BASE_URL = 'http://<YOUR_IP>:8000';
```

---

## 🚦 Violation Types

| Violation | Primary Zone | Peak Hours |
|-----------|-------------|------------|
| `DUI` | Bar zones (Dharampeth) | Late night (20:00–00:00) |
| `No_Helmet` | College zones | Rush hour (07:00–10:00) |
| `Speeding` | Highways | Early morning (00:00–07:00) |
| `Signal_Jump` | Intersections (Civil Lines) | Rush hours |
| `Overloading` | Industrial zones (Itwari) | Morning |
| `Wrong_Way` | Urban areas (Sadar) | Evening |
| `No_Violation` | All zones | — |

---

## 🔮 Future Roadmap

- [ ] **Push Notifications** — Firebase Cloud Messaging to alert idle officers of nearby hotspots
- [ ] **Route Optimization** — OSRM integration for fastest path from officer GPS to recommended Naka
- [ ] **Image Upload** — Officers snap violation photos synced to the command dashboard
- [ ] **PostgreSQL Migration** — Production-grade database for multi-city deployment
- [ ] **Offline Mode** — Local SQLite cache on mobile for areas with poor connectivity
- [ ] **Multi-City Support** — Configurable zone definitions for any Indian city

---

## 🧪 Testing

```bash
# Run full test suite
pytest tests/ -v

# Run specific module tests
pytest tests/test_predictor.py -v
```

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- **Nagpur Traffic Police** — Domain inspiration for realistic zone and violation pattern modeling
- **XGBoost Team** — High-performance gradient boosting implementation
- **FastAPI** — Modern async Python web framework
- **Leaflet.js** — Lightweight, mobile-friendly interactive maps
- **Expo & React Native** — Cross-platform mobile development framework

---

<div align="center">
  <strong>OPS_COMMAND</strong> — Built for smarter, data-driven traffic law enforcement 🚔
  <br/>
  <sub>Full-Stack AI Platform · Web Dashboard · Mobile Field Terminal · Real-Time Sync</sub>
</div>
