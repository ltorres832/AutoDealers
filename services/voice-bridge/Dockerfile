# voice-bridge — construir desde la RAÍZ del monorepo:
#   docker build -f services/voice-bridge/Dockerfile -t voice-bridge .
#   gcloud run deploy voice-bridge --source . (con cloudbuild) o push de la imagen

FROM node:20-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages ./packages
COPY services/voice-bridge ./services/voice-bridge

RUN npm install --workspaces --include-workspace-root --omit=optional || npm install --omit=optional

# Compilar packages requeridos y el servicio
RUN cd packages/shared && npm run build || true
RUN cd packages/core && npm run build || true
RUN cd packages/billing && npm run build || true
RUN cd packages/inventory && npm run build || true
RUN cd packages/crm && npm run build || true
RUN cd packages/voice && npm run build || true
RUN cd services/voice-bridge && npm run build

FROM node:20-slim
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/services/voice-bridge
EXPOSE 8080
CMD ["node", "dist/server.js"]
