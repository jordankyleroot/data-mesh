'use strict';

const { Kafka, CompressionTypes } = require('kafkajs');
const { SchemaRegistry } = require('@kafkajs/confluent-schema-registry');
const { v4: uuidv4 } = require('uuid');

class DataMeshProducer {
  constructor({ bootstrapServers, schemaRegistryUrl, domain, ssl = false, sasl } = {}) {
    this.domain = domain;
    this._registry = new SchemaRegistry({ host: schemaRegistryUrl });

    const kafka = new Kafka({
      clientId: `datamesh-producer-${domain}`,
      brokers: bootstrapServers.split(','),
      ssl,
      sasl
    });

    this._producer = kafka.producer({
      allowAutoTopicCreation: false,
      idempotent: true,
      transactionTimeout: 30000
    });
    this._connected = false;
    this._schemaCache = new Map();
  }

  async connect() {
    if (!this._connected) {
      await this._producer.connect();
      this._connected = true;
    }
    return this;
  }

  async produce(topic, eventType, payload, { key, headers = {} } = {}) {
    if (!this._connected) await this.connect();

    const subject = `${this.domain}.${eventType}-value`;
    let schemaId = this._schemaCache.get(subject);
    if (!schemaId) {
      schemaId = await this._registry.getLatestSchemaId(subject);
      this._schemaCache.set(subject, schemaId);
    }

    const envelope = {
      ...payload,
      _meta: {
        eventId: uuidv4(),
        domain: this.domain,
        eventType,
        producedAt: Date.now(),
        schemaSubject: subject
      }
    };

    const encodedValue = await this._registry.encode(schemaId, envelope);

    await this._producer.send({
      topic,
      messages: [{
        key: key ?? uuidv4(),
        value: encodedValue,
        headers: { domain: this.domain, eventType, ...headers },
        timestamp: String(Date.now())
      }],
      compression: CompressionTypes.LZ4
    });
  }

  async disconnect() {
    if (this._connected) {
      await this._producer.disconnect();
      this._connected = false;
    }
  }
}

module.exports = { DataMeshProducer };
