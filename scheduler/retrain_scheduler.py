from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging
import sys
import config

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def retrain_job():
    logger.info("Starting scheduled retraining...")
    try:
        from pipeline.train_pipeline import train_pipeline

        result = train_pipeline()
        logger.info(f"Retraining completed: {result['status']}")
        return result
    except Exception as e:
        logger.error(f"Retraining failed: {e}")
        return {"status": "failed", "error": str(e)}


def check_drift_and_retrain():
    logger.info("Checking for concept drift...")
    try:
        from data.synthetic_generator import main as generate_data
        from pipeline.drift_detector import DriftDetector

        df = generate_data()
        detector = DriftDetector()
        result = detector.detect_drift(df)

        logger.info(f"Drift check result: {result}")

        if result.get("drift_detected"):
            logger.info("Drift detected! Triggering retraining...")
            return retrain_job()
        else:
            logger.info("No drift detected. Skipping retraining.")
            return {"status": "no_retrain", "reason": "no_drift"}
    except Exception as e:
        logger.error(f"Drift check failed: {e}")
        return {"status": "failed", "error": str(e)}


class RetrainScheduler:
    def __init__(self, interval_hours=config.RETRAIN_INTERVAL_HOURS):
        self.scheduler = BackgroundScheduler()
        self.interval_hours = interval_hours

    def start(self):
        self.scheduler.add_job(
            retrain_job,
            trigger=IntervalTrigger(hours=self.interval_hours),
            id="retrain_job",
            name="Retrain model every 6 hours",
            replace_existing=True,
        )

        self.scheduler.add_job(
            check_drift_and_retrain,
            trigger=IntervalTrigger(hours=1),
            id="drift_check_job",
            name="Check for drift every hour",
            replace_existing=True,
        )

        self.scheduler.start()
        logger.info(f"Scheduler started. Retraining every {self.interval_hours} hours.")

    def stop(self):
        self.scheduler.shutdown()
        logger.info("Scheduler stopped.")

    def trigger_manual_retrain(self):
        return retrain_job()


scheduler = None


def start_scheduler():
    global scheduler
    scheduler = RetrainScheduler()
    scheduler.start()
    return scheduler


def stop_scheduler():
    global scheduler
    if scheduler:
        scheduler.stop()


if __name__ == "__main__":
    print("Starting scheduler...")
    start_scheduler()

    try:
        import time

        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nStopping scheduler...")
        stop_scheduler()
