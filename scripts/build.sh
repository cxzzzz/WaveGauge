#!/bin/bash
set -e
echo "--- Building Frontend (Shell Script) ---"
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build
cd ..
