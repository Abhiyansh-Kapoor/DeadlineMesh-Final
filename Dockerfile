FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci --prefix client && npm ci --prefix server

COPY client/ client/
COPY server/ server/
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001
CMD ["sh", "-c", "npm run db:init --prefix server && npm run start --prefix server"]
