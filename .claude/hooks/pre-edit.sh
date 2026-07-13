#!/usr/bin/env bash
# PreToolUse guard for Edit|Write|MultiEdit.
# Blocks (exit 2) writes OUTSIDE the project root and writes to secret-bearing
# files. Fails OPEN (exit 0) on any internal error so it never wedges the agent.
set +e

input=$(cat)
fp=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
[ -z "$fp" ] && exit 0

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

case "$fp" in
  /*) abs="$fp" ;;
  *)  abs="$PWD/$fp" ;;
esac
absdir=$(cd "$(dirname "$abs")" 2>/dev/null && pwd -P)
[ -n "$absdir" ] && abs="$absdir/$(basename "$abs")"

# Must live inside the project root.
case "$abs" in
  "$root"/*) : ;;
  *)
    echo "BLOCKED: refusing to write outside the project root." >&2
    echo "  target: $abs" >&2
    echo "  root:   $root" >&2
    exit 2 ;;
esac

# Never author secret-bearing files (.env.example is fine).
base=$(basename "$abs")
case "$base" in
  .env.example|*.env.example) exit 0 ;;
  .env|.env.*|*.p8|*.p12|*.pem|*.keystore|*.jks|*.mobileprovision|id_rsa*|keystore.properties)
    echo "BLOCKED: refusing to write secret-bearing file '$base'." >&2
    echo "  Credentials/keys/keystores are handled manually by the owner, never by the agent." >&2
    exit 2 ;;
esac

exit 0
