#!/bin/bash
set -e

# Get version from pyproject.toml
VERSION=$(grep -m 1 'version =' backend/pyproject.toml | cut -d '"' -f 2)
echo "--- Packaging Source (Version: $VERSION) ---"

OUTPUT_NAME="WaveGauge-Source-${VERSION}"
DIST_DIR="dist"

mkdir -p $DIST_DIR
rm -rf $DIST_DIR/$OUTPUT_NAME
mkdir -p $DIST_DIR/$OUTPUT_NAME

# Copy Backend
echo "Copying backend..."
cp -r backend $DIST_DIR/$OUTPUT_NAME/

# Copy Frontend build artifacts
echo "Copying frontend..."
mkdir -p $DIST_DIR/$OUTPUT_NAME/frontend
cp -r frontend/dist $DIST_DIR/$OUTPUT_NAME/frontend/
cp frontend/package.json $DIST_DIR/$OUTPUT_NAME/frontend/

# Copy root files
cp README.md $DIST_DIR/$OUTPUT_NAME/ 2>/dev/null || true
cp LICENSE $DIST_DIR/$OUTPUT_NAME/ 2>/dev/null || true

# Clean up
echo "Cleaning up..."
find $DIST_DIR/$OUTPUT_NAME -name "__pycache__" -type d -exec rm -rf {} +
find $DIST_DIR/$OUTPUT_NAME -name ".venv" -type d -exec rm -rf {} +
find $DIST_DIR/$OUTPUT_NAME -name ".pytest_cache" -type d -exec rm -rf {} +

# Zip
echo "Zipping..."
cd $DIST_DIR
zip -r "${OUTPUT_NAME}.zip" "$OUTPUT_NAME"
cd ..

echo "Package created at ${DIST_DIR}/${OUTPUT_NAME}.zip"
