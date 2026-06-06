#!/usr/bin/env bash
# Preflight: verify wrangler is authed (and optionally to the right account)
set -euo pipefail

EXPECTED=$(grep -oE '"account_id"\s*:\s*"[0-9a-f]{32}"' wrangler.jsonc 2>/dev/null | grep -oE '[0-9a-f]{32}' || true)
ACCOUNTS=$(npx wrangler whoami 2>/dev/null | grep -E '│.*│.*│' | grep -oE '[0-9a-f]{32}' || true)

if [ -z "$ACCOUNTS" ]; then
  echo "✗ Not logged in to Cloudflare. Run: just cf-login"
  exit 1
fi

if [ -n "$EXPECTED" ] && ! echo "$ACCOUNTS" | grep -q "$EXPECTED"; then
  echo "✗ Wrong Cloudflare account"
  echo "  wrangler.jsonc expects: $EXPECTED"
  echo "  logged in accounts:     $(echo $ACCOUNTS | tr '\n' ' ')"
  echo "  Run: just cf-login"
  exit 1
fi

echo "✓ Cloudflare auth OK ($(echo $ACCOUNTS | head -1))"
