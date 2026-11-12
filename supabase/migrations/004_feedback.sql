-- Run this ONCE in Supabase > SQL Editor (safe to run again).
-- Visitor feedback / bug reports. Only the backend (service role) can read or write this table:
-- row level security is ON with no policies, and the public roles have no table privileges either.
create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'other' check (kind in ('bug', 'suggestion', 'question', 'other')),
  message text not null check (char_length(message) between 5 and 2000),
  name text,
  contact text,
  page text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);
create index if not exists feedbacks_created_idx on public.feedbacks (created_at desc);
create index if not exists feedbacks_status_idx on public.feedbacks (status, created_at desc);

alter table public.feedbacks enable row level security;
revoke all on public.feedbacks from anon, authenticated;
