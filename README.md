# File Upload & Search Application

A comprehensive file upload and search application with OCR capabilities, built with modern architecture principles including Domain-Driven Design (DDD), comprehensive monitoring, and Docker containerization.

##  Features

- **File Upload**: Support for multiple file types (PDF, images, text files)
- **OCR Text Extraction**: Extract text from images using Tesseract OCR with multi-language support
- **Full-Text Search**: Search through uploaded files and extracted text content
- **Modern Frontend**: SolidJS-based responsive web interface
- **DDD Architecture**: Clean, maintainable backend architecture
- **Comprehensive Monitoring**: Prometheus metrics, health checks, structured logging
- **Docker Ready**: Full containerization with Docker Compose

##  Architecture

### Backend (Node.js + TypeScript)
- **Domain-Driven Design**: Clean separation of concerns
- **OCR Integration**: Tesseract OCR with 12+ language support
- **Caching**: Multi-layer caching with Redis-like performance
- **Monitoring**: Prometheus metrics, Winston logging, health checks
- **Security**: Rate limiting, input validation, secure file handling

### Frontend (SolidJS + TypeScript)
- **Modern UI**: Responsive design with Tailwind CSS
- **Real-time**: File upload progress and instant search
- **Error Handling**: Comprehensive error states and user feedback

### Infrastructure
- **Docker**: Multi-stage builds for optimal image sizes
- **Nginx**: Production-ready reverse proxy and static file serving
- **Monitoring**: Optional Prometheus + Grafana stack


##  Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB RAM available
- Ports 3000 and 3001 available

### 1. Clone and Setup
```bash
git clone <repository-url>
cd file-upload-n-search
cp .env.example .env
```

### 2. Build and Run
```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Documentation**: http://localhost:3001/api/status

### 4. Optional: Enable Monitoring
```bash
# Start with monitoring stack
docker-compose --profile monitoring up --build -d

# Access monitoring
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3002 (admin/admin)
```

##  Supported File Types & OCR Languages

### File Types
- **Text**: `.txt`
- **PDFs**: `.pdf`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.tiff`, `.tif`, `.bmp`, `.webp`

### OCR Languages
- English (eng) - Default
- Spanish (spa)
- French (fra)
- German (deu)
- Italian (ita)
- Portuguese (por)
- Russian (rus)
- Japanese (jpn)
- Chinese Simplified (chi_sim)
- Chinese Traditional (chi_tra)
- Arabic (ara)
- Hindi (hin)

## Configuration

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_DIR=uploads

# OCR Configuration
OCR_DEFAULT_LANGUAGE=eng
OCR_PREPROCESSING=true

# Rate Limiting (PoC-friendly)
RATE_LIMIT_MAX_REQUESTS=1000
UPLOAD_RATE_LIMIT_MAX=50
SEARCH_RATE_LIMIT_MAX=300
```

### Docker Compose Profiles
- **Default**: Frontend + Backend only
- **Monitoring**: Includes Prometheus + Grafana
```bash
# Default setup
docker-compose up

# With monitoring
docker-compose --profile monitoring up
```

##  Health & Monitoring

### Health Check Endpoints
- `GET /health` - Comprehensive health check
- `GET /health/live` - Liveness probe (K8s ready)
- `GET /health/ready` - Readiness probe (K8s ready)
- `GET /metrics` - Prometheus metrics
- `GET /api/status` - Detailed system status

### Key Metrics
- HTTP request duration and count
- File upload success/failure rates
- OCR processing times and accuracy
- Search query performance
- Memory and disk usage
- Cache hit rates

## Development

### Local Development Setup
```bash
# Backend
cd server
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev
```

##  Project Structure
```
file-upload-n-search/
├── server/                 # Node.js API
│   ├── src/
│   │   ├── domain/         # Domain entities & services
│   │   ├── application/    # Use cases
│   │   ├── infrastructure/ # External integrations
│   │   ├── routes/         # API routes
│   │   └── utils/          # Utilities & monitoring
│   ├── Dockerfile
│   └── package.json
├── client/                 # SolidJS web app
│   ├── src/
│   │   ├── app/            # App instance
│   │   ├── components/     # JSX components
│   │   ├── core/
│   │   ├── features/
│   │   ├── shared/
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── monitoring/             # Monitoring configs
│   └── prometheus.yml
├── docker-compose.yml      # Main orchestration
└── README.md
```

##  Production Deployment

### Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml file-upload-app
```

### Kubernetes
```bash
# Generate K8s manifests from Compose
kompose convert -f docker-compose.yml

# Apply to cluster
kubectl apply -f .
```

##  Usage Examples

### Upload a File
```bash
curl -X POST \
  -F "file=@document.pdf" \
  http://localhost:3001/api/upload
```

### Search Files
```bash
curl "http://localhost:3001/api/search?q=your+search+term"
```

### Check OCR Capabilities
```bash
curl http://localhost:3001/api/ocr/capabilities
```

##  Security Features

- **Rate Limiting**: Configurable per endpoint
- **File Validation**: MIME type and extension checking
- **Input Sanitization**: All user inputs sanitized
- **Security Headers**: CORS, CSP, and security headers
- **Container Security**: Non-root user, minimal attack surface

##  Performance Features

- **Caching**: Multi-layer caching (file content, search results, metadata)
- **Async Processing**: Non-blocking file processing with queues
- **Compression**: Gzip compression for all responses
- **CDN Ready**: Static file optimization
- **Resource Monitoring**: Memory and disk usage tracking

##  Scalability Considerations

###  Current PoC Limitations

This application is designed as a **Proof of Concept** with the following limitations:

#### Search Architecture
- **In-Memory Search**: Uses Fuse.js with all documents loaded in memory
- **Single-Node Processing**: All search operations on one server
- **Linear Performance Degradation**: Search speed decreases as document count increases
- **Memory Constraints**: Limited by available RAM (~1,000-10,000 documents)
- **Full Index Rebuilds**: Complete reindexing required for updates

#### Current Scale Limits
| Metric | PoC Limit | Performance Impact |
|--------|-----------|-------------------|
| **Documents** | ~10,000 | Memory usage grows linearly |
| **Concurrent Users** | ~50 | CPU-bound search operations |
| **Index Size** | ~1GB | Single server RAM limitation |
| **Search Latency** | 50-500ms | Increases with document count |
| **Storage** | Local filesystem | No redundancy or distribution |

###  Production Scalability Options

#### Phase 1: Immediate Optimizations (Current PoC Enhanced)
```bash
# Enhanced configuration for better PoC performance
MAX_DOCUMENTS=5000
SEARCH_CACHE_TTL=300
INDEX_UPDATE_BATCH_SIZE=100
MEMORY_THRESHOLD=80
```

**Improvements:**
- Enhanced caching strategies
- Search result pagination optimization
- Memory usage monitoring and cleanup
- Async index updates with batching

#### Phase 2: Elasticsearch Migration (Production Ready)

**Why Elasticsearch?**
- **Inverted Index**: O(log n) vs O(n) search complexity
- **Horizontal Scaling**: Distribute across multiple nodes
- **Real-time Updates**: Incremental indexing without rebuilds
- **Advanced Features**: Aggregations, faceted search, analytics

**Architecture Example:**
```yaml
# Production docker-compose with Elasticsearch
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - cluster.name=file-search-cluster
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    
  backend:
    environment:
      - SEARCH_ENGINE=elasticsearch
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - SEARCH_INDEX=file_documents
```

**Performance Comparison:**
| Feature | Fuse.js (PoC) | Elasticsearch (Production) |
|---------|---------------|---------------------------|
| **Max Documents** | 10,000 | 10M+ |
| **Concurrent Users** | 50 | 1,000+ |
| **Search Speed** | 50-500ms | 1-50ms |
| **Memory Usage** | High (RAM-based) | Low (disk-based) |
| **Scaling** | Vertical only | Horizontal |
| **Real-time Updates** | Full rebuild | Incremental |

#### Phase 3: Microservices Architecture (Enterprise Scale)

**Service Decomposition:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Upload API    │    │   Search API    │    │  Metadata API   │
│                 │    │                 │    │                 │
│ - File handling │    │ - Elasticsearch │    │ - Document info │
│ - OCR processing│    │ - Query parsing │    │ - User management│
│ - Validation    │    │ - Result ranking│    │ - Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Message Queue  │
                    │   (RabbitMQ)    │
                    └─────────────────┘
```

**Technologies:**
- **Message Queue**: RabbitMQ or Apache Kafka for async processing
- **Service Mesh**: Istio for service communication
- **Load Balancer**: NGINX or HAProxy
- **Container Orchestration**: Kubernetes
- **Monitoring**: ELK Stack + Prometheus + Grafana

### OCR Architecture Options

The current implementation includes Tesseract OCR in the backend container. For production, consider these alternatives:

#### Option 1: Monolithic (Current) - Best for PoC/Small Scale
```yaml
backend:
  # Single container with API + OCR
  - File upload handling
  - Text extraction (Tesseract)
  - Search API
  - File metadata
```

**Pros:** Simple deployment, low latency, fewer dependencies
**Cons:** Resource contention, scaling limitations, tight coupling

#### Option 2: Microservices - Best for Production Scale
```yaml
services:
  backend-api:     # Core API without OCR
  ocr-service:     # Dedicated OCR processing
  redis:           # Job queue for async OCR
  frontend:        # Web interface
```

**Architecture Example:** See `docker-compose-microservices.yml` for complete setup.

**Microservices Benefits:**
- **Independent Scaling**: Scale OCR processing separately from API
- **Fault Isolation**: OCR failures don't affect file uploads
- **Resource Optimization**: Dedicated CPU/memory for OCR workloads
- **Technology Flexibility**: Use different OCR engines (Tesseract, AWS Textract, Google Vision)

**OCR Service Features:**
```typescript
// Dedicated OCR service API
POST /ocr/extract
{
  "fileUrl": "https://storage/image.jpg",
  "language": "eng",
  "preprocessing": true,
  "options": {
    "dpi": 300,
    "contrast": true,
    "denoise": true
  }
}
```

**When to Migrate to Microservices:**
- **> 100 files/day** with OCR processing
- **> 50 concurrent users**
- **Need for different OCR engines**
- **Performance bottlenecks** in current setup
- **Team scaling** (different teams managing different services)

**Migration Path:**
1. **Phase 1**: Keep current monolithic setup with monitoring
2. **Phase 2**: Extract OCR to separate container while keeping same codebase
3. **Phase 3**: Full microservices with independent deployment pipelines

#### Phase 4: Cloud-Native Deployment (Global Scale)

**AWS Architecture Example:**
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   CloudFront │    │     ALB      │    │     ECS      │
│     (CDN)    │────│ Load Balancer│────│   Fargate    │
└──────────────┘    └──────────────┘    └──────────────┘
                                                │
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│     S3       │    │ OpenSearch   │    │     RDS      │
│ File Storage │    │   (Search)   │    │  (Metadata)  │
└──────────────┘    └──────────────┘    └──────────────┘
```

**Scale Targets:**
- **Documents**: 100M+ documents
- **Users**: 10,000+ concurrent users
- **Throughput**: 1,000+ searches/second
- **Availability**: 99.9% uptime
- **Global**: Multi-region deployment

### 🔄 Migration Strategy

#### Hybrid Approach During Transition
```typescript
class HybridSearchRepository implements IFileRepository {
  constructor(
    private fuseRepository: FileSystemFileRepository,
    private elasticRepository: ElasticsearchFileRepository,
    private migrationThreshold: number = 1000
  ) {}
  
  async search(query: SearchQuery): Promise<SearchResult> {
    const documentCount = await this.count()
    
    // Use Elasticsearch for large datasets
    if (documentCount > this.migrationThreshold) {
      return this.elasticRepository.search(query)
    }
    
    // Use Fuse.js for smaller datasets
    return this.fuseRepository.search(query)
  }
}
```

#### Migration Timeline
1. **Phase 1** (Current): Optimize Fuse.js performance monitoring
2. **Phase 2** (Growth): Add Elasticsearch alongside Fuse.js
3. **Phase 3** (Scale): Full migration to Elasticsearch cluster
4. **Phase 4** (Enterprise): Microservices and cloud-native deployment

### Monitoring & Alerting for Scale

```yaml
# Production monitoring thresholds
alerts:
  search_latency: >500ms
  memory_usage: >80%
  error_rate: >1%
  queue_backlog: >1000
  disk_usage: >85%
  
scaling_triggers:
  cpu_utilization: >70%
  search_requests: >100/second
  document_count: >threshold
```

### Recommendations

#### For Small Teams (< 10,000 documents):
- **Keep current Fuse.js implementation**
- **Add performance monitoring and alerting**
- **Implement horizontal scaling preparation**

#### For Growing Applications (10,000+ documents):
- **Migrate to Elasticsearch**
- **Implement proper CI/CD pipeline**
- **Add comprehensive monitoring stack**

#### For Enterprise Applications (100,000+ documents):
- **Adopt microservices architecture**
- **Implement cloud-native deployment**
- **Add advanced analytics and ML features**

## Troubleshooting

### Common Issues

1. **OCR not working**: Ensure Tesseract is installed in the container
```bash
docker exec file-upload-backend tesseract --version
```

2. **Out of memory**: Increase Docker memory limit
```bash
# In docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

3. **File upload fails**: Check disk space and file size limits
```bash
docker exec file-upload-backend df -h
```

### Logs
```bash
# View application logs
docker-compose logs backend

# Follow logs
docker-compose logs -f backend frontend
```
