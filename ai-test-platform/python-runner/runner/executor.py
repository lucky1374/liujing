import os
import json
import subprocess
import tempfile
import time
from pathlib import Path

from .models import ExecutionPayload


class PythonScriptExecutor:
    def execute(self, payload: ExecutionPayload) -> dict:
        start = time.time()
        with tempfile.TemporaryDirectory(prefix="python-runner-") as temp_dir:
            script_path = Path(temp_dir) / "script.py"
            script_path.write_text(payload.script.content)

            env = os.environ.copy()
            env["BASE_URL"] = payload.environment.baseUrl

            for key, value in payload.environment.variables.items():
                env[str(key)] = str(value)

            for key, value in payload.environment.headers.items():
                env[f"HEADER_{str(key).upper().replace('-', '_')}"] = str(value)

            auth_config = payload.environment.authConfig or {}
            if auth_config.get("type") == "bearer" and auth_config.get("token"):
                env["BEARER_TOKEN"] = str(auth_config["token"])
                env["HEADER_AUTHORIZATION"] = f"Bearer {auth_config['token']}"

            try:
                completed = subprocess.run(
                    [payload.options.pythonBin, str(script_path)],
                    cwd=temp_dir,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=payload.options.timeoutMs / 1000,
                    check=False,
                )
                duration_ms = int((time.time() - start) * 1000)
                structured = self._extract_structured_result(completed.stdout)
                warnings = self._extract_warnings(completed.stderr)
                error_output = self._extract_errors(completed.stderr)

                return {
                    "executionId": payload.executionId,
                    "taskId": payload.taskId,
                    "scriptId": payload.script.id,
                    "status": "passed" if completed.returncode == 0 else "failed",
                    "durationMs": duration_ms,
                    "exitCode": completed.returncode,
                    "logs": {
                        "stdout": completed.stdout,
                        "stderr": completed.stderr,
                    },
                    "warnings": warnings,
                    "request": structured.get("request"),
                    "response": structured.get("response"),
                    "error": None if completed.returncode == 0 else error_output or completed.stderr or "script execution failed",
                }
            except subprocess.TimeoutExpired as error:
                duration_ms = int((time.time() - start) * 1000)
                return {
                    "executionId": payload.executionId,
                    "taskId": payload.taskId,
                    "scriptId": payload.script.id,
                    "status": "failed",
                    "durationMs": duration_ms,
                    "exitCode": None,
                    "logs": {
                        "stdout": error.stdout or "",
                        "stderr": error.stderr or "",
                    },
                    "warnings": self._extract_warnings(self._normalize_text(error.stderr)),
                    "request": None,
                    "response": None,
                    "error": f"execution timeout after {payload.options.timeoutMs} ms",
                }

    def _extract_structured_result(self, stdout: str) -> dict:
        marker = "__RESULT__="
        for line in stdout.splitlines():
            if line.startswith(marker):
                payload = line[len(marker):].strip()
                try:
                    return json.loads(payload)
                except Exception:
                    return {}
        return {}

    def _extract_warnings(self, stderr: str) -> list:
        if not stderr:
            return []
        warnings = []
        for line in stderr.splitlines():
            text = line.strip()
            if text and ("Warning" in text or "warning" in text):
                warnings.append(text)
        return warnings

    def _extract_errors(self, stderr: str) -> str:
        if not stderr:
            return ""
        lines = []
        for line in stderr.splitlines():
            text = line.strip()
            if not text:
                continue
            if "Warning" in text or "warning" in text:
                continue
            lines.append(line)
        return "\n".join(lines).strip()

    def _normalize_text(self, value) -> str:
        if value is None:
            return ""
        if isinstance(value, bytes):
            return value.decode("utf-8", errors="ignore")
        return str(value)
