/* ============================================================
   ATUAS — Supabase client bootstrap
   PUBLIC anon key only. NEVER put the service-role key here,
   in any HTML file, or in a public repo. See README.md and
   SECURITY.md for the full setup and threat model.
   ============================================================ */

// These values come from js/config.js, which is loaded before this file
// on every page. Edit config.js, not this file, to connect Supabase.
const SUPABASE_URL = window.ATUAS_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.ATUAS_CONFIG?.SUPABASE_ANON_KEY;
const CONFIG_IS_PLACEHOLDER = !SUPABASE_URL || SUPABASE_URL.includes("YOUR-PROJECT-REF");

let supabaseClient = null;

/**
 * Lazily creates a single shared Supabase client for the whole site.
 * Loaded via the Supabase CDN script tag (see index.html <head>).
 */
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (CONFIG_IS_PLACEHOLDER) {
    console.warn("[ATUAS] Supabase isn't connected yet. Edit js/config.js with your project URL and anon key.");
    return null;
  }

  if (typeof window.supabase === "undefined") {
    console.warn(
      "[ATUAS] Supabase JS library not loaded yet. Add the CDN <script> tag before supabase.js."
    );
    return null;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

/**
 * Generic, defensive fetch helper for public read-only content.
 * Every table queried here MUST have an RLS policy that only allows
 * reading rows where published = true (see supabase/schema.sql).
 */
async function fetchPublic(table, { select = "*", filters = [], order = null, limit = null } = {}) {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: "Supabase not configured yet." };

  let query = client.from(table).select(select);
  filters.forEach(([column, operator, value]) => {
    query = query[operator](column, value);
  });
  if (order) query = query.order(order.column, { ascending: !!order.ascending });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error(`[ATUAS] fetchPublic(${table}) failed:`, error.message);
    return { data: [], error: error.message };
  }
  return { data: data || [], error: null };
}

/**
 * Resolves a stored file reference into a URL that can actually be used
 * in an <a href> or <iframe src>. Public-bucket files are already stored
 * as full URLs and pass through unchanged. Private-bucket files (past
 * questions, documents) are stored as "bucket:path" and need a short-lived
 * signed URL generated on the spot, since the bucket itself has no public
 * read access.
 */
async function resolveFileUrl(rawValue) {
  if (!rawValue) return null;
  const match = /^([a-z-]+):(.+)$/.exec(rawValue);
  if (!match) return rawValue; // already a plain public URL
  const [, bucket, path] = match;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) {
    console.error("[ATUAS] could not sign URL:", error.message);
    return null;
  }
  return data.signedUrl;
}

window.ATUAS = window.ATUAS || {};
window.ATUAS.getSupabaseClient = getSupabaseClient;
window.ATUAS.fetchPublic = fetchPublic;
window.ATUAS.resolveFileUrl = resolveFileUrl;
