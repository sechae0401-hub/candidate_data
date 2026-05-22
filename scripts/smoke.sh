#!/usr/bin/env bash
# scripts/smoke.sh
# 배포 후 스모크 테스트: 주요 API 엔드포인트 응답 확인

set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://localhost:3000}"

check() {
  local url="$BASE_URL$1"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" -eq "$2" ]; then
    echo "[PASS] $1 → $status"
  else
    echo "[FAIL] $1 → expected $2, got $status"
    exit 2
  fi
}

echo "=== smoke test: $BASE_URL ==="

check "/api/health" 200

echo "=== smoke PASSED ==="
