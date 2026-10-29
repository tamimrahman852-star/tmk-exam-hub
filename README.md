# TMK Exam Hub

React + Tailwind (client) · Node/Express (server) · Supabase Postgres (DB)

## 1. Database
1. Create a Supabase project.
2. Dashboard > SQL Editor > paste `supabase/schema.sql` > Run.
3. Settings > API: copy the **Project URL** and **service_role** key (server only, never in the client).

## 2. Logo
Copy your `logo.png` to `client/public/logo.png`. The navbar and favicon load it from `/logo.png`.

## 3. Server
```bash
cd server
cp .env.example .env      # fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_KEY
npm install
npm run dev               # http://localhost:5000
```

## 4. Client
```bash
cd client
cp .env.example .env      # leave VITE_API_URL empty in dev
npm install
npm run dev               # http://localhost:5173
```

## 5. Use it
- Open `/admin`, enter your `ADMIN_KEY`, fill the exam details, add questions manually or upload an image (OCR) per question.
- Save to get the unique link `/exam/<slug>` and a WhatsApp share button.
- Students open the link, enter a name, take the timed exam and see the result breakdown.

## 6. Deploy (GitHub + Render)
1. Push this folder to GitHub.
2. Render > New **Web Service**: root `server`, build `npm install`, start `npm start`. Add env vars from `.env.example`; set `CORS_ORIGIN` to your site URL.
3. Render > New **Static Site**: root `client`, build `npm install && npm run build`, publish dir `dist`. Env var: `VITE_API_URL=https://<your-api>.onrender.com`.
4. On the static site add a rewrite rule: `/*` -> `/index.html` (needed for `/exam/<slug>` links).

## Notes
- Correct answers never reach the browser during an exam; scoring happens on the server.
- Score = sum(marks of correct) - sum(negative marks of wrong). Enter negatives as `0.25` or `-0.25`; both work.
- OCR runs in the browser with tesseract.js (free). Always review the extracted text; the correct answer is auto-filled only if the image has a line like `Ans: B`.
- Admin protection is a shared secret (`ADMIN_KEY`). For multi-admin use, switch to Supabase Auth later.

## AI image import (Gemini)
1. Get a free key at https://aistudio.google.com/apikey.
2. On the server set `GEMINI_API_KEY` (never put it in the client or GitHub). Optional: `GEMINI_MODEL` (comma-separated fallback list, default `gemini-3.5-flash,gemini-3.6-flash,gemini-3.1-flash-lite`).
3. `PUBLIC_CREATE=false` (default): only people with `ADMIN_KEY` can upload/create. `PUBLIC_CREATE=true`: anyone can, limited per IP per hour by `EXTRACT_LIMIT` and `CREATE_LIMIT`.

## Explanations, leaderboard (v2)
- **Run the migration once** in Supabase > SQL Editor: `supabase/migrations/002_explanations_leaderboard.sql` (adds `explanation`, `ai_explanation`, `time_taken_seconds`).
- Each question can have a creator-written explanation. If it is empty, students can tap "Show explanation" after submitting and the AI writes one (cached, so it is generated only once per question). Optional env: `EXPLAIN_LIMIT` (AI explanations per IP per hour, default 30).
- Every exam has a leaderboard (best attempt per name, ranked by score then time).
- Students cannot clear an answer once chosen and can only pick one option per question.
