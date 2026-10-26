# ATUAS — Security Architecture & Checklist

No production website can be guaranteed 100% unhackable. This document describes the defense-in-depth approach used here and the checks to run before and after each deployment.

## 1. Secrets

- Only the Supabase **anon** key and project URL are ever shipped to the browser, and they live in exactly one file: `js/config.js`. Every other file reads from there rather than declaring its own copy.
- The **service_role** key is never used in any HTML/JS file, never committed to the repo, and never placed in a public environment variable. It belongs only inside Supabase Edge Function secrets or a trusted backend.
- The chatbot currently answers from a small built in knowledge base in `js/site.js`, no external AI provider or key is involved. If an AI provider is added later, its key must live only in a Supabase Edge Function secret, never in `js/site.js` or any frontend file.

## 2. Authentication & authorization

- Admin login uses Supabase Auth (email/password), with password reset supported.
- Enable email confirmation and, where possible, MFA in Supabase Auth settings.
- Roles (`super_admin`, `president`, `pro`, `academic_admin`, `editor`) are stored in `public.profiles.role` — a database column, not a frontend flag.
- **Every** privileged table uses Row Level Security policies that check the caller's role via `has_role()`/`is_admin()` (`supabase/schema.sql`). Hiding an admin button in the UI is never treated as a security control by itself.
- Admin pages should check `auth.getSession()` on load and redirect to `login.html` if absent; the real enforcement is server-side (RLS + Edge Functions), so a bypassed frontend check cannot expose data.

## 3. Common attack surfaces

| Threat | Mitigation |
|---|---|
| SQL injection | All queries go through the Supabase client library (parameterized) — no raw string-built SQL anywhere in the frontend. |
| XSS | User-supplied text (contact form, event registration) is inserted via `textContent`/parameterized queries, not `innerHTML`, wherever it originates from user input. Sanitize any rich-text blog content server-side before storing. |
| CSRF | Supabase Auth uses bearer tokens, not ambient cookies for API calls, which removes classic CSRF risk on API requests. |
| IDOR | RLS policies scope every row to what the caller is allowed to see/edit, independent of what ID is requested. |
| Privilege escalation | Role changes only allowed via the `super_admin`-only policy on `profiles`; no user can edit their own role. |
| Brute force / credential stuffing | Enable Supabase Auth rate limiting; consider CAPTCHA on `admin/login.html` for production. |
| Malicious uploads | Client-side validation (file type via the `accept` attribute, a 50MB size cap enforced in `admin/admin.js`) is a UX convenience only. Before launch, add a Storage-level file size limit and allowed MIME type list in the Supabase dashboard for each bucket (Storage settings), since a browser check can always be bypassed. Only PDF for past questions and documents; JPG/JPEG/PNG/WEBP for other images. Uploaded filenames are rewritten to a timestamp-prefixed, sanitized version rather than trusting the original filename. |
| API abuse / chatbot abuse | Chatbot input is capped at 300 characters and matched only against a fixed local knowledge base, so there is no external API to abuse today. When it does not recognize a question, it hands off to WhatsApp rather than guessing. |
| Data leakage | `contact_messages` is insert-only for the public (no public SELECT policy); `past_questions` files are served through the private bucket via signed URLs, not a public bucket. |
| Spam / bots | Add a honeypot field and/or Supabase Edge Function rate limiting to the contact form and event registration form before going live. |

## 4. Storage policies (to configure alongside `schema.sql`)

- Public buckets (`academic-resources`, `executive-photos`, `blog-images`, `gallery`, `face-of-atuas`, `campus-images`, `faculty-images`, `event-posters`): public `SELECT`, admin-only `INSERT`/`UPDATE`/`DELETE`.
- Private buckets (`past-questions`, `documents`): no public `SELECT` — serve via short-lived signed URLs generated after checking the `past_questions.published` flag; admin-only write access.

## 5. Security headers (configure at the hosting layer)

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https://*.supabase.co; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co;
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-Frame-Options: DENY
```

Tighten the CSP further once the exact chatbot/Edge Function domains are finalized.

## 6. Audit logging

Every administrative mutation (upload, delete, publish, role change) should call an insert into `audit_logs` with `user_id`, `action`, `resource_type`, `resource_id` and relevant `metadata`, ideally from a Postgres trigger or the Edge Function performing the mutation, so it can't be skipped by a careless admin page.

## 7. Pre-launch checklist

- [ ] Service-role key confirmed absent from repo, frontend, and public env vars
- [ ] RLS enabled and policy-tested on every table (verify a logged-out user cannot write anywhere), including `chatbot_qa` (public read, admin write) and `chatbot_unanswered` (public insert only, admin read/update)
- [ ] Storage bucket policies match the table above
- [ ] Admin pages redirect unauthenticated users to `login.html`
- [ ] File upload validation tested with a renamed `.php`/`.exe` disguised as `.pdf`
- [ ] Contact form and event registration rate-limited and honeypot-protected
- [ ] Security headers verified in production response headers
- [ ] Chatbot Edge Function rejects >300-character input and cannot be prompted into leaking non-public data
- [ ] MFA enabled for `super_admin` accounts

This is a living document — update it as the admin CRUD pages and Edge Functions are built out.
