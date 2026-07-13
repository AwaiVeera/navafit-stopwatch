#!/usr/bin/env bash
# PostToolUse advisory for Edit|Write|MultiEdit: lint the changed source file.
# ALWAYS exits 0 — advisory only, never blocks. Reports lint problems to the
# transcript so they get fixed before commit.
set +e

input=$(cat)
fp=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
[ -z "$fp" ] && exit 0

# Only lint tracked source under src/.
case "$fp" in
  *src/*.ts|*src/*.tsx) : ;;
  *) exit 0 ;;
esac

out=$(npx --no-install eslint "$fp" 2>&1)
if [ $? -ne 0 ]; then
  echo "post-edit lint notice for $fp:" >&2
  printf '%s\n' "$out" | tail -20 >&2
fi
exit 0
