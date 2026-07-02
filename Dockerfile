# JurisGED — imagem de referência para produção (Linux/Docker).
# Inclui Tesseract (português) e Poppler para o OCR real (ver docs/OCR.md).
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-por \
    poppler-utils \
    ghostscript \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Sincroniza o schema e inicia. (Seed inicial: rode `npx prisma db seed` uma vez.)
CMD ["sh", "-c", "npx prisma db push && npm run start"]
