import os
from typing import Optional

from fastapi import FastAPI, Header, HTTPException

from .executor import PythonScriptExecutor
from .utils import build_payload_from_dict

app = FastAPI(title="python-runner", version="0.1.0")


def verify_runner_token(x_runner_token: Optional[str]):
    expected = os.getenv("RUNNER_AUTH_TOKEN", "")
    if not expected:
        return
    if x_runner_token != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/execute")
def execute(payload: dict, x_runner_token: Optional[str] = Header(default=None)):
    try:
        verify_runner_token(x_runner_token)
        execution_payload = build_payload_from_dict(payload)
        result = PythonScriptExecutor().execute(execution_payload)
        return result
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
