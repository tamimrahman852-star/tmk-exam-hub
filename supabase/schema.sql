-- TMK Exam Hub schema. Run in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  duration_minutes int not null default 30 check (duration_minutes > 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  position int not null default 0,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  marks numeric(5,2) not null default 1 check (marks >= 0),
  negative_marks numeric(5,2) not null default 0 check (negative_marks >= 0),
  explanation text,
  ai_explanation text
);
create index if not exists questions_exam_idx on public.questions (exam_id, position);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_name text,
  score numeric(8,2) not null,
  total_marks numeric(8,2) not null,
  correct int not null,
  wrong int not null,
  unanswered int not null,
  time_taken_seconds int,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists attempts_exam_idx on public.attempts (exam_id, created_at desc);

-- Only the backend (service role key) touches the data; block direct anon access.
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
