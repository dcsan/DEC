#!/usr/bin/env bash
# Register the Honcho MCP server at PROJECT scope, i.e. into .mcp.json at the
# repo root (committed + shared with the team). Run from anywhere:
#   bin/add-honcho-mcp.sh
#
# The Authorization header stores the literal placeholder ${HONCHO_API_KEY} —
# NOT the resolved key — so no secret lands in git. Claude Code expands it at
# runtime from the environment, so HONCHO_API_KEY must be set in your shell when
# you launch Claude Code (e.g. exported from ~/.zshrc, or via direnv loading
# web-dec/.env). Claude Code does NOT read .env on its own.
set -euo pipefail

cd "$(dirname "$0")/.."

# Single quotes keep the shell from expanding ${HONCHO_API_KEY}; the placeholder
# string is what gets written to .mcp.json.
claude mcp add honcho "https://mcp.honcho.dev" \
  --scope project \
  --transport http \
  --header 'Authorization: Bearer ${HONCHO_API_KEY}' \
  --header "X-Honcho-User-Name: YourName"
