#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PROJECT_ID="${PROJECT_ID:-}"
TOKEN="${TOKEN:-}"

if [ -z "$PROJECT_ID" ]; then
  echo "[ERROR] PROJECT_ID is required"
  echo "Usage: TOKEN=<jwt> PROJECT_ID=<project-id> ./phase2-closure-check.sh"
  exit 1
fi

if [ -z "$TOKEN" ]; then
  echo "[ERROR] TOKEN is required"
  echo "Usage: TOKEN=<jwt> PROJECT_ID=<project-id> ./phase2-closure-check.sh"
  exit 1
fi

auth_header=(-H "Authorization: Bearer ${TOKEN}")
json_header=(-H "Content-Type: application/json")

check_status() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local body="${4:-}"
  local code

  if [ "$method" = "GET" ]; then
    code=$(curl -sS -o /tmp/phase2_check_response.json -w "%{http_code}" "${url}" "${auth_header[@]}")
  else
    code=$(curl -sS -o /tmp/phase2_check_response.json -w "%{http_code}" -X "$method" "${url}" "${auth_header[@]}" "${json_header[@]}" -d "$body")
  fi

  if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
    echo "[PASS] ${name} (${code})"
  else
    echo "[FAIL] ${name} (${code})"
    cat /tmp/phase2_check_response.json
    exit 1
  fi
}

echo "== Phase 2 closure checks =="
echo "BASE_URL=${BASE_URL}"
echo "PROJECT_ID=${PROJECT_ID}"

check_status "Get release gate settings" "${BASE_URL}/projects/${PROJECT_ID}/release-gate-settings"

payload='{
  "minPassRate": 95,
  "minAiAdoptionRate": 50,
  "minAiSampleSize": 5,
  "rectificationOwnerDefault": "phase2-owner",
  "rectificationPriorityDefault": "P1",
  "rectificationTagsDefault": ["release-gate", "ai-quality"],
  "changeReason": "phase2-closure-check"
}'

check_status "Update release gate settings" "${BASE_URL}/projects/${PROJECT_ID}/release-gate-settings" "PUT" "$payload"
check_status "Get release gate audits" "${BASE_URL}/projects/${PROJECT_ID}/release-gate-settings/audits?limit=5"
check_status "Get similarity metrics with trend" "${BASE_URL}/defects/similarity-metrics?projectId=${PROJECT_ID}&days=30&minScore=0.65&includeTrend=true"

echo "All checks passed."
