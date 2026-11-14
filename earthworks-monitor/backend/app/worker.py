"""Background worker. Phase 1 only brings the queue up; processing jobs arrive in Phase 2/3."""
from redis import Redis
from rq import Queue, Worker

from app.config import get_settings

QUEUE_NAME = "processing"


def get_queue() -> Queue:
    return Queue(QUEUE_NAME, connection=Redis.from_url(get_settings().redis_url))


if __name__ == "__main__":
    Worker([get_queue()]).work()
