// seed.js – Populate MongoDB with initial users and properties
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Property } = require('./models');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    console.log('🌱 Starting seed...');
    await seedDatabase();
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

async function seedDatabase() {
  // Clear existing data (optional – uncomment if you want to start fresh)
  // await User.deleteMany({});
  // await Property.deleteMany({});
  // console.log('🧹 Cleared existing data');

  // ----- Create Users -----
  console.log('👤 Creating users...');

  const admin = new User({
    name: 'Sabali Admin',
    email: 'admin@sabali.africa',
    passwordHash: bcrypt.hashSync('admin123', 8),
    role: 'admin',
    verified: true,
    bio: 'Platform administrator',
  });
  await admin.save();

  const agentAmina = new User({
    name: 'Amina Yusuf',
    email: 'amina@coastalliving.africa',
    passwordHash: bcrypt.hashSync('agent123', 8),
    role: 'agent',
    verified: true,
    bio: 'Coastal Living Properties — verified host for the Kenyan & Tanzanian coast since 2016.',
  });
  await agentAmina.save();

  const agentBrian = new User({
    name: 'Brian Otieno',
    email: 'brian@nairobiprime.africa',
    passwordHash: bcrypt.hashSync('agent123', 8),
    role: 'agent',
    verified: false,
    bio: 'Nairobi Prime Homes — independent agent, verification pending.',
  });
  await agentBrian.save();

  const sampleCustomer = new User({
    name: 'Wanjiru Kamau',
    email: 'customer@example.com',
    passwordHash: bcrypt.hashSync('customer123', 8),
    role: 'customer',
  });
  await sampleCustomer.save();

  console.log(`  ✅ Created ${await User.countDocuments()} users`);

  // ----- Create Properties -----
  console.log('🏠 Creating properties...');

  const propertiesData = [
    {
      agentId: agentAmina._id,
      title: 'Villa Baharini',
      description: 'A four-bedroom clifftop villa above Diani Beach with an infinity pool that spills toward the Indian Ocean horizon, a tropical garden, and a private path down to the sand.',
      category: 'villa',
      type: 'short_let',
      price: 32500,
      priceUnit: 'night',
      location: { city: 'Diani Beach', area: 'Kwale County', country: 'Kenya', lat: -4.3167, lng: 39.5667 },
      bedrooms: 4,
      bathrooms: 4,
      maxGuests: 8,
      amenities: ['wifi', 'pool', 'parking', 'ocean_view', 'kitchen', 'air_conditioning', 'generator'],
      bookedRanges: [{ start: new Date('2026-08-10'), end: new Date('2026-08-15') }],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/5_bedroom_diani_wytgfl.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentAmina._id,
      title: 'Tide & Palm Beach Apartment',
      description: 'A breezy two-bedroom apartment two minutes from Nyali Beach, freshly renovated with a shared rooftop lounge and views over the palm canopy to the sea.',
      category: 'beach_apartment',
      type: 'short_let',
      price: 12350,
      priceUnit: 'night',
      location: { city: 'Nyali', area: 'Mombasa', country: 'Kenya', lat: -4.0198, lng: 39.7132 },
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      amenities: ['wifi', 'shared_pool', 'parking', 'kitchen', 'air_conditioning'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/aqua_nyali_wpgncd.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentBrian._id,
      title: 'Rift Valley Retreat',
      description: 'A stunning private villa in Diani with a crocodile‑shaped pool, lush tropical gardens, and direct beach access. Perfect for a luxury getaway with family or friends.',
      category: 'holiday_home',
      type: 'short_let',
      price: 23400,
      priceUnit: 'night',
      location: { city: 'Naivasha', area: 'Nakuru County', country: 'Kenya', lat: -0.7167, lng: 36.4333 },
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      amenities: ['wifi', 'fireplace', 'parking', 'kitchen', 'lake_view', 'hot_tub'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/7_bedroom_diani_ao3mue.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentBrian._id,
      title: 'Karen Garden Guesthouse',
      description: 'A spacious four‑bedroom beachfront villa in Diani with a private pool, outdoor dining area, and stunning ocean views. Ideal for large families or groups.',
      category: 'guesthouse',
      type: 'short_let',
      price: 7800,
      priceUnit: 'night',
      location: { city: 'Karen', area: 'Nairobi', country: 'Kenya', lat: -1.3197, lng: 36.7076 },
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      amenities: ['wifi', 'garden', 'parking', 'kitchenette', 'security'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/4_bedroom_diani_beachfront_gbqzdf.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentBrian._id,
      title: 'Westlands Skyline Condo',
      description: 'A modern two‑bedroom standalone villa in Diani with a private garden, outdoor shower, and easy access to the beach. Perfect for a small family or couple.',
      category: 'condo',
      type: 'long_term',
      price: 156000,
      priceUnit: 'month',
      location: { city: 'Westlands', area: 'Nairobi', country: 'Kenya', lat: -1.2660, lng: 36.8115 },
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      amenities: ['wifi', 'gym', 'pool', 'parking', 'backup_power', 'lift'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785484659/standalone_villa_qlo0dg.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentAmina._id,
      title: 'Runda Family Townhouse',
      description: 'A spacious three‑bedroom standalone villa in Diani with a private pool, lush garden, and crocodile‑shaped water feature. Ideal for families seeking privacy and comfort.',
      category: 'townhouse',
      type: 'long_term',
      price: 286000,
      priceUnit: 'month',
      location: { city: 'Runda', area: 'Nairobi', country: 'Kenya', lat: -1.2167, lng: 36.8167 },
      bedrooms: 4,
      bathrooms: 3,
      maxGuests: 6,
      amenities: ['wifi', 'garden', 'parking', 'staff_quarter', 'security', 'generator'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785492872/bungalow_dhej2i.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentAmina._id,
      title: 'Zanzibar Sunset Villa',
      description: 'A luxurious ocean‑front apartment in Nyali’s 5th Avenue, offering panoramic views, a private beach access, and a rooftop infinity pool. Perfect for a romantic escape.',
      category: 'villa',
      type: 'short_let',
      price: 41600,
      priceUnit: 'night',
      location: { city: 'Nungwi', area: 'Zanzibar', country: 'Tanzania', lat: -5.7333, lng: 39.2833 },
      bedrooms: 5,
      bathrooms: 5,
      maxGuests: 10,
      amenities: ['wifi', 'private_beach', 'pool', 'parking', 'chef_on_request', 'air_conditioning'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737005/WhatsApp_Image_2026-07-21_at_07.26.43_g6tgzc.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentBrian._id,
      title: 'Lamu Old Town Cottage',
      description: 'A stylish three‑bedroom villa in Diani with a modern design, private garden, and close proximity to the beach. Ideal for business travellers or families.',
      category: 'holiday_home',
      type: 'short_let',
      price: 18200,
      priceUnit: 'night',
      location: { city: 'Lamu', area: 'Lamu County', country: 'Kenya', lat: -2.2717, lng: 40.9020 },
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      amenities: ['wifi', 'rooftop_terrace', 'kitchen', 'fan'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737808/WhatsApp_Image_2026-07-17_at_00.32.06_xcebva.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentAmina._id,
      title: 'Savannah House',
      description: 'A versatile apartment complex in Diani with studio, 1‑bedroom, 2‑bedroom, and 3‑bedroom units – ideal for families, couples, or solo travellers. All units are modern, self‑contained, and just a short walk from the beach. Amenities include a shared pool, garden, and 24‑hour security.',
      category: 'apartment',
      type: 'short_let',
      price: 23400,
      priceUnit: 'night',
      location: { city: 'Diani', area: 'Diani Beach', country: 'Kenya', lat: -4.3167, lng: 39.5833 },
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      amenities: ['wifi', 'pool', 'garden', 'parking', 'kitchen', 'air_conditioning', 'security'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737808/WhatsApp_Image_2026-07-30_at_23.19.13_m4ewyk.jpg'],
      aiGenerated: false,
    },
    {
      agentId: agentAmina._id,
      title: 'Two Bedroom Standalone',
      description: 'A spacious two‑bedroom standalone villa in Diani with a private garden, outdoor dining area, and easy access to the beach. Perfect for a small family or a couple looking for peace and privacy.',
      category: 'villa',
      type: 'short_let',
      price: 23400,
      priceUnit: 'night',
      location: { city: 'Diani', area: 'Diani Beach', country: 'Kenya', lat: -4.3167, lng: 39.5833 },
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 4,
      amenities: ['wifi', 'garden', 'parking', 'kitchen', 'air_conditioning', 'security'],
      images: ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737810/WhatsApp_Image_2026-07-16_at_22.56.29_lobriw.jpg'],
      aiGenerated: false,
    },
  ];

  for (const propData of propertiesData) {
    const prop = new Property(propData);
    await prop.save();
  }

  console.log(`  ✅ Created ${await Property.countDocuments()} properties`);

  // Print summary
  console.log('\n📊 Seed Summary:');
  console.log(`  👤 Users: ${await User.countDocuments()}`);
  console.log(`  🏠 Properties: ${await Property.countDocuments()}`);
  console.log('\n🔑 Login credentials:');
  console.log('  admin    : admin@sabali.africa / admin123');
  console.log('  agent    : amina@coastalliving.africa / agent123   (verified)');
  console.log('  agent    : brian@nairobiprime.africa / agent123    (unverified)');
  console.log('  customer : customer@example.com / customer123');
}