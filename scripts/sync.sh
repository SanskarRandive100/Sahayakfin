#!/usr/bin/env bash
# Commit your own paths, rebase on main, run your tests, push.
# Usage: bash scripts/sync.sh <frontend|scoring|backend> "commit message"
set -e
ROLE="$1"; MSG="$2"
if [ -z "$ROLE" ] || [ -z "$MSG" ]; then echo 'Usage: bash scripts/sync.sh <frontend|scoring|backend> "message"'; exit 1; fi
case "$ROLE" in
  frontend) PATHS="frontend tasks/01_MIHIR_FRONTEND.md";;
  scoring)  PATHS="backend/app/ingest backend/app/scoring backend/app/finance backend/tests/test_ingest*.py backend/tests/test_scoring*.py backend/tests/test_finance*.py data docs/ALGORITHM.md tasks/02_RAJAT_SCORING.md";;
  backend)  PATHS="backend/app/__init__.py backend/app/main.py backend/app/config.py backend/app/db.py backend/app/models.py backend/app/schemas.py backend/app/deps.py backend/app/seed.py backend/app/api backend/app/security backend/app/services backend/tests/test_api*.py backend/tests/conftest.py backend/requirements.txt docker-compose.yml .env.example README.md docs/ARCHITECTURE.md docs/PITCH.md tasks/03_SANSKAR_BACKEND.md";;
  *) echo "Unknown role $ROLE"; exit 1;;
esac
for p in $PATHS; do [ -e "$p" ] && git add "$p" || true; done
for f in HANDOFF.md REVIEW_1.md; do [ -f "$f" ] && git add "$f" || true; done
if git diff --cached --quiet; then echo "Nothing staged to commit."; else git commit -m "$MSG"; fi
git pull --rebase --autostash origin main
case "$ROLE" in
  frontend) (cd frontend && npm run build) ;;
  scoring|backend) (cd backend && python -m pytest -q) ;;
esac
git push origin HEAD:main
echo "Pushed to main. Post 'pushed: $MSG' in the team chat."
