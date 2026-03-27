from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class ScriptPayload:
    id: str
    name: str
    language: str
    content: str


@dataclass
class EnvironmentPayload:
    baseUrl: str
    headers: Dict[str, Any] = field(default_factory=dict)
    variables: Dict[str, Any] = field(default_factory=dict)
    authConfig: Dict[str, Any] = field(default_factory=dict)


@dataclass
class OptionsPayload:
    timeoutMs: int = 30000
    pythonBin: str = "python3"


@dataclass
class ExecutionPayload:
    executionId: str
    taskId: str
    script: ScriptPayload
    environment: EnvironmentPayload
    options: OptionsPayload = field(default_factory=OptionsPayload)
