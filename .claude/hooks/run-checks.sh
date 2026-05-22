#!/usr/bin/env bash
# .claude/hooks/run-checks.sh
# PostToolUse Hook: Edit/Write 후 TypeScript typecheck + ESLint 실행

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
cd "$PROJECT_DIR"

# package.json이 없으면 (아직 프로젝트 미초기화) skip
if [ ! -f "package.json" ]; then
  exit 0
fi

# 변경된 파일 경로 추출
input=$(cat /dev/stdin 2>/dev/null || true)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

# TS/TSX/JS/JSX 파일이 아니면 skip
if [ -n "$file_path" ]; then
  case "$file_path" in
    *.ts|*.tsx|*.js|*.jsx) ;;
    *) exit 0 ;;
  esac
fi

# 60초 타임아웃으로 typecheck 실행
timeout 60 npx tsc --noEmit --pretty false 2>&1 | tail -20 || {
  echo "TypeScript check failed" >&2
  exit 2
}

# ESLint (설치된 경우만)
if [ -f ".eslintrc*" ] || [ -f "eslint.config*" ] || grep -q '"eslint"' package.json 2>/dev/null; then
  if [ -n "$file_path" ]; then
    timeout 60 npx eslint --no-eslintrc -c .eslintrc.json "$file_path" 2>&1 | tail -10 || {
      timeout 60 npx next lint --file "$file_path" 2>&1 | tail -10 || true
    }
  fi
fi

exit 0
