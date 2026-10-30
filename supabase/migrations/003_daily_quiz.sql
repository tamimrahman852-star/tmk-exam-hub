-- Run this ONCE in Supabase > SQL Editor (safe to run again).
-- Stores each day's AI-generated quiz so every student sees the same 5 questions and AI is called once a day.
create table if not exists public.daily_quizzes (
  quiz_date date primary key,
  source text not null default 'ai',
  questions jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.daily_quizzes enable row level security;
