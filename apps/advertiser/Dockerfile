# Next.js standalone para Cloud Run (Firebase, sin Vercel).
# Build context: apps/advertiser (después de npm run build)

FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY .next/standalone ./
COPY .next/static ./apps/advertiser/.next/static
RUN mkdir -p ./apps/advertiser/public
COPY public ./apps/advertiser/public/

WORKDIR /app/apps/advertiser
EXPOSE 8080
CMD ["node", "server.js"]
