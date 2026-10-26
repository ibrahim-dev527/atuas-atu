/* ============================================================
   ATUAS — Editable content, live home feeds, visitor analytics
   1. Overrides [data-content-text], [data-content-paras] and
      [data-content-img] from the site_content table (edited in
      Admin -> Page Content). The text already in the HTML is the
      fallback, so the site works before Supabase is connected.
   2. Fills the home page news and events from the database.
   3. Logs one page view per page load (public pages only).
   ============================================================ */
(function () {
  const A = () => window.ATUAS || {};
  const esc = (s) => (s ?? "").toString().replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Remember image slots now, before a missing file's onerror swaps them out
  const imgSlots = Array.from(document.querySelectorAll("img[data-content-img]")).map((img) => ({
    key: img.dataset.contentImg, parent: img.parentElement, alt: img.getAttribute("alt") || "",
  }));

  async function applyContent() {
    if (!A().fetchPublic) return;
    const { data } = await A().fetchPublic("site_content", { select: "key,value" });
    const map = {};
    (data || []).forEach((r) => { if (r.value && r.value.trim()) map[r.key] = r.value; });
    document.querySelectorAll("[data-content-text]").forEach((el) => {
      const v = map[el.dataset.contentText]; if (v) el.textContent = v;
    });
    document.querySelectorAll("[data-content-paras]").forEach((el) => {
      const v = map[el.dataset.contentParas];
      if (v) el.innerHTML = v.split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("");
    });
    imgSlots.forEach((slot) => {
      const v = map[slot.key]; if (!v || !slot.parent) return;
      slot.parent.classList.remove("is-empty");
      slot.parent.innerHTML = `<img src="${esc(v)}" alt="${esc(slot.alt)}" loading="lazy">`;
    });
  }

  async function homeFeeds() {
    if (!A().fetchPublic) return;
    const news = document.querySelector("[data-home-news]");
    if (news) {
      const { data } = await A().fetchPublic("blog_posts", {
        select: "title, slug, content, published_at", filters: [["status", "eq", "published"]],
        order: { column: "published_at", ascending: false }, limit: 3,
      });
      if (data.length) news.innerHTML = data.map((p) => `
        <a class="card reveal is-visible" href="article.html?slug=${encodeURIComponent(p.slug)}" style="display:block;">
          <h3 style="font-size:1.1rem;">${esc(p.title)}</h3>
          <p>${esc((p.content || "").slice(0, 130))}${(p.content || "").length > 130 ? "…" : ""}</p>
        </a>`).join("");
    }
    const ev = document.querySelector("[data-events-preview]");
    if (ev) {
      const { data } = await A().fetchPublic("events", {
        filters: [["published", "eq", true], ["starts_at", "gte", new Date().toISOString()]],
        order: { column: "starts_at", ascending: true }, limit: 3,
      });
      if (data.length) ev.innerHTML = data.map((e) => `
        <div class="card reveal is-visible" style="background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);">
          <h3 style="font-size:1.1rem;color:var(--white);">${esc(e.title)}</h3>
          <p style="color:rgba(255,255,255,.75);">${e.starts_at ? new Date(e.starts_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : ""}${e.location ? " · " + esc(e.location) : ""}</p>
        </div>`).join("");
    }
  }

  function trackView() {
    if (location.pathname.includes("/admin/")) return;
    const client = A().getSupabaseClient?.();
    if (!client) return;
    let vid = null;
    try {
      vid = localStorage.getItem("atuas-vid");
      if (!vid) {
        vid = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2));
        localStorage.setItem("atuas-vid", vid);
      }
    } catch (e) {}
    let ref = null;
    try { if (document.referrer) { const h = new URL(document.referrer).hostname; if (h !== location.hostname) ref = h; } } catch (e) {}
    const path = location.pathname.split("/").pop() || "index.html";
    client.from("page_views").insert({ path, visitor_id: vid, referrer: ref }).then(() => {}, () => {});
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Supabase CDN script is deferred, so wait one tick for it
    window.setTimeout(() => { applyContent(); homeFeeds(); trackView(); }, 50);
  });
})();
