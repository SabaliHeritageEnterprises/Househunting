const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'sabali-dev-secret-change-me';

// Verifies the Bearer token and attaches full user object (without passwordHash) to req.user.
// Rejects the request with 401 if the token is missing or invalid.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Sign in required for this action.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Fetch user from DB to ensure they still exist and get fresh data
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }
    // Attach both payload and user – we attach the full user object plus id/role for convenience.
    req.user = { ...user.toObject(), id: user._id, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Your session has expired or is invalid. Please sign in again.' });
    }
    // Other errors (like DB error) – pass to error handler
    next(err);
  }
}

// Like authenticate, but does not fail the request when no token is present.
// Useful for routes that behave differently for logged-in users but are
// still readable by guests (e.g. GET /api/properties).
async function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (user) {
      req.user = { ...user.toObject(), id: user._id, role: user.role };
    }
  } catch (err) {
    // ignore invalid or expired token on optional routes
  }
  next();
}

// Restricts a route to one or more roles. Must run after `authenticate`.
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `This action is limited to: ${roles.join(', ')}.` });
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize, JWT_SECRET };