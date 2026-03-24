import redis
import json
from typing import Optional
import config


class StreamingService:
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or config.REDIS_URL
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            self.redis_client.ping()
            self.redis_available = True
        except Exception as e:
            print(f"Redis not available: {e}")
            self.redis_available = False
            self.redis_client = None

        self.channel = "naka_violations"

    def publish_violation(self, violation_data: dict):
        if not self.redis_available:
            return False

        try:
            message = json.dumps(violation_data)
            self.redis_client.publish(self.channel, message)
            return True
        except Exception as e:
            print(f"Error publishing violation: {e}")
            return False

    def subscribe(self):
        if not self.redis_available:
            return None

        try:
            pubsub = self.redis_client.pubsub()
            pubsub.subscribe(self.channel)
            return pubsub
        except Exception as e:
            print(f"Error subscribing: {e}")
            return None


def publish_violation(violation_data: dict):
    service = StreamingService()
    return service.publish_violation(violation_data)


def get_subscriber():
    service = StreamingService()
    return service.subscribe()
