# Po-Health: Advanced Drug Retrieval and Repurposing System

Po-Health is a specialized platform designed for medical professionals to perform semantic searches and identify potential drug repurposing candidates. By leveraging state-of-the-art embedding models and a high-performance vector database, the system provides accurate and contextually relevant results for complex medical queries.

## Core Features

- Semantic Drug Search: Perform natural language queries to find drugs with specific indications, ingredients, or therapeutic effects.
- Safe Drug Repurposing: A proof-of-concept pipeline that identifies structurally similar, non-toxic alternatives to existing compounds using ChemBERTa embeddings and Tox21 toxicity data.
- Hybrid Search Infrastructure: Combines low-latency vector similarity search with structured metadata filtering (e.g., dose form, status) for precise information retrieval.
- Embedded Architecture: High-performance search powered by PomaiDB, a native vector database integrated directly into the application process.
- Patient-Friendly Mode: A functional diversity feature that simplifies complex clinical indications into plain language for non-medical users.

## Interface Preview

![Drug Retrieval Interface](screenshot.png)

## Technical Features (Production Ready)

- Health Monitoring: Real-time system health reporting via the `/health` endpoint.
- Structured Logging: Production-ready JSON logging for observability and log aggregation.
- Resilience: Global exception handling and request validation for enhanced stability.
- Security: Integrated security headers, CORS management, and built-in rate limiting for search endpoints.
- Containerization: Full Docker and Docker Compose support for reproducible deployments.

## Technology Stack

- Language: Python
- Embeddings: ChemBERTa (77M-MLM) and sentence-transformers
- Database: PomaiDB (embedded C++ vector engine)
- Backend: FastAPI
- Frontend: Vanilla HTML and CSS

## Project Structure

- drug_repurposing_poc.py: Implementation of the drug similarity and toxicity filtering pipeline.
- medical_retrieval/: The core web application directory.
  - server.py: FastAPI server managing the hybrid search engine.
  - ingest.py: Utility for populating the PomaiDB instance with drug data.
  - logging_config.py: Structured JSON logging configuration.
  - search_engine.py: Logic for ranking, filtering, and simplifying search results.
  - static/: Web interface assets.
- pomaidb/: Submodule containing the native vector database engine.
- Dockerfile / docker-compose.yml: Production deployment configurations.

## Installation and Setup

### Build the Native Library

Navigate to the PomaiDB directory and build the C library:

```bash
cd pomaidb
cmake -B build
cmake --build build
```

### Environment Setup

Install the required Python dependencies:

```bash
pip install -r medical_retrieval/requirements.txt python-dotenv
```

### Running the Server

Start the FastAPI application:

```bash
cd medical_retrieval
uvicorn server:app --port 8000
```

### Docker Deployment

To run the entire stack in a containerized environment:

```bash
docker-compose up --build
```

Access the web interface at http://localhost:8000 and the health check at http://localhost:8000/health.
