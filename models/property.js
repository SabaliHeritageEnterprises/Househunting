const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  type: { type: String, enum: ['short_let', 'long_term'], required: true },
  price: { type: Number, required: true },
  priceUnit: { type: String, default: 'night' },
  location: {
    city: String,
    area: String,
    country: String,
    lat: Number,
    lng: Number,
  },
  bedrooms: { type: Number, default: 1 },
  bathrooms: { type: Number, default: 1 },
  maxGuests: { type: Number, default: 2 },
  amenities: [String],
  images: [String],
  aiGenerated: { type: Boolean, default: false },
  bookedRanges: [{ start: Date, end: Date }],
  status: { type: String, enum: ['active', 'reported', 'removed'], default: 'active' },
  reportCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Property', PropertySchema);