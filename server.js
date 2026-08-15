require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const generateImageRoutes = require('./routes/generateImage');
const houseHuntRoutes = require('./routes/houseHunts');

const app = express();
const PORT = process.env.PORT || 4000;

// ---------- MongoDB Connection ----------
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ Connected to MongoDB');
  console.log(`   Database: ${mongoose.connection.db.databaseName}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  // Don't exit the process in production – let the app still serve static files
  // (though DB routes will fail, but at least the function won't crash on startup)
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// ---------- Middleware ----------
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- API Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/generate-image', generateImageRoutes);
app.use('/api/house-hunts', houseHuntRoutes);

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({ 
    ok: true, 
    service: 'sabali', 
    time: new Date().toISOString(),
    database: states[dbState] || 'unknown'
  });
});

// ---------- Frontend ----------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Error Handler ----------
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong on the server.' });
});

// ---------- Start Server (local only) ----------
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n  🏠 Sabali is running: http://localhost:${PORT}\n`);
    console.log('  Database:');
    console.log(`    ${mongoose.connection.readyState === 1 ? '✅ Connected to MongoDB' : '❌ Not connected'}`);
    console.log('  Seed accounts:');
    console.log('    admin    : admin@sabali.africa / admin123');
    console.log('    agent    : amina@coastalliving.africa / agent123   (verified)');
    console.log('    agent    : brian@nairobiprime.africa / agent123    (unverified)');
    console.log('    customer : customer@example.com / customer123\n');
  });
}

// ---------- Export for Vercel ----------
module.exports = app;