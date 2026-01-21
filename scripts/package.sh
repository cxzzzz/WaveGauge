#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
BUILD_DIR="$ROOT_DIR/build_pkg"
DIST_NAME="WaveGauge-release"
OUTPUT_DIR="$ROOT_DIR/dist"

echo "=== Starting Package Process ==="

# 1. Build Frontend
echo ">>> Building Frontend..."
"$ROOT_DIR/scripts/build.sh"

# 2. Prepare Directories
echo ">>> Preparing Release Directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/$DIST_NAME"
mkdir -p "$OUTPUT_DIR"

# 3. Copy Backend
echo ">>> Copying Backend..."
cp -r "$ROOT_DIR/backend" "$BUILD_DIR/$DIST_NAME/"

# 4. Copy Frontend Dist
echo ">>> Copying Frontend Assets..."
mkdir -p "$BUILD_DIR/$DIST_NAME/backend/dist"
# Ensure frontend/dist exists
if [ -d "$ROOT_DIR/frontend/dist" ]; then
    cp -r "$ROOT_DIR/frontend/dist/"* "$BUILD_DIR/$DIST_NAME/backend/dist/"
else
    echo "Error: frontend/dist not found. Build failed?"
    exit 1
fi

# 5. Copy Scripts and Configs
echo ">>> Copying Scripts and Configs..."
cp "$ROOT_DIR/Makefile" "$BUILD_DIR/$DIST_NAME/"
mkdir -p "$BUILD_DIR/$DIST_NAME/scripts"
cp "$ROOT_DIR/scripts/run.sh" "$BUILD_DIR/$DIST_NAME/scripts/"
cp "$ROOT_DIR/scripts/build.sh" "$BUILD_DIR/$DIST_NAME/scripts/"

# 6. Cleanup Development Files
echo ">>> Cleaning up..."
find "$BUILD_DIR/$DIST_NAME" -name "__pycache__" -type d -exec rm -rf {} +
find "$BUILD_DIR/$DIST_NAME" -name ".venv" -type d -exec rm -rf {} +
find "$BUILD_DIR/$DIST_NAME" -name ".pytest_cache" -type d -exec rm -rf {} +
find "$BUILD_DIR/$DIST_NAME" -name "*.pyc" -delete

# 7. Create Archive
echo ">>> Creating Archive..."
cd "$BUILD_DIR"
tar -czf "$OUTPUT_DIR/$DIST_NAME.tar.gz" "$DIST_NAME"
echo "Package created at: $OUTPUT_DIR/$DIST_NAME.tar.gz"

# 8. Cleanup Build Dir
rm -rf "$BUILD_DIR"

echo "=== Package Complete ==="