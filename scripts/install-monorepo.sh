#!/bin/bash
set -e

# Navegar a la raíz del monorepo
cd "$(dirname "$0")/.."

# Limpiar cualquier proceso npm existente
pkill -f "npm" || true
sleep 1

# Instalar dependencias desde la raíz
npm install --legacy-peer-deps --no-audit --prefer-offline


