// Rendering + filtering for property listings, plus the property detail
// page. Booking-box logic itself lives in booking.js.

// ---- City data for map markers (kept for reference, but not used in 3D map anymore) ----
const CITIES = [
  { name: 'Mombasa', lat: -4.0435, lng: 39.6682 },
  { name: 'Diani', lat: -4.3167, lng: 39.5833 },
  { name: 'Kilifi', lat: -3.6333, lng: 39.8500 },
  { name: 'Malindi', lat: -3.2333, lng: 40.1167 },
  { name: 'Watamu', lat: -3.3500, lng: 40.0167 },
  { name: 'Nairobi', lat: -1.2864, lng: 36.8172 },
  { name: 'Zanzibar', lat: -6.1659, lng: 39.2026 },
];

// Helper to transform a property object if it matches any of our custom overrides
function transformPropertyForDisplay(property) {
  let transformed = { ...property };

  // Villa Baharini
  if (property.title.toLowerCase().includes('villa baharini')) {
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/5_bedroom_diani_wytgfl.jpg'];
  }
  // Tide & Palm Beach Apartment → Aqua Apartments
  else if (property.title.toLowerCase().includes('tide & palm') || property.title.toLowerCase().includes('aqua apartments')) {
    transformed.title = 'Aqua Apartments';
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/aqua_nyali_wpgncd.jpg'];
  }
  // Riftvalley Retreat → Villa Crocodile
  else if (property.title.toLowerCase().includes('riftvalley') || property.title.toLowerCase().includes('rift valley')) {
    transformed.title = 'Villa Crocodile';
    transformed.location = {
      ...property.location,
      city: 'Diani',
      area: 'Diani Beach',
      country: 'Kenya'
    };
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/7_bedroom_diani_ao3mue.jpg'];
  }
  // Karen Garden Guesthouse → Four Bedroom Beachfront
  else if (property.title.toLowerCase().includes('karen garden')) {
    transformed.title = 'Four Bedroom Beachfront';
    transformed.location = {
      ...property.location,
      city: 'Diani',
      area: 'Diani Beach',
      country: 'Kenya'
    };
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480613/4_bedroom_diani_beachfront_gbqzdf.jpg'];
  }
  // Westlands Skyline Condo → Two bedroom Stand-alone (condo)
  else if (property.title.toLowerCase().includes('westlands skyline') || property.title.toLowerCase().includes('skyline condo')) {
    transformed.title = 'Two bedroom Stand-alone';
    transformed.location = {
      ...property.location,
      city: 'Diani',
      area: 'Diani Beach',
      country: 'Kenya'
    };
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785484659/standalone_villa_qlo0dg.jpg'];
    transformed.type = 'short_let';
    transformed.priceUnit = 'night';
  }
  // Runda Family Townhouse → Three Bedroom Crocodile Stand-Alone
  else if (property.title.toLowerCase().includes('runda family') || property.title.toLowerCase().includes('runda townhouse')) {
    transformed.title = 'Three Bedroom Crocodile Stand-Alone';
    transformed.location = {
      ...property.location,
      city: 'Diani',
      area: 'Diani Beach',
      country: 'Kenya'
    };
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785492872/bungalow_dhej2i.jpg'];
    transformed.type = 'short_let';
    transformed.priceUnit = 'night';
  }
  // Zanzibar Sunset Villa → Kwamby Ocean Paradise
  else if (property.title.toLowerCase().includes('zanzibar sunset') || property.title.toLowerCase().includes('kwamby ocean')) {
    transformed.title = 'Kwamby Ocean Paradise';
    transformed.location = {
      ...property.location,
      city: 'Nyali',
      area: '5th Avenue',
      country: 'Kenya'
    };
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737005/WhatsApp_Image_2026-07-21_at_07.26.43_g6tgzc.jpg'];
  }
  // Lamu Old Town Colony → Executive 3 Bedroom
  else if (property.title.toLowerCase().includes('lamu old town') || property.title.toLowerCase().includes('executive 3 bedroom')) {
    transformed.title = 'Executive 3 Bedroom';
    transformed.location = {
      ...property.location,
      city: 'Diani',
      area: 'Diani Beach',
      country: 'Kenya'
    };
    transformed.images = ['https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737808/WhatsApp_Image_2026-07-17_at_00.32.06_xcebva.jpg'];
  }

  return transformed;
}

// Helper to get the hover image for a custom property (if any)
function getCustomHoverImage(property) {
  const title = property.title.toLowerCase();
  if (title.includes('villa baharini')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785481703/3d_replacement_zh2gkp.jpg';
  }
  if (title.includes('aqua apartments') || title.includes('tide & palm')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785482507/3d_hover_s6wf8y.jpg';
  }
  if (title.includes('villa crocodile') || title.includes('riftvalley') || title.includes('rift valley')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785483050/crocodile_ouq4c2.jpg';
  }
  if (title.includes('four bedroom beachfront') || title.includes('karen garden')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785483456/4_bedroom_3d_hover_c8d2ta.jpg';
  }
  // Old transformed condo (was Westlands Skyline Condo) → now "Two bedroom Stand-alone" with category condo
  if ((title.includes('two bedroom stand-alone') || title.includes('westlands skyline') || title.includes('skyline condo')) && property.category === 'condo') {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785484658/3d_standalone_lhqvld.jpg';
  }
  if (title.includes('three bedroom crocodile stand-alone') || title.includes('runda family') || title.includes('runda townhouse')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785492872/bungalow_hover_lvx4pj.jpg';
  }
  // Kwamby Ocean Paradise (was Zanzibar Sunset Villa)
  if (title.includes('kwamby ocean') || title.includes('zanzibar sunset')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737005/WhatsApp_Image_2026-07-21_at_07.26.45_ltalkk.jpg';
  }
  // Executive 3 Bedroom (was Lamu Old Town Colony)
  if (title.includes('executive 3 bedroom') || title.includes('lamu old town')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737808/WhatsApp_Image_2026-07-17_at_00.32.02_vbutuz.jpg';
  }
  // Savannah House
  if (title.includes('savannah house')) {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737808/WhatsApp_Image_2026-07-30_at_23.19.13_m4ewyk.jpg';
  }
  // 🆕 New Two Bedroom Standalone (villa in Diani)
  if (title.includes('two bedroom standalone') && property.category === 'villa') {
    return 'https://res.cloudinary.com/tgvfx3bf/image/upload/v1785737808/WhatsApp_Image_2026-07-16_at_22.54.25_ngt04w.jpg';
  }
  return null;
}

// Helper to get the display category label (with overrides for custom properties)
function getDisplayCategory(property) {
  const title = property.title.toLowerCase();
  // Override for Four Bedroom Beachfront → Beach Villa
  if (title.includes('four bedroom beachfront') || title.includes('karen garden')) {
    return { label: 'Beach Villa', icon: 'fa-umbrella-beach', color: '#6fb8b3' };
  }
  // Override for Two bedroom Stand-alone (condo) → Villa (was Condo)
  if (title.includes('two bedroom stand-alone') || title.includes('westlands skyline') || title.includes('skyline condo')) {
    return { label: 'Villa', icon: 'fa-house', color: '#dba25a' };
  }
  // Override for Three Bedroom Crocodile Stand-Alone → Villa (was Townhouse)
  if (title.includes('three bedroom crocodile stand-alone') || title.includes('runda family') || title.includes('runda townhouse')) {
    return { label: 'Villa', icon: 'fa-house', color: '#dba25a' };
  }
  // Override for Aqua Apartments → Beach Apartment
  if (title.includes('aqua apartments') || title.includes('tide & palm')) {
    return { label: 'Beach Apartment', icon: 'fa-umbrella-beach', color: '#6fb8b3' };
  }
  // Override for Kwamby Ocean Paradise → Apartment
  if (title.includes('kwamby ocean') || title.includes('zanzibar sunset')) {
    return { label: 'Apartment', icon: 'fa-building', color: '#5b8fd6' };
  }
  // Override for Executive 3 Bedroom → Villa (was Lamu)
  if (title.includes('executive 3 bedroom') || title.includes('lamu old town')) {
    return { label: 'Villa', icon: 'fa-house', color: '#dba25a' };
  }
  // Savannah House → Apartment
  if (title.includes('savannah house')) {
    return { label: 'Apartment', icon: 'fa-building', color: '#5b8fd6' };
  }
  // For all other properties, use the standard category meta
  return categoryMeta(property.category);
}

// Helper to determine which filter categories a property should appear under
// Returns an array of filter keys (e.g., 'villa', 'beach_apartment', 'holiday_home', etc.)
function getFilterCategories(property) {
  const title = property.title.toLowerCase();
  
  // ---- Custom mappings ----
  // Aqua Apartments → Beach apartment (filter key: beach_apartment)
  if (title.includes('aqua apartments') || title.includes('tide & palm')) {
    return ['beach_apartment'];
  }
  // Villa Crocodile → Holiday home & Villa
  if (title.includes('villa crocodile') || title.includes('riftvalley') || title.includes('rift valley')) {
    return ['holiday_home', 'villa'];
  }
  // Four Bedroom Beachfront (was Guesthouse) → Villa only
  if (title.includes('four bedroom beachfront') || title.includes('karen garden')) {
    return ['villa'];
  }
  // Two bedroom Stand-alone (condo) → Villa only
  if (title.includes('two bedroom stand-alone') || title.includes('westlands skyline') || title.includes('skyline condo')) {
    return ['villa'];
  }
  // Three Bedroom Crocodile Stand-Alone (was Townhouse) → Villa only
  if (title.includes('three bedroom crocodile stand-alone') || title.includes('runda family') || title.includes('runda townhouse')) {
    return ['villa'];
  }
  // Kwamby Ocean Paradise (was Zanzibar Sunset Villa) → Beach Apartment & Apartment
  if (title.includes('kwamby ocean') || title.includes('zanzibar sunset')) {
    return ['beach_apartment', 'apartment'];
  }
  // Executive 3 Bedroom (was Lamu Old Town Colony) → Villa only
  if (title.includes('executive 3 bedroom') || title.includes('lamu old town')) {
    return ['villa'];
  }
  // Savannah House → Apartment only
  if (title.includes('savannah house')) {
    return ['apartment'];
  }
  // New Two Bedroom Standalone (villa) → Villa only
  if (title.includes('two bedroom standalone') && property.category === 'villa') {
    return ['villa'];
  }
  
  // ---- Default: use the original category (which matches the filter keys) ----
  return [property.category];
}

// Helper to check if a property should be included based on the current filter
function matchesCategoryFilter(property, filterCategory) {
  if (!filterCategory) return true; // "All" category selected
  const filterLower = filterCategory.toLowerCase();
  const categories = getFilterCategories(property);
  return categories.some(cat => cat.toLowerCase() === filterLower);
}

const Properties = {
  filterState: { category: '', type: '', minPrice: '', maxPrice: '', guests: '', city: '', search: '' },
  tourInstance: null,          // still used for 3D tour on detail page
  allForMap: [],              // no longer used for 3D map, but we keep for compatibility

  destroyTour() {
    if (this.tourInstance) { this.tourInstance.destroy(); this.tourInstance = null; }
  },

  cardEl(property) {
    // Get the display category (with overrides)
    const meta = getDisplayCategory(property);
    
    const card = document.createElement('article');
    card.className = 'prop-card';
    card.innerHTML = `
      <div class="prop-media">
        <img src="${escapeHtml(property.images[0])}" alt="${escapeHtml(property.title)}" loading="lazy" />
        <canvas></canvas>
        <span class="prop-cat-flag cat-${property.category}"><i class="fa-solid ${meta.icon}"></i> ${meta.label}</span>
        <span class="prop-type-flag">${property.type === 'short_let' ? 'Short-let' : 'Long-term'}</span>
      </div>
      <div class="prop-body">
        <div class="prop-title">${escapeHtml(property.title)}</div>
        <div class="prop-loc"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(property.location.city)}, ${escapeHtml(property.location.country)}</div>
        <div class="prop-meta">
          <span><i class="fa-solid fa-bed"></i> ${property.bedrooms}</span>
          <span><i class="fa-solid fa-bath"></i> ${property.bathrooms}</span>
          <span><i class="fa-solid fa-user-group"></i> ${property.maxGuests}</span>
        </div>
        <div class="badge-row">
          <span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified agent</span>
        </div>
        <div class="prop-foot">
          <div class="prop-price">${formatMoney(property.price)} <span>/ ${property.priceUnit}</span></div>
          <button class="btn btn-secondary btn-sm">View</button>
        </div>
      </div>`;

    const canvas = qs('canvas', card);

    // Check if this is one of our custom properties (we'll use a helper)
    const hoverImage = getCustomHoverImage(property);

    if (hoverImage) {
      // 🖼️ For custom properties: draw a static image on the canvas instead of 3D
      const ctx = canvas.getContext('2d');

      const drawImageOnCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvas.width = rect.width;
          canvas.height = rect.height;

          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = hoverImage;
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
          img.onerror = () => {
            ctx.fillStyle = '#1b262a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          };
        }
      };

      requestAnimationFrame(drawImageOnCanvas);

      const resizeHandler = drawImageOnCanvas;
      window.addEventListener('resize', resizeHandler);

      // Do NOT attach the 3D interactive scene
    } else {
      // 🏗️ For all other properties: attach the 3D interactive model
      attachCard3D(card, canvas, property.category);
    }

    card.addEventListener('click', () => { location.hash = `#/property/${property.id}`; });
    return card;
  },

  skeletonGrid(container, count = 6) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div');
      d.className = 'skeleton';
      d.style.aspectRatio = '4/3.4';
      container.appendChild(d);
    }
  },

  renderGrid(container, list) {
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <i class="fa-solid fa-house-circle-xmark"></i>
          <p>No listings match those filters yet. Try widening your search.</p>
        </div>`;
      return;
    }
    list.forEach((p) => container.appendChild(this.cardEl(p)));
  },

  // 🖼️ Override images and details for custom properties in the Handpicked stays section
  async loadHomeFeatured() {
    const grid = qs('#featured-grid');
    if (!grid) return;
    this.skeletonGrid(grid, 4);
    try {
      const { properties } = await Api.listProperties({});

      // Apply transformations to the first 4 properties
      const featuredProperties = properties.slice(0, 4).map((p) => transformPropertyForDisplay(p));

      this.renderGrid(grid, featuredProperties);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Couldn't load listings: ${escapeHtml(err.message)}</div>`;
    }
  },

  // 🔥 Modified to always fetch all properties (frontend filtering)
  buildQuery() {
    const f = this.filterState;
    const query = {
      category: '', // Always fetch all properties, we filter on frontend
      type: f.type,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      guests: f.guests,
      city: f.city,
      search: f.search,
    };
    return query;
  },

  // 🔥 Modified to apply frontend category filtering – 3D map removed.
  async refreshPropertiesPage() {
    const grid = qs('#properties-grid');
    const countEl = qs('#properties-count');
    if (!grid) return;
    this.skeletonGrid(grid, 8);
    try {
      const { properties, total } = await Api.listProperties(this.buildQuery());
      
      // Apply transformations to all properties
      const transformedProperties = properties.map((p) => transformPropertyForDisplay(p));
      
      // Apply frontend filtering based on the displayed category
      let filteredProperties = transformedProperties;
      const filterCategory = this.filterState.category;
      if (filterCategory) {
        filteredProperties = transformedProperties.filter((p) => 
          matchesCategoryFilter(p, filterCategory)
        );
      }
      
      this.renderGrid(grid, filteredProperties);
      this.allForMap = transformedProperties; // Keep for any future use (e.g., static map pins)
      if (countEl) countEl.textContent = `${filteredProperties.length} ${filteredProperties.length === 1 ? 'stay' : 'stays'} found`;
      // No 3D map to refresh
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Couldn't load listings: ${escapeHtml(err.message)}</div>`;
    }
  },

  initPropertiesPage() {
    const bar = qs('#filter-bar');
    if (!bar) return;

    if (this.filtersWired) {
      this.refreshPropertiesPage();
      return;
    }
    this.filtersWired = true;

    qsa('.chip[data-category]', bar).forEach((chip) => {
      chip.addEventListener('click', () => {
        qsa('.chip[data-category]', bar).forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterState.category = chip.dataset.category;
        this.refreshPropertiesPage();
      });
    });

    const typeSelect = qs('#filter-type', bar);
    const guestsInput = qs('#filter-guests', bar);
    const minPrice = qs('#filter-min-price', bar);
    const maxPrice = qs('#filter-max-price', bar);
    const search = qs('#filter-search', bar);

    typeSelect.addEventListener('change', () => { this.filterState.type = typeSelect.value; this.refreshPropertiesPage(); });
    guestsInput.addEventListener('change', () => { this.filterState.guests = guestsInput.value; this.refreshPropertiesPage(); });
    let priceTimer;
    [minPrice, maxPrice].forEach((el) => {
      el.addEventListener('input', () => {
        clearTimeout(priceTimer);
        priceTimer = setTimeout(() => {
          this.filterState.minPrice = minPrice.value;
          this.filterState.maxPrice = maxPrice.value;
          this.refreshPropertiesPage();
        }, 400);
      });
    });
    let searchTimer;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.filterState.search = search.value;
        this.refreshPropertiesPage();
      }, 350);
    });

    this.refreshPropertiesPage();
  },

  // --- Detail page --------------------------------------------------
  async renderDetail(id) {
    const root = qs('#view-property .page');
    root.innerHTML = `<div class="loading-block"><div class="spinner"></div> Loading listing…</div>`;
    let property;
    try {
      ({ property } = await Api.getProperty(id));
    } catch (err) {
      root.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHtml(err.message)}</p></div>`;
      return;
    }

    // Apply the same transformation to the detail view
    property = transformPropertyForDisplay(property);

    // Get the display category (with overrides)
    const meta = getDisplayCategory(property);
    const amenityTags = property.amenities.map((a) => `<span class="amenity-tag"><i class="fa-solid fa-check"></i> ${AMENITY_LABELS[a] || a.replace(/_/g, ' ')}</span>`).join('');

    root.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="back-to-properties" style="margin-bottom:18px;"><i class="fa-solid fa-arrow-left"></i> Back to listings</button>
      <div class="detail-hero">
        <div>
          <div class="detail-media" id="detail-photo-view">
            <img src="${escapeHtml(property.images[0])}" alt="${escapeHtml(property.title)}" />
          </div>
          <div class="tour-shell hidden" id="detail-tour-view"><div id="tour-mount" style="width:100%;height:100%;"></div></div>
          <div class="view-toggle">
            <button class="btn btn-secondary btn-sm active" data-view="photo">Photo</button>
            <button class="btn btn-secondary btn-sm" data-view="tour"><i class="fa-solid fa-cube"></i> 3D virtual tour</button>
          </div>
        </div>
        <div id="booking-box-mount"></div>
      </div>

      <div class="detail-info-card" style="margin-top:26px;">
        <span class="prop-cat-flag cat-${property.category}" style="position:static;display:inline-flex;"><i class="fa-solid ${meta.icon}"></i> ${meta.label}</span>
        <h1 style="margin-top:14px;font-size:1.8rem;">${escapeHtml(property.title)}</h1>
        <div class="prop-loc" style="margin-top:8px;"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(property.location.city)}, ${escapeHtml(property.location.area)}, ${escapeHtml(property.location.country)}</div>
        <div class="prop-meta" style="margin-top:12px;">
          <span><i class="fa-solid fa-bed"></i> ${property.bedrooms} bedrooms</span>
          <span><i class="fa-solid fa-bath"></i> ${property.bathrooms} bathrooms</span>
          <span><i class="fa-solid fa-user-group"></i> Up to ${property.maxGuests} guests</span>
        </div>
        <p style="margin-top:18px;color:var(--text-dim);line-height:1.7;max-width:70ch;">${escapeHtml(property.description)}</p>
        <div class="detail-amenities">${amenityTags}</div>

        <div style="margin-top:26px;padding-top:20px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-weight:600;">${property.agent ? escapeHtml(property.agent.name) : 'Sabali host'}</div>
            <span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified agent</span>
          </div>
          <button class="report-link" id="report-btn"><i class="fa-solid fa-flag"></i> Report this listing</button>
        </div>
      </div>
    `;

    qs('#back-to-properties').addEventListener('click', () => { location.hash = '#/properties'; });

    // photo / tour toggle
    this.destroyTour();
    qsa('.view-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('.view-toggle button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const wantTour = btn.dataset.view === 'tour';
        qs('#detail-photo-view').classList.toggle('hidden', wantTour);
        qs('#detail-tour-view').classList.toggle('hidden', !wantTour);
        if (wantTour && !this.tourInstance) {
          this.tourInstance = initTourScene(qs('#tour-mount'), property.category);
        }
      });
    });

    qs('#report-btn').addEventListener('click', () => Booking.openReportModal(property));

    Booking.renderBookingBox(qs('#booking-box-mount'), property);
  },
};