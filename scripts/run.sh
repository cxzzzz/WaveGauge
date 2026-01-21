#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
VENV_DIR=${VENV_DIR:-"$ROOT_DIR/backend/.venv"}
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}
WORKERS=${WORKERS:-2}
APP_MODULE=${APP_MODULE:-backend.app:app}

source "$VENV_DIR/bin/activate"
uvicorn "$APP_MODULE" --host "$HOST" --port "$PORT" --workers "$WORKERS"
