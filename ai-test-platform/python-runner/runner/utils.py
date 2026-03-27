import json
from pathlib import Path

from models import EnvironmentPayload, ExecutionPayload, OptionsPayload, ScriptPayload


def load_payload(payload_path: str) -> ExecutionPayload:
    raw = json.loads(Path(payload_path).read_text())
    script = ScriptPayload(**raw["script"])
    environment = EnvironmentPayload(**raw["environment"])
    options = OptionsPayload(**raw.get("options", {}))
    return ExecutionPayload(
        executionId=raw["executionId"],
        taskId=raw["taskId"],
        script=script,
        environment=environment,
        options=options,
    )


def dump_result(result: dict) -> str:
    return json.dumps(result, ensure_ascii=False, indent=2)
