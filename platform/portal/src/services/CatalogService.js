const db = require('./db');

class CatalogService {
  async search({ domain, tag, search, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (domain) { params.push(domain); conditions.push(`d.domain = $${params.length}`); }
    if (tag)    { params.push(tag);    conditions.push(`$${params.length} = ANY(d.tags)`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(d.name ILIKE $${params.length} OR d.description ILIKE $${params.length})`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT d.*, s.subject as schema_subject, t.topic_name
       FROM datasets d
       LEFT JOIN schemas s ON s.subject = d.schema_subject
       LEFT JOIN topics t ON t.topic_name = d.topic_name
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT count(*) FROM datasets d ${where}`,
      params.slice(0, -2)
    );

    return { items: rows, total: Number(count), page, limit };
  }

  async listDomains() {
    const { rows } = await db.query(
      `SELECT domain, count(*) as dataset_count, max(created_at) as last_updated
       FROM datasets GROUP BY domain ORDER BY domain`
    );
    return rows;
  }

  async getDataset(domain, dataset) {
    const { rows } = await db.query(
      'SELECT * FROM datasets WHERE domain = $1 AND name = $2',
      [domain, dataset]
    );
    return rows[0] || null;
  }

  async getLineage(domain, dataset, depth) {
    // Recursive CTE to traverse lineage graph
    const { rows } = await db.query(
      `WITH RECURSIVE lineage AS (
         SELECT source_domain, source_dataset, target_domain, target_dataset, relationship, 1 as depth
         FROM data_lineage
         WHERE (source_domain = $1 AND source_dataset = $2)
            OR (target_domain = $1 AND target_dataset = $2)
         UNION ALL
         SELECT l2.source_domain, l2.source_dataset, l2.target_domain, l2.target_dataset, l2.relationship, l.depth + 1
         FROM data_lineage l2
         JOIN lineage l ON (l2.source_domain = l.target_domain AND l2.source_dataset = l.target_dataset)
         WHERE l.depth < $3
       )
       SELECT DISTINCT * FROM lineage`,
      [domain, dataset, depth]
    );
    return rows;
  }

  async register({ domain, name, description, schemaSubject, topicName, tags, owner, registeredBy }) {
    const { rows } = await db.query(
      `INSERT INTO datasets (domain, name, description, schema_subject, topic_name, tags, owner, registered_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (domain, name) DO UPDATE
         SET description = $3, schema_subject = $4, topic_name = $5, tags = $6, owner = $7
       RETURNING *`,
      [domain, name, description, schemaSubject, topicName, tags, owner, registeredBy]
    );
    return rows[0];
  }
}

module.exports = new CatalogService();
