const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { generateImage } = require('../services/imageGeneration');
const { properties } = require('../data/mockData');

const router = express.Router();

// POST /api/generate-image
// body: { title, description, category, propertyId? }
// If propertyId is provided and belongs to the caller, the new image is
// saved onto that property (as the AI cover). Otherwise the URL is just
// returned so the caller (e.g. the "create listing" form, before the
// property exists yet) can preview it.
router.post('/', authenticate, authorize('agent', 'admin'), async (req, res) => {
  const { title, description, category, propertyId } = req.body || {};
  if (!title || !category) {
    return res.status(400).json({ error: 'title and category are required.' });
  }

  let url;
  try {
    url = await generateImage({ title, description: description || '', category });
  } catch (err) {
    return res.status(502).json({ error: 'Image generation failed and no fallback was available.' });
  }

  if (propertyId) {
    const property = properties.find((p) => p.id === Number(propertyId));
    if (property && (property.agentId === req.user.id || req.user.role === 'admin')) {
      property.images = [url];
      property.aiGenerated = true;
    }
  }

  res.json({ url });
});

module.exports = router;
