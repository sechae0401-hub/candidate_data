#!/usr/bin/env bash
# .claude/hooks/warn-uncommitted.sh
# Stop hook: Claude 세션 종료 시 uncommitted changes 감지하여 경고.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

CHANGES=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

if [ "${CHANGES:-0}" -gt 0 ]; then
  FILES=$(git status --porcelain 2>/dev/null | head -5 | sed 's/^/   /')
  echo "" >&2
  echo "⚠ Uncommitted changes detected (${CHANGES} file(s)):" >&2
  echo "$FILES" >&2
  if [ "$CHANGES" -gt 5 ]; then
    echo "   ... and $((CHANGES - 5)) more" >&2
  fi
  echo "" >&2
  echo "   Commit before ending session to prevent work loss:" >&2
  echo "     git add -A && git commit -m 'chore(wip): 설명'" >&2
  echo "" >&2
fi

exit 0
