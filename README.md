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

## Install as an app (PWA)
- The site is installable: on Android/Chrome tap **Install** in the navbar; on iPhone use Share > **Add to Home Screen**.
- The app icon comes from `client/public/logo.png`. If you replace the logo, run `pip install pillow && python3 scripts/make-icons.py` and commit the new files in `client/public/icons/`.
- Exams and results always load live from the server (never cached); only the app shell works offline.

## Tests
`cd client && npm test` checks the answer lock, submit, leaderboard and explanation flow.

## Import files
Image import accepts JPG, PNG, WEBP and PDF (up to 5 MB).

## Dashboard widgets (v3)
- `CountdownWidget`: live countdown to DU Science/Arts/Business, MBBS and BUET. Edit dates in `client/src/utils/countdown.js` (counts down to 12:00 AM Dhaka time on exam day; confirm dates with the official notices).
- `InspirationWidget`: Quotable API quote (falls back to built-in quotes when the API is down) + study dua with recitation and Bangla translation.
- `AnalyticsWidget`: exams taken, average score, best score and accuracy meter, from exams taken on this device.
- `ResultShareCard`: result card + poster image shared with the Web Share API, with clipboard copy as fallback.
- Bookmarks (`/bookmarks`): save any question or all wrong questions from a result for revision. History and bookmarks are stored in the browser (localStorage), so they do not follow the student to another device.

## Daily quiz, Mistake Book and streaks (v4)
- **Run `supabase/migrations/003_daily_quiz.sql` once** in Supabase > SQL Editor. Without it the quiz still works, but it lives in server memory only (a restart can produce different questions on the same day).
- `DailyQuizWidget` + `/api/daily-quiz`: 5 questions a day (Physics, Chemistry, Mathematics, Biology). Gemini writes 8 candidates, a second AI pass solves them independently and only agreeing questions are kept. If the AI is down the quiz is built from the existing question bank. The first visitor of the day triggers generation; everyone then sees the same cached questions. Answers and explanations never reach the browser until the quiz is submitted.
- `MistakeBook` (home card) + `/mistakes` (`ReviewMistakes`): wrong answers from exams and the daily quiz are collected automatically; revision mode removes a question when it is answered correctly.
- `StreakWidget`: streak = consecutive days with at least one exam or quiz, plus a daily question goal. Mistakes, streaks and quiz results are stored in the browser (localStorage).

### Quiz language
The daily quiz is written in **Bangla** by default (`QUIZ_LANGUAGE=bn`). Set `QUIZ_LANGUAGE=en` on the server for English. If today's quiz was already created in the other language, the server writes a new one the next time someone opens the quiz (and keeps the old one if the AI is down). Formulas, symbols, units and numbers stay in standard notation.

## Quran Tilawat Hub (`/quran`, `QuranHub.jsx`)
- All 114 surahs (number, English name, translation, Arabic name, ayah count, Makki/Madani) from the **Al-Quran Cloud** API, saved on the device after the first load.
- Full-surah recitation by **Mishary Rashid Alafasy** from **MP3Quran**: the app looks up his audio server through the MP3Quran API and falls back to two backup servers if one fails.
- Search, Makki/Madani filter, play / pause / previous / next, seek bar, repeat, auto-next and lock-screen controls. Needs an internet connection to listen. Leaving the page stops the audio.

### Popups
Every popup and sheet (submit confirmation, question navigator, install tip, Quran player bar) is rendered through `components/Portal.jsx` straight into `<body>`. This keeps `position: fixed` tied to the screen even on very long pages; an animated or blurred parent element would otherwise move it to the middle of the page.

## About, upload key and private feedback (v5)
**Pages**
- `/about`: developer profile (details live in `client/src/config/site.js`).
- `/upload-exam`: the only way to reach the question form. The visitor enters the **Question Upload Key** (`ADMIN_KEY`); the server checks it (`GET /api/admin/check`) and only then is the form shown. The key is kept in `sessionStorage` (this tab only), never in `localStorage`. `/admin` redirects here. People who need a key are pointed to WhatsApp / Gmail.
- `/feedback`: public form. Anyone can send, nobody can read.
- `/admin/feedbacks`: private inbox, needs the **Feedback Admin Key**.

**Two different keys (set both on Render)**
| Env var | Opens | Notes |
|---|---|---|
| `ADMIN_KEY` | `/upload-exam` (create exams, read question images with AI) | sent as the `x-admin-key` header |
| `FEEDBACK_KEY` | `/admin/feedbacks` | at least 10 characters and **must differ** from `ADMIN_KEY`, otherwise the inbox is switched off and a warning is logged. Generate with `openssl rand -base64 24` |

**How the feedback inbox is protected**
- Table `feedbacks` (run `supabase/migrations/004_feedback.sql` once): row level security ON with no policies, and `anon`/`authenticated` have no privileges. Only the server (service role key) can touch it. The browser never talks to Supabase directly.
- `POST /api/feedback` (public) only inserts. There is no public read route. It validates length, cleans the page path, has a hidden honeypot field and is limited per IP (`FEEDBACK_LIMIT`, default 5 per hour). IP addresses are not stored.
- `POST /api/feedback-admin/login` exchanges the key for a signed token (HMAC-SHA256, 2 hours). The key is never stored in the browser. Changing `FEEDBACK_KEY` signs everybody out. All other admin routes need `Authorization: Bearer <token>` and answer with `Cache-Control: no-store`.
- Keys are compared in constant time. 8 wrong feedback keys (or 10 wrong upload keys) from one IP lock that IP out for 15 minutes.
