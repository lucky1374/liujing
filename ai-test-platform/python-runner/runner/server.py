import os
from threading import Lock, Semaphore
from typing import Optional

from fastapi import FastAPI, Header, HTTPException

from .executor import PythonScriptExecutor
from .utils import build_payload_from_dict

app = FastAPI(title="python-runner", version="0.1.0")


def _read_int_env(name: str, default: int, min_value: int = 1) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value >= min_value else default


class RunnerExecutionLimiter:
    def __init__(self):
        self.max_concurrency = _read_int_env("RUNNER_MAX_CONCURRENCY", default=2)
        self.queue_timeout_ms = _read_int_env("RUNNER_QUEUE_TIMEOUT_MS", default=10000)
        self._semaphore = Semaphore(self.max_concurrency)
        self._lock = Lock()
        self._running = 0
        self._waiting = 0
        self._total_requests = 0
        self._rejected = 0

    def acquire(self) -> bool:
        with self._lock:
            self._total_requests += 1
            self._waiting += 1

        acquired = self._semaphore.acquire(timeout=self.queue_timeout_ms / 1000)

        with self._lock:
            self._waiting = max(0, self._waiting - 1)
            if acquired:
                self._running += 1
            else:
                self._rejected += 1

        return acquired

    def release(self):
        with self._lock:
            if self._running > 0:
                self._running -= 1
        self._semaphore.release()

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "maxConcurrency": self.max_concurrency,
                "queueTimeoutMs": self.queue_timeout_ms,
                "running": self._running,
                "waiting": self._waiting,
                "totalRequests": self._total_requests,
                "rejected": self._rejected,
            }


limiter = RunnerExecutionLimiter()


def verify_runner_token(x_runner_token: Optional[str]):
    expected = os.getenv("RUNNER_AUTH_TOKEN", "")
    if not expected:
        return
    if x_runner_token != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health():
    return {"status": "ok", "limiter": limiter.snapshot()}


@app.get("/stats")
def stats(x_runner_token: Optional[str] = Header(default=None)):
    verify_runner_token(x_runner_token)
    return {"status": "ok", "limiter": limiter.snapshot()}


@app.post("/execute")
def execute(payload: dict, x_runner_token: Optional[str] = Header(default=None)):
    try:
        verify_runner_token(x_runner_token)
        acquired = limiter.acquire()
        if not acquired:
            raise HTTPException(
                status_code=429,
                detail=f"runner queue timeout after {limiter.queue_timeout_ms} ms",
            )

        execution_payload = build_payload_from_dict(payload)
        try:
            result = PythonScriptExecutor().execute(execution_payload)
        finally:
            limiter.release()
        return result
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
