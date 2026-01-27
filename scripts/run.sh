#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
VENV_DIR=${VENV_DIR:-"$ROOT_DIR/backend/.venv"}
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8000}

# Activate virtual environment
if [ -f "$VENV_DIR/bin/activate" ]; then
    source "$VENV_DIR/bin/activate"
else
    echo "Warning: Virtual environment not found at $VENV_DIR"
fi

# Add root directory to PYTHONPATH so we can import backend as a module
export PYTHONPATH=$ROOT_DIR

# Check if "desktop" argument is provided
if [ "${1:-}" == "desktop" ]; then
    echo "Starting WaveGauge in Desktop Mode..."
    python "$ROOT_DIR/backend/main.py" desktop
else
    echo "Starting WaveGauge Server at http://$HOST:$PORT"
    export HOST=$HOST
    export PORT=$PORT
    python "$ROOT_DIR/backend/main.py" server
fi
