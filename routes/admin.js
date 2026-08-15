const express = require('express');
const { users, properties, reports } = require('../data/mockData');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

// GET /api/admin/agents
router.get('/agents', (req, res) => {
  const agents = users
    .filter((u) => u.role === 'agent')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      verified: u.verified,
      bio: u.bio,
      listingCount: properties.filter((p) => p.agentId === u.id && p.status !== 'removed').length,
    }));
  res.json({ agents });
});

// PUT /api/admin/agents/:id/verify   body: { verified: true|false }
router.put('/agents/:id/verify', (req, res) => {
  const agent = users.find((u) => u.id === Number(req.params.id) && u.role === 'agent');
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });
  agent.verified = !!(req.body || {}).verified;
  res.json({ agent: { id: agent.id, name: agent.name, verified: agent.verified } });
});

// GET /api/admin/reports
router.get('/reports', (req, res) => {
  const enriched = reports.map((r) => {
    const property = r.targetType === 'property' ? properties.find((p) => p.id === r.targetId) : null;
    const reporter = users.find((u) => u.id === r.reporterId);
    return {
      ...r,
      property: property ? { id: property.id, title: property.title, status: property.status } : null,
      reporter: reporter ? { id: reporter.id, name: reporter.name } : null,
    };
  });
  res.json({ reports: enriched });
});

// PUT /api/admin/reports/:id   body: { status: 'resolved'|'dismissed', removeProperty?: bool }
router.put('/reports/:id', (req, res) => {
  const report = reports.find((r) => r.id === Number(req.params.id));
  if (!report) return res.status(404).json({ error: 'Report not found.' });
  const { status, removeProperty } = req.body || {};
  if (!['resolved', 'dismissed', 'open'].includes(status)) {
    return res.status(400).json({ error: 'status must be one of: open, resolved, dismissed' });
  }
  report.status = status;
  if (removeProperty && report.targetType === 'property') {
    const property = properties.find((p) => p.id === report.targetId);
    if (property) property.status = 'removed';
  }
  res.json({ report });
});

module.exports = router;
