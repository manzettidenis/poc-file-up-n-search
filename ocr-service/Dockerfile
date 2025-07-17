# Dedicated OCR Service with Tesseract
FROM node:18-alpine

# Install only OCR dependencies
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-spa \
    tesseract-ocr-data-fra \
    tesseract-ocr-data-deu \
    tesseract-ocr-data-ita \
    tesseract-ocr-data-por \
    tesseract-ocr-data-rus \
    tesseract-ocr-data-jpn \
    tesseract-ocr-data-chi_sim \
    tesseract-ocr-data-chi_tra \
    tesseract-ocr-data-ara \
    tesseract-ocr-data-hin \
    imagemagick \
    poppler-utils \
    wget \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy source code
COPY . .

# Create temp directory for OCR processing
RUN mkdir -p /tmp/ocr && chown -R node:node /tmp/ocr

# Set proper permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Start the OCR service
CMD ["node", "index.js"] 