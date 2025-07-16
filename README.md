# File Upload & Search PoC

A proof-of-concept application for uploading files and searching through their content, built with SolidJS + TailwindCSS on the frontend and Node.js + Express + TypeScript on the backend.

## Features

- **File Upload**: Drag & drop or click to upload files (TXT, PDF, DOC, DOCX, Images)
- **Text Extraction**: Automatically extracts text content from uploaded files
- **Full-Text Search**: Search through file contents using fuzzy search
- **File Management**: View, delete, and manage uploaded files
- **Real-time Search**: Search as you type with debounced queries
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- SolidJS with TypeScript
- TailwindCSS for styling
- Vite for build tooling

### Backend
- Node.js with Express and TypeScript
- Domain-Driven Design architecture
- In-memory storage (for PoC simplicity)
- Fuse.js for fuzzy search
- Multer for file uploads

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will start on http://localhost:3001

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:3000

## API Endpoints

- `POST /api/upload` - Upload a file
- `GET /api/search?q={query}` - Search through files
- `GET /api/files` - List all files
- `GET /api/files/:id` - Get specific file
- `DELETE /api/files/:id` - Delete a file
- `GET /api/health` - Health check

## File Support

Currently supports:
- **Text Files**: .txt (full text extraction)
- **PDFs**: .pdf (placeholder for PoC)
- **Documents**: .doc, .docx (placeholder for PoC)
- **Images**: .jpg, .jpeg, .png (no text extraction yet)

## Architecture

The backend follows Domain-Driven Design principles:

```
backend/src/
├── domain/           # Business logic
│   ├── entities/     # Domain entities
│   ├── repositories/ # Repository interfaces
│   └── services/     # Domain service interfaces
├── infrastructure/   # External concerns
│   ├── repositories/ # Repository implementations
│   └── services/     # Service implementations
├── routes/          # HTTP routes
└── types/           # TypeScript types
```

## Limitations (PoC)

- In-memory storage (data lost on restart)
- Basic text extraction (only .txt files fully supported)
- No user authentication
- No file persistence beyond server restart
- Limited file size (50MB max)
- No advanced search filters

## Future Enhancements

- Database persistence (PostgreSQL + Elasticsearch)
- Advanced PDF/DOCX text extraction
- OCR for images
- User authentication and file ownership
- Advanced search filters (file type, date range, etc.)
- File previews
- Collaborative features

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses tsx for hot reload
npm run build  # Compile TypeScript
npm start      # Run compiled version
```

### Frontend Development
```bash
cd frontend
npm run dev    # Vite dev server
npm run build  # Production build
npm run preview # Preview production build
```

## License

MIT 