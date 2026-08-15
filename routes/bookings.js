const express = require('express');
const { bookings, properties, users, counters } = require('../data/mockData');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function publicBooking(b) {
  const property = properties.find((p) => p.id === b.propertyId);
  const customer = users.find((u) => u.id === b.customerId);
  return {
    ...b,
    property: property
      ? { id: property.id, title: property.title, images: property.images, category: property.category, location: property.location, agentId: property.agentId }
      : null,
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email } : null,
  };
}

// GET /api/bookings — role-scoped
// customer -> their own bookings
// agent    -> bookings on properties they own
// admin    -> everything
router.get('/', authenticate, (req, res) => {
  let list;
  if (req.user.role === 'admin') {
    list = bookings;
  } else if (req.user.role === 'agent') {
    const myPropertyIds = new Set(properties.filter((p) => p.agentId === req.user.id).map((p) => p.id));
    list = bookings.filter((b) => myPropertyIds.has(b.propertyId));
  } else {
    list = bookings.filter((b) => b.customerId === req.user.id);
  }
  res.json({ bookings: list.map(publicBooking) });
});

// POST /api/bookings  (customer)
// short_let: { propertyId, checkIn, checkOut, guests }
// long_term: { propertyId, viewingDate, guests }
router.post('/', authenticate, authorize('customer'), (req, res) => {
  const { propertyId, checkIn, checkOut, viewingDate, guests } = req.body || {};
  const property = properties.find((p) => p.id === Number(propertyId));
  if (!property || property.status === 'removed') {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const guestCount = Number(guests) || 1;
  if (guestCount > property.maxGuests) {
    return res.status(400).json({ error: `This property sleeps a maximum of ${property.maxGuests} guests.` });
  }

  if (property.type === 'short_let') {
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      return res.status(400).json({ error: 'A valid checkIn and checkOut date are required for short-let bookings.' });
    }
    const clash = property.bookedRanges.some((r) => overlaps(checkIn, checkOut, r.start, r.end));
    if (clash) {
      return res.status(409).json({ error: 'Those dates are no longer available for this property.' });
    }
    const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
    const booking = {
      id: counters.nextBookingId(),
      propertyId: property.id,
      customerId: req.user.id,
      checkIn,
      checkOut,
      viewingDate: null,
      guests: guestCount,
      nights,
      totalPrice: nights * property.price,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    // Tentatively hold the dates so a second customer can't double-book while
    // this request is pending; released automatically if the agent cancels.
    property.bookedRanges.push({ start: checkIn, end: checkOut, bookingId: booking.id });
    return res.status(201).json({ booking: publicBooking(booking) });
  }

  // long_term: a single viewing slot rather than a date range
  if (!viewingDate) {
    return res.status(400).json({ error: 'A viewingDate is required for long-term listings.' });
  }
  const booking = {
    id: counters.nextBookingId(),
    propertyId: property.id,
    customerId: req.user.id,
    checkIn: null,
    checkOut: null,
    viewingDate,
    guests: guestCount,
    nights: null,
    totalPrice: property.price, // first month, shown as reference
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  res.status(201).json({ booking: publicBooking(booking) });
});

// PUT /api/bookings/:id  — status transitions
// customer: can only cancel their own booking, and only while pending
// agent:    can confirm / cancel / complete bookings on their own properties
// admin:    can do anything
router.put('/:id', authenticate, (req, res) => {
  const booking = bookings.find((b) => b.id === Number(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  const property = properties.find((p) => p.id === booking.propertyId);
  const { status } = req.body || {};
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const isOwningAgent = property && property.agentId === req.user.id && req.user.role === 'agent';
  const isOwningCustomer = booking.customerId === req.user.id && req.user.role === 'customer';
  const isAdmin = req.user.role === 'admin';

  if (isOwningCustomer && !isAdmin) {
    if (status !== 'cancelled' || booking.status !== 'pending') {
      return res.status(403).json({ error: 'As a customer you can only cancel a booking that is still pending.' });
    }
  } else if (!isOwningAgent && !isAdmin) {
    return res.status(403).json({ error: 'You are not authorised to update this booking.' });
  }

  booking.status = status;

  // Release the held date range if a short-let booking is cancelled.
  if (status === 'cancelled' && property) {
    property.bookedRanges = property.bookedRanges.filter((r) => r.bookingId !== booking.id);
  }

  res.json({ booking: publicBooking(booking) });
});

module.exports = router;
