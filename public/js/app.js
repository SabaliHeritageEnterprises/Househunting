// App shell: hash-based router between the four views, nav wiring, theme
// toggle, and lifecycle management for the 3D scenes that only make sense
// on one view at a time.

const AppState = {
  heroInstance: null,
};

const ROUTES = ['#/', '#/properties', '#/property', '#/house-hunt', '#/dashboard'];

function currentRouteBase() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/property/')) return '#/property';
  if (ROUTES.includes(hash)) return hash;
  return '#/';
}

function setActiveNav(routeBase) {
  qsa('.nav-link[data-route]').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === routeBase);
  });
}

async function router() {
  const hash = location.hash || '#/';
  const base = currentRouteBase();

  qsa('section.view').forEach((sec) => sec.classList.add('hidden'));

  // 🔥 Removed the call to Properties.destroyMap() because the 3D map was removed
  // if (base !== '#/properties') Properties.destroyMap();
  if (base !== '#/property') Properties.destroyTour();

  if (base === '#/') {
    qs('#view-home').classList.remove('hidden');
    if (!AppState.heroInstance) {
      AppState.heroInstance = initHeroScene(qs('#hero-canvas-wrap'), qs('#hero-daynight-slider'));
    }
    Properties.loadHomeFeatured();
  } else if (base === '#/properties') {
    qs('#view-properties').classList.remove('hidden');
    Properties.initPropertiesPage();
  } else if (base === '#/property') {
    qs('#view-property').classList.remove('hidden');
    const id = hash.split('/')[2];
    Properties.renderDetail(id);
  } else if (base === '#/house-hunt') {
    qs('#view-househunt').classList.remove('hidden');
    HouseHunt.render();
  } else if (base === '#/dashboard') {
    qs('#view-dashboard').classList.remove('hidden');
    Dashboard.init();
  }

  setActiveNav(base);
  qsa('.nav-links').forEach((el) => el.classList.remove('mobile-open'));
  window.scrollTo(0, 0);
}

function wireNav() {
  qsa('.nav-link[data-route]').forEach((link) => {
    link.addEventListener('click', () => { location.hash = link.dataset.route; });
  });

  const hamburger = qs('#hamburger-btn');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      qs('.nav-links').classList.toggle('mobile-open');
    });
  }

  qsa('.list-property-trigger').forEach((listBtn) => {
    listBtn.addEventListener('click', () => {
      if (!Auth.isLoggedIn()) {
        openAuthModal('register', { role: 'agent', onSuccess: () => { location.hash = '#/dashboard'; Dashboard.activeTab = 'listings'; } });
      } else if (Auth.isAgent()) {
        location.hash = '#/dashboard';
        Dashboard.activeTab = 'listings';
        setTimeout(() => Dashboard.init(), 0);
      } else {
        toast('Only agent accounts can list properties.', 'error');
        openAuthModal('register', { role: 'agent' });
      }
    });
  });

  const exploreBtn = qs('#hero-explore-btn');
  if (exploreBtn) exploreBtn.addEventListener('click', () => { location.hash = '#/properties'; });
}

function wireTheme() {
  const KEY = 'sabali_theme';
  const toggle = qs('#theme-toggle');
  const icon = qs('#theme-icon');
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (icon) icon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }
  const saved = localStorage.getItem(KEY) || 'dark';
  apply(saved);
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      localStorage.setItem(KEY, next);
      apply(next);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  wireNav();
  wireTheme();
  window.addEventListener('hashchange', router);
  router();
});