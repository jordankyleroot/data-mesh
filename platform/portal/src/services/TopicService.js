const { Kafka, logLevel } = require('kafkajs');
const db = require('./db');

const kafka = new Kafka({
  clientId: 'datamesh-portal',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: process.env.KAFKA_TLS === 'true',
  sasl: process.env.KAFKA_SASL_MECHANISM === 'AWS_MSK_IAM'
    ? { mechanism: 'AWS_MSK_IAM' }
    : undefined,
  logLevel: logLevel.WARN
});

const admin = kafka.admin();
let adminConnected = false;

async function getAdmin() {
  if (!adminConnected) {
    await admin.connect();
    adminConnected = true;
  }
  return admin;
}

class TopicService {
  async list({ domain } = {}) {
    const where = domain ? 'WHERE domain = $1' : '';
    const params = domain ? [domain] : [];
    const { rows } = await db.query(
      `SELECT * FROM topics ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  }

  async get(topicName) {
    const { rows } = await db.query('SELECT * FROM topics WHERE topic_name = $1', [topicName]);
    return rows[0] || null;
  }

  async create({ topicName, domain, partitions, replicationFactor, retentionMs, schemaSubject, description, createdBy }) {
    const a = await getAdmin();
    await a.createTopics({
      topics: [{
        topic: topicName,
        numPartitions: partitions,
        replicationFactor,
        configEntries: [
          { name: 'retention.ms', value: String(retentionMs) },
          { name: 'min.insync.replicas', value: '2' },
          { name: 'cleanup.policy', value: 'delete' }
        ]
      }],
      waitForLeaders: true
    });

    const { rows } = await db.query(
      `INSERT INTO topics (topic_name, domain, partitions, replication_factor, retention_ms, schema_subject, description, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [topicName, domain, partitions, replicationFactor, retentionMs, schemaSubject, description, createdBy]
    );

    return rows[0];
  }

  async delete(topicName) {
    const a = await getAdmin();
    await a.deleteTopics({ topics: [topicName] });
    await db.query('DELETE FROM topics WHERE topic_name = $1', [topicName]);
  }

  async getMetrics(topicName) {
    const a = await getAdmin();
    const offsets = await a.fetchTopicOffsets(topicName);
    return {
      topicName,
      partitions: offsets.map(p => ({
        partition: p.partition,
        high: p.high,
        low: p.low,
        offset: p.offset
      }))
    };
  }
}

module.exports = new TopicService();
