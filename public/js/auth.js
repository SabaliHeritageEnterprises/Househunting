// Login / register modal + session bootstrapping. Exposes `Auth` globally
// with helpers the rest of the app (app.js, dashboard.js, properties.js)
// reads from to decide what to show.

const Auth = {
  current: null, // { id, name, email, role, verified, bio } | null

  init() {
    this.current = Session.user();
    this.renderNav();
  },

  isLoggedIn() { return !!this.current; },
  isAgent() { return this.current && this.current.role === 'agent'; },
  isAdmin() { return this.current && this.current.role === 'admin'; },
  isCustomer() { return this.current && this.current.role === 'customer'; },

  async login(email, password) {
    const { token, user } = await Api.login({ email, password });
    Session.set({ token, user });
    this.current = user;
    this.renderNav();
    return user;
  },

  async register(name, email, password, role) {
    const { token, user } = await Api.register({ name, email, password, role });
    Session.set({ token, user });
    this.current = user;
    this.renderNav();
    return user;
  },

  logout() {
    Session.clear();
    this.current = null;
    this.renderNav();
    toast('Signed out.', 'info');
    location.hash = '#/';
  },

  renderNav() {
    const slot = qs('#nav-auth-slot');
    if (!slot) return;
    if (this.current) {
      const initials = this.current.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
      slot.innerHTML = `
        <button class="nav-link" data-route="#/dashboard">Dashboard</button>
        <div style="display:flex;align-items:center;gap:8px;padding-left:6px;">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:var(--ink-950);display:grid;place-items:center;font-size:.78rem;font-weight:700;">${initials}</div>
          <button class="btn btn-ghost btn-sm" id="logout-btn">Sign out</button>
        </div>`;
      qs('#logout-btn', slot).addEventListener('click', () => this.logout());
    } else {
      slot.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="open-login">Sign in</button>
        <button class="btn btn-primary btn-sm" id="open-register">Get started</button>`;
      qs('#open-login', slot).addEventListener('click', () => openAuthModal('login'));
      qs('#open-register', slot).addEventListener('click', () => openAuthModal('register'));
    }
  },
};

function openAuthModal(mode = 'login', opts = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h2>${mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p class="modal-sub">${mode === 'login' ? 'Sign in to book stays or manage your listings.' : 'Join Sabali as a customer or an agent.'}</p>
      <div class="tab-row">
        <button class="tab-btn ${mode === 'login' ? 'active' : ''}" data-tab="login">Sign in</button>
        <button class="tab-btn ${mode === 'register' ? 'active' : ''}" data-tab="register">Register</button>
      </div>
      <div id="auth-error" class="form-error hidden"></div>

      <form id="login-form" class="${mode === 'login' ? '' : 'hidden'}">
        <div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@example.com" /></div>
        <div class="field"><label>Password</label><input type="password" name="password" required placeholder="••••••••" /></div>
        <button class="btn btn-primary btn-block" type="submit">Sign in</button>
        <p class="field-hint" style="margin-top:12px;">Try <strong>customer@example.com</strong> / customer123, or <strong>amina@coastalliving.africa</strong> / agent123.</p>
      </form>

      <form id="register-form" class="${mode === 'register' ? '' : 'hidden'}">
        <div class="field"><label>Full name</label><input type="text" name="name" required placeholder="Jane Wanjiru" /></div>
        <div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@example.com" /></div>
        <div class="field"><label>Password</label><input type="password" name="password" required minlength="6" placeholder="At least 6 characters" /></div>
        <div class="field">
          <label>I am a…</label>
          <div class="tab-row" style="margin-bottom:0;">
            <button type="button" class="tab-btn role-btn ${opts.role !== 'agent' ? 'active' : ''}" data-role="customer">Customer</button>
            <button type="button" class="tab-btn role-btn ${opts.role === 'agent' ? 'active' : ''}" data-role="agent">Agent</button>
          </div>
        </div>
        <input type="hidden" name="role" value="${opts.role === 'agent' ? 'agent' : 'customer'}" />
        <button class="btn btn-primary btn-block" type="submit">Create account</button>
        <p class="field-hint" style="margin-top:12px;">New agent accounts start unverified — an admin verifies you from the admin dashboard.</p>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.modal-close', overlay).addEventListener('click', close);

  qsa('.tab-btn[data-tab]', overlay).forEach((btn) => {
    btn.addEventListener('click', () => {
      qsa('.tab-btn[data-tab]', overlay).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const showLogin = btn.dataset.tab === 'login';
      qs('#login-form', overlay).classList.toggle('hidden', !showLogin);
      qs('#register-form', overlay).classList.toggle('hidden', showLogin);
      qs('#auth-error', overlay).classList.add('hidden');
    });
  });

  qsa('.role-btn', overlay).forEach((btn) => {
    btn.addEventListener('click', () => {
      qsa('.role-btn', overlay).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      qs('#register-form input[name="role"]', overlay).value = btn.dataset.role;
    });
  });

  function showError(msg) {
    const box = qs('#auth-error', overlay);
    box.textContent = msg;
    box.classList.remove('hidden');
  }

  qs('#login-form', overlay).addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Auth.login(fd.get('email'), fd.get('password'));
      toast(`Welcome back, ${Auth.current.name.split(' ')[0]}.`, 'success');
      close();
      if (typeof opts.onSuccess === 'function') opts.onSuccess();
    } catch (err) {
      showError(err.message);
    }
  });

  qs('#register-form', overlay).addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await Auth.register(fd.get('name'), fd.get('email'), fd.get('password'), fd.get('role'));
      toast(`Welcome to Sabali, ${Auth.current.name.split(' ')[0]}.`, 'success');
      close();
      if (typeof opts.onSuccess === 'function') opts.onSuccess();
    } catch (err) {
      showError(err.message);
    }
  });
}
