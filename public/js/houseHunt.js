// "House Hunt" page: a customer pays a verified Sabali agent to physically
// go check a property — either one already on Sabali, or one they found
// elsewhere — and confirm it's real before they commit any money or travel.

const HouseHunt = {
  selectedProperty: null,
  activeSource: 'listed',

  async render() {
    const root = qs('#view-househunt .page');
    root.innerHTML = `
      <div class="section-head">
        <div>
          <span class="section-eyebrow">Anti-scam service</span>
          <h2>Book a house hunt</h2>
        </div>
      </div>
      <p class="section-sub" style="margin-bottom:30px;">
        Send a verified Sabali agent to physically check a property before you commit — whether it's already
        listed here, or you found it through a friend, Facebook, or another site.
      </p>

      <div class="hh-layout">
        <div class="hh-card">
          <div class="tab-row">
            <button class="tab-btn active" data-source="listed">A Sabali listing</button>
            <button class="tab-btn" data-source="external">Somewhere else</button>
          </div>

          <div id="hh-error" class="form-error hidden"></div>

          <form id="hh-form">
            <div id="hh-listed-panel">
              <div class="field">
                <label>Search Sabali listings</label>
                <input type="text" id="hh-property-search" placeholder="Search by title or city…" autocomplete="off" />
              </div>
              <div class="picker-list" id="hh-property-list"></div>
              <div id="hh-selected-property" class="field-hint" style="margin-top:8px;"></div>
            </div>

            <div id="hh-external-panel" class="hidden">
              <div class="field"><label>Property title</label><input type="text" name="ext_title" placeholder="e.g. Two-bedroom apartment, Kilimani" /></div>
              <div class="field"><label>Address / area details</label><input type="text" name="ext_address" placeholder="As specific as you have — street, estate, landmark…" /></div>
              <div class="field-row">
                <div class="field"><label>City *</label><input type="text" name="ext_city" required placeholder="e.g. Mombasa" /></div>
                <div class="field"><label>Country *</label><input type="text" name="ext_country" required value="Kenya" /></div>
              </div>
              <div class="field"><label>Link to the listing <span class="field-hint">(optional)</span></label><input type="url" name="ext_link" placeholder="https://…" /></div>
              <div class="field-row">
                <div class="field"><label>Asking price <span class="field-hint">(optional)</span></label><input type="number" name="ext_price" min="0" /></div>
                <div class="field"><label>Contact for this listing <span class="field-hint">(optional)</span></label><input type="text" name="ext_contact" placeholder="Name / phone / how they reached you" /></div>
              </div>
              <div class="field"><label>Description *</label><textarea name="ext_description" placeholder="What did they tell you? Anything that feels off?"></textarea></div>
            </div>

            <div class="fee-preview">
              <div>
                <div class="amount" id="hh-fee-amount">—</div>
                <div class="tier" id="hh-fee-tier">Pick a listing or enter a location to see the fee</div>
              </div>
              <i class="fa-solid fa-magnifying-glass-dollar" style="color:var(--text-dim);"></i>
            </div>

            <div class="field-row">
              <div class="field"><label>Preferred visit date</label><input type="date" name="preferredDate" required /></div>
              <div class="field"><label>Guests / anything else? <span class="field-hint">(optional)</span></label><input type="text" name="notes" placeholder="Best time to call, access instructions…" /></div>
            </div>

            <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-magnifying-glass-location"></i> Request a house hunt</button>
          </form>

          <div id="hh-confirmation" class="hidden" style="margin-top:20px;"></div>
        </div>

        <div>
          <div class="hh-card" style="margin-bottom:20px;">
            <h3 style="margin-bottom:14px;">How it works</h3>
            <ol style="margin:0;padding-left:20px;color:var(--text-dim);font-size:0.9rem;line-height:1.9;">
              <li>Tell us which property — one of ours, or one you found elsewhere.</li>
              <li>A verified agent nearby accepts the job at the quoted fee.</li>
              <li>They visit in person and confirm whether it exists and matches what you were told.</li>
              <li>You get a written report — and a photo, where possible — before you send any money.</li>
            </ol>
          </div>
          <div class="hh-card">
            <h3 style="margin-bottom:14px;">Typical fees</h3>
            <div style="display:flex;flex-direction:column;gap:10px;font-size:0.86rem;">
              <div style="display:flex;justify-content:space-between;"><span>Nairobi &amp; surrounds</span><span class="mono">~$25</span></div>
              <div style="display:flex;justify-content:space-between;"><span>Kenyan coast</span><span class="mono">~$45</span></div>
              <div style="display:flex;justify-content:space-between;"><span>Rift Valley</span><span class="mono">~$55</span></div>
              <div style="display:flex;justify-content:space-between;"><span>Lamu</span><span class="mono">~$70</span></div>
              <div style="display:flex;justify-content:space-between;"><span>Zanzibar / cross-border</span><span class="mono">~$90</span></div>
              <div style="display:flex;justify-content:space-between;color:var(--text-dim);"><span>Anywhere else</span><span>Custom quote, &lt;24h</span></div>
            </div>
          </div>
        </div>
      </div>`;

    this.selectedProperty = null;
    this.wireTabs(root);
    this.wirePropertyPicker(root);
    this.wireExternalFeePreview(root);
    this.wireSubmit(root);
  },

  wireTabs(root) {
    qsa('.tab-btn[data-source]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        qsa('.tab-btn[data-source]', root).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSource = btn.dataset.source;
        qs('#hh-listed-panel', root).classList.toggle('hidden', this.activeSource !== 'listed');
        qs('#hh-external-panel', root).classList.toggle('hidden', this.activeSource !== 'external');
        this.updateFeePreview(root);
      });
    });
  },

  async wirePropertyPicker(root) {
    const listEl = qs('#hh-property-list', root);
    const searchEl = qs('#hh-property-search', root);

    const renderList = (properties) => {
      if (!properties.length) {
        listEl.innerHTML = `<div class="field-hint" style="padding:12px;">No matches — try a different search.</div>`;
        return;
      }
      // ✅ Apply transformation to each property for display
      const transformed = properties.map((p) => transformPropertyForDisplay(p));
      listEl.innerHTML = transformed.map((p) => `
        <div class="picker-row ${this.selectedProperty && this.selectedProperty.id === p.id ? 'selected' : ''}" data-id="${p.id}">
          <img src="${escapeHtml(p.images[0])}" alt="" />
          <div class="grow">
            <div class="name">${escapeHtml(p.title)}</div>
            <div class="meta">${escapeHtml(p.location.city)}, ${escapeHtml(p.location.country)} · ${formatMoney(p.price)}/${p.priceUnit}</div>
          </div>
        </div>`).join('');
      qsa('.picker-row', listEl).forEach((row) => {
        row.addEventListener('click', () => {
          const id = Number(row.dataset.id);
          // Find the transformed property (we stored it in the array)
          const property = transformed.find((p) => p.id === id);
          if (property) {
            this.selectedProperty = property;
            qsa('.picker-row', listEl).forEach((r) => r.classList.remove('selected'));
            row.classList.add('selected');
            qs('#hh-selected-property', root).innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--accent-2);"></i> Selected: ${escapeHtml(property.title)}`;
            this.updateFeePreview(root);
          } else {
            console.error('Property not found with id:', id);
          }
        });
      });
    };

    const load = async (search = '') => {
      listEl.innerHTML = `<div class="loading-block" style="padding:20px;"><div class="spinner"></div></div>`;
      try {
        const { properties } = await Api.listProperties({ search });
        renderList(properties);
      } catch (err) {
        listEl.innerHTML = `<div class="field-hint" style="padding:12px;">${escapeHtml(err.message)}</div>`;
      }
    };

    let timer;
    searchEl.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => load(searchEl.value), 300);
    });

    await load();
  },

  wireExternalFeePreview(root) {
    const cityInput = qs('input[name="ext_city"]', root);
    const countryInput = qs('input[name="ext_country"]', root);
    let timer;
    [cityInput, countryInput].forEach((el) => {
      el.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.updateFeePreview(root), 350);
      });
    });
  },

  async updateFeePreview(root) {
    const amountEl = qs('#hh-fee-amount', root);
    const tierEl = qs('#hh-fee-tier', root);
    let city = '', country = '';

    if (this.activeSource === 'listed') {
      if (!this.selectedProperty) {
        amountEl.textContent = '—';
        tierEl.textContent = 'Pick a listing above to see the fee';
        return;
      }
      // ✅ Use the transformed location (may have been overridden)
      city = this.selectedProperty.location.city;
      country = this.selectedProperty.location.country;
    } else {
      city = qs('input[name="ext_city"]', root).value;
      country = qs('input[name="ext_country"]', root).value;
      if (!city) {
        amountEl.textContent = '—';
        tierEl.textContent = 'Enter a city to see the fee';
        return;
      }
    }

    try {
      const { fee, tier } = await Api.estimateHouseHuntFee(city, country);
      amountEl.textContent = fee !== null ? formatMoney(fee) : 'Custom quote';
      tierEl.textContent = tier;
    } catch (err) {
      amountEl.textContent = '—';
      tierEl.textContent = "Couldn't estimate the fee — you'll still get a quote after submitting.";
    }
  },

  wireSubmit(root) {
    const form = qs('#hh-form', root);
    const errEl = qs('#hh-error', root);

    const submit = async () => {
      errEl.classList.add('hidden');
      const fd = new FormData(form);
      
      // Validate required fields
      const preferredDate = fd.get('preferredDate');
      if (!preferredDate) {
        errEl.textContent = 'Please select a preferred visit date.';
        errEl.classList.remove('hidden');
        return;
      }

      const payload = { preferredDate, notes: fd.get('notes') || '' };

      // Gather details for WhatsApp
      let propertyName = '';
      let location = '';
      let feeDisplay = '';
      let sourceLabel = '';

      if (this.activeSource === 'listed') {
        // 🔥 Ensure a property is selected
        if (!this.selectedProperty || !this.selectedProperty.id) {
          errEl.textContent = 'Please select a Sabali listing from the list above.';
          errEl.classList.remove('hidden');
          console.error('No property selected or invalid property:', this.selectedProperty);
          return;
        }

        payload.source = 'listed';
        payload.propertyId = Number(this.selectedProperty.id); // Ensure it's a number

        propertyName = this.selectedProperty.title;
        location = `${this.selectedProperty.location.city}, ${this.selectedProperty.location.country}`;
        sourceLabel = 'Sabali Listing';

        // Get fee from the preview
        const feeAmountEl = qs('#hh-fee-amount');
        feeDisplay = feeAmountEl.textContent !== '—' ? feeAmountEl.textContent : 'Quote pending';

        console.log('Submitting listed house hunt:', payload); // Debug log

      } else {
        // External source
        const city = fd.get('ext_city');
        const country = fd.get('ext_country');
        const description = fd.get('ext_description');
        if (!city || !country || !description || !description.trim()) {
          errEl.textContent = 'City, country, and a short description are required.';
          errEl.classList.remove('hidden');
          return;
        }
        payload.source = 'external';
        payload.external = {
          title: fd.get('ext_title'),
          address: fd.get('ext_address'),
          city, country,
          sourceLink: fd.get('ext_link'),
          askingPrice: fd.get('ext_price') || null,
          contactInfo: fd.get('ext_contact'),
          description,
        };
        propertyName = fd.get('ext_title') || 'External property';
        location = `${city}, ${country}`;
        sourceLabel = 'External';
        const feeAmountEl = qs('#hh-fee-amount');
        feeDisplay = feeAmountEl.textContent !== '—' ? feeAmountEl.textContent : 'Custom quote';
      }

      try {
        const { houseHunt } = await Api.createHouseHunt(payload);
        this.showConfirmation(root, houseHunt);
        form.reset();
        this.selectedProperty = null;
        qs('#hh-selected-property', root).innerHTML = '';
        qsa('.picker-row', root).forEach((r) => r.classList.remove('selected'));
        this.updateFeePreview(root);

        // 🔥 Send WhatsApp message with the house hunt details
        const user = Auth.current;
        const customerName = user ? user.name : 'Guest';
        const notes = fd.get('notes') || 'None';

        // Build the WhatsApp message (URL-encoded)
        const message = `🏠 *New House Hunt Request*%0A%0A` +
          `👤 *Customer:* ${encodeURIComponent(customerName)}%0A` +
          `📌 *Property:* ${encodeURIComponent(propertyName)}%0A` +
          `📍 *Location:* ${encodeURIComponent(location)}%0A` +
          `📅 *Preferred Date:* ${encodeURIComponent(preferredDate)}%0A` +
          `💰 *Fee:* ${encodeURIComponent(feeDisplay)}%0A` +
          `📝 *Notes:* ${encodeURIComponent(notes)}%0A%0A` +
          `🔗 *Source:* ${encodeURIComponent(sourceLabel)}`;

        const whatsappUrl = `https://wa.me/254703717467?text=${message}`;
        window.open(whatsappUrl, '_blank');

        toast('House hunt request sent! WhatsApp will open with the details.', 'success');

      } catch (err) {
        console.error('House hunt submission error:', err);
        errEl.textContent = err.message || 'Something went wrong. Please try again.';
        errEl.classList.remove('hidden');
      }
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!Auth.isLoggedIn()) {
        openAuthModal('login', { onSuccess: () => { if (Auth.isCustomer()) submit(); else toast('Only customer accounts can request a house hunt.', 'error'); } });
        return;
      }
      if (!Auth.isCustomer()) {
        toast('Only customer accounts can request a house hunt.', 'error');
        return;
      }
      submit();
    });
  },

  showConfirmation(root, houseHunt) {
    const box = qs('#hh-confirmation', root);
    box.classList.remove('hidden');
    const feeText = houseHunt.fee !== null
      ? `a fee of ${formatMoney(houseHunt.fee)} (${houseHunt.feeTier})`
      : `a custom quote — we'll confirm the fee for this location within 24h`;
    box.innerHTML = `
      <div class="hh-report-box">
        <strong><i class="fa-solid fa-circle-check"></i> Request sent.</strong>
        A verified agent will be able to accept this for ${feeText}. Track its status any time from
        <button class="btn btn-ghost btn-sm" style="text-decoration:underline;padding:0;" id="hh-go-dashboard">your dashboard</button>.
      </div>`;
    qs('#hh-go-dashboard', box).addEventListener('click', () => {
      location.hash = '#/dashboard';
      Dashboard.activeTab = 'househunts';
    });
  },
};