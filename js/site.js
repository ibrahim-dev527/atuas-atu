/* ============================================================
   ATUAS — Global site bootstrap (runs on every page)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Highlight the current page's nav link
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a[href]").forEach((link) => {
    const href = link.getAttribute("href").split("/").pop();
    if (href === path) link.setAttribute("aria-current", "page");
  });

  // Keep the WhatsApp button's number in sync with js/config.js
  const waNumber = window.ATUAS_CONFIG?.PRO_WHATSAPP_NUMBER;
  if (waNumber) {
    document.querySelectorAll("[data-whatsapp-fab]").forEach((link) => {
      const msg = "Hi, I have a question about ATUAS.";
      link.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
    });
  }
});
/* ============================================================
   ATUAS — Navigation
   Handles: hover/click dropdowns on desktop, accordion + slide-in
   panel on mobile, outside-click close, Escape to close, keyboard
   access via native <button> + aria-expanded.
   ============================================================ */

(function () {
  function initNavigation() {
    const nav = document.querySelector(".main-nav");
    const toggle = document.querySelector(".nav-toggle");
    const backdrop = document.querySelector(".nav-backdrop");
    if (!nav || !toggle) return;

    // Mark parent <li> elements that own a dropdown (works even without :has() support)
    nav.querySelectorAll(".dropdown").forEach((dd) => dd.closest("li")?.classList.add("has-dropdown"));
    const items = Array.from(nav.querySelectorAll("li.has-dropdown"));

    function closeAll(except) {
      items.forEach((li) => {
        if (li !== except) {
          li.classList.remove("open");
          const btn = li.querySelector(":scope > button");
          if (btn) btn.setAttribute("aria-expanded", "false");
        }
      });
    }

    function isMobile() {
      return window.matchMedia("(max-width: 860px)").matches;
    }

    items.forEach((li) => {
      const btn = li.querySelector(":scope > button");
      if (!btn) return;
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-haspopup", "true");

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !li.classList.contains("open");
        closeAll(willOpen ? li : null);
        li.classList.toggle("open", willOpen);
        btn.setAttribute("aria-expanded", String(willOpen));
      });

      // Desktop hover convenience (doesn't fight mobile accordion clicks)
      li.addEventListener("mouseenter", () => {
        if (!isMobile()) {
          closeAll(li);
          li.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
      li.addEventListener("mouseleave", () => {
        if (!isMobile()) {
          li.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });

    document.addEventListener("click", () => closeAll(null));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAll(null);
        closeMobileMenu();
      }
    });

    function openMobileMenu() {
      nav.classList.add("is-open");
      backdrop?.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
    function closeMobileMenu() {
      nav.classList.remove("is-open");
      backdrop?.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.contains("is-open");
      isOpen ? closeMobileMenu() : openMobileMenu();
    });
    backdrop?.addEventListener("click", closeMobileMenu);

    // Sticky header shadow on scroll
    const header = document.querySelector(".site-header");
    if (header) {
      window.addEventListener(
        "scroll",
        () => {
          header.style.boxShadow = window.scrollY > 8 ? "0 6px 20px rgba(16,30,59,0.08)" : "none";
        },
        { passive: true }
      );
    }
  }

  document.addEventListener("DOMContentLoaded", initNavigation);
})();
/* ============================================================
   ATUAS — Hero carousel
   Autoplay + manual controls + touch swipe + keyboard + a11y.
   Falls back to a static navy panel per slide if an image 404s,
   so a missing at1.jpg/at2.jpg/etc. never shows a broken-image icon.
   ============================================================ */

(function () {
  function initHero() {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;

    const slides = Array.from(hero.querySelectorAll(".hero-slide"));
    const dotsWrap = hero.querySelector(".hero-dots");
    const prevBtn = hero.querySelector("[data-hero-prev]");
    const nextBtn = hero.querySelector("[data-hero-next]");
    if (!slides.length) return;

    let current = slides.findIndex((s) => s.classList.contains("is-active"));
    if (current < 0) current = 0;
    let timer = null;
    const INTERVAL = 6000;

    // Broken image -> swap in the CSS gradient fallback, never a broken icon
    slides.forEach((slide) => {
      const img = slide.querySelector("img");
      if (!img) return;
      img.addEventListener("error", () => {
        img.remove();
        const fallback = document.createElement("div");
        fallback.className = "hero-fallback";
        slide.prepend(fallback);
      });
    });

    // Build dots
    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        if (i === current) dot.classList.add("is-active");
        dot.addEventListener("click", () => goTo(i, true));
        dotsWrap.appendChild(dot);
      });
    }

    function render() {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
      if (dotsWrap) {
        Array.from(dotsWrap.children).forEach((dot, i) => dot.classList.toggle("is-active", i === current));
      }
    }

    function goTo(index, userTriggered) {
      current = (index + slides.length) % slides.length;
      render();
      if (userTriggered) restart();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function start() {
      stop();
      timer = window.setInterval(next, INTERVAL);
    }
    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }
    function restart() { start(); }

    prevBtn?.addEventListener("click", () => goTo(current - 1, true));
    nextBtn?.addEventListener("click", () => goTo(current + 1, true));

    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", start);

    // Keyboard
    hero.setAttribute("tabindex", "0");
    hero.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") goTo(current + 1, true);
      if (e.key === "ArrowLeft") goTo(current - 1, true);
    });

    // Touch swipe
    let touchStartX = null;
    hero.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) (dx < 0 ? goTo(current + 1, true) : goTo(current - 1, true));
      touchStartX = null;
    });

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    render();
    if (!prefersReducedMotion) start();
  }

  document.addEventListener("DOMContentLoaded", initHero);
})();
/* ============================================================
   ATUAS — Dark mode toggle
   The actual "apply theme before paint" step lives as a tiny
   inline script in each page's <head> (avoids a flash of the
   wrong theme). This file only wires up the toggle button and
   keeps localStorage in sync.
   ============================================================ */

(function () {
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("atuas-theme", theme); } catch (e) {}
  }

  function initToggle() {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setTheme(currentTheme() === "dark" ? "light" : "dark");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initToggle);
})();
/* ============================================================
   ATUAS — Page carousel
   A lighter version of the homepage hero, used on inner pages.
   Swipe/touch, dots, autoplay, and a slow zoom on the active
   image (image fills the frame at 108% and eases down to 100%
   while it's showing, so nothing ever looks static).
   ============================================================ */

(function () {
  function initOne(root) {
    const slides = Array.from(root.querySelectorAll(".page-carousel-slide"));
    const dotsWrap = root.querySelector(".page-carousel-dots");
    if (!slides.length) return;

    let current = 0;
    let timer = null;

    slides.forEach((slide) => {
      const img = slide.querySelector("img");
      img?.addEventListener("error", () => {
        img.remove();
        const fallback = document.createElement("div");
        fallback.className = "page-carousel-fallback";
        slide.prepend(fallback);
      });
    });

    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Slide ${i + 1}`);
        if (i === 0) dot.classList.add("is-active");
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
      });
    }

    function render() {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
      if (dotsWrap) Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle("is-active", i === current));
    }
    function goTo(i) { current = (i + slides.length) % slides.length; render(); restart(); }
    function next() { goTo(current + 1); }
    function restart() { if (timer) clearInterval(timer); timer = setInterval(next, 5000); }

    let touchStartX = null;
    root.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
      touchStartX = null;
    });

    render();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) restart();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-page-carousel]").forEach(initOne);
  });
})();
/* ============================================================
   ATUAS — Welcome popup
   Shown once per browser (not on every page load, which would
   get old fast on a multi-page site) the first time someone
   lands on a page other than the homepage. Uses localStorage so
   it never reappears for the same visitor after they've seen it.
   ============================================================ */

(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const modal = document.querySelector("[data-welcome-modal]");
    if (!modal) return;

    let seen = true;
    try { seen = localStorage.getItem("atuas-welcome-seen") === "1"; } catch (e) {}
    if (seen) return;

    const hasLoader = !!document.querySelector("[data-loader]");
    window.setTimeout(() => modal.classList.add("is-open"), hasLoader ? 5200 : 1200); // loader only exists on the home page

    const close = () => {
      modal.classList.remove("is-open");
      try { localStorage.setItem("atuas-welcome-seen", "1"); } catch (e) {}
    };
    modal.querySelector("[data-welcome-close]")?.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  });
})();
/* ============================================================
   ATUAS — Animation behaviours
   Scroll-reveal, animated counters, the "Experience the ATUAS
   Spirit" call-and-response, and the loading screen.
   ============================================================ */

(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((t) => io.observe(t));
  }

  function initCounters() {
    const counters = document.querySelectorAll("[data-counter]");
    if (!counters.length) return;
    const animate = (el) => {
      const target = parseInt(el.dataset.counter, 10) || 0;
      if (prefersReducedMotion) { el.textContent = target; return; }
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 60));
      const tick = () => {
        current = Math.min(target, current + step);
        el.textContent = current;
        if (current < target) requestAnimationFrame(tick);
      };
      el.classList.add("count-animate");
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach((c) => io.observe(c));
    } else {
      counters.forEach(animate);
    }
  }

  // "Experience the ATUAS Spirit" call-and-response
  function initSpirit() {
    const btn = document.querySelector("[data-spirit-trigger]");
    const stage = document.querySelector("[data-spirit-stage]");
    if (!btn || !stage) return;

    const sequence = ["ATUAS", "True and fair", "ATUAS", "True and fair", "ATUAS", "Commitment is vital"];

    btn.addEventListener("click", () => {
      stage.innerHTML = "";
      btn.disabled = true;
      sequence.forEach((line, i) => {
        window.setTimeout(() => {
          stage.innerHTML = `<span>${line}</span>`;
          if (i === sequence.length - 1) window.setTimeout(() => (btn.disabled = false), 600);
        }, i * 650);
      });
    });
  }

  function initLoader() {
    const loader = document.querySelector("[data-loader]");
    if (!loader) return;
    // Home page only: the loader markup exists only in index.html, so inner
    // pages open instantly. Shows for a fixed 5 seconds so the animation plays out.
    window.setTimeout(() => loader.classList.add("is-hidden"), 5000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initCounters();
    initSpirit();
    initLoader();
  });
})();
/* ============================================================
   ATUAS — Chatbot widget
   Answers from a small local knowledge base of the site's own
   pages (no external AI call needed, so it works with zero
   backend setup). Every match links straight to the relevant
   page. When nothing matches well enough, it hands the visitor
   to the PRO's WhatsApp with a pre-filled message instead of
   guessing.
   ============================================================ */

(function () {
  const PRO_WHATSAPP_NUMBER = window.ATUAS_CONFIG?.PRO_WHATSAPP_NUMBER || "233554196068";
  const MAX_INPUT_LENGTH = 300;

  const GREETINGS = [
    { keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"], answer: "Hello! I'm the ATUAS assistant. Ask me about past questions, programmes, events, executives or anything else on the site." },
    { keywords: ["how are you", "how's it going", "how are things"], answer: "I'm doing well, thanks for asking! How can I help you with ATUAS today?" },
    { keywords: ["thank you", "thanks", "thank u"], answer: "You're welcome! Is there anything else you'd like to know?" },
    { keywords: ["who are you", "what are you", "your name"], answer: "I'm the ATUAS Assistant, here to help you find your way around the site." },
    { keywords: ["bye", "goodbye", "see you"], answer: "Goodbye! Feel free to come back anytime you have a question about ATUAS." },
  ];

  const KNOWLEDGE_BASE = [
    { keywords: ["president"], answer: "The current ATUAS President is H.E. Joseph Amissah.", link: "executives.html", label: "View all Executives" },
    { keywords: ["vice president", "vp"], answer: "The current Vice President is H.E. Jonathan Bruce.", link: "executives.html", label: "View all Executives" },
    { keywords: ["pro", "public relations"], answer: "The current P.R.O. is Hon. Ibrahim Mohammed Lotsu.", link: "executives.html", label: "View all Executives" },
    { keywords: ["secretary"], answer: "The current Secretary is Hon. Peace Teku.", link: "executives.html", label: "View all Executives" },
    { keywords: ["finance officer", "treasurer"], answer: "The current Finance Officer is Hon. Kpeglo Elliot.", link: "executives.html", label: "View all Executives" },
    { keywords: ["past question", "exam", "bat 204", "past paper"], answer: "You can search and filter past questions by programme, level, semester and year here.", link: "past-questions.html", label: "Open the Past Question Bank" },
    { keywords: ["programme", "program", "course", "hnd", "btech", "diploma", "msc"], answer: "All Accountancy programmes and their levels are listed here.", link: "programmes.html", label: "View Programmes" },
    { keywords: ["catalogue", "catalog", "course code"], answer: "The full course catalogue, filterable by programme and level, is here.", link: "courses.html", label: "Open the Course Catalogue" },
    { keywords: ["event detail", "event", "seminar", "gala", "dinner", "excursion", "atuas week", "orientation"], answer: "Upcoming and past ATUAS events, including details for each, are listed here.", link: "events.html", label: "View Events" },
    { keywords: ["executive", "leadership", "who is on the executive"], answer: "The current ATUAS executives are listed here.", link: "executives.html", label: "Meet the Executives" },
    { keywords: ["gallery", "photo", "picture", "video"], answer: "Photos and videos from ATUAS activities are here.", link: "gallery.html", label: "Open the Gallery" },
    { keywords: ["opportunity", "scholarship", "internship", "job", "icag", "competition"], answer: "ICAG opportunities, scholarships, internships and jobs are listed here.", link: "opportunities.html", label: "Open Opportunities" },
    { keywords: ["news", "announcement", "article"], answer: "Association news and announcements are here.", link: "news.html", label: "Read the News" },
    { keywords: ["contact", "reach", "email", "phone", "whatsapp number"], answer: "You can reach ATUAS directly here.", link: "contact.html", label: "Open Contact" },
    { keywords: ["constitution", "governance", "aims", "objectives"], answer: "ATUAS's aims, objectives and constitution are here.", link: "constitution.html", label: "Read the Constitution" },
    { keywords: ["faq", "frequently asked"], answer: "Common questions are answered here.", link: "faq.html", label: "View FAQs" },
    { keywords: ["download", "form", "publication"], answer: "Forms, guides and publications are available here.", link: "downloads.html", label: "Open Downloads" },
    { keywords: ["resource", "study material", "notes"], answer: "Study materials shared by the department and ATUAS are here.", link: "resources.html", label: "Open Study Materials" },
    { keywords: ["faculty", "hod", "lecturer", "head of department"], answer: "Department leadership and faculty are listed here.", link: "faculty.html", label: "View Faculty" },
    { keywords: ["face of atuas"], answer: "The Face of ATUAS showcase is here.", link: "face-of-atuas.html", label: "View Face of ATUAS" },
    { keywords: ["student life", "freshers", "calendar", "notice"], answer: "Student life, the freshers guide and academic calendar are here.", link: "students.html", label: "Open Student Life" },
    { keywords: ["about", "mission", "vision", "who is atuas", "what is atuas"], answer: "Everything about ATUAS, the national body and the ATU chapter, is here.", link: "about.html", label: "About ATUAS" },
  ];

  const QUICK_QUESTIONS = [
    { q: "How do I find past questions?", a: "Go to the Past Question Bank and pick your programme, level, semester and year, or search a course code directly.", link: "past-questions.html", label: "Open Past Question Bank" },
    { q: "Who is the current president?", a: "The current ATUAS President is H.E. Joseph Amissah.", link: "executives.html", label: "Meet the Executives" },
    { q: "Who is the PRO?", a: "The current P.R.O. is Hon. Ibrahim Mohammed Lotsu.", link: "executives.html", label: "Meet the Executives" },
    { q: "What events are coming up?", a: "Upcoming events including ATUAS Week, seminars, and the Football Gala are listed on the Events page.", link: "events.html", label: "View Events" },
    { q: "How do I contact ATUAS?", a: "Use the Contact page to send a message, or reach the PRO directly on WhatsApp using the button below.", link: "contact.html", label: "Open Contact" },
    { q: "What programmes does ATUAS cover?", a: "BTech Accounting and Finance Analytics, BTech Accounting Top Up, HND Accountancy, Diploma in Computerized Accounting, and two MSc programmes. Full details are on the Programmes page.", link: "programmes.html", label: "View Programmes" },
    { q: "What is the ATUAS motto?", a: "ATUAS's motto is \"Commitment is vital\", and the slogan is \"ATUAS, true and fair\".", link: "constitution.html", label: "Read the Constitution" },
    { q: "Who can run for President?", a: "A third-year HND student or third/fourth-year BTech student, with a minimum CGPA of 3.70 (HND), 4.00 (BTech), or 3.50 (Diploma).", link: "constitution.html", label: "Read the Constitution" },
  ];

  function whatsappLink(message) {
    return `https://wa.me/${PRO_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function findLocalMatch(text) {
    const lower = text.toLowerCase();
    const greeting = GREETINGS.find((entry) => entry.keywords.some((k) => lower.includes(k)));
    if (greeting) return greeting;
    return KNOWLEDGE_BASE.find((entry) => entry.keywords.some((k) => lower.includes(k)));
  }

  // Checks the admin-curated answers in Supabase (includes everything
  // seeded from the constitution, plus anything an admin has since
  // added from the Unanswered Questions screen). Falls through quietly
  // if Supabase isn't configured.
  async function findRemoteMatch(text) {
    if (!window.ATUAS?.fetchPublic) return null;
    const lower = text.toLowerCase();
    const { data } = await window.ATUAS.fetchPublic("chatbot_qa", { select: "keywords, answer, link, label" });
    if (!data || !data.length) return null;
    const hit = data.find((row) => (row.keywords || []).some((k) => lower.includes(String(k).toLowerCase())));
    if (!hit) return null;
    return { answer: hit.answer, link: hit.link, label: hit.label };
  }

  // Logs a question the bot couldn't answer so an admin can review it
  // and turn it into a permanent answer. Fire-and-forget: a logging
  // failure should never block the WhatsApp fallback from showing.
  async function logUnanswered(text) {
    const client = window.ATUAS?.getSupabaseClient?.();
    if (!client) return;
    try {
      await client.from("chatbot_unanswered").insert({ question: text });
    } catch (e) {
      console.error("[ATUAS] could not log unanswered question:", e);
    }
  }

  function initChatbot() {
    const fab = document.querySelector("[data-chat-fab]");
    const panel = document.querySelector("[data-chat-panel]");
    const body = document.querySelector("[data-chat-body]");
    const form = document.querySelector("[data-chat-form]");
    const input = document.querySelector("[data-chat-input]");
    const closeBtn = document.querySelector("[data-chat-close]");
    const quickWrap = document.querySelector("[data-chat-quick]");
    if (!fab || !panel || !form || !input || !body) return;

    let open = false;
    function toggle(force) {
      open = typeof force === "boolean" ? force : !open;
      panel.classList.toggle("is-open", open);
      if (open) input.focus();
    }
    fab.addEventListener("click", () => toggle());
    closeBtn?.addEventListener("click", () => toggle(false));

    function addBotHTML(html) {
      const msg = document.createElement("div");
      msg.className = "chat-msg bot";
      msg.innerHTML = html;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }
    function addUserText(text) {
      const msg = document.createElement("div");
      msg.className = "chat-msg user";
      msg.textContent = text;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    async function respondTo(text) {
      const local = findLocalMatch(text);
      if (local) {
        if (local.link) addBotHTML(`${local.answer} <br><a href="${local.link}">${local.label} →</a>`);
        else addBotHTML(local.answer);
        return;
      }

      addBotHTML(`<span data-typing>Thinking…</span>`);
      const typingNode = body.lastElementChild;
      const remote = await findRemoteMatch(text);
      typingNode.remove();

      if (remote) {
        if (remote.link) addBotHTML(`${remote.answer} <br><a href="${remote.link}">${remote.label} →</a>`);
        else addBotHTML(remote.answer);
        return;
      }

      logUnanswered(text);
      const waMsg = `Hi, I asked the ATUAS website assistant: "${text}" and it could not help. Can you assist me?`;
      addBotHTML(
        `I don't have a confirmed answer for that yet, so I've passed it on to the team. You can also ask the PRO directly on WhatsApp.<br>` +
        `<a href="${whatsappLink(waMsg)}" target="_blank" rel="noopener">Chat with the PRO on WhatsApp →</a>`
      );
    }

    if (quickWrap) {
      quickWrap.innerHTML = QUICK_QUESTIONS.map((q, i) => `<button type="button" data-quick-index="${i}">${q.q}</button>`).join("");
      quickWrap.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const q = QUICK_QUESTIONS[Number(btn.dataset.quickIndex)];
          addUserText(q.q);
          addBotHTML(`${q.a}<br><a href="${q.link}">${q.label} →</a>`);
        });
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = input.value.trim();
      if (!raw) return;
      const message = raw.slice(0, MAX_INPUT_LENGTH);
      addUserText(message);
      input.value = "";
      window.setTimeout(() => respondTo(message), 250);
    });
  }

  document.addEventListener("DOMContentLoaded", initChatbot);
})();
/* ============================================================
   ATUAS — Past Question Bank
   Cascading filters: Programme -> Level -> Semester -> Course ->
   Academic Year, plus free-text search. Reads from Supabase
   (programmes, courses, past_questions tables). If Supabase
   is not yet configured, falls back to a small demo dataset so
   the interface can be reviewed before the backend is wired up.
   ============================================================ */

(function () {
  const DEMO_MODE_NOTE =
    "Showing sample data. Connect Supabase (js/supabase.js) to load real past questions.";

  const DEMO_PROGRAMMES = [
    { id: "btech-afa", name: "BTech Accounting and Finance Analytics", levels: [100, 200, 300, 400] },
    { id: "btech-acct", name: "BTech Accounting (Top-Up)", levels: [300, 400] },
    { id: "hnd-acct", name: "HND Accountancy", levels: [100, 200, 300] },
    { id: "dip-comp-acct", name: "Diploma in Computerized Accounting", levels: [100, 200] },
  ];

  const DEMO_QUESTIONS = [
    { programme: "btech-afa", level: 200, semester: 2, course_code: "BAT 204", course_title: "Cost and Management Accounting", academic_year: "2024/2025" },
    { programme: "hnd-acct", level: 300, semester: 1, course_code: "ACC 301", course_title: "Auditing Principles", academic_year: "2023/2024" },
  ];

  function initPastQuestions() {
    const root = document.querySelector("[data-pq-root]");
    if (!root) return;

    const programmeSel = root.querySelector("[data-pq-programme]");
    const levelSel = root.querySelector("[data-pq-level]");
    const semesterSel = root.querySelector("[data-pq-semester]");
    const yearSel = root.querySelector("[data-pq-year]");
    const searchInput = root.querySelector("[data-pq-search]");
    const resultsWrap = root.querySelector("[data-pq-results]");
    const noteWrap = root.querySelector("[data-pq-note]");

    let programmes = [];
    let questions = [];

    async function loadData() {
      const client = window.ATUAS?.getSupabaseClient?.();
      if (!client) {
        programmes = DEMO_PROGRAMMES;
        questions = DEMO_QUESTIONS;
        if (noteWrap) noteWrap.textContent = DEMO_MODE_NOTE;
        return;
      }

      const { data: programmeRows, error: pErr } = await window.ATUAS.fetchPublic("programmes", {
        select: "id, name, programme_levels(level)",
        order: { column: "name", ascending: true },
      });
      const { data: pqRows, error: qErr } = await window.ATUAS.fetchPublic("past_questions", {
        select: "programme_id, level, semester, course_code, course_title, academic_year, file_path",
        filters: [["published", "eq", true]],
      });

      if (pErr || qErr || !programmeRows.length) {
        programmes = DEMO_PROGRAMMES;
        questions = DEMO_QUESTIONS;
        if (noteWrap) noteWrap.textContent = DEMO_MODE_NOTE;
      } else {
        programmes = programmeRows.map((p) => ({
          id: p.id,
          name: p.name,
          levels: (p.programme_levels || []).map((l) => l.level),
        }));
        questions = pqRows.map((q) => ({ ...q, programme: q.programme_id }));
        if (noteWrap) noteWrap.textContent = "";
      }
    }

    function populateProgrammes() {
      programmeSel.innerHTML = `<option value="">All programmes</option>` +
        programmes.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    }

    function populateLevels() {
      const selectedProgramme = programmes.find((p) => p.id === programmeSel.value);
      const levels = selectedProgramme ? selectedProgramme.levels : [...new Set(programmes.flatMap((p) => p.levels))];
      levelSel.innerHTML = `<option value="">All levels</option>` +
        levels.sort((a, b) => a - b).map((l) => `<option value="${l}">Level ${l}</option>`).join("");
    }

    function populateYears() {
      const years = [...new Set(questions.map((q) => q.academic_year))].sort().reverse();
      yearSel.innerHTML = `<option value="">All years</option>` +
        years.map((y) => `<option value="${y}">${y}</option>`).join("");
    }

    function renderResults() {
      const programme = programmeSel.value;
      const level = levelSel.value;
      const semester = semesterSel.value;
      const year = yearSel.value;
      const term = (searchInput.value || "").trim().toLowerCase();

      const filtered = questions.filter((q) => {
        if (programme && q.programme !== programme) return false;
        if (level && String(q.level) !== level) return false;
        if (semester && String(q.semester) !== semester) return false;
        if (year && q.academic_year !== year) return false;
        if (term) {
          const haystack = `${q.course_code} ${q.course_title} ${q.academic_year}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });

      if (!filtered.length) {
        resultsWrap.innerHTML = `
          <div class="pq-empty">
            <strong>No past questions found.</strong><br>
            Try changing the programme, level, semester or academic year.
          </div>`;
        return;
      }

      resultsWrap.innerHTML = filtered
        .map((q) => {
          const programmeName = programmes.find((p) => p.id === q.programme)?.name || "";
          return `
          <div class="pq-result">
            <div class="pq-meta">
              <strong>${q.course_code}: ${q.course_title}</strong>
              <span>${programmeName} · Level ${q.level} · Semester ${q.semester} · ${q.academic_year}</span>
            </div>
            <div class="pq-actions">
              <button class="btn btn--outline btn--sm" type="button" data-pq-view="${q.file_path || ""}">View</button>
              <button class="btn btn--primary btn--sm" type="button" data-pq-download="${q.file_path || ""}">Download</button>
            </div>
          </div>`;
        })
        .join("");
    }

    [programmeSel, levelSel, semesterSel, yearSel].forEach((el) => el?.addEventListener("change", renderResults));
    searchInput?.addEventListener("input", renderResults);
    programmeSel?.addEventListener("change", populateLevels);

    loadData().then(() => {
      populateProgrammes();
      populateLevels();
      populateYears();
      renderResults();
    });
  }

  document.addEventListener("DOMContentLoaded", initPastQuestions);
})();
/* ============================================================
   ATUAS — Course Catalogue
   Same demo-fallback pattern as past-questions.js: loads from
   Supabase (programmes + courses) when configured, otherwise
   shows a small sample so the UI can be reviewed immediately.
   ============================================================ */

(function () {
  const DEMO_MODE_NOTE = "Showing sample data. Connect Supabase (js/supabase.js) to load the real course catalogue.";

  const DEMO_PROGRAMMES = [
    { id: "btech-afa", name: "BTech Accounting and Finance Analytics", levels: [100, 200, 300, 400] },
    { id: "hnd-acct", name: "HND Accountancy", levels: [100, 200, 300] },
  ];
  const DEMO_COURSES = [
    { programme: "btech-afa", level: 200, semester: 2, course_code: "BAT 204", course_title: "Cost and Management Accounting" },
    { programme: "hnd-acct", level: 300, semester: 1, course_code: "ACC 301", course_title: "Auditing Principles" },
  ];

  function initCourses() {
    const programmeSel = document.querySelector("[data-course-programme]");
    if (!programmeSel) return;
    const levelSel = document.querySelector("[data-course-level]");
    const semesterSel = document.querySelector("[data-course-semester]");
    const searchInput = document.querySelector("[data-course-search]");
    const resultsWrap = document.querySelector("[data-course-results]");
    const noteWrap = document.querySelector("[data-course-note]");

    let programmes = [];
    let courses = [];

    async function loadData() {
      const client = window.ATUAS?.getSupabaseClient?.();
      if (!client) {
        programmes = DEMO_PROGRAMMES;
        courses = DEMO_COURSES;
        if (noteWrap) noteWrap.textContent = DEMO_MODE_NOTE;
        return;
      }
      const { data: programmeRows } = await window.ATUAS.fetchPublic("programmes", {
        select: "id, name, programme_levels(level)",
        order: { column: "name", ascending: true },
      });
      const { data: courseRows } = await window.ATUAS.fetchPublic("courses", {
        select: "programme_id, level, semester, course_code, course_title",
      });
      if (!programmeRows.length) {
        programmes = DEMO_PROGRAMMES;
        courses = DEMO_COURSES;
        if (noteWrap) noteWrap.textContent = DEMO_MODE_NOTE;
      } else {
        programmes = programmeRows.map((p) => ({ id: p.id, name: p.name, levels: (p.programme_levels || []).map((l) => l.level) }));
        courses = courseRows.map((c) => ({ ...c, programme: c.programme_id }));
        if (noteWrap) noteWrap.textContent = "";
      }
    }

    function populateProgrammes() {
      programmeSel.innerHTML = `<option value="">All programmes</option>` + programmes.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    }
    function populateLevels() {
      const selected = programmes.find((p) => p.id === programmeSel.value);
      const levels = selected ? selected.levels : [...new Set(programmes.flatMap((p) => p.levels))];
      levelSel.innerHTML = `<option value="">All levels</option>` + levels.sort((a, b) => a - b).map((l) => `<option value="${l}">Level ${l}</option>`).join("");
    }

    function render() {
      const programme = programmeSel.value, level = levelSel.value, semester = semesterSel.value;
      const term = (searchInput.value || "").trim().toLowerCase();
      const filtered = courses.filter((c) => {
        if (programme && c.programme !== programme) return false;
        if (level && String(c.level) !== level) return false;
        if (semester && String(c.semester) !== semester) return false;
        if (term && !`${c.course_code} ${c.course_title}`.toLowerCase().includes(term)) return false;
        return true;
      });
      if (!filtered.length) {
        resultsWrap.innerHTML = `<div class="pq-empty"><strong>No courses found.</strong><br>Try changing the programme, level or semester.</div>`;
        return;
      }
      resultsWrap.innerHTML = filtered.map((c) => {
        const programmeName = programmes.find((p) => p.id === c.programme)?.name || "";
        return `<div class="pq-result">
          <div class="pq-meta">
            <strong>${c.course_code}: ${c.course_title}</strong>
            <span>${programmeName} · Level ${c.level} · Semester ${c.semester}</span>
          </div>
          <a class="btn btn--outline btn--sm" href="past-questions.html"><span>Past Questions</span></a>
        </div>`;
      }).join("");
    }

    [levelSel, semesterSel].forEach((el) => el?.addEventListener("change", render));
    programmeSel?.addEventListener("change", () => { populateLevels(); render(); });
    searchInput?.addEventListener("input", render);

    loadData().then(() => { populateProgrammes(); populateLevels(); render(); });
  }

  document.addEventListener("DOMContentLoaded", initCourses);
})();
/* ============================================================
   ATUAS — Gallery
   Loads gallery_images (joined to gallery_albums for category)
   from Supabase, renders a filterable masonry grid, and wires
   a simple lightbox. Falls back to the static placeholder card
   already in gallery.html when there's no data yet.
   ============================================================ */

(function () {
  let allImages = [];

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function render(filter) {
    const grid = document.querySelector("[data-gallery-grid]");
    if (!grid) return;
    const items = filter === "all" ? allImages : allImages.filter((img) => img.category === filter);
    if (!items.length) {
      grid.innerHTML = `<div class="card" style="color:var(--ink-soft);">No images in this category yet.</div>`;
      return;
    }
    grid.innerHTML = items.map((img) => `
      <figure class="masonry-item" data-lightbox-trigger data-src="${img.image_path}">
        <img src="${img.image_path}" alt="${escapeHtml(img.caption || "")}" loading="lazy">
        ${img.caption ? `<figcaption class="cap">${escapeHtml(img.caption)}</figcaption>` : ""}
      </figure>
    `).join("");
  }

  function initTabs() {
    const tabs = document.querySelectorAll("[data-gallery-tabs] button");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        render(btn.dataset.filter);
      });
    });
  }

  function initLightbox() {
    const lightbox = document.querySelector("[data-lightbox]");
    const img = document.querySelector("[data-lightbox-img]");
    const closeBtn = document.querySelector("[data-lightbox-close]");
    if (!lightbox || !img) return;

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-lightbox-trigger]");
      if (!trigger) return;
      img.src = trigger.dataset.src;
      lightbox.classList.add("is-open");
    });
    function close() { lightbox.classList.remove("is-open"); img.src = ""; }
    closeBtn?.addEventListener("click", close);
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  async function loadImages() {
    if (!window.ATUAS?.fetchPublic) return;
    const { data } = await window.ATUAS.fetchPublic("gallery_images", {
      select: "image_path, caption, published, gallery_albums(category)",
      filters: [["published", "eq", true]],
      order: { column: "created_at", ascending: false },
      limit: 60,
    });
    if (!data.length) return; // keep the static placeholder
    allImages = data.map((row) => ({
      image_path: row.image_path,
      caption: row.caption,
      category: row.gallery_albums?.category || "Uncategorized",
    }));
    render("all");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initLightbox();
    loadImages();
  });
})();
/* ============================================================
   ATUAS — News listing
   Loads published announcements and blog posts from Supabase.
   Leaves the static "nothing published yet" placeholder in place
   when there's no data or Supabase isn't configured.
   ============================================================ */

(function () {
  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function loadAnnouncements() {
    const wrap = document.querySelector("[data-announcements-list]");
    if (!wrap || !window.ATUAS?.fetchPublic) return;
    const { data } = await window.ATUAS.fetchPublic("announcements", {
      filters: [["status", "eq", "published"]],
      order: { column: "created_at", ascending: false },
      limit: 8,
    });
    if (!data.length) return;
    wrap.innerHTML = data.map((a) => `
      <div class="card reveal is-visible" style="border-left:4px solid ${a.priority === "urgent" ? "var(--red)" : a.priority === "high" ? "var(--gold)" : "var(--line)"};">
        <strong style="font-family:var(--font-display);color:var(--navy);">${escapeHtml(a.title)}</strong>
        <p style="margin:.3rem 0 0;">${escapeHtml(a.description || "")}</p>
      </div>
    `).join("");
  }

  async function loadArticles() {
    const wrap = document.querySelector("[data-articles-list]");
    if (!wrap || !window.ATUAS?.fetchPublic) return;
    const { data } = await window.ATUAS.fetchPublic("blog_posts", {
      select: "title, slug, content, category_id, published_at",
      filters: [["status", "eq", "published"]],
      order: { column: "published_at", ascending: false },
      limit: 9,
    });
    if (!data.length) return;
    wrap.innerHTML = data.map((post) => `
      <a class="card reveal is-visible" href="article.html?slug=${encodeURIComponent(post.slug)}" style="display:block;">
        <h3 style="font-size:1.1rem;">${escapeHtml(post.title)}</h3>
        <p>${escapeHtml((post.content || "").slice(0, 120))}${post.content && post.content.length > 120 ? "…" : ""}</p>
        <span style="font-size:.82rem;color:var(--ink-soft);">${post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}</span>
      </a>
    `).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadAnnouncements();
    loadArticles();
  });
})();
/* ============================================================
   ATUAS — Opportunities Hub
   Loads active (non-expired) opportunities from Supabase.
   The RLS policy already restricts reads to status = 'active';
   this also hides anything past its deadline client-side as a
   second layer, in case an admin forgets to archive it.
   ============================================================ */

(function () {
  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function loadOpportunities() {
    const wrap = document.querySelector("[data-opportunities-list]");
    if (!wrap || !window.ATUAS?.fetchPublic) return;

    const { data } = await window.ATUAS.fetchPublic("opportunities", {
      filters: [["status", "eq", "active"]],
      order: { column: "date_posted", ascending: false },
      limit: 30,
    });

    const today = new Date().toISOString().slice(0, 10);
    const current = data.filter((o) => !o.deadline || o.deadline >= today);
    if (!current.length) return; // keep the static placeholder

    wrap.innerHTML = current.map((o) => `
      <article class="card reveal is-visible">
        <span class="chip">${escapeHtml(o.category || "Opportunity")}</span>
        <h3 style="font-size:1.1rem;margin-top:.6rem;">${escapeHtml(o.title)}</h3>
        <p style="font-size:.88rem;color:var(--ink-soft);margin:0 0 .5rem;">${escapeHtml(o.organization || "")}</p>
        <p>${escapeHtml(o.description || "")}</p>
        ${o.eligibility ? `<p style="font-size:.85rem;"><strong>Eligibility:</strong> ${escapeHtml(o.eligibility)}</p>` : ""}
        ${o.deadline ? `<p style="font-size:.85rem;color:var(--red);font-weight:600;">Deadline: ${new Date(o.deadline).toLocaleDateString()}</p>` : ""}
        ${o.application_url ? `<a class="btn btn--primary btn--sm" href="${o.application_url}" target="_blank" rel="noopener"><span>Apply</span></a>` : ""}
      </article>
    `).join("");
  }

  document.addEventListener("DOMContentLoaded", loadOpportunities);
})();
