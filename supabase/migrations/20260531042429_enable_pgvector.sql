-- Enable the pgvector extension for vector similarity search.
-- Used by reflections.embedding (vector(1536)) for semantic recall over reflections.
CREATE EXTENSION IF NOT EXISTS vector;
