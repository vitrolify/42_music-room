#!/usr/bin/env bash
# Publica o build web do Vitrolify no servidor (rsync over SSH).
#
# Uso:
#   ./scripts/build-web.sh
#   DEPLOY_TARGET=lucas@servidor:~/42_music-room/frontend/dist ./scripts/deploy-web.sh
#
# Opcional: PUBLIC_URL=https://vitrolify.lucasfads.com faz um smoke test com curl após o rsync.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$REPO_ROOT/frontend/dist"
TARGET="${DEPLOY_TARGET:-}"

if [[ ! -f "$DIST_DIR/index.html" ]]; then
    echo "erro: $DIST_DIR/index.html não existe; rode scripts/build-web.sh antes" >&2
    exit 1
fi

if [[ -z "$TARGET" ]]; then
    echo "uso: DEPLOY_TARGET=user@host:/caminho/frontend/dist $0" >&2
    exit 1
fi

rsync -av --delete "$DIST_DIR/" "$TARGET/"
echo "deploy concluído: $DIST_DIR/ -> $TARGET"

if [[ -n "${PUBLIC_URL:-}" ]]; then
    echo "smoke test: $PUBLIC_URL"
    curl -fsS "$PUBLIC_URL" > /dev/null
    echo "ok: $PUBLIC_URL respondeu"
fi
