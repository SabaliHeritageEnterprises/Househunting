const mongoose = require('mongoose');

const HouseHuntSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['listed', 'external'], required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  external: {
    title: String,
    address: String,
    city: String,
    country: String,
    sourceLink: String,
    askingPrice: Number,
    contactInfo: String,
    description: String,
  },
  location: {
    city: String,
    area: String,
    country: String,
  },
  preferredDate: Date,
  notes: String,
  fee: Number,
  feeTier: String,
  status: { type: String, enum: ['pending_quote', 'pending', 'assigned', 'confirmed_exists', 'confirmed_not_exists', 'cancelled'], default: 'pending_quote' },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  report: {
    verdict: String,
    notes: String,
    photo: String,
    submittedAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('HouseHunt', HouseHuntSchema);