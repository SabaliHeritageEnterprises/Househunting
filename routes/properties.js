const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { properties, users, reports, counters, mockImageFor } = require('../data/mockData');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const { generateImage } = require('../services/imageGeneration');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `property-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, or WEBP images are allowed.'), ok);
  },
});

function publicProperty(p) {
  const agent = users.find((u) => u.id === p.agentId);
  return {
    ...p,
    agent: agent
      ? { id: agent.id, name: agent.name, verified: agent.verified, bio: agent.bio }
      : null,
  };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// GET /api/properties?category=&type=&minPrice=&maxPrice=&guests=&city=&search=&checkIn=&checkOut=
router.get('/', optionalAuthenticate, (req, res) => {
  const { category, type, minPrice, maxPrice, guests, city, search, checkIn, checkOut } = req.query;

  let list = properties.filter((p) => p.status !== 'removed');

  if (category) list = list.filter((p) => p.category === category);
  if (type) list = list.filter((p) => p.type === type);
  if (city) list = list.filter((p) => p.location.city.toLowerCase().includes(String(city).toLowerCase()));
  if (minPrice) list = list.filter((p) => p.price >= Number(minPrice));
  if (maxPrice) list = list.filter((p) => p.price <= Number(maxPrice));
  if (guests) list = list.filter((p) => p.maxGuests >= Number(guests));
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q)
    );
  }
  if (checkIn && checkOut) {
    list = list.filter((p) => !p.bookedRanges.some((r) => overlaps(checkIn, checkOut, r.start, r.end)));
  }

  res.json({ properties: list.map(publicProperty), total: list.length });
});

// GET /api/properties/:id
router.get('/:id', (req, res) => {
  const property = properties.find((p) => p.id === Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  res.json({ property: publicProperty(property) });
});

// POST /api/properties  (agent only)
router.post('/', authenticate, authorize('agent', 'admin'), async (req, res) => {
  const {
    title, description, category, type, price,
    location, bedrooms, bathrooms, maxGuests, amenities,
  } = req.body || {};

  const validCategories = ['villa', 'beach_apartment', 'holiday_home', 'guesthouse', 'condo', 'townhouse'];
  const validTypes = ['short_let', 'long_term'];

  if (!title || !description || !category || !type || !price || !location || !location.city) {
    return res.status(400).json({ error: 'title, description, category, type, price, and location.city are required.' });
  }
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
  }
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  }

  const id = counters.nextPropertyId();

  // Try the configured AI image service; always falls back to a stable
  // placeholder photo so property creation never fails because of it.
  let imageUrl;
  try {
    imageUrl = await generateImage({ title, description, category });
  } catch (err) {
    imageUrl = mockImageFor(category, id);
  }

  const property = {
    id,
    agentId: req.user.id,
    title: String(title).trim(),
    description: String(description).trim(),
    category,
    type,
    price: Number(price),
    priceUnit: type === 'short_let' ? 'night' : 'month',
    location: {
      city: location.city,
      area: location.area || '',
      country: location.country || '',
      lat: Number(location.lat) || 0,
      lng: Number(location.lng) || 0,
    },
    bedrooms: Number(bedrooms) || 1,
    bathrooms: Number(bathrooms) || 1,
    maxGuests: Number(maxGuests) || 2,
    amenities: Array.isArray(amenities) ? amenities : [],
    images: [imageUrl],
    aiGenerated: true,
    bookedRanges: [],
    status: 'active',
    reportCount: 0,
    createdAt: new Date().toISOString(),
  };

  properties.push(property);
  res.status(201).json({ property: publicProperty(property) });
});

// PUT /api/properties/:id  (owning agent or admin)
router.put('/:id', authenticate, authorize('agent', 'admin'), (req, res) => {
  const property = properties.find((p) => p.id === Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  if (property.agentId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only edit your own listings.' });
  }

  const editable = ['title', 'description', 'category', 'type', 'price', 'location', 'bedrooms', 'bathrooms', 'maxGuests', 'amenities', 'bookedRanges'];
  for (const field of editable) {
    if (req.body[field] !== undefined) property[field] = req.body[field];
  }
  if (req.body.type) property.priceUnit = req.body.type === 'short_let' ? 'night' : 'month';

  res.json({ property: publicProperty(property) });
});

// DELETE /api/properties/:id  (owning agent or admin)
router.delete('/:id', authenticate, authorize('agent', 'admin'), (req, res) => {
  const property = properties.find((p) => p.id === Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  if (property.agentId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only remove your own listings.' });
  }
  property.status = 'removed';
  res.json({ ok: true });
});

// POST /api/properties/:id/images  (multipart upload — overwrites AI image)
router.post('/:id/images', authenticate, authorize('agent', 'admin'), upload.single('image'), (req, res) => {
  const property = properties.find((p) => p.id === Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  if (property.agentId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only upload photos to your own listings.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No image file received (field name must be "image").' });

  const url = `/uploads/${req.file.filename}`;
  // An uploaded photo replaces the AI-generated placeholder entirely.
  if (property.aiGenerated) {
    property.images = [url];
    property.aiGenerated = false;
  } else {
    property.images.push(url);
  }
  res.status(201).json({ property: publicProperty(property) });
});

// POST /api/properties/:id/report  (any signed-in user)
router.post('/:id/report', authenticate, (req, res) => {
  const property = properties.find((p) => p.id === Number(req.params.id));
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const { reason } = req.body || {};
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'Please describe why you are reporting this listing.' });
  }
  const report = {
    id: counters.nextReportId(),
    targetType: 'property',
    targetId: property.id,
    reporterId: req.user.id,
    reason: String(reason).trim(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  reports.push(report);
  property.reportCount += 1;
  if (property.reportCount >= 3) property.status = 'reported';
  res.status(201).json({ ok: true, report });
});

module.exports = router;
