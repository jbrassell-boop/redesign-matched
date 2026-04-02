#!/usr/bin/env bash
# TaskCompleted hook — blocks task completion until screen-reviewer has approved.
# Claude Code passes event data as JSON on stdin.

set -euo pipefail

# Read the task data from stdin
INPUT=$(cat)

# Extract task title (e.g. "build-screen-Loaners")
TASK_TITLE=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('title',''))" 2>/dev/null || echo "")

# Only gate tasks that follow the build-screen-* pattern
if [[ "$TASK_TITLE" != build-screen-* ]]; then
  exit 0
fi

# Derive screen name: strip prefix, lowercase, replace spaces with hyphens
SCREEN=$(echo "$TASK_TITLE" | sed 's/^build-screen-//' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

APPROVAL_FILE=".claude/review-approvals/${SCREEN}.approved"

if [ -f "$APPROVAL_FILE" ]; then
  exit 0
fi

echo "BLOCKED: Screen '${SCREEN}' has not been approved by screen-reviewer yet. Message screen-reviewer to request review before marking this task complete."
exit 2
