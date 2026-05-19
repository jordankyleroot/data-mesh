const axios = require('axios');
const db = require('./db');

const REGISTRY_URL = process.env.SCHEMA_REGISTRY_URL || 'http://localhost:8081';

const registryClient = axios.create({ baseURL: REGISTRY_URL, timeout: 5000 });

class SchemaService {
  async list({ domain, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const where = domain ? 'WHERE subject LIKE $1' : '';
    const params = domain ? [`${domain}.%`, limit, offset] : [limit, offset];
    const idxShift = domain ? 1 : 0;

    const { rows } = await db.query(
      `SELECT s.*, array_agg(sv.version ORDER BY sv.version) as versions
       FROM schemas s
       LEFT JOIN schema_versions sv ON sv.subject = s.subject
       ${where}
       GROUP BY s.subject, s.owner, s.description, s.registered_by, s.created_at, s.deprecated_at
       ORDER BY s.created_at DESC
       LIMIT $${1 + idxShift} OFFSET $${2 + idxShift}`,
      params
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT count(*) FROM schemas ${where}`,
      domain ? [`${domain}.%`] : []
    );

    return { items: rows, total: Number(count), page, limit };
  }

  async getLatest(subject) {
    try {
      const { data } = await registryClient.get(`/subjects/${encodeURIComponent(subject)}/versions/latest`);
      const { rows } = await db.query('SELECT * FROM schemas WHERE subject = $1', [subject]);
      return { ...data, metadata: rows[0] || null };
    } catch (err) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async listVersions(subject) {
    const { data } = await registryClient.get(`/subjects/${encodeURIComponent(subject)}/versions`);
    return data;
  }

  async register({ subject, schema, compatibility, owner, description, registeredBy }) {
    // 1. Set compatibility level in registry
    await registryClient.put(`/config/${encodeURIComponent(subject)}`, { compatibility });

    // 2. Register schema in Confluent Schema Registry
    const { data: registryResult } = await registryClient.post(
      `/subjects/${encodeURIComponent(subject)}/versions`,
      { schema: JSON.stringify(schema), schemaType: 'AVRO' }
    );

    // 3. Persist metadata in portal DB
    await db.query(
      `INSERT INTO schemas (subject, owner, description, registered_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (subject) DO UPDATE SET owner = $2, description = $3`,
      [subject, owner, description, registeredBy]
    );

    await db.query(
      `INSERT INTO schema_versions (subject, version, schema_id, schema_json, registered_by, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [subject, registryResult.id, registryResult.id, JSON.stringify(schema), registeredBy]
    );

    return { subject, schemaId: registryResult.id, compatibility };
  }

  async checkCompatibility(subject, schema) {
    const { data } = await registryClient.post(
      `/compatibility/subjects/${encodeURIComponent(subject)}/versions/latest`,
      { schema: JSON.stringify(schema), schemaType: 'AVRO' }
    );
    return data;
  }

  async deprecate(subject, deprecatedBy) {
    await db.query(
      'UPDATE schemas SET deprecated_at = NOW(), deprecated_by = $2 WHERE subject = $1',
      [subject, deprecatedBy]
    );
  }
}

module.exports = new SchemaService();
