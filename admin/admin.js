/* ============================================================
   ATUAS — Admin engine
   Two responsibilities:
   1. requireAuth() — guards every admin page. This is a UX
      convenience only; the real enforcement is Postgres RLS
      (see supabase/schema.sql), so even if this check were
      bypassed, unauthorized writes would still be rejected
      server-side.
   2. AdminCRUD.init(config) — a small generic table+modal editor
      so each admin page (past-questions, events, news, gallery,
      executives, opportunities, announcements, resources) only
      has to declare its fields, not rebuild a form every time.
   ============================================================ */

window.AdminCRUD = (function () {
  let currentUser = null;
  let currentProfile = null;

  async function requireAuth() {
    const client = window.ATUAS?.getSupabaseClient?.();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
      window.location.href = "login.html";
      return null;
    }
    currentUser = session.user;
    const { data: profile } = await client.from("profiles").select("full_name, role").eq("id", currentUser.id).single();
    currentProfile = profile;
    if (!profile?.role) {
      // Authenticated but not an admin — RLS would block writes anyway, but
      // send them back to a friendly page rather than an empty dashboard.
      alert("Your account isn't set up with an admin role yet. Contact the Super Admin.");
      await client.auth.signOut();
      window.location.href = "login.html";
      return null;
    }
    const nameEl = document.querySelector("[data-admin-name]");
    if (nameEl) nameEl.textContent = profile.full_name || currentUser.email;
    const roleEl = document.querySelector("[data-admin-role]");
    if (roleEl) roleEl.textContent = profile.role.replace("_", " ");
    return { user: currentUser, profile };
  }

  function initLogout() {
    document.querySelectorAll("[data-admin-logout]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const client = window.ATUAS?.getSupabaseClient?.();
        await client?.auth.signOut();
        window.location.href = "login.html";
      });
    });
  }

  async function logAudit(action, resourceType, resourceId, metadata) {
    const client = window.ATUAS?.getSupabaseClient?.();
    if (!client || !currentUser) return;
    await client.from("audit_logs").insert({
      user_id: currentUser.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      metadata: metadata || {},
    });
  }

  function escapeHtml(str) {
    return (str ?? "").toString().replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fieldInput(field, value) {
    const val = value ?? field.default ?? "";
    if (field.type === "image") {
      // Two ways to fill this field: pick a file from the device (uploaded
      // straight to the named Supabase Storage bucket), or type/paste a path
      // directly. The text input always wins if both are filled in.
      return `
        <input type="file" accept="image/*" data-image-file="${field.key}" data-bucket="${field.bucket || "gallery"}" style="width:100%;margin-bottom:.4rem;">
        <input type="text" name="${field.key}" value="${escapeHtml(val)}" placeholder="Or paste a file path/URL directly" style="width:100%;padding:.7em;border:1.5px solid var(--line);border-radius:var(--radius-s);font-family:var(--font-body);">
        <p style="font-size:.78rem;color:var(--ink-soft);margin:.3rem 0 0;">Uploading a file here fills the path in automatically once you save.</p>
      `;
    }
    if (field.type === "file") {
      return `
        <input type="file" accept="${field.accept || ".pdf"}" data-image-file="${field.key}" data-bucket="${field.bucket || "documents"}" style="width:100%;margin-bottom:.4rem;">
        <input type="text" name="${field.key}" value="${escapeHtml(val)}" placeholder="Or paste a file path/URL directly" style="width:100%;padding:.7em;border:1.5px solid var(--line);border-radius:var(--radius-s);font-family:var(--font-body);">
        <p style="font-size:.78rem;color:var(--ink-soft);margin:.3rem 0 0;">PDF only, up to 50MB. Uploading a file here fills the path in automatically once you save.</p>
      `;
    }
    if (field.type === "taglist") {
      const display = Array.isArray(val) ? val.join(", ") : (val || "");
      return `<input type="text" name="${field.key}" value="${escapeHtml(display)}" placeholder="${field.placeholder || "comma, separated, keywords"}" style="width:100%;padding:.7em;border:1.5px solid var(--line);border-radius:var(--radius-s);font-family:var(--font-body);">`;
    }
    if (field.type === "textarea") {
      return `<textarea name="${field.key}" rows="4" style="width:100%;padding:.7em;border:1.5px solid var(--line);border-radius:var(--radius-s);font-family:var(--font-body);">${escapeHtml(val)}</textarea>`;
    }
    if (field.type === "select") {
      const opts = field.options.map((o) => `<option value="${o.value}" ${o.value === val ? "selected" : ""}>${o.label}</option>`).join("");
      return `<select name="${field.key}" style="width:100%;padding:.7em;border:1.5px solid var(--line);border-radius:var(--radius-s);">${opts}</select>`;
    }
    if (field.type === "checkbox") {
      return `<input type="checkbox" name="${field.key}" ${val ? "checked" : ""} style="width:auto;">`;
    }
    return `<input type="${field.type || "text"}" name="${field.key}" value="${escapeHtml(val)}" style="width:100%;padding:.7em;border:1.5px solid var(--line);border-radius:var(--radius-s);font-family:var(--font-body);">`;
  }

  function buildModal(config) {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal" style="width:min(560px,94vw);padding:1.6rem;">
        <h3 style="margin-top:0;" data-modal-title>New entry</h3>
        <form data-modal-form style="display:grid;gap:.9rem;">
          ${config.fields.map((f) => `
            <label style="font-size:.85rem;font-weight:700;color:var(--navy);display:block;">
              ${f.label}
              <div style="margin-top:.3rem;">${fieldInput(f)}</div>
            </label>
          `).join("")}
          <div style="display:flex;gap:.7rem;justify-content:flex-end;margin-top:.5rem;">
            <button type="button" class="btn btn--outline btn--sm" data-modal-cancel><span>Cancel</span></button>
            <button type="submit" class="btn btn--primary btn--sm"><span>Save</span></button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function init(config) {
    // config: { table, title, columns:[{key,label}], fields:[{key,label,type,options,default}],
    //           select, filters, order, deletable=true }
    const tableEl = document.querySelector(config.tableSelector || "[data-admin-table]");
    const addBtn = document.querySelector(config.addButtonSelector || "[data-admin-add]");
    if (!tableEl) return;

    const modal = buildModal(config);
    const form = modal.querySelector("[data-modal-form]");
    const modalTitle = modal.querySelector("[data-modal-title]");
    let editingId = null;

    function closeModal() { modal.classList.remove("is-open"); form.reset(); editingId = null; }
    modal.querySelector("[data-modal-cancel]").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    function openModal(row) {
      editingId = row ? row[config.primaryKey || "id"] : null;
      modalTitle.textContent = row ? `Edit ${config.title}` : `New ${config.title}`;
      config.fields.forEach((f) => {
        const el = form.querySelector(`[name="${f.key}"]`);
        if (!el) return;
        const val = row ? row[f.key] : (f.default ?? "");
        if (f.type === "checkbox") el.checked = !!val;
        else if (f.type === "taglist") el.value = Array.isArray(val) ? val.join(", ") : (val ?? "");
        else el.value = val ?? "";
      });
      modal.classList.add("is-open");
    }
    addBtn?.addEventListener("click", () => openModal(null));

    async function loadRows() {
      const client = window.ATUAS?.getSupabaseClient?.();
      if (!client) {
        tableEl.innerHTML = `<tr><td colspan="${config.columns.length + 1}">Connect Supabase in js/supabase.js to manage content.</td></tr>`;
        return;
      }
      let query = client.from(config.table).select(config.select || "*");
      (config.filters || []).forEach(([col, op, val]) => { query = query[op](col, val); });
      if (config.order) query = query.order(config.order.column, { ascending: !!config.order.ascending });
      const { data, error } = await query;
      if (error) {
        tableEl.innerHTML = `<tr><td colspan="${config.columns.length + 1}">Couldn't load data: ${escapeHtml(error.message)}</td></tr>`;
        return;
      }
      if (!data.length) {
        tableEl.innerHTML = `<tr><td colspan="${config.columns.length + 1}">No entries yet, click "New ${config.title}" to add one.</td></tr>`;
        return;
      }
      tableEl.innerHTML = data.map((row) => `
        <tr data-row-id="${row[config.primaryKey || "id"]}">
          ${config.columns.map((c) => `<td>${c.render ? c.render(row) : escapeHtml(row[c.key])}</td>`).join("")}
          <td style="white-space:nowrap;">
            <button type="button" class="btn btn--outline btn--sm" data-row-edit><span>Edit</span></button>
            ${config.deletable !== false ? `<button type="button" class="btn btn--outline btn--sm" data-row-delete style="color:var(--red);border-color:var(--red);"><span>Delete</span></button>` : ""}
          </td>
        </tr>
      `).join("");

      tableEl.querySelectorAll("[data-row-edit]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("tr").dataset.rowId;
          const row = data.find((r) => String(r[config.primaryKey || "id"]) === id);
          openModal(row);
        });
      });
      tableEl.querySelectorAll("[data-row-delete]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!confirm(`Delete this ${config.title.toLowerCase()}? This can't be undone.`)) return;
          const id = btn.closest("tr").dataset.rowId;
          const client = window.ATUAS.getSupabaseClient();
          const { error } = await client.from(config.table).delete().eq(config.primaryKey || "id", id);
          if (error) { alert("Delete failed: " + error.message); return; }
          await logAudit(`deleted_${config.table}`, config.table, id);
          loadRows();
        });
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const client = window.ATUAS?.getSupabaseClient?.();
      if (!client) return;

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.querySelector("span").textContent = "Saving…";

      // Handle any picked files first: upload to the field's bucket and
      // use the resulting path in place of whatever was typed manually.
      for (const f of config.fields) {
        if (f.type !== "image" && f.type !== "file") continue;
        const fileInput = form.querySelector(`[data-image-file="${f.key}"]`);
        const file = fileInput?.files?.[0];
        if (!file) continue;
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name} is over the 50MB limit. Choose a smaller file.`);
          submitBtn.disabled = false;
          submitBtn.querySelector("span").textContent = "Save";
          return;
        }
        const bucket = f.bucket || "gallery";
        const isPrivateBucket = bucket === "past-questions" || bucket === "documents";
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const { data: uploaded, error: uploadError } = await client.storage.from(bucket).upload(path, file, { upsert: false });
        if (uploadError) {
          alert(`Upload failed: ${uploadError.message}`);
          submitBtn.disabled = false;
          submitBtn.querySelector("span").textContent = "Save";
          return;
        }
        const textInput = form.querySelector(`[name="${f.key}"]`);
        if (textInput) {
          if (isPrivateBucket) {
            // Store bucket:path, not a public URL. Private buckets need a
            // signed URL generated at view time, not a permanent public link.
            textInput.value = `${bucket}:${uploaded.path}`;
          } else {
            const { data: urlData } = client.storage.from(bucket).getPublicUrl(uploaded.path);
            textInput.value = urlData.publicUrl;
          }
        }
      }

      const payload = {};
      config.fields.forEach((f) => {
        const el = form.querySelector(`[name="${f.key}"]`);
        if (!el) return;
        if (f.type === "checkbox") payload[f.key] = el.checked;
        else if (f.type === "taglist") payload[f.key] = el.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        else payload[f.key] = el.value === "" ? null : el.value;
      });
      if (config.beforeSave) Object.assign(payload, config.beforeSave(payload, editingId));

      let error;
      if (editingId) {
        ({ error } = await client.from(config.table).update(payload).eq(config.primaryKey || "id", editingId));
        if (!error) await logAudit(`updated_${config.table}`, config.table, editingId, payload);
      } else {
        ({ error } = await client.from(config.table).insert(payload));
        if (!error) await logAudit(`created_${config.table}`, config.table, null, payload);
      }
      submitBtn.disabled = false;
      submitBtn.querySelector("span").textContent = "Save";
      if (error) { alert("Save failed: " + error.message); return; }
      closeModal();
      loadRows();
    });

    loadRows();
  }

  // Powers the single-page admin.html: each sidebar link is a tab that
  // shows its matching [data-admin-view] section and lazily runs that
  // tab's setup function the first time it's opened (so we're not
  // firing nine Supabase queries on every page load).
  function initTabs(tabInitializers) {
    const initialized = new Set();

    function showTab(name) {
      if (!document.querySelector(`[data-admin-view="${name}"]`)) name = "dashboard";
      document.querySelectorAll("[data-admin-view]").forEach((el) => {
        el.hidden = el.dataset.adminView !== name;
      });
      document.querySelectorAll("[data-admin-tab]").forEach((el) => {
        if (el.dataset.adminTab === name) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      });
      if (!initialized.has(name) && tabInitializers[name]) {
        tabInitializers[name]();
        initialized.add(name);
      }
      if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
    }

    document.querySelectorAll("[data-admin-tab]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        showTab(link.dataset.adminTab);
      });
    });

    showTab((location.hash || "#dashboard").slice(1));
  }

  return { requireAuth, initLogout, init, initTabs, logAudit, escapeHtml };
})();

document.addEventListener("DOMContentLoaded", async () => {
  await window.AdminCRUD.requireAuth();
  window.AdminCRUD.initLogout();
});
