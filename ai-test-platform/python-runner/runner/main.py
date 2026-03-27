import argparse
import sys

from executor import PythonScriptExecutor
from utils import dump_result, load_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Python script payload")
    parser.add_argument("--payload", required=True, help="Path to execution payload JSON")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = load_payload(args.payload)
    result = PythonScriptExecutor().execute(payload)
    print(dump_result(result))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
