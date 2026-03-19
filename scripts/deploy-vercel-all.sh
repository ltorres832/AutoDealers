#!/bin/bash
# Script Bash para desplegar todas las apps en Vercel
# Ejecutar desde la raíz del proyecto: bash scripts/deploy-vercel-all.sh

echo "🚀 DESPLIEGUE DE TODAS LAS APPS EN VERCEL"
echo ""

apps=(
    "public-web:apps/public-web:autodealers-public-web"
    "admin:apps/admin:autodealers-admin"
    "dealer:apps/dealer:autodealers-dealer"
    "seller:apps/seller:autodealers-seller"
    "advertiser:apps/advertiser:autodealers-advertiser"
)

for app_info in "${apps[@]}"; do
    IFS=':' read -r name path project <<< "$app_info"
    
    echo "📦 Desplegando $name..."
    echo "   Proyecto: $project"
    echo "   Directorio: $path"
    echo ""
    
    cd "$path"
    
    echo "   Ejecutando: vercel"
    echo "   ⚠️  Cuando pregunte:"
    echo "      - Set up and deploy? → Y"
    echo "      - Link to existing project? → N"
    echo "      - Project name? → $project"
    echo "      - Directory? → $path o Enter"
    echo ""
    
    vercel
    
    echo ""
    echo "   ✅ $name desplegado"
    echo "   📝 IMPORTANTE: Ve a Vercel Dashboard y configura:"
    echo "      - Root Directory: $path"
    echo "      - Build Command: cd ../.. && npm ci && npm run build:$name"
    echo "      - Install Command: cd ../.. && npm ci"
    echo "      - Output Directory: .next"
    echo ""
    echo "   Luego ejecuta: vercel --prod"
    echo ""
    echo "   Presiona Enter para continuar con la siguiente app..."
    read
    
    cd ../..
done

echo "✅ TODAS LAS APPS DESPLEGADAS"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Configurar variables de entorno en cada proyecto en Vercel"
echo "2. Redeploy cada app después de configurar variables"
echo "3. Verificar que cada app funciona en su URL"
echo ""
echo "📖 Ver DEPLOY_VERCEL.md para instrucciones detalladas"


