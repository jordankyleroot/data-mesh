const express = require('express');
const { z } = require('zod');
const router = express.Router();
const SchemaService = require('../services/SchemaService');
const PolicyService = require('../services/PolicyService');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const RegisterSchema = z.object({
  subject: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+-value$/, 'Subject must follow <domain>.<event>-value'),
  schema: z.object({
    type: z.literal('record'),
    name: z.string(),
    namespace: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.union([z.string(), z.object({}), z.array(z.unknown())]),
      doc: z.string().optional(),
      pii: z.boolean().optional().default(false)
    }))
  }),
  compatibility: z.enum(['NONE', 'BACKWARD', 'FORWARD', 'FULL', 'FULL_TRANSITIVE']).default('FULL_TRANSITIVE'),
  owner: z.string(),
  description: z.string().optional()
});

// GET /api/v1/schemas — list all registered schemas
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { domain, page = 1, limit = 20 } = req.query;
  const schemas = await SchemaService.list({ domain, page: Number(page), limit: Number(limit) });
  res.json(schemas);
}));

// GET /api/v1/schemas/:subject — get latest version of a schema
router.get('/:subject', requireAuth, asyncHandler(async (req, res) => {
  const schema = await SchemaService.getLatest(req.params.subject);
  if (!schema) return res.status(404).json({ error: 'Schema not found' });
  res.json(schema);
}));

// GET /api/v1/schemas/:subject/versions — list all versions
router.get('/:subject/versions', requireAuth, asyncHandler(async (req, res) => {
  const versions = await SchemaService.listVersions(req.params.subject);
  res.json(versions);
}));

// POST /api/v1/schemas — register or evolve a schema
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { schema, subject, compatibility, owner, description } = parsed.data;

  // Policy check: no PII fields without masking annotation
  const policyResult = await PolicyService.checkSchemaRegistration({ schema, subject, requester: req.user });
  if (!policyResult.allowed) {
    return res.status(403).json({ error: 'Policy violation', violations: policyResult.violations });
  }

  const result = await SchemaService.register({ subject, schema, compatibility, owner, description, registeredBy: req.user.sub });
  res.status(201).json(result);
}));

// POST /api/v1/schemas/:subject/compatibility — check if a schema is compatible
router.post('/:subject/compatibility', requireAuth, asyncHandler(async (req, res) => {
  const { schema } = req.body;
  if (!schema) return res.status(400).json({ error: 'schema body required' });

  const result = await SchemaService.checkCompatibility(req.params.subject, schema);
  res.json(result);
}));

// DELETE /api/v1/schemas/:subject — soft-delete (deprecate) a schema
router.delete('/:subject', requireAuth, asyncHandler(async (req, res) => {
  await SchemaService.deprecate(req.params.subject, req.user.sub);
  res.status(204).end();
}));

module.exports = router;
