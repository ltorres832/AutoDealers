# Next.js standalone para Cloud Run (Firebase, sin Vercel).
# Build context: apps/public-web (después de npm run build)

FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY .next/standalone ./
COPY .next/static ./apps/public-web/.next/static
RUN mkdir -p ./apps/public-web/public
COPY public ./apps/public-web/public/

WORKDIR /app/apps/public-web
EXPOSE 8080
CMD ["node", "server.js"]
