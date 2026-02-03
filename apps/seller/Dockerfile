# Next.js standalone para Cloud Run (mismo proyecto Firebase, sin Vercel).
# Build context: apps/seller (después de npm run build)
# Ejemplo: desde repo root: docker build -f apps/seller/Dockerfile -t nextjs-seller apps/seller

FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# Contenido de .next/standalone (tiene apps/seller/server.js y packages/)
COPY .next/standalone ./
# Next.js pide copiar static y public dentro del app
COPY .next/static ./apps/seller/.next/static
RUN mkdir -p ./apps/seller/public
COPY public ./apps/seller/public/

WORKDIR /app/apps/seller
EXPOSE 8080
CMD ["node", "server.js"]
