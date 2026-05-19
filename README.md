# Domain-Owned Event Data Platform

A production-ready streaming data platform that lets domain teams publish reliable Avro-schema events to a central Kafka backbone, discover and consume them through a self-service catalog, and deploy materialized views into ClickHouse/Redshift — all enforced by policy-as-code and contract tests.

---

## Quick Start (Local, 15 minutes)

All commands run from the **repo root** (`C:\Users\kyle\Documents\data-mesh`).

```bash
# 1. Start the full local stack
docker compose -f data-mesh/docker/docker-compose.yml up -d

# 2. Wait for health checks (~60s)
docker compose -f data-mesh/docker/docker-compose.yml ps

# 3. Install the Python SDK
pip install -e platform/sdks/python

# 4. Register schemas
py data-mesh/producer-orders/src/register_schema.py --registry-url http://localhost:8081

# 5. Publish 20 synthetic orders
py data-mesh/producer-orders/src/orders_producer.py --count 20 --interval 0.2

# 6. Start the inventory consumer (materializes to ClickHouse)
pip install -r data-mesh/consumer-inventory/src/requirements.txt
py data-mesh/consumer-inventory/src/inventory_consumer.py

# 7. Query the materialized view (open a second terminal)
curl "http://localhost:8123/?query=SELECT+sku,sum(reserved_qty)+as+total_reserved+FROM+datamesh.inventory_view+GROUP+BY+sku+ORDER+BY+total_reserved+DESC&database=datamesh"

# 8. Open Grafana dashboards
start http://localhost:3001   # admin / admin
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        DOMAIN TEAMS (Producers)                              │
│   Orders SDK ──► Producer SDK (Python/Node/PHP)                              │
│                      │  Avro serialize + schema-registry header              │
└──────────────────────┼───────────────────────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    STREAMING BACKBONE                                        │
│   ┌─────────────────────────┐     ┌─────────────────────────┐               │
│   │   AWS MSK (Kafka 3.5)   │     │  Confluent Schema Reg.  │               │
│   │   Multi-AZ, TLS+IAM     │     │  FULL_TRANSITIVE compat │               │
│   │   Topic ACLs + quotas   │◄────│  Avro + OPA gate        │               │
│   └────────────┬────────────┘     └─────────────────────────┘               │
└────────────────┼─────────────────────────────────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CONSUMERS & MATERIALIZED VIEWS                            │
│   Inventory Service ──► ClickHouse (inventory_view)                         │
│   Analytics Service ──► Redshift / ClickHouse (aggregated facts)            │
│   Search Service    ──► Elasticsearch (product catalog)                     │
└──────────────────────────────────────────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────────────────────────┐
│                    PLATFORM SERVICES                                         │
│   Developer Portal (Node.js + React)  ── Schema catalog, access requests    │
│   OPA Policy Engine                   ── RBAC, PII checks, retention        │
│   Replay CLI (Python)                 ── Time-window or offset replay       │
│   Prometheus + Grafana                ── Throughput, lag, SLO dashboards     │
└──────────────────────────────────────────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE (AWS + Terraform)                          │
│   VPC (multi-AZ) + NAT gateways                                             │
│   EKS cluster (GitOps via ArgoCD)                                           │
│   KMS encryption for all data at rest                                       │
│   IAM roles (producer / consumer / platform-admin)                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Repository Layout

```
data-mesh/
├── .github/workflows/
│   ├── schema-ci.yml          # Lint → compat check → OPA tests → contract tests → gate
│   ├── portal-ci.yml          # Portal API lint/test/Docker build
│   └── infra-plan.yml         # Terraform plan on PR, post to comments
├── infra/
│   ├── modules/
│   │   ├── vpc/               # Multi-AZ VPC with NAT gateways
│   │   ├── msk/               # MSK cluster, TLS+IAM, S3 log archive
│   │   ├── eks/               # EKS 1.29, private endpoint, IMDSv2
│   │   ├── kms/               # Customer-managed KMS key
│   │   ├── iam/               # Producer / consumer / portal IAM roles
│   │   └── schema-registry/   # Schema Registry on ECS Fargate + ALB
│   └── envs/
│       ├── staging/main.tf
│       └── prod/main.tf
├── platform/
│   ├── portal/
│   │   ├── src/               # Node.js Express API
│   │   │   ├── routes/        # schemas, topics, catalog, access, health
│   │   │   ├── services/      # SchemaService, TopicService, CatalogService, AccessService
│   │   │   └── middleware/    # auth (JWT), asyncHandler
│   │   ├── migrations/        # PostgreSQL schema (001_initial.sql)
│   │   ├── frontend/          # React self-service portal UI
│   │   └── Dockerfile
│   ├── sdks/
│   │   ├── python/            # datamesh SDK: DataMeshProducer, DataMeshConsumer, SchemaRegistryClient
│   │   ├── nodejs/            # @datamesh/sdk: DataMeshProducer, DataMeshConsumer
│   │   └── php/               # DataMesh\SDK\DataMeshProducer, SchemaRegistryClient
│   ├── policy/
│   │   ├── rules/datamesh.rego    # OPA: schema/topic/data access + PII + retention
│   │   └── tests/datamesh_test.rego
│   ├── replay/
│   │   └── src/replay_cli.py  # Replay by time window or offset; consumer lag status
│   └── observability/
│       └── dashboards/        # Grafana JSON dashboards
├── data-mesh/
│   ├── schemas/               # Avro schemas (.avsc): orders, inventory, promotions
│   ├── producer-orders/       # Synthetic orders producer (Python)
│   ├── consumer-inventory/    # Inventory materialized-view consumer → ClickHouse
│   ├── docker/                # docker-compose.yml for local dev stack
│   └── acceptance-tests/      # pytest: contract tests, OPA tests, E2E produce/consume
└── ci/
    └── check_schema_compatibility.py
```

---

## Onboarding a Producer (≤ 2 hrs)

### Step 1 — Define your Avro schema

Create `data-mesh/schemas/<domain>_<event>_v1.avsc`. Follow the naming convention:

```json
{
  "type": "record",
  "name": "MyEvent",
  "namespace": "com.datamesh.<domain>",
  "fields": [
    { "name": "eventId",    "type": "string" },
    { "name": "createdAt",  "type": { "type": "long", "logicalType": "timestamp-millis" } }
  ]
}
```

**PII rules:** Any field named `email`, `phone`, `ssn`, `ip_address`, etc. must include `"masked": true` or OPA will block registration.

### Step 2 — Register your schema

```bash
python data-mesh/producer-orders/src/register_schema.py \
  --registry-url http://localhost:8081
```

### Step 3 — Publish events (Python)

```python
from datamesh import DataMeshProducer

with DataMeshProducer(
    bootstrap_servers="localhost:9092",
    schema_registry_url="http://localhost:8081",
    domain="orders",
) as p:
    p.produce(
        topic="orders.order-placed.critical",
        event_type="order-placed",
        payload={"orderId": "...", "userId": "...", ...},
        schema_str=schema_json,
    )
```

### Step 4 — Open a PR

CI will automatically:
1. Lint the `.avsc` file
2. Check compatibility against staging registry
3. Run OPA policy tests
4. Run consumer contract tests

If all pass, the schema is promoted to production.

---

## Demo Scenarios

| Scenario | Command (run from repo root) |
|---|---|
| Publish 100 orders | `py data-mesh/producer-orders/src/orders_producer.py --count 100` |
| Query materialized view | `curl "http://localhost:8123/?query=SELECT+*+FROM+datamesh.inventory_view+LIMIT+20&database=datamesh"` |
| Block incompatible schema | Push a PR removing a required field — CI gate blocks it |
| Policy enforcement | Add `email` field without `masked:true` — portal returns 403 |
| Replay a consumer | `py platform/replay/src/replay_cli.py replay --topic orders.order-placed.critical --consumer-group inventory-materializer-v1 --from 2024-01-01T00:00:00Z` |
| Consumer lag status | `py platform/replay/src/replay_cli.py status --topic orders.order-placed.critical --consumer-group inventory-materializer-v1` |

---

## KPIs & SLOs

| KPI | Target | Measurement |
|---|---|---|
| Producer onboarding time | ≤ 2 days | Jira ticket open → first event published |
| Schema incompatibility detection | ≤ 15 min | CI run time on PR |
| Stale promotion incidents | ≥ 80% reduction | Incident count vs baseline |
| Event delivery success | 99.95% within 30s | `datamesh_event_delivery_*` metrics |
| Consumer lag (critical topics) | < 1s | `kafka_consumer_group_lag` |
| Cost per million events | Monitored | CloudWatch + Grafana cost dashboard |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Streaming | AWS MSK (Kafka 3.5), multi-AZ |
| Schema | Confluent Schema Registry, Avro, FULL_TRANSITIVE compat |
| Stream Processing | Apache Flink / ksqlDB |
| Analytics Store | ClickHouse (sub-second), Redshift (BI) |
| Portal | Node.js/Express + React |
| Policy | OPA (Open Policy Agent) |
| Infra | AWS EKS, VPC, KMS, S3, Terraform |
| CI/CD | GitHub Actions + ArgoCD (GitOps) |
| Observability | Prometheus + Grafana + Jaeger + Loki |
| SDKs | Python, Node.js, PHP |

---

## Phase Roadmap

| Phase | Weeks | Deliverable |
|---|---|---|
| 0 — Discovery | 0 | Stakeholders, top-10 domains, pain baseline |
| 1 — Core Infra | 1–3 | MSK + Schema Registry + EKS + portal skeleton |
| 2 — First Producer | 4–7 | Orders producer, inventory consumer, contract test CI |
| 3 — Production | 8–12 | OPA engine, replay, ClickHouse connector, SLO dashboards |

---

## Running Tests

All commands run from the **repo root** (`C:\Users\kyle\Documents\data-mesh`).

```bash
# OPA policy unit tests
opa test platform/policy/rules/ platform/policy/tests/ -v

# Portal API tests
cd platform/portal
npm test
cd ../..

# Acceptance tests (requires local stack running)
docker compose -f data-mesh/docker/docker-compose.yml up -d
pytest data-mesh/acceptance-tests/ -v --timeout=120
```
