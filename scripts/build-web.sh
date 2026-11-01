#!/usr/bin/env bash
# Build web (produção) do Vitrolify.
# Uso: ./scripts/build-web.sh
# Saída: frontend/dist/
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
ENV_FILE="$FRONTEND_DIR/.env.production"
DIST_DIR="$FRONTEND_DIR/dist"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "erro: $ENV_FILE não encontrado" >&2
    exit 1
fi

# Expo embute EXPO_PUBLIC_* no bundle na hora do build.
# Variáveis já exportadas no shell têm precedência sobre os arquivos .env*.
set -a
source "$ENV_FILE"
set +a

cd "$FRONTEND_DIR"
npx expo export --platform web

if [[ ! -f "$DIST_DIR/index.html" ]]; then
    echo "erro: dist/index.html não foi gerado" >&2
    exit 1
fi

# Sanidade: a URL da API precisa estar embutida no bundle
if [[ -n "${EXPO_PUBLIC_API_URL:-}" ]]; then
    if grep -rqF "$EXPO_PUBLIC_API_URL" "$DIST_DIR/_expo/static/js/" 2>/dev/null; then
        echo "ok: bundle embute a API de produção ($EXPO_PUBLIC_API_URL)"
    else
        echo "erro: $EXPO_PUBLIC_API_URL não encontrada no bundle gerado" >&2
        exit 1
    fi
fi

echo "build web pronto: $DIST_DIR"
