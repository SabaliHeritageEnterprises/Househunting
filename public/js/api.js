// Thin wrapper around fetch() for talking to the Sabali API, plus simple
// session persistence in localStorage (this is a normal server-rendered
// web app, so localStorage is the right tool here).

const API_BASE = '/api';

const Session = {
  KEY: 'sabali_session',
  get() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  set(session) {
    localStorage.setItem(this.KEY, JSON.stringify(session));
  },
  clear() {
    localStorage.removeItem(this.KEY);
  },
  token() {
    const s = this.get();
    return s ? s.token : null;
  },
  user() {
    const s = this.get();
    return s ? s.user : null;
  },
};

async function apiRequest(path, { method = 'GET', body, isMultipart = false } = {}) {
  const headers = {};
  const token = Session.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isMultipart) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isMultipart ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

const Api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  me: () => apiRequest('/auth/me'),

  listProperties: (query = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, v);
    });
    const qs = params.toString();
    return apiRequest(`/properties${qs ? `?${qs}` : ''}`);
  },
  getProperty: (id) => apiRequest(`/properties/${id}`),
  createProperty: (payload) => apiRequest('/properties', { method: 'POST', body: payload }),
  updateProperty: (id, payload) => apiRequest(`/properties/${id}`, { method: 'PUT', body: payload }),
  deleteProperty: (id) => apiRequest(`/properties/${id}`, { method: 'DELETE' }),
  uploadPropertyImage: (id, file) => {
    const form = new FormData();
    form.append('image', file);
    return apiRequest(`/properties/${id}/images`, { method: 'POST', body: form, isMultipart: true });
  },
  reportProperty: (id, reason) => apiRequest(`/properties/${id}/report`, { method: 'POST', body: { reason } }),
  generateImage: (payload) => apiRequest('/generate-image', { method: 'POST', body: payload }),

  listBookings: () => apiRequest('/bookings'),
  createBooking: (payload) => apiRequest('/bookings', { method: 'POST', body: payload }),
  updateBooking: (id, status) => apiRequest(`/bookings/${id}`, { method: 'PUT', body: { status } }),

  adminAgents: () => apiRequest('/admin/agents'),
  adminVerifyAgent: (id, verified) => apiRequest(`/admin/agents/${id}/verify`, { method: 'PUT', body: { verified } }),
  adminReports: () => apiRequest('/admin/reports'),
  adminResolveReport: (id, status, removeProperty) =>
    apiRequest(`/admin/reports/${id}`, { method: 'PUT', body: { status, removeProperty } }),

  estimateHouseHuntFee: (city, country) => apiRequest(`/house-hunts/estimate?city=${encodeURIComponent(city || '')}&country=${encodeURIComponent(country || '')}`),
  listHouseHunts: () => apiRequest('/house-hunts'),
  createHouseHunt: (payload) => apiRequest('/house-hunts', { method: 'POST', body: payload }),
  claimHouseHunt: (id) => apiRequest(`/house-hunts/${id}/claim`, { method: 'PUT' }),
  reportHouseHunt: (id, verdict, notes) => apiRequest(`/house-hunts/${id}/report`, { method: 'PUT', body: { verdict, notes } }),
  uploadHouseHuntPhoto: (id, file) => {
    const form = new FormData();
    form.append('photo', file);
    return apiRequest(`/house-hunts/${id}/photo`, { method: 'POST', body: form, isMultipart: true });
  },
  cancelHouseHunt: (id) => apiRequest(`/house-hunts/${id}/status`, { method: 'PUT', body: { status: 'cancelled' } }),
  quoteHouseHunt: (id, fee, feeTier) => apiRequest(`/house-hunts/${id}/quote`, { method: 'PUT', body: { fee, feeTier } }),
};
