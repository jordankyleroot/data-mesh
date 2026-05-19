"""DataMesh Avro consumer with automatic deserialization and offset management."""

import logging
import signal
from typing import Any, Callable, Optional

from confluent_kafka import Consumer, KafkaError, KafkaException
from confluent_kafka.schema_registry import SchemaRegistryClient as ConfluentSRClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import SerializationContext, MessageField

logger = logging.getLogger(__name__)


class DataMeshConsumer:
    """Avro consumer with graceful shutdown and at-least-once delivery semantics."""

    def __init__(
        self,
        bootstrap_servers: str,
        schema_registry_url: str,
        group_id: str,
        topics: list[str],
        *,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        auto_offset_reset: str = "earliest",
        extra_config: Optional[dict] = None,
    ):
        sr_conf = {"url": schema_registry_url}
        if api_key:
            sr_conf["basic.auth.user.info"] = f"{api_key}:{api_secret}"
        self._sr_client = ConfluentSRClient(sr_conf)
        self._deserializer = AvroDeserializer(self._sr_client)

        consumer_conf: dict = {
            "bootstrap.servers": bootstrap_servers,
            "group.id": group_id,
            "auto.offset.reset": auto_offset_reset,
            "enable.auto.commit": False,
            "session.timeout.ms": 30000,
            "heartbeat.interval.ms": 3000,
        }
        if api_key:
            consumer_conf.update({
                "security.protocol": "SASL_SSL",
                "sasl.mechanism": "PLAIN",
                "sasl.username": api_key,
                "sasl.password": api_secret,
            })
        if extra_config:
            consumer_conf.update(extra_config)

        self._consumer = Consumer(consumer_conf)
        self._consumer.subscribe(topics)
        self._running = False

    def consume(
        self,
        handler: Callable[[dict[str, Any], dict], None],
        *,
        poll_timeout: float = 1.0,
        batch_size: int = 100,
    ) -> None:
        self._running = True
        signal.signal(signal.SIGTERM, lambda *_: self.stop())
        signal.signal(signal.SIGINT, lambda *_: self.stop())

        logger.info("Consumer started")
        try:
            while self._running:
                msgs = self._consumer.consume(num_messages=batch_size, timeout=poll_timeout)
                for msg in msgs:
                    if msg.error():
                        if msg.error().code() == KafkaError._PARTITION_EOF:
                            continue
                        raise KafkaException(msg.error())

                    ctx = SerializationContext(msg.topic(), MessageField.VALUE)
                    payload = self._deserializer(msg.value(), ctx)
                    headers = {k: v.decode() if isinstance(v, bytes) else v for k, v in (msg.headers() or [])}

                    try:
                        handler(payload, headers)
                    except Exception:
                        logger.exception("Handler error for msg offset=%d, skipping", msg.offset())

                if msgs:
                    self._consumer.commit(asynchronous=False)
        finally:
            self._consumer.close()
            logger.info("Consumer closed")

    def stop(self):
        self._running = False

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.stop()
