// Role-scoped dashboard: sidebar tabs + content panels. All three roles
// share the same shell (#view-dashboard) but see different tabs.

const Dashboard = {
  activeTab: null,

  tabsForRole() {
    if (Auth.isAdmin()) return [
      { id: 'agents', label: 'Agents', icon: 'fa-user-shield' },
      { id: 'reports', label: 'Reports', icon: 'fa-flag' },
      { id: 'househunts', label: 'House hunts', icon: 'fa-magnifying-glass-location' },
    ];
    if (Auth.isAgent()) return [
      { id: 'overview', label: 'Overview', icon: 'fa-gauge' },
      { id: 'listings', label: 'My listings', icon: 'fa-house' },
      { id: 'requests', label: 'Booking requests', icon: 'fa-inbox' },
      { id: 'househunts', label: 'House hunts', icon: 'fa-magnifying-glass-location' },
    ];
    return [
      { id: 'bookings', label: 'My bookings', icon: 'fa-calendar-check' },
      { id: 'househunts', label: 'House hunts', icon: 'fa-magnifying-glass-location' },
    ];
  },

  async init() {
    const root = qs('#view-dashboard .page');
    if (!Auth.isLoggedIn()) {
      root.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-lock"></i>
          <p>Sign in to see your dashboard.</p>
          <button class="btn btn-primary" id="dash-signin-btn" style="margin-top:14px;">Sign in</button>
        </div>`;
      qs('#dash-signin-btn').addEventListener('click', () => openAuthModal('login', { onSuccess: () => Dashboard.init() }));
      return;
    }

    const tabs = this.tabsForRole();
    if (!this.activeTab || !tabs.some((t) => t.id === this.activeTab)) this.activeTab = tabs[0].id;

    root.innerHTML = `
      <div class="section-head">
        <div>
          <span class="section-eyebrow">${Auth.current.role}</span>
          <h2>Hi, ${escapeHtml(Auth.current.name.split(' ')[0])}</h2>
        </div>
        ${Auth.isAgent() ? `<span class="${Auth.current.verified ? 'verified-badge' : 'unverified-badge'}">${Auth.current.verified ? '<i class="fa-solid fa-circle-check"></i> Verified agent' : '<i class="fa-regular fa-circle"></i> Verification pending'}</span>` : ''}
      </div>
      <div class="dash-shell">
        <nav class="dash-side">
          ${tabs.map((t) => `<button data-tab="${t.id}" class="${t.id === this.activeTab ? 'active' : ''}"><i class="fa-solid ${t.icon}"></i>&nbsp;&nbsp;${t.label}</button>`).join('')}
        </nav>
        <div id="dash-content"></div>
      </div>`;

    qsa('.dash-side button', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.init();
      });
    });

    const content = qs('#dash-content', root);
    content.innerHTML = `<div class="loading-block"><div class="spinner"></div> Loading…</div>`;

    try {
      if (this.activeTab === 'bookings') await this.renderCustomerBookings(content);
      else if (this.activeTab === 'overview') await this.renderAgentOverview(content);
      else if (this.activeTab === 'listings') await this.renderAgentListings(content);
      else if (this.activeTab === 'requests') await this.renderAgentRequests(content);
      else if (this.activeTab === 'agents') await this.renderAdminAgents(content);
      else if (this.activeTab === 'reports') await this.renderAdminReports(content);
      else if (this.activeTab === 'househunts') await this.renderHouseHunts(content);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>${escapeHtml(err.message)}</p></div>`;
    }
  },

  statusPill(status) {
    return `<span class="status-pill status-${status}">${status}</span>`;
  },

  // --- Customer --------------------------------------------------------
  async renderCustomerBookings(content) {
    const { bookings } = await Api.listBookings();
    if (!bookings.length) {
      content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>No bookings yet. Go find your next stay.</p><button class="btn btn-primary" id="browse-btn" style="margin-top:12px;">Browse stays</button></div>`;
      qs('#browse-btn', content).addEventListener('click', () => { location.hash = '#/properties'; });
      return;
    }
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    content.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Stay</th><th>Dates</th><th>Guests</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>${bookings.map((b) => `
          <tr>
            <td>${b.property ? escapeHtml(b.property.title) : 'Listing removed'}</td>
            <td>${b.checkIn ? `${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}` : formatDate(b.viewingDate)}</td>
            <td>${b.guests}</td>
            <td class="mono">${formatMoney(b.totalPrice)}</td>
            <td>${this.statusPill(b.status)}</td>
            <td>${b.status === 'pending' ? `<button class="btn btn-danger btn-sm" data-cancel="${b.id}">Cancel</button>` : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    qsa('[data-cancel]', content).forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await Api.updateBooking(btn.dataset.cancel, 'cancelled');
          toast('Booking cancelled.', 'info');
          this.init();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  },

  // --- Agent -------------------------------------------------------------
  async renderAgentOverview(content) {
    const [{ properties }, { bookings }] = await Promise.all([Api.listProperties({}), Api.listBookings()]);
    const mine = properties.filter((p) => p.agentId === Auth.current.id);
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    content.innerHTML = `
      <div class="stat-row">
        <div class="stat-card"><div class="num">${mine.length}</div><div class="label">Active listings</div></div>
        <div class="stat-card"><div class="num">${pending}</div><div class="label">Pending requests</div></div>
        <div class="stat-card"><div class="num">${confirmed}</div><div class="label">Confirmed bookings</div></div>
        <div class="stat-card"><div class="num">${Auth.current.verified ? 'Yes' : 'No'}</div><div class="label">Verified badge</div></div>
      </div>
      <p style="color:var(--text-dim);max-width:60ch;">
        ${Auth.current.verified
          ? 'Your verified badge is visible on every listing and reassures guests you\'re a trusted host.'
          : 'You are not verified yet — an admin reviews new agents and grants the verified badge from the admin dashboard.'}
      </p>`;
  },

  async renderAgentListings(content) {
    const { properties } = await Api.listProperties({});
    const mine = properties.filter((p) => p.agentId === Auth.current.id);
    content.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
        <button class="btn btn-primary btn-sm" id="new-listing-btn"><i class="fa-solid fa-plus"></i> New listing</button>
      </div>
      <div id="listing-list"></div>`;
    qs('#new-listing-btn', content).addEventListener('click', () => openPropertyFormModal(null, () => this.init()));

    const listEl = qs('#listing-list', content);
    if (!mine.length) {
      listEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-house-circle-check"></i><p>You haven't listed a property yet.</p></div>`;
      return;
    }
    listEl.innerHTML = mine.map((p) => this.listingCardHtml(p)).join('');
    this.wireListingCardActions(listEl, mine);
  },

  listingCardHtml(p) {
    const meta = categoryMeta(p.category);
    return `
      <div class="property-manage-card" data-id="${p.id}">
        <img src="${escapeHtml(p.images[0])}" alt="" />
        <div class="grow">
          <div style="font-weight:600;">${escapeHtml(p.title)}</div>
          <div style="color:var(--text-dim);font-size:.82rem;">${meta.label} · ${p.type === 'short_let' ? 'Short-let' : 'Long-term'} · ${formatMoney(p.price)}/${p.priceUnit}</div>
          ${p.aiGenerated ? `<span class="field-hint"><i class="fa-solid fa-wand-magic-sparkles"></i> AI-generated cover</span>` : `<span class="field-hint"><i class="fa-solid fa-image"></i> Custom photo</span>`}
        </div>
        <div class="row-actions">
          <button class="btn btn-secondary btn-sm" data-edit="${p.id}">Edit</button>
          <button class="btn btn-secondary btn-sm" data-upload="${p.id}"><i class="fa-solid fa-upload"></i> Upload photo</button>
          <button class="btn btn-secondary btn-sm" data-regen="${p.id}"><i class="fa-solid fa-wand-magic-sparkles"></i> Regenerate AI</button>
          <button class="btn btn-danger btn-sm" data-remove="${p.id}">Remove</button>
        </div>
        <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" data-fileinput="${p.id}" />
      </div>`;
  },

  wireListingCardActions(listEl, mine) {
    qsa('[data-edit]', listEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = mine.find((x) => x.id === Number(btn.dataset.edit));
        openPropertyFormModal(p, () => this.init());
      });
    });
    qsa('[data-remove]', listEl).forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this listing? It will no longer be visible to guests.')) return;
        try {
          await Api.deleteProperty(btn.dataset.remove);
          toast('Listing removed.', 'info');
          this.init();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
    qsa('[data-upload]', listEl).forEach((btn) => {
      const id = btn.dataset.upload;
      const fileInput = qs(`[data-fileinput="${id}"]`, listEl);
      btn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        try {
          await Api.uploadPropertyImage(id, file);
          toast('Photo uploaded — it now replaces the AI cover.', 'success');
          this.init();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
    qsa('[data-regen]', listEl).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const p = mine.find((x) => x.id === Number(btn.dataset.regen));
        try {
          await Api.generateImage({ title: p.title, description: p.description, category: p.category, propertyId: p.id });
          toast('New AI cover generated.', 'success');
          this.init();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  },

  async renderAgentRequests(content) {
    const { bookings } = await Api.listBookings();
    if (!bookings.length) {
      content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No booking requests yet.</p></div>`;
      return;
    }
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    content.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Guest</th><th>Stay</th><th>Dates</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>${bookings.map((b) => `
          <tr>
            <td>${b.customer ? escapeHtml(b.customer.name) : '—'}</td>
            <td>${b.property ? escapeHtml(b.property.title) : 'Listing removed'}</td>
            <td>${b.checkIn ? `${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}` : formatDate(b.viewingDate)}</td>
            <td class="mono">${formatMoney(b.totalPrice)}</td>
            <td>${this.statusPill(b.status)}</td>
            <td class="row-actions">
              ${b.status === 'pending' ? `<button class="btn btn-teal btn-sm" data-confirm="${b.id}">Confirm</button><button class="btn btn-danger btn-sm" data-cancel="${b.id}">Decline</button>` : ''}
              ${b.status === 'confirmed' ? `<button class="btn btn-secondary btn-sm" data-complete="${b.id}">Mark complete</button><button class="btn btn-danger btn-sm" data-cancel="${b.id}">Cancel</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    const act = async (id, status) => {
      try { await Api.updateBooking(id, status); toast(`Booking ${status}.`, 'success'); this.init(); }
      catch (err) { toast(err.message, 'error'); }
    };
    qsa('[data-confirm]', content).forEach((b) => b.addEventListener('click', () => act(b.dataset.confirm, 'confirmed')));
    qsa('[data-cancel]', content).forEach((b) => b.addEventListener('click', () => act(b.dataset.cancel, 'cancelled')));
    qsa('[data-complete]', content).forEach((b) => b.addEventListener('click', () => act(b.dataset.complete, 'completed')));
  },

  // --- Admin ---------------------------------------------------------------
  async renderAdminAgents(content) {
    const { agents } = await Api.adminAgents();
    content.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Agent</th><th>Email</th><th>Listings</th><th>Status</th><th></th></tr></thead>
        <tbody>${agents.map((a) => `
          <tr>
            <td>${escapeHtml(a.name)}</td>
            <td>${escapeHtml(a.email)}</td>
            <td>${a.listingCount}</td>
            <td>${a.verified ? '<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>' : '<span class="unverified-badge"><i class="fa-regular fa-circle"></i> Pending</span>'}</td>
            <td><button class="btn ${a.verified ? 'btn-secondary' : 'btn-teal'} btn-sm" data-toggle="${a.id}" data-verified="${a.verified}">${a.verified ? 'Revoke badge' : 'Verify agent'}</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    qsa('[data-toggle]', content).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nowVerified = btn.dataset.verified !== 'true';
        try {
          await Api.adminVerifyAgent(btn.dataset.toggle, nowVerified);
          toast(nowVerified ? 'Agent verified.' : 'Verification revoked.', 'success');
          this.init();
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  },

  async renderAdminReports(content) {
    const { reports } = await Api.adminReports();
    if (!reports.length) {
      content.innerHTML = `<div class="empty-state"><i class="fa-solid fa-shield-halved"></i><p>No reports filed. All quiet.</p></div>`;
      return;
    }
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    content.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Listing</th><th>Reported by</th><th>Reason</th><th>Status</th><th></th></tr></thead>
        <tbody>${reports.map((r) => `
          <tr>
            <td>${r.property ? escapeHtml(r.property.title) : '—'}</td>
            <td>${r.reporter ? escapeHtml(r.reporter.name) : '—'}</td>
            <td style="max-width:260px;">${escapeHtml(r.reason)}</td>
            <td>${this.statusPill(r.status === 'open' ? 'pending' : r.status)}</td>
            <td class="row-actions">
              ${r.status === 'open' ? `
                <button class="btn btn-secondary btn-sm" data-dismiss="${r.id}">Dismiss</button>
                <button class="btn btn-danger btn-sm" data-remove="${r.id}">Remove listing</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    qsa('[data-dismiss]', content).forEach((btn) => {
      btn.addEventListener('click', async () => {
        try { await Api.adminResolveReport(btn.dataset.dismiss, 'dismissed', false); toast('Report dismissed.', 'info'); this.init(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
    qsa('[data-remove]', content).forEach((btn) => {
      btn.addEventListener('click', async () => {
        try { await Api.adminResolveReport(btn.dataset.remove, 'resolved', true); toast('Listing removed.', 'success'); this.init(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
  },

  // --- House hunts (shared by all three roles; the API already scopes
  // which requests come back — this just adapts which actions to show) ---
  async renderHouseHunts(content) {
    const { houseHunts } = await Api.listHouseHunts();
    if (!houseHunts.length) {
      content.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-magnifying-glass-location"></i>
          <p>${Auth.isAgent() ? 'No open house-hunt requests right now — check back soon.' : 'No house-hunt requests yet.'}</p>
          ${Auth.isCustomer() ? '<button class="btn btn-primary" id="hh-cta" style="margin-top:12px;">Book a house hunt</button>' : ''}
        </div>`;
      if (Auth.isCustomer()) qs('#hh-cta', content).addEventListener('click', () => { location.hash = '#/house-hunt'; });
      return;
    }
    content.innerHTML = houseHunts.map((h) => this.houseHuntCardHtml(h)).join('');
    this.wireHouseHuntActions(content, houseHunts);
  },

  houseHuntCardHtml(h) {
    const title = h.property ? h.property.title : (h.external ? h.external.title : 'Untitled property');
    const sourceLabel = h.source === 'listed' ? 'Sabali listing' : 'External property';
    const feeText = h.fee !== null ? formatMoney(h.fee) : 'Quote pending';

    let contextLine = '';
    if (Auth.isCustomer()) {
      if (h.agent) {
        contextLine = `Agent: ${escapeHtml(h.agent.name)} ${h.agent.verified ? '<span class="verified-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>' : '<span class="unverified-badge">Pending verification</span>'}`;
      } else if (h.status === 'pending_quote') {
        contextLine = 'Awaiting a fee quote from our team.';
      } else if (h.status === 'pending') {
        contextLine = 'Waiting for a verified agent to accept this job.';
      }
    } else {
      contextLine = `Requested by ${h.customer ? escapeHtml(h.customer.name) : 'a customer'}`;
    }

    const externalBlock = (h.source === 'external' && h.external) ? `
      <div class="field-hint" style="margin-top:10px;line-height:1.6;">
        ${h.external.address ? `<div><i class="fa-solid fa-location-dot"></i> ${escapeHtml(h.external.address)}</div>` : ''}
        ${h.external.askingPrice ? `<div>Asking price: ${formatMoney(h.external.askingPrice)}</div>` : ''}
        ${h.external.contactInfo ? `<div>Listing contact: ${escapeHtml(h.external.contactInfo)}</div>` : ''}
        ${h.external.sourceLink ? `<div><a href="${escapeHtml(h.external.sourceLink)}" target="_blank" rel="noopener">View original listing <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>` : ''}
        <div style="margin-top:4px;color:var(--text);">${escapeHtml(h.external.description)}</div>
      </div>` : '';

    const reportBlock = h.report ? `
      <div class="hh-report-box ${h.report.verdict === 'not_exists' ? 'mismatch' : ''}">
        <strong>${h.report.verdict === 'exists' ? '<i class="fa-solid fa-circle-check"></i> Confirmed to exist' : h.report.verdict === 'not_exists' ? '<i class="fa-solid fa-triangle-exclamation"></i> Could not confirm / mismatch' : 'Findings pending'}</strong>
        ${h.report.notes ? `<p style="margin:6px 0 0;">${escapeHtml(h.report.notes)}</p>` : ''}
        ${h.report.photo ? `<img src="${escapeHtml(h.report.photo)}" alt="Evidence photo" style="max-width:160px;border-radius:8px;margin-top:8px;display:block;" />` : ''}
      </div>` : '';

    const actions = [];
    if (Auth.isCustomer() && ['pending_quote', 'pending', 'assigned'].includes(h.status)) {
      actions.push(`<button class="btn btn-danger btn-sm" data-cancel-hh="${h.id}">Cancel</button>`);
    }
    if (Auth.isAgent()) {
      if (!h.agentId && h.status === 'pending') {
        actions.push(`<button class="btn btn-teal btn-sm" data-claim-hh="${h.id}">Accept this job</button>`);
      }
      if (h.agentId === Auth.current.id && h.status === 'assigned') {
        actions.push(`<button class="btn btn-primary btn-sm" data-report-hh="${h.id}">Submit findings</button>`);
      }
    }
    if (Auth.isAdmin()) {
      if (h.status === 'pending_quote') actions.push(`<button class="btn btn-teal btn-sm" data-quote-hh="${h.id}">Set fee</button>`);
      if (h.status !== 'cancelled') actions.push(`<button class="btn btn-danger btn-sm" data-cancel-hh="${h.id}">Cancel</button>`);
    }

    return `
      <div class="hh-request-card">
        <div class="hh-request-head">
          <div>
            <div class="hh-request-title">${escapeHtml(title)}</div>
            <div class="hh-request-meta">${escapeHtml(h.location.city)}, ${escapeHtml(h.location.country)} · ${sourceLabel} · Preferred: ${formatDate(h.preferredDate)}</div>
          </div>
          <div style="text-align:right;">
            <span class="status-pill status-${h.status}">${houseHuntStatusLabel(h.status)}</span>
            <div class="mono" style="margin-top:6px;font-size:0.85rem;">${feeText}</div>
          </div>
        </div>
        ${externalBlock}
        ${h.notes ? `<p class="field-hint" style="margin-top:8px;">Note: ${escapeHtml(h.notes)}</p>` : ''}
        <div class="field-hint" style="margin-top:10px;">${contextLine}</div>
        ${reportBlock}
        ${actions.length ? `<div class="row-actions" style="margin-top:14px;">${actions.join('')}</div>` : ''}
      </div>`;
  },

  wireHouseHuntActions(content, list) {
    qsa('[data-cancel-hh]', content).forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel this house-hunt request?')) return;
        try { await Api.cancelHouseHunt(btn.dataset.cancelHh); toast('Request cancelled.', 'info'); this.init(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
    qsa('[data-claim-hh]', content).forEach((btn) => {
      btn.addEventListener('click', async () => {
        try { await Api.claimHouseHunt(btn.dataset.claimHh); toast('Job accepted — go verify it and submit your findings.', 'success'); this.init(); }
        catch (err) { toast(err.message, 'error'); }
      });
    });
    qsa('[data-report-hh]', content).forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = list.find((x) => x.id === Number(btn.dataset.reportHh));
        openHouseHuntReportModal(h, () => this.init());
      });
    });
    qsa('[data-quote-hh]', content).forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = list.find((x) => x.id === Number(btn.dataset.quoteHh));
        openHouseHuntQuoteModal(h, () => this.init());
      });
    });
  },
};

// --- Create / edit listing modal --------------------------------------
function openPropertyFormModal(existing, onSaved) {
  const isEdit = !!existing;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const amenityKeys = Object.keys(AMENITY_LABELS);
  const selectedAmenities = new Set(existing ? existing.amenities : []);

  overlay.innerHTML = `
    <div class="modal modal-wide" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>${isEdit ? 'Edit listing' : 'List a new property'}</h2>
      <p class="modal-sub">${isEdit ? 'Update the details guests see.' : 'A cover photo is generated automatically — you can replace it any time after.'}</p>
      <div id="prop-form-error" class="form-error hidden"></div>
      <form id="prop-form">
        <div class="field"><label>Title</label><input type="text" name="title" required value="${existing ? escapeHtml(existing.title) : ''}" placeholder="e.g. Villa Baharini" /></div>
        <div class="field"><label>Description</label><textarea name="description" required placeholder="What makes this place special?">${existing ? escapeHtml(existing.description) : ''}</textarea></div>
        <div class="field-row">
          <div class="field">
            <label>Category</label>
            <select name="category">${Object.entries(CATEGORY_META).map(([k, v]) => `<option value="${k}" ${existing && existing.category === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label>Listing type</label>
            <select name="type">
              <option value="short_let" ${existing && existing.type === 'short_let' ? 'selected' : ''}>Short-let (priced per night)</option>
              <option value="long_term" ${existing && existing.type === 'long_term' ? 'selected' : ''}>Long-term (priced per month)</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Price (USD)</label><input type="number" name="price" min="1" required value="${existing ? existing.price : ''}" /></div>
          <div class="field"><label>Max guests</label><input type="number" name="maxGuests" min="1" required value="${existing ? existing.maxGuests : 2}" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Bedrooms</label><input type="number" name="bedrooms" min="0" required value="${existing ? existing.bedrooms : 1}" /></div>
          <div class="field"><label>Bathrooms</label><input type="number" name="bathrooms" min="0" required value="${existing ? existing.bathrooms : 1}" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>City</label><input type="text" name="city" required value="${existing ? escapeHtml(existing.location.city) : ''}" /></div>
          <div class="field"><label>Country</label><input type="text" name="country" required value="${existing ? escapeHtml(existing.location.country) : ''}" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Latitude <span class="field-hint">(optional, for the map)</span></label><input type="number" step="any" name="lat" value="${existing ? existing.location.lat : ''}" /></div>
          <div class="field"><label>Longitude</label><input type="number" step="any" name="lng" value="${existing ? existing.location.lng : ''}" /></div>
        </div>
        <div class="field">
          <label>Amenities</label>
          <div class="amenity-grid">
            ${amenityKeys.map((k) => `<span class="amenity-chip ${selectedAmenities.has(k) ? 'active' : ''}" data-amenity="${k}">${AMENITY_LABELS[k]}</span>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit">${isEdit ? 'Save changes' : 'Create listing'}</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.modal-close', overlay).addEventListener('click', close);

  qsa('.amenity-chip', overlay).forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.amenity;
      if (selectedAmenities.has(key)) { selectedAmenities.delete(key); chip.classList.remove('active'); }
      else { selectedAmenities.add(key); chip.classList.add('active'); }
    });
  });

  qs('#prop-form', overlay).addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      category: fd.get('category'),
      type: fd.get('type'),
      price: Number(fd.get('price')),
      maxGuests: Number(fd.get('maxGuests')),
      bedrooms: Number(fd.get('bedrooms')),
      bathrooms: Number(fd.get('bathrooms')),
      amenities: Array.from(selectedAmenities),
      location: {
        city: fd.get('city'),
        country: fd.get('country'),
        area: existing ? existing.location.area : '',
        lat: fd.get('lat') || 0,
        lng: fd.get('lng') || 0,
      },
    };
    try {
      if (isEdit) await Api.updateProperty(existing.id, payload);
      else await Api.createProperty(payload);
      toast(isEdit ? 'Listing updated.' : 'Listing created with an AI-generated cover.', 'success');
      close();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      const box = qs('#prop-form-error', overlay);
      box.textContent = err.message;
      box.classList.remove('hidden');
    }
  });
}

// --- Agent: submit house-hunt findings (with optional evidence photo) -----
function openHouseHuntReportModal(houseHunt, onSaved) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>Submit your findings</h2>
      <p class="modal-sub">What did you find when you visited?</p>
      <div id="hh-report-error" class="form-error hidden"></div>
      <form id="hh-report-form">
        <div class="field">
          <label>Verdict</label>
          <select name="verdict" required>
            <option value="">Choose one…</option>
            <option value="exists">The property exists and matches the description</option>
            <option value="not_exists">Could not confirm it exists / details don't match</option>
          </select>
        </div>
        <div class="field"><label>Notes</label><textarea name="notes" required placeholder="What you saw, who you spoke to, anything the customer should know…"></textarea></div>
        <div class="field">
          <label>Evidence photo <span class="field-hint">(optional)</span></label>
          <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" />
        </div>
        <button class="btn btn-primary btn-block" type="submit">Submit findings</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.modal-close', overlay).addEventListener('click', close);

  qs('#hh-report-form', overlay).addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const verdict = fd.get('verdict');
    const notes = fd.get('notes');
    const photo = fd.get('photo');
    try {
      await Api.reportHouseHunt(houseHunt.id, verdict, notes);
      if (photo && photo.size > 0) {
        await Api.uploadHouseHuntPhoto(houseHunt.id, photo);
      }
      toast('Findings submitted.', 'success');
      close();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      const box = qs('#hh-report-error', overlay);
      box.textContent = err.message;
      box.classList.remove('hidden');
    }
  });
}

// --- Admin: set a manual fee for a "pending_quote" house-hunt request -----
function openHouseHuntQuoteModal(houseHunt, onSaved) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>Set a fee</h2>
      <p class="modal-sub">${escapeHtml(houseHunt.location.city)}, ${escapeHtml(houseHunt.location.country)} didn't match a known pricing tier — set a custom fee so an agent can accept this job.</p>
      <div id="hh-quote-error" class="form-error hidden"></div>
      <form id="hh-quote-form">
        <div class="field"><label>Fee (USD)</label><input type="number" name="fee" min="1" required /></div>
        <div class="field"><label>Tier label <span class="field-hint">(optional, shown to the customer)</span></label><input type="text" name="feeTier" placeholder="e.g. Custom quote — Kericho" /></div>
        <button class="btn btn-primary btn-block" type="submit">Save fee</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.modal-close', overlay).addEventListener('click', close);

  qs('#hh-quote-form', overlay).addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Api.quoteHouseHunt(houseHunt.id, fd.get('fee'), fd.get('feeTier'));
      toast('Fee set — this job is now open for agents to accept.', 'success');
      close();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      const box = qs('#hh-quote-error', overlay);
      box.textContent = err.message;
      box.classList.remove('hidden');
    }
  });
}
