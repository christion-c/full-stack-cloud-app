FROM node:20-alpine AS build
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --prefer-offline --no-audit --fund=false
COPY backend/ ./
RUN npm run build && npm prune --production

FROM node:20-alpine3.20
ENV NODE_ENV=production
WORKDIR /app
RUN apk update && apk upgrade --no-cache && addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
USER nodeusr
CMD ["node", "dist/index.js"]
