const express = require('express');
const router = express.Router();
const CatalogService = require('../services/CatalogService');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');

// GET /api/v1/catalog — full catalog browse with facets
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { domain, tag, search, page = 1, limit = 20 } = req.query;
  const results = await CatalogService.search({ domain, tag, search, page: Number(page), limit: Number(limit) });
  res.json(results);
}));

// GET /api/v1/catalog/domains — list all domains
router.get('/domains', requireAuth, asyncHandler(async (_req, res) => {
  const domains = await CatalogService.listDomains();
  res.json(domains);
}));

// GET /api/v1/catalog/:domain/:dataset — dataset detail with lineage
router.get('/:domain/:dataset', requireAuth, asyncHandler(async (req, res) => {
  const { domain, dataset } = req.params;
  const entry = await CatalogService.getDataset(domain, dataset);
  if (!entry) return res.status(404).json({ error: 'Dataset not found' });
  res.json(entry);
}));

// GET /api/v1/catalog/:domain/:dataset/lineage — upstream/downstream lineage
router.get('/:domain/:dataset/lineage', requireAuth, asyncHandler(async (req, res) => {
  const { domain, dataset } = req.params;
  const depth = Math.min(Number(req.query.depth || 3), 10);
  const lineage = await CatalogService.getLineage(domain, dataset, depth);
  res.json(lineage);
}));

// POST /api/v1/catalog — register a new dataset
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const dataset = await CatalogService.register({ ...req.body, registeredBy: req.user.sub });
  res.status(201).json(dataset);
}));

module.exports = router;
