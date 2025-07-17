# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install system dependencies including Tesseract OCR
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
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including dev dependencies for building)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Remove dev dependencies to reduce image size
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Create necessary directories
RUN mkdir -p uploads data logs

# Set proper permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health/live', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["yarn", "start"] 