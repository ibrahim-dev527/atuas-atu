/* ============================================================
   ATUAS — Site configuration
   This is the ONLY file you need to edit to connect the website
   to your Supabase project. Every page reads its Supabase URL
   and key from here.

   Where to find these values:
   Supabase dashboard -> Settings (gear icon) -> API
     - "Project URL"      -> SUPABASE_URL
     - "anon public" key  -> SUPABASE_ANON_KEY

   Safe to commit to GitHub: yes. The anon key is a PUBLIC key,
   it is meant to be visible in browser code. It only works
   because every table it can touch is protected by Row Level
   Security policies (see supabase/schema.sql). Never put the
   "service_role" key here or anywhere in this project.
   ============================================================ */

window.ATUAS_CONFIG = {
  SUPABASE_URL: "https://pqwqmgpmcjntokzzcuqb.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3FtZ3BtY2pudG9renpjdXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDU3ODEsImV4cCI6MjEwODM4MTc4MX0.c-ZTXhJTyHfYvhjuAsU1ZQ7OkiOIt4y0D3anFSfEWLI",

  // Used by the WhatsApp button and the chatbot's handoff link.
  // Format: country code + number, no plus sign, no leading zero.
  // 0554196068 in Ghana becomes 233554196068.
  PRO_WHATSAPP_NUMBER: "233554196068",
};
