#!/bin/bash
set -e

echo "Starting Cortex API backend..."
node --import tsx/esm server-web.ts &
API_PID=$!

echo "Waiting for API to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "API is ready"
    break
  fi
  sleep 1
done

echo "Starting Vite frontend..."
npm run web:frontend

wait $API_PID
