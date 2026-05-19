"""DataMesh Avro producer with automatic schema registration and policy checks."""

import json
import logging
import os
import time
import uuid
from typing import Any, Callable, Optional

from confluent_kafka import Producer
from confluent_kafka.schema_registry import SchemaRegistryClient as ConfluentSRClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import SerializationContext, MessageField

logger = logging.getLogger(__name__)


class DataMeshProducer:
    """Thread-safe Avro producer for the Data Mesh streaming backbone."""

    def __init__(
        self,
        bootstrap_servers: str,
        schema_registry_url: str,
        domain: str,
        *,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        extra_config: Optional[dict] = None,
    ):
        self.domain = domain
        self._sr_url = schema_registry_url

        sr_conf = {"url": schema_registry_url}
        if api_key:
            sr_conf["basic.auth.user.info"] = f"{api_key}:{api_secret}"
        self._sr_client = ConfluentSRClient(sr_conf)

        producer_conf: dict = {
            "bootstrap.servers": bootstrap_servers,
            "acks": "all",
            "enable.idempotence": True,
            "compression.type": "lz4",
            "linger.ms": 5,
            "batch.size": 65536,
        }
        if api_key:
            producer_conf.update({
                "security.protocol": "SASL_SSL",
                "sasl.mechanism": "PLAIN",
                "sasl.username": api_key,
                "sasl.password": api_secret,
            })
        if extra_config:
            producer_conf.update(extra_config)

        self._producer = Producer(producer_conf)
        self._serializers: dict[str, AvroSerializer] = {}

    # ------------------------------------------------------------------
    def _get_serializer(self, schema_str: str, subject: str) -> AvroSerializer:
        if subject not in self._serializers:
            self._serializers[subject] = AvroSerializer(
                self._sr_client,
                schema_str,
                conf={"auto.register.schemas": False, "use.latest.version": True},
            )
        return self._serializers[subject]

    def produce(
        self,
        topic: str,
        event_type: str,
        payload: dict[str, Any],
        schema_str: str,
        *,
        key: Optional[str] = None,
        headers: Optional[dict] = None,
        on_delivery: Optional[Callable] = None,
    ) -> None:
        subject = f"{self.domain}.{event_type}-value"
        serializer = self._get_serializer(schema_str, subject)

        envelope = {
            **payload,
            "_meta": {
                "eventId": str(uuid.uuid4()),
                "domain": self.domain,
                "eventType": event_type,
                "producedAt": int(time.time() * 1000),
                "schemaSubject": subject,
            },
        }

        ctx = SerializationContext(topic, MessageField.VALUE)
        value_bytes = serializer(envelope, ctx)

        kafka_headers = [("domain", self.domain), ("eventType", event_type)]
        if headers:
            kafka_headers += list(headers.items())

        self._producer.produce(
            topic=topic,
            key=(key or str(uuid.uuid4())).encode(),
            value=value_bytes,
            headers=kafka_headers,
            on_delivery=on_delivery or self._default_delivery_cb,
        )

    def flush(self, timeout: float = 30.0) -> int:
        return self._producer.flush(timeout)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.flush()

    @staticmethod
    def _default_delivery_cb(err, msg):
        if err:
            logger.error("Delivery failed topic=%s: %s", msg.topic(), err)
        else:
            logger.debug("Delivered topic=%s partition=%d offset=%d", msg.topic(), msg.partition(), msg.offset())
