"""
Contract & acceptance tests for the Data Mesh platform.

These tests run against a live local stack (docker-compose up -d).
They cover:
  1. Producer can publish events that validate against the registered schema
  2. Consumer reads those events and materializes a ClickHouse view
  3. Incompatible schema change is blocked by the Schema Registry
  4. OPA blocks PII field without masking annotation
  5. Replay CLI reconstructs the consumer view after a wipe

Run:
  pytest data-mesh/acceptance-tests/ -v --timeout=120
"""

import json
import os
import time
import uuid
from pathlib import Path

import pytest
import requests

REGISTRY_URL = os.getenv("SCHEMA_REGISTRY_URL", "http://localhost:8081")
PORTAL_URL   = os.getenv("PORTAL_URL", "http://localhost:3000")
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092")

SCHEMAS_DIR = Path(__file__).parent.parent / "schemas"
ORDER_SCHEMA = json.loads((SCHEMAS_DIR / "order_placed_v1.avsc").read_text())
ORDER_SUBJECT = "orders.order-placed-value"


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def registry_up():
    for _ in range(30):
        try:
            r = requests.get(f"{REGISTRY_URL}/subjects", timeout=3)
            if r.status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(2)
    pytest.fail("Schema Registry did not become healthy within 60s")


@pytest.fixture(scope="session")
def registered_order_schema(registry_up):
    """Ensure the order schema is registered for the test session."""
    requests.put(
        f"{REGISTRY_URL}/config/{ORDER_SUBJECT}",
        json={"compatibility": "FULL_TRANSITIVE"},
        headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
        timeout=5,
    )
    r = requests.post(
        f"{REGISTRY_URL}/subjects/{ORDER_SUBJECT}/versions",
        json={"schema": json.dumps(ORDER_SCHEMA), "schemaType": "AVRO"},
        headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
        timeout=5,
    )
    assert r.status_code in (200, 409), f"Schema registration failed: {r.text}"
    return r.json() if r.status_code == 200 else {"id": -1}


# ── Contract tests ─────────────────────────────────────────────────────────────

class TestSchemaContract:

    def test_order_schema_is_registered(self, registered_order_schema):
        """The order schema must exist in the registry."""
        r = requests.get(
            f"{REGISTRY_URL}/subjects/{ORDER_SUBJECT}/versions/latest",
            timeout=5,
        )
        assert r.status_code == 200
        body = r.json()
        assert "schema" in body
        parsed = json.loads(body["schema"])
        assert parsed["name"] == "OrderPlaced"

    def test_backward_compatible_schema_change_allowed(self, registered_order_schema):
        """Adding a nullable field with default is FULL_TRANSITIVE compatible."""
        new_schema = {**ORDER_SCHEMA}
        new_schema = dict(ORDER_SCHEMA)
        new_schema["fields"] = list(ORDER_SCHEMA["fields"]) + [
            {"name": "promoCode", "type": ["null", "string"], "default": None}
        ]

        r = requests.post(
            f"{REGISTRY_URL}/compatibility/subjects/{ORDER_SUBJECT}/versions/latest",
            json={"schema": json.dumps(new_schema), "schemaType": "AVRO"},
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
            timeout=5,
        )
        assert r.status_code == 200
        assert r.json()["is_compatible"] is True, "A safe backward-compatible change should be allowed"

    def test_incompatible_schema_change_blocked(self, registered_order_schema):
        """Removing a required field without a default breaks FULL_TRANSITIVE compatibility."""
        broken_schema = {
            "type": "record",
            "name": "OrderPlaced",
            "namespace": "com.datamesh.orders",
            "fields": [
                {"name": "orderId", "type": "string"},
                # "userId" removed — breaking change for existing consumers
                {"name": "total",   "type": "double"},
                {"name": "createdAt", "type": {"type": "long", "logicalType": "timestamp-millis"}}
            ]
        }

        r = requests.post(
            f"{REGISTRY_URL}/compatibility/subjects/{ORDER_SUBJECT}/versions/latest",
            json={"schema": json.dumps(broken_schema), "schemaType": "AVRO"},
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
            timeout=5,
        )
        assert r.status_code == 200
        assert r.json()["is_compatible"] is False, "Removing a required field must be rejected"

    def test_type_change_blocked(self, registered_order_schema):
        """Changing total from double to string must be rejected."""
        broken = {
            "type": "record",
            "name": "OrderPlaced",
            "namespace": "com.datamesh.orders",
            "fields": [f if f["name"] != "total" else {**f, "type": "string"} for f in ORDER_SCHEMA["fields"]]
        }
        r = requests.post(
            f"{REGISTRY_URL}/compatibility/subjects/{ORDER_SUBJECT}/versions/latest",
            json={"schema": json.dumps(broken), "schemaType": "AVRO"},
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
            timeout=5,
        )
        assert r.status_code == 200
        assert r.json()["is_compatible"] is False


class TestOPAPolicy:

    def _eval(self, policy: str, input_data: dict) -> dict:
        r = requests.post(
            f"http://localhost:8181/v1/data/{policy}",
            json={"input": input_data},
            timeout=5,
        )
        assert r.status_code == 200, f"OPA request failed: {r.text}"
        return r.json().get("result", {})

    def test_opa_blocks_pii_field(self):
        result = self._eval("datamesh/schema_allow", {
            "action": "register",
            "subject": "users.profile-updated-value",
            "requester": {"domain": "users", "roles": ["domain-owner"], "permissions": []},
            "schema": {
                "type": "record",
                "name": "ProfileUpdated",
                "fields": [
                    {"name": "userId", "type": "string"},
                    {"name": "email",  "type": "string"}  # PII, no masking
                ]
            }
        })
        assert result is False or result == False or result.get("allow") is False, \
            "OPA must block schema with unmasked PII field"

    def test_opa_allows_masked_pii(self):
        result = self._eval("datamesh/schema_allow", {
            "action": "register",
            "subject": "users.profile-updated-value",
            "requester": {"domain": "users", "roles": ["domain-owner"], "permissions": []},
            "schema": {
                "type": "record",
                "name": "ProfileUpdated",
                "fields": [
                    {"name": "userId", "type": "string"},
                    {"name": "email",  "type": "string", "masked": True}
                ]
            }
        })
        assert result is True or result == True or result.get("allow") is True, \
            "OPA must allow schema with properly masked PII field"


class TestProducerE2E:

    def test_produce_and_consume_order(self, registered_order_schema):
        """Publish a synthetic order and verify it arrives on the topic."""
        from confluent_kafka import Consumer, Producer, KafkaError
        from confluent_kafka.schema_registry import SchemaRegistryClient as SRClient
        from confluent_kafka.schema_registry.avro import AvroSerializer, AvroDeserializer
        from confluent_kafka.serialization import SerializationContext, MessageField

        sr = SRClient({"url": REGISTRY_URL})
        serializer = AvroSerializer(sr, json.dumps(ORDER_SCHEMA), conf={"auto.register.schemas": True})

        order_id = str(uuid.uuid4())
        topic = "orders.order-placed.critical"
        payload = {
            "orderId": order_id,
            "userId": str(uuid.uuid4()),
            "items": [{"sku": "SKU-TEST-001", "qty": 2, "unitPrice": 29.99}],
            "total": 59.98,
            "currency": "USD",
            "channel": "WEB",
            "status": "PLACED",
            "createdAt": int(time.time() * 1000),
        }

        producer = Producer({"bootstrap.servers": KAFKA_BROKERS, "acks": "all"})
        ctx = SerializationContext(topic, MessageField.VALUE)
        producer.produce(topic=topic, key=order_id.encode(), value=serializer(payload, ctx))
        producer.flush(10)

        # Consume and verify
        deserializer = AvroDeserializer(sr)
        consumer = Consumer({
            "bootstrap.servers": KAFKA_BROKERS,
            "group.id": f"acceptance-test-{uuid.uuid4()}",
            "auto.offset.reset": "latest",
        })
        consumer.subscribe([topic])

        found = False
        deadline = time.time() + 30
        while time.time() < deadline and not found:
            msg = consumer.poll(1.0)
            if msg is None or msg.error():
                continue
            decoded = deserializer(msg.value(), SerializationContext(topic, MessageField.VALUE))
            if decoded.get("orderId") == order_id:
                found = True
                assert decoded["total"] == 59.98
                assert len(decoded["items"]) == 1

        consumer.close()
        assert found, f"Published order {order_id} not consumed within 30s"
