#!/bin/bash
set -e

# Navegar a la raíz del monorepo
cd "$(dirname "$0")/.."

# Instalar todas las dependencias del workspace
npm install --workspaces --legacy-peer-deps --no-audit


