# Next.js standalone para Cloud Run (Firebase, sin Vercel).
# Build context: apps/admin (después de npm run build)
# Desde repo root: docker build -f apps/admin/Dockerfile -t nextjs-admin apps/admin

FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

WORKDIR /app

COPY .next/standalone ./
COPY .next/static ./apps/admin/.next/static
RUN mkdir -p ./apps/admin/public
COPY public ./apps/admin/public/

WORKDIR /app/apps/admin
EXPOSE 8080
CMD ["node", "server.js"]
