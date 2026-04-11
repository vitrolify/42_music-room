#!/usr/bin/env bash
set -euo pipefail

SPEC_FILE="specs/001-realtime-collab-playlists/contracts/rest-api-v1.yaml"

if [ ! -f "$SPEC_FILE" ]; then
  echo "ERROR: OpenAPI spec not found at $SPEC_FILE"
  exit 1
fi

if ! command -v npx &> /dev/null; then
  echo "ERROR: npx not found. Please install Node.js >= 18."
  exit 1
fi

echo "Validating OpenAPI spec: $SPEC_FILE"
npx --yes @stoplight/spectral-cli@^6 lint "$SPEC_FILE"

echo "OpenAPI validation passed."
