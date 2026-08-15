// In-memory "database". Structured as plain arrays of plain objects so this
// file can be swapped for a MongoDB/PostgreSQL layer later with minimal
// changes to routes/*.js (they only ever call the exported helper functions
// below, never touch the arrays directly from outside this module).

const bcrypt = require('bcryptjs');

let nextUserId = 1;
let nextPropertyId = 1;
let nextBookingId = 1;
let nextReportId = 1;
let nextHouseHuntId = 1;

const users = [];
const properties = [];
const bookings = [];
const reports = [];

function seedUser({ name, email, password, role, verified = false, bio = '' }) {
  const user = {
    id: nextUserId++,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 8),
    role, // 'customer' | 'agent' | 'admin'
    verified,     // agents only: set by an admin
    bio,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

// --- Seed users -------------------------------------------------------
const admin = seedUser({
  name: 'Sabali Admin',
  email: 'admin@sabali.africa',
  password: 'admin123',
  role: 'admin',
});

const agentAmina = seedUser({
  name: 'Amina Yusuf',
  email: 'amina@coastalliving.africa',
  password: 'agent123',
  role: 'agent',
  verified: true,
  bio: 'Coastal Living Properties — verified host for the Kenyan & Tanzanian coast since 2016.',
});

const agentBrian = seedUser({
  name: 'Brian Otieno',
  email: 'brian@nairobiprime.africa',
  password: 'agent123',
  role: 'agent',
  verified: false,
  bio: 'Nairobi Prime Homes — independent agent, verification pending.',
});

const sampleCustomer = seedUser({
  name: 'Wanjiru Kamau',
  email: 'customer@example.com',
  password: 'customer123',
  role: 'customer',
});

// --- Seed properties ----------------------------------------------------
// category: villa | beach_apartment | holiday_home | guesthouse | condo | townhouse
// type: short_let | long_term
// 💰 All prices are now in Kenyan Shillings (KES) – converted at 1 USD = 130 KES
function seedProperty(p) {
  const property = {
    id: nextPropertyId++,
    agentId: p.agentId,
    title: p.title,
    description: p.description,
    category: p.category,
    type: p.type,
    price: p.price, // now in KES
    priceUnit: p.type === 'short_let' ? 'night' : 'month',
    location: p.location, // { city, area, country, lat, lng }
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    maxGuests: p.maxGuests,
    amenities: p.amenities,
    images: p.images && p.images.length ? p.images : [mockImageFor(p.category, nextPropertyId)],
    aiGenerated: !(p.images && p.images.length),
    bookedRanges: p.bookedRanges || [], // [{start:'YYYY-MM-DD', end:'YYYY-MM-DD'}]
    status: 'active', // active | reported | removed
    reportCount: 0,
    createdAt: new Date().toISOString(),
  };
  properties.push(property);
  return property;
}

function mockImageFor(category, seed) {
  // Deterministic placeholder photo per property. Swapped out client-side by
  // the "Generate AI cover" button (server route /api/generate-image) or
  // replaced permanently by an agent's own upload.
  return `https://picsum.photos/seed/sabali-${category}-${seed}/900/600`;
}

// ---- Existing properties (with updated descriptions and KES prices) ----

// Villa Baharini – unchanged (already Diani)
// USD 250 → KSh 32,500
seedProperty({
  agentId: agentAmina.id,
  title: 'Villa Baharini',
  description: 'A four-bedroom clifftop villa above Diani Beach with an infinity pool that spills toward the Indian Ocean horizon, a tropical garden, and a private path down to the sand.',
  category: 'villa',
  type: 'short_let',
  price: 32500,
  location: { city: 'Diani Beach', area: 'Kwale County', country: 'Kenya', lat: -4.3167, lng: 39.5667 },
  bedrooms: 4,
  bathrooms: 4,
  maxGuests: 8,
  amenities: ['wifi', 'pool', 'parking', 'ocean_view', 'kitchen', 'air_conditioning', 'generator'],
  bookedRanges: [{ start: '2026-08-10', end: '2026-08-15' }],
});

// Aqua Apartments – originally Tide & Palm Beach Apartment (Nyali)
// USD 95 → KSh 12,350
seedProperty({
  agentId: agentAmina.id,
  title: 'Tide & Palm Beach Apartment', // will be transformed to Aqua Apartments on frontend
  description: 'A breezy two-bedroom apartment two minutes from Nyali Beach, freshly renovated with a shared rooftop lounge and views over the palm canopy to the sea.',
  category: 'beach_apartment',
  type: 'short_let',
  price: 12350,
  location: { city: 'Nyali', area: 'Mombasa', country: 'Kenya', lat: -4.0198, lng: 39.7132 },
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 4,
  amenities: ['wifi', 'shared_pool', 'parking', 'kitchen', 'air_conditioning'],
});

// Villa Crocodile – originally Rift Valley Retreat, moved to Diani
// USD 180 → KSh 23,400
seedProperty({
  agentId: agentBrian.id,
  title: 'Rift Valley Retreat', // transformed to Villa Crocodile
  description: 'A stunning private villa in Diani with a crocodile‑shaped pool, lush tropical gardens, and direct beach access. Perfect for a luxury getaway with family or friends.',
  category: 'holiday_home',
  type: 'short_let',
  price: 23400,
  location: { city: 'Naivasha', area: 'Nakuru County', country: 'Kenya', lat: -0.7167, lng: 36.4333 }, // original location (frontend overrides)
  bedrooms: 3,
  bathrooms: 2,
  maxGuests: 6,
  amenities: ['wifi', 'fireplace', 'parking', 'kitchen', 'lake_view', 'hot_tub'],
});

// Four Bedroom Beachfront – originally Karen Garden Guesthouse, moved to Diani
// USD 60 → KSh 7,800
seedProperty({
  agentId: agentBrian.id,
  title: 'Karen Garden Guesthouse', // transformed to Four Bedroom Beachfront
  description: 'A spacious four‑bedroom beachfront villa in Diani with a private pool, outdoor dining area, and stunning ocean views. Ideal for large families or groups.',
  category: 'guesthouse',
  type: 'short_let',
  price: 7800,
  location: { city: 'Karen', area: 'Nairobi', country: 'Kenya', lat: -1.3197, lng: 36.7076 },
  bedrooms: 1,
  bathrooms: 1,
  maxGuests: 2,
  amenities: ['wifi', 'garden', 'parking', 'kitchenette', 'security'],
});

// Two bedroom Stand-alone (condo) – originally Westlands Skyline Condo, moved to Diani
// USD 1200/month → KSh 156,000
seedProperty({
  agentId: agentBrian.id,
  title: 'Westlands Skyline Condo', // transformed to Two bedroom Stand-alone (condo)
  description: 'A modern two‑bedroom standalone villa in Diani with a private garden, outdoor shower, and easy access to the beach. Perfect for a small family or couple.',
  category: 'condo',
  type: 'long_term',
  price: 156000,
  location: { city: 'Westlands', area: 'Nairobi', country: 'Kenya', lat: -1.2660, lng: 36.8115 },
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 4,
  amenities: ['wifi', 'gym', 'pool', 'parking', 'backup_power', 'lift'],
});

// Three Bedroom Crocodile Stand-Alone – originally Runda Family Townhouse, moved to Diani
// USD 2200/month → KSh 286,000
seedProperty({
  agentId: agentAmina.id,
  title: 'Runda Family Townhouse', // transformed to Three Bedroom Crocodile Stand-Alone
  description: 'A spacious three‑bedroom standalone villa in Diani with a private pool, lush garden, and crocodile‑shaped water feature. Ideal for families seeking privacy and comfort.',
  category: 'townhouse',
  type: 'long_term',
  price: 286000,
  location: { city: 'Runda', area: 'Nairobi', country: 'Kenya', lat: -1.2167, lng: 36.8167 },
  bedrooms: 4,
  bathrooms: 3,
  maxGuests: 6,
  amenities: ['wifi', 'garden', 'parking', 'staff_quarter', 'security', 'generator'],
});

// Kwamby Ocean Paradise – originally Zanzibar Sunset Villa, moved to Nyali
// USD 320 → KSh 41,600
seedProperty({
  agentId: agentAmina.id,
  title: 'Zanzibar Sunset Villa', // transformed to Kwamby Ocean Paradise
  description: 'A luxurious ocean‑front apartment in Nyali’s 5th Avenue, offering panoramic views, a private beach access, and a rooftop infinity pool. Perfect for a romantic escape.',
  category: 'villa',
  type: 'short_let',
  price: 41600,
  location: { city: 'Nungwi', area: 'Zanzibar', country: 'Tanzania', lat: -5.7333, lng: 39.2833 },
  bedrooms: 5,
  bathrooms: 5,
  maxGuests: 10,
  amenities: ['wifi', 'private_beach', 'pool', 'parking', 'chef_on_request', 'air_conditioning'],
});

// Executive 3 Bedroom – originally Lamu Old Town Cottage, moved to Diani
// USD 140 → KSh 18,200
seedProperty({
  agentId: agentBrian.id,
  title: 'Lamu Old Town Cottage', // transformed to Executive 3 Bedroom
  description: 'A stylish three‑bedroom villa in Diani with a modern design, private garden, and close proximity to the beach. Ideal for business travellers or families.',
  category: 'holiday_home',
  type: 'short_let',
  price: 18200,
  location: { city: 'Lamu', area: 'Lamu County', country: 'Kenya', lat: -2.2717, lng: 40.9020 },
  bedrooms: 2,
  bathrooms: 1,
  maxGuests: 4,
  amenities: ['wifi', 'rooftop_terrace', 'kitchen', 'fan'],
});

// Savannah House – new property (description already matches)
// USD 180 → KSh 23,400
seedProperty({
  agentId: agentAmina.id,
  title: 'Savannah House',
  description: 'A versatile apartment complex in Diani with studio, 1‑bedroom, 2‑bedroom, and 3‑bedroom units – ideal for families, couples, or solo travellers. All units are modern, self‑contained, and just a short walk from the beach. Amenities include a shared pool, garden, and 24‑hour security.',
  category: 'apartment',
  type: 'short_let',
  price: 23400,
  location: {
    city: 'Diani',
    area: 'Diani Beach',
    country: 'Kenya',
    lat: -4.3167,
    lng: 39.5833
  },
  bedrooms: 3,
  bathrooms: 2,
  maxGuests: 6,
  amenities: ['wifi', 'pool', 'garden', 'parking', 'kitchen', 'air_conditioning', 'security'],
  images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737808/WhatsApp_Image_2026-07-30_at_23.19.13_m4ewyk.jpg'],
});

// Two Bedroom Standalone – new villa (description already matches)
// USD 180 → KSh 23,400
seedProperty({
  agentId: agentAmina.id,
  title: 'Two Bedroom Standalone',
  description: 'A spacious two‑bedroom standalone villa in Diani with a private garden, outdoor dining area, and easy access to the beach. Perfect for a small family or a couple looking for peace and privacy.',
  category: 'villa',
  type: 'short_let',
  price: 23400,
  location: {
    city: 'Diani',
    area: 'Diani Beach',
    country: 'Kenya',
    lat: -4.3167,
    lng: 39.5833
  },
  bedrooms: 2,
  bathrooms: 2,
  maxGuests: 4,
  amenities: ['wifi', 'garden', 'parking', 'kitchen', 'air_conditioning', 'security'],
  images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737810/WhatsApp_Image_2026-07-16_at_22.56.29_lobriw.jpg'],
});

// --- House-hunt verification requests --------------------------------
// A separate concept from bookings: a customer pays a Sabali agent to
// physically go verify a property (either one already listed on Sabali,
// or one they found elsewhere) exists and matches its description.
// 💰 Fees converted to KES (USD 25 → KSh 3,250, USD 45 → KSh 5,850)
const houseHunts = [];

function seedHouseHunt(h) {
  const request = {
    id: nextHouseHuntId++,
    customerId: h.customerId,
    source: h.source, // 'listed' | 'external'
    propertyId: h.propertyId || null,
    external: h.external || null,
    location: h.location,
    preferredDate: h.preferredDate,
    notes: h.notes || '',
    fee: h.fee, // now in KES
    feeTier: h.feeTier,
    status: h.status, // pending_quote | pending | assigned | confirmed_exists | confirmed_not_exists | cancelled
    agentId: h.agentId || null,
    report: h.report || null,
    createdAt: new Date().toISOString(),
  };
  houseHunts.push(request);
  return request;
}

seedHouseHunt({
  customerId: sampleCustomer.id,
  source: 'external',
  external: {
    title: 'Two-bedroom apartment, Kilimani',
    address: 'Off Argwings Kodhek Road',
    sourceLink: 'https://www.facebook.com/marketplace/example-listing',
    askingPrice: 65000,
    contactInfo: 'Listed by "Peter" — 07XX XXX XXX',
    description: 'Found this on Facebook Marketplace, asking for a deposit before viewing — want a Sabali agent to confirm it actually exists before I send anything.',
  },
  location: { city: 'Kilimani', area: 'Nairobi', country: 'Kenya' },
  preferredDate: '2026-08-12',
  notes: 'Please call ahead — the "agent" only replies on WhatsApp so far.',
  fee: 3250, // USD 25 → KSh 3,250
  feeTier: 'Nairobi metro',
  status: 'pending',
});

seedHouseHunt({
  customerId: sampleCustomer.id,
  source: 'listed',
  propertyId: 2, // Tide & Palm Beach Apartment
  location: { city: 'Nyali', area: 'Mombasa', country: 'Kenya' },
  preferredDate: '2026-08-05',
  notes: "I'm based abroad and want eyes on the unit before I book for my visit in September.",
  fee: 5850, // USD 45 → KSh 5,850
  feeTier: 'Kenyan coast',
  status: 'confirmed_exists',
  agentId: agentAmina.id,
  report: {
    verdict: 'exists',
    notes: 'Visited in person — unit matches the listing photos, building has 24hr security, agent on-site was aware of the booking.',
    photo: null,
    submittedAt: new Date().toISOString(),
  },
});


module.exports = {
  users,
  properties,
  bookings,
  reports,
  houseHunts,
  counters: {
    nextUserId: () => nextUserId++,
    nextPropertyId: () => nextPropertyId++,
    nextBookingId: () => nextBookingId++,
    nextReportId: () => nextReportId++,
    nextHouseHuntId: () => nextHouseHuntId++,
  },
  seedIds: {
    admin: admin.id,
    agentAmina: agentAmina.id,
    agentBrian: agentBrian.id,
    sampleCustomer: sampleCustomer.id,
  },
  mockImageFor,
};