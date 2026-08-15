// Shared helpers used across pages: toasts, formatting, category metadata.

const CATEGORY_META = {
  villa: { label: 'Villa', color: '#dba25a', icon: 'fa-water' },
  beach_apartment: { label: 'Beach Apartment', color: '#6fb8b3', icon: 'fa-umbrella-beach' },
  holiday_home: { label: 'Holiday Home', color: '#c65c4a', icon: 'fa-house-chimney' },
  guesthouse: { label: 'Guesthouse', color: '#9b8bd6', icon: 'fa-door-open' },
  condo: { label: 'Condo', color: '#5b8fd6', icon: 'fa-building' },
  townhouse: { label: 'Townhouse', color: '#7fae55', icon: 'fa-house' },
};

const AMENITY_LABELS = {
  wifi: 'Wi-Fi', pool: 'Pool', shared_pool: 'Shared pool', parking: 'Parking',
  ocean_view: 'Ocean view', kitchen: 'Kitchen', air_conditioning: 'Air conditioning',
  generator: 'Backup generator', fireplace: 'Fireplace', lake_view: 'Lake view',
  hot_tub: 'Hot tub', garden: 'Garden', kitchenette: 'Kitchenette', security: '24hr security',
  gym: 'Gym', backup_power: 'Backup power', lift: 'Lift', staff_quarter: 'Staff quarter',
  private_beach: 'Private beach', chef_on_request: 'Chef on request', rooftop_terrace: 'Rooftop terrace',
  fan: 'Fan',
};

function categoryMeta(cat) {
  return CATEGORY_META[cat] || { label: cat, color: '#c98a3b', icon: 'fa-house' };
}

// 💰 Currency: Kenyan Shillings (KES) — formatted with "KSh" and no decimals
function formatMoney(n) {
  return `KSh ${Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function toast(message, type = 'info') {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s ease';
    setTimeout(() => el.remove(), 260);
  }, 3600);
}

const HOUSEHUNT_STATUS_LABELS = {
  pending_quote: 'Awaiting fee quote',
  pending: 'Open for an agent',
  assigned: 'Agent assigned',
  confirmed_exists: 'Verified — exists',
  confirmed_not_exists: 'Verified — not found',
  cancelled: 'Cancelled',
};
function houseHuntStatusLabel(status) {
  return HOUSEHUNT_STATUS_LABELS[status] || status;
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }