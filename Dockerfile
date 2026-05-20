FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 8000

CMD ["node", "src/server.js"]
