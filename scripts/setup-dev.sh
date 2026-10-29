#!/usr/bin/env bash
# One-time setup for each teammate. Run from the repo root: bash scripts/setup-dev.sh
set -e
git config core.hooksPath .githooks
chmod +x .githooks/* scripts/*.sh 2>/dev/null || true
if [ ! -f .env ]; then cp .env.example .env && echo "Created .env from .env.example"; fi
echo "git user.name  = $(git config user.name)"
echo "git user.email = $(git config user.email)"
if [ -z "$(git config user.name)" ]; then
  echo "WARNING: set your identity: git config user.name \"Your Name\" && git config user.email \"you@example.com\""
fi
echo "Hooks path     = $(git config core.hooksPath)"
echo "Setup done."
