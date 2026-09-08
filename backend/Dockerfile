FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p /data/uploads /data/ocr-cache \
  && chown -R node:node /app /data

ENV NODE_ENV=production \
    PORT=5000 \
    UPLOADS_DIR=/data/uploads \
    OCR_CACHE_PATH=/data/ocr-cache

USER node

EXPOSE 5000

CMD ["npm", "start"]
