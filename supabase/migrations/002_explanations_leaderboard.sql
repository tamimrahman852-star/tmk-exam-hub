-- Run this ONCE in Supabase > SQL Editor (safe to run again).
alter table public.questions add column if not exists explanation text;       -- written by the exam creator
alter table public.questions add column if not exists ai_explanation text;    -- cached AI answer
alter table public.attempts  add column if not exists time_taken_seconds int; -- for the leaderboard tie-break
create index if not exists attempts_rank_idx on public.attempts (exam_id, score desc, time_taken_seconds asc);
