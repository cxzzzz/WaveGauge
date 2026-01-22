#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
PYTHON_BIN=${PYTHON_BIN:-python3}
VENV_DIR=${VENV_DIR:-"$ROOT_DIR/backend/.venv"}
PIP_INDEX_URL=${PIP_INDEX_URL:-}
NODE_ENV=${NODE_ENV:-production}
NPM_INCLUDE_DEV=${NPM_INCLUDE_DEV:-1}
FRONTEND_DIR=${FRONTEND_DIR:-"$ROOT_DIR/frontend"}

cd "$ROOT_DIR/backend"
"$PYTHON_BIN" -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

if [ -n "$PIP_INDEX_URL" ]; then
  pip install --index-url "$PIP_INDEX_URL" .
else
  pip install .
fi

deactivate

if [ "${SKIP_FRONTEND:-0}" = "1" ] || [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "Skipping frontend build (SKIP_FRONTEND=1 or package.json not found)."
else
  cd "$FRONTEND_DIR"
  if [ "$NPM_INCLUDE_DEV" = "1" ]; then
    npm ci --include=dev
  else
    npm ci
  fi
  NODE_ENV="$NODE_ENV" npm run build
fi
