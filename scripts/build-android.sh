#!/usr/bin/env bash
# Build Android (release) do Vitrolify.
# Uso: ./scripts/build-android.sh
# Saída: frontend/android/app/build/outputs/apk/release/app-release.apk
#
# ATENÇÃO: hoje o build release assina com frontend/android/app/debug.keystore
# (veja signingConfigs em frontend/android/app/build.gradle). Antes de
# distribuir, gere um keystore próprio e configure o signingConfig de release.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/frontend/.env.production"
APK_DIR="$REPO_ROOT/frontend/android/app/build/outputs/apk/release"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "erro: $ENV_FILE não encontrado" >&2
    exit 1
fi

# EXPO_PUBLIC_* é embutido no JS bundle durante o build do Gradle.
set -a
source "$ENV_FILE"
set +a

cd "$REPO_ROOT/frontend/android"
./gradlew assembleRelease

APK="$APK_DIR/app-release.apk"
if [[ -f "$APK" ]]; then
    echo "apk release pronto: $APK"
else
    echo "erro: $APK não foi gerado" >&2
    exit 1
fi
