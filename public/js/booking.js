// Booking box shown on the property detail page, plus the "report a
// listing" modal. Booking history rendering for dashboards lives in
// dashboard.js, but both call the shared Api.createBooking/updateBooking.

const Booking = {
  renderBookingBox(mount, property) {
    const isShortLet = property.type === 'short_let';
    const blocked = property.bookedRanges
      .map((r) => `${formatDate(r.start)} – ${formatDate(r.end)}`)
      .join(', ');

    mount.innerHTML = `
      <div class="booking-box">
        <div class="booking-price">${formatMoney(property.price)} <span style="font-size:.8rem;color:var(--text-dim);font-family:var(--font-body);">/ ${property.priceUnit}</span></div>
        <form id="booking-form" style="margin-top:18px;">
          ${isShortLet ? `
            <div class="field-row">
              <div class="field"><label>Check-in</label><input type="date" name="checkIn" required /></div>
              <div class="field"><label>Check-out</label><input type="date" name="checkOut" required /></div>
            </div>
            ${blocked ? `<p class="field-hint">Unavailable: ${blocked}</p>` : ''}
          ` : `
            <div class="field"><label>Preferred viewing date &amp; time</label><input type="datetime-local" name="viewingDate" required /></div>
          `}
          <div class="field">
            <label>Guests</label>
            <input type="number" name="guests" min="1" max="${property.maxGuests}" value="1" required />
            <p class="field-hint">Sleeps up to ${property.maxGuests}.</p>
          </div>
          <div id="booking-total" class="field-hint" style="font-size:.85rem;margin-bottom:14px;"></div>
          <div id="booking-error" class="form-error hidden"></div>
          <button class="btn btn-primary btn-block" type="submit">
            ${isShortLet ? 'Request to book' : 'Request a viewing'}
          </button>
          <p class="field-hint" style="margin-top:10px;">You won't be charged yet — the host confirms availability first.</p>
        </form>
      </div>`;

    const form = qs('#booking-form', mount);
    const totalEl = qs('#booking-total', mount);
    const errEl = qs('#booking-error', mount);

    function updateTotal() {
      if (!isShortLet) { totalEl.textContent = `Reference monthly rent: ${formatMoney(property.price)}`; return; }
      const ci = form.checkIn.value, co = form.checkOut.value;
      if (ci && co && co > ci) {
        const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
        totalEl.textContent = `${nights} night${nights === 1 ? '' : 's'} × ${formatMoney(property.price)} = ${formatMoney(nights * property.price)}`;
      } else {
        totalEl.textContent = '';
      }
    }
    if (isShortLet) {
      form.checkIn.addEventListener('change', updateTotal);
      form.checkOut.addEventListener('change', updateTotal);
    } else {
      updateTotal();
    }

    async function submitBooking() {
      errEl.classList.add('hidden');
      const fd = new FormData(form);
      const payload = { propertyId: property.id, guests: fd.get('guests') };
      if (isShortLet) {
        payload.checkIn = fd.get('checkIn');
        payload.checkOut = fd.get('checkOut');
      } else {
        payload.viewingDate = fd.get('viewingDate');
      }

      // Gather details for WhatsApp
      const propertyTitle = property.title;
      const guestCount = fd.get('guests');
      let dateInfo = '';
      let totalPrice = property.price;
      if (isShortLet) {
        const checkIn = fd.get('checkIn');
        const checkOut = fd.get('checkOut');
        dateInfo = `${checkIn} → ${checkOut}`;
        if (checkIn && checkOut && checkOut > checkIn) {
          const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
          totalPrice = nights * property.price;
        }
      } else {
        const viewingDate = fd.get('viewingDate');
        dateInfo = viewingDate ? `Viewing: ${viewingDate}` : 'Viewing date not specified';
        totalPrice = property.price; // monthly rent reference
      }

      try {
        await Api.createBooking(payload);
        toast('Booking request sent — the host will confirm shortly.', 'success');

        // 🔥 Send WhatsApp message with booking details
        const user = Auth.current;
        const guestName = user ? user.name : 'Guest';
        const message = `🏠 *New Booking Request*%0A%0A` +
          `📌 *Property:* ${encodeURIComponent(propertyTitle)}%0A` +
          `👤 *Guest:* ${encodeURIComponent(guestName)}%0A` +
          `📅 *Dates:* ${encodeURIComponent(dateInfo)}%0A` +
          `👥 *Guests:* ${encodeURIComponent(guestCount)}%0A` +
          `💰 *Total:* ${encodeURIComponent(formatMoney(totalPrice))}%0A%0A` +
          `🔗 *Source:* Sabali platform`;

        const whatsappUrl = `https://wa.me/254703717467?text=${message}`;
        window.open(whatsappUrl, '_blank');

        location.hash = '#/dashboard';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!Auth.isLoggedIn()) {
        openAuthModal('login', { onSuccess: () => { if (Auth.isCustomer()) submitBooking(); else toast('Only customer accounts can book stays.', 'error'); } });
        return;
      }
      if (!Auth.isCustomer()) {
        toast('Only customer accounts can book stays. Sign in as a customer to continue.', 'error');
        return;
      }
      submitBooking();
    });
  },

  openReportModal(property) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" aria-label="Close">&times;</button>
        <h2>Report this listing</h2>
        <p class="modal-sub">Tell us what looks wrong about "${escapeHtml(property.title)}" — our team reviews every report.</p>
        <div id="report-error" class="form-error hidden"></div>
        <form id="report-form">
          <div class="field">
            <label>Reason</label>
            <textarea name="reason" required placeholder="e.g. the host asked me to pay outside the platform, or the photos don't match the address."></textarea>
          </div>
          <button class="btn btn-danger btn-block" type="submit">Submit report</button>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    qs('.modal-close', overlay).addEventListener('click', close);

    qs('#report-form', overlay).addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Auth.isLoggedIn()) {
        close();
        openAuthModal('login', { onSuccess: () => Booking.openReportModal(property) });
        return;
      }
      const fd = new FormData(e.target);
      try {
        await Api.reportProperty(property.id, fd.get('reason'));
        toast('Report submitted. Thank you for helping keep Sabali safe.', 'success');
        close();
      } catch (err) {
        const box = qs('#report-error', overlay);
        box.textContent = err.message;
        box.classList.remove('hidden');
      }
    });
  },
};