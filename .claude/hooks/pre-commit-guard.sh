#!/usr/bin/env bash
# PreToolUse guard for Bash. Only acts when the command is a `git commit`.
# Runs deterministic pre-commit checks on STAGED content and blocks (exit 2)
# on positive violations. Fails OPEN (exit 0) on anything else.
set +e

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

case "$cmd" in
  *"git commit"*) : ;;
  *) exit 0 ;;
esac

git rev-parse --show-toplevel >/dev/null 2>&1 || exit 0
staged=$(git diff --cached --name-only 2>/dev/null)
[ -z "$staged" ] && exit 0

violations=""

# 1) Secret-bearing files staged (.env.example allowed).
while IFS= read -r f; do
  [ -z "$f" ] && continue
  b=$(basename "$f")
  case "$b" in
    .env.example|*.env.example) continue ;;
    .env|.env.*|*.p8|*.p12|*.pem|*.keystore|*.jks|*.mobileprovision|id_rsa*|keystore.properties)
      violations="${violations}\n  secret file staged: $f" ;;
  esac
done <<< "$staged"

# 2) Secret material inside the staged diff.
diff=$(git diff --cached 2>/dev/null)
if printf '%s' "$diff" | grep -qE '^\+.*-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'; then
  violations="${violations}\n  private key material added in diff"
fi
if printf '%s' "$diff" | grep -qiE '^\+.*(client_secret|aws_secret_access_key)[\"'"'"' ]*[:=][\"'"'"' ]*[A-Za-z0-9/_-]{12,}'; then
  violations="${violations}\n  possible hard-coded secret assignment in diff"
fi

# 3) Leftover test focus in staged test files.
for f in $staged; do
  case "$f" in
    *.test.ts|*.test.tsx)
      if git show ":$f" 2>/dev/null | grep -qE '(describe|it|test)\.only\('; then
        violations="${violations}\n  .only( focus left in $f"
      fi ;;
  esac
done

if [ -n "$violations" ]; then
  echo "BLOCKED by pre-commit-guard:" >&2
  printf '%b\n' "$violations" >&2
  echo "Fix these before committing; handle any real credentials manually, outside git." >&2
  exit 2
fi
exit 0
