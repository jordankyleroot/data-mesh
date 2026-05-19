<?php

declare(strict_types=1);

namespace DataMesh\SDK;

use RdKafka\Conf;
use RdKafka\Producer;
use RdKafka\TopicConf;
use Ramsey\Uuid\Uuid;

/**
 * Avro producer for the Data Mesh streaming backbone.
 *
 * Requires ext-rdkafka and a Confluent Schema Registry client.
 * Install: composer require datamesh/sdk
 */
class DataMeshProducer
{
    private Producer $producer;
    private SchemaRegistryClient $registry;
    private string $domain;
    private array $schemaCache = [];

    public function __construct(
        string $bootstrapServers,
        string $schemaRegistryUrl,
        string $domain,
        array $options = []
    ) {
        $this->domain   = $domain;
        $this->registry = new SchemaRegistryClient($schemaRegistryUrl, $options);

        $conf = new Conf();
        $conf->set('bootstrap.servers', $bootstrapServers);
        $conf->set('acks', 'all');
        $conf->set('enable.idempotence', 'true');
        $conf->set('compression.type', 'lz4');
        $conf->set('linger.ms', '5');

        if (!empty($options['api_key'])) {
            $conf->set('security.protocol', 'SASL_SSL');
            $conf->set('sasl.mechanism', 'PLAIN');
            $conf->set('sasl.username', $options['api_key']);
            $conf->set('sasl.password', $options['api_secret'] ?? '');
        }

        $conf->setDrMsgCb(static function (Producer $producer, \RdKafka\Message $message): void {
            if ($message->err !== RD_KAFKA_RESP_ERR_NO_ERROR) {
                error_log('[DataMeshProducer] delivery error: ' . $message->errstr());
            }
        });

        $this->producer = new Producer($conf);
    }

    /**
     * @param array<string,mixed> $payload  Raw event payload (will be Avro-serialized)
     */
    public function produce(
        string $topic,
        string $eventType,
        array $payload,
        string $schemaJson,
        ?string $key = null
    ): void {
        $subject  = "{$this->domain}.{$eventType}-value";
        $schemaId = $this->getOrRegisterSchema($subject, $schemaJson);

        $envelope = array_merge($payload, [
            '_meta' => [
                'eventId'       => Uuid::uuid4()->toString(),
                'domain'        => $this->domain,
                'eventType'     => $eventType,
                'producedAt'    => (int) (microtime(true) * 1000),
                'schemaSubject' => $subject,
            ],
        ]);

        $encoded = $this->encodeAvro($schemaId, $schemaJson, $envelope);

        $topicConf = new TopicConf();
        $rdTopic   = $this->producer->newTopic($topic, $topicConf);
        $rdTopic->produce(
            RD_KAFKA_PARTITION_UA,
            0,
            $encoded,
            $key ?? Uuid::uuid4()->toString()
        );
    }

    public function flush(int $timeoutMs = 30000): void
    {
        $this->producer->flush($timeoutMs);
    }

    private function getOrRegisterSchema(string $subject, string $schemaJson): int
    {
        if (!isset($this->schemaCache[$subject])) {
            $this->schemaCache[$subject] = $this->registry->getLatestSchemaId($subject);
        }
        return $this->schemaCache[$subject];
    }

    private function encodeAvro(int $schemaId, string $schemaJson, array $data): string
    {
        // Magic byte (0x00) + 4-byte big-endian schema ID + Avro binary payload
        $schema  = \AvroSchema::parse($schemaJson);
        $io      = new \AvroStringIO();
        $encoder = new \AvroBinaryEncoder($io);
        $writer  = new \AvroIODatumWriter($schema);
        $writer->write($data, $encoder);

        return pack('CN', 0, $schemaId) . $io->string();
    }
}
