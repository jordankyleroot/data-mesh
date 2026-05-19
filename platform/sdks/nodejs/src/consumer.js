'use strict';

const { Kafka } = require('kafkajs');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');

class DataMeshConsumer {
  constructor({ bootstrapServers, schemaRegistryUrl, groupId, topics, ssl = false, sasl, autoOffsetReset = 'earliest' } = {}) {
    this._registry = new SchemaRegistry({ host: schemaRegistryUrl });

    const kafka = new Kafka({
      clientId: `datamesh-consumer-${groupId}`,
      brokers: bootstrapServers.split(','),
      ssl,
      sasl
    });

    this._consumer = kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this._topics = topics;
    this._autoOffsetReset = autoOffsetReset;
    this._running = false;
  }

  async start(handler) {
    await this._consumer.connect();
    await this._consumer.subscribe({
      topics: this._topics,
      fromBeginning: this._autoOffsetReset === 'earliest'
    });

    this._running = true;
    await this._consumer.run({
      autoCommit: false,
      eachBatchAutoResolve: true,
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
        for (const message of batch.messages) {
          if (!this._running) break;
          const payload = await this._registry.decode(message.value);
          const headers = Object.fromEntries(
            Object.entries(message.headers || {}).map(([k, v]) => [k, v?.toString()])
          );
          try {
            await handler(payload, headers, message);
          } catch (err) {
            console.error('Handler error', err);
          }
          resolveOffset(message.offset);
          await heartbeat();
        }
        await commitOffsetsIfNecessary();
      }
    });
  }

  async stop() {
    this._running = false;
    await this._consumer.disconnect();
  }
}

module.exports = { DataMeshConsumer };
