/* =========================================================
   Sabali AI Concierge — preview mock
   In the real build, replace `mockReply()` with a fetch
   to POST /api/ai/chat (streaming).
   ========================================================= */

(function () {
  const state = {
    open: false,
    messages: [],       // { role, content, type, payload }
    waiting: false,
  };

  const SUGGESTIONS = [
    "Beach apartment in Diani under 12k/night",
    "Quiet villa for 2, walking distance to beach",
    "Family-friendly stay in Nairobi for 5 nights",
  ];

  const MOCK_PROPERTIES = [
    {
      id: "p1",
      title: "Diani Beach Apartment #4",
      city: "Diani",
      price: 11500,
      trust: "verified",
      img: "https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480615/househunting1_c0i7ge.jpg",
    },
    {
      id: "p2",
      title: "Galu Beach Villa",
      city: "Galu",
      price: 14000,
      trust: "verified",
      img: "https://res.cloudinary.com/tgvfx3bf/image/upload/v1785480615/househunting1_c0i7ge.jpg",
    },
  ];

  /* ---------- DOM injection ---------- */
  function inject() {
    if (document.getElementById("ai-launcher")) return;

    const launcher = document.createElement("button");
    launcher.id = "ai-launcher";
    launcher.className = "ai-launcher";
    launcher.setAttribute("aria-label", "Ask Sabali AI");
    launcher.innerHTML = `<i class="fa-solid fa-sparkles"></i>
      <span class="badge">AI</span>`;
    launcher.addEventListener("click", toggleDrawer);

    const backdrop = document.createElement("div");
    backdrop.id = "ai-backdrop";
    backdrop.className = "ai-backdrop";
    backdrop.addEventListener("click", closeDrawer);

    const drawer = document.createElement("aside");
    drawer.id = "ai-drawer";
    drawer.className = "ai-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-label", "Sabali AI Concierge");
    drawer.innerHTML = `
      <div class="ai-header">
        <div>
          <div class="title">Sabali Concierge</div>
          <div class="subtitle">Powered by AI · verified stays only</div>
        </div>
        <button class="close-btn" id="ai-close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="ai-messages" id="ai-messages"></div>
      <form class="ai-composer" id="ai-composer">
        <input
          type="text"
          id="ai-input"
          placeholder="Ask about a stay, area, or budget…"
          autocomplete="off"
        />
        <button type="submit" id="ai-send" aria-label="Send">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
      </form>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    document.getElementById("ai-close").addEventListener("click", closeDrawer);
    document.getElementById("ai-composer").addEventListener("submit", onSubmit);

    seedWelcome();
  }

  /* ---------- Open / close ---------- */
  function toggleDrawer() {
    state.open ? closeDrawer() : openDrawer();
  }
  function openDrawer() {
    state.open = true;
    document.getElementById("ai-drawer").classList.add("open");
    document.getElementById("ai-backdrop").classList.add("open");
    setTimeout(() => document.getElementById("ai-input").focus(), 320);
  }
  function closeDrawer() {
    state.open = false;
    document.getElementById("ai-drawer").classList.remove("open");
    document.getElementById("ai-backdrop").classList.remove("open");
  }

  /* ---------- Rendering ---------- */
  function seedWelcome() {
    pushAssistant(
      `<span class="opener">Karibu.</span> I can help you find a verified stay on Sabali — tell me the vibe, the area, and your budget.`
    );
  }

  function pushUser(text) {
    state.messages.push({ role: "user", content: text });
    render();
  }
  function pushAssistant(html) {
    state.messages.push({ role: "assistant", content: html, isHtml: true });
    render();
  }

  function render() {
    const box = document.getElementById("ai-messages");
    box.innerHTML = "";

    state.messages.forEach((m) => {
      const el = document.createElement("div");
      el.className = `ai-msg ${m.role}`;
      if (m.isHtml) el.innerHTML = m.content;
      else el.textContent = m.content;
      box.appendChild(el);

      if (m.cards) {
        m.cards.forEach((c) => box.appendChild(renderPropCard(c)));
      }
      if (m.handoff) {
        box.appendChild(renderHandoff(m.handoff));
      }
    });

    if (state.waiting) {
      const t = document.createElement("div");
      t.className = "ai-typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      box.appendChild(t);
    }

    box.scrollTop = box.scrollHeight;
  }

  function renderPropCard(p) {
    const el = document.createElement("div");
    el.className = "ai-prop-card";
    const badge =
      p.trust === "verified"
        ? `<span class="trust-badge"><i class="fa-solid fa-circle-check"></i> Verified</span>`
        : `<span class="trust-badge pending">Pending</span>`;

    el.innerHTML = `
      <img src="${p.img}" alt="" />
      <div class="info">
        <div class="title">${p.title}</div>
        <div class="meta">${p.city} ${badge}</div>
        <div class="price">KES ${p.price.toLocaleString()} / night</div>
      </div>
    `;
    el.addEventListener("click", () => {
      closeDrawer();
      if (window.location.hash !== `#/property/${p.id}`) {
        window.location.hash = `#/property/${p.id}`;
      }
    });
    return el;
  }

  function renderHandoff(h) {
    const el = document.createElement("div");
    el.className = "ai-handoff";
    el.innerHTML = `
      <div class="label">Ready to talk to a human</div>
      <div class="summary">${h.summary}</div>
      <button class="btn-handoff">Chat with ${h.agentName}</button>
    `;
    el.querySelector(".btn-handoff").addEventListener("click", () => {
      // In the real build: POST /api/ai/handoff → routes to agent chat
      alert(`In production, this would route you to ${h.agentName} with full context.`);
      closeDrawer();
    });
    return el;
  }

  /* ---------- Interaction ---------- */
  function onSubmit(e) {
    e.preventDefault();
    const input = document.getElementById("ai-input");
    const text = input.value.trim();
    if (!text || state.waiting) return;

    input.value = "";
    pushUser(text);
    state.waiting = true;
    render();

    // Simulated AI response — replace with real fetch in production
    setTimeout(() => {
      state.waiting = false;
      mockReply(text);
    }, 900);
  }

  function mockReply(userText) {
    const lower = userText.toLowerCase();

    // Beach / Diani / coastal intent
    if (lower.includes("beach") || lower.includes("diani") || lower.includes("galu")) {
      pushAssistant(
        `Here are two verified coastal stays — both within your budget.`
      );
      state.messages[state.messages.length - 1].cards = MOCK_PROPERTIES;
      render();

      state.waiting = true;
      render();
      setTimeout(() => {
        state.waiting = false;
        pushAssistant(
          `The <strong>Diani Beach Apartment #4</strong> is the better value — 94★ from 32 stays, verified agent, and 500m from the sand.`
        );
        state.messages[state.messages.length - 1].handoff = {
          agentName: "Amina (Verified Agent)",
          summary:
            "Guest looking for a quiet beach apartment in Diani, ~KES 12,000/night. Compared 2 verified stays. Leaning toward Diani Beach Apartment #4.",
        };
        render();
      }, 800);
      return;
    }

    // Family / kids
    if (lower.includes("family") || lower.includes("kid") || lower.includes("child")) {
      pushAssistant(
        `For family stays I filter for verified agents, low report counts, and properties with kid-friendly amenities.`
      );
      state.messages[state.messages.length - 1].cards = MOCK_PROPERTIES;
      render();
      return;
    }

    // Long-term
    if (lower.includes("long") || lower.includes("month") || lower.includes("rent")) {
      pushAssistant(
        `For long-term stays, Sabali has verified townhouses and condos. Tell me the city and monthly budget and I'll pull the top three.`
      );
      return;
    }

    // Default fallback
    pushAssistant(
      `Got it. To narrow it down — which area, how many guests, and what's your nightly budget?`
    );
    const chips = SUGGESTIONS.map(
      (s) => `<span class="trust-badge" style="cursor:pointer;margin-right:6px;">${s}</span>`
    ).join("");
    state.messages[state.messages.length - 1].content += `<div style="margin-top:10px;">${chips}</div>`;
    render();

    // Wire chips
    document.querySelectorAll("#ai-messages .trust-badge").forEach((el) => {
      el.addEventListener("click", () => {
        document.getElementById("ai-input").value = el.textContent.trim();
        document.getElementById("ai-composer").dispatchEvent(new Event("submit"));
      });
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", inject);
})();