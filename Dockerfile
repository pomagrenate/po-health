# -- Stage 1: Build PomaiDB Native Library --
FROM gcc:12 AS builder

RUN apt-get update && apt-get install -y cmake

WORKDIR /app/pomaidb
COPY pomaidb/ .
RUN cmake -B build && cmake --build build

# -- Stage 2: Python Application --
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for medical-retrieval (if any)
RUN apt-get update && apt-get install -y libgomp1 && rm -rf /var/lib/apt/lists/*

# Copy built native library from builder
COPY --from=builder /app/pomaidb/build/libpomai_c.so /app/pomaidb/build/libpomai_c.so

# Install Python requirements
COPY medical_retrieval/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt python-dotenv

# Copy application code
COPY medical_retrieval/ medical_retrieval/
COPY _db.py .

# Environment configuration
ENV DB_PATH=/app/data/pomaidb_drugs
ENV POMAI_C_LIB=/app/pomaidb/build/libpomai_c.so
ENV PYTHONPATH=/app/medical_retrieval:/app

EXPOSE 8000

CMD ["uvicorn", "medical_retrieval.server:app", "--host", "0.0.0.0", "--port", "8000"]
