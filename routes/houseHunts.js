const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { houseHunts, properties, users, counters } = require('../data/mockData');
const { authenticate, authorize } = require('../middleware/auth');
const { estimateFee } = require('../services/feeEstimator');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `househunt-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, or WEBP images are allowed.'), ok);
  },
});

function publicHouseHunt(h) {
  const property = h.propertyId ? properties.find((p) => p.id === h.propertyId) : null;
  const customer = users.find((u) => u.id === h.customerId);
  const agent = h.agentId ? users.find((u) => u.id === h.agentId) : null;
  return {
    ...h,
    property: property
      ? { id: property.id, title: property.title, images: property.images, category: property.category, location: property.location }
      : null,
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
    agent: agent ? { id: agent.id, name: agent.name, verified: agent.verified } : null,
  };
}

// GET /api/house-hunts/estimate?city=&country=  — public, used for a live fee
// preview in the request form before the customer submits.
router.get('/estimate', (req, res) => {
  const { fee, tier } = estimateFee(req.query.city || '', req.query.country || '');
  res.json({ fee, tier });
});

// GET /api/house-hunts — role-scoped
// customer -> their own requests
// agent    -> requests assigned to them, plus the open unclaimed pool
// admin    -> everything
router.get('/', authenticate, (req, res) => {
  let list;
  if (req.user.role === 'admin') {
    list = houseHunts;
  } else if (req.user.role === 'agent') {
    list = houseHunts.filter((h) => h.agentId === req.user.id || (!h.agentId && h.status === 'pending'));
  } else {
    list = houseHunts.filter((h) => h.customerId === req.user.id);
  }
  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ houseHunts: list.map(publicHouseHunt) });
});

// POST /api/house-hunts  (customer)
// source: 'listed' -> { source, propertyId, preferredDate, notes }
// source: 'external' -> { source, external: { title, address, city, country, area, sourceLink, askingPrice, contactInfo, description }, preferredDate, notes }
router.post('/', authenticate, authorize('customer'), (req, res) => {
  const { source, propertyId, external, preferredDate, notes } = req.body || {};

  if (!['listed', 'external'].includes(source)) {
    return res.status(400).json({ error: 'source must be "listed" or "external".' });
  }
  if (!preferredDate) {
    return res.status(400).json({ error: 'preferredDate is required.' });
  }

  let location;
  let resolvedPropertyId = null;
  let resolvedExternal = null;

  if (source === 'listed') {
    const property = properties.find((p) => p.id === Number(propertyId) && p.status !== 'removed');
    if (!property) return res.status(404).json({ error: 'That listing could not be found.' });
    resolvedPropertyId = property.id;
    location = property.location;
  } else {
    if (!external || !external.city || !external.country || !external.description) {
      return res.status(400).json({ error: 'For an external property, city, country, and a short description are required.' });
    }
    resolvedExternal = {
      title: external.title || 'Untitled property',
      address: external.address || '',
      sourceLink: external.sourceLink || '',
      askingPrice: external.askingPrice ? Number(external.askingPrice) : null,
      contactInfo: external.contactInfo || '',
      description: external.description,
    };
    location = { city: external.city, area: external.area || '', country: external.country };
  }

  const { fee, tier } = estimateFee(location.city, location.country);

  const request = {
    id: counters.nextHouseHuntId(),
    customerId: req.user.id,
    source,
    propertyId: resolvedPropertyId,
    external: resolvedExternal,
    location,
    preferredDate,
    notes: notes || '',
    fee,
    feeTier: tier,
    status: fee === null ? 'pending_quote' : 'pending',
    agentId: null,
    report: null,
    createdAt: new Date().toISOString(),
  };
  houseHunts.push(request);
  res.status(201).json({ houseHunt: publicHouseHunt(request) });
});

// PUT /api/house-hunts/:id/claim  (verified agent only)
router.put('/:id/claim', authenticate, authorize('agent'), (req, res) => {
  const request = houseHunts.find((h) => h.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.status !== 'pending' || request.agentId) {
    return res.status(409).json({ error: 'This request has already been claimed or is not yet ready to be claimed.' });
  }
  const agent = users.find((u) => u.id === req.user.id);
  if (!agent || !agent.verified) {
    return res.status(403).json({ error: 'Only verified agents can accept house-hunt verification requests.' });
  }
  request.agentId = agent.id;
  request.status = 'assigned';
  res.json({ houseHunt: publicHouseHunt(request) });
});

// PUT /api/house-hunts/:id/report  (the assigned agent) { verdict: 'exists'|'not_exists', notes }
router.put('/:id/report', authenticate, authorize('agent'), (req, res) => {
  const request = houseHunts.find((h) => h.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.agentId !== req.user.id) {
    return res.status(403).json({ error: 'You can only submit findings for requests assigned to you.' });
  }
  if (request.status !== 'assigned') {
    return res.status(409).json({ error: 'This request has already been resolved.' });
  }
  const { verdict, notes } = req.body || {};
  if (!['exists', 'not_exists'].includes(verdict)) {
    return res.status(400).json({ error: 'verdict must be "exists" or "not_exists".' });
  }
  if (!notes || !String(notes).trim()) {
    return res.status(400).json({ error: 'Please add a short note describing what you found.' });
  }
  request.report = {
    verdict,
    notes: String(notes).trim(),
    photo: (request.report && request.report.photo) || null,
    submittedAt: new Date().toISOString(),
  };
  request.status = verdict === 'exists' ? 'confirmed_exists' : 'confirmed_not_exists';
  res.json({ houseHunt: publicHouseHunt(request) });
});

// POST /api/house-hunts/:id/photo  (the assigned agent, multipart "photo" field)
router.post('/:id/photo', authenticate, authorize('agent'), upload.single('photo'), (req, res) => {
  const request = houseHunts.find((h) => h.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.agentId !== req.user.id) {
    return res.status(403).json({ error: 'You can only attach evidence to requests assigned to you.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No image file received (field name must be "photo").' });

  const url = `/uploads/${req.file.filename}`;
  if (!request.report) {
    request.report = { verdict: null, notes: '', photo: url, submittedAt: null };
  } else {
    request.report.photo = url;
  }
  res.status(201).json({ houseHunt: publicHouseHunt(request) });
});

// PUT /api/house-hunts/:id/status  (customer owner, or admin) — cancellation only
router.put('/:id/status', authenticate, (req, res) => {
  const request = houseHunts.find((h) => h.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  const { status } = req.body || {};
  if (status !== 'cancelled') {
    return res.status(400).json({ error: 'This endpoint can only be used to cancel a request.' });
  }

  const isOwner = request.customerId === req.user.id && req.user.role === 'customer';
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'You are not authorised to cancel this request.' });
  }
  if (!isAdmin && !['pending_quote', 'pending', 'assigned'].includes(request.status)) {
    return res.status(409).json({ error: 'This request already has findings and can no longer be cancelled.' });
  }
  request.status = 'cancelled';
  res.json({ houseHunt: publicHouseHunt(request) });
});

// PUT /api/house-hunts/:id/quote  (admin only) — set a manual fee for a "pending_quote" request
router.put('/:id/quote', authenticate, authorize('admin'), (req, res) => {
  const request = houseHunts.find((h) => h.id === Number(req.params.id));
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.status !== 'pending_quote') {
    return res.status(409).json({ error: 'This request already has a fee set.' });
  }
  const { fee, feeTier } = req.body || {};
  const numericFee = Number(fee);
  if (!numericFee || numericFee <= 0) {
    return res.status(400).json({ error: 'Please provide a valid fee amount.' });
  }
  request.fee = numericFee;
  request.feeTier = feeTier || 'Custom quote';
  request.status = 'pending';
  res.json({ houseHunt: publicHouseHunt(request) });
});

module.exports = router;
