#!/usr/bin/env bash
# .claude/hooks/block-rm.sh
# PreToolUse Hook: 위험한 Bash 명령을 차단합니다.

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$command" ]; then
  exit 0
fi

dangerous_patterns=(
  "rm -rf"
  "rm -fr"
  "sudo rm"
  "sudo dd"
  "> /etc/"
  "> /usr/"
  "chmod 777"
  "chmod -R 777"
  "truncate /"
  "mkfs\."
  ":(){:|:&};:"
)

for pattern in "${dangerous_patterns[@]}"; do
  if echo "$command" | grep -qF "$pattern"; then
    echo "{\"decision\": \"block\", \"reason\": \"Dangerous command blocked: $pattern\"}" >&2
    exit 2
  fi
done

exit 0
