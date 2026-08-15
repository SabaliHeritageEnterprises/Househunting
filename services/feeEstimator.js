// Estimates the fee for a house-hunt verification visit based on where the
// property is. This is a simple keyword-matched tier table rather than real
// geocoding/distance — good enough for a demo, and structured so it's easy
// to swap for a real distance-from-hub calculation later (see the comment
// at the bottom).
//
// If nothing matches, we return fee: null and let the request sit in
// "pending_quote" until an admin sets a manual fee for it (see
// PUT /api/house-hunts/:id/quote).

const LOCATION_FEE_TIERS = [
  { tier: 'Nairobi metro', fee: 25, keywords: ['nairobi', 'karen', 'westlands', 'runda', 'kilimani', 'lavington', 'kileleshwa', 'langata', 'kasarani', 'ruaka', 'kiambu'] },
  { tier: 'Kenyan coast', fee: 45, keywords: ['mombasa', 'nyali', 'diani', 'kwale', 'malindi', 'watamu', 'kilifi'] },
  { tier: 'Rift Valley', fee: 55, keywords: ['naivasha', 'nakuru', 'rift valley', 'eldoret'] },
  { tier: 'Lamu (remote)', fee: 70, keywords: ['lamu'] },
  { tier: 'Cross-border (Tanzania)', fee: 90, keywords: ['zanzibar', 'nungwi', 'tanzania', 'dar es salaam', 'stone town'] },
];

function estimateFee(city = '', country = '') {
  const q = `${city} ${country}`.toLowerCase().trim();
  if (!q) return { fee: null, tier: 'Custom quote needed' };
  for (const row of LOCATION_FEE_TIERS) {
    if (row.keywords.some((k) => q.includes(k))) {
      return { fee: row.fee, tier: row.tier };
    }
  }
  return { fee: null, tier: 'Custom quote needed' };
}

// --- Swapping in a real distance-based fee later ---------------------------
// If you later have reliable lat/lng for every request (listed properties
// already have it; external ones would need a geocoding step), you could
// replace the body of estimateFee with something like:
//   const kmFromNairobi = haversineKm(NAIROBI_HUB, { lat, lng });
//   const fee = Math.round(15 + kmFromNairobi * 0.18);
// left out here to avoid depending on a geocoding API key for the demo.

module.exports = { estimateFee, LOCATION_FEE_TIERS };
