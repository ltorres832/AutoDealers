#!/bin/bash
set -e

# Navegar a la raíz del monorepo
cd "$(dirname "$0")/.."

# Limpiar cualquier proceso npm zombie
pkill -9 npm || true
sleep 1

# Limpiar cache y archivos temporales
rm -rf node_modules/.cache 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

# Intentar instalar con retry logic
for i in {1..3}; do
    echo "Intento de instalación $i de 3..."
    if npm install --legacy-peer-deps --no-audit --prefer-offline 2>&1; then
        echo "✅ Instalación exitosa"
        exit 0
    fi
    echo "⚠️ Intento $i falló, esperando 3 segundos..."
    sleep 3
done

# Si todos los intentos fallan, intentar sin prefer-offline
echo "Intentando instalación sin --prefer-offline..."
npm install --legacy-peer-deps --no-audit || exit 1


