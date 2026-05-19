const db = require('./db');
const { v4: uuidv4 } = require('uuid');

class AccessService {
  async createRequest({ resource, resourceType, accessLevel, justification, duration, requestedBy }) {
    const id = uuidv4();
    const expiresAt = duration === 'permanent' ? null : this._expiresAt(duration);

    const { rows: [row] } = await db.query(
      `INSERT INTO access_requests (id, resource, resource_type, access_level, justification, duration, expires_at, requested_by, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',NOW()) RETURNING *`,
      [id, resource, resourceType, accessLevel, justification, duration, expiresAt, requestedBy]
    );
    return row;
  }

  async listRequests({ requestedBy }) {
    const { rows } = await db.query(
      `SELECT * FROM access_requests WHERE requested_by = $1 ORDER BY created_at DESC`,
      [requestedBy]
    );
    return rows;
  }

  async listPendingApprovals({ approver }) {
    const { rows } = await db.query(
      `SELECT ar.* FROM access_requests ar
       JOIN topic_ownership to_ ON to_.domain = split_part(ar.resource, '.', 1)
       WHERE ar.status = 'pending' AND to_.owner_id = $1
       UNION
       SELECT * FROM access_requests WHERE status = 'pending' AND $1 = ANY(SELECT unnest(ARRAY[]::text[]))
       ORDER BY created_at DESC`,
      [approver]
    );
    return rows;
  }

  async approve(id, approvedBy) {
    const { rows: [req] } = await db.query('SELECT * FROM access_requests WHERE id = $1', [id]);
    if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });

    await db.query(
      `UPDATE access_requests SET status='approved', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2`,
      [approvedBy, id]
    );

    await db.query(
      `INSERT INTO permissions (id, principal, resource, resource_type, access_level, expires_at, granted_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [uuidv4(), req.requested_by, req.resource, req.resource_type, req.access_level, req.expires_at, approvedBy]
    );

    return { id, status: 'approved' };
  }

  async deny(id, deniedBy, reason) {
    await db.query(
      `UPDATE access_requests SET status='denied', reviewed_by=$1, reviewed_at=NOW(), denial_reason=$2 WHERE id=$3`,
      [deniedBy, reason, id]
    );
    return { id, status: 'denied' };
  }

  async listPermissions({ principal }) {
    const { rows } = await db.query(
      `SELECT * FROM permissions WHERE principal=$1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [principal]
    );
    return rows;
  }

  _expiresAt(duration) {
    const days = { '7d': 7, '30d': 30, '90d': 90 };
    const d = new Date();
    d.setDate(d.getDate() + (days[duration] || 30));
    return d;
  }
}

module.exports = new AccessService();
