const express = require('express');
const { z } = require('zod');
const router = express.Router();
const AccessService = require('../services/AccessService');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');

const AccessRequestSchema = z.object({
  resource: z.string(),
  resourceType: z.enum(['topic', 'schema', 'dataset']),
  accessLevel: z.enum(['read', 'write']),
  justification: z.string().min(20),
  duration: z.enum(['7d', '30d', '90d', 'permanent']).default('30d')
});

// GET /api/v1/access/requests — my pending requests
router.get('/requests', requireAuth, asyncHandler(async (req, res) => {
  const requests = await AccessService.listRequests({ requestedBy: req.user.sub });
  res.json(requests);
}));

// GET /api/v1/access/requests/pending — requests pending my approval
router.get('/requests/pending', requireAuth, requireRole(['domain-owner', 'platform-admin']), asyncHandler(async (req, res) => {
  const requests = await AccessService.listPendingApprovals({ approver: req.user.sub });
  res.json(requests);
}));

// POST /api/v1/access/requests — request access to a resource
router.post('/requests', requireAuth, asyncHandler(async (req, res) => {
  const parsed = AccessRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const request = await AccessService.createRequest({ ...parsed.data, requestedBy: req.user.sub });
  res.status(201).json(request);
}));

// PUT /api/v1/access/requests/:id/approve
router.put('/requests/:id/approve', requireAuth, requireRole(['domain-owner', 'platform-admin']), asyncHandler(async (req, res) => {
  const result = await AccessService.approve(req.params.id, req.user.sub);
  res.json(result);
}));

// PUT /api/v1/access/requests/:id/deny
router.put('/requests/:id/deny', requireAuth, requireRole(['domain-owner', 'platform-admin']), asyncHandler(async (req, res) => {
  const result = await AccessService.deny(req.params.id, req.user.sub, req.body.reason);
  res.json(result);
}));

// GET /api/v1/access/permissions — my active permissions
router.get('/permissions', requireAuth, asyncHandler(async (req, res) => {
  const permissions = await AccessService.listPermissions({ principal: req.user.sub });
  res.json(permissions);
}));

module.exports = router;
