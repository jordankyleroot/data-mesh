-- Data Mesh Portal – Initial Schema
-- Run with: psql $DATABASE_URL -f 001_initial.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS schemas (
  subject        TEXT PRIMARY KEY,
  owner          TEXT NOT NULL,
  description    TEXT,
  registered_by  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at  TIMESTAMPTZ,
  deprecated_by  TEXT
);

CREATE TABLE IF NOT EXISTS schema_versions (
  id             BIGSERIAL PRIMARY KEY,
  subject        TEXT NOT NULL REFERENCES schemas(subject),
  version        INTEGER NOT NULL,
  schema_id      INTEGER NOT NULL,
  schema_json    JSONB NOT NULL,
  registered_by  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject, version)
);

CREATE TABLE IF NOT EXISTS topics (
  topic_name         TEXT PRIMARY KEY,
  domain             TEXT NOT NULL,
  partitions         INTEGER NOT NULL DEFAULT 6,
  replication_factor INTEGER NOT NULL DEFAULT 3,
  retention_ms       BIGINT NOT NULL DEFAULT 604800000,
  schema_subject     TEXT REFERENCES schemas(subject),
  description        TEXT,
  created_by         TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_ownership (
  domain    TEXT PRIMARY KEY,
  owner_id  TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain         TEXT NOT NULL,
  name           TEXT NOT NULL,
  description    TEXT,
  schema_subject TEXT REFERENCES schemas(subject),
  topic_name     TEXT REFERENCES topics(topic_name),
  tags           TEXT[] DEFAULT '{}',
  owner          TEXT,
  registered_by  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain, name)
);

CREATE TABLE IF NOT EXISTS data_lineage (
  id               BIGSERIAL PRIMARY KEY,
  source_domain    TEXT NOT NULL,
  source_dataset   TEXT NOT NULL,
  target_domain    TEXT NOT NULL,
  target_dataset   TEXT NOT NULL,
  relationship     TEXT NOT NULL DEFAULT 'derived_from',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_requests (
  id             UUID PRIMARY KEY,
  resource       TEXT NOT NULL,
  resource_type  TEXT NOT NULL CHECK (resource_type IN ('topic','schema','dataset')),
  access_level   TEXT NOT NULL CHECK (access_level IN ('read','write')),
  justification  TEXT NOT NULL,
  duration       TEXT NOT NULL,
  expires_at     TIMESTAMPTZ,
  requested_by   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  denial_reason  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  principal      TEXT NOT NULL,
  resource       TEXT NOT NULL,
  resource_type  TEXT NOT NULL,
  access_level   TEXT NOT NULL,
  expires_at     TIMESTAMPTZ,
  granted_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  details     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schemas_deprecated ON schemas(deprecated_at) WHERE deprecated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_topics_domain ON topics(domain);
CREATE INDEX IF NOT EXISTS idx_datasets_domain_name ON datasets(domain, name);
CREATE INDEX IF NOT EXISTS idx_datasets_tags ON datasets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status, requested_by);
CREATE INDEX IF NOT EXISTS idx_permissions_principal ON permissions(principal, expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor, created_at DESC);
