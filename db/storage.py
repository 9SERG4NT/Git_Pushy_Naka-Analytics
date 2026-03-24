import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import config


class Storage:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or config.SQLITE_DB_PATH
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS violations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                vehicle_class TEXT NOT NULL,
                violation_type TEXT NOT NULL,
                weather TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                is_holiday INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rank INTEGER NOT NULL,
                cluster_id INTEGER NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                time_window TEXT NOT NULL,
                naka_type TEXT NOT NULL,
                expected_yield REAL NOT NULL,
                confidence REAL NOT NULL,
                weather_condition TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_version TEXT NOT NULL,
                trained_at TEXT NOT NULL,
                n_records INTEGER,
                n_features INTEGER,
                n_clusters INTEGER,
                n_classes INTEGER,
                metric_values TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS active_nakas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                officer_id TEXT NOT NULL,
                officer_name TEXT,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                status TEXT NOT NULL,
                activated_at TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    def insert_violation(self, violation: Dict[str, Any]) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO violations (
                timestamp, latitude, longitude, vehicle_class,
                violation_type, weather, day_of_week, is_holiday
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                violation.get("timestamp"),
                violation.get("latitude"),
                violation.get("longitude"),
                violation.get("vehicle_class"),
                violation.get("violation_type"),
                violation.get("weather"),
                violation.get("day_of_week"),
                int(violation.get("is_holiday", False)),
            ),
        )

        violation_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return violation_id

    def get_violations(self, limit: int = 1000) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM violations ORDER BY timestamp DESC LIMIT ?", (limit,)
        )
        rows = cursor.fetchall()

        violations = [dict(row) for row in rows]
        conn.close()

        return violations

    def insert_recommendation(self, recommendation: Dict[str, Any]) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO recommendations (
                rank, cluster_id, latitude, longitude,
                time_window, naka_type, expected_yield, confidence, weather_condition
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                recommendation.get("rank"),
                recommendation.get("cluster_id"),
                recommendation.get("location", {}).get("lat"),
                recommendation.get("location", {}).get("lon"),
                recommendation.get("time_window"),
                recommendation.get("naka_type"),
                recommendation.get("expected_violation_yield"),
                recommendation.get("confidence"),
                recommendation.get("weather_condition"),
            ),
        )

        rec_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return rec_id

    def get_recommendations(self, limit: int = 100) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM recommendations ORDER BY rank ASC LIMIT ?", (limit,)
        )
        rows = cursor.fetchall()

        recommendations = [dict(row) for row in rows]
        conn.close()

        return recommendations

    def insert_model_metadata(self, metadata: Dict[str, Any]) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO model_metadata (
                model_version, trained_at, n_records, n_features,
                n_clusters, n_classes, metric_values
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                metadata.get("model_version", "v1.0"),
                metadata.get("trained_at"),
                metadata.get("n_records"),
                metadata.get("n_features"),
                metadata.get("n_clusters"),
                metadata.get("n_classes"),
                json.dumps(metadata.get("metric_values", {})),
            ),
        )

        meta_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return meta_id

    def get_latest_model_metadata(self) -> Optional[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM model_metadata ORDER BY trained_at DESC LIMIT 1")
        row = cursor.fetchone()

        metadata = dict(row) if row else None
        conn.close()

        return metadata

    def get_violation_stats(self) -> Dict:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM violations")
        total = cursor.fetchone()[0]

        cursor.execute(
            "SELECT violation_type, COUNT(*) as count FROM violations GROUP BY violation_type"
        )
        violation_counts = {row[0]: row[1] for row in cursor.fetchall()}

        cursor.execute(
            "SELECT weather, COUNT(*) as count FROM violations GROUP BY weather"
        )
        weather_counts = {row[0]: row[1] for row in cursor.fetchall()}

        conn.close()

        return {
            "total_violations": total,
            "violation_counts": violation_counts,
            "weather_counts": weather_counts,
        }

    def insert_active_naka(self, naka: Dict[str, Any]) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO active_nakas (
                officer_id, officer_name, latitude, longitude, status, activated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                naka.get("officer_id"),
                naka.get("officer_name"),
                naka.get("latitude"),
                naka.get("longitude"),
                naka.get("status"),
                naka.get("activated_at"),
            ),
        )

        naka_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return naka_id

    def update_active_naka(
        self, officer_id: str, latitude: float, longitude: float, status: str
    ) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE active_nakas 
            SET latitude = ?, longitude = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE officer_id = ?
        """,
            (latitude, longitude, status, officer_id),
        )

        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()

        return rows_affected > 0

    def get_active_nakas(self) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM active_nakas WHERE status = 'active' ORDER BY activated_at DESC"
        )
        rows = cursor.fetchall()

        nakas = [dict(row) for row in rows]
        conn.close()

        return nakas

    def get_officer_naka(self, officer_id: str) -> Optional[Dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM active_nakas WHERE officer_id = ? ORDER BY activated_at DESC LIMIT 1",
            (officer_id,),
        )
        row = cursor.fetchone()

        naka = dict(row) if row else None
        conn.close()

        return naka


def main():
    storage = Storage()

    print("Testing storage layer...")

    test_violation = {
        "timestamp": datetime.now().isoformat(),
        "latitude": 18.5204,
        "longitude": 73.8567,
        "vehicle_class": "4W",
        "violation_type": "Speeding",
        "weather": "Clear",
        "day_of_week": 0,
        "is_holiday": False,
    }

    violation_id = storage.insert_violation(test_violation)
    print(f"Inserted violation with ID: {violation_id}")

    violations = storage.get_violations(limit=5)
    print(f"Retrieved {len(violations)} violations")

    stats = storage.get_violation_stats()
    print(f"Violation stats: {stats}")

    print("Storage layer test complete!")


if __name__ == "__main__":
    main()
