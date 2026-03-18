#!/bin/bash
# Script de build para Vercel
cd ../..
npm install
cd apps/public-web
npm run build
