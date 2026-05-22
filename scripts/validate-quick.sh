#!/usr/bin/env bash
# scripts/validate-quick.sh
# Story 완료 검증: typecheck + lint (목표: 60초 이내)
# 실패 시: ./scripts/validate-quick.sh --from=typecheck

set -euo pipefail

START=$(date +%s)
LOG_DIR="state/validate/latest"
mkdir -p "$LOG_DIR"

MODE="${VALIDATE_OUTPUT_MODE:-summary}"
FROM_STAGE="${1#--from=}"
[ "$FROM_STAGE" = "$1" ] && FROM_STAGE=""

pass() { echo "[PASS] $1 ($(( $(date +%s) - START ))s)"; }
fail() { echo "[FAIL] $1"; echo "  → Log: $LOG_DIR/$2.log"; exit 2; }

run_stage() {
  local name="$1"; shift
  local log="$LOG_DIR/$name.log"
  [ -n "$FROM_STAGE" ] && [ "$FROM_STAGE" != "$name" ] && { echo "[SKIP] $name"; return; }
  FROM_STAGE=""
  if [ "$MODE" = "verbose" ]; then
    "$@" 2>&1 | tee "$log" && pass "$name" || fail "$name" "$name"
  else
    "$@" > "$log" 2>&1 && pass "$name" || fail "$name" "$name"
  fi
}

echo "=== validate-quick: $(date '+%Y-%m-%d %H:%M:%S') ==="

run_stage "typecheck" npx tsc --noEmit
run_stage "lint"      npm run lint

echo "=== PASSED ($(( $(date +%s) - START ))s) ==="
