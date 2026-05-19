const express = require('express');
const { z } = require('zod');
const router = express.Router();
const TopicService = require('../services/TopicService');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth, requireRole } = require('../middleware/auth');

const CreateTopicSchema = z.object({
  domain: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().regex(/^[a-z0-9-]+$/),
  partitions: z.number().int().min(1).max(200).default(6),
  replicationFactor: z.number().int().min(1).max(3).default(3),
  retentionMs: z.number().default(604_800_000), // 7 days
  schemaSubject: z.string().optional(),
  tier: z.enum(['critical', 'standard', 'bulk']).default('standard'),
  description: z.string().optional()
});

// Full topic name follows convention: <domain>.<name>.<tier>
function buildTopicName(domain, name, tier) {
  return `${domain}.${name}.${tier}`;
}

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { domain } = req.query;
  const topics = await TopicService.list({ domain });
  res.json(topics);
}));

router.get('/:topicName', requireAuth, asyncHandler(async (req, res) => {
  const topic = await TopicService.get(req.params.topicName);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  res.json(topic);
}));

router.get('/:topicName/metrics', requireAuth, asyncHandler(async (req, res) => {
  const metrics = await TopicService.getMetrics(req.params.topicName);
  res.json(metrics);
}));

router.post('/', requireAuth, requireRole(['domain-owner', 'platform-admin']), asyncHandler(async (req, res) => {
  const parsed = CreateTopicSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { domain, name, partitions, replicationFactor, retentionMs, schemaSubject, tier, description } = parsed.data;
  const topicName = buildTopicName(domain, name, tier);

  const topic = await TopicService.create({
    topicName,
    domain,
    partitions,
    replicationFactor,
    retentionMs,
    schemaSubject,
    description,
    createdBy: req.user.sub
  });

  res.status(201).json(topic);
}));

router.delete('/:topicName', requireAuth, requireRole(['platform-admin']), asyncHandler(async (req, res) => {
  await TopicService.delete(req.params.topicName);
  res.status(204).end();
}));

module.exports = router;
