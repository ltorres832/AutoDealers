# Next.js standalone para Cloud Run (Firebase, sin Vercel).
# Build context: apps/dealer (después de npm run build)

FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY .next/standalone ./
COPY .next/static ./apps/dealer/.next/static
RUN mkdir -p ./apps/dealer/public
COPY public ./apps/dealer/public/

WORKDIR /app/apps/dealer
EXPOSE 8080
CMD ["node", "server.js"]
