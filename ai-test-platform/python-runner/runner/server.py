from fastapi import FastAPI, HTTPException

from .executor import PythonScriptExecutor
from .utils import build_payload_from_dict

app = FastAPI(title="python-runner", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/execute")
def execute(payload: dict):
    try:
        execution_payload = build_payload_from_dict(payload)
        result = PythonScriptExecutor().execute(execution_payload)
        return result
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
