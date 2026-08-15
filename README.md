# Sabali

A house-hunting and short-let booking platform: agents and owners list villas,
beach apartments, holiday homes, guesthouses, condos, and townhouses; guests
filter, preview them in 3D, and request a booking. Built as a single Node/Express
API with a vanilla-JS + Three.js frontend — no build step required.

## Highlights

- **3D everywhere** — a rotating villa with a live day/night cycle on the
  homepage, a small color-coded 3D massing model that swaps in for each
  listing's photo on hover, an orbit-controlled "virtual tour" on every
  listing page, and a 3D map with clickable pins.
- **Short-let and long-term listings** in one place, with per-night or
  per-month pricing, availability calendars, and double-booking prevention.
- **AI-generated cover photos** for every new listing (mocked out of the box
  via seeded picsum.photos images; wire in real DALL·E with one env var).
  Agents can upload their own photo at any time, which permanently replaces
  the AI cover.
- **Anti-scam features**: agent verification badges, a "pending confirmation"
  booking flow, and a community reporting system that auto-flags a listing
  after three reports.
- **House Hunt** — a paid verification service: a customer asks a verified
  agent to physically check a property (one already on Sabali, or one they
  found elsewhere) before they send money or travel. Fees are estimated from
  location automatically, with an admin-set custom quote for anywhere
  unrecognised; agents claim open jobs and submit a written verdict (with an
  optional evidence photo).
- **Role-based dashboards** for customers (bookings), agents (listings +
  booking requests), and admins (agent verification + report moderation).

## Getting started

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open **http://localhost:4000**.

The server keeps its data in memory (see `data/mockData.js`), pre-seeded with
8 properties, 4 accounts, and 2 example house-hunt requests (one open for an
agent to claim, one already resolved), so there's nothing else to configure.
Restarting the server resets everything back to the seed data.

### Seed accounts

| Role     | Email                             | Password     | Notes                |
|----------|------------------------------------|--------------|----------------------|
| Admin    | admin@sabali.africa               | admin123     | verify agents, moderate reports |
| Agent    | amina@coastalliving.africa        | agent123     | already verified      |
| Agent    | brian@nairobiprime.africa         | agent123     | not yet verified — good for testing the "pending" badge |
| Customer | customer@example.com              | customer123  | has no bookings yet   |

You can also register your own account from the "Get started" button (choose
Customer or Agent).

## Configuration

Copy `.env.example` to `.env` if you want to change anything:

```bash
cp .env.example .env
```

| Variable            | Default                     | Purpose |
|---------------------|------------------------------|---------|
| `PORT`               | `4000`                      | HTTP port |
| `JWT_SECRET`         | a dev placeholder            | Change this in any real deployment |
| `USE_OPENAI_IMAGES`  | `false`                     | Set `true` to generate real DALL·E covers |
| `OPENAI_API_KEY`     | *(empty)*                    | Required if `USE_OPENAI_IMAGES=true` |

With `USE_OPENAI_IMAGES=false` (the default), new listings get a deterministic
placeholder photo from picsum.photos, seeded from the listing's title and
category so the same listing always gets the same image. If you turn on
OpenAI images and the API call fails for any reason (bad key, quota, network),
the server silently falls back to the placeholder — creating a listing never
fails because of the image step. See `services/imageGeneration.js` for the
integration point.

## Project structure

```
sabali/
├── server.js                 # Express app entry point
├── data/mockData.js          # In-memory "database" + seed data
├── middleware/auth.js        # JWT auth + role guards
├── services/imageGeneration.js
├── services/feeEstimator.js
├── routes/
│   ├── auth.js                # /api/auth/*
│   ├── properties.js          # /api/properties/* (CRUD, filters, image upload, reports)
│   ├── bookings.js            # /api/bookings/*
│   ├── admin.js                # /api/admin/* (agent verification, reports)
│   ├── generateImage.js       # /api/generate-image
│   └── houseHunts.js          # /api/house-hunts/* (verification requests)
├── uploads/                   # agent-uploaded property photos + house-hunt evidence
└── public/
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── utils.js            # toasts, formatters, category metadata
        ├── api.js               # fetch wrapper + session storage
        ├── three-hero.js        # homepage 3D villa + day/night cycle
        ├── three-card.js        # property-card hover 3D model
        ├── three-tour.js        # orbit-controlled "virtual tour"
        ├── three-map.js         # 3D map with clickable pins
        ├── auth.js               # login/register modal
        ├── properties.js        # grid, filters, detail page
        ├── booking.js            # booking box + report modal
        ├── houseHunt.js          # "book a house hunt" request page
        ├── dashboard.js          # customer/agent/admin dashboards
        └── app.js                 # router + nav + theme toggle
```

Swapping the in-memory arrays in `data/mockData.js` for MongoDB or Postgres
is intentionally the only thing you'd need to change — every route file only
calls the exported arrays/helpers from that one module.

## API reference

All property/booking endpoints return JSON; authenticated ones expect
`Authorization: Bearer <token>`.

```
POST   /api/auth/register        { name, email, password, role? }
POST   /api/auth/login           { email, password }
GET    /api/auth/me

GET    /api/properties           ?category=&type=&minPrice=&maxPrice=&guests=&city=&search=&checkIn=&checkOut=
GET    /api/properties/:id
POST   /api/properties           (agent) { title, description, category, type, price, location, bedrooms, bathrooms, maxGuests, amenities }
PUT    /api/properties/:id       (owning agent/admin)
DELETE /api/properties/:id       (owning agent/admin)
POST   /api/properties/:id/images  (owning agent/admin, multipart "image" field — overwrites the AI cover)
POST   /api/properties/:id/report  (any signed-in user) { reason }

GET    /api/bookings              (role-scoped: own bookings / bookings on your listings / all)
POST   /api/bookings               (customer) short-let: { propertyId, checkIn, checkOut, guests } · long-term: { propertyId, viewingDate, guests }
PUT    /api/bookings/:id           { status: pending|confirmed|cancelled|completed }

GET    /api/admin/agents           (admin)
PUT    /api/admin/agents/:id/verify (admin) { verified }
GET    /api/admin/reports          (admin)
PUT    /api/admin/reports/:id      (admin) { status, removeProperty? }

POST   /api/generate-image         (agent) { title, description, category, propertyId? }

GET    /api/house-hunts/estimate    ?city=&country=  (public fee preview)
GET    /api/house-hunts             (role-scoped: own requests / assigned+open pool / all)
POST   /api/house-hunts             (customer) { source: listed|external, propertyId? , external?, preferredDate, notes }
PUT    /api/house-hunts/:id/claim   (verified agent) — accept an open job
PUT    /api/house-hunts/:id/report  (assigned agent) { verdict: exists|not_exists, notes }
POST   /api/house-hunts/:id/photo   (assigned agent, multipart "photo" — evidence image)
PUT    /api/house-hunts/:id/status  (owning customer or admin) { status: cancelled }
PUT    /api/house-hunts/:id/quote   (admin) { fee, feeTier } — for requests stuck in "pending_quote"
```

## Notes on the 3D layer

Three.js is loaded from a CDN via an import map (`<script type="importmap">`
in `index.html`), so it needs an internet connection in the browser — nothing
to install locally. Everything is built from primitive geometries (boxes,
cones, cylinders) rather than external 3D models, so there are no binary
assets to manage; category colors and the building "massing" models are
defined once in `three-card.js` and reused by the hover cards and the full
virtual tour.
