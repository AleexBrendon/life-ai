FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npm start"]