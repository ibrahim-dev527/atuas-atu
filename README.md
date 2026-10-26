# ATUAS, Official Website

The digital home of the Association of Technical University Accountancy Students (ATUAS), Accra Technical University. Built with plain HTML5, CSS3 and vanilla JavaScript, backed by Supabase.

**New to this project? Open `setup.html` in your browser.** It is a step by step interactive guide, including the full database setup SQL ready to copy and paste. This README is background reading once you are up and running.

## The one file you actually edit

Everything the site needs to connect to Supabase lives in **`js/config.js`**. Open it, paste in your Project URL and anon key, save. Every page, public and admin, reads from that one file. You never need to touch any other file to connect the backend.

## File structure

This project is intentionally kept to as few files as possible:

```
/
├── index.html, about.html, programmes.html, courses.html,
│   past-questions.html, resources.html, students.html,
│   events.html, gallery.html, face-of-atuas.html,
│   executives.html, faculty.html, opportunities.html,
│   news.html, article.html, contact.html, faq.html,
│   constitution.html, downloads.html
│
├── setup.html          (interactive setup guide, start here)
│
├── admin/
│   ├── login.html        (sign in, the only separate admin page)
│   ├── admin.html        (the entire CMS: dashboard, every content
│   │                       type, chatbot management, settings, all
│   │                       as tabs in one page)
│   └── admin.js           (shared engine behind every tab)
│
├── css/
│   └── site.css         (everything: layout, components, admin styling, responsive rules)
│
├── js/
│   ├── config.js         (your Supabase URL and key, edit this one)
│   ├── supabase.js       (Supabase client bootstrap, shared by every page)
│   └── site.js           (navigation, hero, chatbot, dark mode, page carousels, all page logic)
│
├── images/                (put logo.jpg, at1 to at4.jpg, photos here)
├── supabase/
│   └── schema.sql         (also embedded directly in setup.html)
├── README.md
└── SECURITY.md
```

Why one CSS file and one JS bundle instead of many small ones: a style or behavior only needs to be written once, and every page automatically has it. The tradeoff is that `site.css` and `site.js` are longer files, but you will almost never need to touch them directly, most day to day changes happen through the admin panel or by adding images.

## What's built

**19 public pages**, all sharing the same header, footer, and design system, reading live content from Supabase where it makes sense (past questions, events, news, gallery, opportunities, announcements). Nothing shows a broken image, sections without content yet simply say "Coming soon" and update automatically the moment you publish something in the admin panel.

**One admin app** (`admin/admin.html`), with a dashboard, a tab for every content type, a Chatbot tab, and Settings, all sharing one reusable engine (`admin/admin.js`): an auth guard, a generic add/edit/delete table for every content type, file upload straight from your device into the right Supabase storage bucket, and automatic audit logging. A small "Admin" link at the bottom of the About page leads here.

**Database and security**: `supabase/schema.sql` creates every table with Row Level Security enforcing 5 roles. `SECURITY.md` documents the full architecture and a pre-launch checklist.

## What is NOT built yet

- **A full AI model behind the chatbot.** The chatbot works today without one: it checks a built-in local knowledge base first, then a Supabase-backed answer library (`chatbot_qa`, seeded from the ATUAS constitution), and logs anything it can't answer to `chatbot_unanswered` for an admin to review in the Chatbot tab, with a WhatsApp handoff to the PRO as the last resort. If you want it to use a full AI model on top of all that, that would need a separate Supabase Edge Function, which is not built.
- **Real content and images.** Every dynamic section is empty until you add data through `/admin`. Images referenced throughout need to be added to `/images`.
- **A live Supabase project**, until you complete `setup.html`.
- **Production deployment.** Any static host works (Vercel, Netlify, GitHub Pages), you still need to actually put it there.

## Pushing this to GitHub

Because this project keeps no real secrets in any file (the anon key in `js/config.js` is a *public* key, safe to expose, see the note inside that file), **you can commit and push every file in this project, including `js/config.js` with your real keys filled in.**

There is nothing in this project that must be excluded from git. If you want a `.gitignore` anyway for general hygiene (editor files, OS files), a minimal one is:

```
.DS_Store
Thumbs.db
*.log
.vscode/
```

The one thing to genuinely never commit anywhere, in this project or any future one, is a Supabase **`service_role`** key. This project does not use one anywhere, so there is nothing to worry about here, just keep that rule in mind if the site grows to need server-side functions later.

## Managing content day to day

Once Supabase is connected and you are logged into `/admin`:

- **Past questions**: Admin, Past Questions, New. Upload the PDF directly in the form, the admin panel uploads it to Supabase storage and fills in the path for you.
- **Events, News, Gallery, Opportunities, Announcements, Executives, Resources**: same pattern, fill the form (upload a file or paste a link, your choice), save, and it is live on the public site immediately.
- **Constitution document**: Admin, Settings, upload the PDF there.
- **Chatbot**: Admin, Chatbot tab. The top section lists questions visitors asked that it couldn't answer, type an answer there and it's saved permanently and the question is marked answered. The bottom section is the full answer library (including everything seeded from the constitution) if you want to add or edit answers directly.
- **Admin roles**: change a user's role directly in the Supabase Table Editor (`profiles` table), intentionally not exposed in the admin UI for security.

## Environment variables

There technically are none, in the traditional sense, since this is a static site with no build step. The equivalent is `js/config.js`, which holds:

```js
SUPABASE_URL
SUPABASE_ANON_KEY
PRO_WHATSAPP_NUMBER
```

## Developer

Built by **Ibrahim Mohammed Lotsu** (Ibratech), 0554196068, [ibratech.vercel.app](https://ibratech.vercel.app)
